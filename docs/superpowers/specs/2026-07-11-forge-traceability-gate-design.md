# Design — Gate traçabilité de la forge (axe 2/3 : plan↔code auto-corrigé, jeu de règles gelé)

- **Date** : 2026-07-11
- **Source** : session Claude Code, branche `feat/forge-oracle-gate`
- **Auteur** : Claude Code + Pierre (HumanGate sur les décisions de fond)
- **Statut** : design ratifié Pierre (go 2026-07-11), plan d'implémentation à écrire
- **Verdict discipline** : NO_CLAIM_ALLOWED — toute preuve = exécution mécanique
- **Amont** : suit l'axe 1 (gate e2e, mergé en attente) — voir `2026-07-11-forge-e2e-gate-design.md`

## Contexte et problème

À l'étape **s5**, la forge produit une **WireMap** isomorphe : une ligne par règle
observable du jeu (R1..R12 dérivées du `product_snapshot.md`), chacune déclarant la
`fonction` que le builder DOIT créer, dans quels `fichiers`, avec quelle `preuve`.
À l'étape **s10c**, l'oracle déterministe `check_wiremap` vérifie l'isomorphisme :
chaque `fonction` déclarée existe-t-elle réellement dans les fichiers déclarés ?

**Régression mesurée** (audit re-forge, `journal/2026-07-10_reforge_experiment.md`) :
sur `collect_runner`, les **12 fonctions ont viré « renommées »** — le builder a créé
des fonctions aux noms différents de la carte sans la mettre à jour → `check_wiremap`
rouge → **verdict BLOCKED**.

La détection *marche*. Deux faiblesses :
1. **Cul-de-sac** : une WireMap rouge finit en STOP/BLOCKED (skill.md : « oracle rouge →
   STOP ») au lieu d'alimenter la boucle **bloquer + auto-corriger** déjà ratifiée (axe 1).
   Seul l'oracle-code (s10a) est câblé à l'escalade ; s10c ne l'est pas.
2. **Auto-correction potentiellement malhonnête** : si on laisse le builder réconcilier
   librement en réécrivant la carte, il pourrait *supprimer* une règle (R7 « collecte
   pièce ») pour re-verdir la carte → traçabilité en toc.

**Objectif ratifié Pierre (2026-07-11)** :
- Sens de « renforcer » = **auto-corriger la dérive** (symétrique de l'axe 1).
- Invariant qui garde l'auto-correction honnête = **liste des règles GELÉE** : le builder
  peut re-pointer les fonctions (renommer dans un sens ou l'autre) mais **ne peut ni
  supprimer ni ajouter une règle**.

## Décisions de fond ratifiées

1. **Gel du jeu de règles** : l'ensemble des features (R1..R12) figé à s5 est un invariant ;
   l'auto-correction ne peut que re-pointer des fonctions, jamais changer l'ensemble.
2. **Renommage → auto-correction ; suppression/ajout de règle → HumanGate.**

## Composants

### C1 — Gel du jeu de règles (`static_oracles.py: check_feature_set_frozen`)

Check **non-LLM, déterministe** :

```
check_feature_set_frozen(wiremap: dict, frozen_features: list[str] | None) -> dict
  -> {"passed": bool, "checked": bool, "ajoutees": [...], "supprimees": [...]}
```

- Compare l'ensemble des `feature` de `wiremap["features"]` à `frozen_features`.
- PASS = ensembles identiques (indépendant de l'ordre). Écart → `ajoutees`/`supprimees`.
- `frozen_features is None` (référence absente) → `{"passed": False, "checked": False, ...}` :
  honnête, jamais un faux vert (même posture que `debordements_ownership.checked`).

### C2 — Référence gelée (snapshot s5)

À l'étape **s5**, après production de la WireMap, on fige la liste des noms de features
dans `lab/forge_runs/<projet>/wiremap_frozen.json` (format : `{"features": ["R1 …", …]}`).
C'est la source de vérité « quelles règles doivent exister », dérivée du `product_snapshot`.
Le builder (s9) met à jour les colonnes de la WireMap mais **ne touche jamais** ce snapshot.

Helpers (dans `static_oracles.py`, testables séparément du disque) :
- `frozen_features_from_wiremap(wiremap: dict) -> list[str]` — extrait la liste des `feature`.
- `load_frozen_features(run_dir: Path) -> list[str] | None` — lit `wiremap_frozen.json`,
  `None` si absent (encoding utf-8 explicite).

### C3 — Branchement dans l'auto-correction (skill `/forge` s10c)

Après l'oracle wiremap :

```
frozen = check_feature_set_frozen(wiremap, load_frozen_features(run_dir))
if not frozen["passed"]:
    # règle ajoutée/supprimée (ou snapshot absent) : NON auto-corrigeable
    -> STOP DUR, verdict BLOCKED + humangate_flags: ["jeu de règles modifié"]
elif not wire["passed"]:
    # fonctions renommées/manquantes, MAIS jeu de règles intact : auto-corrigeable
    oracle_ok = code.ok and e2e_guard["passed"] and wire["passed"]   # => False
    -> alimente la boucle d'escalade EXISTANTE (re-dispatch s9, rapport de
       réconciliation « carte↔code isomorphes, jeu de règles gelé »), cap MAX_ESCALATIONS
else:
    oracle_ok = code.ok and e2e_guard["passed"] and wire["passed"]   # continue
```

Aucune orchestration nouvelle : réutilise `escalation_decision` (haiku→sonnet→opus, cap)
déjà en place. Le seul ajout : la WireMap entre dans `oracle_ok`, et le gel est un
STOP séparé (une règle disparue exige un humain).

## Flux de données

1. s5 produit `wiremap.json` **et** fige `wiremap_frozen.json` (liste des features).
2. s9 (build) produit le code + met à jour les colonnes de `wiremap.json` (jamais le frozen).
3. s10c : `wire = check_wiremap(...)` (isomorphisme fonctions) + `frozen =
   check_feature_set_frozen(wiremap, load_frozen_features(run_dir))` (jeu de règles).
4. Décision C3 : gel violé → HumanGate ; renommage seul → auto-correction ; vert → continue.

## Gestion d'erreur

- **Snapshot gelé absent** : `checked=False` → traité comme non-prouvable → STOP HumanGate
  (jamais un vert). Un run legacy sans snapshot ne passe donc pas silencieusement.
- **Boucle** : bornée par `MAX_ESCALATIONS` (existant) ; au sommet toujours rouge → BLOCKED.
- **Réécriture de la liste par le builder** : attrapée par C1 (ajoutees/supprimees).

## Comment on prouve que ça marche (exécution, pas existence)

1. **Unitaire C1** :
   - même ensemble → `passed=True, checked=True` ;
   - une règle ajoutée → `passed=False`, `ajoutees=["R13 …"]` ;
   - une règle supprimée → `passed=False`, `supprimees=["R7 …"]` ;
   - `frozen_features=None` → `passed=False, checked=False`.
2. **Unitaire helpers** : `frozen_features_from_wiremap` extrait bien R1..R12 ;
   `load_frozen_features` lit le fichier / renvoie None si absent.
3. **Acceptation sur données réelles** : le `wiremap.json` réel de
   `lab/forge_runs/collect_runner` (12 règles) → `frozen_features_from_wiremap` = 12 noms ;
   `check_feature_set_frozen(wiremap, ces_12)` → PASS (jeu intact) — donc le renommage
   observé est **auto-corrigeable** (pas un stop dur) ; retirer une règle du snapshot → FAIL
   `supprimees`. Prouve la discrimination renommage↔suppression sur le cas réel.

## Hors périmètre (axes suivants)

- Traçabilité jusqu'à la **preuve-test** (chaque R-n → un test réel qui passe) — axe 2-bis.
- Gate de **mutation** + richesse de contenu (`level.mjs`) — axe 3.
- Jeu-preuve « vraiment fini » de bout en bout — phase 2.

## Fichiers touchés (prévision)

- `scripts/forge/static_oracles.py` — `check_feature_set_frozen`,
  `frozen_features_from_wiremap`, `load_frozen_features` (C1/C2 helpers).
- `scripts/forge/tests/test_feature_set_frozen.py` (nouveau, preuve 1/2).
- `scripts/forge/tests/test_feature_set_frozen_acceptance.py` (nouveau, preuve 3).
- `.claude/skills/forge/skill.md` — s5 : figer `wiremap_frozen.json` ; s10c : brancher
  C1 + WireMap dans `oracle_ok` (C3). **Zone protégée `tests/**` non touchée.**
