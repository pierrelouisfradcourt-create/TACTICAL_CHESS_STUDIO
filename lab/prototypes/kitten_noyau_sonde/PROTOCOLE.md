# Sonde « Qui va où » — protocole d'observation V2

*Cadrage de Pierre, 2026-08-25 : « Rendre les règles suffisamment observables pour que le joueur puisse lui-même
formuler une hypothèse » — et **ne pas ajouter un indice si le test peut être réalisé sans lui**.*

**À lire APRÈS avoir joué, pas avant.** Ce document dit ce qu'on mesure ; le savoir d'avance fausserait la mesure.

---

## L'invariant à protéger

> **« C'est plaisant de les voir arriver. »** — playtest du 2026-08-25.

C'est le seul résultat acquis de la sonde V1. Tout le reste est encore une hypothèse. Aucune version future ne doit
abîmer ça, et aucune mesure ne doit le mettre en balance avec autre chose.

---

## Ce qui a changé entre V1 et V2 — et ce qui n'a PAS changé

**Une seule chose a changé** : les trois chatons ont désormais un comportement d'attente franchement distinct —
le curieux **se dresse et tend le cou**, le peureux **se tasse puis sursaute**, le joueur **donne des coups de patte**.
C'est le phénomène que H1 mesure, pas un indice : le chaton montre ce qu'il FAIT, jamais où il veut aller.

**Ce qui a été RETIRÉ après coup**, parce que chacune de ces choses répondait à la question à la place du joueur :
- un fil pointillé du chaton vers la bonne place ;
- un fantôme, sur chaque endroit, révélant sa transformation future ;
- une fin scénarisée (porte qui s'ouvre) quand les trois endroits ont changé ;
- l'annonce du but (« réveille les trois ») dans le texte d'introduction.

**Ce qui n'a pas bougé** : les trois endroits, les affinités, les temps, les transformations, l'arrivée des chatons.
La sonde est celle que vous avez jouée, moins mes béquilles.

---

## Les quatre hypothèses

| # | Hypothèse | Ce qu'on observe pendant que vous jouez |
|---|---|---|
| **H1** | **Lisibilité des chatons** — le comportement suffit-il à déduire le besoin ? | sur combien de placements avez-vous **anticipé** correctement, avant de poser ? |
| **H2** | **Lisibilité des lieux** — l'état d'un endroit permet-il de comprendre ce qu'il peut devenir ? | pouvez-vous dire **spontanément** ce que chaque endroit permet, sans qu'on vous l'ait dit ? |
| **H3** | **Fil rouge** — après une transformation, savez-vous ce que vous cherchez ensuite ? | juste après un changement : pouvez-vous énoncer votre **objectif suivant** ? |
| **H4** | **Désir de continuation** — l'arrivée d'un nouveau chaton donne-t-elle envie de continuer ? | prenez-vous le nouveau chaton **sans y être invité** ? |

---

## La grille à remplir

| Hypothèse | Observation attendue | Ce qui s'est passé |
|---|---|---|
| H1 · chaton lisible | ≥2 placements sur 3 anticipés correctement | |
| H2 · lieu lisible | vous expliquez spontanément ce que le lieu permet | |
| H3 · fil rouge | vous pouvez dire ce que vous cherchez ensuite | |
| H4 · continuation | vous prenez le nouveau chaton sans invitation | |
| Invariant · plaisir | « voir arriver les chatons » toujours présent | |

**Ce qu'on cherche n'est pas « V2 est meilleure ».** C'est de savoir **quelle couche manque réellement** —
et une hypothèse infirmée est un résultat, pas un échec.

---

## V3 (2026-08-28) — une seule modification conceptuelle

*Cadrage de Pierre : « faire de l'étagère un véritable maillon causal. Pas davantage. »*

**Un bug de fond, trouvé par le playtest** : aucun chaton **joueur** n'arrivait jamais. La table exigeait ce
caractère pour devenir atelier — la chaîne était donc **injouable à sa racine**, et le parcours se terminait
forcément sur « le 3ᵉ chat va dans son propre nid ».

**La causalité réparée**, telle que vous l'avez décrite :

```text
curieux → fenêtre → il suit l'oiseau → il fait tomber les livres de l'étagère
        → les planches atterrissent sur la table (l'étagère est vide)
        → le bruit attire un chaton joueur
        → joueur → table (enfin garnie) → atelier → panier → nouveau chaton
```

Trois conséquences : l'**oiseau** cesse d'être décoratif — c'est lui qui déclenche le geste du curieux ;
l'**étagère** cesse d'être un endroit mort — son contenu EST la matière ; la **table est nue au départ**, donc un
chaton joueur posé dessus ne trouve rien à pousser et repart. Le caractère explique l'action, l'action transforme
le lieu, le lieu rend la suite possible.

**Ce qui n'a PAS été ajouté** : pas d'économie, pas de prestige, pas de tableau plus grand, pas de quêtes, aucun
nouveau comportement de chaton, aucune fin.

### La seule question de V3
> **Le joueur comprend-il naturellement que le curieux peut transformer l'étagère — puis comprend-il ce que cette
> transformation permet ?**

Si oui, on tient le début du langage ludique de Kitten : *les chatons ne sont pas des ressources, ce sont des
agents qui transforment le monde.*

### Ce qui reste ouvert, volontairement
Le 4ᵉ chaton (celui du panier) ne débouche sur rien. C'est **la question suivante**, pas un oubli : un chaton
devrait ouvrir une nouvelle question, pas clore le tableau. On ne le referme pas avant d'avoir mesuré V3.

---

## V5 (2026-08-28) — la boucle fermée sur TROIS tableaux

*Cadrage de Pierre : « fermer la boucle et générer 2 tableaux de plus · raccourcir les temps · il manque une vraie
identité d interaction entre les chatons et le décor · on se disperse ».*

### La grammaire des chatons — la même dans les trois tableaux
Le joueur doit pouvoir ANTICIPER. C est ce que la sonde mesure désormais.

| Chaton | Ce qu il fait, partout | Ce que ça produit |
|---|---|---|
| **CURIEUX** | remarque → grimpe → **fait tomber** | de la matière, ou un passage |
| **JOUEUR** | trouve → **pousse** | un espace dégagé, quelque chose de découvert |
| **PEUREUX** | évite → **se faufile** là où nul autre ne passe | il atteint l inatteignable |

### Les trois boucles

```text
1 · LE REFUGE   peureux se faufile sous l'escalier  → le coin devient un nid      → arrive le curieux
                curieux grimpe à la fenêtre         → il fait tomber les livres   → arrive le joueur
                joueur pousse les planches          → la table devient un atelier → arrive un chaton
                                                    → l'escalier s'éclaire        → MONTER

2 · L'ÉTAGE     joueur pousse la malle              → une fente apparaît          → arrive le peureux
                peureux se faufile dans la fente    → la lucarne s'ouvre          → arrive le curieux
                curieux grimpe à la lucarne         → une corde pend dehors       → SORTIR

3 · LE JARDIN   curieux grimpe à l'arbre            → un fruit tombe              → arrive le joueur
                joueur pousse une planche           → un puits est découvert      → arrive le peureux
                peureux se faufile dans le puits    → il en remonte un chaton coincé
```

Chaque tableau : **un comportement · un élément de décor · une transformation · un nouveau chaton · un nouveau lieu.**
Aucune mécanique abstraite : chaque transformation est une interaction physique avec le décor.

### Temps (mesurés)
Réaction ~0,9 s · transformation ~1,4 s · chaton suivant ~0,8 s → **un maillon toutes les 3,4 s**, un tableau
complet en ~10 s. Un chaton mal placé repart tout seul en 2,4 s. **Barre de test** sous la scène : 1 · 2 · 3 pour
sauter à un tableau, « rejouer » pour recommencer celui-ci sans refaire les précédents.

### Ce que V5 doit dire
> **La grammaire tient-elle sur trois tableaux consécutifs ?** Après le premier tableau, anticipez-vous ce que
> chaque chaton va faire dans un décor que vous n avez jamais vu ?

C est la seule question. Si oui, les chatons ne sont plus des ressources : ce sont des agents qui transforment
le monde — et c est une identité que six clickers n avaient pas.

---

## Deux questions ouvertes, à ne PAS refermer trop vite

1. **« Je ne sais pas si je suis arrivé au bout. »** Ce n'est peut-être pas « il faut une fin » : c'est peut-être
   que le jeu n'a pas encore de **structure d'objectif**. La sonde ne tranche pas — elle pose la question (H3).
2. **« Ça ressemble plus à un puzzle qu'à un clicker. »** Constat de genre, pas verdict. À décider par vous, pas
   par la sonde : est-ce la direction, ou une dérive à corriger ?

`claim_verdict: NO_CLAIM_ALLOWED`
