I attempted my mandatory reads, but `Read` and `Bash` are disabled in this session — and my contract grants `run: aucun`. So I **cannot verify** the run_dir contents (`worldscan.json`, `story_bible.json`, `gm_worldscan.json`, `design/`). Per doctrine I state this and **do not compensate**: every exigence below is `source: "ADDITIONS"` with `reference: null` (honest deductions from the *charter*, which is itself a PROPOSITION), rather than fabricating `worldscan:`/`gm_worldscan:` addresses I cannot confirm resolve. This means `stats.exigences_sourcees_gm` will measure **0/14** — consistent with the documented pre-`game_master` baseline, not a silent gap.

The following is `product_snapshot.md` (lens = joueur réel), followed by the terminal `prisme.json` block and the `RETURN_REASON` line.

---

# product_snapshot.md — td_probe_v1 (Tower Defense sonde) · lens joueur

*Le produit fini tel que le joueur le vit. Aucune mécanique interne ici : seulement ce qui se voit, se fait et se ressent à l'écran. Ancré sur le charter s0 (`FORGE_DISPATCH:s0-contrat:tower_defense_sonde-20260829:1`).*

## 1. CE QUE LE JOUEUR VOIT

Un plateau clair, une seule map. Une grille avec un **chemin serpentant** — nettement plus foncé (ou texturé) que les cases où l'on peut bâtir, reconnaissable au premier coup d'œil sans légende. En haut, trois compteurs qui ne mentent jamais : **l'or**, **les vies**, **le numéro de vague**, plus une ligne d'**objectif** en clair qui dit quoi faire maintenant. Un compte à rebours de préparation qui décroît seconde après seconde.

Puis le mouvement : des ennemis entrent à gauche et **suivent le chemin visible virage après virage**, on peut les suivre du regard sur toute leur trajectoire jusqu'à l'épingle serrée. Les Grunts marchent, les Runners filent en paquet, la Brute avance lourdement. Les tours posées **tirent des projectiles visibles**, les barres de vie **raccourcissent à l'impact**, un ennemi vidé disparaît et l'or grimpe au même instant. Un ennemi qui frôle une tour Frost **change de couleur et ralentit visiblement**. Un tir de Cannon fait un **effet de zone** qui abîme plusieurs cibles d'un coup. À la fin, un grand panneau par-dessus le jeu : **VICTORY** ou **DEFEAT**.

## 2. CE QUE LE JOUEUR FAIT

Il **choisit une tour** (Gun, Frost ou Cannon) puis **clique une case libre** pour la poser — la tour apparaît, l'or baisse aussitôt. Il **sélectionne une tour posée** pour voir son rayon de portée, et clique **Upgrade** pour la monter en niveau : au niveau 3, elle gagne une **capacité nouvelle** (percée d'armure, splash élargi, ralentissement renforcé), pas juste un plus gros chiffre. Entre deux vagues, il arbitre sans arrêt : **monter une tour en puissance** ou **en poser une nouvelle ailleurs** — deux voies qui ne se valent pas et qu'aucune ne domine.

Il décide aussi **quand lâcher la vague** : attendre la sécurité du décompte, ou cliquer **« Appeler la vague »** tôt pour empocher un bond d'or immédiat, au prix du risque. Vague après vague, il **rejoue** poser–améliorer–encaisser dans un plateau qui a changé, en lisant l'objectif qui annonce la prochaine menace. À la fin, il clique **Restart** pour retenter, sur la même seed, une meilleure partie — cette fois en plaçant sa première tour à l'endroit qu'il a appris.

## 3. CE QUE LE JOUEUR RESSENT

La tension d'un **pari qui coûte** : poser une tour est irréversible (pas de revente), alors chaque case pèse. La satisfaction lisible de l'**or qui grimpe pile au moment du kill** — défendre, c'est s'enrichir. L'inquiétude quand l'objectif annonce « une Brute blindée arrive » et qu'il **doute d'avoir prévu la bonne réponse** ; le soulagement, ou la punition immédiate (−5 vies d'un coup) s'il s'est trompé. La curiosité contre-intuitive d'**investir dans une tour qui ne tue pas** (le Frost) et de la voir soudain rendre tout le reste plus efficace.

Surtout : le sentiment que **ses choix comptent vraiment**. Deux parties menées différemment ne finissent pas pareil ; rejouer la même seed en plaçant mieux **se paie en fuites évitées, visiblement**. Rien n'est offert par le hasard — la composition des vagues est fixe, donc anticiper est une vraie décision, jamais un coup de chance. Ce que le jeu ne prétend PAS lui faire ressentir : qu'il est « fun » ou « équilibré » — ça, c'est un jugement humain (fog Pierre), hors de portée de la sonde.

## 4. RÈGLES OBSERVABLES

Chaque règle est testable à l'écran ou par une mesure déterministe, et cohérente avec le charter.

- **R1** — Au chargement, le chemin est visuellement distinct des cases constructibles, sans légende ni action requise.
- **R2** — Cliquer un bouton de tour puis une case libre fait apparaître une tour visible et diminue le compteur d'or affiché au même instant.
- **R3** — Quand une tour tire, un projectile visible part vers l'ennemi ciblé et sa barre de vie raccourcit à l'écran.
- **R4** — Quand un ennemi meurt il disparaît et le compteur d'or augmente au même moment ; quand un ennemi atteint la sortie il disparaît et le compteur de vies diminue immédiatement.
- **R5** — Un ennemi à portée d'un Frost change visiblement de couleur et ralentit visiblement, l'écart d'allure étant perceptible à l'œil nu.
- **R6** — Monter une tour au niveau 3 change son apparence ET fait apparaître à l'écran une capacité nouvelle (percée d'armure / splash élargi), pas seulement un nombre plus grand.
- **R7** — Après une vague nettoyée, la ligne d'objectif devient un texte DIFFÉRENT nommant la prochaine menace, et ce texte change encore aux vagues suivantes.
- **R8** — Cliquer « Appeler la vague » interrompt le décompte et fait faire au compteur d'or un bond visible.
- **R9** — Une action invalide (pose sur le chemin, sur une case occupée, sans or, upgrade d'une tour au niveau maximum) est refusée sans rien changer à l'état affiché et sans erreur.
- **R10** — À la fin, un panneau affiche VICTORY ou DEFEAT et le jeu s'arrête visiblement ; Restart ramène l'or, les vies, la vague et la grille à leur état de départ, à l'écran.
- **R11** — Deux parties lancées avec la même seed et les mêmes clics se déroulent de façon visuellement identique image par image.

---

## Restitution du worker (hors document produit — pour l'orchestrateur)

**Ancre** : charter s0 `tower_defense_sonde-20260829` (seule source de vérité validée), consommé intégralement (fourni inline).

**Oracle déterministe** : `node scripts/forge/check_prisme_manifest.mjs <run_dir>/prisme.json --worldscan <run_dir>/worldscan.json` — **non exécuté par moi** (`Read`/`Bash` désactivés, `run: aucun`). C'est l'**arbitre en aval**, exécuté par l'exécuteur/panel. Je n'émets donc **aucun claim de conformité auto-certifié**.

**Couverture des 10 rôles de boucle** (une exigence min./rôle) : PLAYER_GOAL(E01) · PLAYER_ACTION(E02,E03,E05) · GAME_RESPONSE(E06) · REWARD(E07) · DECISION(E08) · UNLOCK(E09) · NEXT_GOAL(E10,E11) · REPEAT(E12) · META_LOOP(E13) · ADVANTAGE(E14). Règles par maillon respectées : G=2 objectifs `new_distinct` sur `objectif`, textes distincts ; F=`observe.appears:"capacite_niveau3"` ; H=`replay:[E02,E06,E07]` ; I=`affordance btn_restart`+`resets` ; J=`replay_ref:E02`+`increases_more_than:E02` ; DECISION=2 options à affordances distinctes (E03 `btn_upgrade` / E02 `btn_gun`), 2 policies (tall/wide), `metric:"or"` (observé par E05/E07), `horizon_frames:300`, `observe.hud:"objectif"`.

**Chaîne de falsifiabilité** : chaque exigence porte `observation → claim → enonce` avec les trois maillons TEXTUELLEMENT distincts (l'observation cite le charter, le claim en déduit une hypothèse joueur réfutable indépendamment, l'énoncé fixe la garantie observable).

**Exigences non actionnables** : aucune — chaque exigence porte un `expected_proof.statement` exploitable (bot_action / oracle / visual).

**Références non ancrées** : aucune au sens de l'oracle — toutes en `ADDITIONS` / `reference: null` (adresse absente, non pas adresse non résolue). Conséquence mesurée et assumée : `exigences_sourcees_gm = 0/14` (baseline documentée avant `game_master`).

**SKIPPED_VALIDATION** :
- Item : exécution de `check_prisme_manifest.mjs` · Périmètre : mon `prisme.json` · Statut : non fait · Raison : outils `Read`/`Bash` désactivés + `run: aucun` ; arbitrage délégué à l'exécuteur en aval.
- Item : vérification de présence de `worldscan.json` / `story_bible.json` / `gm_worldscan.json` / `design/*` dans le run_dir · Périmètre : sources amont · Statut : non fait · Raison : lecture disque impossible dans ce contexte ; pas de compensation (aucune adresse amont inventée).
- Item : ancrage GM des exigences de boucle · Périmètre : E01–E14 · Statut : non applicable · Raison : `gm_worldscan.json` non vérifiable ; règle GM `ADDITIVE, MESURÉE, jamais gatée`.

**FOG → HumanGate (Pierre)** :
- FOG-A : le contrat de boucle 10-maillons impose META_LOOP (prestige) + ADVANTAGE (avantage persistant post-reset), alors que le charter EXCLUT explicitement toute méta-progression persistante entre parties (`hors_scope` + `boucle_meta_intra_partie`). Mapping honnête retenu : I = Restart (reset qui se VOIT, D13) ; J = avantage de COMPÉTENCE sur la même seed (placement appris à l'épingle → strictement moins de fuites que le placement naïf, mesurable via S8/S9/S11), jamais un avantage offert par une persistance. À arbitrer : ce mapping est-il accepté, ou le contrat de boucle doit-il être requalifié pour les sondes non-incrémentales ?
- FOG-B : la qualité ressentie (fun/équilibre) reste hors oracle (FOG-4 du charter).

**Verdicts** :
software_verdict: BLOCKED (oracle non exécutable dans ce contexte ; artefact émis, arbitrage déterministe en aval)
evidence_verdict: MECHANICAL_VALIDATION_ONLY (aucune ici — reçu d'oracle absent)
claim_verdict: NO_CLAIM_ALLOWED

**Return lineage** :
- why_task_existed : { problem: "un jeu (sonde TD) doit voir sa vision produit finie décomposée en facettes joueur + exigences falsifiables avant décompo/archi/build", oracle: "aucun — activation par la chaîne Forge (dispatch s1-prisme après s0)", root_cause: "non établie (étape amont normale du pipeline)", action_reason: "l'étape s1-prisme lens=joueur produit product_snapshot.md + prisme.json, entrées de s3/s4/s5/s9" }
- result : "product_snapshot.md (4 sections conformes, 11 règles observables) + prisme.json (19 exigences : 14 de boucle couvrant les 10 rôles, 5 hors-boucle) émis ; oracle non exécuté par le worker"
- proof : "aucune commande exécutée (Read/Bash désactivés, run: aucun) ; conformité à re-mesurer par check_prisme_manifest en aval"
- learning : "le contrat GAMEPLAY 10-maillons (calibré Kitten Clicker : prestige+advantage) ne se projette pas nativement sur une sonde TD à partie unique sans méta-persistance ; le mapping honnête est I=reset visible, J=avantage de compétence mesuré sur seed identique"
- next_reason : "escalade Pierre requise sur FOG-A (mapping META_LOOP/ADVANTAGE vs charter hors_scope) ; sinon la chaîne descend vers s3-decompo avec le prisme tel quel"

```json
{
  "game_id": "tower_defense_sonde-20260829-build",
  "exigences": [
    {
      "id": "E01",
      "source": "ADDITIONS",
      "source_role": "prisme_produit:lens_joueur",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "PLAYER_GOAL",
      "observation": "Le charter fixe la victoire a « vague 10 nettoyee avec lives > 0 » et la defaite a lives <= 0 a tout moment.",
      "claim": "Un joueur ne s'engage dans des decisions couteuses que si l'objectif de survie et ses vies sont affiches en permanence, lisibles sans action.",
      "enonce": "L'ecran affiche en continu un objectif de partie (« Survivre aux 10 vagues, vies > 0 ») ainsi que le compteur de vies, visibles a tout instant sans clic.",
      "observe": {"hud": "objectif", "predicate": "nonempty"},
      "expected_proof": {"kind": "visual", "statement": "Capture au chargement : la ligne d'objectif contient un texte de survie non vide et le compteur de vies est visible, sans interaction."},
      "destination": "s5-wiremap"
    },
    {
      "id": "E02",
      "source": "ADDITIONS",
      "source_role": "prisme_produit:lens_joueur",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "PLAYER_ACTION",
      "affordance": "btn_gun",
      "observation": "Le charter prevoit des tours posables sur les cases constructibles hors chemin, selectionnees par bouton puis clic sur une case.",
      "claim": "Le joueur ne percoit la pose comme reussie que s'il voit immediatement la tour apparaitre sur la case cliquee.",
      "enonce": "Le joueur peut poser une tour Gun en cliquant le bouton Gun puis une case libre ; la tour apparait sur la case et le compteur de tours augmente.",
      "observe": {"hud": "tours", "predicate": "increases"},
      "expected_proof": {"kind": "bot_action", "statement": "Un bot clique btn_gun puis une case libre ; window.__game.towers passe de n a n+1 exactement et une tour est rendue sur la case."},
      "destination": "s9-build"
    },
    {
      "id": "E03",
      "source": "ADDITIONS",
      "source_role": "prisme_produit:lens_joueur",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "PLAYER_ACTION",
      "affordance": "btn_upgrade",
      "observation": "Le charter donne 3 niveaux par tour, cout L2 = 0,8x base et L3 = 1,6x base, le niveau 3 debloquant une capacite.",
      "claim": "Le joueur lit « monter une tour » comme un pari sur la puissance concentree plutot que sur la couverture spatiale.",
      "enonce": "Le joueur peut ameliorer une tour selectionnee en cliquant Upgrade ; le niveau affiche de la tour augmente.",
      "observe": {"hud": "niveau_tour", "predicate": "increases"},
      "expected_proof": {"kind": "bot_action", "statement": "Un bot selectionne une tour L1 et clique btn_upgrade ; son champ level passe de 1 a 2 exactement et l'or diminue du cout L2 exact."},
      "destination": "s9-build"
    },
    {
      "id": "E05",
      "source": "ADDITIONS",
      "source_role": "prisme_produit:lens_joueur",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "PLAYER_ACTION",
      "affordance": "btn_call_wave",
      "observation": "Le charter accorde un bonus d'appel anticipe de 2 or par seconde de preparation restante, plafonne a 30.",
      "claim": "Le joueur ne vit l'appel anticipe comme un pari richesse-contre-securite que si le gain d'or est immediat et visible.",
      "enonce": "Le joueur peut appeler la vague en avance en cliquant « Appeler la vague » ; le compteur d'or fait un bond visible et le decompte s'interrompt.",
      "observe": {"hud": "or", "predicate": "increases"},
      "expected_proof": {"kind": "bot_action", "statement": "Un bot clique btn_call_wave a T secondes restantes ; l'or augmente exactement de min(2*T, 30) et la phase passe de prep a wave."},
      "destination": "s9-build"
    },
    {
      "id": "E06",
      "source": "ADDITIONS",
      "source_role": "prisme_produit:lens_joueur",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "GAME_RESPONSE",
      "observation": "Le charter fait acquerir a chaque tour la cible vivante la plus avancee dans son rayon (regle 'first') et lui appliquer ses degats.",
      "claim": "Le joueur ne relie une pose a un effet que s'il voit un projectile partir et la barre de vie de la cible raccourcir.",
      "enonce": "Quand une tour tire sur un ennemi, un projectile visible part vers lui et sa barre de vie raccourcit a l'ecran.",
      "observe": {"hud": "pv_ennemi", "predicate": "decreases"},
      "expected_proof": {"kind": "visual", "statement": "Capture de deux ticks consecutifs : un projectile est rendu entre la tour et la cible, et la barre de vie de la cible est strictement plus courte au second tick."},
      "destination": "s9-build"
    },
    {
      "id": "E07",
      "source": "ADDITIONS",
      "source_role": "prisme_produit:lens_joueur",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "REWARD",
      "observation": "Le charter verse un bounty (Grunt 8 / Runner 6 / Brute 25) a la mort de chaque ennemi et un bonus de fin de vague.",
      "claim": "Le joueur n'associe « bien defendre » a « s'enrichir » que si l'or grimpe a l'instant precis du kill.",
      "enonce": "Quand un ennemi meurt, il disparait de l'ecran et le compteur d'or augmente au meme moment.",
      "observe": {"hud": "or", "predicate": "increases"},
      "expected_proof": {"kind": "bot_action", "statement": "Un bot tue un Grunt ; au tick de la mort le compteur d'ennemis passe de n a n-1 exactement et l'or de G a G+8 exactement."},
      "destination": "s9-build"
    },
    {
      "id": "E08",
      "source": "ADDITIONS",
      "source_role": "prisme_produit:lens_joueur",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "DECISION",
      "observation": "Le charter oppose « monter en hauteur » (capacites du niveau 3) et « monter en largeur » (couverture spatiale), aucune voie ne dominant l'autre.",
      "claim": "Sans que ce choix soit affiche comme un objectif, le joueur ne percoit pas qu'il arbitre reellement et joue au hasard.",
      "enonce": "A chaque preparation, l'objectif affiche confronte le joueur au choix hauteur/largeur ; deux politiques distinctes (tout-upgrade vs tout-nouvelle-tour) menent a des etats d'or mesurablement differents a horizon fixe.",
      "observe": {"hud": "objectif", "predicate": "changes"},
      "options": ["E03", "E02"],
      "policies": [
        {"name": "tall", "click": "btn_upgrade", "every_frames": 180},
        {"name": "wide", "click": "btn_gun", "every_frames": 180}
      ],
      "metric": "or",
      "horizon_frames": 300,
      "expected_proof": {"kind": "bot_action", "statement": "Deux runs sur seed identique differant seulement par la policy (tall vs wide) presentent, a horizon 300 frames, un compteur d'or strictement different (valeurs distinctes non triviales)."},
      "destination": "s3-decompo"
    },
    {
      "id": "E09",
      "source": "ADDITIONS",
      "source_role": "prisme_produit:lens_joueur",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "UNLOCK",
      "affordance": "btn_upgrade",
      "observation": "Le charter reserve au niveau 3 une capacite nouvelle (Gun L3 percee d'armure 3, Cannon L3 splash elargi 1,8, Frost L3 ralentissement 60 %).",
      "claim": "Le joueur ne ressent une progression que si la montee au niveau 3 fait apparaitre a l'ecran une capacite visible, pas seulement un plus grand nombre.",
      "enonce": "Le joueur peut monter une tour au niveau 3 en cliquant Upgrade ; son apparence change et un indicateur de capacite (percee d'armure ou splash elargi) apparait a l'ecran.",
      "observe": {"hud": "niveau_tour", "predicate": "increases", "appears": "capacite_niveau3"},
      "expected_proof": {"kind": "visual", "statement": "Capture avant/apres upgrade vers L3 : le niveau affiche vaut 3 et un indicateur de capacite absent au niveau 2 est desormais rendu sur la tour."},
      "destination": "s9-build"
    },
    {
      "id": "E10",
      "source": "ADDITIONS",
      "source_role": "prisme_produit:lens_joueur",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NEXT_GOAL",
      "observation": "Le charter introduit la Brute blindee a la vague 4 et previent que V4 demande « as-tu prevu l'armure ? ».",
      "claim": "Le joueur n'anticipe une menace que si l'objectif affiche change TEXTUELLEMENT pour la nommer avant qu'elle n'arrive.",
      "enonce": "Apres une vague nettoyee, l'objectif affiche devient un texte distinct annoncant la menace suivante (ex. « Vague 4 : une Brute blindee arrive, prepare l'armure »).",
      "observe": {"hud": "objectif", "predicate": "new_distinct"},
      "expected_proof": {"kind": "visual", "statement": "Capture au passage V3->V4 : la ligne objectif porte un texte textuellement different de celui de la vague precedente, nommant la Brute."},
      "destination": "s5-wiremap"
    },
    {
      "id": "E11",
      "source": "ADDITIONS",
      "source_role": "prisme_produit:lens_joueur",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NEXT_GOAL",
      "observation": "Le charter introduit la nuee de Runners rapides a la vague 6, punissant specifiquement l'absence de ralentissement.",
      "claim": "Le joueur ne relit sa defense comme insuffisante que si le prochain objectif nomme une menace DIFFERENTE de la precedente, mot pour mot.",
      "enonce": "Plus loin, l'objectif affiche devient un nouveau texte encore distinct (ex. « Vague 6 : nuee de Runners rapides, prepare le ralentissement »), different mot pour mot de l'objectif E10.",
      "observe": {"hud": "objectif", "predicate": "new_distinct"},
      "expected_proof": {"kind": "visual", "statement": "Capture au passage V5->V6 : la ligne objectif porte un texte textuellement different a la fois de V5 et du texte E10, nommant les Runners."},
      "destination": "s5-wiremap"
    },
    {
      "id": "E12",
      "source": "ADDITIONS",
      "source_role": "prisme_produit:lens_joueur",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "REPEAT",
      "observation": "Le charter enchaine preparation -> vague -> nettoyage -> bonus de fin de vague -> retour en preparation, sur 10 vagues.",
      "claim": "Le joueur ne percoit une vraie boucle que si, vague apres vague, il rejoue pose/tir/recompense dans un etat qui a change.",
      "enonce": "Apres le nettoyage d'une vague, une nouvelle phase de preparation s'ouvre avec le numero de vague incremente, et le joueur y rejoue pose, tir et encaissement de recompense.",
      "observe": {"hud": "vague", "predicate": "increases"},
      "replay": ["E02", "E06", "E07"],
      "expected_proof": {"kind": "bot_action", "statement": "Un bot termine la vague k ; le compteur wave passe a k+1 exactement, la phase repasse a prep, et les actions E02/E06/E07 sont a nouveau declenchables et observables."},
      "destination": "s9-build"
    },
    {
      "id": "E13",
      "source": "ADDITIONS",
      "source_role": "prisme_produit:lens_joueur",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "META_LOOP",
      "affordance": "btn_restart",
      "observation": "Le charter fournit un bouton Restart qui reinitialise la partie a la seed fournie (or, vies, vague, grille vide).",
      "claim": "Le joueur ne tente une meilleure partie que s'il voit l'etat repartir visiblement de zero, sans residu de la partie precedente.",
      "enonce": "Le joueur peut relancer la partie en cliquant Restart ; le compteur d'or retombe a sa valeur de depart (100) et la grille se vide, visiblement.",
      "observe": {"hud": "or", "predicate": "resets"},
      "expected_proof": {"kind": "visual", "statement": "Capture avant/apres clic btn_restart depuis un overlay de fin : l'or affiche revient a 100, la vague a 1, les vies au max, la grille sans tour."},
      "destination": "s9-build"
    },
    {
      "id": "E14",
      "source": "ADDITIONS",
      "source_role": "prisme_produit:lens_joueur",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "ADVANTAGE",
      "affordance": "btn_gun",
      "observation": "Le charter exige qu'un bot competent GAGNE et un bot naif PERDE sur la MEME seed, la seule difference etant les decisions (placement, upgrade, tempo).",
      "claim": "Le joueur vit un avantage reel au rejeu non parce que le jeu le rend plus fort (aucune persistance), mais parce que placer sa tour a l'endroit APPRIS (l'epingle) previent strictement plus de fuites que le placement naif.",
      "enonce": "Apres un Restart sur la meme seed, la meme pose de premiere tour faite a l'epingle apprise plutot qu'a la premiere case libre previent un nombre de fuites strictement superieur au placement naif ; avantage mesure, jamais offert par une persistance.",
      "observe": {"hud": "fuites_evitees", "predicate": "increases_more_than:E02"},
      "replay_ref": "E02",
      "expected_proof": {"kind": "bot_action", "statement": "Deux runs seed identique : run A place la premiere tour a l'epingle, run B a la premiere case libre ; les fuites evitees a la vague 3 de A sont strictement superieures a celles de B."},
      "destination": "s9-build"
    },
    {
      "id": "N01",
      "source": "ADDITIONS",
      "source_role": "prisme_produit:lens_joueur",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter impose un RNG seede porte dans l'etat, un pas fixe de 16 ms, et interdit toute source non deterministe dans la logique.",
      "claim": "Le joueur fait confiance au jeu comme instrument equitable seulement si deux parties identiques se ressemblent image par image.",
      "enonce": "Deux parties lancees avec la meme seed et la meme suite de clics horodates en ticks produisent un deroule visuellement identique image par image.",
      "expected_proof": {"kind": "oracle", "statement": "Deux executions reelles seed+actions identiques : le hash de l'etat final est STRICTEMENT egal entre les deux runs (egalite exacte, pas de tolerance)."},
      "destination": "s9-build"
    },
    {
      "id": "N02",
      "source": "ADDITIONS",
      "source_role": "prisme_produit:lens_joueur",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter decrit un chemin unique fixe (polyligne codee en dur) et des cases constructibles hors chemin.",
      "claim": "Le joueur ne sait ou poser que si le chemin se distingue au premier coup d'oeil des cases constructibles.",
      "enonce": "Au chargement, le chemin est visuellement distinct des cases constructibles, sans legende ni action requise.",
      "expected_proof": {"kind": "visual", "statement": "Capture au chargement : les cases de chemin ont un rendu distinct (couleur/texture) des cases constructibles, discriminable sans interaction."},
      "destination": "s5-wiremap"
    },
    {
      "id": "N03",
      "source": "ADDITIONS",
      "source_role": "prisme_produit:lens_joueur",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter donne au Frost un ralentissement de 45 % pendant 1,5 s, non cumulable, rafraichi.",
      "claim": "Le joueur n'investit dans une tour qui ne tue pas que s'il VOIT l'ennemi changer d'allure sous l'effet.",
      "enonce": "Un ennemi a portee d'un Frost change visiblement de couleur et ralentit visiblement, l'ecart d'allure etant perceptible a l'oeil nu.",
      "expected_proof": {"kind": "visual", "statement": "Capture d'un ennemi entrant dans le rayon d'un Frost : teinte modifiee et deplacement par tick reduit, visiblement, versus un ennemi hors rayon."},
      "destination": "s9-build"
    },
    {
      "id": "N04",
      "source": "ADDITIONS",
      "source_role": "prisme_produit:lens_joueur",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter interdit la pose sur chemin / case occupee / sans or et l'upgrade d'une tour L3, sans crash, l'etat restant inchange.",
      "claim": "Le joueur garde confiance dans le jeu seulement si une action impossible est refusee sans rien casser ni changer l'etat.",
      "enonce": "Une action invalide (pose sur le chemin, sur une case occupee, sans or, upgrade d'une tour au niveau maximum, appel de vague pendant une vague) est refusee sans effet visible et sans erreur console, l'etat affiche restant identique.",
      "expected_proof": {"kind": "oracle", "statement": "Pour chaque action invalide : le hash de l'etat avant est STRICTEMENT egal au hash apres, et aucune exception n'est emise dans la console navigateur."},
      "destination": "s9-build"
    },
    {
      "id": "N05",
      "source": "ADDITIONS",
      "source_role": "prisme_produit:lens_joueur",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter prevoit un overlay de fin affichant VICTORY ou DEFEAT et un arret visible du jeu.",
      "claim": "Le joueur ne clot pas une partie sereinement sans un verdict de fin explicite et un arret net du jeu.",
      "enonce": "A la fin d'une partie, un panneau apparait par-dessus le jeu affichant VICTORY (vague 10 nettoyee, vies > 0) ou DEFEAT (vies a 0), et le jeu s'arrete visiblement.",
      "expected_proof": {"kind": "visual", "statement": "Capture de fin de partie : #overlay est visible et contient le texte VICTORY ou DEFEAT, et les ennemis/projectiles cessent tout mouvement."},
      "destination": "s9-build"
    }
  ]
}
```

RETURN_REASON: {"status": "DISCOVERED", "problem": "Le contrat de boucle 10-maillons impose META_LOOP (prestige) et ADVANTAGE (avantage persistant post-reset), que le charter de la sonde TD exclut explicitement (hors_scope : aucune meta-progression persistante entre parties, boucle meta intra-partie uniquement)", "root_cause": "Le GAMEPLAY CONTRACT a ete calibre sur un jeu incremental/prestige (Kitten Clicker) ; ses maillons I/J ne se projettent pas nativement sur une sonde Tower Defense a partie unique sans persistance"}