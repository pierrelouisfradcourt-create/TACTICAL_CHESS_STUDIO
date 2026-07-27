# Audit A1 — Classification industrielle de la chaîne de production Pong

Date : 2026-07-27. Source : mission Forge `FORGE_DISPATCH:a1-audit-chaine-classification`.
Posture : contrôleur de gestion industriel — chaque élément se juge à sa contribution au
COLIS (jouable, exécutable, vérifiable), jamais à sa sophistication. Portée : LECTURE seule
du dépôt entier, ÉCRITURE limitée à ce fichier. Aucune modification de code/test/contrat/
oracle/wiremap, aucune suppression, aucun run Forge relancé, aucun gate mutation relancé.

```
software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
```

---

## Résumé (10 lignes)

Le noyau logique de Pong (`05_SYSTEMS/`, 3 fichiers, 272 lignes) est solide : 50 tests
unitaires verts (vérifié par exécution directe ce jour), 95 % de mutation tuée (58/61),
solvabilité prouvée par bot. Les 4 constats d'exécution de Pierre (quitter, vitesse de
balle, adversaire auto, score/UX) tracent tous à la **même cause structurelle unique** :
le profil `standard` du Forge SAUTE explicitement le seul type de preuve qui exerce une
vraie interaction humaine en navigateur (`check_e2e_harness`, décision Pierre ratifiée
2026-07-23, `driver.py:745-762`) — les 4 preuves `proof_kind` disponibles
(artifact/test/bot_action/pixel) valident des propriétés mécaniques, jamais l'expérience
d'un joueur qui clique, attend, ou regarde. Deux des quatre constats sont carrément
**jamais spécifiés** dans le wiremap (adversaire, lisibilité score/écran de fin) — ce ne
sont pas des bugs mais des décisions de design jamais posées. Le gate mutation (`s10a`)
est structurellement aveugle sur les 7 adaptateurs de présentation (0/65 tué, contre 58/61
sur la logique pure) — fait déjà documenté par une mission sœur du 2026-07-26, confirmé ici
par relecture. Le run signé `pong_r2` (14 $, 39 min) est `FAIL`/`BLOCKED` pour deux raisons
indépendantes des constats de Pierre (budget `game_loop` non déposé, gate mutation rouge
côté adaptateurs) — corriger ces deux points ne réglerait AUCUN des 4 constats de jeu réel.
Un red-team indépendant du même run a déjà trouvé (F1, HIGH, non ré-exécuté ici) que la
preuve « la balle ne traverse jamais, aucun point marqué » est vraisemblablement fausse à
grande vitesse — signal supplémentaire que les preuves actuelles prouvent moins qu'elles
ne l'affirment. Le chemin minimal vers un colis livrable sépare deux pistes indépendantes :
fermer les 4 trous d'expérience joueur (design + petits patches ciblés) et fermer les 2
trous de process (budget + arbitrage mutation adaptateurs) — aucune des deux ne débloque
l'autre.

---

## INVENTAIRE (faits)

Comptages exécutés ce jour (node --test réel, wc -l, ls) — voir SKIPPED_VALIDATION pour ce
qui n'a pas été ré-exécuté.

| Famille | Éléments | Taille mesurée |
|---|---|---|
| Code jeu — logique pure | `05_SYSTEMS/{game_loop/loop.mjs, game_state/state.mjs, input/input.mjs}` | 131+96+45 = 272 lignes |
| Code jeu — adaptateurs présentation | `06_RUNTIME/adapters/presentation/{draw,raster,audio,exit,capture_browser,capture_godot}.mjs` + `browser/{main.mjs,index.html}` + `godot/{main.gd,main.tscn,project.godot}` | 88+61+91+42+35+105 = 422 lignes JS + fichiers Godot |
| Code jeu — assets | `04_ASSETS/audio/{bounce.wav,manifest.json,LICENSE.txt}` | 3130 octets wav |
| Tests du jeu | `07_TESTS/unit/{input,loop,state}.test.mjs` + `07_TESTS/oracle/solvability.mjs` | 70+229+142+146 = 587 lignes, **50 tests unitaires (exécutés ce jour : 50 pass, 0 fail)** |
| Oracles s10a/s10s | `scripts/forge/standard_oracles.py` (1091L, 6 fonctions), `scripts/forge/mutation_proof.py` (269L), `scripts/forge/oracle.py` (114L) + `scripts/forge/oracles.json` (entrée pong) | — |
| Contrats s9/s10/s11/s12 (chaîne Pong active) | `s9-build-standard.yaml`, `s10a-oracle-code.yaml`, `s10s-oracle-standard.yaml`, `s11-redteam-code.yaml`, `s12-verdict.yaml` | 5 fichiers |
| Contrats hors chaîne standard (existent, non invoqués pour Pong) | `s0-contrat`, `s1-prisme`, `s2-worldscan`, `s2.5-artbible`, `s3-decompo`, `s4-archi`, `s5-wiremap`, `s6-redteam-plan`, `s9-build`, `s9-build-godot`, `s10b-oracle-archi`, `s10c-oracle-wiremap`, `s10d-oracle-visual`, `redteam-artdirector`, `orchestrator`, `roles` | 16 fichiers |
| Contrats d'audit/instrumentation (session Troisième Cerveau) | `m1-telemetrie-echec`, `s10s-branchement-driver`, `v1..v4-*`, `a1/b1/c1-audit-*` | 9 fichiers |
| Docs `docs/forge/` | — | 52 fichiers `.md` |
| Docs `docs/audit/` | — | 18 fichiers `.md` (dont celui-ci) |
| Infra driver/dispatch/verify | `driver.py` 1676L, `dispatch.py` 292L, `gate.py` 66L, `verdict.py` 450L, `static_oracles.py` 807L, `studio_link.py` 781L, `verify_run.py` 380L, `escalate.py` 105L | 4557 lignes |
| Infra Godot (session parallèle, hors périmètre d'écriture) | `scripts/forge/adapters/godot/` (19 fichiers) + `fixtures/godot_b0/` (10 fichiers) + `lab/forge_scenes/bouncing_ball/` + `missions/bouncing_ball/mission.yaml` | inventorié, non touché |
| Run signé Pong actuel | `lab/forge_runs/pong/{state.json,verdict.json,rapport_redteam_code.md,evidence/*}` | `run_status: DONE`, `software_verdict: FAIL`, `decision: BLOCKED`, coût 13,82 $ |

---

## CLASSIFICATION (jugement argumenté)

| Élément | Famille | Classe | Valeur | Coût | Priorité | Justification |
|---|---|---|---|---|---|---|
| `loop.mjs`, `state.mjs`, `input.mjs` | code | **indispensable-au-livrable** | haute | bas | P0 | C'est le jeu lui-même ; retirer l'un des trois ⇒ aucun Pong. 50/50 tests verts (vérifié ce jour), 93-100 % mutation tuée par fichier. |
| `draw.mjs`, `browser/main.mjs`, `browser/index.html` | code | **indispensable-au-livrable** | haute | élevé actuellement | P0 | Sans eux, aucune fenêtre jouable en navigateur. Coût élevé : 0/12 mutants tués (draw.mjs), bug de chargement corrigé hier soir non commité (imports node: statiques cassaient tout le graphe d'import navigateur, cf. audio.mjs commentaire L6-15) — le jeu N'A JAMAIS BOOTÉ en navigateur avant ce correctif. Retirer ces fichiers ⇒ pas de colis ; les garder tels quels sans durcissement ⇒ colis fragile. |
| `exit.mjs` | code | **indispensable-au-livrable** | moyenne | élevé actuellement | P1 | Requis par `core_requirements.yaml` (CORE, `not_applicable_allowed: false`) mais sa preuve est tautologique (red-team F6, `rapport_redteam_code.md:128-139` : `process.exit(0)` inconditionnel, jamais vérifié côté navigateur) — voir constat Pierre « quitter » ci-dessous. |
| `audio.mjs` | code | **indispensable-au-livrable** | moyenne | moyen | P1 | CORE requirement, asset existant + traçage prouvé (`node audio.mjs` → passed). Coût : 0/11 mutants tués, bug de chargement corrigé hier soir non commité (même famille que draw.mjs). |
| `capture_browser.mjs` | code | **indispensable-à-la-fiabilité** | moyenne | bas | P1 | Seule preuve `pixel` réellement re-exécutable sur ce poste (navigateur headless via canvas) ; retirer ⇒ perte du seul volet `core.render` vérifiable ici. |
| `capture_godot.mjs`, `godot/main.gd`, `godot/main.tscn`, `godot/project.godot` | code | **utile-mais-prématuré** | faible actuellement | moyen | P3 | `GODOT_BIN` absent sur ce poste (fog documenté deux fois : wiremap L107-108, s9-build-standard artifact fog #2) — code jamais re-exécutable ici, jamais retesté depuis la capture archivée. Corrobore directement le constat Pierre « pas de livrable Godot exploitable ». Retirer ne casse rien d'exécutable AUJOURD'HUI ; garder a un coût de maintenance (code non prouvé qui traîne) sans bénéfice mesurable tant que le binaire Godot n'est pas configuré. |
| `raster.mjs` | code | **utile-mais-prématuré** | faible | bas | P3 | Backend logiciel de capture headless, sert uniquement `capture_godot.mjs`/pipeline offscreen — même dépendance à Godot non configuré ; 0/9 mutants tués, jamais exercé par un test scellé. |
| `04_ASSETS/audio/{bounce.wav,manifest.json,LICENSE.txt}` | code | **indispensable-au-livrable** | haute | nul | P0 | 3130 octets, CC0, référencé et tracé mécaniquement. Aucun coût de maintenance. |
| `07_TESTS/unit/*.test.mjs` (50 tests) | tests | **indispensable-à-la-fiabilité** | haute | bas | P0 | Verrouille la logique pure (93-100 % mutation) ; ré-exécuté ce jour, 50/50 verts. **Limite factuelle** : n'importe JAMAIS un fichier de `06_RUNTIME/adapters/presentation/` (grep imports confirmé) — ne peut structurellement pas protéger contre les 4 constats de Pierre, tous situés côté présentation. |
| `07_TESTS/oracle/solvability.mjs` | tests | **indispensable-à-la-fiabilité** | haute | bas | P0 | Seul harnais qui prouve qu'une partie se termine, ré-exécuté ce jour (exit conforme). Utilise deux bots IA (tracker/fuyard) internes au harnais de test — **jamais exposés comme mode de jeu au joueur** (confond la preuve de solvabilité avec un adversaire jouable, ce ne sont pas la même chose — voir constat « adversaire » ci-dessous). |
| `scripts/forge/standard_oracles.py` (6 oracles) | oracles | **indispensable-au-livrable** | haute | bas | P0 | A correctement bloqué `pong_r2` sur un vrai défaut (`budget.promis_non_depose: [game_loop]`) — signal vrai, pas un faux négatif. Déterministe, rapide, sans LLM. |
| `scripts/forge/mutation_proof.py` (`logic_files_from_wiremap`) | oracles | **indispensable-à-la-fiabilité** | haute en principe | élevé actuellement | P1 | Le mécanisme de mutation testing lui-même a une valeur réelle (95 % sur la logique pure). Mais sa formule (`.mjs` non-test, sans filtre de catégorie) inclut sans discernement les 7 adaptateurs qu'aucun test scellé n'importe jamais — 0/65 tué, mathématiquement inatteignable en l'état (`docs/audit/ANALYSE_PERIMETRE_LOGIC_FILES_2026-07-26.md`, confirmé par relecture directe ce jour). Ce défaut EST la raison mécanique pour laquelle un oracle vert n'aurait jamais pu attraper les constats Pierre : ils vivent tous dans les fichiers que ce gate ne peut structurellement pas juger. |
| `check_e2e_harness` (dans `static_oracles.py`) | oracles | **hors-cible-actuelle (pour Pong)** | nulle pour Pong actuellement | nul (jamais appelé) | P3 | Explicitement `SKIPPED` pour tout profil `standard` (`driver.py:745-762`, décision Pierre 2026-07-23). C'est la fonction qui, si elle tournait, aurait le plus de chances d'attraper 3 des 4 constats Pierre (clic réel sur bouton, overlay, restart) — mais elle exige une topologie (`run-oracle.mjs` + `e2e.mjs` à la racine) que le STANDARD n'a jamais adoptée. Ni un bug ni une lacune cachée : une décision déjà prise, dont ce constat mesure le prix. |
| `s9-build-standard.yaml` | contrats | **indispensable-au-livrable** | haute | bas | P0 | Contrat du seul agent qui écrit le jeu ; garde-fous solides (squelette=loi, promesse≠constat, remontée de fog obligatoire). A produit un rapport honnête (3 fog déclarés) sur `pong_r2`. |
| `s10a-oracle-code.yaml`, `s10s-oracle-standard.yaml` | contrats | **indispensable-à-la-fiabilité** | haute | bas | P0 | Portes de sortie déterministes non-LLM, correctement bloquantes sur `pong_r2`. |
| `s11-redteam-code.yaml` | contrats | **indispensable-à-la-fiabilité** | haute — prouvée ce run | bas (~2 $/run) | P0 | A trouvé une faille HIGH réelle (F1, mis-scoring à grande vitesse contredisant la preuve `play.ball` du wiremap) que les oracles verts n'auraient pas vue. Advisory, mais le seul mécanisme de la chaîne à avoir cherché activement des angles morts plutôt que de vérifier une checklist. |
| `s12-verdict.yaml` | contrats | **indispensable-au-livrable** | haute | bas | P0 | Notarisation HMAC, obligatoire pour tout HumanGate. |
| Contrats hors chaîne standard (s0/s1/s2/s2.5/s3/s4/s5/s6/s9-build/s9-build-godot/s10b/s10c/s10d/redteam-artdirector) | contrats | **utile-mais-prématuré** | nulle sur Pong, réelle sur curriculum futur | bas (fichiers statiques, pas de coût d'exécution) | P3 | Non invoqués pour Pong par construction (wiremap.json commentaire L4 : « l'intention est triviale, il n'y a rien à découvrir » — le Prisme et les étapes de conception sont hors périmètre de ce nœud). Utiles dès qu'un jeu du curriculum sort du squelette gelé (ex. jeu à intention non triviale). Aucun coût de maintenance actif tant qu'ils ne tournent pas. |
| `orchestrator.yaml`, `roles.yaml` | contrats | **indispensable-au-livrable** | haute | bas | P0 | Résout `capability_role → modèle` (ADR-002 gate 1) et orchestre les tentatives ; sans eux aucun agent ne peut être dispatché sous contrat validé. |
| `m1-telemetrie-echec`, `s10s-branchement-driver`, `v1..v4-*`, `a1/b1/c1-audit-*` | contrats | **indispensable-à-la-fiabilité (niveau chaîne, pas colis)** | haute pour la chaîne, nulle directe pour CE colis | bas (missions déjà rendues, coût ponctuel) | P2 | Ont fermé des trous réels de la chaîne (intégrité/verdict séparés, garde `attempts<1`, télémétrie d'échec, dépôt de brique câblable). **Aucun des 4 constats Pierre n'est fermé par ces missions** — elles rendent la CHAÎNE plus honnête, pas le COLIS plus jouable. À ne pas confondre dans un futur reporting. |
| `docs/forge/*.md` (52 fichiers) | docs | **mixte — audit de volume recommandé** | variable | moyen (52 fichiers jamais triés par statut) | P2 | Les documents liés à une mission ratifiée en cours (`MISSION_S10S_DRIVER_DRAFT.md`, `CONTEXT_LOOP_V1_PROPOSAL.md`) sont indispensables-à-la-fiabilité (traçabilité des décisions). Le volume brut (52 fichiers, dont plusieurs `P1_*`/`S2_5_*`/`S10D_*` visiblement liés à des expériences déjà closes d'après leur nom et leur date) n'a pas été lu individuellement ici (hors périmètre de cette mission) — **candidat déclaré, non tranché**, à un futur tri documentaire séparé plutôt qu'à une classe unique forcée. |
| `docs/audit/*.md` (18 fichiers, dont celui-ci) | docs | **indispensable-à-la-fiabilité** | haute pour ceux datés 2026-07 lus ce jour | bas | P1 | Les 3 audits du 26/07 lus intégralement pour cette mission (`ANALYSE_PERIMETRE_LOGIC_FILES`, `ANALYSE_DEPOT_GAME_LOOP`) sont directement à l'origine de constats vérifiés ici — traçabilité vivante, pas de l'archive morte. |
| `09_WIREMAP/wiremap.json`, `00_CHARTER/game_contract.yaml` | docs (spec du jeu) | **indispensable-au-livrable** | haute | bas | P0 | Ce sont littéralement la définition du colis — sans eux, aucun oracle STANDARD n'a de référence. |
| `scripts/forge/contracts/PLAYABLE_CONTRACT.md` | docs | **hors-cible-actuelle (pour Pong)** | nulle pour le profil standard | nul | P3 | Convention `window.__game`/`#overlay`/`#restart` pour un harnais e2e générique — jamais appliquée à Pong (`index.html` n'a ni `#overlay` ni `#restart`, `check_e2e_harness` est SKIPPED pour standard). Intéressant comme brouillon pour une future Option C (politique de preuve dédiée à la présentation, cf. écarts ci-dessous) mais inerte aujourd'hui sur ce colis. |
| `driver.py` | infra | **indispensable-au-livrable** | haute | élevé actuellement | P0 | Seul point d'orchestration de la chaîne entière (build→oracle→verdict). Coût élevé mesuré : 4 chantiers concurrents non commités coexistent dans le même fichier au moment de cet audit (`git status` : `M scripts/forge/driver.py`), un incident réel de « revert temporaire pour prouver un RED » a été documenté comme risque par l'agent V4 lui-même (`RUN_INDEX.md` ligne 93). |
| `dispatch.py`, `verdict.py`, `gate.py` | infra | **indispensable-au-livrable** | haute | bas | P0 | Porte d'entrée (aucun agent sans contrat validé) et porte de sortie (verdict signé HMAC) — le squelette même du modèle de gouvernance ADR-002. |
| `verify_run.py` | infra | **indispensable-à-la-fiabilité** | haute — durci récemment | bas | P0 | Corrigé le 2026-07-26 (mission V1) pour séparer intégrité/authenticité du verdict logiciel ; re-vérifié par exécution indépendante de la supervision (865→869 tests verts). Directement responsable de la lecture correcte du FAIL honnête de `pong_r2` (avant fix : `exit 2`/REJET ; après : `exit 0`/« FAIL honnête »). |
| `static_oracles.py` | infra | **indispensable-à-la-fiabilité (usage partiel)** | mixte | moyen | P1 | `check_solvability_wired` est activement utilisé et a une valeur anti-théâtre réelle sur Pong. `check_e2e_harness` (même fichier) est écrit, testé, mais **jamais appelé** pour le profil standard (cf. ligne dédiée ci-dessus) — dormance documentée, pas un bug caché. |
| `mutation_proof.py` | infra | *(voir ligne oracles ci-dessus — même fichier)* | — | — | — | — |
| `studio_link.py::propose_brick` | infra | **utile-mais-prématuré** | prouvée en isolation, nulle en production | bas (code déjà écrit et testé) | P1 | Fonction testée unitairement (`test_studio_link.py:115-140`) mais **zéro appelant** — ni `driver.py` (grep confirmé), ni manuel (`lab/reports/forge_brick_proposals.jsonl` n'existe pas), ni contractuel. C'est la cause directe du volet `budget.promis_non_depose: [game_loop]` qui fait échouer `s10s` sur `pong_r2`. Correction déjà chiffrée par la mission V2 (~10-15 lignes dans `_run_verdict`, non implémentée). |
| `escalate.py` | infra | **indispensable-au-livrable (chaîne)** | haute en général | bas | P1 | Mécanisme d'escalade haiku→sonnet→opus ; sans effet mesurable sur `pong_r2` spécifiquement (pool déjà au tier max opus, `RUN_INDEX.md` : « pas d'escalade possible »), mais retire-le et tout jeu au tier bas perd son filet de rattrapage. |
| `scripts/forge/adapters/godot/*` (19 fichiers), `fixtures/godot_b0/*`, `lab/forge_scenes/bouncing_ball/*`, `missions/bouncing_ball/mission.yaml` | infra | **utile-mais-prématuré** | nulle directe pour Pong aujourd'hui | inconnu (chantier actif d'une session parallèle) | P3 | Inventorié sans lecture de contenu approfondie (hors périmètre explicite de cette mission — « à INVENTORIER comme existants, jamais à modifier »). Porte sur un adaptateur Godot générique (`bouncing_ball`), pas sur `games/pong/06_RUNTIME/adapters/presentation/godot/` spécifiquement — pas de lien de câblage constaté avec le colis Pong actuel. Corrobore, sans le prouver davantage, le constat Pierre « pas de livrable Godot exploitable ». |
| `oracle.py` + `oracles.json` (entrée `pong`) | infra | **indispensable-au-livrable** | haute | bas | P0 | `oracles.json` déclare la commande d'oracle exacte que `driver.py` exécute pour Pong (`node --test 07_TESTS/unit/*.test.mjs 07_TESTS/oracle/solvability.mjs`, vérifiée identique au `test_argv` du reçu signé) — sans cette déclaration, aucun oracle code n'a de commande à exécuter. |

---

## Constats Pierre tracés

Chaque constat est une observation d'exécution réelle (2026-07-27). Pour chacun : la cause,
tracée à un fichier:ligne ou une ligne de wiremap absente, jamais une hypothèse.

### 1. « Bouton "quitter" sans comportement fonctionnel »

- **Cause** : `games/pong/06_RUNTIME/adapters/presentation/exit.mjs:6-12` — côté navigateur,
  `requestExit()` appelle `window.close()` (commentaire ligne 3 du fichier lui-même : « (best
  effort) »). `window.close()` est une API de plateforme qui, sur un onglet ouvert par
  navigation normale (pas par `window.open()` depuis un script), **n'a par construction aucun
  effet visible** dans les navigateurs modernes — comportement de plateforme documenté, pas
  une hypothèse sur ce code précis. Le code ne vérifie jamais le résultat et retourne
  toujours `0`.
- **Root cause dans la chaîne de preuve** : la preuve du wiremap pour `core.exit`
  (`09_WIREMAP/wiremap.json` lignes 87-97, `"preuve"` ligne 95) est
  `spawnSync('node exit.mjs') -> status=0` — **exclusivement le chemin Node/CLI**, jamais un
  clic réel sur le bouton `#exit` du navigateur (`browser/index.html:22`,
  `browser/main.mjs:45`). Un red-team indépendant du run `pong_r2` avait déjà repéré ce trou
  le 2026-07-26 : `lab/forge_runs/pong/rapport_redteam_code.md` F6, « la preuve de core.exit
  est tautologique […] "aucune ressource laissée active" n'est vérifié par aucun oracle ».
- **Cause structurelle amont** : `check_e2e_harness`, le seul mécanisme de la chaîne qui
  simulerait un vrai clic navigateur, est explicitement `SKIPPED` pour le profil standard
  (`driver.py:745-762`, décision Pierre 2026-07-23). Aucune preuve `bot_action`/`pixel`/
  `test`/`artifact` du STANDARD n'exerce un clic DOM réel.
- **Verdict de traçage** : bug réel, root-causé, PAS « jamais spécifié » — `core.exit` EST
  spécifié dans le wiremap, mais sa preuve ne couvre que le sous-cas Node, jamais le sous-cas
  navigateur qui est pourtant le runtime que Pierre a testé.

### 2. « Vitesse initiale de balle trop élevée pour être jouable »

- **Cause mesurée directement** : `games/pong/05_SYSTEMS/game_state/state.mjs:13-14` —
  `BALL_VX = 3`, `BALL_VY = 2` (unités logiques/tick). Champ de jeu `FIELD_W = 200`
  (`state.mjs:7`). Distance entre le centre (x=100) et le plan de collision d'une raquette
  (`P1_X=6`/`P2_X=194`, `state.mjs:15-16`) ≈ 94 unités. À `vx=3`/tick et 60 ticks/s (boucle
  `requestAnimationFrame`, `browser/main.mjs:48-55`, un `step()` par frame, aucune mise à
  l'échelle par delta-temps), la balle franchit cette distance en **≈ 31 ticks ≈ 0,52
  seconde** — vérifié ici par calcul direct sur les constantes lues, cohérent avec le
  `ball.vx/vy` observé par exécution réelle de `solvability.mjs` ce jour (`vx:3, vy:2` dans
  la sortie JSON).
- **Root cause dans la chaîne de preuve** : `play.ball` (`wiremap.json` lignes 149-160) a une
  seule `expected_proof` : « ne traverse jamais une raquette, quelle que soit sa vitesse » —
  un critère de non-régression physique, **jamais un critère de jouabilité/temps de
  réaction humain**. Aucune ligne du wiremap, aucun champ de `game_contract.yaml`, ne
  spécifie de borne de vitesse perçue comme « jouable ».
- **Signal aggravant, non ré-exécuté ici** : le red-team du 2026-07-26 (F1, sévérité HIGH,
  `rapport_redteam_code.md:22-55`) affirme — par trace arithmétique, pas par exécution
  confirmée — qu'à grande vitesse (`vx≥300`, hors plage de jeu réelle) la collision balayée
  attribue un point fantôme au mauvais camp, contredisant littéralement la preuve du wiremap
  (« aucun point marqué »). Non ré-exécuté par cette mission (hors permission `run`) ; signalé
  comme fog HumanGate déjà ouvert, pas comme fait établi ici.
- **Verdict de traçage** : la valeur numérique est vérifiée et confirmée rapide (0,52 s de
  bord à bord). La notion de « vitesse jouable » elle-même est **jamais spécifiée** dans le
  wiremap ni le contrat — ce n'est pas un bug au sens d'une preuve violée, c'est un critère
  d'acceptation absent.

### 3. « Pas d'adversaire automatique (validation solo impossible) »

- **Cause** : recherche exhaustive (`grep -rniE "adversaire|opponent|cpu|solo|single.?player"
  games/pong/`) → **zéro résultat**. `browser/main.mjs:34-37` mappe P1 sur W/S et P2 sur les
  flèches — les DEUX raquettes sont pilotées par une entrée clavier humaine ; aucun code de
  contrôleur IA n'existe dans le runtime jouable. Les deux bots présents dans le dépôt
  (`trackerDir`/`fleeDir`, `07_TESTS/oracle/solvability.mjs:18-27`) sont un **harnais de
  test interne**, jamais exposés au joueur ni appelés par `browser/main.mjs`.
- **Root cause** : `09_WIREMAP/wiremap.json` et `00_CHARTER/game_contract.yaml` ne
  contiennent aucune ligne, aucun champ, mentionnant un mode solo ou un adversaire IA — la
  seule référence externe citée (`wiremap.json` ligne 137 : « Pong (Atari, 1972) : deux
  raquettes déplaçables verticalement ») décrit l'arcade original à 2 joueurs humains, pas un
  mode CPU.
- **Verdict de traçage** : **jamais spécifié**, prouvé par recherche négative exhaustive sur
  le dépôt entier de `games/pong/`. Ce n'est pas un défaut d'implémentation — c'est une
  question de design jamais posée au squelette gelé.

### 4. « Score/UX pas suffisamment validés »

- **Cause** : `06_RUNTIME/adapters/presentation/draw.mjs:35-41` — le score est rendu comme
  des « pips » : carrés de 16×16 px (`SCALE*4` à `SCALE=4`) empilés horizontalement, pas de
  chiffres, pas de texte. Aucun écran de fin de partie : quand `state.status !== PLAYING`,
  `loop.mjs:91-93` fige l'état (`return { state, events: [] }`) mais rien dans `draw.mjs` ni
  `browser/main.mjs` n'affiche de message « victoire »/« defaite » — le seul indice pour le
  joueur est l'immobilité de la balle et un indice textuel statique dans `index.html:20-21`
  (« R pour rejouer »), jamais mis en évidence dynamiquement à la fin de partie.
- **Root cause dans la chaîne de preuve** : `play.score` (`wiremap.json` lignes 162-173) a
  pour seule preuve un critère mécanique (« exactement un point par sortie de balle ») et une
  preuve visuelle minimale (« pips visibles sur capture »). `core.render`
  (`core_requirements.yaml` lignes 74-78) exige seulement que deux captures diffèrent et
  qu'aucune ne soit monochrome — un bar très bas, satisfait par n'importe quel changement de
  pixel, jamais par une exigence de lisibilité humaine du score ou d'un écran de fin.
- **Verdict de traçage** : partiellement **jamais spécifié** (aucune ligne n'exige un score
  lisible en chiffres ni un écran de fin) et partiellement **root-causé** dans
  `core_requirements.yaml` lui-même — le seul `proof_kind` disponible pour le rendu
  (`pixel`, « deux captures différentes non monochromes ») est structurellement incapable de
  juger la lisibilité, quel que soit le jeu produit par le STANDARD.

---

## Écarts wiremap ↔ réalité (au-delà des 4 constats)

1. **Gate mutation structurellement aveugle sur 7/10 fichiers logiques** — `logic_files`
   (`mutation_proof.py:46-54`, `driver.py:878-910`) inclut les adaptateurs de présentation
   sans qu'aucun test scellé ne les importe jamais (grep confirmé ce jour : les 4 fichiers de
   `07_TESTS/` n'importent que `05_SYSTEMS/`). 0/65 mutants tués sur les adaptateurs contre
   58/61 sur la logique pure. Documenté indépendamment le 2026-07-26
   (`docs/audit/ANALYSE_PERIMETRE_LOGIC_FILES_2026-07-26.md`), confirmé par relecture directe
   ici — pas une nouvelle découverte, une corroboration.
2. **Brique `game_loop` promise mais jamais déposée** — `budget.adds: [game_loop]`
   (`game_contract.yaml:11`) reste `promis_non_depose` dans le reçu signé
   (`verdict.json:197-199`) parce que `studio_link.propose_brick` n'a aucun appelant
   (`docs/audit/ANALYSE_DEPOT_GAME_LOOP_2026-07-26.md`, confirmé par grep ce jour : 0
   occurrence dans `driver.py`). Corrige à lui seul un des deux volets `FAIL` du run signé.
3. **`check_e2e_harness` écrit, testé, jamais appelé pour le profil qui produit Pong** —
   c'est la cause structurelle UNIQUE des constats 1 et (en partie) 4 ci-dessus. La décision
   de le sauter (`driver.py:745-753`) est correcte et documentée pour ce qu'elle coûtait de
   ne pas être prise (pas de harnais Playwright par jeu du curriculum) — mais son EFFET n'a,
   à la connaissance de cette mission, jamais été mesuré séparément avant aujourd'hui : sauter
   l'e2e navigateur ferme aussi la seule porte qui aurait pu attraper « bouton mort » avant
   Pierre.
4. **Aucune ligne wiremap ne porte de critère de jouabilité perçue** (vitesse, lisibilité,
   présence d'un adversaire) — les 10 cases CORE et les 3 lignes EXPECTED du squelette
   (`wiremap.json`) couvrent exhaustivement les propriétés MÉCANIQUES (state valide, pas de
   tunneling, un point par sortie) mais aucune n'a de `proof_kind` qui engage un jugement
   humain sur le RESSENTI — écho direct de la mémoire studio déjà nommée
   (`forge_mechanical_ok_visually_dead` : « l'oracle Forge ne teste QUE la mécanique, pas le
   feel »), ici étendue de « feel visuel » à « feel de jouabilité » au sens large.
5. **Le red-team (F1) met en doute la preuve `play.ball` elle-même** (« aucun point marqué »
   à toute vitesse) sans que cette mission ait pu la ré-exécuter (hors permission `run`) — un
   écart de confiance ouvert, pas fermé, sur la preuve la plus citée du squelette.

---

## Chemin minimal vers un colis livrable

Deux pistes indépendantes — aucune ne débloque l'autre, elles peuvent avancer en parallèle.

**Piste A — jouabilité réelle (répond directement aux 4 constats Pierre)**

1. **Trancher HumanGate le mode de jeu** : 2 joueurs clavier partagé (déjà le comportement
   actuel) ou ajout d'un mode solo vs IA. *Preuve de done* : une ligne wiremap EXPECTED
   ajoutée (ou une décision écrite au decision-log actant le 2-joueurs comme cible), avec
   `expected_proof` si un mode IA est retenu.
2. **Corriger ou requalifier `core.exit`** : soit rendre le bouton fonctionnel (ex. overlay
   « vous pouvez fermer l'onglet » plutôt qu'un `window.close()` voué à l'échec hors fenêtre
   ouverte par script), soit documenter explicitement la limite de plateforme au joueur.
   *Preuve de done* : un test qui observe l'effet RÉEL du clic (capture avant/après état DOM
   visible), pas seulement l'exit code Node.
3. **Trancher HumanGate la vitesse de balle** : garder `BALL_VX=3`/`BALL_VY=2` (0,52 s de
   bord à bord) ou l'ajuster. *Preuve de done* : playtest humain documenté + valeur choisie
   citée dans le wiremap comme critère explicite (actuellement absent).
4. **Décider du niveau d'UX du score/fin de partie** (pips actuels vs chiffres + écran de
   victoire). *Preuve de done* : capture pixel montrant le nouvel état + ligne wiremap mise à
   jour si le contrat change.

**Piste B — verdict signé propre (répond au FAIL/BLOCKED du run, indépendant de la piste A)**

5. **Brancher `propose_brick` dans `driver.py::_run_verdict`** (déjà chiffré : ~10-15 lignes
   + 2-3 tests, `docs/audit/ANALYSE_DEPOT_GAME_LOOP_2026-07-26.md` §4a). *Preuve de done* :
   `budget.promis_non_depose` vide sur le prochain run avec code oracle OK.
6. **Trancher l'arbitrage A/B/C du périmètre `logic_files`**
   (`docs/audit/ANALYSE_PERIMETRE_LOGIC_FILES_2026-07-26.md` §3) — sans cette décision, tout
   nouveau run Pong échouera structurellement le gate mutation pour la même raison. *Preuve
   de done* : décision au decision-log + (si B ou C) modification de `driver.py`/
   `mutation_proof.py` sous contrat validé.
7. **Ré-exécuter la repro F1 du red-team** (mis-scoring à grande vitesse) pour la faire
   passer de « repro-aval non confirmée » à un fait établi ou clos. *Preuve de done* : sortie
   node de la repro fournie dans `rapport_redteam_code.md:44-55`.

**Convergence**

8. Une fois A(1-4) et B(5-7) traités, relancer un run Pong signé (`pong_r3`). *Preuve de
   done* : `software_verdict` != `FAIL`, `decision` != `BLOCKED`.
9. Gate Pierre explicite avant tout commit (rappel CLAUDE.md — HumanGate décide
   merge/reject/freeze, jamais un agent).

---

## SKIPPED_VALIDATION

- Aucun oracle Forge relancé (mutation gate, `s10a`/`s10s`, `verify_run`) — hors périmètre
  explicite de cette mission (« ne pas relancer de run Forge ni le gate mutation »). Les
  chiffres cités (58/126, budget, etc.) sont lus tels quels dans le reçu signé existant
  (`lab/forge_runs/pong/verdict.json`), pas recalculés.
- La repro F1 du red-team (mis-scoring à grande vitesse, HIGH) n'a **pas** été ré-exécutée
  par cette mission — le permis `run` de ce contrat ne couvre pas l'exécution de scripts ad
  hoc hors `07_TESTS/`. Statut : citée comme fait rapporté par un red-team antérieur du
  2026-07-26, non confirmée ni infirmée ici.
- Le comportement réel de `window.close()` (constat « quitter ») n'a **pas** été observé
  dans un vrai navigateur par cette mission (permission `run` de ce contrat = lecture seule,
  pas d'ouverture de fenêtre navigateur). La conclusion s'appuie sur (a) la lecture directe
  du code (`exit.mjs`), (b) le commentaire du code lui-même qualifiant l'appel de
  « best-effort », et (c) le comportement de plateforme documenté et largement connu des
  navigateurs modernes pour `window.close()` sur une fenêtre non ouverte par script — pas sur
  une exécution observée ce jour.
- Les 52 fichiers `docs/forge/*.md` n'ont pas été lus individuellement (seuls les noms et
  dates ont été inventoriés) — classe « mixte, audit de volume recommandé » plutôt qu'une
  classification fichier par fichier, hors périmètre temporel de cette mission.
- `scripts/forge/adapters/godot/*` et `fixtures/godot_b0/*` (session Godot parallèle) ont été
  inventoriés par listing de fichiers uniquement, jamais lus en détail ni exécutés — conforme
  à l'instruction explicite du contrat de ne jamais y toucher.
- Godot lui-même (capture, build, export) n'a pas été testé sur ce poste : `GODOT_BIN` absent,
  fait déjà documenté deux fois dans le wiremap et le rapport `s9-build-standard` — non
  ré-investigué ici.
- `roles.yaml` (modifié en arbre de travail au moment de cet audit) a été inventorié mais pas
  diffé en détail — sa modification appartient à une session en cours, hors périmètre de
  lecture approfondie ici.

`SKIPPED_VALIDATION: voir liste ci-dessus (7 éléments) — rien d'autre sauté.`

---

## Contrat de sortie (résumé structuré)

```json
{
  "resume_1_phrase": "Le noyau logique de Pong est solide (95% mutation, 50/50 tests verts) mais les 4 constats de Pierre tracent tous à la même cause structurelle : le profil standard saute le seul type de preuve qui exerce une interaction humaine réelle en navigateur, et 2 des 4 constats (adversaire, lisibilité score/fin) ne sont même jamais spécifiés dans le wiremap.",
  "rapport_path": "docs/audit/AUDIT_ALLEGEMENT_A1_CHAINE_2026-07-27.md",
  "git_status_final": "seul ce fichier ajouté par cette mission ; le dépôt porte par ailleurs des modifications concurrentes d'autres sessions (driver.py, wiremap.json, exit.mjs, audio.mjs, mutation_triage.json, contrats, etc.) non touchées ici — présentes avant le début de cette mission",
  "skipped_validation": [
    "gate mutation / s10a / s10s / verify_run non relancés (hors périmètre)",
    "repro F1 red-team (mis-scoring grande vitesse) non ré-exécutée (hors permission run)",
    "window.close() non observé en navigateur réel (hors permission run) — conclusion basée sur lecture de code + comportement de plateforme documenté",
    "52 fichiers docs/forge/*.md inventoriés par nom/date seulement, non lus individuellement",
    "scripts/forge/adapters/godot/* et fixtures/godot_b0/* inventoriés par listing seul, jamais lus en détail ni exécutés (conforme à l'instruction de ne jamais y toucher)",
    "Godot (capture/build/export) non testé sur ce poste — GODOT_BIN absent, déjà documenté",
    "roles.yaml modifié en arbre de travail — inventorié, non diffé en détail"
  ],
  "software_verdict": "OK",
  "evidence_verdict": "MECHANICAL_VALIDATION_ONLY",
  "claim_verdict": "NO_CLAIM_ALLOWED"
}
```
