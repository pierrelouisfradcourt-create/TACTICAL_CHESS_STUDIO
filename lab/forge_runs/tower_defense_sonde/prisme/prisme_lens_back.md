No file tools are available in this subagent either — the harness gives me the charter inline and expects my **response text itself** to be `product_snapshot.md` (M3'b mechanism), plus the terminal `json` block and `RETURN_REASON`. I therefore cannot inspect the run_dir: I state that honestly and do not compensate. Since the manifest checker's reference vocabulary resolves only `worldscan:`/`story_bible:`/`gm_worldscan:` addresses — none of which I can confirm exist for this web-sonde profile — every exigence is truthfully classified `source: ADDITIONS` (my proposal, grounded in the charter, itself a PROPOSITION), `reference: null`.

Below is the product snapshot (lens = **back** : état, invariants, déterminisme, victoire/défaite).

---

# product_snapshot.md — td_probe_v1 · sonde Tower Defense · lens back

## 1. CE QUE LE JOUEUR VOIT

Une grille 20×12 (canvas 640×384) où un chemin unique, visuellement distinct des cases constructibles, serpente de l'entrée gauche à la sortie droite en une épingle serrée. En permanence à l'écran, un bandeau d'état lisible : un compteur d'**or**, un compteur de **vies**, le **numéro de vague** en cours, une **bannière d'objectif** en clair (« Survivez à la vague N »), et le **compte à rebours de préparation** entre deux vagues. Sur le terrain : des ennemis qui avancent le long du chemin en suivant ses virages, chacun surmonté d'une barre de vie qui raccourcit quand il est touché ; des tours posées qui tirent des projectiles visibles ; l'effet de zone du Cannon qui touche plusieurs cibles ; la teinte modifiée et l'allure ralentie d'un ennemi sous Frost. À la fin, un panneau (`#overlay`) recouvre le jeu et affiche **VICTORY** ou **DEFEAT**, avec un bouton **Restart**. Rien n'est caché : l'état complet — `tick`, `seed`, `phase`, `wave`, `gold`, `lives`, `towers[]`, `enemies[]`, `leaks`, `result` — est lisible de l'extérieur via `window.__game`, en LECTURE seule.

## 2. CE QUE LE JOUEUR FAIT

Il choisit un type de tour (Gun, Frost, Cannon) puis clique une case libre pour la poser — l'or affiché baisse aussitôt. Il sélectionne une tour posée pour voir son indicateur de portée, et l'améliore jusqu'au niveau 3, qui débloque une CAPACITÉ (percée d'armure du Gun, splash élargi du Cannon, ralentissement renforcé du Frost). Il arbitre en permanence entre **monter en hauteur** (améliorer une tour existante) et **monter en largeur** (poser de nouvelles tours) : un trésor de guerre qu'il dépense ou conserve. Il décide du **tempo** : appeler la vague tôt pour un bonus d'or proportionnel au temps de préparation économisé, au prix d'une fenêtre de construction plus courte, ou laisser la vague partir à la fin du décompte. Toute action passe par le DOM (boutons + clic canvas) ; aucune n'exige d'appeler une fonction interne. Une action invalide — pose sur le chemin, case occupée, or insuffisant, amélioration d'une tour déjà L3, appel pendant une vague — est refusée sans rien changer et sans erreur console.

## 3. CE QUE LE JOUEUR RESSENT

La tension d'un choix **irréversible** : une tour ne se vend ni ne se déplace, donc chaque placement engage réellement. La lisibilité d'une **cause immédiatement suivie de son effet** — le projectile part, la barre de vie baisse, l'or monte au même instant — parce que la simulation est déterministe et à pas fixe : le même geste sur la même seed produit toujours la même conséquence. Le poids d'une **mauvaise lecture** : laisser fuir une Brute coûte cinq vies d'un coup, et cela se voit sur-le-champ. La montée d'une **pression comprise plutôt que subie** : les statistiques des ennemis ne gonflent jamais en secret ; ce qui change de vague en vague, c'est le TYPE de menace — l'armure arrive à la vague 4, la vitesse à la vague 6 — donc progresser signifie acquérir une RÉPONSE, pas empiler des chiffres. La sonde ne prétend pas être « agréable » : ce jugement reste humain ; elle rend seulement chaque décision mesurablement conséquente.

## 4. RÈGLES OBSERVABLES

- **R1 — Déterminisme.** Deux exécutions de la même seed avec la même séquence d'actions horodatées en ticks produisent des états finaux dont le hash est STRICTEMENT égal (comparaison de deux exécutions réelles, jamais d'un état à lui-même).
- **R2 — Victoire.** `window.__game.result` vaut `VICTORY` si et seulement si la vague 10 est nettoyée avec `lives > 0` ; `#overlay` affiche alors « VICTORY ».
- **R3 — Défaite.** `result` vaut `DEFEAT` dès que `lives <= 0` à n'importe quel tick ; le jeu s'arrête et `#overlay` affiche « DEFEAT ».
- **R4 — Invariant comptable de l'or.** À chaque tick, `gold == 100 + Σ(primes) + Σ(bonus_de_vague) + Σ(bonus_d_anticipation) − Σ(dépenses)`, égalité exacte.
- **R5 — Prime exacte.** Tuer un Grunt fait passer l'or de G à G+8 exactement et le compteur d'ennemis vivants de n à n−1 exactement.
- **R6 — Coût de fuite exact.** Un ennemi atteignant la sortie retire un nombre de vies exact selon son type (Grunt 1, Runner 1, Brute 5) ; une fuite de Brute fait passer les vies de L à L−5.
- **R7 — Mur d'armure lisible.** Un tir de Gun L1 sur une Brute (armure 4) retire exactement 2 PV ; un tir de Cannon L1 en retire exactement 18 ; le Gun L3 (percée 3) en retire une valeur figée en test doré strictement supérieure à 2.
- **R8 — Ralentissement mesurable.** Un ennemi à 2,2 cases/s sous effet Frost avance exactement 1,21 cases/s (égalité à epsilon nommé), et cet effet est visible (teinte + allure).
- **R9 — Statistiques constantes.** Les PV d'un Grunt à la vague 10 sont exactement ceux de la vague 1 (40) ; aucun multiplicateur global de PV ou de dégâts par vague.
- **R10 — État en lecture seule.** `window.__game` n'expose aucun setter ni raccourci d'état ; toute action de jeu passe exclusivement par le DOM.
- **R11 — Refus sans effet de bord.** Toute action invalide laisse l'état strictement inchangé (égalité avant/après) et n'émet aucune exception console.
- **R12 — Boucle de décision prouvée.** Sur la seed 1337, un bot compétent atteint `VICTORY` (vies finales exactes > 0) et un bot naïf atteint `DEFEAT` (`lives == 0`) avant la vague 10 ; au moins deux stratégies mono-tour échouent à des vagues DIFFÉRENTES, prouvant qu'aucune tour ne gagne seule.
- **R13 — Pureté logique.** Aucun `Math.random`, `Date.now`, `performance.now` ni `requestAnimationFrame` dans les modules `.mjs` de logique (oracle statique) ; ces modules s'exécutent sous `node --test` sans DOM.
- **R14 — Deux voies gagnantes.** Deux bots compétents de doctrines distinctes (« tall » et « wide ») atteignent tous deux `VICTORY` avec des vies finales exactes DIFFÉRENTES.

---

## Rapport de lignée — s1-prisme (lens back)

**Ancre** : `charter.yaml` (étape 0, `td_probe_v1`, statut PROPOSITION non ratifiée) — seule source de vérité fournie inline. **Reçu d'oracle** : `check_prisme_manifest.mjs` **NON exécuté** (voir SKIPPED_VALIDATION) → `claim_verdict: NO_CLAIM_ALLOWED`.

**Artefacts amont attendus non inspectables** : `worldscan.json`, `story_bible.json`, `gm_worldscan.json`, `design/progression_contract.md`, `design/calibration.md`. Ce subagent n'a AUCUN outil de lecture disque (Read/Glob/Grep/Bash tous désactivés). Je ne peux donc ni confirmer ni infirmer leur présence dans le run_dir — je le dis, je ne compense pas. Conséquence assumée : toutes les exigences sont `source: ADDITIONS`, `reference: null` (proposition dérivée du charter), le vocabulaire d'adresse du manifest (`worldscan:`/`story_bible:`/`gm_worldscan:`) ne résolvant vers aucun artefact vérifiable ici.

**Sourçage GM (mesuré, non gaté)** : `exigences_boucle = 13`, `exigences_sourcees_gm = 0` (aucun `gm_worldscan` inspectable). Aligné sur la baseline connue (run 9 : 0/13).

**Couverture boucle A→J** : 10 rôles couverts (PLAYER_GOAL·PLAYER_ACTION×3·GAME_RESPONSE·REWARD·DECISION·UNLOCK·NEXT_GOAL×2·REPEAT·META_LOOP·ADVANTAGE) + 7 exigences NONE (invariants back). Règles par maillon respectées : G = 2 objectifs `new_distinct` sur `objectif` ; F = `observe.appears` + affordance ; H = `replay` de rôles B..F ; I = affordance PLAYER + `decreases` ; J = `replay_ref` + `increases_more_than` ; DECISION = 2 options d'affordances distinctes, 3 policies, `metric:"or"`, `horizon_frames:300`.

**Exigences classées non actionnables** : aucune — chaque exigence porte un `expected_proof` exploitable (`bot_action`/`oracle`/`visual`). **Références non ancrées** : les 20 (toutes ADDITIONS, `reference:null` — attendu et déclaré, pas un défaut de chaîne).

**why_task_existed** : {`problem`: la sonde TD n'a pas de décomposition produit ni de manifeste d'exigences falsifiables ; sans lui la boucle joueur A→J et les étapes s3/s4/s5/s9 sont non spécifiées · `oracle`: aucun (activation par dispatch de pipeline s0→s1, décision humaine/pipeline) · `root_cause`: non établie (étape de production normale de la chaîne) · `action_reason`: s1-prisme produit le product_snapshot + la chaîne d'exigences que les étapes aval consomment} · **result** : product_snapshot.md (4 sections) + prisme.json (20 exigences) émis dans cette réponse · **proof** : `node scripts/forge/check_prisme_manifest.mjs <run_dir>/prisme.json --worldscan <run_dir>/worldscan.json` — commande NON lancée ici (aucun outil d'exécution ; `run: aucun`) ; sortie à produire par l'exécuteur · **learning** : les maillons I (META_LOOP) et J (ADVANTAGE) du Gameplay Contract sont taillés pour un archétype incrémental/prestige (kitten clicker) ; le charter TD interdit toute méta-progression entre parties et impose un Restart vers un état seed identique. La lecture défendable mappe META_LOOP sur l'investissement intra-partie du trésor de guerre (or qui diminue nettement à l'achat L3) et ADVANTAGE sur le delta de tempo (`appeler_vague` rapporte plus d'or une fois la défense renforcée) — pas sur un prestige inter-parties, qui serait faux ici · **next_reason** : chaîne NON fermée — l'exécuteur doit (1) matérialiser product_snapshot.md et prisme.json, (2) dériver `loop.json` par projection déterministe, (3) lancer `check_prisme_manifest.mjs` et `check_prisme.mjs` ; tant que le reçu d'oracle n'existe pas, aucune assertion de conformité n'est recevable.

**software_verdict** : BLOCKED (aucun oracle exécutable dans ce périmètre) · **evidence_verdict** : MECHANICAL_VALIDATION_ONLY (non atteint — oracle non lancé) · **claim_verdict** : NO_CLAIM_ALLOWED.

**SKIPPED_VALIDATION** :
- Item : `check_prisme_manifest.mjs` (chaîne Observation→Claim→Exigence→Preuve→Destination, provenance, ancrage) · Où : `<run_dir>/prisme.json` · Statut : non fait · Raison : `run: aucun` au contrat + aucun outil d'exécution/lecture dans ce subagent.
- Item : `check_prisme.mjs` (conformité markdown du snapshot) · Où : `<run_dir>/product_snapshot.md` · Statut : non fait · Raison : idem ; format rédigé pour passer (4 en-têtes exacts, R1..R14 numérotés, aucun placeholder) mais non vérifié mécaniquement.
- Item : inspection des artefacts amont (`worldscan`/`story_bible`/`gm_worldscan`/`design/*`) · Où : run_dir · Statut : non fait · Raison : Read/Glob/Grep/Bash désactivés — présence indéterminable, non compensée.
- Item : sourçage GM des 13 exigences de boucle · Où : prisme.json · Statut : partiel (mesuré 0/13, déclaré) · Raison : `gm_worldscan` non inspectable.

```json
{
  "game_id": "td_probe_v1",
  "exigences": [
    {
      "id": "p_goal_survie",
      "source": "ADDITIONS",
      "source_role": "back",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "PLAYER_GOAL",
      "observe": { "hud": "objectif", "predicate": "nonempty" },
      "observation": "Le charter fixe un critère de sortie binaire : victoire = vague 10 nettoyée avec lives>0, défaite = lives<=0 à tout tick.",
      "claim": "Un critère de sortie n'oriente les décisions que s'il est affiché en clair en permanence ; laissé implicite, le but perd son ancre et les arbitrages deviennent aveugles.",
      "enonce": "Une banniere d'objectif non vide est affichee en permanence et enonce le but courant (survivre a la vague N, nettoyer les 10 vagues).",
      "expected_proof": { "kind": "visual", "statement": "Capture navigateur montrant la banniere d'objectif non vide au chargement et a chaque changement de vague." },
      "destination": "s5-wiremap"
    },
    {
      "id": "p_poser_gun",
      "source": "ADDITIONS",
      "source_role": "back",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "PLAYER_ACTION",
      "affordance": "poser_gun",
      "observe": { "hud": "tours", "predicate": "increases" },
      "observation": "Le charter expose la pose de tour par selection d'un type (#btn-gun) puis clic sur une case libre du canvas ; cout Gun = 50.",
      "claim": "Si la pose est reellement pilotable au DOM seul, un bot script sans acces interne peut batir une defense — condition necessaire a toute preuve de boucle.",
      "enonce": "Le joueur pose une tour Gun en cliquant la cible poser_gun puis une case libre ; le nombre de tours affiche augmente de 1 et l'or diminue de 50.",
      "expected_proof": { "kind": "bot_action", "statement": "Un bot DOM pose une Gun ; window.__game.towers passe de n a n+1 et gold de g a g-50, exactement." },
      "destination": "s9-build"
    },
    {
      "id": "p_ameliorer",
      "source": "ADDITIONS",
      "source_role": "back",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "PLAYER_ACTION",
      "affordance": "ameliorer_tour",
      "observe": { "hud": "or", "predicate": "decreases" },
      "observation": "Le charter definit 3 niveaux par tour, cout L2=0,8x base, L3=1,6x base, via #btn-upgrade sur la tour selectionnee.",
      "claim": "Un cout d'amelioration croissant transforme l'or en arbitrage hauteur/largeur ; sans cout lisible, ameliorer serait un reflexe et non une decision.",
      "enonce": "Le joueur ameliore la tour selectionnee en cliquant ameliorer_tour ; l'or affiche diminue du cout exact du niveau vise.",
      "expected_proof": { "kind": "oracle", "statement": "Table de couts verifiee a l'egalite stricte : Gun L3 total = 50+40+80 = 170." },
      "destination": "s9-build"
    },
    {
      "id": "p_appeler_vague",
      "source": "ADDITIONS",
      "source_role": "back",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "PLAYER_ACTION",
      "affordance": "appeler_vague",
      "observe": { "hud": "or", "predicate": "increases" },
      "observation": "Le charter accorde un bonus d'appel anticipe = 2 or x secondes de preparation restantes, plafond 30.",
      "claim": "Ce bonus n'est un vrai levier que si l'appel est une action joueur observable ; il echange explicitement de la richesse contre de la securite.",
      "enonce": "Le joueur appelle la vague en cliquant appeler_vague pendant la preparation ; l'or affiche augmente du bonus d'anticipation et le decompte s'interrompt.",
      "expected_proof": { "kind": "bot_action", "statement": "Deux bots ne differant que par le tempo presentent un or cumule strictement different a la vague 5." },
      "destination": "s9-build"
    },
    {
      "id": "p_game_response_fire",
      "source": "ADDITIONS",
      "source_role": "back",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "GAME_RESPONSE",
      "observe": { "hud": "ennemis", "predicate": "decreases" },
      "observation": "Le charter impose une regle de ciblage unique et fixe : la tour acquiert la cible vivante la plus AVANCEE dans son rayon (first), tire, applique les degats.",
      "claim": "Une regle de ciblage deterministe rend la reponse du jeu reproductible, donc la consequence d'un placement mesurable au tick pres.",
      "enonce": "La tour tire sur la cible la plus avancee a portee ; les PV de l'ennemi vise diminuent et sa barre de vie raccourcit a l'ecran.",
      "expected_proof": { "kind": "visual", "statement": "Capture montrant un projectile emis et la barre de vie de l'ennemi raccourcie a l'impact." },
      "destination": "s9-build"
    },
    {
      "id": "p_reward_bounty",
      "source": "ADDITIONS",
      "source_role": "back",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "REWARD",
      "observe": { "hud": "or", "predicate": "increases" },
      "observation": "Le charter : un ennemi mort verse sa prime (Grunt 8, Runner 6, Brute 25) et disparait de l'ecran.",
      "claim": "Recompenser le kill par de l'or convertit la performance defensive en pouvoir d'achat, bouclant l'action sur la ressource qui la finance.",
      "enonce": "Un ennemi dont les PV atteignent zero disparait et l'or affiche augmente de sa prime exacte au meme instant.",
      "expected_proof": { "kind": "oracle", "statement": "Assertion stricte : tuer un Grunt fait passer l'or de G a G+8 et les ennemis vivants de n a n-1." },
      "destination": "s9-build"
    },
    {
      "id": "p_decision_tall_wide",
      "source": "ADDITIONS",
      "source_role": "back",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "DECISION",
      "observe": { "hud": "objectif", "predicate": "changes" },
      "options": ["p_poser_gun", "p_ameliorer"],
      "metric": "or",
      "horizon_frames": 300,
      "policies": [
        { "name": "wide", "click": "poser_gun", "every_frames": 90 },
        { "name": "tall", "click": "ameliorer_tour", "every_frames": 120 },
        { "name": "idle", "click": null, "every_frames": 0 }
      ],
      "observation": "Le charter : une tour L3 coute 2,4x sa base, trois tours L1 coutent 3x, et les L3 debloquent des capacites que le nombre ne remplace pas.",
      "claim": "Puisque hauteur et largeur achetent des choses non substituables, l'arbitrage du tresor de guerre n'est domine par aucune des deux voies — c'est la decision qui rend deux parties differentes.",
      "enonce": "A chaque fenetre de preparation, le joueur tranche entre poser une nouvelle tour (largeur) et ameliorer une tour existante (hauteur) ; la banniere d'objectif reflete l'arbitrage en cours.",
      "expected_proof": { "kind": "bot_action", "statement": "Sur seed 1337, les politiques wide et tall a horizon 300 divergent sur l'or et sur les vies finales, avec au moins une inversion de classement entre deux metriques." },
      "destination": "s3-decompo"
    },
    {
      "id": "p_unlock_capacite",
      "source": "ADDITIONS",
      "source_role": "back",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "UNLOCK",
      "affordance": "ameliorer_tour",
      "observe": { "hud": "tours", "predicate": "appears:capacite_niveau3", "appears": "capacite_niveau3" },
      "observation": "Le charter : l'effet SPECIFIQUE du niveau 3 est une capacite (Gun -> percee d'armure 3, Cannon -> splash 1,8, Frost -> ralentissement 60%/2,2s).",
      "claim": "Une capacite nouvelle au niveau 3 ouvre une SECONDE reponse valide a une menace (ex. l'armure), ce qu'un simple gain de degats ne ferait pas.",
      "enonce": "Le joueur ameliore une tour au niveau 3 via ameliorer_tour ; une capacite visible apparait (anneau de percee sur le Gun L3, rayon de splash elargi sur le Cannon L3).",
      "expected_proof": { "kind": "visual", "statement": "Capture avant/apres montrant l'apparition du marqueur de capacite niveau 3 sur la tour amelioree." },
      "destination": "s5-wiremap"
    },
    {
      "id": "g1_goal_armure",
      "source": "ADDITIONS",
      "source_role": "back",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NEXT_GOAL",
      "observe": { "hud": "objectif", "predicate": "new_distinct" },
      "observation": "Le charter : la vague 4 introduit la premiere Brute (armure 4, cout de fuite 5 vies).",
      "claim": "Annoncer explicitement la menace a venir rend l'anticipation possible, donc la preparation devient une decision plutot qu'un pari.",
      "enonce": "A l'entree de la vague 4, la banniere d'objectif affiche un texte distinct annoncant l'arrivee de l'armure (Brute).",
      "expected_proof": { "kind": "visual", "statement": "Capture de la banniere d'objectif de la vague 4, textuellement distincte de celle de la vague 3." },
      "destination": "s5-wiremap"
    },
    {
      "id": "g2_goal_vitesse",
      "source": "ADDITIONS",
      "source_role": "back",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NEXT_GOAL",
      "observe": { "hud": "objectif", "predicate": "new_distinct" },
      "observation": "Le charter : la vague 6 est un flot de 18 Runners (vitesse 2,2 cases/s).",
      "claim": "Une menace de vitesse pose une question differente de l'armure — as-tu du controle plutot que as-tu de la percee — donc un objectif textuellement neuf.",
      "enonce": "A l'entree de la vague 6, la banniere d'objectif affiche un texte distinct de celui de la vague 4, annoncant la menace de vitesse (Runners).",
      "expected_proof": { "kind": "visual", "statement": "Capture montrant la banniere de la vague 6 textuellement differente de celle de la vague 4." },
      "destination": "s5-wiremap"
    },
    {
      "id": "h_repeat_prep",
      "source": "ADDITIONS",
      "source_role": "back",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "REPEAT",
      "observe": { "hud": "vague", "predicate": "increases" },
      "replay": ["p_poser_gun", "p_game_response_fire", "p_reward_bounty", "p_unlock_capacite"],
      "observation": "Le charter : apres nettoyage et bonus de fin de vague, la partie retourne en preparation pour la vague suivante (10 vagues).",
      "claim": "Le retour en preparation ne recommence la boucle que si les memes actions redeviennent jouables dans un etat modifie ; sinon c'est une progression lineaire, pas une boucle.",
      "enonce": "Au debut de chaque preparation, le numero de vague augmente et le joueur rejoue poser, repondre, recompenser et debloquer dans le nouvel etat.",
      "expected_proof": { "kind": "bot_action", "statement": "Un run script montre p_poser_gun, p_game_response_fire, p_reward_bounty et p_unlock_capacite reexecutes a chaque vague, wave passant de w a w+1." },
      "destination": "s3-decompo"
    },
    {
      "id": "p_meta_upgrade",
      "source": "ADDITIONS",
      "source_role": "back",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "META_LOOP",
      "affordance": "ameliorer_tour",
      "observe": { "hud": "or", "predicate": "decreases" },
      "observation": "Le charter : l'or non depense est un tresor de guerre ; une tour L3 coute 2,4x sa base (base + 0,8x + 1,6x).",
      "claim": "Engager le tresor accumule dans une amelioration structurante est le pari meta intra-partie : le joueur echange une reserve visible contre une capacite durable.",
      "enonce": "Le joueur engage son tresor de guerre en ameliorant une tour au niveau 3 via ameliorer_tour ; l'or affiche diminue nettement d'un coup.",
      "expected_proof": { "kind": "bot_action", "statement": "Un bot tall provoque une chute d'or observable au tick de l'achat L3 ; gold(t) - gold(t+1) egale le cout L3 exact." },
      "destination": "s9-build"
    },
    {
      "id": "p_advantage_tempo",
      "source": "ADDITIONS",
      "source_role": "back",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "ADVANTAGE",
      "affordance": "appeler_vague",
      "observe": { "hud": "or", "predicate": "increases_more_than:p_appeler_vague" },
      "replay_ref": "p_appeler_vague",
      "observation": "Le charter : le bonus d'anticipation vaut 2 or x secondes de preparation restantes (plafond 30) ; une defense forte permet d'appeler la vague immediatement.",
      "claim": "Une fois le tresor investi et les tours renforcees, le joueur peut reclamer tot un bonus qu'une defense fragile lui interdisait : l'investissement se convertit en un gain de tempo strictement superieur.",
      "enonce": "Apres l'investissement meta, le joueur rappelle une vague via appeler_vague ; le gain d'or de cet appel est strictement superieur au gain du meme appel en debut de partie.",
      "expected_proof": { "kind": "bot_action", "statement": "Un bot mesure le delta d'or de appeler_vague avant et apres l'investissement L3 ; delta_apres > delta_avant strictement, sur seed 1337." },
      "destination": "s9-build"
    },
    {
      "id": "n_determinisme",
      "source": "ADDITIONS",
      "source_role": "back",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter impose une simulation a pas fixe (TICK_MS=16), un RNG seede porte dans l'etat, et aucune source non deterministe dans la logique.",
      "claim": "Un determinisme strict est la condition qui rend toute preuve de boucle rejouable ; sans lui, une divergence d'issue pourrait venir du hasard, pas de la decision.",
      "enonce": "Deux executions de la meme seed avec la meme liste d'actions en ticks produisent un hash d'etat final strictement egal.",
      "expected_proof": { "kind": "oracle", "statement": "Comparaison de deux executions reelles seed 1337 : egalite stricte du hash d'etat a N ticks." },
      "destination": "s4-archi"
    },
    {
      "id": "n_invariant_or",
      "source": "ADDITIONS",
      "source_role": "back",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter enonce un invariant comptable de l'or a trois robinets (primes, bonus de vague, bonus d'anticipation) moins les depenses.",
      "claim": "Un invariant comptable exact garantit qu'aucune ressource n'apparait ni ne disparait en silence, condition pour que l'economie soit un espace de decision et non un bruit.",
      "enonce": "A chaque tick, gold == 100 + somme(primes) + somme(bonus_vague) + somme(bonus_anticipation) - somme(depenses), egalite exacte.",
      "expected_proof": { "kind": "oracle", "statement": "Assertion stricte de l'invariant a chaque tick sur un run complet, jamais un >=." },
      "destination": "s4-archi"
    },
    {
      "id": "n_victoire_defaite",
      "source": "ADDITIONS",
      "source_role": "back",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter : result appartient a {null, VICTORY, DEFEAT} ; victoire = vague 10 nettoyee lives>0, defaite = lives<=0.",
      "claim": "Un critere de sortie binaire atteignable dans les deux sens donne un cout aux decisions ; sans defaite atteignable, aucun choix n'a d'enjeu.",
      "enonce": "window.__game.result et #overlay affichent VICTORY ssi la vague 10 est nettoyee avec lives>0, et DEFEAT des lives<=0.",
      "expected_proof": { "kind": "bot_action", "statement": "Bot competent -> VICTORY (lives>0) et bot naif -> DEFEAT (lives==0 avant vague 10) sur seed 1337." },
      "destination": "s9-build"
    },
    {
      "id": "n_refus_action",
      "source": "ADDITIONS",
      "source_role": "back",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter (S7) : pose sur chemin, case occupee, or insuffisant, upgrade d'une L3, appel pendant une vague sont des actions invalides.",
      "claim": "Un refus qui laisse l'etat strictement inchange distingue une regle d'une suggestion ; un refus permissif ouvrirait des etats non prevus par les oracles.",
      "enonce": "Chaque action invalide est refusee de facon observable, laisse l'etat strictement inchange (egalite avant/apres) et n'emet aucune exception console.",
      "expected_proof": { "kind": "oracle", "statement": "Cinq cas invalides : hash d'etat identique avant/apres et zero exception console." },
      "destination": "s9-build"
    },
    {
      "id": "n_etat_lecture_seule",
      "source": "ADDITIONS",
      "source_role": "back",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter : window.__game est une fenetre de LECTURE seule ; aucune action ne passe par un setter interne.",
      "claim": "Exposer l'etat sans setter garantit que toute preuve de boucle provient d'actions DOM reelles, pas d'une manipulation d'etat de contournement.",
      "enonce": "window.__game n'expose ni setter ni raccourci d'etat ; toute action de jeu est declenchable par le DOM seul.",
      "expected_proof": { "kind": "oracle", "statement": "Oracle statique : aucun setter ni fonction de mutation expose sur window.__game, et chaque action possede un controle DOM equivalent." },
      "destination": "s4-archi"
    },
    {
      "id": "n_purete_logique",
      "source": "ADDITIONS",
      "source_role": "back",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter (S3) : aucun Math.random, Date.now, performance.now ni requestAnimationFrame dans les modules logiques .mjs, qui s'executent sous node --test sans DOM.",
      "claim": "Isoler la logique des API non deterministes et du DOM permet de la tester hors navigateur et de garantir le determinisme mesure ailleurs.",
      "enonce": "Les modules logiques .mjs s'importent et s'executent sous node --test sans DOM et ne contiennent aucune source non deterministe.",
      "expected_proof": { "kind": "oracle", "statement": "Grep AST/textuel echouant si un seul appel interdit est present, et suite node --test verte hors navigateur." },
      "destination": "s4-archi"
    },
    {
      "id": "n_pression_par_type",
      "source": "ADDITIONS",
      "source_role": "back",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter : la pression monte par volume, type et simultaneite, jamais par un multiplicateur global de PV ; les stats d'ennemis sont constantes.",
      "claim": "Des statistiques constantes rendent la menace apprenable ; une montee par multiplicateur transformerait la boucle en course arithmetique et tuerait l'anticipation.",
      "enonce": "Les PV d'un Grunt a la vague 10 sont exactement ceux de la vague 1 (40) ; aucun scaling cache de PV ou de degats par vague.",
      "expected_proof": { "kind": "oracle", "statement": "Assertion stricte d'egalite des PV du Grunt entre la vague 1 et la vague 10." },
      "destination": "s4-archi"
    }
  ]
}
```
RETURN_REASON: {"status": "DISCOVERED", "problem": "Les maillons I (META_LOOP) et J (ADVANTAGE) du Gameplay Contract A..J sont taillés pour un archétype incrémental/prestige (kitten clicker), or le charter TD interdit toute méta-progression entre parties et impose un Restart vers un état seed identique ; le prestige inter-parties y serait faux.", "root_cause": "Le Gameplay Contract V4 a été défini contre l'exemple Kitten Clicker et son vocabulaire prestige/advantage ne se projette pas nativement sur une boucle de Tower Defense à vagues ; mappé ici sur l'investissement intra-partie du trésor de guerre (META_LOOP) et le delta de tempo (ADVANTAGE)."}