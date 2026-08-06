# Contexte courant TCS
*(Handoff. Historique : `studio_brain/journal/context-archive-2026-08-04-forge-v2-sessions.md`
→ `2026-07-31_00_CURRENT_CONTEXT_archive.md` → `2026-07-30_...`.)*

## Dernière session — 2026-08-05/06 : PAC-MAN V1 puis V2
*(V1 archivé : `studio_brain/journal/2026-08-05_pacman_v1_run.md` — jeu Godot produit,
oracle vert, plateforme corrigée par Pierre en cours de run. V2 ci-dessous.)*

### V2 — le produit devient extensible

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

### Ce que la production a revele (mesure, non corrige)
1. **La boucle d'apprentissage a 3 plafonds empiles** : le canal est dilue (21/27 entrees avec
   `resolution` sont de la comptabilite d'escalade du driver) · cloisonne par projet ·
   **plafonne a 5** (`premortem` `limit=5`, `proj[-5:]`, par recence). Mesure : 7 lecons
   `pacman` ecrites, 5 remontees. Les 2 evincees sont celles qui se sont verifiees le plus
   souvent (dispatch/format commise 3x ; `===` GDScript re-confirmee en V2).
2. **Le triage de mutants est ancre par `name@line`** : un refactor qui decale des lignes
   invalide silencieusement une justification correcte (mesure : 122->128, 129->135).
   Meme defaut que l'ambiguite par collision (`check_mutation_gate` refuse une cle partagee).
   Proposition du forgeron, NON implementee : `expression` = cle de verite, `line` = index.
3. **GDScript rend certaines gardes infalsifiables par mutation** (coercition tolerante :
   la valeur de refus coincide avec la degradation du chemin non garde). 3 instances mesurees.
4. **Le red-team independant n'a produit aucune valeur** : qwen2.5-14b (LM Studio UP grace au
   preflight) rend 5 findings, **0 falsifiable**, dont 1 contredit par le materiel fourni.
   V1, avec un fallback claude-blind NON independant, avait rendu 2 BLOQUANTS reels et verifies.

### Nouveaux artefacts
- `scripts/forge/check_prerun.py` — oracle amont du PRE_RUN_REPORT (8 champs), confronte les
  adresses proposees a `repo_map.yaml`. **Prouve sur le cas reel** : le pre-run `04_CONTENT`
  (qui a coute 232 019 tokens de reprise) sort FAIL et **nomme le gabarit correct** ;
  le pre-run corrige sort OK.
- `docs/forge/MCTS_RECALIBRATION_ENGINE_V1.md` — doctrine Pierre + confrontation mesuree.
- `lab/forge_runs/pacman/distillation/` — pilote de distillation s3 (3 configs Qwen).

### En attente de HumanGate
- **Distillation bloquee** : `check_decompo` n'est pas DISCRIMINANT. Les 3 configs Qwen passent
  exit 0 a ~60x moins cher et **aucune n'est equivalente** (1 seul `kind` de preuve sur 22
  capacites contre 5 sur 55 chez Opus). Un critere `Score_Qwen >= Score_Opus x seuil` sur les
  oracles actuels declencherait un remplacement injustifie. Test de discriminance a lancer.
- Ancrage du triage (`expression` comme cle) — touche `static_oracles.py`.
- Nouvelle echelle d'escalade par CAPACITE (+skill/+memoire/+critique) — touche `escalate.py`
  et `roles.yaml`, qui declare que « Qwen ne s'escalade pas ».
- `scripts/forge/oracles.json` : entree `pacman` hors perimetre declare au charter.
- 6 exigences a juge humain (R41, R42, R60-R63) : `PROOF_KINDS` n'a pas de valeur `human`.
- Playtest humain : jamais fait. Preuve pixel : NOT_MEASURED (headless rend une texture nulle).
- Merge/reject de `games/pacman/` : **rien n'est commite**, tout est propose-only.

## Impasses connues (ne pas re-buter dessus)
Godot `--headless` rend une texture NULLE (fenêtre GPU obligatoire) · qwen3.6 INTERDIT pour le JSON ·
LM Studio :1234 était DOWN en **V1** (red-team en fallback `claude-blind`, `redteam_ran: false`) mais
**UP en V2** grâce au préflight (`redteam_ran: true`, qwen réellement indépendant) — le préflight
d'environnement AVANT le run est la différence, pas la chance · `run_real` sans coupe-circuit budget
intra-run · aucun mécanisme d'exclusion de lecture pour un builder.

## Deux chaînes distinctes — correction de modèle Pierre, 2026-08-06
`docs/forge/WHY_LINEAGE_PROPOSAL_V1.md`. **Intent Lineage** (cohérence PROJET, « pourquoi ce projet
existe », non vérifiable par hash, garde contre la dérive d'identité) et **Activation Lineage**
(cohérence TÂCHE, « pourquoi cette tâche démarre maintenant », problème→oracle→cause→action→preuve).
Ne jamais confondre WHY = sens et CONTRAINTE = réalité vérifiable : `repo_map` n'est pas une
intention, c'est une représentation du monde. **Mesuré** : Intent Lineage exigé par `s0-contrat.yaml`
SEUL (1 contrat sur 13, aucune propagation aval) ; Activation Lineage = champ `reason`, 9 dispatches,
9 vides. Les deux naissent une fois et meurent sur place. Le cas `04_CONTENT` n'était PAS une perte
d'intention (le charter la portait, mais « couche » y désignait un étage de la Forge, et le charter
déléguait la structure à s4) — c'était une **perte de réalité nécessaire à la décision** :
`repo_map.yaml` n'est pas dans le `mandatory_read` de s4-archi ni de s5-wiremap, alors qu'il l'est
dans celui de s9-build-godot-standard. L'étape qui DÉCIDE les adresses ne reçoit pas la table ;
celle qui APPLIQUE la reçoit.
