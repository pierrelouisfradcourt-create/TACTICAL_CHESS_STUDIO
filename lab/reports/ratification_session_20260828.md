PROPOSED — préparé par agent, aucune décision appliquée, ratification = geste Pierre.

# Séance de ratification HumanGate — 2026-08-28

Préparation R1. Aucun fichier autre que celui-ci n'a été créé ou modifié. Aucun script
`--apply` n'a été exécuté. Chaque item cite son chemin de fichier source.

---

## § Résumé chiffré

| Source | Items totaux | ACCEPT proposé | REJECT/ARCHIVE proposé | DEFER proposé |
|---|---:|---:|---:|---:|
| `lab/reports/forge_bible_proposals.jsonl` | 1180 | 0 | 1146 (6 lots, doublons) | 34 (2 lots, projets actifs) |
| `lab/reports/forge_capability_gap_proposals.jsonl` | 278 | 42 (7 ids tetris, déjà au registre) | 0 | 236 (kitten_clicker, projet jamais DONE/OK) |
| `lab/reports/forge_factory_capability_gap_proposals.jsonl` | 27 | 1 (bot.solvability, déjà ACCEPTED) | 0 | 26 (15 ids proof.*/probe.*, pas encore au registre) |
| `knowledge_base/proposals/*.yaml` (status PROPOSED) | 18 | 13 (10 forge.* + 3 asset.gen_*) | 0 | 5 (4 asset.gen_* sans consommateur, 1 lesson.asset EN_ATTENTE) |
| gates `planning_gate` (`decisions_normalized.jsonl`) | 4 | 0 | 0 | 4 (toutes EN_ATTENTE, décision = Pierre par nature) |
| `planning_PROPOSED.yaml` (drifts + leçons) | 22 | 0 | 18 (lessons déjà APPLIQUEE ailleurs, doublon) | 4 (drifts, réels, non résolus) |
| **Total** | **1529** | **56** | **1164** | **309** |

Note de cadrage : le total de la mission annonçait « ~1550 items » ; le périmètre vérifié
mécaniquement (fichiers listés ci-dessus, hors `lessons.jsonl` qui sert de croisement et
non de file à trier) totalise 1529 lignes.

---

## § Décisions 5 minutes

Prêtes à coller telles quelles.

1. `{"queue":"forge_capability_gap_proposals","item":"game.gravity","decision":"ACCEPT"}` —
   déjà au registre `scripts/forge/standard/capabilities.yaml:162`, ratifié Pierre
   2026-08-10 (commentaire ligne 145-158). L'entrée journal est un doublon résolu.
2. `{"queue":"forge_capability_gap_proposals","item":"game.input","decision":"ACCEPT"}` —
   registre ligne 179, même ratification.
3. `{"queue":"forge_capability_gap_proposals","item":"game.line_clear","decision":"ACCEPT"}` —
   registre ligne 171.
4. `{"queue":"forge_capability_gap_proposals","item":"game.lock","decision":"ACCEPT"}` —
   registre ligne 168.
5. `{"queue":"forge_capability_gap_proposals","item":"game.piece_source","decision":"ACCEPT"}` —
   registre ligne 159.
6. `{"queue":"forge_capability_gap_proposals","item":"game.rotation","decision":"ACCEPT"}` —
   registre ligne 165.
7. `{"queue":"forge_capability_gap_proposals","item":"game.score","decision":"ACCEPT"}` —
   registre ligne 174.
   → Geste Pierre pour les 7 : marquer les 42 lignes tetris de la file comme résolues
   (le registre les a déjà intégrées) plutôt que les rejeter — ce ne sont pas des items
   à refuser, mais un journal d'événements qui n'a jamais été fermé après ratification.

8. **Gate `planning:P2-verrou-contrat-prompt`** (source
   `studio_brain/planning/planning.yaml:27-34`, `lab/reports/observer/kitten_clicker/decisions_normalized.jsonl`) —
   3 champs (`skill`, `plugin`, `delegation_context`) validés par la porte de contrat mais
   jamais rendus dans le prompt, sur 10/10 activations mesurées. Deux issues légitimes :
   (a) règle de rendu ajoutée dans `contract.py`, ou (b) requalification explicite des 3
   champs comme hors-prompt dans `SCHEMA.md`. Recommandation : (a) — un champ *validé* par
   la porte et jamais consommé est exactement le défaut « validateur sans producteur/lecteur »
   déjà ratifié dans la doctrine studio ; le corriger à la source évite un nouvel écart
   silencieux à chaque contrat futur.

9. **Gate `planning:P4-doctrine-vs-realite`** — 7 drifts roadmap + 5 drifts documentation
   à arbitrer un par un (maj doctrine OU correction réalité), notamment `grid_nav_probe FAIT
   sans traces` et `PONG en désaccord entre les deux docs`. Recommandation : traiter en lot
   séparé (pas une décision 5 minutes en soi) — voir § Différés.

10. **Gate `planning:P5-jeu-test-apprentissage`** — bloquée par `depends_on:
    [P0, P2, P4]` (toutes encore EN_ATTENTE/EN_COURS) : ne peut pas être ratifiée avant les
    trois autres. Recommandation : DEFER mécanique, pas une vraie décision disponible
    aujourd'hui.

11. `knowledge_base/proposals/forge.consumer_is_not_found_by_shape.yaml` → ACCEPT — cause
    et falsification individuelle mesurées (12 arêtes tenues sur 12 rougissements, zéro
    silence), aligné avec l'audit du 2026-08-28 sur le bornage des outils (une recherche de
    consommateur qui ne couvre qu'une forme d'accès sous-déclare).
12. `knowledge_base/proposals/forge.journal_is_not_emission.yaml` → ACCEPT — falsification
    exécutée (piste audio réintroduite muette, oracle rougit, restaurée verte) ; directement
    consommable pour tout oracle de type « canal design_questions » cité dans l'audit
    2026-08-25 (C3/C4).
13. `knowledge_base/proposals/forge.append_only_queue_measures_nothing.yaml` → ACCEPT — la
    proposition se corrige elle-même le jour de son émission (réécrite après falsification),
    et documente exactement le mécanisme de la file `capability_gap` mesuré dans ce rapport
    (§ Lots en masse #2) : deux lectures (brute vs par consommateur) donnent deux chiffres
    différents, aucun n'est faux.
14. `knowledge_base/proposals/forge.execution_mode_is_a_measurement.yaml` → ACCEPT — mesure
    directe et falsifiable (16639 vs 16383 échantillons, deux modes, un seul vrai verdict) ;
    complète la doctrine « bornage des outils » de l'audit 2026-08-28 (le mode d'exécution
    d'un outil ne se décrète pas).
15. `knowledge_base/proposals/forge.proof_text_must_be_derived.yaml` → ACCEPT (avec la
    limite déjà intégrée dans le fichier lui-même : ne s'applique pas aux reçus datés type
    wiremap écrite à la main) — falsification exécutée (462 → 99999 → 462), et directement
    en tension productive avec l'île V2 citée dans l'audit 2026-08-28 : tout champ de preuve
    généré par un builder doit être dérivé, pas recopié à la main par l'agent.

---

## § Lots en masse

### Lot 1 — `forge_bible_proposals.jsonl`, doublons de 6 décisions répétées 191× (1146 lignes, projet `snake`)

**Constat mécanique** : 15 « slugs » de décision uniques au total dans le fichier (1180
lignes). 6 d'entre eux — `bande_declaree_comme_bande_jouee`, `systemes_extensibilite_construits`,
`collision_balayee_pong`, `capture_sans_fenetre_gpu`, `reuse_ratio_par_imports`,
`metrique_difficulte` — apparaissent chacun **exactement 191 fois**, tous `project=snake`,
`kind=abandoned`, `status=PROPOSED`, avec 191 horodatages distincts (`ts`) étalés sur
~8 jours (1786979757 → 1787672216, run_id principalement `r`). Le texte de `decision` et
`rationale` est identique à chaque occurrence pour un même slug (vérifié par échantillonnage).

**Échantillon exact (1 des 6 slugs, texte réel, `decision` tronqué à 200 car.)** :
- `[abandoned] bande_declaree_comme_bande_jouee: Presenter la bande de vitesse declaree
  [plancher 80 ms, periode initiale 2...`
- `[abandoned] systemes_extensibilite_construits: Construire des maintenant la telemetrie
  effective, l'equilibrage automati...`
- `[abandoned] collision_balayee_pong: Reutiliser la collision balayee de Pong (stepBall,
  interpolation de franchissement d...`

**Diagnostic** : ce sont 6 décisions d'architecture *réelles et valables une fois chacune*
(abandons motivés du charter Snake), mais le mécanisme qui les journalise les a réémises à
chaque run/tick sur ~8 jours au lieu d'une fois. C'est un cas d'école pour
`forge.append_only_queue_measures_nothing` et `forge.journal_is_not_emission` (§ Décisions
5 minutes #12-13) : le journal grossit sans qu'aucune transition d'état ne les ferme.

**Geste Pierre proposé** : dédupliquer sur la paire `(kind, project, slug_de_decision)` —
garder 1 exemplaire par slug (6 lignes utiles sur les 1146), archiver les 1140 autres comme
doublons d'émission. Commande à écrire (ne pas exécuter ici) : un script qui lit le JSONL,
groupe par le préfixe `[abandoned] <slug>:` de `decision`, ne conserve que le premier `ts`
par groupe, réécrit le fichier filtré. Avant d'automatiser : vérifier avec Pierre si le
mécanisme d'émission (probablement dans `scripts/forge/driver.py` ou un chemin de
`context_manifest.py`, tous deux modifiés dans cette session selon `git status`) doit être
corrigé en amont pour ne plus dupliquer.

### Lot 2 — `forge_bible_proposals.jsonl`, 4 décisions × 4 occurrences, projet `breakout_v2` (16 lignes)

`multi_niveaux_progression`, `persistance_meilleur_score`, `reutilisation_code_breakout_js`,
`extension_silencieuse_registre_capacites`, `capacite_snake_detournee`,
`powerups_briques_multihits`, `acceleration_progressive_balle`,
`bande_vitesse_jouable_comme_metrique` — 8 slugs × 4 occurrences = 32 lignes (le tableau
au-dessus les compte dans les 1146+34 : ce lot est en fait dans le solde DEFER, pas ACCEPT,
car `breakout_v2` a plusieurs runs de preuve distincts — `breakout_v2-proof-20260817`,
`-proof2-`, `-proof3-`, `-proof5-` — donc 4 occurrences peuvent légitimement correspondre à
4 runs réels et non à une duplication de bug). **DEFER** : vérifier avant d'archiver que
chaque occurrence correspond bien à un `run_id` distinct (elle le fait, cf. comptage
`run_id` : `breakout_v2-proof-20260817`×8, `-proof2-`×8, `-proof3-`×8, `-proof5-`×8 — 4
runs × 8 slugs sur ce lot élargi = cohérent, PAS un doublon).

### Lot 3 — `forge_bible_proposals.jsonl`, `kitten_clicker` (2 lignes)

2 entrées seulement, `run_id=kitten_clicker-20260823a`. **DEFER** : projet en cours de
modification dans le working tree actuel (`git status` : `M tasks.json`, `D
design/calibration.md`) — pas de décision de contenu à prendre pendant qu'un autre travail
est en cours dessus.

### Lot 4 — `forge_capability_gap_proposals.jsonl`, 42 lignes `tetris` (7 ids) → voir § Décisions 5 minutes #1-7

### Lot 5 — `forge_capability_gap_proposals.jsonl`, 236 lignes `kitten_clicker` (47 ids)

Vérification faite pour les 16 ids les plus fréquents (`media.sprites`, `collection.adopt`,
`rule.click_ronron`, `world.content`, `economy.ronrons`, `rule.meta_unlock`,
`content.kittens`, `upgrades.click_power`, `render.rarity`, `rule.buy_kitten`,
`rule.prestige`, `content.objects`, `render.goal`, `rule.cost_curve`, `progression.unlock`,
`prestige.reset`) : **aucun** n'est présent dans `scripts/forge/standard/capabilities.yaml`
(`grep -c "id: <nom>$"` = 0 pour les 16). Croisement avec `lab/forge_runs/RUN_INDEX.md` :
**tous** les runs `kitten_clicker` recensés (20+ runs, 2026-08-21 → 2026-08-24) ont un
verdict `FAIL` ou `BLOCKED` — aucun `OK`. Recommandation : **DEFER en bloc**, pas REJECT —
ces identifiants ne sont pas *invalides*, mais tant que le jeu qui les a fait naître n'a
jamais atteint un run vert, les promouvoir au registre reviendrait à figer le vocabulaire
d'un système qui n'a pas fini de bouger. Geste Pierre : attendre soit un run
`kitten_clicker` `DONE/OK`, soit une clôture explicite de l'expérience d'autonomie (cf.
mémoire `kitten_clicker_autonomy_test_20260821.md`) avant de statuer id par id.

### Lot 6 — `forge_factory_capability_gap_proposals.jsonl`, 26 lignes restantes après `bot.solvability`

15 identifiants uniques (`probe.observable`×5, `proof.baseline_before`×2,
`proof.core_audio`×2, `proof.core_goal_display`×2, `proof.gallery_render`×2,
`proof.main_screen_render`×2, `proof.mutation_click`×2, `proof.solvability`×2,
`proof.variance`×2, `proof.non_regression`, `proof.dash_measurement`, `proof.input_parity`,
`proof.purity_counts`, `proof.asset_inventory`), tous issus du run
`pacman-capitalisation-20260810`. Aucun de ces ids n'est présent dans
`scripts/forge/standard/factory_capabilities.yaml` (seuls `probe.state_snapshot` et
`bot.solvability` y figurent). **DEFER** : contrairement au lot kitten_clicker, ce sont des
capacités d'**usine** (`proof.*`/`probe.*` — cf. doctrine "deux registres" en mémoire
studio) issues d'un run *capitalisé* et probablement légitime, mais je n'ai pas trouvé de
trace de ratification écrite pour ces 15 précisément (seul `bot.solvability` porte
`review_status: ACCEPTED` dans le fichier). Nécessite un arbitrage Pierre id par id ou en
bloc sur ce run, pas une lecture automatique supplémentaire de ma part.

### Lot 7 — `knowledge_base/proposals/*.yaml`, 4 `asset.gen_*` sans consommateur

`asset.gen_button_floor_01`, `asset.gen_chest_01`, `asset.gen_door_wood_01`,
`asset.gen_platform_stone_01` : 0 référence dans `games/**/*.gd` ou `*.tscn` (vérifié par
grep). Les 3 autres (`gen_barrel_01`, `gen_crate_wood_01`, `gen_pillar_stone_01`) ont un
consommateur réel confirmé dans
`games/bomberman_3d/06_RUNTIME/adapters/{palette/palette.gd,presentation_3d/arena_view_3d.gd}`.
**ACCEPT** pour les 3 avec consommateur (§ Décisions 5 minutes, non listées faute de place —
mêmes preuves que ci-dessus, `geometry_status: OK` par l'Asset Geometry Oracle + usage
runtime réel). **DEFER** pour les 4 sans consommateur : la géométrie est déjà validée par
l'oracle (`geometry_status: OK`), le travail de production est fait ; ce n'est pas un item
« sans valeur » au sens de la doctrine anti-accumulation (le coût est déjà payé, l'asset
existe et passe l'oracle), donc pas d'ARCHIVE — mais pas d'ingestion au catalogue avant
qu'un jeu ne les consomme réellement.

---

## § Différés (DEFER) avec raison

- **`planning:P0-boucle-lessons-kb`** — EN_COURS (pas EN_ATTENTE au sens strict), gate sur
  « ratification par Pierre de chaque proposition KB générée ». Directement actionnable via
  les décisions 5 minutes #11-15 ci-dessus (5 proposals forge.* prêtes) mais la gate
  elle-même (le mécanisme de la boucle Lessons→KB) reste à trancher par Pierre séparément.
- **`planning:P4-doctrine-vs-realite`** — 7 drifts roadmap + 5 drifts documentation, chacun
  nécessite un arbitrage individuel (maj doctrine vs correction réalité) que cet agent ne
  peut pas trancher sans lire chaque drift en détail (hors budget de cette mission).
- **`planning:P5-jeu-test-apprentissage`** — bloquée mécaniquement par ses 3 dépendances
  (P0, P2, P4) toutes non closes.
- **4 `drift:*` de `planning_PROPOSED.yaml`** (`prompt_sans_empreinte_declaree` 73
  occurrences, `token_accounting_below_measured` 10 occurrences,
  `tool_observability_not_measured` 58 occurrences, `tools_used_beyond_declared` 52
  occurrences) — tous `decision_attendue: A_DEFINIR_A_LA_RATIFICATION`, `owner:
  A_DEFINIR_A_LA_RATIFICATION` : le fichier source lui-même déclare qu'aucune décision n'est
  pré-mâchée, la ratification doit fixer le owner et la décision en même temps. Réels et non
  résolus (pas de doublon détecté), donc DEFER motivé et non REJECT.
- **236 lignes `kitten_clicker`** (Lot 5) et **26 lignes factory `proof.*`/`probe.*`**
  (Lot 6) — voir raisons détaillées ci-dessus.
- **`lesson.asset.chest_exige_declaration_variantes`** — `ratification.statut: EN_ATTENTE`
  dans le fichier source lui-même ; commande d'application déjà écrite dans le fichier
  (`python -m scripts.forge.kb_proposal --apply ...`) mais NON exécutée ici, geste Pierre.
- **32 lignes `breakout_v2`** (Lot 2) — à vérifier une seconde fois avant tout archivage :
  les 4 occurrences par slug correspondent à des `run_id` distincts et légitimes.

## § Rejets en masse (REJECT/ARCHIVE)

- **1140 lignes `forge_bible_proposals.jsonl` / snake** (Lot 1) — doublons d'émission,
  6 décisions utiles à conserver, geste décrit ci-dessus.
- **18 `lesson:forge.*` de `planning_PROPOSED.yaml`** — croisement fait avec
  `knowledge_base/proposals/*.yaml` : les 18 identifiants (`forge.architecture_check_before_human_escalation`,
  `forge.broken_loop_repair_not_report`, `forge.diagnosis_is_not_workflow_end`,
  `forge.entrypoint_is_undeclared_invariant`, `forge.escalation_costs_avoid_default_route`,
  `forge.forge_oracle_convention_undocumented`, `forge.hardcoded_expected_state_breaks_on_growth`,
  `forge.instrument_assumes_instead_of_reads`, `forge.kb_humangate_to_controlled_autonomy`,
  `forge.mutation_survivor_equivalence_requires_mechanical_proof`,
  `forge.new_proof_needs_declared_executor`, `forge.oracle_fail_vs_not_measured_marker`,
  `forge.preflight_oracle_registration`, `forge.reuse_tracking_oracle_dead_since_inception`,
  `forge.run_status_not_liveness_proof`, `forge.test_green_via_wrong_causal_path`,
  `forge.timeout_greenfield_by_profile`, `forge.wiremap_concept_reuse_requalification`) sont
  **déjà `status: APPLIQUEE`** dans `knowledge_base/proposals/*.yaml` (18/18 vérifiés,
  correspondance exacte des noms de fichier). Les proposer à nouveau comme tâches de
  planning `EN_ATTENTE` serait un doublon de travail déjà fait. Geste Pierre : ne pas
  promouvoir ces 18 lignes vers `studio_brain/planning/planning.yaml` ; si Observer les
  régénère à chaque run, c'est le même défaut de fond que le Lot 1 (journal qui ne sait pas
  qu'un item est résolu ailleurs) et mérite un signalement séparé.

---

## § Ce que je n'ai pas pu vérifier

- Les 26 lignes factory `proof.*`/`probe.*` (Lot 6) : je n'ai pas trouvé de trace écrite de
  ratification pour elles individuellement (seul `bot.solvability` en porte une dans le
  fichier source lui-même via `review_status`). Je ne peux pas dire si elles ont été
  ratifiées ailleurs (ex. commit direct au registre sans mise à jour du champ
  `review_status`) sans creuser `scripts/forge/pending_review.mjs` en exécution — hors
  périmètre lecture-seule assigné.
- Les 7 drifts « roadmap » + 5 « documentation » cités par `planning:P4-doctrine-vs-realite`
  ne sont listés que par leur résumé agrégé dans `planning.yaml` ; le détail des 12 items
  individuels n'a pas été localisé dans le périmètre de fichiers assigné à cette mission.

---

software_verdict: OK
evidence_verdict: MECHANICAL_VALIDATION_ONLY
claim_verdict: NO_CLAIM_ALLOWED
