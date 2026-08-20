#!/usr/bin/env python3
"""
kaizen_autoloop.py — Boucle Kaizen auto-pilotee

Orchestre : recall -> propose -> generate_charter -> execute -> validate -> close -> metrics -> loop

Modes d execution par lane :
  SAFE_AUTO      -> Claude Code subprocess automatique
  AUDIT_REQUIRED -> Charter genere + affiche + attend HumanGate
  HUMAN_REQUIRED -> Affiche + STOP
  FORBIDDEN      -> STOP immediat

Usage:
  python kaizen_autoloop.py              # boucle complete
  python kaizen_autoloop.py --once       # un seul IMP puis stop
  python kaizen_autoloop.py --lane SAFE_AUTO  # SAFE_AUTO uniquement
  python kaizen_autoloop.py --dry-run    # genere les charters sans executer
"""

import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

import argparse
import asyncio
import json
import logging
import os
import subprocess
import tempfile
import time
from datetime import date, datetime
from pathlib import Path

_log = logging.getLogger("kaizen_autoloop")

# Importer kaizen_loop depuis le meme dossier
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
try:
    import kaizen_loop as kl
except ImportError as e:
    print(f"[X] Impossible d importer kaizen_loop : {e}")
    sys.exit(1)

try:
    from golden_collector import archive_closed_imp as _archive
except ImportError:
    _archive = None

# ── Constants ─────────────────────────────────────────────
REPO_ROOT       = Path(__file__).resolve().parent.parent.parent
PYTHON_EXE      = sys.executable
CHARTER_DIR     = REPO_ROOT / "lab/chains/charters"
AUTOLOOP_LOG    = REPO_ROOT / "lab/chains/CHAIN_HISTORY.jsonl"
COST_LOG        = REPO_ROOT / "lab/cost_log.jsonl"
LOCK_PATH       = REPO_ROOT / "lab/.autoloop.lock"
SESSION_TOKEN_THRESHOLD = 100_000

# IMP-193 — TTL du lock autoloop.
LOCK_TTL_SECONDS      = 1800   # 30 min : au-delà le lock est considéré stale (age)
GRACE_SECONDS         = 10     # lock illisible/vide toléré ce délai (write partiel)
_LOCK_ACQUIRE_RETRIES = 3      # bornes anti-boucle sur vol de lock concurrent

# Governor déterministe (IMP-160) — source unique de vérité du gating lane (IMP-182).
# governance/ n'est pas un package : on ajoute son dossier au path, comme test_governor.
sys.path.insert(0, str(REPO_ROOT / "governance"))
try:
    import governor
except ImportError as e:
    print(f"[X] Impossible d importer governor : {e}")
    sys.exit(1)

# ── Council multi-LLM (IMP-208) ────────────────────────────────────────────────
# council.py vit dans scripts/ (pas un package) : on ajoute le dossier au path comme
# pour governance/. Import OPTIONNEL : si indisponible, le gate council est désactivé
# et l'autoloop garde son comportement historique (backward-compatible).
sys.path.insert(0, str(REPO_ROOT / "scripts"))
try:
    import council  # type: ignore
except ImportError as _e:
    council = None  # type: ignore
    _log.warning("council indisponible (%s) — gate council desactive", _e)

try:
    import web_reality_agent as _wra  # type: ignore  (governance/ déjà sur le path)
except ImportError as _e:
    _wra = None  # type: ignore
    _log.warning("web_reality_agent indisponible (%s) — brief inline charter seul", _e)

# Gate council — bornes & seuils.
COUNCIL_TIMEOUT_S          = 120    # guardrail : au-delà on skip le council et on exécute quand même
COUNCIL_CONFIDENCE_THRESHOLD = 0.7  # CouncilResult n'expose AUCUN champ confidence (IMP-198) :
                                    # on dérive un proxy (cf. _council_confidence_proxy).

# ── Chantier (d) — journal d'erreurs live (réutilise IMP-202) ─────────────────
# Best-effort LOUD : ne lève JAMAIS, ne masque jamais l'erreur d'origine. Garde de
# réentrance (RED TEAM C2 : un BLOCK de error_journal ne se re-journalise pas).
import threading

try:
    import error_journal as _ej
except ImportError as _e:
    _ej = None
    _log.warning("error_journal indisponible (%s) — journalisation live desactivee", _e)

ERROR_JOURNAL_PATH   = REPO_ROOT / "lab/reports/error_journal.jsonl"
ERROR_PROPOSALS_PATH = REPO_ROOT / "lab/reports/error_proposals.jsonl"
_EJ_GUARD = threading.local()


def journal_error(error_text: str, *, context: str = "") -> None:
    """Journalise une erreur via error_journal — best-effort LOUD, NE LÈVE JAMAIS.
    Erreur récurrente -> escalade une proposition AUDIT_REQUIRED (jamais d'add ledger)."""
    if _ej is None or not error_text:
        return
    if getattr(_EJ_GUARD, "active", False):
        return  # réentrance : on ne journalise pas un échec survenu dans la journalisation
    _EJ_GUARD.active = True
    try:
        text = f"[{context}] {error_text}" if context else error_text
        out = _ej.record_error(
            text,
            journal_path=ERROR_JOURNAL_PATH,
            proposals_path=ERROR_PROPOSALS_PATH,
            now_ts=int(time.time()),
        )
        if out.kind in ("proposed", "escalated") and out.proposal:
            _log.warning("error_journal: %s -> %s (AUDIT_REQUIRED, non auto-pickee)",
                         out.kind, out.proposal.get("proposal_id", "?"))
    except Exception:  # noqa: BLE001 — best-effort : jamais bloquant pour le flux d'origine
        _log.exception("error_journal: journalisation non-bloquante echouee")
    finally:
        _EJ_GUARD.active = False


# ── Lock inter-process (lab/.autoloop.lock) ───────────────
# Un seul autoloop à la fois : empêche deux process concurrents de muter le
# ledger / le working tree (commits) en même temps. Création atomique (O_EXCL).
#
# IMP-193 — TTL : le lock porte pid + ts(epoch) + create_time(psutil) + iso. À
# l'acquisition, un lock détenu par un PID mort (crash sans release_lock) OU plus
# vieux que LOCK_TTL_SECONDS est auto-relâché. Sans ça, un crash gelait le studio
# jusqu'à suppression manuelle du fichier.


def _pid_alive(pid: int | None, create_time: float | None = None) -> bool:
    """True si le process `pid` tourne. Jamais d'os.kill (sur Windows il TERMINE
    le process). Liveness via psutil ; PID-reuse détecté via create_time."""
    if pid is None or pid <= 0:
        return False
    try:
        import psutil
    except ImportError:
        return True  # fail-closed : sans psutil on ne sait pas -> on NE vole PAS
    try:
        if not psutil.pid_exists(pid):
            return False
        if create_time is not None:
            try:
                # RT-193-4 : un PID recyclé a un create_time différent -> stale.
                return abs(psutil.Process(pid).create_time() - create_time) < 1.0
            except psutil.Error:
                return False
        return True
    except Exception:
        return True  # fail-closed sur toute erreur psutil inattendue


def _parse_lock(content: str) -> dict:
    """Parse le contenu du lock. Formats : v2 'pid=N ts=F create=F iso=...' et
    legacy 'pid=N <iso>'. Renvoie {pid, ts, create, iso} (valeurs None si absentes)."""
    info: dict = {"pid": None, "ts": None, "create": None, "iso": None}
    if not content:
        return info
    for tok in content.split():
        if tok.startswith("pid="):
            try:
                info["pid"] = int(tok[4:])
            except ValueError:
                pass
        elif tok.startswith("ts="):
            try:
                info["ts"] = float(tok[3:])
            except ValueError:
                pass
        elif tok.startswith("create="):
            try:
                info["create"] = float(tok[7:])
            except ValueError:
                pass
        elif tok.startswith("iso="):
            info["iso"] = tok[4:]
        elif info["iso"] is None and "T" in tok and "-" in tok:
            info["iso"] = tok  # legacy : iso positionnel
    if info["ts"] is None and info["iso"]:
        try:
            info["ts"] = datetime.fromisoformat(info["iso"]).timestamp()
        except ValueError:
            pass
    return info


def _lock_is_stale(lock_path: Path) -> bool:
    """True si le lock peut être volé : PID mort, OU age > TTL, OU contenu
    illisible/vide depuis > GRACE_SECONDS. Fail-closed (False) en cas de doute."""
    try:
        content = lock_path.read_text(encoding="utf-8").strip()
    except OSError:
        return False  # disparu/illisible à l'instant T : laisser O_EXCL décider
    info = _parse_lock(content)
    pid, ts = info["pid"], info["ts"]
    now = time.time()

    if pid is not None and not _pid_alive(pid, info["create"]):
        return True  # créateur mort (ou PID recyclé)
    if ts is not None and now - ts > LOCK_TTL_SECONDS:
        return True  # TTL dépassé
    if pid is not None or ts is not None:
        return False  # détenu par un process vivant et récent

    # Contenu sans pid ni ts (write partiel / corrompu) : tolérance GRACE via mtime.
    try:
        age = now - lock_path.stat().st_mtime
    except OSError:
        return False
    return age > GRACE_SECONDS


def _lock_content() -> str:
    """Contenu du lock v2 : pid + ts(epoch) + create_time(psutil) + iso lisible."""
    create = ""
    try:
        import psutil
        create = f" create={psutil.Process(os.getpid()).create_time()}"
    except Exception:
        pass
    return f"pid={os.getpid()} ts={time.time()}{create} iso={datetime.now().isoformat()}\n"


def acquire_lock(lock_path: Path = LOCK_PATH) -> bool:
    """Crée le lock atomiquement (O_EXCL). Auto-relâche un lock stale (PID mort /
    age > TTL). False si détenu par un process vivant et récent."""
    for _ in range(_LOCK_ACQUIRE_RETRIES):
        try:
            fd = os.open(str(lock_path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        except FileExistsError:
            if not _lock_is_stale(lock_path):
                return False
            _log.warning("autoloop.lock stale -> auto-release (%s)", lock_path)
            try:
                lock_path.unlink()
            except FileNotFoundError:
                pass  # un autre process l'a déjà volé : on reboucle
            continue
        try:
            os.write(fd, _lock_content().encode("utf-8"))
        finally:
            os.close(fd)
        return True
    return False  # contention persistante après _LOCK_ACQUIRE_RETRIES essais


def release_lock(lock_path: Path = LOCK_PATH) -> None:
    """Supprime le lock. No-op s'il a déjà disparu."""
    try:
        lock_path.unlink()
    except FileNotFoundError:
        pass


# Compteurs de session (réinitialisés à chaque démarrage du processus)
_session_tokens: int = 0
_session_imps_closed: int = 0


# ── recall / propose ──────────────────────────────────────

def recall() -> dict:
    """Charge l etat courant du ledger."""
    ledger_path = kl.find_ledger()
    data = kl.load_ledger(ledger_path)
    imps = data["improvements"]
    counts = {}
    for imp in imps:
        s = imp.get("status", "OPEN")
        counts[s] = counts.get(s, 0) + 1
    return {
        "open_count":     counts.get("OPEN", 0),
        "closed_count":   counts.get("CLOSED", 0),
        "blocked_count":  counts.get("BLOCKED", 0),
        "deferred_count": counts.get("DEFERRED", 0),
        "data":           data,
        "ledger_path":    ledger_path,
    }


def propose(lane_filter: str | None = None, data: dict | None = None) -> dict | None:
    """Retourne le prochain IMP actionnable (ROI max). None si aucun."""
    if data is None:
        ledger_path = kl.find_ledger()
        data = kl.load_ledger(ledger_path)
    imps = data["improvements"]
    actionable = [i for i in imps if kl.is_actionable(i, imps)]
    if lane_filter:
        actionable = [i for i in actionable if i.get("lane") == lane_filter]
    if not actionable:
        return None
    actionable.sort(
        key=lambda i: (kl.roi_score(i), kl.IMPACT_WEIGHT.get(i.get("impact"), 0)),
        reverse=True,
    )
    return actionable[0]


# ── Charter generation ────────────────────────────────────

def build_minimal_charter(imp: dict) -> str:
    """Charter minimal depuis le ledger — fallback si run_chain / LM Studio down."""
    files = imp.get("files", [])
    files_str = "\n".join(f"  - {f}" for f in files) if files else "  (aucun fichier specifie)"
    val_lines = [
        rf".\.venv312\Scripts\python.exe -m py_compile {f}"
        for f in files if f.endswith(".py")
    ]
    val_lines.append(r".\.venv312\Scripts\python.exe -m pytest -v")
    val_str = "\n".join(val_lines)

    return "\n".join([
        f"# CHARTER {imp['id']} — {imp['title']}",
        "",
        f"**Lane:** {imp['lane']}",
        "**Fichiers autorises:**",
        files_str,
        "",
        "## REGLES ABSOLUES",
        "",
        "- Aucun git write.",
        "- Tests obligatoires.",
        "- claim_verdict: NO_CLAIM_ALLOWED",
        "",
        "## OBJECTIF",
        "",
        imp.get("acceptance", "Voir ledger."),
        "",
        "## NOTES",
        "",
        imp.get("notes", ""),
        "",
        "## VALIDATION",
        "",
        "```powershell",
        val_str,
        "```",
        "",
        "## RAPPORT FINAL ATTENDU",
        "",
        "software_verdict: <resultat>",
        "evidence_verdict: MECHANICAL_VALIDATION_ONLY",
        "claim_verdict:    NO_CLAIM_ALLOWED",
    ])


def generate_charter(imp: dict) -> str:
    """Genere le charter via run_chain --mode charter. Fallback si indisponible."""
    CHARTER_DIR.mkdir(parents=True, exist_ok=True)
    charter_path = CHARTER_DIR / f"{imp['id']}_charter.md"

    try:
        result = subprocess.run(
            [PYTHON_EXE, str(REPO_ROOT / "lab/chains/run_chain.py"),
             "--mode", "charter", "--imp", imp["id"]],
            capture_output=True,
            text=True,
            cwd=str(REPO_ROOT),
            timeout=60,
        )
        if result.returncode == 0 and charter_path.exists():
            return str(charter_path)
    except Exception:
        pass

    # Fallback : charter minimal depuis le ledger
    content = build_minimal_charter(imp)
    charter_path.write_text(content, encoding="utf-8")
    return str(charter_path)


def display_charter_summary(imp: dict, charter_path: str) -> None:
    print(f"[OK] CHARTER genere : {charter_path}")
    print(f"  IMP       : {imp['id']} — {imp['title']}")
    print(f"  Lane      : {imp['lane']}")
    print(f"  Acceptance: {str(imp.get('acceptance', ''))[:80]}")


# ── Council multi-LLM — gate avant exécution (IMP-208) ─────
# Pour un IMP SAFE_AUTO, on délègue PLAN/REVUE à council.py (Claude proxy local +
# Qwen + Gemini divergence) AVANT d'exécuter. Le CONSENSUS du council est injecté
# comme contexte READ-ONLY dans le prompt de l'exécuteur (jamais le brief brut).
#
# Doctrine guardrails (best-effort, jamais bloquant sur l'infra) :
#   - governor.check() AVANT toute exécution du council ; BLOCK -> skip + exécute.
#   - timeout 120s            -> skip council, WARNING, exécute quand même.
#   - exception council       -> journalise (error_journal), exécute quand même.
#   - council "collapsed"     -> infra dégradée (mono-modèle) -> skip + exécute.
#   - requires_humangate réel -> ESCALADE : on stoppe l'IMP, PAS d'exécution auto.
# AUDIT_REQUIRED ne passe JAMAIS par le council auto (route HumanGate).


def build_council_brief(imp: dict, charter_path: str) -> str:
    """Brief texte pour le council, dérivé du charter de l'IMP.

    web_reality_agent.to_council_brief() attend des ScoredRecord récupérés en live
    (réseau) — non disponibles dans ce chemin déterministe per-IMP. On consulte donc
    WRA avec une liste vide (en-tête « aucune source vérifiée ») puis on complète par
    un brief inline issu du charter. Gap documenté : pas de fetch web ici.
    """
    parts: list[str] = []
    if _wra is not None:
        try:
            parts.append(_wra.to_council_brief([]))
        except Exception:  # noqa: BLE001 — best-effort, jamais bloquant
            pass
    parts.extend([
        f"IMP {imp.get('id', '?')} — {imp.get('title', '')}",
        f"Lane: {imp.get('lane', '')}",
        f"Acceptance: {imp.get('acceptance', '')}",
    ])
    notes = imp.get("notes")
    if notes:
        parts.append(f"Notes: {notes}")
    files = imp.get("files") or []
    if files:
        parts.append("Fichiers: " + ", ".join(str(f) for f in files))
    return "\n".join(parts)


def _build_council_adapters() -> dict:
    """Construit les adapters réels (aucun I/O réseau à la construction)."""
    return {
        council.ModelId.CLAUDE:       council.ClaudeProxyAdapter(),
        council.ModelId.QWEN14B:      council.QwenAdapter(),
        council.ModelId.GEMINI_FLASH: council.GeminiAdapter(),
    }


def _council_confidence_proxy(result) -> float:
    """Proxy de confiance — CouncilResult n'expose AUCUN champ confidence (IMP-198).

    Dérivé déterministe des signaux disponibles : collapse (mono-modèle) -> 0.0 ;
    sinon 1.0 dégradé de 0.3 par désaccord escaladant et de 0.1 si divergences.
    On N'INVENTE PAS d'attribut sur la classe — calcul pur côté autoloop.
    """
    if getattr(result, "collapsed", False):
        return 0.0
    score = 1.0 - 0.3 * len(getattr(result, "disagreements", ()) or ())
    if getattr(result, "divergences", ()) or ():
        score -= 0.1
    return max(0.0, score)


async def _invoke_run_council(task, adapters):
    """Appel direct de l'API réelle council.run_council (async). Monkeypatchable en test."""
    return await council.run_council(task, adapters, timeout=COUNCIL_TIMEOUT_S, write=True)


async def _run_council_with_timeout(task, adapters):
    """Wrap le council dans un budget global COUNCIL_TIMEOUT_S (guardrail timeout)."""
    return await asyncio.wait_for(_invoke_run_council(task, adapters), timeout=COUNCIL_TIMEOUT_S)


def run_council_gate(imp: dict, charter_path: str) -> tuple[str | None, bool]:
    """Exécute le council avant un IMP SAFE_AUTO. Renvoie (consensus_md, stop).

    stop=True  -> requires_humangate réel : ESCALADE, ne PAS exécuter l'IMP.
    stop=False -> exécution autorisée ; consensus_md (ou None si skip guardrail) à injecter.
    """
    if council is None:
        return None, False  # gate désactivé (import indispo) — comportement historique

    # Guardrail : governor.check() AVANT toute exécution du council.
    decision = governor.check(getattr(council, "COUNCIL_WRITE_ACTION",
                                      {"lane": "SAFE_AUTO", "mission": "council_artifact_write"}))
    if not decision.allowed:
        _log.warning("council: governor BLOCK (%s) -> skip council, execute %s anyway",
                     decision.reason, imp.get("id"))
        return None, False

    brief = build_council_brief(imp, charter_path)
    task = council.CouncilTask(brief=brief, task_id=str(imp.get("id", "council-adhoc")))
    try:
        adapters = _build_council_adapters()
        result = asyncio.run(_run_council_with_timeout(task, adapters))
    except asyncio.TimeoutError:
        _log.warning("council: timeout %ss -> skip council, execute %s anyway",
                     COUNCIL_TIMEOUT_S, imp.get("id"))
        return None, False
    except Exception as exc:  # noqa: BLE001 — guardrail : exécute quand même, journalise
        _log.warning("council: erreur (%s) -> skip council, execute %s anyway",
                     type(exc).__name__, imp.get("id"))
        journal_error(f"{type(exc).__name__}: {exc}", context=f"council:{imp.get('id')}")
        return None, False

    # Infra dégradée (mono-modèle joignable) : skip guardrail, on exécute quand même.
    if getattr(result, "collapsed", False):
        _log.warning("council: collapsed (distinct_models=%s) -> skip, execute %s anyway",
                     getattr(result, "distinct_models", "?"), imp.get("id"))
        return None, False

    # Désaccord réel entre modèles joignables -> ESCALADE HumanGate, pas d'exécution auto.
    if getattr(result, "requires_humangate", False):
        _log.warning("council: requires_humangate pour %s -> escalade HumanGate (pas d'exec auto)",
                     imp.get("id"))
        journal_error(
            f"council requires_humangate: {len(getattr(result, 'disagreements', ()) or ())} desaccord(s)",
            context=f"council_humangate:{imp.get('id')}")
        return None, True

    # Gate de confiance (proxy dérivé — pas de champ confidence sur CouncilResult).
    conf = _council_confidence_proxy(result)
    if conf < COUNCIL_CONFIDENCE_THRESHOLD:
        _log.warning("council: confiance proxy %.2f < %.2f pour %s -> continue (advisory)",
                     conf, COUNCIL_CONFIDENCE_THRESHOLD, imp.get("id"))

    consensus_md = council.render_consensus_md(result)
    return consensus_md, False


# ── Path FACTORY (chantier Council->Factory) — DISTINCT du gate IMP-208 ci-dessus ─
# Le gate (run_council_gate) decide s'il faut EXECUTER un IMP. Le path factory, lui, transforme la
# sortie council en contrat v1 puis ROUTE les proposed_items vers le ledger (nouveaux IMP
# AUDIT_REQUIRED d'origine council). Deux flux volontairement decouples. Impl dans les modules
# council_contract / council_router (deviation ratifiee 2026-07-06 : un seul module possede le
# contrat) ; ici on ne fait que CABLER l'appel. Ecriture ledger : uniquement via kaizen_loop.
# NON invoque dans la boucle live : point d'entree explicite (ne change pas le comportement gate).

def run_council_factory(imp: dict, charter_path: str, *, ledger_path=None,
                        session: str = "", runner=None, dry_run: bool = False):
    """Council LOCAL 2-voix -> contrat v1 (fail-hard) -> routeur -> ledger (single-writer).

    `ledger_path` defaut = ledger canonique (kaizen_loop.find_ledger). Les tests passent un ledger
    temporaire. `runner` injectable (tests sans LM Studio). Renvoie (contract, RoutingResult, new_ids).
    """
    import council_contract
    import council_router
    lp = ledger_path if ledger_path is not None else kl.find_ledger()
    brief = build_council_brief(imp, charter_path)
    contract = council_contract.run_factory_council(
        brief, str(imp.get("id", "council-adhoc")), session_id=None, timestamp=None, runner=runner)
    result, new_ids = council_router.apply_contract(
        contract, ledger_path=lp, session=session, dry_run=dry_run)
    return contract, result, new_ids


# ── Execution ─────────────────────────────────────────────

def execute_via_claude_code(charter_path: str, imp: dict, consensus: str | None = None) -> str:
    """Lance Claude Code CLI en non-interactif avec le charter. Fallback HumanGate.

    Si `consensus` (CONSENSUS.md du council, IMP-208) est fourni, il est injecté EN TÊTE
    du prompt de l'exécuteur comme contexte READ-ONLY — l'exécuteur reçoit le CONSENSUS,
    jamais le brief brut.
    """
    charter_content = Path(charter_path).read_text(encoding="utf-8")
    if consensus:
        charter_content = (
            "## COUNCIL CONSENSUS (READ ONLY — contexte multi-LLM, IMP-208)\n"
            + consensus
            + "\n\n---\n\n"
            + charter_content
        )

    for cmd in [
        ["npx", "@anthropic-ai/claude-code", "--print", charter_content],
        ["claude", "--print", charter_content],
    ]:
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                cwd=str(REPO_ROOT),
                timeout=300,
            )
            if result.returncode == 0:
                return result.stdout
        except FileNotFoundError:
            continue
        except subprocess.TimeoutExpired:
            return "TIMEOUT"

    print("[!] Claude Code CLI non disponible. Mode manuel.")
    return request_humangate(imp, charter_path)


def request_humangate(imp: dict, charter_path: str) -> str:
    """Affiche le charter et attend que HumanGate colle le rapport."""
    charter_content = Path(charter_path).read_text(encoding="utf-8")

    print("\n" + "=" * 72)
    print(f"HUMANGATE REQUIS — {imp['id']} [{imp['lane']}]")
    print("=" * 72)
    print(f"Charter : {charter_path}")
    print("\nContenu :")
    preview = charter_content[:2000] + "..." if len(charter_content) > 2000 else charter_content
    print(preview)
    print("\n" + "=" * 72)
    print("Lance Claude Code avec ce charter.")
    print("Colle le rapport final ci-dessous (ligne vide x2 pour terminer) :")
    print("=" * 72 + "\n")

    lines = []
    empty_count = 0
    while True:
        try:
            line = input()
            if line == "":
                empty_count += 1
                if empty_count >= 2:
                    break
            else:
                empty_count = 0
                lines.append(line)
        except EOFError:
            break

    return "\n".join(lines)


# ── Validation ────────────────────────────────────────────

def validate_report(report: str, imp: dict) -> bool:
    """Valide que le rapport indique un succes. Pur, sans I/O sauf cas ambigu."""
    if not report or report == "TIMEOUT":
        return False

    success_signals = [
        "software_verdict: DOCS_OK",
        "software_verdict: AUDIT_REQUIRED_CHANGES",
        "passed",
        "[ok]",
    ]
    fail_signals = [
        "software_verdict: BLOCKED",
        "TIMEOUT",
        "FAILED",
    ]

    report_lower = report.lower()

    for sig in fail_signals:
        if sig.lower() in report_lower:
            return False
    for sig in success_signals:
        if sig.lower() in report_lower:
            return True

    # Ambigu : demander HumanGate
    print("[!] Rapport ambigu. Validation manuelle (o/n) ?")
    try:
        answer = input().strip().lower()
        return answer in ("o", "oui", "y", "yes")
    except EOFError:
        return False


# ── Close + metrics + log ─────────────────────────────────

def _ingest_imp_closed(imp: dict) -> None:
    """Non-bloquant : ingère l event IMP_CLOSED dans le backbone (scripts/ingest_event.py)."""
    payload = {
        "id": imp["id"],
        "closed_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "oracle_verdict": "PASS",
        "title": imp.get("title", ""),
        "lane": imp.get("lane", ""),
    }
    try:
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False, encoding="utf-8") as tmp:
            json.dump(payload, tmp)
            tmp_path = tmp.name
        subprocess.run(
            [PYTHON_EXE, str(REPO_ROOT / "scripts" / "ingest_event.py"),
             "--oracle", "imp_closed", "--report", tmp_path],
            capture_output=True, text=True, timeout=15, cwd=str(REPO_ROOT),
        )
    except Exception as exc:
        print(f"[backbone] ingest_imp_closed non-bloquant: {exc}")
    finally:
        try:
            Path(tmp_path).unlink(missing_ok=True)
        except Exception:
            pass


def close_imp(imp: dict) -> None:
    """Ferme l IMP dans le ledger via kaizen_loop.py close."""
    result = subprocess.run(
        [PYTHON_EXE, str(REPO_ROOT / "lab/chains/kaizen_loop.py"),
         "close", imp["id"], "--session", str(date.today())],
        capture_output=True,
        text=True,
        cwd=str(REPO_ROOT),
    )
    if result.returncode == 0:
        print(f"[OK] {imp['id']} ferme dans le ledger.")
        if result.stdout:
            print(result.stdout.strip())
    else:
        print(f"[!] Erreur fermeture {imp['id']} : {result.stderr.strip()}")


def metrics() -> None:
    """Affiche les metrics via kaizen_loop.py metrics."""
    subprocess.run(
        [PYTHON_EXE, str(REPO_ROOT / "lab/chains/kaizen_loop.py"), "metrics"],
        cwd=str(REPO_ROOT),
    )


def log_cost(imp: dict, charter_path: str, report: str, success: bool) -> None:
    """Logue le coût estimé en tokens dans lab/cost_log.jsonl."""
    global _session_tokens, _session_imps_closed

    charter_len = len(Path(charter_path).read_text(encoding="utf-8")) if Path(charter_path).exists() else 0
    tokens_used = int((charter_len + len(report or "")) / 4)
    model = os.environ.get("ANTHROPIC_MODEL", "claude-code-estimated")

    entry = {
        "ts":          datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "imp_id":      imp["id"],
        "tokens_used": tokens_used,
        "model":       model,
        "success":     success,
    }
    COST_LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(COST_LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")

    _session_tokens += tokens_used
    if success:
        _session_imps_closed += 1

    if _session_tokens > SESSION_TOKEN_THRESHOLD and _session_imps_closed == 0:
        print(f"[!] ALERTE COUT : {_session_tokens} tokens consommes sans IMP ferme cette session.")
    else:
        print(f"[cost] {imp['id']} : ~{tokens_used} tokens (session total : {_session_tokens})")


def log_autoloop_event(imp: dict, status: str, report: str) -> None:
    """Logue un event dans CHAIN_HISTORY.jsonl."""
    entry = {
        "chain":        "kaizen_autoloop",
        "timestamp":    datetime.now().strftime("%Y%m%d_%H%M%S"),
        "imp_id":       imp["id"],
        "imp_title":    imp.get("title", ""),
        "lane":         imp.get("lane", ""),
        "status":       status,
        "report_snippet": (report or "")[:200],
        "claim_verdict": "NO_CLAIM_ALLOWED",
    }
    AUTOLOOP_LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(AUTOLOOP_LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


# ── Main loop ─────────────────────────────────────────────

def run_loop(args) -> None:
    """Boucle principale Kaizen auto-pilotee."""
    dry_run = getattr(args, "dry_run", False)
    once    = getattr(args, "once", False)
    lane_filter = getattr(args, "lane", None)
    imp_id  = getattr(args, "imp_id", None)
    # Cibler un IMP précis implique un passage unique : on ne reboucle pas.
    if imp_id:
        once = True

    while True:
        # 1. Etat
        state = recall()
        print(f"[OK] RECALL : {state['closed_count']} closed, {state['open_count']} open")

        if not state["open_count"]:
            print("[OK] Backlog vide. Boucle terminee.")
            break

        # 2. Prochain IMP — ciblé (--imp-id) ou ROI max (propose)
        if imp_id:
            imps = state["data"]["improvements"]
            imp = next((i for i in imps if i.get("id") == imp_id), None)
            if imp is None:
                print(f"[X] IMP {imp_id} introuvable dans le ledger. Arret.")
                break
            if not kl.is_actionable(imp, imps):
                print(f"[X] IMP {imp_id} non actionnable "
                      f"(status != OPEN ou blocked_by non resolu). Arret.")
                break
            if lane_filter and imp.get("lane") != lane_filter:
                print(f"[X] IMP {imp_id} lane={imp.get('lane')} != "
                      f"filtre {lane_filter}. Arret.")
                break
        else:
            imp = propose(lane_filter=lane_filter, data=state["data"])
            if not imp:
                print("[!] Aucun IMP actionnable. Arret.")
                break
        print(f"[OK] PROPOSE : {imp['id']} [{imp['lane']}]")

        # 3. Gate gouvernance déterministe — governor.check() (IMP-182)
        #    Source unique de vérité : remplace le gating FORBIDDEN inline (double
        #    source). AUDIT_REQUIRED est BLOCK (audit non validé) mais reste routable
        #    vers le HumanGate (étape 6) — ce n'est pas un arrêt dur de la boucle.
        decision = governor.check({"lane": imp["lane"], "mission": imp.get("mission")})
        if not decision.allowed and imp["lane"] != "AUDIT_REQUIRED":
            print(f"[X] {imp['lane']} : {imp['id']} — governor BLOCK "
                  f"({decision.reason}). Arret autoloop.")
            # 2b — BLOCK ANORMAL seul (AUDIT_REQUIRED routinier déjà exclu par la garde ci-dessus).
            journal_error(f"governor BLOCK lane={imp['lane']}: {decision.reason}",
                          context=f"governor_block:{imp['id']}")
            break

        # 4. Generer charter
        charter_path = generate_charter(imp)
        display_charter_summary(imp, charter_path)

        # 5. Dry-run : stop avant execution
        if dry_run:
            print(f"[DRY-RUN] Pas d execution. HumanGate requis pour {imp['lane']}.")
            break

        # 6-8. Execution + validation + close. Toute exception NON GEREE est journalisee
        #       (2c, best-effort LOUD) puis re-levee — on ne masque jamais l'erreur d'origine.
        try:
            # 6. Executer selon lane
            if imp["lane"] == "SAFE_AUTO":
                # 6a. Council multi-LLM AVANT exécution (IMP-208). SAFE_AUTO uniquement.
                consensus_md, stop = run_council_gate(imp, charter_path)
                if stop:
                    print(f"[X] Council escalade {imp['id']} -> HumanGate. "
                          f"Pas d'execution auto.")
                    log_autoloop_event(imp, "COUNCIL_HUMANGATE",
                                       "council requires_humangate — escalade Pierre")
                    break
                report = execute_via_claude_code(charter_path, imp, consensus=consensus_md)
            elif imp["lane"] == "AUDIT_REQUIRED":
                report = request_humangate(imp, charter_path)
            else:
                print(f"[!] Lane {imp['lane']} necessite HumanGate. Arret.")
                break

            # 7. Valider rapport
            success = validate_report(report, imp)

            # 8. Close ou signaler echec
            log_cost(imp, charter_path, report, success)
            if success:
                close_imp(imp)
                if _archive is not None:
                    try:
                        charter_file = CHARTER_DIR / f"{imp['id']}_charter.md"
                        _archive(imp, charter_file, report=report[:500] if report else "")
                        print(f"[OK] {imp['id']} archive dans golden_examples.jsonl")
                    except Exception as e:
                        print(f"[!] golden_collector hook : {e}")
                metrics()
                log_autoloop_event(imp, "SUCCESS", report)
                _ingest_imp_closed(imp)
            else:
                # 2a — oracle rouge : journalise le rapport d'echec (erreur recurrente -> escalade).
                print(f"[X] Echec sur {imp['id']}. HumanGate requis.")
                log_autoloop_event(imp, "FAIL", report)
                journal_error(report or "TIMEOUT/empty report", context=f"oracle_fail:{imp['id']}")
                break
        except Exception as exc:
            # 2c — exception non geree : journalise (best-effort) puis re-leve telle quelle.
            journal_error(f"{type(exc).__name__}: {exc}", context=f"exception:{imp['id']}")
            raise

        # 9. Stop si --once
        if once:
            break

        time.sleep(2)


def main():
    parser = argparse.ArgumentParser(
        description="Kaizen Autoloop — boucle Kaizen auto-pilotee"
    )
    parser.add_argument("--once", action="store_true",
                        help="Un seul IMP puis stop")
    parser.add_argument("--imp-id", dest="imp_id", default=None,
                        help="Cible un IMP precis (ex: IMP-132). Implique --once. "
                             "Refuse si l'IMP n'est pas actionnable (OPEN + blocked_by resolu).")
    parser.add_argument("--lane", default=None,
                        help="Filtrer par lane (SAFE_AUTO, AUDIT_REQUIRED, ...)")
    parser.add_argument("--dry-run", dest="dry_run", action="store_true",
                        help="Genere les charters sans executer")
    args = parser.parse_args()

    # Lock déjà détenu par le parent (dispatch_bridge) ? On ne le reprend pas.
    if os.environ.get("AUTOLOOP_LOCK_INHERITED") == "1":
        run_loop(args)
        return

    if not acquire_lock():
        try:
            holder = LOCK_PATH.read_text(encoding="utf-8").strip()
        except OSError:
            holder = "?"
        print(f"[X] LOCK : {LOCK_PATH} existe deja ({holder}) — un autre autoloop "
              f"tourne. Abort. (si stale : supprimer le fichier)")
        sys.exit(1)
    try:
        run_loop(args)
    finally:
        release_lock()


if __name__ == "__main__":
    main()
