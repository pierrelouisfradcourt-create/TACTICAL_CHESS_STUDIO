---
styles: [neon-lattice, flat-vector-ui]
mood_keywords: [luminous, abstract, escalating, clean, satisfying, exponential, calm-then-electric]
---

# Art Bible — p3_beta (v0.1)

Jeu web incremental/clicker, plateforme web HTML+JS canvas. Identité visuelle
HÉRITÉE (World Scan s2 + Story Bible s2.6) et DÉCIDÉE (cette étape). Aucune reprise
de contenu, nom, asset ou valeur de Cookie Clicker — la référence n'est qu'une
grammaire de genre (story_bible:coherence_rules).

## 1. IDENTITÉ VISUELLE

Le jeu est une **économie abstraite de résonance lumineuse** : le joueur excite un
**noyau émetteur** central au clic, qui libère des **motes** (la ressource). Des
**résonateurs** (générateurs passifs) achetés avec les motes se mettent à vibrer seuls
et alimentent une croissance exponentielle jusqu'à la **saturation du treillis**
(condition de fin observable). Aucun personnage, aucune faction, aucun décor narratif :
la Story Bible est volontairement presque vide (6/8 sections NOT_GROUNDED), et l'identité
retenue épouse cette abstraction plutôt que d'inventer un univers.

Registre visuel : géométrie lumineuse (halos, dégradés radiaux, traits fins) sur fond
sombre profond, ponctuée d'accents énergétiques saturés. La montée en puissance se lit
à l'écran par **plus de lumière, plus de densité, plus de mouvement** — jamais par du
texte seul. Deux familles de style cohabitent, séparées par fonction :

- **neon-lattice** — les entités de jeu vivantes (noyau, motes, résonateurs, éclats de
  déblocage) : glow, énergie, échelle croissante.
- **flat-vector-ui** — l'habillage fonctionnel (panneau HUD, boutons d'achat, bannière
  de fin, icônes d'amélioration) : vecteur plat, haut contraste, lisible à froid.

Palette de référence (décidée) : fond `#0B0E1A` (nuit profonde) → `#131A33`
(bleu-nuit) ; ressource/motes cyan-électrique `#38E1FF` → blanc `#EAF6FF` au pic ;
résonateurs par paliers en teintes chaudes ascendantes (ambre `#FFB43C` → magenta
`#FF4FA3` → violet-plasma `#B24CFF`) ; UI neutre froide `#8FA3C8` sur cartes
`#1B2444`, actif/positif vert-menthe `#3CF0B0`, indisponible/verrouillé gris désaturé
`#48506B`. Le fond reste sombre pour que la lumière accumulée soit l'indicateur premier
de progression.

## 2. RATIONALE

Le choix d'une abstraction lumineuse non-figurative découle directement des sources :

- **World Scan** (worldscan:games[0].retention_answer) : la rétention du genre repose
  sur une « progression visible et exponentielle » et une « sensation de puissance
  croissante ». Une identité où **la lumière accumulée EST la jauge de puissance** rend
  cette sensation directement perceptible sans instrumentation textuelle.
- **World Scan** (worldscan:games[0].loops.minute_1) : le genre exige un feedback de
  clic immédiat (« +1 animé, compteur qui s'incrémente »). Les motes cyan qui jaillissent
  du noyau à chaque clic matérialisent ce feedback (voir affordance_rules).
- **Story Bible** (story_bible:context) : le cadre est « une économie abstraite
  d'accumulation exponentielle d'une ressource », sans univers narratif. Inventer des
  personnages ou un décor thématique serait une fabrication — l'identité abstraite est
  la seule honnête vis-à-vis des 6 sections NOT_GROUNDED.
- **Story Bible** (story_bible:coherence_rules) : interdiction stricte de reprendre le
  contenu de Cookie Clicker. Le catalogue local ne propose en HTML que du Kenney
  `flat-top-down` (personnages humains/zombie) et un pack `candy-pop` (bonbons + éclats
  roses) tagué genre `shooter` : thème confiserie **écarté volontairement** car trop
  proche de la grammaire alimentaire de la référence interdite. D'où une identité
  inventée, distincte, sans nourriture.

Conséquence de couverture : les entités visuelles ci-dessous (section 3) sont toutes
tranchées par des `asset_request` structurées (asset_requests.json) — aucune couverture
n'est affirmée en prose sans requête correspondante. Le style demandé (`neon-lattice` /
`flat-vector-ui`) n'existe pas encore dans le catalogue : la résolution mécanique
rapportera BLOCKED-justifié (catalogue incomplet, advisory), ce qui oriente le build
vers un **rendu canvas procédural** (dégradés, halos, formes) — natif pour une identité
lumineuse abstraite — ou vers un sourcing HumanGate. Ce BLOCKED de résolution n'est pas
un défaut de contrat (cf. asset_rules).

## 3. BESOINS VISUELS

Inventaire de CHAQUE entité visuelle distincte. `required:true` = citée par une source
héritée ou centrale à une condition de démo/fin ; `required:false` = décor réellement
cosmétique. En cas de doute : `required:true`.

```json
{
  "visual_requirements": [
    {
      "id": "core_emitter",
      "entity_role": "item",
      "required": true,
      "description": "Noyau emetteur central, seul objet cliquable de la boucle primaire. Grand, lumineux, occupant le centre de l'ecran. Reagit au clic (pulse) et libere une mote. Cite par worldscan:games[0].loops.minute_1 (Click X -> gain 1/click) et charter criteres_demo #1 (le joueur agit, le compteur augmente)."
    },
    {
      "id": "resource_mote",
      "entity_role": "icon",
      "required": true,
      "description": "Mote de ressource : le jeton lumineux cyan qui jaillit du noyau au clic (+N flottant) ET le symbole affiche a cote du compteur du HUD. Rend visible la ressource exigee par charter criteres_demo #1 et worldscan:games[0].loops.minute_1 (feedback +1 anime, compteur)."
    },
    {
      "id": "resonator_t1",
      "entity_role": "item",
      "required": true,
      "description": "Resonateur de palier 1 : premier generateur passif achetable, produit des motes de lui-meme a l'ecran. Petite echelle, teinte ambre. Central a charter criteres_demo #3 (progression sans action continue) et worldscan:games[0].loops.minute_10 (revenu passif des premiers generateurs)."
    },
    {
      "id": "resonator_t2",
      "entity_role": "item",
      "required": true,
      "description": "Resonateur de palier 2 : generateur intermediaire, visuellement plus dense et plus lumineux que le palier 1, teinte magenta. Materialise l'escalade des generateurs citee par worldscan:games[0].loops.hour_5 (10+ buildings, progression exponentielle)."
    },
    {
      "id": "resonator_t3",
      "entity_role": "item",
      "required": true,
      "description": "Resonateur de palier 3 : generateur avance, silhouette la plus complexe et la plus energetique, teinte violet-plasma. Sommet de l'echelle de generateurs (worldscan:games[0].loops.hour_5). Distinct des paliers 1 et 2 : requete propre, pas une variante generique."
    },
    {
      "id": "upgrade_icon",
      "entity_role": "icon",
      "required": true,
      "description": "Icone d'amelioration/multiplicateur affichee dans le panneau d'achat (vecteur plat, haut contraste). Rend achetables les upgrades citees par worldscan:games[0].loops.minute_10 (Upgrades appear, purchased with passive income)."
    },
    {
      "id": "unlock_reveal_fx",
      "entity_role": "effect",
      "required": true,
      "description": "Eclat de deblocage : burst lumineux joue quand un nouvel element (bouton, resonateur, section) apparait au franchissement d'un seuil. Rend OBSERVABLE le deblocage exige par charter criteres_demo #2 et worldscan:games[0].loops.hour_5 (New buildings unlock every threshold)."
    },
    {
      "id": "hud_panel",
      "entity_role": "ui",
      "required": true,
      "description": "Panneau/cadre du HUD qui heberge le compteur de ressource, les taux de production et la liste d'achats. Vecteur plat lisible a froid. Support de charter criteres_demo #1 (compteur visible a l'ecran)."
    },
    {
      "id": "buy_button",
      "entity_role": "ui",
      "required": true,
      "description": "Bouton d'achat d'un resonateur ou d'une amelioration, avec ses etats (disponible / trop cher / achete). Porte l'interaction d'achat qui alimente la progression (worldscan:games[0].loops.minute_10)."
    },
    {
      "id": "end_banner",
      "entity_role": "ui",
      "required": true,
      "description": "Banniere/ecran de FIN DE PARTIE affiche quand le treillis atteint la saturation (condition de fin observable). Exige par charter criteres_demo #4. Diverge volontairement de worldscan:games[0].objectives (mode idle sans win-state) : le charter impose une fin observable, l'identite doit donc la porter."
    },
    {
      "id": "ambient_background",
      "entity_role": "environment",
      "required": false,
      "description": "Fond ambiant sombre (degrade nuit profonde, particules tres discretes). Purement cosmetique : n'entre dans aucune condition de demo/fin ni de score. Rendu procedural canvas suffisant ; aucune requete d'asset produite (required:false assume)."
    }
  ]
}
```

## heritage_worldscan

Matière HÉRITÉE du World Scan (advisory, s2). La grammaire de genre pertinente est
Cookie Clicker (worldscan:games[0]) — Hades et Slay the Spire (games[1], games[2]) sont
d'autres genres, non hérités ici.

- **Feedback de clic immédiat** (worldscan:games[0].loops.minute_1) : « Click cookie ->
  gain 1/click. Immediate feedback: +1 cookie animated, click sound, counter increments. »
  → traduit en : noyau émetteur + mote flottante + compteur HUD.
- **Générateurs passifs et paliers** (worldscan:games[0].loops.minute_10) : « X = 1/sec
  passive income. Purchase [generators]. Upgrades appear, purchased with passive income. »
  → traduit en : résonateurs t1/t2/t3 + icône d'amélioration.
- **Escalade et déblocages par seuil** (worldscan:games[0].loops.hour_5) : « 10+ buildings
  active. New buildings unlock every [threshold]. Exponential progression sensation. »
  → traduit en : éclat de déblocage (unlock_reveal_fx) + escalade chromatique des paliers.
- **Rétention par puissance croissante visible** (worldscan:games[0].retention_answer) :
  « Progression visible and exponential [...] sensation of growing power. »
  → traduit en : la lumière accumulée sur fond sombre EST la jauge de puissance.
- **Objectif du genre = idle sans win-state** (worldscan:games[0].objectives) : « mode
  idle, has_win_state:false ». → NON hérité tel quel : le charter (criteres_demo #4)
  impose une fin observable ; l'identité porte donc une bannière de fin (end_banner),
  divergence assumée et tracée.

## heritage_story_bible

Matière HÉRITÉE de la Story Bible (s2.6). Seules 2 des 8 sections sont GROUNDED ; les 6
autres sont NOT_GROUNDED — cette pauvreté narrative est elle-même une contrainte héritée.

- **Cadre abstrait** (story_bible:context) : « jeu web incremental/clicker [...] economie
  abstraite d'accumulation exponentielle d'une ressource (clic vers ressource, puis
  generateurs passifs, puis croissance) [...] pas nomme comme un univers narratif. »
  → fonde l'identité non-figurative : ressource = motes, générateurs = résonateurs.
- **Interdit de reprise** (story_bible:coherence_rules) : « Aucun nom, asset, contenu ni
  valeur numerique de Cookie Clicker ne peut apparaitre [...] la reference n'est qu'une
  grammaire de genre. » → écarte tout thème confiserie/nourriture ; impose une invention.
- **Genre figé, structure inventée** (story_bible:coherence_rules) : « Le cadre reste fixe
  au genre incremental/clicker [...] La structure est entierement inventee par la chaine. »
  → l'Art Director invente le style, jamais le genre.
- **Absence de personnages/factions/événements** (story_bible:characters / factions /
  events, tous NOT_GROUNDED) : « aucun personnage n'est nomme [...] le seul acteur est un
  joueur non personnifie. » → aucune requête de personnage/PNJ/boss ; character_states
  décrit les états des entités abstraites, pas d'êtres narratifs.

## visual_language

DÉCIDÉ. Grammaire visuelle réelle du jeu.

- **Composition** : noyau émetteur au centre géométrique, HUD ancré à droite/haut,
  résonateurs disposés en couronne ou colonne autour du noyau. Le regard va du centre
  (action) vers la périphérie (production).
- **Lumière = valeur** : l'intensité lumineuse totale à l'écran croît avec la ressource
  et le nombre de résonateurs actifs. Fond sombre constant pour maximiser le contraste
  de la lumière accumulée.
- **Échelle chromatique des paliers** : ambre (t1) → magenta (t2) → violet-plasma (t3).
  La teinte encode le palier ; la taille et la densité de glow encodent la puissance.
- **Traits** : géométrie fine, halos radiaux doux, pas de texture figurative. Mouvement
  privilégié aux détails statiques (pulses, dérives lentes de motes).
- **Deux registres séparés** : `neon-lattice` pour tout ce qui « vit » (jeu), 
  `flat-vector-ui` pour tout ce qui « informe » (interface). Jamais de glow sur le texte
  fonctionnel (lisibilité, voir ui_readability).

## affordance_rules

DÉCIDÉ. Ce qui doit se lire sans explication.

- **Cliquable** : le noyau émetteur a un halo pulsant lent au repos ; au survol il
  s'intensifie ; au clic il « respire » (compression + burst de motes). Aucun autre
  élément de jeu ne pulse — le pulse EST le signal de cliquabilité.
- **Achetable vs verrouillé** : un `buy_button` disponible est saturé (vert-menthe) ;
  trop cher = grisé désaturé mais visible ; verrouillé (seuil non atteint) = absent puis
  révélé par unlock_reveal_fx. On ne montre jamais un prix sans montrer s'il est payable.
- **Production passive** : un résonateur actif émet des motes de lui-même à cadence
  régulière — la production est vue, pas seulement chiffrée (charter criteres_demo #3).
- **Progression** : chaque franchissement de seuil déclenche un éclat (unlock_reveal_fx)
  à l'endroit exact du nouvel élément, pour que le déblocage soit localisé et observable.

## character_states

DÉCIDÉ. Aucun personnage narratif (story_bible:characters NOT_GROUNDED) : cette section
décrit les ÉTATS des entités abstraites vivantes.

- **core_emitter** : `idle` (halo lent) · `hover` (halo intensifié) · `pressed` (burst +
  compression) · `charged` (halo maximal quand la ressource est abondante).
- **resonator_tN** : `dormant` (silhouette froide, avant achat/aperçu) · `active`
  (vibration + émission périodique) · `boosted` (glow renforcé sous multiplicateur).
- **resource_mote** : `spawned` (jaillissement) · `drifting` (dérive vers le compteur) ·
  `absorbed` (fondu dans le HUD + incrément).
- **end state** : `saturation` — toutes les entités passent en blanc-électrique figé
  sous la bannière de fin (end_banner), signal terminal non ambigu.

## ui_readability

DÉCIDÉ. Le HUD doit rester lisible à froid, sur fond lumineux mouvant.

- Texte fonctionnel en `flat-vector-ui` : sans-serif géométrique, poids moyen, couleur
  froide claire `#EAF6FF` sur cartes `#1B2444` — jamais de glow ni de dégradé sur les
  chiffres (un compteur illisible casse charter criteres_demo #1).
- Contraste minimum visé WCAG AA (≥ 4.5:1) pour tout texte de valeur (compteur, taux,
  prix). Le fond sombre garantit le contraste des chiffres clairs.
- Le compteur de ressource est l'élément le plus grand du HUD, ancré, toujours visible.
- États d'achat distingués par couleur ET par forme (bord plein vs pointillé), jamais
  par la couleur seule (accessibilité daltonienne).
- La bannière de fin occupe le centre, assombrit le reste (overlay) pour être non
  manquable.

## world_constraints

DÉCIDÉ. Contraintes de production et de plateforme.

- **Plateforme** : web HTML + JS canvas (charter plateforme_cible) — tout asset doit être
  2D, runtime `html`. Aucun asset 3D, aucun runtime godot.
- **Rendu procédural privilégié** : l'identité lumineuse abstraite se peint nativement au
  canvas (dégradés radiaux, halos, formes) sans dépendre d'un sprite externe — voie
  primaire attendue vu que le catalogue n'offre pas le style demandé.
- **Aucun octet réseau** : aucune ingestion/téléchargement d'asset dans cette étape
  (out_of_scope). Toute admission d'un nouvel asset au catalogue reste une gate Pierre.
- **Licences** : si un asset externe est un jour sourcé, licence ∈ {CC0-1.0, MIT,
  CC-BY-4.0, CC-BY-3.0} (ASSET_LICENSES) — laissé au défaut dans les requêtes.
- **Interdit de contenu** : aucune reprise de nom/asset/valeur de Cookie Clicker
  (story_bible:coherence_rules) ; thème nourriture/confiserie proscrit.

## asset_rules

DÉCIDÉ. Règles de production et de résolution des assets.

- **Une requête par entité `required:true`** (10 requêtes, asset_requests.json) — jamais
  une requête générique censée couvrir plusieurs entités distinctes. Les 3 paliers de
  résonateur ont chacun leur requête (distincts, pas des variantes).
- **`ambient_background` (`required:false`)** : aucune requête — décor procédural, décision
  assumée.
- **Style déclaré = style demandé** : chaque requête porte `neon-lattice` ou
  `flat-vector-ui`, tous deux déclarés au frontmatter (cohérence bible ↔ requêtes).
- **Résolution advisory** : le style demandé n'existant pas dans le catalogue actuel, les
  requêtes résolvent BLOCKED (catalogue incomplet) — résultat LÉGITIME rapporté tel quel,
  jamais contourné en assouplissant les constraints (garde-fou anti-gaming). Ce BLOCKED de
  résolution est distinct d'un MISSING_ASSET_COVERAGE (qui, lui, serait un oubli à corriger).
- **Pas de jugement esthétique** : `style_tag_match` compare des tags, pas des pixels — la
  conformité esthétique reste un fog HumanGate, jamais un claim de cette étape.
