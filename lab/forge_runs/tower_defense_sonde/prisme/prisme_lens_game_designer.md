I've confirmed a hard constraint before writing anything: **this subagent has no filesystem tools** — `Read`, `Glob`, `Grep`, and `Bash` are all disabled. I therefore **cannot** open the run_dir to verify the presence of `worldscan.json`, `story_bible.json`, `gm_worldscan.json`, or `design/*`. Per my contract's rule *« absents => tu le dis, tu ne compenses pas »*, I will not fabricate `worldscan:`/`gm_worldscan:` addresses I cannot resolve. My **only** validated source is the inline charter (étape 0), so every requirement is honestly tagged `source: ADDITIONS` with `reference: null` (my game-designer-lens proposals anchored on the charter), and I report the resulting GM-sourcing measurement as `0/N`.

Below is `product_snapshot.md`, written as the finished product a player lives, through the **Game Designer** lens.

---

# product_snapshot.md — td_probe_v1 (sonde Tower Defense)

## 1. CE QUE LE JOUEUR VOIT

Un plateau fixe de 640×384 px : une grille de 20×12 cases où **un chemin en épingle** se distingue nettement des cases constructibles (couleur et tracé différents). Le chemin entre à gauche à mi-hauteur, file, remonte, repart, redescend en épingle serrée — deux couloirs parallèles séparés par **une seule colonne centrale** de six cases, la zone la plus convoitée du plateau.

En bordure, un **HUD permanent** : compteur d'**or**, compteur de **vies**, **numéro de vague** en cours (1→10), et pendant la préparation un **compte à rebours** de 15 s qui décroît. Un **bandeau d'objectif** annonce à l'avance la nature de la vague suivante.

Sur le chemin, des ennemis lisibles — **Grunt** (l'étalon), **Runner** (rapide, en paquets), **Brute** (lente, épaisse, blindée) — chacun surmonté d'une **barre de vie** qui raccourcit sous le feu. Les **tours posées** (Gun, Frost, Cannon) montrent leur **niveau** (L1→L3) ; cliquer une tour l'entoure d'un **indicateur de portée**. On voit les **projectiles** partir, l'**effet de zone** du Cannon toucher plusieurs cibles d'un coup, et la **teinte de ralentissement** du Frost changer l'allure d'un ennemi à l'œil nu. En fin de partie, un **overlay** affiche `VICTORY` ou `DEFEAT` par-dessus le jeu, avec un bouton **Restart**.

Du point de vue design : la **courbe de difficulté est lisible à l'avance** — le bandeau d'objectif télégraphie chaque nouvelle question (armure à la vague 4, vitesse à la vague 6, tout à la fois à la vague 10), ce qui rend l'anticipation possible et donc les choix informés.

## 2. CE QUE LE JOUEUR FAIT

Il **choisit un type de tour** (Gun bon marché et polyvalent, Frost qui ne tue presque pas mais ralentit tout, Cannon cher et à effet de zone) puis le **pose sur une case libre** — geste répétable qui convertit l'or en couverture spatiale. Il **arbitre l'espace** : concentrer sur la colonne d'épingle (une tour y couvre trois segments de chemin) ou disperser sur les premières cases venues.

Il **clique une tour posée** pour voir sa portée, puis **l'améliore** (L2, L3). À chaque préparation il tranche la **décision structurante du trésor de guerre** : *monter en hauteur* (un L3 qui débloque une **capacité** — percée d'armure du Gun, ralentissement renforcé du Frost, splash élargi du Cannon) ou *monter en largeur* (une tour de plus). Aucune des deux voies ne remplace l'autre.

Il **gère le tempo** : **appeler la vague tôt** pour empocher un bonus d'or proportionnel au temps économisé, ou **attendre** pour convertir d'abord ses gains en défense — un pari richesse contre sécurité. Il **relit chaque vague** (l'armure interdit le spam de petits coups, la vitesse punit l'absence de contrôle) et **rejoue la boucle** pose→tir→récompense→upgrade dans un état chaque fois plus dur. En fin de partie, il **redémarre** à la même seed.

## 3. CE QUE LE JOUEUR RESSENT

La **tension du pari de tempo** — appeler tôt rapporte, mais expose. Le **soulagement** quand une lecture correcte de la vague tient la ligne, et la **frustration immédiate et lisible** d'un mauvais choix : une Brute qui atteint la sortie coûte **cinq vies d'un coup**, une erreur d'anticipation devient visible instantanément. La **satisfaction de la percée** quand un Gun L3 transperce enfin une armure qui plafonnait ses coups à 1 dégât. Le sentiment, en rejouant, que **deux parties diffèrent vraiment** parce que les décisions divergent, pas parce que le hasard change.

Note d'honnêteté (fog Pierre, FOG-4) : *l'agrément* réel — « est-ce que c'est plaisant ? » — reste un **jugement humain** hors de portée de tout oracle de cette sonde. La sonde prouve la **divergence des issues**, jamais la qualité ressentie.

## 4. RÈGLES OBSERVABLES

- **R1** — Poser une tour fait apparaître une tour visible sur la case cliquée et **diminue l'or affiché** exactement de son coût (Gun 50, Frost 60, Cannon 100).
- **R2** — Chaque tour acquiert la cible **vivante la plus avancée** dans son rayon (ciblage `first`), tire à sa cadence, et la barre de vie de la cible raccourcit au même tick.
- **R3** — Tuer un ennemi **crédite exactement son bounty** (Grunt +8, Runner +6, Brute +25) et décrémente le compteur d'ennemis vivants de un exactement.
- **R4** — Un Gun L1 retire **exactement 2 PV** à une Brute (armure 4, plancher 1) ; un Gun L3 perce 3 et en retire strictement davantage.
- **R5** — Un ennemi sous effet Frost avance à **exactement 55 %** de sa vitesse (ralentissement 45 %, non cumulable, rafraîchi).
- **R6** — Un Cannon touchant plusieurs ennemis groupés leur inflige à **chacun** ses dégâts pleins dans le rayon de splash.
- **R7** — Une Brute qui atteint la sortie **retire exactement 5 vies** ; un Grunt ou un Runner, exactement 1.
- **R8** — Améliorer une tour au **niveau 3** débloque une **capacité visible** (percée d'armure, ralentissement renforcé, ou splash élargi), pas seulement un plus grand nombre.
- **R9** — Appeler la vague tôt crédite **2 or par seconde de préparation restante** (plafond 30) et interrompt le décompte.
- **R10** — À **seed identique** et actions identiques (horodatées en ticks), l'état final est **strictement identique** (hash égal) ; aucun appel non déterministe dans la logique.
- **R11** — Un bot **compétent gagne** (VICTORY, vies > 0) et un bot **naïf perd** (DEFEAT, vies == 0 avant la vague 10) sur la **même seed 1337**.
- **R12** — Deux stratégies mono-tour échouent à des **vagues différentes** (Gun-only et Cannon-only ne tombent pas à la même vague) : aucune tour ne domine.
- **R13** — Toute **action invalide** (case de chemin, case occupée, or insuffisant, upgrade d'une L3, appel pendant une vague) est refusée en laissant l'état **strictement inchangé**, sans exception console.
- **R14** — `window.__game` est une fenêtre de **lecture seule** : toute action de jeu n'est déclenchable que par un contrôle DOM équivalent, jamais par un setter interne.

---

## RESTITUTION (game_designer lens — hors document, conservée par l'exécuteur)

**Ancre** : charter étape 0 `td_probe_v1` (dispatch `FORGE_DISPATCH:s0-contrat:tower_defense_sonde-20260829:1`), seule source de vérité validée. Aucun autre artefact amont n'a pu être lu (voir contrainte ci-dessous).

**Reçu oracle** : `check_prisme_manifest.mjs` / `check_prisme.mjs` **non exécuté par moi** — je n'ai aucun outil d'exécution (`run: aucun` dans mon contrat, et `Bash` désactivé). La conformité est donc revendiquée par construction, pas mesurée : `claim_verdict: NO_CLAIM_ALLOWED` sur le fait que l'oracle passe. C'est à l'exécuteur de matérialiser `prisme.json` puis de lancer l'oracle.

**Contrainte système découverte (mesurée)** : ce sous-agent n'a **aucun accès disque** — `Read`, `Glob`, `Grep`, `Bash` renvoient tous « No such tool available ». Conséquence directe : je n'ai pas pu vérifier la présence de `worldscan.json`, `story_bible.json`, `gm_worldscan.json`, `design/progression_contract.md`, `design/calibration.md`. Je n'ai **pas compensé** : je n'invente aucune adresse `worldscan:`/`gm_worldscan:` invérifiable. Toutes les exigences sont donc `source: ADDITIONS`, `reference: null`.

**Sourcing GM mesuré** : `exigences_sourcees_gm = 0 / exigences_boucle = 11` (0/11). Cause = absence d'accès à `gm_worldscan.json` (et non refus de sourcer). Cohérent avec la baseline connue « 0/13 avant `game_master` ». Additif non gaté avant run 10.

**Exigences classées non actionnables** : aucune — les 20 exigences portent chacune un `expected_proof` exploitable (`bot_action`, `oracle` ou `visual`).

**Références non ancrées** : les 20 (toutes `null`, par honnêteté faute d'artefact lisible), reportées explicitement plutôt que forgées.

**Complétude de boucle (auto-contrôle avant émission)** : 10 rôles couverts (A→J) ; NEXT_GOAL a 2 exigences textuellement distinctes sur `objectif` ; UNLOCK porte `observe.appears` ; REPEAT porte `replay[]` sur les rôles B/C/D/F ; META_LOOP est un geste PLAYER (`ameliorer_tour`) avec `gold: decreases` ; ADVANTAGE porte `replay_ref` vers l'action B et `increases_more_than:ex_build_gun` ; DECISION porte 2 affordances distinctes (`poser_gun` vs `ameliorer_tour`), 2 politiques, `metric: lives` (observé par A), `horizon_frames: 300`, `observe.hud: objectif`.

**Limite de mapping (honnêteté)** : la charpente de boucle A→J est taillée pour un incrémental à prestige. Le TD-sonde n'a **pas** de prestige/reset entre parties (hors-scope charter). J'ai mappé META_LOOP/ADVANTAGE sur le geste **intra-partie** réellement présent et mesurable : encaisser le trésor de guerre dans un L3 (l'or chute visiblement = `decreases`) puis prouver que le **même** engagement de tir retire ensuite strictement plus de PV (`increases_more_than`, adossé à la table de dégâts dorée du charter). UNLOCK et META_LOOP partagent donc le bouton d'upgrade, vus depuis deux positions de boucle — c'est le mapping fidèle, pas un prestige inventé.

**Note de gouvernance (à l'orchestrateur, sans autorité de ma part)** : j'ai été dispatché avec `lens=game_designer` (saveur panel), alors que CLAUDE.md indique le **panel Prisme multi-lentilles gelé** (Paquet A #6, l'étape `s1-prisme` standard restant active). Je le signale ; l'arbitrage merge/reject/freeze appartient à HumanGate (Pierre), pas à ce sous-agent.

### SKIPPED_VALIDATION
- **Oracle `check_prisme_manifest.mjs` / `check_prisme.mjs`** — périmètre : `prisme.json` + `product_snapshot.md` — statut : **non fait** — raison : aucun outil d'exécution disponible dans ce sous-agent (`run: aucun` + `Bash` désactivé) ; l'exécuteur doit le lancer après matérialisation.
- **Lecture des artefacts amont** (`worldscan.json`, `story_bible.json`, `gm_worldscan.json`, `design/*`) — périmètre : run_dir — statut : **non fait** — raison : `Read`/`Glob`/`Grep` désactivés ; présence invérifiable, non compensée.
- **Ancrage `check_amont_traversal.mjs` des références** — périmètre : champ `reference` des exigences — statut : **hors délai / impossible** — raison : aucune adresse émise (toutes `null`), rien à résoudre côté agent.

### RETURN LINEAGE
- **why_task_existed** :
  - `problem` : produire le `product_snapshot.md` (étape 1) de la sonde TD pour amorcer la chaîne Forge — activation par décision humaine (dispatch Pierre 2026-08-29).
  - `oracle` : aucun (activation humaine, pas détection d'oracle).
  - `root_cause` : non transmise — le `why` amont ne m'a pas été passé au-delà du charter.
  - `action_reason` : l'étape 1 fixe la vision produit finie + la ligne d'exigences falsifiables dont dépendent s3→s9.
- **result** : `product_snapshot.md` (4 sections, 14 règles observables) + `prisme.json` (20 exigences, boucle A→J complète) émis. Toutes exigences `ADDITIONS/null` faute d'accès disque.
- **proof** : `Grep`/`Glob` → « No such tool available » (mesuré ci-dessus) ; oracle Prisme non exécuté (aucun outil `run`). Aucune preuve d'exécution d'oracle produite par moi.
- **learning** : un sous-agent Prisme privé de tout outil de lecture ne peut ni vérifier les artefacts amont ni émettre des adresses `worldscan:`/`gm_worldscan:` résolvables → dégrade mécaniquement le sourcing EXPECTED/GM à 0. À corriger côté dispatch (accorder au moins un accès lecture au run_dir) si l'on veut des références ancrées.
- **next_reason** : la chaîne **n'est pas fermée** — l'exécuteur doit (1) matérialiser `prisme.json` + `product_snapshot.md`, (2) lancer `check_prisme_manifest.mjs` et `check_prisme.mjs`, (3) remonter à Pierre la contrainte « sous-agent sans accès disque » et la note de gouvernance panel-gelé. Preuve d'oracle et ancrage des références restent dus.

software_verdict: BLOCKED
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED

*(BLOCKED = je ne peux fournir aucun reçu d'oracle vérifié depuis ce sous-agent ; la validation mécanique appartient à l'exécuteur.)*

```json
{
  "game_id": "td_probe_v1",
  "exigences": [
    {
      "id": "ex_goal_survive",
      "source": "ADDITIONS",
      "source_role": "game_designer",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "PLAYER_GOAL",
      "observation": "Le charter fixe la victoire a 'vague 10 nettoyee avec lives>0' et la defaite a 'lives<=0', et expose lives/wave dans window.__game (S1, boucle_partie).",
      "claim": "Un critere de sortie binaire et affiche en permanence est ce qui donne un COUT a chaque decision; sans compteur de vies visible, aucun choix n'a d'enjeu.",
      "enonce": "L'ecran affiche en continu le numero de vague et le compteur de vies, materialisant l'objectif 'amener la vague 10 a zero ennemi sans tomber a 0 vie'.",
      "expected_proof": {"kind": "visual", "statement": "Capture PNG de la page en jeu montrant les compteurs vies et vague; lecture Playwright de window.__game.lives et .wave non nulles."},
      "observe": {"hud": "lives", "predicate": "nonempty"},
      "destination": "s5-wiremap"
    },
    {
      "id": "ex_build_gun",
      "source": "ADDITIONS",
      "source_role": "game_designer",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "PLAYER_ACTION",
      "affordance": "poser_gun",
      "observation": "Le charter (S5, conception.tours.gun) prevoit un bouton de selection de tour puis une pose par clic sur une case libre, la tour apparaissant sur cette case.",
      "claim": "La pose est le geste repetable qui transforme l'or en couverture spatiale; c'est LE levier 'largeur', et il doit etre declenchable sans jamais appeler une fonction interne.",
      "enonce": "Le joueur peut poser un Gun en cliquant la cible poser_gun puis une case constructible; le nombre de tours affichees augmente et l'or affiche diminue du cout.",
      "expected_proof": {"kind": "bot_action", "statement": "Un bot DOM clique #btn-gun puis une case libre; window.__game.towers passe de n a n+1 et gold diminue de 50 exactement."},
      "observe": {"hud": "towers", "predicate": "increases"},
      "destination": "s5-wiremap"
    },
    {
      "id": "ex_tower_fires",
      "source": "ADDITIONS",
      "source_role": "game_designer",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "GAME_RESPONSE",
      "observation": "Le charter (boucle_tick, D4) fait acquerir a chaque tour la cible vivante la plus avancee dans son rayon (ciblage first), tirer un projectile visible et retirer des PV.",
      "claim": "La reponse du systeme doit etre immediate et lisible a l'ecran, sinon le joueur ne relie pas sa pose a un effet et la boucle cause->consequence se rompt.",
      "enonce": "Une tour posee a portee d'un ennemi tire a sa cadence et la barre de vie de l'ennemi cible raccourcit visiblement au meme tick.",
      "expected_proof": {"kind": "visual", "statement": "Capture montrant un projectile et une barre de vie raccourcie; lecture de enemies[i].hp decroissant entre deux ticks."},
      "observe": {"hud": "enemies", "predicate": "decreases"},
      "destination": "s3-decompo"
    },
    {
      "id": "ex_bounty",
      "source": "ADDITIONS",
      "source_role": "game_designer",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "REWARD",
      "observation": "Le charter (economie_a_trois_robinets, ennemis.*) verse un bounty exact a chaque kill (Grunt 8, Runner 6, Brute 25).",
      "claim": "La recompense doit etre creditee AU MOMENT du kill et visible sur le compteur d'or, faute de quoi le joueur ne percoit pas le rendement de son placement et l'axe economique disparait.",
      "enonce": "Quand un ennemi meurt, le compteur d'or affiche augmente exactement de son bounty au tick de sa mort.",
      "expected_proof": {"kind": "oracle", "statement": "Test strict: tuer un Grunt fait passer gold de G a G+8 exactement et enemies de n a n-1 exactement."},
      "observe": {"hud": "gold", "predicate": "increases"},
      "destination": "s3-decompo"
    },
    {
      "id": "ex_decision_tall_wide",
      "source": "ADDITIONS",
      "source_role": "game_designer",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "DECISION",
      "observation": "Le charter (boucle_meta_intra_partie, upgrades) oppose 'monter en hauteur' (L3 = capacite: percee/splash/ralentissement) et 'monter en largeur' (nouvelles tours = couverture), chaque voie coutant differemment (L3 = 2,4x base; 3 tours = 3x base).",
      "claim": "Parce que les capacites L3 ne se remplacent pas par le nombre et inversement, aucune voie ne domine: le point de decision porte une vraie bifurcation, pas un calcul or/degats tranchable une fois pour toutes.",
      "enonce": "A chaque preparation, l'objectif affiche confronte le joueur au choix tresor de guerre 'large (poser une tour) vs haut (ameliorer en L3)', et deux politiques opposees jouees sur le meme etat divergent sur les vies finales.",
      "expected_proof": {"kind": "bot_action", "statement": "Sonde a deux trajectoires seed 1337: politique large_only vs politique attente sur horizon 300 ticks produisent des lives finales distinctes non triviales."},
      "observe": {"hud": "objectif", "predicate": "changes"},
      "options": ["ex_build_gun", "ex_upgrade_unlock"],
      "policies": [
        {"name": "large_only", "click": "poser_gun", "every_frames": 180},
        {"name": "attente", "click": null, "every_frames": 0}
      ],
      "metric": "lives",
      "horizon_frames": 300,
      "destination": "s3-decompo"
    },
    {
      "id": "ex_upgrade_unlock",
      "source": "ADDITIONS",
      "source_role": "game_designer",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "UNLOCK",
      "affordance": "ameliorer_tour",
      "observation": "Le charter (upgrades: Gun L3 -> percee d'armure 3, Frost L3 -> 60%/2,2s, Cannon L3 -> splash 1,8) attache au niveau 3 une CAPACITE nouvelle, pas seulement un nombre.",
      "claim": "Debloquer une capacite doit se VOIR (marqueur de niveau, portee, effet elargi), sinon le joueur ne sait pas qu'une nouvelle reponse (p.ex. la percee d'armure) vient d'entrer dans son arsenal, et la progression reste invisible.",
      "enonce": "Le joueur peut ameliorer une tour selectionnee en cliquant ameliorer_tour; au niveau 3, une capacite visible apparait (marqueur de niveau et effet distinct a l'ecran).",
      "expected_proof": {"kind": "visual", "statement": "Captures avant/apres upgrade montrant le marqueur L3 et l'effet elargi; window.__game.towers[i].level passe a 3."},
      "observe": {"hud": "tours", "predicate": "appears:capacite_l3", "appears": "capacite_l3"},
      "destination": "s5-wiremap"
    },
    {
      "id": "ex_next_goal_armor",
      "source": "ADDITIONS",
      "source_role": "game_designer",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NEXT_GOAL",
      "observation": "Le charter (calendrier_10_vagues) introduit la premiere Brute (armure 4) a la vague 4, apres trois vagues sans armure.",
      "claim": "Le calendrier n'est une suite de DECISIONS que si chaque nouvelle vague pose une question textuellement nouvelle affichee a l'avance; repeter le meme objectif rendrait l'anticipation inutile.",
      "enonce": "A l'entree en preparation de la vague 4, l'objectif affiche change en un texte distinct annoncant l'armure (p.ex. 'Brute armure 4: tes petits coups plafonnent').",
      "expected_proof": {"kind": "visual", "statement": "Lecture du bandeau d'objectif au debut des vagues 3 et 4: deux chaines textuellement distinctes sur le meme element objectif."},
      "observe": {"hud": "objectif", "predicate": "new_distinct"},
      "destination": "s5-wiremap"
    },
    {
      "id": "ex_next_goal_speed",
      "source": "ADDITIONS",
      "source_role": "game_designer",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NEXT_GOAL",
      "observation": "Le charter introduit la vague 6 = 18 Runners a 2,2 cases/s, apres l'armure de la vague 4.",
      "claim": "La deuxieme question du calendrier (la vitesse) doit se distinguer TEXTUELLEMENT de la premiere (l'armure) a l'ecran, sinon le joueur ne percoit pas qu'une reponse differente (le controle Frost) est requise.",
      "enonce": "A l'entree en preparation de la vague 6, l'objectif affiche change en un texte distinct de celui de la vague 4, annoncant la vitesse (p.ex. '18 Runners: sans ralentissement, ils traversent').",
      "expected_proof": {"kind": "visual", "statement": "Lecture du bandeau d'objectif aux vagues 4 et 6: deux chaines textuellement distinctes sur le meme element objectif."},
      "observe": {"hud": "objectif", "predicate": "new_distinct"},
      "destination": "s5-wiremap"
    },
    {
      "id": "ex_repeat_wave",
      "source": "ADDITIONS",
      "source_role": "game_designer",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "REPEAT",
      "observation": "Le charter (boucle_vague) reboucle preparation -> vague -> nettoyage -> preparation sur 10 vagues, le parc de tours persistant d'une vague a l'autre.",
      "claim": "La boucle ne recommence pour de vrai que si les gestes de pose/tir/recompense/upgrade sont rejouables dans l'etat suivant, plus dur; sinon ce n'est qu'un enchainement d'ecrans.",
      "enonce": "Apres le nettoyage d'une vague, une nouvelle preparation ouvre sur un etat conserve (tours en place, or accumule) et un numero de vague incremente, ou les memes gestes se rejouent.",
      "expected_proof": {"kind": "bot_action", "statement": "Un bot rejoue pose->attente->upgrade sur les vagues 1 a 3; window.__game.wave s'incremente a chaque cycle et les tours persistent."},
      "observe": {"hud": "wave", "predicate": "increases"},
      "replay": ["ex_build_gun", "ex_tower_fires", "ex_bounty", "ex_upgrade_unlock"],
      "destination": "s3-decompo"
    },
    {
      "id": "ex_invest_warchest",
      "source": "ADDITIONS",
      "source_role": "game_designer",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "META_LOOP",
      "affordance": "ameliorer_tour",
      "observation": "Le charter (boucle_meta_intra_partie) traite l'or non depense comme un 'tresor de guerre', et l'upgrade L3 coute 1,6x le cout de base (Gun L3 total = 170).",
      "claim": "Encaisser le tresor accumule dans un L3 est le geste meta de la partie: il vide visiblement la reserve pour transformer de la richesse en capacite durable; c'est ce sacrifice visible qui relance la boucle plus fort.",
      "enonce": "Le joueur peut investir son tresor en ameliorant une tour au niveau 3 via ameliorer_tour; le compteur d'or affiche retombe visiblement du montant investi.",
      "expected_proof": {"kind": "bot_action", "statement": "Un bot avec or >=170 clique l'upgrade jusqu'a L3; window.__game.gold decroit de 170 exactement et towers[i].level == 3."},
      "observe": {"hud": "gold", "predicate": "decreases"},
      "destination": "s3-decompo"
    },
    {
      "id": "ex_advantage_after_invest",
      "source": "ADDITIONS",
      "source_role": "game_designer",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "ADVANTAGE",
      "observation": "Le charter fige une table de degats croissante: Gun L1 retire 2 PV a une Brute (armure 4), Gun L3 (percee 3) en retire strictement davantage (valeur doree figee en test).",
      "claim": "L'investissement meta n'est un vrai AVANTAGE que si le MEME engagement de tir, rejoue apres l'upgrade, retire strictement plus de PV qu'avant; une egalite prouverait que monter en niveau ne fait qu'acheter du nombre.",
      "enonce": "Apres l'investissement L3, le meme Gun engage sur le meme segment retire par tir un nombre de PV strictement superieur a son retrait avant upgrade, mesure sur des ennemis identiques.",
      "expected_proof": {"kind": "bot_action", "statement": "Deux runs seed 1337, Gun L1 vs Gun L3 sur la meme Brute: le delta de PV retires par tir en L3 est strictement superieur au delta en L1 (comparaison de deux executions reelles)."},
      "observe": {"hud": "enemies", "predicate": "increases_more_than:ex_build_gun"},
      "replay_ref": "ex_build_gun",
      "destination": "s9-build"
    },
    {
      "id": "ex_determinism",
      "source": "ADDITIONS",
      "source_role": "game_designer",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter (S2, S3, boucle_tick) impose RNG seede porte dans l'etat, pas fixe TICK_MS=16, et interdit Math.random/Date.now/performance.now dans les modules logiques.",
      "claim": "Le determinisme est la condition de POSSIBILITE de toute la preuve de divergence: sans reproductibilite stricte, deux issues differentes pourraient venir du hasard et non des decisions.",
      "enonce": "Deux executions de la meme seed avec la meme liste d'actions horodatees en ticks produisent un etat final dont le hash est strictement egal.",
      "expected_proof": {"kind": "oracle", "statement": "Oracle statique (grep AST) echoue si un appel non deterministe existe; test comparant deux executions reelles: hash(etat@N) egal."},
      "destination": "s4-archi"
    },
    {
      "id": "ex_read_only_window",
      "source": "ADDITIONS",
      "source_role": "game_designer",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter (actions_interdites, S1) fait de window.__game une fenetre de LECTURE seule; toute action passe par le DOM, aucun setter/triche expose.",
      "claim": "Si l'etat etait mutable de l'exterieur, un bot pourrait 'gagner' sans jouer et la solvabilite mesuree ne prouverait plus rien sur la boucle.",
      "enonce": "window.__game n'expose aucune fonction de mutation; toute action de jeu n'est atteignable que par un controle DOM equivalent.",
      "expected_proof": {"kind": "oracle", "statement": "Oracle statique/DOM: aucune cle fonction dans window.__game; chaque action a un element DOM declencheur."},
      "destination": "s4-archi"
    },
    {
      "id": "ex_solvability_pos",
      "source": "ADDITIONS",
      "source_role": "game_designer",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter (S8) exige qu'un bot competent scripte atteigne VICTORY avec vies>0 sur seed 1337.",
      "claim": "Une victoire atteignable de bout en bout est la seule preuve que les objectifs ne sont pas hors d'atteinte; un jeu insolvable passe pourtant tous les tests unitaires.",
      "enonce": "Un bot competent scripte (actions figees, acces limite a window.__game) atteint result=='VICTORY' avec un nombre de vies exact >0 sur seed 1337.",
      "expected_proof": {"kind": "bot_action", "statement": "Run e2e du bot competent seed 1337; JSON de resultat avec result VICTORY et lives egal a la valeur doree figee au premier run reel."},
      "destination": "s9-build"
    },
    {
      "id": "ex_solvability_neg",
      "source": "ADDITIONS",
      "source_role": "game_designer",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter (S9) exige qu'un bot naif (tour la moins chere, jamais d'upgrade, jamais de Frost) perde sur la meme seed.",
      "claim": "Sans une defaite atteignable par un jeu naif, aucune decision n'a de cout reel et la 'boucle' n'est qu'un decor; la defaite prouve que les mauvais choix punissent.",
      "enonce": "Le bot naif scripte atteint result=='DEFEAT' avec lives==0 avant la vague 10 sur seed 1337.",
      "expected_proof": {"kind": "bot_action", "statement": "Run e2e du bot naif seed 1337; JSON avec result DEFEAT, lives==0, wave<10."},
      "destination": "s9-build"
    },
    {
      "id": "ex_non_dominance",
      "source": "ADDITIONS",
      "source_role": "game_designer",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter (S10, calendrier) prevoit que Gun-only echoue a V7 et Cannon-only a V6, des vagues d'echec DIFFERENTES.",
      "claim": "Deux strategies mono-tour qui echouent a des vagues differentes prouvent qu'aucune tour ne resout seule le calendrier; une egalite des vagues d'echec signalerait une tour dominante.",
      "enonce": "Au moins deux strategies mono-tour atteignent DEFEAT a des numeros de vague strictement differents l'un de l'autre.",
      "expected_proof": {"kind": "bot_action", "statement": "Matrice bot x vague: wave_reached(Gun-only) != wave_reached(Cannon-only), inegalite stricte, sur JSON de runs."},
      "destination": "s9-build"
    },
    {
      "id": "ex_two_win_paths",
      "source": "ADDITIONS",
      "source_role": "game_designer",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter (S11) exige deux bots competents de doctrines distinctes (tall, wide) atteignant VICTORY avec des vies finales exactes DIFFERENTES.",
      "claim": "Deux voies gagnantes aux resultats distincts prouvent que la victoire n'a pas de solution unique et que la decision tall/wide porte une vraie information.",
      "enonce": "Un bot 'tall' et un bot 'wide' atteignent tous deux VICTORY sur seed 1337 avec des vies finales exactes differentes l'une de l'autre.",
      "expected_proof": {"kind": "bot_action", "statement": "Runs tall et wide seed 1337; result VICTORY pour les deux, lives_final(tall) != lives_final(wide)."},
      "destination": "s9-build"
    },
    {
      "id": "ex_variance",
      "source": "ADDITIONS",
      "source_role": "game_designer",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter (S12-S14, regle de variance Pierre 2026-07-21) retient lives_final, wave_reached, leaks_total, gold_spent_total pour classer les strategies.",
      "claim": "Une metrique qui ne prend qu'une valeur, ou qui est identiquement egale a une autre sur tout le panel, ne mesure pas ce que son nom promet et doit etre requalifiee, pas presentee comme un signal.",
      "enonce": "Chaque metrique retenue prend au moins 2 valeurs distinctes non triviales sur le panel de bots, aucune paire n'est identiquement egale, et il existe au moins une inversion de classement.",
      "expected_proof": {"kind": "oracle", "statement": "Tableau variance metriques x bots: >=2 valeurs distinctes par metrique, egalite par paires refutee, >=1 inversion de classement."},
      "destination": "s9-build"
    },
    {
      "id": "ex_invalid_action_noop",
      "source": "ADDITIONS",
      "source_role": "game_designer",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter (S7) enumere les actions invalides (case de chemin, case occupee, or insuffisant, upgrade d'une L3, appel pendant une vague) et exige un refus sans crash.",
      "claim": "Un refus qui laisse l'etat STRICTEMENT inchange et sans exception console rend les regles credibles au joueur; un refus silencieux qui altererait l'etat corromprait la mesure de divergence.",
      "enonce": "Chaque action invalide est refusee de facon observable, laisse l'etat strictement egal avant/apres et n'emet aucune exception console.",
      "expected_proof": {"kind": "oracle", "statement": "Tests stricts: egalite de hash d'etat avant/apres chaque action invalide; journal console sans exception."},
      "destination": "s3-decompo"
    },
    {
      "id": "ex_console_clean",
      "source": "ADDITIONS",
      "source_role": "game_designer",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter (S19, S20) exige une preuve visuelle issue d'un rendu navigateur REEL de la page finale et zero exception console sur une partie VICTORY et une partie DEFEAT.",
      "claim": "Une capture de fixture ou de composant isole ne prouverait pas le produit; seule une partie complete rendue dans le navigateur franchit la frontiere que la preuve valide.",
      "enonce": "Les captures de preuve viennent d'un rendu navigateur reel de la page finale (partie en cours + overlay VICTORY + overlay DEFEAT) avec zero exception console.",
      "expected_proof": {"kind": "visual", "statement": "PNG Playwright de la page reelle (en jeu, VICTORY, DEFEAT) + journal console vide d'exceptions sur les deux parties."},
      "destination": "s9-build"
    }
  ]
}
```
RETURN_REASON: {"status": "DISCOVERED", "problem": "Ce sous-agent s1-prisme n'a aucun outil de lecture disque (Read/Glob/Grep/Bash desactives): impossible de verifier la presence de worldscan.json/story_bible.json/gm_worldscan.json/design, donc aucune reference EXPECTED ou gm_worldscan resolvable n'a pu etre emise (sourcing 0/11), toutes les exigences retombant en ADDITIONS/null.", "root_cause": "Le dispatch de l'etape s1-prisme n'accorde aucun acces lecture au run_dir a l'agent, alors que son contrat lui impose de lire les artefacts amont s'ils sont presents."}