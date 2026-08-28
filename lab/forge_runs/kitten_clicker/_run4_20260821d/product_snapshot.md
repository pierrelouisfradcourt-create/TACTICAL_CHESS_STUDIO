I've read the charter, the schema, and both oracles (`check_prisme_manifest.mjs` + `upstream_schema.mjs`). I now know the exact structural contract the artifact must satisfy. Here is product_snapshot.md, followed by the terminal `prisme.json` block.

---

## 1. CE QUE LE JOUEUR VOIT

Au centre de l'écran, une **pelote de laine** (patée/coussin) trône comme unique cible cliquable. Au-dessus d'elle, un **compteur de ronrons** affiché en gros chiffres, qui monte visiblement. Autour, une **grille de chatons** achetés : chaque chaton acquis apparaît à l'écran comme un sprite/bloc qui n'existait pas avant l'achat. Une colonne d'**améliorations** achetables borde le côté. Le **lieu** courant forme le décor — le refuge de départ, puis au moins un second lieu débloqué par la méta-progression, chacun visuellement distinct.

Chaque **rareté** de chaton se lit à l'œil : forme, couleur ou taille différenciées, pas seulement une étiquette dans les données. Un petit **journal de quêtes** montre 3 objectifs de collection avec leur état d'avancement. À chaque clic, la pelote se déforme/pulse et une **particule ronron** s'envole. Les grands nombres restent lisibles (compteur, taux de production par tick, seuils de palier). Aucun écran de game-over : le monde est un marathon cosy, sans défaite affichée.

## 2. CE QUE LE JOUEUR FAIT

Le joueur **clique** la pelote centrale pour produire des ronrons (+1 strict par clic). Il **achète des chatons** avec ses ronrons ; dès qu'au moins un chaton est acquis, la production devient **automatique** — les ronrons montent sans aucun clic, tick après tick. Il **achète des améliorations** qui font passer le taux de production par tick à une valeur strictement supérieure. Le coût de chaque chaton d'un type augmente strictement à chaque achat, ce qui rythme la boucle.

À mesure qu'il progresse, il **franchit des paliers** (au moins 3 seuils distincts) qui débloquent de nouveaux chatons et un nouveau lieu. Il **complète de petites quêtes** de collection. Enfin, il **déclenche le prestige** (méta-progression) : la run se réinitialise mais un multiplicateur permanent persiste dans la run suivante. La boucle vécue est la chaîne du charter : CLICK → RONRONS → CHATONS → PRODUCTION AUTOMATIQUE → AMÉLIORATIONS → NOUVEAUX CHATONS ET LIEUX → META-PROGRESSION.

## 3. CE QUE LE JOUEUR RESSENT

Au premier clic, une **validation tactile** immédiate : cliquer est *efficace* ici, chaque clic compte pour exactement +1 et le son sec le confirme. Vient ensuite la **bascule de l'actif vers le passif** : voir les ronrons monter tout seuls procure la satisfaction propre au genre idle — le sentiment que le temps travaille pour soi. L'achat d'un chaton nommé, visible et distinct par rareté, nourrit un **désir de collection** (« lequel me manque encore ? »).

Le franchissement d'un palier et surtout le **prestige** donnent une sensation de **jalon-victoire** sans jamais imposer de perte : le ton reste **cosy, non punitif**, sans état d'échec ni pression. La fanfare de prestige affirme le progrès comme un cap franchi. L'ensemble vise une **cosiness over urgency** : un rituel doux, une progression ouverte, aucune menace — la mignonnerie et l'attractivité de la collection tiennent lieu de tension.

## 4. RÈGLES OBSERVABLES

- **R1** — Un clic sur la pelote centrale incrémente le compteur de ronrons affiché d'exactement +1 (assertion stricte compteur == n+1, jamais un plus-grand-ou-égal).
- **R2** — Dès qu'au moins un chaton est possédé, le compteur de ronrons augmente à chaque tick sans aucune interaction du joueur.
- **R3** — Acheter un chaton fait apparaître à l'écran un sprite/bloc de chaton absent avant l'achat.
- **R4** — Acheter une amélioration fait passer le taux de production par tick à une valeur strictement supérieure, visible à l'écran.
- **R5** — Chaque chaton successif d'un même type coûte strictement plus que le précédent (courbe de coût monotone croissante).
- **R6** — Au moins 6 chatons nommés existent, chacun rattaché à une rareté rendue visuellement distincte (forme, couleur ou taille) à l'écran.
- **R7** — Au moins 2 lieux jouables existent (refuge de départ + ≥1 débloqué par méta-progression), chacun visuellement distinct à l'écran.
- **R8** — Au moins 3 objets distincts et au moins 3 quêtes (objectif + avancement affichés) sont identifiables à l'écran.
- **R9** — La courbe de paliers porte au moins 3 valeurs de seuil deux-à-deux distinctes (règle de variance ratifiée Pierre 2026-07-21).
- **R10** — Un bot automatisé atteint le 3e palier en un nombre de ticks fini et borné explicitement (solvabilité stricte, jamais tautologique).
- **R11** — Chacun des 4 événements (clic, achat, déblocage, prestige) déclenche un son DISTINCT, journalisé par événement dans `07_TESTS/oracle/core_audio.gd`.
- **R12** — Chaque clic produit un feedback visuel (déformation/pulsation de la pelote ou particule ronron) capturable en fenêtre GPU.
- **R13** — Déclencher le prestige réinitialise les compteurs de run mais confère un multiplicateur permanent strictement croissant qui persiste dans la run suivante.
- **R14** — Aucun état de défaite ni écran de game-over n'est atteignable (monde sans condition de défaite, ton cosy).

---

## RAPPORT FINAL — s1-prisme / kitten_clicker-20260821d

**Ancres.** Charter `charter.yaml` (lu, 7 champs remplis, chaîne CLICK→…→META et criteres_demo (a)–(h)). Sources d'exigences : `s2-worldscan` (3 jeux), `s2.6-story-bible` (sections GROUNDED : context, characters, coherence_rules — les 5 autres NOT_GROUNDED, non citées), `s2.7-gm-worldscan` (8 dimensions MEASURED). Oracle de sortie de cette étape : `node scripts/forge/check_prisme_manifest.mjs <run_dir>/prisme.json --worldscan <run_dir>/worldscan.json` — que je **n'ai pas exécuté** (permission `run: aucun`) ; j'ai construit prisme.json en conformité vérifiée par **lecture** de `upstream_schema.mjs` (validateChaine / validateProvenance / validateExpectedProof / DESTINATIONS) et de `check_prisme_manifest.mjs` (ancrage de référence par sous-chaîne sur les jetons du World Scan).

**Chaîne de falsifiabilité.** Les 26 exigences séparent `observation` (ce que la source montre) → `claim` (déduction réfutable indépendamment) → `enonce` (garantie imposée au jeu), les trois maillons distincts. Familles couvertes avec ≥1 EXPECTED chacune : GAMEPLAY, LONGUEUR (réf. `gm_worldscan:progression`, kind bot_action), CONTENT (réf. `story_bible:*`, kind file_write/visual), VISUAL (kind visual, volet `07_TESTS/oracle/*.gd` gpu_window), AUDIO (kind oracle, `core_audio.gd`).

**Références classées non ancrées dans le World Scan (fait mesuré, non bloquant).** Les références `story_bible:*` (C1–C4, V2, V3) et `gm_worldscan:*` (G5, L1, L2, X1, X3) ne s'ancrent pas dans les jetons du manifeste worldscan.json (jeux/URLs) — l'oracle les CLASSE `references_non_ancrees`, sans faire échouer l'étape (le verdict ne bascule que sur `problems`). Elles résolvent en revanche dans leurs artefacts propres via `check_amont_traversal.mjs` (sections story_bible GROUNDED et dimensions gm_worldscan MEASURED existent réellement). Les références `worldscan:games[N].*` (G1–G4, G6, G7/L3, V1, V4, X2, A1–A4 via visual_audio_conventions) portent le jeton `games N` et s'ancrent.

**Exigences classées non actionnables : aucune attendue** — chaque exigence porte un `expected_proof {kind ∈ PROOF_KINDS, statement}` et une `destination ∈ {s3-decompo, s4-archi, s5-wiremap, s9-build}`.

**software_verdict: BLOCKED** — l'oracle `check_prisme_manifest` est disponible mais non exécutable par cette station (`run: aucun`) ; sa passe est déléguée à l'exécuteur à la matérialisation, comme s2.6/s2.7. · **evidence_verdict: MECHANICAL_VALIDATION_ONLY** (s'applique au run oracle de l'exécuteur). · **claim_verdict: NO_CLAIM_ALLOWED**. · **fog HumanGate** : la conformité de forme est de *conception vérifiée par lecture*, pas un reçu exécuté — Pierre/l'exécuteur tranche sur reçu réel.

**SKIPPED_VALIDATION :**
- item: exécution de `check_prisme_manifest.mjs` · périmètre: prisme.json de ce run · statut: non fait · raison: permission `run: aucun` — délégué à l'exécuteur (même patron que s2.6/s2.7/s4/s5).
- item: résolution effective des adresses `story_bible:*` / `gm_worldscan:*` par `check_amont_traversal.mjs` · périmètre: références EXPECTED CONTENT/LONGUEUR/VISUAL · statut: non fait · raison: sonde advisory non exécutable par cette station (`run: aucun`) ; les sections/dimensions citées existent par lecture des artefacts amont, mais je ne prétends pas avoir exécuté la sonde.

**RETURN LINEAGE.**
- why_task_existed: {problem: "le charter exige que conditions de victoire/défaite, objectifs, progression et contraintes narratives amont ATTEIGNENT réellement Grey Blocks/WireMap/Builder, pas seulement présentes dans les documents ; il fallait produire les exigences falsifiables qui portent cette traversée" · oracle: "check_amont_traversal.mjs (advisory) mesure la consommation aval ; check_prisme_manifest juge la chaîne Observation→Exigence→Preuve→Destination" · root_cause: "sans artefact d'exigences structuré, les intentions amont restent en prose non routable vers l'aval" · action_reason: "le Prisme est le producteur qui manquait au validateur de lignes wiremap v2 ; ses exigences sont les lignes candidates qui rendent la traversée mesurable"}
- result: "product_snapshot.md (4 sections, 14 règles observables R1–R14) + prisme.json (26 exigences, 24 EXPECTED / 2 ADDITIONS, 0 non actionnable par construction)"
- proof: "oracle non exécuté (run: aucun) ; conformité construite par lecture de upstream_schema.mjs et check_prisme_manifest.mjs — reçu à produire par l'exécuteur"
- learning: "les références `story_bible:*` et `gm_worldscan:*` ne s'ancrent pas dans les jetons de worldscan.json (jeux/URLs) : le contrat exige ces adresses pour CONTENT/LONGUEUR alors que check_prisme_manifest ne sait ancrer que le World Scan — l'ancrage cross-artefact relève de check_amont_traversal, pas de l'oracle de sortie ; les deux mesurent des choses différentes et ce n'est pas un défaut de l'artefact"
- next_reason: "chaîne ouverte : l'exécuteur doit exécuter check_prisme_manifest (verdict réel) et check_amont_traversal (résolution des adresses story_bible/gm_worldscan) — preuves manquantes tant que non exécutées ; ensuite HumanGate"
