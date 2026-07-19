# Forge — Formats réellement utilisés (calibration auto_battler)

**Date** : 2026-07-19
**Source** : lecture directe des fichiers produits par le run `auto_battler_i1` (`lab/forge_runs/auto_battler_i1/`) + `games/auto_battler/mutation_triage.json`. Aucune invention — chaque exemple ci-dessous est extrait tel quel du run réel.
**Statut du document** : DOCUMENTED_ONLY (constat mécanique, pas une décision).

But : donner à un futur incrément (Combat inclus) les formats exacts à attendre des oracles Forge, plutôt qu'une description générique.

---

## 1. WireMap (`wiremap.json`)

- **Emplacement** : `lab/forge_runs/<run_id>/wiremap.json` (posée à s5, gelée dans `wiremap_frozen.json` du même dossier).
- **Statut** : réel, produit par le run `auto_battler_i1`, vérifié vert par `check_wiremap` (s10c) — cf. `verdict.json.oracles.wiremap.status = "OK"`.
- **Exemple réel** (1 entrée sur N, `wiremap.json`) :
```json
{
  "feature": "types_entity_id",
  "section": "games/auto_battler/engine/types.mjs",
  "fichiers": ["games/auto_battler/engine/types.mjs"],
  "fonction": "makeEntityId",
  "version": "0.1.0",
  "preuve": "R9 — makeEntityId retourne un EntityId opaque sans contenu de jeu (surface P11 content-agnostic)",
  "statut": "PLANNED"
}
```
- Champs : `feature` (id stable, sert de clé au gel), `section` (fichier/chapitre visé), `fichiers` (liste), `fonction` (point de preuve exécutable), `version`, `preuve` (texte libre, référence un test réel `R<n>`), `statut` (`PLANNED`/`DONE`/…).
- Le gel (`wiremap_frozen.json`) est une copie figée au moment s5 : toute feature ajoutée/retirée après coup = STOP dur ; une fonction renommée déclenche une auto-correction bornée. C'est le mécanisme qui interdirait une dérive de périmètre silencieuse sur Combat.

## 2. Mutation triage (`mutation_triage.json`)

- **Emplacement** : `<projet>/mutation_triage.json` à la racine du jeu (ex. `games/auto_battler/mutation_triage.json`), lu par `check_mutation_gate`.
- **Statut** : réel, 5 entrées actuellement pour engine-core (34/39 tués = 87 %, gate PASS avec objection).
- **Exemple réel** (1 entrée, `mutation_triage.json`) :
```json
{
  "name": "and->or",
  "line": 71,
  "file": "engine/state.mjs",
  "justification": "deepFreeze array-item guard `item !== null && typeof item === 'object'` ... Verified empirically: hand-mutating this line leaves the full suite ... green."
}
```
- Champs : `name` (opérateur de mutation appliqué), `line`/`file` (localisation du survivant), `justification` (preuve textuelle de pourquoi le survivant est équivalent, pas un vrai trou de test — doit être vérifiable, pas une affirmation).
- Règle du gate : 100 % tués OU chaque survivant a une entrée triage justifiée ⇒ jamais un `OK` propre, toujours `HUMANGATE_READY_WITH_OBJECTION` s'il y a triage. C'est la doctrine « survivant → jamais OK propre » (déjà en mémoire studio).

## 3. Blueprint oracle (`blueprint.oracle.json`)

- **Emplacement** : `lab/forge_runs/<run_id>/blueprint.oracle.json`, posé à s4, consommé par `check_architecture` (s10b).
- **Statut** : réel, run `auto_battler_i1` — `verdict.json.oracles.archi.status = "OK"`, `deps_interdites_violées: []`.
- **Exemple réel complet** (`blueprint.oracle.json`) :
```json
{
  "modules": ["engine", "renderer", "ui", "combat", "economy", "shop", "pool",
              "bench", "mana", "meta", "balance", "dsl", "pairing", "content", "units"],
  "deps_interdites": [
    ["engine", "renderer"], ["engine", "ui"], ["engine", "combat"],
    ["engine", "economy"], ["engine", "shop"], ["engine", "pool"],
    ["engine", "bench"], ["engine", "mana"], ["engine", "meta"],
    ["engine", "balance"], ["engine", "dsl"], ["engine", "pairing"],
    ["engine", "content"], ["engine", "units"]
  ]
}
```
- C'est la traduction mécanique de P11 (noyau content-agnostic) et de P10 (propriété étanche) : `engine` ne doit importer AUCUN des 14 autres modules listés. **Combat n'apparaît qu'en liste de modules interdits côté `engine`** — l'incrément Combat devra poser sa PROPRE ligne `deps_interdites` (ex. `["combat", "bench"]`, `["combat", "gold"]`, `["combat", "rng"]` — proposées dans `FORGE_PLAN_PROPOSAL.md §4.1`), pas réutiliser celle d'engine-core telle quelle.

## 4. Verdict signé (`verdict.json`)

- **Emplacement** : `lab/forge_runs/<run_id>/verdict.json`, produit par `verdict.py` (s12), re-vérifiable par `python -m forge.verify_run verdict.json`.
- **Statut** : réel, run `auto_battler_i1` — `decision: "HUMANGATE_READY_WITH_OBJECTION"`.
- **Structure réelle observée** (`verdict.json`, tronqué) :
```json
{
  "project": "auto_battler_i1",
  "run_id": "auto_battler_i1",
  "software_verdict": "OK",
  "evidence_verdict": "MECHANICAL_VALIDATION_ONLY",
  "claim_verdict": "NO_CLAIM_ALLOWED",
  "decision": "HUMANGATE_READY_WITH_OBJECTION",
  "oracles": {
    "code":    { "status": "OK", "evidence_sha256": "5cc6ba08...", "detail": {"tests": 31, "static_scan": "clean", "returncode": 0} },
    "archi":   { "status": "OK", "detail": {"passed": true, "deps_interdites_violées": []} },
    "wiremap": { "status": "OK", "detail": {"wire": {"passed": true, "features_manquantes": []}, "gel_passed": true} }
  },
  "redteam_reviewer": "qwen2.5-14b-instruct (plan) + claude-opus-4-8 (code)",
  "redteam_ran": true,
  "provenance_ok": true,
  "git_head": "2dac36f...",
  "nonce": "b90ddd38...",
  "redteam_advisory": ["F1 HIGH Purity leak: ...", "F2 MED serialize collapses Map/Set/Date ..."],
  "humangate_flags": ["mutation 34/39 tués (87%) -- gate PASS avec EXCEPTION ...", "..."]
}
```
- Trois verdicts SÉPARÉS (`software_verdict` / `evidence_verdict` / `claim_verdict`) + `decision` ∈ {`HUMANGATE_READY`, `HUMANGATE_READY_WITH_OBJECTION`, `BLOCKED`}. `redteam_advisory` et `humangate_flags` sont **advisory seulement** — ils n'entrent jamais dans `software_verdict`, qui vient uniquement des `oracles.*.status` re-vérifiés par signature+évidence.

---

## Sources (par format)

| Format | created | registered | loaded | enforced | evidenced |
|---|---|---|---|---|---|
| WireMap | `scripts/forge/dispatch.py` (étape s5) | `scripts/forge/static_oracles.py:check_wiremap` | s10c | OUI — `check_feature_set_frozen` (STOP dur) | `lab/forge_runs/auto_battler_i1/wiremap.json` + `wiremap_frozen.json` (réels) |
| Mutation triage | agent builder (s9) sur survivant | `scripts/forge/mutation.py:check_mutation_gate` | gate mutation | OUI — jamais OK propre si triage non vide | `games/auto_battler/mutation_triage.json` (réel, 5 entrées) |
| Blueprint oracle | s4 (architecte) | `scripts/forge/static_oracles.py:check_architecture` | s10b | OUI — `deps_interdites` = fail si violée | `lab/forge_runs/auto_battler_i1/blueprint.oracle.json` (réel) |
| Verdict signé | `scripts/forge/verdict.py` (s12) | `scripts/forge/dispatch.py` (audit HMAC) | `/gate` skill | OUI — HMAC re-vérifié par `forge.verify_run` | `lab/forge_runs/auto_battler_i1/verdict.json` (réel, decision HUMANGATE_READY_WITH_OBJECTION) |

```
software_verdict: OK (document produit, formats vérifiés contre le run réel auto_battler_i1)
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```
