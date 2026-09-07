## 1. CE QUE LE JOUEUR VOIT

Un écran unique, sans menu ni niveau. Au centre, **un noyau** — le plus gros objet cliquable de l'écran, posé sur un fond neutre. En haut, **un compteur de ressource** noté `R` avec son pictogramme : c'est le seul chiffre qui compte, il grimpe visiblement (1 → 15 → 100 → 9 999 → 99 999…). Sous le compteur, **un indicateur de taux** montre combien de R arrivent par seconde une fois qu'une production automatique existe.

À droite, **une colonne de cartes de générateurs** (G1 à G4). Au départ, seul G1 est proposé à l'achat ; G2, G3 et G4 sont d'abord des **silhouettes verrouillées** avec leur seuil affiché — le joueur voit *ce qui* se débloquera et *à quel palier*. Chaque carte porte son coût courant, qui augmente à chaque achat.

Deux **cartes d'amélioration de clic** sont visibles dès le début (doubler puis quadrupler le gain manuel). Un **panneau d'améliorations de production** reste caché jusqu'à un palier avancé, puis se révèle d'un bloc.

Un **bandeau d'objectif** affiche en une phrase le prochain palier visé (« Atteindre 100 R », puis « Atteindre 1 000 R »…). Il n'y a **aucun écran de défaite** : le seul état terminal est **un panneau de victoire** qui apparaît quand le total cumulé atteint 1 000 000 R. Tout état d'objet est lisible sans texte : achetable (carte colorée), non-achetable (grisée), possédé (marqué acquis), verrouillé (silhouette).

## 2. CE QUE LE JOUEUR FAIT

Il **clique le noyau** pour produire de la ressource immédiatement — c'est son revenu manuel, jamais refusé. Dès qu'il a assez de R, il **achète un générateur** : la production devient automatique et le compteur monte tout seul entre deux clics. Il **arbitre en permanence** : cliquer encore (gain immédiat), acheter une amélioration de clic, ou dépenser en générateurs (production durable) — et, plus tard, épargner pour un palier plus rentable au lieu d'empiler le tier courant.

En poussant le total cumulé, il **franchit des seuils** qui **révèlent** de nouveaux générateurs puis le panneau d'améliorations de production. À chaque déblocage, il **recommence la boucle** achat → production → seuil dans un état plus riche, en visant l'objectif suivant affiché. Quand il atteint le million de R cumulés, la partie se **conclut par la victoire**. Il peut alors **relancer une partie neuve** — tout repart de zéro (le compteur `R` retombe à 0), sans bonus conservé de la partie précédente.

## 3. CE QUE LE JOUEUR RESSENT

La gratification est **immédiate et sensible** : chaque clic fait réagir le noyau et bouger le compteur dans la même fraction de seconde. Vient ensuite le **soulagement de l'automatisation** — voir la ressource monter sans rien toucher, premier vrai palier de puissance. La **croissance exponentielle visible** (les chiffres qui gagnent des zéros) donne une sensation d'accélération continue.

Chaque seuil franchi produit une **petite surprise de découverte** : une silhouette verrouillée devient un objet neuf, coloré, achetable. L'arbitrage acheter-maintenant / épargner installe une **tension d'optimisation douce** : le joueur sent qu'un meilleur ordre d'achats le rapproche plus vite du but. L'absence de game over rend l'expérience **sereine, sans punition** — la seule pression est celle, positive, de l'objectif affiché. La victoire au million procure une **clôture nette** : un aboutissement, pas une boucle infinie.

## 4. RÈGLES OBSERVABLES

- **R1** — Au clic sur la cible `noyau`, le compteur `ressource` augmente d'exactement `gain_clic` (1 R au départ) ; le noyau n'a aucun état verrouillé et ne refuse jamais le clic.
- **R2** — Au clic, le noyau se déforme (squish) et le compteur change à l'écran dans la même frame : le feedback est synchrone de l'entrée.
- **R3** — Après achat d'un générateur G1, la ressource croît de 0,1 R/s (10 mR/tick) sans clic, et l'indicateur de taux devient non nul.
- **R4** — Le coût du n-ième exemplaire d'un tier vaut `coût_base × 1,12^n` : le prix affiché sur la carte augmente strictement à chaque achat du même tier.
- **R5** — Au franchissement de 100 R cumulés (S1), la carte G2 passe de silhouette verrouillée à révélée ; idem G3 à 1 000 R (S2), G4 à 12 000 R (S3), panneau d'améliorations de production à 150 000 R (S4).
- **R6** — Un objet dont le coût dépasse le solde est grisé ; un clic dessus laisse l'état inchangé (refus observable, aucune ressource dépensée).
- **R7** — Le bandeau d'objectif affiche toujours un texte non vide ; après un déblocage, il change pour un énoncé **textuellement différent** du précédent.
- **R8** — Les deux améliorations de clic sont disponibles dès le début et ne dépendent d'aucun seuil ; une fois achetées, elles passent en état « acquis » et multiplient le gain par clic (×2 puis ×4 cumulés).
- **R9** — Il n'existe aucun état d'échec : aucune condition, aucun compteur ne peut déclencher un game over.
- **R10** — Quand le total cumulé atteint 1 000 000 R, un panneau de victoire s'affiche là où il n'y avait qu'un compteur ; c'est la seule fin observable, sans reset automatique.
- **R11** — En relançant une partie, le compteur `ressource` retombe à 0 et aucun avantage n'est conservé de la partie précédente : le gain par clic redémarre à 1.
- **R12** — Un bot qui joue en enchaînant des achats atteint S5 (1 000 000 R cumulés) en ≤ 72 000 ticks (100 ms), et le temps-jusqu'à-S5 varie selon l'ordre d'achat (variance non triviale, mesurée, pas ≥ tautologique).

---

## RAPPORT FINAL — s1-prisme / p3_alpha-20260901-run1

**Ancre (charter, étape 0) :** genre incremental/clicker, ressource unique R, une seule fin = victoire S5 à 1 000 000 R cumulés, **aucun état d'échec**, thème/univers/personnages **délégués au producteur** (hors_scope). Le product_snapshot ci-dessus respecte cette délégation : il décrit le produit en termes de **grammaire de genre** (noyau, R, G1-G4, seuils) sans inventer de thème.

**Sources d'exigences consommées :** `gm_worldscan.json` (s2.7 — présent, riche : `loops.*.steps[]`, `grey_blocks[]`, `progression_metrics`, reprises **telles quelles**) ; `worldscan.txt` (s2 — présent, `advisory:true`, tronqué en queue mais matière de même nature) ; `story_bible.json` (s2.6 — présent, 6/8 sections `NOT_GROUNDED` par délégation charter, seules `context` et `coherence_rules` ancrées). `design/progression_contract.md` et `design/calibration.md` : **absents** du run_dir (constat déjà mesuré au manifest, cf. pré-mortem) — je ne compense pas, j'ordonne les exigences de boucle selon la séquence GM.

**Reçu d'oracle :** **aucun en ma possession.** Mes permissions sont `run: aucun` ; `node scripts/forge/check_prisme_manifest.mjs <run_dir>/prisme.json --worldscan <run_dir>/worldscan.json` sera exécuté par l'exécuteur sur `prisme.json` matérialisé. Je **ne m'auto-certifie pas** : pas de `software_verdict: OK` émis par moi.

**Exigences classées / références :** les 12 exigences (9 de boucle + 3 hors-boucle + 1 ADDITIONS) portent chacune la chaîne `observation -> claim -> enonce` à trois maillons distincts, une `expected_proof` exploitable, et — pour toute exigence de boucle — une adresse `gm_worldscan:game_master.loops.<loop>.<step_id>` ou `grey_blocks.<id>` résolvable. Aucune exigence n'est laissée sans preuve attendue.

**⚠ CONFLIT STRUCTUREL DÉCOUVERT — maillon J (ADVANTAGE) sans domicile honnête.** Le contrat V4 GAME LOOP (gelé, calibré sur Kitten Clicker) exige **au moins une exigence par rôle**, dont **META_LOOP (I)** puis **ADVANTAGE (J)** : J requiert `replay_ref` + `observe.predicate: "increases_more_than:<id>"` — c.-à-d. qu'une action **rejouée après le meta-loop rende STRICTEMENT PLUS** qu'avant. Cela **présuppose un prestige à report d'avantage**. Or le charter p3_alpha gèle un jeu **one-shot, sans reset porteur de bonus** (worldscan : « prestige/reset non-applicable ») : relancer une partie remet `R` à 0 **sans aucun report**, donc le gain par clic post-relance vaut **exactement** le gain initial (R11). **J est donc structurellement infalsifiable ici sans fabriquer un mécanisme que le charter interdit.** J'ai rempli **META_LOOP** honnêtement (relance = reset visible de `R`, ancré `meta_loop.mt_action`), mais **je n'émets PAS d'exigence ADVANTAGE** : l'inventer serait un `claim` faux par construction. C'est le mode de panne noté au run 7 (« la boucle atteint G puis s'arrête »), ici remonté à sa cause : le gabarit de boucle cyclique ne se plaque pas sur un incrémental à fin unique.

**Verdicts :**
- `claim_verdict: NO_CLAIM_ALLOWED`
- `evidence_verdict: MECHANICAL_VALIDATION_ONLY` (portée : applicable au reçu `check_prisme_manifest` de l'exécuteur, **pas encore en ma possession**)
- `fog -> HumanGate/GM :` (1) faut-il, pour ce genre one-shot, **exempter J/ADVANTAGE** du contrat V4 (décision de gel), ou requalifier honnêtement le meta-loop comme « replay-sans-report » ? — arbitrage humain, aucun oracle ne le tranche. (2) La fidélité de chaque `reference` à son passage source est attestée à la main ; la résolution machine revient à `check_amont_traversal.mjs` côté exécuteur.

**SKIPPED_VALIDATION :**
- item: exécution de `check_prisme_manifest.mjs` · périmètre: `prisme.json` matérialisé · statut: non fait · raison: permissions `run: aucun` — l'exécuteur le lance, l'agent n'a aucun reçu.
- item: maillon J (ADVANTAGE) du contrat V4 · périmètre: exigences de boucle · statut: non fait (assumé) · raison: infalsifiable sans prestige, interdit par le charter one-shot ; remonté en fog plutôt que fabriqué.
- item: ancrage sur le `worldscan` intégral · périmètre: exigences source `worldscan` · statut: partiel · raison: reçu s2 tronqué en queue (matière mécanique de même nature, sans incidence sur l'ancrage).
- item: exigences sourcées `design/*` · périmètre: ordre/valeurs de calibration · statut: non fait · raison: `design/progression_contract.md` et `design/calibration.md` absents du run_dir ; ordre pris sur la séquence GM, non compensé.

**RETURN LINEAGE :**
`why_task_existed:` { `problem:` produire le product_snapshot + le manifeste d'exigences falsifiables de p3_alpha à partir des artefacts amont (s2/s2.6/s2.7) · `oracle:` aucun — activation par la séquence du pipeline (décision de production), pas par une mesure · `root_cause:` non établie (étape nominale) · `action_reason:` s2.7 game_master présent et riche => dériver des lignes candidates de wiremap ancrées GM } · `result:` product_snapshot 4 sections + 12 règles observables ; prisme.json 12 exigences, 9 rôles de boucle remplis (PLAYER_GOAL→META_LOOP), maillon J volontairement non émis · `proof:` `check_prisme_manifest.mjs` NON exécuté (run: aucun) — reçu attendu côté exécuteur ; chaîne obs/claim/enonce à 3 maillons et adresses GM vérifiées à la main · `learning:` le gabarit de boucle V4 (prestige cyclique) exige un report d'avantage qu'un incrémental à fin unique ne peut pas honorer — la complétude 10/10 rôles n'est pas atteignable sans fabrication pour ce genre · `next_reason:` **chaîne NON fermée** — HumanGate/GM doit décider si J/ADVANTAGE est exempté pour les jeux one-shot ou si le contrat V4 doit porter une variante « fin unique » ; une cause non résolue (gabarit↔genre) persiste.
