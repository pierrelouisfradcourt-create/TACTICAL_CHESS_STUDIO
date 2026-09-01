# PAIRE 4 — PRÉ-ENREGISTREMENT (2026-09-01) — GO Pierre, ZÉRO dépense LLM

Objectif : **première paire VALIDE** (compteur : 0). Protocole : RUN2_PROTOCOLE_V1.md +
règle verrouillée (identité de l'input normatif indépendante du verdict aval). Moteur au
lancement ⊇ sas P3-2 (`6740d971` : chemins wiremap normalisés, crash→HALT propre).
**Règle de sortie** : aucune conception/worldscan/build/dépense avant scellement complet ;
le GO suivant (lancement) n'est présentable qu'après preuve complète.

## Les 10 items

| # | Item | État | Preuve |
|---|---|---|---|
| 1 | Briefs D/L appariés et figés | **FAIT** | `p4_beta/project_brief.yaml` (**D4**, 69 l., sha `1d20c99eead4d4a1…`) · `p4_alpha/project_brief.yaml` (**L4**, sha `a263788d0cc9c187…`) — `check_project_brief` PASS [] ×2, `project_brief_gate(full_content)` None ×2 |
| 2 | `mesure: {tick_ms: 100, budget_ticks: 72000}` ×2 | **FAIT** | validé au schéma, opposable par `check_measure_tick` au gate s10a |
| 3 | Grammaire D v2 GELÉE | **FAIT** | `p4_beta/structure_imposee_v2_FROZEN.yaml`, sha256 `2f1f44d517c0d885…` (identique au gel P3 — copie conforme de la ratification 2026-08-30) |
| 4 | Tirage/assignation scellé | **FAIT** | `PAIRE4_SEALED_assignment.json` (secrets.choice) : **p4_beta = D4 · p4_alpha = L4** (inversé vs P3 — le tirage a réellement tiré). Assignation OPÉRATIONNELLE ≠ aveugle M7 (tirage X/Y séparé à l'analyse, descellement INTERDIT avant M7) |
| 5 | Grille M1-M7 figée | **FAIT** | inchangée depuis P3 (protocole V1 : masquage V2 outillé, M2a/M2b, M3 vs grammaire gelée (D)/contraintes fixées (L), M7 deux temps, attribution après comptes) |
| 6 | Fixtures p1/p2/p3 = non-régression | **FAIT (étendu)** | registre `pair_preflight._TESTS_PAIR_FIXTURES` désormais EXÉCUTÉ par `--run-tests` : `test_r3_locus` + `test_micro_redeclaration` (p1) + `test_charter_gate` (finding 7) + `test_measure_tick` (finding 8) + `test_mutation_path_repo_relative` (P3-2) — suite absente = préflight FAIL |
| 7 | `pair_preflight` gate bloquante | **FAIT (frais)** | `--run-tests` → 3 checks OK + **56 tests verts** (28 → 56 avec le registre étendu) + exit 0 (2026-09-01) ; à re-exécuter au GO de lancement |
| 8 | Identité de l'input normatif | **FAIT** | moteur C-a/C-b (`08fea292`) + procédure A1 par bras (lecture du reçu `yaml_check`, sha charter consigné) — exercée avec succès en P3 (×2, dont un refus réel re-spawné côté L3) |
| 9 | Budget de référence | **ENREGISTRÉ** | ~1,7 M tokens/paire (mesure paire 2) ; P3 interrompue ≈ 700k consignés |
| 10 | Aucun descèlement avant M7 | **GRAVÉ** | interdiction reprise, leçon paire 2 |

## Écarts trouvés et corrigés AVANT scellement (transparence)

Les gabarits de brief hérités portaient des résidus, détectés par ma contre-vérification :
- clause d'isolement du bras L n'excluant que `p2_alpha/p1_alpha` → étendue à
  `p4_beta/** p3_*/** p2_*/** p1_*/**` ; provenance `PAIRE2_SEALED…` → `PAIRE4_SEALED…` ;
- étiquettes `(L2)/(D2)` → `(L4)/(D4)`.
**Observation rétroactive P3 (consignée, rien modifié)** : les briefs P3 portaient les mêmes
résidus (isolement L3 n'excluant pas p2_beta, étiquettes (L2)/(D2)) — sans effet mesuré sur
P3 (aucun bras n'a atteint l'analyse), mais à compter parmi les scories de gabarit.

## Modification moteur incluse dans ce paquet (à la gate de commit)

`pair_preflight.py` : registre `_TESTS_PAIR_FIXTURES` (3 suites p2/p3) ajouté aux cibles de
`--run-tests` + refus nommé si une suite manque. C'est l'opérationnalisation de l'item 6 —
seule surface moteur touchée, T0 non affecté (les suites étaient déjà dans T0).

Compteur : **0 paire valide**.
claim_verdict: NO_CLAIM_ALLOWED
