---
styles: [flat-vector-ui, warm-tactile-illustration, soft-glow-vfx]
mood_keywords: [cozy, tactile, escalating, legible, satisfying, warm, uncluttered, incremental]
---

# Art Bible — p2_beta (incremental / clicker, free-design, HTML/2D) · v0.1

> Runtime hérité : `html` / `2D` (profil de run `full_content` + toutes les références du World Scan sont des incrementals web — Cookie Clicker, Kittens Game, Clicker Heroes, Universal Paperclips). La valeur `plateforme_cible` du charter n'est PAS matérialisée dans l'entrée reçue (le charter transmis est un rapport de retour s0, pas ses champs de design-intent) — cette dérivation est donc portée en **fog** et remontée en `## world_constraints` + question `q_art_003`.
> Sujet/thème de production : **NON défini** à ce stade (Story Bible 6/8 sections `NOT_GROUNDED`, la STRUCTURE est déléguée à l'aval par le charter). Cette bible DÉCIDE une identité visuelle **agnostique au thème** et remonte le thème comme question bloquante `q_art_001` au Game Master — elle n'invente aucune matière déléguée.

## 1. IDENTITÉ VISUELLE

Un incremental web **propre, chaleureux et lisible** dont le vrai héros visuel est **le nombre qui grandit**. Interface d'abord (UI-forward), fond calme, chiffres imposants, une seule cible de clic centrale, chaude et tactile, que l'œil trouve en une fraction de seconde.

**Palette DÉCIDÉE (hex fermes, agnostique au thème)** :
- Fond profond chaud : `#1E1B18` · panneaux : `#2A2622` · séparateurs : `#3A342E`
- Accent production / valeur (positif) : ambre `#F5A623` · monnaie : miel `#FFCE54`
- Affordance « cliquable » (contraste froid volontaire pour ressortir du champ chaud) : sarcelle `#3BB6A6`
- Jalon / palier / méta : violet `#8E6FE0`
- Alerte / coût non payable / reset : corail `#E8604C`
- Texte : blanc cassé chaud `#F3ECE2` · secondaire discret `#A79E92`

**Typographie** : une famille sans-serif géométrique lisible ; **les chiffres de total sont la plus grande chose à l'écran** (poids fort, tabular-nums pour un alignement stable pendant l'escalade). Iconographie **vectorielle plate**, silhouettes pleines et rondes, ombres douces courtes.

Le champ reste volontairement **sobre** : la satisfaction vient de l'escalade numérique et du feedback de clic, pas d'un décor bruyant.

## 2. RATIONALE

Chaque choix ci-dessus est **hérité** d'une convention mesurée du genre puis **traduit** en règle d'asset vérifiable (section `## 3` + `asset_requests.json`) — jamais affirmé seulement en prose. La couverture des besoins n'est PAS revendiquée ici : elle est **démontrée par la donnée structurée** de la section BESOINS VISUELS et le fichier `asset_requests.json` (une request par entité `required:true`), seule matière que l'oracle `check_artbible.mjs` lit réellement.

- **Le nombre-héros** répond à la rétention dominante du genre — l'escalade numérique et les petites récompenses fréquentes (`worldscan:games[0].retention_answer` : « numerical escalation fantasy 1 → 1 trillion » + « golden cookies every 30-60s »). D'où le total surdimensionné et le jeton de bonus transitoire.
- **La cible de clic centrale, chaude et unique** répond à la boucle d'entrée universelle (`worldscan:games[0].loops.minute_1`, `worldscan:games[2].loops.minute_1` : cliquer → 1 unité) et au « satisfying click feedback » (`worldscan:games[2].retention_answer`) → VFX de clic dédié.
- **Le contraste froid de l'affordance** (sarcelle sur champ ambre) rend la boucle « afford → buy → unlock » lisible instantanément (`worldscan:games[0].loops.minute_10` : posséder 3-5 bâtiments, coût exponentiel) → boutons d'achat à états + icônes de générateurs/upgrades.
- **L'écran de fin observable et le jalon de progression** sont une DÉCISION divergente : le charter impose une **fin observable et une solvabilité bornée (≤ 72000 ticks)** (`story_bible:coherence_rules`), contrairement à l'endlessness canonique du genre (`worldscan:games[0].objectives[0].has_win_state` = false) — le seul point d'appui interne du genre pour une fin **conçue** est Universal Paperclips (`worldscan:games[3].objectives[0].victory_condition`). Il faut donc un indicateur de progression-vers-la-fin et un écran de victoire, absents d'un clicker sans fin.
- **La palette non verrouillée au thème** est une DÉCISION honnête : le sujet de production est indéfini (`story_bible:context`, `story_bible:characters` `NOT_GROUNDED`). L'ambre/miel lit « valeur / accumulation » pour presque n'importe quel sujet ; la teinte thématique se re-skinnera sans refonte une fois `q_art_001` tranchée par le GM. Le chrome UI ne doit donc porter **aucune teinte thématique en dur**.

## 3. BESOINS VISUELS

Entités visuelles distinctes du jeu, par RÔLE (agnostiques au thème — l'apparence concrète de la cible de clic, des générateurs et du jeton dépend du sujet, question `q_art_001`). `required:true` pour toute entité citée par une source héritée ou centrale à la boucle/à la condition de fin ; `required:false` réservé au décor purement cosmétique.

```json
{
  "visual_requirements": [
    { "id": "vr_click_target", "entity_role": "other", "required": true, "description": "Cible de clic centrale et unique : l'objet de production principal que le joueur presse pour gagner 1 unité par clic. Élément le plus grand, le plus chaud, centré. États idle / pressed / évolué-au-palier. Boucle d'entrée du genre (worldscan:games[0].loops.minute_1)." },
    { "id": "vr_resource_counter", "entity_role": "ui", "required": true, "description": "Afficheur du total courant (le nombre-héros) : plaque/cadre supportant un chiffre surdimensionné, tabular-nums, avec le symbole de monnaie. Répond à l'escalade numérique (worldscan:games[0].retention_answer)." },
    { "id": "vr_generator_icon", "entity_role": "item", "required": true, "description": "Icône/illustration d'un générateur passif achetable (les 'bâtiments/héros' du genre). Une famille visuelle réutilisable pour N générateurs de coût croissant. États locked / affordable / owned. Central à minute_10 (worldscan:games[0].loops.minute_10)." },
    { "id": "vr_upgrade_icon", "entity_role": "icon", "required": true, "description": "Tuile d'upgrade (améliorations ponctuelles qui multiplient une production). Glyphe vectoriel plat lisible en petit, distinct des générateurs. Visible dès les premières minutes (worldscan:games[2].loops.minute_10)." },
    { "id": "vr_buy_button", "entity_role": "ui", "required": true, "description": "Bouton d'achat à TROIS états explicites : idle (sarcelle plein, cliquable), hover, disabled (désaturé, coût en corail quand non payable). Porte l'affordance 'afford -> buy' de la boucle centrale." },
    { "id": "vr_currency_symbol", "entity_role": "icon", "required": true, "description": "Glyphe de la monnaie de production, agnostique au thème (re-skinnable). Utilisé partout où un nombre est montré (compteur, coûts, gains). Lisible à 16px." },
    { "id": "vr_click_feedback_vfx", "entity_role": "effect", "required": true, "description": "Feedback visuel de chaque clic : nombre flottant '+N' qui monte et s'estompe + petite gerbe de particules chaudes. Réponse directe au 'satisfying click feedback' (worldscan:games[2].retention_answer)." },
    { "id": "vr_transient_bonus_token", "entity_role": "collectible", "required": true, "description": "Jeton de bonus transitoire (analogue du 'golden cookie') apparaissant à intervalle, ramassable pour une petite récompense temporaire. Récompenses fréquentes = pilier de rétention (worldscan:games[0].retention_answer)." },
    { "id": "vr_progress_end_indicator", "entity_role": "ui", "required": true, "description": "Indicateur de progression vers la FIN observable : jauge/objectif visible mesurant l'avancée vers la condition de fin bornée. Élément DÉCIDÉ imposé par le charter (story_bible:coherence_rules, fin observable <= 72000 ticks), absent d'un clicker endless." },
    { "id": "vr_victory_screen", "entity_role": "ui", "required": true, "description": "Écran d'état de fin (victoire / objectif atteint) : plaque plein-écran célébrant l'atteinte de la fin observable. Requis par la divergence 'fin conçue' du charter (appui interne au genre : worldscan:games[3].objectives[0].victory_condition)." },
    { "id": "vr_background", "entity_role": "environment", "required": true, "description": "Fond de la surface de jeu principale : champ chaud sombre, calme, non bruyant, garantissant le contraste de lisibilité des chiffres et des panneaux. Toute la surface visuelle = ma responsabilité de lisibilité/mood." },
    { "id": "vr_ambient_decor", "entity_role": "effect", "required": false, "description": "Motes/particules d'ambiance lentes en fond, purement cosmétiques (chaleur). Aucune fonction de gameplay ni de lisibilité — d'où required:false ; pas de request produite, décision assumée." }
  ]
}
```

## heritage_worldscan

Matière HÉRITÉE du World Scan (advisory) — conventions du genre et attentes joueur, citées à leurs adresses, jamais réinventées :

- **Boucle d'entrée = clic → 1 unité, puis génération passive achetée** : `worldscan:games[0].loops.minute_1` (« Click cookie for 1 cookie. Discover first building ») et `worldscan:games[2].loops.minute_1` (« Click monster for 1 damage … First hero purchased »). ⇒ impose une cible de clic centrale (`vr_click_target`) et un feedback de clic (`vr_click_feedback_vfx`).
- **Escalade numérique = héros de rétention** : `worldscan:games[0].retention_answer` (« numerical escalation fantasy 1 → 1 trillion » + « frequent small rewards (golden cookies every 30-60s) »). ⇒ compteur surdimensionné (`vr_resource_counter`) + jeton transitoire (`vr_transient_bonus_token`).
- **Coût exponentiel, possession de multiples générateurs** : `worldscan:games[0].loops.minute_10` (« Own 3-5 buildings … cost-scale exponentially ~15% ») et `worldscan:games[1].loops.minute_10` (visibilité de ressource/stockage). ⇒ famille de générateurs (`vr_generator_icon`) + boutons d'achat à états (`vr_buy_button`) + upgrades (`vr_upgrade_icon`).
- **Feedback de clic satisfaisant = attente explicite du joueur** : `worldscan:games[2].retention_answer` (« Satisfying click feedback + monster defeat animations »). ⇒ `vr_click_feedback_vfx`.
- **Une fin CONÇUE est possible dans le genre (rare)** : `worldscan:games[3].loops.endgame` (« Both paths are designed endings ») et `worldscan:games[3].objectives[0].victory_condition` (choix final stage 4). Contraste : `worldscan:games[0].objectives[0].has_win_state` = false (Cookie Clicker n'a aucun état de victoire). ⇒ appui interne au genre pour l'écran de fin décidé (`vr_victory_screen`, `vr_progress_end_indicator`).

## heritage_story_bible

Matière HÉRITÉE de la Story Bible — honnête sur ce qu'elle NE fournit pas :

- **Genre et cadre** : `story_bible:context` — « p2_beta relève du genre incremental/clicker en conception libre » et « l'univers reste indéfini à ce stade ; la STRUCTURE est déléguée à l'aval ». ⇒ justifie une identité visuelle **agnostique au thème** et la question `q_art_001`.
- **Règles de cohérence (contraignent le visuel)** : `story_bible:coherence_rules` — « la narration doit rester compatible avec une expérience qui se CONCLUT : fin observable, solvabilité bornée (≤ 72000 ticks) » et « toute matière ajoutée en aval doit être ancrée, jamais fabriquée ». ⇒ impose `vr_progress_end_indicator` + `vr_victory_screen`, et m'INTERDIT d'inventer un thème (d'où la question au GM plutôt qu'une invention).
- **Ce qui manque, nommé** : `story_bible:characters`, `story_bible:factions`, `story_bible:events` sont `NOT_GROUNDED` — aucun personnage, faction ni événement du monde n'est fourni. ⇒ l'apparence CONCRÈTE (motif de la cible de clic, illustrations des générateurs, forme du jeton) reste une **question ouverte** portée par `q_art_001`, pas un vide comblé au juge.

## visual_language

DÉCIDÉ (aucune adresse héritée exigée) : vectoriel plat, silhouettes pleines et rondes, ombres douces courtes (pas de dégradés lourds ni de skeuomorphisme). Trois familles de style, une par nature d'entité : `flat-vector-ui` pour le chrome (compteur, boutons, upgrades, jauge, monnaie, écran de fin), `warm-tactile-illustration` pour les objets illustrés (cible de clic, générateurs, jeton, fond), `soft-glow-vfx` pour les effets. Hiérarchie stricte : total > cible de clic > panneaux d'achat > upgrades > décor. Le fond ne rivalise jamais avec les chiffres.

## affordance_rules

DÉCIDÉ : le cliquable se lit à trois signaux redondants (jamais la teinte seule) — **couleur** (sarcelle `#3BB6A6`), **luminosité** (plein vs désaturé), **forme** (léger relief/ombre + micro-pulsation au repos sur la cible principale). Payable = plein contraste ; non payable = désaturé + coût en corail `#E8604C`. La cible de clic centrale est toujours l'élément le plus grand, le plus chaud et centré, pour être trouvée sans recherche. Le hover accentue l'ombre, pas la teinte, pour ne pas casser le code couleur.

## character_states

DÉCIDÉ (l'incremental n'a pas de « personnages » ; les porteurs d'état sont les objets de production) :
- **Cible de clic** : `idle` (respire doucement) → `pressed` (enfoncée, gerbe de particules) → `milestone` (évolution visuelle à un palier franchi, récompense d'escalade).
- **Générateur** : `locked` (silhouette grisée, coût visible) → `affordable` (colorisé, bouton d'achat actif) → `owned` (badge de compte) → `saturated` (cap éventuel atteint, teinté violet jalon).
- **Bouton d'achat** : `idle` / `hover` / `disabled`, cf. `## affordance_rules`.

## ui_readability

DÉCIDÉ : nombres abrégés au-delà de 1e3 (`1.00K`, `1.00M`, `1.00B`, `1.00T`…) pour garder une largeur bornée pendant l'escalade ; `tabular-nums` pour un alignement stable. Contraste texte/fond visé ≥ 4.5:1 (blanc cassé sur champ profond). Total = plus grand élément (au moins 2× la taille de tout autre texte). Panneaux séparés par des séparateurs `#3A342E`, jamais par la seule couleur. Code d'affordance **colorblind-safe** : luminosité + forme portent l'information en plus de la teinte (cf. `## affordance_rules`).

## world_constraints

DÉCIDÉ + fogs nommés :
- **Runtime `html` / format `2D`** — dérivé (profil `full_content` + références World Scan 100 % web) ; la valeur `plateforme_cible` du charter n'est PAS matérialisée dans l'entrée reçue ⇒ **fog**, confirmation demandée en `q_art_003`. Toutes les `constraints` des requests portent `format:"2D"`, `runtime:"html"` sous cette hypothèse.
- **Vectoriel plat** choisi pour rester net à toute résolution de navigateur ; pas de contrainte power-of-two (web).
- **Palette re-skinnable** : aucune teinte thématique en dur dans le chrome (cf. `## asset_rules`) — le sujet indéfini (`q_art_001`) doit pouvoir être appliqué sans refonte.
- **Fin observable requise** : la surface doit réserver la place d'une jauge de fin et d'un écran de victoire (`story_bible:coherence_rules`).
- **Portée du prestige/reset = question ouverte** `q_art_002` : le genre s'appuie massivement sur des cycles de prestige (`worldscan:games[0].retention_answer`, `worldscan:games[2].retention_answer`), mais le charter impose une fin bornée. Tant que le GM n'a pas tranché, **aucune entité de prestige n'est déclarée** (ni `required:true` — je ne l'invente pas, ni `required:false` — je ne préempte pas la structure) : elle est portée en question, pas en asset.

## asset_rules

DÉCIDÉ : un `entity_role` ⇒ une famille de style unique (cf. frontmatter `styles`) ; les états d'une entité sont livrés ensemble (ex. bouton = 3 états dans un même lot). Formats préférés : SVG vectoriel, sinon PNG plat à fond transparent. Licences acceptées : `CC0-1.0`, `MIT`, `CC-BY-4.0`, `CC-BY-3.0` (allowlist du studio). Nommage : `p2beta_<entity_role>_<id>_<state>`. Le chrome UI ne porte **aucune teinte thématique en dur** (re-skin par `q_art_001`). Aucune génération ni téléchargement d'asset ici : les requests **résolvent dans l'existant** du catalogue ou remontent `BLOCKED` (advisory) → HumanGate pour sourcing.
