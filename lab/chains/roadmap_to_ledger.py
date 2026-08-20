#!/usr/bin/env python3
"""
roadmap_to_ledger.py — Roadmap-to-Ledger (IMP-052)

Extrait les tâches du roadmap sans IMP correspondant, interroge Qwen pour
les spécifier (title + lane + impact + effort), et génère
lab/chains/ROADMAP_PROPOSALS.yaml pour review HumanGate.

Usage:
  python lab/chains/roadmap_to_ledger.py                          # génère proposals
  python lab/chains/roadmap_to_ledger.py --no-qwen               # heuristiques, sans LLM
  python lab/chains/roadmap_to_ledger.py --inject                # injecte APPROVED dans ledger
  python lab/chains/roadmap_to_ledger.py --inject-staged <id>   # injecte session idea-to-imp (sans APPROVED)
  python lab/chains/roadmap_to_ledger.py --purge-stale           # supprime proposals humangate_verdict: null
  python lab/chains/roadmap_to_ledger.py --dry-run               # affiche sans écrire
"""

import argparse
import hashlib
import json
import re
import sys
import urllib.request
from datetime import date
from pathlib import Path

try:
    import yaml
except ImportError:
    print("[X] PyYAML requis : pip install pyyaml")
    sys.exit(1)

# ── Paths ─────────────────────────────────────────────────────────────────────
REPO_ROOT      = Path(__file__).resolve().parents[2]
ROADMAP_PATH   = REPO_ROOT / "00_STUDIO_CONTROL/00_MASTER_DOCS/01_ROADMAP.md"
LEDGER_PATH    = REPO_ROOT / "lab/chains/IMPROVEMENT_LEDGER.yaml"
PROPOSALS_PATH = REPO_ROOT / "lab/chains/ROADMAP_PROPOSALS.yaml"

# IMP-205 — single-writer gardé : tout write du ledger passe par guarded_write
# (governor.check + writelock O_EXCL + concurrence optimiste par empreinte). ledger_writer
# vit dans governance/ ; on l'ancre sur REPO_ROOT (même arithmétique que kaizen_loop).
sys.path.insert(0, str(REPO_ROOT / "governance"))
from ledger_writer import guarded_write  # noqa: E402

LM_HOST     = "http://127.0.0.1:1234"
LM_DIRECTOR = "qwen2.5-14b-instruct"

TARGET_STATUSES   = {"NOT_STARTED", "PLANNED", "DOCUMENTED_ONLY", "IN_PROGRESS"}
VALID_IMPACTS     = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
VALID_EFFORTS     = {"TRIVIAL", "SMALL", "MEDIUM", "LARGE", "XLARGE"}
VALID_LANES       = {"SAFE_AUTO", "AUDIT_REQUIRED", "HUMAN_REQUIRED", "FORBIDDEN"}

PRIORITY_TO_IMPACT = {"P0": "CRITICAL", "P1": "HIGH", "P2": "HIGH", "P3": "MEDIUM"}

_IMP_REF_RE = re.compile(r'\bIMP-\d+\b')


# ── Roadmap parser ─────────────────────────────────────────────────────────────
def parse_roadmap_tasks(text: str) -> list:
    """Extrait les lignes de table du roadmap matchant TARGET_STATUSES."""
    tasks = []
    current_phase = ""
    status_re = re.compile(r'^(NOT_STARTED|PLANNED|DOCUMENTED_ONLY|IN_PROGRESS|DONE|BLOCKED)')

    for line in text.splitlines():
        m_phase = re.match(r'^## (Phase \d+ [—\-].+)', line)
        if m_phase:
            current_phase = m_phase.group(1)
            continue
        if not line.startswith('|') or re.match(r'^\|[\s\-|]+\|', line):
            continue
        cells = [c.strip() for c in line.split('|') if c.strip()]
        if len(cells) < 2:
            continue
        task_text  = cells[0]
        status_cell = cells[1]
        priority   = cells[2] if len(cells) > 2 else ""

        if task_text in ("Tâche", "Décision", "Composant", "ID", "Tache"):
            continue

        m_status = status_re.match(status_cell)
        if not m_status or m_status.group(1) not in TARGET_STATUSES:
            continue
        status_kw = m_status.group(1)

        # IN_PROGRESS avec ref IMP explicite → déjà couvert
        if status_kw == "IN_PROGRESS" and _IMP_REF_RE.search(status_cell):
            continue

        m_prio = re.match(r'(P\d)', priority)
        tasks.append({
            "task":          task_text,
            "status":        status_kw,
            "status_detail": status_cell,
            "phase":         current_phase,
            "priority":      m_prio.group(1) if m_prio else "",
        })

    return tasks


# ── Deduplication ─────────────────────────────────────────────────────────────
def _word_set(text: str) -> set:
    return set(re.findall(r'\w+', text.lower()))


def _normalize_title(text: str) -> str:
    return re.sub(r'[^\w\s]', '', text.lower()).strip()


def is_duplicate(task_text: str, existing_imps: list) -> tuple:
    """Returns (is_dup, matched_imp_id).
    Vérifie l'ensemble du ledger (OPEN + CLOSED + DEFERRED) :
    1. Match exact normalisé (sans ponctuation, lower, strip)
    2. Jaccard > 0.35
    """
    norm = _normalize_title(task_text)
    task_words = _word_set(task_text)
    if not task_words:
        return False, ""
    for imp in existing_imps:
        imp_title = imp.get("title", "")
        imp_id    = imp.get("id", "?")
        if norm and _normalize_title(imp_title) == norm:
            return True, imp_id
        imp_words = _word_set(imp_title)
        if not imp_words:
            continue
        intersection = len(task_words & imp_words)
        union = len(task_words | imp_words)
        if union > 0 and intersection / union > 0.35:
            return True, imp_id
    return False, ""


# ── Heuristics (fallback sans Qwen) ──────────────────────────────────────────
def heuristic_spec(task: dict) -> dict:
    """Lane + impact + effort par heuristiques."""
    title    = task["task"].lower()
    priority = task.get("priority", "")

    impact = PRIORITY_TO_IMPACT.get(priority, "MEDIUM")

    effort = "MEDIUM"
    if any(k in title for k in ("minimal", "trivial", "fix", "patch")):
        effort = "SMALL"
    elif any(k in title for k in ("runtime", "architecture", "multi-agent")):
        effort = "XLARGE"
    elif any(k in title for k in ("mutation", "muté", "rétro-engineering", "v2", "lora", "training")):
        effort = "LARGE"
    elif any(k in title for k in ("puzzle", "dataset")):
        effort = "LARGE"

    lane = "SAFE_AUTO"
    if any(k in title for k in ("chess 960", "stockfish", "humangate", "décision")):
        lane = "AUDIT_REQUIRED"

    return {"lane": lane, "impact": impact, "effort": effort}


# ── Qwen classification ───────────────────────────────────────────────────────
def qwen_classify(task: dict) -> dict | None:
    """Appelle LM Studio (Director) pour lane/impact/effort. None si indisponible."""
    prompt = (
        "/no_think\nClassifie cette tâche de roadmap pour un ledger Kaizen.\n\n"
        f"Phase : {task['phase']}\n"
        f"Tâche : {task['task']}\n"
        f"Statut actuel : {task['status']}\n"
        f"Priorité : {task.get('priority', 'N/A')}\n\n"
        "Retourne UNIQUEMENT ce JSON :\n"
        '{"lane": "SAFE_AUTO|AUDIT_REQUIRED|FORBIDDEN", '
        '"impact": "LOW|MEDIUM|HIGH|CRITICAL", '
        '"effort": "TRIVIAL|SMALL|MEDIUM|LARGE|XLARGE"}\n'
        "claim_verdict: NO_CLAIM_ALLOWED"
    )
    payload = {
        "model": LM_DIRECTOR,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": 80,
        "temperature": 0.2,
        "stream": False,
    }
    for url in [f"{LM_HOST}/api/v1/chat", f"{LM_HOST}/v1/chat/completions"]:
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode(),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=30) as r:
                data = json.loads(r.read())
                raw = ""
                if "choices" in data:
                    raw = (data["choices"][0]["message"].get("content") or "").strip()
                elif "content" in data:
                    raw = str(data["content"]).strip()
                m = re.search(r'\{[^}]+\}', raw)
                if m:
                    spec = json.loads(m.group(0))
                    if (spec.get("lane")   in VALID_LANES
                            and spec.get("impact") in VALID_IMPACTS
                            and spec.get("effort") in VALID_EFFORTS):
                        return spec
        except Exception:
            continue
    return None


# ── Build proposals ───────────────────────────────────────────────────────────
def build_proposals(tasks: list, existing_imps: list, use_qwen: bool) -> list:
    proposals = []
    for idx, task in enumerate(tasks, start=1):
        dup, dup_id = is_duplicate(task["task"], existing_imps)
        if dup:
            print(f"  [!] Dupliqué ({dup_id}) — ignoré : {task['task'][:60]}")
            continue

        if use_qwen:
            spec = qwen_classify(task)
            qwen_used = spec is not None
            if not qwen_used:
                print(f"  [!] Qwen indisponible — fallback heuristiques : {task['task'][:40]}")
                spec = heuristic_spec(task)
        else:
            spec     = heuristic_spec(task)
            qwen_used = False

        note_parts = [f"Extrait roadmap {task['phase']}", f"statut {task['status']}"]
        if task.get("priority"):
            note_parts.append(f"priorité {task['priority']}")

        proposals.append({
            "prop_id":            f"PROP-{idx:03d}",
            "source_phase":       task["phase"],
            "source_task":        task["task"],
            "source_status":      task["status"],
            "source_priority":    task.get("priority", ""),
            "qwen_used":          qwen_used,
            "humangate_verdict":  None,
            "imp": {
                "title":      task["task"],
                "type":       "feature",
                "lane":       spec["lane"],
                "impact":     spec["impact"],
                "effort":     spec["effort"],
                "files":      [],
                "acceptance": "TBD",
                "notes":      ", ".join(note_parts),
            },
        })

    return proposals


# ── Write proposals ───────────────────────────────────────────────────────────
def write_proposals(proposals: list, dry_run: bool) -> None:
    header = (
        "# ROADMAP_PROPOSALS.yaml\n"
        f"# Generated: {date.today().isoformat()}\n"
        "# Source: 00_STUDIO_CONTROL/00_MASTER_DOCS/01_ROADMAP.md\n"
        "# Status: PENDING_HUMANGATE\n"
        "# claim_verdict: NO_CLAIM_ALLOWED\n"
        "#\n"
        "# Mettre humangate_verdict: APPROVED ou REJECTED sur chaque proposal.\n"
        "# Puis injecter dans le ledger :\n"
        "#   python lab/chains/roadmap_to_ledger.py --inject\n\n"
    )
    body = yaml.dump(
        {"proposals": proposals},
        default_flow_style=False,
        allow_unicode=True,
        sort_keys=False,
    )
    if dry_run:
        print(header + body)
    else:
        PROPOSALS_PATH.write_text(header + body, encoding="utf-8")
        print(f"[OK] {len(proposals)} proposals → {PROPOSALS_PATH}")


# ── Inject approved ───────────────────────────────────────────────────────────
def inject_approved(dry_run: bool, force: bool = False) -> None:
    if not PROPOSALS_PATH.exists():
        print(f"[X] {PROPOSALS_PATH} absent — lancer d'abord sans --inject")
        sys.exit(1)
    raw = yaml.safe_load(PROPOSALS_PATH.read_text(encoding="utf-8"))
    proposals = raw.get("proposals") or []
    approved = [p for p in proposals if p.get("humangate_verdict") == "APPROVED"]
    if not approved:
        print("[!] Aucune proposal avec humangate_verdict: APPROVED")
        return

    ledger_data, _ledger_fp = _load_ledger_guarded()
    imps = ledger_data["improvements"]
    nums = []
    for i in imps:
        try:
            nums.append(int(i["id"].split("-")[1]))
        except (IndexError, ValueError):
            pass
    next_num = max(nums) + 1 if nums else 1

    added = []
    skipped = []
    for prop in approved:
        spec    = prop["imp"]
        prop_id = prop.get("prop_id", "?")
        dup, dup_id = is_duplicate(spec["title"], imps)
        if dup and not force:
            print(f"  [SKIP] {prop_id} déjà dans ledger comme {dup_id} — '{spec['title'][:60]}'")
            skipped.append(prop_id)
            continue
        new_id = f"IMP-{next_num:03d}"
        next_num += 1
        new_imp = {
            "id":             new_id,
            "title":          spec["title"],
            "type":           spec.get("type", "feature"),
            "source":         f"roadmap_to_ledger IMP-052 — {prop['source_phase']}",
            "status":         "OPEN",
            "impact":         spec["impact"],
            "effort":         spec["effort"],
            "lane":           spec["lane"],
            "domain":         spec.get("domain", "studio"),
            "files":          spec.get("files", []),
            "acceptance":     spec.get("acceptance", "TBD"),
            "blocked_by":     [],
            "opened_session": date.today().isoformat(),
            "closed_session": None,
            "notes":          spec.get("notes", ""),
        }
        if not dry_run:
            imps.append(new_imp)
        added.append((new_id, spec["title"]))

    if skipped:
        print(f"[OK] {len(skipped)} proposal(s) ignorée(s) (doublon ledger) — utiliser --force pour forcer")
    if not added:
        print("[OK] Aucun nouvel IMP — toutes les proposals sont déjà dans le ledger")
        return
    if not dry_run:
        _write_ledger(ledger_data, expected_fingerprint=_ledger_fp)
        print(f"[OK] {len(added)} IMP(s) injecté(s) dans le ledger :")
    else:
        print(f"[dry-run] {len(added)} IMP(s) seraient injectés :")
    for new_id, title in added:
        print(f"  {new_id} — {title[:70]}")


# ── Shared ledger read/write (single-writer gardé, IMP-205) ───────────────────
def _load_ledger_guarded() -> tuple[dict, str]:
    """Lit le ledger en OCTETS et capture leur empreinte sha256 pour la concurrence
    optimiste de guarded_write (le write comparera cette empreinte sous le writelock :
    si le fichier a bougé entre ce read et le write -> ConcurrentWriteError).
    Retourne (data, fingerprint_hex)."""
    raw = LEDGER_PATH.read_bytes()
    fp = hashlib.sha256(raw).hexdigest()
    return yaml.safe_load(raw.decode("utf-8")), fp


def _write_ledger(ledger_data: dict, expected_fingerprint: str | None = None) -> None:
    """Écrit le ledger via le single-writer gardé (governor.check + writelock O_EXCL +
    empreinte). `expected_fingerprint` = empreinte capturée au load par
    `_load_ledger_guarded` ; une écriture concurrente lève ConcurrentWriteError (fail-closed).
    Mode/encoding/newline identiques à kaizen_loop.save_ledger (UTF-8, CRLF préservé)."""
    header = (
        "# IMPROVEMENT_LEDGER.yaml\n"
        "# SSOT amélioration continue (Kaizen Loop) — Tactical Chess Studio\n"
        "# Claim posture: NO_CLAIM_ALLOWED | Read-only sauf --close/--add\n\n"
    )
    body = yaml.dump(ledger_data, default_flow_style=False, allow_unicode=True, sort_keys=False)
    guarded_write(LEDGER_PATH, header + body, expected_fingerprint=expected_fingerprint)


# ── Inject staged (idea-to-imp, sans exiger APPROVED) ────────────────────────
def inject_staged(session_id: str, dry_run: bool, force: bool = False) -> None:
    """Injecte les proposals d'une session idea-to-imp sans exiger APPROVED.
    Filtre par source_idea_id == session_id. Dédup Jaccard reste active.
    """
    if not PROPOSALS_PATH.exists():
        print(f"[X] {PROPOSALS_PATH} absent")
        sys.exit(1)
    raw = yaml.safe_load(PROPOSALS_PATH.read_text(encoding="utf-8"))
    proposals = raw.get("proposals") or []
    staged = [
        p for p in proposals
        if str(p.get("source_idea_id", "")) == str(session_id)
        and p.get("source_phase") == "idea-to-imp"
    ]
    if not staged:
        print(f"[!] Aucune proposal pour la session '{session_id}'")
        return

    ledger_data, _ledger_fp = _load_ledger_guarded()
    imps = ledger_data["improvements"]
    nums = [int(i["id"].split("-")[1]) for i in imps
            if re.match(r"IMP-\d+$", i.get("id", ""))]
    next_num = max(nums) + 1 if nums else 1

    added: list = []
    skipped: list = []
    for prop in staged:
        spec    = prop["imp"]
        prop_id = prop.get("prop_id", "?")
        dup, dup_id = is_duplicate(spec["title"], imps)
        if dup and not force:
            print(f"  [SKIP] {prop_id} déjà dans ledger comme {dup_id}")
            skipped.append(prop_id)
            continue
        new_id = f"IMP-{next_num:03d}"
        next_num += 1
        new_imp = {
            "id":             new_id,
            "title":          spec["title"],
            "type":           spec.get("type", "feature"),
            "source":         f"idea-to-imp session {session_id}",
            "status":         "OPEN",
            "impact":         spec["impact"],
            "effort":         spec["effort"],
            "lane":           spec["lane"],
            "domain":         spec.get("domain", "studio"),
            "files":          spec.get("files", []),
            "acceptance":     spec.get("acceptance", "TBD"),
            "blocked_by":     [],
            "opened_session": date.today().isoformat(),
            "closed_session": None,
            "notes":          spec.get("notes", ""),
        }
        if not dry_run:
            imps.append(new_imp)
        added.append((new_id, spec["title"]))

    if skipped:
        print(f"[OK] {len(skipped)} proposal(s) ignorée(s) (doublon) — utiliser --force pour forcer")
    if not added:
        print("[OK] Aucun nouvel IMP — toutes les proposals sont déjà dans le ledger")
        return
    if not dry_run:
        _write_ledger(ledger_data, expected_fingerprint=_ledger_fp)
        print(f"[OK] {len(added)} IMP(s) injecté(s) dans le ledger :")
    else:
        print(f"[dry-run] {len(added)} IMP(s) seraient injectés :")
    for new_id, title in added:
        print(f"  {new_id} — {title[:70]}")


# ── Purge stale proposals ─────────────────────────────────────────────────────
def purge_stale_proposals(dry_run: bool) -> None:
    """Retire les proposals avec humangate_verdict: null (non traitées)."""
    if not PROPOSALS_PATH.exists():
        print(f"[X] {PROPOSALS_PATH} absent")
        return
    raw = yaml.safe_load(PROPOSALS_PATH.read_text(encoding="utf-8"))
    proposals = raw.get("proposals") or []
    kept    = [p for p in proposals if p.get("humangate_verdict") is not None]
    removed = len(proposals) - len(kept)
    if dry_run:
        print(f"[dry-run] {removed} proposal(s) null seraient supprimées, {len(kept)} conservées")
        return
    header = (
        "# ROADMAP_PROPOSALS.yaml\n"
        f"# Purgé: {date.today().isoformat()} — {removed} proposals null supprimées\n"
        "# claim_verdict: NO_CLAIM_ALLOWED\n\n"
    )
    body = yaml.dump({"proposals": kept}, default_flow_style=False, allow_unicode=True, sort_keys=False)
    PROPOSALS_PATH.write_text(header + body, encoding="utf-8")
    print(f"[OK] {removed} proposal(s) null supprimées — {len(kept)} conservées")


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Roadmap-to-Ledger (IMP-052)")
    parser.add_argument("--no-qwen",       action="store_true",  help="Heuristiques simples, pas d'appel Qwen")
    parser.add_argument("--inject",        action="store_true",  help="Injecte proposals APPROVED dans le ledger")
    parser.add_argument("--inject-staged", metavar="SESSION_ID", help="Injecte proposals idea-to-imp d'une session sans exiger APPROVED")
    parser.add_argument("--purge-stale",   action="store_true",  help="Supprime les proposals avec humangate_verdict: null")
    parser.add_argument("--dry-run",       action="store_true",  help="Affiche sans écrire")
    parser.add_argument("--force",         action="store_true",  help="Bypass déduplication")
    args = parser.parse_args()

    if args.inject:
        inject_approved(dry_run=args.dry_run, force=args.force)
        return

    if args.inject_staged:
        inject_staged(args.inject_staged, dry_run=args.dry_run, force=args.force)
        return

    if args.purge_stale:
        purge_stale_proposals(dry_run=args.dry_run)
        return

    if not ROADMAP_PATH.exists():
        print(f"[X] Roadmap introuvable : {ROADMAP_PATH}")
        sys.exit(1)

    roadmap_text  = ROADMAP_PATH.read_text(encoding="utf-8")
    tasks         = parse_roadmap_tasks(roadmap_text)
    print(f"[OK] {len(tasks)} tâches extraites (statuts : {', '.join(sorted(TARGET_STATUSES))})")

    existing_imps = []
    if LEDGER_PATH.exists():
        ledger_data   = yaml.safe_load(LEDGER_PATH.read_text(encoding="utf-8"))
        existing_imps = ledger_data.get("improvements", [])
    print(f"[OK] {len(existing_imps)} IMPs existants chargés (déduplication Jaccard > 0.35)")

    proposals = build_proposals(tasks, existing_imps, use_qwen=not args.no_qwen)
    print(f"[OK] {len(proposals)} nouvelles proposals générées")

    if not proposals:
        print("[OK] Aucune nouvelle tâche — roadmap déjà couverte par le ledger")
        return

    write_proposals(proposals, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
