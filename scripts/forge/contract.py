"""Dispatcher de contrat d'agent Forge — la porte d'entrée bornée.

Une planète (nœud agent) EST le contrat de travail d'un sous-agent. Un agent ne
se lance jamais sans contrat complet. Ce module fait DEUX choses, dans l'ordre :

  C1  valider le contrat (les 3 états rempli / déclaré-vide / absent). Un champ
      Critique non rempli => ``ContractIncomplete``, dispatch refusé.
  C2  fabriquer le prompt borné (role + objectif + frontières + garde-fou, modèle
      forcé, seuls les outils déclarés, RÈGLE DE RESTITUTION injectée).

Ce module ne lance AUCUN process ni sous-agent : il produit un payload ou refuse.
Le spawn réel appartient au skill /forge, qui DOIT passer par cette porte.

Schéma canonique : scripts/forge/contracts/SCHEMA.md.
"""
from __future__ import annotations

import logging
import sys
from dataclasses import dataclass
from pathlib import Path

import yaml

logger = logging.getLogger(__name__)

# scripts/forge/contract.py -> parents[2] == repo root
REPO_ROOT = Path(__file__).resolve().parents[2]
CONTRACTS_DIR = REPO_ROOT / "scripts" / "forge" / "contracts"
# Mapping rôle-de-capacité -> runtime, Forge-scopé (ne touche pas le SSOT studio). ADR-002 gate 1.
FORGE_ROLES = CONTRACTS_DIR / "roles.yaml"

# Le registry LOCAL résout le modèle depuis un rôle (ADR-002 gate 1 : jamais de modèle en dur).
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
from control_plane.registry import get_model_for_role, get_provider_for_role  # noqa: E402

# Sentinelle de « déclaré vide » : décision assumée, distincte d'un oubli.
SENTINEL_EMPTY = "aucun"

# Les 17 champs du schéma, par niveau (voir SCHEMA.md).
CRITICAL = (
    "role",
    "capability_role",
    "exigences_cognitives",
    "memoire",
    "mandatory_read",
    "objectif",
    "in_scope",
    "out_of_scope",
    "permissions",
    "gardeFou",
    "success_criteria",
    "tests_oracles",
    "final_report",
    "output_contract",
)
IMPORTANT = ("skill", "plugin")
RECOMMENDED = ("delegation_context",)

# Texte injecté verbatim dans chaque prompt : l'invariant anti-claim.
# Généralise aux 21 contrats (ratification Pierre 2026-07-26, primitive 1 du
# salvage Codex) une exigence jusque-là en prose dans un seul contrat
# (orchestrator.yaml : « ce que je n'ai PAS prouvé »). Mesure d'adoption en
# regard : forge.skipped_validation.skipped_validation_status (ADVISORY).
RESTITUTION_RULE = (
    "RÈGLE DE RESTITUTION — Chaque affirmation du final_report doit citer "
    "l'oracle/l'ancre non-LLM qui l'appuie. Appuyée par un oracle => "
    "software_verdict (OK/FAIL/BLOCKED) + evidence_verdict: "
    "MECHANICAL_VALIDATION_ONLY. Sans oracle disponible => claim_verdict: "
    "NO_CLAIM_ALLOWED et remonte un besoin HumanGate (fog), jamais un claim "
    "auto-certifié. Vocabulaire de verdict : OK / FAIL / BLOCKED uniquement. "
    "En dernier lieu, une section finale SKIPPED_VALIDATION, structurée et "
    "EXPLICITE : pour chaque validation que tu n'as PAS faite, liste l'item "
    "de validation (quoi), le périmètre concerné (où), le statut (ex. non "
    "fait / partiel / hors délai) et la raison (pourquoi). Rien sauté => "
    "écris `SKIPPED_VALIDATION: aucun` — une décision assumée, jamais un "
    "silence. Le silence sur cette section est traité comme un oubli, pas "
    "comme 'rien à signaler'."
)


class ContractIncomplete(Exception):
    """Levée quand un contrat n'est pas activable (Critique manquant, etc.)."""


class RoleUnresolved(ContractIncomplete):
    """Le registry ne résout aucun runtime pour le capability_role déclaré.

    Sous-classe de ContractIncomplete : un rôle non résolu = contrat non activable.
    """


def field_state(value: object) -> str:
    """Retourne l'état d'un champ : ``filled`` / ``declared_empty`` / ``absent``.

    - ``filled`` : contenu réel.
    - ``declared_empty`` : la sentinelle ``aucun`` — une décision assumée.
    - ``absent`` : clé manquante ou valeur vide — un oubli.
    """
    if value is None:
        return "absent"
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return "absent"
        if stripped.lower() == SENTINEL_EMPTY:
            return "declared_empty"
        return "filled"
    if isinstance(value, (list, tuple)):
        if len(value) == 0:
            return "absent"
        if len(value) == 1 and isinstance(value[0], str) and value[0].strip().lower() == SENTINEL_EMPTY:
            return "declared_empty"
        return "filled"
    if isinstance(value, dict):
        return "filled" if value else "absent"
    return "filled"


def load_contract(etape: str, contracts_dir: Path | None = None) -> dict:
    """Charge le contrat YAML canonique d'une étape."""
    path = (contracts_dir or CONTRACTS_DIR) / f"{etape}.yaml"
    with open(path, encoding="utf-8") as fh:
        data = yaml.safe_load(fh)
    if not isinstance(data, dict):
        raise ContractIncomplete(f"contrat {etape!r} n'est pas un mapping YAML")
    return data


def validate_contract(contract: dict) -> None:
    """C1 — refuse un contrat non activable. Ne retourne rien ; lève ou passe."""
    problems: list[str] = []
    for field in CRITICAL:
        state = field_state(contract.get(field))
        if state != "filled":
            problems.append(f"Critique {field!r} = {state} (exige 'filled')")
    for field in IMPORTANT + RECOMMENDED:
        state = field_state(contract.get(field))
        if state == "absent":
            problems.append(f"{field!r} absent (doit être rempli ou 'aucun', jamais absent)")
    if problems:
        raise ContractIncomplete("; ".join(problems))


@dataclass(frozen=True)
class DispatchPayload:
    """Le cadre borné remis au sous-agent. Aucun spawn — juste les données."""

    etape: str
    role: str
    model: str
    prompt: str
    allowed_tools: tuple[str, ...]
    mandatory_read: tuple[str, ...]
    # provider résolu par le registry (lmstudio / claude-local / forge). Défaut ""
    # => aucune régression sur les constructions existantes. Lu par l'aiguilleur
    # runtime (forge.runtime.route_step) pour honorer le contrat à l'exécution.
    provider: str = ""


def _render_prompt(contract: dict, etape: str = "", run_id: str = "") -> str:
    """Assemble le prompt borné à partir des champs du contrat.

    R2 (audit branchements 2026-07-24) : quand `etape` ET `run_id` sont connus
    (la porte réelle — `dispatch.prepare_dispatch` — les fournit toujours), le
    prompt PORTE systématiquement le marqueur ``FORGE_DISPATCH:<etape>:<run_id>``
    attendu par `forge.hook_guard.MARKER` / `.claude/hooks/pretool_forge_guard.py`.
    AVANT ce correctif, ce marqueur était apposé À LA MAIN par l'orchestrateur
    (cf. `scripts/forge/run_real.py::claude_executor`, `context['dispatch_marker']`) —
    un oubli à ce niveau désarmait silencieusement le hook dur. Un appel direct
    sans run_id (tests C1/C2 unitaires, dry-run sans run réel) omet le marqueur :
    comportement strictement inchangé pour ces usages.
    """
    sections = [
        ("RÔLE", contract["role"]),
        ("OBJECTIF", contract["objectif"]),
        ("DANS LE PÉRIMÈTRE (in_scope)", contract["in_scope"]),
        ("HORS PÉRIMÈTRE (out_of_scope)", contract["out_of_scope"]),
        ("PERMISSIONS", contract["permissions"]),
        ("GARDE-FOU", contract["gardeFou"]),
        ("CRITÈRES DE RÉUSSITE", contract["success_criteria"]),
        ("ORACLES / TESTS", contract["tests_oracles"]),
        ("CONTRAT DE SORTIE", contract["output_contract"]),
        ("RAPPORT FINAL", contract["final_report"]),
    ]
    body = "\n\n".join(f"## {title}\n{value}" for title, value in sections)
    reads = "\n".join(f"- {r}" for r in contract["mandatory_read"])
    prompt = (
        f"{body}\n\n## À LIRE OBLIGATOIREMENT AVANT TOUTE ACTION\n{reads}\n\n"
        f"## {RESTITUTION_RULE}"
    )
    if etape and run_id:
        prompt += f"\n\n## MARQUEUR DE DISPATCH (ne pas modifier)\nFORGE_DISPATCH:{etape}:{run_id}"
    return prompt


def _declared_tools(contract: dict) -> tuple[str, ...]:
    """Seuls les skill/plugin réellement remplis sont autorisés."""
    tools = []
    for field in IMPORTANT:
        if field_state(contract.get(field)) == "filled":
            tools.append(contract[field])
    return tuple(tools)


def resolve_runtime(contract: dict, caps_path: Path | None = None) -> str:
    """Résout le runtime depuis le capability_role via le registry LOCAL.

    Le contrat ne fixe jamais un modèle en dur (ADR-002 gate 1) : il déclare un
    rôle, le registry force le runtime. Rôle non résolu => RoleUnresolved (refus).
    """
    role = contract["capability_role"]
    model = get_model_for_role(role, caps_path=caps_path or FORGE_ROLES)
    if not model:
        raise RoleUnresolved(f"capability_role {role!r} non résolu par le registry")
    return model


def build_dispatch_payload(
    contract: dict, etape: str = "", caps_path: Path | None = None, run_id: str = ""
) -> DispatchPayload:
    """C1+C2 — refuse si le contrat est incomplet, sinon fabrique le payload borné.

    Le role (posture) est INJECTÉ dans le payload ; le modèle est FORCÉ par le
    registry local à partir du capability_role (jamais écrit en dur dans le contrat).

    R2 : `run_id`, quand fourni (toujours le cas via la porte réelle
    `dispatch.prepare_dispatch`), fait porter au prompt le marqueur
    ``FORGE_DISPATCH:<etape>:<run_id>`` attendu par le hook dur — plus besoin que
    l'orchestrateur l'appose à la main. Omis (défaut "") : comportement inchangé.
    """
    validate_contract(contract)  # C1 : la porte bloque d'abord
    model = resolve_runtime(contract, caps_path=caps_path)  # registry force le runtime
    provider = get_provider_for_role(contract["capability_role"], caps_path=caps_path or FORGE_ROLES) or ""
    payload = DispatchPayload(
        etape=etape,
        role=contract["role"],
        model=model,
        prompt=_render_prompt(contract, etape=etape, run_id=run_id),
        allowed_tools=_declared_tools(contract),
        mandatory_read=tuple(contract["mandatory_read"]),
        provider=provider,
    )
    logger.info("contrat %s activé : rôle=%s -> modèle=%s (provider=%s), %d outils",
                etape or "?", contract["capability_role"], payload.model, provider or "?",
                len(payload.allowed_tools))
    return payload
