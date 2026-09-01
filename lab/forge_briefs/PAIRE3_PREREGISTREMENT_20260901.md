# PAIRE 3 — PRÉ-ENREGISTREMENT (2026-09-01) — sas ouvert par GO Pierre, ZÉRO dépense LLM

Objectif : **première paire VALIDE** (compteur initial : 0). Protocole : RUN2_PROTOCOLE_V1.md
(ratifié) + règle verrouillée Pierre (identité de l'input normatif indépendante du verdict aval).
**Règle de sortie** : tant que les 10 items ne sont pas matérialisés/vérifiés/scellés — aucune
conception, aucun worldscan, aucun build, aucune dépense significative. Le GO suivant (lancement)
n'est présentable qu'après preuve complète.

## Les 10 items (état au 2026-09-01)

| # | Item | État | Preuve |
|---|---|---|---|
| 1 | Briefs D/L appariés et figés | **FAIT** | `p3_alpha/project_brief.yaml` (D3) · `p3_beta/project_brief.yaml` (L3) — gabarits p2 amendés strictement ; `check_project_brief` PASS raisons [] ×2 ; `project_brief_gate(full_content)` → None ×2 |
| 2 | `mesure: {tick_ms: 100, budget_ticks: 72000}` dans les DEUX | **FAIT** | champ validé par le schéma (C-c) et **opposable** : `check_measure_tick` contribuera au gate s10a des deux bras |
| 3 | Grammaire D v2 GELÉE | **FAIT** | `p3_alpha/structure_imposee_v2_FROZEN.yaml`, sha256 `2f1f44d517c0d885…` (copie conforme de la version ratifiée 2026-08-30, valeurs intouchées) |
| 4 | Tirage/assignation D/L scellé | **FAIT** | `PAIRE3_SEALED_assignment.json` (secrets.choice). Distinction gravée : assignation **OPÉRATIONNELLE** (connue de l'orchestrateur — nécessaire aux Briefs par bras) ≠ **aveugle M7** (tirage X/Y séparé, créé à l'analyse, DESCELLEMENT INTERDIT avant M7 — leçon paire 2) |
| 5 | Grille M1-M7 figée | **FAIT** | définitions = spec §métriques (citées) ; opérationnalisation = protocole V1 : masquage V2 outillé (`forge.m7_masking`, verify fail-closed) · M2a/M2b séparés (+ trace gm_worldscan→code) · M3 vs grammaire gelée (D) / contraintes effectivement fixées (L) · M7 deux temps ((a) post-conception sur product_snapshot+gm_worldscan masqués, (b) charters) · attribution d'origine {GM, grammaire, protocole, oracle, pipeline, design, orchestrateur} APRÈS les comptes |
| 6 | Fixtures p1/p2 = non-régression | **FAIT** | suite moteur encodant les findings : `test_r3_locus.py` + `test_micro_redeclaration.py` (findings 1-3, artefacts réels p1) · `test_charter_gate.py` (finding 7, sortie s0 réelle p2_beta) · `test_measure_tick.py` (finding 8) — toutes dans T0 et dans `pair_preflight --run-tests` |
| 7 | `pair_preflight` = gate bloquante vérifiée | **FAIT (frais)** | `python -m forge.pair_preflight --run-tests` → 3 checks OK + 28 tests verts + **exit 0** (2026-09-01) ; à RE-exécuter au GO de lancement, exit ≠ 0 = lancement interdit |
| 8 | Identité de l'input normatif vérifiable indépendamment | **FAIT (moteur + procédure)** | moteur : C-a/C-b — charter matérialisé = l'unique bloc passant `check_charter`, FAIL bloquant (commit 08fea292) ; procédure : contrôle A1 par bras = lecture du **reçu `yaml_check`** (jamais l'existence seule — faute paire 2 consignée) + sha256 du charter.yaml consigné au dossier de paire à s0 |
| 9 | Budget de référence | **ENREGISTRÉ** | ~1,7 M tokens/paire (mesuré paire 2 : D 886k + L 828k) ; le GO de lancement le confirme |
| 10 | Aucun descèlement avant M7 | **GRAVÉ** | s'applique à l'aveugle M7 (item 4) ; violation paire 2 (descellement prématuré orchestrateur) = leçon consignée, interdiction reprise ici |

## Conditions de lancement (pour mémoire — le GO reste distinct)

`pair_preflight --run-tests` exit 0 re-exécuté · LM Studio UP (s11 bloquant ×2) · oracles
`p3_alpha`/`p3_beta` enregistrés + `games/p3_*` créés (préparation au GO, pas avant) ·
lancement PARALLÈLE strict, même HEAD (consigné au GO) · contrôle A1-reçu post-s0 par bras ·
tripwire aux valeurs signatures D-EXCLUSIVES (leçon paire 2 : jamais des valeurs genre-canoniques).

Compteur : **0 paire valide**.
claim_verdict: NO_CLAIM_ALLOWED
