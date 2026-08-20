<!-- GATE HUMAIN #2 — ratification de Pierre, collée en session le 2026-07-18. VERBATIM, JAMAIS RÉÉCRIT (règle studio). Source autoritaire pour l'intégration des QD-1..6, d'INV-19 et des ratifications Vocabulary dans 03_DECISION_BIBLE.md, 02_CORE_RULES.md et 00_VOCABULARY.md. -->

HumanGate — Decision Bible Questions

QD-1 — TieBreakChain exacte
Décision : accepter une chaîne unique moteur.
Mais je modifierais l'ordre proposé.
Le tie-break ne doit pas dépendre en premier de coordonnées de board, car cela crée des comportements artificiels liés à la géométrie.
Ordre canonique :
1. décision stratégique déclarée
2. priorité de règle
3. distance Manhattan
4. initiative de création
5. unit_instance_id
6. seat_index
Explication :
La logique de gameplay passe avant l'identité technique.
unit_instance_id est le dernier recours.
seat_index départage uniquement les cas totalement identiques.
Principe :
Un tie-break peut utiliser l'identité technique pour garantir l'unicité, jamais pour créer une stratégie cachée.

QD-2 — Pairing
Décision : pairing déterministe avec RNG autorisé uniquement via rng_state.
Contraintes :
impossible d'affronter soi-même ;
distribution uniforme ;
rematches autorisés.
Pourquoi autoriser les rematches :
Chercher à éviter les rematches ajoute une contrainte artificielle qui peut créer des biais.
Le moteur choisit :
LobbyState
+
rng_state
+
RoundIndex
↓
PairingResult
Le résultat est enregistré dans l'Event Log.

QD-3 — Ghost Board
Décision : snapshot du dernier board disponible du joueur adverse.
Règle :
Un Ghost Board correspond au dernier état validé :
Après ConfirmPreparation
Avant Combat
Jamais :
état intermédiaire ;
état après combat ;
état mutable.
Un Ghost Board est une photographie immuable.

QD-4 — Merge 4+ copies
Décision : consommation déterministe selon ordre de création.
Exemple :
Wolf A
Wolf B
Wolf C
Wolf D
↓
A+B+C consommés
D reste
Pourquoi :
pas de préférence cachée ;
reproductible ;
facile à debugger.
La nouvelle unité reçoit un nouvel unit_instance_id.

QD-5 — Bench
Décision : oui, Bench devient un concept Core Rules.
Une unité achetée possède trois états possibles :
Shop
 |
Purchased
 |
 ├── Board
 └── Bench
Le Bench :
appartient au Player ;
conserve les Units ;
permet préparation ;
n'intervient pas directement dans le combat.
Le nombre maximum de places sera Economy/Balance Bible.

QD-6 — Ordre des Seats
Décision : Seat index fixe.
Pas de rotation.
Pourquoi :
simplifie les replays ;
simplifie les logs ;
simplifie les oracles.
L'équité vient du pairing et du RNG contrôlé, pas d'un déplacement artificiel des identités.

Interprétation Merge
Je valide :
Trois Units identiques = même UnitDefinition + même Star.
Donc :
Archer ★1
Archer ★1
Archer ★1
=
Archer ★2
Mais :
Archer ★1
Archer ★1
Archer ★2
≠ Merge

Ajout important à la Decision Bible
Je demanderais d'ajouter un invariant supplémentaire :
INV-19 — Aucun état implicite
Toute donnée nécessaire à une décision doit appartenir explicitement à :
GameState
EventLog
DSL déclaré
Interdit :
variable cachée ;
état renderer ;
dépendance machine ;
ordre mémoire ;
timestamp système.
C'est probablement l'un des invariants les plus importants pour un projet multi-agent.

Mise à jour Vocabulary
Je ratifie :
DecisionPoint
TieBreakChain
BotPolicy
Bench
GhostBoard
UnitDefinition
UnitInstance
Avec distinction obligatoire :
UnitDefinition
=
le modèle de l'unité
UnitInstance
=
une occurrence réelle en partie
Exemple :
UnitDefinition:
  Goblin Warrior
UnitInstance:
  Goblin Warrior #18472
  Star 2
  Health 340

Status après gate
Surface	Statut
Architecture	IMPLEMENTED (documentaire)
Vocabulary	IMPLEMENTED (documentaire)
Game Bible	IMPLEMENTED (documentaire)
Core Rules	IMPLEMENTED (documentaire)
Decision Bible	DOCUMENTED_ONLY → IMPLEMENTED après intégration
Combat	NOT_STARTED
Economy	NOT_STARTED
DSL runtime	NOT_FOUND
Oracle runtime	NOT_FOUND
Simulation runtime	NOT_FOUND

La prochaine étape reste bien :
intégrer QD-1→6 ;
verrouiller Decision Bible ;
produire Combat Bible ;
produire Economy Bible en parallèle.
Le point critique à surveiller ensuite sera Combat Bible : c'est là que les choix d'événements simultanés, tick, ciblage et résolution des dégâts vont transformer la bible en véritable contrat moteur.
