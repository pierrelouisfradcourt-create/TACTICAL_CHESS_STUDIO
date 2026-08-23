# Audit lecture seule — Kitten Clicker : le Game Design porte-t-il une progression transmissible ?

*Date : 2026-08-23 · Commandé par Pierre (5 vérifications + table des 8 surfaces) · Exécuté par un sous-agent Opus en lecture seule ·
Confronté par Fable aux sources avant dépôt (voir « Confrontation Fable » en fin).*

## 0. Prémisse corrigée
Le run 9 (`_run9_20260823a/verdict.json`) est `software_verdict: FAIL`, `decision: BLOCKED` (oracles code et standard FAIL : e2e
`DirAccess`, `search_consulted`, `reuse_ratio_wired`). Ce qui est vert : la sonde `player_loop` 13/13 (`reached_role: ADVANTAGE`),
DECISION 6/6, solvabilité 20/20. **Une sonde verte dans un verdict rouge**, pas un build prouvé.

## 1. Boucle gameplay — reconstruction maillon par maillon
| Maillon | Design (`design_intent.md`) | GM (`gm_worldscan.json`) | Prisme | `loop.json` | Code run 9 |
|---|---|---|---|---|---|
| OBJECTIF | l.12 + V1 « Caresse la pelote… » | **absent** | `a_goal` → `worldscan:games[1].objectives[0].player_goal` (= Neko Atsume) | `steps[0]` | `goals.gd:19` |
| ACTION | l.13 « CLICK » | Cookie Clicker 1/clic | `b_click` affordance `pelote` | `steps[1]` repeat 5 | `input_adapter.gd:70-73` |
| FEEDBACK | l.26 ; V1 guidage | **absent** | `c_response` (SYSTEM) + `visual_click_feedback` (NONE) | `steps[4]` sans affordance | `game_controller.gd:214-220` |
| RÉCOMPENSE | l.13 « RONRONS » | Cursor 0,1/s (CC) | `d_reward` | `steps[5]` | `economy.gd:57-63` |
| NOUVELLE POSSIBILITÉ | l.13-14 ; V1 l.13-23 | **absent** | `f_unlock` (`acheter_chaton`, appears `lieu_2`) | `steps[7]` | `game_controller.gd:232-247` |
| NOUVEL OBJECTIF | V1 l.22 | **absent** | `g_next_1/2` new_distinct | `steps[8-9]` | `goals.gd:30-31` |

Trois constats : (1) **le GM ne porte aucun maillon de ce jeu** — 8 dimensions / 34 variables, toutes Cookie Clicker et Neko Atsume,
conforme à `s2.7-gm-worldscan.yaml:76-80` (« cette station mesure le GENRE, elle ne calibre pas le produit ; concevoir le jeu = le
Game Master, station suivante ») — **station suivante inexistante** (`scripts/forge/contracts/` n'a aucun contrat Game Master ;
ordre réel s2.7 → s1). (2) **17 des 21 exigences du Prisme référencent un jeu tiers** (14 `worldscan:`, 4 `story_bible:`, 1
`gm_worldscan:`, 2 `null`) ; aucune ne peut citer le design : le schéma d'adresse `s1-prisme.yaml:113-116` n'admet que
`worldscan:|story_bible:|gm_worldscan:`. (3) **NEXT_GOAL passe par un artifice** : `goals.gd:26-29` suffixe `[ronrons N]` pour
garantir la distinction textuelle ; `data.seen.objectif` = quatre fois la même phrase à `[ronrons N]` près ; `new_distinct` =
« texte jamais vu » (`player_loop.gd:442-446`).

## 2. Progression
Seul `direction_produit_v1.md:14-23` écrit une causalité de palier — non traversée par un run. Paliers réels du run 9 : chaton 1
(5) fait apparaître `placer_au_jardin` ; chaton 3 (15) fait apparaître `lieu_2` ; amélioration L0 fait apparaître `caresse_longue` ;
tout le reste = +X/s. **3 possibilités nouvelles sur ~10 achats, dont 2 mortes** (`input_adapter.gd` `act()` : `_: pass` pour
`placer_au_jardin` et `caresse_longue`) — et ces affordances mortes servent de preuve FUTURE à la DECISION. Le jalon de
prestige V1 n'est **pas exprimable** dans `loop.json` : aucun champ de prérequis (`loop_spec.mjs:85-120`) et tri alphabétique
des ids dans un rôle (`loop_spec.mjs:78-79`) — `p_fill_refuge` passerait avant `p_open_garden`.

## 3. Métriques de métagame
| Métrique | Amont (design/GM/Prisme/registre) | Code run 9 | Statut |
|---|---|---|---|
| Coût d'adoption | ✗ | `pricing.gd:9,15-16` 5,10,15,20,25,30 | INVENTÉ |
| Production passive | champ exigé sans valeur | `kittens.json` 1,1,2,2,3,3 | INVENTÉ |
| Coût d'amélioration | ✗ | `pricing.gd:11-12,19-20` 8+4L | INVENTÉ |
| Rendement amélioration | « strictement plus » | `upgrades.gd:18-19` 2^L | INVENTÉ |
| Temps par palier | ✗ | dérivable seulement | NOT_FOUND |
| Nb décisions significatives | V1 : 2 | 1 | 1 mesurée / 2 documentées |
| Nb possibilités débloquées | V1 : 5 | 3 (2 mortes) | DOCUMENTED_ONLY |
| Seuil de prestige | V1 : 5 chatons + jardin | `prestige.gd:9` = **1** | INVENTÉ, contredit V1 |
| Bonus permanent | V1 : +25 % clic ET prod | `prestige.gd:17-18` = **+100 % prod, 0 % clic** | INVENTÉ, contredit V1 |
| Vitesse post-prestige | V1 qualitatif | ✗ | NOT_FOUND |
| Niveau 1 / niveau 2 | V1 l.36-42 | 0 occurrence (`coeurs`, `album`, `grenier`) | DOCUMENTED_ONLY |

**Aucune valeur numérique n'existe en amont du builder** : le schéma d'exigence (`s1-prisme.yaml:104-107`) n'a aucun champ
numérique ; 0 nombre dans les 24 feuilles de `featuremap.json`.
Contradictions : (i) coût `8+4L` vs rendement `2^L` — 260 ronrons cumulés achètent ×1024 ; le GM portait le remède (×1,15 par
achat, `dimensions[progression].variables[1]`), non consommé ; (ii) seuil de prestige 1 + bouton construit au boot
(`game_controller.gd:181-182`) ; (iii) prestige ne reset que `ronrons`, conserve chatons et améliorations (`prestige.gd:25-33`) →
méta-boucle strictement dominante ; (iv) bonus absent de `click_value()` (`input_adapter.gd:62-63`) ; (v) `PASSIVE_UNIT = 0,5`
appliqué **par trame** (`economy.gd:11,63`) et affiché « Ronron/s » (`game_controller.gd:303`) → l'écran annonce 1,0 pour ~60/s réels.
**Temps par palier calculé** (60 fps) : les 6 chatons (105 ronrons) en ≈ 0,85 s idle, ≈ 0,5 s actif. Le charter promet
« jouable plusieurs heures » ; aucun document ni oracle ne porte une durée.

## 4. Métagame — le prestige a-t-il une fonction ?
| Étage | Reset observable | Conservé | Bonus permanent | Nouvelle stratégie |
|---|---|---|---|---|
| Design V1 | ✓ | ✓ | ✓ (+25 %) | ✓ |
| GM | ✗ | ✗ | ✗ | ✗ |
| Prisme `i_prestige` | ✓ `resets` | ✗ | qualitatif, sans HUD nommé | ✗ |
| Code run 9 | ronrons seulement | chatons + améliorations | +100 % prod, 0 % clic | ✗ |
1/4 dans le code, 1/4 dans le Prisme, 0/4 au GM, 4/4 dans la V1 non traversée. La chaîne exige une présence (`checkLoopSpec` (h))
et un `resets` : **rien ne distingue un prestige d'un bouton reset**.

## 5. Documentation → production : qui lit quoi ?
`design_intent.md` n'est injecté par **aucune** étape (`_UPSTREAM_BY_STEP`, `run_real.py:1629-1683`) ni lu par aucun
`mandatory_read` ; `PROJECT_BIBLE.md` (seul réceptacle connu de `s0-contrat.yaml:26`, `studio_link.py:576-586`) n'existe pas pour
ce projet. Le design ne circule que par la prose de `tasks.json`. Le builder ne reçoit ni charter ni Prisme
(`run_real.py:1680-1681` : blueprint, wiremap, art_bible, asset_requests, loop.json).
| Élément | Défini | Lu par | Preuve |
|---|---|---|---|
| adopter | V1 ; Prisme | loop.json → sonde ; check_decompo | ✅ |
| placer | V1 ; tâche s1 (2) | personne au run 9 | ❌ nœud mort (`_: pass`) — PASSIVE |
| place (ressource) | V1 ; tâche s1 (3) | personne | NOT_FOUND |
| jardin | V1 ; `places.json` unlock_tier 3 | `f_unlock` → sonde | ✅ mais s'ouvre en ADOPTANT, pas en l'achetant (contredit V1) |
| jalon de prestige | V1 | personne (pas de prérequis) | ❌ seuil 1 |
| prestige | V1 ; Prisme | sonde `resets` | ⚠️ indiscernable d'un reset |
| cœurs / grenier / croquettes / chatons rares (règle) / décision N2 / album / HUD places | V1 (+ tâches) | personne | NOT_FOUND (0 occurrence) ; décision N2 « HumanGate » par décision de contrat |
| guidage | V1 ; s9 règle (13) | HumanGate seulement | ❌ labels en positions absolues qui se chevauchent |

## Table finale
| Surface | Statut | Justification |
|---|---|---|
| Boucle gameplay documentée | DOCUMENTED_ONLY | écrite dans design + V1 ; 0/21 exigences la citent ; schéma d'adresse ne le permet pas |
| Progression documentée | DOCUMENTED_ONLY | causalité uniquement en V1 ; aucun prérequis dans loop.json ; tri alphabétique |
| Métriques économiques | NOT_FOUND amont / IMPLEMENTED code | toutes les valeurs naissent dans le code du builder ; station de calibration inexistante |
| Métagame | PASSIVE | seuil 1, reset partiel, bonus prod seul, rien ne change après |
| Paliers mesurables | TESTED (forme) | ≥ 3 coûts distincts = règle de variance ; aucune durée nulle part |
| Cohérence Design → GM | BLOCKED | le GM ne voit jamais le design ; son contrat lui interdit de calibrer |
| Cohérence GM → Prisme | PASSIVE | 1 exigence / 21 ; le ×1,15 n'est pas retenu |
| Cohérence Prisme → Runtime | TESTED forme / NOT_MEASURED fond | 13/13 et 6/6, sha égal ; G et J verts pour la mauvaise raison |

## Réponse
**Non : on a commencé à construire avant d'avoir spécifié — parce que la chaîne Forge n'a aucune station habilitée à écrire les
nombres et la causalité d'un jeu ; le builder les a inventés, et les oracles ne mesurent que des présences et des signes.**

## Trous de design à combler avant un run 10 (ordre de causalité)
1. Un document de **calibration** du produit (les 11 grandeurs, dont 5 NOT_FOUND partout : temps par palier, seuil, bonus,
   vitesse post-prestige, écart N1/N2). 2. Un **chemin** par lequel il atteint les étapes (`design_intent`/`PROJECT_BIBLE` ne sont
lus par personne). 3. Une expression de la **précédence** entre paliers (aucun champ ; tri alphabétique). 4. L'**espace comme
ressource** (stock, coût, capacité par lieu, refus lisible). 5. Ce qu'un **prestige doit faire**, lisible par autre chose qu'un
humain (3 propriétés sur 4 renvoyées au HumanGate). 6. Promesse / possession (album, rareté qui fait quelque chose, rares,
grenier, croquettes). 7. Une **contrainte de durée** assumée (« plusieurs heures » n'est traduit nulle part).

## Confrontation Fable (avant dépôt)
Vérifié sur pièces : `design_intent` absent de `run_real.py` et de tous les contrats ; `prestige.gd` (seuil 1, `1 + bonus`) ;
`economy.gd:11,63` + `game_controller.gd:303` ; `loop_spec.mjs:74-80` ; `s2.7-gm-worldscan.yaml:76-80` ; aucun contrat GM/Grey
Blocks. **Nuance** : la sonde ne lit jamais `replay_ref` (seul `replay` du REPEAT est traité) → un step J sans `affordance` mesure
la production passive. Run 8b : `s_advantage_click` portait `affordance: pelote` → vrai clic (100 > 61). Run 9 : `j_advantage` sans
affordance → « 96 > 50 » = production passive. **Défaut de mesure à corriger avant tout run 10** (résoudre l'affordance du step
référencé par `replay_ref`, ou l'exiger dans `checkLoopSpec`). Chemins corrigés : `06_RUNTIME/adapters/input_adapter/input_adapter.gd`,
`game_controller.gd` à la racine du build.

`software_verdict: N/A (audit lecture seule)` · `evidence_verdict: MECHANICAL_VALIDATION_ONLY` · `claim_verdict: NO_CLAIM_ALLOWED` · `no_global_ready_verdict: true`
