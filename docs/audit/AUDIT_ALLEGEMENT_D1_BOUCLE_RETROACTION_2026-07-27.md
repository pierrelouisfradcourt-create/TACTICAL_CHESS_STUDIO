# Audit D1 — Boucle de rétroaction : flux d'information, pas état du jeu

- **Date** : 2026-07-27
- **Contrat** : `scripts/forge/contracts/d1-audit-boucle-retroaction.yaml` (marqueur
  `FORGE_DISPATCH:d1-audit-boucle-retroaction:d1_audit_boucle:0`)
- **Posture imposée** : auditeur de système de contrôle — mesurer des arêtes de flux
  (qui écrit, qui relit, avant ou après livraison), ne jamais proposer la brique
  manquante (rôle de la supervision, pas de cette mission).
- **Méthode** : lecture directe (wiremap, contrats s4/s5, core_requirements, driver.py,
  studio_link.py, hook_guard.py, dispatch.py, apply_decisions.mjs, learning_hook.py,
  learning_metrics.mjs, `.claude/hooks/pre-commit`) + comptages statiques (`wc -l`,
  lecture de fichier) ; **aucun** test/oracle/gate mutation relancé (cf. garde-fou 3 et
  SKIPPED_VALIDATION). Les constats de contenu produit (mutation, playtest, densité de
  tests) sont **cités par référence** à A1/B1/C1 (2026-07-27), jamais redérivés — cette
  mission n'ajoute que la dimension flux/boucle.

```
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

---

## Verdict à la question de Pierre

> « La Forge sait-elle transformer une intention produit en stratégie de preuve
> efficace avant de produire le jeu ? »

**Réponse mesurée : PARTIEL.**

**Les 3 preuves les plus fortes :**

1. **L'étape censée arbitrer la stratégie de preuve n'existe pas dans la chaîne qui a
   produit Pong.** `scripts/forge/dispatch.py:147-153` — `PROFILES["standard"]` ne
   contient ni `s4-archi` ni `s5-wiremap`. Le squelette (`games/pong/09_WIREMAP/wiremap.json`)
   est un artefact **gelé**, écrit une fois pour tout le curriculum (« squelette gelé
   produit par la réconciliation des quatre sources d'exigence », `s9-build-standard.yaml:164`),
   pas par un agent Architecte par jeu. Preuve la plus dure, vérifiable en une seconde :
   **les 13 lignes du wiremap portent `"decider": null`, sans exception** (`wiremap.json`,
   chaque bloc de ligne). Aucune décision de stratégie de preuve n'a de décideur
   enregistré — ni humain, ni agent.
2. **Les boucles de retour qui fonctionnent réellement sont toutes au niveau PROCESS
   (intégrité du run), aucune au niveau PRODUIT (stratégie de preuve).** Depuis le
   24/07, trois écarts documentés par `FORGE_AUDIT_BRANCHEMENTS_2026-07-24.md` ont été
   fermés côté process : `verify_run` est appelé (`driver.py:1097`), le marqueur
   `FORGE_DISPATCH` est auto-injecté (`contract.py:194`), le selfaudit pre-commit est
   redevenu visible (`.claude/hooks/pre-commit:30-50`, avant : sortie jetée en
   `>/dev/null`). Aucun de ces trois correctifs ne touche la question « quelle preuve
   choisir pour quelle intention » — ils rendent la chaîne plus honnête, pas plus
   perspicace sur le produit (même distinction que celle déjà posée par A1 : « pistes
   process vs jouabilité, aucune ne débloque l'autre »).
3. **Le seul mécanisme qui a activement cherché un angle mort de preuve (red-team s11)
   a trouvé les deux failures les plus proches des constats réels de Pierre — et reste
   structurellement sans effet mécanique.** F6 (preuve `core.exit` tautologique) et F1
   (mis-scoring possible à haute vitesse contredisant `play.ball`) sont dans
   `rapport_redteam_code.md`, jamais pliés dans le verdict signé ni dans une révision du
   wiremap (doctrine ADR-002 : red-team = advisory, jamais juge). F1 est toujours non
   ré-exécuté à ce jour (confirmé par C1 §7, reconfirmé ici sans nouvelle exécution,
   hors permission `run` de ce contrat).

Ce n'est pas NON absolu : le studio *détecte* — a posteriori, par un humain qui joue,
ou par un red-team qui doute — que la stratégie de preuve a des trous. Ce n'est pas
OUI : rien dans la chaîne exécutée ne transforme une intention produit (« la balle doit
être jouable », « le joueur doit pouvoir quitter ») en un choix de `proof_kind` avant le
build. Le choix a été fait une fois, pour toujours, au niveau du `core_requirements.yaml`
et du squelette gelé — pas par un arbitrage par jeu.

---

## 1. Table WireMap → Preuve (13 lignes)

Légende `classe` : **F-S-P** fonctionnalité-sans-preuve · **P-S-F** preuve-sans-fonctionnalité
· **O-S-O** oracle-sans-objectif-produit · **V-T-P-F** validé-techniquement-pas-fonctionnellement
· **P-F** preuve-fidèle.

| Ligne | Intention (texte wiremap) | expected_proof | Prouve l'intention ? (écart nommé si substitut) | Observable par un joueur ? | Couvert par un scénario global ? | Classe |
|---|---|---|---|---|---|---|
| `core.boot` | Lancement → état initial observable, sans erreur, sans intervention humaine | bot_action | Substitut plus faible : `boot()` appelé **directement en Node** (`solvability.mjs:107-116`), jamais via `browser/index.html` ni la scène Godot en mode jouable (C1 §1 ligne 1). La preuve dit « le moteur boote », pas « le jeu livré boote ». | Non (le test ne passe jamais par la fenêtre réelle) | Oui — un run réel dans l'adaptateur fermerait l'écart | V-T-P-F |
| `core.main_loop` | Même état+entrée+seed → même état suivant, N ticks | test | Oui, fidèlement — c'est exactement ce que `loop.test.mjs` mesure (déterminisme strict, mutation 14/15) | Non (propriété interne, invisible sans replay) | Partiellement (un scénario global ne teste le déterminisme que s'il rejoue deux fois la même seed, ce qu'aucun harnais actuel ne fait) | P-F |
| `core.input` | Une action émise modifie l'état de façon observable | bot_action | Substitut plus faible : `translate()`/`step()` appelés en direct, jamais un vrai `keydown` DOM (C1 §1 ligne 3) — constat Pierre « bouton mort » vit dans exactement ce trou générique | Non (jamais testé via l'événement réel que le joueur produit) | Oui | V-T-P-F |
| `core.game_state` | État lisible à tout instant, valeurs déclarées seulement | test | Oui, fidèlement (`state.test.mjs`, mutation 29/29) | Non directement, mais sous-tend tout ce qui est visible | Oui (implicitement, condition de tout le reste) | P-F |
| `core.end_condition` | Bot atteint une fin ; état gagné/perdu jamais indéfini | bot_action | Oui, fidèlement **au texte strict** (l'état interne n'est jamais indéfini) — mais le texte ne dit rien sur l'affichage de la fin, ce qui est le trou du constat Pierre #4 (aucun écran de victoire) | Partiellement (l'état est correct, rien à l'écran ne le montre) | Oui | P-F (l'écart est ailleurs : jamais spécifié, pas une preuve infidèle) |
| `core.restart` | Après fin de partie, relance → état identique au premier démarrage | bot_action | Oui, fidèlement en logique pure (JSON identique) — jamais déclenché par la touche R réelle (`index.html:20-21` indice statique, jamais vérifié dynamiquement) | Partiellement (le joueur voit l'indice texte, jamais son effet vérifié) | Oui | V-T-P-F |
| `core.exit` | Sortie demandée → process terminé, code 0, aucune ressource active | bot_action | Substitut le plus faible de la table : preuve = `spawnSync('node exit.mjs')`, **exclusivement le chemin CLI** ; le chemin navigateur réel (`window.close()`) est qualifié « best-effort » par le code lui-même et n'a, par construction de plateforme, aucun effet visible hors fenêtre ouverte par script (constat Pierre #1, red-team F6) | Non (spawnSync invisible ; l'effet réel — bouton mort — est ce que Pierre a observé) | Oui — révèle l'écart immédiatement | O-S-O (l'oracle mesure une propriété vraie sur un chemin qui n'est jamais celui du joueur) |
| `core.render` | Deux captures à états différents diffèrent, aucune monochrome, sous LES DEUX adaptateurs | pixel | Oui pour le critère mécanique écrit (faible : diffère + non-monochrome) — mais ce critère est structurellement incapable de juger la lisibilité (constat Pierre #4, root-causé dans `core_requirements.yaml` lui-même, pas dans cette ligne) | Oui partiellement (les pixels sont visibles, la lisibilité ne l'est pas garantie) | Oui | V-T-P-F |
| `core.audio` | Un asset CC0 existe, est référencé, son déclenchement est tracé | artifact | Oui, fidèlement au texte exact (existence + référence + trace) — le texte ne réclame jamais l'audibilité perçue, donc pas d'écart au sens strict | Oui en principe (le son devrait être audible), mais jamais vérifié en écoute | Oui | P-F |
| `core.error_handling` | Entrées hors domaine → état toujours valide | test | Oui, fidèlement (fuzz réel, 500 entrées, `input.test.mjs`) | Non directement (absence de crash, pas un événement visible en soi) | Oui | P-F |
| `play.paddle` | La raquette se déplace et ne sort jamais de l'aire, même en maintenant l'entrée | bot_action | Oui, fidèlement (100 ticks maintenus, bornée) — mais redondant avec le test unitaire `movePaddle : bornes` de `loop.test.mjs` (même propriété prouvée deux fois par deux harnais distincts) | Oui directement (visible à l'écran) | Oui | P-F |
| `play.ball` | Rebond bords+raquettes ; ne traverse jamais une raquette, quelle que soit la vitesse | test | Oui pour la plage testée (6 vitesses, 10 à 900) — mais ces vitesses sont **hors de la plage de jeu réelle** (`BALL_VX=3` mesuré par A1) ; le red-team (F1, HIGH, non ré-exécuté) doute que la preuve tienne à `vx≥300`. Le texte ne dit rien non plus sur la vitesse *jouable* (constat Pierre #2, absent du wiremap) | Partiellement (le tunneling serait visible s'il survenait ; la vitesse perçue ne l'est jamais mesurée) | Oui | V-T-P-F |
| `play.score` | Sortie de balle → exactement un point pour le camp opposé, score affiché | bot_action | Oui pour le comptage (exact) ; substitut plus faible pour « affiché » — des pips de 16×16px, jamais un score lisible en chiffres (constat Pierre #4) | Oui (les pips sont visibles, pas lisibles comme un score) | Oui | V-T-P-F |

**Lecture d'ensemble** : 5/13 lignes P-F, 6/13 V-T-P-F, 1/13 O-S-O (`core.exit`), 0/13
F-S-P ou P-S-F au sens strict (aucune fonctionnalité n'existe sans une preuve qui lui
corresponde nominalement, et aucune preuve ne teste une fonctionnalité absente — le
défaut dominant de cette chaîne n'est pas l'absence de preuve, c'est la preuve qui vise
un **substitut plus étroit** que l'intention écrite : logique pure au lieu du runtime
livré, chemin CLI au lieu du chemin navigateur, plage de vitesse synthétique au lieu de
la plage réellement jouée).

---

## 2. Densité de preuve

### Coût actuel mesuré (comptage statique, `wc -l`, ce jour)

| Famille | Lignes | Preuves |
|---|---:|---:|
| Logique pure (`05_SYSTEMS/`, 3 fichiers) | 272 | protégée par 95 % mutation (cité A1/B1, non redérivé) |
| Tests unitaires (3 fichiers) | 441 | 49 tests `test(...)` |
| Harnais de solvabilité (1 fichier) | 146 | 1 harnais, 9 sous-checks agrégés |
| **Total code de preuve jeu** | **587** | **50 preuves nominatives** |
| Adaptateurs présentation (7 fichiers, 100 % de ce qu'un joueur voit/entend/clique) | 422 (A1) | **0 test** ne les importe (grep confirmé par B1, non redérivé) |

### Réutilisation d'exécution — mesure propre à cette mission (non faite par A1/B1)

Sur les 13 citations « preuve » du wiremap, **6 lignes citent littéralement la même
exécution** (`node solvability.mjs`) en lisant des champs différents de son unique
sortie JSON : `core.boot`, `core.input`, `core.end_condition`, `core.restart`,
`play.paddle`, `play.score`. Les 7 lignes restantes se répartissent sur 6 autres scripts
distincts (`loop.test.mjs` pour `core.main_loop`+`play.ball` ; `state.test.mjs` pour
`core.game_state` ; `input.test.mjs` pour `core.error_handling` ; `exit.mjs` pour
`core.exit` ; `capture_browser.mjs`+`capture_godot.mjs` pour `core.render` ; `audio.mjs`
pour `core.audio`).

→ **8 exécutions distinctes produisent 13 citations de preuve** dans le wiremap. Le
coût marginal réel n'est donc pas de 13 exécutions mais de 8 ; la « densité » actuelle
est déjà correcte à ce niveau (le studio ne relance pas 13 fois le même harnais) — la
redondance n'est pas dans l'exécution, elle est dans la **couverture** : `play.paddle`
est prouvée deux fois indépendamment (bot solvabilité + test unitaire `movePaddle:
bornes` de `loop.test.mjs`), une vraie duplication de preuve sur une seule propriété,
pendant que 0 des 8 exécutions ne passe jamais par le runtime réellement livré
(navigateur/Godot avec vrais événements).

### Ce qu'un run auto 10-30 s dans le runtime réel prouverait d'un coup

Aucune des 8 exécutions actuelles ne combine ces propriétés dans le runtime livré ; un
run auto combiné les prouverait **simultanément**, fermant jusqu'à 13/13 lignes en une
seule exécution (au lieu de 8 exécutions séparées, aucune dans le vrai runtime) :

| # | Invariant | Assertion concrète | Lignes wiremap fermées |
|---|---|---|---|
| 1 | Lancement réel | Aucune exception/erreur console au chargement ; état initial atteint dans la fenêtre/l'onglet réel | `core.boot` |
| 2 | Rendu visible en continu | ≥ N frames capturées sur la fenêtre 10-30 s ; deux frames espacées diffèrent ; aucune monochrome | `core.render` |
| 3 | Interaction réelle | Un `keydown`/`InputEvent` simulé déplace visiblement la raquette (delta pixel avant/après) | `core.input`, `play.paddle` |
| 4 | Progression de partie en temps réel | Le score affiché change ≥ 1 fois ; la partie atteint `P1_WIN`/`P2_WIN` si la fenêtre le permet, sinon état `PLAYING` cohérent en continu | `play.ball`, `play.score`, `core.end_condition`, `core.game_state` |
| 5 | Absence de crash | Code de sortie/statut = succès en fin de fenêtre ; zéro exception non interceptée dans les logs, y compris sous rafale d'entrées | `core.error_handling` |
| 6 | Cohérence état↔pixel | À un instant t, `state.score` == nombre de pips affichés (ou lisible) sur la capture | `play.score`, `core.render` (ferme l'écart C1 point 6 : « jamais combinées par du code ») |
| 7 | Son déclenché en contexte | ≥ 1 événement `bounce` tracé pendant la fenêtre de jeu réelle (pas un appel isolé) | `core.audio` |
| 8 | Sortie/redémarrage réels | Clic/touche Quitter puis Rejouer via les VRAIS contrôles ; effet observé (pas seulement l'exit code Node) | `core.exit`, `core.restart` |

`core.main_loop` (déterminisme) reste hors de ce scénario par nature : il exige de
rejouer deux fois la même seed, ce qu'un run auto continu unique ne fait pas sans
modification explicite du protocole (rejouer deux instances en parallèle) — seule ligne
qui resterait à 12/13 sans ajout spécifique.

**Chiffrage indépendant** (méthode, coûts, ordre de grandeur) : voir C1 §3 (« chemin
minimal vers un oracle produit exécutable »), cité par référence, non redérivé ici —
~2-4 jours-session pour le brancher en gate, dont l'essentiel (l'ajout d'une vraie
boucle `_process()`/temps réel côté Godot) est le maillon le plus lourd, `main.gd`
n'ayant aujourd'hui aucune boucle (un seul instantané dessiné puis quit, C1 §4).

---

## 3. Graphe des arêtes de retour

Échelle **D**éclaré / **R**éférencé / **E**xécuté / **V**érifié (son résultat peut faire
échouer un gate). Fichier:ligne écrivain + lecteur pour chaque arête.

| Arête | Écrivain (fichier:ligne) | Lecteur (fichier:ligne) | État D/R/E/V |
|---|---|---|---|
| `error_journal ↔ premortem` | `driver.py:550` (`record_error`), `driver.py:559` (`record_fix`) → `studio_link.py:269` / `:302` | `driver.py:564-574` (`_premortem`), injecté au builder `driver.py:444` | D+R+E+V (relu par le **builder** à la re-tentative, jamais par l'architecte — l'architecte n'existe pas dans cette chaîne, cf. §0) |
| `s10s-oracle-standard FAIL → retry s9` | `_finish_step` écrit `state["steps"]["s10s-oracle-standard"]["status"]` | `driver.py:1375-1378` (`_maybe_escalate`, lit `std_st`) | D+R+E+V — boucle intra-run fonctionnelle, corrigée d'un bug historique documenté en commentaire (`driver.py:1336-1346`, `:1348-1360`) |
| `verify_run ← verdict.json` | `driver.py::_run_verdict` écrit `verdict_path` | `driver.py:1097` (`verify_run(verdict_path, ...)`), appelé **dans la même fonction, juste après** | D+R+E+V — **changement depuis le 24/07** (`FORGE_AUDIT_BRANCHEMENTS_2026-07-24.md:21` notait PASSIVE) ; bloque `BLOCKED` si HMAC/évidence/cohérence invalides (`driver.py:1100-1122`) |
| `dispatch_marker → hook_guard.check_spawn` | `contract.py:194` (`_render_prompt`, injection **systématique** depuis correction R2) | `hook_guard.py:49` (`check_spawn`, regex `MARKER` ligne 29) | D+R+E+V — **changement depuis le 24/07** (le marqueur était auto-apposé « à la main » par l'orchestrateur, jamais injecté par le rendu du prompt) |
| `selfaudit pre-commit → sortie visible` | `.claude/hooks/pre-commit:30` (`studio_selfaudit.mjs --write`) | `.claude/hooks/pre-commit:36-50` (résumé imprimé) + `lab/reports/selfaudit_last.json` | D+R+E, **visible** depuis le 24/07 (avant : `>/dev/null`, invisible) mais **jamais V** — `|| true` partout, conception assumée « ne jamais bloquer », donc structurellement non-gating par choix, pas par oubli |
| `propose_brick → budget déposé` | `driver.py:1129` (`_propose_bricks(record)`, **après** verify_run authentifié) → `studio_link.py:563` | oracle de budget (mesure « déposé » vs non-déposé, ferme le volet `budget.promis_non_depose` d'un futur run) ; **jamais promu au catalogue** (`propose_brick` docstring : « N'écrit JAMAIS `catalog.json` ») | D+R+E, **best-effort** — ne peut jamais changer le statut de l'étape (commentaire `driver.py:1123-1128`) ; promotion catalogue = manuelle, hors ce maillon |
| `proposals.jsonl → pending_review.mjs → decisions Pierre → apply_decisions.mjs` | proposals écrites par le pipeline (error_journal, driver) ; décisions écrites À LA MAIN par Pierre dans `pending_review_decisions.jsonl` ; `apply_decisions.mjs` (nouveau, ferme R4) marque `review_status` sur la proposition source | `apply_decisions.mjs:230-311` (`planDecisions`) lit les 3 files + les décisions | D+R+E — **R4 fermé depuis le 24/07** (le marquage mécanique existe désormais) ; **promotion vers `IMPROVEMENT_LEDGER.yaml` reste 100 % manuelle par doctrine** (commentaire du fichier lui-même, ligne 22 : « HumanGate, jamais un script ») — jamais V au sens d'un gate |
| `red-team (s11) → verdict` | `rapport_redteam_code.md` (findings F1..F6) | **aucun** — `s12-verdict` agrège le statut `redteam_ran`/`findings_count` mais jamais le contenu des findings (doctrine ADR-002 : advisory, jamais juge) | D+R+E, **jamais V par construction** — F1 (mis-scoring haute vitesse) et F6 (exit tautologique) correspondent aux 2 constats Pierre les plus proches d'un vrai bug, et dorment sans re-vérification mécanique |
| `check_e2e_harness → (rien)` | écrit/testé dans `static_oracles.py`, jamais appelé pour le profil standard (`driver.py:754-762`, décision Pierre 2026-07-23) | — | D+E (isolément testé) mais **jamais R ni V dans la chaîne réelle** — arête absente par décision documentée, pas par bug |
| `learning_curve.jsonl` (mesure de run) | `learning_hook.py:84-136` (`record_learning_for_subject`, appelé `driver.py:706` après s10a OK) → `learning_metrics.mjs` commande `record` (seule sous-commande existante, `learning_metrics.mjs:200`, pas de `read`/`query`) | **aucun lecteur trouvé dans tout le dépôt hors tests** (`grep -rln learning_curve` hors tests : seulement le writer et sa doc) | D+E, **jamais R, jamais V** — écrit à chaque run vert, jamais relu par aucun code ; confirme et durcit la mémoire studio (« mesure les RUNS, pas la stratégie de preuve ») : ce n'est pas seulement le mauvais sujet mesuré, c'est un puits sans fond, aucun mécanisme ne peut aujourd'hui s'en servir même s'il le voulait |
| `s4-archi/s5-wiremap → wiremap.json` (pour Pong) | — | — | **ABSENTE pour ce colis** — `PROFILES["standard"]` (`dispatch.py:147-153`) ne contient ni s4 ni s5 ; le wiremap est un artefact gelé pré-existant, pas une sortie d'agent pour ce run. Les contrats existent (D), ne sont ni référencés ni exécutés pour Pong |

**Lecture d'ensemble** : 4 arêtes D+R+E+V réellement fonctionnelles et fermées, dont 3
ont changé d'état depuis le 24/07 (verify_run, marqueur, selfaudit visible) — un
progrès process réel et vérifié ici. 2 arêtes D+R+E best-effort non-gating par
conception assumée (propose_brick, apply_decisions/promotion ledger). 2 arêtes D+R+E
jamais V par doctrine (red-team, selfaudit). 1 arête D+E sans aucun lecteur
(learning_curve — la plus proche, en intention, d'informer une stratégie de preuve, et
la plus vide en pratique). 1 arête totalement absente pour ce colis précis (architecte).

---

## 4. Entrées de l'architecte à s4 — aujourd'hui vs manquantes

### Reçues (si `s4-archi` était invoqué — profils `full`/`increment`, jamais `standard`)

D'après `scripts/forge/contracts/s4-archi.yaml` :
- `mandatory_read` : `SCHEMA.md`, la featuremap de l'étape 3, le `blueprint.yaml`
  existant si le repo est déjà structuré, `knowledge_packet.json` (patterns externes,
  advisory).
- Mission : produire `blueprint.yaml` (modules, deps autorisées/interdites, ownership,
  invariants d'archi).
- Oracle : vérificateur de graphe de dépendances déterministe non-LLM.

**Aucune mention d'une stratégie de preuve** dans ce contrat : ni des 4 `proof_kind`
(artifact/test/bot_action/pixel), ni d'un arbitrage coût/couverture, ni d'un lien vers
`core_requirements.yaml`. Le contrat `s4-archi` répond à « comment découper le code », pas
à « comment le prouver ».

### Manquantes (pour arbitrer une stratégie de preuve avant build, quel que soit le profil)

1. **Aucun champ de contrat, à aucune étape, ne demande un arbitrage explicite entre
   les 4 `proof_kind` et le coût de chacun** — `core_requirements.yaml` fixe
   `proof_kind` par capability CORE, une fois pour toutes, à la source (`source: forge`,
   ligne 24), jamais par un agent qui verrait le jeu spécifique.
2. **Aucune entrée ne signale, avant le build, que le profil `standard` saute
   `check_e2e_harness`** (la seule preuve qui engage un événement DOM/InputEvent réel) —
   cette décision vit dans `driver.py:745-762`, jamais dans un document consulté en
   amont d'un build.
3. **Aucune entrée ne fournit à qui que ce soit (agent ou humain) le fait que les
   adaptateurs de présentation (488 lignes, 100 % du vécu joueur) ne seront jamais
   importés par un test scellé** — ce fait est structurel dès l'écriture du squelette
   (aucun test du standard n'importe `06_RUNTIME/`), mais rien ne le signale avant
   build ; il n'est découvert qu'après coup, par audit (A1/B1, 26-27/07).
4. **Aucune entrée ne relie `learning_curve.jsonl` (l'historique des runs précédents) à
   une décision de stratégie de preuve future** — même si le hook fonctionnait
   parfaitement, rien ne le lit (§3).
5. **Aucune ligne du wiremap n'a de `decider`** — quel que soit le canal d'information
   dont un décideur aurait pu disposer, aucun champ ne trace qui a choisi le
   `expected_proof` de chaque ligne ni pourquoi (`"decider": null` × 13/13).
6. **Pour le profil qui a réellement produit Pong, il n'y a littéralement personne à qui
   donner ces entrées** — l'étape architecte n'est pas dans `PROFILES["standard"]`.
   La question « que reçoit l'architecte » présuppose un rôle qui n'existe pas dans ce
   run ; la vraie question factuelle est « qui a décidé la stratégie de preuve du
   curriculum entier, et quand » — réponse : une décision one-shot au moment de la
   conception du STANDARD (2026-07-22, cf. `s9-build-standard.yaml` statut PROPOSED,
   mémoire `forge_standard_ratifications_20260722`), jamais rejouée par jeu.

---

## SKIPPED_VALIDATION

- Aucun test/oracle/gate mutation relancé (hors permission `run` de ce contrat, qui
  n'autorise que grep/git log/lecture) — les chiffres de mutation, de tests verts, de
  coûts de run sont **cités par référence** à A1/B1/C1 (2026-07-27), jamais
  recalculés ici.
- La repro F1 du red-team (mis-scoring haute vitesse) n'a **pas** été ré-exécutée ici —
  déjà signalée non ré-exécutée par A1/C1, reconfirmée non ré-exécutée par cette
  mission, pour la même raison (hors permission `run`).
- Le comportement réel de `window.close()` en navigateur n'a pas été observé
  directement ici (même limite que A1) — conclusion appuyée sur lecture de code
  (`exit.mjs`) et sur le red-team F6, pas sur une exécution observée par cette mission.
- Les 49 fichiers non lus de `scripts/forge/tests/` (déjà signalés non lus par B1) n'ont
  pas été relus ici — hors dimension flux/boucle de cette mission, sauf ceux
  explicitement cités (`studio_link.py`, `hook_guard.py`, `dispatch.py`,
  `apply_decisions.mjs`, `learning_hook.py`, `learning_metrics.mjs`), lus intégralement
  ou par grep ciblé pour tracer les arêtes du §3.
- `scripts/forge/adapters/godot/*`, `fixtures/godot_b0/*`, `missions/*` (chantier Godot
  parallèle) : inventoriés par listing de noms uniquement (déjà faits par A1/C1),
  non relus en détail — conforme à l'instruction de ne jamais y toucher ni les
  dupliquer.
- Le contenu intégral des 8 scripts de preuve Pong (`solvability.mjs`, `loop.test.mjs`,
  `state.test.mjs`, `input.test.mjs`, `exit.mjs`, `capture_browser.mjs`,
  `capture_godot.mjs`, `audio.mjs`) n'a pas été relu ligne à ligne par cette mission —
  leur contenu comportemental est déjà classé exhaustivement par B1 ; cette mission n'a
  lu que `wiremap.json` pour tracer les citations croisées (§2) et les contrats/`driver.py`
  pour tracer les arêtes de retour (§3).
- `roles.yaml` (modifié en arbre de travail au moment de cette mission, comme noté par
  A1) : non diffé en détail ici non plus, hors périmètre.

`SKIPPED_VALIDATION: voir liste ci-dessus (7 éléments) — rien d'autre sauté.`

---

## Contrat de sortie (résumé structuré)

```json
{
  "resume_1_phrase": "L'etape censee arbitrer la strategie de preuve (s4-archi) n'est jamais executee pour le profil qui a produit Pong (les 13 lignes du wiremap ont toutes decider:null) ; les boucles de retour qui fonctionnent reellement (verify_run, marqueur, selfaudit) operent toutes au niveau process/integrite, jamais au niveau strategie-de-preuve, et le seul mecanisme qui mesure les runs (learning_curve.jsonl) n'a aucun lecteur dans le depot.",
  "verdict_question_principale": {
    "reponse": "PARTIEL",
    "preuves": [
      "PROFILES['standard'] (dispatch.py:147-153) ne contient ni s4-archi ni s5-wiremap ; les 13 lignes de wiremap.json portent toutes decider:null",
      "Les 3 arretes de retour reellement fermees depuis le 24/07 (verify_run driver.py:1097, marqueur contract.py:194, selfaudit pre-commit:30-50) sont toutes de niveau process/integrite, aucune de niveau strategie-de-preuve",
      "red-team s11 a trouve les 2 failles les plus proches des constats reels de Pierre (F1 vitesse, F6 exit) et reste structurellement advisory, jamais plie dans le verdict ni dans le wiremap"
    ]
  },
  "table_wiremap_preuve": "13 lignes classees, voir section 1 (5 preuve-fidele, 6 valide-techniquement-pas-fonctionnellement, 1 oracle-sans-objectif-produit, 1 preuve-fidele-a-ecart-ailleurs, 0 fonctionnalite-sans-preuve strict)",
  "densite": {
    "redondances": ["play.paddle proprie deux fois (solvability.mjs bot + loop.test.mjs unit movePaddle:bornes)", "6/13 citations wiremap referencent la meme execution unique de solvability.mjs"],
    "remplacables_par_scenario": ["core.boot", "core.input", "core.render", "core.audio", "core.exit", "core.restart — toutes actuellement en logique pure ou script isole, jamais dans le runtime livre avec de vrais evenements"],
    "invariants_run_auto": [
      {"invariant": "lancement reel", "assertion": "zero exception console, etat initial atteint dans la fenetre reelle"},
      {"invariant": "rendu visible en continu", "assertion": "N frames captures sur 10-30s, deux frames espacees different, aucune monochrome"},
      {"invariant": "interaction reelle", "assertion": "un keydown/InputEvent simule deplace la raquette (delta pixel mesure)"},
      {"invariant": "progression de partie en temps reel", "assertion": "score affiche change >=1 fois, partie atteint P1_WIN/P2_WIN ou etat PLAYING coherent en continu"},
      {"invariant": "absence de crash", "assertion": "code de sortie succes en fin de fenetre, zero exception non interceptee sous rafale d'entrees"},
      {"invariant": "coherence etat-pixel", "assertion": "state.score == pips affiches a l'instant t"},
      {"invariant": "son declenche en contexte", "assertion": ">=1 evenement bounce trace pendant la fenetre de jeu reelle"},
      {"invariant": "sortie/redemarrage reels", "assertion": "clic Quitter puis Rejouer via les vrais controles, effet observe"}
    ]
  },
  "aretes_retour": "11 aretes tracees fichier:ligne ecrivain+lecteur, echelle D/R/E/V, voir section 3 — 4 D+R+E+V fonctionnelles (3 fermees depuis le 24/07), 2 D+R+E best-effort non-gating par conception, 2 D+R+E jamais V par doctrine (advisory), 1 D+E sans aucun lecteur (learning_curve), 1 arete absente pour ce colis (s4/s5 -> wiremap Pong)",
  "entrees_architecte": {
    "recues": ["SCHEMA.md, featuremap etape 3, blueprint.yaml existant, knowledge_packet.json (advisory) — SI s4-archi etait invoque, ce qui n'est pas le cas pour Pong"],
    "manquantes": [
      "aucun champ de contrat n'arbitre les 4 proof_kind vs leur cout",
      "aucune entree ne signale en amont que check_e2e_harness est saute pour standard",
      "aucune entree ne signale que les adaptateurs de presentation ne seront jamais testes",
      "learning_curve.jsonl n'est lu par aucun mecanisme de decision",
      "aucune ligne de wiremap n'a de decider trace",
      "pour Pong specifiquement, aucun role architecte n'existe dans la chaine executee (PROFILES['standard'] sans s4/s5)"
    ]
  },
  "rapport_path": "docs/audit/AUDIT_ALLEGEMENT_D1_BOUCLE_RETROACTION_2026-07-27.md",
  "git_status_final": "seul ce rapport ajoute par cette mission ; le depot porte par ailleurs des modifications concurrentes d'autres sessions (driver.py, wiremap.json, roles.yaml, mutation_triage.json, contrats, etc.) presentes avant le debut de cette mission, non touchees ici",
  "skipped_validation": [
    "aucun test/oracle/gate mutation relance (hors permission run)",
    "repro F1 red-team non re-executee (hors permission run)",
    "window.close() non observe en navigateur reel (hors permission run)",
    "49 fichiers scripts/forge/tests/ non lus (deja signale par B1)",
    "chantier Godot parallele inventorie par listing seul, non relu",
    "8 scripts de preuve Pong non relus ligne a ligne (deja classes par B1)",
    "roles.yaml modifie en arbre de travail, non diffe en detail"
  ],
  "software_verdict": "OK",
  "evidence_verdict": "MECHANICAL_VALIDATION_ONLY",
  "claim_verdict": "NO_CLAIM_ALLOWED"
}
```

`software_verdict: OK` porte sur la **complétude de cet audit** (table 13/13 classée,
densité chiffrée avec invariants nommés, graphe de 11 arêtes avec fichier:ligne
écrivain/lecteur, entrées architecte recensées, verdict factuel rendu avec 3 preuves) —
**pas** sur la qualité de la boucle de rétroaction du studio, qui reste PARTIELLE au
sens mesuré ci-dessus.
