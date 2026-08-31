---
styles: [flat-neon-dark, luminous-glyph, radiant-burst-vfx]
mood_keywords: [luminous, ascending, calm-focus, satisfying-feedback, abstract-industrial, warm-glow, clean-readable, no-threat]
---

# Art Bible — p2_alpha (s2.5-artbible / run1) — v0.1

> Jeu : incremental/clicker WEB (HTML + JS canvas), ressource unique **R**, aucune défaite, trajectoire purement ascendante jusqu'à une victoire observable (total cumulé ≥ 1 000 000 R).
> Ce que cette étape HÉRITE : conventions/attentes du World Scan (`worldscan:…`, advisory) et invariants du monde (`story_bible:…`). Ce que cette étape DÉCIDE : le style réel, les silhouettes, les règles d'affordance et de lisibilité, les états des entités, les contraintes d'asset.
> `claim_verdict: NO_CLAIM_ALLOWED` — ce document décrit une identité visuelle et sa couverture structurée ; il ne certifie aucune qualité esthétique (jugement Pierre / fog).
> Round 2 (boucle de complétion mutuelle) : `q_art_001` (ART→GM, bloquante) résolue — le Game Master CONFIRME le `progress_meter` (cf. `## affordance_rules` et l'entrée `progress_meter` en §3). Aucune question GM→ART reçue. ART converge : `ready_for_freeze: true`.

## 1. IDENTITÉ VISUELLE

**Thème décidé : « Forge de Lumen ».** Le monde est une chambre d'accumulation abstraite et lumineuse. La ressource **R** est matérialisée comme du **Lumen** — des unités de lumière-énergie qui s'accumulent. Le monde n'a ni ennemi, ni menace, ni mort : il ne fait que **s'éclaircir et croître** à mesure que le joueur accumule, jusqu'à un embrasement final (victoire).

- **Palette.** Fond sombre presque noir (encre bleu-nuit `#0B0E17`) servant de scène neutre, sur lequel les accents lumineux ressortent : ambre-or chaud (`#FFB454`, la couleur de R/Lumen), cyan froid (`#5AD1FF`, l'énergie automatique des générateurs), violet profond (`#8A6BFF`, les amplificateurs). Le fond s'éclaircit très progressivement (jamais brutalement) à chaque seuil franchi : la scène elle-même raconte l'ascension.
- **Mood.** Calme, concentré, gratifiant. Aucune agression visuelle, aucune alarme, aucun rouge de danger (le rouge est réservé — s'il existe — au seul état « achat impossible », et encore de façon sobre, cf. §affordance_rules). L'énergie visuelle vient de la **lueur** (glow, halo) et de la **cadence de feedback**, pas du chaos.
- **Silhouette centrale.** Un **Cœur de Lumen** — orbe pulsant au centre de l'écran — est la cible du clic manuel. Il respire lentement (pulsation lente au repos) et émet un éclat + un nombre flottant `+N` à chaque clic.
- **Silhouettes des générateurs.** Quatre conduits/machines de taille et de complexité croissantes (G1 → G4), rangés en colonne à droite. Chaque tier a une silhouette distincte et immédiatement reconnaissable (demande de démo : chaque déblocage doit être VISIBLEMENT nouveau), et s'illumine davantage à mesure que le joueur en possède.
- **Références de style** (advisory, jamais un critère mécanique) : UI d'incremental sobre à fond sombre et accents néon ; iconographie de « glyphes lumineux » plats ; VFX de type « éclat radial / bloom » pour les retours d'action et les franchissements de seuil.

## 2. RATIONALE

Le charter défère explicitement le thème, l'univers et la direction artistique aux étapes aval (`story_bible:context` élément 3 ; `story_bible:coherence_rules` élément 5) : **c'est cette étape qui tranche**, sous les invariants durs du monde. Les choix ci-dessus sont dérivés, non arbitraires :

- **Ressource unique = un seul langage de couleur.** L'ambre-or est réservé à R/Lumen et à rien d'autre. Aucune seconde couleur-ressource n'existe, parce qu'aucune seconde ressource n'existe (`story_bible:coherence_rules` élément 1). Cela ferme visuellement le risque qu'un joueur croie à une monnaie secondaire.
- **Aucune défaite = aucun vocabulaire visuel de menace.** Pas de barre de vie, pas de compte à rebours anxiogène, pas d'écran de game-over — jamais (`story_bible:coherence_rules` élément 2 ; charter `criteres_demo` « AUCUN écran de défaite »). Le mood « no-threat » du frontmatter en découle directement.
- **Trajectoire ascendante = scène qui s'éclaircit.** Le monde n'a qu'une fin, lumineuse (`story_bible:coherence_rules` élément 4). Faire monter la clarté du fond à chaque seuil traduit la seule dramaturgie autorisée : l'accumulation qui grandit.
- **Feedback à haute cadence = lisibilité de l'action.** Le World Scan observe que la rétention de ce type de boucle courte tient à une gratification visuelle immédiate et fréquente (`worldscan:games[1].retention_answer`, Candy Crush : « gratification visuelle (cascades, animations) » ; `worldscan:games[0].retention_answer`, Tetris : « Cadence de gratification très haute »). Le clic doit donc produire un retour visuel instantané et net (éclat + `+N`), sinon la boucle manuelle paraît morte.
- **Fin observable = un embrasement, pas un simple texte.** La victoire est un état perceptible (`story_bible:coherence_rules` élément 4 ; charter `criteres_demo`), au même titre que le `victory_condition` observable relevé sur un jeu du World Scan (`worldscan:games[2].objectives[0]`, Peglin). D'où le bloom final plein écran, entité visuelle à part entière.

La couverture réelle de ces intentions est démontrée par la section 3 (données structurées) et par `asset_requests.json` — **jamais par cette prose**, qui n'est pas lue par l'oracle.

## 3. BESOINS VISUELS

Chaque entité visuelle distincte du jeu est listée ci-dessous. `required:true` = citée par une source héritée OU centrale à une condition de victoire/score/affordance de démo ; `required:false` = décor cosmétique véritablement optionnel. Une `asset_request` propre existe pour CHAQUE entité `required:true` (cf. `asset_requests.json`), jamais une requête générique censée en couvrir plusieurs.

```json
{
  "visual_requirements": [
    {
      "id": "r_counter",
      "entity_role": "ui",
      "required": true,
      "description": "Compteur de R (Lumen) visible en permanence, en haut de l'écran. Doit rester lisible de 1 à plus de 1 000 000 (formatage des grands nombres). Demande de démo #1 : un compteur de R visible qui augmente."
    },
    {
      "id": "core_click_target",
      "entity_role": "player",
      "required": true,
      "description": "Le Cœur de Lumen central : orbe pulsant que le joueur tape pour produire +gain_clic R. Affordance primaire du joueur (son agentivité manuelle). Demande de démo #2 : un clic manuel produit une hausse visible de R."
    },
    {
      "id": "generator_g1",
      "entity_role": "item",
      "required": true,
      "description": "Générateur tier 1 (prod 0.1 R/s, cout_base 15). Disponible dès le début. Silhouette la plus simple des quatre conduits ; s'illumine selon le nombre possédé."
    },
    {
      "id": "generator_g2",
      "entity_role": "item",
      "required": true,
      "description": "Générateur tier 2 (prod 1 R/s, cout_base 100). Révélé au franchissement de S1 (100 R cumulés) — son apparition doit être VISIBLEMENT nouvelle. Silhouette distincte de G1."
    },
    {
      "id": "generator_g3",
      "entity_role": "item",
      "required": true,
      "description": "Générateur tier 3 (prod 8 R/s, cout_base 1100). Révélé à S2 (1000 R cumulés). Silhouette plus complexe/haute que G2."
    },
    {
      "id": "generator_g4",
      "entity_role": "item",
      "required": true,
      "description": "Générateur tier 4 (prod 47 R/s, cout_base 12000). Révélé à S3 (12000 R cumulés). Silhouette la plus imposante et la plus lumineuse des quatre."
    },
    {
      "id": "buy_button",
      "entity_role": "ui",
      "required": true,
      "description": "Bouton d'achat (générateur ou amélioration), avec deux états visuels nets : ACHETABLE (accent lumineux, cliquable) et GRISÉ (R insuffisant, refus observable, état inchangé). Demande de démo #4 : le refus d'achat doit être observable."
    },
    {
      "id": "progress_meter",
      "entity_role": "ui",
      "required": true,
      "description": "Indicateur de proximité vers le prochain seuil de déblocage (S1..S5), servant l'arbitrage de fond « acheter maintenant vs épargner ». DÉCISION Art Director CONFIRMÉE par le Game Master (q_art_001, round 1) : la tension acheter/épargner est un ressort de design voulu, porté côté GM par le grey_block gb_progress_meter et son artist_requirement ar_progress_meter (gm_worldscan:game_master.grey_blocks.gb_progress_meter). Rend visible la tension d'épargne du core loop ; reste required:true."
    },
    {
      "id": "improvement_clic_amp",
      "entity_role": "icon",
      "required": true,
      "description": "Icône de la famille d'améliorations de CLIC (clic_x2, clic_x4 — cumul séquentiel, disponibles dès le début). Glyphe lumineux signifiant « la main du joueur frappe plus fort ». Se différencie de la famille production par la couleur (ambre, couleur de R)."
    },
    {
      "id": "improvement_prod_amp",
      "entity_role": "icon",
      "required": true,
      "description": "Icône de la famille d'améliorations de PRODUCTION (prod_g1_x2..prod_g4_x2, ×2 prod, débloquées à S4). Même glyphe paramétré par le générateur ciblé (tinte cyan, couleur de l'énergie automatique). Le déblocage groupé à S4 doit être VISIBLEMENT nouveau."
    },
    {
      "id": "click_feedback_burst",
      "entity_role": "effect",
      "required": true,
      "description": "VFX instantané au clic sur le Cœur : éclat radial court + nombre flottant « +N » (= gain_clic courant) qui monte et s'efface. Rend la hausse de R perceptible à chaque clic (demande de démo #2)."
    },
    {
      "id": "threshold_reveal",
      "entity_role": "effect",
      "required": true,
      "description": "VFX de franchissement de seuil : flash/onde lumineuse accompagnant l'apparition d'un nouvel élément (G2 à S1, G3 à S2, G4 à S3, améliorations à S4). Rend le déblocage VISIBLE (demande de démo #5)."
    },
    {
      "id": "victory_bloom",
      "entity_role": "effect",
      "required": true,
      "description": "État/écran de VICTOIRE au franchissement de S5 (total cumulé ≥ 1 000 000 R) : embrasement lumineux plein écran, terminaison ascendante unique. AUCUN équivalent de défaite n'existe (demande de démo #6)."
    },
    {
      "id": "background_ambient",
      "entity_role": "environment",
      "required": false,
      "description": "Décor de fond ambiant (dégradé bleu-nuit + fines particules de lumière) qui s'éclaircit progressivement à chaque seuil. Cosmétique : peut être rendu par des primitives canvas sans asset externe ; aucune requête d'asset émise (required:false assumé)."
    }
  ]
}
```

## heritage_worldscan

Le World Scan injecté (`worldscan.json`, `advisory: true`) est **mésancré** : il observe Tetris Effect, Candy Crush et Peglin — genre puzzle/arcade, **étranger à l'incremental/clicker** du charter (défaut déjà relevé par la Story Bible). Il n'est donc PAS une source de conventions de genre valides pour ce jeu, et je ne m'y adosse que pour des observations **transversales à toute boucle courte à feedback**, jamais pour une grammaire d'incremental (cf. `## world_constraints`).

- Retour visuel immédiat et cadence de gratification élevée comme moteur de rétention d'une boucle courte : `worldscan:games[1].retention_answer` (« gratification visuelle (cascades, animations) ») et `worldscan:games[0].retention_answer` (« Cadence de gratification très haute »). → Décision héritée : le clic doit produire un éclat + `+N` instantané (`click_feedback_burst`).
- Réponse visuelle immédiate à l'entrée du joueur : `worldscan:games[1].loops.minute_1` (« match = destruction + cascade »). → Le Cœur doit répondre visuellement au clic sans latence perçue.
- Existence d'un état de victoire OBSERVABLE : `worldscan:games[2].objectives[0].has_win_state` = true, `worldscan:games[2].objectives[0].victory_condition` (Peglin, « boss final vaincu … jauge à zéro »). → Notre victoire (S5) doit elle aussi être un état perceptible, d'où `victory_bloom` ; mais SANS le `has_defeat_state:true` que ces trois jeux portent tous — notre monde n'a pas de défaite.

## heritage_story_bible

- Monde = économie d'accumulation abstraite à substance unique R : `story_bible:context` (élément 1, « toute la matière du monde se réduit à produire et accumuler R »). → Un seul langage de couleur-ressource (ambre-or), aucune seconde monnaie visuelle.
- Aucune défaite, trajectoire uniquement ascendante : `story_bible:context` (élément 2) et `story_bible:coherence_rules` (élément 2, « n'admet ni échec, ni perte, ni mort ; son arc est purement ascendant »). → Aucun vocabulaire visuel de menace ; mood « no-threat ».
- Thème/univers/entités DÉFÉRÉS à cette étape : `story_bible:context` (élément 3) et `story_bible:coherence_rules` (élément 5, « Le monde diégétique doit être inventé en aval sous ces invariants »). → C'est ici que « Forge de Lumen » est décidé ; il respecte les invariants (ressource unique, pas de défaite, accumulation pure, fin unique observable).
- Fin unique et observable à R cumulé ≥ 1 000 000 : `story_bible:coherence_rules` (élément 4). → `victory_bloom` comme seule terminaison.
- Sections `story_bible:chronology`, `story_bible:stakes`, `story_bible:factions`, `story_bible:characters`, `story_bible:relations`, `story_bible:events` = **NOT_GROUNDED**. → Conséquence visuelle assumée : AUCUN personnage diégétique, AUCune faction, AUCUN antagoniste à représenter. L'identité est abstraite (lumière/énergie), pas figurative ni narrative — c'est la seule voie honnête sous une bible dont 6/8 sections sont vides par construction.

## visual_language

*(Section DÉCIDÉE — aucune adresse héritée exigée.)*

- **Registre** : plat (flat), à fort contraste lumière/fond sombre. Pas de skeuomorphisme, pas de photoréalisme. Formes géométriques nettes + halos de lumière (glow) comme seul effet de profondeur.
- **Rôle des couleurs** : ambre-or = R/Lumen et production manuelle (le joueur) ; cyan = production automatique (les générateurs, l'énergie « qui travaille seule ») ; violet = amplification (améliorations). Cette assignation est un code de lecture stable, jamais décoratif : la couleur dit à quelle partie de l'économie une chose appartient.
- **Mouvement** : pulsation lente au repos (le Cœur « respire »), éclats brefs et nets sur action, ondes douces sur franchissement de seuil. Aucune animation clignotante rapide ni stroboscopique (confort, mood calme).
- **Typographie des nombres** : chiffres tabulaires, poids marqué pour R, formatage lisible des grands ordres de grandeur (cf. `## ui_readability`).

## affordance_rules

*(Section DÉCIDÉE.)*

- **Cliquable vs non-cliquable** : tout élément interactif (Cœur, boutons d'achat) porte un accent lumineux et réagit au survol/appui (léger agrandissement + intensification du halo). Le décor ne s'illumine jamais sous le curseur.
- **Achetable vs refusé** : un `buy_button` ACHETABLE est pleinement coloré et lumineux ; un `buy_button` GRISÉ (R insuffisant) est désaturé, à opacité réduite, sans halo — le refus est **observable** et l'état du jeu reste inchangé (charter `criteres_demo` #4). Le passage grisé→achetable se fait dès que R suffit, sans action du joueur.
- **Proximité au seuil (progress_meter)** : le `progress_meter` rend perceptible la distance au prochain seuil (S1..S5), pour servir l'arbitrage « acheter maintenant vs épargner-vers-le-seuil ». Cette affordance est CONFIRMÉE par le Game Master (`q_art_001`, round 1 — la tension est un ressort de design voulu, porté par `progression_s1_threshold` et l'économie à coût croissant ×1.12, côté GM `gb_progress_meter` / `ar_progress_meter`). Le meter avance visiblement quand R cumulé approche du seuil ; il ne clignote pas et ne masque jamais le compteur R.
- **Nouvellement débloqué** : une entité qui apparaît à un seuil arrive avec le VFX `threshold_reveal` (flash/onde) et un court halo d'attention, pour que le déblocage soit VISIBLE (charter `criteres_demo` #5) et ne se noie pas dans l'écran.
- **Coût lisible** : chaque bouton d'achat affiche son coût courant en R à côté de son icône ; le coût croît (×1.12^n) sans changer la forme du bouton — seule la valeur change.

## character_states

*(Section DÉCIDÉE. « Personnages » au sens strict : aucun — cf. `## heritage_story_bible`. Ci-dessous les états des ENTITÉS interactives, seul équivalent pertinent pour ce jeu.)*

- **Cœur de Lumen** : `idle` (pulsation lente) · `pressed` (éclat + compression brève + `+N`) · `charged` (halo plus intense quand gain_clic a été amplifié par clic_x2/clic_x4).
- **Générateur (chaque tier)** : `locked/hidden` (invisible avant son seuil) · `revealed_affordable` (visible, achetable, accent vif) · `revealed_unaffordable` (visible, grisé) · `owned_producing` (illumination proportionnelle au nombre possédé, légère pulsation cyan au tick de production) · `boosted` (teinte renforcée quand son amélioration ×2 est active).
- **Amélioration** : `available` (icône vive) · `unaffordable` (grisée) · `purchased` (marquée acquise, retirée de la liste d'achat ou cochée) · `locked` (pour les prod ×2 avant S4 : absente).
- **Aucun état d'échec/mort** sur aucune entité — invariant dur.

## ui_readability

*(Section DÉCIDÉE.)*

- **Compteur R** : toujours au même emplacement (haut), plus grand que tout autre texte. Contraste ambre-or sur fond sombre ≥ ratio AA. Formatage des grands nombres progressif (ex. `1 234` → `12,3 k` → `1,00 M`) pour rester lisible d'un coup d'œil jusqu'à ≥ 1 000 000 — la valeur exacte reste juste ; seul l'affichage est abrégé (cohérent avec la règle d'affichage `floor(solde_mR/1000)` du charter).
- **Hiérarchie** : R (primordial) > boutons d'achat actifs > production courante par seconde > décor. Le regard doit trouver R sans chercher.
- **État grisé** : le contraste du bouton grisé reste suffisant pour être LU (le joueur doit voir le coût qu'il ne peut pas encore payer), tout en étant clairement non-cliquable — désaturation + opacité, jamais invisible.
- **Feedback non bloquant** : les `+N` flottants et les VFX de seuil ne masquent jamais le compteur R ni les boutons d'achat.

## world_constraints

*(Section DÉCIDÉE, ancrée sur les invariants de `story_bible:coherence_rules` et le charter.)*

- **Une seule ressource visible** : R/Lumen. Aucune seconde jauge de ressource, aucune monnaie premium, aucun compteur concurrent (`story_bible:coherence_rules` élément 1).
- **Aucun visuel de défaite, jamais** : pas de barre de vie, pas de timer de mort, pas d'écran game-over, pas d'alarme rouge plein écran (`story_bible:coherence_rules` élément 2 ; charter `criteres_demo` « AUCUN écran de défaite »).
- **Accumulation pure** : le vocabulaire visuel ne montre que de l'entrée de valeur (clic, production) et de la dépense d'achat — aucun visuel de vente, de troc ou de perte (`story_bible:coherence_rules` élément 3).
- **Fin unique ascendante** : la seule clôture visuelle est le `victory_bloom` à S5 (`story_bible:coherence_rules` élément 4).
- **Caveat World Scan** : les références du `worldscan` étant d'un genre étranger (puzzle/arcade) et `advisory:true`, aucune convention d'incremental n'en est tirée ; seules les propriétés transversales de feedback/rétention/observabilité de la victoire ont été héritées (cf. `## heritage_worldscan`). Toute grammaire d'incremental provient de la structure imposée (charter / `structure_imposee_v2.yaml`), pas du World Scan.

## asset_rules

*(Section DÉCIDÉE.)*

- **Format & runtime** : tous les assets sont `2D` / `html` (jeu web canvas). Aucun 3D, aucun asset destiné à Godot.
- **Style tags autorisés** (= frontmatter `styles`) : `flat-neon-dark` (UI : compteur, boutons, jauge), `luminous-glyph` (Cœur, générateurs, icônes d'amélioration), `radiant-burst-vfx` (les trois VFX). Chaque `asset_request` déclare l'un de ces trois tags, et aucun autre.
- **Rendu procédural admis** : ces spécifications gouvernent aussi bien un asset sourcé qu'un rendu par primitives canvas (cercles, dégradés, texte). Une entité peut être satisfaite par du dessin procédural à l'étape build — la présente spec reste la référence visuelle dans les deux cas. Le décor de fond (`background_ambient`) est explicitement laissé au procédural (required:false, aucune requête).
- **Licences** : aucune restriction au-delà de l'allowlist par défaut du studio (CC0-1.0, MIT, CC-BY-4.0, CC-BY-3.0) — déclaré `license_allowed: null` dans les requêtes.
- **Résolution catalogue = advisory** : le catalogue actuel n'expose que des styles `candy-pop`/`flat-top-down` (2D/html) ; aucune requête de cette bible ne résoudra probablement contre lui (`resolution_stats.blocked` attendu). C'est un fait légitime (Asset Contract V0 « BLOCKED vs FAIL »), jamais un défaut de couverture : sourcer/produire ces assets, ou les rendre en procédural, reste une décision aval (fog HumanGate).
