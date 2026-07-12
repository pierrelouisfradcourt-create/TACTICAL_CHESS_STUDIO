# PROPOSITION — tranche P1.1 « sondes à défauts connus » (DOCUMENT SEULEMENT)

- **Date** : 2026-07-11
- **Statut** : **PROPOSED — AUCUN CODE, aucune implémentation sans go Pierre**
- **Prérequis de contexte** : tranche P1 mécanique-only CLOSED/FALSIFIED (`P1_MECHANICAL_RESULTS.md`)
- **Gate qu'elle vise à satisfaire** : « pas d'ouverture P1 complet tant qu'un signal mécanique n'a pas démontré une détection orthogonale à P0 »

## 1. Le problème précis que P1.1 attaque

La tranche P1 a laissé une question ouverte et une seule : les métriques **KEEP** (A1/A2/A3/A5, lisibilité) n'ont produit **ni faux positif ni vrai positif** — parce que les deux jeux testés sont réellement propres sur ces axes. Leur pouvoir de détection est donc **non prouvé**, pas réfuté. On ne peut ni ouvrir P1 complet ni enterrer la piste mécanique sans trancher ça.

## 2. L'idée : prouver la détection par injection de défauts contrôlés

Créer des **variantes-sondes** d'un jeu existant (breakout), chacune portant UN défaut visuel injecté, connu, minimal — puis exécuter le capteur EXISTANT (aucune modification du capteur) :

| Sonde | Défaut injecté (1 ligne de CSS/config par sonde) | Métrique censée le voir |
|---|---|---|
| probe-contrast | HUD passé en gris-sur-gris (ratio < 3:1) | A1 |
| probe-tiny-target | `#restart` réduit à ~14 px | A2 |
| probe-empty | niveau quasi vide (2 briques, HUD masqué) | A3 |
| probe-overflow | conteneur élargi au-delà du viewport | A5 |
| probe-clean (contrôle) | AUCUN défaut (copie conforme) | aucune — vérifie le bruit |

Propriétés clés du dispositif :
- **Orthogonalité par construction** : les défauts sont purement visuels — logique, solvabilité, mutation, e2e inchangés ⇒ **P0 reste vert sur chaque sonde** (à vérifier mécaniquement, pas supposer). Tout signal détecté est donc, par construction, invisible à P0.
- **Vérité terrain connue AVANT le run** : chaque sonde déclare le défaut qu'elle porte. La détection se juge mécaniquement (le signal attendu a-t-il tiré ? un signal non attendu a-t-il tiré ?) — pas de jugement humain dans la boucle de mesure, Pierre ne ratifie que le protocole et la conclusion.
- **La sonde-contrôle mesure le bruit** : tout signal sur probe-clean = faux positif compté.

## 3. Critères (posés AVANT le run, comme au contrat P1)

- **Succès** : ≥3 des 4 défauts injectés détectés par LEUR métrique attendue, ET P0 vert sur toutes les sondes, ET 0 signal sur la sonde-contrôle. → la détection orthogonale est DÉMONTRÉE ; le gate de réouverture P1 est satisfait pour la sous-base lisibilité.
- **Échec** : <3 défauts détectés (les seuils-hypothèses ratent des défauts pourtant grossiers) OU du bruit sur la sonde-contrôle. → la piste mécanique lisibilité est réfutée à son tour ; P1 devra chercher un autre organe (et cette conclusion aura été achetée à bas coût).
- **Interdits reconduits du contrat P1** : advisory only, aucun LLM, aucun agrégat, aucun branchement P0, seuils = hypothèses affichées, pas de retuning post-hoc pour faire passer une sonde ratée (un seuil raté = un résultat, pas un bug à masquer).

## 4. Périmètre strictement exclu de P1.1

- **A6** : pas de résurrection. Un éventuel successeur (diff sur région d'intérêt, liveness par horloge de jeu) serait une NOUVELLE proposition, hors P1.1.
- **FTUE genre-conscient (orientation MODIFY)** : documenté ici comme piste ultérieure — la config par jeu déclarerait un `genre` (arcade / tactique / …) et les seuils B1-B3 deviendraient par-genre, avec état salient incluant la sélection. **Pas dans P1.1** : on ne mélange pas « prouver la détection lisibilité » (net, binaire) et « réinterpréter le FTUE » (ouvert, calibrable à l'infini).
- Aucun nouveau jeu, aucun agent, aucun scoring, aucune écriture hors `lab/forge_sensors/` et `games/_probes/` (sondes jetables, marquées non-forge, jamais dans le ledger).

## 5. Coût estimé et livrables si go

- Coût : faible — 4 sondes = 4 copies de breakout à 1 modification chacune + 1 contrôle ; le capteur tourne tel quel ; ~1 session.
- Livrables : `lab/forge_sensors/_probes/…` (rapports par sonde), table détection-attendue vs détection-observée, verdict binaire du critère, et recommandation go/no-go P1 complet.
- TDD : les sondes elles-mêmes n'ont pas de tests (fixtures) ; toute modification du capteur est INTERDITE dans cette tranche (si une s'avérait indispensable, STOP et retour à Pierre).

## 6. Ce que P1.1 ne prétendra pas

Même en cas de succès : la détection sera prouvée sur des défauts **synthétiques et grossiers**. Cela justifie d'ouvrir P1 (le capteur voit quelque chose que P0 ne voit pas), pas de prétendre qu'il attrapera les défauts subtils des vrais jeux forgés. La montée en finesse (palette/art bible, juice) reste le chantier P2 du design doc.

---

Décision demandée à Pierre : go / no-go P1.1, ou toute variante de périmètre. Aucun code n'existe pour cette tranche.
