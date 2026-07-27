# Plan de commits par lots — 2026-07-27

Mission P3 (`scripts/forge/contracts/p3-plan-commits-par-lots.yaml`). Posture : archiviste,
lecture seule sur git. **Aucun `git add`, `git commit`, `git push` n'a ete execute par cette
mission.** Ce document est une PROPOSITION de classement ; les commits restent a executer par
Pierre, lot par lot.

## 0. Exhaustivite verifiee

**ATTENTION — derive constatee EN COURS DE MISSION, toujours active a la cloture.** Au lancement
de cette analyse (T0), `git status --porcelain | wc -l` rendait **76**. A la premiere redaction
de ce document (T1, ~1h plus tard) : **82**. A la relecture finale avant remise (T2, quelques
minutes apres T1) : **83** — un 7e fichier neuf (`docs/forge/GARDE_GIT_MECANIQUE_PROPOSITION.md`,
mtime 15:30:11) est apparu **pendant que ce document etait en train d'etre corrige**. Aucun de
ces ajouts n'est une action de cette mission (aucun `git add`/`git commit` execute ici). Les 6
livrables neufs (mtimes 15:26->15:30) appartiennent aux missions **soeurs P1 (lignes wiremap et
genre bible) et P2 (garde git mecanique)** — visiblement dispatchees dans le meme lot que cette
mission P3, et **encore en vol / non contre-verifiees** (absentes de `RUN_INDEX.md` a la lecture
obligatoire de ce document). Le 7e delta est ce document lui-meme.

```
T0 : git status --porcelain | wc -l   ->  76   (perimetre analyse aux §1-8 ci-dessous, fige)
T1 : git status --porcelain | wc -l   ->  82   (76 + 5 livrables P1/P2 + 1 ce document)
T2 : git status --porcelain | wc -l   ->  83   (82 + 1 livrable P2 supplementaire)
```

**Je fige l'analyse ci-dessous a l'etat T0 (76 fichiers, celui reellement audite fichier par
fichier)** et je documente le delta T0->T2 (7 fichiers, §7) sans le classer en lot — le
re-interroger a chaque nouvelle apparition serait une regression infinie tant que P1/P2 tournent.
**Avant d'executer le moindre commit de ce plan, Pierre doit relancer lui-meme
`git status --porcelain` pour capturer l'etat exact au moment de l'execution** — celui-ci aura
probablement encore bouge.

Repartition (sur le perimetre T0 = 76, celui reellement audite fichier par fichier) :

| Section | Fichiers |
|---|---:|
| LOT 1 — Instruments Forge | 21 |
| LOT 2 — Contrats d'agent | 17 |
| LOT 3 — Pong (fixes + preuves + journal) | 9 |
| LOT 4 — Docs / doctrine / handoff | 20 |
| N'APPARTIENT PAS A NOUS | 8 |
| A TRANCHER PAR PIERRE | 1 |
| **Sous-total T0** | **76** |
| P1/P2 en vol (apparus T0->T2, non classes) | 6 |
| Ce document | 1 |
| **Total T2 (etat reel au depot a la remise du rapport)** | **83** |

`21 + 17 + 9 + 20 + 8 + 1 = 76` = compte de `git status --porcelain` a T0. **Egalite verifiee
sur le perimetre audite.** `76 + 6 + 1 = 83` = compte a T2, **egalite verifiee sur l'etat final
reel**, cf. §11.

Chaque repertoire non suivi (`??` porte sur un dossier entier : `fixtures/godot_b0/`,
`lab/forge_runs/pong/`, `lab/forge_scenes/`, `missions/`, `scripts/forge/adapters/`) compte pour
**1** entree, exactement comme le rend `git status --porcelain` — je n'ai pas eclate leur contenu
interne en fichiers individuels, pour rester sur le meme referentiel de comptage que la commande
citee au (2) du garde-fou.

## 1. Ordre des lots et pourquoi

**LOT 1 avant LOT 2 — dependance reelle, pas une preference.** Les 16 contrats du LOT 2
declarent tous `capability_role: forge_toolsmith` (verifie par grep). Ce role n'existe dans
`scripts/forge/contracts/roles.yaml` que depuis la modification de **cette session**, incluse
dans LOT 1. Si LOT 2 est commite seul avant LOT 1, tout outil qui resout `capability_role` (porte
`prepare_dispatch`, registry) rencontre une reference non definie sur 16 fichiers d'un coup.
**LOT 1 doit donc etre commite avant ou avec LOT 2, jamais apres.**

LOT 3 (Pong) et LOT 4 (docs) n'ont pas de dependance mecanique dans un sens ou l'autre — mais
LOT 4 contient `lab/forge_runs/RUN_INDEX.md`, qui **narre** les missions M1/s10s/V1/V4/N1-N3 et
le run `pong_r2` : le lire a du sens une fois LOT 1/2/3 en place. Ordre recommande : **1 -> 2 ->
3 -> 4**.

**LOT 1 seul passe les tests** (c'est l'affirmation portee par RUN_INDEX.md a chaque etape :
895/917 passed relances par la supervision apres chaque livraison ; je n'ai pas rejoue `pytest`
moi-meme dans cette mission — voir `skipped_validation`). **LOT 2 seul (yaml pur) ne fait
planter aucun test** mais casserait la resolution de role au premier dispatch reel s'il est
commite avant LOT 1 (cf. ci-dessus) — c'est le seul lot dont l'isolement est fragile.

## 2. LOT 1 — Instruments Forge (code + tests + role + doc couplee)

**Ordre : 1/4.** Auto-suffisant pour `pytest scripts/forge/tests/`.

**Message propose :**
```
feat(forge-outillage): instruments M1+s10s+V1+V4+N1+N2+N3 (telemetrie echec, garde
attempts s10s, separation integrite/verdict, propose_brick branche, findings redteam
audibles, perimetre mutation par categorie, oracle produit minimal) + role
forge_toolsmith (roles.yaml) + doc skill verify_run a jour

NO_CLAIM_ALLOWED - software_verdict des missions individuelles dans RUN_INDEX.md
```

Fichiers (21) :
- `.claude/skills/forge/skill.md` (M) — doc des 2 lignes de sortie verify_run (V1), couplee au diff verify_run.py
- `scripts/forge/contracts/roles.yaml` (M) — role `forge_toolsmith` (ratification au commit, cf. RUN_INDEX)
- `scripts/forge/contracts/s11-redteam-code.yaml` (M) — format findings JSON fence (N1)
- `scripts/forge/driver.py` (M)
- `scripts/forge/mutation_proof.py` (M)
- `scripts/forge/run_real.py` (M)
- `scripts/forge/studio_link.py` (M)
- `scripts/forge/verify_run.py` (M)
- `scripts/forge/product_oracle.py` (??, nouveau — N3)
- `scripts/forge/tests/test_aggregate_verdict.py` (M)
- `scripts/forge/tests/test_run_real_hardening.py` (M)
- `scripts/forge/tests/test_studio_link.py` (M)
- `scripts/forge/tests/test_driver_brick_proposal.py` (??)
- `scripts/forge/tests/test_driver_mutation_scope.py` (??)
- `scripts/forge/tests/test_driver_product_oracle.py` (??)
- `scripts/forge/tests/test_driver_telemetry_outcome.py` (??)
- `scripts/forge/tests/test_mutation_scope_categories.py` (??)
- `scripts/forge/tests/test_product_oracle.py` (??)
- `scripts/forge/tests/test_run_real_redteam_findings.py` (??)
- `scripts/forge/tests/test_s10s_attempts_invariant.py` (??)
- `scripts/forge/tests/test_verify_run_integrity_separation.py` (??)

**Note d'engrenage** : `driver.py`, `verify_run.py` et `studio_link.py` portent chacun les
mutations cumulees de PLUSIEURS missions (M1 + s10s + V1 + V4 + N1 + N2 + N3 pour driver.py par
exemple — confirme par RUN_INDEX.md, ex. « M1 x2 - s10s x1 - V1 x3 - V4 x10 »). Il n'existe pas
de commit separe possible PAR MISSION sans `git add -p` interactif (staging partiel), que cette
mission n'a pas le droit d'executer (lecture seule). Le grain de ce lot est donc **par fichier**,
pas par mission — signale explicitement, pas contourne.

## 3. LOT 2 — Contrats d'agent Forge (portes de dispatch)

**Ordre : 2/4.** Depend de LOT 1 (role `forge_toolsmith`, cf. §1). Yaml pur, aucun test propre.

**Message propose :**
```
feat(forge-contrats): 16 contrats d'agent sous porte prepare_dispatch (A1/B1/C1/D1
audits allegement, M1 telemetrie, N1/N2/N3 findings-mutation-oracle, P1/P2/P3
plan-garde-commits, S10S branchement driver, V1/V2/V3/V4 verify_run-analyses-propose_brick)
+ brouillon mission S10S

NO_CLAIM_ALLOWED - contrats = portes, pas des verdicts
```

Fichiers (17) :
- `scripts/forge/contracts/a1-audit-chaine-classification.yaml`
- `scripts/forge/contracts/b1-audit-valeur-tests.yaml`
- `scripts/forge/contracts/c1-audit-oracle-produit-colis.yaml`
- `scripts/forge/contracts/d1-audit-boucle-retroaction.yaml`
- `scripts/forge/contracts/m1-telemetrie-echec.yaml`
- `scripts/forge/contracts/n1-findings-redteam-audibles.yaml`
- `scripts/forge/contracts/n2-perimetre-mutation-categorie.yaml`
- `scripts/forge/contracts/n3-oracle-produit-minimal.yaml`
- `scripts/forge/contracts/p1-lignes-wiremap-et-genre-bible.yaml`
- `scripts/forge/contracts/p2-garde-git-mecanique.yaml`
- `scripts/forge/contracts/p3-plan-commits-par-lots.yaml` (ce contrat-ci)
- `scripts/forge/contracts/s10s-branchement-driver.yaml`
- `scripts/forge/contracts/v1-verify-run-separation.yaml`
- `scripts/forge/contracts/v2-analyse-depot-game-loop.yaml`
- `scripts/forge/contracts/v3-analyse-perimetre-logic-files.yaml`
- `scripts/forge/contracts/v4-brancher-propose-brick.yaml`
- `docs/forge/MISSION_S10S_DRIVER_DRAFT.md` (brouillon de mission, compagnon direct du contrat S10S)

## 4. LOT 3 — Pong (fixes navigateur + preuves de run + journal joueur)

**Ordre : 3/4.** Pas de dependance mecanique sur LOT 1/2, mais raconte le meme fil (pong_r2,
playtest) que LOT 4 — commiter apres 1/2 pour que l'historique reste lisible dans cet ordre.

**Message propose :**
```
fix(pong): boot navigateur casse (audio.mjs imports node:* statiques, exit.mjs process
non garde) + archive pong_r2 (run standard s9 OK / s10a-s10s FAIL mutation-budget / s11-s12
OK, verdict signe re-verifie) + journal playtest joueur (4 constats : quitter inerte,
vitesse injouable, pas d'adversaire auto, score illisible) + config lancement test local

NO_CLAIM_ALLOWED - verdict signe du run cite en reference, non revendique ici
```

Fichiers (9) :
- `games/pong/06_RUNTIME/adapters/presentation/audio.mjs` (M) — fix boot navigateur
- `games/pong/06_RUNTIME/adapters/presentation/exit.mjs` (M) — fix boot navigateur
- `lab/reports/error_journal/html.jsonl` (M, **GENERE** — 4 lignes pong_r2 ajoutees par le run, ne pas editer a la main)
- `lab/reports/error_journal/INDEX.generated.md` (M, **GENERE** — recompte automatique, ne pas editer a la main)
- `lab/forge_runs/pong/salvage_s9-build-standard.json` -> `lab/forge_runs/pong-01_halted/salvage_s9-build-standard.json` (R, deja indexe/`git mv`, aucune action git requise)
- `lab/forge_runs/pong/state.json` -> `lab/forge_runs/pong-01_halted/state.json` (R, idem)
- `lab/forge_runs/pong/` (??, dossier neuf — artifacts/evidence/verdict/state/rapport du run `pong_r2`)
- `lab/reports/error_journal/playtest.jsonl` (??, nouveau — journal playtest Item 0 Niveau 1)
- `.claude/launch.json` (??, nouveau — config de lancement locale, creee pour tester Pong au navigateur)

## 5. LOT 4 — Docs d'audit, doctrine et handoff

**Ordre : 4/4.** Aucune dependance mecanique ; narre/synthetise le travail des 3 lots precedents.

**Message propose :**
```
docs(forge): audits allegement A1-D1 (chaine, tests, oracle produit, boucle retroaction)
+ doctrine usine apprenante (comparatif schema/reel, roadmap, ultraplan, propositions
profil design/boucle preuve/lignes jouabilite) + handoff memoire (contexte courant,
decisions differees, ratifications, RUN_INDEX)

NO_CLAIM_ALLOWED - documents PROPOSED sauf mention explicite de ratification Pierre
```

Fichiers (20) :
- `lab/forge_runs/RUN_INDEX.md` (M)
- `studio_brain/00_CURRENT_CONTEXT.md` (M)
- `studio_brain/decisions/DEFERRED.md` (M)
- `studio_brain/decisions/PROPOSED_2026-07-26_ratifications.md` (M)
- `studio_brain/decisions/decision-log.md` (M)
- `docs/audit/ANALYSE_DEPOT_GAME_LOOP_2026-07-26.md` (??)
- `docs/audit/ANALYSE_PERIMETRE_LOGIC_FILES_2026-07-26.md` (??)
- `docs/audit/AUDIT_ALLEGEMENT_A1_CHAINE_2026-07-27.md` (??)
- `docs/audit/AUDIT_ALLEGEMENT_B1_TESTS_2026-07-27.md` (??)
- `docs/audit/AUDIT_ALLEGEMENT_C1_ORACLE_PRODUIT_2026-07-27.md` (??)
- `docs/audit/AUDIT_ALLEGEMENT_D1_BOUCLE_RETROACTION_2026-07-27.md` (??)
- `docs/audit/RAPPORT_DECISION_ALLEGEMENT_2026-07-27.md` (??)
- `docs/forge/COMPARATIF_SCHEMA_VS_REEL_2026-07-27.md` (??)
- `docs/forge/PLAN_RUN_PROPRE_V1.md` (??)
- `docs/forge/PROPOSAL_BOUCLE_PREUVE_V1.md` (??)
- `docs/forge/PROPOSAL_PROFIL_DESIGN_V1.md` (??)
- `docs/forge/PROPOSITION_LIGNES_JOUABILITE_PONG.md` (??)
- `docs/forge/ROADMAP_USINE_APPRENANTE_V1.md` (??)
- `docs/forge/SPEC_CHANTIER_USINE_APPRENANTE_V1.md` (??)
- `docs/forge/ULTRAPLAN_METHODE_FABRICATION_V1.md` (??)

## 6. N'appartient pas a nous (8 fichiers)

### 6a. Session parallele Godot (creee 2026-07-27 ~02:05->03:25, en cours)

Verifie par `stat` des mtimes reels — tous dans la fenetre 02:05->03:25, un peu plus large que
les « 02:08->02:24 » cites dans le contrat mais dans la meme session continue (le contrat nomme
ces chemins explicitement comme a exclure) :

- `scripts/forge/adapters/godot/` (??, 19 fichiers .mjs, mtimes 02:15->03:25)
- `fixtures/godot_b0/` (??, 10 fichiers .gd/.tscn/.json, mtimes 02:05->03:16)
- `lab/forge_scenes/` (??, dossier `bouncing_ball/attempt_001/`, mtimes 02:30->03:11 — meme mission de test que les 2 lignes ci-dessus)
- `missions/` (??, `bouncing_ball/mission.yaml`, mtime 03:05:50 — meme session)
- `docs/superpowers/plans/2026-07-26-godot-adapter-b0.md` (??, nomme explicitement par le contrat)
- `docs/superpowers/specs/2026-07-26-godot-adapter-design.md` (??, nomme explicitement par le
  contrat ; **remarque signalee, pas corrigee** : son mtime disque est 2026-07-26 20:43, avant
  la fenetre 02:xx-03:xx de la nuit suivante — la spec a pu etre ecrite en amont de
  l'implementation. Le contrat l'exclut nommement quel que soit l'ordre chronologique reel ; je
  n'ai pas de moyen independant de trancher, donc je suis l'instruction telle que donnee.)

### 6b. Origine anterieure a cette session (non attribuable, instruction explicite du contrat)

- `games/pong/09_WIREMAP/wiremap.json` (M) — le contrat dit explicitement : « etaient DEJA
  modifies a l'ouverture de la session (origine anterieure, ne pas s'attribuer) ». Note pour
  Pierre : le CONTENU du diff cite litteralement « pong_r2 » (« NON re-executable dans la
  session pong_r2 »), ce qui suggererait un lien avec le run documente dans LOT 3 — mais
  l'instruction du contrat est explicite et prioritaire sur ma lecture du contenu ; je ne
  m'attribue pas ce fichier.
- `games/pong/mutation_triage.json` (M) — meme instruction explicite, meme reserve : le contenu
  (3 mutants equivalents) est identique en substance a l'ancienne version, seul le format JSON
  change (objet `{_comment, equivalents:[...]}` -> tableau `[{name, line, ...}]`), sans attribution
  certaine dans le present exercice.

## 7. P1/P2 en vol — apparus entre T0 et T2, NON classes (6 fichiers)

Ni « a nous » (leur mission n'est pas la notre) ni « pas a nous » au sens Godot (ce sont des
missions SOEURS du meme lot P1/P2/P3, pas une session etrangere) ni « a trancher par Pierre » au
sens attribution-incertaine (l'origine est claire, verifiee par lecture du fichier). Ils meritent
une categorie propre : **non contre-verifies, encore chauds, a ne pas committer avant cloture de
leur propre mission** — le classer dans un lot maintenant reviendrait a garantir un travail que je
n'ai pas audite (violation directe de la doctrine « delegation = clean verifier »).

- `scripts/forge/git_guard.py` (??, mtime 15:26:07) — en-tete du fichier : « PREPARE, NON ACTIVE.
  Ce module n'est cable nulle part dans `.claude/settings.json` » (mission P2, contrat
  `scripts/forge/contracts/p2-garde-git-mecanique.yaml`, deja compte au LOT 2).
- `.claude/hooks/pretool_git_guard.py` (??, mtime 15:26:57) — meme mission P2.
- `scripts/forge/tests/test_git_guard.py` (??, mtime 15:26:25) — meme mission P2.
- `docs/forge/GARDE_GIT_MECANIQUE_PROPOSITION.md` (??, mtime 15:30:11 — apparu apres T1, pendant
  la correction de ce document) — meme mission P2 ; cite par le docstring de `git_guard.py`
  comme l'emplacement du patch de cablage propose pour `.claude/settings.json` (non applique).
- `docs/forge/GENRE_BIBLE_PONG_V1_PROPOSED.md` (??, mtime 15:28:53) — mission P1 (contrat
  `scripts/forge/contracts/p1-lignes-wiremap-et-genre-bible.yaml`, deja compte au LOT 2).
- `docs/forge/WIREMAP_PONG_V2_PROPOSITION_FINALE.md` (??, mtime 15:27:32) — meme mission P1.

**Constat pour Pierre** : au moment ou ce rapport est ecrit (15:26->15:30), P1 et P2 sont en train
de finir ou viennent de finir en parallele de P3 (cette mission) — un 7e fichier de cette liste
est apparu APRES ma premiere passe de redaction, entre T1 et T2. Aucune entree correspondante
n'existe encore dans `lab/forge_runs/RUN_INDEX.md` (lu integralement au debut de cette mission,
verifie a nouveau absent) — donc **aucune contre-verification de supervision n'a eu lieu sur ces
6 fichiers a l'heure de ce rapport**. Recommandation : reprendre CE document (ou en ecrire un
complement) une fois P1/P2 clos et contre-verifies, pour leur assigner un lot (tres probablement
un LOT 2bis « garde git mecanique + genre bible/wiremap Pong » distinct du LOT 2 des contrats,
puisque ce sont des LIVRABLES de contrats, pas des contrats eux-memes) plutot que de les inserer
retroactivement ici sans preuve.

## 8. A trancher par Pierre (1 fichier)

- `knowledge_base/learning_curve.jsonl` (M) — **diff de CONTENU verifie VIDE** :
  `git diff --numstat -- knowledge_base/learning_curve.jsonl` ne renvoie AUCUNE ligne (0
  insertion/0 suppression). Le seul signal est un avertissement Git de normalisation de fin de
  ligne (« CRLF will be replaced by LF the next time Git touches it »), reproductible sur les 4
  autres fichiers `.jsonl`/`.md` de ce depot (meme avertissement, meme cause : `core.autocrlf`
  local `false` mais fichiers ecrits en CRLF sur disque). Conforme a l'incident documente dans
  `studio_brain/00_CURRENT_CONTEXT.md` (« INCIDENT INSTRUIT — pollution de learning_curve.jsonl ») :
  la supervision avait restaure l'etat HEAD legitime (3 lignes) apres un `git checkout`
  interdit d'un agent precedent — cet etat HEAD legitime est celui actuellement sur disque,
  confirme identique. **Question pour Pierre** : committer ce fichier ne changerait aucune
  donnee (un commit ne ferait que rejouer la conversion CRLF/LF) — recommandation : ne rien
  committer sur ce fichier seul (aucun des 4 lots ci-dessus ne l'inclut), sauf si Pierre veut
  une normalisation explicite de fin de ligne en commit dedie.

## 9. Non-versionnables signales (aucune suppression effectuee)

- `lab/reports/error_journal/INDEX.generated.md` — nom explicite « generated » : envisager de
  l'ignorer (`.gitignore`) plutot que de le committer a chaque regeneration, comme le contrat le
  qualifie deja de fichier GENERE. Signale, non modifie, non ajoute au `.gitignore`.
- `lab/reports/error_journal/html.jsonl` — meme remarque si ce fichier est integralement derive
  d'un monolithe amont (a verifier par Pierre ; hors perimetre d'ecriture de cette mission).
- `.claude/launch.json` — config de lancement locale (chemins/ports de test) : a evaluer si elle
  doit rester versionnee (utile a toute session future testant Pong en navigateur) ou si elle est
  specifique a ce poste — je ne tranche pas, je signale.

## 10. skipped_validation (explicite)

1. **`pytest scripts/forge/tests/` n'a PAS ete relance par cette mission** — hors perimetre
   (permissions : `git status/log/diff` en lecture seule + one-liners Python de comptage
   uniquement, pas d'execution de suite de tests). Les chiffres cites (895/917 passed) sont ceux
   deja consignes et contre-verifies dans `lab/forge_runs/RUN_INDEX.md`, cites par reference,
   jamais recopies comme preuve neuve.
2. **Le contenu detaille de `lab/forge_runs/pong/` (evidence/verdict/state) n'a pas ete
   ouvert fichier par fichier** au-dela d'un listage des noms — le classement dans LOT 3 s'appuie
   sur le recit de `RUN_INDEX.md` (`pong_r2`), pas sur une relecture ligne a ligne du verdict.
3. **Le contenu des contrats du LOT 2 n'a pas ete valide contre `SCHEMA.md` (17 champs)** un par
   un — seule la presence de `capability_role: forge_toolsmith` a ete verifiee par grep pour
   etablir la dependance d'ordre du §1.
4. **Aucune tentative de determiner la verite chronologique de
   `docs/superpowers/specs/2026-07-26-godot-adapter-design.md`** (mtime anterieur a la fenetre
   annoncee de la session parallele) — signale au §6a, tranche par l'instruction explicite du
   contrat plutot que par une investigation independante (hors perimetre : lecture seule, aucune
   comparaison de contenu avec l'autre session demandee).
5. **Les 5 fichiers P1/P2 du §7 n'ont pas ete lus au-dela de leur en-tete / premieres lignes** —
   suffisant pour identifier la mission source, pas pour juger leur qualite ou leur exhaustivite ;
   ce jugement releve de leur propre contre-verification, pas de cette mission P3.

## 11. git_status_final

**Ecart honnete entre le perimetre audite (T0, 76 fichiers, §0-§8) et l'etat reel au moment de ce
rapport (T1, 82 fichiers).** `git status --porcelain` n'a ete modifie par **aucune action de
cette mission** (aucun `git add`/`git commit`/`git push`/`checkout`/`restore`/`stash` execute,
verifiable : seuls des `git status`/`git diff`/`git log` en lecture seule et un `Write` sur
`docs/forge/PLAN_COMMITS_PAR_LOTS_2026-07-27.md` ont ete executes). L'ecart T0->T1 (+6) est
cause **exclusivement par les missions soeurs P1/P2 qui progressent en parallele** (§7) — un fait
du depot a rapporter a Pierre, pas un defaut de cette mission. Succes-critere (f) relu strictement
(« inchange... a l'exception du document produit ») : verifie si on le lit comme "aucune ecriture
de CETTE mission" ; pris a la lettre sur le compte brut, le nombre a bouge de 76 a 82 pour des
raisons exterieures a P3, signale explicitement plutot que tue.

---

software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
