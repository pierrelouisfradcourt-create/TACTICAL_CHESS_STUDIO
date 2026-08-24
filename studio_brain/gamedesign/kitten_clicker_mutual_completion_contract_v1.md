# Kitten Clicker — Mutual Game Design Completion Contract V1.1 (Lot C.4, PROPOSED — à ratifier par Pierre)
*V1.1 : test à contexte vierge (0 contradiction, 6 renvois non autonomes) — les 10 boucles et les 14 champs nommés en ligne, « consommé » défini, gloses ajoutées. C.4 est le contrat COMPAGNON de C.3 (`kitten_clicker_game_loop_architecture_v1.md`) : ses renvois sont normatifs.*
*Date : 2026-08-24 · Source : ratification de C.3 V1.2 par Pierre avec réserve méthodologique (« le 6/10 architectural est un
DIAGNOSTIC de la Forge actuelle, jamais un niveau acceptable pour passer au WireMap ») et son cadrage C.4. Aucun code, aucune
valeur, aucune WireMap. Ce contrat fait de la boucle Art ↔ GM une véritable ÉTAPE DE CONCEPTION : les deux piliers complètent
les boucles de C.3 une à une, jusqu'à ce que la WireMap n'ait plus RIEN à inventer.*

## Les deux règles dures
> **R1 — Freeze.** Un pilier ne peut déclarer `READY_FOR_FREEZE` s'il existe une question bloquante de l'autre pilier
> (déjà portée par le validateur du Lot F : `ready` refusé tant qu'une question reçue est sans réponse — R1 l'étend : une
> question bloquante ÉMISE et non fermée bloque AUSSI le déclarant).
> **R2 — Complétude.** Une boucle ne peut être `COMPLETE` que si (a) son PRODUIT est consommé par une autre boucle (matrice
> C.3) ET (b) sa TRANSFORMATION est perceptible par le joueur (quelque chose à voir et/ou à faire — règle maîtresse C.2).
> Une boucle structurellement présente qui ne change rien au jeu n'est pas une boucle : c'est un slot rempli.

## Rappels de C.3 (pour lecture autonome)
Les 10 boucles, dans l'ordre de traitement : **CORE · GAMEPLAY · PROGRESSION · CONTENT · ECONOMY · SKILL · WORLD · QUEST · META ·
ART↔GM** (la 10ᵉ est le présent protocole lui-même). Les 14 champs d'une boucle : PURPOSE · PLAYER_ACTION · INPUT · STATE_CHANGE ·
REWARD · DECISION · OUTPUT · NEXT_LOOP · CONTENT_REQUIRED · ART_REQUIRED · GM_REQUIRED · ECONOMY_REQUIRED · PROOF ·
MÉTRIQUE_PROPRE (la mesure qui n'appartient qu'à cette boucle). « Consommé par une autre boucle » (R2a) = le PRODUIT de la boucle
apparaît dans la colonne « Consomme » d'au moins une autre boucle de la matrice C.3, et son NEXT_LOOP la nomme. `heritage/` = la
mémoire inter-run du design (art_bible, gm_worldscan, design_questions), à écrire dès le freeze (futur lot de code).

## Le protocole, par boucle (l'ordre des boucles = l'ordre de C.3, Core d'abord)
```text
GM PROPOSE la boucle          (les 14 champs C.3, avec ce qu'il SAIT ; les trous marqués QUESTION, jamais remplis en silence)
        ↓
ART VÉRIFIE la représentation (représentation possible ? contenu manquant ? interaction possible ? — pour CHAQUE état/animation/
        ↓                      affordance exigé par la boucle)
ART DEMANDE ce qui manque     (questions causales adressées au GM : « pourquoi le joueur fait-il ceci ? », blocking si nécessaire)
        ↓
GM RÉPOND / MODIFIE           (la réponse MODIFIE la boucle — champs C.3 réécrits, pas une réponse à côté)
        ↓
ART COMPLÈTE                  (états, animations, feedbacks, contraintes — dans l'Art Bible, référencés par la boucle)
        ↓
GM VÉRIFIE la boucle          (R2 : produit consommé + transformation perceptible ; sinon la boucle reste OPEN et le cycle recommence)
        ↓
boucle suivante
```
États d'une boucle pendant la conception : `PROPOSED → REPRESENTED → COMPLETE | OPEN(questions)` — portés par le canal du
Lot F (`design_questions.json` : chaque question porte désormais un `loop_id` de C.3 ; `design_state` compte par boucle).
Le freeze global exige : toutes les boucles `COMPLETE` au sens R2 **ou** explicitement `DEFERRED` par décision humaine
(HumanGate), jamais par un agent.

## Les tests concrets (Kitten Clicker) — ce que chaque boucle doit rendre OBSERVABLE avant d'être COMPLETE
```text
CORE      caresser un chat → réaction du chat → ronron / animation / ressource → possibilité d'agir
GAMEPLAY  produire/adopter un chat → le chat REJOINT LE MONDE → le monde change
WORLD     les chatons OCCUPENT les lieux → le lieu évolue → nouvelle activité
CONTENT   activité → nouveau chat / objet / animation / skin (qui appelle le suivant)
SKILL     activité maîtrisée → nouvelle capacité → nouvelle activité
PROGRESSION  jalon franchi → possibilité nouvelle (jamais +X %) → jalon suivant
QUEST     objectif → action → récompense → nouvelle possibilité
META      monde complété → prestige → nouvelle saison / nouvelle zone / nouvelle vie de chats
```
**L'économie vient ENSUITE connecter ces transformations** (jamais l'inverse) :
```text
ACTION → RESSOURCE → CHOIX → OBJET / CHAT / BÂTIMENT → TRANSFORMATION DU MONDE → NOUVELLE POSSIBILITÉ
```
Chaque ressource : source · sink · fonction dans la progression — une ressource qui ne fait que ralentir un unlock est refusée.

## Ce que ça change au mécanisme existant (Lot F) — contrat, pas code (le code viendra après ratification)
1. `design_questions.json` : chaque question et chaque réponse portent `loop_id` (une des 10 boucles C.3) ; une question sans
   boucle est refusée (elle ne construit rien).
2. `design_state` : compte PAR BOUCLE (`loops: {core: COMPLETE, world: OPEN(2), …}`) en plus des compteurs globaux ;
   `shared_design_pct` = boucles COMPLETE / 10.
3. Les rondes ne sont plus « R1 vue / R2 complétion » mais « autant de cycles du protocole que le budget de rondes permet »
   (le plafond de rondes reste une décision de profil ; à 2 rondes, viser Core + Gameplay + la décision 1 COMPLETE, le reste
   PROPOSED/DEFERRED explicite — un jeu partiel HONNÊTE vaut mieux qu'un jeu complet déclaré).
4. R1 (freeze) et R2 (complétude) deviennent des règles du validateur et de la gate `design_freeze` (futur lot de code, avec
   le schéma GM 10 boucles + MÉTRIQUE_PROPRE + `heritage/` au freeze — un seul lot après ratification de C.4).
5. Le GM ne peut pas remplir un trou en silence : un champ qu'il ne sait pas remplir DEVIENT une question (`loop_id`, blocking
   si la boucle ne peut pas être COMPLETE sans).

## Anti-modèles (mesurés, interdits par ce contrat)
- « jardin », « bâtiment », « nouveau contenu » écrits sans que personne ne détermine comment cela devient une expérience
  jouable et visible (cas Kitten, 6 versions).
- Un `game_master` complet produit SANS répondre aux questions bloquantes de l'Artiste (run 10h) — interdit par R1.
- Une convergence qui ne modifie aucune boucle (« théâtre de questions », C.3 §10) — la mesure est « champs de boucle
  complétés PAR le dialogue ».
- Un slot rempli qui ne change rien au jeu (boucle « valide de forme ») — interdit par R2(b).

## Test de validité (même méthode)
Un agent à contexte vierge lisant CE document seul doit pouvoir : (1) dérouler le protocole pour UNE boucle donnée (qui parle,
qui décide, quand la boucle est COMPLETE) ; (2) énoncer R1 et R2 et dire ce qu'elles interdisent chacune ; (3) dire ce qui
arrive à une boucle que personne ne sait compléter (DEFERRED par HumanGate, jamais par un agent) ; (4) dire ce que porte
désormais chaque question du canal (`loop_id`) et comment se calcule le freeze ; (5) appliquer R2 au cas « jardin = sprite
non cliquable » et conclure. Toute réponse exigeant une invention = document incomplet.
