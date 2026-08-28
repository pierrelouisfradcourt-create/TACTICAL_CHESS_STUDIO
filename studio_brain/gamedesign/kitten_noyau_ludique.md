# KITTEN — NOYAU LUDIQUE, reconstruit à zéro
## Note de conception — ce n'est PAS un contrat

*Date : 2026-08-25 · Mission de Pierre : « Détruire le concept actuel de Kitten Clicker et reconstruire uniquement
le noyau ludique. » Cinq questions, cinq réponses, **et chaque réponse doit être observable dans un prototype**.*

**Ce que cette note détruit** — et il faut le dire clairement, parce que c'est ratifié : le clic qui accumule une
ressource · l'échelle de coûts (chaton 20 → 60 → 140) · la production par seconde · le prestige · l'arbre numérique ·
les huit jalons P01→P08 de C.2. **Rien de tout cela ne survit dans le noyau.** Ce qui survit : le refuge, les
chatons, et l'idée qu'on s'en occupe.

**Ce que cette note ne fait pas** : aucun nombre, aucune WireMap, aucun Godot, aucun oracle, aucune station.

---

## Le noyau en une phrase

> **Des chatons arrivent, tous différents. Le refuge n'a pas assez de bonnes places pour tout le monde.
> Je décide qui va où — et ce que chacun devient dépend de l'endroit où je l'ai mis.**

---

## 1. Que fait le joueur ?

**Il place un chaton quelque part dans le refuge.** C'est tout. Il prend celui qui vient d'arriver, il regarde la
pièce, il choisit un endroit, il l'y pose.

Pas de menu, pas d'achat, pas de barre à remplir : il attrape et il pose.

> **Observable dans un prototype** : à l'écran il y a un chaton et deux ou trois endroits distincts. On peut prendre
> le chaton et le poser à un endroit. Il y va et il s'y installe. *Si on ne peut rien poser nulle part, il n'y a pas
> de jeu.*

---

## 2. Quelle décision intéressante prend-il ?

**Qui a droit à la bonne place.**

Trois choses rendent cette décision réellement intéressante, et il faut les trois :
- **Les chatons ne sont pas interchangeables.** Chacun a un caractère qui se voit avant qu'on le pose : le curieux
  regarde partout, le peureux se tasse, le dormeur bâille, le joueur ne tient pas en place.
- **Les endroits ne sont pas interchangeables.** La fenêtre, le coin sous l'escalier, le dessus de l'établi : chacun
  fait quelque chose de différent à celui qui l'occupe.
- **Il n'y a pas assez de place.** Poser quelqu'un ici, c'est ne pas y poser l'autre.

C'est le croisement des trois qui fait la décision : *le curieux à la fenêtre découvrira quelque chose, mais c'est
le peureux qui a besoin du coin abrité, et je n'ai qu'un coin abrité.*

> **Observable dans un prototype** : deux chatons visiblement différents, deux endroits qui ne font pas la même
> chose, une seule place à la fenêtre. Le joueur hésite. *S'il n'hésite pas, ce n'est pas une décision — c'est un
> rangement.*

---

## 3. Que fait le monde en réponse ?

**Le chaton se met à vivre à cet endroit-là, et l'endroit se met à changer.**

Deux réponses, à deux vitesses :
- **Tout de suite** : le chaton fait ce que cet endroit lui fait faire. Le curieux posté à la fenêtre observe
  dehors. Le peureux sous l'escalier finit par sortir la tête. Le joueur sur l'établi fait tomber des choses.
  **On le voit sans rien lire.**
- **À la longue** : l'endroit garde la trace de qui l'habite. Le coin où l'on dort tous les jours se creuse en nid.
  L'établi qu'on dérange tous les jours finit en désordre — ou en atelier, selon qui y passe ses journées.

**Le monde n'accumule pas un chiffre : il prend une forme.**

> **Observable dans un prototype** : on pose le même chaton au même endroit plusieurs fois de suite, et **l'endroit
> n'a plus la même tête à la fin**. Sans compteur affiché nulle part. *Si la seule preuve que quelque chose s'est
> passé est un nombre qui a monté, la réponse du monde n'existe pas.*

---

## 4. Pourquoi veut-il recommencer ?

**Parce que le chaton suivant n'est pas le même, et que le refuge n'est plus le même non plus.**

La question « qui va où » ne se repose jamais à l'identique : le troisième chaton arrive dans un refuge qui a déjà
un nid creusé et une fenêtre occupée. Ce n'est pas la même question qu'au premier.

Et il y a la deuxième raison, plus bête et plus forte : **on veut voir ce que celui-là va devenir.** Un chaton posé
quelque part n'est pas rangé, il est *engagé* — on reste pour voir la suite.

> **Observable dans un prototype** : au troisième chaton, le joueur ne refait pas le geste du premier. Il regarde ce
> qui est déjà occupé avant de choisir. *S'il pose le troisième sans regarder l'état de la pièce, il n'y a pas de
> raison de recommencer — il y a juste une file d'attente.*

---

## 5. Comment la répétition ouvre-t-elle une nouvelle possibilité ?

**Un endroit assez habité devient autre chose — et cette chose-là permet quelque chose qu'on ne pouvait pas faire.**

C'est le seul mécanisme de progression du noyau, et il n'a pas besoin d'un seul chiffre :

```text
je pose un chaton à un endroit
        ↓
l'endroit change de forme à force d'être habité
        ↓
il devient un LIEU À PART ENTIÈRE          (le coin → un abri · l'établi → un atelier)
        ↓
ce lieu accueille un chaton AUTREMENT       (il n'y dort plus : il y fait quelque chose)
        ↓
une nouvelle question de placement apparaît, qui n'existait pas avant
        ↓
retour au geste, avec un choix de plus
```

Ce qui s'ouvre n'est jamais « plus » : c'est **autre**. Un atelier n'est pas une meilleure place — c'est une place
qui pose une question différente.

> **Observable dans un prototype** : au bout de plusieurs placements au même endroit, **une option apparaît qui
> n'était pas là au début**, et elle est visible dans la scène, pas dans un menu. *Si ce qui s'ouvre peut se décrire
> par « la même chose, en mieux », la répétition n'a rien ouvert.*

---

## Le plus petit prototype qui prouve les cinq réponses

Une pièce, **trois endroits**, des chatons qui arrivent l'un après l'autre, chacun avec un caractère qu'on voit.
On peut les attraper et les poser. Ils se mettent à vivre là où on les a mis. Un endroit habité change de forme.
Quand il a changé, on peut y faire quelque chose de nouveau.

**Pas de compteur à l'écran. Pas de bouton d'achat. Pas d'écran de fin.** Si ce prototype-là est ennuyeux, aucune
économie ne le sauvera — et c'est précisément ce qu'on veut savoir avant d'en construire une.

---

## Ce que cette note remet en cause

| Élément | Statut |
|---|---|
| C.2 (jalons P01→P08, échelle de coûts, prestige) | **caduc dans le noyau** — à re-ratifier ou à archiver |
| C.1 (progression chiffrée) | sans objet tant que le noyau n'est pas jugé jouable |
| C.5 / C.6 | **intacts comme méthode** — ce noyau est exactement le genre d'objet qu'ils demandent de produire ; leurs inventaires seront à refaire sur cette base |
| Le premier métier (atelier de paniers) | **compatible** — l'atelier devient ici l'aboutissement d'un endroit habité, pas un bâtiment qu'on achète |

*Décision : vous. Cette note est une proposition de noyau, pas une ratification.*

`claim_verdict: NO_CLAIM_ALLOWED`
