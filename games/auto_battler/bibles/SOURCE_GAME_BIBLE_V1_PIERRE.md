<!-- SOURCE BRUTE — notes de Pierre, collées en session le 2026-07-18. JAMAIS RÉÉCRITE (règle studio). La synthèse IA vit à côté (01_GAME_BIBLE.md). -->

GAME BIBLE V1
Projet : Auto Battler - Battlegrounds × Teamfight Tactics
Version : 1.0

Vision
Créer un auto battler accessible mais extrêmement profond.
Le joueur ne contrôle jamais les combats.
Son talent réside dans :
* le recrutement
* l'économie
* le positionnement
* les synergies
* le timing
* l'adaptation aux adversaires
Chaque partie doit raconter une histoire différente.

ADN du jeu
Le jeu doit donner la sensation de :
* Hearthstone Battlegrounds
* Teamfight Tactics
sans copier directement leurs mécaniques.
Les combats doivent être rapides, lisibles et satisfaisants.

Piliers
1. Décisions importantes
Chaque achat compte.
Chaque vente compte.
Chaque déplacement compte.
Aucune action ne doit être "évidente".
2. Information parfaite
Aucun hasard caché.
Les probabilités sont connues.
Les règles sont simples.
3. Profondeur émergente
La complexité vient des interactions.
Jamais des règles.
4. Partie courte
Objectif :
20 à 30 minutes.

Boucle principale
Début manche
↓
Revenus
↓
Boutique
↓
Achats
↓
Ventes
↓
Fusion éventuelle
↓
Placement
↓
Combat automatique
↓
Résultat
↓
Récompenses
↓
Nouvelle manche

Economie
Le joueur possède :
* Or
* Niveau
* Vie
L'or sert à :
* acheter
* relancer
* monter de niveau
L'économie doit être aussi importante que le combat.

Boutique
Chaque manche :
une boutique aléatoire apparaît.
Les unités disponibles dépendent :
* du niveau du joueur
* de la rareté
* du pool partagé
Le joueur peut :
* acheter
* verrouiller
* relancer

Pool partagé
Toutes les unités existent en quantité limitée.
Acheter une unité réduit les chances des autres joueurs de l'obtenir.
Cette règle favorise :
* l'adaptation
* la lecture du lobby
* les contres

Niveaux
Monter de niveau :
* augmente la taille de l'équipe
* débloque des unités rares
* améliore les probabilités

Fusion
Trois unités identiques
↓
fusion
↓
version améliorée
Une fusion :
* augmente les statistiques
* améliore les compétences
* peut modifier certains effets

Positionnement
Le terrain influence énormément le combat.
Première ligne
Tank
Deuxième ligne
Bruiser
Arrière
Supports
Coins
Protection
Centre
Zone de contrôle
Le placement doit être responsable d'environ 30 % de la victoire.

Déroulement d'un combat
Début
↓
Buffs initiaux
↓
Déplacement
↓
Recherche de cible
↓
Attaque
↓
Gain de mana
↓
Lancement des compétences
↓
Mort
↓
Nouvelle cible
↓
Fin

Intelligence artificielle
Chaque unité possède :
Priorité de cible
Distance préférée
Style de déplacement
Utilisation des compétences
Comportement spécial
Aucune micro-gestion par le joueur.

Mana
Le mana se remplit :
* avec le temps
* en attaquant
* en recevant des dégâts
À mana plein :
la compétence est lancée.

Système de combat
Les combats doivent être :
lisibles
rapides
spectaculaires
mais déterministes.
Le joueur doit comprendre pourquoi il gagne ou perd.

Synergies
Les synergies sont le cœur du jeu.
Une unité peut appartenir à :
1 ou plusieurs Origines
1 ou plusieurs Classes
Exemple :
Origine :
Dragon
Classe :
Mage

Activation
Les bonus apparaissent uniquement à certains seuils.
Exemple :
2
4
6
8 unités
Jamais de bonus linéaire.

Objets
Les objets :
améliorent
transforment
ou spécialisent
une unité.
Ils doivent modifier les décisions du joueur.
Pas seulement augmenter les statistiques.

Progression
Le joueur devient plus puissant :
par :
l'économie
les niveaux
les synergies
les objets
les fusions
Jamais uniquement grâce à la chance.

Aléatoire
Le hasard doit créer :
des situations nouvelles.
Jamais décider directement du vainqueur.

Défaite
Après chaque combat perdu :
le joueur perd des points de vie.
Les dégâts dépendent :
des survivants
du niveau de la manche

Elimination
Quand la vie atteint zéro :
le joueur est éliminé.
Le dernier survivant gagne.

Lisibilité
Chaque unité doit être reconnaissable immédiatement.
Silhouette.
Couleur.
Animation.
Compétence.

Feedback
Le joueur doit toujours comprendre :
pourquoi il gagne
pourquoi il perd
quelle synergie fonctionne
quelle unité est décisive

Objectifs de design
Facile à apprendre.
Difficile à maîtriser.
Chaque partie différente.
Aucune stratégie dominante permanente.
Toutes les unités jouables.
Les décisions du joueur expliquent davantage les victoires que la chance.

Ce que le jeu ne doit jamais devenir
Un RPG.
Un MOBA.
Un deckbuilder.
Un jeu à micro-gestion.
Un simulateur de statistiques.

Principes d'équilibrage
Un nerf ou un buff doit privilégier :
les comportements,
les interactions,
les timings,
avant de modifier les statistiques brutes.

Philosophie finale
Le joueur construit une armée.
Le combat raconte l'histoire de ses décisions.
L'objectif n'est pas d'être plus rapide que l'adversaire.
L'objectif est d'avoir pris de meilleures décisions plusieurs manches auparavant.

Cette bible constitue le socle. La suite logique est de la compléter par des documents spécialisés qui servent de référence aux LLM :
* Combat Bible : déplacement, ciblage, IA, portée, priorités, résolution des compétences.
* Economy Bible : probabilités de boutique, intérêts, pool partagé, niveaux.
* Content Bible : unités, classes, origines, raretés, règles de création.
* Balance Bible : budgets de puissance, coûts, statistiques, courbes d'équilibrage.
* Technical Bible : structures de données, ordre d'exécution, événements, déterminisme.
* Visual Bible : direction artistique, VFX, UI, animations et lisibilité.
* LiveOps Bible : saisons, nouvelles unités, rotations, objectifs d'équilibrage.

En séparant ces responsabilités, plusieurs agents peuvent travailler en parallèle tout en restant cohérents.
