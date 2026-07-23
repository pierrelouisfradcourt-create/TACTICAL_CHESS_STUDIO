"""Oracles déterministes du STANDARD Forge (`scripts/forge/standard/`).

Six oracles, un par facette du standard décrit dans `standard/SCHEMA.md` :

1. ``check_contract_completeness`` — schéma FERMÉ de `game_contract` / `system_contract`
   (miroir de `checkSpec` dans `knowledge_base/kb-validate.mjs` : champ manquant = violation,
   champ inconnu = violation).
2. ``check_budget`` — la loi d'empilement (`len(adds) <= 1`), les `reuses` au tier `validated`,
   toute brique déposée dans le budget.
3. ``check_line_states`` — les 6 états d'une ligne de wiremap v2 et leurs contraintes
   (NOT_APPLICABLE/DEFERRED/UNKNOWN/REQUIRED/EXPECTED), l'exigence de champ `system_parent`,
   + omission silencieuse d'une exigence CORE. Distingue deux moments (`frozen`) : au gel
   (UNKNOWN et IMPLEMENTED interdits) vs après build (REQUIRED interdit).
4. ``check_placement`` — l'adresse d'une ligne est cohérente avec sa catégorie via `repo_map.yaml`,
   dérivée de `category` + `system_parent` (jamais de l'id de la ligne) ; `system_parent` doit
   désigner une entrée de `wiremap["systems"]`. En `schema_version: 2`, chaque entrée de
   `fichiers[]` DOIT elle-même déclarer `{path, category}` (jamais déduit du nom de fichier) —
   c'est le trou fermé par cette révision : une wiremap peut avoir une `address` de ligne
   correcte tout en posant ses fichiers réels ailleurs.
5. ``check_index`` — index bidirectionnel carte↔disque (fichiers ET dossiers), dossiers de
   gouvernance exclus, mode avant/après build (`built`), et — si `repo_map` est fourni —
   tout dossier de premier niveau hors des `roots` figées (`dossiers_hors_structure`). Lit
   `fichiers[]` sous ses deux formes (chaîne nue OU `{path, category}`) sans jamais juger
   `category` — cette règle appartient uniquement à `check_placement`.
6. ``check_collisions`` — le registre de capacités : identifiants inconnus, collisions
   `single_owner`, trous, doubles propriétaires, ordre d'écriture implicite.

Non-LLM, déterministes, reproductibles. Comme `static_oracles.py` : un oracle ne lève JAMAIS
sur une entrée malformée — il retourne un ``passed: False`` avec une raison explicite (cf.
`check_architecture`, commentaire F2b sur le crash-loop réel évité par cette discipline).

Ces oracles PROUVENT (PASS/FAIL) ; ils ne jugent jamais (aucun LLM). Ce module est autonome :
il n'est branché dans aucun driver/dispatch — ce branchement est une décision HumanGate
distincte (cf. commande de la session qui l'a produit).
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Callable

from .static_oracles import _is_test_file, _source_files  # réutilisés, pas dupliqués (SOURCE_EXTS y est déjà consommé)

# --------------------------------------------------------------------------------------
# Validateurs de type élémentaires (mêmes principes que ASSET_SPEC/BRICK_SPEC dans
# knowledge_base/kb-validate.mjs : chaque champ a un prédicat, un schéma fermé rejette
# tout champ absent d'un côté et tout champ inconnu de l'autre).
# --------------------------------------------------------------------------------------


def _is_str(v: Any) -> bool:
    return isinstance(v, str)


def _is_nonempty_str(v: Any) -> bool:
    return isinstance(v, str) and v.strip() != ""


def _is_int(v: Any) -> bool:
    # bool est une sous-classe d'int en Python — on l'exclut explicitement.
    return isinstance(v, int) and not isinstance(v, bool)


def _is_bool(v: Any) -> bool:
    return isinstance(v, bool)


def _is_str_list(v: Any) -> bool:
    return isinstance(v, list) and all(isinstance(x, str) for x in v)


def _is_dict(v: Any) -> bool:
    return isinstance(v, dict)


def _is_assets_plan(v: Any) -> bool:
    return v in ("cc0", "generated")


# spec[field] = (validateur, obligatoire)
_FieldSpec = dict[str, tuple[Callable[[Any], bool], bool]]

_GAME_CONTRACT_SPEC: _FieldSpec = {
    "schema_version": (_is_int, True),
    "game_id": (_is_nonempty_str, True),
    "node": (_is_int, True),
    "runtimes": (_is_str_list, True),
    "budget": (_is_dict, True),
    "assets": (_is_dict, True),
}
_BUDGET_SPEC: _FieldSpec = {
    "reuses": (_is_str_list, True),
    "adds": (_is_str_list, True),
}
_ASSETS_SPEC: _FieldSpec = {
    "plan": (_is_assets_plan, True),
}
_SYSTEM_CONTRACT_SPEC: _FieldSpec = {
    "schema_version": (_is_int, True),
    "id": (_is_nonempty_str, True),
    "category": (_is_nonempty_str, True),
    "provides": (_is_str_list, True),
    "requires": (_is_str_list, True),
    "owner": (_is_bool, True),
    "dependencies": (_is_str_list, True),
    "tests": (_is_str_list, True),
}

_SUPPORTED_KINDS = ("game", "system")


def _closed_schema_violations(obj: dict, spec: _FieldSpec, label: str) -> list[str]:
    """Schéma FERMÉ : champ obligatoire manquant OU mal typé -> violation ; champ
    absent du spec -> violation. Miroir Python de `checkSpec` (kb-validate.mjs)."""
    violations: list[str] = []
    for field, (validator, required) in spec.items():
        if field not in obj:
            if required:
                violations.append(f"{label}: champ obligatoire manquant '{field}'")
            continue
        if not validator(obj[field]):
            violations.append(f"{label}: champ mal typé '{field}' (reçu {obj[field]!r})")
    for key in obj.keys():
        if key not in spec:
            violations.append(f"{label}: champ inconnu (schéma fermé) '{key}'")
    return violations


def check_contract_completeness(contract: dict, kind: str) -> dict:
    """Schéma FERMÉ d'un `game_contract` ou `system_contract` (`standard/SCHEMA.md` §1-2).

    `kind` ∈ {"game", "system"}. Toute autre valeur (y compris "entity"/"level" — non
    écrits par le standard v1) est une VIOLATION EXPLICITE, jamais un crash.

    Retourne {passed, violations[]}. Jamais d'exception sur entrée malformée : un
    `contract` qui n'est pas un mapping produit une violation lisible, pas une TypeError.
    """
    if not isinstance(contract, dict):
        return {
            "passed": False,
            "violations": [f"contract n'est pas un mapping (reçu {type(contract).__name__})"],
        }

    if kind not in _SUPPORTED_KINDS:
        return {
            "passed": False,
            "violations": [
                f"kind non supporté: {kind!r} (formats écrits par le standard v1: "
                f"{', '.join(_SUPPORTED_KINDS)} — entity/level non encore écrits, "
                "cf. standard/SCHEMA.md §0)"
            ],
        }

    if kind == "game":
        label = "game_contract"
        violations = _closed_schema_violations(contract, _GAME_CONTRACT_SPEC, label)
        budget = contract.get("budget")
        if isinstance(budget, dict):
            violations += _closed_schema_violations(budget, _BUDGET_SPEC, f"{label}.budget")
        assets = contract.get("assets")
        if isinstance(assets, dict):
            violations += _closed_schema_violations(assets, _ASSETS_SPEC, f"{label}.assets")
    else:
        label = "system_contract"
        violations = _closed_schema_violations(contract, _SYSTEM_CONTRACT_SPEC, label)

    return {"passed": not violations, "violations": violations}


# --------------------------------------------------------------------------------------
# 2. check_budget — SCHEMA.md §1 : loi d'empilement + reuses au tier validated + brique
#    déposée forcément dans reuses ∪ adds.
# --------------------------------------------------------------------------------------


def check_budget(game_contract: dict, deposited_bricks: list[str], library_index: dict) -> dict:
    """Vérifie le budget d'un `game_contract` contre la bibliothèque et le dépôt réel.

    - `len(adds) <= 1` (loi d'empilement, §7 du standard).
    - tout `reuses[i]` existe dans `library_index` ET y est au tier `validated`.
    - toute brique de `deposited_bricks` appartient à `reuses ∪ adds` (sinon hors budget).
    - RÉCIPROQUE : toute brique promise dans `adds` mais JAMAIS déposée (absente de
      `deposited_bricks`) -> violation `promis_non_depose`. Sans ce contrôle, le volet
      `hors_budget` n'a qu'une seule direction et une promesse `adds` jamais tenue passe
      au vert par construction (tautologie mesurée sur `lab/forge_runs/pong_verif` : un
      `s10s` OK avec `game_loop` déclarée mais aucun dépositaire). La direction
      `hors_budget` seule a une variance nulle tant qu'aucun dépôt n'existe.
    - `adds ∩ reuses` non vide -> violation (chevauchement incohérent).

    Retourne {passed, empilement_violee, reuses_invalides[], hors_budget[],
    promis_non_depose[], chevauchement[]}.
    Jamais d'exception : toute entrée du mauvais type est traitée comme vide/absente.
    """
    if not isinstance(game_contract, dict):
        return {
            "passed": False,
            "raison": f"game_contract n'est pas un mapping (reçu {type(game_contract).__name__})",
            "empilement_violee": False,
            "reuses_invalides": [],
            "hors_budget": [],
            "promis_non_depose": [],
            "chevauchement": [],
        }

    budget = game_contract.get("budget")
    if not isinstance(budget, dict):
        return {
            "passed": False,
            "raison": "game_contract.budget absent ou n'est pas un mapping",
            "empilement_violee": False,
            "reuses_invalides": [],
            "hors_budget": [],
            "promis_non_depose": [],
            "chevauchement": [],
        }

    reuses_raw = budget.get("reuses")
    adds_raw = budget.get("adds")
    reuses = [r for r in reuses_raw if isinstance(r, str)] if isinstance(reuses_raw, list) else []
    adds = [a for a in adds_raw if isinstance(a, str)] if isinstance(adds_raw, list) else []
    deposited = (
        [b for b in deposited_bricks if isinstance(b, str)]
        if isinstance(deposited_bricks, list)
        else []
    )
    lib = library_index if isinstance(library_index, dict) else {}

    empilement_violee = len(adds) > 1

    reuses_invalides: list[str] = []
    for r in reuses:
        entry = lib.get(r)
        if not isinstance(entry, dict) or entry.get("tier") != "validated":
            reuses_invalides.append(r)

    budget_set = set(reuses) | set(adds)
    deposited_set = set(deposited)
    hors_budget = sorted({b for b in deposited if b not in budget_set})
    # RÉCIPROQUE de `hors_budget` : une brique promise dans `adds` mais jamais déposée.
    # Ferme la tautologie (une promesse `adds` non tenue passait au vert faute de contrôle
    # dans ce sens). N'inspecte QUE `adds` : un `reuses` désigne une brique préexistante
    # de la bibliothèque (validée par `reuses_invalides`), pas quelque chose que ce run
    # doit déposer.
    promis_non_depose = sorted({a for a in adds if a not in deposited_set})
    chevauchement = sorted(set(reuses) & set(adds))

    passed = not (
        empilement_violee
        or reuses_invalides
        or hors_budget
        or promis_non_depose
        or chevauchement
    )
    return {
        "passed": passed,
        "empilement_violee": empilement_violee,
        "reuses_invalides": reuses_invalides,
        "hors_budget": hors_budget,
        "promis_non_depose": promis_non_depose,
        "chevauchement": chevauchement,
    }


# --------------------------------------------------------------------------------------
# 3. check_line_states — SCHEMA.md §3 : les 6 états d'une ligne de wiremap v2.
# --------------------------------------------------------------------------------------

_ALLOWED_STATES = {"REQUIRED", "IMPLEMENTED", "NOT_APPLICABLE", "DEFERRED", "BLOCKED", "UNKNOWN"}

# Deux moments, deux vérifications (SCHEMA.md §3, "Deux moments, deux vérifications") :
#   - "draft"  : squelette pas encore gelé, rien n'est encore exigé (comportement historique
#                de l'ancien `frozen=False`) — conservé pour ne fermer aucune porte amont.
#   - "frozen" : au gel (avant build) — `UNKNOWN` interdit (rien ne doit rester indécis) ET
#                `IMPLEMENTED` interdit (rien n'est encore fait). C'était l'ancien `frozen=True`,
#                étendu avec la nouvelle interdiction sur IMPLEMENTED.
#   - "built"  : après build — `REQUIRED` interdit (tout ce qui était à faire doit être devenu
#                IMPLEMENTED ou BLOCKED). Moment nouveau, absent de l'ancien booléen.
_MOMENT_DRAFT = "draft"
_MOMENT_FROZEN = "frozen"
_MOMENT_BUILT = "built"
_KNOWN_MOMENTS = {_MOMENT_DRAFT, _MOMENT_FROZEN, _MOMENT_BUILT}


def _normalize_moment(frozen) -> str:
    """Rétro-compatibilité de signature (SCHEMA.md §3) : `frozen` accepte soit l'ancien
    booléen (`True` -> "frozen" au gel, `False` -> "draft" en brouillon), soit la nouvelle
    chaîne de moment ("draft"|"frozen"|"built"). Une chaîne inconnue retombe sur "frozen"
    (le plus strict), jamais un crash — même discipline que le reste du module."""
    if isinstance(frozen, str):
        return frozen if frozen in _KNOWN_MOMENTS else _MOMENT_FROZEN
    return _MOMENT_FROZEN if frozen else _MOMENT_DRAFT


def check_line_states(wiremap: dict, core_requirements: dict, frozen: bool | str = True) -> dict:
    """Vérifie les contraintes des 6 états d'une ligne de wiremap v2 (`standard/SCHEMA.md` §3).

    - `state` doit appartenir à {REQUIRED, IMPLEMENTED, NOT_APPLICABLE, DEFERRED, BLOCKED, UNKNOWN}.
    - `NOT_APPLICABLE` sur une ligne `source == "CORE"` : interdit structurellement.
    - `NOT_APPLICABLE` sans `reason` non vide : violation.
    - `DEFERRED` sans `until` ET `decider` : violation.
    - Deux moments (`frozen`, cf. `_normalize_moment`) :
        - au gel ("frozen"/`True`) : `UNKNOWN` interdit ET `IMPLEMENTED` interdit.
        - après build ("built") : `REQUIRED` interdit.
        - brouillon ("draft"/`False`) : aucune des deux contraintes ci-dessus.
    - toute exigence de `core_requirements` absente de la wiremap (par `id`) : omission
      silencieuse, violation.
    - ligne `EXPECTED` sans `reference` non vide : violation.
    - ligne `EXPECTED`/`ADDITIONS` sans `source_role` : violation.
    - chaque ligne doit porter un `system_parent` non vide (SCHEMA.md §3, `system_parent`) :
      absence ou chaîne vide -> violation. C'est l'exigence de champ ; sa VALIDITÉ (désigne-t-il
      un système réel) est vérifiée par `check_placement`, pas ici.

    Retourne un dict `{passed, etats_invalides[], not_applicable_sur_core[],
    not_applicable_sans_raison[], deferred_incomplet[], unknown_au_gel[], implemented_au_gel[],
    required_apres_build[], core_omis[], expected_sans_reference[], source_manquante[],
    system_parent_manquant[]}`. Jamais d'exception.
    """
    empty = {
        "etats_invalides": [],
        "not_applicable_sur_core": [],
        "not_applicable_sans_raison": [],
        "deferred_incomplet": [],
        "unknown_au_gel": [],
        "implemented_au_gel": [],
        "required_apres_build": [],
        "core_omis": [],
        "expected_sans_reference": [],
        "source_manquante": [],
        "system_parent_manquant": [],
    }
    if not isinstance(wiremap, dict):
        return {
            "passed": False,
            "raison": f"wiremap n'est pas un mapping (reçu {type(wiremap).__name__})",
            **empty,
        }

    lines_raw = wiremap.get("lines")
    lines = lines_raw if isinstance(lines_raw, list) else []
    moment = _normalize_moment(frozen)

    etats_invalides: list[str] = []
    not_applicable_sur_core: list[str] = []
    not_applicable_sans_raison: list[str] = []
    deferred_incomplet: list[str] = []
    unknown_au_gel: list[str] = []
    implemented_au_gel: list[str] = []
    required_apres_build: list[str] = []
    expected_sans_reference: list[str] = []
    source_manquante: list[str] = []
    system_parent_manquant: list[str] = []
    seen_ids: list[str] = []

    for line in lines:
        if not isinstance(line, dict):
            etats_invalides.append("<ligne non-mapping>")
            continue
        lid = line.get("id") if isinstance(line.get("id"), str) else "<sans-id>"
        seen_ids.append(lid)
        state = line.get("state")
        source = line.get("source")

        if state not in _ALLOWED_STATES:
            etats_invalides.append(f"{lid}:{state!r}")
        else:
            if state == "NOT_APPLICABLE":
                if source == "CORE":
                    not_applicable_sur_core.append(lid)
                reason = line.get("reason")
                if not (isinstance(reason, str) and reason.strip()):
                    not_applicable_sans_raison.append(lid)
            if state == "DEFERRED":
                until = line.get("until")
                decider = line.get("decider")
                if not (isinstance(until, str) and until.strip()) or not (
                    isinstance(decider, str) and decider.strip()
                ):
                    deferred_incomplet.append(lid)
            if state == "UNKNOWN" and moment == _MOMENT_FROZEN:
                unknown_au_gel.append(lid)
            if state == "IMPLEMENTED" and moment == _MOMENT_FROZEN:
                implemented_au_gel.append(lid)
            if state == "REQUIRED" and moment == _MOMENT_BUILT:
                required_apres_build.append(lid)

        if source == "EXPECTED":
            reference = line.get("reference")
            if not (isinstance(reference, str) and reference.strip()):
                expected_sans_reference.append(lid)
        if source in ("EXPECTED", "ADDITIONS"):
            source_role = line.get("source_role")
            if not (isinstance(source_role, str) and source_role.strip()):
                source_manquante.append(lid)

        system_parent = line.get("system_parent")
        if not (isinstance(system_parent, str) and system_parent.strip()):
            system_parent_manquant.append(lid)

    core_omis: list[str] = []
    if isinstance(core_requirements, dict):
        reqs = core_requirements.get("requirements")
        if isinstance(reqs, list):
            for req in reqs:
                if isinstance(req, dict) and isinstance(req.get("id"), str):
                    rid = req["id"]
                    if rid not in seen_ids:
                        core_omis.append(rid)

    passed = not (
        etats_invalides
        or not_applicable_sur_core
        or not_applicable_sans_raison
        or deferred_incomplet
        or unknown_au_gel
        or implemented_au_gel
        or required_apres_build
        or core_omis
        or expected_sans_reference
        or source_manquante
        or system_parent_manquant
    )
    return {
        "passed": passed,
        "etats_invalides": etats_invalides,
        "not_applicable_sur_core": not_applicable_sur_core,
        "not_applicable_sans_raison": not_applicable_sans_raison,
        "deferred_incomplet": deferred_incomplet,
        "unknown_au_gel": unknown_au_gel,
        "implemented_au_gel": implemented_au_gel,
        "required_apres_build": required_apres_build,
        "core_omis": core_omis,
        "expected_sans_reference": expected_sans_reference,
        "source_manquante": source_manquante,
        "system_parent_manquant": system_parent_manquant,
    }


# --------------------------------------------------------------------------------------
# 4. check_placement — SCHEMA.md §4.3 + repo_map.yaml : adresse cohérente avec la
#    catégorie, catégorie absente de la table = violation (jamais un placement par défaut).
# --------------------------------------------------------------------------------------


def _template_expected_prefix(template: str, deriv_id: str) -> str:
    """Gabarit `mapping[category]` -> préfixe de chemin attendu, `{id}` substitué.

    Fonction unique pour les DEUX usages du gabarit (adresse de ligne §4.3 ET
    placement de fichier §1 déclaré) — ne jamais dupliquer cette substitution."""
    return template.replace("{id}", deriv_id).replace("\\", "/").rstrip("/") + "/"


def _check_declared_fichiers(
    fichiers: list, lid: str, deriv_id: str, mapping: dict
) -> tuple[list[str], list[str], list[str]]:
    """Valide les entrées `fichiers[]` d'une ligne de wiremap `schema_version: 2`
    (`standard/SCHEMA.md` §3 — format déclaré, jamais déduit du nom de fichier).

    - une entrée qui n'est pas un mapping `{path, category}` (chaîne nue = ancien
      format, ou tout autre type) -> `categorie_fichier_non_declaree` : c'est le trou
      que cette fonction ferme, jamais accepté en silence.
    - `path` absent/vide ou `category` absent/vide sur une entrée-mapping -> même
      liste (`categorie_fichier_non_declaree`) : la déclaration est incomplète.
    - `category` non nulle mais absente de `repo_map["mapping"]` -> `categorie_fichier_non_mappee`
      (jamais de placement par défaut, même discipline que `categorie_non_mappee`).
    - `path` incohérent avec le gabarit `mapping[category]` (même fonction que pour
      l'adresse d'une ligne, `_template_expected_prefix`) -> `fichier_adresse_incoherente`.

    Retourne (categorie_fichier_non_declaree, categorie_fichier_non_mappee,
    fichier_adresse_incoherente). Jamais d'exception sur entrée malformée.
    """
    non_declaree: list[str] = []
    non_mappee: list[str] = []
    incoherente: list[str] = []

    for entry in fichiers:
        if not isinstance(entry, dict):
            descriptor = entry if isinstance(entry, str) else repr(entry)
            non_declaree.append(f"{lid}:{descriptor}")
            continue

        fpath = entry.get("path")
        if not (isinstance(fpath, str) and fpath.strip()):
            non_declaree.append(f"{lid}:<path vide ou absent>")
            continue

        fcategory = entry.get("category")
        if not (isinstance(fcategory, str) and fcategory.strip()):
            non_declaree.append(f"{lid}:{fpath}")
            continue

        ftemplate = mapping.get(fcategory)
        if not isinstance(ftemplate, str):
            non_mappee.append(f"{lid}:{fpath}:{fcategory}")
            continue

        expected = _template_expected_prefix(ftemplate, deriv_id)
        norm_path = fpath.strip().replace("\\", "/")
        if not norm_path.startswith(expected):
            incoherente.append(f"{lid}:{fpath} (attendu sous '{expected}', category={fcategory})")

    return non_declaree, non_mappee, incoherente


def check_placement(wiremap: dict, repo_map: dict) -> dict:
    """Vérifie que chaque ligne a une adresse non vide et cohérente avec sa catégorie.

    - `address` non vide requis sur chaque ligne.
    - catégorie absente de `repo_map["mapping"]` -> violation explicite (jamais de
      placement par défaut, cf. `repo_map.yaml` en-tête).
    - `address` incohérente avec le gabarit `mapping[category]` -> violation. Le gabarit
      est rempli avec `system_parent` (SCHEMA.md §3, "plusieurs lignes vivent légitimement
      dans le même système") si la ligne en porte un valide, JAMAIS avec l'identifiant de
      la ligne dans ce cas — c'est ce qui permet à `core.game_state`, `core.end_condition`
      et `core.restart` de partager une adresse. Une ligne sans `system_parent` (wiremaps
      antérieures à cette section) retombe sur l'ancien comportement (`{id}` = identifiant
      de la ligne), pour rester rétro-compatible.
    - `system_parent` qui ne désigne aucune entrée de `wiremap["systems"]` (passe 1,
      SCHEMA.md §3) -> violation `system_parent_inconnu` : un meuble ne peut pas exister
      dans une pièce que le plan n'a jamais posée. L'exigence de simple PRÉSENCE du champ
      est du ressort de `check_line_states` (séparation des responsabilités) ; ici on ne
      juge que sa VALIDITÉ quand il est fourni.
    - la `category` de CHAQUE entrée de `wiremap["systems"]` (passe 1) doit elle-même
      exister dans `repo_map["mapping"]` -> sinon `systeme_categorie_non_mappee`. Un
      système gelé sur une catégorie que la table ne connaît pas ne pourra jamais être
      matérialisé (même discipline que `categorie_non_mappee`, appliquée à la passe 1).
    - **SSI `wiremap["schema_version"] == 2`** : chaque entrée de `fichiers[]` d'une
      ligne doit être un objet `{path, category}` — jamais déduit du nom de fichier
      (§1 du standard). Une entrée restée une chaîne nue (ancien format), une catégorie
      inconnue de la table, ou un `path` incohérent avec le gabarit de sa catégorie sont
      des violations distinctes (`categorie_fichier_non_declaree`,
      `categorie_fichier_non_mappee`, `fichier_adresse_incoherente`). Les wiremaps
      `schema_version` absente ou `1` ne subissent AUCUN changement de comportement —
      ce sont des preuves de runs passés (rétro-compatibilité stricte).

    Retourne {passed, adresse_manquante[], categorie_manquante[], categorie_non_mappee[],
    adresse_incoherente[], system_parent_inconnu[], systeme_categorie_non_mappee[],
    categorie_fichier_non_declaree[], categorie_fichier_non_mappee[],
    fichier_adresse_incoherente[]}. Jamais d'exception sur entrée malformée.
    """
    empty = {
        "adresse_manquante": [],
        "categorie_manquante": [],
        "categorie_non_mappee": [],
        "adresse_incoherente": [],
        "system_parent_inconnu": [],
        "systeme_categorie_non_mappee": [],
        "categorie_fichier_non_declaree": [],
        "categorie_fichier_non_mappee": [],
        "fichier_adresse_incoherente": [],
    }
    if not isinstance(wiremap, dict):
        return {
            "passed": False,
            "raison": f"wiremap n'est pas un mapping (reçu {type(wiremap).__name__})",
            **empty,
        }

    lines_raw = wiremap.get("lines")
    lines = lines_raw if isinstance(lines_raw, list) else []

    systems_raw = wiremap.get("systems")
    systems = systems_raw if isinstance(systems_raw, list) else []
    system_ids = {
        s["id"] for s in systems if isinstance(s, dict) and isinstance(s.get("id"), str)
    }

    mapping: dict = {}
    if isinstance(repo_map, dict) and isinstance(repo_map.get("mapping"), dict):
        mapping = repo_map["mapping"]

    # Déclencheur de la normalisation §1 : SEULE `schema_version: 2` active la
    # validation des fichiers déclarés — rétro-compatibilité stricte des wiremaps
    # antérieures (SCHEMA.md §3, "Ne pas confondre... rétro-compatibilité").
    schema_v2 = wiremap.get("schema_version") == 2

    adresse_manquante: list[str] = []
    categorie_manquante: list[str] = []
    categorie_non_mappee: list[str] = []
    adresse_incoherente: list[str] = []
    system_parent_inconnu: list[str] = []
    systeme_categorie_non_mappee: list[str] = []
    categorie_fichier_non_declaree: list[str] = []
    categorie_fichier_non_mappee: list[str] = []
    fichier_adresse_incoherente: list[str] = []

    for system in systems:
        if not isinstance(system, dict):
            continue
        sid = system.get("id") if isinstance(system.get("id"), str) else "<systeme-sans-id>"
        scat = system.get("category")
        if not (isinstance(scat, str) and scat.strip()) or scat not in mapping:
            systeme_categorie_non_mappee.append(f"{sid}:{scat!r}")

    for line in lines:
        if not isinstance(line, dict):
            continue
        lid = line.get("id") if isinstance(line.get("id"), str) else "<sans-id>"

        if schema_v2:
            fichiers_raw = line.get("fichiers")
            if isinstance(fichiers_raw, list) and fichiers_raw:
                system_parent_f = line.get("system_parent")
                has_system_parent_f = (
                    isinstance(system_parent_f, str) and system_parent_f.strip() != ""
                )
                deriv_id_f = system_parent_f if has_system_parent_f else lid
                nd, nm, inc = _check_declared_fichiers(fichiers_raw, lid, deriv_id_f, mapping)
                categorie_fichier_non_declaree += nd
                categorie_fichier_non_mappee += nm
                fichier_adresse_incoherente += inc

        address = line.get("address")
        if not (isinstance(address, str) and address.strip()):
            adresse_manquante.append(lid)
            continue

        category = line.get("category")
        if not (isinstance(category, str) and category.strip()):
            categorie_manquante.append(lid)
            continue

        system_parent = line.get("system_parent")
        has_system_parent = isinstance(system_parent, str) and system_parent.strip() != ""
        if has_system_parent and system_parent not in system_ids:
            system_parent_inconnu.append(f"{lid}:{system_parent}")
            # system_parent fourni mais invalide -> on n'en dérive pas d'adresse
            # (elle serait de toute façon calculée à partir d'un système fantôme).
            continue

        template = mapping.get(category)
        if not isinstance(template, str):
            categorie_non_mappee.append(f"{lid}:{category}")
            continue

        # L'adresse se dérive de `category` + `system_parent` (jamais de l'id de la ligne)
        # dès qu'un `system_parent` valide est présent ; sinon repli sur l'ancien schéma.
        deriv_id = system_parent if has_system_parent else lid
        expected = _template_expected_prefix(template, deriv_id)
        norm_addr = address.strip().replace("\\", "/").rstrip("/") + "/"
        if not norm_addr.startswith(expected):
            adresse_incoherente.append(f"{lid}: attendu '{expected}', reçu '{address}'")

    passed = not (
        adresse_manquante
        or categorie_manquante
        or categorie_non_mappee
        or adresse_incoherente
        or system_parent_inconnu
        or systeme_categorie_non_mappee
        or categorie_fichier_non_declaree
        or categorie_fichier_non_mappee
        or fichier_adresse_incoherente
    )
    return {
        "passed": passed,
        "adresse_manquante": adresse_manquante,
        "categorie_manquante": categorie_manquante,
        "categorie_non_mappee": categorie_non_mappee,
        "adresse_incoherente": adresse_incoherente,
        "system_parent_inconnu": system_parent_inconnu,
        "systeme_categorie_non_mappee": systeme_categorie_non_mappee,
        "categorie_fichier_non_declaree": categorie_fichier_non_declaree,
        "categorie_fichier_non_mappee": categorie_fichier_non_mappee,
        "fichier_adresse_incoherente": fichier_adresse_incoherente,
    }


# --------------------------------------------------------------------------------------
# 5. check_index — SCHEMA.md §4.4 : indexation dans les deux sens, carte<->disque.
#    C'est la moitié qui manque à check_wiremap (static_oracles.py) aujourd'hui :
#    check_wiremap ne teste QUE carte -> disque. Ici on teste aussi disque -> carte.
# --------------------------------------------------------------------------------------


# Dossiers de gouvernance (racines de `repo_map.yaml`) : contenu de PILOTAGE du run
# (charte, design, télémétrie, carte, artefacts Forge), pas contenu de JEU — ils n'ont
# pas vocation à être référencés par une `address` de ligne. Les exclure du contrôle
# d'orphelins évite le faux positif "00_CHARTER/09_WIREMAP orphelins" (correction
# standard 2026-07-22, cf. rapport de sondage des 6 oracles sur le squelette Pong).
_GOVERNANCE_DIRS = ("00_CHARTER", "01_DESIGN", "08_TELEMETRY", "09_WIREMAP", "10_FORGE")


def _is_governance_path(rel: str) -> bool:
    top = rel.split("/", 1)[0]
    return top in _GOVERNANCE_DIRS


def check_index(
    wiremap: dict, src_root: Path, built: bool = True, repo_map: dict | None = None
) -> dict:
    """Index BIDIRECTIONNEL entre la wiremap et le disque.

    - carte -> disque : tout `fichiers[]`/`address` déclaré par une ligne existe — SSI
      `built` est True. **Avant build** (`built=False`), un fichier/dossier déclaré qui
      n'existe pas encore n'est PAS une violation : rien n'est construit, c'est attendu
      (SCHEMA.md §3, doctrine "deux moments, deux vérifications"). Une entrée de
      `fichiers[]` est acceptée sous DEUX formes, sans changement de comportement pour
      l'une ou l'autre : chaîne nue (chemin direct, wiremaps antérieures à
      `schema_version: 2`) ou objet `{path, category}` (schema_version 2, le chemin est
      `path`). Dans les deux cas seul le CHEMIN est indexé ici — juger `category`
      appartient exclusivement à `check_placement` (jamais deux implémentations de la
      même règle, cf. `FORGE_SYSTEM_CONTRACT.yaml`).
    - disque -> carte : tout fichier de logique (extensions `SOURCE_EXTS`, hors fichiers
      de test — réutilise `_is_test_file`/`_source_files` de `static_oracles.py`) présent
      sous `src_root` est cité par au moins une ligne ; sinon `orphelins` (du code que
      personne n'a demandé). Les dossiers de gouvernance (`_GOVERNANCE_DIRS` : charte,
      design, télémétrie, wiremap, artefacts Forge) ne sont PAS du contenu de jeu et sont
      exclus de ce contrôle, dans les deux sens (fichiers et dossiers).
    - un dossier référencé (`address`) qui n'existe pas -> violation SSI `built`.
    - un dossier qui existe (contient au moins un fichier), n'est référencé NI par une
      `address` NI par un fichier cité dans `fichiers[]` ET n'est pas un dossier de
      gouvernance -> violation (`dossiers_orphelins`, dossier vide de façade). Un dossier
      compte comme référencé s'il est égal à, ancêtre de, ou contient un fichier cité
      (décision Pierre 2026-07-23, `CHECK_INDEX_SYMMETRY_V1`) : `fichiers[]` prouvait déjà
      le référencement des FICHIERS (`cited_files`) mais, pour les DOSSIERS, seul
      `cited_addresses` était consulté — deux règles de preuve dans un même oracle. Sans
      cette symétrie, des dossiers réels contenant des fichiers cités (ex. `07_TESTS/unit`)
      étaient de faux orphelins. Un dossier de premier niveau hors structure reste attrapé
      par `dossiers_hors_structure` (ci-dessous), pas par ce volet.
    - **SSI `repo_map` est fourni** : tout dossier de PREMIER NIVEAU sous `src_root` qui
      n'appartient pas à `repo_map["roots"]` -> violation (`dossiers_hors_structure`).
      Attrape un builder qui crée `src/`, `lib/`, etc. hors de la structure figée. Ne
      descend jamais au-delà du premier niveau (les sous-dossiers d'une racine connue
      — ex. `05_SYSTEMS/game_loop/` — ne sont jamais concernés). `repo_map` est
      optionnel et absent par défaut : omis, ce contrôle ne s'exécute pas (aucun
      changement de comportement pour les appelants existants).

    Retourne {passed, fichiers_manquants[], dossiers_manquants[], orphelins[],
    dossiers_orphelins[], dossiers_hors_structure[]}. Jamais d'exception sur entrée
    malformée ou `src_root` absent.
    """
    empty = {
        "fichiers_manquants": [],
        "dossiers_manquants": [],
        "orphelins": [],
        "dossiers_orphelins": [],
        "dossiers_hors_structure": [],
    }
    if not isinstance(wiremap, dict):
        return {
            "passed": False,
            "raison": f"wiremap n'est pas un mapping (reçu {type(wiremap).__name__})",
            **empty,
        }

    lines_raw = wiremap.get("lines")
    lines = lines_raw if isinstance(lines_raw, list) else []
    root = Path(src_root)

    cited_files: set[str] = set()
    cited_addresses: list[str] = []
    fichiers_manquants: list[str] = []
    dossiers_manquants: list[str] = []

    for line in lines:
        if not isinstance(line, dict):
            continue
        lid = line.get("id") if isinstance(line.get("id"), str) else "<sans-id>"

        fichiers = line.get("fichiers")
        if isinstance(fichiers, list):
            for f in fichiers:
                # Deux formes acceptées (SCHEMA.md §3) : chaîne nue (wiremaps
                # antérieures à `schema_version: 2`, comportement INCHANGÉ) ou objet
                # `{path, category}` (schema_version 2). Ici on n'indexe QUE le chemin
                # — juger `category` appartient à `check_placement` (FORGE_SYSTEM_CONTRACT.yaml :
                # une seule implémentation par règle, jamais dupliquée entre oracles).
                if isinstance(f, str):
                    fpath = f
                elif isinstance(f, dict):
                    fpath = f.get("path")
                else:
                    continue
                if not (isinstance(fpath, str) and fpath.strip()):
                    continue
                norm = fpath.replace("\\", "/")
                cited_files.add(norm)
                if built and not (root / fpath).exists():
                    fichiers_manquants.append(f"{lid}:{fpath}")

        address = line.get("address")
        if isinstance(address, str) and address.strip():
            norm_addr = address.strip().replace("\\", "/").rstrip("/")
            cited_addresses.append(norm_addr)
            if built and not (root / norm_addr).is_dir():
                dossiers_manquants.append(f"{lid}:{address}")

    orphelins: list[str] = []
    dossiers_orphelins: list[str] = []

    if root.exists() and root.is_dir():
        for path in _source_files(root):
            if _is_test_file(path):
                continue
            rel = path.relative_to(root).as_posix()
            if _is_governance_path(rel):
                continue
            if rel not in cited_files:
                orphelins.append(rel)

        for d in sorted(p for p in root.rglob("*") if p.is_dir()):
            rel = d.relative_to(root).as_posix()
            if _is_governance_path(rel):
                continue
            files_in_dir = [p for p in d.rglob("*") if p.is_file()]
            if not files_in_dir:
                continue  # dossier structurel vide : pas la préoccupation visée ici
            # Exemption dossier 100%-tests (décision Pierre 2026-07-23) : symétrique EXACT
            # de l'exclusion `_is_test_file` déjà appliquée aux FICHIERS ci-dessus. Un
            # dossier ne contenant QUE des fichiers de test (`*.test.mjs`…, même heuristique
            # `_is_test_file`) n'a pas à être référencé par une `address` ni par `fichiers[]`
            # — les tests sont légitimement déclarés ailleurs (`system_contract.tests`),
            # jamais dans la wiremap. Un dossier avec ne serait-ce qu'un fichier NON-test
            # reste soumis à la règle (l'exemption ne blanchit pas un dossier mixte).
            if all(_is_test_file(p) for p in files_in_dir):
                continue
            # référencé si égal à une adresse citée, descendant d'une adresse citée
            # (ex. sous-dossier d'un système), OU ANCÊTRE d'une adresse citée (ex.
            # "05_SYSTEMS/" est un parent structurel nécessaire de "05_SYSTEMS/game_loop/"
            # cité — ce n'est pas un dossier de façade, juste un dossier-racine).
            referenced = any(
                rel == addr or rel.startswith(addr + "/") or addr.startswith(rel + "/")
                for addr in cited_addresses
            )
            # CHECK_INDEX_SYMMETRY_V1 (décision Pierre 2026-07-23) : `fichiers[]` prouve
            # AUSSI le référencement d'un dossier. Un dossier est référencé s'il contient
            # (est égal à, ou ancêtre de) un fichier cité — même règle de preuve que pour
            # les fichiers, appliquée aux dossiers. Ne rend PAS l'oracle aveugle : un
            # dossier de premier niveau hors structure sans aucun fichier cité reste
            # orphelin ici (et attrapé par `dossiers_hors_structure`).
            if not referenced:
                referenced = any(
                    cf == rel or cf.startswith(rel + "/") for cf in cited_files
                )
            if not referenced:
                dossiers_orphelins.append(rel)

    # Dossier de premier niveau hors structure (`repo_map["roots"]`) : SSI repo_map est
    # un dict exploitable — sinon liste vide, comportement inchangé (rétro-compatibilité
    # de signature pour tout appelant existant qui ne passe pas ce paramètre).
    dossiers_hors_structure: list[str] = []
    if isinstance(repo_map, dict) and root.exists() and root.is_dir():
        roots_map = repo_map.get("roots")
        allowed_top: set[str] = set()
        if isinstance(roots_map, dict):
            for v in roots_map.values():
                if isinstance(v, str) and v.strip():
                    allowed_top.add(v.strip().replace("\\", "/").rstrip("/"))
        for child in sorted((p for p in root.iterdir() if p.is_dir()), key=lambda p: p.name):
            if child.name not in allowed_top:
                dossiers_hors_structure.append(child.name)

    passed = not (
        fichiers_manquants
        or dossiers_manquants
        or orphelins
        or dossiers_orphelins
        or dossiers_hors_structure
    )
    return {
        "passed": passed,
        "fichiers_manquants": fichiers_manquants,
        "dossiers_manquants": dossiers_manquants,
        "orphelins": orphelins,
        "dossiers_orphelins": dossiers_orphelins,
        "dossiers_hors_structure": dossiers_hors_structure,
    }


# --------------------------------------------------------------------------------------
# 6. check_collisions — SCHEMA.md §4.5 + capabilities.yaml : audit du registre de
#    capacités, arithmétique (pas de juge LLM sur la similarité sémantique).
# --------------------------------------------------------------------------------------


def check_collisions(wiremap: dict, capabilities: dict) -> dict:
    """Vérifie le registre de capacités (`capabilities.yaml`) contre la wiremap.

    - tout identifiant de `provides`/`requires` doit exister dans le registre (pas de
      nom libre) -> sinon `identifiants_inconnus`.
    - deux lignes avec le même `provides` sur une capacité `single_owner: true` -> collision.
    - un `requires` sans aucun fournisseur -> trou.
    - deux lignes `owner: true` sur la même capacité -> double propriétaire.
    - plusieurs lignes fournissant (écrivant) la même capacité sans qu'AUCUNE d'entre
      elles ne déclare `write_order` -> ordre implicite (incident réel : compteur global
      cassant le déterminisme du replay).

    Retourne {passed, identifiants_inconnus[], collisions[], trous[], doubles_proprietaires[],
    ordre_implicite[]}. Jamais d'exception sur entrée malformée.
    """
    empty = {
        "identifiants_inconnus": [],
        "collisions": [],
        "trous": [],
        "doubles_proprietaires": [],
        "ordre_implicite": [],
    }
    if not isinstance(wiremap, dict):
        return {
            "passed": False,
            "raison": f"wiremap n'est pas un mapping (reçu {type(wiremap).__name__})",
            **empty,
        }

    lines_raw = wiremap.get("lines")
    lines = lines_raw if isinstance(lines_raw, list) else []

    cap_defs: dict[str, dict] = {}
    if isinstance(capabilities, dict) and isinstance(capabilities.get("capabilities"), list):
        for c in capabilities["capabilities"]:
            if isinstance(c, dict) and isinstance(c.get("id"), str):
                cap_defs[c["id"]] = c
    cap_ids = set(cap_defs.keys())
    single_owner_ids = {cid for cid, c in cap_defs.items() if c.get("single_owner") is True}

    identifiants_inconnus: list[str] = []
    providers: dict[str, list[str]] = {}
    owners: dict[str, list[str]] = {}
    requirers: dict[str, list[str]] = {}
    write_orders: dict[str, list[bool]] = {}

    for line in lines:
        if not isinstance(line, dict):
            continue
        lid = line.get("id") if isinstance(line.get("id"), str) else "<sans-id>"

        provides = line.get("provides")
        provides = [p for p in provides if isinstance(p, str)] if isinstance(provides, list) else []
        requires = line.get("requires")
        requires = [r for r in requires if isinstance(r, str)] if isinstance(requires, list) else []
        owner_flag = line.get("owner") is True
        write_order = line.get("write_order")
        has_write_order = write_order is not None and str(write_order).strip() != ""

        for cap in provides:
            if cap not in cap_ids:
                identifiants_inconnus.append(f"{lid}:{cap}")
                continue
            providers.setdefault(cap, []).append(lid)
            write_orders.setdefault(cap, []).append(has_write_order)
            if owner_flag:
                owners.setdefault(cap, []).append(lid)

        for cap in requires:
            if cap not in cap_ids:
                identifiants_inconnus.append(f"{lid}:{cap}")
                continue
            requirers.setdefault(cap, []).append(lid)

    collisions = sorted(
        cap for cap, provs in providers.items() if cap in single_owner_ids and len(provs) > 1
    )
    trous = sorted(cap for cap in requirers if cap not in providers)
    doubles_proprietaires = sorted(cap for cap, own in owners.items() if len(own) > 1)
    ordre_implicite = sorted(
        cap
        for cap, provs in providers.items()
        if len(provs) > 1 and not all(write_orders.get(cap, []))
    )

    passed = not (
        identifiants_inconnus or collisions or trous or doubles_proprietaires or ordre_implicite
    )
    return {
        "passed": passed,
        "identifiants_inconnus": sorted(set(identifiants_inconnus)),
        "collisions": collisions,
        "trous": trous,
        "doubles_proprietaires": doubles_proprietaires,
        "ordre_implicite": ordre_implicite,
    }
