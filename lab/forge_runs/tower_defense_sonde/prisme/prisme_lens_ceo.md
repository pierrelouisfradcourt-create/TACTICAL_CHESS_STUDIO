# Product Snapshot — Tower Defense « td_probe_v1 » (angle CEO / produit)

**Positionnement.** Ce n'est pas « encore un tower defense ». C'est une défense-puzzle *honnête et rejouable* : chaque partie tourne sur une graine (seed), la composition des 10 vagues est fixe, et rien n'est caché au joueur. La proposition de valeur tient en une phrase : **le joueur peut apprendre le niveau, parier sur ses lectures, et vérifier que ses décisions — pas la chance — ont décidé de l'issue.** Le problème joueur résolu : les TD « au feeling » où l'on ne sait jamais si on a perdu par malchance ou par mauvais choix. Ici, même seed + mêmes clics = même partie, image par image. La décision structurante — *monter en hauteur (capacités) ou en largeur (couverture)* — n'a pas de solution unique, ce qui donne de la rejouabilité sans méta-progression persistante ni contenu additionnel à produire.

---

## 1. CE QUE LE JOUEUR VOIT

Au chargement, une seule map tient dans une fenêtre fixe : une grille où le **chemin** est visuellement distinct des **cases constructibles**, avec son épingle serrée où trois segments de chemin se longent. En haut, un bandeau de jeu lisible d'un coup d'œil : le **compteur d'or**, le **compteur de vies**, le **numéro de vague**, et une **bannière d'objectif** en texte clair qui nomme le but courant et la menace de la prochaine vague.

Pendant une vague, le joueur voit des ennemis entrer par la gauche et parcourir tout le chemin jusqu'à la sortie en suivant ses virages — on peut suivre chacun du regard. Les **tours posées tirent des projectiles visibles** vers l'ennemi le plus avancé à portée ; à l'impact, la **barre de vie de la cible raccourcit**. Un ennemi tué disparaît et l'**or affiché monte au même instant** ; un ennemi qui atteint la sortie disparaît et les **vies affichées baissent immédiatement**. Un ennemi ralenti par une tour Frost **change de couleur et d'allure**, visiblement. Un tir de Cannon produit un **effet de zone** qui raccourcit plusieurs barres de vie à la fois.

Entre les vagues, un **compte à rebours de préparation** décroît. Sélectionner une tour posée l'entoure d'un **indicateur de portée** ; la monter en niveau **change son apparence** (niveau lisible sur la tour). En fin de partie, un **panneau** s'affiche par-dessus le jeu : **VICTORY** ou **DEFEAT**, avec un bouton **Restart** qui ramène visiblement la partie à son état de départ.

## 2. CE QUE LE JOUEUR FAIT

Le joueur **choisit un type de tour** (Gun, Frost, Cannon) puis **le pose** en cliquant une case constructible — l'or dépensé se voit tomber. Il **sélectionne une tour** pour l'inspecter et la **monte en niveau** ; au niveau 3, il ne débloque pas « plus de chiffres » mais une **capacité** (percée d'armure pour Gun, ralentissement renforcé pour Frost, splash élargi pour Cannon). Il **arbitre en permanence son trésor de guerre** : engager l'or accumulé dans une tour de hauteur, ou l'étaler en largeur pour couvrir plus de chemin — deux voies qui gagnent différemment, aucune ne domine.

Il **pilote le tempo** : laisser filer le compte à rebours en sécurité, ou **appeler la vague tôt** pour empocher un bonus d'or — un pari richesse contre sécurité. À chaque vague nettoyée, il **rejoue** poser / laisser tirer / encaisser les bounties / monter en niveau, mais dans un état qui a changé : une menace nouvelle est annoncée (armure en vague 4, vitesse en vague 6). Toute action passe par l'écran : aucun geste ne demande d'appeler du code. Une action invalide (poser sur le chemin, sur une case occupée, sans or, monter une tour déjà au max, appeler une vague en cours) est **refusée sans rien casser** — l'état ne bouge pas.

## 3. CE QUE LE JOUEUR RESSENT

L'émotion visée est **la maîtrise gagnée par la lecture**, pas la surprise. Parce que les statistiques des ennemis sont constantes et la composition des vagues fixe, le joueur ressent qu'il **peut anticiper** : une erreur de lecture (pas de réponse à l'armure en vague 4, pas de ralentissement en vague 6) se paie *immédiatement et visiblement* en vies perdues — une Brute qui fuit coûte lourd, et ça se voit. Le **coût irréversible** du placement (pas de vente, pas de déplacement) rend chaque pose tendue : on s'engage vraiment.

Le **trésor de guerre** crée la tension centrale — la satisfaction de voir une tour montée au niveau 3 *sur-rentabiliser* la même défense qu'avant, contre la peur de s'être enfermé dans une voie trop étroite face à la vague à venir. L'**appel de vague anticipé** procure le frisson du pari assumé. Et parce que deux parties identiques se ressemblent à l'image près, le joueur ressent une **confiance rare pour un TD** : le jeu est équitable, ce qu'il a décidé est ce qui a compté. La sonde ne prétend pas que c'est *fun* — ça, c'est un jugement humain — mais elle garantit que c'est *lisible, apprenable et rejouable*.

## 4. RÈGLES OBSERVABLES

- **R1 — Objectif toujours affiché** : à tout instant, la bannière `objectif` contient un texte non vide énonçant le but courant (survivre aux 10 vagues avec au moins 1 vie).
- **R2 — Pose lisible** : cliquer un bouton de tour puis une case libre fait apparaître une tour et fait diminuer l'or affiché du coût exact (Gun 50, Frost 60, Cannon 100).
- **R3 — Réponse du jeu visible** : quand une tour tire, un projectile part vers l'ennemi ciblé et sa barre de vie raccourcit à l'impact.
- **R4 — Récompense simultanée** : à la mort d'un ennemi, l'or affiché augmente exactement de son bounty (Grunt 8, Runner 6, Brute 25) au moment même où il disparaît.
- **R5 — Décision mesurable** : un point de décision « hauteur ou largeur » s'affiche comme objectif, et deux façons de jouer distinctes produisent des trajectoires d'or divergentes sur un même horizon.
- **R6 — Déblocage visible** : monter une tour au niveau 3 fait diminuer l'or et fait apparaître sur la tour un indicateur de capacité (percée d'armure / ralentissement renforcé / splash élargi).
- **R7 — But suivant annoncé** : après une vague nettoyée, la bannière `objectif` affiche un texte nouveau et textuellement distinct du précédent (V4 = armure, V6 = vitesse).
- **R8 — Boucle qui recommence** : après nettoyage, le jeu revient en préparation, le numéro de vague affiché augmente, et pose/tir/bounty/upgrade sont rejouables dans le nouvel état.
- **R9 — Trésor engagé, visible** : engager le trésor de guerre dans une montée de niveau fait chuter l'or affiché d'un coup du montant investi.
- **R10 — Réinvestissement qui paie** : après montée au niveau 3, la même tour sur la même vague fait gagner un delta d'or strictement supérieur au delta d'avant l'upgrade.
- **R11 — Perte immédiate et lisible** : un ennemi qui atteint la sortie fait baisser les vies affichées sur-le-champ (Brute = −5), et une action invalide laisse l'état strictement inchangé sans erreur.
- **R12 — Fin claire et rejouable** : à `lives <= 0` le panneau affiche DEFEAT, à la vague 10 nettoyée avec vies restantes il affiche VICTORY ; Restart ramène la partie à son état de départ sur la même seed.

```json
{
  "game_id": "tower_defense_sonde-20260829",
  "exigences": [
    {
      "id": "p_goal_survive",
      "source": "ADDITIONS",
      "source_role": "s1-prisme-ceo",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "PLAYER_GOAL",
      "observe": { "hud": "objectif", "predicate": "nonempty" },
      "observation": "Le charter fixe la victoire a 'vague 10 nettoyee avec lives>0' et la defaite a lives<=0 (boucle_partie).",
      "claim": "Un critere de sortie binaire n'est un objectif jouable que s'il est AFFICHE en permanence au joueur, pas seulement encode dans window.__game.result.",
      "enonce": "Au lancement et a chaque instant, la banniere 'objectif' affiche un texte non vide enoncant le but courant : survivre aux 10 vagues avec au moins 1 vie.",
      "expected_proof": { "kind": "visual", "statement": "Capture navigateur de la page au chargement montrant la banniere objectif non vide, lue hors du process (Playwright evaluate du texte DOM)." },
      "destination": "s5-wiremap"
    },
    {
      "id": "p_place_gun",
      "source": "ADDITIONS",
      "source_role": "s1-prisme-ceo",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "PLAYER_ACTION",
      "affordance": "poser_gun",
      "observe": { "hud": "or", "predicate": "decreases" },
      "observation": "Le charter expose #btn-gun et la pose par clic sur une case constructible (criteres_succes S5).",
      "claim": "Une pose n'est un acte de joueur observable que si son cout se lit immediatement a l'ecran, sinon le joueur ne sait pas qu'il a agi.",
      "enonce": "Le joueur pose une tour Gun en cliquant 'poser_gun' puis une case libre ; l'or affiche diminue de 50 et une tour apparait sur la case.",
      "expected_proof": { "kind": "bot_action", "statement": "Un bot scripte selectionne Gun et pose sur une case libre ; l'or lu dans window.__game passe de G a G-50 exactement et towers[] gagne une entree." },
      "destination": "s5-wiremap"
    },
    {
      "id": "g_tower_fires",
      "source": "ADDITIONS",
      "source_role": "s1-prisme-ceo",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "GAME_RESPONSE",
      "observe": { "hud": "pv_ennemi", "predicate": "decreases" },
      "observation": "Le charter decrit une tour qui acquiert la cible vivante la plus avancee dans son rayon, tire et applique des degats (boucle_tick).",
      "claim": "Le tir n'est une reponse du jeu percue que si la perte de PV de l'ennemi est rendue visible a l'impact, pas seulement calculee en interne.",
      "enonce": "Quand une tour tire, un projectile visible part vers l'ennemi cible et sa barre de vie raccourcit a l'impact.",
      "expected_proof": { "kind": "visual", "statement": "Captures avant/apres impact montrant le raccourcissement de la barre de vie de l'ennemi cible sur un rendu navigateur reel." },
      "destination": "s5-wiremap"
    },
    {
      "id": "r_bounty",
      "source": "ADDITIONS",
      "source_role": "s1-prisme-ceo",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "REWARD",
      "observe": { "hud": "or", "predicate": "increases" },
      "observation": "Le charter attache un bounty par kill (Grunt 8, Runner 6, Brute 25) verse a la mort (economie_a_trois_robinets).",
      "claim": "La recompense ne boucle sur la decision que si le gain d'or est simultane et lisible au moment du kill, reliant l'acte au benefice.",
      "enonce": "A la mort d'un ennemi, l'or affiche augmente exactement de son bounty et le compteur d'ennemis vivants decroit de 1.",
      "expected_proof": { "kind": "oracle", "statement": "Invariant comptable strict a chaque tick : or_actuel == 100 + somme(bounties) + somme(bonus_vague) + somme(bonus_anticipation) - somme(depenses), egalite exacte." },
      "destination": "s5-wiremap"
    },
    {
      "id": "d_tall_vs_wide",
      "source": "ADDITIONS",
      "source_role": "s1-prisme-ceo",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "DECISION",
      "options": ["p_place_gun", "u_upgrade_l3"],
      "policies": [
        { "name": "passif", "click": null, "every_frames": 0 },
        { "name": "actif_largeur", "click": "poser_gun", "every_frames": 180 }
      ],
      "metric": "or",
      "horizon_frames": 300,
      "observe": { "hud": "objectif", "predicate": "changes" },
      "observation": "Le charter oppose 'monter en hauteur' (capacites L3) et 'monter en largeur' (couverture), sans qu'aucune voie ne domine (boucle_meta_intra_partie).",
      "claim": "Cet arbitrage n'est une vraie decision que si deux politiques de jeu distinctes produisent, mesurablement, des trajectoires d'or divergentes sur un meme horizon.",
      "enonce": "Un point de decision 'hauteur ou largeur' s'affiche comme objectif ; deux politiques (passive vs pose repetee) divergent sur l'or observe apres 300 frames.",
      "expected_proof": { "kind": "bot_action", "statement": "Sonde a deux trajectoires : politiques 'passif' et 'actif_largeur' rejouees sur la meme seed produisent deux valeurs d'or distinctes non triviales a l'horizon 300 frames." },
      "destination": "s5-wiremap"
    },
    {
      "id": "u_upgrade_l3",
      "source": "ADDITIONS",
      "source_role": "s1-prisme-ceo",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "UNLOCK",
      "affordance": "monter_niveau",
      "observe": { "hud": "or", "predicate": "decreases", "appears": "capacite_l3" },
      "observation": "Le charter reserve au niveau 3 une CAPACITE (Gun L3 percee d'armure 3, Frost L3 60 %, Cannon L3 splash 1,8), pas seulement des nombres (upgrades).",
      "claim": "Un deblocage n'est une progression percue que si une nouvelle capacite devient VISIBLE sur la tour, pas seulement inscrite dans une table de degats.",
      "enonce": "Le joueur monte une tour au niveau 3 en la selectionnant puis en cliquant 'monter_niveau' ; l'or affiche diminue du cout et un indicateur de capacite (groupe 'capacite_l3') apparait sur la tour.",
      "expected_proof": { "kind": "visual", "statement": "Captures avant/apres upgrade montrant l'apparition de l'indicateur de capacite L3 sur la tour et le niveau lisible, sur rendu navigateur reel." },
      "destination": "s5-wiremap"
    },
    {
      "id": "n_goal_armure",
      "source": "ADDITIONS",
      "source_role": "s1-prisme-ceo",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NEXT_GOAL",
      "observe": { "hud": "objectif", "predicate": "new_distinct" },
      "observation": "Le charter fait entrer la Brute blindee a V4, posant la question 'as-tu prevu l'armure ?' (calendrier_10_vagues).",
      "claim": "L'anticipation n'existe que si le prochain but est ANNONCE par un texte d'objectif nouveau, distinct du precedent a l'ecran.",
      "enonce": "Apres le nettoyage de la vague 3, la banniere 'objectif' affiche un texte nouveau et distinct : la Brute blindee arrive en vague 4, prevoir la percee d'armure.",
      "expected_proof": { "kind": "visual", "statement": "Captures montrant le texte de la banniere objectif changer pour un contenu nouveau et distinct apres la vague 3, lu via le DOM." },
      "destination": "s5-wiremap"
    },
    {
      "id": "n_goal_vitesse",
      "source": "ADDITIONS",
      "source_role": "s1-prisme-ceo",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NEXT_GOAL",
      "observe": { "hud": "objectif", "predicate": "new_distinct" },
      "observation": "Le charter fait deferler 18 Runners rapides a V6, posant la question 'as-tu prevu la vitesse ?' (calendrier_10_vagues).",
      "claim": "Chaque nouveau but doit se lire comme un texte d'objectif TEXTUELLEMENT different des precedents, sinon le joueur ne percoit pas un cap nouveau.",
      "enonce": "Apres le nettoyage de la vague 5, la banniere 'objectif' affiche un texte nouveau et distinct du but d'armure : la nuee de Runners rapides arrive en vague 6, prevoir le ralentissement.",
      "expected_proof": { "kind": "visual", "statement": "Captures montrant le texte de la banniere objectif apres la vague 5 different a la fois de l'etat initial et du but 'armure', lu via le DOM." },
      "destination": "s5-wiremap"
    },
    {
      "id": "h_repeat_prep",
      "source": "ADDITIONS",
      "source_role": "s1-prisme-ceo",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "REPEAT",
      "replay": ["p_place_gun", "g_tower_fires", "r_bounty", "u_upgrade_l3"],
      "observe": { "hud": "vague", "predicate": "increases" },
      "observation": "Le charter reboucle prep (15 s) -> pose/upgrade -> vague -> nettoyage -> bonus -> prep (boucle_vague).",
      "claim": "La boucle ne recommence reellement que si les memes actes de pose, tir, bounty et upgrade sont rejouables dans un etat de jeu qui a change (vague suivante).",
      "enonce": "Apres le nettoyage d'une vague, le jeu revient en preparation, le numero de vague affiche augmente, et le joueur rejoue pose/tir/bounty/upgrade dans le nouvel etat.",
      "expected_proof": { "kind": "bot_action", "statement": "Un bot mene deux vagues consecutives ; window.__game.wave passe de n a n+1 et la phase revient a 'prep', avec pose et upgrade a nouveau acceptes." },
      "destination": "s5-wiremap"
    },
    {
      "id": "m_warchest_commit",
      "source": "ADDITIONS",
      "source_role": "s1-prisme-ceo",
      "reference": null,
      "acteur": "PLAYER",
      "loop_role": "META_LOOP",
      "affordance": "monter_niveau",
      "observe": { "hud": "or", "predicate": "decreases" },
      "observation": "Le charter fait de l'or non depense un tresor de guerre, actif que le joueur arbitre en permanence (boucle_meta_intra_partie).",
      "claim": "Le tresor n'a de sens meta que si son ENGAGEMENT se voit : le hoard accumule fond d'un coup quand le joueur le convertit en hauteur.",
      "enonce": "Le joueur engage son tresor de guerre accumule en portant sa tour d'epingle au niveau 3 via 'monter_niveau' ; l'or affiche chute d'un coup du montant investi.",
      "expected_proof": { "kind": "bot_action", "statement": "Un bot accumule de l'or puis engage une montee L3 ; window.__game.gold chute d'un montant egal au cout d'upgrade en un seul acte, mesure avant/apres." },
      "destination": "s5-wiremap"
    },
    {
      "id": "j_upgraded_outearns",
      "source": "ADDITIONS",
      "source_role": "s1-prisme-ceo",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "ADVANTAGE",
      "replay_ref": "p_place_gun",
      "observe": { "hud": "or", "predicate": "increases_more_than:p_place_gun" },
      "observation": "Le charter promet qu'une tour de niveau 3 debloque une capacite que le nombre ne remplace pas (upgrades, boucle_meta_intra_partie).",
      "claim": "Le reinvestissement n'est un avantage que si la MEME action defensive rapporte STRICTEMENT plus apres l'upgrade qu'avant, prouve par la mesure et non par le texte.",
      "enonce": "Apres la montee au niveau 3 de la tour d'epingle, la meme tour affrontant la meme vague fait gagner un delta d'or strictement superieur au delta d'avant l'upgrade.",
      "expected_proof": { "kind": "bot_action", "statement": "Deux runs de meme seed : le delta d'or gagne par la tour d'epingle sur la vague de reference apres upgrade L3 est strictement superieur au delta du meme dispositif avant upgrade." },
      "destination": "s5-wiremap"
    },
    {
      "id": "det_replay_equal",
      "source": "ADDITIONS",
      "source_role": "s1-prisme-ceo",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter impose RNG seede, pas fixe 16 ms, et un hash d'etat strictement egal sur deux runs de meme seed+actions (S2, boucle_tick).",
      "claim": "Le determinisme n'est pas qu'une propriete technique : c'est la promesse produit qu'une partie est REJOUABLE donc APPRENABLE, la valeur meme de la sonde.",
      "enonce": "Deux parties lancees avec la meme seed et la meme sequence de clics produisent des etats dont le hash est strictement egal, et se ressemblent image par image.",
      "expected_proof": { "kind": "oracle", "statement": "Comparaison de deux executions reelles de la meme seed + memes actions horodatees en ticks : egalite STRICTE du hash d'etat final." },
      "destination": "s4-archi"
    },
    {
      "id": "readonly_no_persist",
      "source": "ADDITIONS",
      "source_role": "s1-prisme-ceo",
      "reference": null,
      "acteur": "SYSTEM",
      "loop_role": "NONE",
      "observation": "Le charter interdit tout setter/triche dans window.__game (lecture seule) et toute persistance entre parties (hors_scope, actions_interdites).",
      "claim": "Une fenetre d'etat en lecture seule et l'absence de sauvegarde positionnent la sonde comme un instrument de mesure HONNETE, non un jeu a score gonflable.",
      "enonce": "window.__game n'expose aucune fonction d'action ni setter ; toute action passe par le DOM ; aucune donnee n'est persistee entre parties.",
      "expected_proof": { "kind": "oracle", "statement": "Oracle statique (grep AST/textuel) : aucun setter ni fonction d'action sur window.__game, aucun localStorage/fichier/reseau dans les modules logiques." },
      "destination": "s4-archi"
    }
  ]
}
```
RETURN_REASON: {"status": "DISCOVERED", "problem": "Le GAMEPLAY CONTRACT impose des maillons META_LOOP (I) et ADVANTAGE (J) de type prestige/incremental, mais le charter Tower Defense exclut toute meta-progression persistante (boucle meta intra-partie seulement) ; le mapping retenu I=engagement du tresor de guerre dans une montee L3 / J=tour montee sur-rentabilise la meme defense est un etirement semantique a verifier en aval, et aucun artefact amont (worldscan/story_bible/gm_worldscan) n'etant present au s1-prisme, toutes les exigences sont ADDITIONS (reference null) et le sourcage GM est 0/12.", "root_cause": "Contrat de boucle A..J calibre sur un clicker (Kitten Clicker) et applique tel quel a un genre Tower Defense sans mecanique de prestige."}