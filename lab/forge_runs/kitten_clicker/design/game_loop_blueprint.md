# C.6 · GAME LOOP & CONTENT BLUEPRINT V1.1 (PROPOSED — à ratifier par Pierre)
## Le jeu, ses boucles imbriquées, et le contenu que chacune exige

*Date : 2026-08-25 · Demande de Pierre : « À partir de C.1 → C.5, reconstruis le jeu réel que la Forge est censée
produire, puis écris ses boucles imbriquées de manière à ce que chaque boucle puisse être remplie par Art + GM et
qu'aucune boucle ne soit simplement un compteur économique. »*

**Ce document ne contient AUCUN nombre de calibration** — aucun coût, aucun taux, aucun pourcentage, aucune durée.
C'est délibéré et contractuel : on obtient d'abord *voilà le jeu, voilà ce que le joueur fait, voilà pourquoi il
recommence, voilà ce qui change, voilà ce qui est produit, voilà ce qui débloque quoi, voilà quel contenu doit
exister*. **Ensuite seulement on calibre.**

Aucun code, aucune WireMap, aucune station nouvelle.
`claim_verdict: NO_CLAIM_ALLOWED`

---

## 0. Place de C.6 dans la chaîne de conception

```text
             WORLD SCAN
                 ↓
        WORLD / GAME FANTASY          ce que le monde est, ce qu'on y ressent
                 ↓
      C.6  GAME LOOP BLUEPRINT        ← ce document : LE JEU et ses boucles imbriquées
                 ↓
     ┌───────────┴───────────┐
     ↓                       ↓
  GAME DESIGN               ART
  gameplay · progression    représentation · bâtiments
  économie · quêtes         personnages · objets · animations
     └───────────┬───────────┘
                 ↓
         MUTUAL COMPLETION (C.4)
                 ↓
         GAME LOOP COMPLETE
                 ↓
            C.5 MAP            l'inventaire de contenu, boucle par boucle
                 ↓
             WIREMAP           réconcilie réalisation artistique et technique
                 ↓
        BUILDER → GODOT → PLAYTEST → LEÇON → mutation suivante
```

**Ce que C.6 garantit** : la WireMap ne doit jamais avoir à découvrir « tiens, il faudrait peut-être une boucle de
quête ». Elle doit recevoir : *voici les boucles du jeu, leurs producteurs, leurs consommateurs, leurs
transformations, leurs contenus et leurs dépendances ; réconcilie leur réalisation.*

**Rapport à C.5** : C.5 est l'**inventaire de contenu** — pour chaque boucle, la liste de ce qu'il faut fabriquer
(chaque entrée porte son identifiant, sa boucle, sa catégorie, ses états, la transformation que chaque état rend
visible, qui la consomme et qui la produit). C.6 est le PLAN
DU JEU qui dit pourquoi cette carte a ces boucles-là. **C.6 se lit avant C.5** ; C.5 dit avec quoi, C.6 dit quoi et
pourquoi.
*Précision, parce que le diagramme ci-dessus peut tromper* : cet ordre est l'ordre de LECTURE pour un jeu neuf.
Dans l'histoire de Kitten, C.5 a été écrit AVANT C.6 — c'est même sa carte qui a mesuré le trou que C.6 comble.
Un document en aval de la chaîne peut donc être en amont dans le temps ; les deux ne se contredisent pas.

---

## 1. Le jeu reconstruit — ce que C.1 → C.5 disent déjà

*§1 est **sourcé** : il ne fait que lire les contrats existants et nommer ce qu'ils ne disent pas. À partir de
**§1.2 inclus**, tout ce qui suit est une **PROPOSITION de C.6**, marquée comme telle et soumise à ratification —
y compris le déplacement du gameplay (§1.2), la lecture à sept boucles (§3) et le premier monde (§7bis).*

**Ce qui est acquis** (C.2 ratifié, direction produit V1 ratifiée) :
- un petit univers de chatons **bienveillant** ; on n'y perd pas, on n'y meurt pas, rien ne se dégrade ;
- **chaque dépense transforme visiblement la scène** — règle maîtresse : *un déblocage est une possibilité
  perceptible, jamais un « +X % »* ;
- **la carte du monde EST le système de progression** : la scène jouable s'agrandit à l'écran sans que la caméra
  bouge — le monde s'étend, il ne défile pas. *(« la carte du monde » désigne toujours la scène jouable dans ce
  document ; l'inventaire de contenu s'appelle « C.5 », jamais « la carte ».)*
- **le joueur agit directement sur la scène** : il n'y a pas de menu entre lui et le monde, il touche ce qu'il voit ;
- au départ : un refuge, un panier d'où dépasse une pelote, un coussin vide, un jardin fermé derrière une fenêtre,
  un album de silhouettes « ? » à révéler. **Aucun chaton** ;
- le prestige n'est pas un bouton : c'est un moment — les chatons partent adoptés, l'album garde leur couleur, la
  saison change, un lieu nouveau apparaît.

**Ce que ces documents NE disent pas — le trou mesuré** (audit et carte C.5, 2026-08-25) :
> un chaton, une fois accueilli, **ne fait rien**. Il est placé quelque part et il dort. Toute la « production » est
> un multiplicateur attaché à un emplacement. Il n'existe **aucun bâtiment** au sens plein (accueillir · faire
> exercer une activité observable · produire du fait de cette activité), **aucun rôle**, **aucune affectation**.

C'est le seul vrai manque, et il explique les six prototypes : **la Forge a appris à produire une scène qui
satisfait des oracles, pas un jeu dont les boucles s'alimentent.**

### 1.1 Le jeu, en une phrase
> **On recueille des chatons, on leur donne quelque chose à faire, et ce qu'ils font transforme le refuge en un
> monde de plus en plus grand — jusqu'à ce qu'il soit complet, et qu'une nouvelle portée arrive dans un monde
> changé.**

### 1.2 Les sept réponses exigées
| Question | Réponse |
|---|---|
| Que fait le joueur ? | il s'occupe d'un chaton, puis **décide de ce que ce chaton fait** |
| Pourquoi recommence-t-il ? | parce que chaque activité rend le monde plus grand, et qu'un monde complet en ouvre un autre |
| Qu'est-ce qui change ? | la scène : un lieu s'ouvre, un bâtiment s'élève, un chaton prend un rôle et se met à l'exercer |
| Qu'est-ce qui est produit ? | de l'attention (par le geste), puis des **biens et des savoirs** (par les activités) |
| Qui consomme ? | l'aménagement du monde, qui produit à son tour de nouvelles activités |
| Qu'est-ce qui débloque quoi ? | activité → aménagement → comportement nouveau → rôle nouveau → lieu nouveau → chatons nouveaux |
| Quel contenu doit exister ? | des chatons avec des états, des **bâtiments avec des rôles**, des lieux, des animations d'activité, des objets produits, l'interface qui rend l'affectation lisible |

**Le déplacement décisif de C.6, à ratifier** :
> le gameplay n'est PAS « acheter des chatons de plus en plus chers ».
> **Le gameplay est : donner à ses chatons quelque chose à faire, et voir ce que ça change.**
> Acheter reste un moyen ; ce n'est plus le jeu.

---

## 2. La boucle noyau — le moteur de progression

*Les boucles longues viennent s'emboîter autour d'elle ; elle porte l'action répétée.*

```text
                 ┌─────────────────────┐
                 │   CORE · LE CHATON  │
                 │  jouer · interagir  │
                 └──────────┬──────────┘
                            ↓
                  le chaton répond, et devient disponible
                            ↓
                 ┌─────────────────────┐
                 │  ACTIVITÉ           │   travailler · jouer
                 │  (ce qu'il FAIT)    │   apprendre · explorer
                 └──────────┬──────────┘
                            ↓
                  production · savoir · découverte
                            ↓
                 ┌─────────────────────┐
                 │ AMÉNAGEMENT DU MONDE│   bâtiment · objet
                 │                     │   zone · décor
                 └──────────┬──────────┘
                            ↓
                  nouveau comportement observable
                            ↓
                  nouveau chaton · nouveau rôle
                            ↓
                  nouveau lieu → nouveau contenu → nouvelle possibilité
                            │
                            └──────────────→ retour au CORE, enrichi
```

**Ce qui rend cette boucle non triviale** : à chaque tour, le CORE n'est pas le même. Le premier tour, on caresse
une pelote. Après un atelier, on caresse **un chaton qui a un métier**, dans un refuge qui a un atelier. Le geste
est identique, son contexte a changé — c'est ça, une boucle qui s'enrichit.

---

## 3. Les boucles imbriquées

```text
CORE            le geste, cent fois            ← courte : l'action répétée
 ↓
GAMEPLAY        donner une activité             ← la décision qui fait le jeu
 ↓
PROGRESSION     les jalons, ce qui vient après
 ↓
WORLD           l'espace : bâtiments, zones
 ↓
QUEST           un but, et ce qu'on en reçoit
 ↓
TECH / SKILL    de nouvelles façons de faire
 ↓
META            le monde est complet → un autre commence
 ↓
nouveau monde → CORE enrichie
```

**Deux choses ne sont pas des boucles de ce schéma, et c'est délibéré** :
- **L'ÉCONOMIE est un connecteur** (§5) : elle relie les boucles, elle n'en est pas une.
- **Le CONTENU est ce qui circule** : chatons, bâtiments, objets, animations, lieux. Il remplit les boucles, il ne
  tourne pas à côté d'elles.

*Point de cohérence à trancher (HumanGate)* : C.3 et C.5 énumèrent **neuf** boucles, dont ECONOMY et CONTENT.
C.6 en dessine **sept**, ECONOMY et CONTENT étant reclassés comme connecteur et comme flux. Les deux lectures
disent la même chose du jeu ; elles ne comptent pas pareil. **Proposition** : C.5 garde ses neuf emplacements
d'inventaire (c'est un classeur de contenu, il lui faut une case pour l'économie et une pour le contenu neuf), et
C.6 fixe la lecture ludique à sept. Si vous préférez l'inverse, c'est C.5 qu'il faut réécrire, pas C.6.

---

## 4. Les neuf questions, remplies pour chaque boucle

*Aucune de ces réponses n'est un nombre. Chaque ligne « contenu » est ce que l'Art doit fabriquer et ce que le GM
doit décider — c'est l'entrée de C.5.*

### 4.1 CORE — le chaton et moi
| Question | Réponse |
|---|---|
| QUI joue ? | le joueur, à la main, sans intermédiaire |
| QUE fait-il ? | il s'occupe d'un chaton : le caresser, l'appeler, jouer avec lui |
| POURQUOI ? | c'est le seul endroit où il touche le monde directement — et le chaton répond |
| QU'EST-CE QUI CHANGE ? | le chaton réagit : il lève la tête, vient, ronronne ; la scène s'anime autour |
| QU'EST-CE QUI EST PRODUIT ? | de l'**attention** — ce qu'un chaton reçoit quand on s'occupe de lui, et la seule ressource que le joueur produit lui-même, à la main — et un chaton **disponible** |
| QUI CONSOMME ? | GAMEPLAY (qui l'affecte à une activité) et l'économie (qui dépense l'attention) |
| QUEL NOUVEAU CHOIX ? | dès qu'un chaton est disponible : *que va-t-il faire ?* |
| QUEL CONTENU rend ça visible ? | le chaton et ses états · l'objet du geste · le retour immédiat du geste · le refuge |
| QUELLE BOUCLE alimentée ? | GAMEPLAY |

### 4.2 GAMEPLAY — donner une activité
| Question | Réponse |
|---|---|
| QUI joue ? | le joueur |
| QUE fait-il ? | il **affecte** un chaton : à un lieu, à un bâtiment, à un apprentissage, à une exploration |
| POURQUOI ? | parce qu'un chaton qui ne fait rien ne change rien — c'est la décision qui fait le jeu |
| QU'EST-CE QUI CHANGE ? | le chaton **se met à l'exercer, visiblement** : il travaille, il apprend, il part explorer |
| QU'EST-CE QUI EST PRODUIT ? | l'activité elle-même, et ce qu'elle donne : un bien, un savoir, une découverte |
| QUI CONSOMME ? | WORLD (l'aménagement) et TECH/SKILL (l'apprentissage) |
| QUEL NOUVEAU CHOIX ? | affecter ailleurs, ou spécialiser : le premier arbitrage réel du joueur |
| QUEL CONTENU ? | les **rôles** (et leur marque visible) · l'animation de chaque activité · l'interface d'affectation · les biens produits |
| QUELLE BOUCLE alimentée ? | PROGRESSION, WORLD, TECH/SKILL |

### 4.3 PROGRESSION — les jalons
| Question | Réponse |
|---|---|
| QUI joue ? | le jeu propose, le joueur lit |
| QUE fait-il ? | il sait ce qu'il cherche maintenant, et ce qui vient après |
| POURQUOI ? | sans jalon, un monde qui grandit devient un tas |
| QU'EST-CE QUI CHANGE ? | un but s'affiche, puis cède la place au suivant ; une possibilité s'allume |
| QU'EST-CE QUI EST PRODUIT ? | des **possibilités débloquées**, nommées |
| QUI CONSOMME ? | WORLD, QUEST, et le joueur lui-même |
| QUEL NOUVEAU CHOIX ? | poursuivre le jalon, ou faire autre chose d'abord |
| QUEL CONTENU ? | l'objectif courant et l'annonce du suivant · l'état grisé/allumé d'une possibilité · la marque d'un jalon franchi |
| QUELLE BOUCLE alimentée ? | WORLD, QUEST |

### 4.4 WORLD — bâtir l'espace
| Question | Réponse |
|---|---|
| QUI joue ? | le joueur |
| QUE fait-il ? | il ouvre un lieu, il y élève un bâtiment, il y installe ses chatons |
| POURQUOI ? | un bâtiment est ce qui donne un rôle à un chaton — sans lieu, pas d'activité |
| QU'EST-CE QUI CHANGE ? | **la carte s'agrandit** ; le bâtiment s'élève ; des chatons s'y installent et s'y mettent au travail |
| QU'EST-CE QUI EST PRODUIT ? | des **emplacements de rôle** et la production qui en découle |
| QUI CONSOMME ? | GAMEPLAY (il y a de nouveaux endroits où affecter) et META |
| QUEL NOUVEAU CHOIX ? | quel lieu développer, quel bâtiment d'abord |
| QUEL CONTENU ? | les lieux et leurs états · les **bâtiments** (vide · occupé · plein) · l'animation d'élévation · les décors qui font vivre le lieu |
| QUELLE BOUCLE alimentée ? | GAMEPLAY (enrichi), META |

### 4.5 QUEST — un but, et ce qu'on en reçoit
| Question | Réponse |
|---|---|
| QUI joue ? | le jeu demande, le joueur accomplit |
| QUE fait-il ? | il complète : une zone, une collection, une commande |
| POURQUOI ? | pour recevoir **quelque chose qu'il n'avait pas** — c'est la définition d'une quête |
| QU'EST-CE QUI CHANGE ? | la récompense **arrive dans le monde** : un chaton rare, un bâtiment offert, un lieu qui s'ouvre |
| QU'EST-CE QUI EST PRODUIT ? | la récompense elle-même, et l'album qui garde la trace |
| QUI CONSOMME ? | WORLD (la récompense s'y installe), META (l'album s'y solde) |
| QUEL NOUVEAU CHOIX ? | viser cette récompense, ou une autre |
| QUEL CONTENU ? | l'objectif nommé · **la récompense, qui est du contenu, jamais un nombre** · l'**album** — le registre des chatons qu'on a recueillis : une silhouette « ? » par chaton à trouver, qui se révèle et garde sa couleur d'un monde à l'autre |
| QUELLE BOUCLE alimentée ? | WORLD, META |

> **Défaut mesuré, à combler ici** : sur six prototypes, **aucune récompense de quête n'a jamais existé**. Un
> objectif atteint n'avançait qu'un compteur. C'est la case la plus vide du jeu.

### 4.6 TECH / SKILL — de nouvelles façons de faire
| Question | Réponse |
|---|---|
| QUI joue ? | le joueur, via un chaton qui apprend |
| QUE fait-il ? | il envoie un chaton apprendre, et récupère une capacité |
| POURQUOI ? | pour faire des choses qu'on ne pouvait pas faire — pas pour faire les mêmes plus vite |
| QU'EST-CE QUI CHANGE ? | une **nouvelle interaction** existe, et un nouveau type d'activité devient possible |
| QU'EST-CE QUI EST PRODUIT ? | une capacité, et le rôle qui va avec |
| QUI CONSOMME ? | GAMEPLAY (de nouvelles affectations), WORLD (de nouveaux bâtiments deviennent constructibles) |
| QUEL NOUVEAU CHOIX ? | quelle compétence en premier — donc quel monde on construit |
| QUEL CONTENU ? | le lieu d'apprentissage · l'animation d'apprentissage · la **marque visible du rôle acquis** · la nouvelle interaction |
| QUELLE BOUCLE alimentée ? | GAMEPLAY, WORLD |

### 4.7 META — un monde complet en ouvre un autre
| Question | Réponse |
|---|---|
| QUI joue ? | le joueur décide du moment |
| QUE fait-il ? | il achève le monde, et laisse partir ses chatons |
| POURQUOI ? | parce qu'un monde complet doit mener ailleurs, et qu'on veut revoir ce qu'on a gardé |
| QU'EST-CE QUI CHANGE ? | **tout, dans un ordre lisible** : les chatons partent, l'album se colore, la saison change, un lieu nouveau apparaît |
| QU'EST-CE QUI EST PRODUIT ? | un **monde nouveau** (nouvelle zone, nouveaux rôles possibles) et une trace conservée |
| QUI CONSOMME ? | CORE — qui recommence, mais dans un monde différent |
| QUEL NOUVEAU CHOIX ? | partir maintenant, ou compléter encore |
| QUEL CONTENU ? | la scène de départ des chatons · l'album qui se colore · la saison · le lieu promis qui s'ouvre |
| QUELLE BOUCLE alimentée ? | CORE, enrichie |

---

## 5. L'économie, remise à sa place

**Ce que la Forge fait aujourd'hui — le simulateur de compteur :**
```text
ressource → coût → upgrade → +X %
```

**Ce qu'elle doit faire :**
```text
GAMEPLAY → activité → production → ressource → dépense
        → OBJET / BÂTIMENT / CHATON / CAPACITÉ
        → nouvelle activité → nouveau comportement observable → nouvelle boucle
```

**L'économie est le connecteur entre les boucles, pas une boucle.** Trois exigences qui en découlent :
1. **Une ressource naît d'une activité**, jamais du seul écoulement du temps. **Le geste du joueur compte comme
   une activité** — c'est celle du joueur ; les autres sont celles des chatons. Si personne ne fait rien, ni le
   joueur ni un chaton, rien n'est produit.
2. **Une dépense achète du contenu**, jamais un coefficient. Ce qui sort de la dépense est un objet, un bâtiment,
   un chaton, une capacité — quelque chose qui se voit et qui change ce qu'on peut faire.
3. **Une ressource qui ne fait que retarder un déblocage est refusée.** Elle doit avoir une source, une
   destination, et une fonction dans la progression.
4. **Une possibilité affichée mais pas encore atteignable est du CONTENU, à une condition** : elle montre ce
   qu'elle coûtera ET ce qu'elle changera. Elle est alors une promesse — le joueur sait ce qui l'attend. Un
   nombre qui monte sans jamais dire ce qu'il permet reste un compteur.

*Les valeurs restent hors de ce document : elles appartiennent à C.1, et elles se calibrent APRÈS.*

---

## 6. Le test de complétude du système : les chatons travailleurs

*Ce n'est pas « ajouter des chatons avec des chapeaux ». **Le chapeau est la représentation d'un état du système**,
pas un skin décoratif : il dit qu'un chaton a un rôle et qu'il l'exerce. Si le système ne sait pas produire cette
chaîne, il est incomplet — quels que soient ses oracles.*

```text
ATELIER DE PANIERS
Bâtiment → rôle : artisan → chaton affecté → animation : il fabrique un panier
        → production : des paniers → le panier est consommé par une autre boucle
        → nouvelle possibilité → nouveau bâtiment

ÉCOLE
Bâtiment → chaton élève → apprentissage → nouvelle compétence
        → nouvelle activité → nouveau bâtiment / nouvelle zone

STATION SPATIALE
Bâtiment → chaton astronaute → exploration → ressource / découverte
        → nouvelle zone → nouveaux chatons
```

**Ce que ce test vérifie, maillon par maillon** :

| Maillon | Ce qu'il exige | Existe aujourd'hui ? |
|---|---|---|
| un bâtiment | accueille · fait exercer une activité observable · produit du fait de cette activité | **non** |
| un rôle | une activité qu'un chaton EXERCE, avec sa marque visible | **non** |
| une affectation | le joueur décide QUI fait QUOI | **non** |
| une production | un bien qui sort de l'activité et qu'on voit sortir | non (un multiplicateur) |
| un consommateur | une autre boucle qui a besoin de ce bien | **non** |
| une possibilité nouvelle | ce que ce bien permet et qu'on ne pouvait pas faire | non |

Six maillons, aucun présent. **C'est le chantier de conception que C.6 ouvre** — et c'est exactement ce que la carte
C.5 nommait déjà comme sa question ouverte la plus structurante.

---

## 7. Ce que la WireMap recevra

> Voici les sept boucles du jeu. Pour chacune : qui joue, ce qu'il fait, pourquoi, ce qui change, ce qui est
> produit, qui le consomme, quel choix apparaît, quel contenu le rend visible, quelle boucle est alimentée.
> Voici l'inventaire de contenu de chaque boucle (C.5), avec ses états et ses transformations.
> **Maintenant réconcilie leur réalisation artistique et technique.**

La WireMap n'a plus à découvrir une boucle manquante : elle traduit.

**Mais pas encore.** Tant que les décisions du §8 ne sont pas prises — au premier chef *ce qu'une quête rapporte*
et *quel est le premier métier* —, la boucle QUEST n'a pas de produit et la WireMap aurait encore à l'inventer.
**C.6 ouvre ce chantier, il ne le ferme pas** : §7bis en propose la fermeture, votre ratification la scelle.

---

## 7bis. Le premier monde — PROPOSITION de C.6

*Tout ce qui suit est **proposé**, pas ratifié. Sans ces réponses, la boucle QUEST n'a pas de produit et la WireMap
aurait encore à l'inventer (§7). Aucun nombre : ni coût, ni durée, ni quantité.*

### Le premier métier : l'atelier de paniers
**Pourquoi celui-là plutôt qu'un autre.** Le panier est déjà l'objet fondateur du jeu : c'est de lui que sort le
premier chaton. Un chaton qui **fabrique des paniers** produit donc littéralement ce qui amène les chatons suivants.
La boucle se referme sur elle-même dès le premier métier, à la plus petite échelle possible :

```text
je m'occupe d'un chaton  →  je l'affecte à l'atelier  →  il fabrique un panier (on le voit faire)
        →  le panier accueille un nouveau chaton  →  je m'occupe de lui  →  …
```

Le joueur n'a besoin d'aucune explication pour comprendre ce qu'il vient de mettre en marche : **il voit un chaton
fabriquer ce qui amène le chaton suivant.** C'est la démonstration la plus courte que « donner une activité » est le
jeu — et c'est exactement ce que six prototypes n'ont jamais montré.

### Les lieux et les rôles du premier monde

| Lieu | Ce qu'on y fait | Rôle qu'il ouvre | Ce que le rôle produit | Consommé par |
|---|---|---|---|---|
| **le refuge** | s'occuper des chatons, les accueillir | *(aucun : c'est le CORE)* | de l'attention | GAMEPLAY, l'économie |
| **l'atelier** | affecter un chaton à la fabrication | **artisan** | des paniers | l'arrivée de nouveaux chatons |
| **le jardin** | affecter un chaton au potager | **jardinier** | de quoi nourrir les chatons | la durée des activités, l'atelier |
| **le grenier** | *(fermé — promesse du monde suivant)* | — | — | META |

Deux métiers au premier monde, pas plus : l'un fait venir les chatons, l'autre les entretient. **Le joueur doit
pouvoir tenir les deux dans sa tête et arbitrer entre eux** — c'est sa première vraie décision, et elle porte sur
*qui fait quoi*, jamais sur *combien*.

**La marque du rôle** : un chaton affecté porte quelque chose qui se voit d'un coup d'œil (le chapeau d'artisan, le
chapeau de jardinier). Ce n'est pas un ornement : **c'est l'état du système rendu visible sur le personnage** —
regarder la scène suffit à savoir qui travaille et à quoi.

### Ce qu'une quête rapporte
> **Une quête rapporte quelque chose qui s'installe dans le monde et qu'on revoit ensuite en jouant.**

Trois formes, et trois seulement :
1. **un chaton qu'on n'aurait pas eu autrement** — il arrive, il a sa robe, il peut prendre un rôle ;
2. **un bâtiment offert** — il s'élève dans la scène, il ouvre un rôle nouveau ;
3. **un lieu qui s'ouvre** — la carte du monde s'agrandit.

Ce qu'une quête ne rapporte jamais : un nombre, un multiplicateur, un lot de ressources. *Si la récompense peut être
décrite sans dire ce qu'on VOIT ni ce qu'on peut FAIRE de plus, ce n'est pas une récompense.* C'est la case que six
prototypes ont laissée vide, et c'est celle-ci qui la remplit.

### Ce que devient le prestige quand le monde se bâtit
Le monde achevé, les chatons **partent adoptés** — dans un jeu bienveillant, on ne les perd pas : on les place, et
l'album garde leur trace. La proposition de C.6 :

> **on perd les chatons, on garde les plans.**

Ce qui traverse d'un monde à l'autre, ce n'est pas un multiplicateur : c'est **le savoir-faire** — les bâtiments
qu'on a appris à construire restent constructibles, et le monde suivant s'ouvre sur un terrain nouveau où les
élever plus vite, plus loin, avec des métiers que le monde précédent a rendus possibles. Le prestige cesse d'être
une remise à zéro déguisée : **c'est un déménagement.**

*Conséquence à mesurer avant d'y croire (elle n'est pas acquise)* : si les plans traversent, le monde suivant doit
apporter de quoi les rendre à nouveau intéressants — un terrain différent, une contrainte nouvelle, un métier de
plus. Sinon le deuxième monde est le premier en plus rapide, ce qui est exactement le compteur qu'on refuse.

---

## 8. Ce qui reste ouvert — décisions qui appartiennent au HumanGate

*Cinq décisions. C.6 en propose quatre au §7bis ; ratifier, amender ou rejeter vous appartient.*

1. **La portée.** C.6 décrit un jeu où les chatons ont des rôles et où le monde se bâtit. C'est un cran au-dessus du
   clicker cozy de C.2. Les deux s'emboîtent (le clicker est le CORE), mais **c'est une extension de portée** :
   à ratifier explicitement. *Aucune proposition ici — c'est une décision de direction, pas de conception.*
2. **Sept boucles (C.6) ou neuf (C.3/C.5)** — voir §3. Proposition : sept pour la lecture ludique, neuf pour les
   cases d'inventaire de C.5.
3. **Le premier métier** — proposition : **l'atelier de paniers** (§7bis), parce qu'il referme la boucle sur
   elle-même dès le premier geste.
4. **La récompense de quête**, la case la plus vide — proposition : **du contenu qui s'installe dans le monde**,
   sous trois formes seulement (§7bis).
5. **Ce que devient le prestige** — proposition : **on perd les chatons, on garde les plans** (§7bis), avec la
   contrainte que le monde suivant doit apporter de quoi rendre ces plans à nouveau intéressants.

*Aucune de ces cinq questions ne se répond par un nombre. Aucune ne doit être tranchée par un agent.*

---

## 9. Test de validité

Un agent à contexte vierge lisant CE document seul doit pouvoir : (1) dire ce qu'est le jeu en une phrase et ce que
le joueur y fait ; (2) nommer les sept boucles et dire ce que chacune produit et qui le consomme ; (3) dire pourquoi
l'économie n'est pas une boucle ; (4) dérouler la chaîne de l'atelier de paniers et dire ce qui manque aujourd'hui ;
(5) dire ce qui distingue une possibilité perceptible d'un compteur ; (6) dire ce qu'il ne doit PAS écrire dans ce
document (des nombres) ; (7) dire quel est le premier métier proposé et **pourquoi celui-là** ; (8) dire ce qu'une
quête rapporte et ce qu'elle ne rapporte jamais ; (9) distinguer ce qui est SOURCÉ de ce qui est PROPOSÉ. Toute réponse exigeant une invention = document incomplet.

---

`software_verdict: N/A` (document de conception, aucun code) · `evidence_verdict: MECHANICAL_VALIDATION_ONLY`
(les manques cités sont mesurés sur le run `-20260824f` et l'audit du 2026-08-25) · `claim_verdict: NO_CLAIM_ALLOWED`
