"""identify_critical_surfaces.py — Documente les surfaces critiques de Tactical Chess Studio.

Analyse autopilot.py pour localiser les constantes, endpoints et fichiers critiques,
et retourne une table avec autorité et impact downstream pour chaque surface.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Any

REPO = Path(__file__).parent.parent
AUTOPILOT = REPO / "autopilot.py"

# Table statique des surfaces critiques — nom, type, autorité, impact downstream.
# Chaque entrée correspond à un pattern identifiable dans autopilot.py.
CRITICAL_SURFACES: list[dict[str, str]] = [
    {
        "name": "lab/chains/IMPROVEMENT_LEDGER.yaml",
        "type": "fichier-données",
        "authority": "HumanGate — lecture pipeline, écriture close_imp()",
        "downstream": (
            "Toute fermeture/ouverture d'IMP, ledger_cache, CEO Brief, métriques Kaizen. "
            "Corruption = perte de l'historique Kaizen complet."
        ),
    },
    {
        "name": "lab/chains/golden_examples.jsonl",
        "type": "corpus-LoRA",
        "authority": "HumanGate — suppression FORBIDDEN",
        "downstream": (
            "Dataset fine-tuning LoRA. Suppression irréversible sans git. "
            "Toute modification altère la distribution d'entraînement."
        ),
    },
    {
        "name": "lab/agent_policy/tool_permission_matrix.json",
        "type": "fichier-politique",
        "authority": "HumanGate — deny_by_default gate (_TOOL_PERMISSION_MATRIX)",
        "downstream": (
            "Autorise ou bloque chaque appel outil dans le pipeline automation. "
            "Absent = gate silencieusement désactivé."
        ),
    },
    {
        "name": "00_STUDIO_CONTROL/01_SYSTEM/boundaries/CLAIM_MATRIX.md",
        "type": "fichier-politique",
        "authority": "HumanGate — claim_verdict lu au démarrage autopilot.py",
        "downstream": (
            "_CLAIM_VERDICT injecté dans tous les prompts LM. "
            "Si altéré, claim_verdict peut passer de NO_CLAIM_ALLOWED à ALLOWED."
        ),
    },
    {
        "name": "LM_MODEL",
        "type": "constante-config",
        "authority": "Studio admin — défini ligne 29 autopilot.py",
        "downstream": (
            "Modèle utilisé pour CEO Brief, idea-to-imp, autoloop charter. "
            "Qwen3.6 interdit (thinking mode vide le content JSON)."
        ),
    },
    {
        "name": "PORT",
        "type": "constante-config",
        "authority": "Studio admin — défini ligne 27 autopilot.py",
        "downstream": (
            "Point d'entrée unique du serveur HTTP. "
            "Changement = UI inaccessible sans reconfiguration côté client."
        ),
    },
    {
        "name": "/api/idea-to-imp",
        "type": "endpoint-POST",
        "authority": "Pipeline automation — SAFE_AUTO",
        "downstream": (
            "Lance pipeline 5 étapes (roadmap->redteam->fusion->extract->staged). "
            "Mute IDEAS_FILE + ROADMAP_PROPOSALS.yaml en parallèle."
        ),
    },
    {
        "name": "/api/close-imp",
        "type": "endpoint-POST",
        "authority": "HumanGate — validate_and_close_imp() bouton wf-btn-close",
        "downstream": (
            "Écriture directe dans IMPROVEMENT_LEDGER.yaml (closed_session horodaté). "
            "Action irréversible sans git revert."
        ),
    },
    {
        "name": "/api/autoloop-start",
        "type": "endpoint-POST",
        "authority": "AUDIT_REQUIRED ou HUMAN_REQUIRED selon dry_run flag",
        "downstream": (
            "Lance sous-processus Python par lane. "
            "dry_run=false = exécution réelle sur repo (charter + mutations fichiers)."
        ),
    },
    {
        "name": "lab/chains/ROADMAP_PROPOSALS.yaml",
        "type": "fichier-staging",
        "authority": "Pipeline automation — _stage_proposals()",
        "downstream": (
            "Buffer humangate_verdict:null avant injection ledger. "
            "Corruption = perte des proposals en attente HumanGate."
        ),
    },
    {
        "name": "lab/chains/ideas.json",
        "type": "fichier-données",
        "authority": "Pipeline automation — update_idea_status()",
        "downstream": (
            "Statut des idées (backlog/wip/pipeline_done/applied). "
            "Alimente page-ideas UI et décide quelles idées sont re-proposables."
        ),
    },
]


def identify_critical_surfaces(
    autopilot_path: Path = AUTOPILOT,
) -> list[dict[str, Any]]:
    """Parse autopilot.py et retourne les surfaces critiques documentées.

    Chaque entrée contient : name, type, authority, downstream, evidence_line.
    evidence_line est le numéro de la première ligne dans autopilot.py qui
    contient le nom de la surface (None si non trouvée).
    """
    if not autopilot_path.exists():
        raise FileNotFoundError(f"autopilot.py introuvable : {autopilot_path}")

    src_lines = autopilot_path.read_text(encoding="utf-8", errors="replace").splitlines()

    results: list[dict[str, Any]] = []
    for surface in CRITICAL_SURFACES:
        # Cherche le pattern le plus court du nom dans les lignes source
        search_key = surface["name"].lstrip("/").split(" ")[0]
        evidence_line: int | None = None
        for lineno, line in enumerate(src_lines, 1):
            if search_key in line:
                evidence_line = lineno
                break

        entry: dict[str, Any] = dict(surface)
        entry["evidence_line"] = evidence_line
        results.append(entry)

    return results


def _extract_api_endpoints(autopilot_path: Path = AUTOPILOT) -> list[tuple[int, str]]:
    """Retourne tous les endpoints /api/* définis dans autopilot.py."""
    if not autopilot_path.exists():
        return []
    src = autopilot_path.read_text(encoding="utf-8", errors="replace")
    return [
        (i + 1, m.group(1))
        for i, line in enumerate(src.splitlines())
        for m in [re.search(r'elif path == "(/api/[^"]+)"', line)]
        if m
    ]


def _print_report(surfaces: list[dict[str, Any]]) -> None:
    print(f"identify_critical_surfaces — {len(surfaces)} surfaces documentées\n")
    for s in surfaces:
        ref = f"L.{s['evidence_line']}" if s["evidence_line"] else "non localisée"
        print(f"  [{s['type'].upper()}] {s['name']}")
        print(f"    Autorité   : {s['authority']}")
        print(f"    Downstream : {s['downstream']}")
        print(f"    Évidence   : autopilot.py {ref}")
        print()


if __name__ == "__main__":
    surfaces = identify_critical_surfaces()
    _print_report(surfaces)
    endpoints = _extract_api_endpoints()
    print(f"Endpoints /api/* détectés dans autopilot.py : {len(endpoints)}")
    for lineno, ep in endpoints:
        print(f"  L.{lineno}  {ep}")
