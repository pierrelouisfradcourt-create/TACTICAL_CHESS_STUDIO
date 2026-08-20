<!-- GATE HUMAIN #3 — ratification de Pierre, collée en session le 2026-07-18. VERBATIM, JAMAIS RÉÉCRIT (règle studio). Source autoritaire pour l'intégration des QB-1..16, QE-1..7, PairingResolved et de la règle de propriété étanche (P10) dans 04_COMBAT_BIBLE.md, 05_ECONOMY_BIBLE.md, 02_CORE_RULES.md, 03_DECISION_BIBLE.md, 00_VOCABULARY.md, 00_ARCHITECTURE.md. -->

Le socle est désormais suffisamment stable pour prendre des décisions de moteur. Je répondrais aux questions structurantes avant de toucher à Meta ou DSL.

Gate #3 — Ratification

QB-4 — Sémantique du Tick
Décision : modèle hybride.
Un Tick est séquentiel dans son exécution, mais simultané dans ses effets.
Pipeline :
```text
Intent
↓
Validation
↓
Resolution
↓
Commit
```
Toutes les unités prennent leurs décisions sur le même état.
Les conséquences sont appliquées ensemble.
Cela évite les effets de priorité artificiels.

QB-3 — Targeting ou Movement ?
Je conserve la philosophie de la V1.
```text
Movement
↓
Targeting
↓
Attack
```
Pourquoi ?
Une unité choisit sa cible après avoir atteint sa nouvelle position.
C'est plus intuitif.

QB-5 — Death avant Cast ?
Décision :
Une unité morte ne lance jamais son sort.
Pipeline :
```text
Damage
↓
Death
↓
Cleanup
↓
Cast survivants
```
Simple.
Lisible.
Déterministe.

QE-1 — Vente d'une ★2
Décision :
Une ★2 représente toujours trois exemplaires.
Donc :
```text
Sell ★2
↓
Pool += 3
```
Le Pool représente des exemplaires physiques.
Jamais une abstraction.

QE-2 — Débit du Pool
Décision :
Le Pool est décrémenté au Buy, jamais au Place.
Le Shop réserve déjà les exemplaires.
Le Bench n'a aucun impact.

QB-7 — total_remaining_power
Je refuse une formule figée ici.
La Combat Bible doit seulement dire :
```text
total_remaining_power
=
fonction canonique définie
par la Balance Bible
```
Pourquoi ?
La puissance est un concept d'équilibrage.
Pas de simulation.

QB-8 — deterministic_order
Je ratifie :
```text
TieBreakChain
```
unique.
Aucun autre ordre.

Questions secondaires

QB-1 / QB-2
Grille orthogonale.
Distance Manhattan.
Aucune diagonale implicite.

QB-9
Ajouter :
* Heal
* Shield
* Buff
* Debuff
Pas davantage.

QB-10
Oui.
Une unité peut :
* attaquer
* puis lancer un sort
dans le même Tick.

QB-11
Mana :
* attaque
* dégâts reçus
* effets DSL
Uniquement.

QB-12
Buffs initiaux
Ordre :
```text
Origin
↓
Class
↓
Items
↓
Temporary
```

QB-13
Les Auras sont recalculées au début de chaque Tick.
Jamais en continu.

QB-14
Tick limit :
TBD.
Combat Bible définit seulement son existence.
La valeur appartient à Balance.

QB-15
Vocabulary :
oui.

QB-16
Chaque Effect possède :
```text
MaxTriggerPerTick
```
dans le DSL.
Très efficace contre les boucles.

Economy

QE-3
Oui.
Sell donne du Gold.
Sinon la vente n'a plus de sens.

QE-4
Interest
Je réponds :
non.
Pourquoi ?
Tu construis un jeu original.
L'intérêt est devenu un standard du genre.
Le retirer oblige à créer une économie différente.
Cela évite aussi les stratégies passives.

QE-5
Pas de win streak.
Pas de lose streak.
Au moins dans V1.
Le moteur sera plus simple.

QE-6
Oui.
Créer :
```text
GoldChanged
ShopRolled
UnitBought
UnitSold
PlayerLevelUp
```
L'UI devient un renderer pur.

QE-7
Bench plein
Décision :
Refus de l'achat.
Aucune destruction automatique.

PairingResolved
Je valide ce nom.

Une remarque importante
Je déplacerais une responsabilité.
Aujourd'hui tu fais porter beaucoup de poids à la Balance Bible.
Je créerais une règle simple :
Une bible ne peut définir que les concepts dont elle est propriétaire.
Exemple :
Combat possède :
* Tick
* Attack
* Death
Balance possède :
* coefficients
* formules
* constantes
DSL possède :
* données
Ainsi :
Combat ne définit jamais un coefficient.
Balance ne définit jamais un événement.
DSL ne définit jamais une règle.
Les responsabilités restent parfaitement étanches.

À ce stade, le corpus documentaire est suffisamment cohérent pour commencer à écrire les premières structures de données du moteur sans remettre en cause l'architecture. En revanche, je ne lancerais pas encore la DSL Bible : je terminerais d'abord la Meta Bible, car elle fixe les budgets et les objectifs qui guideront ensuite la conception du DSL et du contenu.
