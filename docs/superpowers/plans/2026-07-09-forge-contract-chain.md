# Forge Contract Chain — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Doter chaque étape-agent de la chaîne Forge d'un contrat validé, pour qu'aucune étape ne soit activable sans contrat complet et un runtime résolu.

**Architecture:** Un contrat YAML par étape dans `scripts/forge/contracts/<id>.yaml`, conforme au schéma 17 champs (`SCHEMA.md`). `s4-archi.yaml` est l'exemplaire de référence. Le dispatcher `contract.py` (déjà livré : C1 valide, C2 fabrique le prompt borné, registry local résout le runtime depuis `capability_role`) est **inchangé** — ce plan ne fait qu'ajouter des contrats + le rôle `deterministic` + un test capstone qui prouve toute la chaîne gouvernée.

**Tech Stack:** Python 3.12 (`.venv312`), PyYAML, pytest. Aucun LLM dans les oracles. Aucun spawn.

## Global Constraints

- YAML = source canonique ; 17 champs du schéma `scripts/forge/contracts/SCHEMA.md`.
- 3 états par champ : `filled` / `declared_empty` (`aucun`) / `absent`. Critique vide/absent ⇒ refus. Important(`skill`,`plugin`)/Recommandé(`delegation_context`) : `aucun` autorisé, jamais absent.
- **Jamais de modèle en dur** : le contrat déclare `capability_role` (+ `exigences_cognitives`) ; le registry (`scripts/forge/contracts/roles.yaml`) résout. Rôle non résolu ⇒ `RoleUnresolved`.
- Rôles Forge : producteurs = Claude ; `redteam_reviewer` = Qwen ; oracles/verdict = `deterministic` (ajouté en Task 0).
- Zone protégée : `tests/**` sauf `scripts/forge/tests/` (tests de CE module, autorisés).
- Aucune écriture durable (ledger, projects.json, mémoires) — hors périmètre de ce plan.
- **Commits différés** : Pierre a demandé « skip le commit ». L'étape Commit de chaque tâche est CONSERVÉE dans le plan (forme canonique) mais NON exécutée sans go explicite de Pierre.
- Oracle unique de ce plan : `.venv312/Scripts/python.exe -m pytest scripts/forge/tests/ -q`.

---

## File Structure

- `scripts/forge/contracts/roles.yaml` — MODIFIÉ (Task 0) : ajout du rôle `deterministic`.
- `scripts/forge/contracts/s0-contrat.yaml` — CRÉÉ (Task 1) : Rédacteur du Contrat (Opus).
- `scripts/forge/contracts/s3-decompo.yaml` — CRÉÉ (Task 2) : Décomposition fonctionnelle (Opus).
- `scripts/forge/contracts/s6-redteam-plan.yaml` — CRÉÉ (Task 3) : Red-team du plan (Qwen).
- `scripts/forge/contracts/s9-build.yaml` — CRÉÉ (Task 4) : Builder (Haiku).
- `scripts/forge/contracts/s11-redteam-code.yaml` — CRÉÉ (Task 5) : Red-team code aveuglé (Opus).
- `scripts/forge/contracts/s10a-oracle-code.yaml`, `s10b-oracle-archi.yaml`, `s10c-oracle-wiremap.yaml`, `s12-verdict.yaml` — CRÉÉS (Task 6) : étapes déterministes.
- `scripts/forge/tests/test_contract_chain.py` — CRÉÉ (Task 7) : capstone, prouve toute la chaîne.

Chaque contrat suit la structure de `s4-archi.yaml` (mêmes commentaires de section). L'exécutant remplit les 17 champs avec le contenu réel de l'étape (fourni par tâche ci-dessous), pas du placeholder.

---

## Task 0 : rôle `deterministic` dans le registry Forge

**Files:**
- Modify: `scripts/forge/contracts/roles.yaml`
- Test: `scripts/forge/tests/test_contract_chain.py` (créé en Task 7 ; ce comportement y est couvert)

**Interfaces:**
- Consumes: `control_plane.registry.get_model_for_role(role, caps_path)`.
- Produces: le rôle `deterministic` résout vers `deterministic/non-llm` ⇒ `get_model_for_role("deterministic", FORGE_ROLES)` == `"non-llm"`.

- [ ] **Step 1 : ajouter le modèle sentinelle dans roles.yaml**

Ajouter à la fin de la liste `models:` de `scripts/forge/contracts/roles.yaml` :

```yaml
  # Étapes déterministes (oracles + verdict) : PAS de LLM. Runtime sentinelle non-llm.
  - id: deterministic/non-llm
    name: Oracle déterministe (non-LLM)
    provider: forge
    reasoning: false
    roles:
      - deterministic       # étapes 10a/10b/10c (oracles) + 12 (verdict signé)
```

- [ ] **Step 2 : vérifier la résolution**

Run: `.venv312/Scripts/python.exe -c "import sys; sys.path.insert(0,'scripts'); from forge.contract import resolve_runtime; print(resolve_runtime({'capability_role':'deterministic'}))"`
Expected: affiche `non-llm`

---

## Tasks 1–5 : contrats des étapes LLM

Chaque tâche crée un fichier `scripts/forge/contracts/<id>.yaml` de 17 champs sur le modèle de `s4-archi.yaml`. Le TDD est identique pour les cinq ; les **paramètres distinctifs** par étape sont dans le tableau, le reste (structure, garde-fous génériques, règle de restitution) est hérité du schéma.

**Cycle TDD commun (appliqué à CHAQUE tâche 1→5) :**

- [ ] **Step 1 : Write the failing test** — ajouter dans `scripts/forge/tests/test_contract_chain.py` (ou, si Task 7 pas encore faite, créer un test temporaire) :

```python
def test_<id>_activable():
    from forge.contract import load_contract, build_dispatch_payload
    payload = build_dispatch_payload(load_contract("<id>"), etape="<id>")
    assert payload.model  # rôle résolu
```

- [ ] **Step 2 : Run to verify it fails** — `pytest scripts/forge/tests/test_contract_chain.py::test_<id>_activable -v` → FAIL (fichier contrat absent).
- [ ] **Step 3 : Author the contract** — créer `scripts/forge/contracts/<id>.yaml` (17 champs, contenu réel du tableau, structure de `s4-archi.yaml`).
- [ ] **Step 4 : Run to verify it passes** — même commande → PASS.
- [ ] **Step 5 : Commit** (DIFFÉRÉ — voir Global Constraints) : `git add scripts/forge/contracts/<id>.yaml && git commit -m "feat(forge): contrat <id>"`.

**Paramètres distinctifs par étape** (objectif/sortie = verbatim de la cartographie `chain-forge.json`) :

| Task | id | `capability_role` (→ modèle) | `role` (posture) | `objectif` | `output_contract` | `out_of_scope` clé |
|---|---|---|---|---|---|---|
| 1 | `s0-contrat` | `contract_author` (→ Opus) | Rédacteur du Contrat (étape 0) | Produire charter.yaml SANS aucun champ « à définir » : objectif · hors_scope[] · criteres_succes[] · actions_interdites[]. | `charter.yaml : {objectif, hors_scope[], criteres_succes[], actions_interdites[]}` tous remplis | N'écrit pas de code ; ne décide pas l'archi |
| 2 | `s3-decompo` | `decompose` (→ Opus) | Décomposition Fonctionnelle (étape 3) | Produire l'arbre Système→Feature→capacité ; chaque FEUILLE porte sa preuve attendue (héritée des Règles observables du Prisme). | `featuremap : arbre {Système→Feature→capacité}, chaque feuille = {capacité, preuve_attendue}` | Ne découpe pas en modules (c'est l'archi, étape 4) |
| 3 | `s6-redteam-plan` | `redteam_reviewer` (→ Qwen) | Red-team du PLAN (archi + wiremap) | Produire un rapport d'attaque + artefacts (archi/wiremap) ajustés. Porte sur le PLAN, jamais sur l'oracle. | `rapport_redteam_plan.md : liste {angle, faille, correction_proposée} + verdict GO-si-corrigé` | N'attaque JAMAIS les tests/oracles ; ne réécrit pas le code |
| 4 | `s9-build` | `builder` (→ Haiku) | Builder (délégation bornée par l'ownership) | Produire le code borné à l'ownership, WireMap tenue à jour, micro-commits. | `diff (micro-commits) + WireMap à jour {fichiers, fonction, version, preuve, statut}` | Ne sort pas de son ownership (blueprint) ; ne touche pas `tests/**` |
| 5 | `s11-redteam-code` | `redteam_code` (→ Opus) | Red-team CODE (sous-agent AVEUGLÉ) | Produire un rapport de failles INDÉPENDANT, non biaisé par les justifications du builder. | `rapport_redteam_code.md : {angle, faille, sévérité, reproduction}` | Ne voit pas le raisonnement du builder ; ne corrige pas lui-même |

Pour les 5 : `tests_oracles` = « oracle déterministe non-LLM de l'étape (cf. scripts/forge/oracles.json / oracle ARCHI / wiremap) ; jamais de LLM-as-judge » ; `final_report` = règle de restitution standard (cite l'oracle, sinon HumanGate/fog, NO_CLAIM_ALLOWED) ; `permissions` = read repo + write limité à l'artefact de sortie ; `skill`/`plugin` = `aucun` sauf pertinence explicite ; `delegation_context` = position dans la boucle Forge (amont/aval).

---

## Task 6 : contrats des étapes déterministes (oracles + verdict)

**Files:**
- Create: `scripts/forge/contracts/s10a-oracle-code.yaml`, `s10b-oracle-archi.yaml`, `s10c-oracle-wiremap.yaml`, `s12-verdict.yaml`
- Test: `scripts/forge/tests/test_contract_chain.py`

**Interfaces:**
- Consumes: rôle `deterministic` (Task 0) ⇒ `build_dispatch_payload` retourne `payload.model == "non-llm"`.
- Produces: 4 contrats activables marquant explicitement les étapes non-LLM.

- [ ] **Step 1 : Write the failing test**

```python
import pytest
@pytest.mark.parametrize("cid", ["s10a-oracle-code","s10b-oracle-archi","s10c-oracle-wiremap","s12-verdict"])
def test_deterministic_step_activable(cid):
    from forge.contract import load_contract, build_dispatch_payload
    payload = build_dispatch_payload(load_contract(cid), etape=cid)
    assert payload.model == "non-llm"
```

- [ ] **Step 2 : Run to verify it fails** — `pytest scripts/forge/tests/test_contract_chain.py -k deterministic -v` → FAIL (fichiers absents).
- [ ] **Step 3 : Author the 4 contracts** — chacun 17 champs, `capability_role: deterministic`, `exigences_cognitives: "aucun raisonnement LLM — exécution déterministe reproductible"`. Contenu par id (objectif/sortie verbatim de la cartographie) :
  - `s10a-oracle-code` : objectif « Prouver CODE : les tests passent. PASS/FAIL déterministe + evidence. » ; `output_contract` : `evidence log {commande, exit_code, tests_pass, tests_fail, hash}` ; `tests_oracles` : `scripts/forge/oracle.py` + `oracles.json`.
  - `s10b-oracle-archi` : objectif « Prouver ARCHI : domain n'importe pas infrastructure. » ; `output_contract` : `{deps_interdites_violées[], modules_sans_test[], debordements_ownership[]}` ; `tests_oracles` : import-linter / vérif graphe de deps.
  - `s10c-oracle-wiremap` : objectif « Prouver WIREMAP : feature manquante · fonction renommée · WireMap obsolète · preuve absente. » ; `output_contract` : `{features_manquantes[], fonctions_renommées[], obsoletes[], preuves_absentes[]}` ; `tests_oracles` : oracle wiremap AST.
  - `s12-verdict` : objectif « Émettre un verdict signé, vérifiable, non falsifiable, pour le HumanGate. » ; `output_contract` : `verdict.json signé {software, evidence, claim, decision, hmac}, NO_CLAIM_ALLOWED` ; `tests_oracles` : `scripts/forge/verdict.py` (HMAC-SHA256).
  Pour les 4 : `permissions` = read repo + write l'artefact d'evidence/verdict uniquement, run l'oracle ; `out_of_scope` = « aucun jugement LLM, aucune interprétation subjective » ; `gardeFou` = « JAMAIS de LLM-as-judge ».

- [ ] **Step 4 : Run to verify it passes** — même commande → PASS (4 cas).
- [ ] **Step 5 : Commit** (DIFFÉRÉ).

---

## Task 7 : capstone — toute la chaîne est gouvernée

**Files:**
- Create/finalize: `scripts/forge/tests/test_contract_chain.py`

**Interfaces:**
- Consumes: tous les `scripts/forge/contracts/*.yaml` + `forge.contract`.
- Produces: preuve mécanique que chaque contrat de la chaîne est complet + activable, et qu'un contrat cassé serait refusé.

- [ ] **Step 1 : Write the capstone test**

```python
from pathlib import Path
import copy, pytest
from forge.contract import (
    CONTRACTS_DIR, CRITICAL, load_contract, build_dispatch_payload,
    field_state, ContractIncomplete,
)

CHAIN = ["s0-contrat","s3-decompo","s4-archi","s6-redteam-plan","s9-build",
         "s10a-oracle-code","s10b-oracle-archi","s10c-oracle-wiremap",
         "s11-redteam-code","s12-verdict"]

def test_chain_files_present():
    on_disk = {p.stem for p in CONTRACTS_DIR.glob("*.yaml") if p.stem != "roles"}
    assert set(CHAIN).issubset(on_disk), f"contrats manquants: {set(CHAIN)-on_disk}"

@pytest.mark.parametrize("cid", CHAIN)
def test_chain_contract_activable(cid):
    payload = build_dispatch_payload(load_contract(cid), etape=cid)
    assert payload.model  # rôle résolu (LLM) ou 'non-llm' (déterministe)
    assert payload.role in payload.prompt
    assert "NO_CLAIM_ALLOWED" in payload.prompt

@pytest.mark.parametrize("cid", CHAIN)
def test_chain_contract_refuses_when_broken(cid):
    broken = copy.deepcopy(load_contract(cid))
    broken["objectif"] = ""  # un Critique vidé
    with pytest.raises(ContractIncomplete):
        build_dispatch_payload(broken, etape=cid)
```

- [ ] **Step 2 : Run the whole forge oracle** — `.venv312/Scripts/python.exe -m pytest scripts/forge/tests/ -q`
Expected: PASS (33 existants + les nouveaux de la chaîne).

- [ ] **Step 3 : Commit** (DIFFÉRÉ) : `git add scripts/forge/contracts/ scripts/forge/tests/test_contract_chain.py`.

---

## Self-Review

**1. Spec coverage :** 9 contrats restants (5 LLM Tasks 1–5 + 4 déterministes Task 6) + rôle `deterministic` (Task 0) + preuve chaîne (Task 7). ✅ Couvre « écrire les 9 contrats ». Hors périmètre (autres plans) : connecteurs 2/3/4/5/6 et resync carte llm-lego — volontairement exclus (sous-systèmes indépendants, un plan chacun).

**2. Placeholder scan :** chaque contrat porte objectif/sortie verbatim de la cartographie + params distinctifs ; pas de « TBD ». Le contenu fin des champs génériques est hérité du schéma + exemplaire `s4-archi.yaml` (pattern établi), pas un placeholder.

**3. Type consistency :** `capability_role` valeurs (`contract_author, decompose, architect, redteam_reviewer, builder, redteam_code, deterministic`) ⊆ rôles de `roles.yaml` (après Task 0). `build_dispatch_payload`/`load_contract`/`field_state`/`ContractIncomplete`/`CONTRACTS_DIR`/`CRITICAL` = API réelle de `contract.py`. `payload.model`/`payload.role`/`payload.prompt` = champs réels de `DispatchPayload`. ✅

Note résync carte llm-lego (planètes 8→17 champs) : exclue de ce plan (cosmétique, connecteur visuel) — à planifier après la chaîne.
