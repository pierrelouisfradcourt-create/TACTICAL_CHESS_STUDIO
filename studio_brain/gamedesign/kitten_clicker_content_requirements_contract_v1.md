# C.5 · GAMEPLAY MAP CONTRACT V2.0 — la carte de jeu et de contenu
## Partie I — la méthode (tout jeu) · Partie II — la carte de Kitten World · Partie III — glossaires

**V1.6 RATIFIÉE par Pierre le 2026-08-25** (Content Requirements) **et injectée** en amont de l'Artiste et du Game
Master — condition n°1 tenue. **V2.0 étend le contrat sur la demande de Pierre du même jour** : ce document n'est
plus seulement la liste de ce que chaque boucle exige, c'est **LA CARTE que les deux piliers se passent et
modifient**.

*Tests de reconstruction à contexte vierge (un agent lit CE SEUL fichier et tente de répondre) :*
*V1 → 8 contradictions · 7 inventions · 17 renvois (verdict : « contrat d'instance, pas méthode »).*
*V1.1 → 7 contradictions · 9 inventions · 19 renvois (dont une règle d'ordre FAUSSE, introduite par V1.1, que sa
propre Partie II violait).*
*V1.2 → 12 contradictions · 5 inventions de méthode (2 bloquantes) · 5 renvois. Les contradictions augmentent parce
que la méthode est devenue assez stricte pour que l'INSTANCE échoue à ses propres règles — c'est le résultat
recherché.*
*V1.3 → **méthode CONVERGÉE** (« la Partie I est utilisable comme méthode » ; 3 inventions, aucune bloquante),
mais 13 contradictions restantes, toutes dans l'INSTANCE contre sa propre méthode — dont un **bilan de bouclage FAUX**
(3 boucles déclarées orphelines à tort, artefact d'ENTRÉE mal rédigées).*
*V1.4 → **bilan R2a vérifié exact ligne à ligne** par le test ; méthode confirmée utilisable (inventaire d'un jeu
inconnu produit sans ouvrir l'instance). Restaient 2 contradictions DANS la méthode et 8 dans l'instance.*
*V1.5 corrige les 10 : la primitivité qualifie l'ENTRÉE et non la boucle · `consommateur` et ENTRÉE mesurent deux
choses différentes et n'ont pas à se recouper · le vocabulaire d'états se déclare PAR RÔLE · une question ouverte
porte son PORTEUR dans `producteur`, quelle que soit sa catégorie.*
*V1.5 → 4 contradictions internes à la méthode et 10 non-conformités de l'instance, toutes nommées. Le test a été
durci à chaque passe : ce ne sont plus les mêmes défauts qui remontent, mais des défauts de plus en plus fins.*
*V1.6 corrige les 14 : `art_required`/`gm_required`/`economy_required` reçoivent enfin un schéma · une étape
requise et absente reçoit un mot (`MANQUANTE`) · l'appariement SORTIE→ENTRÉE est déclaré littéral · le vocabulaire
par rôle est propagé entrée par entrée.*

*Date : 2026-08-25 · Source : demande de Pierre (« il manque un niveau avant C.3/C.4 : Game Loop Architecture →
Content Requirements ») et audit `docs/audit/2026-08-25-c3-c4-carte-vs-canal-audit.md`.*

`claim_verdict: NO_CLAIM_ALLOWED`

---

# PARTIE I — LA MÉTHODE

## 0. Position et raison d'être

```text
C.3  GAME LOOP ARCHITECTURE   quelles boucles existent, ce qu'elles s'échangent
          │
          ▼
C.5  CONTENT REQUIREMENTS     ce que CHAQUE boucle exige pour être jouable   ← ce document
          │
          ▼
C.4  MUTUAL COMPLETION        les deux piliers vérifient qu'ils peuvent REMPLIR — jamais inventer
          │
          ▼
     WIREMAP                  la carte technique produite APRÈS le design : elle traduit, elle n'invente rien
```

**Ce que ce contrat change de rôle.** C.4 n'est plus « Art et GM inventent le jeu parce que personne ne sait quoi
faire », mais « l'architecture définit ce qu'il faut remplir, les deux piliers vérifient qu'ils peuvent réellement
le remplir ». Un agent peut dire : *« pour la boucle World, il me manque les états visuels du bâtiment »*. Il ne
peut plus dire : *« je ne sais pas ce qu'est la boucle World »*.

**Défaut mesuré que ce contrat ferme** (audit 2026-08-25) : le Game Master reçoit l'ordre de « RÉÉCRIRE les champs
C.3 » alors que le seul jeu de champs qui lui est énuméré en compte six ; 28 fiches d'asset et 18 blocs de contenu
coexistent sans champ de boucle ni clé de jointure, dont 18 assets que le design ne cite jamais. **La chaîne
prescrit une carte qu'elle ne livre pas.**

---

## 0.1 La carte est un OBJET, pas une connaissance

**Formulation de Pierre (2026-08-25), qui est la raison d'être de cette version :**
> « Le problème n'est pas qu'Art et GM communiquent mal. Le problème est qu'on leur demande de remplir une carte
> qui n'existe pas dans leur contexte opérationnel. »
> « **Art ↔ GM ne doit pas compenser une carte absente. L'échange sert à compléter une carte existante.** »

```text
                 INTENTION DU JEU
                       │
                       ▼
              ┌─────────────────┐
              │  GAMEPLAY MAP   │   CORE · GAMEPLAY · PROGRESSION · ECONOMY
              │   (ce document) │   WORLD · QUEST · SKILL · CONTENT · META
              └────────┬────────┘
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
        GAME DESIGN             ART
     « comment ça joue ? »   « comment ça existe visuellement ? »
             └─────────┬─────────┘
                       ▼
               QUESTIONS MUTUELLES
                       ▼
            **MODIFICATION DE LA CARTE**
                       ▼
                 DESIGN FREEZE  →  WIREMAP  →  BUILDER  →  GODOT  →  PLAYTEST
```

**Trois conséquences opposables :**
1. La carte est **injectée** dans le contexte des deux piliers (fait depuis le 2026-08-25). Un pilier qui ne l'a
   pas reçue ne peut pas être tenu de la respecter.
2. Le produit d'une ronde de dialogue n'est pas « une réponse » : c'est **la carte modifiée**. Une réponse qui ne
   modifie aucune case de la carte est du théâtre de questions.
3. La carte survit au run : elle est l'objet qui se transmet d'un run au suivant, pas le fichier de sortie d'un
   agent.

**Pourquoi cette version existe** (mesure, pas opinion) : six prototypes successifs de Kitten Clicker ont appris
à la Forge « je peux produire une scène qui satisfait des oracles », pas « je dois produire un jeu dont les
boucles s'alimentent mutuellement ». **La preuve mécanique a progressé plus vite que le produit ludique.**

---

## 1. Vocabulaire de la méthode (autonome)

**Les deux piliers** : l'**ART** (ce qui se voit — son artefact s'appelle l'Art Bible : styles, états visuels,
animations, règles de lisibilité) et le **GM**, *Game Master* (ce qui se joue — son artefact s'appelle le World Scan
du GM : boucles, règles, causalité, économie, progression). Ils travaillent en alternance : l'un propose, l'autre
vérifie qu'il peut le représenter ou l'utiliser, et lui **demande** ce qui manque.
**Artefact** : un fichier produit par un agent pendant un run. **Contrat** : un document de conception écrit par un
humain, ratifié, qui dit ce que les artefacts doivent contenir. C.5 est un contrat.
**Oracle** : vérificateur déterministe, non-LLM, qui accepte ou refuse un artefact en nommant sa raison.
**Injecter** : recopier le contenu d'un document dans le contexte réellement envoyé à l'agent. Un document non
injecté n'existe pas pour lui, quelle que soit son autorité.
**HumanGate** : le point où un humain décide (accepter, refuser, différer). Aucun agent ne décide à sa place.
**Règle maîtresse** : un déblocage est une **possibilité perceptible**, jamais un « +X % ».
**Question bloquante** : question dont l'absence de réponse empêche une boucle d'être complète. **Elle bloque le
gel du design si et seulement si elle porte sur une boucle REQUISE** — une question ouverte sur une boucle DEFERRED
ne bloque rien (c'est le sens même de différer). Tant qu'une telle question est ouverte, aucun des deux piliers ne
peut déclarer le design figé : ni celui qui l'a reçue, ni celui qui l'a émise.
**R1** : un pilier ne peut pas déclarer le design figé tant qu'une question bloquante **portant sur une boucle
REQUISE** reste ouverte — ni celui qui l'a reçue, ni celui qui l'a émise (règle du contrat de complétion C.4).
**R2a** : le PRODUIT (la SORTIE) d'une boucle doit être consommé par au moins une AUTRE boucle. **R2b** : la
transformation d'une boucle doit être perceptible par le joueur. **Boucle COMPLETE** = R2a ∧ R2b. Une boucle
présente qui ne change rien au jeu n'est pas une boucle : c'est un slot rempli.
**Inventaire FINI** ≠ **boucle COMPLETE** : *fini* est un état du TRAVAIL de C.5 (critères §6.4 et §6.5 tenus),
*COMPLETE* est un état du JEU (R2a ∧ R2b, constaté par C.4). Un inventaire peut être fini alors que la boucle n'est
pas complète : c'est le cas d'une boucle dont l'inventaire est cohérent et dont la sortie est bien consommée, mais
qui **ne rend rien de perceptible au joueur** (R2b non tenue). *Une boucle dont la sortie n'est consommée par
personne, elle, n'est PAS finie — elle échoue le critère §6.5.*

### 1.1 Les 10 boucles, définies indépendamment de tout jeu

| # | Boucle | Définition transposable |
|---|---|---|
| 1 | **CORE** | le geste de base et sa réponse immédiate — ce que le joueur fait cent fois |
| 2 | **GAMEPLAY** | ce que le joueur OBTIENT du geste et ce qu'il en DÉCIDE — la première vraie décision |
| 3 | **PROGRESSION** | les jalons : ce que je cherche maintenant, ce qui vient après |
| 4 | **CONTENT** | ce qu'il y a de neuf à obtenir, en CHAÎNE (chaque élément appelle le suivant) |
| 5 | **ECONOMY** | le connecteur : ce qui se produit, ce qui se dépense, ce que la dépense transforme |
| 6 | **SKILL** | les nouvelles FAÇONS de faire (pas les nouveaux nombres) |
| 7 | **WORLD** | l'espace : lieux, bâtiments, occupation, extension |
| 8 | **QUEST** | on me donne un but, je reçois quelque chose que je n'avais pas |
| 9 | **META** | le cycle long : achever, recommencer autrement, garder une trace |
| 10 | **ART↔GM** | le protocole de complétion lui-même. **Transversal : aucun contenu, donc aucun inventaire** — il possède les questions **en tant que messages du dialogue** (qui demande, à qui, quand). L'entrée `QUESTION_OUVERTE` qui matérialise un trou, elle, appartient toujours à la boucle CONCERNÉE (1 à 9), jamais à celle-ci. |

**L'ordre 1→9 est un ordre de TRAITEMENT, pas une contrainte de dépendance.** On part du geste et on s'éloigne vers
le cycle long, parce qu'une boucle se formule plus facilement quand la précédente existe. **Un `consommateur` peut
nommer n'importe quelle boucle, y compris traitée plus tard, y compris la sienne.**

### 1.1bis Ce que la carte porte (14 éléments — Pierre, 2026-08-25)

| # | Élément | Où il vit dans ce contrat |
|---|---|---|
| 1 | les **boucles** | §1.1 (les 10) et l'inventaire de chacune |
| 2 | les **objectifs** | l'OBJECTIF de chaque boucle (§5) et les jalons (catégorie `règle`) |
| 3 | les **chaînes de progression** | les jalons en série + le bilan de passe (§6.5) |
| 4 | les **producteurs / consommateurs** | champs `producteur` et `consommateur` (§2), ENTRÉE/SORTIE (§5) |
| 5 | les **bâtiments** | catégorie `bâtiment` + son extension obligatoire (§2, §3) |
| 6 | les **rôles** des personnages | champ `role` de l'extension `bâtiment` — l'activité EXERCÉE |
| 7 | les **activités** | ce qu'un personnage FAIT : états de la catégorie `personnage` |
| 8 | les **quêtes** | boucle QUEST : objectif → action → **récompense** → nouvelle possibilité |
| 9 | les **compétences** | boucle SKILL : catégorie `règle`, nouvelles FAÇONS de faire |
| 10 | les **cartes / zones** | catégorie `lieu` et ses états |
| 11 | les **animations / skins** | catégories `animation` et `skin` |
| 12 | les **transformations perceptibles** | champ `transformation`, par état (R4) |
| 13 | les **questions ouvertes Art ↔ GM** | entrées `QUESTION_OUVERTE` avec leur porteur (§2.5) |
| 14 | les **relations entre tout cela** | ENTRÉE/SORTIE + `consommateur` + `unlocks` : la carte EST le graphe |

### 1.2 Les deux grilles de 14 champs — à ne pas confondre
- **Grille de pilotage** : OBJECTIF · ACTION JOUEUR · FEEDBACK · ENTRÉE · SORTIE · NOUVEAUTÉ · CONTENU REQUIS ·
  PRODUCTEUR · CONSOMMATEUR · DÉPENDANCES · QUESTION OUVERTE · MÉTRIQUE · PREUVE · ÉTAT.
- **Grille d'artefact (C.3)** : PURPOSE · PLAYER_ACTION · INPUT · STATE_CHANGE · REWARD · DECISION · OUTPUT ·
  NEXT_LOOP · CONTENT_REQUIRED · ART_REQUIRED · GM_REQUIRED · ECONOMY_REQUIRED · PROOF · MÉTRIQUE_PROPRE.

**C.5 est le contrat des QUATRE champs `*_REQUIRED`** et il donne un porteur aux **sept champs de pilotage** qui
n'en avaient aucun (§5). Les autres restent portés par C.3 et par le schéma d'artefact du GM — le format de son
fichier de sortie, que C.5 ne décrit pas : il dit seulement quels champs y ajouter (§8).

---

## 2. Le schéma d'une entrée de contenu (8 champs)

| Champ | Contenu | Refus si |
|---|---|---|
| `id` | identifiant unique **partagé par le design et par l'art**, commençant par le préfixe de sa catégorie (§2.7). Un sous-élément se note `parent.enfant` — **le parent doit exister comme entrée** (§2.8) | absent · différent des deux côtés · préfixe ≠ catégorie · sous-élément sans parent |
| `loop` | **la** boucle propriétaire, **une seule** parmi 1 à 9. Une entité qui relève de plusieurs boucles se scinde en autant d'entrées | absent · multiple · vaut ART↔GM |
| `categorie` | lieu · bâtiment · personnage · objet · animation · skin · UI · règle (§3) — **une seule** | hors liste · cumulée |
| `etats` | la liste NOMMÉE des états. Pour une `animation`, ses beats nommés — ou `déclenchée` si elle est indivisible (l'animation EST la transformation, R4 satisfaite) | ≥1 état non nommé · « valeur », « plusieurs états », « … » |
| `transformation` | par état : ce que le joueur VOIT et/ou peut FAIRE de nouveau | un état sans transformation (R4) |
| `consommateur` | la ou les boucles qui s'en servent — n'importe laquelle des 9, y compris la sienne ; **trois au maximum** | aucune (R3) · « toutes » · plus de trois |
| `producteur` | exactement `ART` · `GM` · `ART+GM` (§2.4) | autre valeur |
| `statut` | REQUIS · DEFERRED · QUESTION_OUVERTE (§2.2) | DEFERRED posé par un agent |

**Extension obligatoire de la catégorie `bâtiment`** : `emplacements` (combien de personnages) · `role` (l'activité
observable qu'il y EXERCE) · `production` (ce qui en sort et **où ça se voit**) · `etats` incluant au moins vide ·
occupé · plein.

**Exemption d'une entrée `QUESTION_OUVERTE`** : elle porte `id`, `loop`, `categorie`, `consommateur`, `producteur`
et son statut ; ses `etats`, sa `transformation` et **les champs d'extension de sa catégorie** valent
`— (c'est la question)` : ce sont précisément eux que la question réclame. C'est la seule exemption à R4, et
elle est bornée : une entrée ouverte ne peut pas être déclarée finie.

### 2.1 Ce qu'« exiger » veut dire (périmètre)
L'inventaire d'une boucle = les entrées dont elle est **propriétaire**. Une entrée d'une autre boucle qui la nomme
comme `consommateur` ne fait pas partie de son inventaire : elle lui **arrive**, et elle peut servir une de ses
étapes — à condition d'être **nommée** au titre du §6.4 a.

### 2.2 Deux axes d'état d'une boucle, orthogonaux
- **Axe DÉCISION** (qui décide du travail) : `REQUISE` (à compléter dans la phase courante) · `DEFERRED` (différée).
  **Un agent propose REQUISE ; seul l'humain pose DEFERRED.**
- **Axe COMPLÉTUDE** (ce qui est mesuré) : `VIDE` (aucune entrée) · `PARTIELLE` (des entrées, **et** au moins une
  question ouverte **ou** un critère §6.4 non tenu) · `PLEINE` (aucune question ouverte **et** critères §6.4 tenus).
Les deux se combinent : « DEFERRED · PARTIELLE » est un état parfaitement normal et fréquent. Le champ ÉTAT du §5
porte **les deux axes**.

### 2.3 Règle de présentation (vaut pour tout inventaire)
Un inventaire se présente en tableau **par boucle** : l'en-tête de section porte `loop` et les deux axes d'état ;
les colonnes portent `id`, `categorie`, `etats`, `transformation`, `consommateur`, `producteur`. Le 8ᵉ champ,
`statut`, se lit dans l'en-tête : **le statut d'entrée `REQUIS` correspond à l'axe DÉCISION `REQUISE` de sa boucle,
`DEFERRED` à `DEFERRED`** — une entrée qui en dévie (typiquement `QUESTION_OUVERTE`) le porte en clair dans sa
ligne. Les 8 champs sont ainsi toujours déterminables.
**Série** : des entrées homogènes (même catégorie, mêmes états, mêmes consommateurs, ne différant que par leur
identité) peuvent occuper une ligne notée `id_01…id_06`, **à condition** que la liste nominative figure ailleurs
dans le document. C'est une commodité d'écriture, pas une entrée unique.

### 2.4 `producteur` — le test qui tranche
`ART` si l'entrée n'existe que par ce qui se voit. `GM` si elle n'existe que par ce qui se joue (règle, seuil,
jalon) — pas d'art propre. `ART+GM` si la FORME vient de l'Art et la VALEUR ou la CAUSALITÉ du GM — **toute UI qui
affiche un état de jeu est `ART+GM`**, sans exception.

### 2.5 Qui porte une QUESTION_OUVERTE
Le `producteur` de l'entrée. Si l'entrée n'existe pas encore : **causalité, règle ou valeur → GM ; représentation
(à quoi ça ressemble, comment ça se lit) → ART.** Cas frontière : « quels sont les états d'un bâtiment ? » → GM ;
« à quoi ressemblent ces états ? » → ART. **Une question mixte se SCINDE en deux**, jamais arbitrée au jugé.
**Sur une entrée `QUESTION_OUVERTE`, le champ `producteur` porte le PORTEUR de la question, jamais le producteur
futur** — une question sur un `bâtiment` (catégorie normalement produite par l'ART) porte donc légitimement `GM`.
Le producteur définitif s'écrit quand la question se ferme et que l'entrée devient réelle.

### 2.6 Vocabulaire des états
Aucun vocabulaire n'est imposé, mais **un jeu déclare le sien une fois** — dans l'en-tête de son inventaire (§III.1
pour Kitten) — et s'y tient. **La déclaration se fait PAR RÔLE, pas par catégorie** (« un contenu à débloquer »,
« un emplacement », « un objet manipulé », « un afficheur de seuil »…), parce que deux objets de rôles différents
n'ont aucune raison de partager des états. **Jeu de rôles de départ, à adapter** : *contenu à débloquer* ·
*emplacement* · *objet manipulé* · *contenant* · *personnage en scène* · *jalon* · *règle de ressource* ·
*règle de choix* · *animation* · *afficheur*. Un rôle se reconnaît à ceci : **deux entrées du même rôle changent
d'état pour les mêmes raisons.** Deux entrées de même RÔLE portant des vocabulaires différents sont un
défaut de cohérence — sauf **exception narrative**, accordée à des
**entrées nommées une par une** dans la déclaration : une entrée dont l'état RACONTE quelque chose au joueur plutôt
que de le verrouiller (un lieu qui pose une question, un lieu qui change de saison) porte son vocabulaire propre.
**La déclaration peut porter la transformation d'un état commun à beaucoup d'entrées** (par exemple ce que « verrouillé »
montre au joueur) : R4 est alors satisfaite par la déclaration, et chaque entrée ne décrit que ce qui lui est propre.

### 2.7 Préfixes d'identifiant — un par catégorie (obligatoire)

| Catégorie | Préfixe | | Catégorie | Préfixe |
|---|---|---|---|---|
| lieu | `env_` | | animation | `anim_` |
| bâtiment | `bld_` | | skin | `skin_` |
| personnage | `char_` | | UI | `ui_` |
| objet | `item_` | | règle | `rule_` |

Le préfixe **encode la catégorie** : c'est ce qui rend la jointure design ↔ art vérifiable mécaniquement.

### 2.8 Sous-éléments
`parent.enfant` est légal ; le parent doit exister comme entrée. **Un sous-élément peut appartenir à une autre
boucle que son parent** (un HUD appartient à la lecture, chacun de ses compteurs à la boucle dont il montre
l'état) — mais alors **l'axe DÉCISION du parent est au moins aussi exigeant que celui de ses enfants** : une boucle
REQUISE ne peut pas dépendre d'un parent différé.
**Cas voisin, réglé autrement** : une boucle REQUISE peut recevoir dans son ENTRÉE la SORTIE d'une boucle DEFERRED,
**à condition qu'elle fonctionne sans** — c'est un enrichissement, pas une dépendance. Si elle ne fonctionne pas
sans, la boucle amont ne pouvait pas être différée, et c'est la ratification humaine qu'il faut revoir.

### 2.9 Granularité de l'art
La transformation visible reste **dans l'entrée qui la porte** ; on en extrait une entrée `anim_` distincte
**seulement si** (a) elle encadre un passage entre deux états NOMMÉS — les siens ou ceux d'une autre entrée, qu'elle
cite —, ou (b) elle est réutilisée par plusieurs entrées. Un effet qui n'est ni l'un ni l'autre (un simple retour
de geste) reste dans son entrée porteuse et **ne peut pas être cité dans une déclaration d'étape**. Une entrée `règle` ne
commande **jamais** d'art implicitement : si sa transformation décrit quelque chose à voir, l'entrée correspondante
existe séparément et la règle la nomme.

---

## 3. Les huit catégories, définies par un test qui tranche

| Catégorie | Définition opératoire | Test qui tranche |
|---|---|---|
| **lieu** | portion du monde où le joueur peut POSER quelque chose, **ou** dont l'état change au cours de la partie | s'il ne contient rien ET ne change jamais : décor, pas lieu |
| **bâtiment** | un lieu qui accueille des personnages, leur fait exercer une **activité observable**, et produit du fait de cette activité | si personne n'y va, ou si l'occupant s'y contente d'ÊTRE (présent, endormi, posé) : c'est un objet. **Un état n'est pas un rôle.** |
| **personnage** | entité qui a des états propres et un comportement observable | s'il ne fait rien : c'est un objet |
| **objet** | entité posée qui modifie le comportement d'un personnage ou ouvre une possibilité | s'il ne change aucun comportement : décor |
| **animation** | la transition VISIBLE entre deux états | si aucun état ne l'encadre : effet gratuit |
| **skin** | variante visuelle qui se COLLECTIONNE ou se DISTINGUE **indépendamment** de l'entité qu'elle habille | si elle EST l'identité de l'entité (sa seule apparence), ce n'est pas un skin : c'est le personnage |
| **UI** | ce qui rend lisible un état **et la possibilité qui en dépend** | si elle affiche un nombre **sans jamais montrer ce qu'il permet** : compteur |
| **règle** | entrée **sans art propre** : elle change ce qui est possible et se voit à travers d'autres entrées | si elle n'a ni art propre NI effet sur une autre entrée : ce n'est rien |

Les sept premières sont produites par l'ART (seul ou avec le GM) ; `règle` est produite par le **GM seul**.

**Anti-modèle nommé** (mesuré sur les 6 versions successives de Kitten Clicker) : un sprite sans état, sans
interaction et sans consommateur, déclaré « nouveau lieu ». C'est un décor — refusé **comme lieu**, et
**requalifiable** (objet, animation) plutôt que supprimé : le refus porte sur la catégorie revendiquée.

---

## 4. La clé de jointure design ↔ art

**Mesure (run Kitten `-20260824f`)** : 28 fiches d'asset sans champ `loop` ; 18 blocs de design sans `loop` ;
**18 assets sur 28 ne sont cités nulle part** par le design ; les nommages divergent (`banc` ↔ `item_banc`).

> **Règle C.5 — un seul identifiant.** Design et art nomment la même chose du même `id`, préfixe de catégorie
> compris (§2.7). Toute entrée porte `loop`. **L'état cible ne comporte AUCUNE table de correspondance** : une
> jointure qui exige une traduction permanente est un défaut.

La table §II.1 est une **migration ponctuelle** : elle sert une fois à renommer l'existant, puis elle est périmée
par construction.

---

## 5. Les sept champs de pilotage orphelins : où ils vivent

| Champ | Porteur institué par C.5 |
|---|---|
| OBJECTIF | la phrase de la boucle, du point de vue du joueur |
| **ENTRÉE** | ce que la boucle CONSOMME : une **ressource ou un contenu nommé** — jamais un nom de boucle seul. Une boucle qui ne consomme la sortie d'aucune autre déclare une **ENTRÉE PRIMITIVE** : le geste du joueur, le temps qui passe, ou une dotation de départ nommée (§6.8) |
| **SORTIE** | ce que la boucle REND DISPONIBLE : une **ressource, un contenu ou une possibilité nommée**. C'est le PRODUIT au sens de R2a |
| CONTENU REQUIS | l'inventaire de la boucle (les 8 champs du §2) |
| PRODUCTEUR | champ `producteur` de chaque entrée (§2.4) |
| QUESTION OUVERTE | entrée de statut `QUESTION_OUVERTE` (§2.5) |
| ÉTAT | les **deux axes** de la boucle : DÉCISION × COMPLÉTUDE (§2.2) |

---

## 6. Procédure

1. **Ordre** : les boucles 1 à 9 dans l'ordre du §1.1. La boucle 10 n'a pas d'inventaire.
2. **Pour chaque boucle** : écrire l'OBJECTIF, l'ENTRÉE et la SORTIE (§5), puis l'inventaire (une ligne par entrée
   ou par série, §2.3).
3. **Tout trou devient une entrée `QUESTION_OUVERTE`** (§2.5) — jamais un champ rempli au jugé.
4. **Critère de suffisance, vérifiable immédiatement** :
   a. chaque étape de la boucle — action du joueur · retour · nouveauté · décision — est servie par au moins une
      entrée, **de son inventaire OU d'une entrée entrante — c'est-à-dire une entrée d'une autre boucle, citée par
      son `id`**. La **déclaration d'étape** est une ligne écrite sous l'en-tête de la boucle, de la forme
      `action ✓ (id) · retour ✓ (id) · nouveauté ✓ (id) · décision ✓ (id)`. Une étape de DÉCISION est servie par
      une entrée de catégorie `règle` ; si aucune règle ne la porte, elle est « sans objet ».
      **Trois valeurs, et trois seulement** : `✓ (id)` servie · `sans objet` (cette boucle n'a pas cette étape) ·
      `MANQUANTE (question n° X)` — l'étape devrait exister et son contenu n'existe pas. `MANQUANTE` interdit
      l'état `PLEINE` et exige une entrée `QUESTION_OUVERTE` correspondante. **Une étape sans objet pour cette boucle se
      déclare « sans objet » en clair** (CORE n'a typiquement ni nouveauté ni décision) ; une étape passée sous
      silence est un défaut ;
   b. chaque entrée a des `etats` nommés et une `transformation` par état (R4) — sauf entrée `QUESTION_OUVERTE` ;
   c. chaque entrée a de 1 à 3 `consommateur` (R3) ;
   d. l'OBJECTIF est atteignable avec ce qui est nommé en (a) — sinon il manque une entrée, écrite en
      `QUESTION_OUVERTE`.
5. **Critère de bouclage, vérifiable seulement à la FIN de la passe sur les 9** : la SORTIE de chaque boucle est
   **nommée dans l'ENTRÉE d'au moins une AUTRE boucle** (R2a). Une boucle dont la sortie n'apparaît dans aucune
   ENTRÉE est orpheline. **L'appariement est LITTÉRAL** : la SORTIE et l'ENTRÉE qui la consomme s'écrivent avec la
   même chaîne exacte, sinon le bilan n'est pas mécanisable. **L'ENTRÉE est le SEUL instrument de cette mesure.** Le champ `consommateur`
   répond à une autre question — « quelle boucle se sert de CETTE entrée » — et se lit à la granularité du contenu ;
   l'ENTRÉE se lit à la granularité du produit. **Les deux ne se recoupent pas terme à terme et n'ont pas à le
   faire** : une boucle peut se servir d'un contenu d'une autre sans en consommer le produit. Un seul instrument,
   jamais deux verdicts concurrents. *Cette vérification est impossible boucle par boucle : la première traitée n'a encore
   aucune suivante.*
6. **Inventaire FINI** : (4) tenu et (5) tenu à la fin de la passe — ou l'humain déclare la boucle DEFERRED.
   Rappel : fini ≠ COMPLETE (§1).
7. **Traiter une boucle SEULE** est légal : on applique (2), (3), (4) ; le critère (5) est explicitement noté
   « non vérifiable — passe incomplète », jamais présumé tenu. Une étape ne peut alors citer que des `id` qui
   existent déjà ; à défaut elle est `sans objet` ou `MANQUANTE`, jamais une promesse.
8. **ENTRÉE PRIMITIVE** : une entrée qui n'est la SORTIE d'aucune boucle — le geste du joueur, le temps qui passe,
   une dotation de départ. Toute chaîne en a au moins une, sans quoi rien ne pourrait commencer. **La primitivité
   qualifie l'ENTRÉE, pas la boucle** : une même boucle peut avoir une entrée primitive ET consommer des sorties
   (typiquement CORE, dont le geste est primitif et qui s'enrichit ensuite de ce que d'autres boucles produisent).
   Une entrée primitive n'est jamais une SORTIE à chercher ailleurs, et ne se compte pas dans le bilan §6.5.

---

## 6bis. Les quatorze questions à poser pour chaque boucle (Pierre, 2026-08-25)

*Ce que la Forge doit demander AVANT le WireMap. Aucune ne se répond par un nombre.*

| Question | Ce qu'elle interdit de laisser vide |
|---|---|
| Pourquoi cette boucle existe-t-elle ? | une boucle sans raison d'être dans CE jeu |
| Que fait le joueur ? | une boucle où le joueur ne fait rien (R5 · JOUEUR) |
| Que produit-elle ? | une SORTIE non nommée |
| Qui consomme le résultat ? | une boucle orpheline (R2a) |
| Qu'est-ce qui change visuellement ? | un slot rempli (R2b, R4) |
| Quelle nouvelle possibilité apparaît ? | un déblocage qui n'est qu'un « +X % » (règle maîtresse) |
| Quel objectif apparaît ? | une progression sans but lisible |
| Quelle ressource intervient ? | une économie sans source, sink et fonction |
| Quelle décision existe ? | une boucle où le joueur n'arbitre jamais rien |
| Quelle récompense ? | un objectif atteint qui ne rend rien (défaut mesuré de QUEST) |
| Quel contenu l'Art doit-il fournir ? | « fais un jardin » sans inventaire (§2) |
| Que demande l'Art au GM ? | rôle, fonction, états — questions de causalité |
| Que demande le GM à l'Art ? | représentation perceptible — questions de représentation |
| Comment sait-on que c'est complet ? | R5 : les sept éléments, sinon PARTIELLE |

---

## 7. Les règles dures de C.5

> **R3 — Aucun contenu hors boucle.** Toute entrée porte un `loop` propriétaire et de 1 à 3 `consommateur` nommés —
> **sa propre boucle compte** (un retour de geste sert d'abord la boucle qui le produit). Un asset qui n'appartient
> à aucune boucle, ou dont le champ `consommateur` est vide, n'est pas du contenu : c'est un décor orphelin,
> refusé — joli ou non.
> **R5 — Les sept éléments d'une boucle** (Pierre, 2026-08-25). Une boucle porte :
> **PRODUCTEUR · CONSOMMATEUR · JOUEUR · OBJECTIF · NOUVELLE POSSIBILITÉ · CONTENU · TRANSFORMATION PERCEPTIBLE.**
> **S'il en manque un seul, la boucle est PARTIELLE — jamais COMPLETE.** C'est le critère qui distingue une boucle
> d'un slot rempli : « JOUEUR » exige que le joueur ait quelque chose à y faire, « NOUVELLE POSSIBILITÉ » qu'il en
> sorte quelque chose qu'il ne pouvait pas faire avant, « TRANSFORMATION PERCEPTIBLE » qu'il le VOIE.
> **R4 — Aucun état sans transformation.** Tout état déclaré s'accompagne de la transformation PERCEPTIBLE qui le
> rend lisible. Un état qui ne change rien à l'écran n'est pas un état : c'est une valeur de variable.

### Ce qui rend un inventaire invalide (anti-modèles)
1. **Le renvoi au lieu du nom** — « voir le contrat de gameplay » comme contenu requis.
2. **Le décor promu lieu** (§3). 3. **L'état sans transformation** (R4). 4. **L'orphelin des deux côtés**.
5. **La quantité à la place de la nature** — « ≥1 contenu neuf par cycle » ne dit pas QUOI.
6. **Le slot rempli** — valide de forme, sans effet sur le jeu. 7. **Le DEFERRED d'agent**.
8. **La règle invisible** — une mécanique absente de l'inventaire faute d'art (catégorie `règle`).
9. **Le `consommateur: toutes`** — invérifiable : au plus trois boucles, sinon l'entrée est mal découpée.
10. **L'état non nommé** — « valeur », « plusieurs états », « … » : un état qu'on ne peut pas citer n'existe pas.

---

# PARTIE II — LA CARTE DE KITTEN WORLD

## II.0 · La boucle canonique — **par où la carte commence** (Pierre, 2026-08-25)

*Cette section précède tout inventaire. Elle dit ce qu'EST le jeu ; l'inventaire dit seulement avec quoi.*

**Ce que la carte ne doit PAS être** : `chaton 20 R → chaton 60 R → chaton 140 R`. Une échelle de coûts n'est pas
une boucle : c'est un tarif. Les six prototypes successifs de Kitten l'ont prouvé — la scène satisfaisait les
oracles et le monde ne grandissait pas.

**Ce que la carte EST :**

```text
JOUEUR
  │
  ▼
FAIT APPARAÎTRE UN CHATON
  │
  ▼
LE CHATON FAIT QUELQUE CHOSE          ← il exerce une activité, il n'est pas un décor qui ronronne
  │
  ▼
LE JOUEUR AMÉLIORE LE PETIT MONDE
  │
  ▼
LE MONDE CHANGE VISUELLEMENT          ← R2b : sinon rien de tout cela n'a eu lieu pour le joueur
  │
  ▼
NOUVELLE POSSIBILITÉ
  │
  ▼
NOUVEAU CHAT / BÂTIMENT / ACTIVITÉ
  │
  ▼
NOUVEL OBJECTIF
  │
  └──────────────► recommence
```

**L'économie vient À L'INTÉRIEUR de cette boucle, jamais à sa place.** Elle matérialise l'expansion du monde ;
elle ne la remplace pas. Toute case de l'inventaire qui ne sert aucun maillon de cette boucle est à requalifier.

### II.0.1 · Direction « chatons travailleurs » — ce que la carte doit pouvoir exprimer
*Proposée par Pierre le 2026-08-25 comme test de la carte. Elle répond exactement au maillon manquant mesuré
(§II.12 : aucun bâtiment, aucun rôle). Portée de jeu à ratifier — la carte, elle, doit savoir l'écrire.*

```text
          ATELIER                         École                    Station spatiale
             │                              ↓                             ↓
       ┌─────┴─────┐                 nouveaux chatons           chatons astronautes
       │           │                        ↓                             ↓
   panier vide  panier produit      nouvelles compétences        nouvelles ressources
       │           │                        ↓                             ↓
       ▼           ▼                  nouveaux bâtiments             nouvelle carte
    chaton      chaton TRAVAILLE             ↓                             ↓
   apparaît     (avec un chapeau)       nouvelle zone               nouveaux bâtiments
                     │                        ↓                             ↓
                     ▼                 nouveaux chatons        nouvelle génération de chatons
                production
                     │
                     ▼
              nouveau bâtiment
```

**Ce que ce test vérifie** : un bâtiment au sens du §3 (il accueille, le chaton y EXERCE une activité visible —
le chapeau est la marque du rôle —, il produit du fait de cette activité), une compétence qui ouvre un bâtiment,
un bâtiment qui ouvre une zone, une zone qui ramène des chatons. **C'est là que l'économie prend enfin une
fonction ludique : elle matérialise l'expansion du monde.** Tant que la carte de Kitten ne sait pas écrire cette
chaîne, elle décrit un compteur décoré.

---

## II.0.2 · Inventaires — état des lieux

*Dérivé de l'existant ratifié — contrats C.1 (progression), C.2 (gameplay et contenu), direction produit V1, et
répartition de phase 1 (toutes ratifications de Pierre, la plus récente du 2026-08-24) — et de l'artefact réel du
run `-20260824f`. Ce qui n'existe pas est une entrée
`QUESTION_OUVERTE` — jamais comblé par une invention. Vocabulaire du jeu : §III.1.*

**Direction produit (ratifiée)** : un petit univers de chatons bienveillant où **chaque achat transforme VISIBLEMENT
la scène** ; départ = panier + coussin + jardin fermé + album de 9 silhouettes « ? » ; le prestige n'est pas un
bouton mais un moment ; la carte EST le système de progression.
**Phase 1 (ratification Pierre 2026-08-24)** : CORE et GAMEPLAY REQUISES ; les 7 autres DEFERRED — définies ici.

## II.1 Migration des identifiants (ponctuelle — §4) et séries

| `id` canonique | design (ancien) | art (ancien) | boucle |
|---|---|---|---|
| `item_pelote` · `env_refuge` · `anim_reaction_proche` | pelote | item_pelote, env_refuge | CORE |
| `item_panier` · `item_coussin` · `ui_affordances` · `char_kitten_01` · `rule_decision_1` | coussin, placer, kitten_first, decision_1 | item_panier, item_coussin, ui_affordances, kitten_minou_roux | GAMEPLAY |
| `ui_hud` · `rule_jalon_P01…P08` | hud | ui_hud | PROGRESSION |
| `item_banc` · `item_fleurs` · `item_jouet` · `item_niche` · `char_kitten_02…06` | banc, fleurs, jouet, niche, kitten_second | idem préfixés | CONTENT |
| `rule_ressource_ronrons` · `item_gamelle` | gamelle | item_gamelle | ECONOMY |
| `rule_caresse_longue` · `anim_pelote_held` | caresse_longue | *(aucun)* | SKILL |
| `env_jardin` · `env_grenier` · `item_arbre` | jardin, grenier | env_jardin, env_grenier, item_arbre | WORLD |
| `ui_album` | album | ui_album | QUEST |
| `anim_prestige` · `anim_coeur` · `ui_ecran_fin` · `char_kitten_07…09` · `skin_saison` | prestige, rare_kittens | fx_prestige, fx_coeur, ui_ecran_fin, 3 fiches dorées | META |

**Précision de la mesure** : sur les 28 fiches d'asset du run, **18 ne sont citées nulle part** dans le fichier du GM
(divergence de nommage : `banc` ↔ `item_banc`) ; parmi ces 18, **six n'avaient aucun équivalent design, sous quelque
nom que ce soit** (`item_panier`, `item_arbre`, `env_refuge`, `ui_ecran_fin`, `anim_coeur`, et l'ancien `fx_clic_pelote`
repris dans l'état `actif` de `item_pelote` faute d'états propres, §2.9) —
les douze autres existaient des deux côtés sous deux noms. Cette table résout les deux cas : elle donne une boucle
aux six, et un `id` unique aux douze. Les entités multi-boucles ont été **scindées**.
Les préfixes `fx_` et `kitten_` de l'ancien nommage sont remplacés par `anim_` et `char_` (§2.7).

**Série `char_kitten_01…09`** (liste nominative, §2.3) : `01` minou_roux · `02` gris_perle · `03` calico_patch ·
`04` tuxedo_smoking · `05` siamois_creme · `06` roux_blanc_lune · `07` doré_aurore · `08` doré_comete ·
`09` doré_astre (les trois dorés : portée ≥ 2). Ordre d'adoption déterministe, un emplacement d'album fixe chacun.
**Série `rule_jalon_P01…P08`** : P01 accueillir le 1ᵉʳ chaton · P02 le placer · P03 ouvrir le jardin · P04 accueillir
un 2ᵉ chaton et le placer au jardin · P05 DÉCISION 1 · P06 aménager le jardin · P07 accueillir 3 chatons de plus ·
P08 prestige. *Les coûts appartiennent à C.1.*

---

## II.2 · CORE — « je caresse, le refuge me répond » · **REQUISE · PLEINE**
**ENTRÉE** : le geste du joueur (**entrée primitive**, §6.8 — la primitivité qualifie l'entrée, pas la boucle) ·
`interactions nouvelles` (de SKILL, dès qu'elles sont apprises) · `nouvelle portée` (de META, à partir de la
portée 2). **SORTIE** : `ronrons`.
*Étapes : action ✓ (`item_pelote`) · retour ✓ (`anim_reaction_proche`) · nouveauté **sans objet** ·
décision **sans objet** (§6.4 a).*

| `id` | catégorie | états | transformation par état | consommateur | producteur |
|---|---|---|---|---|---|
| `item_pelote` | objet | repos · actif · maintenu | repos : immobile · actif : roule à chaque caresse, avec un retour immédiat au point exact du clic (§2.9 — effet sans états propres, il reste dans cette entrée) · maintenu : ronron continu, le halo pulse | CORE, GAMEPLAY, SKILL | ART |
| `env_refuge` | lieu | portée 1 · portée ≥2 | portée 1 : intérieur simple, poussière dans un rai, rideau qui bouge · portée ≥2 : palette et lumière de la saison en cours | CORE, WORLD | ART |
| `ui_hud.ronrons` | UI | sous le seuil · au seuil | sous le seuil : le compteur monte et **la prochaine possibilité reste grisée avec son coût** · au seuil : **elle s'allume** | CORE, PROGRESSION | ART+GM |
| `ui_hud` | UI | réduit · étendu | réduit (niveau 1) : objectif, ronrons, places · étendu (portée ≥2) : + cœurs, + album — **le cadre grandit avec le jeu** | CORE, PROGRESSION | ART+GM |
| `anim_reaction_proche` | animation | déclenchée | encadre le passage `dans le panier`→`couché` d'un `char_kitten_*` : le plus proche lève la tête et se tourne ; **à 0 chaton : rien** | CORE | ART |

## II.3 · GAMEPLAY — « j'accueille un chaton et je décide où il vit » · **REQUISE · PLEINE**
**ENTRÉE** : `ronrons`. **SORTIE** : `chatons placés` · `décision tranchée`.
*Étapes : action ✓ (`ui_affordances`) · retour ✓ (`item_panier`, `char_kitten_01`) · nouveauté ✓ (`item_coussin`,
`ui_hud.places`) · décision ✓ (`rule_decision_1`).*

| `id` | catégorie | états | transformation par état | consommateur | producteur |
|---|---|---|---|---|---|
| `item_panier` | objet | fermé · s'ouvre · ouvert | fermé : promesse posée au centre · s'ouvre : **un chaton en sort** (P01) · ouvert : prêt pour le suivant | GAMEPLAY | ART |
| `char_kitten_01` | personnage | dans le panier · sort · marche · couché · joue | dans le panier : une forme qui bouge sous le couvercle, on devine qu'il y a quelqu'un · sort : il s'assoit au centre et regarde le joueur · marche : il se dirige vers la place qu'on lui a donnée · couché : il dort, il ronronne · joue : il interagit avec l'objet du lieu | GAMEPLAY, WORLD, QUEST | ART+GM |
| `item_coussin` | objet | libre · occupé | libre : un lit vide, visible · occupé : le chaton s'y couche et dort (P02) | GAMEPLAY, WORLD | ART |
| `ui_affordances` | UI | hors de portée · atteignable · parquée « Bientôt » | hors de portée : grisée avec coût ET effet · atteignable : elle s'allume · parquée : bandeau « Bientôt » avec badge ↻, **revient au palier suivant** — jamais un cadenas, qui se lirait « fermé pour toujours » | GAMEPLAY, PROGRESSION | ART+GM |
| `rule_decision_1` | règle | proposée · tranchée | proposée : deux choix appariés, portés par l'état `atteignable` de `ui_affordances` (§2.9 — la règle nomme l'entrée qui la montre) · tranchée : A rend `item_banc` disponible · B fait apprendre `rule_caresse_longue`. **Exclusive au palier** : l'autre branche revient au palier suivant (P05) | GAMEPLAY, SKILL, CONTENT | GM |
| `ui_hud.collection` | UI | vide · en cours · complète | vide : 9 silhouettes « ? » · en cours : le compte monte · complète : le prestige devient possible | GAMEPLAY, QUEST | ART+GM |
| `ui_hud.places` | UI | libre · occupée · pleine | libre : une place vide s'affiche, **accueillir a donc un sens** · occupée : le compte monte, la place est prise · pleine : **le plafond de places devient une raison d'ouvrir un lieu** (P03) | GAMEPLAY, WORLD | ART+GM |

## II.4 · PROGRESSION — « je sais ce que je cherche et ce qui vient après » · **DEFERRED · PARTIELLE**
**ENTRÉE** : `chatons placés` · `décision tranchée` · `cœurs` (de META, à partir de la portée 2).
**SORTIE** : `possibilités débloquées` · `objectifs affichés`.
*Étapes : action **sans objet** (le joueur n'agit pas sur la progression, il la lit) · retour ✓ (`ui_hud.objectif`) ·
nouveauté ✓ (`rule_jalon_P01…P08`) · décision **sans objet**.*

| `id` | catégorie | états | transformation par état | consommateur | producteur |
|---|---|---|---|---|---|
| `ui_hud.objectif` | UI | affiché · atteint | affiché : nomme UNE action sur le monde, jamais un nombre seul · atteint : il cède la place au suivant | PROGRESSION, QUEST | ART+GM |
| `ui_hud.ensuite` | UI | annoncé | annonce la prochaine possibilité, avant qu'elle soit atteignable | CONTENT, WORLD | ART+GM |
| `rule_jalon_P01…P08` *(série)* | règle | LOCKED · AVAILABLE · FRANCHI | LOCKED : le jalon n'est pas encore visé — la possibilité qu'il ouvre reste grisée dans `ui_affordances`, coût et effet lisibles · AVAILABLE : l'objectif du jalon s'écrit dans `ui_hud.objectif` · FRANCHI : la possibilité qu'il ouvre s'allume dans `ui_affordances` et la suivante s'annonce dans `ui_hud.ensuite` (§2.9 — entrées nommées ; liste des huit jalons en §II.1) | GAMEPLAY, CONTENT, WORLD | GM |
| `rule_table_jalons` | règle | — *(c'est la question)* | **`statut: QUESTION_OUVERTE` (1/5 — porteur GM)** : la table des jalons n'est matérialisée dans **aucun artefact de run** — elle n'existe que dans le contrat C.2 et n'est citée par le GM que comme référence. Elle doit devenir un objet nommé de l'artefact | PROGRESSION | GM |

## II.5 · CONTENT — « il y a toujours quelque chose de neuf à obtenir » · **DEFERRED · PLEINE**
**ENTRÉE** : `possibilités débloquées` · `achats effectués`. **SORTIE** : `objets posés` · `chatons adoptés`.
*Étapes : action ✓ (`ui_affordances`, entrée entrante de GAMEPLAY) · retour ✓ (`item_banc`, `item_fleurs`,
`item_jouet`, `item_niche`) · nouveauté ✓ (`char_kitten_02…06`) · décision **sans objet** (portée par GAMEPLAY).*

| `id` | catégorie | états | transformation par état | consommateur | producteur |
|---|---|---|---|---|---|
| `item_banc` | objet | LOCKED · posé · occupé | posé : un banc dans le jardin · occupé : un chaton s'y installe, dort et ronronne — la production devient visible. *Candidat bâtiment, §II.12 — il ne l'est pas encore* | CONTENT, ECONOMY, WORLD | ART |
| `item_fleurs` | objet | LOCKED · posé | posé : des papillons viennent, un chaton les chasse | CONTENT, WORLD | ART |
| `item_jouet` | objet | LOCKED · posé | posé : un chaton le poursuit en courant | CONTENT, WORLD | ART |
| `item_niche` | objet | LOCKED · posé | posé : un chaton y dort la nuit | CONTENT, WORLD | ART |
| `char_kitten_02…06` *(série)* | personnage | LOCKED · adopté · placé | adopté : **une robe distincte sort du panier** · placé : **un comportement propre** (grimpe, chasse les papillons, dort dans la niche) | CONTENT, QUEST, WORLD | ART+GM |

Chaîne exigée : `item_banc` → { `item_fleurs`, `item_jouet`, `item_niche` } → nouveaux comportements → WORLD.

## II.6 · ECONOMY — « ce que je dépense transforme le monde » · **DEFERRED · PLEINE**
**ENTRÉE** : `ronrons`. **SORTIE** : `achats effectués` (dépenses converties en transformations).
*Étapes : action ✓ (`ui_affordances.cout_effet`) · retour ✓ (`rule_ressource_ronrons`) · nouveauté **sans objet**
(l'économie ne crée rien : elle convertit) · décision ✓ (`rule_decision_1`, entrée entrante de GAMEPLAY).*

| `id` | catégorie | états | transformation par état | consommateur | producteur |
|---|---|---|---|---|---|
| `rule_ressource_ronrons` | règle | produite · dépensée | produite : le compteur monte et **la prochaine possibilité se rapproche visiblement** de son seuil — se voit par `ui_hud.ronrons` (source : la caresse et les chatons placés) · dépensée : le compteur retombe et **la scène change au même instant** — se voit par `ui_hud.ronrons`, par `ui_affordances` (la possibilité passe d'`atteignable` à consommée) et par l'état `posé`/`adopté` de l'entrée achetée : `item_banc`, `item_fleurs`, `item_jouet`, `item_niche`, `item_gamelle`, `char_kitten_01…09`, `env_jardin` (sink : accueillir, ouvrir, aménager). Fonction : convertir le geste en transformation du monde | ECONOMY, GAMEPLAY, CONTENT | GM |
| `ui_affordances.cout_effet` | UI | coût seul · coût et effet | coût seul : je ne sais pas ce que j'achète · coût et effet : **je vois ce que ça change avant de payer** (état exigé, le premier est le défaut à éviter) | ECONOMY, GAMEPLAY | ART+GM |
| `item_gamelle` | objet | LOCKED · posé · occupé | posé : une gamelle vide au jardin, les chatons viennent la renifler · occupé : elle est pleine, le jardin **nourrit** les chatons (croquettes, niveau 2) | ECONOMY, CONTENT | ART |

*Les valeurs (coûts, taux) appartiennent à C.1 ; C.5 exige seulement qu'elles soient affichées avec leur effet.*

## II.7 · SKILL — « j'apprends une nouvelle façon de faire » · **DEFERRED · PARTIELLE**
**ENTRÉE** : `décision tranchée` (branche B). **SORTIE** : `interactions nouvelles`.
*Étapes : action ✓ (`rule_caresse_longue`) · retour ✓ (`anim_pelote_held`) · nouveauté ✓ (`anim_chaton_se_frotte`) ·
décision **sans objet** (la décision qui mène ici est portée par GAMEPLAY).*

| `id` | catégorie | états | transformation par état | consommateur | producteur |
|---|---|---|---|---|---|
| `rule_caresse_longue` | règle | LOCKED · apprise | LOCKED : la possibilité de l'apprendre est grisée dans `ui_affordances`, coût et effet lisibles · apprise : maintenir ouvre une interaction nouvelle — jamais un ×2 ; se voit par `anim_pelote_held` et `anim_chaton_se_frotte` (§2.9) | SKILL, CORE | GM |
| `anim_pelote_held` | animation | déclenchée | encadre le passage `actif`→`maintenu` de `item_pelote` : halo de ronron pulsant, ondes concentriques | SKILL, CORE | ART |
| `anim_chaton_se_frotte` | animation | déclenchée | encadre le passage `couché`→`joue` du `char_kitten_*` le plus proche : il se lève et vient se frotter, ronron continu | SKILL, CORE | ART |
| `rule_appeler` | règle | — *(c'est la question)* | **`statut: QUESTION_OUVERTE` (2/5 — porteur GM)** : la caresse longue est censée ouvrir une interaction « appeler ». **Aucun contenu n'existe** : ni règle, ni animation, ni UI. À définir, ou à retirer du contrat C.2 qui la promet | SKILL, CORE | GM |

## II.8 · WORLD — « le monde s'agrandit et vit » · **DEFERRED · PARTIELLE**
**ENTRÉE** : `objets posés` · `chatons placés`. **SORTIE** : `lieux ouverts et occupés`.
*Étapes : action ✓ (`ui_affordances`, entrée entrante) · retour ✓ (`env_jardin`) · nouveauté ✓ (`item_arbre`,
`env_grenier`) · décision **sans objet en phase 1** (aucune règle ne porte encore le choix du lieu à développer).*

| `id` | catégorie | états | transformation par état | consommateur | producteur |
|---|---|---|---|---|---|
| `env_jardin` | lieu | LOCKED · AVAILABLE · ACTIVE · FULL | AVAILABLE : volets entrouverts, coût lisible · ACTIVE : **la carte s'agrandit** (la caméra ne bouge pas) — herbe, 3 emplacements de chatons, 4 d'objets, un oiseau passe (P03) · FULL : tous occupés | WORLD, CONTENT, META | ART+GM |
| `item_arbre` | objet | libre · occupé | libre : un arbre où un oiseau se pose de temps en temps · occupé : un chaton **grimpe et joue** — comportement propre au lieu | WORLD, CONTENT | ART |
| `env_grenier` | lieu *(vocabulaire narratif, §2.6)* | fermé « ? » · promis · ACTIVE | fermé : une lucarne visible dès P03 — **une question posée à l'écran** · promis : le prestige l'annonce · ACTIVE : ouvert (phase 2) | WORLD, META | ART+GM |
| `rule_activite_grenier` | règle | — *(c'est la question)* | **`statut: QUESTION_OUVERTE` (3/5 — porteur GM)** : le grenier passe le test du lieu (§3 : ses états changent), mais son état `ACTIVE` **n'a aucun contenu** — rien à y faire, rien à y poser. Il ne contribue donc pas à la SORTIE `lieux ouverts et occupés` et reste différé tant que son activité n'existe pas | WORLD, META | GM |
| `bld_01` | bâtiment | — *(c'est la question)* | **`statut: QUESTION_OUVERTE` (4/5 — porteur GM)** : **aucun bâtiment n'existe** (§II.12). Définir `emplacements`, `role`, `production` d'au moins un — sans quoi WORLD ne peut pas être COMPLETE | WORLD, ECONOMY | GM |

## II.9 · QUEST — « on me donne un but, je reçois quelque chose » · **DEFERRED · PARTIELLE**
**ENTRÉE** : `objectifs affichés` · `chatons adoptés`. **SORTIE** : `album complété`.
*Étapes : action **sans objet** (le joueur poursuit l'objectif par d'autres boucles) · retour ✓ (`ui_album`) ·
nouveauté **MANQUANTE (question 5/5)** · décision **sans objet**.*
**Cette boucle boucle (R2a ✓ : META consomme `album complété`) mais échoue R2b : rien de perceptible n'est RENDU au
joueur quand un objectif est atteint.** C'est un défaut de récompense, pas un défaut de bouclage.

| `id` | catégorie | états | transformation par état | consommateur | producteur |
|---|---|---|---|---|---|
| `ui_album` | UI | silhouettes « ? » · emplacement révélé · colorié | « ? » : 9 promesses visibles d'emblée · révélé : le chaton adopté **colore SON emplacement** (mapping 1↔1) · colorié : la portée est accomplie | QUEST, META | ART+GM |
| `rule_recompense_quete` | règle | — *(c'est la question)* | **`statut: QUESTION_OUVERTE` (5/5 — porteur GM) — la plus grave** : *aucune récompense de quête n'existe* (0 mesurée sur les 6 versions). Un objectif atteint doit rendre quelque chose que le joueur n'avait pas ; aujourd'hui il n'avance qu'un compteur | QUEST, CONTENT | GM |

## II.10 · META — « mon refuge est complet, une nouvelle portée m'attend » · **DEFERRED · PLEINE**
**ENTRÉE** : `lieux ouverts et occupés` · `album complété`. **SORTIE** : `nouvelle portée` · `cœurs`.
*Étapes : action ✓ (`ui_affordances`, entrée entrante) · retour ✓ (`anim_prestige`) · nouveauté ✓ (`skin_saison`,
`char_kitten_07…09`) · décision **sans objet** (aucune règle ne porte le choix du moment du prestige — il devient
possible, le joueur le déclenche).*

| `id` | catégorie | états | transformation par état | consommateur | producteur |
|---|---|---|---|---|---|
| `anim_prestige` | animation | adieu · conserve · reset · transformation · promesse · récompense | 6 beats ordonnés (~2,5 s) : les chatons partent un par un → l'album se colore en cascade → remise à zéro → **la saison change** → le grenier apparaît et un ruban se noue → +1 cœur | META, WORLD | ART |
| `anim_coeur` | animation | déclenchée | encadre le passage du beat `récompense` de `anim_prestige` à l'état `étendu` de `ui_hud` : le cœur gagné se voit | META, PROGRESSION | ART |
| `ui_ecran_fin` | UI | masqué · affiché | masqué : rien ne couvre la scène, le joueur joue · affiché : l'état du refuge accompli et ce qui attend à la portée suivante | META | ART+GM |
| `char_kitten_07…09` *(série)* | personnage | LOCKED (portée ≥2) · adopté | adopté : **une robe dorée** — le but d'une portée | META, QUEST | ART+GM |
| `skin_saison` | skin | printemps · été · automne · hiver | printemps : lumière claire, bourgeons au jardin · été : lumière chaude, herbe haute, insectes · automne : feuilles au sol, lumière rasante · hiver : neige sur le toit, lumière froide, buée aux fenêtres. **Chaque portée fait basculer la scène entière dans la saison suivante** | META, WORLD | ART |

## II.11 · ART↔GM — le protocole · transversal, **sans inventaire** (§1.1)
Il possède les QUESTIONS : chacune porte l'identifiant de sa boucle, chaque réponse RÉÉCRIT les champs de la boucle
concernée. **Métrique propre** : le nombre de champs de boucle complétés PAR le dialogue — mesure aujourd'hui
absente de tout oracle de la chaîne (défaut relevé, non traité ici).

## II.12 · Le maillon manquant : rôle et affectation
**Mesure** : dans l'artefact réel, zéro occurrence de travail / affectation / rôle. Un chaton est *placé*, et la
seule conséquence est un multiplicateur de lieu. Il n'y a **aucun bâtiment** au sens du §3 : `item_banc` accueille et
rend la production visible, mais l'occupant s'y contente d'ÊTRE (il dort) — **un état n'est pas un rôle**. La chaîne
visée par la direction produit exige ce maillon :

```text
BÂTIMENT → DES CHATONS Y EXERCENT UNE ACTIVITÉ → PRODUCTION VISIBLE → NOUVELLE POSSIBILITÉ
   → NOUVEAU LIEU → NOUVEAUX CHATONS → NOUVELLE ACTIVITÉ → COLLECTION → PRESTIGE → NOUVEAU MONDE
```

L'entrée `bld_01` (§II.8) porte cette question.

## II.13 · Bilan de passe (critère §6.5, passe complète sur les 9)

*Instrument unique : l'ENTRÉE des autres boucles (§6.5) — le champ `consommateur` mesure autre chose et n'entre pas
ici (§6.5). Les entrées primitives ne se comptent pas (§6.8). **Correction V1.4** : la V1.3 déclarait ECONOMY, SKILL et
QUEST « orphelines ». **C'était faux** — un artefact d'ENTRÉE mal rédigées de ma part, pas un état du jeu : les
achats font apparaître les objets de CONTENT, la caresse longue est ce qui donne à la pelote son état `maintenu` en
CORE, et META consomme `album complété`. Les ENTRÉE ont été réécrites pour dire ce que le jeu fait réellement.*

| Boucle | SORTIE | nommée dans l'ENTRÉE de | R2a |
|---|---|---|---|
| CORE | `ronrons` | GAMEPLAY, ECONOMY | ✓ |
| GAMEPLAY | `chatons placés` · `décision tranchée` | PROGRESSION, SKILL, WORLD | ✓ |
| PROGRESSION | `possibilités débloquées` · `objectifs affichés` | CONTENT, QUEST | ✓ |
| CONTENT | `objets posés` · `chatons adoptés` | WORLD, QUEST | ✓ |
| ECONOMY | `achats effectués` | CONTENT | ✓ |
| SKILL | `interactions nouvelles` | CORE | ✓ |
| WORLD | `lieux ouverts et occupés` | META | ✓ |
| QUEST | `album complété` | META | ✓ |
| META | `nouvelle portée` · `cœurs` | CORE, PROGRESSION | ✓ |

**R2a est tenue par les neuf boucles : la chaîne boucle.** Ce que la passe révèle est ailleurs, et c'est plus
précis que « des orphelines » :

| Défaut mesuré | Nature | Conséquence |
|---|---|---|
| QUEST ne rend rien au joueur quand un objectif est atteint (question 5/5) | **R2b** — pas de transformation perceptible | QUEST ne peut pas être COMPLETE |
| Aucun bâtiment n'existe (question 4/5) ; le grenier n'a pas d'activité (3/5) | **contenu manquant** dans WORLD | WORLD ne peut pas être COMPLETE |
| `rule_appeler` promise sans contenu (2/5) ; table des jalons non matérialisée (1/5) | **promesses sans contenu** | SKILL et PROGRESSION restent PARTIELLES |

**Une chaîne qui boucle mécaniquement et qui, en trois endroits, ne rend rien de perceptible au joueur** : c'est
exactement le diagnostic que ce niveau doit produire avant le WireMap, et il ne se voit qu'une fois le contenu
rattaché aux boucles.

---

## 8. Ce que ça change au mécanisme (contrat, pas code)

1. **Ce document est injecté en amont** des deux piliers, comme le sont déjà C.1 et C.2. **Sans cette injection,
   C.5 subit le sort de C.3 : prescrit, jamais livré. C'est une condition d'EXISTENCE, pas une option.**
2. Le schéma d'artefact du GM gagne quatre listes, **toutes dérivées du même inventaire** (§2) — aucune information
   nouvelle à inventer, seulement des vues :
   - `content_required[]` : l'inventaire complet de la boucle, une entrée = les 8 champs du §2 ;
   - `art_required[]` : les `id` dont le `producteur` vaut `ART` ou `ART+GM` — **ce que l'Artiste doit fabriquer** ;
   - `gm_required[]` : les `id` dont le `producteur` vaut `GM` ou `ART+GM` — **ce que le GM doit décider** ;
   - `economy_required[]` : les entrées de catégorie `règle` qui déclarent une ressource (source · sink · fonction
     dans la progression) et les entrées dont un état porte un coût — **ce qui doit être chiffré** (les valeurs
     restent à C.1).
3. Les fiches d'asset et les blocs de design gagnent `loop` et partagent l'`id` canonique préfixé (§2.7, §4).
4. Les deux axes d'état de boucle (§2.2) deviennent des champs de l'artefact.
5. Les dix anti-modèles du §7 deviennent des refus nommés d'un **oracle de design — qui n'existe pas aujourd'hui** :
   le créer fait partie du lot de code, il n'est pas présupposé ici.
6. Le prompt du GM cesse d'exiger « les champs C.3 » sans les énumérer.

*Les points 2 à 6 ne sont pas ratifiés : ce sont les conditions de câblage que C.5 implique. Périmètre, ordre et
forme = décision de Pierre (HumanGate).*

---

## 9. Test de validité

**Méthode (Partie I seule)** : (1) définir les 10 boucles sans exemple ; (2) produire l'inventaire d'une boucle pour
un AUTRE jeu en suivant §6 — y compris le sort du critère §6.5 et le cas de l'entrée primitive ; (3) dire quand un
inventaire est FINI et en quoi cela diffère de COMPLETE ; (4) trancher « bâtiment ou objet ? » et « lieu ou
décor ? » ; (5) dire ce qu'on fait d'un champ inconnu, qui porte la question, et ce qu'on fait d'une question mixte.
**Instance (Partie II)** : (6) dire ce que WORLD exige, avec états et consommateurs ; (7) dire pourquoi `item_banc`
n'est pas un bâtiment ; (8) citer les cinq questions ouvertes et leur porteur, dire si la chaîne boucle (R2a) et
nommer la boucle qui échoue R2b ;
(9) dire qui pose DEFERRED et qui propose REQUISE.

Toute réponse exigeant une invention = document incomplet, à corriger avant ratification.

---

# PARTIE III — GLOSSAIRES

## III.1 Vocabulaire de l'instance Kitten World
- **ronron** : la ressource unique du niveau 1, produite par la caresse et par les chatons placés, dépensée pour
  accueillir, ouvrir et aménager.
- **portée** : un cycle complet — on remplit le refuge, on fait le prestige, une nouvelle portée arrive dans un
  monde changé (saison différente, nouveau lieu promis). Portée 1 = la première partie.
- **prestige** : le moment qui clôt une portée — les chatons partent adoptés, l'album garde leur couleur, la saison
  change, un cœur est gagné, un lieu apparaît. Pas un bouton de multiplicateur : une scène.
- **niveau 1 / niveau 2** : niveau 1 = le contenu jouable de la portée 1 (refuge, jardin, 6 chatons) ; niveau 2 = ce
  qui s'ouvre à partir de la portée 2 (grenier, croquettes, chatons dorés).
- **phase 1 / phase 2** : découpage du TRAVAIL, pas du jeu — phase 1 = les boucles complétées maintenant.
- **jalon** (P01…P08) : étape nommée de la progression du niveau 1. **palier** : le moment où un jalon est franchi
  et où de nouvelles possibilités s'allument. **seuil** : le coût à atteindre pour un achat donné.
- **la carte** : la vue du monde à l'écran (refuge, puis jardin, puis grenier). Elle s'agrandit sans que la caméra
  bouge : c'est elle qui porte la progression, pas une barre de niveau.
- **affordance** : élément d'interface montrant une possibilité (« accueillir », « placer », « ouvrir le jardin »)
  avec son coût et son effet. **badge ↻ « Bientôt »** : marque d'une possibilité momentanément écartée qui reviendra
  au palier suivant — jamais barrée ni cadenassée.
- **vocabulaire d'états déclaré pour ce jeu**, PAR RÔLE (§2.6) — deux entrées de même rôle s'y tiennent :
  - *contenu à débloquer* (objets achetables, chatons, lieux, règles apprises) : `LOCKED · AVAILABLE · ACTIVE`,
    complété selon le cas par `posé`, `adopté`, `apprise`, `occupé`, `FULL` — un objet posable qui peut ensuite
    accueillir un chaton enchaîne `LOCKED · posé · occupé`.
    **Transformation portée par la déclaration** : `LOCKED` = l'entrée est **visible et grisée, son coût ET son effet
    lisibles** — jamais cachée : une possibilité verrouillée est déjà une promesse. Pour une entrée de catégorie
    `règle`, qui n'a pas d'art propre, c'est l'affordance qui la porte qui est grisée, et la règle la nomme (§2.9).
    `AVAILABLE` = elle s'allume, elle devient atteignable.
  - *emplacement* (une place où poser quelque chose) : `libre · occupé`, et `pleine` quand le compte est saturé.
  - *objet manipulé en continu* (celui du geste de base) : `repos · actif · maintenu`.
  - *contenant qui s'ouvre* : `fermé · s'ouvre · ouvert`.
  - *personnage en vie de scène* : `dans le panier · sort · marche · couché · joue`.
  - *jalon* : `LOCKED · AVAILABLE · FRANCHI`. *règle de ressource* : `produite · dépensée`. *règle de choix* :
    `proposée · tranchée`.
  - *animation* : `déclenchée`, ou la liste nommée de ses beats.
  - *afficheur* (UI) : **pas de vocabulaire commun** — chaque afficheur nomme les états de CE qu'il affiche
    (`sous le seuil · au seuil`, `réduit · étendu`, `hors de portée · atteignable · parquée`, `masqué · affiché`…).
    C'est un rôle où l'uniformité n'aurait pas de sens : deux afficheurs ne montrent pas la même chose.
  - **Exception narrative déclarée** (§2.6) : `env_grenier` porte `fermé « ? » · promis · ACTIVE` et `env_refuge`
    porte `portée 1 · portée ≥2` — deux lieux dont l'état raconte quelque chose au joueur plutôt que de le verrouiller.

## III.2 Documents cités (ce qu'ils contiennent, pour ne pas avoir à les ouvrir)
- **C.1 — contrat de progression** : les NOMBRES (coûts, taux, seuils, durées) et la forme de la courbe. C.5 n'en
  fixe aucun ; il exige qu'un coût soit affiché **avec son effet**.
- **C.2 — contrat de boucle de gameplay et de contenu** : la graine du jeu — le tableau des 8 jalons P01→P08 (avec
  pour chacun l'objectif, l'action, le feedback, la nouveauté et la preuve), la règle maîtresse, **et les promesses
  de contenu faites en passant** — dont l'interaction « appeler » ouverte par la branche B de la décision 1, qui
  n'a jamais reçu de contenu (question 2/5).
- **C.3 — contrat d'architecture des boucles** : quelles boucles existent et ce qu'elles s'échangent (matrice
  produit / consomme / débloque).
- **C.4 — contrat de complétion mutuelle** : comment les deux piliers se complètent (questions/réponses, R1 gel du
  design, R2 complétude = R2a ∧ R2b).
- **schéma d'artefact du GM** : le format du fichier que produit le Game Master pendant un run. Aujourd'hui chaque
  boucle y porte exactement **six champs** — `steps` (les étapes), `produces`, `consumes`, `unlocks`,
  `transformation_perceptible`, `metric_propre` — plus, au niveau du fichier, un bloc de contenus « gris », des
  métriques et des preuves. **Ce sont ces six champs, et eux seuls, que l'agent reçoit** : c'est le défaut fondateur
  décrit au §0. C.5 dit quels champs y ajouter (§8.2).
- **audit 2026-08-25** : la mesure qui a montré que C.3 n'était injecté nulle part et que le contenu était en vrac.

---

`software_verdict: N/A` (document de conception, aucun code) · `evidence_verdict: MECHANICAL_VALIDATION_ONLY`
(mesures issues du run `-20260824f` et de l'audit du 2026-08-25) · `claim_verdict: NO_CLAIM_ALLOWED`
