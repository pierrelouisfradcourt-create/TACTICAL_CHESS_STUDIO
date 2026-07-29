# COMPLÉMENT au contrat de preuve de mutation V1 — schéma, commande, budget, reçu, cas limites

**Statut : PROPOSED — spécification, AUCUNE ligne de code.** Rédigé le 2026-07-28 par la session
Fable sur commande de Pierre. Complète `CONTRAT_PREUVE_MUTATION_V1_PROPOSED.md`.
Décisions Pierre intégrées : scellement en chaîne validé (« on ne prouve pas un fichier, on prouve
une exécution reproductible ») · **distinction déclaration / réalité exécutée à maintenir**
(« le reçu doit refléter ce qui a tourné, pas seulement ce qui était prévu ») · séparation
définitive mutation ↔ oracle général. `claim_verdict: NO_CLAIM_ALLOWED`.

---

## 1. Règle de migration (3 cas, demandés par Pierre)

| Cas | Règle | Conséquence mécanique |
|---|---|---|
| **Nouveau jeu** (première wiremap) | descripteur `proof:` **OBLIGATOIRE** | absent ⇒ `BLOCKED` à `s10s`, jamais un repli silencieux |
| **Jeu legacy GELÉ** (plus produit, conservé comme référence ou témoin) | **ancien régime conservé**, à l'identique | branche `deprecated` nommée + **liste explicite des jeux qui en dépendent** |
| **Retour en production** d'un jeu legacy (nouveau run, nouvel incrément) | **migration obligatoire AVANT le run** | pas de descripteur ⇒ `BLOCKED` : on ne re-produit pas sous l'ancien régime |

Le critère est **l'activité, pas l'ancienneté** : un jeu qu'on ne touche plus garde son régime ;
dès qu'il rentre en production, il passe au contrat.

**La liste des dépendants n'est pas cosmétique** : sans elle, la branche `deprecated` survit par
oubli — c'est exactement l'histoire du filtre `.mjs`, héritage LEGACY jamais rediscuté pendant
des mois. La liste rend la dette **comptable**. État mesuré aujourd'hui : 9 jeux ont un
`mutation_triage.json`, **2 seulement ont une wiremap** (pong, snake), donc la dette réelle est
petite et bornée.

---

## 2. Séparation définitive mutation ↔ oracle général

**Le fait qui tranche, mesuré sur Snake ce jour :**

| Commande | Contenu | Coût unitaire | × 64 mutants |
|---|---|---|---|
| oracle général (`godot_oracle.mjs`) | mécanique **+ 50 essais de solvabilité** | ≈ 13,3 s | **≈ 14 min** |
| commande dédiée mutation (`run_tests.gd` seul) | mécanique seule | **0,27 s** | **≈ 17 s** |

**Facteur 50.** Et le gaspillage n'est pas seulement du temps : re-jouer 50 parties complètes par
mutant ne prouve rien de plus sur la logique mutée — la solvabilité teste *que le jeu est
gagnable*, pas *que les tests attrapent un bug*. Ce sont deux questions différentes.

**Règle** : la mutation exécute **la commande de mutation**, jamais la commande d'oracle.
Si `proof.mutation.command` est absent alors que le descripteur existe ⇒ `BLOCKED`
(pas de repli sur la commande d'oracle : c'est ce repli implicite qui a créé le problème).

---

## 3. Schéma `proof.mutation` exact

```yaml
proof:
  schema_version: 1
  runtime: godot                     # doit appartenir à `runtimes:` du même fichier
  mutation:
    # --- PÉRIMÈTRE (remplace toute heuristique d'extension) ---
    categories_mutables: [system, entity]
    categories_exclues:  [system.adapter, test.unit, test.oracle,
                          asset.sprite, asset.audio, asset.font,
                          godot.project_root, godot.project_tests]

    # --- COMMANDE DÉDIÉE (jamais la commande d'oracle) ---
    command: ["<bin:godot>", "--headless", "--path", ".", "--script", "res://tests/run_tests.gd"]
    cwd: "games/snake"               # relatif à la racine du dépôt
    binary_ref: godot                # résolu par godot_bin.mjs — JAMAIS un chemin machine
    expects_exit_zero: true          # convention de succès de CETTE commande

    # --- BUDGET (§4) ---
    budget:
      max_mutants: 200               # plafond dur ; dépassement => BLOCKED, jamais troncature muette
      timeout_per_mutant_s: 30       # mesuré 0,27 s => marge ×100
      total_timeout_s: 900           # garde-fou global
      cost_class: engine             # process | engine  (engine = lancement moteur par mutant)

    # --- SCELLEMENT (chaîne complète, §3 du contrat principal) ---
    seals:
      wrapper:      []                            # ici : aucun wrapper, commande directe
      test_scripts: ["tests/run_tests.gd"]        # relatif au jeu
```

**Règles de forme (mécaniquement vérifiables, s'ajoutent aux 5 du contrat principal) :**
6. `command` ne contient **aucun chemin machine** : le binaire est référencé par `binary_ref`,
   résolu à l'exécution par `godot_bin.mjs` (le chemin réel est hors dépôt, non versionné).
7. `cwd` doit exister et être **dans le dépôt**.
8. `categories_mutables ∩ categories_exclues = ∅`, et leur **union couvre toutes les catégories
   présentes dans la wiremap** — une catégorie ni jugée ni exclue ⇒ `BLOCKED`.
9. `budget.max_mutants` et `timeout_per_mutant_s` sont **obligatoires** quand
   `cost_class: engine`.
10. `seals.test_scripts` non vide : sceller **au moins** le script réellement exécuté, sinon la
    chaîne de preuve est rompue par construction.

---

## 4. Budget — chiffré sur mesures, pas sur estimations

Mesures Snake (2026-07-28) : **14 fichiers `system`**, **64 mutants générables**,
`run_tests.gd` = **0,27 s**.

| Grandeur | Valeur proposée | Justification mesurée |
|---|---|---|
| `max_mutants` | **200** | 3× le besoin réel (64) — plafond de sécurité, pas de contrainte |
| `timeout_per_mutant_s` | **30** | marge ×100 sur 0,27 s ; absorbe un mutant qui boucle |
| `total_timeout_s` | **900** (15 min) | 64 × 0,27 ≈ 17 s ⇒ marge ×50 ; borne un emballement |
| `cost_class` | **`engine`** | un lancement moteur par mutant ⇒ budget obligatoire (règle 9) |

**Dépassement ⇒ `BLOCKED`, jamais troncature silencieuse.** Un périmètre tronqué qui rendrait
« 100 % tués » sur la moitié des mutants serait un faux vert — la panne exacte que ce chantier
combat. Le reçu doit dire `mutants_generes` **et** `mutants_executes` : s'ils diffèrent, le gate
refuse.

**Deux faits de distribution à porter dans le reçu** (sinon un score global ment) :
- `state.gd` porte **40 des 64 mutants (62 %)** : le score global sera dominé par un seul fichier ;
- **5 fichiers génèrent 0 mutant** (`best_score`, `debug_state`, `events`, `restart`, `params`,
  `tick_rate`). Un fichier sans mutant n'est **pas** « 100 % couvert » : il est **non mesuré**.
  Confondre les deux, c'est le piège du dénominateur — un `killed/total` agrégé donnerait
  « 100 % » alors que 5 fichiers n'ont rien prouvé.

---

## 5. Format du reçu mutation

Extension du `detail` du reçu signé existant (les champs actuels sont **conservés** —
rétro-compatibilité des 9 reçus déjà produits).

```jsonc
"detail": {
  // ... champs actuels inchangés (total, killed, survived, code_sha256, triage_sha256,
  //     categories_exclues, compteurs_par_categorie, survivants_non_tries, ...)

  "proof_chain": {                       // §3 du contrat principal
    "schema_version": 1,
    "runtime_declare": "godot",
    "command_declaree": ["<bin:godot>", "--headless", "--path", ".", "--script", "res://tests/run_tests.gd"],
    "command_executee": ["C:/…/Godot_v4.6.3…console.exe", "--headless", "--path", "…", "--script", "res://tests/run_tests.gd"],
    "declaration_conforme": true,        // false => le gate REFUSE (déclaré ≠ exécuté)
    "cwd_execute": "games/snake",
    "binaire": {"ref": "godot", "version": "4.6.3.stable.official.7d41c59c4"},
    "wrapper_sha256": {},
    "test_scripts_sha256": {"tests/run_tests.gd": "…"},
    "parametres": {"max_mutants": 200, "timeout_per_mutant_s": 30, "total_timeout_s": 900},
    "resultat_brut_sha256": "…",
    "resultat_brut_path": "lab/forge_evidence/mutation_<run_id>.raw.txt"
  },

  "budget": {
    "mutants_generes": 64,
    "mutants_executes": 64,              // < generes => BLOCKED (troncature)
    "plafond_atteint": false,
    "duree_totale_s": 17.4,
    "timeouts": 0
  },

  "par_fichier": [                       // anti-piège du dénominateur (§4)
    {"path": "05_SYSTEMS/game_state/state.gd", "mutants": 40, "tues": 40, "survivants": 0},
    {"path": "05_SYSTEMS/params/params.gd",    "mutants": 0,  "tues": 0,  "survivants": 0,
     "statut": "NON_MESURE"}             // 0 mutant ≠ 100 % couvert
  ],
  "fichiers_sans_mutant": ["05_SYSTEMS/params/params.gd", "…"]
}
```

**`declaration_conforme` est le champ qui porte la décision de Pierre** : le reçu compare la
commande **déclarée** à la commande **réellement exécutée** (binaire résolu, arguments finaux).
Divergence ⇒ le gate refuse. Un descripteur est une intention ; seul l'exécuté fait preuve.

**Ce que le reçu permet de répondre après coup** — le test de la décision Pierre, *« quel code
exact a produit ce verdict ? »* : le runtime, la commande réelle, la version du moteur,
l'empreinte de chaque script exécuté, les paramètres, et le résultat brut conservé.

---

## 6. Mutation impossible ou non applicable — quatre cas, quatre verdicts distincts

Le principe : **impossible ≠ non applicable ≠ vide ≠ échec**. Les confondre fabrique soit un faux
vert, soit un faux rouge. C'est précisément ce qui a coûté trois runs BLOCKED sur Snake.

| Cas | Détection | Verdict | Motif |
|---|---|---|---|
| **NON_APPLICABLE** — aucune catégorie mutable dans la wiremap (jeu 100 % adaptateurs, ou outil) | `categories_mutables` déclarées mais aucune ligne ne les porte | **SKIPPED motivé**, `passed: true` | rien à juger n'est pas un défaut — mais ce doit être **déclaré**, jamais deviné |
| **VIDE MESURÉ** — fichiers présents, **0 mutant généré** (aucun opérateur mutable) | `mutants_generes == 0` sur un périmètre non vide | **NOT_MEASURED**, `passed: false` | « 0 mutant » n'est pas « 100 % tués » : le gate ne peut rien conclure. Mesuré : 5 fichiers de Snake sont dans ce cas |
| **IMPOSSIBLE** — descripteur absent/invalide, commande introuvable, baseline rouge, budget dépassé, scellement impossible | échec avant ou pendant l'exécution | **BLOCKED** + cause nommée | hypothèse inconnue = BLOCKED (jamais un vert par défaut) |
| **ÉCHEC RÉEL** — mutants exécutés, survivants non triés | `survivants_non_tries` non vide | **FAIL** | le gate historique, inchangé : « 100 % ou survivant justifié » |

**Aucun de ces quatre cas ne produit un vert silencieux.** Trois d'entre eux échouent bruyamment,
le quatrième (`NON_APPLICABLE`) est un vert **déclaré et motivé**, sur le patron déjà en place
pour l'e2e en profil standard.

---

## 7. Ce qui reste à ta décision

1. **Valeurs de budget** : 200 / 30 s / 900 s sont dérivées des mesures (64 mutants, 0,27 s).
   Marges volontairement larges — à resserrer ou non.
2. **`NON_APPLICABLE` vaut-il `passed: true` ?** Je le propose (rien à juger n'est pas un défaut),
   mais c'est un choix de doctrine : l'alternative est `NOT_MEASURED` systématique, plus sévère.
3. **`resultat_brut` volumineux** : conservation intégrale ou seuil de troncature (auquel cas le
   sceau porte sur le tronqué, et doit le dire) ?
4. **Descripteur de Pong** : jeu gelé — même un ajout purement déclaratif demande ta gate.

---

## 8. Hors périmètre

`product_oracle` (advisory, mis de côté) · la carte Snake (rouge, en attente — « on corrige
d'abord l'instrumentation, puis on remet les données au format du contrat ») ·
`repo_map.yaml` (table figée, lue jamais écrite) · le seuil du gate mutation (inchangé).

---
software_verdict: OK (spécification ; aucun code) · evidence_verdict: MECHANICAL_VALIDATION_ONLY ·
claim_verdict: NO_CLAIM_ALLOWED
