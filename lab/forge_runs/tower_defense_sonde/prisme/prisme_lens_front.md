## 1. CE QUE LE JOUEUR VOIT

L'écran affiche une grille fixe 20×12 (canvas 640×384). Un **chemin unique** en épingle traverse la grille dans une teinte nettement distincte des cases constructibles — l'œil sépare immédiatement « où ça passe » de « où je peux poser ». En surimpression, un **HUD permanent** montre trois compteurs lisibles sans aucune action : l'**or**, les **vies**, et le **numéro de vague** (« Vague N / 10 »), doublé d'un **libellé d'objectif** en clair.

Sur la grille : des **tours** posées (Gun, Frost, Cannon, apparence différenciée par type et par niveau), des **ennemis** (Grunt, Runner, Brute) rendus à leur position sur le chemin avec une **barre de vie** au-dessus de chacun, et des **projectiles** en vol de la tour vers sa cible. Un ennemi sous Frost est rendu dans une **teinte distincte** et avance visiblement plus lentement ; un tir de Cannon peint un **effet de zone**. Cliquer une tour l'entoure d'un **indicateur de portée**. En phase de préparation, un **compte à rebours** décroît à l'écran. À la fin, un **overlay** bloquant couvre le jeu et affiche **VICTORY** ou **DEFEAT**, avec un bouton **Restart** visible.

## 2. CE QUE LE JOUEUR FAIT

Tout passe par des cibles cliquables du DOM, jamais par un appel interne. Le joueur **sélectionne un type de tour** (`#btn-gun` / `#btn-frost` / `#btn-cannon`), puis **pose** la tour en cliquant une case libre du canvas — l'or affiché diminue aussitôt. Il **clique une tour posée** pour voir sa portée, puis clique **Améliorer** (`#btn-upgrade`) pour la faire monter en niveau : son apparence change, son niveau devient lisible. Pendant la préparation, il **appelle la vague** en avance (`#btn-call-wave`), interrompant le décompte contre un bond d'or immédiat, ou laisse la vague partir seule. À la fin de partie, il clique **Restart** (`#restart`) pour ramener l'écran à son état de départ. Chaque geste est une décision dont le coût ou le gain s'inscrit immédiatement dans un compteur affiché.

## 3. CE QUE LE JOUEUR RESSENT

Le ressenti est ancré à des déclencheurs visibles. La **tension** monte quand le compteur de vies chute d'un coup à l'arrivée d'une Brute — la sanction est lue à l'instant même. La **satisfaction** vient de la coïncidence entre un ennemi qui disparaît et l'or qui bondit : la boucle voir→agir→gagner se referme à l'écran. La **lisibilité de l'arbitrage** naît du contraste entre deux gestes également accessibles — poser une nouvelle tour (largeur) ou améliorer (hauteur) — dont les conséquences divergent sur le compteur d'or. Le changement de teinte d'un ennemi gelé rend **perceptible** l'utilité d'une tour qui ne tue pas. L'overlay final impose un **verdict** net et arrête tout : rien ne reste muet ni interne.

## 4. RÈGLES OBSERVABLES

- **R1 —** Au chargement, le HUD affiche simultanément l'or, les vies et « Vague 1 / 10 » ; les trois compteurs sont lisibles sans aucune action et mis à jour à chaque tick.
- **R2 —** Un libellé d'objectif non vide (« Survivre à la vague N / 10 ») est affiché en permanence dans le HUD.
- **R3 —** Le chemin est rendu dans une teinte distincte des cases constructibles ; on distingue à l'œil où une tour peut être posée.
- **R4 —** Un ennemi apparaît à l'entrée et parcourt le chemin visible en suivant ses virages jusqu'à la sortie, traçable du regard sur toute sa trajectoire.
- **R5 —** Sélectionner un type de tour puis cliquer une case libre fait apparaître une tour sur cette case et fait diminuer immédiatement le compteur d'or affiché.
- **R6 —** Une tour tire un projectile visible vers un ennemi ; à l'impact, la barre de vie de l'ennemi raccourcit à l'écran.
- **R7 —** Un ennemi dont la barre de vie atteint zéro disparaît et le compteur d'or augmente dans le même tick.
- **R8 —** Un ennemi qui atteint la sortie disparaît et le compteur de vies diminue immédiatement de son coût de fuite.
- **R9 —** Un ennemi sous effet Frost change de teinte et ralentit visiblement tant que l'effet dure.
- **R10 —** Un tir de Cannon produit un effet de zone visible : plusieurs barres de vie raccourcissent au même instant.
- **R11 —** Cliquer une tour posée affiche son indicateur de portée ; cliquer Améliorer change son apparence, rend son niveau lisible et élargit la portée affichée.
- **R12 —** Le compte à rebours de préparation est visible et décroît ; cliquer « Appeler la vague » l'interrompt et fait bondir le compteur d'or affiché.
- **R13 —** Le libellé d'objectif change à chaque nouvelle vague et affiche un texte distinct de celui de la vague précédente.
- **R14 —** Après le nettoyage d'une vague, l'affichage repasse en phase de préparation et les actions de pose, d'amélioration et d'appel redeviennent disponibles.
- **R15 —** Quand les vies atteignent zéro, un overlay apparaît par-dessus le jeu, affiche DEFEAT et l'animation s'arrête ; quand la vague 10 est nettoyée avec des vies restantes, l'overlay affiche VICTORY.
- **R16 —** Cliquer Restart fait disparaître l'overlay et ramène la grille, l'or, les vies et le numéro de vague à leur état de départ ; deux parties de même seed et mêmes clics présentent une suite d'images visuellement identique.

## 5. NOTES DE VALIDATION (lens Prisme front)

**Ancre** : charter.yaml étape 0 (`FORGE_DISPATCH:s0-contrat:tower_defense_sonde-20260829:1`), sections `criteres_demo` (D1–D14, observables) et `criteres_succes` (S1–S20). Aucun `worldscan.json`, `story_bible.json` ni `gm_worldscan.json` présent dans le run_dir (profil sonde HTML) — **je le constate, je ne compense pas** : toutes les références sont donc `null` (source `ADDITIONS`), et `stats.exigences_sourcees_gm` sera **0** (cohérent avec la baseline mesurée 0/13 avant `game_master`). Aucun `design/progression_contract.md` ni `design/calibration.md` présent : les exigences de boucle sont écrites dans l'ordre où le joueur les vit.

**Couverture des rôles de boucle (angle front)** : PLAYER_GOAL (ex02), PLAYER_ACTION (ex05, ex12), GAME_RESPONSE (ex06, ex08, ex09, ex10), REWARD (ex07), DECISION (ex13, options largeur/hauteur, 2 politiques, horizon 300), UNLOCK (ex11, avec `observe.appears`), NEXT_GOAL (ex14+ex15, deux objectifs `new_distinct` textuellement distincts sur `objectif`), REPEAT (ex16, `replay`). **META_LOOP et ADVANTAGE : non produits** — voir RETURN_REASON.

**Exigences classées non actionnables** : aucune anticipée (chaque exigence porte un `expected_proof` exploitable, kind ∈ visual/bot_action) — l'arbitre reste l'oracle en aval.

software_verdict: BLOCKED — l'oracle non-LLM `check_prisme_manifest.mjs` n'est pas exécutable dans ce périmètre (`run: aucun`) ; la validation mécanique est déléguée à l'exécuteur après matérialisation de prisme.json.
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED — besoin HumanGate remonté (fog) : voir RETURN_REASON.

SKIPPED_VALIDATION:
- Item : exécution de `node scripts/forge/check_prisme_manifest.mjs <run_dir>/prisme.json` · Où : prisme.json de ce run · Statut : non fait · Raison : permission `run: aucun` — l'exécuteur le lance en aval.
- Item : ancrage des références dans un artefact amont adressable · Où : champ `reference` de chaque exigence · Statut : non applicable · Raison : aucun worldscan/story_bible/gm_worldscan présent ; toutes les exigences sont `ADDITIONS`, `reference: null` assumé et déclaré.
- Item : maillons META_LOOP (I) et ADVANTAGE (J) · Où : boucle de jeu · Statut : non produits · Raison : inapplicables au genre (détail en RETURN_REASON) — non compensés par fabrication.

why_task_existed:
- problem: non transmis — activation par décision humaine (Pierre commande une sonde Tower Defense jouable, 2026-08-29) ; aucun défaut mesuré à l'origine.
- oracle: aucun (activation humaine).
- root_cause: non établie (commande, pas incident).
- action_reason: la lens front du Prisme produit la facette « produit fini vu à l'écran » du product_snapshot + les exigences falsifiables ancrées sur le rendu et les états d'interface.
result: product_snapshot.md (4 sections, 16 règles observables) et prisme.json (20 exigences front, chaîne observation→claim→énoncé→preuve→destination) produits dans cette réponse.
proof: aucune commande exécutée (run interdit) ; commande déléguée à l'exécuteur : `node scripts/forge/check_prisme_manifest.mjs <run_dir>/prisme.json`.
learning: le contrat Gameplay A..J (modèle prestige/incremental de Kitten Clicker) ne se projette pas intégralement sur un Tower Defense — les maillons META_LOOP/ADVANTAGE présupposent un reset de prestige donnant un avantage rejoué, absent ici par construction.
next_reason: escalade — l'oracle de complétude de boucle attend les 10 rôles dont META_LOOP et ADVANTAGE ; le prisme fusionné sera signalé incomplet sur I/J par NATURE DU GENRE, pas par défaut de rédaction. HumanGate/merge doit trancher comment mesurer la complétude de boucle pour un TD.

```json
{
  "game_id": "tower_defense_sonde",
  "exigences": [
    {
      "id": "ex01",
      "source": "ADDITIONS",
      "source_role": "prisme_lens_front",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter (D1, S1) montre qu'au chargement l'ecran presente deja un compteur d'or, un compteur de vies et un numero de vague, et que window.__game expose gold/lives/wave a tout tick.",
      "claim": "Sans ces trois compteurs lisibles en permanence, le joueur ne dispose d'aucune base pour decider quoi acheter ni quand appeler la vague : la lisibilite continue du HUD conditionne toute decision ulterieure.",
      "enonce": "Le HUD affiche or, vies et numero de vague des le chargement et les met a jour a chaque tick sans qu'aucune action soit requise.",
      "expected_proof": {"kind": "visual", "statement": "Capture PNG de la page au chargement montrant simultanement les compteurs or, vies et numero de vague."},
      "destination": "s5-wiremap"
    },
    {
      "id": "ex02",
      "source": "ADDITIONS",
      "source_role": "prisme_lens_front",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "PLAYER_GOAL",
      "observe": {"hud": "objectif", "predicate": "nonempty"},
      "observation": "Le charter impose un numero de vague affiche (D1) et un calendrier fixe de 10 vagues (conception.vagues).",
      "claim": "Un numero seul ne dit pas au joueur ce qu'il doit accomplir ; il faut un libelle d'objectif explicite a l'ecran pour que le but de la vague soit lisible avant qu'elle ne parte.",
      "enonce": "L'ecran affiche en permanence un libelle d'objectif non vide de la forme 'Survivre a la vague N / 10'.",
      "expected_proof": {"kind": "visual", "statement": "Capture PNG montrant le libelle d'objectif non vide dans le HUD."},
      "destination": "s5-wiremap"
    },
    {
      "id": "ex03",
      "source": "ADDITIONS",
      "source_role": "prisme_lens_front",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter (D1) exige un chemin visuellement distinct des cases constructibles ; la map est une grille 20x12 avec un chemin unique code en dur (conception.maps).",
      "claim": "Si le chemin n'est pas visuellement separe des cases libres, le joueur ne peut pas anticiper ou poser et le placement cesse d'etre une decision informee.",
      "enonce": "Le chemin est rendu dans une teinte distincte des cases constructibles, permettant de distinguer a l'oeil les cases ou une tour peut etre posee.",
      "expected_proof": {"kind": "visual", "statement": "Capture PNG ou le trace du chemin se distingue chromatiquement des cases constructibles."},
      "destination": "s5-wiremap"
    },
    {
      "id": "ex04",
      "source": "ADDITIONS",
      "source_role": "prisme_lens_front",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter (D2) montre un ennemi qui apparait a l'entree et parcourt le chemin visible en suivant ses virages jusqu'a la sortie.",
      "claim": "La trajectoire visible de bout en bout est ce qui permet au joueur de juger la couverture de ses tours ; un deplacement non tracable a l'oeil rendrait la decision de placement aveugle.",
      "enonce": "Chaque ennemi est rendu a sa position sur le chemin a chaque tick et suit visiblement la polyligne de l'entree jusqu'a la sortie.",
      "expected_proof": {"kind": "visual", "statement": "Sequence de captures PNG suivant un meme ennemi de l'entree a la sortie le long du chemin."},
      "destination": "s9-build"
    },
    {
      "id": "ex05",
      "source": "ADDITIONS",
      "source_role": "prisme_lens_front",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "PLAYER_ACTION",
      "affordance": "poser_tour",
      "observe": {"hud": "or", "predicate": "decreases"},
      "observation": "Le charter (D3, S5) montre que selectionner un bouton de tour puis cliquer une case libre fait apparaitre une tour et diminue l'or affiche.",
      "claim": "Tant que la pose passe par une cible cliquable du DOM et se solde par une baisse d'or visible, le joueur percoit immediatement le cout de son choix de largeur.",
      "enonce": "Le joueur pose une tour en selectionnant un type puis en cliquant la case libre 'poser_tour' ; une tour apparait sur la case et le compteur d'or affiche diminue.",
      "expected_proof": {"kind": "bot_action", "statement": "Un bot scripte selectionne Gun puis clique une case libre ; captures avant/apres montrant la tour apparue et l'or decru."},
      "destination": "s9-build"
    },
    {
      "id": "ex06",
      "source": "ADDITIONS",
      "source_role": "prisme_lens_front",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "GAME_RESPONSE",
      "observe": {"hud": "barre_vie", "predicate": "decreases"},
      "observation": "Le charter (D4) montre une tour qui tire un projectile visible et une barre de vie d'ennemi qui raccourcit a l'impact.",
      "claim": "Le projectile et le raccourcissement de barre relient une pose de tour a son effet ; sans ce retour visible, le joueur ne sait pas si son placement fonctionne.",
      "enonce": "A chaque tir resolu, un projectile est rendu de la tour vers sa cible et la barre de vie de l'ennemi touche raccourcit a l'ecran.",
      "expected_proof": {"kind": "visual", "statement": "Capture PNG d'un projectile en vol et de la barre de vie d'un ennemi avant/apres impact."},
      "destination": "s9-build"
    },
    {
      "id": "ex07",
      "source": "ADDITIONS",
      "source_role": "prisme_lens_front",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "REWARD",
      "observe": {"hud": "or", "predicate": "increases"},
      "observation": "Le charter (D5, ennemis) montre qu'un ennemi dont la barre s'epuise disparait et que l'or augmente au meme moment (bounty 8/6/25).",
      "claim": "La coincidence visible entre la mort d'un ennemi et le bond d'or est la recompense qui valide la decision de placement et referme la boucle voir->agir->gagner.",
      "enonce": "A la mort d'un ennemi, celui-ci disparait de l'ecran et le compteur d'or affiche augmente dans le meme tick.",
      "expected_proof": {"kind": "bot_action", "statement": "Un bot laisse une tour tuer un Grunt ; capture montrant la disparition et l'or passe de G a G+8."},
      "destination": "s9-build"
    },
    {
      "id": "ex08",
      "source": "ADDITIONS",
      "source_role": "prisme_lens_front",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "GAME_RESPONSE",
      "observe": {"hud": "vies", "predicate": "decreases"},
      "observation": "Le charter (D6) montre qu'un ennemi atteignant la sortie disparait et que le compteur de vies diminue immediatement (cout 1/1/5).",
      "claim": "La chute visible du compteur de vies est le signal de sanction ; sans elle le joueur ne percoit pas le cout d'une fuite et la pression cesse d'etre lisible.",
      "enonce": "Quand un ennemi atteint la sortie, il disparait et le compteur de vies affiche diminue immediatement de son cout de fuite.",
      "expected_proof": {"kind": "bot_action", "statement": "Un bot laisse fuir une Brute ; capture montrant les vies passees de L a L-5."},
      "destination": "s9-build"
    },
    {
      "id": "ex09",
      "source": "ADDITIONS",
      "source_role": "prisme_lens_front",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "GAME_RESPONSE",
      "observe": {"hud": "ennemi_teinte", "predicate": "changes"},
      "observation": "Le charter (D7, frost) montre qu'un ennemi passant a portee d'une tour Frost change de couleur et ralentit visiblement (-45 pourcent).",
      "claim": "Le changement de couleur est le seul indice qui rend l'effet Frost, une tour qui ne tue pas, perceptible ; sans lui l'investissement dans le controle paraitrait inutile au joueur.",
      "enonce": "Un ennemi sous l'effet Frost est rendu dans une teinte distincte et sa vitesse d'avancee a l'ecran diminue visiblement tant que l'effet dure.",
      "expected_proof": {"kind": "visual", "statement": "Captures PNG d'un meme ennemi avant et pendant l'effet Frost montrant le changement de teinte et l'ecart de position reduit."},
      "destination": "s9-build"
    },
    {
      "id": "ex10",
      "source": "ADDITIONS",
      "source_role": "prisme_lens_front",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "GAME_RESPONSE",
      "observe": {"hud": "barre_vie", "predicate": "decreases"},
      "observation": "Le charter (D8, cannon) montre qu'un tir de Cannon produit un effet de zone touchant plusieurs ennemis, plusieurs barres de vie raccourcissant au meme instant.",
      "claim": "L'affichage simultane de plusieurs barres qui chutent rend lisible la valeur du splash contre les paquets ; sans cette simultaneite visible, le joueur ne distingue pas Cannon d'une tour mono-cible.",
      "enonce": "Un tir de Cannon rend un effet de zone visible et fait raccourcir simultanement la barre de vie de chaque ennemi dans son rayon.",
      "expected_proof": {"kind": "visual", "statement": "Capture PNG d'un tir de Cannon sur un paquet de Grunts montrant plusieurs barres de vie raccourcies au meme instant."},
      "destination": "s9-build"
    },
    {
      "id": "ex11",
      "source": "ADDITIONS",
      "source_role": "prisme_lens_front",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "UNLOCK",
      "affordance": "ameliorer_tour",
      "observe": {"hud": "apparence_tour", "predicate": "changes", "appears": "capacite_niveau3"},
      "observation": "Le charter (D9, upgrades) montre que cliquer une tour affiche sa portee, que cliquer Ameliorer change son apparence et rend le niveau lisible, et que le niveau 3 debloque une capacite.",
      "claim": "Un changement d'apparence visible et un nouvel indicateur de niveau sont la preuve a l'ecran qu'une capacite s'est debloquee ; sans progression visible, l'arbitrage hauteur/largeur perd son signal de retour.",
      "enonce": "Le joueur ameliore une tour selectionnee en cliquant la cible 'ameliorer_tour' ; l'apparence de la tour change, son niveau devient lisible et l'indicateur de portee reflete la nouvelle capacite.",
      "expected_proof": {"kind": "bot_action", "statement": "Un bot ameliore une Gun jusqu'au niveau 3 ; captures avant/apres montrant l'apparence changee, le niveau affiche et la portee elargie."},
      "destination": "s9-build"
    },
    {
      "id": "ex12",
      "source": "ADDITIONS",
      "source_role": "prisme_lens_front",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "PLAYER_ACTION",
      "affordance": "appeler_vague",
      "observe": {"hud": "or", "predicate": "increases"},
      "observation": "Le charter (D10, economie) montre un compte a rebours de preparation qui decroit, interrompu par 'Appeler la vague', avec un bond visible d'or (bonus anticipation 2 or/s, max 30).",
      "claim": "Rendre le bond d'or immediatement visible apres l'appel transforme le tempo en decision percue : le joueur voit ce qu'il gagne a appeler tot au moment meme ou il renonce a sa fenetre de preparation.",
      "enonce": "Le joueur appelle la vague en cliquant la cible 'appeler_vague' pendant la preparation ; le compte a rebours s'interrompt et le compteur d'or affiche fait un bond immediat.",
      "expected_proof": {"kind": "bot_action", "statement": "Un bot clique Appeler la vague a 8 s restantes ; captures montrant le decompte interrompu et l'or augmente du bonus."},
      "destination": "s9-build"
    },
    {
      "id": "ex13",
      "source": "ADDITIONS",
      "source_role": "prisme_lens_front",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "DECISION",
      "observe": {"hud": "objectif", "predicate": "changes"},
      "options": ["ex05", "ex11"],
      "metric": "or",
      "horizon_frames": 300,
      "policies": [
        {"name": "idle", "click": null, "every_frames": 0},
        {"name": "largeur", "click": "poser_tour", "every_frames": 300}
      ],
      "observation": "Le charter (conception.boucle_meta_intra_partie, upgrades) montre un arbitrage permanent entre monter en hauteur (ameliorer, capacites niveau 3) et monter en largeur (nouvelles tours, couverture), aucune voie ne dominant l'autre.",
      "claim": "Cet arbitrage n'est une decision reelle que si les deux options restent simultanement accessibles et lisibles a l'ecran sur un meme horizon ; presentees comme un choix affiche, elles produisent des trajectoires d'or et de couverture differentes.",
      "enonce": "L'ecran presente, pendant la preparation, le choix entre investir en largeur ('poser_tour') et investir en hauteur ('ameliorer_tour'), et l'objectif affiche reflete la consequence de ce choix sur l'or disponible.",
      "expected_proof": {"kind": "bot_action", "statement": "Deux bots (largeur vs hauteur) jouent la meme seed ; leurs courbes d'or affiche divergent, capturees sur 300 frames."},
      "destination": "s3-decompo"
    },
    {
      "id": "ex14",
      "source": "ADDITIONS",
      "source_role": "prisme_lens_front",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NEXT_GOAL",
      "observe": {"hud": "objectif", "predicate": "new_distinct"},
      "observation": "Le charter (conception.vagues) montre un calendrier fixe ou la vague 4 introduit une Brute blindee (armure 4).",
      "claim": "Afficher l'objectif de la vague a venir sous une forme textuelle distincte permet au joueur d'anticiper la reponse a acheter ; un objectif generique ne porterait pas l'information de type.",
      "enonce": "A l'entree de la vague 4, l'ecran affiche un objectif distinct tel que 'Vague 4 / 10 : une Brute blindee approche'.",
      "expected_proof": {"kind": "visual", "statement": "Capture PNG du libelle d'objectif de la vague 4."},
      "destination": "s5-wiremap"
    },
    {
      "id": "ex15",
      "source": "ADDITIONS",
      "source_role": "prisme_lens_front",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NEXT_GOAL",
      "observe": {"hud": "objectif", "predicate": "new_distinct"},
      "observation": "Le charter (conception.vagues) montre que la vague 6 est une vague de 18 Runners rapides, distincte de la vague 4.",
      "claim": "Un second objectif au texte different prouve que le libelle change reellement de contenu d'une vague a l'autre et n'est pas un compteur numerique deguise.",
      "enonce": "A l'entree de la vague 6, l'ecran affiche un objectif textuellement distinct de celui de la vague 4, tel que 'Vague 6 / 10 : vague de Runners rapides'.",
      "expected_proof": {"kind": "visual", "statement": "Captures PNG des objectifs des vagues 4 et 6 montrant deux textes distincts."},
      "destination": "s5-wiremap"
    },
    {
      "id": "ex16",
      "source": "ADDITIONS",
      "source_role": "prisme_lens_front",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "REPEAT",
      "observe": {"hud": "phase", "predicate": "changes"},
      "replay": ["ex05", "ex06", "ex07", "ex11"],
      "observation": "Le charter (conception.boucle_vague) montre le cycle preparation -> pose/upgrade -> appel -> deferlement -> nettoyage -> bonus -> retour en preparation.",
      "claim": "Le retour visible a la phase de preparation apres nettoyage rend la boucle rejouable : le joueur retrouve le meme jeu d'actions dans un etat modifie, sans quoi il n'y aurait qu'une seule vague.",
      "enonce": "Apres le nettoyage d'une vague, l'affichage repasse en phase de preparation et le joueur peut de nouveau poser, ameliorer et appeler la vague suivante.",
      "expected_proof": {"kind": "bot_action", "statement": "Un bot enchaine deux vagues ; capture montrant le retour du HUD en phase 'prep' et les actions de nouveau disponibles."},
      "destination": "s9-build"
    },
    {
      "id": "ex17",
      "source": "ADDITIONS",
      "source_role": "prisme_lens_front",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter (D11, S6) montre qu'a zero vie un overlay #overlay apparait par-dessus le jeu, affiche DEFEAT, et le jeu s'arrete.",
      "claim": "Un overlay bloquant portant le mot DEFEAT est le signal de fin non ambigu ; sans lui, l'etat de defaite resterait interne (window.__game.result) et invisible au joueur.",
      "enonce": "Quand les vies atteignent zero, l'overlay devient visible par-dessus le canvas, contient le texte 'DEFEAT' et l'animation de jeu s'arrete.",
      "expected_proof": {"kind": "bot_action", "statement": "Un bot naif perd sur la seed 1337 ; capture de l'overlay DEFEAT visible."},
      "destination": "s5-wiremap"
    },
    {
      "id": "ex18",
      "source": "ADDITIONS",
      "source_role": "prisme_lens_front",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter (D12, S6) montre qu'a la vague 10 nettoyee avec vies restantes l'overlay affiche VICTORY.",
      "claim": "Le mot VICTORY dans le meme overlay ferme symetriquement la partie cote succes ; reutiliser la meme surface pour les deux issues garantit qu'aucune fin n'est muette.",
      "enonce": "Quand la vague 10 est nettoyee avec lives > 0, l'overlay devient visible et contient le texte 'VICTORY'.",
      "expected_proof": {"kind": "bot_action", "statement": "Un bot competent gagne sur la seed 1337 ; capture de l'overlay VICTORY visible."},
      "destination": "s5-wiremap"
    },
    {
      "id": "ex19",
      "source": "ADDITIONS",
      "source_role": "prisme_lens_front",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "NONE",
      "affordance": "redemarrer",
      "observation": "Le charter (D13, S6) montre que cliquer #restart fait disparaitre l'overlay et ramene or, vies, vague et grille a l'etat de depart (egalite stricte avec l'etat initial).",
      "claim": "Un restart qui retablit exactement l'ecran de depart rend la sonde rejouable a l'identique ; le joueur doit voir la grille se vider et les compteurs revenir a leurs valeurs initiales.",
      "enonce": "Le joueur clique la cible 'redemarrer' ; l'overlay disparait et l'ecran revient a l'etat de depart (grille vide, or et vies initiaux, vague 1).",
      "expected_proof": {"kind": "bot_action", "statement": "Un bot termine une partie puis clique Restart ; captures avant/apres montrant l'ecran ramene a l'etat initial."},
      "destination": "s9-build"
    },
    {
      "id": "ex20",
      "source": "ADDITIONS",
      "source_role": "prisme_lens_front",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter (D14, S2) montre que deux parties de meme seed et memes clics se ressemblent image par image et produisent un hash d'etat final strictement egal.",
      "claim": "L'identite visuelle image par image entre deux runs de meme seed est la manifestation observable du determinisme ; c'est elle qui autorise a traiter une capture comme une preuve rejouable plutot qu'un instantane fortuit.",
      "enonce": "Deux parties lancees avec la meme seed et la meme sequence de clics horodates en ticks presentent une suite d'images visuellement identique.",
      "expected_proof": {"kind": "visual", "statement": "Deux sequences de captures PNG de meme seed et memes actions, comparees image par image."},
      "destination": "s9-build"
    }
  ]
}
```

RETURN_REASON: {"status": "DISCOVERED", "problem": "Le contrat Gameplay A..J impose les maillons META_LOOP (I) et ADVANTAGE (J), mais la sonde Tower Defense n'a ni prestige ni meta-progression persistante (charter hors_scope) et son restart est un reset strict a l'etat initial, l'inverse d'un avantage rejoue : aucune exigence front honnete ne peut porter I ni J.", "root_cause": "Le modele de boucle A..J est calibre sur un jeu incremental a prestige (Kitten Clicker) et n'est pas generique au genre Tower Defense."}