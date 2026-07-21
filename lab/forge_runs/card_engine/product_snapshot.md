# Product Snapshot — CardEngine V0 + BeloteRules (Run A, headless)

Produit : **CardEngine V0**, un moteur de jeux de cartes à plis, **headless**, en
**simulation pure déterministe seed-first**, zéro dépendance externe, testé sous `node:test`.
V0 = le **noyau commun** (Card, Deck, Hand, Trick, une **Rules Interface**, une **Score
Interface**) PLUS un unique adaptateur concret, **BeloteRules**, dont la correction est
prouvée par **PARITÉ** contre le produit publié `llm-lego/experiments/belote-claude/`
(jamais modifié — lecture seule). `is_game=false` : aucun rendu, aucune UI, aucun joueur
humain. Le « joueur » a **deux visages** — le joueur de Belote dont BeloteRules reproduit
l'expérience réglée, et le **consommateur du moteur** (bot d'oracle, futur adaptateur
Tarot, future UI). Les interfaces **anticipent** le Tarot (paramétrable) sans l'implémenter.

---

## Ce que le joueur voit

**Visage 1 — le joueur de Belote** (ce que BeloteRules doit rendre visible, dérivé du publié) :
- Un **jeu de 32 cartes** : 4 enseignes (pique, cœur, carreau, trèfle) × 8 rangs
  (7, 8, 9, 10, V, D, R, A). Chaque carte a une identité stable `rank-suit`
  (`src/cards.mjs`).
- **Une couleur d'atout** par donne, choisie à l'enchère, qui reclasse force et valeur des
  cartes de cette couleur (`src/bidding.mjs`, `src/cards.mjs`).
- Sa **main de 8 cartes** après la distribution en deux temps (5 = 3+2, puis complément
  après la prise), et la **carte retournée** (`src/deal.mjs`).
- Les **plis** : 4 cartes posées, un gagnant unique, l'atout qui coupe la couleur demandée
  (`src/rules.mjs trickWinner`).
- Un **score de manche** lisible : points cartes des deux camps, dix de der, bonus
  belote-rebelote (+20), bonus d'annonces, contrat réussi ou preneur *dedans*, capot
  (`src/scoring.mjs`, `src/annonces.mjs`).

**Visage 2 — le consommateur du moteur** (ce que l'API rend observable) :
- Un **état de partie sérialisable** — mains, atout, preneur, plis joués, totaux par camp,
  état RNG — reconstructible et comparable bit-à-bit entre deux exécutions (`src/game.mjs`,
  garantie de replay du charter).
- **Deux interfaces stables** comme unique surface de contrat : une **Rules Interface**
  (coups légaux, gagnant de pli, structure de donne) et une **Score Interface** (décompte de
  manche). Le core (Card/Deck/Hand/Trick) est générique ; BeloteRules est un **adaptateur**
  branché dessus (charter — critère core).
- **Zéro dépendance tierce** : le package n'embarque aucun `node_modules` externe ;
  `node:test` uniquement (charter — actions interdites).
- Un **point d'extension paramétrique** visible dans l'interface (taille de paquet, cartes
  spéciales, phase d'enchères, nombre de joueurs / équipes) — de quoi accueillir un futur
  TarotRules sans qu'aucun code Tarot n'existe en V0 (charter — critère extensibilité).

---

## Ce que le joueur fait

**Visage 1 — jouer une Belote réglée** (comportements du golden publié) :
- **Enchérir** en deux tours : tour 1, prendre la couleur retournée ; tour 2, nommer une
  autre couleur ; sinon tout le monde passe → redonne (`src/bidding.mjs runBidding`).
- **Jouer une carte légale** dans le respect des obligations : fournir la couleur demandée ;
  à l'atout demandé, monter si possible ; ne pouvant fournir, couper/surcouper si
  l'adversaire est maître, se défausser librement si le partenaire est maître ou sans atout
  (`src/rules.mjs legalMoves`).
- **Remporter des plis** et enchaîner : le gagnant d'un pli entame le suivant
  (`src/game.mjs playTrick/playDeal`).
- **Déclarer belote-rebelote** en posant Roi puis Dame d'atout (chemin manuel exprimé par
  `beloteDeclared` dans `scoreDeal` ; en headless, les bots déclarent toujours — chemin
  déterministe) (`src/scoring.mjs`, spec bloc1 §4.3).
- **Déclarer des annonces** (tierce / cinquante / cent / carré) au 1er pli, entrant dans un
  pool comparé ; seul le camp de la meilleure marque, et il marque toutes les siennes
  (`src/annonces.mjs resolveAnnonces`, spec bloc1 §4.2).

**Visage 2 — piloter le moteur** (ce que le consommateur d'API fait) :
- **Initier une donne / une partie seedée** : `{ seed, cible, donneur initial }` détermine le
  mélange initial et les coupes (`src/shoe.mjs newShoe/cut`, `src/game.mjs playGame`).
- **Faire jouer des cartes légales** via un bot déterministe minimal, de bout en bout
  jusqu'à un score de manche cohérent (`src/game.mjs chooseMove` — oracle de solvabilité du
  charter).
- **Rejouer à l'identique** : relancer la même seed (+ la même séquence de coups pour les
  donnes ≥ 2 qui dépendent du ramassage) reproduit la partie bit-à-bit (spec bloc1 §4.1,
  charter — critère replay).
- **Interroger l'état** entre deux coups : coups légaux disponibles, gagnant partiel, totaux,
  sans muter le modèle (`src/rules.mjs`, séparation modèle/vue spec bloc1 §4.4).
- **Brancher un adaptateur non-Belote** sur les mêmes interfaces core pour vérifier
  l'extensibilité (stub qui charge sans code Tarot — charter).

---

## Ce que le joueur ressent (garanties)

- **Déterminisme absolu, seed-first.** Un `{seed}` fixé rejoue la **donne 1** à l'identique ;
  `{seed}` + séquence de coups rejoue **toute la partie** bit-à-bit. Un **seul flux RNG par
  partie**, consommé **uniquement** au mélange initial et aux coupes — le ramassage
  n'utilise **aucun** hasard (`src/shoe.mjs`, `src/game.mjs`, spec bloc1 §4.1 & §5).
- **Zéro dépendance, headless pur.** Aucune I/O, aucun réseau, aucun rendu ; le moteur tourne
  et se teste sans installer quoi que ce soit (charter — actions interdites).
- **Erreurs explicites sur coup illégal.** Un coup hors des `legalMoves` est rejeté de façon
  déterministe et observable — jamais un état illégal silencieux, jamais un crash ambigu
  (`src/rules.mjs`, pré-mortem « pas d'état illégal » du charter).
- **Conservation stricte.** Les 32 cartes sont conservées à chaque donne (distribution +
  ramassage = permutation, aucune carte créée/perdue) ; chaque pli a **exactement un**
  gagnant (`src/deal.mjs`, `src/shoe.mjs pickup`, `src/rules.mjs trickWinner`).
- **Assertions strictes (pas de tautologie).** Les invariants se prouvent par **égalité
  exacte** (nombre de cartes, base 162, somme des bonus), jamais par `>=` complaisant — sauf
  là où le seuil `>=` EST la règle (contrat ≥ 82) (charter — pré-mortem 2, `src/scoring.mjs`).
- **Aucune valeur inventée.** Barèmes, ordres de force, seuils (82, 152/162, 250, +20, +10)
  sont **repris tels quels** du golden publié — ce snapshot n'introduit aucun chiffre neuf.
- **Extensibilité démontrable sans dette Tarot.** Les interfaces sont paramétriques ; un point
  d'extension au moins est démontré (stub non-Belote qui charge/compile), sans une ligne de
  logique Tarot en V0 (charter — critère extensibilité).

---

## Règles observables (numérotées R1..R15 — GELÉES à s5)

Chacune est **testable** et couvre les deux visages. Source = fichier `belote-claude/*` (le
golden publié) ou charter/spec. Aucune règle inventée.

### Règles Belote (BeloteRules doit les reproduire par parité)

**R1 — Jeu de 32 cartes, identité stable.** 4 enseignes × 8 rangs (7,8,9,10,V,D,R,A) =
32 cartes, chacune d'`id` unique `rank-suit`. *Source :* `src/cards.mjs` (`SUITS`, `RANKS`,
`fullDeck`, `card`). *Testable :* `fullDeck()` a 32 éléments, tous distincts, une occurrence
de chaque (rang, enseigne).

**R2 — Deux barèmes de points selon l'atout.** Non-atout : A=11, 10=10, R=4, D=3, V=2,
9/8/7=0 (30/couleur). Atout : V=20, 9=14, A=11, 10=10, R=4, D=3, 8/7=0 (62/couleur).
*Source :* `src/cards.mjs` (`PLAIN_POINTS`, `TRUMP_POINTS`, `cardPoints`). *Testable :* pour
chaque rang, `cardPoints(c, atout)` = valeur attendue par égalité, selon que `c.suit===atout`.

**R3 — Deux ordres de force.** Non-atout : 7<8<9<V<D<R<10<A. Atout : 7<8<D<R<10<A<9<V.
*Source :* `src/cards.mjs` (`PLAIN_ORDER`, `TRUMP_ORDER`, `cardStrength`). *Testable :*
comparer `cardStrength` sur paires clés (ex. à l'atout, V > 9 > A > 10).

**R4 — Distribution fidèle en deux temps.** 3 puis 2 cartes par joueur (5) + 1 retournée,
talon de 11 ; après la prise, le preneur intègre la retournée puis complément à 8 (preneur
+2, autres +3). *Source :* `src/deal.mjs` (`deal`, `completeDeal`, `eldestOrder`).
*Testable :* après `deal` chaque main = 5, talon = 11 ; après `completeDeal` chaque main = 8
exactement.

**R5 — Enchère en deux tours.** Tour 1 : prendre la couleur retournée ; tour 2 : nommer une
autre couleur (jamais la retournée) ; sinon `null` → redonne. *Source :* `src/bidding.mjs`
(`runBidding`), spec bloc1 (décision D2). *Testable :* fixtures forçant prise T1, prise T2,
et passe général → `null`.

**R6 — Obligations de jeu (coups légaux).** Fournir la couleur demandée si possible ; à
l'atout demandé, monter (surcouper) si on peut sinon fournir un atout ; ne pouvant fournir :
partenaire maître → libre, adversaire maître → couper/surcouper (ou fournir un atout si on ne
peut monter), sans atout → défausse libre. *Source :* `src/rules.mjs` (`legalMoves`).
*Testable :* fixtures par branche ; l'ensemble retourné est exactement le sous-ensemble
attendu (égalité d'ensembles), pas un sur-ensemble.

**R7 — Gagnant de pli unique.** S'il y a au moins un atout joué, le plus fort atout gagne ;
sinon la plus forte carte de la couleur demandée. Exactement **un** gagnant. *Source :*
`src/rules.mjs` (`trickWinner`). *Testable :* fixtures (pli sans atout, pli coupé, pli
surcoupé) → un seul `{player}` gagnant, vérifié par égalité.

**R8 — Décompte de manche : base 162, contrat 82, dedans, capot 250.** Points cartes par
camp + **dix de der** (+10 au vainqueur du dernier pli) = base sur **162** ; preneur réussit
si `base[preneur] ≥ 82`, sinon **dedans** (la défense encaisse 162) ; **capot** (8 plis) =
250 au camp qui rafle, l'autre 0 (+ sa belote). *Source :* `src/scoring.mjs` (`scoreDeal`,
`CONTRACT_MIN`, `CAPOT_POINTS`). *Testable :* fixtures contrat réussi / dedans / capot,
scores vérifiés par égalité exacte.

**R9 — Belote-rebelote +20, conditionnée à la déclaration.** Le camp détenant R **et** D
d'atout marque +20, **acquis même preneur dedans**, mais **seulement si déclaré**
(`beloteDeclared`) — oubli = perdu (chemin manuel humain) ; en headless les bots déclarent
toujours. *Source :* `src/scoring.mjs` (param `beloteDeclared`), `src/rules.mjs`
(`beloteTeam`/`beloteHolder`), spec bloc1 §4.3. *Testable :* fixture avec R+D d'atout,
`beloteDeclared=true` → +20, `=false` → +0, par égalité.

**R10 — Annonces : détection, comparaison, « le camp gagnant marque tout », annulation.**
Suites (tierce 20 / cinquante 50 / cent 100) et carrés (V=200, 9=150, A/R/D/10=100, 8/7=0) ;
comparaison points → carré>suite → carte haute → atout → aînesse ; seul le camp de la
meilleure marque **toutes** ses annonces ; égalité parfaite cross-camp → **annulé** (0/0) ;
seules les annonces **déclarées** entrent au pool. *Source :* `src/annonces.mjs`
(`detectAnnonces`, `compareAnnonce`, `resolveAnnonces`), spec bloc1 §4.2. *Testable :*
fixtures deux camps déclarant → bonus au seul gagnant = somme exacte ; égalité parfaite →
`annule:true`, bonus [0,0].

**R11 — Détection d'annonces indépendante de l'ordre de la main.** `detectAnnonces(main)` ≡
`detectAnnonces(permutation(main))` — la détection opère sur le contenu logique, jamais sur
un ordre d'affichage. *Source :* `src/annonces.mjs` (tri interne `SEQ_ORDER`), spec bloc1
§4.2. *Testable :* property-test sur permutations aléatoires seedées → résultat identique.

**R12 — Invariant total des points cartes.** Somme des points cartes sur les 32 = **152**
pour tout atout ; +10 dix de der = **162** répartis par manche. *Source :* `src/cards.mjs`
(`totalCardPoints`, commentaire « 152 »), `src/scoring.mjs` (base 162). *Testable :*
`totalCardPoints(atout)===152` pour chaque atout ; `base[0]+base[1]===162` sur toute donne.

### Garanties moteur (les deux visages, gelées aussi)

**R13 — Replay déterministe bit-à-bit.** Le sabot ne consomme le RNG qu'au **mélange
initial** et aux **coupes** ; le ramassage (`pickup`) est **sans hasard** ; deux exécutions
d'une même seed produisent une **donne 1 identique**, et seed + coups → **partie identique**.
La coupe est **bornée** (`c ∈ [3, 29]`, `COUPE_MIN=3`) et **jamais fixe / jamais 0**.
*Source :* `src/shoe.mjs` (`newShoe`, `cut`, `pickup`, `COUPE_MIN`), `src/game.mjs`
(`playGame` — un seul `rng`), charter (critère replay), spec bloc1 §4.1/§5. *Testable :* deux
`playGame({seed})` → historiques égaux (deep-equal) ; positions de coupe variées et dans
[3,29] par égalité de bornes.

**R14 — Conservation des 32 cartes à travers donne + ramassage.** Distribution puis `pickup`
constituent une **permutation** du paquet : à chaque tour l'inventaire total est exactement
les 32 cartes, sans doublon ni perte ; `pickup` recompose « camp preneur puis camp défense »
de façon déterministe. *Source :* `src/deal.mjs`, `src/shoe.mjs` (`pickup`), spec bloc1 §4.1.
*Testable :* après chaque donne, multiset des cartes du `deckCourant` = `fullDeck()` (égalité
de multisets) ; deux `pickup` sur plis identiques → paquet identique.

**R15 — Extensibilité paramétrique sans code Tarot, zéro dépendance.** Les interfaces Rules /
Score sont paramétriques (taille de paquet, cartes spéciales, phase d'enchères, nombre de
joueurs / équipes) et démontrent **au moins un point d'extension** — un stub d'adaptateur
non-Belote qui **charge/compile sans logique Tarot** ; le package reste **zéro-dépendance**,
`node:test` seul. *Source :* charter (critères core, extensibilité, actions interdites).
*Testable :* le stub non-Belote s'importe et satisfait le contrat d'interface sans exécuter
de règle Tarot ; audit statique = aucun `node_modules` tiers.

---

*Fin du product_snapshot. Prochaine étape Forge : s2 (world scan), puis décomposition en
features (s3) et architecture (s4). Les Règles observables R1..R15 sont candidates au gel s5 ;
tout flou d'interface reste explicitement en fog jusqu'à s4.*
