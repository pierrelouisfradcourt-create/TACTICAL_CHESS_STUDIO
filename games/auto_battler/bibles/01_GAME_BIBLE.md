# Game Bible — Auto Battler

**Version** : 1.1
**Date** : 2026-07-18
**Source** : Game Bible V1 de Pierre (`SOURCE_GAME_BIBLE_V1_PIERRE.md`, notes brutes — jamais réécrites, elles restent telles quelles à côté de ce document) + session de co-conception Pierre × Claude (Fable 5)
**Statut** : DRAFT — ratification Pierre pending
**Rôle** : document de VISION. Le fond est intégralement celui de la V1 de Pierre ; seuls les
changements ratifiés en session sont appliqués, listés un par un dans le Changelog final.
Les termes canoniques viennent de `00_VOCABULARY.md` ; le contrat maître est `00_ARCHITECTURE.md`.

---

## Vision

Créer un auto battler accessible mais extrêmement profond.
Le joueur ne contrôle jamais les combats. Son talent réside dans :

* le recrutement
* l'économie
* le Placement
* les Synergies
* le timing
* l'adaptation aux adversaires

Chaque Match doit raconter une histoire différente.

Ratifié HumanGate 2026-07-18 (Q1–Q2) : identifiants canoniques en anglais, prose en français ;
**Player** = occupant logique d'un Seat (humain, bot ou IA de simulation). La prose de ce
document emploie « le joueur » au sens Player.

## ADN du jeu

Le jeu doit donner la sensation de :

* Hearthstone Battlegrounds
* Teamfight Tactics

sans copier directement leurs mécaniques.
Les combats doivent être rapides, lisibles et satisfaisants.

## Piliers

### 1. Décisions importantes
Chaque achat compte. Chaque vente compte. Chaque déplacement compte.
Aucune action ne doit être « évidente ».

### 2. Toutes les règles et probabilités sont connues
Aucun hasard caché. Les probabilités sont connues. Les règles sont simples.
Nuance : le jeu comporte du hasard (Shop, tirages du Pool), mais à distributions publiées —
probabilités affichées = probabilités réelles (invariant P4, `00_ARCHITECTURE.md`) ; le joueur
ne voit pas tout l'avenir comme aux échecs, il connaît en revanche exactement les règles et
les chances.

### 3. Profondeur émergente
La complexité vient des interactions. Jamais des règles.

### 4. Partie courte
Objectif : 20 à 30 minutes.

## Structure d'un Match

Un Match rassemble N Seats dans un Lobby. **N est un invariant de design** (valeur de
référence **N = 8**) : il calibre le Pool, les probabilités de la Shop, la durée et la
pression économique. Détail et paramétrage : Core Rules (principe P3, `00_ARCHITECTURE.md`).

## Boucle principale

Début de Round
↓ Revenus + nouveau Shop
↓ Preparation State — fenêtre unique : Buy, Sell, Reroll, Lock, LevelUp, Place (Merge automatique)
↓ ConfirmPreparation
↓ Combat automatique
↓ Round Resolution (rewards, damage, progression)
↓ Nouveau Round

## Économie

Le joueur possède :

* du Gold
* un Level
* sa vie

Le Gold sert à :

* acheter
* Reroll
* monter de Level

L'économie doit être aussi importante que le Combat.

Ratifié HumanGate 2026-07-18 (Q3) : **Life** = ressource du Player/Seat ; **Health** = points
de vie d'une Unit. Les deux termes coexistent, jamais interchangeables.

## Shop

À chaque Round, une Shop aléatoire apparaît.
Les unités disponibles dépendent :

* du Level du joueur
* de la Rarity
* du Pool partagé

Le joueur peut :

* acheter
* Lock
* Reroll

## Pool partagé

Toutes les unités existent en quantité limitée.
Acheter une Unit réduit les chances des autres Seats de l'obtenir.
Cette règle favorise :

* l'adaptation
* la lecture du Lobby
* les contres

## Niveaux

Monter de Level :

* augmente la taille de l'équipe
* débloque les unités rares
* améliore les probabilités

## Merge

Trois Units identiques → Merge → version améliorée.
Un Merge :

* augmente les statistiques
* améliore les Abilities
* peut modifier certains effets

Ratifié HumanGate 2026-07-18 (Q4/Q6) : **Merge** = l'action (automatique dès 3 Units
identiques), **Star** = le rang résultant (`3× Wolf → Merge → Wolf ★2`) ; « Level » reste
réservé au Player ; « fusion » n'est que la traduction française en prose.

## Placement

Le terrain influence énormément le Combat.

* Première ligne — Tank
* Deuxième ligne — Bruiser
* Arrière — Supports
* Coins — Protection
* Centre — Zone de contrôle

Cible : le Placement doit être responsable d'environ **30 % de la victoire**. Ce chiffre est
un **objectif mesurable**, à vérifier par protocole de mesure pré-enregistré (Meta Bible pour
l'objectif, Simulation Bible pour le protocole) — pas une constante magique du moteur.

## Déroulement d'un Combat

Début
↓ Buffs initiaux
↓ Déplacement
↓ Recherche de cible (Targeting)
↓ Attack
↓ Gain de Mana
↓ Cast des Abilities
↓ Mort
↓ Nouvelle cible
↓ Fin

## Comportement automatique des Units

Chaque Unit possède :

* une priorité de cible
* une distance préférée
* un style de déplacement
* une utilisation de ses Abilities
* un comportement spécial

Aucune micro-gestion par le joueur.

## Mana

Le Mana se remplit — ratifié HumanGate 2026-07-18, gate #3 (QB-11), UNIQUEMENT par :

* attaque
* dégâts reçus
* effets déclarés en DSL

(La V1 incluait « avec le temps » — retiré au gate #3 ; voir Changelog, delta 8.)

À Mana plein : l'Ability est lancée (Cast).

## Système de combat

Les combats doivent être :

* lisibles
* rapides
* spectaculaires
* mais **déterministes**.

Ce déterminisme s'appuie sur deux principes du contrat maître : le moteur est une simulation
pure (P1 — même état + mêmes entrées = même résultat, toujours) et le Renderer est un simple
lecteur d'événements (P2 — le spectacle ne touche jamais à la règle). Les détails vivent dans
les Core Rules.

Le joueur doit comprendre pourquoi il gagne ou perd.

## Synergies

Les Synergies sont le cœur du jeu.
Une Unit peut appartenir à :

* 1 ou plusieurs Origins
* 1 ou plusieurs Classes

Exemple — Origin : Dragon. Class : Mage.

## Activation

Les bonus apparaissent uniquement à certains Thresholds.
Exemple : 2 / 4 / 6 / 8 Units.
Jamais de bonus linéaire.

## Items

Les Items :

* améliorent
* transforment
* ou spécialisent une Unit.

Ils doivent modifier les décisions du joueur. Pas seulement augmenter les statistiques.

## Progression

Le joueur devient plus puissant par :

* l'économie
* les Levels
* les Synergies
* les Items
* les Merges

Jamais uniquement grâce à la chance.

## Aléatoire

Le hasard doit créer des situations nouvelles.
Jamais décider directement du vainqueur.

## Défaite

Après chaque Combat perdu, le joueur perd des points de vie.
Les dégâts dépendent :

* des survivants
* du niveau du Round

## Élimination

Quand la vie atteint zéro, le joueur est éliminé.
Le dernier survivant gagne le Match.

## Lisibilité

Chaque Unit doit être reconnaissable immédiatement.
Silhouette. Couleur. Animation. Ability.

## Feedback

Le joueur doit toujours comprendre :

* pourquoi il gagne
* pourquoi il perd
* quelle Synergy fonctionne
* quelle Unit est décisive

## Objectifs de design

* Facile à apprendre.
* Difficile à maîtriser.
* Chaque Match différent.
* Aucune stratégie dominante permanente.
* Toutes les Units jouables.
* Les décisions du joueur expliquent davantage les victoires que la chance.

## Ce que le jeu ne doit jamais devenir

* Un RPG.
* Un MOBA.
* Un deckbuilder.
* Un jeu à micro-gestion.
* Un simulateur de statistiques.

## Principes d'équilibrage

Un nerf ou un buff doit privilégier :

* les comportements,
* les interactions,
* les timings,

avant de modifier les statistiques brutes.

## Philosophie finale

Le joueur construit une armée.
Le Combat raconte l'histoire de ses décisions.
L'objectif n'est pas d'être plus rapide que l'adversaire.
L'objectif est d'avoir pris de meilleures décisions plusieurs Rounds auparavant.

## Documents spécialisés

Cette bible constitue le socle. Sa déclinaison en documents de référence est définie par le
contrat maître **`00_ARCHITECTURE.md`** (RATIFIÉ) : 16 bibles ordonnées (invariants →
systèmes → contenu → validation → implémentation → déploiement) plus les transversales
(`00_TEMPLATE.md`, `00_VOCABULARY.md`). La liste de 7 bibles esquissée dans la V1 est
remplacée par cette architecture.

---

## Changelog V1 → V1.1

Seuls changements appliqués — tout le reste est le fond V1 de Pierre, inchangé.

1. **Pilier 2 renommé** : « Information parfaite » devient « Toutes les règles et
   probabilités sont connues » (principe P4 de `00_ARCHITECTURE.md`), avec une phrase de
   nuance : hasard à distributions publiées, pas d'omniscience au sens des échecs — l'ancien
   intitulé était techniquement faux.
2. **N = 8 sièges** ajouté comme invariant de design (nouvelle section « Structure d'un
   Match ») : valeur de référence, calibre Pool/Shop/durée, détail dans les Core Rules (P3).
3. **Déterminisme du combat adossé au contrat maître** : la section « Système de combat »
   renvoie désormais à P1 (simulation pure) et P2 (Renderer lecteur d'événements) — une
   mention courte chacun, les détails vivent dans les Core Rules.
4. **Section finale « documents spécialisés » remplacée** : la liste V1 de 7 bibles cède la
   place à un renvoi au contrat maître `00_ARCHITECTURE.md` (16 bibles + transversales).
5. **Vocabulaire canonique** : la prose reste en français mais emploie les termes de
   `00_VOCABULARY.md` (Round, Shop, Pool, Merge, Gold, Level, Unit, Item, Synergy,
   Threshold, Origin, Class, Seat, Lobby, Match, Placement, Ability, Reroll, Lock, Rarity…).
6. **Cible « Placement ≈ 30 % de la victoire » requalifiée** : conservée, mais marquée comme
   objectif mesurable par protocole pré-enregistré (Meta/Simulation Bibles), pas comme
   chiffre magique.
7. **Boucle principale mise en cohérence avec le HumanGate 2026-07-18**
   (`HUMANGATE_2026-07-18_FOUNDATION.md`) : « Récompenses » supprimée au profit de
   **Round Resolution** (QC-1) ; séquence Achats/Ventes/Merge/Placement regroupée en
   **Preparation State** fenêtre unique avec Merge automatique (QC-2/QC-3) ; fin de
   préparation = Input explicite **ConfirmPreparation**, jamais de timer moteur (QC-5).
8. **Mana « avec le temps » retiré** (gate #3, QB-11, `HUMANGATE_2026-07-18_GATE3.md`) :
   le Mana se remplit UNIQUEMENT par attaque, dégâts reçus et effets déclarés en DSL.
   Delta assumé par rapport à la V1 (qui incluait le remplissage temporel).

### Questions — RÉSOLUES par HumanGate 2026-07-18

Les questions ouvertes de la V1.1 (langue, Player, Life/Health, Star, Merge) sont toutes
tranchées dans `HUMANGATE_2026-07-18_FOUNDATION.md` ; décisions intégrées dans
`00_VOCABULARY.md` et `02_CORE_RULES.md`. Aucune question ouverte ne subsiste dans ce document.
