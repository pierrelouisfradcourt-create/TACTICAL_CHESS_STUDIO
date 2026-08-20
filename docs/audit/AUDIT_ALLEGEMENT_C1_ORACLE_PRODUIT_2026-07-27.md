# Audit C1 — Oracle produit (Pierre) vs état réel de la chaîne Pong, et chemin du colis Godot

- **Date** : 2026-07-27
- **Contrat** : `scripts/forge/contracts/c1-audit-oracle-produit-colis.yaml`
- **git_head** : `52842df3282139645f37d1e9e6ace6b88c948dbd`
- **Méthode** : lecture de fichiers + `grep` sur `scripts/forge/*.py` et `*.mjs` (aucun oracle ne référence `capture_browser`/`capture_godot`/`godot_oracle` hors du présent contrat et du contrat s10d) + **ré-exécution en lecture seule** de `capture_browser.mjs` et `capture_godot.mjs` ce jour (seules écritures : `games/pong/06_RUNTIME/adapters/presentation/shots/*` — fichiers déjà trackés, contenu écrasé à l'identique, déclaré ci-dessous).
- **Rôle** : architecture d'oracle produit, posture release engineering. Aucune construction.
- **Verdicts** : `software_verdict: OK` · `evidence_verdict: MECHANICAL_VALIDATION_ONLY` · `claim_verdict: NO_CLAIM_ALLOWED`

---

## 0. Résumé en une phrase

L'oracle Forge actuel prouve que la **logique pure** de Pong (boot/input/partie/restart, en appelant `boot()`/`step()` directement en Node, hors de tout runtime réel) est saine et que deux scripts de capture pixel existent et **fonctionnent** (ré-vérifié ce jour, y compris Godot en fenêtre GPU réelle) — mais **aucun** de ces éléments n'est branché à un gate automatisé, et **rien** dans le repo ne prouve qu'une partie tourne 10-30 s dans le runtime réellement livré (navigateur ou fenêtre Godot) ; le « colis Godot » n'existe même pas en germe : l'adaptateur Godot de Pong est un harnais de capture d'un seul état figé, pas un jeu jouable, et aucun export (templates, preset, binaire) n'est présent sur ce poste.

---

## 1. Matrice des 6 exigences produit (Pierre)

Convention : la case « ce qui la prouve aujourd'hui » distingue **rien** / **outil existant non branché** / **gate actif**, comme demandé par le garde-fou (1) — dire crûment « rien » est le résultat le plus utile.

| # | Exigence Pierre | État de preuve aujourd'hui | Outil | Fichier:ligne |
|---|---|---|---|---|
| 1 | **Lancement réussi** | Outil existant non branché en gate produit. Preuve disponible = `core.boot` en **logique pure** (`boot()` appelé directement en Node, jamais via le vrai `index.html` ni la vraie scène Godot). Aucun test ne lance réellement `browser/index.html` dans un navigateur ni la scène Godot en mode jouable. | `bootReachesInitial()` dans `solvability.mjs`, exécuté comme partie du gate mutation (`test_argv`) | `games/pong/07_TESTS/oracle/solvability.mjs:107-116` (fonction) ; exécution tracée dans `lab/forge_runs/pong/verdict.json:175-180` (`solvability.checked/passed:true`) — **aucune ligne** ne relie ce résultat au requirement `core.boot` du standard |
| 2 | **Rendu visible** | Outil existant non branché en gate. Ré-exécuté manuellement **ce jour** (2026-07-27, hors périmètre du run `pong_r2` d'hier) : capture Godot **réelle** (fenêtre GPU Vulkan, RTX 5080, `PONG_CAPTURE ... err=0`) produit 2 PNG différents, non-monochromes ; capture « navigateur » = **rasterisation logicielle du même `drawState()`**, **pas** un Chrome réel (le fichier le dit lui-même). | `capture_browser.mjs`, `capture_godot.mjs` | `games/pong/06_RUNTIME/adapters/presentation/capture_browser.mjs:1-6` (note d'évidence explicite « ce n'est pas une capture d'un Chrome reel ») ; `capture_godot.mjs:1-6` ; aucun appel depuis `scripts/forge/driver.py` ni `scripts/forge/standard_oracles.py` (grep vide sur les deux fichiers) |
| 3 | **Interactions fonctionnelles** | Prouvé seulement en **logique pure** (une action modifie `p1.y` en appelant `step()` directement) ; jamais testé via un vrai événement DOM (`keydown`) ni un vrai `InputEvent` Godot. | `inputMovesPaddle()` dans `solvability.mjs` | `games/pong/07_TESTS/oracle/solvability.mjs:82-94` |
| 4 | **Progression d'une partie** | Prouvé en **logique pure** : deux bots jouent jusqu'à la fin (`game_finishes`, `winner_defined`, `end_never_undefined` tous vrais). **Rien** ne prouve une partie **auto de 10-30 s dans le runtime réel** (navigateur ou fenêtre Godot) avec captures/logs échelonnés dans le temps — la boucle `solvability.mjs` tourne jusqu'à 200 000 ticks en boucle Node synchrone, sans notion de temps réel ni de fenêtre. | `playFullGame()` dans `solvability.mjs` | `games/pong/07_TESTS/oracle/solvability.mjs:36-78` |
| 5 | **Absence de crash** | Partiel : codes de sortie vérifiés pour les scripts de capture (`saveErr`, `status===0`) et pour le harnais de solvabilité (exit 0/1 sur `report.passed`). **Aucune session longue observée** (pas de run 10-30 s dans un runtime réel qui pourrait planter en cours de route — seul un aller-retour instantané `--state`→PNG→quit existe côté Godot). | `runGodot()` dans `capture_godot.mjs` ; CLI de `solvability.mjs` | `capture_godot.mjs:26-45` ; `solvability.mjs:141-146` |
| 6 | **Évolution d'état observable** | Prouvée séparément côté logique (`state_always_valid`, `score_exactly_one_per_point` dans `solvability.mjs:125-134`) ET côté pixel (deux captures qui diffèrent, `wiremap.json:107`) — mais ces deux preuves ne sont **jamais combinées par du code** ; le lien « l'état qui change fait changer le pixel qui change » n'est vérifié que par de la **prose** dans le wiremap, pas par un oracle. | `solvability.mjs` (état) + `capture_*.mjs` (pixel), aucun connecteur | `games/pong/09_WIREMAP/wiremap.json:99-109` (champ `preuve`, texte libre) |

**Lecture d'ensemble** : les 6 exigences ont un embryon de preuve, mais **toutes** reposent soit sur la logique pure découplée du runtime livré (1,3,4,6 côté état), soit sur des scripts jamais lus par un gate (2,6 côté pixel). Aucune ne satisfait le critère memoire de Pierre — « la balle apparaît-elle, se déplace-t-elle, le score évolue-t-il, une partie auto de 10-30 s se déroule-t-elle » — de bout en bout dans le jeu **tel qu'il serait livré**.

---

## 2. Inventaire des briques d'oracle produit — échelle Declared / Referenced / Executed / Verified

Échelle : **D**éclaré (existe dans un contrat/doc) · **R**éférencé (cité par un autre fichier réel — wiremap, mutation, driver) · **E**xécuté (a tourné, preuve sur disque) · **V**érifié (son résultat est lu par un gate qui peut faire échouer un verdict).

| Brique | D | R | E | V | Détail |
|---|---|---|---|---|---|
| `capture_browser.mjs` | ✅ | ✅ | ✅ | ❌ | Cité dans `wiremap.json:105` (fichiers de `core.render`) et dans `mutation_pong_r2.json` (`logic_files`, sert seulement à la **mutation** du code, pas à vérifier son résultat) — ré-exécuté ce jour, `passed:true`. Aucun `driver.py`/`standard_oracles.py` ne lit sa sortie JSON (grep vide). |
| `capture_godot.mjs` | ✅ | ✅ | ✅ | ❌ | Idem `capture_browser.mjs`. Le `wiremap.json:107` documentait hier (`pong_r2`, 2026-07-26T19:51Z) « GODOT non re-exécutable sur ce poste » (aucun `godot.config.json`). **Ce fait est aujourd'hui périmé** : `scripts/forge/godot.config.json` existe (créé 2026-07-27 02:04, gitignoré — `.gitignore:168`), pointe vers un binaire réel, et la ré-exécution de ce jour a réussi (fenêtre Vulkan RTX 5080, exit 0, 2 PNG différents). Toujours **non branché** à aucun gate. |
| `raster.mjs` / `draw.mjs` | ✅ | ✅ | ✅ | — | Librairies support de `capture_browser.mjs`, pas des oracles autonomes. |
| `godot_bin.mjs` | ✅ | ✅ | ✅ | ✅ (dans son propre périmètre) | Seule brique de cette liste qui fonctionne **de bout en bout aujourd'hui** : résolution `GODOT_BIN`→config→erreur explicite, utilisée avec succès par `capture_godot.mjs` (ce jour) — mais « vérifié » veut dire ici « fait ce qu'il promet », pas « branché à un verdict produit ». |
| `godot_oracle.mjs` (+ `solvability_godot.mjs`, `run_tests.gd`) | ✅ | ⚠️ | ❓ | ❌ | Code présent, appelle `resolveGodotBin()` correctement (`godot_oracle.mjs:12,26`). **Non applicable au projet Godot de Pong** : ce harnais attend `res://tests/run_tests.gd` et `res://solvability.gd` dans le projet cible (`godot_oracle.mjs:17-18`) — le projet Godot de Pong (`games/pong/.../godot/`) ne contient que `main.gd`/`main.tscn`/`project.godot`, aucun `tests/`. Jamais appelé par `driver.py`/`run_real.py` (grep sur les deux fichiers : aucun call-site, seulement un commentaire qui le nomme, `run_real.py:174`). Pas ré-exécuté dans cet audit (aurait échoué immédiatement, hors périmètre de vérifier un outil inapplicable au sujet). |
| `s10d-oracle-visual` (`quality_sensor/collect.mjs`, capteur visuel A1/A2/A3/A5) | ✅ | ✅ | ✅ (historique, 26 fichiers `visual_mechanical.json` selon l'audit du 24/07) | ❌ | Le contrat **s'auto-déclare** hors chaîne : `scripts/forge/contracts/s10d-oracle-visual.yaml:5-8` — « ANNEXE ADVISORY... absente de CHAIN/ORDER, non câblée au driver ». Confirmé par `docs/audit/FORGE_AUDIT_BRANCHEMENTS_2026-07-24.md:37,68` (« PASSIVE... zéro branchement au verdict »). Non ré-exécuté ici (advisory hors périmètre du produit gaté, et l'audit du 24/07 fait déjà foi sur son statut structurel, qui n'a pas changé — aucun call-site nouveau trouvé aujourd'hui). |
| `verify_run.py` (re-vérification HMAC) | ✅ | ✅ | ✅ | ✅ | **Changement depuis le 24/07** : l'audit `FORGE_AUDIT_BRANCHEMENTS_2026-07-24.md:21` notait `verify_run` PASSIVE (jamais appelé par `driver.py`). Aujourd'hui `driver.py:94,1089-1137` importe et **appelle** `verify_run()` dans `_run_verdict`, et `lab/forge_runs/pong/state.json` (`s12-verdict.detail.verify_run: "AUTHENTIQUE"`) le confirme exécuté sur le dernier run. Hors périmètre exact de cette matrice (ne prouve pas les 6 exigences produit) mais change la photo de fiabilité du kernel — noté pour éviter une régression de lecture par rapport à l'audit précédent. |
| Chantier parallèle `scripts/forge/adapters/godot/*` + `fixtures/godot_b0/` + `lab/forge_scenes/bouncing_ball/` + `missions/bouncing_ball/mission.yaml` | ✅ (spec `PROPOSED`, HumanGate en attente — `docs/superpowers/specs/2026-07-26-godot-adapter-design.md:5`) | ✅ (code + tests `.test.mjs` réels sous `scripts/forge/adapters/godot/`) | ✅ (`lab/forge_scenes/bouncing_ball/attempt_001/report.json` + `stdout.log`/`stderr.log` existent sur disque — au moins une tentative réelle a tourné) | ❌ | **Inventorié sans y toucher**, conformément au périmètre. Le verdict du spec lui-même (`docs/superpowers/specs/2026-07-26-godot-adapter-design.md:482`, « `software_verdict: BLOCKED` — aucun code écrit ni exécuté ») est **déjà périmé** : du code et une tentative existent maintenant. Pertinence directe pour le §3 : ce chantier construit une primitive générale « lancer Godot en fenêtre, journaliser des events, écrire un `report.json` typé » — exactement le manque identifié en §3 étape 3 — mais rien n'indique qu'il cible Pong ni qu'il est ratifié. À ne pas dupliquer sans vérifier son état auprès de la session qui le porte. |
| Playwright (navigateur réel) | ❌ | — | — | — | **Non installé pour cette lane.** `playwright`/`playwright-core` n'existent que dans `llm-lego/node_modules/` (projet distinct, sans rapport avec Pong/Forge). Aucun `package.json` à la racine du repo. Confirme la mémoire de session : ne pas présumer Playwright disponible. |

---

## 3. Chemin minimal vers un oracle produit exécutable en gate (navigateur ET Godot)

Ordonné, chaque étape suppose la précédente faite. Coûts en **ordres de grandeur heures-session**, pas des promesses.

| # | Étape | Coût | Notes |
|---|---|---|---|
| 1 | Brancher les résultats JSON de `capture_browser.mjs`/`capture_godot.mjs` dans `standard_oracles.py` (ou un nouveau module `render_oracle.py`) : lire `passed`/`differ`/`colorsA`/`colorsB`, écrire un champ signé dans `verdict.json` (comme `code`/`standard`), faire échouer `core.render` si `passed:false`. | ~1-2 h | Les deux scripts fonctionnent déjà (ré-vérifié ce jour) — c'est un branchement, pas une construction. |
| 2 | Décider et documenter le statut de la capture « navigateur » : soit assumer que le profil `standard` ne teste jamais un vrai Chrome (rasterisation logicielle = décision produit, coût 0, mais **à écrire explicitement**, pas comme un non-dit), soit installer Playwright **dans un scope dédié** (nouveau `package.json` sous `games/pong/` ou `scripts/forge/`, pas à la racine) et écrire un vrai capture headless Chrome. | 0 (option a) / ~0,5-1 j (option b) | Option (b) implique `npm install` — **hors périmètre de cet audit**, nécessite un go Pierre explicite (règle CLAUDE.md : jamais d'installation par un sous-agent sans validation). |
| 3 | Ajouter un harnais « partie auto 10-30 s dans le runtime réel » : côté Godot, réutiliser/adapter le motif `Forge.log_event()` + `harness.gd` du chantier `godot_b0` (si ratifié) pour faire tourner `main.tscn` en mode jouable N ticks/secondes, journaliser `event_log.json`, capturer plusieurs frames dans le temps (pas un seul état figé) ; côté navigateur, un script qui boucle `step()` avec un vrai minuteur (`setInterval`/horloge murale) et journalise les mêmes événements. | ~0,5 j (Godot, réutilisation) + ~1 j (navigateur, à écrire) | Le projet Godot actuel (`main.gd`) n'a **aucune boucle de jeu** — il dessine un état donné en argument et quitte (`main.gd:24-39,95-108`). C'est un renderer d'un instantané, pas un jeu qui tourne. Cette étape est donc la plus lourde : elle demande une vraie boucle `_process()`/input Godot, absente aujourd'hui. |
| 4 | Brancher le tout au verdict signé comme un oracle **gaté** (pas advisory comme s10d) : status/evidence_path/evidence_sha256 sur le modèle de `code`/`standard`. | ~2-4 h | Réutilise le patron déjà en place dans `verdict.json` pour les autres oracles. |
| 5 | Non-régression : cas où Godot n'est pas configuré sur le poste doit rendre `BLOCKED` explicite (pas un FAIL silencieux, pas un vert par défaut) — motif déjà présent dans `capture_godot.mjs:53,59` (`blocked:true`) à faire remonter fidèlement au verdict. | ~1-2 h | Doctrine déjà correcte dans le code existant (`godot_oracle.mjs` : « jamais de vert par défaut ») — à ne pas régresser en le câblant. |

**Total ordre de grandeur** : ~2-4 jours-session pour un oracle produit minimal couvrant les 6 exigences en navigateur ET Godot, **hors** installation Playwright (optionnelle, séparée, gate Pierre requis) et **sous réserve** que le chantier `godot_b0` soit ratifié à temps pour être réutilisé côté étape 3 (sinon, écrire un harnais Godot minimal ad hoc pour Pong coûte sensiblement plus — ordre de grandeur +0,5-1 j, faute d'avoir observé son API stabilisée).

---

## 4. Chemin minimal du colis Godot

### Définition falsifiable du « colis »

Un **colis Godot pour Pong** = un artefact ouvrable sur une machine vierge (sans Godot installé) : concrètement un dossier ou une archive zip contenant un exécutable Windows autonome (`pong.exe`) + son fichier de données (`pong.pck`, ou embarqué dans l'exe), produit par `godot --headless --export-release "Windows Desktop" <chemin>.exe`. Critère de réussite : double-clic sur `pong.exe` sur une machine sans Godot → une fenêtre de jeu s'ouvre et affiche un rendu. C'est un fichier précis qu'on peut ouvrir, pas un concept.

### Existant (vérifié ce jour)

- Godot 4.6.3 console configuré et **fonctionnel** sur ce poste (`scripts/forge/godot.config.json`, re-testé avec succès).
- Un projet Godot minimal pour Pong existe (`games/pong/06_RUNTIME/adapters/presentation/godot/{project.godot, main.gd, main.tscn}`), **mais ce n'est pas un jeu jouable** : `main.gd` lit un état JSON passé en argument, dessine **une seule frame**, capture un PNG et quitte (`main.gd:24-39,95-108`). Aucune boucle `_process()`, aucun `Input`, aucune notion de partie qui avance dans le temps.

### Manquant, chiffré maillon par maillon

| # | Maillon manquant | Preuve d'absence | Coût |
|---|---|---|---|
| 1 | **Un vrai jeu jouable en continu** dans `main.tscn`/`main.gd` (boucle `_process()`, lecture `Input`, avance de la balle/raquettes en temps réel) — actuellement un renderer d'instantané figé. | `main.gd:24-108` relu intégralement : aucune fonction de boucle, `_ready()` dessine et appelle `get_tree().quit(0)` en fin de `_capture()`. | ~0,5-1 j (la logique de jeu existe déjà en JS pur dans `05_SYSTEMS/` — portage GDScript ou ré-implémentation minimale) |
| 2 | **Export templates Godot 4.6.3 installés** — nécessaires pour tout `--export-release`/`--export-debug`. | Vérifié ce jour : `%APPDATA%\Godot\export_templates\` **existe mais est vide** (aucun sous-dossier de version). | ~15-30 min (téléchargement officiel, plusieurs Go) — **nécessite un go Pierre explicite** (téléchargement de fichier, catégorie « explicit permission required » de la doctrine de session), non fait dans cet audit. |
| 3 | **Un `export_presets.cfg`** déclarant une cible (« Windows Desktop »). | Vérifié ce jour : recherche `export_presets*` dans `games/pong/.../godot/` → **aucun résultat**. | ~30 min-1 h (édition manuelle ou via l'éditeur Godot, une fois (2) fait) |
| 4 | **Un export réellement lancé et vérifié** (`godot --headless --export-release ...`), avec preuve d'exécution (exe non vide, taille, lancement réel sur ce poste). | Jamais tenté dans ce repo — `grep 'export-release\|export_presets'` sur les `.mjs`/`.py`/`.gd` ne renvoie rien en dehors de ce rapport. | ~30 min (une fois 1-3 faits) |
| 5 | **Un script d'emballage reproductible** (`package.mjs` ou équivalent) qui automatise (3)+(4), zippe, calcule un sha256, écrit un manifest — pour que le « colis » soit un artefact vérifiable et rejouable, pas un geste manuel one-off. | N'existe nulle part (`grep 'export_presets\|--export-release'` vide sur tout le repo). | ~2-3 h |
| 6 | **Test machine vierge** : lancer l'exe produit sur un poste/VM sans Godot installé, pour confirmer l'autonomie réelle du colis. | Non fait (pas de VM mobilisée dans cet audit). | Variable selon disponibilité d'une VM — non chiffrable sans savoir quelle machine est prévue |

**Total ordre de grandeur** : ~2-3 jours-session pour un premier colis Godot minimal et reproductible, **dont une étape (2) est bloquée sur une permission explicite de Pierre** (téléchargement des export templates) — c'est le seul maillon qui n'est pas purement une question de temps de session.

**Point de vigilance transversal** : le chantier `godot_b0` (§2) construit un « adaptateur runtime » Godot général (missions/attempts/reports), mais son périmètre déclaré (`docs/superpowers/specs/2026-07-26-godot-adapter-design.md:424-429`, « hors périmètre ») **exclut explicitement** tout export release — il ne raccourcit donc **aucune** des 6 étapes ci-dessus. Les deux chantiers (oracle produit §3 et colis §4) sont indépendants du chantier parallèle sur ce point précis.

---

## 5. Faits notables re-vérifiés dans cette session (2026-07-27), distincts des audits précédents

1. **Le fog Godot du run `pong_r2`** (`wiremap.json:107`, daté d'hier 19:51 UTC : « aucun binaire Godot configuré sur ce poste ») **est résolu** — `godot.config.json` a été créé ce matin (02:04) et la capture Godot fonctionne réellement (fenêtre GPU Vulkan confirmée, RTX 5080, exit 0). Ce fait n'était pas connu au moment où le wiremap a été écrit.
2. **`verify_run` est maintenant appelé par `driver.py`** (`driver.py:94,1089-1137`), corrigeant l'écart R1 documenté dans `FORGE_AUDIT_BRANCHEMENTS_2026-07-24.md:21,79`. Confirmé par `state.json` (`verify_run: "AUTHENTIQUE"`).
3. **Aucun changement** détecté sur le statut « jamais branché » de `capture_browser.mjs`/`capture_godot.mjs`/`godot_oracle.mjs`/s10d — toujours vrai aujourd'hui (grep vide sur `scripts/forge/*.py`).

---

## 6. Doutes / questions (garde-fou 7)

- Le binaire Godot configuré (`Godot_v4.6.3-stable_win64_console.exe`) pèse **198 152 octets** sur disque — anormalement petit pour un binaire Godot complet (généralement >100 Mo). Il **fonctionne** (Vulkan initialisé, capture réussie), donc ce n'est pas un blocage, mais la taille est surprenante — possible lien/stub NTFS ou build spécifique. Signalé sans affirmation, à confirmer si quelqu'un s'interroge sur la portabilité de ce binaire vers une autre machine.
- Le chantier `godot_b0` a un `report.json` d'au moins une tentative réelle (`lab/forge_scenes/bouncing_ball/attempt_001/`) alors que le document de spec associé affiche encore `software_verdict: BLOCKED — aucun code écrit ni exécuté`. Ce n'est pas contradictoire en soi (le spec a été écrit avant l'implémentation), mais cela signifie que **le statut vivant de ce chantier n'est pas dans ce repo au même endroit que sa spec** — à signaler à la session qui le porte, pas à corriger ici (hors périmètre).

---

## 7. SKIPPED_VALIDATION

- **Item** : ré-exécution de `godot_oracle.mjs` sur le projet Godot de Pong. **Où** : `scripts/forge/godot_oracle.mjs`. **Statut** : non fait. **Raison** : le projet Godot de Pong n'a pas de `tests/run_tests.gd` ni de `solvability.gd` — l'outil est conçu pour une autre topologie (type `chess_tcg`/`s9-build-godot`) et échouerait immédiatement pour une raison déjà connue (inapplicabilité), pas pour informer l'audit.
- **Item** : ré-exécution du capteur `s10d` (`quality_sensor/collect.mjs`). **Où** : `scripts/forge/contracts/s10d-oracle-visual.yaml`. **Statut** : non fait. **Raison** : advisory, hors périmètre gate produit ; son statut structurel (« jamais branché ») est déjà établi par l'audit du 24/07 et aucun call-site nouveau n'a été trouvé aujourd'hui — le re-tester n'aurait rien changé au verdict de branchement.
- **Item** : installation ou test de Playwright. **Où** : n/a. **Statut** : non fait. **Raison** : interdit explicitement par le périmètre du contrat (aucune installation).
- **Item** : téléchargement/installation des export templates Godot, écriture d'un `export_presets.cfg`, lancement d'un export réel. **Où** : §4. **Statut** : non fait. **Raison** : hors périmètre (aucune construction, aucun téléchargement sans gate Pierre) — chiffré, pas exécuté.
- **Item** : test « machine vierge » du colis. **Où** : §4 point 6. **Statut** : non fait. **Raison** : nécessite un artefact qui n'existe pas encore (dépend de tous les points précédents) et une VM non mobilisée dans cet audit.

Rien d'autre n'a été sauté par rapport au périmètre demandé.

---

## Contrat de sortie

```
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

`software_verdict: OK` porte sur la **complétude de cet audit** (matrice 6/6 renseignée, inventaire D/R/E/V sans case vide, deux chemins minimaux chiffrés, re-vérifications mécaniques effectuées et documentées) — **pas** sur l'état du jeu Pong ni sur l'existence d'un oracle produit ou d'un colis, qui sont tous deux **absents** aujourd'hui.
