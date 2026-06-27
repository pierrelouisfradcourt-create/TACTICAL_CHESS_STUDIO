"""template_engine.py — IR -> squelette structurel DETERMINISTE (IMP-188).

Regle d'or : ce module ne genere QUE de la structure. Aucun appel LLM,
aucune fabrication de logique de jeu. Il transforme un IR (valide contre
ir_schema_v1.json) en un `Scaffold` ou chaque regle expose un slot
`logic = None` que llm_logic_engine remplira en aval.

Determinisme : pour un meme IR en entree, la sortie est strictement
identique (aucun random, aucune horloge, aucun I/O reseau).
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any

logger = logging.getLogger("studio.factory.template_engine")

# Sentinelle de slot logique non rempli. llm_logic_engine la remplace.
LOGIC_UNFILLED: None = None


class TemplateError(ValueError):
    """Erreur structurelle de generation de squelette."""


def _project_block(meta: dict[str, Any]) -> dict[str, Any]:
    """Bloc projet derive du meta de l'IR (structure seule)."""
    return {
        "name": meta["name"],
        "version": meta["version"],
        # Indice de runtime non contraignant : sert a router l'oracle en aval.
        "game_type": meta.get("game_type", "unspecified"),
        "turn_based": bool(meta.get("turn_based", False)),
        "players": int(meta.get("players", 1)),
    }


def _entity_scaffold(entity: dict[str, Any]) -> dict[str, Any]:
    """Squelette d'entite : id, type, et CLES d'attributs declarees.

    On ne recopie que la liste des cles d'attributs (la forme), pas une
    logique : les valeurs restent disponibles dans `attributes` pour le
    runtime, mais la structure expose explicitement le contrat.
    """
    attributes = entity.get("attributes", {})
    if not isinstance(attributes, dict):
        raise TemplateError(
            f"entite '{entity.get('id')}' : 'attributes' doit etre un objet"
        )
    return {
        "id": entity["id"],
        "type": entity["type"],
        "attribute_keys": sorted(attributes.keys()),
        "attributes": attributes,
    }


def _rule_scaffold(rule: dict[str, Any]) -> dict[str, Any]:
    """Squelette de regle avec slot logique VIDE (a remplir en aval)."""
    return {
        "rule": rule["rule"],
        "category": rule.get("category", "uncategorized"),
        "condition": rule["condition"],
        "effect": rule["effect"],
        "parameters": rule.get("parameters", {}),
        # Slot rempli par llm_logic_engine — JAMAIS par la structure.
        "logic": LOGIC_UNFILLED,
    }


def _structure_layout(project: dict[str, Any], entities: list[dict[str, Any]]) -> dict[str, Any]:
    """Disposition structurelle (noms only) — la coquille Godot/projet.

    On n'ecrit aucun fichier ici : on decrit la structure cible de maniere
    deterministe pour que les couches aval (et plus tard l'export Godot)
    sachent quoi produire.
    """
    slug = project["name"].strip().lower().replace(" ", "_")
    return {
        "root": f"games/{slug}",
        "main_scene": f"games/{slug}/Main.tscn",
        "entity_scenes": [
            f"games/{slug}/entities/{e['id']}.tscn" for e in entities
        ],
        "logic_scripts": [
            f"games/{slug}/logic/{e['id']}.gd" for e in entities
        ],
    }


def build_scaffold(ir: dict[str, Any]) -> dict[str, Any]:
    """Construit le squelette structurel deterministe a partir d'un IR.

    L'IR est suppose deja valide contre ir_schema_v1.json (factory_loop le
    valide en amont). On revalide neanmoins les invariants minimaux ici pour
    echouer tot et clairement si appele directement.

    Returns
    -------
    dict
        Scaffold : { project, entities, rules, win_conditions, structure }.
        Chaque regle porte un slot `logic = None`.
    """
    if not isinstance(ir, dict):
        raise TemplateError(f"IR invalide : attendu dict, recu {type(ir).__name__}")
    for key in ("meta", "entities", "rules"):
        if key not in ir:
            raise TemplateError(f"IR incomplet : cle '{key}' manquante")
    if not ir["entities"]:
        raise TemplateError("IR sans entites")
    if not ir["rules"]:
        raise TemplateError("IR sans regles")

    project = _project_block(ir["meta"])
    entities = [_entity_scaffold(e) for e in ir["entities"]]
    rules = [_rule_scaffold(r) for r in ir["rules"]]

    scaffold = {
        "project": project,
        "entities": entities,
        "rules": rules,
        "win_conditions": list(ir.get("win_conditions", [])),
        "structure": _structure_layout(project, entities),
        # Drapeau renseigne par llm_logic_engine ; faux tant que des slots
        # logique restent vides.
        "logic_complete": False,
    }
    logger.info(
        "scaffold genere : %s v%s — %d entites, %d regles (logique vide)",
        project["name"], project["version"], len(entities), len(rules),
    )
    return scaffold


def load_ir(ir_path: str) -> dict[str, Any]:
    """Charge un IR JSON depuis un chemin repo-relatif ou absolu."""
    path = os.path.abspath(ir_path)
    if not os.path.isfile(path):
        raise TemplateError(f"IR introuvable : {path}")
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    if len(sys.argv) < 2:
        print("usage: python template_engine.py <ir_path.json>")
        raise SystemExit(2)
    scaffold = build_scaffold(load_ir(sys.argv[1]))
    print(json.dumps(scaffold, indent=2, ensure_ascii=False))
