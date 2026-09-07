# Leçons Gamedev
#gamedesign #reference #doctrine

> Règles empiriques extraites de la recherche marché 2025-26 + doctrine TCS.
> Statut de chaque règle : `prior` (emprunté), `observed` (vu sur nos jeux), `validated` (confirmé ≥ N titres).
> Source causale : `docs/studio_v2/09_DESIGN_COMPILER_COLDSTART.md`

> **Revue 2026-07-12** : aucune promotion cette semaine. Tous les CR-*/RD-* restent `prior`, `evidence_n: 0` — aucun jeu n'a encore été playtesté avec de vrais joueurs ni shippé avec télémétrie. Le [[../decisions/decision-log|pivot produit 2026-07-05/06]] (Rocky gelé → Belote/Tarot) n'invalide aucune règle ici : ces priors sont génériques marché Steam, réutilisables tels quels sur le nouveau Titre 1.
>
> **Revue 2026-07-19** : aucune promotion — toujours aucun playtest joueur réel, ni sur Belote (0 activité git depuis 2026-07-06) ni sur `games/auto_battler/` (le travail Forge de la période est du QA/oracle mécanique — build/tests/mutation/red-team — pas un playtest de fun). Un nouveau prior sourcé ajouté ci-dessous (CB-001, pacing combat) suite à une recherche TFT commandée par un HumanGate. Les CR-*/RD-* génériques marché restent valables quel que soit le Titre 1 réel du moment.
>
> **Revue 2026-08-23** : **première promotion depuis la création du fichier.** La semaine 08-17→08-23 (66 commits, 100 % Forge / Kitten Clicker) a produit le **premier playtest interne enregistré** du studio : Pierre a joué le build du run 9 et a rendu un **HumanGate FAIL argumenté en 4 causes** ([[../decisions/decision-log|KITTEN_HUMANGATE_BASELINE_V1]]). Ce n'est pas de la télémétrie joueur — c'est un playtest concepteur, **n = 1**. Conséquences ici : **CR-006 passe `observed` (`evidence_n: 1`)** et **CR-007 est ajoutée** (règle sortie du playtest, pas de la recherche marché). Tous les autres CR-*/RD-*/CB-001 restent `prior`, `evidence_n: 0` — aucune télémétrie, aucun jeu shippé. **Aucune règle n'est invalidée** : rien dans le playtest ne contredit un prior existant.
>
> **Revue 2026-09-06** : **aucune promotion, aucun nouveau prior, aucune invalidation.** La période 08-24→09-06 (55 commits, 100 % Forge) n'a produit **aucun playtest** : les jeux forgés sont des **sondes expérimentales** de l'expérience Libre vs Dirigé, jugées par des oracles mécaniques, jamais par un joueur. Le gate fun minute-12 (CR-001) **n'a donc pas été rejoué** ; CR-006 et CR-007 restent `observed`, `evidence_n: 1`, sur la seule observation Kitten du 08-23. Point d'honnêteté à conserver : le build qui a produit cette observation (`games/kitten_clicker/`) **n'est plus dans le dépôt** — les priors restent valides (ils reposent sur le jugement écrit de Pierre et son audit, pas sur le binaire), mais l'observation **n'est plus rejouable**. Aucune télémétrie joueur n'existe toujours nulle part.
>
> **Revue 2026-07-26** : aucune promotion — la semaine a produit du QA/oracle mécanique (backend Godot certifié, brique `M01` grid-navigator, consolidation git) et 0 playtest joueur réel. Tous les CR-*/RD-*/CB-001 restent `prior`, `evidence_n: 0`. Un enseignement de mesure hors gamedesign a émergé côté Forge (courbe d'apprentissage indexée sur la mauvaise unité `brick_id` vs `subject{type,id}`) — pertinent pour le compilateur de design (§ Règles du Compilateur), pas encore un prior de gamedesign en soi.

---

## Règles de Fun & Rétention

### CR-001 — Gate fun à la minute 12, pas à la minute 2
**Principe** : La rétention se mesure à la session typique d'un joueur engagé, pas au premier contact. Mais le **premier drop-off critique se situe à ~90 secondes** si la reward frequency est trop faible.

**Conséquence pratique** :
- Garantir orbe + level-up toutes les ~45 secondes en early game
- Le hook mécanique doit être *visible et satisfaisant* dans les 2 premières minutes
- La profondeur (synergies, theorycraft) se révèle à la minute 12+

**Statut** : `prior` (research 2025-26) — `evidence_n: 0` (aucun jeu interne encore)
**Métrique delta** : session_time −42 % si reward_frequency trop faible

---

### CR-002 — Page Steam le plus tôt possible
**Principe** : La page Steam ouverte tôt collecte des wishlists gratuits en permanence. Une page ouverte tard = wishlists insuffisants au lancement, même si le jeu est bon.

**Conséquence pratique** :
- Ouvrir la page Steam dès qu'il y a un concept capsule + GIFs du hook
- Chemin critique : prototype hook → page Steam → wishlists → démo → fest
- Cible de lancement confortable : 25k-50k WL. Plancher : 7k WL sur une fenêtre serrée.
- Conversion wishlist→vente 1ʳᵉ semaine ≈ 0,15× les wishlists

**Statut** : `prior` (GameDiscoverCo 2025-26) — `evidence_n: 0`

---

### CR-003 — Art IA brut visible → pénalité review garantie
**Principe** : Les jeux avec art IA visible (détecté ou déclaré) subissent −53 % de reviews en moyenne. L'output IA pur est de plus non protégeable par le droit d'auteur.

**Règle absolue** : art humain / CC0 / brouillon IA **retravaillé** — jamais d'IA brute shippée sur la surface visible joueur ou dans les assets store.

**Statut** : `prior` (étude ~10k jeux Steam 2025, USCO 2025, Thaler v. Perlmutter 2026) — `evidence_n: 0`

---

### CR-004 — Bannir « AAA » comme objectif de MVP
**Principe** : La framing « AAA » pousse au scope creep. Le MVP doit être la **tranche verticale la plus petite possible** qui prouve le hook. 1 biome shippé > 5 biomes jamais finis.

**Application** : Snake: Survivor RPG → MVP = 1 biome + 1 boss + 1 run 15 min. La vision 5 biomes est l'étoile nord, pas le premier livrable.

**Statut** : `prior` (doctrine TCS + audit 2026)

---

### CR-005 — MultiMesh / performance pour les bullet-heaven
**Principe** : Les survivor-like avec des milliers d'entités à l'écran ont un point chaud de performance connu. La mauvaise approche = optimiser prématurément. La bonne = profiler d'abord.

**Règle** : Godot 4 (GDScript) d'abord. Rust/GDExtension uniquement si le profilage révèle un goulot réel (spawn, collisions). MultiMesh pour les ennemis si le nombre dépasse ~500 simultanés.

**Statut** : `prior` (technique Godot community 2025-26)

---

### CR-006 — Le hook doit être fun en isolation
**Principe** : Avant d'investir dans le contenu (biomes, ennemis, armes), le hook mécanique doit être amusant seul. Si Constriction n'est pas satisfaisante en prototype isolé, le contenu ne sauvera pas le jeu.

**Application** : Phase 0 = prototype du hook uniquement. Kill-gate Pierre avant Phase 1.

**Statut** : `observed` — `evidence_n: 1` (promu le 2026-08-23)
**Observation** : Kitten Clicker run 9 (`kitten_clicker-20260823a`) — le jeu avait **du contenu**
(6 chatons, prestige, jardin, habillage) et une boucle **mécaniquement vérifiée verte de bout en
bout** (A→J 13/13, DÉCISION 6/6, mesuré par le driver, pas par un LLM). HumanGate Pierre :
**FAIL — « prototype mécanique avec habillage »**. Le contenu n'a pas sauvé le hook, exactement
comme la règle le prédit. Réserve d'honnêteté : **n = 1**, playtest concepteur (l'auteur du jeu),
pas un joueur externe ni de la télémétrie. Une deuxième observation indépendante est nécessaire
avant `validated`.
**Source** : [[../decisions/decision-log|KITTEN_HUMANGATE_BASELINE_V1]] · `docs/audit/2026-08-23-kitten-clicker-design-chain-audit.md`

---

### CR-007 — Une chaîne d'oracles verte ne mesure pas le fun : quatre pathologies nommées

**Principe** : un jeu peut passer **toutes** ses vérifications mécaniques et rester injouable. Le
premier playtest interne du studio a produit quatre causes nommées, indépendantes du genre, qui
distinguent un système d'un jeu :

1. **Récompense visible avant d'être gagnée = récompense annulée.** Les 6 chatons affichés dès le
   départ étaient décoratifs. Corollaire actionnable : rien n'est affiché avant d'être gagné,
   **sauf sous forme de silhouette explicitement marquée « à débloquer »**.
2. **Un prestige sans reset réel, sans bonus permanent et sans nouvelle stratégie n'est pas un 2ᵉ
   niveau — c'est un bouton.** Les trois conditions sont conjointes.
3. **Un espace pauvre transforme la progression en variable.** « Nombre de chatons » n'est pas une
   colonie ; un plafond de places sans raison lisible est un mur arbitraire. La contrainte
   spatiale doit être une **règle de jeu lisible** (`places occupées / totales` affiché, action
   grisée **avec sa raison**, jamais un bouton mort).
4. **Sans hiérarchie OBJECTIF → ACTION → CONSÉQUENCE → PROCHAINE POSSIBILITÉ, le guidage est
   illisible** — même quand chaque élément existe séparément.

**Règle maîtresse dérivée** (ratifiée Pierre le même jour) : **UNLOCK = possibilité perceptible,
jamais +X %.** Un achat qui ne transforme pas visiblement la scène n'est pas un déblocage.

**Statut** : `observed` — `evidence_n: 1` (playtest concepteur, HumanGate Pierre 2026-08-23)
**Portée** : les 4 causes sont observées sur un idle/clicker. Les points 1, 2 et 4 semblent
généraux ; le point 3 (espace) est probablement spécifique aux jeux de collection/placement.
**À ne pas confondre avec une mesure** : ce sont des jugements de concepteur, pas de la
télémétrie. Ils ne deviendront `validated` qu'après ≥ 2 titres indépendants.
**Source** : [[../decisions/decision-log|KITTEN_HUMANGATE_BASELINE_V1]] · [[kitten_clicker_direction_produit_v1|Direction produit V1]]

---

## Règles de Pacing / Combat (Auto Battler)

### CB-001 — Plafond de combat ≈ 40 s temps réel (référence TFT)
**Principe** : Teamfight Tactics plafonne un combat à **40 secondes réelles** (30 s de combat normal + 15 s de « URF Overtime » qui accélère le rythme en fin de combat pour forcer une issue). L'Attack Speed de base des unités tourne le plus souvent autour de 0,6-0,8 attaque/seconde hors buffs.

**Conséquence pratique** : un combat doit toujours terminer (invariant QC-6 de `games/auto_battler`, ratifié HumanGate 2026-07-18). Hypothèse de travail non prouvée : 1 Tick ≈ 1 fenêtre d'action globale ≈ ~0,8 s équivalent-TFT ⇒ `tick_limit = 50` (40 s ÷ 0,8 s). Valeur v0 **provisoire**, calibrable par Balance dès les premières simulations réelles — aucune équivalence Tick↔temps réel n'est validée par un playtest.

**Statut** : `prior` (recherche sourcée WebSearch 2026-07-19, TFT wiki) — `evidence_n: 0` (aucune simulation `auto_battler` réelle encore mesurée)
**Source** : `games/auto_battler/bibles/HUMANGATE_2026-07-19_VALUES_V0.md`

---

## Règles de Distribution

### RD-001 — Le marché Steam est brutal (chiffres de sobriété)
- 20 282 jeux sortis sur Steam en 2025
- Médian revenu ≈ 249 $
- ~3 % atteignent 1 000 reviews (seuil ~150k$)
- 40 % ne récupèrent pas les 100 $ de frais Steam
- 47,5 % vendent < 100 copies

**Conséquence** : chaque jeu doit avoir des kill-criteria explicites. On ne s'acharne pas. La discipline portefeuille > le pari unique.

---

### RD-002 — Un swap de capsule peut multiplier les ventes par 20×
**Principe** : La capsule Steam (image principale) est la variable à la plus haute variance sur la conversion visite→wishlist.

**Règle** : A/B tester la capsule dès que la page est ouverte. Cible conversion visite→WL : > 4 %. Si < 1,5 % → re-tester la capsule avant tout autre marketing.

**Statut** : `prior` (GameDiscoverCo 2025-26)

---

### RD-003 — Démo tôt = ≈2,5× wishlists
**Principe** : Une démo disponible avant un Next Fest multiplie les wishlists par ~2,5× vs entrer au fest sans démo.

**Règle** : Démo disponible sur page dédiée avant le fest. Entrer au fest avec ≥ 2 000 WL minimum.

**Statut** : `prior` (GameDiscoverCo 2025-26)

---

## Règles du Compilateur de Design Empirique

> Source : `docs/studio_v2/09_DESIGN_COMPILER_COLDSTART.md`

Le système CERFA → /plan → build → télémétrie → post-mortem apprend à chaque jeu shippé.

**Règle d'or** : la valeur du compilateur ≈ `f(nombre de jeux shippés avec télémétrie)`. Aujourd'hui n=0. Le 1ᵉʳ jeu shippé = 1ʳᵉ ligne du dataset.

**Séquençage** :
1. Maintenant : schémas CERFA v1, vecteur de design v1, mémoire causale (priors)
2. Après M1 (1ᵉʳ jeu shippé) : remplir les post-mortems → `observed`
3. Après ~8-12 jeux avec télémétrie : passer le retrieval en mode appris (KNN)

**Pathologies à éviter** :
- Overfitting / clones → règle de diversité (≥1 dimension différente à fort poids)
- Question explosion → pruner le CERFA si un champ n'a pas apporté d'info sur ≥2 jeux
- Fausse causalité → `prior/observed/validated` + `evidence_n`. Une règle n'est `validated` qu'après ≥N observations indépendantes.

---

## Template — Nouvelle règle

```
### [ID] — [Titre]
**Principe** : 

**Conséquence pratique** :
- 

**Statut** : prior | observed | validated — evidence_n: N
**Source** : 
```

---

## Liens
- [[../doctrine/studio-doctrine|Doctrine]]
- [[../projects/snake-survivor-genesis|Snake: Survivor RPG]] (SUPERSEDED — historique)
- [[../reference/sources-of-truth|Sources de vérité dans le repo]]
