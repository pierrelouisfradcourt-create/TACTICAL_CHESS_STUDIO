---
styles: [flat-vector-ui, warm-tactile-illustration, soft-glow-vfx]
mood_keywords: [cozy, tactile, escalating, legible, satisfying, warm, uncluttered, incremental]
---

# Art Bible — p2_beta (incremental / clicker, free-design, HTML/2D) · v0.1 (round 2)

> Runtime hérité : `html` / `2D` (profil de run `full_content` + toutes les références du World Scan sont des incrementals web — Cookie Clicker, Kittens Game, Clicker Heroes, Universal Paperclips). La valeur `plateforme_cible` du charter n'est PAS matérialisée dans l'entrée reçue (le charter transmis est un rapport de retour s0, pas ses champs de design-intent) — cette dérivation est donc portée en **fog** et remontée en `## world_constraints` + question `q_art_003`.
> Sujet/thème de production : **NON défini** à ce stade (Story Bible 6/8 sections `NOT_GROUNDED`, la STRUCTURE est déléguée à l'aval par le charter). Cette bible DÉCIDE une identité visuelle **agnostique au thème** et a remonté le thème comme question bloquante `q_art_001` au Game Master — elle n'invente aucune matière déléguée. Le GM confirme l'agnosticisme (`gm_worldscan:game_master.world_interpretation` fact#5, source `story_bible:context`) : le thème est un fog HumanGate, plus un blocage ART↔GM.
> **Round 2** (2e passe sur cette étape) : cette bible répond aux 3 questions bloquantes du Game Master (q_gm_001 milestone, q_gm_002 états de générateur, q_gm_003 transition de stage + jauge de fin) et matérialise les 2 entités que le modèle GM exigeait mais qui manquaient au round 1 (`vr_stage_scene`, `vr_quest_tracker`). Les réponses vivent dans `## character_states`, `## affordance_rules`, `## world_constraints`.

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
- **Les scènes de stage et le traqueur d'objectifs** (round 2) sont hérités du modèle GM : `world_loop` + `gb_stage_gate` exigent 5 transitions qui CHANGENT la surface de jeu (appui : `worldscan:games[3].loops.endgame` stage-gated), et `quest_loop` + `gb_quest_tracker` un HUD d'objectifs qui pilote l'attention. D'où `vr_stage_scene` (5 fonds distincts) et `vr_quest_tracker`.
- **La palette non verrouillée au thème** est une DÉCISION honnête : le sujet de production est indéfini (`story_bible:context`, `story_bible:characters` `NOT_GROUNDED`). L'ambre/miel lit « valeur / accumulation » pour presque n'importe quel sujet ; la teinte thématique se re-skinnera sans refonte une fois `q_art_001` tranchée par le HumanGate. Le chrome UI ne doit donc porter **aucune teinte thématique en dur**.

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
    { "id": "vr_stage_scene", "entity_role": "environment", "required": true, "description": "Scène de stage : la surface de jeu REMPLACÉE à chaque franchissement de seuil de stage (5 stages). Une famille réutilisable de 5 fonds/scènes visiblement distincts (teinte dominante propre à chaque stage dans la famille chaude, silhouette de décor différente) — un CHANGEMENT DE SCÈNE perceptible, jamais un +X%. Réponse q_gm_003 / world_loop ; appui interne au genre = jeux stage-gated (worldscan:games[3].loops.endgame). Distinct de vr_background (fond du stage 1)." },
    { "id": "vr_quest_tracker", "entity_role": "ui", "required": true, "description": "Traqueur d'objectifs (HUD) : liste compacte montrant l'objectif courant + sa récompense, s'incrémentant à la complétion et révélant le suivant. Pilote l'attention du joueur vers la jauge de fin (gb_quest_tracker du modèle GM, boucle quest_loop). Distinct du compteur de ressource ET de la jauge de fin." },
    { "id": "vr_background", "entity_role": "environment", "required": true, "description": "Fond de la surface de jeu principale (stage 1) : champ chaud sombre, calme, non bruyant, garantissant le contraste de lisibilité des chiffres et des panneaux. Toute la surface visuelle = ma responsabilité de lisibilité/mood." },
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
- **Progression par stages qui changent le jeu (fin conçue)** : `worldscan:games[3].loops.endgame` (« each stage feels like a new game within the game, preventing repetition fatigue » ; « Both paths are designed endings ») et `worldscan:games[3].objectives[0].victory_condition` (choix final stage 4). Contraste : `worldscan:games[0].objectives[0].has_win_state` = false (Cookie Clicker n'a aucun état de victoire). ⇒ appui interne au genre pour les scènes de stage (`vr_stage_scene`), l'écran de fin décidé (`vr_victory_screen`, `vr_progress_end_indicator`).

## heritage_story_bible

Matière HÉRITÉE de la Story Bible — honnête sur ce qu'elle NE fournit pas :

- **Genre et cadre** : `story_bible:context` — « p2_beta relève du genre incremental/clicker en conception libre » et « l'univers reste indéfini à ce stade ; la STRUCTURE est déléguée à l'aval ». ⇒ justifie une identité visuelle **agnostique au thème** et la question `q_art_001`.
- **Règles de cohérence (contraignent le visuel)** : `story_bible:coherence_rules` — « la narration doit rester compatible avec une expérience qui se CONCLUT : fin observable, solvabilité bornée (≤ 72000 ticks) » et « toute matière ajoutée en aval doit être ancrée, jamais fabriquée ». ⇒ impose `vr_progress_end_indicator` + `vr_victory_screen`, et m'INTERDIT d'inventer un thème (d'où la question au GM plutôt qu'une invention).
- **Ce qui manque, nommé** : `story_bible:characters`, `story_bible:factions`, `story_bible:events` sont `NOT_GROUNDED` — aucun personnage, faction ni événement du monde n'est fourni. ⇒ l'apparence CONCRÈTE (motif de la cible de clic, illustrations des générateurs, forme du jeton) reste une **question ouverte** portée par `q_art_001`, pas un vide comblé au juge.

## visual_language

DÉCIDÉ (aucune adresse héritée exigée) : vectoriel plat, silhouettes pleines et rondes, ombres douces courtes (pas de dégradés lourds ni de skeuomorphisme). Trois familles de style, une par nature d'entité : `flat-vector-ui` pour le chrome (compteur, boutons, upgrades, jauge, monnaie, traqueur d'objectifs, écran de fin), `warm-tactile-illustration` pour les objets illustrés (cible de clic, générateurs, jeton, fonds/scènes de stage), `soft-glow-vfx` pour les effets. Hiérarchie stricte : total > cible de clic > panneaux d'achat > upgrades > décor. Le fond ne rivalise jamais avec les chiffres.

## affordance_rules

DÉCIDÉ : le cliquable se lit à trois signaux redondants (jamais la teinte seule) — **couleur** (sarcelle `#3BB6A6`), **luminosité** (plein vs désaturé), **forme** (léger relief/ombre + micro-pulsation au repos sur la cible principale). Payable = plein contraste ; non payable = désaturé + coût en corail `#E8604C`. La cible de clic centrale est toujours l'élément le plus grand, le plus chaud et centré, pour être trouvée sans recherche. Le hover accentue l'ombre, pas la teinte, pour ne pas casser le code couleur.

**Réponse q_gm_002 — états d'un générateur `locked (raison+preview) / affordable / owned`, distincts par des signaux REDONDANTS au-delà de la teinte** (pour que la boucle `afford → buy → unlock` de `progression_loop` soit lisible instantanément, y compris en daltonisme) :

- **`locked`** — porté par TROIS signaux simultanés : (1) **luminosité** : la rangée entière est désaturée/assombrie (~35 % d'opacité sur l'illustration) ; (2) **forme** : un **glyphe de cadenas** en coin de la tuile, absent des autres états ; (3) **texte de RAISON explicite** en secondaire `#A79E92` — jamais un simple grisé muet : « Il te faut ⟨N⟩ ⟨monnaie⟩ » (verrou de coût) ou « Atteins le palier ⟨X⟩ » (verrou de tier). Le PREVIEW du contenu verrouillé est montré en **fantôme** : la silhouette du générateur et son étiquette de débit (`+N/s`) restent visibles mais grisées, pour que le joueur voie CE QU'IL DÉVERROUILLE avant de pouvoir l'acheter (exigence `visible_reason:true` + `preview:true` de `ar_generator`).
- **`affordable`** — (1) **luminosité** : pleine couleur, illustration à 100 % ; (2) **forme/mouvement** : le bouton d'achat sarcelle passe en plein contraste et prend une **micro-pulsation** ; (3) **couleur** : coût en texte normal (plus corail). Le cadenas a disparu.
- **`owned`** — (1) **forme** : un **badge de compte `×N`** en coin (jamais présent sur locked/affordable) ; (2) **mouvement** : la rangée **anime son débit** (motes chaudes qui s'écoulent vers le compteur) — signal vivant que cette source produit ; (3) **couleur** : pleine, sans bouton d'achat pulsant.

Ainsi l'état est porté par **luminosité + forme + mouvement** en plus de la teinte : jamais une information à teinte-seule. Le sous-cas `affordable-mais-non-payable-à-l'instant` bascule le seul coût en corail `#E8604C`, sans changer d'état structurel.

## character_states

DÉCIDÉ (l'incremental n'a pas de « personnages » ; les porteurs d'état sont les objets de production) :

- **Cible de clic** : `idle` (respire doucement) → `pressed` (enfoncée, gerbe de particules) → `milestone` (évolution visuelle à un palier franchi).

  **Réponse q_gm_001 — langage visuel de l'état `milestone`, INDÉPENDANT du thème** (pour rendre « croissance/récompense » évidente sans savoir à quoi ressemble concrètement la cible, thème indéfini `q_art_001`). La croissance se lit par des transformations **purement formelles**, qui survivent à n'importe quel re-skin ultérieur :
  1. **Échelle** — la cible gagne un palier de taille permanent (~+12 % par milestone, plafonné pour ne pas écraser le compteur, cf. `## ui_readability` : total > cible).
  2. **Anneaux concentriques** — un **anneau de halo** (`soft-glow-vfx`) supplémentaire s'ajoute à chaque palier franchi : le NOMBRE d'anneaux encode visuellement le rang atteint, indépendamment de tout motif thématique.
  3. **Accent de bord** — le liseré de la cible se déplace vers le **violet jalon `#8E6FE0`** (couleur méta/palier de la palette) : « ceci a franchi un cap ».
  4. **Éclat de franchissement** — au tick exact du palier, un **burst radial** unique (récompense d'escalade, écho du « satisfying click feedback » `worldscan:games[2].retention_answer`).
  5. **Respiration** — l'amplitude/vitesse du `idle` augmente légèrement : la cible « paraît plus vivante / plus puissante ».

  Aucune de ces cinq transformations ne dépend du sujet (cookie, monstre, réacteur…) : elles opèrent sur la géométrie et la lumière, pas sur l'iconographie — donc valides quel que soit le thème que tranchera le HumanGate.

- **Générateur** : `locked` → `affordable` → `owned` → `saturated` (cap éventuel atteint, teinté violet jalon). Détail des signaux redondants de chaque état : cf. `## affordance_rules` (réponse q_gm_002).
- **Bouton d'achat** : `idle` / `hover` / `disabled`, cf. `## affordance_rules`.

## ui_readability

DÉCIDÉ : nombres abrégés au-delà de 1e3 (`1.00K`, `1.00M`, `1.00B`, `1.00T`…) pour garder une largeur bornée pendant l'escalade ; `tabular-nums` pour un alignement stable. Contraste texte/fond visé ≥ 4.5:1 (blanc cassé sur champ profond). Total = plus grand élément (au moins 2× la taille de tout autre texte, y compris la cible de clic évoluée). Panneaux séparés par des séparateurs `#3A342E`, jamais par la seule couleur. Code d'affordance **colorblind-safe** : luminosité + forme + mouvement portent l'information en plus de la teinte (cf. `## affordance_rules`). La **jauge de fin** et le **traqueur d'objectifs** sont visuellement distincts du compteur de ressource (position, forme, taille) pour ne jamais être confondus avec le total (cf. `## world_constraints`).

## world_constraints

DÉCIDÉ + fogs nommés :
- **Runtime `html` / format `2D`** — dérivé (profil `full_content` + références World Scan 100 % web) ; la valeur `plateforme_cible` du charter n'est PAS matérialisée dans l'entrée reçue ⇒ **fog HumanGate**, confirmation demandée en `q_art_003`. Toutes les `constraints` des requests portent `format:"2D"`, `runtime:"html"` sous cette hypothèse — cohérente avec le modèle GM (surfaces HUD/scène 2D, aucune 3D).
- **Vectoriel plat** choisi pour rester net à toute résolution de navigateur ; pas de contrainte power-of-two (web).
- **Palette re-skinnable** : aucune teinte thématique en dur dans le chrome (cf. `## asset_rules`) — le sujet indéfini (`q_art_001`) doit pouvoir être appliqué sans refonte.
- **Fin observable requise** : la surface doit réserver la place d'une jauge de fin et d'un écran de victoire (`story_bible:coherence_rules`).
- **Portée du prestige/reset — RÉSOLU par le GM** (`q_art_002`) : le modèle GM (`gm_worldscan:game_master.loops.meta_loop`) tranche pour une **fin bornée observable ≤ 72000 ticks** avec, au plus, **un unique cycle borné** de relance (« entamer un unique cycle borne », « une graine optionnelle de relance bornee ») — donc **pas de prestige endless**. La surface visuelle n'a donc PAS à porter une couche de prestige récursive : une seule jauge de fin monotone suffit. Aucune entité de prestige n'est déclarée (ni inventée, ni préemptée).

**Réponse q_gm_003 — transition de stage = CHANGEMENT DE SCÈNE (pas un +X%), et jauge de fin approchant 100 %** (`world_loop` + `gb_stage_gate` : 5 transitions qui doivent CHANGER la surface ; `gb_end_gauge` : rendre la fin bornée lisible) :

- **Transition de stage = remplacement de scène.** Au franchissement d'un seuil de stage : un bref **balayage/rideau** (`soft-glow-vfx`, ~0,6 s) recouvre le champ, puis **toute la surface de jeu est remplacée** — nouveau fond (`vr_stage_scene`, une famille de 5 scènes), une **teinte dominante propre à chaque stage** (rotation dans la famille chaude : ambre → sarcelle-lean → miel → violet-lean → clôture, le chrome UI restant neutre et stable), une **silhouette de décor différente**, et une **bannière de stage** qui nomme la nouvelle phase. Le joueur voit un NOUVEAU LIEU, pas un pourcentage. Les producteurs peuvent changer d'aspect entre stages (nouvelle famille de `vr_generator_icon`). Règle dure : **une transition de stage n'est jamais rendue par un simple nombre/pourcent** — c'est un changement de scène perceptible (aligne `world_loop.transformation_perceptible` : « un changement de scène, pas un pourcentage »).
- **Jauge de fin (`vr_progress_end_indicator`) approchant 100 %.** Barre **persistante, toujours visible**, distincte en position/forme/taille du compteur de ressource (fine, en bandeau haut ou latéral), qui se **remplit de façon monotone** à mesure que stages/quêtes/ticks s'accumulent (`gm_worldscan:game_master.economy_model.formulas.end_progress`). Deux signaux d'imminence, redondants : à **≥ 90 %** la jauge vire au **violet jalon `#8E6FE0`** et gagne une **pulsation douce** ; les **5 seuils de stage** y sont marqués comme des crans, de sorte que la position dans le run est lisible même sans lire un chiffre. À **100 %** elle passe la main à l'**écran de victoire** (`vr_victory_screen`) qui remplace RÉELLEMENT la surface (vrai changement de scène, pas une overlay). Ainsi la progression-vers-la-fin est lisible **en continu** (la jauge) ET **ponctuée** par des changements de scène discrets (les stages) — deux canaux visuels distincts, aucun réductible à un pourcentage seul.
- **Traqueur d'objectifs (`vr_quest_tracker`)** : liste compacte d'objectifs à court terme (`quest_loop` / `gb_quest_tracker`), distincte de la jauge de fin (objectifs discrets nommés vs progression continue globale), qui pilote l'attention du joueur d'un pas au suivant.

## asset_rules

DÉCIDÉ : un `entity_role` ⇒ une famille de style unique (cf. frontmatter `styles`) ; les états d'une entité sont livrés ensemble (ex. bouton = 3 états dans un même lot ; générateur = locked/affordable/owned ; stage = 5 scènes dans une même famille). Formats préférés : SVG vectoriel, sinon PNG plat à fond transparent. Licences acceptées : `CC0-1.0`, `MIT`, `CC-BY-4.0`, `CC-BY-3.0` (allowlist du studio). Nommage : `p2beta_<entity_role>_<id>_<state>`. Le chrome UI ne porte **aucune teinte thématique en dur** (re-skin par `q_art_001`) ; seules les **scènes de stage** portent une teinte dominante par stage, restant dans la famille chaude. Aucune génération ni téléchargement d'asset ici : les requests **résolvent dans l'existant** du catalogue ou remontent `BLOCKED` (advisory) → HumanGate pour sourcing.
