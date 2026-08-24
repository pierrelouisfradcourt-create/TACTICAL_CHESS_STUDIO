# Audit — GAME CONCEPT / LOOP COMPLETENESS (Kitten Clicker + Forge)
*Date : 2026-08-24 · Commandé par Pierre (run 10h mis en observation) · Exécuté par un sous-agent Opus en lecture seule, en deux
passes (rapport principal, puis section corrigée « 6 versions de Kitten Clicker ») · Confronté par Fable : héritage gaté sur
`project.godot` (retour anticipé lu dans `driver.py:703-706`), `_SOURCES_CONSUMED_KEYS` sans clé `design` (`run_real.py:1534`),
`LOOP_NAMES` = 6 sans quest/world/skill, `game_master` du run halté rejoué `ok:true`, exclusivité des métriques recalculée
identique (3 exclusives, toutes meta_loop), `product_snapshot.md` V5 vérifié (« I now have the complete, exact contract from the
three oracles… »), V1 `Intention {AUCUNE, CARESSER, ACHETER, PRESTIGE, BONUS}` vérifié. Le « faux déblocage V6 » recoupe la
red-team du run 9 (affordances de branche mortes) : deux mesures indépendantes concordantes.*

## GAME_CONCEPT_VERDICT : PARTIAL
La proposition de jeu existe et est ratifiée (C.2 : monde observable, règle maîtresse « UNLOCK = possibilité perceptible »,
décisions non dominées — la non-dominance est la SEULE propriété de conception mécaniquement prouvée du dépôt, run 9). Sa
traduction machine est valide de forme sans mesurer son identité.

## LOOP_STATUS (Kitten Clicker, niveau design + game_master)
| Boucle | Statut | Fait porteur |
|---|---|---|
| CORE | TESTED (mécanique) / DOCUMENTED_ONLY (identité) | prouvée sonde run 9 ; « la caresse qui fait réagir le monde » sans métrique |
| GAMEPLAY/PLAYER | PASSIVE | 0 métrique exclusive |
| PROGRESSION | DOCUMENTED_ONLY | C.2 §3 + grey_blocks 14/14 chaînés unlock→next_goal ; jamais construite (8 runs HALTED depuis) |
| ECONOMY | IMPLEMENTED | economy.json projeté ; sinks périmés C.1 (`acheter_place`) encore présents |
| META | TESTED (partiel) | seule boucle à métriques exclusives ; resets + ADVANTAGE prouvés run 9 |
| QUEST | NOT_FOUND (schéma) | `next_goal` optionnel, sans récompense ni condition |
| CONTENT | PASSIVE | slot présent, 0 métrique propre ; tableau C.2 §5 sans équivalent structuré |
| WORLD/MAP | NOT_FOUND (schéma) | états LOCKED/AVAILABLE/ACTIVE/FULL écrits côté Art, non consommés en boucle |
| SKILL/TECH | NOT_FOUND | arbre C.2 §7 : 1 nœud sur 5 adressable (`brosser` ×0) |
| ART ↔ GM | BLOCKED (run 10h) | 3 questions Art (2 bloquantes), 0 réponse ; le GM a produit un game_master complet SANS répondre = invention silencieuse |

**Mesure d'exclusivité** : core/progression/player/content/economy = AUCUNE métrique exclusive ; meta = 3
(`m_decision2_cost`, `m_heart_bonus`, `m_kibble_rate`). 5 boucles sur 6 sont satisfiables en re-pointant les métriques d'une autre.

## SIX_PROTOTYPE_AUDIT — les 6 versions Godot de Kitten Clicker (V1 = run 3 … V6 = run 9)
**Ce qui a changé ludiquement, en 6 runs — deux choses, datables** : (1) V4 : les actions jouables passent de 1 à 4 (et y restent) ;
le vocabulaire de boucle apparaît (loop.json 8 → 12 → 13 rôles). (2) V6 : une décision non dominée existe et est mesurée
(inversion idle/actif prouvée sur la scène réelle).
**Ce qui n'a JAMAIS changé** : une seule ressource (purrs→ronrons) · prestige = multiplicateur, jamais une transformation ·
aucun lieu jouable (le jardin est un `TextureRect` en `MOUSE_FILTER_IGNORE` en V5 comme en V6) · aucune quête ne porte de
récompense (le registre le plus riche est V3, régressé en texte libre au V6) · contenu = quatre listes plates sans enchaînement ·
l'objectif « nouveau » = un compteur collé à une phrase (V5 : « Palier %d — %s » ; V6 : « %s [ronrons %d] » — les commentaires du
code ASSUMENT que c'est pour satisfaire `new_distinct`).
**Collisions d'identité** : V1→V2→V3 (une seule action, triple collision — et V1→V2 est une régression : V1 prouvait sa
solvabilité par un chemin bot-only que l'écran n'offrait pas) ; V4→V5 (la seule addition = un sprite non cliquable) ;
V5→V6 partielle (rompue uniquement par la DECISION).
**Faux déblocage V6** : `_spawn_branch_affordance()` crée Panel+Label dans le groupe `affordance` ; `input_adapter.act()` ne
connaît que 4 verbes → `caresse_longue`/`placer_au_jardin` satisfont `appears` et FUTURE **sans être jouables**.
**Artefact détourné** : `product_snapshot.md` V2→V6 commence par « I now have the complete, exact contract from the … oracles
that will judge this artifact » — l'instantané produit décrit comment passer les vérificateurs, plus le jeu.
**Synthèse (INFERRED)** : six runs ont fait progresser la PREUVE de la boucle (rôles mesurés 0 → 13) beaucoup plus vite que la
BOUCLE (actions jouables 1 → 4, figé depuis V4). Le HumanGate FAIL du run 9 nomme les quatre invariants que le code confirme.
C.1/C.2 (postérieurs au V6) répondent aux quatre — aucune version ne les a construits ; les 8 runs suivants sont HALTED avant s9.

## Annexe — autres prototypes de la Forge
auto_battler CLEAR (mais conçu hors Forge, sessions Pierre×Claude) · menagerie_tactics PARTIAL (seul charter avec
`identite_propre` ; décision non dominée observée) · bomberman_3d PARTIAL · tetris PARTIAL (concept auto-déclaré manquant) ·
pacman, breakout_v2 UNDERDEFINED (motivation impossible à répondre) · collision : critère de démo quasi verbatim partagé
pacman/breakout_v2 ; « démarrer → agir → fin → rejouer » interchangeable sur 4 jeux. **Cause mesurée** : le charter s0 (7 champs)
n'a aucun champ boucle/économie/récompense/quête — jusqu'au 2026-08-23, la Forge n'avait nulle part où écrire une boucle de
gameplay ; le seul bloc `loops` amont (worldscan) est temporel (minute_1…endgame) et advisory, décrivant les jeux de référence.

## MISSING_DESIGN_ARTIFACTS (avant WireMap)
`art_response.json` jamais produit ce run · héritage inter-run absent (couplé au succès du build) · preuve de CONSOMMATION du
design absente (`_SOURCES_CONSUMED_KEYS` sans clé `design` ; 20/20 métriques citent `design:…` sans résolution possible) ·
0 preuve `humangate` dans proof_model (C.2 en exige sur toutes les étapes) · réalignement C.1→C.2 non fait dans le game_master
(`gb_place2` subsiste ; `accueillir`/`amenager` restent de la prose).

## DESIGN_FREEZE : FREEZE_ALLOWED = false (run 10h)
`ready_for_freeze` ART=false GM=false · `blocking_gaps: 2` · `answered: 0` · gate jamais atteinte · le GM a inventé en silence
(game_master complet sans répondre aux 2 questions bloquantes de l'Art, `open_to_art: 0`). Les 3 questions de l'Art sont
exactement les bonnes (lucarne « ? » vs teaser ; éviter « deux boutons jumeaux qui tuent la décision » ; curiosité vs attente).

## RECOMMENDED_NEXT_LOT (un seul — lacune structurelle, mesurée, cause démontrée d'une répétition)
**Découpler la mémoire de design de la réussite du build.** `_write_heritage_best_effort` retourne sans rien écrire si
`project.godot` n'existe pas (driver.py:703-706) ; 10d et 10g ont convergé (100 %, 2/2) puis sont morts à s9 → `heritage/`
jamais écrit → 10h repart d'un round 1 vierge et retombe sur le même canal. Écrire `heritage/` dès le `design_freeze`
(art_bible, gm_worldscan, design_questions), l'art_response s'y ajoutant après s9. *(Écarté volontairement : ajouter `design`
aux sources consommées = durcissement d'oracle, pas un déblocage — loi du déplacement.)*

`software_verdict par surface` : design ratifié OK · traduction GM OK (schéma) / FAIL (alignement C.2) · canal Art↔GM BLOCKED ·
schéma de boucles OK dans son périmètre · preuve de consommation FAIL · héritage FAIL · V1-V3 BLOCKED, V4-V5 FAIL, V6 OK partiel.
`evidence_verdict: MECHANICAL_VALIDATION_ONLY` · `claim_verdict: NO_CLAIM_ALLOWED` · `no_global_ready_verdict: true`
