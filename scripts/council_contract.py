#!/usr/bin/env python3
"""council_contract.py — validateur fail-hard du contrat Council -> Factory (v1).

Chantier Council->Factory (contrat v0, HumanGate 2026-07-06). Le Council PROPOSE, ne
DISPOSE pas : sa sortie est une DONNEE validee par schema, jamais une commande. Seul
writer aval du ledger : kaizen_loop.py (single-writer garde par governance/ledger_writer,
IMP-194/205). Ce module ne fait que VALIDER ; il n'ecrit jamais le ledger.

Coexistence par surface (decision HumanGate 2026-07-06) : ce validateur est DISTINCT de
`council.validate_output` (council.py:537), qui valide l'artefact BRUT `CouncilResult.to_dict()`
(opinions/disagreements/divergences, IMP-198). Ici on valide la surface TRANSFORMEE du contrat
(voices{} clefs par ROLE + proposed_items). Deux objets differents a deux etages differents ->
PAS deux validateurs concurrents. `validate_output` reste inchange.

Deux couches de validation, dans l'ordre (fail-hard, rejet TOTAL a la 1re faute) :
  1. STRUCTURE  : jsonschema contre schemas/council_output_v1.schema.json
                  (required, additionalProperties:false, enums, schema_version const, model requis).
  2. SEMANTIQUE : write-path guard sur proposed_items. Le contrat transporte des titres/rationales,
                  JAMAIS de commande ni de chemin de fichier a modifier.
                  - title/rationale : rejet si motif COMMANDE/MUTATION command-shaped UNIQUEMENT
                    (verbe shell, substitution $(...), redirection-vers-fichier, pipe-vers-shell).
                    Un chemin de fichier NU y est AUTORISE (descriptif, pas executable) -- decision
                    HumanGate 2026-07-06 (option a).
                  - evidence_refs  : autorises mais BORNES -> repo-relatif, pas de traversal '..',
                    pas de verbe d'ecriture, pas de meta-caractere shell.

Toute sortie non conforme -> rejet total + entree dans le journal d'erreurs HMAC existant
(governance/error_journal.record_error) puis levee de CouncilContractError. AUCUNE reparation
silencieuse (hors perimetre v0).

claim_verdict: NO_CLAIM_ALLOWED
"""
from __future__ import annotations

import ast
import json
import re
import sys
import time
from pathlib import Path
from typing import Any

_HERE = Path(__file__).resolve().parent
REPO = _HERE.parent
# council.py vit dans scripts/, error_journal.py dans governance/ (ni l'un ni l'autre package) :
# on ancre les deux sur le path comme le fait council.py lui-meme.
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))
if str(REPO / "governance") not in sys.path:
    sys.path.insert(0, str(REPO / "governance"))
import error_journal  # noqa: E402  (journal HMAC + governor, IMP-202/207)

CONTRACT_SCHEMA_PATH = REPO / "schemas" / "council_output_v1.schema.json"

# Journaux par defaut (memes chemins que error_journal CLI). Overridables (tests -> tmp).
DEFAULT_JOURNAL_PATH = REPO / "lab" / "reports" / "error_journal.jsonl"
DEFAULT_PROPOSALS_PATH = REPO / "lab" / "reports" / "error_proposals.jsonl"


class CouncilContractError(Exception):
    """Sortie council non conforme au contrat v1 — rejet total (fail-hard)."""


# ── couche 2 : write-path / command guard ──────────────────────────────────────
# Motifs COMMANDE/MUTATION interdits dans title & rationale. On n'attrape QUE le command-shaped :
# verbes shell, substitution $(...), redirection-vers-fichier, pipe-vers-shell.
# Decision HumanGate 2026-07-06 (option a) : un chemin de fichier NU dans un title/rationale est
# DESCRIPTIF, pas executable ("search.rs manque un timeout" doit passer) ; l'invariant reel (aucun
# aval n'execute ces champs) est tenu structurellement (plancher AUDIT_REQUIRED + zero execution v0).
# Donc PAS de rejet sur chemin/extension/absolu/traversal ici. `>` et `|` restent interpretes en
# OPERATEURS de commande (pas en caracteres bruts) pour ne pas rejeter "score > 20" ni "Result | Option".
# Les regles evidence_refs (absolu/traversal/verbes/shell) restent, elles, INCHANGEES (cf. _check_evidence_ref).
_CMD_MOTIF_RE = re.compile(
    r"\b(?:git|rm|rmdir|mv|move|cp|copy|del|erase|chmod|chown|dd|mkfs|sed|curl|wget|scp|truncate|tee)\b"
    r"|\$\("                                             # substitution de commande $(...)
    r"|>>?\s*[\w./\\-]*[/\\.][\w./\\-]+"                 # redirection vers un chemin/fichier
    r"|\|\s*(?:sh|bash|zsh|python|cmd|powershell|pwsh|tee|xargs|awk)\b",  # pipe vers un shell/outil
    re.IGNORECASE,
)

# evidence_refs : chemins de PREUVE en lecture seule. Bornes.
_EVID_ABS_RE = re.compile(r"^\s*(?:[A-Za-z]:[\\/]|[\\/]|~[\\/]|\\\\)")   # absolu / UNC / home
_EVID_SHELL_RE = re.compile(r"[;|`]|\$\(|&&|\|\|")                        # meta-caracteres shell
_EVID_WRITE_VERB_RE = re.compile(
    r"\b(?:rm|rmdir|mv|move|cp|copy|del|erase|chmod|chown|dd|git|sed|truncate|tee)\b", re.IGNORECASE
)


def _scan_command_motif(text: str, where: str) -> None:
    m = _CMD_MOTIF_RE.search(text)
    if m:
        raise CouncilContractError(
            f"write-path/command interdit dans {where}: motif {m.group(0)!r} "
            f"(le contrat transporte des titres/rationales, jamais des commandes ni des chemins a modifier)"
        )


def _check_evidence_ref(ref: str, where: str) -> None:
    if not isinstance(ref, str) or not ref.strip():
        raise CouncilContractError(f"evidence_ref vide/non-string dans {where}")
    if _EVID_ABS_RE.search(ref):
        raise CouncilContractError(f"evidence_ref absolu interdit dans {where}: {ref!r} (repo-relatif requis)")
    parts = re.split(r"[\\/]", ref)
    if ".." in parts:
        raise CouncilContractError(f"evidence_ref traversal '..' interdit dans {where}: {ref!r}")
    if _EVID_SHELL_RE.search(ref):
        raise CouncilContractError(f"evidence_ref meta-caractere shell interdit dans {where}: {ref!r}")
    if _EVID_WRITE_VERB_RE.search(ref):
        raise CouncilContractError(f"evidence_ref verbe d'ecriture interdit dans {where}: {ref!r}")


def _validate_no_write_paths(contract: dict[str, Any]) -> None:
    """Couche 2 — garde write-path/commande sur proposed_items. Suppose la STRUCTURE deja valide."""
    for i, item in enumerate(contract.get("proposed_items", [])):
        _scan_command_motif(item["title"], f"proposed_items[{i}].title")
        _scan_command_motif(item["rationale"], f"proposed_items[{i}].rationale")
        for j, ref in enumerate(item["evidence_refs"]):
            _check_evidence_ref(ref, f"proposed_items[{i}].evidence_refs[{j}]")


# ── couche 1 : structure (jsonschema) ───────────────────────────────────────────

def _validate_structure(contract: Any, schema_path: Path) -> None:
    import jsonschema
    if not isinstance(contract, dict):
        raise CouncilContractError(f"contrat non-objet: {type(contract).__name__}")
    schema = json.loads(Path(schema_path).read_text(encoding="utf-8"))
    try:
        jsonschema.validate(contract, schema)
    except jsonschema.ValidationError as exc:
        loc = "/".join(str(p) for p in exc.absolute_path) or "(racine)"
        raise CouncilContractError(f"structure invalide @ {loc}: {exc.message}") from exc


# ── entree publique fail-hard ───────────────────────────────────────────────────

def validate_contract(
    contract: Any,
    *,
    schema_path: Path | str = CONTRACT_SCHEMA_PATH,
    journal_path: Path | str = DEFAULT_JOURNAL_PATH,
    proposals_path: Path | str = DEFAULT_PROPOSALS_PATH,
    now_ts: int | None = None,
    record: bool = True,
) -> dict[str, Any]:
    """Valide un contrat (dict) contre le schema v1 + le garde write-path. Fail-hard.

    Conforme -> renvoie le contrat inchange. Non conforme -> journalise (HMAC, governe) puis
    leve CouncilContractError. `record=False` desactive la journalisation (usage test unitaire pur).
    """
    try:
        _validate_structure(contract, Path(schema_path))
        _validate_no_write_paths(contract)
    except CouncilContractError as exc:
        if record:
            _journal_reject(str(exc), journal_path, proposals_path, now_ts)
        raise
    return contract


def validate_raw(
    raw: str,
    **kwargs: Any,
) -> dict[str, Any]:
    """Comme validate_contract mais depuis une chaine JSON brute. JSON casse -> rejet total + journal."""
    record = kwargs.get("record", True)
    try:
        contract = json.loads(raw)
    except (json.JSONDecodeError, TypeError) as exc:
        msg = f"council contract JSON casse: {type(exc).__name__}: {exc}"
        if record:
            _journal_reject(
                msg,
                kwargs.get("journal_path", DEFAULT_JOURNAL_PATH),
                kwargs.get("proposals_path", DEFAULT_PROPOSALS_PATH),
                kwargs.get("now_ts"),
            )
        raise CouncilContractError(msg) from exc
    return validate_contract(contract, **kwargs)


def _journal_reject(reason: str, journal_path: Path | str, proposals_path: Path | str,
                    now_ts: int | None) -> None:
    """Consigne un rejet de contrat dans le journal HMAC existant. Best-effort : une erreur de
    journalisation (governor BLOCK, I/O) ne masque JAMAIS le rejet du contrat (qui est reraise en amont)."""
    ts = int(time.time()) if now_ts is None else now_ts
    try:
        error_journal.record_error(
            f"council contract rejete: {reason}",
            journal_path=journal_path,
            proposals_path=proposals_path,
            now_ts=ts,
        )
    except error_journal.ErrorJournalError:
        pass  # journalisation refusee/bloquee -> le rejet du contrat reste effectif en amont


# ── etape 4 : adaptateur sortie council -> contrat + orchestration fail-soft ────
# Le council NE produit PAS nativement de contrat : il REVOIT le plan d'un IMP. On transforme
# son CouncilResult brut (opinions par role) en contrat v1. Decisions HumanGate 2026-07-06 :
#   - path factory LOCAL uniquement : Claude proxy (127.0.0.1) + Qwen (LM Studio). PAS de Gemini
#     (API externe) -> construit sans GEMINI_FLASH ; le routage council retombe fail-soft sur Qwen
#     pour la voix DIVERGENCE (ROLE_ROUTING).
#   - proposed_items derives des RISQUES RED_TEAM (signal actionnable). Hypotheses DIVERGENCE
#     exploratoires -> exclues en v0.
#   - suggested_lane = AUDIT_REQUIRED (plancher D1 ; le routeur etape 5 re-applique le plancher).
# Fail-soft cote LM Studio : voix indisponible/timeout -> verdict BLOCKED, jamais de crash.
# Fail-hard cote contrat : le contrat transforme est valide par validate_contract (rejet total
# si non conforme, ex. un risque nommant un fichier -> garde write-path). Duck-typing sur le
# CouncilResult : ce module ne DEPEND PAS de council pour la transformation (seulement pour l'orchestration).

_STANCE_TO_VERDICT = {"APPROUVE": "OK", "BLOQUE": "BLOCKED", "ESCALADE": "FAIL", "DIVERGENCE": "OK"}
_VOICE_ROLES = ("PLAN_REVIEW", "RED_TEAM", "DIVERGENCE")


def _enum_val(x: Any) -> str:
    return str(getattr(x, "value", x)) if x is not None else ""


_RISK_DESC_KEYS = ("description", "risk", "issue", "text", "summary", "title")
_RISK_EXTRA_KEYS = ("severity", "mitigation", "impact", "fix")


def _risk_to_texts(risk: Any) -> tuple[str, str]:
    """(title_src, rationale_src) lisibles depuis un risque council.

    council.py str()-ifie chaque risque ; Qwen renvoie parfois des OBJETS structures
    ({'description','severity','mitigation'}) -> on recoit un dict-repr Python. On l'evalue en
    litteral SUR (ast.literal_eval : AUCUN exec de code) et on extrait des champs lisibles.
    Ce n'est PAS une reparation d'output malforme (un risque structure est valide) — c'est une
    normalisation de forme. Chaine non-dict -> gardee telle quelle."""
    s = str(risk).strip()
    obj = None
    if s[:1] in "{[":
        try:
            parsed = ast.literal_eval(s)
            if isinstance(parsed, dict):
                obj = parsed
        except (ValueError, SyntaxError, MemoryError, RecursionError):
            obj = None
    if obj is None:
        return s, s
    desc = ""
    for k in _RISK_DESC_KEYS:
        v = obj.get(k)
        if v:
            desc = str(v).strip()
            break
    if not desc:
        desc = "; ".join(f"{k}: {v}" for k, v in obj.items()).strip()
    extra = [f"{k}: {str(obj[k]).strip()}" for k in _RISK_EXTRA_KEYS if obj.get(k)]
    rationale = desc if not extra else f"{desc} ({'; '.join(extra)})"
    return desc, rationale


def _voice_verdict(op: Any) -> str:
    """Fail-soft : voix indisponible/timeout -> BLOCKED (prend le pas sur la stance). Sinon mappe la stance."""
    if not getattr(op, "available", True) or getattr(op, "timed_out", False):
        return "BLOCKED"
    return _STANCE_TO_VERDICT.get(_enum_val(getattr(op, "stance", "")), "FAIL")


def _voice_findings(op: Any, role: str) -> list[str]:
    if not getattr(op, "available", True):
        return ["voix indisponible (fail-soft)"]
    if role == "RED_TEAM":
        items = list(getattr(op, "risks", ()) or ())
    elif role == "DIVERGENCE":
        items = list(getattr(op, "hypotheses", ()) or ())
    else:
        items = []
    if not items:
        rationale = getattr(op, "rationale", "") or ""
        if rationale and rationale != "role_unavailable":
            items = [rationale]
    # normalise les items dict-repr (Qwen -> objets structures) en texte lisible ; prose inchangee.
    return [t for t in (_risk_to_texts(x)[0] for x in items if str(x).strip()) if t.strip()]


def council_result_to_contract(result: Any, *, session_id: str, timestamp: str) -> dict[str, Any]:
    """Transforme un CouncilResult brut (duck-type) en contrat v1 (dict). PUR : ne valide pas,
    ne fait aucune I/O. L'appelant valide via validate_contract (fail-hard)."""
    opinions = list(getattr(result, "opinions", ()) or ())
    by_role = {_enum_val(getattr(o, "role", "")): o for o in opinions}

    voices: dict[str, Any] = {}
    for role in _VOICE_ROLES:
        op = by_role.get(role)
        if op is None:
            voices[role] = {"model": "unknown", "verdict": "BLOCKED", "findings": ["voix absente"]}
        else:
            voices[role] = {
                "model": _enum_val(getattr(op, "model", "")) or "unknown",
                "verdict": _voice_verdict(op),
                "findings": _voice_findings(op, role),
            }

    # proposed_items : un item par RISQUE RED_TEAM (si la voix a repondu).
    proposed_items: list[dict[str, Any]] = []
    red = by_role.get("RED_TEAM")
    if red is not None and getattr(red, "available", True):
        evidence_refs = [str(f) for f in (getattr(red, "evidence_files", ()) or ()) if str(f).strip()]
        for risk in (getattr(red, "risks", ()) or ()):
            if not str(risk).strip():
                continue
            title_src, rationale_src = _risk_to_texts(risk)
            if not title_src.strip():
                continue
            proposed_items.append({
                "title": title_src[:200],
                "rationale": rationale_src or title_src,
                "suggested_lane": "AUDIT_REQUIRED",   # plancher D1 (routeur etape 5 re-applique)
                "evidence_refs": list(evidence_refs),
            })

    return {
        "schema_version": "1",
        "session_id": session_id,
        "timestamp": timestamp,
        "voices": voices,
        "proposed_items": proposed_items,
        "claim_verdict": "NO_CLAIM_ALLOWED",
    }


def build_local_council_adapters() -> dict:
    """Adapters du path factory : LOCAUX uniquement (Claude proxy 127.0.0.1 + Qwen LM Studio).
    PAS de GEMINI_FLASH (decision HumanGate 2026-07-06 : zero dependance API externe par construction).
    La voix DIVERGENCE (primary Gemini) retombe fail-soft sur Qwen via ROLE_ROUTING."""
    import council
    return {
        council.ModelId.CLAUDE:  council.ClaudeProxyAdapter(),   # constructeur force base_url locale
        council.ModelId.QWEN14B: council.QwenAdapter(),
    }


def _degraded_contract(session_id: str, timestamp: str, reason: str) -> dict[str, Any]:
    """Contrat all-BLOCKED (aucune voix exploitable) — fail-soft ultime, sans crash."""
    voice = {"model": "unknown", "verdict": "BLOCKED", "findings": [f"council degrade: {reason}"]}
    return {
        "schema_version": "1",
        "session_id": session_id,
        "timestamp": timestamp,
        "voices": {r: dict(voice) for r in _VOICE_ROLES},
        "proposed_items": [],
        "claim_verdict": "NO_CLAIM_ALLOWED",
    }


def run_factory_council(
    brief: str,
    task_id: str,
    *,
    session_id: str | None = None,
    timestamp: str | None = None,
    adapters: dict | None = None,
    runner: Any = None,
    journal_path: Path | str = DEFAULT_JOURNAL_PATH,
    proposals_path: Path | str = DEFAULT_PROPOSALS_PATH,
) -> dict[str, Any]:
    """Orchestration etape 4 : council LOCAL 2-voix -> transform -> validate (fail-hard).

    Fail-soft : LM Studio/proxy down ou erreur infra -> contrat all-BLOCKED (pas de crash, pas d'appel
    externe : Gemini n'est jamais construit). Fail-hard : le contrat transforme est valide par
    validate_contract ; non conforme -> CouncilContractError (journalise, propage).
    `runner(task, adapters)` injectable pour les tests (defaut : council.run_council reel, write=False).
    """
    import council
    ts = timestamp or council._now()
    sid = session_id or f"council-{task_id}-{ts}"
    ads = adapters if adapters is not None else build_local_council_adapters()
    task = council.CouncilTask(brief=brief, task_id=task_id)
    try:
        if runner is not None:
            result = runner(task, ads)
        else:
            import asyncio
            result = asyncio.run(council.run_council(task, ads, write=False))
    except Exception as exc:  # noqa: BLE001 — infra KO -> fail-soft, jamais de crash de la boucle
        contract = _degraded_contract(sid, ts, f"{type(exc).__name__}")
        return validate_contract(contract, journal_path=journal_path, proposals_path=proposals_path)
    contract = council_result_to_contract(result, session_id=sid, timestamp=ts)
    return validate_contract(contract, journal_path=journal_path, proposals_path=proposals_path)


if __name__ == "__main__":
    import argparse
    for _stream in (sys.stdout, sys.stderr):
        _reconf = getattr(_stream, "reconfigure", None)
        if _reconf is not None:
            try:
                _reconf(encoding="utf-8")
            except (ValueError, OSError):
                pass
    ap = argparse.ArgumentParser(description="Valide un contrat Council->Factory v1 (fail-hard).")
    ap.add_argument("path", help="Fichier JSON du contrat")
    args = ap.parse_args()
    try:
        validate_contract(json.loads(Path(args.path).read_text(encoding="utf-8")))
    except CouncilContractError as exc:
        print(f"[X] contrat REJETE: {exc}")
        print("claim_verdict: NO_CLAIM_ALLOWED")
        raise SystemExit(1)
    print("[OK] contrat conforme au schema v1 + garde write-path.")
    print("claim_verdict: NO_CLAIM_ALLOWED")
