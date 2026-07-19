# JOURNAL DES ERREURS ET OUBLIS — Belote (Claude Code)

> Livrable principal de la passe « laboratoire de méthode ».
> Tenu **en direct** pendant la construction. Chaque entrée : **quoi** / **pourquoi** /
> **comment corrigé** / **ce qu'un meilleur prompt initial aurait dû préciser**.
>
> Source : session Claude Code, 2026-07-04. Moteur écrit en JS (Node 24, `node:test`).
> Emplacement du code : `llm-lego/experiments/belote-claude/`.

---

## Partie 0 — Décisions d'interprétation prises AVANT d'écrire une ligne de code

Le prompt dit « règles standard de la Belote classique » sans figer les dizaines de
variantes régionales. Voici les choix faits, et pourquoi. **Chaque choix est une
ambiguïté que le prompt n'a pas levée** — donc déjà de la matière pour la colonne
« meilleur prompt ».

| # | Ambiguïté du prompt | Choix fait | Pourquoi |
|---|---|---|---|
| D1 | Belote *classique* vs Coinche/Contrée | **Belote classique** (un preneur prend l'atout, pas d'annonce chiffrée) | « classique » l'indique ; la Coinche est une sur-couche d'enchères |
| D2 | Ordre de distribution | **3-3-2** + 1 carte retournée pour l'enchère | Variante la plus répandue ; documentée |
| D3 | Barème du contrat | Preneur réussit si score équipe **≥ 82** (strictement > moitié de 162) ; sinon « dedans » → défense encaisse 162 | Règle standard « chute si < 82 » |
| D4 | Belote-rebelote (R+D d'atout) | **+20** à l'équipe détentrice, **comptés même si dedans** | Convention classique : les 20 restent au détenteur |
| D5 | Dix de der | **+10** à l'équipe qui remporte le **dernier** pli | Standard |
| D6 | Capot (les 8 plis) | traité comme **enseignement / simplification** au départ, voir entrée live | risque d'oubli identifié d'avance |
| D7 | Total des points | invariant **162** (152 cartes + 10 der) vérifié par test | garde-fou anti-erreur de barème |
| D8 | IA des joueurs | **coups légaux + heuristique simple** (pas d'IA forte) | le prompt priorise la LOGIQUE, pas la force de jeu |
| D9 | Fin de partie | à **501 points** par défaut (paramétrable) | valeur courante ; paramétrable pour lever l'ambiguïté |

> **Leçon meilleur prompt (transversale D1–D9)** : pour un jeu à variantes, un bon prompt
> doit soit fournir une **fiche de règles figée** (barème, distribution, seuil de chute,
> capot, belote, fin de partie), soit dire explicitement « choisis une variante cohérente
> et documente-la ». Sans ça, l'exécutant invente 9 micro-règles — reproductibles seulement
> si elles sont écrites, ce qui est fait ici.

---

## Partie 1 — Erreurs & oublis rencontrés EN DIRECT pendant la construction

<!-- append-only ci-dessous : une entrée par incident réel, dans l'ordre chronologique -->

### E1 — Distribution : j'ai confondu la main finale (8) avec le deal d'enchère (5)
- **Quoi** : première version de `deal()` distribuait directement **8 cartes/joueur** (3-3-2)
  PUIS tentait de retourner une carte. Or 8×4 = 32 = tout le paquet → `turnUp` valait
  `undefined` et le talon était vide. Bug latent masqué (aucune exception immédiate).
- **Pourquoi** : la belote a une distribution en **deux temps** que j'ai zappée. On donne
  d'abord **5 cartes** (3+2), on retourne 1 carte, on fait l'enchère, PUIS on complète à 8
  (le preneur intègre la carte retournée). J'ai directement écrit l'état post-enchère.
- **Comment corrigé** : test écrit d'abord (attendait 5 cartes + turnUp défini + talon 11) →
  a échoué (`completeDeal` absent). Réécriture en deux temps : `deal()` (5+turnUp+talon 11)
  et `completeDeal()` (preneur +2, autres +3). 3/3 verts.
- **Meilleur prompt** : préciser « la distribution de la belote se fait en deux temps :
  5 cartes puis complément à 8 après l'enchère, le preneur prend la carte retournée ». Un
  prompt qui dit juste « distribue les cartes » laisse l'exécutant fusionner les deux phases
  et casser la mécanique d'enchère (qui dépend de la carte retournée).

### E2 — Choix d'interprétation : « pisser » à l'atout quand on ne peut pas surcouper
- **Quoi** : quand un joueur ne peut pas fournir la couleur, que l'adversaire est maître avec
  un atout, et qu'il a des atouts mais AUCUN plus fort → deux écoles existent : (a) il DOIT
  quand même fournir un atout plus petit (« pisser »), (b) certaines variantes l'autorisent à
  se défausser. J'ai **choisi (a)** (obligation de fournir un atout, même perdant).
- **Pourquoi** : c'est la règle la plus répandue en belote classique et la plus cohérente avec
  l'obligation de couper. Test dédié : « atout demandé, ne peut pas monter → fournir quand même ».
- **Ce n'était pas un bug** (les 9 tests passent du premier coup) mais une décision non triviale
  qui aurait pu être tranchée dans l'autre sens sans que rien ne « casse » — donc invisible sans
  documentation.
- **Meilleur prompt** : lister explicitement les 3-4 obligations de jeu attendues (fournir,
  monter à l'atout, couper l'adversaire, liberté si le partenaire est maître, cas « pas de plus
  gros atout »). C'est le cœur de la belote et la source n°1 de divergences entre implémentations.

### E3 — Test faux : « gagner tous les plis » ≠ « marquer des points »
- **Quoi** : mon test « contrat réussi » donnait les 8 plis à l'équipe 0 avec des cartes
  bidon (7/8/9). Le test échouait sur `base[0] >= 82` : l'équipe marquait seulement **65**
  points en ayant tout raflé.
- **Pourquoi** : réflexe faux « plus de plis = plus de points ». En belote les points sont
  **concentrés** sur peu de cartes (V+9+A+10 d'atout = 55 à eux seuls). Rafler huit plis de
  petites cartes rapporte presque rien. Le code était juste ; c'est mon **test** qui modélisait
  mal une donne.
- **Comment corrigé** : réécriture du test avec une vraie répartition des 32 cartes (l'équipe 0
  rafle atouts hauts + as = 92 pts), en gardant ≥ 1 pli à l'équipe 1 (sinon c'est un capot, pas
  un contrat normal). 5/5 verts.
- **Meilleur prompt** : demander que **les tests utilisent de vraies distributions de cartes**
  (invariant 162 respecté), pas des plis fictifs. Et rappeler la règle métier « le nombre de
  plis ne détermine pas le score » — un piège classique quand on modélise un jeu de plis.

### E4 — Oubli : la carte retournée entre dans la décision de prise du tour 1
- **Quoi** : mon test « personne ne prend » utilisait le **Valet de cœur** comme carte
  retournée en pensant « couleur où personne n'a de force ». Résultat : un joueur prenait
  quand même, car le preneur du tour 1 **récupère la carte retournée** → mon heuristique
  l'ajoute à l'évaluation, et un Valet d'atout (6 pts de force) suffit à franchir le seuil.
- **Pourquoi** : oubli de la règle « au tour 1 on prend LA carte retournée, qu'on intègre à
  sa main ». J'évaluais bien la main + la retournée dans le code, mais pas dans ma tête en
  écrivant le test.
- **Comment corrigé** : test refait avec une retournée **basse** (8 de pique) et vérifié par
  script qu'aucun joueur n'atteint le seuil. 3/3 verts.
- **Meilleur prompt** : préciser la mécanique de l'enchère — « tour 1 : prendre la couleur
  retournée en récupérant la carte ; tour 2 : nommer une autre couleur ». Sans ça, on modélise
  l'enchère comme un simple choix de couleur et on oublie l'effet de la carte retournée.

### E5 — Oubli de périmètre : les ANNONCES (tierce / cinquante / carré) ne sont pas implémentées
- **Quoi** : la belote « standard » de beaucoup de tables compte aussi des **annonces** de
  combinaisons (suites de 3/4/5 cartes = 20/50/100, carré de valets = 200, etc.), déclarées au
  1er pli. Je ne les ai **pas** implémentées — seule la belote-rebelote (R+D d'atout) est gérée.
- **Pourquoi** : « belote classique » est ambigu — la version la plus dépouillée n'a que la
  belote-rebelote ; la version « avec annonces » est un sur-ensemble. J'ai réalisé l'omission
  seulement en écrivant le README, pas en codant → c'est un **oubli** qui aurait pu passer pour
  une implémentation « complète » sans ce constat.
- **Comment corrigé** : non corrigé (hors périmètre raisonnable d'un prototype), mais
  **documenté explicitement** dans le README et ici. Ne pas prétendre « belote complète ».
- **Meilleur prompt** : dire « belote SANS annonces, seule la belote-rebelote compte » OU
  « belote AVEC annonces (tierce/cinquante/cent/carré) ». La différence est ~150 lignes de code
  et une phase de jeu entière — un prompt qui dit juste « belote classique » laisse ça flou.

### E6 — Choix : auto-play IA vs jeu humain interactif
- **Quoi** : le CLI **auto-joue** une partie complète (4 IA légales) et l'affiche ; il n'y a
  **pas** de mode où un humain choisit ses cartes au clavier.
- **Pourquoi** : le prompt dit « jouable même en ligne de commande » — j'ai interprété
  « jouable » comme « une partie complète se déroule et se prouve », pas « un humain saisit
  chaque coup ». L'auto-play prouve la LOGIQUE (priorité affichée du prompt) et reste
  déterministe/testable ; un mode interactif ajoute de l'I/O stdin mais rien à la logique.
- **Comment corrigé** : choix assumé et documenté ; le moteur (`playTrick`/`legalMoves`) est
  déjà prêt pour brancher une saisie humaine (les coups légaux sont exposés).
- **Meilleur prompt** : préciser « jouable = un humain joue au clavier » vs « jouable = une
  partie se simule de bout en bout ». Deux livrables différents ; ici le second, plus prouvable.

### E7 — Piège UI évité : les `data-testid` des handles de note NE SONT PAS uniques
- **Quoi** : pour relier les jalons à la souris, il faut cliquer le handle droit d'un nœud
  puis le handle gauche du suivant. Or dans le builder, tous les handles de note partagent le
  même `data-testid` (`note-handle-right`, `note-handle-left`) — **8 nœuds → 8 éléments
  identiques**. Un `getByTestId("note-handle-right")` aurait visé le mauvais handle (ou levé
  une erreur de sélecteur ambigu).
- **Pourquoi** : le testid est posé par type de handle, pas par nœud. Anticipé en lisant le
  code du builder AVANT d'écrire le script (les handles portent aussi `data-handle-node={id}`
  et `data-handle-side={side}`).
- **Comment corrigé/évité** : sélection par attribut composite
  `[data-handle-node="<id>"][data-handle-side="right"]` → unique. Les 7 liaisons se sont
  tracées du premier coup (12/12 checks verts).
- **Meilleur prompt (méthode)** : pour toute construction pilotée par l'UT réelle, exiger
  « lire le code des composants ciblés avant d'automatiser, ne pas supposer que les testid
  sont uniques ». Cette lecture préalable a évité un échec silencieux (mauvais handle relié).

### E8 — Transparence : `__setSaveOwner("systeme")` est une commande d'UI, pas une injection de graphe
- **Quoi** : le prompt interdit « l'injection » pour poser les jalons. J'ai posé et relié les 8
  notes **100% à la souris** (aucun `window.__setGraph`). En revanche, pour taguer le
  propriétaire du calque à « systeme », j'ai appelé le setter d'UI `window.__setSaveOwner`.
- **Pourquoi** : le choix du propriétaire n'a pas d'affordance souris simple dans cette version
  du builder (c'est un état d'UI, pas un nœud de graphe). Le contenu du graphe (nœuds/edges),
  lui, n'a JAMAIS été injecté.
- **Ce que je documente** : la frontière « pas d'injection » a été respectée pour le graphe ;
  le seul appel programmatique est un réglage d'UI équivalent à cocher un espace de sauvegarde.
- **Meilleur prompt** : définir précisément le périmètre de « pas d'injection » (contenu du
  graphe uniquement ? ou aussi les réglages d'UI ?). Ici tranché et documenté ; sans ça, la
  règle est interprétable.

---

## Partie 2 — Méthode suivie (pour reproduction avec Qwen)

1. **Recon avant de coder** : lire `demo-server.ts` (API `/api/wireframes`, `/api/library`) et
   `builder.html` (palette `add-note`, champs inspecteur `note-title-field`/`note-text`,
   handles `data-handle-node`/`data-handle-side`, `__setSaveOwner`, `__layers`). Ne rien
   supposer sur l'UI — la lire.
2. **Construction module par module, test-first quand le risque est réel** : cartes → deal →
   règles → scoring → enchère → moteur → CLI. Chaque module a ses tests `node:test`.
3. **Wire Map alimenté EN DIRECT** : après CHAQUE module vert, `node tools/wm-feed.mjs` POST
   l'entrée réelle (fichier, commande, statut PASS) sur le projet `belote`. Jamais rétroactif.
4. **Journal tenu en continu** : une entrée par bug/oubli/choix, avec la leçon « meilleur prompt ».
5. **Calque Roadmap à la souris** : palette `＋ Note` ×8, édition inspecteur, glisser-déposer en
   grille, liaisons handle→handle, sauvegarde calque `systeme`, rechargement pour preuve.
6. **Étanchéité vérifiée** : Wire Maps llm-lego (13) et Chess TCG (7) relus intacts en fin de passe.

> Reproductibilité : tout est déterministe (seed RNG, tests, script Playwright headless). Un
> autre exécutant (Qwen) peut rejouer exactement les mêmes étapes et comparer bugs/oublis.

---

## Partie 3 — Vrai test de jeu (passe 2, Chantier A)

### E9 — Validation par VRAIES parties + auditeur de légalité INDÉPENDANT (aucun bug trouvé)
- **Quoi** : critique légitime de Pierre — la passe 1 ne « jouait » pas vraiment, elle exécutait
  une simulation. Passe 2 : `tools/real-play.mjs` joue 3 parties avec **mélange aléatoire réel**
  (`Math.random`, mains différentes à chaque partie) et audite CHAQUE coup avec un prédicat de
  légalité **réécrit indépendamment** (qui ne rappelle PAS `legalMoves`).
- **Résultat** : **576 coups audités, 0 violation**. Les obligations sont réellement exercées
  (pas vacuité) : **coupe obligatoire 62×**, surcoupe 15×, monter à l'atout 16×, fournir 224×,
  partenaire-libre 45×, défausse 61×. Recompte **manuel** des points d'une donne = 162, identique
  à `scoreDeal.base`. Le moteur `game.mjs` et le replay instrumenté donnent des scores
  **strictement identiques** sur les 3 parties. Toutes les parties vont jusqu'à leur fin.
- **Pas de nouveau bug** — mais cette fois la coupe obligatoire est prouvée sur des mains neuves,
  pas seulement sur le cas qui l'avait révélée (E1/passe 1). C'est la différence entre « le code
  s'exécute » et « les règles produisent un résultat cohérent ».
- **Meilleur prompt** : dès la passe 1, exiger un **auditeur indépendant** (prédicat de règles
  distinct du code testé) + un **recompte manuel** + des **mains aléatoires**. Un test qui
  réutilise la fonction testée pour se valider est circulaire ; l'audit indépendant est ce qui
  transforme « ça tourne » en « c'est correct ».

---

## Partie 4 — passe déploiement mobile (2026-07-19)

> Contexte différent des passes 1-3 : il ne s'agit plus de construire le moteur mais de le
> rendre installable et jouable sur le téléphone réel d'une joueuse (test terrain, pas oracle
> automatisé). Serveur Node existant exposé sur Render (`web/server.mjs`), manifeste PWA +
> service worker ajoutés pour l'installation écran d'accueil.

### E10 — Icônes SVG seules insuffisantes pour l'installabilité Chrome Android
- **Quoi** : premier manifeste avec uniquement une icône `image/svg+xml` (`sizes: "any"`).
  Chrome Android ne proposait que « Créer un raccourci » (lien simple, pas d'app standalone),
  jamais « Installer l'application ».
- **Pourquoi** : malgré le support théorique du SVG dans les manifestes, l'heuristique
  d'installabilité de Chrome sur Android est fiable seulement avec des icônes **PNG raster**
  (192×192 et 512×512).
- **Comment corrigé** : rasterisation de l'icône via Playwright headless (déjà présent comme
  devDependency du projet) → `assets/icon-192.png` / `icon-512.png`, référencées dans le
  manifeste avec `purpose: any` et `purpose: maskable`. Résultat confirmé par la joueuse : le
  menu propose maintenant « Installer l'application ».
- **Meilleur prompt** : pour toute PWA ciblant Android, exiger d'emblée des icônes PNG
  192/512 — ne pas se fier au support SVG même quand la spec l'autorise.

### E11 — Service worker cache-first : les mises à jour de l'appli restent invisibles
- **Quoi** : première version du service worker en stratégie **cache-first** pour la coquille
  statique (`caches.match(req).then(hit => hit || fetch(req))`). Après un premier déploiement,
  toute modification ultérieure de `index.html` restait invisible sur les appareils ayant déjà
  visité le site — y compris **pendant mes propres tests locaux**, où j'ai perdu du temps à
  chercher un bug de CSS qui n'existait pas (le fichier servi n'était simplement pas le bon).
- **Pourquoi** : `caches.match` sert toujours l'entrée en cache si elle existe, sans jamais
  revalider contre le réseau, et le service worker ne se met à jour que si son propre script
  (`sw.js`) change — pas si `index.html` change. Piège classique des PWA en développement actif.
- **Comment corrigé** : stratégie inversée en **réseau-d'abord** pour la coquille (fetch réseau,
  mise à jour du cache à la volée, fallback cache seulement si le réseau échoue = hors-ligne).
  Version de cache bumpée (`v2` → `v3`) pour purger l'ancien cache déjà posé sur les appareils.
- **Meilleur prompt** : pour un projet en itération active (pas un livrable figé), préciser
  « service worker réseau-d'abord, pas cache-first » dès le départ — le cache-first est correct
  seulement pour un contenu qui ne bougera plus.

### E12 — Barre de geste Android : hors du périmètre corrigeable
- **Quoi** : la joueuse signale que la bande de navigation Android (bas d'écran, geste retour)
  reste active pendant le jeu et déclenche des retours involontaires en essayant de jouer une
  carte (glissé vers le bas de l'éventail proche du bord de l'écran).
- **Pourquoi** : cette bande appartient au système d'exploitation, pas à l'application. Android
  la garde volontairement accessible en permanence (sécurité de navigation), même pour les
  applications natives en plein écran — aucune API web (PWA installée, pas TWA packagée) ne
  permet de la supprimer durablement.
- **Comment corrigé** : **non corrigé, hors périmètre** — décision explicite de la joueuse
  (« si tu n'as pas de fix on reste comme ça ») plutôt que de proposer un correctif partiel
  (fullscreen en haut d'écran seulement, qui ne réglait pas la gêne réelle en bas d'écran).
- **Meilleur prompt** : pour une appli à gestes proches du bord d'écran (glisser une carte, un
  panneau, etc.), prévoir une marge de sécurité tactile en bas de zone interactive dès la
  conception — ou documenter clairement que la zone système reste hors de portée de l'appli.
