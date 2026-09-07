# Archive handoff — session 2026-08-05/06 : PAC-MAN V1 puis V2
*(Déplacé de `00_CURRENT_CONTEXT.md` le 2026-08-07 pour tenir la limite de 100 lignes. Contenu verbatim.)*

*(V1 archivé : `studio_brain/journal/2026-08-05_pacman_v1_run.md` — jeu Godot produit,
oracle vert, plateforme corrigée par Pierre en cours de run. V2 ci-dessous.)*

## V2 — le produit devient extensible

Run `pacman-v2-20260805`, profil `full_godot`, s2 sauté (faits de genre inchangés).
Incrément sur le jeu V1, **sans le casser** : les 1012 assertions V1 sont conservées.

**Preuve mécanique** (chaque chiffre re-executé par l'orchestrateur) :
```
godot_oracle       -> exit 0 | 2212 assertions | solvabilite 50/50 sur 2 CARTES (25/25)
gate mutation      -> 263 mutants, 5 survivants, TOUS tries EQUIVALENT justifies
check_mutation_gate-> passed (0 non trie, 0 perime)
check_wiremap V2   -> passed   ·   check_wiremap V1 -> passed (0 regression de carte)
gel V2             -> 85 regles intactes  ·  85/85 lignes IMPLEMENTED
verify_run         -> INTEGRITE : AUTHENTIQUE, exit 0
verdict : OK / MECHANICAL_VALIDATION_ONLY / NO_CLAIM_ALLOWED
          decision HUMANGATE_READY_WITH_OBJECTION · redteam_ran TRUE (qwen)
```

**Les 2 metriques d'architecture de Pierre — ATTEINTES** :
- ajouter une carte : **4 fichiers `05_SYSTEMS` -> 0** (prouve : 3e carte reellement ajoutee,
  17x24, 97 collectibles, solvable, puis retiree ; diff = 1 descripteur + 1 entree catalogue)
- changer l'identite : **0 fichier `05_SYSTEMS`** (non-regression tenue)
Aucun fichier de `05_SYSTEMS/` ne nomme une carte. L'etat de partie PORTE sa carte.

**Cout** : V2 = 1 639 920 tokens / 7 appels / 3,1 h — soit **63 % de V1** (2 598 728 / 13 / 3,5 h)
pour un perimetre plus large (menu, pause, input abstrait, audio genere, dash, 2 cartes).
RESERVE : V2 est un INCREMENT, pas un second jeu. « Jeu 2 moins cher que jeu 1 » reste OUVERT.

## Ce que la production a revele (mesure, non corrige)

1. **La boucle d'apprentissage a 3 plafonds empiles** : le canal est dilue (21/27 entrees avec
   `resolution` sont de la comptabilite d'escalade du driver) · cloisonne par projet ·
   **plafonne a 5** (`premortem` `limit=5`, `proj[-5:]`, par recence). Mesure : 7 lecons
   `pacman` ecrites, 5 remontees. Les 2 evincees sont celles qui se sont verifiees le plus
   souvent (dispatch/format commise 3x ; `===` GDScript re-confirmee en V2).
   **[Correctif post-mortem 2026-08-07 : les « 7 lecons pacman » n'ont AUCUN reçu dans
   `lessons.jsonl`/`failure_events.jsonl` ; le ratio 21/27 ne correspond à aucun fichier réel.
   Le mécanisme confirmé : 12/12 erreurs pacman résolues dans `error_journal/html.jsonl`.]**
2. **Le triage de mutants est ancre par `name@line`** : un refactor qui decale des lignes
   invalide silencieusement une justification correcte (mesure : 122->128, 129->135).
   Meme defaut que l'ambiguite par collision (`check_mutation_gate` refuse une cle partagee).
   Proposition du forgeron, NON implementee : `expression` = cle de verite, `line` = index.
3. **GDScript rend certaines gardes infalsifiables par mutation** (coercition tolerante :
   la valeur de refus coincide avec la degradation du chemin non garde). 3 instances mesurees.
4. **Le red-team independant n'a produit aucune valeur** : qwen2.5-14b (LM Studio UP grace au
   preflight) rend 5 findings, **0 falsifiable**, dont 1 contredit par le materiel fourni.
   V1, avec un fallback claude-blind NON independant, avait rendu 2 BLOQUANTS reels et verifies.

## Nouveaux artefacts

- `scripts/forge/check_prerun.py` — oracle amont du PRE_RUN_REPORT (8 champs), confronte les
  adresses proposees a `repo_map.yaml`. **Prouve sur le cas reel** : le pre-run `04_CONTENT`
  (qui a coute 232 019 tokens de reprise) sort FAIL et **nomme le gabarit correct** ;
  le pre-run corrige sort OK.
- `docs/forge/MCTS_RECALIBRATION_ENGINE_V1.md` — doctrine Pierre + confrontation mesuree.
- `lab/forge_runs/pacman/distillation/` — pilote de distillation s3 (3 configs Qwen).
