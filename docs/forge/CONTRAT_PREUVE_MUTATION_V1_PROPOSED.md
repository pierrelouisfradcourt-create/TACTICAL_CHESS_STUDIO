# CONTRAT — descripteur de preuve de mutation, multi-runtime (V1)

**Statut : PROPOSED — spécification, AUCUNE ligne de code écrite.**
Rédigé le 2026-07-28 par la session Fable, sur commande de Pierre : « transforme la proposition
B+C en contrat précis : schéma du descripteur de preuve · qui le produit · qui le vérifie ·
impact Pong/Snake · migration des anciens jeux ».
Décisions Pierre déjà prises et intégrées ici :
- **orientation B+C validée** — « ne fais pas une extension `.gd` isolée ; on doit sortir des
  heuristiques de chemin et faire lire les capacités déclarées par le jeu » ;
- **scellement** — « on ne scelle pas uniquement le wrapper. On scelle la chaîne de preuve
  complète : runtime déclaré · commande réellement exécutée · wrapper · script de test appelé ·
  paramètres · résultat brut. La preuve doit permettre de répondre après coup à : *quel code
  exact a produit ce verdict ?* »
`claim_verdict: NO_CLAIM_ALLOWED`.

---

## 1. Ce que ce contrat remplace

| Aujourd'hui (mesuré) | Demain (contrat) |
|---|---|
| `mutation_proof.py:105` filtre le périmètre sur `.mjs` — heuristique de chemin, **interdite par le garde-fou 1 du contrat `n2` déjà ratifié**, et exclusion **silencieuse** des `.gd` (violation du garde-fou 2) | périmètre par **catégorie déclarée** ; toute exclusion est nommée dans le reçu |
| `mutation_proof.py:206` impose `cwd=game_dir` et **ignore** le `cwd` déclaré dans `oracles.json` | `cwd` **lu** dans le descripteur |
| `mutation_proof.py:259` ne scelle que les arguments qui existent sous le dossier du jeu ⇒ une commande wrapper est **non scellable** | scellement de la **chaîne complète** (§3) |
| `static_oracles.py:403` exige en dur `07_TESTS/oracle/solvability.mjs` (**volet gatant**) | chemin de solvabilité **lu** dans le descripteur |

**Principe unique du contrat** : *un instrument de preuve ne devine jamais la topologie d'un jeu ;
il lit ce que le jeu déclare.* Les jeux le déclarent déjà — `games/pong` porte
`runtimes: [rules, browser, godot]`, `games/snake` porte `runtimes: [rules, godot]`.

---

## 2. Schéma du descripteur

### 2.1 Où il vit

**Dans `<jeu>/00_CHARTER/game_contract.yaml`**, sous une clé `proof:`. Motifs :
- ce fichier porte **déjà** `runtimes:` — la donnée de topologie y est native ;
- il est **versionné avec le jeu**, donc un reçu ancien reste interprétable avec le descripteur
  de son époque ;
- `oracles.json` est un registre **central** (18 entrées, tous jeux confondus) : y mettre la
  topologie disperserait la vérité du jeu hors du jeu, ce que `repo_map.yaml` interdit déjà en
  esprit (« c'est ICI, et nulle part ailleurs, que la question *où va ce fichier* est tranchée »).

`oracles.json` **reste** le registre de la commande d'oracle (inchangé, rétro-compatible).

### 2.2 Forme

```yaml
# <jeu>/00_CHARTER/game_contract.yaml
proof:
  schema_version: 1
  runtime: godot                    # membre de `runtimes:` — le runtime QUI PROUVE
  mutation:
    categories_mutables:  [system, entity]        # catégories repo_map JUGÉES
    categories_exclues:   [system.adapter, test.unit, test.oracle,
                           asset.sprite, asset.audio, asset.font,
                           godot.project_root, godot.project_tests]
    command: ["node", "scripts/forge/godot_oracle.mjs", "games/snake"]
    cwd: "."                        # RELATIF À LA RACINE DU DÉPÔT, jamais absolu
    seals:                          # ce qui entre dans la chaîne scellée (§3)
      wrapper:      ["scripts/forge/godot_oracle.mjs",
                     "scripts/forge/solvability_godot.mjs",
                     "knowledge_base/systems/adapters/godot_trial.mjs"]
      test_scripts: ["tests/run_tests.gd"]        # relatif au jeu
    limit: null                     # plafond de mutants ; null = aucun (cf. §7.3)
  solvability:
    entry: "solvability.gd"         # remplace le `07_TESTS/oracle/solvability.mjs` en dur
    max_ticks: 5000
    trials: 50
    trial_timeout_ms: 60000
```

**Règles de forme, toutes mécaniquement vérifiables :**
1. `runtime` **doit** appartenir à `runtimes:` du même fichier — sinon `BLOCKED`.
2. `categories_mutables` et `categories_exclues` ne référencent que des catégories **présentes
   dans `repo_map.yaml`** — une catégorie inconnue est un `BLOCKED`, jamais un défaut silencieux.
3. Leur intersection **doit être vide** ; leur union **doit couvrir** toutes les catégories
   effectivement présentes dans la wiremap du jeu — une catégorie ni jugée ni exclue est un
   `BLOCKED` (c'est ce trou qui aurait laissé `godot.project_root` être muté).
4. Tous les chemins sont **relatifs** (dépôt pour `wrapper`/`command`/`cwd`, jeu pour
   `test_scripts`/`solvability.entry`) — aucun chemin absolu ni utilisateur.
5. `descripteur absent` ⇒ **régime historique** appliqué à l'identique (§6), jamais un blocage.

---

## 3. Le scellement : la chaîne complète

Décision Pierre : le reçu doit permettre de répondre à *« quel code exact a produit ce
verdict ? »*. Le champ actuel `code_sha256` agrège les fichiers de logique + de test **du jeu**.
Il devient un **maillon** d'une chaîne, et non plus la preuve entière.

```jsonc
// extension du detail du reçu signé "mutation" (mutation_proof.py:265-282)
"proof_chain": {
  "schema_version": 1,
  "runtime_declare": "godot",                     // ce que le jeu DIT être
  "command_executee": ["node", "scripts/forge/godot_oracle.mjs", "games/snake"],
  "cwd_execute": ".",                             // le cwd RÉELLEMENT utilisé
  "wrapper_sha256":      {"scripts/forge/godot_oracle.mjs": "…", "…": "…"},
  "test_scripts_sha256": {"tests/run_tests.gd": "…"},
  "parametres": {"max_ticks": 5000, "trials": 50, "limit": null, "seed_start": 1},
  "binaire": {"nom": "godot", "version": "4.6.3.stable.official.7d41c59c4"},
  "resultat_brut_sha256": "…",                    // empreinte du stdout/stderr scellé
  "resultat_brut_path": "lab/forge_evidence/mutation_<run_id>.raw.txt"
}
```

Points de conception, chacun motivé :
- **`command_executee` est la commande RÉELLE**, pas celle déclarée : si elles divergent, le
  reçu porte la divergence et `verify_run` la refuse. Un descripteur n'est pas une promesse tenue
  d'office (règle d'usine : *déclaré ≠ exécuté*).
- **`binaire.version` est mesurée à l'exécution** (`godot --version`), jamais recopiée. Sans elle,
  « quel code exact » reste incomplet : le même script sur deux moteurs peut diverger.
- **`resultat_brut`** est **scellé et conservé**, pas résumé. C'est ce qui rend le verdict
  ré-auditable après coup ; un compteur `killed/total` seul ne l'est pas.
- **`code_sha256` est conservé tel quel** (rétro-compatibilité des reçus existants) ; `proof_chain`
  s'ajoute à côté. Aucun reçu passé ne devient invalide.

---

## 4. Qui produit, qui vérifie

| Rôle | Acteur | Moment | Nature |
|---|---|---|---|
| **Produit le descripteur** | l'agent de l'étape wiremap (`wm1`/`s5`), à partir du charter et de la carte | conception, AVANT le build | déclaratif, revu par Pierre au gel |
| **Valide sa FORME** | un volet déterministe du standard (`check_proof_descriptor`), appelé par `s10s` | à chaque run | non-LLM ; les 5 règles du §2.2 |
| **Le CONSOMME** | `mutation_proof.py` (périmètre, `cwd`, argv, seals) et `static_oracles.check_solvability_wired` (entrée de solvabilité) | `s10a` | lecture seule |
| **Scelle la chaîne** | `emit_mutation_receipt` | `s10a`, à la production du reçu | signé HMAC |
| **Re-vérifie** | `forge.verify_run` (`_check_mutation_proof`) | après le run, hors chaîne | re-calcule les empreintes et compare |
| **Décide** | **Pierre** (HumanGate) | ratification | jamais la Forge |

**Le producteur n'est jamais le vérificateur** : l'agent qui écrit le descripteur ne peut pas
valider sa propre déclaration, et le module qui l'exécute ne peut pas décider s'il est légal.

---

## 5. Impact sur Pong et Snake, mesuré

**Pong** (mixte : 22 `.mjs` + 1 `.gd`, wiremap 15 lignes, `mutation_triage.json` présent)
- Son unique `.gd` (`06_RUNTIME/adapters/presentation/godot/main.gd`) est catégorisé
  `system.adapter` ⇒ **exclu** dans les deux régimes. **Aucun score de mutation ne change.**
- Sa **structure de reçu** change : `categories_exclues` passe de 7 à 8 entrées déclarées, et
  `proof_chain` apparaît. Un reçu archivé reste vérifiable (`code_sha256` inchangé), mais un
  re-run produira un `detail` différent — **à ne pas confondre avec une falsification** lors
  d'une comparaison manuelle.
- **Le témoin reste le juge** : si son score de mutation ou son verdict bouge d'un iota,
  le changement est rejeté.

**Snake** (100 % `.gd`, wiremap 44 lignes / 71 entrées de fichiers)
- Périmètre : **15 `system` jugés** · 18 `system.adapter` exclus **et déclarés** · 36 `test.*`
  exclus par catégorie · **2 entrées `godot.project_*` explicitement exclues** — c'est la règle 3
  du §2.2 qui l'impose, sans elle elles seraient muté**es** (on aurait muté la preuve).
- Les 4 verrous tombent ensemble : périmètre (catégorie), `cwd` (déclaré), argv (déclaré),
  scellement (chaîne complète).
- **Le premier run réel produira des survivants non triés** (`games/snake/mutation_triage.json`
  n'existe pas) ⇒ **gate rouge légitime**, et une charge de justification. C'est le résultat
  attendu, pas un échec.
- ⚠️ **Sa carte reste malformée** sur `observable_by_player`/`observable_proof` (44 lignes,
  rouge depuis la garde du 28-07). Ce contrat ne la corrige pas : décision Pierre — « la carte
  Snake reste en attente. On corrige d'abord l'instrumentation, puis on remet les données au
  format du contrat. »

---

## 6. Migration des anciens jeux — par non-régression, pas par réécriture

**Règle de migration : descripteur absent ⇒ régime historique appliqué à l'identique.**
Aucun jeu existant n'a besoin d'être modifié pour continuer à fonctionner.

État mesuré du parc :
- **2 jeux ont une wiremap** (pong, snake) — seuls concernés par la chaîne automatique ;
- **9 jeux ont un `mutation_triage.json`** (auto_battler, breakout, card_engine, chase_prototype,
  grid_nav_probe, kb_tactics, menagerie_tactics, pong, shmup_slice) — leurs reçus restent
  vérifiables ;
- **2 jeux ont un `game_contract.yaml`** (pong, snake) : le descripteur n'a donc que **2 porteurs
  possibles aujourd'hui**, ce qui borne le risque.

| Vague | Qui | Geste | Risque |
|---|---|---|---|
| 0 | tous les autres | **rien** — pas de descripteur, régime historique | nul |
| 1 | **snake** | descripteur écrit (le jeu est déjà 100 % Godot, il n'a aucun reçu à préserver) | faible : rien à casser |
| 2 | **pong** | descripteur écrit **en reproduisant exactement** le comportement actuel, puis re-run comparé au témoin | **le seul risque réel** — critère de rejet : tout écart de score |
| 3 | jeux legacy à wiremap future | descripteur exigé à la création | nul (nouveau) |

**Le régime historique n'est pas figé pour toujours** : il devient une branche `deprecated`
nommée dans le code, avec la liste des jeux qui en dépendent. Sans cette liste, la branche
survivrait par oubli — mode de panne déjà vu (le filtre `.mjs` lui-même est un héritage LEGACY
jamais rediscuté).

---

## 7. Points qui restent à trancher (aucun n'est un détail)

1. **`limit` de mutants** : muter 15 fichiers `.gd` implique **un lancement Godot headless par
   mutant** (l'oracle enchaîne en plus 50 essais de solvabilité). `mutation.py` expose `limit`,
   **jamais passé par le driver**. Sans plafond, la mesure peut coûter plus cher que le build.
   → faut-il un `limit` obligatoire pour un runtime lourd ?
2. **Granularité de la commande** : la commande d'oracle de Snake enchaîne *mécanique + solvabilité*.
   Pendant la mutation, seul le volet mécanique est utile — les 50 essais de solvabilité par
   mutant sont du gaspillage pur. → faut-il une **commande de mutation distincte** de la commande
   d'oracle ?
3. **`resultat_brut` volumineux** : sceller le stdout de N mutants peut peser lourd dans
   `lab/forge_evidence/`. → seuil de troncature (et alors le sceau porte sur le tronqué, ce qui
   doit être dit), ou conservation intégrale ?
4. **Qui écrit le descripteur de Pong** : c'est un jeu **gelé**. Y toucher demande ta gate
   explicite, même pour un ajout purement déclaratif.

---

## 8. Ce qui n'est PAS dans ce contrat

`product_oracle` (advisory, mis de côté sur ta décision) · la correction de la carte Snake
(en attente) · toute modification de `repo_map.yaml` (table figée, lue et jamais écrite) ·
le seuil du gate mutation (inchangé : « 100 % ou survivant justifié »).

---
software_verdict: OK (spécification ; aucun code) · evidence_verdict: MECHANICAL_VALIDATION_ONLY ·
claim_verdict: NO_CLAIM_ALLOWED
