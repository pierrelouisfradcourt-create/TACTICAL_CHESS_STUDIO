<!-- GATE HUMAIN — ratification de Pierre, collée en session le 2026-07-18. VERBATIM, JAMAIS RÉÉCRIT (règle studio). Source autoritaire pour l'intégration dans 00_VOCABULARY.md et 02_CORE_RULES.md. Cadrage de Pierre : « ne pas répondre aux 13 questions en mode "préférence", mais en verrouillant les invariants qui vont conditionner moteur, DSL, oracles et agents. » -->

# HumanGate — Auto Battler Bible Foundation

## VOCABULARY

### 1. Convention de langue
**Décision :**
* Identifiants canoniques : **anglais**
* Documentation explicative : **français**
Raison :
Le code, DSL, logs, événements, JSON et tests doivent rester stables.
Exemple :
```yaml
event: UnitAttackResolved
effect: DamageApplied
```
La documentation peut dire :
> Une attaque d'unité résolue applique les dégâts.

### 2. Player
**Décision :**
`Player` = occupant logique d'un Seat.
Donc :
* humain = Player
* bot = Player
* IA de simulation = Player
Le Seat représente la place dans le lobby.
Structure :
```
Lobby
 ├── Seat
 │    └── Player
 │         └── Army
```

### 3. Life vs Health
**Décision :**
Conserver les deux.
* `Life` = ressource du Player/Seat
* `Health` = points de vie d'une Unit
Exemple :
```
Player Life: 32
Dragon Health: 240
```

### 4. Fusion
**Décision :**
Utiliser :
* `Merge` = action
* `Star` = rang résultant
Exemple :
```
3x Wolf
   ↓ Merge
Wolf ★2
```
`Level` reste réservé au Player.

### 5. Trait
**Décision :**
Oui.
`Trait` est le terme générique.
Catégories :
```
Trait
 ├── Origin
 └── Class
```
Cela simplifie énormément le DSL.

### 6. Fusion / Merge
**Décision :**
Le terme canonique est :
`Merge`
La traduction française reste "fusion" dans la documentation.

### 7. Campaign
**Décision :**
Oui.
Une Campaign est une série contrôlée de simulations.
Exemple :
```
Campaign:
  10000 games
  seed range
  bot versions
  metrics
```

# CORE RULES

## QC-1 Récompenses
Actuellement trop vague.
Décision :
Supprimer "Récompenses" de la boucle principale.
Remplacer par :
```
Round Resolution
```
qui peut produire :
* rewards
* damage
* progression
La récompense devient un sous-système de résolution.
Pas une phase.

## QC-2 Préparation
Décision :
Fenêtre unique.
Pas de phases rigides.
La préparation est un état :
```
Preparation State
```
avec actions autorisées :
```
Buy
Sell
Reroll
Lock
LevelUp
Place
Merge
```
Le joueur peut réorganiser librement avant validation.

## QC-3 Merge automatique
Décision :
Merge automatique.
Pourquoi :
* moins d'actions inutiles ;
* meilleure ergonomie mobile ;
* plus proche Battlegrounds.
Mais :
Le système doit produire un événement :
```
MergeTriggered
MergeResolved
```
pour le replay.

## QC-4 Nombre impair de joueurs
Décision :
Ghost Board.
Le joueur affronte une copie figée d'un adversaire.
Pourquoi :
* pas d'attente ;
* simulation simple ;
* permet replay.
Invariant :
Un Ghost Board est une donnée historique immuable.

## QC-5 Fin préparation
Décision :
Action explicite.
Ajouter :
```
ConfirmPreparation
```
Le moteur n'utilise pas de timer.
Pour mobile, l'interface peut proposer un timer plus tard.
Mais le moteur reste :
entrée → transition.

## QC-6 Combat infini
Décision :
Ajouter l'invariant.
Un combat doit toujours terminer.
Mécanisme :
1. nombre maximal de ticks ;
2. résolution d'égalité déterministe.
Exemple :
```
Si tick_limit atteint :
winner =
  total_remaining_power
  puis units_remaining
  puis deterministic_order
```
La formule exacte sera dans Combat Bible.

# Une remarque importante
L'INV-13 de Core Rules doit être corrigé.
La liste des Inputs doit devenir :
```
Buy
Sell
Reroll
Lock
LevelUp
Place
ConfirmPreparation
```
`Merge` n'est pas un input joueur si on garde le merge automatique.

# Décisions structurantes obtenues
Avec ces choix, on verrouille plusieurs choses :

## DSL
Peut maintenant utiliser :
```
Player
Seat
Unit
Trait
Origin
Class
Merge
Star
Life
Health
```
sans ambiguïté.

## Simulation
Un match devient :
```
Initialize Lobby
↓
Players prepare
↓
ConfirmPreparation
↓
Pairing
↓
Combat Simulation
↓
Round Resolution
↓
Life update
↓
Repeat
```

## Oracle
Nouveaux invariants possibles :
* une Unit ne perd jamais `Life`, seulement `Health` ;
* un Player possède une seule Life ;
* un Merge produit un Star supérieur ;
* un Ghost Board ne change jamais ;
* un Combat possède toujours un résultat.

Je validerais donc :
**status_by_surface**
| Surface                | Statut                                           |
| ---------------------- | ------------------------------------------------ |
| Architecture 16 bibles | IMPLEMENTED (documentaire)                       |
| Game Bible V1.1        | IMPLEMENTED (documentaire)                       |
| Core Rules             | IMPLEMENTED (draft ratifiable après intégration) |
| Vocabulaire canonique  | DOCUMENTED_ONLY                                  |
| Moteur de jeu          | NOT_FOUND                                        |
| DSL                    | DOCUMENTED_ONLY                                  |
| Oracle runtime         | NOT_FOUND                                        |
| Simulation runtime     | NOT_FOUND                                        |

Prochaine étape logique : intégrer ces décisions dans `00_VOCABULARY.md` et `02_CORE_RULES.md`, puis seulement ensuite produire `03_DECISION_BIBLE.md`, car Decision Bible dépend directement de la fermeture des inputs et des tie-breaks.
