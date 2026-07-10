"""Signed forge verdict — the anti-over-claim epistemology brick.

Separates software / evidence / claim. ``claim_verdict`` is ALWAYS
``NO_CLAIM_ALLOWED``: the agent may never assert success. Only the deterministic
oracle speaks (``software_verdict``), and the verdict is HMAC-signed so it cannot
be forged after the fact.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Sequence

logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_KEY_FILE = REPO_ROOT / "scripts" / "forge" / ".forge_key"

CLAIM_VERDICT = "NO_CLAIM_ALLOWED"
EVIDENCE_VERDICT = "MECHANICAL_VALIDATION_ONLY"


@dataclass(frozen=True)
class Verdict:
    project: str
    software_verdict: str
    evidence_verdict: str
    claim_verdict: str
    returncode: int
    evidence_path: str


def build_verdict(project: str, passed: bool, returncode: int, evidence_path: Path) -> Verdict:
    return Verdict(
        project=project,
        software_verdict="OK" if passed else "FAIL",
        evidence_verdict=EVIDENCE_VERDICT,
        claim_verdict=CLAIM_VERDICT,
        returncode=returncode,
        evidence_path=str(evidence_path),
    )


def _read_key(key_file: Path) -> bytes | None:
    """Lit la clé si elle existe, sinon None. Ne génère JAMAIS (chemin de vérif)."""
    return key_file.read_bytes() if key_file.exists() else None


def _load_key_for_signing(key_file: Path) -> bytes:
    """Chemin de SIGNATURE : lit la clé, ou en génère une au premier usage."""
    existing = _read_key(key_file)
    if existing is not None:
        return existing
    key = os.urandom(32)
    key_file.parent.mkdir(parents=True, exist_ok=True)
    key_file.write_bytes(key)
    logger.info("generated new forge signing key at %s", key_file)
    return key


def _hmac_hex(key: bytes, mapping: dict) -> str:
    payload = json.dumps(mapping, sort_keys=True).encode("utf-8")
    return hmac.new(key, payload, hashlib.sha256).hexdigest()


def _sign_mapping(mapping: dict, key_file: Path | None = None) -> str:
    """HMAC-SHA256 déterministe sur un mapping (JSON trié). Base commune des signatures."""
    return _hmac_hex(_load_key_for_signing(key_file or DEFAULT_KEY_FILE), mapping)


def _verify_mapping(mapping: dict, signature: str, key_file: Path | None = None) -> bool:
    """Vérifie une signature. Clé ABSENTE => False (jamais de génération à la vérif).

    Générer une clé au moment de vérifier reviendrait à fabriquer de la confiance :
    supprimer .forge_key puis re-signer des verdicts forgés les rendrait valides.
    """
    key = _read_key(key_file or DEFAULT_KEY_FILE)
    if key is None:
        logger.warning("verify: clé de signature absente -> refus (aucune génération)")
        return False
    return hmac.compare_digest(_hmac_hex(key, mapping), signature)


def sign_verdict(verdict: Verdict, key_file: Path | None = None) -> str:
    return _sign_mapping(asdict(verdict), key_file)


def verify_verdict(verdict: Verdict, signature: str, key_file: Path | None = None) -> bool:
    return _verify_mapping(asdict(verdict), signature, key_file)


# --- Reçus d'oracle signés (provenance, étape 2) ------------------------------
# Chaque oracle déterministe émet un REÇU signé. L'agrégat VÉRIFIE ces reçus au
# lieu de croire des faits passés en argument : un OK sans reçu valide devient
# impossible sans la clé. Corrige la faille « le verdict signe une narration ».

# SKIPPED : l'oracle n'était pas applicable dans ce profil (ex. archi/wiremap sur
# un profil patch). Le reçu SKIPPED est SIGNÉ comme les autres — sauter est une
# décision assumée et auditable, jamais un trou silencieux.
RECEIPT_STATUSES = ("OK", "FAIL", "BLOCKED", "SKIPPED")


@dataclass(frozen=True)
class OracleReceipt:
    oracle_id: str           # "code" | "archi" | "wiremap"
    run_id: str              # lie le reçu à UN run précis (anti-rejeu inter-run)
    status: str              # OK | FAIL | BLOCKED
    evidence_sha256: str     # hash du contenu d'évidence (scelle le log/artefact jugé)
    detail: dict             # sortie brute de l'oracle (deps violées, features manquantes…)
    ts: float
    evidence_path: str = ""  # chemin du fichier d'évidence — RE-LU à la vérif pour
                             # confronter evidence_sha256 au contenu réel (scellé non décoratif)


@dataclass(frozen=True)
class SignedReceipt:
    receipt: OracleReceipt
    signature: str


def sign_receipt(receipt: OracleReceipt, key_file: Path | None = None) -> str:
    return _sign_mapping(asdict(receipt), key_file)


def verify_receipt(receipt: OracleReceipt, signature: str, key_file: Path | None = None) -> bool:
    return _verify_mapping(asdict(receipt), signature, key_file)


def make_signed_receipt(
    oracle_id: str, run_id: str, status: str, detail: dict,
    *, evidence_sha256: str = "", evidence_path: str = "", ts: float = 0.0,
    key_file: Path | None = None,
) -> SignedReceipt:
    """Construit + signe un reçu d'oracle. Signé par le processus qui a EXÉCUTÉ
    l'oracle ; l'agrégat le re-vérifiera avant de prononcer un verdict.

    `evidence_path` permet à l'agrégat (et à `verify_run`) de RE-LIRE le fichier
    et de confronter `evidence_sha256` à son contenu réel — le scellé n'est plus
    décoratif. Si `evidence_path` est fourni sans `evidence_sha256`, on le calcule.
    """
    if status not in RECEIPT_STATUSES:
        raise ValueError(f"status de reçu invalide: {status!r}")
    if evidence_path and not evidence_sha256:
        evidence_sha256 = sha256_file(evidence_path)
    receipt = OracleReceipt(
        oracle_id=oracle_id, run_id=run_id, status=status,
        evidence_sha256=evidence_sha256, detail=dict(detail or {}), ts=ts,
        evidence_path=str(evidence_path),
    )
    return SignedReceipt(receipt=receipt, signature=sign_receipt(receipt, key_file))


def status_from_passed(passed: bool) -> str:
    """Traduit le booléen d'un oracle statique en statut de reçu."""
    return "OK" if passed else "FAIL"


def sha256_file(path: Path | str) -> str:
    """Hash du CONTENU d'un fichier d'évidence (scelle le log). '' si illisible."""
    try:
        return hashlib.sha256(Path(path).read_bytes()).hexdigest()
    except OSError:
        return ""


def current_git_head() -> str:
    """HEAD courant (best-effort, '' si hors git). Lien anti-rejeu grossier."""
    import subprocess
    try:
        out = subprocess.run(["git", "rev-parse", "HEAD"], cwd=str(REPO_ROOT),
                             capture_output=True, text=True, timeout=5)
        return out.stdout.strip() if out.returncode == 0 else ""
    except (OSError, subprocess.SubprocessError):
        return ""


def new_nonce() -> str:
    """Nonce unique par verdict (anti-rejeu)."""
    return os.urandom(16).hex()


# --- Verdict AGRÉGÉ (A3 + provenance) : reçus signés -> 1 verdict signé --------

# software_verdict de l'agrégat vient UNIQUEMENT des oracles déterministes VÉRIFIÉS.
# Le red-team est advisory : il lève des flags HumanGate, il ne juge JAMAIS le code.
DECISION_READY = "HUMANGATE_READY"   # oracles verts — prêt pour la revue de Pierre
DECISION_READY_OBJECTION = "HUMANGATE_READY_WITH_OBJECTION"  # oracles verts MAIS red-team a bloqué
DECISION_BLOCKED = "BLOCKED"         # oracle rouge / provenance rompue — la chaîne s'arrête


@dataclass(frozen=True)
class AggregateVerdict:
    project: str
    run_id: str
    software_verdict: str            # OK | FAIL | BLOCKED — ORACLES VÉRIFIÉS SEULS
    evidence_verdict: str            # MECHANICAL_VALIDATION_ONLY
    claim_verdict: str               # NO_CLAIM_ALLOWED
    decision: str                    # HUMANGATE_READY | BLOCKED (jamais 'merge' — c'est Pierre)
    oracles: dict                    # {code, archi, wiremap} -> reçus (dict) dont la provenance est vérifiée
    redteam_reviewer: str            # identité RÉELLE (A2) : qwen2.5-14b-instruct | claude-blind (fallback)
    redteam_ran: bool                # le reviewer INDÉPENDANT a-t-il réellement tourné ? (structuré, pas sniff de string)
    provenance_ok: bool = True       # tous les reçus vérifiés (signature + run_id concordant)
    git_head: str = ""               # anti-rejeu : état du code jugé
    nonce: str = ""                  # anti-rejeu : unicité par verdict
    ts: float = 0.0
    redteam_advisory: tuple = ()     # findings red-team (advisory — n'affectent pas software_verdict)
    humangate_flags: tuple = ()      # points à signaler à Pierre (fog)


def build_aggregate_verdict(
    project: str,
    run_id: str,
    code: SignedReceipt,
    archi: SignedReceipt,
    wiremap: SignedReceipt,
    redteam_reviewer: str,
    *,
    redteam_ran: bool,
    redteam_findings: Sequence[str] = (),
    redteam_blocked: bool = False,
    git_head: str = "",
    nonce: str = "",
    ts: float = 0.0,
    key_file: Path | None = None,
) -> AggregateVerdict:
    """Plie les REÇUS D'ORACLE SIGNÉS + le red-team en un verdict signable.

    Ne CROIT plus des faits passés en argument : chaque reçu est re-vérifié
    (signature HMAC + run_id concordant). Un reçu absent/altéré/discordant =>
    provenance rompue => software_verdict BLOCKED. Impossible de prononcer OK sans
    reçus valides prouvant que les oracles ont réellement tourné sur CE run.

    ``redteam_ran`` est un booléen STRUCTURÉ (dérivé de la RouteDecision réelle),
    pas un sniff de la chaîne reviewer : il alimente le flag d'honnêteté.
    Le red-team n'entre JAMAIS dans le calcul de ``software_verdict``.
    """
    flags: list[str] = []
    receipts = {"code": code, "archi": archi, "wiremap": wiremap}
    verified: dict = {}
    provenance_ok = True

    # 1) PROVENANCE d'abord : sans preuve d'exécution vérifiable, pas de verdict.
    for name, sr in receipts.items():
        if sr is None or not verify_receipt(sr.receipt, sr.signature, key_file):
            provenance_ok = False
            flags.append(f"provenance rompue: reçu {name} absent/non signé/altéré")
            continue
        if sr.receipt.run_id != run_id:
            provenance_ok = False
            flags.append(
                f"provenance rompue: run_id {name} discordant "
                f"({sr.receipt.run_id!r} != {run_id!r})"
            )
            continue
        if sr.receipt.status not in RECEIPT_STATUSES:
            provenance_ok = False
            flags.append(f"provenance rompue: statut {name} invalide {sr.receipt.status!r}")
            continue
        # Le reçu CODE représente une COMMANDE EXTERNE : sans fichier d'évidence, on
        # ne peut pas prouver qu'elle a tourné (ferme l'exploit « code OK fabriqué
        # sans oracle »). archi/wiremap sont des oracles-fonctions dont l'évidence
        # EST le detail signé — pas de fichier requis.
        if name == "code" and sr.receipt.status != "SKIPPED" and not sr.receipt.evidence_path:
            provenance_ok = False
            flags.append("provenance rompue: reçu code sans évidence (exécution non prouvable)")
            continue
        # Scellé d'évidence NON décoratif : si le reçu pointe un fichier d'évidence,
        # on RE-LIT son contenu et on confronte le hash signé au réel. Discordance
        # (log absent/altéré) => provenance rompue. Sauter (SKIPPED) n'a pas d'évidence.
        if sr.receipt.status != "SKIPPED" and sr.receipt.evidence_path:
            actual = sha256_file(sr.receipt.evidence_path)
            if actual != sr.receipt.evidence_sha256:
                provenance_ok = False
                flags.append(
                    f"provenance rompue: évidence {name} altérée/absente "
                    f"({sr.receipt.evidence_path})"
                )
                continue
        verified[name] = sr.receipt

    # 2) software_verdict : statuts des reçus VÉRIFIÉS uniquement. SKIPPED ne compte
    #    pas, mais l'oracle CODE doit être OK (sinon rien de substantiel n'est prouvé).
    if not provenance_ok:
        software = "BLOCKED"     # aucune narration ne remplace un reçu signé
    else:
        statuses = [verified[n].status for n in ("code", "archi", "wiremap")]
        if "BLOCKED" in statuses:
            software = "BLOCKED"
        elif "FAIL" in statuses:
            software = "FAIL"
        elif verified["code"].status == "OK" and all(s in ("OK", "SKIPPED") for s in statuses):
            software = "OK"
        else:
            software = "BLOCKED"    # code sauté / rien de prouvé

    # Le red-team ne change PAS software_verdict (pas de LLM-as-judge), mais s'il a
    # BLOQUÉ alors que les oracles sont verts, Pierre doit le VOIR dans la décision
    # (un jeu "prêt" dont le red-team dit que la mécanique cœur n'est pas prouvée).
    if software != "OK":
        decision = DECISION_BLOCKED
    elif redteam_blocked:
        decision = DECISION_READY_OBJECTION
    else:
        decision = DECISION_READY

    # 3) Flags HumanGate (fog) : rouges mécaniques + oracles sautés + advisory red-team.
    if provenance_ok:
        for name in ("archi", "wiremap"):
            st = verified[name].status
            if st == "SKIPPED":
                flags.append(f"{name} non vérifiée (oracle sauté dans ce profil)")
            elif st != "OK":
                d = verified[name].detail
                why = (d.get("deps_interdites_violées") or d.get("features_manquantes")
                       or d.get("preuves_absentes") or "violation")
                flags.append(f"{name} rouge: {why}")
    if redteam_blocked:
        flags.append(f"red-team BLOQUE ({redteam_reviewer}) — objection à examiner (advisory)")
    if not redteam_ran:
        # Honnêteté (structurée) : le reviewer indépendant n'a pas tourné.
        flags.append("red-team dégradé: reviewer indépendant n'a pas tourné (fallback)")

    oracles = {name: asdict(sr.receipt) for name, sr in receipts.items() if sr is not None}
    return AggregateVerdict(
        project=project,
        run_id=run_id,
        software_verdict=software,
        evidence_verdict=EVIDENCE_VERDICT,
        claim_verdict=CLAIM_VERDICT,
        decision=decision,
        oracles=oracles,
        redteam_reviewer=redteam_reviewer,
        redteam_ran=bool(redteam_ran),
        provenance_ok=provenance_ok,
        git_head=git_head,
        nonce=nonce,
        ts=ts,
        redteam_advisory=tuple(redteam_findings),
        humangate_flags=tuple(flags),
    )


def sign_aggregate(verdict: AggregateVerdict, key_file: Path | None = None) -> str:
    return _sign_mapping(asdict(verdict), key_file)


def verify_aggregate(verdict: AggregateVerdict, signature: str, key_file: Path | None = None) -> bool:
    return _verify_mapping(asdict(verdict), signature, key_file)


def signed_aggregate_record(verdict: AggregateVerdict, key_file: Path | None = None) -> dict:
    """L'agrégat + sa signature, prêt à écrire dans verdict.json (contrat s12)."""
    return {**asdict(verdict), "hmac": sign_aggregate(verdict, key_file)}
