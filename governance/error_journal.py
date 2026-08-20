#!/usr/bin/env python3
"""error_journal.py — journal d'erreurs + pattern matcher + IMP auto-propose (IMP-202).

Comportement :
  - erreur dont le pattern est CONNU  -> on rappelle le fix (aucune proposition) ;
  - erreur INCONNUE                   -> on auto-propose un IMP en statut PROPOSED
                                          (JAMAIS auto-close, JAMAIS de mutation du ledger réel) ;
  - toute écriture (journal, proposition) passe par governor.check() (BLOCK -> aucune écriture).

Architecture (style IMP-199/200) : cœur PUR/déterministe (`signature`, `classify`,
`build_proposal`) sans I/O ni horloge cachée (`now_ts` injecté) ; frontière I/O = `_append_jsonl`.
Le texte d'erreur est une donnée opaque (jamais exécuté / interprété).

Concurrence (RT-202-4) : la section dédup (lire signatures -> proposer) est protégée par un
verrou fichier portable best-effort. Hypothèse studio = écrivain quasi-unique ; le verrou couvre
les rares chevauchements multi-process. Ordering (RT-202-3) : TOUTES les gates governor passent
AVANT toute écriture -> un BLOCK laisse 0 effet de bord (pas d'état semi-écrit).
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import governor  # noqa: E402  (gouvernance déterministe — garde toute écriture)

logger = logging.getLogger(__name__)

# ── missions governor (hors FORBIDDEN_MISSIONS) ───────────────────────────────
# RT-202-2 (by-design) : governor.py est le POINT DE POLITIQUE central et unique. Ces missions
# sont SAFE_AUTO/non-forbidden -> ALLOW par défaut. Pour rendre une écriture refusable en prod,
# ajouter sa mission à governor.FORBIDDEN_MISSIONS (source de vérité unique). Le gate reste le
# chokepoint réel : toute écriture y passe.
JOURNAL_MISSION = "error_journal_write"
PROPOSE_MISSION = "error_imp_propose"

# ── HMAC du journal (chantier d — defense-in-depth) ───────────────────────────
# Vrai HMAC (hmac.new), PAS sha256(key+payload) — RED TEAM M1. Clé via STUDIO_HMAC_KEY
# (défaut non secret "studio-dev" : intégrité/anti-corruption, pas anti-forge). Vérif
# PAR LIGNE à la lecture (jamais de hard-reject global : feed diagnostique best-effort).
_HMAC_KEY_ENV = "STUDIO_HMAC_KEY"
_HMAC_DEFAULT = "studio-dev"

# Seuil d'escalade : > 2 occurrences (3e) -> bump la proposition AUDIT_REQUIRED existante.
# RED TEAM C1 : JAMAIS d'auto-add SAFE_AUTO au ledger réel (boucle auto-amplifiante).
ESCALATE_THRESHOLD = 3

# Valeurs d'env sensibles à ne jamais écrire dans le journal (RED TEAM M1 — fuite via excerpt).
_SECRET_ENV_HINT = re.compile(r"(KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL)", re.IGNORECASE)


def _hmac_key() -> bytes:
    return os.getenv(_HMAC_KEY_ENV, _HMAC_DEFAULT).encode("utf-8")


def _canonical(entry: "dict[str, Any]") -> str:
    """Sérialisation canonique déterministe (champ hmac exclu) — signage == écriture."""
    payload = {k: v for k, v in entry.items() if k != "hmac"}
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sign_entry(entry: "dict[str, Any]") -> str:
    """HMAC-SHA256 hex de la sérialisation canonique (hors champ hmac)."""
    return hmac.new(_hmac_key(), _canonical(entry).encode("utf-8"), hashlib.sha256).hexdigest()


def verify_entry(entry: "dict[str, Any]") -> bool:
    """True si entry['hmac'] correspond à la signature recalculée (compare_digest, fail-closed)."""
    got = entry.get("hmac")
    if not isinstance(got, str):
        return False
    try:
        return hmac.compare_digest(got, sign_entry(entry))
    except Exception:  # noqa: BLE001 — entrée non-ascii / illisible -> invalide
        return False


def _scrub_secrets(text: str) -> str:
    """Remplace toute valeur d'env sensible (>=8 chars) présente dans `text` par [SECRET].
    Empêche qu'une traceback/dump d'env grave une clé en clair dans le journal signé."""
    out = text
    for name, val in os.environ.items():
        if val and len(val) >= 8 and _SECRET_ENV_HINT.search(name):
            out = out.replace(val, "[SECRET]")
    return out


# ── erreurs ───────────────────────────────────────────────────────────────────
class ErrorJournalError(Exception):
    """Entrée invalide / état illégal."""


class JournalWriteBlocked(ErrorJournalError):
    """governor.check() a refusé l'écriture du JOURNAL — aucune écriture effectuée."""


class ProposeBlocked(ErrorJournalError):
    """governor.check() a refusé la PROPOSITION — aucune écriture effectuée (RT-202-3)."""


# ── patterns connus (seed réel, ANCRÉS — RT-202-1) ────────────────────────────
@dataclass(frozen=True)
class KnownPattern:
    id: str
    regex: str
    fix: str
    imp_ref: str | None = None


# RT-202-1 : patterns ANCRÉS avec discriminants co-occurrents pour éviter qu'une erreur NOUVELLE
# contenant un sous-mot ('unwrap()', 'empty content', 'denied') soit faussement classée 'connue'
# et que sa proposition soit silencieusement supprimée.
KNOWN_PATTERNS: tuple[KnownPattern, ...] = (
    KnownPattern(
        "qwen36-json-empty",
        r"qwen\s*3\.?6|qwen.{0,30}(thinking|empty (json )?content)|thinking mode.{0,30}empt",
        "Qwen3.6 vide le content en thinking mode pour le JSON — utiliser Qwen2.5-14B (LM_MODEL).",
    ),
    KnownPattern(
        "rust-unwrap-no-safety",
        r"(Result|Option)::unwrap\(\)|unwrap\(\).{0,40}(Err|None|panicked)|panicked.{0,40}unwrap\(\)",
        "unwrap() sans // SAFETY interdit en prod (rust-src.md) — gérer l'erreur ou annoter // SAFETY:.",
    ),
    KnownPattern(
        "missing-utf8-encoding",
        r"UnicodeDecodeError|UnicodeEncodeError|charmap.{0,10}codec|'ascii' codec",
        "open() Python sans encoding — ajouter encoding='utf-8' explicite (CLAUDE.md).",
    ),
    KnownPattern(
        "absolute-path",
        r"[A-Za-z]:\\Users\\|/home/[\w.-]+/|/Users/[\w.-]+/|\$HOME/",
        "Chemin absolu/utilisateur — utiliser un chemin relatif au repo root (CLAUDE.md).",
    ),
    KnownPattern(
        "forbidden-zone-write",
        r"\b(tests|eval|oracle|bench|puzzles)/.{0,40}(permission|forbidden|denied)",
        "Écriture en zone FORBIDDEN (tests/ eval/ oracle/ bench/ puzzles/) — gate Pierre requise.",
    ),
)


# ── modèles ───────────────────────────────────────────────────────────────────
@dataclass(frozen=True)
class Match:
    pattern_id: str
    fix: str
    imp_ref: str | None


@dataclass(frozen=True)
class Outcome:
    kind: str               # "known" | "proposed" | "duplicate"
    match: Match | None
    proposal: dict[str, Any] | None


# ── cœur pur ──────────────────────────────────────────────────────────────────
_INT_RE = re.compile(r"\b\d+\b")
_HEX_RE = re.compile(r"\b0x[0-9a-fA-F]+\b|\b[0-9a-fA-F]{8,}\b")
_WS_RE = re.compile(r"\s+")


def _normalize(error_text: str) -> str:
    """Normalise une erreur en sa CLASSE : casse, espaces, nombres/hex génériques.

    RT-202-5 (tradeoff assumé) : deux erreurs ne différant QUE par des nombres/hex fusionnent
    (dédup voulue). Les erreurs différant par des MOTS gardent des signatures distinctes."""
    t = error_text.strip().lower()
    t = _HEX_RE.sub("<hex>", t)
    t = _INT_RE.sub("<n>", t)
    t = _WS_RE.sub(" ", t)
    return t


def signature(error_text: str) -> str:
    """Signature déterministe (hex 16) de la classe d'erreur. Pur."""
    if not isinstance(error_text, str):
        raise ErrorJournalError(f"error_text non-string: {type(error_text).__name__}")
    return hashlib.sha256(_normalize(error_text).encode("utf-8")).hexdigest()[:16]


def classify(error_text: str, patterns: tuple[KnownPattern, ...] = KNOWN_PATTERNS) -> Match | None:
    """Renvoie le 1er pattern connu qui matche (ordre stable), sinon None. Pur, déterministe."""
    if not isinstance(error_text, str):
        raise ErrorJournalError(f"error_text non-string: {type(error_text).__name__}")
    for p in patterns:
        if re.search(p.regex, error_text, flags=re.IGNORECASE):
            return Match(pattern_id=p.id, fix=p.fix, imp_ref=p.imp_ref)
    return None


def build_proposal(error_text: str, now_ts: int) -> dict[str, Any]:
    """Construit une proposition d'IMP en statut PROPOSED. JAMAIS auto-close.

    Pur (now_ts injecté). `proposal_id` dérivé de la signature -> déduplication stable.
    RT-202-6 : lane=AUDIT_REQUIRED -> NON auto-sélectionnable par l'autoloop (qui ne prend que
    SAFE_AUTO) tant qu'un humain ne l'a pas ratifiée. Ce n'est PAS un IMP-NNN du ledger.
    """
    if not isinstance(error_text, str) or not error_text.strip():
        raise ErrorJournalError("error_text vide/invalide")
    sig = signature(error_text)
    excerpt = _WS_RE.sub(" ", error_text.strip())[:200]
    return {
        "proposal_id": f"PROP-{sig}",
        "status": "PROPOSED",          # invariant dur — jamais CLOSED ici
        "ecg_state": "PROPOSED",
        "closed": False,               # invariant dur — jamais auto-close
        "title": f"[auto] erreur inconnue: {excerpt[:80]}",
        "error_signature": sig,
        "error_excerpt": excerpt,
        "oracle_type": "code",         # suggestion par défaut (Pierre/kaizen tranche)
        "source": "error_journal",
        "created_ts": now_ts,
        "lane": "AUDIT_REQUIRED",      # RT-202-6 : non auto-pickable -> ratification humaine requise
    }


def build_escalation(error_text: str, occurrences: int, now_ts: int) -> dict[str, Any]:
    """Bump d'une proposition existante sur erreur récurrente (>= ESCALATE_THRESHOLD).
    Reste lane=AUDIT_REQUIRED (non auto-pickable) — RED TEAM C1 : aucune mutation du ledger réel.
    Idempotent par signature : émise une seule fois par classe d'erreur (cf. _is_escalated)."""
    if not isinstance(error_text, str) or not error_text.strip():
        raise ErrorJournalError("error_text vide/invalide")
    sig = signature(error_text)
    excerpt = _WS_RE.sub(" ", error_text.strip())[:200]
    return {
        "proposal_id": f"PROP-{sig}",
        "status": "PROPOSED",          # invariant dur — jamais CLOSED ici
        "ecg_state": "PROPOSED",
        "closed": False,               # invariant dur — jamais auto-close
        "escalated": True,
        "occurrences": occurrences,
        "title": f"[auto-escalated x{occurrences}] erreur recurrente: {excerpt[:80]}",
        "error_signature": sig,
        "error_excerpt": excerpt,
        "oracle_type": "code",
        "source": "error_journal",
        "escalated_ts": now_ts,
        "lane": "AUDIT_REQUIRED",      # jamais SAFE_AUTO -> jamais auto-pické par l'autoloop
    }


def _count_signature(journal_path: Path | str, sig: str) -> int:
    """Compte les occurrences d'une signature dans le journal (lecture seule, tolérante)."""
    path = Path(journal_path)
    if not path.exists():
        return 0
    n = 0
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            if json.loads(line).get("signature") == sig:
                n += 1
        except json.JSONDecodeError:
            continue
    return n


def _is_escalated(proposals_path: Path | str, sig: str) -> bool:
    """True si une escalade a déjà été émise pour cette signature (idempotence)."""
    path = Path(proposals_path)
    if not path.exists():
        return False
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            o = json.loads(line)
            if o.get("error_signature") == sig and o.get("escalated") is True:
                return True
        except json.JSONDecodeError:
            continue
    return False


def verify_journal(journal_path: Path | str) -> tuple[int, int, list[int]]:
    """Vérifie le HMAC ligne par ligne. Retourne (valides, invalides, n° lignes invalides).
    Tolérant (jamais de hard-reject global — feed diagnostique). Pour usage VERDICT/preuve."""
    path = Path(journal_path)
    if not path.exists():
        return (0, 0, [])
    valid = invalid = 0
    bad: list[int] = []
    for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = line.strip()
        if not line:
            continue
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            invalid += 1
            bad.append(n)
            continue
        if verify_entry(entry):
            valid += 1
        else:
            invalid += 1
            bad.append(n)
    return (valid, invalid, bad)


# ── frontière I/O (gardée) ────────────────────────────────────────────────────
def _append_jsonl(path: Path, obj: dict[str, Any]) -> None:
    """Append append-only, utf-8, newline='' (RT-202-8 : '\\n' verbatim cross-OS)."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8", newline="") as fh:
        fh.write(json.dumps(obj, ensure_ascii=False) + "\n")


class _FileLock:
    """Verrou fichier portable best-effort (RT-202-4). Atomic O_EXCL ; spin borné puis fail-open
    (verrou présumé périmé) avec log — couvre les chevauchements multi-process rares."""

    def __init__(self, target: Path | str, timeout: float = 5.0):
        self.lockpath = Path(str(target) + ".lock")
        self.timeout = timeout
        self.fd: int | None = None

    def __enter__(self) -> "_FileLock":
        start = time.monotonic()
        while True:
            try:
                self.lockpath.parent.mkdir(parents=True, exist_ok=True)
                self.fd = os.open(str(self.lockpath), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                return self
            except FileExistsError:
                if time.monotonic() - start > self.timeout:
                    logger.warning("error_journal: verrou %s présumé périmé — fail-open", self.lockpath)
                    return self
                time.sleep(0.02)

    def __exit__(self, *exc: object) -> None:
        if self.fd is not None:
            os.close(self.fd)
            self.fd = None
        try:
            self.lockpath.unlink()
        except OSError:
            pass


def _existing_signatures(proposals_path: Path) -> set[str]:
    """Signatures déjà proposées (lecture seule ; fichier absent -> set vide)."""
    path = Path(proposals_path)
    if not path.exists():
        return set()
    sigs: set[str] = set()
    for n, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = line.strip()
        if not line:
            continue
        try:
            sigs.add(json.loads(line).get("error_signature", ""))
        except json.JSONDecodeError:
            logger.warning("error_journal: ligne %d corrompue dans %s — ignorée", n, path)
    return sigs


def record_error(
    error_text: str,
    *,
    journal_path: Path | str,
    proposals_path: Path | str,
    now_ts: int,
    patterns: tuple[KnownPattern, ...] = KNOWN_PATTERNS,
    governor_mod: Any = governor,
) -> Outcome:
    """Enregistre une erreur et décide : fix rappelé (connu) ou IMP auto-proposé (inconnu).

    RT-202-3 : classification (pure) + TOUTES les gates governor AVANT toute écriture -> un BLOCK
    laisse 0 effet de bord. Erreur inconnue -> proposition PROPOSED (dédupliquée sous verrou),
    jamais de close ni de mutation du ledger réel.
    """
    if not isinstance(error_text, str) or not error_text.strip():
        raise ErrorJournalError("error_text vide/invalide")

    # 0) scrub des secrets d'env AVANT toute classification/écriture (RED TEAM M1).
    error_text = _scrub_secrets(error_text)

    # 1) classification pure (aucune I/O).
    m = classify(error_text, patterns)
    sig = signature(error_text)
    journal_entry = {
        "ts": now_ts,
        "signature": sig,
        "matched": m.pattern_id if m else None,
        "excerpt": _WS_RE.sub(" ", error_text.strip())[:200],
    }
    journal_entry["hmac"] = sign_entry(journal_entry)  # signe la classe d'erreur (chantier d)

    # 2) gate journal (toujours requise) — AVANT toute écriture.
    if not governor_mod.check({"lane": "SAFE_AUTO", "mission": JOURNAL_MISSION}).allowed:
        raise JournalWriteBlocked(f"governor BLOCK (journal): mission {JOURNAL_MISSION}")

    # 3) pattern connu -> rappel du fix (aucune proposition).
    if m is not None:
        _append_jsonl(journal_path, journal_entry)
        return Outcome(kind="known", match=m, proposal=None)

    # 4) erreur inconnue -> section dédup verrouillée ; gate propose AVANT toute écriture.
    with _FileLock(proposals_path):
        is_dup = sig in _existing_signatures(proposals_path)
        if not is_dup:
            if not governor_mod.check({"lane": "SAFE_AUTO", "mission": PROPOSE_MISSION}).allowed:
                raise ProposeBlocked(f"governor BLOCK (propose): mission {PROPOSE_MISSION}")
        # toutes les gates nécessaires sont passées -> on écrit maintenant.
        _append_jsonl(journal_path, journal_entry)
        if is_dup:
            # Erreur récurrente : escalade la proposition existante au >= ESCALATE_THRESHOLD-ième
            # passage. Reste AUDIT_REQUIRED, émise UNE seule fois par signature (idempotent).
            # RED TEAM C1 : aucune mutation du ledger réel, aucun add SAFE_AUTO.
            occ = _count_signature(journal_path, sig)
            if occ >= ESCALATE_THRESHOLD and not _is_escalated(proposals_path, sig):
                if not governor_mod.check({"lane": "SAFE_AUTO", "mission": PROPOSE_MISSION}).allowed:
                    raise ProposeBlocked(f"governor BLOCK (escalade): mission {PROPOSE_MISSION}")
                escalation = build_escalation(error_text, occ, now_ts)
                _append_jsonl(proposals_path, escalation)
                return Outcome(kind="escalated", match=None, proposal=escalation)
            return Outcome(kind="duplicate", match=None, proposal=None)
        proposal = build_proposal(error_text, now_ts)
        _append_jsonl(proposals_path, proposal)
        return Outcome(kind="proposed", match=None, proposal=proposal)


if __name__ == "__main__":
    import argparse
    import sys
    from time import time as _time

    ap = argparse.ArgumentParser(description="error_journal — match/propose (IMP-202)")
    ap.add_argument("error", help="texte d'erreur")
    ap.add_argument("--journal", default="lab/reports/error_journal.jsonl")
    ap.add_argument("--proposals", default="lab/reports/error_proposals.jsonl")
    args = ap.parse_args()
    try:
        out = record_error(args.error, journal_path=args.journal,
                           proposals_path=args.proposals, now_ts=int(_time()))
    except ErrorJournalError as exc:
        print(f"[error_journal] {exc}", file=sys.stderr)
        sys.exit(1)
    if out.kind == "known":
        print(f"[KNOWN {out.match.pattern_id}] fix: {out.match.fix}")
    elif out.kind == "proposed":
        print(f"[PROPOSED {out.proposal['proposal_id']}] {out.proposal['title']}")
    else:
        print("[DUPLICATE] déjà proposé — aucune nouvelle proposition.")
