# FORGE — CONTEXTE DE REPRISE V2

*Généré 2026-08-02 par audit lecture seule du dépôt. Source de vérité : dépôt, planning
ratifié, sorties Observer. Aucun fichier runtime modifié pour produire ce document.*

## 00_PURPOSE

Permettre à une session neuve de reprendre l'exécution de P0 **sans historique
conversationnel**. Ce document n'est pas une synthèse d'opinion : chaque affirmation
renvoie à un fichier vérifiable.

## 01_CURRENT_STATE

- Registre ratifié : `studio_brain/planning/planning.yaml` (6 tâches). P0 y est `etat: EN_COURS`.
- Observer : opérationnel, 30 vues, console sur `http://127.0.0.1:8771/`
  (`python scripts/observer/live.py --project breakout_v2`). Dernière reconstruction
  `2026-08-02T18:56Z`, **55 écarts** au total.
- KB : `catalog.json` = **33 entrées** (dont 1 issue d'une leçon Forge, la première).
  5 leçons validées dans `lab/reports/lessons.jsonl`, 5 propositions dans
  `knowledge_base/proposals/` (1 APPLIQUEE, 4 PROPOSED).
- Rien n'est commité. Fichiers Forge modifiés et non commités : `kb-validate.mjs`,
  `contract.py`, `contracts/SCHEMA.md`, `run_real.py`, `standard/SCHEMA.md`,
  `standard_oracles.py`, `studio_link.py`, `godot_oracle.mjs`, `preflight.py` (nouveau).

## 02_P0_STATUS

**P0_STATUS = NOT_CLOSED.**

Critère ratifié (`planning.yaml:25`), trois conditions :

| condition | état | preuve |
|---|---|---|
| bloc « retour KB » ACTIF dans Observer | ✅ | `views.s1_workflow`, bloc `retour KB` = ACTIF |
| leçon validée → proposition datée → entrée catalogue reliée au projet | ✅ | `catalog.json` 33 entrées, `pat-forge-preflight_oracle_registration`, `supporting_runs: breakout_v2-run1` |
| **drift `lecon_routee_sans_consommateur` tombe à 0** | ❌ **= 4** | `observer_run.json`, champ `drift` |

Le mécanisme est prouvé de bout en bout sur **une** leçon. Le critère exige **toutes**.

## 03_LESSON_CONSUMER_MATRIX

| lesson_id | type naturel | consumer attendu | consumer existant | preuve runtime | statut |
|---|---|---|---|---|---|
| `forge.preflight_oracle_registration` | PREFLIGHT_GUARD | pré-vol de campagne | **oui** — `scripts/forge/preflight.py`, branché dans `run_real.main()` | `search_log.jsonl` ligne horodatée à chaque lancement ; blocage réel prouvé (exit 1, télémétrie inchangée) | **CONNECTED** |
| `forge.wiremap_concept_reuse_requalification` | VALIDATOR_RULE | règle sur `reused_from.type=CONCEPT` | **oui, câblé R2 2026-08-02** — bucket advisory `reused_concept_non_requalifie` dans `check_line_states`, citant le slug | validateur exécuté à chaque run (`driver.py:1730`) → reçu `oracles.standard` ; 19/38 lignes CONCEPT remontées sur la wiremap réelle | **CABLE_SANS_EXECUTION** — sortira du drift au prochain run réel |
| `forge.oracle_fail_vs_not_measured_marker` | ORACLE_RULE | exemption GPU par marqueur | **oui, câblé R3 2026-08-02** — clé `requires_gpu_window` dans le payload `FORGE_ORACLE` fait autorité sur le filet nommé | **aucune** : 0 fichier `.gd` ne déclare la clé (grep vérifié) → la règle est câblée mais **dormante** | **CABLE_DORMANT** |
| `forge.forge_oracle_convention_undocumented` | CONTRACT_SCHEMA | section dans le standard | **oui, câblé R4 2026-08-02** — section datée citant la leçon, 117 ajouts / 0 suppression | `standard/SCHEMA.md` est `mandatory_read` de 5 contrats, donc lu à l'exécution — mais un événement de lecture **ne porte pas le slug** | **CABLE_HORS_PORTEE_DETECTEUR** |
| `forge.timeout_greenfield_by_profile` | DISPATCH_POLICY | timeout dérivé du profil | **oui, câblé 2026-08-03** — `dispatch.PROFILE_STEP_TIMEOUTS_S` (structure profil→paramètres, créée pour cette leçon) + `run_real._timeout_effectif` ; l'intention opérateur prime | aucune — la résolution est journalisée dans `<run_dir>/run.log` en nommant la leçon, donc visible au prochain run `standard_godot` | **CABLE_SANS_EXECUTION** |

Aucune ligne n'emploie « consommé » sans trace : les 4 slugs sont à **0 occurrence** dans
`search_log.jsonl` (seul canal reconnu aujourd'hui par `command.py::_find_mechanical_consumer`).

## 04_REMAINING_ACTIONS

**P0 RESTANT** — strictement ce qu'exige le critère ratifié :

| # | fichier | action minimale | preuve attendue | coût | risque |
|---|---|---|---|---|---|
| R1 | `scripts/observer/command.py` | étendre `_find_mechanical_consumer` au-delà de `search_log` (canal par type de leçon) | une leçon VALIDATOR_RULE câblée sort du drift | faible | assimiler conformité et causalité — l'erreur commise et corrigée le 2026-08-02 |
| R2 | `scripts/forge/standard_oracles.py` | règle `reused_from.type=CONCEPT` dans `check_line_states` | reçu `oracles.standard` ; wiremap Breakout inchangée en verdict | faible | 52/52 lignes concernées → volume de violations si la règle est stricte |
| R3 | `scripts/forge/product_oracle_godot.py` | exemption GPU par marqueur au lieu du nom (l.55) | volet non mesurable → NOT_MEASURED sans nom en dur | moyen | toucher un oracle produit |
| R4 | `scripts/forge/standard/SCHEMA.md` | déclarer la convention `FORGE_ORACLE` | occurrence non nulle + fichier lu par un agent | faible | document sans lecteur si non `mandatory_read` |

**HORS P0** — utile, non nécessaire au critère : rendu console des statuts
`CONFORME_*` (backend prêt, UI alignée le 2026-08-02) · généralisation du détecteur à
d'autres leçons · application des 4 propositions KB restantes (décision Pierre).

## 05_BLOCKED_ITEMS

- **RÉSOLU le 2026-08-03** (commit `988c423`) — `forge.timeout_greenfield_by_profile`
  n'est plus CAPABILITY_MISSING : `dispatch.PROFILE_STEP_TIMEOUTS_S` est la structure
  profil→paramètres qui manquait. Table étroite d'UNE entrée, le couple réellement
  mesuré (`standard_godot` / `s9-build-godot-standard` → 5400 s) ; `evidence_count: 1`
  interdit d'extrapoler, donc les autres greenfields gardent le défaut et l'absence de
  mesure reste nommée.
- **État du blocage P0 : plus technique, seulement administratif.** Les 5 leçons ont
  désormais un consommateur mécanique. Le critère exige une preuve d'EXÉCUTION, donc
  une campagne. Meilleur cas d'une campagne `standard_godot` complète : 2 leçons sur 4
  sortiraient du drift (R2 via le reçu d'oracle, timeout via `run.log`) → **4 → 2**.
  R3 reste dormante tant qu'aucun `.gd` ne déclare `requires_gpu_window` ; R4 vit dans
  un document que l'événement de lecture n'estampille pas.
- Wiremap étage 2 (stampage natif) — conditionné au capteur P1-G4 (fichiers touchés).
- Test `test_driver_premortem_lessons_wiring.py` en échec **préexistant** (fige un état
  de corpus, pas une propriété) — `tests/` est zone protégée, gate Pierre requise.

## 06_EVIDENCE_INDEX

| preuve | emplacement |
|---|---|
| critère ratifié P0 | `studio_brain/planning/planning.yaml:18-25` |
| drift et 30 vues | `lab/reports/observer/breakout_v2/observer_run.json` |
| reconstruction lisible | `lab/reports/observer/breakout_v2/RECONSTRUCTION.md` |
| trace de consommation KB | `knowledge_base/search_log.jsonl` |
| entrée KB issue d'une leçon | `knowledge_base/catalog.json` → `pat-forge-preflight_oracle_registration` |
| propositions | `knowledge_base/proposals/` (5) + `_TAXONOMY_AMENDMENT_PROPOSAL.md` (ratifié) |
| campagne P5 (KB→builder→artefact) | `lab/forge_runs/p5_gridnav/` · `games/p5_gridnav/core/patrol.gd` (cite `sys-grid-nav-m01`) |
| règle de détection du drift | `scripts/observer/command.py:303-365` |
| capteur « déclaré ou lettre morte » | `scripts/forge/declaration_readers.mjs` + `scripts/forge/declaration_watchlist.json` (20 entrées) |
| conceptions ratifiées | `docs/observer/P0_*`, `P1_*`, `P2_*` |

## 07_NEXT_EXECUTION_ORDER

1. **Décision humaine préalable et bloquante** : le critère `== 0` est inatteignable sans
   traiter `timeout_greenfield_by_profile`. Soit sa capacité est construite, soit le
   critère est amendé explicitement. Sans cette décision, rien ne clôt P0.
2. R1 (canal de détection) — sans lui, R2/R3/R4 ne feront pas bouger le drift.
3. R2, puis R4 (faible coût, composant existant).
4. R3 (oracle produit, coût moyen).
5. Re-mesurer le drift. Ne déclarer aucune clôture sans `== 0` ou décision d'amendement.

## 08_RULES_NOT_TO_BREAK

- **Jamais déclarer P0 fermé** hors `lecon_routee_sans_consommateur == 0` ou décision
  humaine explicite modifiant ce critère.
- **Aucune consommation artificielle** : ne jamais ajouter un appel KB à un composant qui
  n'en a pas besoin à l'exécution, dans le seul but de créer une trace.
- **Conformité ≠ causalité** : un code conforme à une leçon ne prouve pas qu'elle l'a causé.
- **Propose-only** : aucune écriture automatique dans le catalogue, le registre de
  décisions ou le planning. La machine propose et prouve, l'humain tranche et signe.
- **`NOT_OBSERVABLE` jamais transformé en OK**, jamais rendu 0 ou vide.
- **Zones protégées** : `tests/` (gate explicite), `scripts/forge/oracles.json` et la liste
  `reference_protected.yaml` (garde de référence).
- **Réutiliser l'existant** : `declaration_readers` / `declaration_watchlist` posent déjà
  la question « déclaré ou lettre morte ». Ne pas créer de taxonomie concurrente.
- Pas de nouvel agent, pas de scheduler, pas de couche autonome.
