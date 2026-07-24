# Product Snapshot — auto_battler écran de préparation (incrément 2.5, premier rendu)

Produit : la **première surface jouable à la souris** posée sur le noyau engine-core (i1) et la
couche Preparation+Economy (i2). Bascule majeure : **`is_game=true` pour la première fois** —
il y a un joueur humain, un rendu, une interface. Les oracles de jeu (e2e click-through +
solvabilité) s'appliquent donc à cet incrément, contrairement à i1 et i2 qui étaient headless.

Décisions HumanGate Pierre du 2026-07-19 intégrées : interface HTML par-dessus / plateau et
unités dans le canvas · bouton « prêt » (choix produit Pierre, le minuteur reste la limite
dure) · valeurs sourcées v0 ratifiées gate n°5 · le style visuel n'a AUCUN oracle.

## Périmètre réel — ce que le moteur expose AUJOURD'HUI

Vérifié dans `preparation/preparation.mjs::initPrepState` : un Seat porte exactement
`{ gold, bench, board, level, shop, shop_locked }`. Le `GameState` porte
`{ seed, rng_state, eventLog, players, entities, phase }`.

**N'EXISTENT PAS dans le moteur** et ne sont donc PAS affichés (ils seront cartographiés
`PRÉVU`, jamais inventés) : la **vie du joueur**, le **numéro de tour**, la **liste des
adversaires**, le **combat**, le **contenu de jeu réel** (les UnitDefinition restent des
identifiants de fixture, P11).

## Ce que le joueur voit

- En HTML, par-dessus le plateau : son **or**, son **niveau**, les **5 emplacements de
  boutique**, l'**état de verrou** de la boutique, son **banc**, le **minuteur**, et les
  boutons Rafraîchir / Monter de niveau / Verrouiller / Prêt.
- Dans le canvas : le **plateau 8×8 miroir** (valeur v0 ratifiée) et les **unités posées**,
  avec leur niveau d'étoile lisible.
- Un **retour visible sur rejet** : un achat refusé pour or insuffisant ou banc plein (DP-9)
  se voit ; il n'y a jamais de rejet silencieux.

## Ce que le joueur fait

- **Achète, vend, rafraîchit, verrouille, monte de niveau** à la souris — chaque geste produit
  un Input de la liste close INV-13 et **rien d'autre** : aucun chemin parallèle qui muterait
  l'état en contournant `applyPreparationInput`.
- **Glisse une unité du banc vers le plateau** et repositionne sur le plateau (convention de
  genre sourcée TFT).
- **Termine sa préparation** de deux façons, qui émettent le MÊME Input `ConfirmPreparation` :
  le bouton « prêt », ou l'expiration du minuteur.

## Ce que le joueur ressent (garanties)

- Toutes les garanties d'i1/i2 restent vraies — déterminisme bit-à-bit, replay, pureté,
  registre fermé de 22 Events (19 + 3, gate 2026-07-19), alphabet fermé de 7 Inputs. i2.5 les ÉTEND, ne les affaiblit
  jamais.
- **Le minuteur n'entre PAS dans le `GameState`.** C'est un décompte côté interface qui émet un
  Input à expiration. Faire entrer une horloge murale dans l'état détruirait le déterminisme du
  replay — c'est la raison, pas une préférence.
- **Aucune valeur chiffrée inventée.** Les six valeurs de travail sont SOURCÉES et provisoires
  (gate n°5 délégué à l'orchestrateur, ratifié Pierre 2026-07-19) ; toute autre valeur reste TBD
  chez son propriétaire et se remonte en fog, jamais en invention.

## Règles observables (dérivées des bibles + décisions Pierre — aucune invention)

R1 — **Renderer AVEUGLE : il ne lit JAMAIS le `GameState`** (INV-5, `02_CORE_RULES.md:56`).
Son unique interface d'entrée est l'**Event Log**. L'écran est une projection : le renderer
plie le journal d'Events en un modèle de vue, en partant des conditions initiales connues
(or 0, niveau 1, banc et plateau vides). Vérifiable par l'Oracle Hook INV-5 déjà écrit
(`02_CORE_RULES.md:288`) : le module Renderer n'importe ni ne référence le type `GameState`.
`deps_interdites` : `renderer ↛ engine/state`, `renderer ↛ engine/transition`,
`renderer ↛ preparation`, `renderer ↛ pool`, `renderer ↛ rng`.

R1b — **Complétion préalable de l'Event Log** (gate HumanGate 2026-07-19 « renderer aveugle »,
verbatim `bibles/HUMANGATE_2026-07-19_RENDERER.md`). Le registre passe de 19 à **22 Events** :
`UnitPlaced`, `ShopLocked`, `PhaseChanged`. Six champs sont ajoutés à des Events existants :
`UnitBought` += `unit_instance_id`, `bench_index` · `UnitSold` += `from_zone`, `from_index` ·
`MergeResolved` += `to_zone`, `to_index`. **Aucun changement d'état ne doit rester muet** :
tout ce qu'un Seat peut observer doit être reconstructible depuis le seul Event Log. Cette
complétion modifie du code de l'incrément 2 déjà mergé — débordement de périmètre assumé et
ratifié.

R2 — **Rendu déterministe.** À `GameState` identique et horloge d'animation identique, l'image
produite est identique. **Aucun appel de générateur aléatoire dans le rendu**, aucune dépendance
à l'horloge murale : l'animation avance sur un compteur de trames injectable, figé sous oracle.

R3 — **Couverture Event → écran.** Reformulée pour respecter R1 : le renderer ne lisant pas
l'état, la mesure porte sur le JOURNAL. Pour chaque Event qui change ce que le joueur observe
(`GoldChanged`, `PlayerLevelUp`, `ShopRolled`, `ShopLocked`, `UnitBought`, `UnitSold`,
`UnitPlaced`, `MergeTriggered`, `MergeResolved`, `PhaseChanged`), **ajouter cet Event au
journal et re-rendre produit une image DIFFÉRENTE**. Un Event que rien n'affiche est un
défaut ; un champ d'écran qu'aucun Event ne peut produire est un trou du journal.
C'est la formulation qui fait de l'écran un révélateur : elle échoue AUSSI quand l'Event
existe mais ne porte pas assez d'information pour être dessiné.

R4 — **Un geste = un Input de la liste close.** Chaque contrôle de l'interface produit un Input
INV-13 passé à `applyPreparationInput` ; aucune mutation d'état hors de ce chemin.

R5 — **Le minuteur est la limite dure.** À expiration, `ConfirmPreparation` est émis
automatiquement. Le bouton « prêt » émet le même Input plus tôt. Le minuteur ne vit pas dans
l'état (cf. garanties).

R6 — **Solvabilité à la souris.** Un bot déterministe qui ne dispose QUE des contrôles de
l'interface (aucun appel direct au moteur) mène une phase de préparation complète : acheter,
poser sur le plateau, déclencher une fusion, confirmer. L'objectif est atteignable au clic.
C'est le volet solvabilité obligatoire d'un oracle de jeu.

R7 — **Aucun rejet silencieux.** Un Input refusé produit un retour observable à l'écran ET
laisse l'état inchangé. Causes de refus RÉELLEMENT documentées, et elles seules : **or
insuffisant** et **banc plein (DP-9)**. *(« Boutique verrouillée » a été RETIRÉE : je l'avais
inventée — ECO-8 ne fait du Lock qu'une conservation au Round suivant, et `handleReroll` ne lit
même pas `shop_locked`.)*

## Résolutions d'orchestrateur — points tranchés sans gate, avec leur motif

Aucun de ces points n'est une décision de design : ce sont des levées d'ambiguïté nécessaires à
la construction. Ils sont écrits ici pour être vus, pas pour être ratifiés.

- **RO-1 — `Lock` est une BASCULE.** Verrouiller une boutique déjà verrouillée la déverrouille,
  et émet `ShopLocked{locked:false}`. Motif : le payload ratifié porte un booléen `locked` qui
  couvre « verrouillage ET déverrouillage » — il n'a de sens que si les deux existent. Effet de
  bord bénéfique : ça supprime le faux refus sur Input idempotent (un Lock ne laisse plus jamais
  l'état inchangé) et ça comble le trou « aucun déverrouillage manuel » relevé au gate.
- **RO-2 — noms de phase canoniques : `'Preparation'` et `'Battle'`.** Motif : `initState` pose
  aujourd'hui `'Shop'`, les bibles disent « Preparation State » ; `PhaseChanged{from_phase,
  to_phase}` a besoin de littéraux fixes. Nommage, pas règle.
- **RO-3 — `cause` du `ShopRolled` d'ouverture : `'RoundStart'`.** Motif : la bible dit « début
  de Round ou Reroll », seul `'Reroll'` existe en code. Nommage, pas règle.
- **RO-4 — le plateau devient une grille adressable.** `player.board` est aujourd'hui un tableau
  SANS coordonnées (`handlePlace` : « placeholder, seul banc→plateau supporté »). Le plateau 8×8
  est déjà ratifié et `UnitPlaced` exige `to_index` : les cases sont donc l'exécution d'une
  valeur ratifiée, pas une règle neuve. `Place` doit couvrir banc→plateau, plateau→plateau
  (repositionnement) et plateau→banc. `Sell` doit accepter une unité posée sur le plateau
  (aujourd'hui rejet silencieux : `handleSell` ne cherche que sur le banc).
- **RO-5 — `createGameState` doit cesser de perdre des champs.** Il ne recopie que six clés, ce
  qui force chaque handler à ré-attacher `pool` et `bench_capacity` à la main — et ferait
  disparaître `round_index` en silence. À corriger à la racine, pas à contourner une septième
  fois.
- **RO-6 — budget de solvabilité : 6 Rounds.** Le bot doit avoir acheté, posé, fusionné et
  confirmé en 6 Rounds au plus depuis un vrai départ. Motif : aucune bible ne fixe ce budget et
  la fusion dépend du tirage ; un budget borné rend l'oracle décidable au lieu de le laisser
  boucler. Valeur v0 provisoire, révisable.

R8 — **Répartition HTML / canvas imposée** (décision Pierre) : or, niveau, boutique, verrou,
minuteur et boutons sont du **texte et des éléments DOM réels**, pas des pixels peints dans le
canvas. Plateau et unités sont dans le canvas. Motif : mesurabilité par le capteur existant.

R9 — **Overlay de debug désactivé sous oracle.** Le jeu peut porter un affichage de debug ; il
est éteint par défaut et pendant toute mesure. Un vidage textuel de l'état ne doit jamais
pouvoir satisfaire R3 à la place d'un vrai affichage.

R10 — **Surface capturable.** Le jeu expose ce qu'exige le capteur déterministe existant : un
serveur qui annonce sa disponibilité sur stdout, une seed passée par l'URL, l'état accessible en
global au navigateur, une couleur de fond déclarée, et des sélecteurs DOM stables pour les
textes et les éléments cliquables.

R11 — **Valeurs de travail v0, sourcées et provisoires** (gate n°5) : minuteur **30 s** (TFT),
boutique **5 emplacements** (TFT), banc **9 places** (TFT), rafraîchissement **2 or** (TFT).
Plateau **8×8 miroir** (déjà ratifié, `HUMANGATE_2026-07-19_VALUES_V0.md`).
**RETIRÉES** — deux valeurs que j'avais posées à tort : « montée de niveau 4 or » (en TFT, 4 or
achètent 4 points d'XP ; ce n'est PAS le prix d'un niveau — le moteur a un prix par niveau,
j'ai comparé deux mécanismes différents) et « unités posables = niveau du joueur » (n'existe ni
dans le moteur ni dans aucune bible : ce serait ÉTENDRE une règle, hors gate n°5). Le coût de
montée de niveau reste celui du moteur ; la limite d'unités posables reste NON DOCUMENTÉE et
n'est pas implémentée.

R13 — **LE JEU DOIT POUVOIR DÉMARRER.** C'est la règle qui prime sur toutes les autres : un
incrément qui produit un état de départ en impasse est un ÉCHEC, quels que soient ses tests.
Constat vérifié à l'entrée de cet incrément : `initPrepState` pose `gold: 0` et `shop: []`,
**aucun revenu n'est implémenté**, aucune notion de Round n'existe — donc depuis un vrai début
de partie on ne peut ni rafraîchir (coûte de l'or), ni acheter (boutique vide), ni vendre (on
ne possède rien). Impasse totale, masquée par des tests qui injectent l'or directement.
Ce que la bible économique documente DÉJÀ et qui doit être exécuté (aucune invention) :
`05_ECONOMY_BIBLE.md:101-102` liste close des mouvements de Gold dont **Income (crédit, début
de Round, revenu de base SEUL)** ; `:149-160` Income = fonction du RoundIndex, **Interest et
primes de série REJETÉS (QE-4/QE-5)** ; `:250-255` ordonnancement intra-Round ratifié
**Income → tirage des Shops → Preparation State**.
Manquent donc, et entrent dans cet incrément : un **RoundIndex**, le **crédit d'Income** en
début de Round, le **tirage d'ouverture de la Shop** (qui émet son `ShopRolled`).
Valeur v0 sourcée et provisoire (gate n°5), cohérente avec Interest rejeté — modèle à revenu
de base plat croissant type Hearthstone Battlegrounds : **Income = min(3 + RoundIndex, 10)**
or par Round, RoundIndex commençant à 0. Réversible, propriété Balance Bible.

R14 — **Le retour d'erreur n'appartient PAS au journal d'Events.** Un Input rejeté ne produit
aucun Event (vérifié : `applyPreparationInput` retourne l'état inchangé) et le registre clos à
22 n'a pas d'Event de rejet. R7 est donc tenu par la **couche d'entrée** — celle qui reçoit le
clic, appelle `applyPreparationInput` et constate que l'état retourné est identique. Elle sait
immédiatement que sa commande a été refusée, sans passer par le journal, et affiche le retour.
Le Renderer reste aveugle (R1) : il ne dessine que ce que le journal contient.

R12 — **Le style visuel n'a AUCUN oracle.** Lisibilité, beauté, cohérence graphique, qualité
d'animation : `oracle: aucun — jugement Pierre`. Les alarmes mécaniques prouvent que l'écran
n'est pas cassé ; elles ne prouvent JAMAIS qu'il est bon. L'écran n'est pas « fait » quand les
oracles sont verts — il est fait quand Pierre l'a regardé.

## Direction artistique — CONSIGNE DE FABRICATION, PAS UNE RÈGLE OPPOSABLE

Rattachée à R12 : **rien ici n'est vérifiable par un oracle**, rien ici ne peut faire échouer un
verdict, et Pierre reste seul juge. C'est une consigne au builder pour qu'il ne produise pas un
formulaire. Aucun asset externe n'est requis : tout est fait en CSS et en canvas.

**Le sujet.** Le joueur est un commandant qui compose sa troupe entre deux batailles, sous
chronomètre. La tension du genre est unique et doit se voir : dépenser maintenant (rafraîchir)
contre investir pour plus tard (monter de niveau), pendant que le temps tombe.

**Métaphore retenue — la table de guerre.** Le plateau est une surface éclairée vue de dessus ;
l'interface n'est pas une rangée de cartes flottantes mais le **bord de la table** : instruments
en laiton, plaques gravées, encoches. Le banc est une rangée de socles, pas une liste.

**Palette (4 valeurs + 1 alarme)** : `#16302B` feutre sombre de la table · `#B98A3C` laiton ·
`#E8DFC8` os / parchemin pour le texte · `#3E5C55` pierre froide pour les surfaces inertes ·
`#C8442F` UNIQUEMENT pour le chronomètre en fin de course et les refus. Le rouge ne sert à rien
d'autre — c'est ce qui lui garde sa force.

**Typographie, trois rôles.** Un display **condensé** pour les nombres et les titres courts (or,
coût, niveau) ; un humaniste lisible pour le texte courant ; des **chiffres tabulaires** partout
où une valeur change en place, pour que rien ne saute quand l'or passe de 9 à 10. Interdit : la
police par défaut du navigateur laissée telle quelle.

**Élément signature — le chronomètre EST le cadre.** Pas une barre posée en haut : un liseré fin
qui fait le tour de toute l'aire de jeu et **se consume** dans le sens horaire. C'est le seul
geste spectaculaire de l'écran, il est ambiant, il encode le fait le plus caractéristique du
genre (la préparation est chronométrée), et il ne coûte aucun asset. Tout le reste doit rester
sobre autour de lui — une seule audace, pas cinq.
Contrainte dure héritée de R2 : ce liseré avance sur le **compteur de trames injectable**, jamais
sur l'horloge murale, et il est figé sous oracle.

**Ce qui est explicitement proscrit** : les trois défauts d'interface générée — fond crème avec
serif à fort contraste et accent terracotta ; fond quasi noir avec un seul vert acide ; mise en
page « journal » à filets et colonnes denses. Aucun dégradé décoratif. Aucun emoji comme icône.
Aucune ombre portée molle sur tout.

**Écriture.** Un bouton dit ce qu'il fait : « Rafraîchir — 2 or », pas « Reroll ». Un refus dit
ce qui s'est passé et quoi faire : « Banc plein — vendez une unité », jamais « erreur ».

## Hors périmètre explicite

Combat · vie du joueur · numéro de tour · appariement et adversaires · contenu de jeu réel
(Content Bible) · sons · menus · assets définitifs (l'habillage arrive après la décision de
licence). Ces surfaces sont cartographiées `PRÉVU` sur la WireMap projet, jamais construites ici.

---
Source : bibles auto_battler 00→07 · `HUMANGATE_2026-07-19_VALUES_V0.md` · décisions Pierre
2026-07-19 (HTML/canvas, bouton prêt, projectile décoratif, gates 1-6 délégués, gate 7 retenu).
Date : 2026-07-19.
