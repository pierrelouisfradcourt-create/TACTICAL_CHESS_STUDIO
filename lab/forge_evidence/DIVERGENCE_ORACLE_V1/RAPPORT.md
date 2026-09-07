# P6 — Oracle de divergence produit (Forge V3, INV-4)

Date : 2026-08-07. Périmètre : `scripts/forge/product_oracle_godot.py` + tests + preuve.
`software_verdict: OK` · `evidence_verdict: MECHANICAL_VALIDATION_ONLY` · `claim_verdict: NO_CLAIM_ALLOWED`.

## Problème mesuré (rappel)

Sur le run Pac-Man, 15 défauts produit trouvés au playtest humain avec `godot_oracle` VERT
à chaque fois. Le plus net (lot V6) : le mode de jeu était un producteur sans consommateur
— `godot_oracle` vert à 2612 assertions, et une mesure différentielle écrite À LA MAIN une
seule fois (`v6_p1_mode_governs_lives.gd`) a trouvé 0 divergence sur 200 tics entre les
deux modes. Objectif de ce lot : rendre cet instrument RÉUTILISABLE.

## Ce qui a été construit

1. **`scripts/forge/godot_probes/divergence_probe.gd`** (nouveau) — sonde Godot
   générique. Ne connaît RIEN d'un jeu particulier : pilote un ADAPTATEUR (contrat fermé
   `etat_initial/en_cours/avancer/projeter`) passé en argument (`--adapter=`). Exécute
   DEUX campagnes par appel :
   - **CONTRÔLE** : `etat_initial(seed, valeur_a)` vs `etat_initial(seed, valeur_a)` —
     même valeur des deux côtés, doit trouver 0 divergence ;
   - **RÉEL** : `etat_initial(seed, valeur_a)` vs `etat_initial(seed, valeur_b)` — doit
     trouver ≥ 1 divergence.
   Sortie `FORGE_ORACLE divergence_<param> {json}` (protocole standard du studio),
   `ok` vrai seulement si contrôle propre ET réel divergent. `fails` nomme le paramètre
   et liste les clés d'état comparées — jamais un booléen nu.

2. **`scripts/forge/product_oracle_godot.py`** (étendu, aucune fonction existante
   modifiée) :
   - `discover_divergence_manifest(game_dir)` / `has_divergence_capacity(game_dir)` —
     nouvelle convention de découverte, LECTURE SEULE :
     `<game_dir>/07_TESTS/oracle/divergence_manifest.json` déclarant une liste `params`
     (id, adapter, values, seed, ticks, ignore_keys). Absence => `None`/`{}`, jamais une
     erreur (même discipline que `discover_oracle_files`).
   - `run_divergence_oracle(game_dir, *, binary_resolver=None, runner=None,
     timeout_s=60, probe_script=None)` — un process Godot par paramètre déclaré,
     mapping plat `{"divergence_<id>": {status, passed, fails, controle, reel, cout_ms,
     host_duration_ms, ...}}`, même contrat que `run_godot_product_oracle`.
     `binary_resolver`/`runner` injectables (aucun test n'exige un vrai binaire),
     `NOT_MEASURED` motivé sur binaire absent / déclaration incomplète / timeout /
     sortie illisible — jamais un vert ou un rouge fabriqué.

3. **Preuve** (`lab/forge_evidence/DIVERGENCE_ORACLE_V1/`) :
   - `adapters/pacman_mode_adapter.gd` — adaptateur EXTERNE (chemin disque, jamais sous
     `games/**`) pour le paramètre `mode` de Pac-Man, même graine/bot/carte que
     `v6_p1_mode_governs_lives.gd`.
   - `sandbox_v5_defect/` — copie COMPLÈTE de `games/pacman` (hors dépôt de production,
     hors `games/**`), avec **neutralisation documentée en tête de fichier** dans
     `05_SYSTEMS/settings/settings.gd` : `EFFETS_DE_REGLE` remis à `[[], []]` (valeur V5
     citée par le commentaire original du fichier) et `VIES_PAR_MODE` remis à
     `[P.VIES_MODE_DEFI, P.VIES_MODE_DEFI]` (les deux modes retombent sur la même
     valeur) — reconstitution EXACTE du mécanisme du défaut V5 décrit dans le code
     source lui-même. Aucune autre ligne modifiée.
   - `traces/run_defect.txt`, `traces/run_corrige.txt`, `traces/run_controle_isole.txt` —
     sorties brutes des 3 exécutions Godot réelles.
   - `resultats.json` — résultats structurés des 3 exécutions + mesure de coût.

## Preuve exigée : double rejeu

| Cas | game_dir | ok | contrôle divergents | réel divergents | clés réelles |
|---|---|---|---|---|---|
| **Défaut historique** (mode neutralisé, SANDBOX) | `sandbox_v5_defect/` | **false** | 0/200 | **0/200** | `[]` |
| **Jeu corrigé** (games/pacman réel, lecture seule) | `games/pacman/` | **true** | 0/200 | **200/200** | `["vies"]` |
| **Contrôle négatif isolé** (value_a=value_b=0, sur pacman réel) | `games/pacman/` | false | 0/200 | 0/200 | `[]` |

- **Cas défaillant DÉTECTÉ** : `PARAMETRE INERTE: 'mode' — 0 divergence sur 200 tics entre
  valeur_a=0 et valeur_b=1 ... Producteur sans consommateur.` — nomme le paramètre et
  liste les 21 clés d'état comparées.
- **Cas corrigé ACCEPTÉ** : `ok:true`, divergence sur `["vies"]` exclusivement,
  200/200 tics — identique à ce que `v6_p1_mode_governs_lives.gd` mesure à la main dans
  le jeu réel (`reel["cles"] == [Reglages.GRANDEUR_VIES]`, section 3 de ce fichier).
- **Contrôle négatif 0 divergence** : les deux exécutions "corrigées" ont un `controle`
  à `{"ticks_divergents": 0, "cles": []}` — la mesure elle-même n'est pas bruitée. La
  ligne 3 du tableau isole ce même contrôle en configuration `value_a == value_b` : 0
  divergence confirmée séparément.
- Aucune écriture sous `games/pacman/** ` (`git status --porcelain games/pacman`
  vide après l'ensemble de la mission).

## Tests

`scripts/forge/tests/test_product_oracle_godot_divergence.py` (nouveau, 17 tests) :
- 15 tests injectés (`binary_resolver`/`runner` fictifs, jamais de vrai binaire) —
  découverte du manifeste, robustesse `NOT_MEASURED` (binaire absent, adapter manquant,
  <2 valeurs, timeout, sortie illisible, exception du runner sans bloquer les autres
  paramètres), parsing vert/rouge/contrôle bruité.
- 2 tests RÉELS (`skipif` si binaire Godot ou fixtures absents — mêmes conventions que
  `test_asset_geometry.py::_godot_bin`) : rejouent automatiquement les cas 1 et 2 du
  tableau ci-dessus à chaque exécution de la suite.

```
.venv312/Scripts/python.exe -m pytest scripts/forge/tests/test_product_oracle_godot_divergence.py -v
=> 17 passed in 1.38s

.venv312/Scripts/python.exe -m pytest scripts/forge/tests/ -q -k "product_oracle_godot or driver_product_oracle_godot"
=> 40 passed, 1522 deselected in 3.31s
```

## Coût mesuré

Sonde Godot (2 campagnes × 200 tics, un process headless par paramètre) : **~500-515 ms**
sur ce poste (3 exécutions : 515, 507, 500 ms — `cout_ms` reporté par la sonde elle-même,
horloge interne Godot). Ce coût sera payé UNE FOIS PAR PARAMÈTRE DÉCLARÉ à chaque lot où
ce volet est câblé — pour un jeu à N paramètres, budget ≈ N × 0,5 s en plus du reste de
`godot_oracle`. `host_duration_ms` (lancement du process compris) est mesuré côté Python
et exposé dans chaque volet, pour un futur suivi de coût cumulé si ce volet est branché
en série dans le driver.

## Limite honnête

`games/pacman` n'a PAS de `07_TESTS/oracle/divergence_manifest.json` (produit gelé,
lecture seule — interdiction stricte de la mission). `has_divergence_capacity(games/pacman)`
renvoie donc `False` aujourd'hui : la capacité existe côté Forge, mais pacman n'a pas été
rétrofité. C'est la mesure honnête, pas un défaut caché — même doctrine que
`discover_oracle_files` pour les autres capacités Godot du studio. Le rejeu ci-dessus
(cas 2) prouve que le mécanisme accepterait `games/pacman` réel s'il portait ce manifeste,
sans qu'aucun fichier n'y ait été créé.

## Périmètre respecté

- Aucune écriture sous `games/pacman/**` (vérifié `git status --porcelain`).
- Aucun fichier touché parmi `scripts/forge/{driver,learning_memory,verdict,audit,dispatch,
  static_oracles,check_worldscan}.*` ni `scripts/observer/**`.
- Aucun test EXISTANT modifié (fichier de test entièrement nouveau).
- Aucun `git commit`/`git push`.

## FILES_CHANGED

- `scripts/forge/product_oracle_godot.py` (+~230 lignes, fin de fichier — ajout pur,
  fonctions existantes inchangées)
- `scripts/forge/godot_probes/divergence_probe.gd` (nouveau, 148 lignes)
- `scripts/forge/tests/test_product_oracle_godot_divergence.py` (nouveau, 17 tests)
- `lab/forge_evidence/DIVERGENCE_ORACLE_V1/` (nouveau : `RAPPORT.md`, `resultats.json`,
  `adapters/pacman_mode_adapter.gd`, `sandbox_v5_defect/` (copie + neutralisation
  documentée), `traces/*.txt`)

## NEXT (hors périmètre de ce lot, proposé — pas décidé)

- Câblage optionnel de `run_divergence_oracle` dans `standard_oracles.py` /
  `check_observable_coverage` (non fait ici : hors périmètre déclaré, et
  `standard_oracles.py` n'était pas dans le lot autorisé).
- Rétrofit de `games/pacman/07_TESTS/oracle/divergence_manifest.json` : décision
  HumanGate, `games/pacman` étant un produit gelé.
