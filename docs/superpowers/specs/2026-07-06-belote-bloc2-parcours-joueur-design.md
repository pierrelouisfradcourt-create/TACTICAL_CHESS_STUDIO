# Belote — Spec produit, bloc 2 : « Parcours joueur »

- **Date** : 2026-07-06
- **Source** : brainstorming Claude Code (Pierre + assistant), design ratifié section par section.
  Suite du **bloc 1** (`2026-07-06-belote-bloc1-regles-table-materiel-design.md`, livré & poussé).
- **Statut** : SPEC — à relire par Pierre, puis `writing-plans`. **Pas de code dans ce cycle.**
- **Base** : `llm-lego/experiments/belote-claude/` (le produit ; on fait évoluer l'`index.html`
  et `web/server.mjs`, la logique de jeu du bloc 1 reste **intacte**).

---

## 1. But & périmètre du bloc

Donner au jeu son **squelette produit** : un écran d'**Accueil**, un écran de **Réglages
avant-partie**, la **table** (existante) comme vue de jeu, un écran de **Fin de partie** net, une
fiche **« Comment jouer »** statique, et les **états** manquants (chargement, erreur, reprise, 1er
lancement). C'est la surface sur laquelle se brancheront les blocs suivants (IA à niveaux,
défi-par-lien, PWA).

**Ambition ratifiée : « shell minimal soigné »** — pas de tutoriel interactif, pas de profils/comptes.
YAGNI. L'onboarding riche viendra **sur observation de vrais blocages joueurs**, pas avant.

**Hors périmètre** (blocs suivants) : voir §7.

---

## 2. État de base (vérité terrain)

L'entrée en jeu actuelle est **un seul écran** (la table), avec la configuration **en ligne dans le
HUD** :

- `index.html` — HUD en tête : `#seed` (number), `#target` (501/1000), `#sortPref`
  (couleur/force/atouts), bouton `#newBtn` « Jouer ». Puis table (pods, pli, enchère), main
  drag&drop, et 3 overlays : `#annoncePanel` (exposition), `#dealPanel` (fin de donne), `#gamePanel`
  (fin de partie, bouton « Rejouer » qui rappelle `newGame()`).
- `web/server.mjs` — partie **unique en mémoire** (`let game`). Routes : `POST /api/new
  {seed,target}`, `GET /api/state` (409 si aucune partie), `/api/bid|play|annonce|belote|continue`.
- **Manques** : pas d'Accueil, pas d'écran Réglages dédié, pas de « Comment jouer », pas de fin-de-
  partie « écran » (juste un overlay), pas d'état chargement/erreur, pas de reprise explicite au
  rechargement, pas d'astuce 1er lancement. La graine n'est **jamais montrée** à la fin.

---

## 3. Décisions ratifiées (HumanGate — NE PAS rouvrir)

1. **Ambition** = **shell minimal soigné** (pas de tuto interactif, pas de profils).
2. **Architecture A** = **machine à vues** dans `index.html` (vanilla, zéro dépendance, zéro build) ;
   la table devient la vue `game`. **Exigence structurante** : **`showView(v)` est l'UNIQUE point
   d'entrée de navigation — aucune vue ne s'affiche autrement.** (Permet au bloc 3 d'envelopper la
   navigation avec la synchro hash `#/defi?seed=…` sans toucher aux vues. Le hash-routing = bloc 3.)
3. **Réglages avant-partie** = **essentiel + seed discret** : cible (501/1000) · tri
   (couleur/force/atouts) · annonces (ON/OFF) · repli « Avancé » → graine. Sièges fixes
   (Vous/Nord/Est/Ouest). La config **sort** du HUD en jeu.
4. **Reprise = directe à la table.** Au rechargement d'une partie en cours, l'intention est la
   continuation — repasser par l'Accueil serait de la friction. Filet : ☰ Menu pour sortir ; serveur
   ayant perdu la partie (409) → message + Accueil.
5. **« Comment jouer » = fiche statique** (pas interactive).
6. **Rejouer = mêmes réglages, NOUVELLE graine par défaut.** « Rejouer cette donne/partie exacte »
   est une feature du **bloc défi**, pas ici. Exception : si la graine a été **fixée manuellement**
   dans Réglages, elle fait partie des « mêmes réglages » et est **réutilisée** (partie reproductible).
7. **Graine visible sur l'écran Fin**, discrètement (« graine : `abc123` », copiable). Coût quasi
   nul, **ancre seed-first** : l'écran Fin est la future surface de partage du défi-par-lien (bloc 3).

---

## 4. Architecture

### 4.1 Machine à vues (invariant de navigation)

État client `view ∈ { accueil, reglages, help, game }`. **Une seule fonction `showView(v)`** :
- masque toutes les sections-écrans, affiche celle de `v`, met à jour un attribut `data-view` sur la
  racine (pour le CSS et les tests).
- **Invariant (ratifié §3.2)** : c'est le **seul** moyen de changer de vue. Aucun `style.display`
  d'écran ailleurs. Toute action de navigation (bouton, reprise, fin) **passe par `showView`**.
  → point d'accroche unique pour le bloc 3 (miroir `view ↔ location.hash`).
- La vue `game` = l'UI de table **existante** (intacte). Les autres vues sont des **sections sœurs**
  ajoutées dans `index.html`.

### 4.2 Écrans

- **Accueil** (`view=accueil`, état idle/vide) : marque `♠ Belote`, actions **« Jouer »**
  (`#playBtn` → `reglages`), **« Comment jouer »** (`#helpBtn` → `help`), et **« Reprendre la
  partie »** (`#resumeBtn`) **affiché seulement** si une partie active existe (cf. 4.3 reprise).
- **Réglages** (`view=reglages`) : `#target` (501/1000), `#sortPref` (couleur/force/atouts),
  `#annonces` (ON/OFF), repli **« Avancé »** → `#seed` (texte, vide = auto). **« Commencer »**
  (`#startBtn`) → `POST /api/new` → `game`. **« Retour »** → `accueil`. Préremplit depuis
  `localStorage` (cf. 4.6).
- **Table** (`view=game`) : UI existante **inchangée** + un bouton discret **« ☰ Menu »**
  (`#menuBtn`) qui, si une partie est en cours, **demande confirmation** avant de revenir à
  `accueil`. Le HUD de table perd seed/cible/tri (déplacés en Réglages) → HUD = **scores + annonces
  + ☰**.
- **Fin de partie** (`view=game`, overlay `#gamePanel` **promu en écran net**) : vainqueur, score
  final, nb de donnes, **« graine : `<base36>` » copiable** (§4.4), CTA **« Rejouer »**
  (`#replayBtn`, §4.4) et **« Menu »** (`#toMenuBtn` → `accueil`). *Partager = différé (bloc 3).*
- **Comment jouer** (`view=help`) : fiche **statique** scrollable — pli/atout, obligations
  (fournir/monter/couper), rituel annonces, belote-rebelote, décompte (contrat 82, capot, dix de
  der, belote 20), cible. Bouton **« Retour »** → `accueil`.

### 4.3 États

- **Chargement** : pendant `POST /api/new` et `GET /api/state`, indicateur léger (pas d'écran blanc).
- **Erreur** : serveur injoignable / 5xx au démarrage ou à la reprise → **carte d'erreur** dédiée
  avec **« Réessayer »** (jamais bloqué). Le toast `#err` existant reste pour les erreurs
  transitoires en jeu (coup refusé, etc.).
- **Reprise** (au chargement de la page) : `GET /api/state`. Si **200 & `phase≠game_over`** →
  **`showView('game')` directement** (reprise §3.4) + rendu de l'état. Sinon (**409** ou
  `game_over`) → `showView('accueil')`. Le bouton « Reprendre » d'Accueil n'est utile que si l'on est
  **volontairement** revenu à l'Accueil (via ☰) alors qu'une partie tourne encore.
- **1er lancement** : à la **première** entrée en `game`, astuce unique dismissible (overlay léger) :
  « Touche une carte éclairée pour jouer · glisse-la sur le côté pour ranger · bouton Annoncer au 1er
  pli si tu as une combinaison. » Flag `localStorage['belote.seenHint']` → plus jamais ensuite.

### 4.4 Graine & « Rejouer » (sémantique ratifiée §3.6/3.7)

- **Représentation** : graine = entier `uint32` en interne. **Affichage & saisie en base36**
  (`seed.toString(36)`, ex. `2n9c`) pour un rendu court et partageable. Le champ `#seed` accepte
  base36 **ou** décimal (parse base36 ; « 3 » → 3, comme les tests du bloc 1). Vide = **auto**.
- **Mode graine** : `settings.seedMode ∈ { auto, fixed }`. `fixed` dès que l'utilisateur saisit une
  graine ; `auto` si le champ est vide.
- **Démarrage** (`Commencer` / reprise d'un `newGame`) : `auto` → **générer une graine aléatoire**
  fraîche (`Math.random`→uint32) ; `fixed` → utiliser `settings.seed`. La graine **effectivement
  utilisée** est renvoyée par le serveur (déjà dans `view().seed`) et **mémorisée** pour l'affichage
  Fin.
- **Rejouer** (bouton écran Fin) : **mêmes réglages** (cible/tri/annonces) ; graine selon le mode :
  `auto` → **nouvelle graine aléatoire** (distribution différente) ; `fixed` → **même graine**
  (partie reproductible, choix explicite du joueur). ⇒ deux « Rejouer » successifs en mode auto
  donnent des **distributions différentes** ; en mode fixed, **identiques**.
- **Écran Fin** : « graine : `<seed.toString(36)>` » + bouton copier. Ancre seed-first pour le défi
  (bloc 3) — aucune logique de lien ici, juste l'exposition copiable.

### 4.5 Changements serveur (`web/server.mjs`)

- `POST /api/new` accepte **`annonces`** (bool) en plus de `seed`/`target` → passthrough
  `new BeloteDriver({ seed, target, annonces })`. (`BeloteDriver` a déjà l'option `annonces`.)
- `POST /api/new` **sans `seed`** (ou seed vide) : le **client** fournit toujours une graine
  (auto→aléatoire), donc le serveur reçoit un entier. `/api/state` et les autres routes **inchangées**.
- Aucun changement au modèle « partie unique en mémoire » (reprise = lecture `/api/state`).

### 4.6 Persistance des réglages (localStorage)

- `belote.settings = { target, sortPref, annonces, seed, seedMode }` sauvé à chaque « Commencer » ;
  Réglages préremplit depuis là. `belote.seenHint` (astuce 1er lancement). `belote.sortPref` du
  bloc 1 est **absorbé** dans `belote.settings.sortPref` (migration douce : lire l'ancien si présent).

---

## 5. Garde-fous

- **Logique de jeu intacte** : bloc 2 ne touche QUE `index.html` (vues/écrans) et `web/server.mjs`
  (passthrough `annonces`). `src/*`, `web/driver.mjs` **inchangés**. Aucune régression des règles.
- **Invariant `showView`** : un test vérifie qu'aucun écran ne s'affiche sans passer par `showView`
  (les sections sont masquées par défaut ; seul `showView` pose `data-view`). Point d'entrée unique.
- **Non-régression bloc 1** : les e2e existants (`e2e.sort/reorder/declare/belote/cards`) passent via
  un helper `startGame(page, {seed,target,annonces})` mis à jour (Accueil→Réglages→Commencer). Les
  ids `#seed/#target/#sortPref` sont **conservés** (déplacés en Réglages) pour limiter la casse.
- **Périmètre lane JEUX** : rien hors `belote-claude/`. Chemins repo-relatifs, `utf-8`, pas de tmp.
- **Reprise sûre** : jamais d'écran blanc ; 409/`game_over` → Accueil ; erreur réseau → carte
  « Réessayer ».
- **`showView` = seule navigation** : aucune future feature ne doit contourner (garde-fou bloc 3).

## 6. Preuve (à produire au build)

**e2e DOM (Playwright, `--disable-gpu`)** :
- **Flux nominal** : Accueil → « Jouer » → Réglages → « Commencer » → `data-view=game`, partie active.
- **Rejouer (auto)** : jouer une partie jusqu'à Fin → « Rejouer » → nouvelle partie ; **2 Rejouer
  successifs ⇒ distributions différentes** (mains initiales différentes). En **mode fixed** (graine
  saisie) ⇒ **distributions identiques**.
- **Graine sur Fin** : l'écran Fin affiche « graine : `<base36>` » = la graine réellement jouée ;
  bouton copier présent.
- **Menu / reprise** : ☰ Menu en jeu → confirmation → Accueil ; reload en pleine partie →
  **directement la table** (pas d'Accueil) ; après `game_over` → Accueil.
- **Erreur** : serveur coupé → carte d'erreur + « Réessayer » (pas d'écran blanc).
- **Astuce 1er lancement** : visible la 1ʳᵉ fois, absente ensuite (flag).
- **Comment jouer** : ouvre/ferme, contenu statique présent.
- **Annonces OFF** : partie lancée `annonces=OFF` → aucune phase `annonce_expose`, aucun bouton
  Annoncer.
- **Invariant navigation** : au chargement, une seule section visible ; changer de vue ne se fait que
  via `showView` (sections masquées par défaut).

**Non-régression** : `e2e.sort/reorder/declare/belote/cards` verts via `startGame()`. Node : `node
--test` + `verify-parity/annonces/ritual` + `real-play` toujours verts (logique intacte).

Verdicts attendus : `software_verdict: OK` · `evidence_verdict: INCLUDES_UX_VALIDATION` ·
`claim_verdict: NO_CLAIM_ALLOWED`.

## 7. Hors périmètre (explicite)

Défi-par-lien / partage & **hash-routing** (bloc 3 — l'ancre seed-first et l'invariant `showView`
sont posés ici) · IA à niveaux · PWA / offline / installation · profils / comptes / stats · tuto
interactif · WebRTC / multijoueur · refactor moteur de plis (avant Tarot).

## 8. Questions ouvertes (défauts proposés)

- **Q1 — Format de graine affiché.** *Défaut* : **base36** (`seed.toString(36)`), champ Réglages
  acceptant base36 ou décimal. Court, partageable, rétro-compatible avec les seeds numériques des
  tests. Alternative (bloc 3) : un mot-code plus lisible.
- **Q2 — Confirmation du ☰ Menu en jeu.** *Défaut* : confirmer (« Quitter la partie en cours ? »)
  uniquement si la partie n'est pas terminée. Sinon retour direct.
- **Q3 — Contenu exact de « Comment jouer ».** *Défaut* : une page condensée (les 6 rubriques du
  §4.2). Ajustable au fil de l'eau, non bloquant.
- **Q4 — Indicateur de chargement.** *Défaut* : overlay/spinner minimal sur les vues concernées
  (pas de squelette élaboré — ambition minimale).

---

*Fin du spec bloc 2. Prochaine étape : relecture Pierre → `writing-plans`.*
