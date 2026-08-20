# DESIGN REVIEW — Prisme — projet : snake — **RÉVISION v2**

run_id : `snake-20260728-091302` · marqueur : `FORGE_DISPATCH:gr1-gameplay-review-snake:snake-20260728-091302:1`
Date : 2026-07-28 · Statut : **PROPOSITION** — la ratification est HumanGate Pierre.

`claim_verdict: NO_CLAIM_ALLOWED` · `evidence_verdict: MECHANICAL_VALIDATION_ONLY`.

Oracle de forme de cet artefact :
`node scripts/forge/prisme/check_gameplay_review.mjs lab/forge_runs/snake/prisme/design_review.md`
(complétude structurelle, non-LLM). Cet oracle vérifie que **rien n'est laissé silencieux** ;
il ne juge **pas** la justesse des jugements portés ci-dessous — cette justesse est un fog
HumanGate.

## 0. Ce que cette révision est, et pourquoi elle existe

La v1 de ce document a été écrite contre le charter v1. Le charter est passé en **version 2**
(champ structuré `revisions:`, décisions Pierre D1→D6 du 2026-07-28 + règle de wiremap), et les
quatre snapshots du panel ont été révisés en conséquence (`check_prisme` PASS ×4, recombinaison
`merge_prisme` = **FULL_COVERAGE 22/22**, zéro GAP). Une review qui resterait en v1 continuerait
à opposer des rejets à des décisions déjà prises par Pierre : ce serait exactement l'inverse de
son rôle.

Trois principes cadrent cette révision, et il faut les distinguer :

1. **Un rejet levé par Pierre n'est pas un rejet « corrigé » — c'est un arbitrage qui change de
   main.** Les décisions correspondantes deviennent `necessaire` avec la base « décision Pierre
   2026-07-28 D5 », et le **prix** que la v1 avait nommé reste dû : il est payé explicitement par
   un critère falsifiable, jamais absorbé en silence.
2. **Un rejet que Pierre n'a pas touché ne se lève pas tout seul.** Les rejets d'applicabilité et
   d'instrument sont ré-examinés contre la nouvelle cible, et ils tiennent ou tombent sur leur
   propre base — pas par contagion.
3. **D4 (Genre Bible RATIFIÉE, verbatim « source de compréhension, pas une limitation
   artificielle ») change le statut d'une base, pas la vérité d'un fait.** La règle de genre
   `continuous_forward_motion` reste vraie du **mouvement en partie** ; elle cesse d'être un motif
   suffisant pour rejeter une brique voulue par Pierre. L'avertissement de dépendance de la v1
   (« Genre Bible PROPOSED ») **tombe** : la base est ratifiée.

### Entrées lues (ancres, v2)

| Artefact | Statut amont cité |
|---|---|
| `lab/forge_runs/snake/charter.yaml` | **version 2**, 22 `criteres_succes`, 16 `criteres_demo`, `parametres_de_design` (8 paramètres), `revisions` + `revisions_du_prisme` |
| `lab/forge_runs/snake/product_snapshot.md` (contrôle s1, v2) | `check_prisme` PASS — 36 règles observables |
| `lab/forge_runs/snake/prisme/product_snapshot_gamedesign.md` | lentille, `check_prisme` PASS — 31 règles |
| `lab/forge_runs/snake/prisme/product_snapshot_archidepot.md` | lentille, `check_prisme` PASS — 32 règles, typage CODE/CONCEPT/NEW |
| `lab/forge_runs/snake/prisme/product_snapshot_gameplayprog.md` | lentille, `check_prisme` PASS — 50 règles à valeur stricte |
| `lab/forge_runs/snake/prisme/merged_prisme.md` | union mécanique, **RESULT: FULL_COVERAGE**, 22/22, **0 GAP** |
| `docs/forge/GENRE_BIBLE_SNAKE_V1_PROPOSED.md` | **RATIFIÉE par Pierre le 2026-07-28 (D4)** |
| `docs/forge/FORGE_ARCHITECT_MANUAL_V1.md` | PROPOSED — §0 (biais anti-création), §3, §5, §6 (règle IKEA) |
| `scripts/forge/prisme/design_review_checklist.yaml` | PROPOSED, 23 items, 7 catégories |

---

## 1. Bascules v1 → v2 de cette review

Sept jugements de la v1 changent, quatre tiennent, deux sont neufs et durcis.

**Jugements qui basculent** (base : décisions Pierre du 2026-07-28) :

| Sujet | v1 | v2 | Base |
|---|---|---|---|
| État de PAUSE | `rejete` | `necessaire` | D5 — « expérience utilisateur complète, prévue dans l'architecture dès le départ » |
| Meilleur score | `rejete` | `necessaire`, et **persistant inter-session** | D5 — « mémoire minimale de progression » |
| Import `grid_nav.gd` | `rejete` (inapplicable, cible navigateur) | `necessaire` comme brique **CODE** du bot | D1 — cible Godot ; précédent d'import réel vérifié (`games/grid_nav_probe/`) |
| `stack.moteur` | `oui` avec fog ouvert (navigateur, TRACE_INDIRECTE) | `oui`, **fog CLOS** — Godot 4.x | D1, `provenance.plateforme_cible` = SOURCE_PIERRE_DIRECTE |
| `gd.boucles` | `non` | `oui` | D5 — le record persistant EST la raison de revenir |
| `meta.retention` · `meta.objectif_long_terme` | `non` | `oui` (rétention minimale) | D5 |
| `data.persistance` | `na` | `oui`, minimale (un entier, `user://`) | D5 |
| Stratégie de vitesse | fog « ratifier la vitesse fixe » | **caduc** — accélération confirmée | D3 — « la vitesse fixe à 200 ms n'est pas suffisante » |
| Avertissement Genre Bible PROPOSED | en tête de document | **retiré** | D4 — ratifiée |
| Traitement des 2 GAP du merge | 2 GAP traités | **caduc** — merge v2 = FULL_COVERAGE 22/22 | recombinaison v2 |

**Jugements qui tiennent** (ré-examinés sur leur propre base, pas par inertie) : collision balayée
de Pong, capture non issue d'un rendu GPU réel, `reuse_ratio.mjs` comme source de vérité,
métrique de difficulté sans preuve de variance. Détail en §3.

**Jugements neufs** : la bande de vitesse *jouée* n'est pas la bande *déclarée* (§4), et la règle
de wiremap se paie en **socle**, pas en systèmes (§5).

---

## 2. Le prix des rejets levés — payé, pas absorbé

La v1 rejetait la pause et le meilleur score avec un argument qui n'était pas faux : chacun coûte
un module, et le meilleur score **affaiblit littéralement** le seul test strict qui protégeait
`REJOUER EN UN GESTE` (« aucun état de la partie précédente ne fuite dans la nouvelle »). Pierre a
tranché en sens inverse. Le devoir de cette review n'est donc plus de rejeter : c'est de **rendre
le prix vérifiable**.

**Pause.** La contradiction C1 de la v1 (gamedesign R2 l'excluait / gameplayprog R17-R18 la
spécifiait) est éteinte : les quatre snapshots v2 la portent de façon cohérente. Le prix est une
transition supplémentaire dans la machine à états — **4 statuts, pas 3**. Il est payé par
`PAUSE OBSERVABLE ET NEUTRE`, qui exige trois choses falsifiables séparément : zéro tick appliqué
pendant la pause (gameplayprog R24), égalité **profonde** de l'état avant/après (R25), et
**exactement 1** tick à la première trame de reprise (R26). La formulation « la pause est un état
de la machine à états, pas un gel d'horloge de présentation » est ce qui empêche le mode de panne
le moins cher à écrire et le plus difficile à détecter.

**Meilleur score.** Le prix est une **exception dans l'oracle de non-fuite**. La v1 avait raison
de dire que c'est un affaiblissement ; elle avait tort d'en conclure qu'il fallait s'en priver.
Une exception **nommée** est vérifiable — c'est ce que gameplayprog R31 encode : « le nombre de
champs de l'état de partie qui survivent d'une partie à l'autre est **exactement 0** », le
meilleur score ne faisant pas partie de l'état de partie. Une exception implicite serait un trou ;
une exception nommée est un contrat. La différence est la totalité de l'argument, et c'est
exactement l'inverse de ce que la v1 concluait.

**Rétention inter-session.** Le fog v1 (« accepter l'absence pour cette tranche ») est clos par le
haut : la rétention existe, au minimum absolu — un entier. Trois réponses de checklist basculent
en conséquence (`gd.boucles`, `meta.retention`, `meta.objectif_long_terme`), et une quatrième
change de nature (`data.persistance`, de `na` à `oui, minimale`). Cette bascule est le seul endroit
où cette review passe d'un `non` à un `oui` sans qu'un système soit inventé pour remplir une case :
c'est Pierre qui a demandé le système, la case suit.

**Plateforme.** Le fog le plus lourd du run est clos par D1. Conséquence directe et mesurée :
`grid_nav.gd` — que la v1 rejetait explicitement en écrivant « si le fog plateforme basculait vers
Godot, ce rejet tomberait » — redevient une brique **CODE** réellement importable, avec un
précédent d'import vérifié dans le dépôt (`games/grid_nav_probe/` la `preload` en trois fichiers,
lentille archidepot R1). Symétriquement, `reachability.mjs`, que la v1 comptait comme la seule
brique applicable, est requalifié **INAPPLICABLE** : c'est du `.mjs`, la cible est Godot. Le
basculement n'a pas seulement ouvert une porte, il en a fermé une autre — et les deux sont nommées.

---

## 3. Les rejets qui tiennent — et pourquoi ils ne tombent pas par contagion

**Collision balayée de Pong (`stepBall`) — rejet MAINTENU.** Ce rejet n'a jamais dépendu de la
plateforme. Le monde de Pong est continu (positions en flottants, interpolation de franchissement
de plan) ; celui de Snake est entier. Entre deux cases adjacentes d'une grille, il n'y a **aucun
franchissement à interpoler** : adapter `stepBall` reviendrait à en retirer l'interpolation,
c'est-à-dire tout son contenu (IKEA question 2, répondue non par archidepot R18 et confirmée ici).
Le charter v2 maintient d'ailleurs ce rejet nommément dans `revisions.revisions_du_prisme`. Ce
rejet est ce qui autorise la brique NEW de collision discrète à passer la question IKEA n°1 sans
être un aveu de paresse.

**Preuve visuelle sans fenêtre GPU réelle — rejet MAINTENU ET RENFORCÉ.** La v1 rejetait la
rasterisation logicielle du navigateur. Sur cible Godot, le même rejet devient **plus dur** et
repose sur un fait mesuré du poste (2026-07-22) : `--headless` rend une texture **nulle**, aucun
PNG n'est produit. La preuve visuelle exige `--rendering-driver vulkan` et une fenêtre positionnée
hors écran. Le charter v2 l'inscrit en `actions_interdites`. Nuance qui n'est pas un adoucissement :
`godot --headless` reste **légitime pour la mécanique** (le harnais de tests GDScript, archidepot
R2) et **interdit pour l'image**. Confondre les deux est le mode de panne ; les séparer est la règle.

**`reuse_ratio.mjs` comme source de vérité — rejet MAINTENU et AGGRAVÉ par le changement de cible.**
La v1 citait un défaut de **classement** (imports relatifs classés `local`, mesuré
`reuse_ratio = 0.000` sur Pong). En v2 la lentille archidepot mesure pire, et sur le seul jeu Godot
forgé du dépôt : `node scripts/forge/reuse_ratio.mjs games/grid_nav_probe` →
`reuse_ratio = 0 / (4 + 0) = 0.000`, `imports: []` — **alors que ce jeu contient trois `preload`
réels** de la brique de bibliothèque. La cause est nommée : `extractImportSpecifiers` n'extrait que
les specifiers ES (`from "…"`), et GDScript importe par `preload("res://…")`. Ce n'est plus un
mauvais classement, c'est une **absence totale d'extraction** : sur cible Godot, l'instrument mesure
0 par construction, quelle que soit la réutilisation réelle. L'extension `cross_game` datée du
2026-07-28 corrige le classement inter-jeux, pas la lecture du GDScript. Cette décision ne cite
donc **aucun chiffre attendu** : elle porte sur la source de vérité du run, qui reste le champ
`REUSED_FROM` typé de la wiremap.

**Métrique de difficulté sans preuve de variance — rejet MAINTENU, avec un cas d'école interne.**
La lentille gameplayprog (R50) nomme elle-même le piège de ce jeu : le **numéro de palier est une
fonction déterministe du nombre de nourritures mangées**. Le publier sous le nom « difficulté »
serait littéralement la panne grid-navigator — une grandeur qui reproduit une autre grandeur sous
un nom plus ambitieux. Le taux d'occupation de la grille et la période de tick restent publiables
**sous leur nom littéral**, qui est ce qu'ils mesurent.

---

## 4. Entrée neuve la plus lourde : la bande déclarée n'est pas la bande jouée

C'est le seul endroit où cette review trouve, dans les artefacts v2 eux-mêmes, une **promesse plus
forte que la mesure**. Elle ne re-tranche aucun chiffre de Pierre : elle propose un traitement.

Les valeurs du charter (`parametres_de_design`, statut `A_EQUILIBRER` : palier tous les 5 fruits,
pas ×0,92, plancher 80 ms) et la cible de victoire (longueur 25, soit **22 nourritures**, également
`A_EQUILIBRER`) produisent ensemble, par simple application de la règle déclarée :

- une **partie gagnante franchit exactement 4 paliers** (à 5, 10, 15 et 20 nourritures) ;
- la période à la victoire vaut **≈ 143,278 ms** (200 × 0,92⁴) ;
- le **plancher de 80 ms n'est atteint qu'au 11ᵉ palier, soit 55 nourritures** — deux fois et demie
  la cible de victoire.

Autrement dit : la bande **déclarée** est [80 ms, 200 ms], la bande **réellement jouée dans une
partie gagnée** est [≈143 ms, 200 ms]. La moitié basse de la bande n'existe que dans la règle pure.
La lentille gameplayprog l'écrit déjà avec honnêteté (R5, « note d'honnêteté ») ; ce que cette
review ajoute, c'est la **conséquence de nommage** : appeler [80, 200] la « bande de vitesse
jouable » promet une expérience que le produit ne livre pas, exactement au sens de la règle d'usine
n°4 et de la règle de variance ratifiée le 2026-07-21.

**Traitement proposé — trois éléments, aucun chiffre re-tranché :**

1. **Distinguer deux grandeurs nommées différemment** : la *bande de la règle pure* [plancher,
   période initiale], testée par valeurs strictes sur la fonction pure (y compris la saturation au
   plancher), et la *bande atteinte en partie*, mesurée et rapportée en valeur brute sur les parties
   réellement jouées par le bot de solvabilité. La seconde ne se déduit pas de la première.
2. **Interdire de présenter la saturation au plancher comme un fait observable** tant qu'aucune
   partie mesurée ne l'atteint. Le test du plancher reste obligatoire — il protège contre une
   période qui plongerait sans borne — mais il prouve une **borne de sûreté**, pas une expérience.
3. **Remonter le fog à Pierre avec ses trois leviers, sans en choisir un** : si Pierre veut que le
   plancher soit ressenti, l'une des trois valeurs doit bouger (palier plus court, pas plus fort, ou
   cible de victoire plus haute) ; s'il préfère une partie gagnante courte, la formulation du
   plancher doit être requalifiée comme borne de sûreté. Les deux voies sont cohérentes ; l'arbitrage
   est le sien, et c'est précisément pourquoi les trois valeurs sont marquées `A_EQUILIBRER` et déjà
   remontées en `question_ouverte_humangate`.

Ce traitement est peu coûteux **parce que** le bloc de paramètres isolés existe (décision
`parametres_isoles`) : changer l'un des trois chiffres ne touche aucune ligne de logique. C'est le
premier bénéfice concret et vérifiable de la règle de wiremap de Pierre.

---

## 5. La règle de wiremap se paie en socle, pas en systèmes

Pierre demande une architecture capable d'accueillir équilibrage de difficulté, télémétrie,
progression et réutilisation de briques — **sans les construire**, puisque `hors_scope` les exclut
explicitement de la tranche verticale. Le risque est double et symétrique :

- **construire les trois systèmes maintenant** — feature creep déguisé en préparation, sanctionné
  par le biais anti-création du manuel §0 : c'est le rejet `systemes_extensibilite_construits`
  ci-dessous ;
- **déclarer l'extensibilité sans la prouver** — c'est le mode de panne « déclaré ≠ exécuté », que
  le charter nomme lui-même et que le studio a documenté comme SON mode de panne.

La seule sortie est un **dispositif de preuve** et non une intention, et il tient en trois faits
mécaniquement falsifiables (gameplayprog R47/R48, archidepot R24) : (a) changer une valeur du bloc
de paramètres modifie le comportement observable, et le nombre d'autres fichiers modifiés est
**exactement 0** ; (b) un observateur de test se branche **réellement** sur les événements de tick
et reçoit **exactement N** « nourriture mangée », **exactement P** « palier franchi » et
**exactement 1** « fin de partie », le nombre de références de la logique pure vers cet observateur
étant **exactement 0** ; (c) aucun script de logique pure ne référence une dimension de grille, une
touche ou un nom de scène en dur.

Le point (b) est le cœur : c'est la **prise** où viendront plus tard la télémétrie, l'équilibrage et
la progression. Et la forme compte — une liste de dictionnaires retournée par le tick, **jamais** un
signal Godot ni un bus global, parce qu'un signal est une API de moteur, interdite dans la logique
pure par le charter. Construire la prise coûte quelques lignes ; construire les trois appareils
coûterait le run.

---

## 6. Ce que cette review ne tranche pas

Cinq fogs restent hors de mon périmètre, tous listés dans `gaps_traites` avec un traitement proposé :
la cible de victoire (25, non ratifiée), le trio d'accélération (5 / −8 % / 80, `A_EQUILIBRER`), le
fog de courbe décrit en §4, la cécité de `reuse_ratio` au GDScript, et l'absence de lecteur mécanique
du typage `CONCEPT`. S'y ajoutent trois fogs mineurs inchangés : retour sonore, taille de cellule en
pixels (`A_MESURER`, aucune source vérifiée), profondeur de file d'entrée si Pierre préfère le modèle
bufferisé de Google au modèle direct.

Le cinquième mérite d'être lu comme un défaut d'usine et pas comme un détail de run : **D1 impose un
typage CODE / CONCEPT / NEW, et aucun instrument du studio ne sait compter un `CONCEPT`** — par
définition, un concept réécrit ne laisse aucune trace d'import. Le seul porteur possible est le champ
`REUSED_FROM` de la wiremap, qui n'a aujourd'hui **aucun lecteur mécanique**. Le charter v2 exige
pourtant « TAUX DE REUTILISATION MESURE ET RAPPORTE ». Tant que ce lecteur n'existe pas, l'objectif
industriel du run est porté par un champ que personne ne lit : c'est un fog d'usine, remonté ici
nommément plutôt que découvert au moment du verdict.

Une question explicite à Pierre, là où cette review a un doute qu'elle ne veut pas maquiller : le
fog de courbe de §4 est-il un défaut d'équilibrage à corriger avant le build, ou une requalification
de vocabulaire à accepter telle quelle ? Les deux réponses sont défendables ; elles n'ont pas le même
coût, et aucune n'est du ressort d'un agent.

---

## 7. Bloc structuré (lu par `check_gameplay_review.mjs`)

Correspondance des raccourcis employés en §1-§6 avec le champ `sujet` des décisions ci-dessous
(le raccourci est une commodité de lecture, la décision fait foi) :

| Raccourci cité en prose | `decisions[].sujet` |
|---|---|
| `etat_de_pause` | État de PAUSE — quatrième statut de la machine à états |
| `meilleur_score_persistant` | Meilleur score persistant entre sessions, hors état de partie |
| `import_grid_nav_gdscript` | Réutilisation CODE de knowledge_base/systems/navigation/grid_nav.gd pour le bot de solvabilité |
| `acceleration_paliers` | Accélération par paliers, règle pure testée sur ses seuils |
| `bande_declaree_comme_bande_jouee` | Bande de vitesse déclarée [plancher, période initiale] présentée comme la bande RESSENTIE par le joueur |
| `parametres_isoles` | Bloc unique de paramètres de gameplay nommés et isolés |
| `dispositif_extensibilite` | Dispositif de preuve d'extensibilité (paramètres, événements-données, zéro valeur en dur) |
| `systemes_extensibilite_construits` | Construction effective de la télémétrie, de l'équilibrage automatique et de la progression dans cette tranche |
| `collision_balayee_pong` | Réutilisation de la collision balayée de Pong (stepBall) |
| `capture_sans_fenetre_gpu` | Capture produite sans fenêtre GPU réelle comme preuve d'un critère de démo |
| `reuse_ratio_par_imports` | Mesure du taux de réutilisation par les imports (reuse_ratio.mjs en l'état) comme source de vérité du run |
| `metrique_difficulte` | Métrique publiée sous le nom « difficulté », « pression spatiale » ou « courbe d'accélération ressentie » |
| `etat_victoire_distinct_et_cible_affichee` | État terminal GAGNÉ distinct de PERDU, et cible de victoire affichée au joueur |
| `profondeur_file_entree` | Profondeur de file d'entrée = 1, dernier appui légal de l'intervalle retenu |

```json
{
  "checklist_answers": {
    "gd.action_30s": {
      "statut": "oui",
      "raison": "Le serpent avance seul dès l'ouverture de l'application, sans menu ni geste préalable : contrôle v2 R1/R2, gamedesign R1/R2, gameplayprog R41 (nombre d'appuis nécessaires avant le premier mouvement = exactement 0, nombre d'écrans intercalés = exactement 0). Une flèche suffit à découvrir le seul verbe du jeu, et le bandeau donne d'emblée la cible (Longueur 3 / 25). Inchangé v1 -> v2, renforcé par le critere de demo DEMARRAGE IMMEDIAT ajoute en v2 (D6).",
      "impact_architecture": "Aucun ecran de menu, aucun etat PRE_GAME : l'etat initial est deja EN COURS, ce qui supprime une transition et rend l'oracle de demarrage trivialement lisible. En Godot, la scene principale instancie directement la partie ; aucun autoload de navigation d'ecrans."
    },
    "gd.boucles": {
      "statut": "oui",
      "raison": "BASCULE v1 -> v2. La boucle minute (prise de nourriture, gamedesign R8) et la boucle session (mort -> relance en un geste, R19) existaient deja ; ce qui manquait en v1 etait la raison de revenir demain, et le rejet du meilleur score en supprimait le seul candidat. Decision Pierre 2026-07-28 D5 : le meilleur score persiste entre les sessions (gamedesign R21, contrôle v2 R18, gameplayprog R35). La conjonction des trois horizons est donc satisfaite, par un systeme demande par Pierre et non fabrique pour remplir une case.",
      "impact_architecture": "Introduit la SEULE couche de persistance du produit : un entier dans un fichier user:// du moteur, charge au demarrage, ecrit a l'entree dans un statut terminal. L'I/O est confinee dans un adaptateur ; la logique pure ne touche jamais FileAccess (archidepot R23)."
    },
    "gd.progression_visible": {
      "statut": "oui",
      "raison": "Quatre grandeurs en chiffres arabes en permanence au bandeau : score, longueur rapportee a la cible (3 / 25), record, palier de cadence (contrôle v2 §1, gamedesign R14/R15, gameplayprog R30). S'y ajoute l'occupation croissante de la grille, qui est une image et non un indicateur cache. La progression vers la cible declaree est donc lisible pendant la partie, pas seulement a l'ecran de fin.",
      "impact_architecture": "Quatre grandeurs de premier niveau doivent exister dans l'etat expose (score, longueur, record, periode ou numero de palier) et etre lues par le rendu, jamais recalculees par lui. La cible de victoire est une constante nommee du bloc de parametres, lue par la logique ET par la presentation."
    },
    "gd.comprehension_amelioration": {
      "statut": "oui",
      "raison": "Le jeu est deterministe hors position de spawn (charter DETERMINISME PROUVE PAR REPLAY, contrôle v2 R25) et ne comporte ni bonus, ni malus, ni multiplicateur (gamedesign R28). L'accelaration ajoutee en v2 est elle-meme une fonction deterministe du nombre de fruits manges : elle ne rend pas le resultat plus aleatoire, elle ajoute un axe de maitrise. Un meilleur score signifie donc exactement une meilleure conduite, jamais un meilleur tirage.",
      "impact_architecture": "Interdit tout module de bonus/multiplicateur/alea de gameplay ; le generateur pseudo-aleatoire seede est confine au choix de la case de nourriture et n'a aucun autre appelant. La regle d'accelaration est une fonction pure periode(nombre_de_fruits) sans etat propre."
    },
    "meta.objectif_long_terme": {
      "statut": "oui",
      "raison": "BASCULE v1 -> v2. Le jeu porte desormais DEUX objectifs de nature differente : un objectif de partie (atteindre la cible de victoire declaree, affichee au bandeau) et un objectif qui traverse les sessions (battre le record persiste sur la machine) — decision Pierre D5. La v1 repondait non parce que le seul objectif declare etait celui d'une partie ; ce n'est plus le cas.",
      "impact_architecture": "Aucun profil joueur, aucun compteur cumule, aucun systeme de progression meta : la totalite de la memoire inter-session est UN entier. C'est le minimum absolu qui rende la reponse vraie, et le charter interdit d'aller au-dela dans cette tranche."
    },
    "meta.collection": {
      "statut": "non",
      "raison": "Aucune collection. Explicitement hors_scope du charter v2 (« Power-ups, bonus, invincibilite, ralenti, themes cosmetiques : hors de la tranche verticale de ce run — ce sont des systemes de contenu, pas des briques fondamentales d'apprentissage »). Inchange v1 -> v2 : D5 conserve les briques fondamentales, il n'ouvre pas les systemes de contenu.",
      "impact_architecture": "Aucun systeme d'inventaire, de catalogue ni de deblocage : la boite de briques Metagame du manuel §1 n'est pas ouverte pour ce jeu."
    },
    "meta.deblocages": {
      "statut": "non",
      "raison": "Aucun deblocage. Hors_scope du charter v2 au meme titre que la collection ; aucun des 22 criteres de succes ni des 16 criteres de demo ne le reclame. Inchange v1 -> v2.",
      "impact_architecture": "Aucune machine a etats de progression, aucun gating de contenu : le jeu n'a qu'une seule configuration jouable, ce qui rend l'oracle de solvabilite applicable a la totalite du produit."
    },
    "meta.maitrise": {
      "statut": "oui",
      "raison": "La profondeur etait spatiale en v1 (savoir ou sera sa propre queue dans trois pas) ; la v2 lui ajoute un second axe, temporel et non aleatoire : conduire la meme lecture spatiale a cadence croissante (gamedesign R11/R12/R6, contrôle v2 §3 « le double etau »). Les deux axes sont mesures par un seul chiffre non falsifiable, le score, dans un jeu sans alea de gameplay.",
      "impact_architecture": "Exige la regle de collision exacte sur la case de queue liberee au meme tick (gameplayprog R18) ET son independance a la cadence (R19 : la meme fixture rejouee a 200 ms et a 80 ms produit un etat final strictement egal). Sans cette seconde propriete, la lecture spatiale que le joueur apprend deviendrait fausse aux paliers rapides."
    },
    "meta.retention": {
      "statut": "oui",
      "raison": "BASCULE v1 -> v2, et c'est une retention MINIMALE, nommee comme telle. Retention intra-session : friction de relance nulle, un seul geste depuis l'ecran de fin (genre.snake.zero_penalty_instant_restart, contrôle v2 R21). Retention inter-session : le record persiste sur la machine (D5, gamedesign R21, gameplayprog R35). Le fog v1 (« accepter l'absence pour cette tranche ») est clos par decision de Pierre, pas par un systeme invente.",
      "impact_architecture": "Une couche de persistance existe desormais, et elle est la surface la plus dangereuse du run : elle affaiblit l'oracle de non-fuite. Le prix est paye par une exception NOMMEE et unique (gameplayprog R31 : nombre de champs de l'etat de partie qui survivent = exactement 0, le record vivant hors de cet etat)."
    },
    "feel.actions_satisfaisantes": {
      "statut": "oui",
      "raison": "Latence bornee a exactement 1 tick a toutes les cadences, plancher compris (gameplayprog R11) ; une seule direction appliquee par tick quelle que soit la rafale (R12) ; cadence stable ENTRE deux paliers et changement franc AU palier (R2/R3), donc jamais un emballement continu ; aucun rattrapage de temps apres une privation d'execution (R8) ni apres une pause (R26). Ce qui detruit la confiance dans un jeu a tick n'est pas la latence, c'est sa variabilite — et la v2 ajoute une source de variabilite (l'accelaration) qu'elle borne explicitement.",
      "impact_architecture": "Trois contraintes de l'adaptateur de presentation, verifiables depuis les constantes et l'etat expose : file d'entree de profondeur 1 (un champ ecrasable, pas une structure de file), accumulateur de temps borne a un tick par trame, et periode de tick relue a chaque tick depuis la regle pure plutot que figee au demarrage de la boucle."
    },
    "feel.feedback_visuel": {
      "statut": "oui",
      "raison": "Chaque evenement decisif a une contrepartie affichee : croissance et score au meme tick (contrôle v2 R11), franchissement de palier visible sur l'indicateur de cadence au tick exact (gameplayprog R10), arret net sur l'image de la collision avec cause en clair (contrôle v2 §1), panneau de pause explicite (gameplayprog R27), record signale comme battu a l'instant ou il l'est (gamedesign R21). Trois de ces cinq evenements sont des ajouts v2.",
      "impact_architecture": "Le rendu doit pouvoir dessiner l'etat FIGE de la collision (l'etat terminal conserve la position fatale) et l'etat de pause SANS vider le plateau : ni l'un ni l'autre n'est un etat vide. L'indicateur de cadence lit la periode reelle de l'etat expose, jamais une valeur decorative (gameplayprog R10 : egalite stricte entre affichage et etat interne)."
    },
    "feel.feedback_sonore": {
      "statut": "non",
      "raison": "Aucun retour sonore. Le charter v2 n'en demande ni n'en interdit, et aucune source de la Genre Bible ne chiffre un benefice. Inchange v1 -> v2 : D6 a ajoute six criteres de demo, aucun ne porte sur le son. Ajouter un son ici serait une decision de gout non tracee — remonte en fog HumanGate (arbitrage joueur, Pierre).",
      "impact_architecture": "Aucun systeme audio, donc aucun asset, aucune dependance runtime supplementaire et aucune surface non couverte par l'oracle visuel. Si Pierre le ratifie, l'ajout est un adaptateur de presentation branche sur les evenements-donnees du tick (nourriture mangee, palier franchi, fin de partie) : la logique pure n'est pas touchee, et le canal existe deja par le dispositif d'extensibilite."
    },
    "feel.recompenses_frequentes": {
      "statut": "oui",
      "raison": "Premiere prise en quelques secondes (Genre Bible §5, horizon minute 1) et prise suivante toujours atteignable, puisque la nourriture n'apparait jamais sous le corps (gameplayprog R21 : nombre de positions de nourriture coincidant avec le corps = exactement 0, et exactement 1 nourriture presente a tout tick en cours ou en pause). La v2 ajoute une seconde recompense reguliere et lisible : le franchissement de palier, tous les 5 fruits.",
      "impact_architecture": "Impose le tirage sur la liste des cases libres plutot que par rejet : l'atteignabilite de la recompense devient une propriete structurelle du spawn, pas une esperance statistique, et la terminaison est prouvable sur un etat a une seule case libre (gameplayprog R22)."
    },
    "archi.systemes_separes": {
      "statut": "oui",
      "raison": "Logique pure (etat, tick, collisions, croissance, score, fin, spawn, regle d'accelaration) en scripts RefCounted n'heritant d'aucun Node et n'appelant aucune API de moteur ; adaptateurs Node/Node2D qui consomment l'etat (archidepot R7/R8/R30). Verifiable des le premier fichier : scripts/forge/static_oracles.py lit reellement les preload/load et les extends GDScript (archidepot R6, verifie), donc la regle est executable et non declarative.",
      "impact_architecture": "Decoupage impose avant la premiere ligne de code, et le blueprint doit declarer les dependances interdites AVANT le code. C'est aussi la condition du gate de mutation cadre : les systemes purs sont la seule zone que la mutation sait juger (manuel §3.1, mesure Pong 95 % contre 0 %)."
    },
    "archi.dependances_sens_unique": {
      "statut": "oui",
      "raison": "logique pure -> rien ; adaptateur -> logique pure ; aucun cycle (archidepot R30). Declare dans la wiremap AVANT le code, sur le patron verifie de games/pong/09_WIREMAP/wiremap.json (categories system et system.adapter avec allowed_deps explicites), et verifie sur les preload/extends reels par l'oracle d'architecture statique.",
      "impact_architecture": "Un import de presentation depuis la logique est un FAIL d'oracle, pas un avertissement. Consequence propre a Godot et non evidente : un signal de scene dans la logique pure serait une API de moteur — le canal d'evenements doit donc etre une valeur de retour du tick, pas un signal."
    },
    "archi.brique_existante": {
      "statut": "oui",
      "raison": "Inventaire reel du catalogue au 2026-07-28 (9 briques + 3 roles, une seule en runtime godot). Resultat : 6 briques CODE reellement importables (grid_nav.gd, harnais de tests GDScript, solvability_godot.mjs + godot_trial.mjs + godot_bin.mjs, godot_oracle.mjs, mutation.py, static_oracles.py), 10 briques CONCEPT lues chez Pong sans import, 10 briques NEW dont chaque absence est constatee NOMINATIVEMENT (machine a etats generique, bufferisation d'entree, cadence variable, persistance locale — archidepot R17). Bascule v2 : grid_nav.gd passe de rejete-inapplicable a CODE importable ; reachability.mjs fait le chemin inverse.",
      "impact_architecture": "Les 10 NEW sont bornees et nommees avant production. Deux d'entre elles portent un risque particulier et il est nomme : la persistance locale (affaiblit un test strict, paye par une exception nommee) et la cadence variable (aucun precedent dans le depot — Pong a un TICK_HZ constant, verifie). Aucune creation hors de cette liste ne devrait passer sans repasser la regle IKEA."
    },
    "archi.reutilisable": {
      "statut": "oui",
      "raison": "Six candidats au legs nommes AVANT la production (archidepot R32) : grille discrete + collision sur cases entieres, contrat de point d'observation de debug pour jeu Godot, cadence a paliers bornee + bloc de parametres isoles, tirage seede sur cases libres, persistance locale etanche a exception nommee, patron de wiremap portant REUSED_FROM type et OBSERVABLE_BY_PLAYER. Quatre comblent une absence constatee au catalogue ; le sixieme est l'instrument qui rend le legs mesurable au run suivant.",
      "impact_architecture": "Ces six blocs doivent etre ecrits sans dependance a Snake (pas de taille de grille en dur, pas de vocabulaire de direction dans la collision, pas de nom de fichier de sauvegarde specifique) pour etre promouvables. La promotion elle-meme reste propose-only, hors_scope du charter. Ce que Snake ne doit PAS leguer est egalement nomme : son rendu, ses dimensions, et son bot de solvabilite."
    },
    "api.besoin": {
      "statut": "na",
      "raison": "Jeu solo, local, hors-ligne : aucune API n'est necessaire. Le charter v2 place reseau, backend, base de donnees, comptes et classement en ligne en hors_scope, et interdit toute dependance externe runtime (plugin, addon, asset store, paquet reseau). La persistance ajoutee par D5 est LOCALE (un fichier user:// du moteur) et ne cree aucun besoin de service. Dimensionnement au niveau d'ambition, manuel §3.7.",
      "impact_architecture": "Aucune couche service, aucun client HTTP, aucune gestion d'etat asynchrone : la boucle reste synchrone et deterministe, ce qui est la condition du replay strict. La seule I/O du produit est la lecture/ecriture d'un entier au demarrage et a la fin de partie."
    },
    "api.contrat": {
      "statut": "na",
      "raison": "Sans objet : aucune API n'existe (voir api.besoin). Repondu na + raison plutot que par le silence, conformement a la regle de la checklist. Inchange v1 -> v2 : D5 ajoute une persistance locale, pas un service.",
      "impact_architecture": "Aucun contrat d'interface externe a versionner, donc aucune gestion d'erreur reseau ni de degradation hors-ligne a concevoir — le mode hors-ligne est le mode nominal, pas un mode degrade."
    },
    "data.persistance": {
      "statut": "oui",
      "raison": "BASCULE v1 -> v2 (la v1 repondait na, reponse devenue fausse avec D5). Une seule donnee persiste entre deux ouvertures : le meilleur score, un entier, dans un fichier user:// du moteur (archidepot R23/R29, contrôle v2 R18). Le format de sauvegarde est donc trivial et defini : une cle, une valeur entiere. La persistance SERVEUR reste explicitement hors_scope.",
      "impact_architecture": "Un module de logique pure charger()/enregistrer() dont l'I/O est confinee dans un adaptateur — la logique pure ne touche jamais FileAccess. Quatre cas limites sont des exigences, pas des raffinements : fichier absent, vide, corrompu, emplacement non inscriptible ; dans les quatre, le jeu demarre avec un record de 0 et le nombre d'exceptions non gerees remontees a l'utilisateur est exactement 0 (gameplayprog R36)."
    },
    "data.migration_offline": {
      "statut": "oui",
      "raison": "Deux moities, repondues separement. Migration : sans objet au sens fort — une seule cle, aucun schema a faire evoluer, et un fichier illisible est traite comme absent, ce qui est la strategie de migration la moins chere et la plus testable (archidepot R29). Offline : mode nominal ET unique — application de bureau Godot lancee cable debranche, aucune ressource distante, aucun greffon tiers (contrôle v2 R33).",
      "impact_architecture": "Interdit toute dependance reseau a l'execution et tout chargement de configuration distante. Conséquence sur la persistance : la tolerance au fichier illisible EST la politique de migration — il n'y a pas de numero de version de format a maintenir, et il ne faut pas en introduire un pour un seul entier."
    },
    "stack.moteur": {
      "statut": "oui",
      "raison": "BASCULE v1 -> v2, et c'est la bascule la plus lourde du run. Moteur Godot 4.x, application de bureau hors-ligne, trace a charter.plateforme_cible avec provenance.plateforme_cible = SOURCE_PIERRE_DIRECTE (decision D1, verbatim « Confirme : Godot. Le choix est volontaire »). Le fog v1 (cible navigateur, TRACE_INDIRECTE, fog_humangate: true) est CLOS. Le binaire est resolu par configuration et jamais en dur (scripts/forge/godot.config.json, verifie), et le moteur est deja en usage dans le depot (games/chess_tcg/, games/grid_nav_probe/).",
      "impact_architecture": "Determine la totalite de la reutilisation, dans les deux sens : les briques .mjs de Pong cessent d'etre importables et deviennent des CONCEPTS lus, tandis que grid_nav.gd redevient une brique CODE avec un precedent d'import reel dans le depot. Contrainte de poste heritee et non negociable : la preuve visuelle exige --rendering-driver vulkan et une fenetre hors ecran, --headless rendant une texture nulle (fait mesure 2026-07-22)."
    },
    "stack.librairies": {
      "statut": "na",
      "raison": "Aucune librairie tierce n'est utilisee : ni plugin, ni addon, ni asset store, ni paquet reseau (charter actions_interdites, interdiction explicite de toute dependance externe runtime). La seule dependance est le moteur lui-meme. Il n'y a donc aucune licence a valider, aucune communaute a evaluer et aucun risque d'abandon a peser. Repondu na + raison plutot que oui : repondre « oui, validees » sur un ensemble vide serait un vert silencieux.",
      "impact_architecture": "Zero surface de dependance tierce. Le seul risque d'obsolescence porte sur les API du moteur lui-meme, ce qui deplace la question de la licence vers la compatibilite de version — d'ou l'importance que le binaire reste resolu par configuration (godot.config.json) et non code en dur, ce qui est deja le cas et verifie."
    }
  },
  "decisions": [
    {
      "sujet": "État de PAUSE — quatrième statut de la machine à états",
      "decision": "necessaire",
      "pourquoi": "REJET V1 LEVÉ. Base : décision Pierre 2026-07-28 D5 — la pause est une « expérience utilisateur complète, prévue dans l'architecture dès le départ ». La base de genre citée par la v1 (genre.snake.continuous_forward_motion) reste vraie du MOUVEMENT en partie — le serpent ne s'arrête jamais tant que la partie tourne — mais D4 pose que la Genre Bible est une source de compréhension et non un motif de rejet : une pause est une commande de session, pas un frein de gameplay. Le charter v2 la réclame désormais explicitement (critère PAUSE OBSERVABLE ET NEUTRE, critère de démo PAUSE FONCTIONNELLE), ce qui retire aussi l'argument « aucun critère ne la demande ». Falsifiable en trois points strictement séparés : zéro tick appliqué pendant la pause, égalité profonde de l'état avant/après reprise hors indicateur de pause, et exactement 1 tick à la première trame de reprise.",
      "impact_architecture": "La machine à états porte QUATRE statuts mutuellement exclusifs et exhaustifs — en cours, en pause, terminé-perdu, terminé-gagné — et non trois : la v1 supprimait une transition, la v2 la rétablit. gameplayprog R17/R18 redeviennent applicables telles quelles. Contrainte de forme non négociable : la pause est un statut de l'état de partie, jamais un gel d'horloge de présentation ni un arrêt de rendu — sans quoi le compteur de ticks continue d'avancer et le test le démasque. L'écran de pause doit laisser le plateau visible (le serpent figé sur sa case), sinon la pause est indistinguable d'un jeu planté."
    },
    {
      "sujet": "Meilleur score persistant entre sessions, hors état de partie",
      "decision": "necessaire",
      "pourquoi": "REJET V1 LEVÉ. Base : décision Pierre 2026-07-28 D5 — « mémoire minimale de progression ». La v1 rejetait au motif que le meilleur score oblige l'oracle de non-fuite à porter une exception, donc affaiblit le seul test strict protégeant REJOUER EN UN GESTE. Le fait est exact et il n'est pas nié : il est PAYÉ. Le charter v2 le paie par le critère MEILLEUR SCORE PERSISTANT ET ETANCHE, qui rend l'exception vérifiable au lieu d'implicite, et par quatre cas limites obligatoires (fichier absent, vide, corrompu, non inscriptible). Falsifiable : rejouer le même replay une fois avec un record à 0 et une fois à 999 doit produire deux états finaux strictement égaux sur tous les champs de l'état de partie, et le nombre de lectures du record depuis la logique de partie doit être exactement 0.",
      "impact_architecture": "Introduit la seule couche de persistance du produit et la seule I/O hors présentation. Trois contraintes en découlent : le record vit HORS de l'état de partie (sinon l'oracle de non-fuite devient inexprimable) ; la logique pure ne touche jamais FileAccess, l'I/O étant confinée dans un adaptateur ; l'exception de l'oracle de non-fuite est NOMMÉE et unique, toute autre survivance restant un FAIL. La dégradation sur sauvegarde inutilisable est silencieuse côté joueur et journalisée côté debug — un jeu qui refuse de démarrer parce qu'un fichier de record est corrompu serait un défaut plus grave que l'absence de record."
    },
    {
      "sujet": "Réutilisation CODE de knowledge_base/systems/navigation/grid_nav.gd pour le bot de solvabilité",
      "decision": "necessaire",
      "pourquoi": "REJET V1 LEVÉ PAR LE CHANGEMENT DE CIBLE. La v1 rejetait pour inapplicabilité (brique GDScript, cible navigateur) en écrivant elle-même « si le fog plateforme basculait vers Godot, ce rejet tomberait ». D1 a fait basculer le fog. La brique est réelle et cataloguée (brick_id sys-grid-nav-m01, runtime godot, vérifiée : extends RefCounted, DIRECTIONS en ordre fixe, MAX_CELLS_EXPLORED partagée par les deux BFS), et le dépôt contient un précédent d'import RÉEL et vérifié : games/grid_nav_probe/ la preload en trois fichiers. Falsifiable trivialement dans les deux sens — un preload qui échoue à l'exécution invalide la décision. Réserve de périmètre explicite : l'évaluation détaillée de cette brique (forme exacte de l'intégration) appartient à l'étape architecture/wiremap, pas à cette review ; ce qui est décidé ici est son ADMISSIBILITÉ comme brique CODE.",
      "impact_architecture": "Symétriquement, knowledge_base/systems/procgen/reachability.mjs — que la v1 comptait comme la seule brique applicable — devient INAPPLICABLE : c'est du .mjs, la cible est Godot, l'import est interdit. Le basculement de plateforme ferme une porte en même temps qu'il en ouvre une, et les deux sont nommées plutôt que découvertes au build. Conséquence de mesure : la part CODE de la wiremap augmente réellement, ce qui rend d'autant plus visible l'absence de lecteur mécanique du typage (voir gaps_traites)."
    },
    {
      "sujet": "Accélération par paliers, règle pure testée sur ses seuils",
      "decision": "necessaire",
      "pourquoi": "ENTRÉE NEUVE. Base : décision Pierre 2026-07-28 D3 — « L'accélération est confirmée. La vitesse fixe à 200 ms n'est pas suffisante pour valider la boucle complète. » Le fog v1 (vitesse fixe Google contre accélération Nokia) est clos par décision directe, non par arbitrage de source : la source Nokia reste en HTTP 403 et n'est donc citée nulle part comme justification de magnitude. Le charter l'encadre par un critère falsifiable sur les SEUILS et non sur une tendance : pour chaque palier, valeur exacte juste avant, exactement au seuil et juste après, plus saturation stricte au plancher et remise à la valeur initiale à chaque nouvelle partie. Toute assertion de type « la période a diminué » est interdite (actions_interdites, pré-mortem PILOU ②).",
      "impact_architecture": "Une brique NEW dont l'absence est constatée nominativement : le dépôt ne contient aucune cadence variable (Pong a un TICK_HZ constant, vérifié). Forme imposée : une fonction PURE periode(nombre_de_fruits) sans état propre, donc testable par table de valeurs et rejouable — et non un compteur mutable caché dans la boucle de présentation. Deux conséquences en cascade : l'adaptateur doit relire la période à chaque tick au lieu de la figer au démarrage de la boucle, et la collision doit être prouvée indépendante de la cadence (la même fixture rejouée à 200 ms et au plancher produit un état final strictement égal), sans quoi l'accélération deviendrait une source de mort injuste."
    },
    {
      "sujet": "Bande de vitesse déclarée [plancher, période initiale] présentée comme la bande RESSENTIE par le joueur",
      "decision": "rejete",
      "pourquoi": "ENTRÉE NEUVE, et c'est le rejet le plus important de cette révision. Fait dérivé mécaniquement des valeurs déclarées du charter, sans en re-trancher aucune : avec palier tous les 5 fruits, pas ×0,92 et cible de victoire à 22 nourritures, une partie GAGNANTE franchit exactement 4 paliers et se termine à une période de ≈143,278 ms ; le plancher de 80 ms n'est atteint qu'au 11e palier, soit 55 nourritures — deux fois et demie la cible. La bande déclarée est donc [80, 200] et la bande réellement jouée dans une partie gagnée est [≈143, 200] : la moitié basse n'existe que dans la règle pure. Nommer [80, 200] la « bande de vitesse jouable » promet une expérience que le produit ne livre pas — règle d'usine n°4 (un nom de preuve est la promesse exacte de ce qui est mesuré) et règle de variance ratifiée Pierre le 2026-07-21 (leçon grid-navigator). La lentille gameplayprog le nomme déjà honnêtement en R5 ; ce rejet en tire la conséquence de vocabulaire. Ce qui N'EST PAS rejeté : les trois chiffres eux-mêmes, qui sont un arbitrage Pierre (statut A_EQUILIBRER) et restent en fog avec un traitement proposé.",
      "impact_architecture": "Sépare DEUX grandeurs qui portaient un seul nom, et donc deux preuves de nature différente. (1) Bande de la règle pure [plancher, période initiale] : testée par valeurs strictes sur la fonction pure, saturation au plancher comprise — elle prouve une BORNE DE SÛRETÉ, elle protège contre une période qui plongerait sans borne. (2) Bande atteinte en partie : mesurée et rapportée en valeur brute sur les parties réellement jouées par le bot de solvabilité, jamais déduite de la première. Conséquence directe sur le critère de démo VITESSE JOUABLE RESSENTIE : il se prouve sur la bande (2), pas sur la bande (1). Aucun module supplémentaire n'est créé — le coût est un nom et une ligne de rapport, ce qui est exactement le prix d'une promesse honnête."
    },
    {
      "sujet": "Bloc unique de paramètres de gameplay nommés et isolés",
      "decision": "necessaire",
      "pourquoi": "ENTRÉE NEUVE. Base : décision Pierre D3 (« paramètres isolés pour équilibrer facilement ») et règle de wiremap D-wiremap. Critère charter PARAMETRES DE JEU ISOLES ET NOMMES, falsifiable par comptage et non par intention : le nombre de littéraux numériques de gameplay hors du bloc est EXACTEMENT 0, tests et scripts de présentation compris, et la preuve par l'effet exige que modifier la seule période initiale change la cadence observée au runtime avec exactement 0 autre fichier modifié (gameplayprog R47). Constat mesuré qui justifie la brique NEW : Pong disperse ses constantes de gameplay sur DEUX fichiers (BALL_VX, PADDLE_SPEED, WIN_SCORE, FIELD_W/H dans state.mjs ; TICK_HZ, SERVE_CROSS_DIST dans loop.mjs, vérifié) — le patron existe donc à moitié et échouerait au critère v2.",
      "impact_architecture": "Contrainte de PLACEMENT, pas de style : huit valeurs (dimensions de grille, période initiale, palier, pas, plancher, longueur initiale, cible de victoire, points par nourriture) vivent dans un seul bloc de constantes nommées de la logique pure. Forme imposée et non évidente : des CONSTANTES, pas un fichier de configuration chargé au runtime — un fichier de configuration réintroduirait de l'I/O dans la logique pure et casserait la séparation. C'est ce bloc qui rend le fog de courbe peu coûteux à corriger : les trois chiffres d'accélération bougent sans toucher une ligne de logique."
    },
    {
      "sujet": "Dispositif de preuve d'extensibilité (paramètres, événements-données, zéro valeur en dur)",
      "decision": "necessaire",
      "pourquoi": "ENTRÉE NEUVE. Base : règle de wiremap Pierre 2026-07-28 — « ne pas optimiser uniquement pour livrer Snake V1, construire une architecture capable d'accueillir équilibrage difficulté, télémétrie, progression, réutilisation de briques ». Une intention d'extensibilité non prouvée mécaniquement serait exactement le mode de panne « déclaré ≠ exécuté » que le studio a documenté comme le sien. Le critère ARCHITECTURE EXTENSIBLE PROUVEE est donc écrit en trois faits falsifiables séparément (gameplayprog R47/R48, archidepot R24) : (a) changer une valeur du bloc modifie le comportement observable avec exactement 0 autre fichier modifié ; (b) un observateur de test se branche RÉELLEMENT et reçoit exactement N événements « nourriture mangée », exactement P « palier franchi » et exactement 1 « fin de partie », le nombre de références de la logique pure vers cet observateur étant exactement 0 ; (c) aucun script de logique pure ne référence une dimension de grille, une touche ou un nom de scène en dur. Un point non prouvé par ce branchement réel est rapporté comme non prouvé, jamais comme intention.",
      "impact_architecture": "Le point (b) est la PRISE où viendront plus tard la télémétrie, l'équilibrage et la progression, et sa forme est contrainte par la séparation logique/rendu : une liste de dictionnaires retournée par le tick, JAMAIS un signal Godot ni un bus d'événements global — un signal est une API de moteur, interdite dans la logique pure. Le patron d'émission existe et est vérifié chez Pong (step() renvoie {state, events}) ; ce qui est neuf est l'OBSERVATEUR BRANCHÉ qui prouve que le canal est utilisable. Sans lui, le canal serait une déclaration de plus."
    },
    {
      "sujet": "Construction effective de la télémétrie, de l'équilibrage automatique et de la progression dans cette tranche",
      "decision": "rejete",
      "pourquoi": "ENTRÉE NEUVE. La règle de wiremap de Pierre demande une architecture capable de les ACCUEILLIR ; le charter v2 range leur construction en hors_scope (« Télémétrie effective, système d'équilibrage automatique, courbe de progression calibrée : la règle de wiremap impose que l'architecture PUISSE les accueillir ; les CONSTRUIRE est hors de cette tranche verticale »). Le risque est nommé par la lentille archidepot elle-même (R24, question IKEA n°5) : le danger de cette brique n'est pas de manquer, c'est d'en faire trop. Biais anti-création du manuel §0 appliqué tel quel. Falsifiable : tout module dont la suppression ne change AUCUN comportement observable par le joueur ni AUCUN critère de démo est un système construit en avance, donc refusé. Réserve honnête : ce rejet est le plus facile à contourner par bonne volonté — « tant qu'on y est, on branche un compteur » — et c'est pour cela qu'il est écrit.",
      "impact_architecture": "Ce qui est construit est UNE prise (les événements-données du tick) et UN observateur de TEST qui prouve qu'elle fonctionne. Ce qui n'est pas construit : collecteur de télémétrie, stockage de sessions, boucle de calibration automatique, courbe de progression paramétrée. Conséquence pour l'étape wiremap : tout bloc dont OBSERVABLE_BY_PLAYER serait vide ET qui ne servirait aucun critère de démo doit être supprimé du plan avant production, pas implémenté puis débranché."
    },
    {
      "sujet": "Séparation stricte logique pure / rendu / entrée, transposée aux API du moteur",
      "decision": "necessaire",
      "pourquoi": "Critère charter LOGIQUE SEPAREE DU RENDU, reformulé en v2 sur les API de moteur au lieu des API DOM. Falsifiable et déjà outillé : scripts/forge/static_oracles.py lit RÉELLEMENT les preload/load et les extends GDScript (SOURCE_EXTS contient .gd, _GD_LOAD, _GD_EXTENDS — vérifié), donc « la logique pure n'importe aucune scène ni script de présentation » est vérifiable dès le premier fichier. Un script de logique pure qui hérite d'un Node ou appelle get_node, Input, InputEvent, Viewport, CanvasItem, _draw, _process, _physics_process, Timer, OS, Time, ou randi/randf non seedé est un ÉCHEC, pas un avertissement. C'est aussi la seule zone que la mutation sait juger (manuel §3.1, mesure Pong : 95 % de mutants tués sur les systèmes purs, 0 % sur les adaptateurs).",
      "impact_architecture": "Découpage imposé avant la première ligne : logique pure en RefCounted, adaptateurs en Node/Node2D qui LISENT l'état. Le blueprint doit déclarer les dépendances interdites AVANT le code — c'est ce qui rend la règle exécutable et non déclarative. Piège propre à Godot, absent de la version navigateur de ce raisonnement : un signal de scène dans la logique pure est une API de moteur ; le canal d'événements doit donc être une valeur de retour du tick."
    },
    {
      "sujet": "Gate de mutation cadré sur la logique pure, survivants triés nominativement",
      "decision": "necessaire",
      "pourquoi": "En v1 c'était le traitement d'un GAP de recombinaison ; en v2 le merge sort FULL_COVERAGE 22/22 et le critère TESTS A MUTATION FORTS est couvert par deux lentilles — la décision reste nécessaire mais change de statut : ce n'est plus un comblement de trou, c'est une contrainte d'architecture confirmée par le panel. Base : manuel §3.1, mesure réelle du studio sur Pong (95 % contre 0 %) — un gate uniforme produirait un chiffre dominé par du code que la mutation ne sait pas juger, c'est-à-dire un faux signal. Fait v2 qui rend le gate applicable et qu'il faut citer : scripts/forge/mutation.py sait muter du GDScript (_WORD_RULES sur and/or/true/false, _EQ_RULES, comment_prefixes_for ajoutant # pour .gd — correctif motivé par le constat que sans lui « muter un .gd ne produisait presque aucun mutant : gate mutation édenté »). Gabarit de triage vérifié : games/grid_nav_probe/mutation_triage.json, où l'argument « les tests passent quand même » est explicitement rejeté comme circulaire.",
      "impact_architecture": "Contrainte de PLACEMENT du code. Les invariants que la mutation doit tuer se sont élargis en v2 : collision, incrément de longueur et de score au même tick, refus du demi-tour, statut terminal, plus DEUX ajouts — seuil et plancher d'accélération, et mise à jour du meilleur score (gameplayprog R49). Tous doivent vivre dans les modules purs pour être mutables ; tout invariant qui migrerait dans un adaptateur sortirait mécaniquement du périmètre du gate, sans que rien ne le signale."
    },
    {
      "sujet": "Refus du demi-tour comparé à la dernière direction EFFECTUÉE, pas à une direction en attente",
      "decision": "necessaire",
      "pourquoi": "Critère charter DEMI-TOUR REFUSE, inchangé v1 -> v2 et confirmé par le panel. Cas limite falsifiant nommé par gameplayprog R13 : serpent vers la droite, appui « haut » puis appui « gauche » dans le même intervalle de tick. Attendu strict : direction appliquée = gauche, statut = en cours. Une implémentation qui applique la direction dès l'appui produit ici une mort instantanée — elle viole DEMI-TOUR REFUSE ET produit exactement la mort injuste que le charter interdit. Complément v2 : une commande de demi-tour est IGNORÉE, pas mise en file, et n'est jamais rejouée plus tard (gameplayprog R14).",
      "impact_architecture": "Le garde de demi-tour vit dans la logique pure, jamais dans l'adaptateur d'entrée, et l'état porte DEUX champs distincts : direction du dernier déplacement effectué, et direction demandée en attente. Confondre les deux EST le défaut. Conséquence en cascade sur la pause : la reprise doit restaurer les deux champs à l'identique, et aucune direction demandée pendant la pause ne doit être appliquée à la reprise (gameplayprog R25)."
    },
    {
      "sujet": "Profondeur de file d'entrée = 1, dernier appui légal de l'intervalle retenu",
      "decision": "necessaire",
      "pourquoi": "La Genre Bible §6.3 — désormais RATIFIÉE (D4) — observe deux modèles concurrents (direct Nokia / bufferisé Google) et qualifie explicitement le bénéfice de la bufferisation profonde de NON CHIFFRÉ (hyp.snake.input_buffering_unquantified_benefit : aucune milliseconde, aucun taux de réussite trouvé). Adopter une profondeur > 1 serait construire sur une affirmation qualitative. Précision v2 : D4 pose que la Genre Bible est une source de compréhension et non une limitation — elle n'est donc PAS invoquée ici pour interdire quoi que ce soit, seulement pour constater qu'aucun chiffre ne justifie le coût. Falsifiable : N appuis (N ≥ 2) dans un intervalle produisent EXACTEMENT 1 changement de direction au tick suivant, celui du dernier appui légal.",
      "impact_architecture": "Un seul champ « direction demandée » écrasable dans l'état, pas une structure de file : supprime un module et rend l'assertion de rafale exprimable en égalité stricte. Une profondeur > 1 reste une décision de design ouverte à Pierre, pas un défaut d'implémentation — et son coût est borné, puisqu'elle ne toucherait que ce champ."
    },
    {
      "sujet": "Aucun rattrapage de temps, ni après une privation d'exécution ni après une pause",
      "decision": "necessaire",
      "pourquoi": "Renforcé en v2 par l'ajout de la pause : la règle avait un seul cas en v1 (fenêtre en arrière-plan), elle en a deux maintenant, et le second est déclenché volontairement par le joueur — donc bien plus fréquent. gameplayprog R8 et R26 : après une privation d'exécution de durée D ou une pause de durée quelconque (cas de test 0,1 s, 5 s, 60 s), le nombre de ticks appliqués à la première trame de reprise est EXACTEMENT 1, jamais la durée divisée par la période. Falsifiable directement : suspendre 5 s et compter. Sans cette règle, le joueur meurt pendant qu'il ne regarde pas — et avec la pause, il meurt en revenant de la pause, ce qui détruirait la « respiration sans prix à payer » décrite par le contrôle.",
      "impact_architecture": "L'accumulateur de temps de la boucle de présentation est BORNÉ à un tick par trame ; le rattrapage par boucle while sur le temps écoulé est interdit. Contrainte portée par l'adaptateur, pas par la logique pure, qui ne lit aucune horloge. Interaction à ne pas manquer avec l'accélération : l'intervalle jusqu'au premier tick d'après reprise est une période de tick COURANTE, jamais la période initiale ni la durée de la pause."
    },
    {
      "sujet": "Spawn de nourriture seedé par tirage sur la liste des cases libres, pas par rejet",
      "decision": "necessaire",
      "pourquoi": "Critères charter DETERMINISME PROUVE PAR REPLAY et CROISSANCE ET SCORE AU MEME TICK. Brique NEW justifiée par absence constatée nominativement : aucun générateur pseudo-aléatoire au catalogue, et Pong n'en a aucun — son déterminisme vient d'une fonction de parité serveVx qui ne produit pas de position (vérifié). Côté Godot, randi()/randf() non seedés sont explicitement interdits par le charter. Falsifiable : sur un état à exactement 1 case libre, le tirage retourne cette case en un nombre borné d'opérations ; sur un état à 0 case libre, il renvoie l'état terminal de grille pleine sans boucler. Un tirage par rejet non borné se manifeste par un blocage, pas par un résultat — c'est un mode de panne, pas un cas limite.",
      "impact_architecture": "Rend l'invariant « la nourriture n'apparaît jamais dans le corps » STRUCTUREL au lieu de testé après coup, et donne une terminaison prouvable en grille presque pleine — condition de la solvabilité jusqu'à la cible de victoire. Coût : maintenir la liste des cases libres, ou la dériver du corps à chaque spawn. Le générateur seedé est confiné à ce seul appelant : toute autre consommation d'aléa dans la logique casserait le replay."
    },
    {
      "sujet": "Collision discrète sur entiers, brique NEW sans tolérance ni seuil",
      "decision": "necessaire",
      "pourquoi": "Critère charter COLLISION EXACTE : zéro faux positif et zéro faux négatif sur coin de grille, case du cou, case de queue libérée au même tick, avec valeur stricte vivant/mort. Exigence AJOUTÉE en v2 et non triviale : cette exactitude doit être indépendante de la cadence — la même fixture rejouée à la période initiale et au plancher produit un état final STRICTEMENT ÉGAL (gameplayprog R19). Sans elle, l'accélération deviendrait une source de mort injuste, ce qui ruinerait le « c'est ma faute » décrit par le contrôle. IKEA : aucune brique de collision-grille au catalogue, et la collision de Pong est inapplicable (voir décision collision_balayee_pong).",
      "impact_architecture": "Comparaison d'entiers uniquement, jamais de flottants ; la case est l'unité atomique, et en Godot le type de position est Vector2i, pas Vector2. Candidate au legs n°1 (sert Tetris, Sokoban, tout roguelike à grille) : doit donc être écrite sans dimension de grille en dur ni vocabulaire de direction spécifique à Snake."
    },
    {
      "sujet": "État terminal GAGNÉ distinct de PERDU, et cible de victoire affichée au joueur",
      "decision": "necessaire",
      "pourquoi": "Critère charter SOLVABILITE PROUVEE : un bot doit ATTEINDRE un objectif de victoire déclaré. Si l'issue gagnante affiche « perdu », l'oracle prouve une victoire que le produit nie (falsification directe, gameplayprog R29). Et une cible non affichée est un objectif que le joueur ne peut pas viser : le contrôle v2 l'affiche en permanence au bandeau sous la forme longueur courante / cible. Renforcé en v2 par le critère CONDITION DE FIN ET PROGRESSION MESURABLE, qui exige en plus que le nombre de chemins de sortie de la boucle sans statut terminal soit EXACTEMENT 0. La VALEUR de la cible reste un fog HumanGate, pas une décision d'agent.",
      "impact_architecture": "Deux des quatre statuts de la machine à états sont terminaux, et l'écran de fin est PARAMÉTRÉ par le statut plutôt que dupliqué. Le tick n'avance plus dans un état terminal (compteur de ticks strictement égal à sa valeur au moment du passage, gameplayprog R28), et l'entrée de pilotage n'a plus aucun effet après la fin — seules la relance et la sortie répondent. La cible est une constante nommée du bloc de paramètres, lue par la logique ET par le rendu, jamais recopiée dans le rendu."
    },
    {
      "sujet": "Bot de solvabilité pilotant le canal d'entrée public, accélération active",
      "decision": "necessaire",
      "pourquoi": "charter.actions_interdites interdit explicitement de forcer l'état à la main pour faire passer un test de victoire (pré-mortem PILOU ①, leçon collect_runner : jeu injouable certifié par des tests verts). Durcissement v2 explicite : la solvabilité se prouve ACCÉLÉRATION ACTIVE, pas à vitesse initiale gelée — prouver qu'un bot gagne à 200 ms constants ne prouverait rien du jeu réel. Falsifiable, gameplayprog R45 : si le canal d'entrée est neutralisé, le bot ne progresse plus du tout ; sur une version volontairement cassée, l'oracle sort INJOUABLE avec un code de retour non nul. L'outillage existe et est vérifié : scripts/forge/solvability_godot.mjs (trials <= 0 -> BLOCKED, jamais OK), godot_trial.mjs (reçu FORGE_TRIAL), godot_oracle.mjs (mécanique puis solvabilité, vert seulement si les deux le sont).",
      "impact_architecture": "L'API d'entrée publique devient une interface de premier ordre, utilisée à l'identique par le clavier et par le bot — donc aucun chemin d'écriture privilégié dans l'état. Contrainte de convention imposée par l'oracle maître et non par le goût : les chemins tests/run_tests.gd et solvability.gd à la racine du projet Godot sont attendus tels quels. La politique de déplacement du bot s'appuie sur grid_nav.gd (décision import_grid_nav_gdscript). Interdit et rappelé : confondre le bot (latence nulle, outil de test) avec l'expérience du joueur."
    },
    {
      "sujet": "Point d'observation de debug exposé par le runtime réel du moteur",
      "decision": "necessaire",
      "pourquoi": "Critères charter CONTRAT DE JOUABILITE RESPECTE et PREUVE PAR LECTEUR REEL : sans point d'observation, aucun lecteur réel ne peut prouver un critère de démo autrement qu'en croyant une capture. Reformulé en v2 : ce n'est plus window.__game (navigateur) mais un reçu lisible depuis l'instance Godot lancée, exposant longueur, score, meilleur score, position de tête, position de nourriture, période de tick courante et statut parmi quatre. Brique NEW justifiée par extension et non par création : le contrat de reçu ligne-à-ligne existe déjà dans la Forge (knowledge_base/systems/adapters/godot_trial.mjs, FORGE_TRIAL <json>, vérifié) — suffisant pour un essai de bot, insuffisant pour lire l'état d'une partie humaine en cours.",
      "impact_architecture": "Ajoute une surface de debug exposée dans le build — coût assumé explicitement (règle d'usine n°1 : une preuve sans lecteur n'existe pas). Le hook expose l'état DÉJÀ tenu par la logique pure, sans structure parallèle : dupliquer l'état pour l'observabilité rendrait le hook falsifiable indépendamment du jeu. Point de collision à arbitrer avant la wiremap et signalé comme tel : scripts/forge/adapters/godot/ et fixtures/godot_b0/ (session parallèle, sort non arbitré) visent le même territoire ; si cette session est ratifiée, ce contrat devra être confronté au sien plutôt que dupliqué."
    },
    {
      "sujet": "Wiremap portant REUSED_FROM typé et OBSERVABLE_BY_PLAYER dès sa rédaction, avant tout code de production",
      "decision": "necessaire",
      "pourquoi": "Critères charter REUTILISATION NOMMEE AVANT PRODUCTION et OBSERVABLE PAR LE JOUEUR DES LA WIREMAP ; manuel §3.4 (observable_by_player est une contrainte de conception, pas une finition). Constat mesuré par la lentille archidepot : la wiremap de Pong porte 0 champ reused_from sur 15 lignes et observable_by_player sur 6 lignes sur 15 — Snake est le premier jeu du dépôt à instrumenter la mesure que le manuel décrit. Nouveauté v2 décisive : le typage à trois valeurs CODE:<chemin> / CONCEPT:<chemin> / NEW est ce qui rend la réutilisation mesurable ALORS QUE le moteur cible diffère de celui de la brique source (D1) — un CONCEPT ne laisse par définition aucune trace d'import.",
      "impact_architecture": "Le dépôt aura DEUX générations de wiremap (Pong gelé sans ces champs, Snake avec) : écart assumé, pas masqué. Ces deux champs deviennent la source de vérité de la mesure de réutilisation du run. Conséquence à ne pas se cacher et remontée en fog : ce champ n'a AUCUN lecteur mécanique aujourd'hui, alors que le charter exige que le taux soit mesuré et rapporté — la wiremap la mieux remplie du dépôt resterait un artefact que personne n'exécute."
    },
    {
      "sujet": "Réutilisation de la collision balayée de Pong (stepBall)",
      "decision": "rejete",
      "pourquoi": "REJET MAINTENU, et maintenu sur sa base propre — il n'a jamais dépendu de la plateforme. IKEA question 2 (peut-on l'étendre) répondue non par archidepot R18 et confirmée ici : adapter stepBall à une grille discrète reviendrait à en supprimer l'interpolation, c'est-à-dire tout son contenu. Falsifiable : le monde de Pong est continu (positions en flottants, interpolation de franchissement de plan, vérifié dans loop.mjs), celui de Snake est entier — il n'y a AUCUN franchissement à interpoler entre deux cases adjacentes. Le charter v2 maintient d'ailleurs ce rejet nommément dans revisions.revisions_du_prisme. Le changement de cible ne le lève pas : il le rend seulement plus visible, puisque même le code n'est plus importable.",
      "impact_architecture": "Nomme explicitement LA seule zone où « réutiliser Pong » serait une erreur d'architecte, ce qui protège la mesure de réutilisation d'un import de complaisance — risque réel puisque le run a un objectif industriel chiffré. Conséquence : la collision est NEW, sur entiers, et devient candidate au legs n°1 ; le rejet crée la brique que la bibliothèque n'a pas."
    },
    {
      "sujet": "Capture produite sans fenêtre GPU réelle comme preuve d'un critère de démo",
      "decision": "rejete",
      "pourquoi": "REJET MAINTENU ET RENFORCÉ par le changement de cible. La v1 rejetait la rasterisation logicielle du navigateur, dont le fichier source nommait lui-même la limite. Sur cible Godot le rejet repose sur un fait MESURÉ du poste (2026-07-22) : --headless rend une texture NULLE et ne produit aucun PNG — la preuve visuelle exige --rendering-driver vulkan et une fenêtre positionnée hors écran. Base : critère charter PREUVE PAR LECTEUR REEL, interdiction explicite dans actions_interdites, règle d'usine n°1. Falsifiable : une preuve visuelle produite sans fenêtre GPU reste verte alors qu'aucune image n'existe. Nuance à ne pas perdre, et qui n'est pas un adoucissement : godot --headless reste LÉGITIME pour la preuve mécanique (harnais de tests GDScript, archidepot R2) et INTERDIT pour la preuve d'image.",
      "impact_architecture": "Sépare deux chemins de preuve qui ne doivent jamais se substituer l'un à l'autre : le harnais headless pour la mécanique (rapide, scriptable, exécuté à chaque itération) et le lancement fenêtré GPU pour l'image (≈1,2 s, lié à ce poste, exécuté aux points de preuve visuelle). Conséquence de dépendance à assumer : l'oracle visuel de ce run est lié à un poste équipé — c'est une contrainte d'usine, pas une propriété du jeu, et elle doit être écrite dans le standard plutôt que redécouverte."
    },
    {
      "sujet": "Mesure du taux de réutilisation par les imports (reuse_ratio.mjs en l'état) comme source de vérité du run",
      "decision": "rejete",
      "pourquoi": "REJET MAINTENU ET AGGRAVÉ. La v1 citait un défaut de CLASSEMENT (imports relatifs classés local, mesuré reuse_ratio = 0.000 sur Pong). La lentille archidepot mesure pire en v2, sur le seul jeu Godot forgé du dépôt : node scripts/forge/reuse_ratio.mjs games/grid_nav_probe -> reuse_ratio = 0 / (4 + 0) = 0.000, imports: [] — alors que ce jeu contient TROIS preload réels de la brique de bibliothèque (trial.gd:7, solvability.gd:43, tests/run_tests.gd:6, vérifiés). Cause nommée : extractImportSpecifiers n'extrait que les specifiers ES (from \"…\"), et GDScript importe par preload(\"res://…\"). Ce n'est plus un mauvais classement mais une ABSENCE TOTALE D'EXTRACTION : sur cible Godot, l'instrument mesure 0 par construction, quelle que soit la réutilisation réelle. L'extension cross_game du 2026-07-28 corrige le classement inter-jeux, pas la lecture du GDScript. Règle d'usine n°4 : l'instrument mesure aujourd'hui « imports ES depuis la bibliothèque », pas « réutilisation ». Cette décision ne cite AUCUN chiffre attendu et ne dépend d'aucun correctif : elle porte sur la source de vérité.",
      "impact_architecture": "La mesure du run se lit sur le champ REUSED_FROM typé de la wiremap, qui devient donc OBLIGATOIRE et non décoratif : chaque bloc pointe une brique réelle vérifiée (CODE ou CONCEPT) ou vaut NEW. Les trois types sont rapportés SÉPARÉMENT en valeurs brutes numérateur/dénominateur — agréger CODE et CONCEPT en un chiffre unique de « réutilisation » serait une promesse plus forte que la mesure. Fog remonté et non tranché ici : soit apprendre à l'instrument à lire les preload GDScript (le lecteur existe déjà dans scripts/forge/static_oracles.py et pourrait servir de référence), soit compter depuis la wiremap — seule voie capable de compter un CONCEPT."
    },
    {
      "sujet": "Métrique publiée sous le nom « difficulté », « pression spatiale » ou « courbe d'accélération ressentie »",
      "decision": "rejete",
      "pourquoi": "REJET MAINTENU, et le risque MONTE en v2 puisque le jeu a désormais une courbe de difficulté à calibrer. Base : critère charter VARIANCE PROUVEE AVANT USAGE et règle ratifiée Pierre 2026-07-21 (leçon grid-navigator : une métrique nommée « bande de difficulté » mesurait en réalité le plus court chemin, constant). Cas d'école INTERNE à ce jeu, nommé par gameplayprog R50 : le numéro de palier est une fonction déterministe du nombre de nourritures mangées — le publier sous le nom « difficulté » serait littéralement la panne grid-navigator, une grandeur qui reproduit une autre grandeur sous un nom plus ambitieux. Falsifiable : tant que la distribution n'est pas mesurée sur échantillon avec au moins 2 valeurs distinctes non triviales, le nom promet une information dont l'existence n'est pas établie. Restent publiables SOUS LEUR NOM LITTÉRAL : le taux d'occupation de la grille, la période de tick, le numéro de palier.",
      "impact_architecture": "Aucun module de difficulté, aucune grandeur dérivée alimentant la génération ou la calibration : la difficulté du jeu reste une conséquence structurelle de deux choses visibles à l'écran — l'occupation de la grille et la cadence affichée — jamais un paramètre calculé. Si une mesure est prise, elle l'est sur les parties déjà jouées par le bot de solvabilité, sans échantillonnage dédié, et reste advisory. Interdit corollaire et non évident : brancher l'accélération sur une métrique de difficulté non prouvée serait exactement le coût élevé nommé par archidepot R27."
    }
  ],
  "gaps_traites": [
    {
      "gap": "Fog HumanGate — cible de victoire (longueur 25, soit 22 nourritures) NON RATIFIÉE : valeur de travail issue du contrôle s1, portée par charter.parametres_de_design au statut A_EQUILIBRER et déjà remontée en charter.question_ouverte_humangate",
      "traitement": "Listé, NON re-tranché (arbitrage Pierre, hors périmètre de ce contrat). Ce qui EST décidé et ne dépend pas de la valeur : état terminal gagné distinct de perdu, et cible AFFICHÉE au joueur pendant toute la partie (décision etat_victoire_distinct_et_cible_affichee). Ce que Pierre doit savoir pour trancher, en faits et non en recommandation : toute la chaîne de solvabilité en dépend (l'oracle joue 50 essais contre cette valeur), et cette valeur détermine directement combien de paliers d'accélération une partie gagnante traverse — c'est le couplage décrit dans le fog de courbe ci-dessous. Proposition soumise : retenir 25 comme valeur de travail pour débloquer l'étape architecture, en sachant que la changer ne coûte qu'une constante du bloc de paramètres."
    },
    {
      "gap": "Fog HumanGate — trio d'accélération (palier tous les 5 fruits, pas ×0,92, plancher 80 ms) au statut A_EQUILIBRER : valeurs PROPOSÉES par le rédacteur du contrat, non chiffrées par Pierre, aucune source externe ne chiffrant la magnitude (la source Nokia est en HTTP 403)",
      "traitement": "Listé, NON re-tranché. Traitement proposé : les retenir telles quelles pour le premier build, précisément parce que l'architecture est conçue pour qu'elles bougent sans coût — le critère PARAMETRES DE JEU ISOLES ET NOMMES exige que les modifier ne touche aucun autre fichier, et cette propriété est elle-même vérifiée mécaniquement (nombre d'autres fichiers modifiés = exactement 0). Conséquence à connaître avant de les figer : elles ne sont pas indépendantes de la cible de victoire — voir le fog de courbe. Les règles des trois lentilles sont écrites pour rester vraies si Pierre change ces valeurs ; seules les constantes de test bougeraient."
    },
    {
      "gap": "Fog de courbe (ENTRÉE NEUVE, dérivée mécaniquement des valeurs déclarées) — une partie GAGNANTE franchit exactement 4 paliers et se termine à une période de ≈143,278 ms ; le plancher de 80 ms n'est atteint qu'au 11e palier, soit 55 nourritures, deux fois et demie la cible de victoire. La bande déclarée [80, 200] n'est donc pas la bande jouée [≈143, 200]",
      "traitement": "Traité en §4 et par le rejet bande_declaree_comme_bande_jouee, SANS re-trancher aucun chiffre. Trois éléments : (1) séparer deux grandeurs nommées différemment — la bande de la règle pure, testée par valeurs strictes y compris la saturation au plancher, et la bande atteinte en partie, mesurée en valeur brute sur les parties réellement jouées par le bot ; (2) interdire de présenter la saturation au plancher comme un fait observable tant qu'aucune partie mesurée ne l'atteint — le test du plancher prouve une BORNE DE SÛRETÉ, pas une expérience ; (3) remonter à Pierre les trois leviers sans en choisir un — palier plus court, pas plus fort, ou cible plus haute s'il veut que le plancher soit ressenti ; requalification du plancher en borne de sûreté s'il préfère une partie gagnante courte. Les deux voies sont cohérentes. La lentille gameplayprog nommait déjà le fait (R5, note d'honnêteté) ; ce qui est ajouté ici est la conséquence de vocabulaire."
    },
    {
      "gap": "Fait d'instrument — reuse_ratio.mjs est aveugle aux imports GDScript : extractImportSpecifiers n'extrait que les specifiers ES, jamais preload/load. Mesuré sur le seul jeu Godot forgé du dépôt : reuse_ratio = 0.000, imports: [] sur games/grid_nav_probe, qui contient pourtant trois preload réels de la brique de bibliothèque. Un correctif cross_game daté du 2026-07-28 corrige le classement inter-jeux, pas la lecture du GDScript",
      "traitement": "Traité par le rejet reuse_ratio_par_imports : la source de vérité de la mesure du run devient le champ REUSED_FROM typé de la wiremap. AUCUN chiffre attendu n'est cité par cette review, et aucune de ses décisions ne dépend du correctif — le fait d'instrument est cité, la valeur ne l'est pas. Deux voies remontées à Pierre, aucune choisie par un agent : (a) apprendre à extractImportSpecifiers à lire preload/load, le lecteur existant déjà ailleurs dans le dépôt (_GD_LOAD dans scripts/forge/static_oracles.py, vérifié) ; (b) compter depuis la wiremap. Note qui distingue les deux : la voie (a) ne saura toujours pas compter un CONCEPT."
    },
    {
      "gap": "Défaut d'usine — le typage CODE/CONCEPT/NEW imposé par D1 n'a AUCUN lecteur mécanique. Un CONCEPT ne laisse par définition aucune trace d'import ; son seul porteur possible est le champ REUSED_FROM de la wiremap, qu'aucun oracle ne lit aujourd'hui, alors que le charter v2 exige TAUX DE REUTILISATION MESURE ET RAPPORTE",
      "traitement": "Listé nommément plutôt que découvert au moment du verdict. C'est le mode de panne « déclaré ≠ exécuté » appliqué à l'objectif industriel du run lui-même : la wiremap la mieux remplie du dépôt resterait un artefact que personne n'exécute. Traitement proposé, borné et sans création de couche : un lecteur qui compte les valeurs du champ REUSED_FROM par type et les rapporte en valeurs brutes séparées (numérateur/dénominateur pour CODE, CONCEPT et NEW), sans agrégation ni note. Ce lecteur est un outil d'usine, hors du périmètre de ce jeu — il est remonté pour arbitrage, pas décidé ici. Tant qu'il n'existe pas, le taux du run doit être rapporté comme COMPTÉ À LA MAIN sur la wiremap, jamais présenté comme mesuré mécaniquement."
    },
    {
      "gap": "Session parallèle non arbitrée — scripts/forge/adapters/godot/ (8 modules + harness/harness.gd) et fixtures/godot_b0/ existent et visent le même territoire que le point d'observation de debug décidé ici (lancement Godot, collecte de preuve, harnais)",
      "traitement": "Listé, non tranché : le sort de cette session est un arbitrage Pierre. Aucune décision de cette review ne s'appuie sur ces fichiers, et c'est délibéré — s'appuyer sur un artefact au sort non arbitré créerait une dépendance qu'un rejet ferait tomber. Traitement proposé : si la session est ratifiée avant l'étape wiremap, le contrat de point d'observation décidé ici doit être CONFRONTÉ à son contrat de harnais plutôt que dupliqué — deux protocoles d'observation concurrents dans le même dépôt seraient exactement la couche redondante que la doctrine du résolveur interdit."
    },
    {
      "gap": "Fog HumanGate inchangé — retour sonore absent (feel.feedback_sonore répondu non ; le charter v2 n'en demande ni n'en interdit, et les six critères de démo ajoutés par D6 n'en parlent pas)",
      "traitement": "Listé, non re-tranché. Traitement proposé : rester sans son pour cette tranche, faute de toute source chiffrant un bénéfice et pour garder zéro asset et zéro dépendance runtime. Le chemin d'ajout est préparé et son coût est borné : un adaptateur de présentation branché sur les événements-données du tick (nourriture mangée, palier franchi, fin de partie), sans toucher la logique pure — le canal existe déjà par le dispositif d'extensibilité. C'est précisément parce que le coût d'ajout ultérieur est borné qu'il est raisonnable de ne pas le faire maintenant."
    },
    {
      "gap": "Fog HumanGate inchangé — taille de cellule en pixels (Genre Bible §6.2, statut A_MESURER, aucune source vérifiée HTTP 200)",
      "traitement": "Listé, non re-tranché. Traitement proposé : la MESURER sur le build réel plutôt que la sourcer, la Genre Bible ne fournissant sur ce point aucune valeur vérifiée. Contrainte de design que cette review pose indépendamment de la valeur retenue, et qui est vérifiable mécaniquement : les quatre catégories visuelles (mur, tête, corps, nourriture) doivent rester distinctes à la taille choisie — le nombre de catégories partageant la même valeur de remplissage est exactement 0 (gameplayprog R42), et la tête n'est jamais rendue à l'identique d'un segment de corps."
    },
    {
      "gap": "Fog HumanGate inchangé — profondeur de file d'entrée : le modèle bufferisé de Google reste une alternative de design si Pierre le préfère au modèle direct retenu",
      "traitement": "Listé, non re-tranché. La décision profondeur_file_entree fixe 1 et nomme l'alternative plutôt que de la masquer. Base du choix : la Genre Bible §6.3, désormais ratifiée, qualifie explicitement le bénéfice de la bufferisation profonde de NON CHIFFRÉ — aucune milliseconde, aucun taux de réussite. Coût d'un changement d'avis, borné et chiffré pour la décision : un seul champ de l'état passerait d'une valeur écrasable à une structure de file ; aucune autre règle ne bougerait."
    },
    {
      "gap": "Écart de dépôt assumé — deux générations de wiremap coexisteront (Pong gelé sans REUSED_FROM ni OBSERVABLE_BY_PLAYER complet, Snake avec les deux champs typés)",
      "traitement": "Assumé et écrit, pas masqué. Mesuré par la lentille archidepot : la wiremap de Pong porte 0 champ reused_from sur 15 lignes et observable_by_player sur 6 lignes sur 15. Pong étant gelé comme témoin de régression (décision Pierre 2026-07-27), il ne sera PAS mis à niveau — le combler serait modifier un témoin, ce qui détruirait sa valeur de référence. Conséquence acceptée : toute comparaison de réutilisation entre Pong et Snake se fait sur des instruments différents et doit être rapportée comme telle, jamais présentée comme une progression mesurée."
    },
    {
      "gap": "Traitement CADUC de la v1 — les 2 GAP de recombinaison (TESTS A MUTATION FORTS et CHARTER COMPLET) n'existent plus : le merge v2 sort RESULT: FULL_COVERAGE, 22 critères en périmètre, 22 couverts, 0 non couvert",
      "traitement": "Constaté et retiré du corps de la review. Les deux décisions correspondantes ne disparaissent pas pour autant, elles CHANGENT DE STATUT : le gate de mutation cadré sur la logique pure reste nécessaire, non plus comme comblement d'un trou de couverture mais comme contrainte d'architecture confirmée par deux lentilles (et rendu applicable par le fait vérifié que scripts/forge/mutation.py sait muter du GDScript). CHARTER COMPLET reste satisfait en amont par forge.static_oracles.check_charter et ne produit aucune décision de design — le re-juger empilerait une couche redondante. Ce que la v1 en avait tiré de durable reste vrai : un charter complet au sens de l'oracle n'est pas un charter tranché au sens du design, et les paramètres A_EQUILIBRER en sont la preuve."
    },
    {
      "gap": "Statut amont CHANGÉ — la Genre Bible Snake v1 est RATIFIÉE par Pierre (D4), alors que la v1 de cette review portait un avertissement de dépendance « PROPOSED, non ratifiée » sur toutes les décisions qui s'y appuyaient",
      "traitement": "L'avertissement de la v1 est RETIRÉ : la base est ratifiée, la dette de traçabilité qu'il nommait est éteinte. Mais D4 ajoute une clause qui va dans l'autre sens et qu'il faut appliquer : « source de compréhension, pas une limitation artificielle — les décisions techniques passent toujours par l'architecture et le Prisme ». Conséquence appliquée dans cette révision : une règle de genre est citée pour COMPRENDRE (profondeur de file d'entrée, mouvement continu, lisibilité de grille) et ne peut plus servir SEULE à rejeter une brique voulue par Pierre — c'est exactement ce qui rend le rejet v1 de la pause caduc, indépendamment de D5. Quatre des quatorze règles de la Genre Bible portent encore une confiance dégradée (sources HTTP 403) : elles restent citables comme observation, jamais comme chiffre."
    }
  ]
}
```

---

## 8. Portée de ce document

`software_verdict` de cette review : voir la sortie de `check_gameplay_review.mjs` jointe au
rapport d'étape — elle ne prouve que la **complétude structurelle** (chaque item de la checklist a
une réponse, chaque décision a ses quatre champs, au moins un rejet est justifié, aucun marqueur
non résolu ne traîne). Elle ne juge aucune des décisions ci-dessus.

Aucune décision de ce document n'est ratifiée : ce sont des **propositions** soumises au HumanGate
de Pierre. Douze entrées de `gaps_traites` restent à trancher ou à confirmer avant que la wiremap
(étape s5) soit contrainte par ce document — dont une, le **fog de courbe**, est neuve et n'existait
dans aucun artefact du run avant cette révision.

`claim_verdict: NO_CLAIM_ALLOWED`.
