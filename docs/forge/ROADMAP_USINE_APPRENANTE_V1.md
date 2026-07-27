# FEUILLE DE ROUTE — d'une usine qui fabrique des jeux à une usine qui apprend à en faire de meilleurs

Date : 2026-07-27 · Auteur : session Troisième Cerveau · Statut : **PROPOSED — décisions Pierre**.
Consolide les 18 points de Pierre (2026-07-27) contre l'état mesuré du dépôt. Tous les faits
sont re-dérivés de sources primaires ce jour (P7). `claim_verdict: NO_CLAIM_ALLOWED`.
Documents amont : [comparatif schéma↔réel](COMPARATIF_SCHEMA_VS_REEL_2026-07-27.md) ·
[profil design](PROPOSAL_PROFIL_DESIGN_V1.md) · [boucle de preuve](PROPOSAL_BOUCLE_PREUVE_V1.md) ·
[rapport de décision d'allègement](../audit/RAPPORT_DECISION_ALLEGEMENT_2026-07-27.md).

---

## 0. Le diagnostic, et la seule chose que j'y ajoute

Ta synthèse est exacte : **l'infrastructure existe en grande partie, elle n'est pas assemblée en
boucle fermée.** Il manque des connexions, quelques rôles, des points de retour.

Ce que j'ajoute, parce que c'est mesuré et que ça doit gouverner le plan :

> **Le mode de panne dominant du studio n'est pas l'absence de machine. C'est l'écrivain sans
> appelant, et le lecteur sans données.** Six occurrences prouvées, dont deux découvertes en
> cherchant la couche bible :

| # | Écrivain | Appelants | Lecteur | Conséquence réelle |
|---|---|---|---|---|
| 1 | `learning_metrics` | 0 (avant 26-07) | — | courbe d'apprentissage vide |
| 2 | `propose_brick` | **0** → réparé hier (V4) | `pending_review` l'attendait | `game_loop` non déposable ⇒ Pong rouge |
| 3 | findings red-team | rapport écrit | **aucun** | F1 vitesse + F6 exit trouvés **avant** ton playtest, morts dans 14 Ko |
| 4 | `learning_curve.jsonl` | écrit chaque run vert | **aucun lecteur décisionnel** | l'usine mesure et ne change rien |
| 5 | `spawn_authorized` | jamais écrit (0/10) | hook | maillon d'audit inexistant |
| 6 | **`propose_bible_entry`** | **0 dans le driver** | `project_bible` (branché !) | `forge_bible_proposals.jsonl` **n'a jamais existé** |

**Règle qui doit gouverner tout ce qui suit** : aucune boucle n'entre dans le studio sans (a)
son appelant, (b) son lecteur nommé, (c) une mesure mécanique qui dit si elle a tiré. Sinon la
couche bible devient le 7ᵉ orphelin, et ta « mémoire longue durée » sera une bibliothèque que
personne n'ouvre.

---

## 1. La couche bible — état mesuré : elle existe à 60 %

Tu penses qu'elle manque. Voici ce qui est déjà là :

| Pièce | État réel vérifié | Écart |
|---|---|---|
| **Bibles de jeu réelles** | `games/auto_battler/bibles/` = **10 fichiers** (GAME, DECISION, COMBAT, ECONOMY, META, DSL, BALANCE, SIMULATION, CONTENT + source Pierre) — l'architecture 16 bibles ratifiée le 18-07 | vivantes pour un seul jeu |
| **Art Bible** | **la filière la plus mûre du studio** : contrat `s2.5-artbible.yaml` · vérificateur mécanique `check_artbible.mjs` (369 lignes) · skill `/art-bible` · **8 dispatches réels** · sondes adversariales + note red-team gate 4 | c'est **le patron à répliquer**, pas à inventer |
| **Bible Writer (l'écrivain)** | `studio_link.propose_bible_entry` (l.523) **EXISTE**, propose-only, avec sous-commande CLI `bible` | **0 appelant dans le driver** ⇒ fichier jamais créé |
| **Le lecteur** | `studio_link.project_bible` **EXISTE et EST BRANCHÉ** : injecté par `driver.py:448` à s0, rendu au prompt par `run_real.py:568` | injecté **uniquement à s0** — or s0 est absent du profil `standard` ⇒ pour le curriculum, la bible n'est jamais lue |
| **Citation-par-ID (bible→code)** | **118 citations d'ID** dans le code, 8/11 bibles citées (recensement 20-07) | l'ID **n'est jamais résolu** vers la bible : `check_wiremap` vérifie la présence du nom de fonction. L'audit P2 le dit lui-même : « *vivante* surévalue une vérification limitée à la présence du nom » |
| **Bible de GENRE (World Bible)** | **N'EXISTE PAS** | c'est le vrai trou : les bibles actuelles sont *par jeu*, jamais *par genre* |
| **World Scan → bible** | `s2-worldscan` produit des packets routés en `mandatory_read` (advisory) | aucune distillation en bible versionnée. Ton « le rapport meurt » est exact |

**Conclusion** : il ne faut pas construire une couche bible. Il faut **fermer trois connexions**
(l'appelant du Bible Writer · l'injection hors-s0 · la résolution réelle des ID) et **créer un
seul type nouveau** : la bible de genre.

---

## 2. Tes 18 points, consolidés en 6 lots

J'ai regroupé par dépendance mécanique, pas par thème. `E` = existe · `½` = existe à moitié ·
`N` = à créer.

### Lot A — Rendre la critique audible (tes points 8, 11) — **le préalable à tout**
`E½` Plier les findings red-team en `humangate_flags` structurés · `E½` donner un lecteur à
`learning_curve` (dossier architecte post-verdict). Sans ce lot, **toute critique produite par
les lots suivants meurt comme F1 et F6**. C'est le lot le moins cher et il conditionne la
valeur de tous les autres.
**≈1,5 j-session** · critère : sur un rejeu de pong_r2, F1 et F6 apparaissent dans le verdict ;
`learning_curve` passe de 0 à ≥1 lecteur.

### Lot B — L'oracle produit (tes points 9, 10)
`E½` Les captures browser/Godot fonctionnent (ré-exécutées en direct) mais aucun gate ne les
appelle · `N` la partie auto 10-30 s + assertions (démarre · rendu visible · déplacement ·
collision · score qui évolue · pas de crash · fin observable) · `E½` `proof_review` pré-run
(« pas *le joueur gagne* mais *une partie complète produit un écran victoire visible* »).
**≈3-5 j-session** · critère : un jeu qui ne boote pas devient ROUGE mécaniquement — ce que les
2 bugs de chargement d'hier prouvent aujourd'hui impossible.

### Lot C — Le profil `design` (tes points 1, 2, 3, 4, 5, 6)
`E` s2-worldscan (6 runs) · `E` s1-prisme + `merge_prisme.mjs` (recombinaison mécanique N
lentilles, zéro LLM-arbitre, GAP explicites) · `N` **Gameplay Review** (la seule création :
fun · lisibilité · boucle · difficulté · progression · blocage · stratégie dominante · durée ·
débutant/expert) · `E½` s4-archi **re-spécifié en architecte du dépôt** (son objectif actuel ne
mentionne ni bibliothèque, ni brique, ni API transverse) · `E` s6-redteam-plan (**14 dispatches,
8 runs**, son contrat dit « RE-ENTRÉE de la boucle ») · `N` `source_role` + attribution du diff.
**≈4-4,5 j-session**, détail dans [PROPOSAL_PROFIL_DESIGN_V1](PROPOSAL_PROFIL_DESIGN_V1.md).

### Lot D — La couche bible (tes points 13, 14, 15, 16, 17, 18)
`E½` brancher l'appelant de `propose_bible_entry` (patron V4, ~1 j) · `E½` injecter la bible
au-delà de s0 (une ligne de condition + le profil qui la porte) · `E½` **résoudre réellement les
ID de citation** (aujourd'hui présence de nom) · `N` **bible de GENRE** produite par distillation
du World Scan, versionnée avec diff et provenance (`source · date · genre · confiance · usage`) ·
`E` répliquer le patron Art Bible (contrat + vérificateur mécanique + sondes adversariales) pour
les 3 autres types (genre · gameplay · architecture studio) · `N` Prisme lisant les bibles
pertinentes en plus du charter.
**≈4-6 j-session** selon la profondeur des types de bibles.

### Lot E — La boucle bibliothèque→jeu suivant (ton point 18, le plus important selon toi)
`E` `reuse_ratio` mesure l'import réel · `E` `propose_brick` branché hier · `E½` `learning_curve`
par `subject{type,id}` · `N` le critère de valeur d'une bible.
**≈1-2 j-session** · **le critère falsifiable que je propose** : une bible ne gagne sa place que
si un jeu **ultérieur** la cite **et que la citation est résolue**. C'est l'équivalent de
`reuse_ratio` pour la connaissance : *citations résolues / citations revendiquées*. Sans lui,
« bible versionnée = actif » est une intention ; avec lui, c'est une mesure.

### Lot F — Conserver (ton point 12)
La pyramide orchestrateur→driver→agents, les retries, le dispatch signé, les coûts contrôlés,
l'absence de sous-agent sauvage : **vérifiés au travail sur pong_r2, ne rien y toucher.**

---

## 3. La séquence que je recommande, et pourquoi

**A → B → C → D → E**, et surtout : **pas en parallèle**.

Le raisonnement, en trois points :

1. **A d'abord, sans discussion.** C'est le lot le moins cher et il transforme tous les autres :
   une usine où la critique meurt ne tire aucun bénéfice de nouveaux critiques. Le red-team
   avait déjà trouvé deux de tes quatre constats — le problème n'était pas la lucidité, c'était
   le canal.
2. **B avant C.** Contre-intuitif : tu as raison de dire que le plus gros gain de qualité est en
   amont (C). Mais **sans oracle produit, on ne peut pas mesurer si C a servi**. B est
   l'instrument qui rendra la valeur de C observable — et B est aussi ce qui débloque Pong,
   c'est-à-dire le rail, c'est-à-dire l'existence de jeux suivants dont D et E ont besoin pour
   avoir un sens.
3. **D après C.** Une bible de genre distillée d'un World Scan qui n'a pas encore été rebranché
   (C) serait écrite sur un seul jeu rouge. D a besoin de C pour avoir de la matière, et de E
   pour avoir un critère de valeur.

**Le test le moins cher, à faire avant tout engagement** : passer le profil `design` (une fois
le lot C fait) sur la wiremap Pong **actuelle**. S'il ressort l'adversaire manquant, la vitesse
injouable, la lisibilité du score et le quitter infidèle — tes quatre constats, dont la vérité
est déjà connue — la thèse entière est démontrée pour le prix d'un run de conception, **sans
aucun build**. Si le rapport ressort autre chose, la thèse est à revoir avant d'investir 15
jours-session.

## 4. Ce que je ne recommande pas

Coder la RÉCONCILIATION du Détail G (les 4 sources) — le lot C en capte le bénéfice par des
étapes qui ont déjà tourné · ressusciter `Front`/`Back` (taxonomie d'application web dans un
studio de jeux) · faire des agents critiques des **juges** (les oracles déterministes restent
seuls juges — ADR-002) · rallonger `standard` avec la conception (ferait repayer la réflexion à
chaque retry de build) · l'arbre MCTS du Détail E (prématuré, le schéma le sait) · toucher au
milieu de la chaîne, qui fonctionne · **écrire une seule bible avant que le lot A ne garantisse
qu'une critique puisse être entendue.**

## 5. Décisions attendues

D-α : go lot A · D-β : ordre A→B→C→D→E confirmé ou modifié · D-γ : go création de la Gameplay
Review (l'unique création du lot C) · D-δ : `s4-archi` re-spécifié en architecte du dépôt
(remplace le mandat blueprint actuel) · D-ε : le critère de valeur d'une bible (citations
résolues / revendiquées) — accepté comme mesure, ou autre critère à ta main · D-ζ : mise à jour
du schéma maître (Détail G et Nomenclature C surestiment les arêtes actives ; la couche bible
n'y figure pas encore).
