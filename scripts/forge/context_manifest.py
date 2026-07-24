"""scripts/forge/context_manifest.py — Context Manifest (périmètre GO ratifié
Pierre, docs/forge/CONTEXT_LOOP_V1_1_FRESHNESS.md §7).

Ce module MESURE le contexte réellement servi à un agent Forge ; il ne décide
rien et ne change ni prompt ni gate. Deux enregistrements, appendés en JSONL,
UN PAR étape/run, sous ``lab/forge_runs/<projet>/context/<etape>.manifest.jsonl`` :

  kind "dispatch"  — écrit par ``forge.dispatch.prepare_dispatch`` : quelles
                     sources (contrat/mandatory_read/amont/registry) existaient
                     et sous quel hash au moment du dispatch.
  kind "execution" — écrit par ``forge.run_real.claude_executor`` au moment où
                     le prompt final existe : hash + taille + budget de fenêtre.

Chaque ligne est HMAC-signée avec le même mécanisme que ``forge.verdict``
(``_sign_mapping``/``_verify_mapping``, même ``.forge_key``) : une ligne
fabriquée à la main sans la clé ne peut pas se faire passer pour une mesure
réelle.

claim_verdict: NO_CLAIM_ALLOWED — un manifest est une mesure, jamais un claim.

Toute résolution de source est FAIL-SOFT : un fichier absent produit
``exists: false, sha256: null``, jamais une exception. L'écriture des lignes
elle-même (I/O) PEUT lever — c'est aux appelants (``dispatch.py``,
``run_real.py``) d'encapsuler l'appel dans un try/except best-effort, comme
prescrit par la mission (« une exception manifest ne doit JAMAIS faire
échouer un dispatch/build »).
"""
from __future__ import annotations

import hashlib
import json
import logging
import re
import time
from pathlib import Path

from forge.contract import CONTRACTS_DIR, FORGE_ROLES
from forge.verdict import CLAIM_VERDICT, _sign_mapping, _verify_mapping, current_git_head

logger = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[2]

SCHEMA = "forge.context_manifest.v1"

MODEL_WINDOWS_PATH = Path(__file__).resolve().parent / "model_windows.json"

# OVERFLOW_RISK si estimated_tokens > OVERFLOW_RATIO * fenêtre du modèle.
OVERFLOW_RATIO = 0.9

# --- table amont DUPLIQUÉE (anti import circulaire) --------------------------
# forge.run_real importe forge.dispatch (pour ORDER/DETERMINISTIC/PROFILES) qui
# importe forge.contract ; forge.run_real définit aussi `_UPSTREAM_BY_STEP`
# APRÈS ses propres imports de tête. Importer `forge.run_real` depuis ce module
# au niveau module (pour lire cette table) créerait un risque de cycle si
# run_real en venait à importer context_manifest en tête de fichier (c'est le
# cas ici, pour la ligne 'execution'). On duplique donc la table ci-dessous ;
# `scripts/forge/tests/test_context_manifest.py` porte un test d'égalité
# STRICTE contre `forge.run_real._UPSTREAM_BY_STEP` — toute divergence future
# entre les deux copies casse ce test, jamais un oubli silencieux.
_UPSTREAM_BY_STEP: dict[str, tuple[str, ...]] = {
    "s3-decompo": ("artifacts/s1-prisme.txt",),
    "s4-archi": ("artifacts/s3-decompo.txt",),
    "s5-wiremap": ("artifacts/s3-decompo.txt", "blueprint.json"),
    "s6-redteam-plan": ("artifacts/s3-decompo.txt", "artifacts/s4-archi.txt",
                        "artifacts/s5-wiremap.txt"),
    "s9-build": ("blueprint.json", "wiremap.json"),
    "s11-redteam-code": ("wiremap.json",),
}


# --- hachage utilitaire (fail-soft) ------------------------------------------

def _sha256_file(path: Path) -> str | None:
    """Hash du contenu d'un fichier. ``None`` si absent/illisible — JAMAIS
    d'exception (contrairement à ``forge.verdict.sha256_file`` qui rend '')."""
    try:
        return hashlib.sha256(Path(path).read_bytes()).hexdigest()
    except OSError:
        return None


def _sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _rel_to_repo(path: Path) -> str:
    """Chemin repo-relatif (slashs POSIX) pour un affichage/stockage stable —
    best-effort : hors repo, on rend le chemin tel quel (str)."""
    try:
        return str(Path(path).resolve().relative_to(REPO_ROOT)).replace("\\", "/")
    except ValueError:
        return str(path).replace("\\", "/")


# --- résolution des sources (kind dispatch) ----------------------------------

def _source_record(path: Path, role: str) -> dict:
    p = Path(path)
    exists = p.is_file()
    return {
        "path": _rel_to_repo(p),
        "sha256": _sha256_file(p) if exists else None,
        "exists": exists,
        "role": role,
    }


def _looks_like_path(entry: str) -> bool:
    """Heuristique de tri mandatory_read : les entrées-CHEMIN du schéma des
    contrats (ex. ``scripts/forge/contracts/SCHEMA.md``) ne portent jamais
    d'espace ; les entrées NARRATIVES (ex. « l'artefact featuremap produit par
    l'étape 3 ») sont des phrases françaises à plusieurs mots. Vérifié contre
    les 14 contrats réels du dépôt (aucun contre-exemple)."""
    stripped = entry.strip()
    return bool(stripped) and " " not in stripped


def resolve_dispatch_sources(
    etape: str, contract: dict, *, run_dir: Path | None = None,
    caps_path: Path | None = None,
) -> list[dict]:
    """(a) le YAML du contrat, (b) les entrées path-like de mandatory_read,
    (c) la table amont (_UPSTREAM_BY_STEP) résolue relative à run_dir si connu,
    (d) le registry (roles.yaml). Un fichier absent ne lève jamais — il est
    simplement consigné exists:false."""
    sources: list[dict] = []

    # (a) contrat
    sources.append(_source_record(CONTRACTS_DIR / f"{etape}.yaml", "contract"))

    # (b) mandatory_read : seules les entrées qui RESSEMBLENT à un chemin.
    for entry in contract.get("mandatory_read") or ():
        if isinstance(entry, str) and _looks_like_path(entry):
            sources.append(_source_record(REPO_ROOT / entry.strip(), "mandatory_read"))

    # (c) artefacts amont — seulement si run_dir est connu (sinon rien à résoudre).
    if run_dir is not None:
        for rel in _UPSTREAM_BY_STEP.get(etape, ()):
            sources.append(_source_record(Path(run_dir) / rel, "upstream"))

    # (d) registry local (résout capability_role -> runtime).
    sources.append(_source_record(caps_path or FORGE_ROLES, "registry"))

    return sources


# --- dérivation du run_dir par défaut (F7) ------------------------------------
# Convention observée dans les runs réels (lab/forge_runs/*/state.json) :
# run_id = "<projet>-<date AAAAMMJJ>[suffixe lettre]" (ex. "shmup_slice-20260714a").
# Un run_id qui NE porte PAS ce suffixe (ex. "t1", "dryrun" — usages de test/dry-run)
# est indécidable : le manifest part alors sous un dossier orphelin dédié plutôt
# que de deviner un projet.
_RUN_ID_DATE_SUFFIX = re.compile(r"^(.+)-\d{8}[a-z]?$")


def derive_project_from_run_id(run_id: str) -> str | None:
    """Projet dérivé du run_id AVANT le dernier tiret-date, ou None si le
    run_id ne suit pas la convention ``<projet>-<AAAAMMJJ>[lettre]``."""
    m = _RUN_ID_DATE_SUFFIX.match(run_id or "")
    return m.group(1) if m else None


def default_run_dir(run_id: str) -> Path:
    """run_dir par défaut quand l'appelant n'en connaît pas un explicitement.
    Projet dérivable => lab/forge_runs/<projet> (même racine que le driver).
    Indécidable => lab/forge_runs/_orphan_context/<run_id> (jamais mélangé à
    un run_dir réel, jamais une exception)."""
    project = derive_project_from_run_id(run_id)
    if project:
        return REPO_ROOT / "lab" / "forge_runs" / project
    return REPO_ROOT / "lab" / "forge_runs" / "_orphan_context" / run_id


# --- chemin + I/O du manifest --------------------------------------------------

def manifest_path(run_dir: Path | str, etape: str) -> Path:
    return Path(run_dir) / "context" / f"{etape}.manifest.jsonl"


def _read_lines(path: Path) -> list[dict]:
    """Lignes JSON déjà présentes. Une ligne corrompue est ignorée (jamais
    bloquant) — le compteur d'activation ne doit pas planter sur un fichier
    partiellement écrit."""
    if not path.exists():
        return []
    records: list[dict] = []
    try:
        raw_text = path.read_text(encoding="utf-8")
    except OSError:
        return []
    for raw in raw_text.splitlines():
        raw = raw.strip()
        if not raw:
            continue
        try:
            rec = json.loads(raw)
        except ValueError:
            continue
        if isinstance(rec, dict):
            records.append(rec)
    return records


def _append_line(path: Path, record: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "a", encoding="utf-8") as fh:
        fh.write(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n")


def _next_activation(path: Path) -> int:
    """1-based : nombre de lignes ``kind: dispatch`` déjà présentes pour cette
    étape, +1."""
    return 1 + sum(1 for rec in _read_lines(path) if rec.get("kind") == "dispatch")


# --- signature (même mécanisme que forge.verdict) -----------------------------

def _sign(body: dict, key_file: Path | None) -> str:
    return _sign_mapping(body, key_file)


def verify_manifest_record(record: dict, key_file: Path | None = None) -> bool:
    """Vrai ssi la ligne porte un HMAC valide sur son contenu (hors champ hmac)."""
    sig = record.get("hmac") if isinstance(record, dict) else None
    if not sig:
        return False
    body = {k: v for k, v in record.items() if k != "hmac"}
    return _verify_mapping(body, sig, key_file)


# --- kind "dispatch" ------------------------------------------------------------

def build_dispatch_manifest_record(
    etape: str, run_id: str, payload, contract: dict, *,
    run_dir: Path | None = None, caps_path: Path | None = None,
    ts: float | None = None, activation: int = 1,
) -> dict:
    """Corps NON SIGNÉ de la ligne 'dispatch' (utile aux tests qui veulent
    inspecter le contenu avant signature)."""
    sources = resolve_dispatch_sources(etape, contract, run_dir=run_dir, caps_path=caps_path)
    return {
        "schema": SCHEMA,
        "kind": "dispatch",
        "run_id": run_id,
        "etape": etape,
        "activation": activation,
        "ts": ts if ts is not None else time.time(),
        "git_head": current_git_head() or None,
        "model": payload.model,
        "provider": payload.provider,
        "contract_sha256": _sha256_file(CONTRACTS_DIR / f"{etape}.yaml"),
        "payload_prompt_sha256": _sha256_text(payload.prompt),
        "sources": sources,
        "claim_verdict": CLAIM_VERDICT,
    }


def append_dispatch_manifest(
    etape: str, run_id: str, payload, contract: dict, *,
    run_dir: Path | str, caps_path: Path | None = None,
    key_file: Path | None = None, ts: float | None = None,
) -> dict:
    """Construit, signe et APPEND la ligne 'dispatch' du Context Manifest de
    cette étape. ``run_dir`` est requis ici (l'appelant — ``dispatch.py`` —
    le dérive via ``default_run_dir`` si non fourni)."""
    path = manifest_path(run_dir, etape)
    activation = _next_activation(path)
    record = build_dispatch_manifest_record(
        etape, run_id, payload, contract, run_dir=run_dir,
        caps_path=caps_path, ts=ts, activation=activation,
    )
    record["hmac"] = _sign(record, key_file)
    _append_line(path, record)
    return record


# --- kind "execution" -----------------------------------------------------------

def _load_model_windows(path: Path | None = None) -> dict:
    p = path or MODEL_WINDOWS_PATH
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return data if isinstance(data, dict) else {}


def _normalize_model_key(key: str) -> str:
    """Tolère le style ``provider/modèle`` (roles.yaml) ET le nom court résolu
    par le registry (``get_model_for_role`` ne rend que le dernier segment) —
    les deux se comparent sur leur dernier segment, en minuscules."""
    return key.rsplit("/", 1)[-1].strip().lower()


def lookup_model_window(model: str, model_windows_path: Path | None = None) -> int | None:
    """Fenêtre de contexte (tokens) du modèle, ou None si absent de la table
    (lookup tolérant : jamais d'exception, jamais de KeyError)."""
    if not model:
        return None
    table = _load_model_windows(model_windows_path)
    target = _normalize_model_key(model)
    for key, value in table.items():
        if key.startswith("_"):
            continue
        if isinstance(value, (int, float)) and _normalize_model_key(key) == target:
            return int(value)
    return None


def _context_budget(final_prompt_chars: int, model: str,
                    model_windows_path: Path | None = None) -> dict:
    window = lookup_model_window(model, model_windows_path)
    estimated_tokens = round(final_prompt_chars / 4)
    if window is None:
        status = "UNKNOWN_WINDOW"
    elif estimated_tokens > OVERFLOW_RATIO * window:
        status = "OVERFLOW_RISK"
    else:
        status = "OK"
    return {
        "model_window_tokens": window,
        "estimated_tokens": estimated_tokens,
        "status": status,
    }


def build_execution_manifest_record(
    run_id: str, etape: str, final_prompt: str, *, model: str,
    premortem_section: str | None = None, ts: float | None = None,
    model_windows_path: Path | None = None,
) -> dict:
    """Corps NON SIGNÉ de la ligne 'execution'."""
    return {
        "schema": SCHEMA,
        "kind": "execution",
        "run_id": run_id,
        "etape": etape,
        "ts": ts if ts is not None else time.time(),
        "final_prompt_sha256": _sha256_text(final_prompt),
        "final_prompt_chars": len(final_prompt),
        "premortem_sha256": _sha256_text(premortem_section) if premortem_section else None,
        "context_budget": _context_budget(len(final_prompt), model, model_windows_path),
        "claim_verdict": CLAIM_VERDICT,
    }


def append_execution_manifest(
    run_id: str, etape: str, run_dir: Path | str, final_prompt: str, *, model: str,
    premortem_section: str | None = None, key_file: Path | None = None,
    ts: float | None = None, model_windows_path: Path | None = None,
) -> dict:
    """Construit, signe et APPEND la ligne 'execution' du Context Manifest de
    cette étape."""
    record = build_execution_manifest_record(
        run_id, etape, final_prompt, model=model, premortem_section=premortem_section,
        ts=ts, model_windows_path=model_windows_path,
    )
    record["hmac"] = _sign(record, key_file)
    _append_line(manifest_path(run_dir, etape), record)
    return record
