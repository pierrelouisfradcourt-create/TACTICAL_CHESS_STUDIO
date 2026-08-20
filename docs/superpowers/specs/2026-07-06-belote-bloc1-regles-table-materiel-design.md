# Belote — Spec produit, bloc 1 : « Règles, table & matériel »

- **Date** : 2026-07-06
- **Source** : brief Pierre (HumanGate) — décisions déjà ratifiées, session Claude Code 2026-07-06.
  Fait suite au **pivot produit** (`studio_brain/00_CURRENT_CONTEXT.md`, ratifié 2026-07-05/06) :
  Rocky gelé · gamme jeux de cartes FR · **Belote = produit 1**.
- **Statut** : SPEC — à relire par Pierre, puis `writing-plans`. **Pas de code dans ce cycle.**
- **Base** : le prototype jouable prouvé `llm-lego/experiments/belote-claude/` (cf. §2). Ce bloc
  fait évoluer cette base ; il ne repart pas de zéro.

---

## 1. But & périmètre du bloc

Figer les **règles, la table et le matériel** de la Belote produit : le moteur de règles, la
mécanique de paquet fidèle (pas de re-mélange, coupe réelle, partie rejouable depuis un seed), le
rituel d'annonces en deux temps, la belote-rebelote manuelle, la main réorganisable, et le passage
aux **cartes dessinées**. C'est le socle « ça se joue et c'est juste » sur lequel les blocs suivants
(parcours joueur, IA à niveaux, PWA, défi-par-lien) viendront s'appuyer.

**Ce bloc NE traite PAS** (blocs suivants du spec produit) : parcours joueur / onboarding, niveaux
d'IA, PWA / offline, **défi-par-lien** lui-même (ce bloc en pose seulement l'**architecture de
rejouabilité**, cf. §4.1 — le hook produit est ailleurs). Voir §7.

---

## 2. État de base — le prototype existant (vérité terrain)

Emplacement : `llm-lego/experiments/belote-claude/`. Complet, jouable, prouvé end-to-end
(30 tests `node:test`, CLI, `tools/real-play.mjs` : 576 coups audités par un juge de légalité
indépendant, 0 violation — cf. `llm-lego/experiments/COMPARATIF_BELOTE.md`).

| Fichier | Rôle actuel | Touché par bloc 1 ? |
|---|---|---|
| `src/cards.mjs` | 32 cartes, barèmes atout/non-atout, ordres de force | non (lecture) |
| `src/deal.mjs` | **re-mélange Fisher-Yates à CHAQUE donne** + distribution 3-2 + complément à 8 | **OUI — refonte du paquet (§4.1)** |
| `src/rules.mjs` | légalité (fournir/monter/couper/surcouper), `trickWinner`, `beloteTeam` | oui (belote manuelle §4.3) |
| `src/scoring.mjs` | contrat, dedans, capot, belote +20 (auto), dix de der | oui (belote conditionnelle §4.3) |
| `src/annonces.mjs` | détection suites/carrés, comparaison, résolution « camp vainqueur marque tout » | **OUI — rituel manuel (§4.2)** |
| `src/bidding.mjs` | enchère 2 tours (prise + atout), heuristique de force | non |
| `src/game.mjs` | IA légale (`chooseMove`), `playTrick/playDeal/playGame` (défaut **501**) | oui (score défaut §4.6, paquet §4.1) |
| `web/driver.mjs` | `BeloteDriver` — machine à états humain vs 3 IA, `view()` anti-triche | **OUI (§4.2/4.3/4.6)** |
| `web/server.mjs` | serveur local dédié, port **4137** (`BELOTE_PORT`), API `/api/new|state|bid|play|continue` | oui (nouvelles routes §4.2/4.3) |
| `index.html` | table mobile-first, main en **éventail**, **cartes en TEXTE**, clic pour jouer | **OUI (§4.2/4.3/4.4/4.5)** |
| `web/verify-parity.mjs` | invariant : driver ≡ `playGame(seed)` si l'humain joue `chooseMove` | **à re-prouver sous le nouveau paquet** |
| `web/verify-annonces.mjs` | barème annonces sur mains fabriquées | oui (étendu) |
| `test/*.mjs`, `tools/real-play.mjs` | 30 unités + auditeur indépendant | non-régression obligatoire |

**Écarts connus du prototype vs. décisions ratifiées** (= le travail du bloc) :
- Le paquet est **re-mélangé à chaque donne** (`deal.mjs`) — infidèle. Pas de ramassage, pas de coupe.
- Les annonces sont **calculées et révélées silencieusement** (`annonce_show`) et **marquées
  automatiquement** — pas de rituel, pas de déclaration manuelle, pas d'exposition au pli 2.
- La belote-rebelote est **automatique pour tout le monde** — pas de clic humain, pas de « oublié = perdu ».
- La main **n'est pas réorganisable** (éventail figé, ordre de distribution), on joue au **tap**.
- Les cartes sont **du texte** (rang + symbole d'enseigne), pas des figures dessinées.
- Le défaut de partie est **501** (moteur et UI), pas 1000.

---

## 3. Décisions ratifiées (HumanGate — NE PAS rouvrir)

Reprises telles quelles du brief ; l'architecture (§4) les met en œuvre.

1. **Score** — partie en **1000 pts par défaut**, cible **paramétrable** (501 / 1000).
2. **Paquet** — fidélité belote réelle : **PAS de re-mélange entre les donnes**. **Ramassage des
   plis fidèle et déterministe** (plis empilés dans l'ordre où ils sont gagnés, par camp). **Coupe
   réelle entre chaque donne** (position aléatoire dans une plage raisonnable, **jamais fixe**).
   Architecture : **SEED DE PARTIE COMPLÈTE** — seed initial + coupes déterministes → toute la
   partie est **rejouable** (sert le défi-par-lien, le replay, le debug/tests IA). **Décision
   d'archi structurante.**
3. **Annonces** — **rituel officiel en deux temps**, pas un calcul silencieux (détail §4.2).
   Déclaration humaine **manuelle** (bouton « Annoncer ») ; non déclarée = **perdue silencieusement**.
   IA déclare toujours. Au pli 2, seule la **meilleure** annonce est montrée (cartes exposées puis
   reprises) ; **seul le camp vainqueur marque, et il marque TOUTES ses annonces**. Détection sur le
   **contenu logique** de la main, jamais l'ordre visuel. Option future « déclaration assistée » ;
   défaut = manuel.
4. **Belote-rebelote** — à part : clic « Belote » en jouant **Roi ou Dame d'atout**, clic
   « Rebelote » à la seconde. **Oublié = perdu** (strict). Jamais montrée, **20 pts**, imbattable.
   IA : automatique.
5. **Main réorganisable** — drag & drop (souris + tactile). Le geste **« ranger »** doit être
   **impossible à confondre** avec **« jouer »** (**risque UX n°1**). L'ordre du joueur n'est
   **jamais** re-trié par le jeu. **Tri par défaut à la donne** (couleur + atout regroupé, ordre de
   force) ; **préférence de tri mémorisée** (couleur / force / atouts d'abord).
6. **Cartes** — **figures dessinées** pour R/D/V. Spritesheet **SVG unique** (32 cartes :
   7-8-9-10-V-D-R-A), portrait **français** privilégié (Wikimedia libre), fallback jeu anglais
   domaine public si lisibilité mobile insuffisante. **Critère n°1 : lisibilité à ~50-70 px de
   large**, coins valeur+enseigne très francs — **tester à taille réelle AVANT d'adopter**. Dos +
   tapis aux **tokens 4a**. Périmètre : **swap d'assets**, pas de création custom ni de génération IA.

---

## 4. Architecture

### 4.1 Modèle de partie rejouable — paquet, ramassage, coupe, seed (décisions 2 + 5-tri)

**Principe.** Une partie est entièrement déterminée par `{ seed, cible, donneur initial }` **plus la
suite des coups joués**. Le RNG de partie ne sert **qu'à deux endroits** : le **mélange initial** et
les **coupes**. Entre deux donnes, on ne re-mélange jamais : on **ramasse** puis on **coupe**.

**Cycle de vie du paquet.**
- **Début de partie** : `fullDeck()` (ordre déterministe) → **un seul mélange** Fisher-Yates piloté
  par `makeRng(seed)` → `deckCourant`. (Le hasard réel d'une table est ici remplacé par le seed pour
  la rejouabilité — c'est l'équivalent « on bat les cartes une fois en début de partie ».)
- **Avant chaque donne** : **coupe réelle** de `deckCourant` à une position `c` tirée du **flux RNG
  de partie** (`rng()`), bornée à une **plage raisonnable** `c ∈ [COUPE_MIN, 32 − COUPE_MIN]`
  (jamais 0, jamais fixe ; `COUPE_MIN` proposé = 3 → §8-Q3). `deckCourant = [deck.slice(c), deck.slice(0, c)]`.
  La **première** donne suit aussi une coupe (après le mélange initial), conformément à la table réelle.
- **Distribution** : `deal(donneur, deck)` consomme `deckCourant` **sans le re-mélanger** (refonte
  de `src/deal.mjs` : le mélange sort de `deal`, `deal` devient une **découpe pure** 3-2 + retournée
  + talon). La mécanique en deux temps (5 cartes + retournée, puis complément à 8) est **conservée**.
- **Après la donne (ramassage)** : les **8 plis** sont **empilés dans l'ordre où ils ont été
  gagnés, par camp** (décision 2). Convention déterministe (proposée, §8-Q1) :
  1. chaque pli garde ses 4 cartes dans un ordre fixe (ordre de jeu, entameur d'abord) ;
  2. on constitue **deux piles**, une par camp, en empilant chaque pli sur la pile de son camp
     gagnant, dans l'ordre chronologique des plis ;
  3. on recompose `deckCourant` en concaténant les deux piles selon une **convention fixe**
     (proposé : pile du **camp preneur** puis pile du **camp défense** — figé et testé).
  → `deckCourant` de la donne suivante est **entièrement déterminé** par les plis de la donne
  précédente. Aucun `rng()` dans le ramassage.

**Rejouabilité — ce que le seed garantit exactement** (subtilité structurante, à ne pas survendre) :
- La **donne 1** est **identique** pour deux parties de même `seed` (mélange + coupe = pur seed,
  indépendants du jeu). → suffit au **défi-par-lien mono-donne** : deux joueurs reçoivent les mêmes mains.
- Les **donnes ≥ 2** dépendent du **ramassage**, donc des **plis réellement joués**. Une partie est
  donc **intégralement rejouable** à partir de `{ seed }` **+ la séquence des coups** (partie
  enregistrée, ou partie 100 % IA déterministe). → sert le **replay** et le **debug/tests IA**.
- Conséquence pour le bloc « défi-par-lien » (hors périmètre ici) : soit le défi porte sur une
  **donne** (parité garantie par le seed seul), soit sur une **partie enregistrée** (seed + coups).
  Ce bloc **pose l'architecture** qui rend les deux possibles ; il ne choisit pas la sémantique du lien.

**Module.** Nouveau `src/shoe.mjs` (le « sabot ») : `newShoe(seed) → { deck }`, `cut(deck, rng) → deck`,
`pickup(deck, tricks, takerTeam) → deck`. `deal.mjs` refactoré pour recevoir un `deck` ordonné.
`game.mjs`/`driver.mjs` tiennent `deckCourant` au fil des donnes. **Un seul `rng` par partie**
(déjà le cas dans `driver.mjs` et `playGame`).

**Tri par défaut de la main + préférence** (partie « matériel » de la décision 5) :
- À la donne, la main de l'humain est **présentée** triée : **couleurs regroupées, atout à part,
  ordre de force décroissant** au sein de chaque couleur (`cardStrength`). Ce tri est **purement
  d'affichage initial** — il ne modifie pas le modèle logique et est **écrasé** dès que le joueur
  réorganise (décision 5 : le jeu ne re-trie jamais après).
- **Préférence mémorisée** (`localStorage`, 3 options) : `couleur` (regroupe par couleur) ·
  `force` (force pure, atout inclus dans le flux) · `atouts-d-abord` (atout en tête). Défaut proposé :
  `couleur` (§8-Q4). Fonction pure `sortHandForDisplay(hand, atout, pref)` — **testable**, sans effet
  sur `legalMoves`/détection.

### 4.2 Annonces — rituel officiel en deux temps (décision 3)

Le socle logique existe (`src/annonces.mjs` : `detectAnnonces`, `compareAnnonce`, `resolveAnnonces`).
Le bloc ajoute le **rituel** (timing + déclaration manuelle + exposition) autour de ce socle.

**Détection — sur le contenu LOGIQUE, jamais l'ordre visuel** (lien avec §4.4). `detectAnnonces`
opère déjà sur le **tableau-modèle** de la main (tri interne par `SEQ_ORDER`), donc **indépendant**
de l'ordre d'affichage. **Invariant à verrouiller par test** : `detectAnnonces(main)` ≡
`detectAnnonces(permutation(main))` pour toute permutation. La détection **ne lit jamais le DOM**.

**Pool de déclaration** (nouvelle notion). L'entrée de `resolveAnnonces` n'est plus « toutes les
annonces détectées » mais **les annonces DÉCLARÉES** :
- **IA** : déclare **toujours** → toutes ses annonces détectées entrent dans le pool.
- **Humain** : une annonce n'entre dans le pool **que s'il a cliqué « Annoncer »** au moment de
  jouer sa **1ère carte** de la donne. Sinon elle est **perdue, silencieusement** (aucune
  confirmation, aucune alerte — c'est la règle). *(Défaut proposé §8-Q5 : le clic déclare **toutes**
  les annonces de la main d'un coup ; la déclaration à la carte est une raffinement futur.)*

**Timeline du rituel** (aligne le driver) :
- **Pli 1 — déclaration (valeur seulement)**. Quand c'est à l'humain de jouer sa 1ère carte et
  qu'il **a** au moins une annonce, un bouton **« Annoncer »** est visible à côté de la main. Le
  libellé exposé aux joueurs est la **valeur** (« Tierce », « Cinquante », « Cent », « Carré de… »),
  **pas les cartes** (`annonceLabel`, déjà en place). Les IA déclarent au moment où elles posent leur
  1ère carte. La comparaison est résolue une fois les 4 déclarations du pli 1 connues.
- **Pli 2 — exposition de la meilleure**. Seule la **meilleure** annonce (celle qui gagne la
  comparaison) est **montrée** : ses **cartes exposées aux 4 joueurs** en **overlay** quelques
  secondes (défaut 3 s, §8-Q6), **puis reprises en main** (purement visuel — les cartes restent en
  main et jouables ; l'exposition ne mute ni la main ni `legalMoves`). **Seul le camp vainqueur
  marque, et il marque TOUTES ses annonces** ; le **camp battu ne montre rien et ne marque rien**.
- **Comparaison** (autorité = décision 3) : **hauteur** (points) > **carte la plus forte** > **atout**.
  **Égalité parfaite** entre camps adverses → **personne ne marque** (annulée). `compareAnnonce`
  implémente déjà points → carré>suite → carte haute → atout ; le tie-break **carré > suite** à
  points égaux et l'**aînesse** intra-camp ne sont pas dans l'énoncé ratifié → **§8-Q2** (défaut :
  conserver le comportement actuel, déjà testé et sans effet cross-camp car l'annulation ne joue
  qu'à égalité **parfaite**).

**Marquage.** `resolveAnnonces(poolDéclaré, atout, donneur)` → `{ winnerTeam, bonus, best, annule }`
inchangé dans sa forme ; seul **l'ensemble d'entrée** change (déclarées, pas détectées). Le bonus
s'ajoute **par-dessus** `scoreDeal` (déjà le cas dans `driver._finishDeal`), sans toucher le décompte
cartes validé.

**Machine à états / API.** Le driver passe d'un `annonce_show` unique à : `annonce_declare`
(pli 1, attend le 1er coup + option « Annoncer ») → résolution → `annonce_expose` (pli 2, overlay
cartes de la meilleure). Nouvelle route `POST /api/annonce` (`{ declare: true }`) ; `view()` expose
`canAnnonce` (l'humain a-t-il une annonce déclarable maintenant) et, en phase expose, les **cartes**
de la meilleure annonce (seulement celle-là).

### 4.3 Belote-rebelote — manuelle pour l'humain (décision 4)

Aujourd'hui `scoring.mjs` attribue **+20 automatiquement** au détenteur de R+D d'atout, et le driver
révèle via `_belotePlayedCount` quand les cartes tombent. Le bloc rend l'humain **responsable de la
déclaration** :
- **Humain** : bouton **« Belote »** apparaît **uniquement** en jouant le **Roi OU la Dame d'atout**
  (1ère des deux) ; bouton **« Rebelote »** en jouant la **seconde**. **Oublié = perdu** : si les
  deux cartes tombent sans les deux clics au bon moment, **pas de +20** (strict). **Jamais montrée**
  autrement que par le clic ; **imbattable** (le +20 est acquis dès la déclaration correcte).
- **IA** : **automatique** (déclare toujours quand elle détient R+D d'atout et pose ces cartes).
- **Scoring** : le +20 devient **conditionné à la déclaration** pour l'humain. `scoreDeal` reçoit un
  `beloteDeclared` (bool) plutôt que de déduire le +20 du seul `beloteTeamIdx`. Le +20 reste **acquis
  même si le preneur est dedans** (décision D4 du prototype conservée), **à condition** d'avoir été
  déclaré.
- **API** : route `POST /api/belote` (`{ call: "belote" | "rebelote" }`), validée contre la carte
  effectivement jouée à cet instant (rejet si hors moment). `view()` expose `canBelote` / `canRebelote`.

### 4.4 Main réorganisable — drag & drop sans confusion « ranger » / « jouer » (décision 5)

**Risque UX n°1, traité explicitement.** Deux gestes coexistent sur les mêmes cartes ; ils doivent
être **désambiguïsés par la géométrie du geste**, pas par un mode :
- **JOUER** = **tap** (appui court, déplacement < seuil) **ou** **tirer la carte vers le tapis**
  (glisser **vers le haut**, franchir le **bord supérieur de la bande main** au-delà d'un seuil).
- **RANGER** = glisser **horizontalement à l'intérieur de la bande main** (réordonner), la carte
  reste dans la zone main.
- **Arbitrage** (proposé, §8-Q7) : à la fin du geste, classer par **vecteur dominant + zone** —
  déplacement vertical vers le haut franchissant le bord de la main → **jouer** ; déplacement
  majoritairement horizontal restant dans la main → **ranger** ; en deçà des seuils → **tap = jouer
  la carte sous le doigt** (si légale). Seuils proposés : distance 12 px, ratio vertical/horizontal
  1.3, franchissement du bord haut de `#hand`. **Feedback visuel distinct** : en réorganisation, les
  cartes voisines s'écartent (placeholder) ; en jeu, la carte s'élève vers le tapis. Pointer Events
  (souris + tactile unifiés), `touch-action: none` sur les cartes, respect de `prefers-reduced-motion`.
- **Contrainte de sûreté** : on ne peut **jouer** qu'une carte **légale** (déjà garanti par
  `legalMoves`/rejet serveur) ; **ranger** est **toujours** permis (aucune carte n'est illégale à
  déplacer), y compris quand ce n'est pas son tour.

**Le jeu ne re-trie jamais.** Après le tri d'affichage initial (§4.1), l'ordre est **la propriété du
joueur** : ré-render de la main = conserver l'ordre courant du joueur (indexé par `card.id`), retirer
les cartes jouées **sans réordonner** les autres. **Aucun** appel de tri automatique après la donne.

**Séparation modèle / vue.** L'ordre d'affichage vit dans l'UI (tableau d'`id`) ; le **modèle**
(`hands[HUMAN]`) reste l'ensemble logique. `legalMoves`, `detectAnnonces`, `scoreDeal` opèrent sur le
modèle → **jamais** affectés par la réorganisation (invariant testé, cf. §4.2 détection).

### 4.5 Cartes dessinées — swap d'assets SVG (décision 6)

- **Matériel** : **une spritesheet SVG** couvrant les **32 cartes** (4 enseignes × 7-8-9-10-V-D-R-A),
  + **dos de carte** + **tapis**. Source privilégiée : **portrait français** (reproductions libres
  **Wikimedia**) ; **fallback** jeu anglais **domaine public** si la lisibilité mobile est insuffisante.
- **Critère de sélection n°1** : **lisibilité à ~50-70 px de large** (taille d'une carte en main sur
  mobile), **coins valeur + enseigne très francs**. **Procédure obligatoire** : **rendre la
  spritesheet candidate à taille réelle** (bande main, tapis, overlay d'exposition) et **valider
  visuellement AVANT d'adopter** — capture jointe à la preuve. Pas d'adoption « à l'aveugle ».
- **Intégration** : les figures R/D/V remplacent le texte actuel (`cardHTML` dans `index.html`) ;
  7-10 peuvent rester des pips lisibles ou passer aussi par la spritesheet (cohérence, §8-Q8). Dos et
  tapis câblés sur les **tokens du design system 4a** (couleurs/rayons déjà définis) pour rester dans
  la charte studio.
- **Périmètre strict** : **SWAP d'assets uniquement** — **aucune création custom, aucune génération
  IA**. Si aucun set libre ne passe le critère de lisibilité, on **remonte la question** (§8-Q8)
  plutôt que d'en fabriquer un.

### 4.6 Score — 1000 par défaut, cible paramétrable (décision 1)

- Défaut moteur : `playGame({ target })` et `BeloteDriver({ target })` passent de **501 → 1000**.
- **UI** : le champ cible propose **501 / 1000** (défaut **1000**), au lieu du `target: 501` figé
  dans `index.html` (`/api/new`). Aucune autre logique de score ne change (barèmes, dix de der,
  capot, contrat, belote, annonces intacts).

---

## 5. Garde-fous

- **Non-régression du socle prouvé** : les 30 tests `node:test`, l'auditeur indépendant
  `tools/real-play.mjs` (0 violation de légalité) et l'invariant de parité `verify-parity.mjs`
  (**driver ≡ moteur**) doivent **rester verts sous le nouveau paquet**. Le nouveau mécanisme change
  les mains produites par un seed donné (attendu) — ce qui doit tenir, c'est la **légalité**, la
  **cohérence du décompte** et la **parité driver/moteur**, pas la reproduction des anciennes mains.
- **Séparation modèle / vue** : réorganisation, tri d'affichage et exposition d'annonces sont
  **purement visuels** — ils ne touchent ni `hands`, ni `legalMoves`, ni la détection, ni le scoring.
- **Déterminisme** : un seul `rng` par partie ; le ramassage n'utilise **aucun** hasard ; la coupe
  est **seedée** et bornée (jamais fixe, jamais 0). `{ seed }` rejoue la **donne 1** ; `{ seed +
  coups }` rejoue **toute la partie**.
- **Anti-triche** : `view()` ne révèle que la main de l'humain (déjà le cas) ; l'exposition du pli 2
  ne montre **que** les cartes de la **meilleure** annonce, du **camp vainqueur**.
- **Périmètre lanes** : lane JEUX. **Ne pas toucher** `src/` (Rust), `autopilot.py`, ni les fichiers
  du builder llm-lego hors dossier `experiments/belote-claude/`. **`tests/` = zone protégée** (gate
  Pierre). Chemins **repo-relatifs**, `encoding utf-8`, pas de fichiers tmp résiduels.
- **Assets** : swap uniquement, licences libres vérifiées et **notées** (source + licence) ; aucune
  génération IA d'illustration.

---

## 6. Preuve (à produire au build, pas dans ce cycle)

**Unit — règles (fonctions pures, `node:test`)**
- **Scoring annonces — camp vainqueur marque tout** : deux camps déclarent ; le camp de la meilleure
  annonce marque **la somme de TOUTES ses annonces**, l'autre **0**.
- **Annonce non déclarée = perdue** : une annonce détectée mais **absente du pool déclaré** n'entre
  pas dans la comparaison et ne marque pas — même si elle aurait gagné.
- **Coupe déterministe depuis seed** : `newShoe(seed)` + suite de `cut` → **séquence de paquet
  reproductible** ; deux exécutions même seed ⇒ **donne 1 identique** ; coupe **jamais fixe**
  (positions variées) et **jamais hors plage**.
- **Ramassage déterministe** : à plis identiques, `pickup` produit un `deckCourant` **identique**
  (aucun hasard) ; la donne N+1 est fonction pure de la donne N.
- **Détection indépendante de l'ordre de main** : `detectAnnonces(main)` ≡
  `detectAnnonces(permutation(main))` pour un échantillon de permutations.
- **Belote conditionnelle** : +20 **si déclaré**, **0 si oublié** (humain) ; **auto** (IA) ; acquis
  même preneur dedans **si déclaré**.
- **Tri d'affichage pur** : `sortHandForDisplay` ne change ni la légalité ni la détection.

**Non-régression prototype**
- 30 tests + `real-play.mjs` (0 violation) + `verify-parity.mjs` **verts sous le nouveau paquet**.
- Recompte manuel d'une donne = `scoreDeal.base` (invariant **162**) conservé.

**UX (DOM — Playwright headless, à la `web/e2e.play.mjs`)**
- **Déclaration** : bouton « Annoncer » **présent** quand l'humain a une annonce au pli 1 ; cliqué →
  l'annonce **entre au pool** et le camp marque ; **non cliqué** → annonce **perdue** (aucune alerte).
- **Exposition pli 2** : overlay montre **les cartes de la meilleure** annonce (celle-là seulement),
  quelques secondes, **puis** la main est intacte et jouable (cartes reprises).
- **Belote/Rebelote** : boutons apparaissent au bon moment (R/D d'atout) ; oublié → **pas de +20**.
- **Ranger vs Jouer** : un glisser horizontal **réordonne** sans jouer ; un tap / tirer vers le tapis
  **joue** (carte légale) — **geste de rangement ne déclenche jamais un coup** (test explicite du
  risque n°1). L'ordre choisi **survit** au render suivant (le jeu ne re-trie pas).
- **Cartes** : rendu figures R/D/V à **taille réelle** (~60 px), **capture** jointe ; lisibilité
  coins valeur+enseigne validée à l'œil avant adoption.

Verdicts attendus en fin de charter : `software_verdict: OK` · `evidence_verdict:
INCLUDES_UX_VALIDATION` · `claim_verdict: NO_CLAIM_ALLOWED`.

---

## 7. Hors périmètre (explicite)

Blocs **suivants** du spec produit, **pas** ce bloc :
- **Parcours joueur** / onboarding / écrans hors table.
- **Niveaux d'IA** (l'IA actuelle reste l'heuristique légale existante — inchangée).
- **PWA / offline / installation**.
- **Défi-par-lien** lui-même (sémantique du lien, encodage, partage) — ce bloc n'en livre que
  **l'architecture de rejouabilité** (§4.1).
- **Table entre amis WebRTC** / multijoueur public (étage 2 du pivot).
- **Coinche / Contrée** (annonces chiffrées) — on reste en **belote classique** (D1 du prototype).
- **Refactor moteur de plis commun Belote/Tarot** (prévu à l'extraction avant Tarot, pas ici).
- **Migration du code** hors `experiments/belote-claude/` vers un dossier produit `games/` — décision
  d'emplacement à trancher séparément (§8-Q9) ; ce bloc travaille sur la base actuelle.

---

## 8. Questions ouvertes (avec défauts proposés)

Chacune a un **défaut** : si Pierre ne tranche pas, on part sur le défaut — aucune n'est bloquante
pour démarrer.

- **Q1 — Convention de recomposition du paquet après ramassage.** Ordre exact des deux piles de camp.
  *Défaut proposé* : pile du **camp preneur** puis pile du **camp défense**, chaque pli en ordre de
  jeu (entameur d'abord), plis chronologiques. Figé + testé. *(Fidélité « table réelle » : la
  convention réelle varie ; ce qui compte est qu'elle soit **déterministe et documentée**.)*
- **Q2 — Tie-breaks d'annonces hors énoncé ratifié.** L'énoncé donne hauteur > carte forte > atout.
  Le code ajoute **carré > suite** à points égaux et **aînesse** intra-camp. *Défaut proposé* :
  **conserver** le comportement actuel (déjà testé ; sans effet sur l'annulation cross-camp qui n'a
  lieu qu'à égalité **parfaite**). À confirmer.
- **Q3 — Plage de coupe.** `COUPE_MIN`. *Défaut proposé* : **3** (coupe entre la 3ᵉ et la 29ᵉ carte)
  — évite les coupes triviales, reste « raisonnable ». Ajustable.
- **Q4 — Tri d'affichage par défaut.** *Défaut proposé* : **`couleur`** (couleurs regroupées, atout à
  part, force décroissante), le plus lisible pour un débutant. Mémorisé en `localStorage`.
- **Q5 — Granularité de la déclaration d'annonce.** *Défaut proposé* : le clic « Annoncer » déclare
  **toutes** les annonces de la main d'un coup, au pli 1. La déclaration **carte par carte** (belote
  réelle stricte) = raffinement futur, pas au lancement.
- **Q6 — Durée d'exposition au pli 2.** *Défaut proposé* : **3 s** (avec `prefers-reduced-motion` →
  exposition statique sans animation, même durée). Éventuel « tap pour continuer ».
- **Q7 — Seuils du geste ranger/jouer.** Distance, ratio vertical/horizontal, franchissement du bord
  main. *Défaut proposé* : 12 px / ratio 1.3 / franchir le bord haut de `#hand`. **À calibrer sur
  device réel** (le brief le désigne risque n°1 — prévoir une passe de réglage tactile).
- **Q8 — Set de cartes retenu + traitement des 7-10.** Portrait FR Wikimedia vs fallback anglais ;
  figures seules ou 32 cartes complètes. *Défaut proposé* : viser **portrait FR complet 32 cartes** ;
  si un rang échoue au critère 50-70 px, **remonter** (pas de fabrication). Décision **après** test à
  taille réelle.
- **Q9 — Emplacement du code produit.** Rester dans `experiments/belote-claude/` ou promouvoir vers
  `games/belote/`. *Défaut proposé* : **rester sur place pour le bloc 1** (éviter un déménagement qui
  brouillerait la non-régression) ; déménagement traité comme tâche séparée, sur go Pierre.

---

*Fin du spec bloc 1. Prochaine étape : relecture Pierre → `writing-plans` (découpage en unités
implémentables + ordre de build).*
