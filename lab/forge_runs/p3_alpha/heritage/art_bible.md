---
styles: [candy-pop]
mood_keywords: [glossy-confection, hyper-saturated, playful, tactile-squish, radiant-sugar-rush, celebratory]
---

# Art Bible — p3_alpha (v0.1) · "SUCROSE" (identité de travail, thème DA décidé)

Étape 2.5 · Art Director. Identité HÉRITÉE (World Scan + Story Bible) et DÉCIDÉE
(style, palette, silhouettes, états, règles d'asset). Aucun octet réseau, aucune
génération d'asset : cette étape écrit une intention structurée et vérifiable.

## 1. IDENTITÉ VISUELLE

**Style retenu : `candy-pop`** — une confiserie glacée, lumineuse et tactile. Formes
arrondies, contours doux, surfaces vernies avec un point spéculaire net, couleurs
hyper-saturées sur fond calme. Le jeu doit donner envie de toucher l'écran : chaque
élément a l'air « sucré et pressable ».

**Palette de travail (décidée)** :
- Ressource R = **cristal de sucre** rose-magenta lumineux (#FF3D9A), l'accent le plus
  saturé de l'écran — c'est le seul élément qui a le droit d'être aussi vif.
- Noyau cliquable = gelée rouge-framboise (#E8264C) à reflet blanc.
- Générateurs G1→G4 = gradient de fraîcheur→opulence : menthe (#57E0A0), citron-vert
  (#8BD64B), myrtille (#4C7BE0), caramel-humbug (#B4702E) rayé crème.
- Fond = dégradé sucré très désaturé (crème #FFF3E6 → lilas pâle #F2E6FF), calme, pour
  que R et le noyau restent les points chauds.
- Feedback de clic = éclat rose (#FF7AC2) court et pétillant.

**Direction de silhouette** : lisibilité à distance d'abord. Le noyau central est le
plus gros objet de l'écran (cible de clic évidente) ; chaque générateur et amélioration
est une icône distincte, reconnaissable en vignette 48–64 px, jamais deux icônes
confondables. Vue de face, cadrage 2D frontal (pas de perspective top-down), cohérent
avec un jeu incrémental joué au clic sur canvas HTML.

## 2. RATIONALE

Le genre incrémental/clicker se joue à la **lisibilité de la boucle**, pas à la
richesse narrative — la Story Bible est volontairement quasi-vide (`story_bible:context`
: « économie d'accumulation abstraite », `story_bible:chronology`/`characters`/`factions`
tous NOT_GROUNDED) et le charter délègue explicitement le thème à ce poste. J'exerce
donc l'autorité DA qui m'est déléguée (`story_bible:coherence_rules`, élément 4) pour
trancher un thème **original de confiserie** : abstrait, joyeux, sans personnage ni
lieu à inventer, entièrement au service de la boucle mécanique.

Pourquoi `candy-pop` et pas un thème plus « sérieux » : le World Scan montre que la
rétention du genre tient à la **gratification sensible du clic** et à la **croissance
exponentielle visible** (`worldscan:games[0].retention_answer` : « visible exponential
growth 999→9,999→99,999 animation », `worldscan:games[0].loops.minute_1` : « clicks the
large cookie … 1 per click »). Un style vernis, hyper-saturé et « pressable » sert
exactement cette gratification : le noyau appelle le clic, chaque achat de générateur
est une friandise de plus qui s'allume. La fin est **finie et unique** (S5 = 1 000 000 R,
`worldscan:games[2].objectives[0].victory_condition` pour le précédent d'une victoire
terminale observable), donc l'écran de victoire est un moment de célébration, pas une
boucle de prestige.

Contrainte de non-copie tenue (`story_bible:coherence_rules`, élément 2 ;
charter.actions_interdites) : le thème confiserie s'appuie sur des assets CC0 ORIGINAUX
(sucettes, gelées, bonbons rayés) — **jamais** les cookies / grands-mères / usines de
Cookie Clicker. Seule la grammaire de genre est empruntée.

La couverture besoin↔requête est démontrée par la donnée structurée ci-dessous et par
`asset_requests.json`, pas par cette prose : chaque entité `required:true` porte au
moins une requête du même `entity_role` (cf. § BESOINS VISUELS et l'oracle
`check_artbible.mjs`). La prose n'est jamais l'autorité de couverture.

## 3. BESOINS VISUELS

Inventaire de CHAQUE entité visuelle distincte du jeu, dérivé du charter
(`criteres_demo`) et de la structure imposée (`structure_imposee_v2_FROZEN.yaml` : 4
générateurs G1–G4, 6 améliorations, noyau de clic, compteur R, fin S5). Une entité
`required:true` dès qu'elle est citée par une source ou centrale à une condition de
victoire/score ; `required:false` réservé au décor strictement cosmétique.

```json
{
  "visual_requirements": [
    {"id": "vr_core_clicker", "entity_role": "collectible", "required": true, "description": "Noyau central cliquable — grosse confiserie gelifiee au centre de l'ecran. Cible unique du clic manuel : chaque tap produit +gain_clic R. Etats repos / survol / presse (squish) tres lisibles a distance ; c'est le plus gros objet de l'ecran."},
    {"id": "vr_generator_g1", "entity_role": "item", "required": true, "description": "Generateur G1 (prod 0.1 R/s, cout de base 15 R), disponible des le depart. Premiere machine de production automatique. Icone distincte de faible tier, teinte menthe fraiche."},
    {"id": "vr_generator_g2", "entity_role": "item", "required": true, "description": "Generateur G2 (prod 1 R/s, cout de base 100 R), revele au seuil S1. Icone distincte, tier superieur a G1, montee en gamme lisible."},
    {"id": "vr_generator_g3", "entity_role": "item", "required": true, "description": "Generateur G3 (prod 8 R/s, cout de base 1100 R), revele au seuil S2. Icone distincte, silhouette plus riche que G2."},
    {"id": "vr_generator_g4", "entity_role": "item", "required": true, "description": "Generateur G4 (prod 47 R/s, cout de base 12000 R), revele au seuil S3. Icone du plus haut tier, la plus opulente des quatre."},
    {"id": "vr_upgrade_clic_x2", "entity_role": "item", "required": true, "description": "Amelioration clic_x2 (cout 100 R, dispo debut) : double le gain par clic. Icone d'amelioration liee au geste de clic, distincte des generateurs."},
    {"id": "vr_upgrade_clic_x4", "entity_role": "item", "required": true, "description": "Amelioration clic_x4 (cout 5000 R, requiert clic_x2) : redouble encore le gain par clic. Variante visuelle plus intense de l'icone de clic."},
    {"id": "vr_upgrade_prod_g1", "entity_role": "item", "required": true, "description": "Amelioration prod_g1_x2 (cout 500 R, dispo S4) : double la production de G1. Icone visuellement rattachee a G1."},
    {"id": "vr_upgrade_prod_g2", "entity_role": "item", "required": true, "description": "Amelioration prod_g2_x2 (cout 1000 R, dispo S4) : double la production de G2. Icone rattachee a G2."},
    {"id": "vr_upgrade_prod_g3", "entity_role": "item", "required": true, "description": "Amelioration prod_g3_x2 (cout 30000 R, dispo S4) : double la production de G3. Icone rattachee a G3."},
    {"id": "vr_upgrade_prod_g4", "entity_role": "item", "required": true, "description": "Amelioration prod_g4_x2 (cout 200000 R, dispo S4) : double la production de G4. Icone rattachee a G4, la plus haut de gamme des ameliorations."},
    {"id": "vr_resource_pip", "entity_role": "icon", "required": true, "description": "Symbole de la ressource R affiche en permanence a cote du compteur : petit pictogramme de cristal de sucre rose-magenta qui donne une identite visuelle a la ressource primaire, distinct du texte numerique."},
    {"id": "vr_click_burst", "entity_role": "effect", "required": true, "description": "Retour visuel au clic : petit eclat de sucre rose qui jaillit du noyau a chaque tap, preuve immediate que le clic a produit de la ressource. Sequence de quelques frames, court et petillant."},
    {"id": "vr_hud_frame", "entity_role": "ui", "required": true, "description": "Chrome de l'interface : bandeau du compteur de R et cartes d'achat des generateurs/ameliorations (cout affiche, etats achetable / grise-non-achetable / possede). Habillage coherent, tres lisible sur le fond desature."},
    {"id": "vr_victory_state", "entity_role": "ui", "required": true, "description": "Etat/ecran de victoire S5 affiche quand 1 000 000 R cumules sont atteints : panneau de celebration terminale, seule fin observable du jeu (aucun etat d'echec, fidele au genre)."},
    {"id": "vr_background", "entity_role": "environment", "required": false, "description": "Fond d'ambiance purement decoratif : degrade sucre calme (creme vers lilas pale) derriere le noyau et les panneaux. Optionnel — un degrade procedural suffit, aucun asset externe strictement necessaire ; marque required:false en toute honnetete."}
  ]
}
```

Chaque entité `required:true` ci-dessus a sa requête de même `entity_role` dans
`asset_requests.json` (collectible ×1, item ×10, icon ×1, effect ×1, ui ×2). Le décor
de fond (`vr_background`, `required:false`) est délibérément sans requête : décision
assumée de le rendre procéduralement, pas un oubli.

## heritage_worldscan

Ce que la DA HÉRITE du World Scan (`worldscan.json`, `advisory:true`) — cité, jamais
réinventé :

- **Gratification du clic comme cœur sensoriel** — `worldscan:games[0].loops.minute_1`
  (« Player clicks the large cookie, earning 1 cookie per click ») et
  `worldscan:games[2].loops.minute_1` (« clicks button; 1 paperclip appears … highly
  gratifying feedback loop ») imposent un objet de clic gros, central, immédiatement
  réactif. → dicte `vr_core_clicker` (plus gros objet, états presse/squish) et
  `vr_click_burst`.
- **Croissance exponentielle VISIBLE** — `worldscan:games[0].retention_answer`
  (« visible exponential growth (999→9,999→99,999 animation) ; frequent unlocks every
  10-30 actions »). → dicte un compteur R très lisible avec identité forte
  (`vr_resource_pip`) et une montée de tier lisible entre G1→G4.
- **Feedback d'achat / d'automatisation** — `worldscan:games[1].retention_answer`
  (« Manager automation (visual feedback via auto-running icon) ») et
  `worldscan:games[0].loops.minute_10` (« buildings … auto-produce … upgrades …
  multiplying production »). → dicte des états d'objet distincts achetable / possédé /
  actif (cf. § affordance_rules, character_states).
- **Fin FINIE et observable** (le genre est majoritairement infini, mais le précédent
  existe) — `worldscan:games[2].objectives[0].has_win_state` = true et
  `worldscan:games[2].objectives[0].victory_condition` (« universe fully converted …
  Game ends »). → conforte que `vr_victory_state` (S5) est un moment de célébration
  terminale, pas un écran de prestige/reset.
- **Absence d'état d'échec** — `worldscan:games[0].objectives[0].has_defeat_state` =
  false (idem games[1], games[2]). → aucun visuel de game-over ; la seule tension
  visuelle est la montée vers S5.

## heritage_story_bible

Ce que la DA HÉRITE de la Story Bible (`story_bible.json`) — sciemment mince, par
construction :

- **Le « monde » est une économie d'accumulation abstraite** — `story_bible:context`
  (« économie d'accumulation abstraite autour d'une ressource primaire unique (R) …
  aucun décor, lieu ni cadre fictionnel n'est posé »). → autorise un thème librement
  décidé ici, sans lore imposé ; la DA doit rester lisible et abstraite, pas narrative.
- **Autorité DA déléguée au producteur** — `story_bible:coherence_rules` (élément 4 :
  « L'autorité sur le thème, l'univers, les personnages et la direction artistique
  appartient au producteur/GM en aval »). → base explicite sur laquelle je DÉCIDE le
  thème confiserie `candy-pop`.
- **Non-copie de Cookie Clicker** — `story_bible:coherence_rules` (élément 2 : « Aucun
  asset, nom, texte ou contenu de Cookie Clicker … seule la grammaire de genre est
  empruntée. Toute nomenclature narrative du monde doit être originale »). → contrainte
  dure reprise en § asset_rules / world_constraints : bonbons originaux, pas de
  cookie/grand-mère/usine.
- **Aucune défaite narrative** — `story_bible:coherence_rules` (élément 3 : « La
  narration ne doit reposer sur aucun état d'échec ni game over »). → confirme l'absence
  de visuel d'échec.
- **Climax aligné sur S5** — `story_bible:coherence_rules` (élément 5 : « Tout climax
  narratif doit s'aligner sur … 1 000 000 R cumulés (S5) »). → `vr_victory_state` est le
  seul point culminant visuel.
- Sections `story_bible:characters` / `factions` / `relations` / `events` /
  `chronology` / `stakes` sont toutes NOT_GROUNDED : aucun personnage, faction ni lieu à
  illustrer — c'est pourquoi cette bible ne demande aucun asset de personnage ou de
  décor narratif.

## visual_language

Décidé. Grammaire visuelle du jeu :

- **Vernis + point spéculaire** : chaque objet « sucré » porte un highlight blanc net en
  haut-gauche et un contour doux ; c'est la signature `candy-pop`.
- **Hiérarchie de saturation** : la ressource R (rose-magenta) est le pic de saturation ;
  le noyau vient juste après ; le fond est désaturé. L'œil est toujours ramené à R et au
  noyau.
- **Échelle = importance** : noyau central le plus gros ; icônes de générateurs/
  améliorations en vignettes de taille égale entre elles (48–64 px), jamais plus grosses
  que le noyau.
- **Gradient de tier** menthe→citron→myrtille→caramel pour G1→G4 : la couleur seule doit
  suffire à lire « ce générateur est plus avancé ».
- **Mouvement mesuré** : le seul mouvement soutenu est l'incrément du compteur et l'éclat
  de clic ; pas d'animation ambiante distrayante qui volerait l'attention à la boucle.

## affordance_rules

Décidé. Ce que l'apparence doit rendre évident, sans texte :

- **Cliquable** = le noyau, et lui seul, a un halo/anneau d'invitation au repos et se
  déforme (squish) au survol/presse. Rien d'autre à l'écran n'imite ce halo.
- **Achetable maintenant** = carte pleinement colorée, prix en surbrillance, légère
  pulsation ; **non-achetable (R insuffisant)** = carte grisée/désaturée, prix en rouge
  éteint, aucune pulsation (refus observable et immédiat, conforme à
  `structure_imposee` : « grisé si R insuffisant — refus observable, état inchangé »).
- **Possédé/actif** = pastille « possédé » + icône passée en pleine saturation avec un
  léger scintillement d'activité (écho du « auto-running icon » de
  `worldscan:games[1].retention_answer`).
- **Verrouillé (seuil non atteint)** = emplacement en silhouette neutre, sans couleur de
  tier, pour signaler « à débloquer » sans révéler le contenu.
- Un état visuel ne doit jamais dépendre de la couleur seule : forme du contour +
  opacité + pictogramme d'état accompagnent chaque couleur (cf. § ui_readability).

## character_states

Décidé. Le jeu n'a pas de personnage (Story Bible : `characters` NOT_GROUNDED). Les
« états » à produire portent donc sur les OBJETS interactifs, pas des avatars :

- **Noyau cliquable** : `idle` (halo lent) · `hover` (léger grossissement) · `pressed`
  (squish + éclat de sucre) · `victory` (rayonnement soutenu à l'atteinte de S5).
- **Générateur (chaque G1–G4)** : `locked` (silhouette) · `revealed_affordable`
  (couleur de tier pleine, pulsation) · `revealed_unaffordable` (grisé) · `owned`
  (compteur de possédés, scintillement d'activité).
- **Amélioration (chaque des 6)** : `hidden` (avant dispo/seuil) · `available_affordable`
  · `available_unaffordable` (grisé) · `purchased` (icône verrouillée en « acquis »).
- **Victoire S5** : `hidden` puis `shown` (panneau de célébration) — état unique et
  terminal, aucun état d'échec symétrique.

## ui_readability

Décidé. Règles de lisibilité de l'UI (canvas HTML, jouée au clic) :

- **Compteur R** : chiffre le plus grand de l'écran après le noyau, police lourde,
  contraste ≥ 4.5:1 sur le fond crème ; le pictogramme R (`vr_resource_pip`) le précède
  toujours pour ancrer l'identité de la ressource.
- **Coûts** : toujours affichés sur chaque carte avec le pictogramme R, en une seule
  unité (R, dérivée de floor(mR/1000) — l'affichage montre des R entiers, jamais des mR).
- **États non-couleur-seule** : achetable/non-achetable/possédé/verrouillé se distinguent
  aussi par opacité et pictogramme d'état (accessibilité daltonisme).
- **Zone de clic** : le noyau occupe une cible large et centrale (≥ 40% de la hauteur
  utile) pour un clic sans précision ; les cartes ont un espacement suffisant pour éviter
  les achats accidentels.
- **Pas de debug à l'écran** : aucune valeur interne (mR, ticks) exposée au joueur.

## world_constraints

Décidé. Contraintes du « monde » visuel et de production :

- **Runtime HTML canvas 2D**, déterministe seedé : tous les assets sont 2D, format PNG,
  runtime `html`. Aucun 3D, aucune dépendance moteur lourde.
- **Cadrage frontal 2D**, pas de vue top-down ni de perspective : cohérent avec un
  clicker à un seul écran fixe.
- **Un seul écran, pas de niveau ni de carte** : le « monde » est le tableau de bord
  d'accumulation ; aucun décor de lieu à produire (`story_bible:context`).
- **Aucun octet réseau à cette étape** : toute ingestion d'asset reste une gate Pierre
  explicite ; cette bible DÉCLARE des besoins, ne télécharge rien.
- **Non-copie stricte de Cookie Clicker** (`story_bible:coherence_rules` élément 2) :
  aucun cookie, grand-mère, usine, nom ou texte de Cookie Clicker ; le thème confiserie
  repose sur des bonbons originaux CC0.

## asset_rules

Décidé. Règles d'asset qui rendent la demande vérifiable :

- **Style unique `candy-pop`** pour tous les assets (déclaré au frontmatter) : cohérence
  imposée, chaque requête porte `style: "candy-pop"`. Un asset d'un autre tag de style
  est refusé par cohérence bible↔requête (`check_artbible.mjs`).
- **Licence** : CC0-1.0 privilégiée (tout le vivier candy-pop du catalogue est CC0) ;
  `license_allowed: null` = allowlist studio par défaut (CC0/MIT/CC-BY-4.0/CC-BY-3.0),
  jamais plus permissif.
- **Format/runtime** : `2D` / `html` sur chaque requête, non négociable (world_constraints).
- **Résolution = mécanique, jamais esthétique** : `style_tag_match` compare des TAGS, pas
  des pixels ; un asset qui résout `OK` n'est PAS déclaré « joli » — l'adéquation
  visuelle fine (le BON bonbon pour CE rôle) reste un jugement humain (fog), pas un claim.
- **Références advisory** : les `references` citent des `asset_id` réels du catalogue
  candy-pop comme pistes d'inspiration, jamais vérifiées mécaniquement.
- **Décor optionnel non requêté** : le fond (`vr_background`) est procédural et sans
  requête — décision assumée, pas une dissimulation d'entité centrale.
