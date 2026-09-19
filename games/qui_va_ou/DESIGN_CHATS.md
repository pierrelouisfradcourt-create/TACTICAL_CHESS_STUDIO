# Les chats spécialisés — pourquoi ça rend les puzzles difficiles

- **Date** : 2026-09-19 · **Statut** : PROPOSED (non ratifié) · `claim_verdict: NO_CLAIM_ALLOWED`
- **Source** : direction Pierre 2026-09-19 (« un chat à grandes griffes, un chat musclé, un chat
  pompier, un chat à grande queue »), portage de la sonde artifact « Qui va où » V8.

## La règle qui tient tout

**Un chat = un verbe = une famille d'obstacles, et l'outil se voit dans la silhouette.**

C'est la leçon Pat Patrouille : l'enfant doit pouvoir désigner le bon chat *avant* d'agir, rien
qu'en regardant la forme du problème. Si l'outil n'est pas lisible en silhouette, le puzzle
devient une devinette.

| Chat | Verbe | Ce qu'il lit dans le décor | Silhouette |
|---|---|---|---|
| Grimpeur | `grimper` | ce qui est en hauteur | petit, léger, dressé |
| Costaud | `pousser` | ce qui est lourd et bloque | épaules larges, plastron blanc |
| Filou | `faufiler` | ce qui est trop étroit pour les autres | long, bas, mince |
| Griffu | `griffer` | toile, filet, sac, corde, paroi | griffes démesurées, toujours sorties |
| Pompier | `arroser` | ce qui brûle, ce qu'il faut mouiller ou remplir | casque rouge, lance |
| Longue-Queue | `relier` | ce qui est séparé par un vide | queue 3× le corps |
| Lanterne | `eclairer` | ce qui est dans le noir | lanterne au collier, halo |

## Les trois leviers de difficulté

La spécialisation seule ne suffit pas : c'est l'**interaction entre les verbes** qui fait le
casse-tête. Trois leviers, du moins cher au plus fort :

**1. La chaîne** — l'action de A crée la condition de B.
*Déjà en place* : pousser la table → pouvoir grimper. Lisible dès 4 ans, mais s'épuise vite :
l'enfant apprend l'ordre, pas une règle.

**2. La transformation d'état** — l'action de A change la *nature* de l'obstacle, donc change
**qui** peut le résoudre. C'est le levier le plus riche, et le seul qui crée de vraies erreurs
intéressantes.
Exemples : le Pompier mouille la corde → elle ne brûle plus mais devient trop lourde à hisser ;
le Griffu déchire le sac → le sable coule → comble le trou que Longue-Queue devait franchir ;
la Lanterne éclaire → on découvre que l'obstacle n'était pas celui qu'on croyait.

**3. La ressource** — chaque chat n'agit qu'une fois par tableau. Il faut alors **choisir où le
dépenser**, et le mauvais choix se paie. Levier le moins cher à implémenter (un booléen), le plus
puissant sur la difficulté. À n'introduire qu'après le tableau 10 environ.

> Le format de niveau actuel gère nativement le levier 1. Les leviers 2 et 3 demandent une
> extension du schéma (un verbe qui *retire* un drapeau, un compteur d'usage par chat) — à ne
> faire qu'après un test avec des enfants, pas avant.

## Progression des verbes (proposition)

Un verbe neuf tous les 2-3 tableaux, jamais deux à la fois, et toujours un tableau « facile »
juste après pour consolider.

| Tableaux | Verbes actifs | Ce qu'on enseigne |
|---|---|---|
| 1-3 | grimper · pousser · faufiler | la règle de base : la forme du problème dit qui |
| 4-5 | + relier · griffer | un obstacle peut demander qu'on le *tienne* avant de l'ouvrir |
| 6-8 | + arroser | un même obstacle change de nature quand on le mouille |
| 9-12 | + eclairer | on ne peut pas résoudre ce qu'on ne voit pas encore |
| 13+ | tous | combinaisons, puis ressource limitée |

## Invariant de sécurité (enfants)

**Aucun échec possible, jamais.** Un mauvais chat posé au mauvais endroit ne perd rien : il ne
sait pas quoi faire, il repart. Le moteur garantit ça par construction — une action n'ajoute que
des drapeaux, elle n'en retire jamais, donc aucune partie ne peut se bloquer. Si le levier 3
(ressource) est un jour introduit, cet invariant devra être re-prouvé.

## Ce qui reste à trancher (HumanGate)

1. **Le texte.** Tout l'enseignement passe aujourd'hui par des phrases écrites en français.
   Un enfant de 4-5 ans ne les lit pas → voix off, ou enseignement 100 % visuel. Décision
   structurante, à prendre avant de produire 60 tableaux.
2. **Le nombre de chats en scène.** À 4 chats disponibles, le choix devient-il riche ou confus ?
   Seul un test avec des enfants tranche.
3. **Les leviers 2 et 3** : extension du schéma, donc à ratifier avant implémentation.
