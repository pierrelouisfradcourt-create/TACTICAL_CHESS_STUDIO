# Contexte courant TCS

## CLÔTURE 2026-07-28/29 — CYCLE SNAKE TERMINÉ (jeu 2 du curriculum, 1re cible GODOT)
- **Snake est livré, jouable et prouvé.** `software_verdict: OK / HUMANGATE_READY_WITH_OBJECTION`,
  `verify_run` INTÉGRITÉ AUTHENTIQUE. Le jeu DÉMARRE (11 ticks, 0 erreur, exit 0) et AFFICHE
  (oracle pixel `core_render_frame` vert en fenêtre GPU). 282 assertions · mutation 63/64
  (1 survivant trié équivalent) · solvabilité 50/50 · les 8 volets du standard verts.
- **Ce que le cycle a vraiment produit : une chaîne de preuve multi-runtime.** Six instruments
  supposaient une topologie web au lieu de la lire ; chacun est corrigé et prouvé —
  `oracles.json` sans entrée · permission `tests/**` non ancrée · profil `standard_godot`
  non reconnu comme topologie STANDARD · budget de ticks calibré pour un autre jeu (faux
  NÉGATIF 0/50 sur une solvabilité qui marchait) · `check_index` contredisant `repo_map` ·
  faux vert `observable_coverage` (44 champs en prose ignorés en silence). **Le mode de panne
  du cycle : un instrument qui SUPPOSE au lieu de LIRE.**
- **Contrat de preuve V1 FIGÉ** (`docs/forge/CONTRAT_PREUVE_MUTATION_V1.md`) : descripteur
  `proof:` dans le `game_contract.yaml` du jeu · périmètre de mutation par CATÉGORIE (plus
  par extension) · commande de mutation DÉDIÉE (mesuré : 17 s contre 14 min via l'oracle
  complet) · scellement en CHAÎNE (déclaré/exécuté/wrapper/scripts/paramètres/version du
  runtime/résultat brut) · `<bin:name>` autorise l'indirection de chemin machine, jamais
  celle de ce qui est exécuté · 4 verdicts distincts, aucun vert silencieux.
- **DEUX LEÇONS RATIFIÉES PIERRE 2026-07-29** (manuel §6bis, mémoire
  `proof_never_replaces_product_run`) : ① **la preuve ne remplace jamais l'exécution
  produit** — Snake satisfaisait TOUT et ne démarrait pas ; la validation doit inclure un
  chemin d'entrée utilisateur réel (point d'entrée → runtime chargé → rendu observable) ;
  les index prouvent la cohérence des déclarations, pas l'exhaustivité des besoins.
  ② **un contrat déclare les éléments structurels OBLIGATOIRES**, pas seulement les fichiers
  existants — les points d'entrée sont des invariants à vérifier EN ABSENCE comme en présence.
- **Dette ouverte, nommée** : aucun oracle ne détecte un élément *nécessaire mais non déclaré*
  (c'est ce qui a laissé Snake passer sans démarrer) · `product_oracle` reste web-only (le
  fournisseur Godot le complète, il ne le remplace pas) · `core_render_frame` exige une
  fenêtre GPU · 10 lignes de Snake sont observables sans volet qui les exerce · DR-14 (3
  failles de la garde git, même cause : elle filtre du TEXTE) · DR-15 (skill `/forge` vs
  `_STEP_TOOLS`).
- **3 objections au verdict signé, décision Pierre** : équivalence du survivant non vérifiée
  mécaniquement · red-team dégradé · archi/wiremap sautés par le profil.
- **Témoin Pong INTACT** tout du long : 72/72, aucun fichier modifié. Un incident a été
  détecté et réparé en cours de cycle (l'éditeur Godot avait réécrit son `project.godot`).
- **6 commits poussés.** Non commité volontairement : 70 suppressions
  `repos/games/ChessTCG/` (archivage antérieur, hors périmètre de ce cycle).

## Session 2026-07-29 (Sonnet, suite) — Ménage disque (hors Forge, hors dépôt pour l'essentiel)
- **Demande Pierre** : nettoyer C:\ (2100+ SKILL.md dupliqués, Bureau, Codex GPT, puis `repos/`
  du dépôt). Aucun chantier Forge touché.
- **Créé `C:\STUDIO_ARCHIVE\`** (hors dépôt, sibling de `TACTICAL_CHESS_STUDIO`) — destination des
  éléments gelés/orphelins sortis du repo : `qwen25-7b-hf` (14,2 Go, checkpoint HF sans référence
  code) · `repos_games/studioV2_MIGRATED_HOLD` + son zip (330 Mo, référencé seulement comme chaîne
  de test synthétique) · `repos_games/ChessTCG` (380 Ko, zéro référence) · `repos_games/BullshitKiller`
  (49 Mo, app autonome non câblée).
- **Vérifié « gelé ≠ mort » avant de rien déplacer** (contre-vérification systématique du code) :
  `games/collect_runner_legacy` + `games/survival_arena_legacy` (top-level, différent de
  `repos/games/`) sont câblés en dur dans `scripts/forge/tests/test_e2e_harness.py` — **laissés en
  place**. `openclaw/` + `studio/openclaw-workspace` + `studio/factory` sont importés par 7 scripts
  actifs (healthcheck.py, studio_meta.py, sync_memory.py, cockpit_server.py, canvas_gateway.py,
  council.py, director.py) et par les skills **vivants** `/gate` et `/audit-daily` — **laissés en
  place** malgré le statut « legacy » en mémoire.
- **`models/lmstudio` (51 Go, dans le dépôt) confirmé ACTIF** : LM Studio (6 modèles chargés,
  vérifié via son API port 1234) sert ses GGUF depuis ce dossier, pas depuis son
  `downloadsFolder` configuré (`~/.lmstudio/models`, vide) — **ne pas déplacer/supprimer**, ferait
  planter LM Studio.
- **Codex CLI (OpenAI) entièrement désinstallé** sur demande Pierre : binaire, `.codex/` (profil,
  auth, sessions), entrée PATH — tout supprimé (corbeille). Sans lien avec Claude Code.
- **Tests re-vérifiés après chaque déplacement risqué** (jamais pris la parole d'un `grep` seul) :
  `node scripts/forge/declaration_readers.test.mjs` 29/29 verts après le déplacement de
  `studioV2_MIGRATED_HOLD`.
- **Reste identifié, non traité (zone sensible, pas décidé seul)** : `lab/` (14 Go — datasets/runs
  actifs ML, ACTIVE_DATASET) · `training_runs/` (1,8 Go, 2 runs quasi-identiques 26-27/06) ·
  `target/` (3 Go Rust, Pierre a choisi de garder).
- **Prochaine étape** : aucune demandée — session de ménage terminée.

## Session 2026-07-29 (Sonnet) — Infra Qwen local hors Forge (pas un chantier Forge)
- **Demande Pierre** : connecter Claude à LM Studio (Qwen local, port 1234), avec accès Skills/Playwright.
  Hors périmètre Forge — infra studio générale, rien commité (tout vit hors dépôt, `~/.claude/**`).
- **Livré et vérifié fonctionnel** (détail : mémoire `qwen_lmstudio_playwright_infra`) :
  pont MCP `ask_lm_studio` (Claude appelle Qwen comme outil texte-in/texte-out) · `@playwright/mcp`
  branché Claude Code + Claude Desktop · **Claude Desktop mode 3P** (Qwen `qwen2.5-coder-14b` comme
  cerveau, PAS qwen3.6 — bug JSON connu) configuré et confirmé par les logs de l'app, **mutuellement
  exclusif** avec le compte Anthropic normal (2 profils disque étanches, aucun historique partagé,
  bascule à l'écran de connexion uniquement) · agent CLI standalone **`qwen-playwright-agent`**
  (Qwen décide via function-calling, exécute un vrai Playwright en boucle) testé 2× vert
  (example.com + résumé Wikipédia FR Diablo II correct).
- **Leçon d'environnement capturée** (mémoire `stophook_wsl_node`, mise à jour) : l'outil Bash de
  Claude Code = launcher WSL sur ce poste, y compris pour les installs de binaires natifs
  (`npx playwright install` lancé via Bash a écrit dans un contexte invisible du PowerShell natif
  de l'utilisateur) — utiliser PowerShell pour tout ce qui doit exister côté Windows natif.
- **Prochaine étape** : aucune demandée par Pierre pour l'instant — infra prête à l'usage direct
  (`node index.mjs "<tâche>"` dans `qwen-playwright-agent`) dès qu'un besoin de scraping/test web
  piloté par Qwen se présente.

## CLÔTURE SESSION 2026-07-27/28 — CYCLE PONG TERMINÉ, PONG GELÉ COMME TÉMOIN
- **Ce que le cycle a produit de plus important : 5 RÈGLES D'USINE** (invariants Forge ratifiés
  Pierre, chacun né d'une panne mesurée — détail : mémoire `forge_invariants_qualite`,
  schéma maître **Détail K**) :
  1. une preuve sans lecteur branché n'existe pas dans la chaîne qualité ;
  2. un état `RUNNING` doit être confirmé par une réalité externe (process/heartbeat/checkpoint) ;
  3. un test doit vérifier une propriété durable, pas une valeur historique accidentelle ;
  4. un nom de preuve est la promesse exacte de ce qui est mesuré ;
  5. une garde de sécurité est indépendante de l'état courant.
- **PONG EST GELÉ — témoin de régression, ne plus l'enrichir.** État au gel : 11 fichiers de
  preuve exécutés (72 tests, exit 0) · `observable_coverage` OK 6/6 · `genre_coverage` OK
  (8 citations résolues) · le jeu boote en navigateur réel (canvas 800×480, mode solo, écran de
  fin, relance, sortie observable). **Toute amélioration future de Forge devra prouver qu'elle ne
  casse pas ce témoin.**
- **Livré et commité cette session** : télémétrie d'échec (M1) · garde attempts s10s ·
  verify_run séparant intégrité/verdict logiciel · propose_brick branché · findings red-team
  portés au verdict · gate mutation restreint aux catégories testables · oracle produit 7 volets ·
  `check_observable_coverage` + `check_genre_coverage` · garde git mécanique (+ deny anti
  auto-override) · Genre Bible Pong lisible par oracle · 24 contrats d'agent · 12 documents
  d'audit et de doctrine. **985 tests studio verts, oracle du jeu 72/72.**
- **PROCHAIN CHAPITRE (nouvelle session) — l'expérience d'apprentissage, sur le JEU SUIVANT,
  jamais sur Pong.** Question centrale : « l'usine transforme-t-elle son expérience en
  accélération ? » Conditions posées par Pierre : nouvelle Genre Bible · pré-mortem dès le
  départ · `observable_by_player` dans le design initial · briques candidates à la réutilisation
  identifiées AVANT production · mesure de ce qui est importé depuis Pong/Forge.
- **PIÈGE DE MESURE À NE PAS RÉPÉTER** : ne pas comparer des coûts bruts entre runs de périmètres
  différents (pong_r2 = 13,82 $ / 123 965 tk avec 0 ligne REQUIRED ; pong_r3 s9 = 14,10 $ /
  191 773 tk avec 6). On mesure la capacité à absorber un nouveau jeu.
- **Chantiers proposés, NON faits** (ne pas les rouvrir sans go) : superviseur externe de run
  (détection de zombie, checkpoints, reprise) · niveau 2 de l'ultra-plan (ordre U-4 ratifié :
  résolution ID + source_role → World Scan→Genre Bible → Prisme+Gameplay Review → Architecte
  dépôt → Runtime Bible → findings→bibles → s6) · promotion en gate dur des volets advisory ·
  mission clean-pass M01.
- **⚠️ Session Godot parallèle** : `scripts/forge/adapters/godot/`, `fixtures/godot_b0/`,
  `lab/forge_scenes/`, `missions/` — jamais commités par cette session, ne sont pas à nous.

## ÉTAT AU 2026-07-27 fin de session — NIVEAU 1 VALIDÉ, 4 LIVRABLES PRÊTS, ATTENTE PIERRE
- **Pierre a validé le niveau 1** (« software_verdict OK niveau 1 ») et **renversé la priorité** :
  le niveau 1 est un **socle de preuve**, pas le chantier principal ; le but est de reconnecter la
  chaîne de fabrication. **Pas de claim « studio prêt » avant le premier cycle complet.**
  Ses 4 invariants posés : playtest non lu = sans valeur · `observable_by_player` = contrainte de
  qualité · `NOT_MEASURED != OK` · l'incident git = défaut de garde, pas de discipline.
- **Niveau 1 livré et contre-vérifié** : item 0 playtest consigné ET relu par le pré-mortem ·
  étape 1 findings red-team audibles · étape 2 périmètre mutation par catégorie (46 % vs 95 %
  séparés) · étape 3 oracle produit 3 volets (1 faux vert intercepté par la contre-vérification).
  Suite : **945 passed, 1 skipped**. Détail complet : `lab/forge_runs/RUN_INDEX.md`.
- **4 livrables PRÊTS, en attente de validation** (détail RUN_INDEX, missions P1/P2/P3) :
  `docs/forge/WIREMAP_PONG_V2_PROPOSITION_FINALE.md` · `GENRE_BIBLE_PONG_V1_PROPOSED.md` ·
  `GARDE_GIT_MECANIQUE_PROPOSITION.md` (+ `scripts/forge/git_guard.py`, hook, 28 tests) ·
  `PLAN_COMMITS_PAR_LOTS_2026-07-27.md`.
- **3 DÉCISIONS QUI BLOQUENT LE PREMIER CYCLE** : (1) le `deny` sur `.claude/HUMAN_GIT_OVERRIDE.json`
  — sans lui un agent s'écrit son propre override (`settings.json` porte `allow Write(.claude/**)`),
  le garde ne vaut rien ; (2) `IMPLEMENTED → REQUIRED` sur les 4 lignes requalifiées ; (3) l'ordre
  des lots — **le lot 2 dépend du lot 1** (17 contrats déclarent `forge_toolsmith`, ajouté par
  roles.yaml dans le lot 1 ⇒ sinon `RoleUnresolved` sur tout dispatch).
- **Critère du premier cycle : les 6 preuves de bouclage** (ultraplan §VII.3), PAS un vert global.
  « Un cycle médiocre mais correctement observé est préférable à un cycle artificiellement vert. »
- **Niveau 2, ordre ratifié U-4** : 1 résolution ID + source_role · 2 World Scan→Genre Bible ·
  3 Prisme→Bible + Gameplay Review · 4 Architecte→bibliothèque · 5 Runtime Bible · 6 findings→bibles ·
  7 s6 (déblocage technique : contrat ouvert à reviewer local/humain/autre modèle — U-8).
- **83 fichiers non commités** · session Godot parallèle toujours active dans le même arbre.

## Session 2026-07-27 (suite de session, fable→opus→fable) — AUDIT D'ALLÈGEMENT rendu
- **Playtest Pierre du produit réel** (après lancement navigateur par la session) : quitter
  inerte · vitesse injouable · pas d'adversaire auto · score/UX non validés · pas de colis
  Godot. Mission Pierre : audit d'allègement AVANT toute implémentation.
- **Au passage, 2 bugs de chargement navigateur trouvés et corrigés (NON COMMITÉS)** :
  audio.mjs (imports node:* statiques) + exit.mjs (process non gardé) — le jeu n'avait
  JAMAIS booté dans un vrai navigateur ; 51 tests + solvabilité re-vérifiés verts après fix.
  Serveur de test : python -m http.server + .claude/launch.json (nouveau).
- **3 audits sous contrat rendus et contre-vérifiés** (A1 chaîne · B1 tests · C1 oracle/colis)
  → synthèse : **docs/audit/RAPPORT_DECISION_ALLEGEMENT_2026-07-27.md** (5 sorties + fourche
  colis V1). Diagnostic central : l'usine prouve la MÉCANIQUE, jamais le PRODUIT — cause
  racine commune des 4 constats = saut e2e du profil standard (ratifié 23-07, driver.py:745)
  + s10d jamais branché + captures jamais appelées + mutation aveugle sur la présentation.
- **5 décisions attendues de Pierre (détail §5 du rapport)** : D-A remplacer le saut e2e par
  un oracle produit (captures existantes + partie auto, PAS Playwright) · D-B périmètre
  mutation par catégorie (= résout l'arbitrage ③ suspendu) · D-C cible du colis V1
  (navigateur ~90 % existant vs Godot direct — reco : navigateur V1, Godot V2 via godot_b0) ·
  D-D go téléchargement export templates Godot · D-E go passe de spécification jouabilité
  (adversaire, vitesse, quitter, score, écran de fin — AUCUN n'est dans la wiremap).
- **Faits neufs vérifiés** : godot.config.json créé le 27-07 02:04 par la session parallèle
  godot_b0 (le fog wiremap l.107 est périmé) · main.gd Pong = renderer d'état FIGÉ (pas un
  jeu) · aucun export template/preset Godot sur le poste · Playwright absent de la lane.
- **VOLET D1 (boucle de rétroaction, question Pierre) rendu et contre-vérifié** : verdict
  PARTIEL→NON pour la chaîne exécutée — le profil standard N'A PAS d'architecte (ni s4 ni s5
  dans PROFILES, 13/13 lignes wiremap `decider:null`) · boucles fermées récentes = intégrité
  seulement · red-team avait trouvé F1-vitesse et F6-exit AVANT le playtest, findings morts
  non pliés · densité mesurée : 8 exécutions pour 13 preuves vs 1 run auto = 12-13/13 ·
  **5e occurrence connecteur : learning_curve écrite, AUCUN lecteur décisionnel**.
- **ULTRA-PLAN MÉTHODE DE FABRICATION (PROPOSED — le document de référence du chantier)** :
  `docs/forge/ULTRAPLAN_METHODE_FABRICATION_V1.md`. Demande Pierre : remonter le niveau — définir
  la méthode IDÉALE d'abord, comparer au dépôt ensuite. Contenu : 6 postes studio (taxonomie
  jeux, pas Front/Back) · les 7 étapes RECHERCHE→CONCEPTION→ARCHITECTURE→PLANIFICATION→
  PRODUCTION→VALIDATION→APPRENTISSAGE avec les 7 réponses chacune (rôle/décision/entrée/sortie/
  artefact-mémoire/oracle/retour) · boucle de connaissance (créée/perdue/relue/propriétaire) ·
  Prisme comme ÉTAPE de conception (5 livrables identiques par lentille) · 6 bibles avec
  créateur/lecteur/moment/MAJ/preuve · 10 reviews (avant/pendant/après) · **matrice de
  comparaison au réel** · plan à 3 NIVEAUX.
  **RÉSULTAT CLÉ DE LA MATRICE : sur 13 éléments, UN SEUL est réellement absent** (Gameplay
  Review) + 1 à créer en minimal (oracle produit) ; **6 existent mais non branchés**, 1 est mal
  spécifié (s4-archi), 3 fonctionnent. ⇒ **chantier de plomberie et de mesure, pas de
  construction.**
  **DÉCOUVERTE ACTIONNABLE (5 min)** : `record_playtest` EXISTE + CLI (`studio_link.py:674`),
  son docstring dit « avant R2 un retour de playtest était une conversation qui s'évaporait » —
  et il y a **0 entrée playtest** dans les journaux ⇒ **les 4 constats du playtest Pierre du
  27-07 s'évaporent en ce moment**. Les consigner contraint mécaniquement le pré-mortem du
  prochain build. C'est l'item 0 du niveau 1.
  **NIVEAU 1** (≈3 j + 1 run) = plan run propre + item 0 · **NIVEAU 2** (≈9-11 j, N2-0→N2-8,
  `source_role` + résolution des ID EN PREMIER) · **NIVEAU 3** = 5 mesures à surveiller, pas des
  briques à construire (citations résolues, reuse_ratio, retenues par lentille, coût par jeu
  vert, findings convertis) + ce qui est explicitement différé (réconciliation G, MCTS E).
  **RÉSERVE ARGUMENTÉE** : l'architecte du dépôt recommandé en ÉTAPE (il doit DÉCIDER new|extend
  après le merge) plutôt qu'en lentille (qui critique en parallèle et ne décide rien) — arbitrage
  U-5 laissé à Pierre. 9 décisions U-1→U-9.
- **FEUILLE DE ROUTE CONSOLIDÉE (PROPOSED)** : `docs/forge/ROADMAP_USINE_APPRENANTE_V1.md` —
  les 18 points de Pierre (dont la **couche BIBLE**, sa pièce manquante n°1 : « sans bibles,
  World Scan est une dépense ») regroupés en **6 lots A→F** par dépendance mécanique.
  **MESURE CLÉ : la couche bible existe à ~60 %** — 10 bibles réelles auto_battler ·
  filière Art Bible = la plus mûre du studio (contrat s2.5 + check_artbible.mjs 369 l. +
  8 dispatches + sondes adversariales) = **le patron à répliquer** · écrivain
  `propose_bible_entry` EXISTE avec CLI mais **0 appelant** ⇒ `forge_bible_proposals.jsonl`
  jamais créé · lecteur `project_bible` EXISTE et EST BRANCHÉ (driver.py:448 → run_real.py:568)
  mais **seulement à s0**, absent du profil standard · citation-par-ID = 118 citations mais
  **l'ID n'est jamais résolu** (présence de nom seule ; l'audit P2 dit « *vivante* surévalue »).
  Manque réellement : la **bible de GENRE** (les bibles actuelles sont par jeu).
  **APPORT D'ANALYSE** : le mode de panne dominant est **écrivain sans appelant / lecteur sans
  données — 6 occurrences prouvées** (learning_metrics · propose_brick · findings red-team ·
  learning_curve · spawn_authorized · propose_bible_entry) ⇒ **règle de gouvernance du plan** :
  aucune boucle n'entre sans (a) appelant, (b) lecteur nommé, (c) mesure mécanique qu'elle a
  tiré — sinon la couche bible sera le 7e orphelin.
  **Séquence recommandée A→B→C→D→E, pas en parallèle** : A rendre la critique audible (1,5 j,
  conditionne tout) → B oracle produit (3-5 j, sans lui la valeur de C est inobservable ET Pong
  reste bloqué) → C profil design (4-4,5 j) → D bibles (4-6 j) → E boucle bibliothèque (1-2 j).
  **Critère de valeur d'une bible proposé** : citations RÉSOLUES / citations revendiquées
  (l'équivalent de reuse_ratio pour la connaissance). **Test le moins cher avant tout
  engagement** : profil design sur la wiremap Pong actuelle — s'il ressort les 4 constats du
  playtest, la thèse est démontrée sans build. 6 décisions D-α→D-ζ.
- **DIAGNOSTIC PIERRE 2026-07-27 (le vrai problème)** : « la Forge répond bien à *construis-moi
  un jeu*, mal à *est-ce qu'on construit le bon jeu ?* » — ce qui manque = des **boucles de
  review qui font évoluer le design AVANT de payer un build** (Design · World Research ·
  Gameplay · Architecture), + 2 profils Prisme (Programmeur Gameplay, Programmeur Runtime),
  + l'Architecte redéfini comme **architecte du DÉPÔT** (briques interchangeables, API
  réutilisable, « le builder pense au jeu, l'architecte pense au studio »).
- **MESURE QUI CORRIGE LE DIAGNOSTIC (et le renforce)** : la moitié conception N'EST PAS
  non-fonctionnelle — elle a tourné puis a été **abandonnée par le choix de profil du 22-07**.
  Compté sur dispatch_audit (198 lignes, 37 runs, 07-10→07-27) : `s6-redteam-plan` **14
  dispatches / 8 runs** (jusqu'à card_engine 07-20) — le retour red-team→architecte a
  RÉELLEMENT tourné, son contrat porte « RE-ENTRÉE de la boucle » · s4-archi 8 · s5-wiremap 8 ·
  s1-prisme 6 · s2-worldscan 6. ⚠️ PIÈGE D'INSTRUMENT : le champ `event` n'existe que sur les
  lignes récentes — filtrer dessus efface 30+ runs anciens (erreur commise puis corrigée).
- **PROPOSITION (PROPOSED)** : `docs/forge/PROPOSAL_PROFIL_DESIGN_V1.md` — profil **`design`**
  (s2-worldscan · s1-prisme N lentilles · sX-gameplay-review · s4-archi re-spécifié ·
  s6-redteam-plan) qui **ne produit AUCUN code** : sortie = wiremap V2 + dossier de conception.
  3 des 4 boucles EXISTENT (re-câblage), 1 seule CRÉATION (Gameplay Review), 1
  RE-SPÉCIFICATION (s4-archi : son objectif actuel = blueprint modules/deps, **zéro mention**
  de bibliothèque/brique/API transverse — diagnostic de Pierre confirmé par le contrat).
  `merge_prisme.mjs` EXISTE déjà (recombinaison mécanique N lentilles, zéro LLM-arbitre, GAP
  explicites) ⇒ les 2 profils = 2 lentilles à servir, pas un panel à construire. `source_role`
  toujours pas implémenté (prérequis gratuit, irrécupérable après coup).
  **Garde-fou anti-théâtre** : wiremap V2 ≠ V1 ET chaque ligne du diff attribuable à une
  critique nommée. **Test rétroactif le moins cher** : passer le profil design sur la wiremap
  Pong ACTUELLE — s'il ressort les 4 constats du playtest, la boucle est démontrée sans build.
  ≈4-4,5 j-session. S1 (plier findings red-team) devient prioritaire, sinon les critiques du
  profil design mourront comme F1/F6.
- **COMPARATIF SCHÉMA MAÎTRE ↔ RÉEL (PROPOSED)** : `docs/forge/COMPARATIF_SCHEMA_VS_REEL_2026-07-27.md`.
  FAIT DE CADRAGE : le profil `standard` (celui du curriculum) = **5 étapes, MOITIÉ ARRIÈRE
  SEULEMENT** (build+oracles+verdict) — aucune étape ne forme l'exigence (pas de s0/s1/s5),
  et `_freeze_rules` (driver.py:517) ne se déclenche qu'après s5 ⇒ **le standard n'a même pas
  d'événement de gel**. Réconciliation (Détail G) toujours non codée — n'existe que dans des
  commentaires ; ses règles sont vérifiées par s10s APRÈS le build. D'où les 3 « jamais
  spécifié ». Nous sommes DANS le plan, avec les CIBLES du plan non construites.
  Ce qui fonctionne (vérifié) : pyramide/retry/pool/escalade · JALON 0 franchi 3/4 ·
  troisième cerveau ratifié. Angles morts classés 1-6 + **5 solutions graduées S1-S5**
  (~5-8 j-session au total) ; **correction de ma propre proposition d'hier** : `proof_review`
  ne peut pas s'accrocher « au gel » (inexistant en standard) ⇒ commande pré-run sur la
  wiremap écrite à la main. 6 décisions attendues (D-1→D-6, dont mise à jour du schéma).
- **PROPOSITION DÉPOSÉE (PROPOSED, décision Pierre)** :
  `docs/forge/PROPOSAL_BOUCLE_PREUVE_V1.md` — brique « REVUE DE PREUVE » : volet
  `proof_review` déterministe au gel (fidélité/observabilité-joueur/densité/coût, rapport à
  l'architecte HUMAIN avant build) + « dossier architecte » post-s12 (plieur qui donne enfin
  un lecteur au red-team et à learning_curve, relu au gel suivant). ~2,5-3,5 j-session,
  advisory d'abord, aucun LLM-juge. Rien codé.

## Session 2026-07-26 (Fable, 3e) — JALON 0 DÉROULÉ + run Pong pong_r2 LANCÉ
- **Les 4 décisions du JALON 0 prises par Pierre et exécutées** :
  ① decision-log : 3 entrées PROMUES (go explicite « fais-le toi-même ») ⇒ **protocole
  Troisième Cerveau V1/V1.1 RATIFIÉ** ; fichier PROPOSED marqué PROMU.
  ② **M1 EXÉCUTÉE et contre-vérifiée P7** : agent Sonnet sous contrat
  (`contracts/m1-telemetrie-echec.yaml`, nouveau rôle `forge_toolsmith`→Sonnet dans
  roles.yaml, à ratifier au commit). TDD RED→GREEN, 853 passed/1 skipped relancés par
  l'orchestrateur, advisory strict tenu, rétroactif shmup : la télémétrie aurait dit
  opus (pas haiku). Échec d'étape ⇒ ligne `outcome:HALT` + coût + modèle réel.
  ③ M01 : re-mesure post-fix bb6ea2f VERTE (39/39 + R9 50/50, plus de tautologie) MAIS
  clean pass impossible par mesure seule — 5/6 flags structurels (archi/wiremap SKIPPED
  étape 0, 2 mutants équivalents prouvés, bande [26,26], duplication générateur).
  Décision Pierre : « re-mesure propre » — reste `candidate`, mission dédiée à chiffrer.
  ④ s10s→driver : brouillon RATIFIÉ le jour même (« Ratifier et lancer maintenant »),
  mission EXÉCUTÉE et contre-vérifiée : 855 passed/1 skipped, garde `driver.py:954`
  (RuntimeError si attempts<1) + test négatif. Cause du FAIL/attempts:0 : brouillon
  jamais versionné antérieur à 74f3dd0 — chemin disparu, invariant désormais explicite.
- **DEFERRED** : DR-07 CLOSE (réponse Pierre : builders opus fixe, orchestrateur opus) ·
  DR-02 reposée → ATTENDRE, nouvelle échéance = Pong vert · DR-01 attend 1re ligne HALT réelle.
- **RUN PONG `pong_r2` EN COURS** (profil standard, run_orchestrator Opus sous contrat,
  step-timeout 3600) : tentative 1 = BLOCKED propre (run_dir dérivé de --project occupé
  par le state du run halté pong-01) ⇒ levée ZÉRO-CODE : archive `git mv` →
  `lab/forge_runs/pong-01_halted/` (committée à d77fb30, pièce à conviction sûre).
  Tentative 2 : state neuf `run_id: pong_r2` dans `lab/forge_runs/pong/`, s9 RUNNING
  (Opus, tentative 1). RUN_INDEX à jour (entrées M1 + s10s + pong_r2 à la clôture).
- **RUN pong_r2 TERMINÉ (DONE, 2329 s, verdict signé FAIL/BLOCKED re-vérifié 2×)** :
  s9 OK×2 opus · s10a FAIL×2 (mutation 58/126, 68 survivants 0 triés) · s10s FAIL×2
  (budget seul : game_loop promis non déposé — placement RÉGLÉ) · s11 OK · s12 OK.
  1er coût mesuré par M1 : **13,82 $ / 123 965 tokens**. HALT : 0 (absence d'échantillon
  ⇒ DR-01 toujours sans donnée). LA CHAÎNE COMPLÈTE A TENU (porte→contrat→driver→
  retry compté→verdict signé→re-vérif) — l'infrastructure est testée, le jeu ne passe pas.
- **4 décisions Pierre ouvertes (détail RUN_INDEX pong_r2)** : ① écart verify_run
  (FAIL honnête ⇒ REJET, gate mutation dur inconditionnel — fix du 24/07 à ratifier) ·
  ② budget game_loop (déposer la brique ou requalifier la promesse) · ③ 68 survivants
  mutation (tuer / triager / arbitrer si adaptateurs présentation ∈ logic_files —
  arbitrage STANDARD) · ④ sort de Pong + archive pong-01_halted.
- **LES 4 DÉCISIONS POST-RUN TRANCHÉES PAR PIERRE ET TRAITÉES (2026-07-26, session opus-5)** :
  ① fix `verify_run` RATIFIÉ et LIVRÉ (mission V1) — intégrité (HMAC/évidence/empreintes/
  knowledge_trace/cohérence) décide seule le code de sortie ; verdict logiciel rapporté.
  Sur pong_r2 : exit 2/REJET → **exit 0 / « INTÉGRITÉ : AUTHENTIQUE » + « VERDICT LOGICIEL :
  FAIL »**. Nouveau gate dur : un verdict affichant OK sur gate mutation rouge reste rejeté
  (formule verify_run.py:286, prédicat l.257, lus par la supervision). Doctrine dédupliquée
  (driver.py:1105 consomme `coherence_problems`). Gate mutation du driver intact.
  ② cause du non-dépôt de `game_loop` ÉTABLIE — « implémenté et non branché » :
  `studio_link.propose_brick` (l.563) sans aucun appelant, alors que `pending_review.mjs`
  documente cette file comme sa 5e source ⇒ **4e occurrence de « déclaré ≠ exécuté »,
  forme connecteur : lecteur câblé, écrivain sans appelant**. CORRIGÉ (mission V4,
  propose-only, dépôt uniquement si reçu code OK). Brique NON déposée : code FAIL.
  ③ arbitrage mutation SUSPENDU par Pierre en attente d'analyse — analyse LIVRÉE :
  répartition **binaire** des 68 survivants (3 systèmes 58/61 = 95 % · 7 adaptateurs
  0/65 = 0 %, intuables car les tests scellés n'importent que 05_SYSTEMS/) ; inclusion des
  adaptateurs = **effet de bord** de 2 filtres alors que repo_map.yaml:61-63 distingue déjà
  `system.adapter`. 3 options + voie triage documentées. **DÉCISION PIERRE ATTENDUE.**
  ④ pong_r2 CONSERVÉ comme référence historique (intact).
- **CHAÎNE DE DÉPENDANCE — à ne pas re-découvrir** : ③ non arbitré ⇒ gate mutation rouge ⇒
  reçu code FAIL ⇒ aucune proposition de brique ⇒ volet budget rouge ⇒ **Pong rouge**.
  ① et ② sont justes mais ne débloquent PAS Pong. `pong_r3` TENU EN ATTENTE (relancer avant
  ③ = même verdict pour ~14 $ / 40 min). Suite de tests de référence : **869 passed, 1 skipped**.
- **⚠️ SESSION PARALLÈLE ACTIVE** : `scripts/forge/adapters/godot/` + `fixtures/godot_b0/`
  créés cette nuit 02:08→02:24 par une autre session (specs `2026-07-26-godot-adapter-b0`).
  Travail mélangé dans le même arbre ⇒ committer par LOTS, et risque `git checkout` réactivé.
- **En suspens à la clôture** : 8 commits + tout le travail du jour NON POUSSÉS (gate DR-09) ·
  archivage 00_CURRENT_CONTEXT >100 lignes = DR-10 (différé, ne pas faire en passant) ·
  M01 : mission clean-pass à chiffrer si Pierre la veut · désynchronisation signalée non
  investiguée : `verdict.json` porte `triaged_survivors: []` alors que la liste des non-triés
  (57) exclut déjà les 3 sites triés.

## Session 2026-07-26 (Fable, suite) — Troisième Cerveau : décisions D1→D6 + pré-run TERMINÉ
- **D1→D6 tranchées par Pierre** (détail : `decisions/PROPOSED_2026-07-26_ratifications.md`,
  entrée THIRD_BRAIN_DECISIONS_V1) : D4 ratifications → decision-log versionné (skill `/gate`
  migré le jour même, DREAMS.md legacy) · D1 échelle 4 crans mécaniques · D3 sunset 30 j ·
  D6 commits 3 lots (fait) · D2 plafond ACCEPTÉ-valeur-différée · D5 injection mesurée
  ACCEPTÉE-exécution-différée. **Push non validé** (gate séparée).
- **Pré-run exécuté** : suppressions éditoriales appliquées (arbre de triage unique §7.5,
  roadmap canonique unique V1 §6, cran « optimisé » retiré) · `lab/forge_runs/RUN_INDEX.md`
  créé (append-only, entrée M1 pré-remplie) · mission AAA complète :
  `docs/forge/MISSION_M1_TELEMETRIE_ECHEC.md` (PRÉPARÉE, NON LANCÉE).
- **Docs cadres** : `docs/forge/THIRD_BRAIN_PROTOCOL_V1_PROPOSAL.md` (P0-P8, runbook §7,
  table de confiance §4.2) + `THIRD_BRAIN_V1_1_BRICKS.md` (5 briques). PROPOSED — la
  promotion au decision-log par Pierre vaudra ratification.
- **Prochaine étape** : go Pierre sur l'EXÉCUTION de M1 → puis 1 run réel observé → fixer
  valeur D2 → M2 (pool_retry) → M3 (jointure premortem) → exécution D5.
- **Décisions différées** : `decisions/DEFERRED.md` (12 entrées DR-01→DR-12, chacune avec
  rappel date/événement + question exacte) — relu à CHAQUE début de session (runbook §7.1.4) ;
  prochaine échéance datée : **2026-08-25** (DR-03, DR-05, DR-08, DR-10).
- **État attendu atteint : « pré-run terminé → première mission Forge prête ».**
- **Schéma maître réaligné** (`d08ddd6` + `ddcc44e`) : vision A·B·C studio, Détail I (troisième
  cerveau), Détail J (calendrier unique), **Détail H-bis = la vue de pilotage** (une case par
  élément en attente, accrochée au rail des jeux, code couleur décision/attente/prêt).
- **CLÔTURE SESSION 2026-07-26** : dépôt propre, master local = origin **+6 commits NON POUSSÉS**
  (push = validation Pierre, réveillera DR-09). Ouvert pour Pierre au JALON 0 : ① promotion
  decision-log (= ratification protocole) · ② go exécution M1 · ③ arbitrage M01 candidate ·
  ④ chantier s10s→driver (mission Forge à contractualiser). Prochaine session = dérouler le
  JALON 0 puis reprendre Pong sous standard (H-bis).

## Session 2026-07-26 (Fable) — CONSOLIDATION : 7 branches + 5 worktrees → `master` seul
- **Demande Pierre** : « je veux plus de branche du tout », dépôt « méga dirty » → démêler proprement.
- **Résultat** : une seule branche locale (`master`, 114 commits d'avance sur origin), worktree
  **propre (0 fichier sale)**, 5 worktrees TCS démontés. **Poussé le même jour sur go Pierre**
  (`87e9ec4..1481d6d`) ; le travail POST-consolidation (primitives, learning, THIRD_BRAIN)
  reste non commité.
- **Méthode zéro-perte** : 3 commits WIP de sauvegarde AVANT toute fusion (`8bcdf8a` principal —
  229 fichiers ; `d77fb30` godot-etape0 — Pong ; `b9ec14e` menagerie — le jeu du 11/07 qui
  n'existait QUE dans un worktree non commité). Aucun `checkout` sur du travail non sauvegardé
  (leçon `feedback_git_checkout_uncommitted_forge_work`).
- **5 conflits, TOUS résolus par addition/union — aucune version écartée** : `dispatch.py`
  (`run_dir` Context Manifest **+** `profile/attempt/allow_unprofiled` D1) · `run_real.py`
  (`premortem_section` **+** section PROJECT BIBLE) · `00_CURRENT_CONTEXT.md` (journaux fusionnés) ·
  `oracles.json` (17 **+** menagerie_tactics = 18) · `forge_project_proposals.jsonl` (ligne
  réinsérée à sa place chronologique).
- **Conflit SÉMANTIQUE invisible au merge textuel, attrapé par les tests** : `hook_guard.MARKER`
  était passé à 3 groupes (triplet `etape:run_id:attempt`, 3e optionnel) côté godot pendant que
  le côté 24/07 ajoutait l'injection automatique du marqueur 2-champs. Comportement fusionné
  correct (rétro-compat assumée, `attempt=0`) ; 2 tests comparaient des tuples de longueur figée
  → réécrits via `marker_key()`, intention préservée (unicité + valeurs). **`scripts/forge/tests/`
  modifié — à ratifier par Pierre.**
- **Preuves relancées sur master consolidé** : `pytest scripts/forge/tests/` = **810 passed,
  1 skipped** · `git status` = **0**.
- **⚠️ 10 commits Codex ORPHELINS trouvés** (audit sécurité 2026-05-28, F-001..F-028 : `search.rs`
  debug inconditionnel retiré, `ACTIVE_DATASET` UTF-16→UTF-8, `dataset_loader.py`, restructure
  MASTER_DOCS). Ils n'étaient dans AUCUNE branche → **protégés par le tag
  `archive/codex-audit-securite-2026-05`** (un tag, pas une branche). **Sort à trancher : Pierre.**
- **⚠️ Non touché volontairement (décision Pierre)** : les 2 worktrees Codex hors dépôt
  (`~/.codex/worktrees/db55` 3 fichiers sales · `dbdf` **1154 fichiers sales non examinés**) ·
  le stash `tcs-session-dirty` (artefacts lane STUDIO gelée, ne s'applique plus tel quel) ·
  les branches distantes `origin/*` (supprimer = push = gate).
- **⚠️ Constat non causé par la consolidation** : `cargo test --release` = **244 passed, 5 failed**
  (`regression_589s`, `s7_removed_italian_not_a1b1`, `s7_removed_mate_in_3_score`,
  `stalemate_root_returns_none_and_no_mate_score`, `mirror_ordering_real_penalty_...`).
  **Prouvé pré-existant** : aucun fichier `.rs`/`Cargo.*`/`tests/`/`benches/` ne diffère entre
  `origin/master` et HEAD ⇒ binaire testé strictement identique.
- **Défaut repéré au passage** : les tests Forge écrivent des manifests hors de `tmp_path`
  (`lab/forge_runs/_orphan_context/**` et un `context/` **à la racine du dépôt**), désormais
  commités. À corriger (fixture) ou à ignorer explicitement.

## Session 2026-07-25 (Fable, suite) — Context Loop GO implémenté (chemin ratifié Pierre)
- **Livré, testé, NON commité** : `scripts/forge/context_manifest.py` (2 kinds signés HMAC :
  dispatch = photo sources+contract_sha256+payload_prompt_sha256, execution =
  final_prompt_sha256+chars+premortem_sha256+budget) · `model_windows.json` (fenêtres à
  calibrer) · câblage best-effort dans `prepare_dispatch` + `claude_executor` (jamais
  bloquant, driver.py intact) · `verify_run` étendu (context_manifest_problems/notes,
  hors gates) · `context_check.mjs` advisory (diff+score FRESH/STALE_WARNING/
  STALE_CRITICAL/REQUIRES_REFRESH/NO_MANIFEST + budget + recommandations texte, exit 0).
- **Preuves relancées par l'orchestrateur** : pytest 516 passed (490+26) · node 34/34 ·
  intégration croisée sur sonde réelle : manifest signé (HMAC OK) → lu par le Node,
  dérive « wiremap added » → REQUIRES_REFRESH. Sonde _ctx_smoke supprimée.
- **Trou attrapé et corrigé en couture** : statut `added` absent de ma spec de score
  (FRESH à tort) → corrigé + 2 tests. Leçon : le test d'intégration orchestrateur entre
  deux agents parallèles reste obligatoire.
- **Prochaine étape (chemin Pierre)** : run Forge réel observé → mesurer les dérives
  réelles → ensuite seulement décider refresh auto / transcript / impact graph.
- **V2 Context Continuity (même jour, architecture seule)** :
  `docs/forge/CONTEXT_LOOP_V2_PROPOSAL.md` — 6 briques (refresh delta A · reads index B ·
  impact C · checkpoint handoff 4 · héritage contrôlé/Core Memory 5 · wiremap_nav 6),
  ordre recommandé : run observé → nav → B-lite → checkpoint → héritage → refresh → impact.
  Contrainte clé : pas de métrique fenêtre live en claude -p ⇒ handoff aux frontières
  d'activation (retry/escalade), checkpoint = état structuré falsifiable ≠ résumé.
  5 décisions D1-D5 en attente (D1 = ressusciter PROJECT_BIBLE en Core Memory ou supprimer).
- **D1-D5 RATIFIÉES Pierre (retour architecture, même jour)** : doc consolidé (§0 — trois
  mémoires courte/longue/forensic, pyramide de contexte, BIBLE/CORE_MEMORY/ARCHIVE séparés,
  ordre final : run observé → nav → checkpoint → sonde stream-json → core memory → refresh
  → impact). Brique 6 (wiremap_nav, D2 « GO maintenant ») lancée en construction.
- **Brique 6 LIVRÉE (même jour, non commitée)** : `scripts/forge/wiremap_nav.mjs` +
  39 tests verts (relancés orchestrateur) — requêtes avant/inverse validées sur les 2
  régimes réels (shmup_slice driver / card_engine prose « traçabilité réduite »),
  branchements checkpoint/manifest prêts (dormants faute de données), affichage modèles
  dédoublonné ×N. Découverte honnête : filtre startsWith capture shmup_slice_art
  (run voisin, affiché status=n/a, jamais inventé). Suite mjs complète : 244+39 verts.
- **Reste pour dérouler l'ordre D5** : choix Pierre du jeu/objectif du run observé (étape 0)
  + éventuel commit de sauvegarde (patch fiabilisation + context loop + nav, ~10 fichiers).
- **WHY (retour Pierre, même jour)** : évalué comme primitive du DISPATCH —
  `docs/forge/WHY_ACTIVATION_PRIMITIVE.md`. Découverte : champ 16 du schéma prévoyait
  déjà « pourquoi l'agent existe » et a dégénéré en topologie jamais rendue au prompt.
  Proposition : `why {type, ref falsifiable, text}` au dispatch + manifest + checkpoint ;
  pilote manuel au run observé (H1-H3, contre-exemple cherché). Décisions W1-W4 en attente.

## Session 2026-07-25 (Fable) — Agent Context Audit (pré-run, lecture seule)
- **Livré** : `docs/audit/AGENT_CONTEXT_AUDIT_2026-07-25.md` — bootstrap/runtime/persistent
  des agents Forge, 3 sous-agents contre-vérifiés. 8 écarts E1→E8.
- **Clés** : mandatory_read = consigne (s0→s6 sans outil Read) · prompt non versionné ni
  reconstituible · aucune trace de ce qu'un agent LIT (json only, pas de transcript) ·
  search KB : 5 requêtes historiques, toutes matchCount:0 · contrat/prompt modifiables
  post-validation (HMAC ne signe pas le contenu) · R2 = 1/3 corrigé (doublon marqueur
  run_real.py:520 + skill.md:82 périmé) · régime prose (16/21) hérite 494 allow/0 deny
  (git commit inclus) sans garde-fou code · seul canal mémoire→prompt : premortem.
- **En attente Pierre** : solutions E1→E8 (aucune codée — mission lecture seule).
- **Suite (même jour)** : mandat permanent « Architecte du contexte agentique » confié à
  Fable. Architecture livrée : `docs/forge/CONTEXT_LOOP_V1_PROPOSAL.md` (PROPOSED) —
  Context Manifest signé à la porte, context_diff + table CONTEXT_CONSUMERS, Integrity
  Check advisory, refresh ciblé driver, capture transcript opt-in. 5 décisions au §10
  (go étapes 1-3 · advisory vs futur gate · timing refresh · transcript · driver-only V1).
  Cas réel motivant : wiremap shmup_slice modifiée 4 j après son gel (mtimes 14/07 vs 18/07).
- **V1.1 Freshness (même jour)** : `docs/forge/CONTEXT_LOOP_V1_1_FRESHNESS.md` — audit
  CONTEXT_BUDGET (fenêtres modèles NOT_FOUND, tokens sommés post-appel, prompt total non
  plafonné, one-shot confirmé ⇒ fraîcheur cognitive = Source+Budget Freshness), score
  advisory FRESH/STALE_WARNING/STALE_CRITICAL/REQUIRES_REFRESH, arbitrage Pierre consolidé :
  GO manifest+prompt_sha256+integrity check advisory · ATTENTE refresh auto/transcript/
  impact auto. Périmètre GO exact au §7 — prêt à coder sur go.

## Session 2026-07-24 (Fable) — Audit branchements Forge (Phase 1 mission Pierre)
- **Livré** : `docs/audit/FORGE_AUDIT_BRANCHEMENTS_2026-07-24.md` — photographie complète
  Kernel/Workflow/Mémoire/Branchements, 4 sous-agents contre-vérifiés (2 claims corrigés).
- **Écarts majeurs** : driver adopté 5/21 runs (prose majoritaire, même après card_engine) ·
  `verify_run` jamais appelé par driver.py · hook forge fail-open sans marqueur auto-apposé ·
  capteurs visuels + s10d jamais branchés au verdict · selfaudit neutralisé au pre-commit
  (`|| true`, sortie jetée) · décisions Pierre du 20/07 enregistrées mais jamais appliquées ·
  seule boucle mémoire fermée = error_journal↔premortem.
- **En attente Pierre** : 8 arbitrages listés au §5 du rapport (dont go/no-go Phase 2
  rapports agents + choix du run observé Phase 3, et commit de sauvegarde des 203 fichiers).

## Session 2026-07-24 (Fable, suite) — Patch fiabilisation Forge V1 (go Pierre)
- **Livré, testé (490 passed, 1 skipped relancés par l'orchestrateur), NON commité** :
  R1 `verify_run` câblé dans `driver.py._run_verdict` (échec ⇒ s12 BLOCKED, 1 seul appel) ·
  R2 marqueur `FORGE_DISPATCH:<etape>:<run_id>` injecté par `contract.py._render_prompt`
  via `prepare_dispatch` (hook plus jamais désarmé par oubli sur le chemin de la porte) ·
  R3 pre-commit : selfaudit visible (`lab/reports/selfaudit_last.json` + résumé 1 ligne,
  toujours non bloquant) · R4 `scripts/forge/apply_decisions.mjs` (+17 tests) : marquage
  `review_status` des propositions depuis les décisions Pierre, dry-run par défaut,
  **`--apply` réel jamais exécuté** (attend go Pierre ; dry-run : 10 marquages, 1 orpheline).
- **Écart d'ingénierie à ratifier** : gate mutation de verify_run restreint aux verdicts OK
  (un FAIL légitime échouerait toujours `verify_mutation_receipt`) — HMAC/évidence/
  knowledge_trace restent des gates durs inconditionnels.
- **Prochaine étape** : go Pierre sur `apply_decisions --apply`, doctrine driver (option A
  recommandée), sort des 3 éléments passifs (s10d, PROJECT_BIBLE, .claude/agents côté Forge).

## Session 2026-07-23 (Opus, worktree `forge-godot-etape0`) — capteur branché, étapes 4 et 5 faites
- **Ordre ratifié de Pierre ÉPUISÉ (1→5)** : contrat de système · surfaces · source de vérité ·
  métriques+boucle · contrat de l'agent orchestrateur. Détail clos :
  `journal/context-archive-2026-07-23-capteur-metriques-orchestrateur.md`.
- En bref : `contract_sync` agrégé dans `studio_selfaudit` (un capteur qui ne peut pas tourner rend
  `non_evaluable` et FAIT ÉCHOUER — jamais de vert silencieux) · 4 dérives skill↔code résorbées ·
  coût/effort/pool dans le rapport de fin de run · `project_bible` injectée en s0 · index des
  journaux régénéré · 4 fonctions sans appelant branchées · `contracts/orchestrator.yaml` (RATIFIÉ).
- Chiffres inédits sortis du disque : `card_engine` = **1,81 M tokens / 12 appels / 8264 s** ;
  escalade réelle sur `shmup_slice` = haiku FAIL×2 → sonnet FAIL×2 → **opus OK×1**.
- 6 défauts silencieux trouvés en vérifiant (tautologie de budget, ligne JSONL tronquée qui aurait
  emporté le rapport d'un run réussi, `builder_id` non normalisé, docstring non tenue, décision en
  commentaire, mojibake `U+FFFD` sur JSON valide). Aucun ne levait d'erreur.
- **RATIFIÉ PIERRE 2026-07-23** : (a) séparation `orchestrator` (session) / `run_orchestrator`
  (agent, Opus) — « intention ≠ exécution » ; réserve NON implémentée : l'orchestrateur devra
  pouvoir descendre de tier. (b) **Aucune décision dans un commentaire** — champ structuré validé
  obligatoire, à appliquer aux contrats/wiremaps/registres. (c) Project Bible : promotion humaine
  gardée, « mémoire active mais pas auto-validée ». (d) Mémoire : cache local agent toléré, mais
  toute décision ratifiée doit avoir une représentation VERSIONNÉE, et une référence doit pointer
  vers une source réellement accessible. Entrées rédigées au format du log dans
  `studio_brain/decisions/PROPOSED_2026-07-23_ratifications.md` — **à promouvoir par Pierre lui-même**
  (le log dit « seul Pierre peut ajouter des entrées »).
- **OPENCLAW = LEGACY** (Pierre 2026-07-23) : « on travaille que claude et forge ». Forge SAINE —
  elle ne lit jamais `openclaw/capabilities.yaml` (toujours `caps_path=roles.yaml`, vérifié) ; ce
  chemin n'est que le défaut de `control_plane/registry.py:15`, consommé par la lane STUDIO gelée.
  MAIS deux skills **vivants** (pas dans les legacy gelés de `CLAUDE.md:128`) pointent dedans :
  **`/gate` écrit ses verdicts HumanGate** dans `studio/openclaw-workspace/DREAMS.md` et
  `/audit-daily` lit un `MEMORY.md` figé au 06-29. + 2 docs Forge étiquettent encore openclaw
  « SSOT studio » (`roles.yaml:3`, `SCHEMA.md:130`) — étiquette devenue fausse. Vérifié :
  `DREAMS.md` propre côté git, dernière entrée 07-09, aucun verdict n'y dort.
  ⚠️ **Collision à trancher** : `/gate` enregistre les décisions ratifiées **dans du legacy**, alors
  que la décision « toute décision ratifiée doit être versionnée dans le repo » exige l'inverse.
- **DÉRIVE STRUCTURELLE TROUVÉE — classée « correction d'architecture », pas un patch** : `CT-4`
  (2026-07-03) nomme `memory/MEMORY.md` comme référent canonique. Ce chemin **n'a jamais existé
  dans le dépôt** (`git log --all -- memory/` vide) : les 68 fichiers vivent hors projet, sans
  historique ni sauvegarde. Symétriquement `STUDIO_MEMORY.md` (racine, figé 06-04) EST versionné et
  CT-4 ne le mentionne pas — seul orphelin réel (l'autre candidat, `studio/openclaw-workspace/
  MEMORY.md`, est du legacy assumé depuis la décision openclaw ci-dessus, pas un référent à
  réconcilier). Le référent vivant est donc hors dépôt et sans sauvegarde, alors que CT-1 du même
  jour versait `studio_brain/` justement contre le bus-factor-1.
- **LA CAPACITÉ D'AUDIT N'EST PAS CONSULTÉE** (mesuré 2026-07-23) : des 5 capteurs déterministes,
  **un seul a un lanceur automatique** — `studio_selfaudit` dans `.claude/hooks/pre-commit`, avec
  `>/dev/null 2>&1 || true` (sortie muette, code de retour jeté). `master_index` — celui qui
  signalait la dérive `memory/` — n'est lancé par RIEN. `pending_review` non plus. Le problème
  n'est pas la perte de la capacité, c'est l'absence de lecteur. Priorité 2 de Pierre.
- **INDEX RÉGÉNÉRÉS** (priorité 1) : `AGENT_CONTEXT_MAP` et `MASTER_INDEX` étaient périmés sur ≥6
  points (3 contrats absents + 3 contrats modifiés depuis, dont `s0-contrat` et ses champs
  design-intent). Régénération idempotente vérifiée. **670 passed, 3 failed pré-existants.**
- **RESTE OUVERT** : promouvoir `pending_review_decisions.jsonl` vers le ledger (écriture durable ⇒
  gate Pierre) ; `generate_journal_index` embarque un chemin absolu (signalé, non corrigé) ;
  `lab/reports/error_journal/INDEX.generated.md` non suivi par git — à tracker ou à ignorer.
- **PRIORITÉ PIERRE POUR LA SUITE** : (1) stabiliser contrats + index + sources de vérité ;
  (2) garder la capacité d'audit ; (3) avancer vers le premier jeu avec la chaîne complète.
- Détail du 2026-07-22 (STANDARD, run Pong, contrat de système) :
  `journal/context-archive-2026-07-22-standard-pong-contrat.md`.

## Session 2026-07-21 (Opus) — Forge V0 : Godot devient le 1er backend certifie
- **Ratifie Pierre** : Godot = runtime canonique de la Forge. Le contrat `role` reste la
  FRONTIERE (aucun moteur nomme). Concept central : **substituabilite certifiee** — une
  implementation est substituable si, sous LA MEME simulation_config et LES MEMES graines,
  sa bande mesuree retombe dans la bande declaree. Prouvee par mesure, jamais affirmee.
  Pas de portage Unity/Unreal maintenant ; contrats ouverts aux futurs runtimes, fail-closed.
- **Ou vit le travail** : worktree `.claude/worktrees/forge-godot-etape0`, branche
  `feat/forge-godot-etape0`, **24 commits, RIEN DE POUSSE**. Spec + plan versionnes dans
  `docs/superpowers/{specs,plans}/2026-07-21-forge-godot-etape0*`.
  Journal detaille : `.superpowers/sdd/progress.md`.
- **Constat qui a change l'ampleur** : l'infra Godot existait deja (games/chess_tcg,
  harnais headless 83/83 avec garde EXPECTED_ASSERTS ; `.gd` deja dans static_oracles).
  Il manquait 3 choses, toutes livrees : mutation GDScript, solvabilite, cablage.
- **LIVRE** : resolveur de binaire Godot · adaptateur `godot_trial.mjs` (role_sim.mjs INTACT,
  aucun couplage moteur) · mutation.py comprend and/or + ==/!= + `#` comme commentaire ·
  kb-validate ouvre le code Godot (R6) et voit les impuretes GDScript (R10) · champ
  `learned_from` · garde fail-closed `simulation_runtime` · brique M01 + contrat de role ·
  oracle de solvabilite R9 Godot · verdict signe **verify_run = AUTHENTIQUE (exit 0)** ·
  instrumentation d'apprentissage + protocole `external_sources/`.
- **Contrat Forge cree** : `scripts/forge/contracts/s9-build-godot.yaml`, valide par la porte
  `prepare_dispatch`. Porte verifiee cryptographiquement (etape/run_id inventes = BLOQUES).
  Ecart connu : le hook est fail-OPEN sans marqueur `FORGE_DISPATCH`.

### DECISION EN ATTENTE DE PIERRE
Le verdict est **AUTHENTIQUE** mais porte objection : `decision=HUMANGATE_READY_WITH_OBJECTION`,
`is_clean_pass=FALSE`. Or `verdict.py:196` fait de `is_clean_pass` le SEUL predicat autorise
pour promouvoir. Le plan demandait `tier=validated` -> **conflit plan vs doctrine**.
**Defaut applique : la brique reste `candidate`, `proof_of_use=null`.** A trancher.

### BLOQUEUR TECHNIQUE OUVERT (revue finale, CRITIQUE)
**La solvabilite R9 est une TAUTOLOGIE.** `solvability.gd:111` : le generateur de labyrinthe
appelle `GridNav.path_length` — LA BRIQUE TESTEE — et creuse un repli jusqu'a ce qu'un chemin
existe, avant de rendre le labyrinthe ; le bot le parcourt ensuite avec le meme BFS.
`succeeded` ne peut etre faux que si `next_step` contredit `path_length`. "50/50 gagnes" ne
prouve donc PAS "un bot gagne vraiment". Meme defaut dans `trial.gd` (branche `path_len < 0`
morte) => le "300/300" du role_sim est aussi garanti par construction.
**Correctif requis avant tout claim R9** : le generateur ne doit pas consulter la brique ;
des instances reellement injouables doivent exister ; `succeeded=false` doit etre ATTEIGNABLE.
Autres findings importants : couplage moteur (`godot_project`/`godot_script`) DANS
`simulation_config` cense etre agnostique ; log de validation role_sim non scelle (chiffres
transcrits a la main dans le verdict) ; bande ternaire {26,30,34} qui mesure le regime de
graines plus que la capacite.

### Prochaine etape
Corriger la tautologie R9, puis re-mesurer, puis revenir au gate de promotion.

## Sessions 2026-07-19/20 (stratégie · Forge V2 · auto battler) — archivées
Archive complète : `journal/context-archive-2026-07-19-20-strategie-forge-v2.md` — mode commandement,
audit couche décisionnelle, Knowledge Resolver V1, Run A card_engine accepté, mission Forge V2 (§4-A
exécuté, R9/R1/R3/R2/R6/R7/R8), audits R10 et BAS V1/V2, les 8 gates tranchées + 7 commits ;
incrément 2 auto battler forgé et mergé.

## Session 2026-07-19 (déploiement Belote) — 1er build studio PUBLIÉ
**https://belote-claude.onrender.com** live, committé+poussé `8d4145f`, PWA installable Android
confirmée par la joueuse réelle. Détail + limite acceptée (bande de geste Android) :
`llm-lego/experiments/belote-claude/JOURNAL_ERREURS.md` (Partie 4) + mémoire `belote_render_deploy`.

## Sessions 2026-07-18/19 (stratégie · audit méta · auto battler) — archivées
- `journal/context-archive-2026-07-19-strategie.md` — « déclaré ≠ exécuté » au niveau PRODUIT,
  mode figé RATIFIÉ (Fable/Opus/Sonnet), **triage v2 exécuté mais NON COMMITÉ** (gate Pierre ;
  ne pas restaurer le ledger via checkout).
- `journal/context-archive-2026-07-19-audit.md` — 3 strates mortes, capteur `declaration_readers.mjs`,
  doctrine Declared→Referenced→Executed→Verified.
- `journal/context-archive-2026-07-18.md` — architecture 16 bibles auto_battler RATIFIÉE, run Forge
  `auto_battler_i1` s0→s12 mergé (`44592b3`).

## Impasses / doctrine (portées)
- LEDGER canonique = `lab/chains/IMPROVEMENT_LEDGER.yaml` ; écrire via `kaizen_loop.py`.
  `settings.json` : `Write/Edit(lab/chains/**)` en **ask** (mitigation IMP-247) — attendu, pas un bug.
- **Forge** : `is_clean_pass()` = seul prédicat de passage propre ; `software_verdict` seul ≠ signal de promotion ;
  survivant mutation trié = objection, jamais READY propre. Recette d'audit : `grep -rn 'software_verdict.*==.*OK'`.
- `train.py` gelé (Rocky = GEL). Serveur builder : `node demo-server.ts` :3000.
- Une variable à la fois · fondations avant features · **aucun commit/push sans go explicite Pierre**.
