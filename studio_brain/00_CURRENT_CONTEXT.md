# Contexte courant TCS
*(Handoff. Historique : `studio_brain/journal/context-archive-2026-08-04-forge-v2-sessions.md`
→ `2026-07-31_00_CURRENT_CONTEXT_archive.md` → `2026-07-30_...`.)*

## Phase CLOSE : Forge V2 / Knowledge Runtime V1 (2026-08-04 → 2026-08-05)

**Ce que la Forge sait faire maintenant, mécaniquement et sans LLM :**

```
root_problem → candidate_selector → execution_binding → mcts_selector
             → agent_factory (PLAN_ONLY | --execute) → execution_proof → MATCH/MISMATCH
```

- **3 MATCH** sur 3 familles d exécution : `repair_runtime`/adapter · composition `M-ws6`
  (2 maillons, 1 repris sous empreinte vérifiée) · `deterministic`/entrypoint.
- `--execute` ouvert sous **5 conditions** : HumanGate par exécution · scope obligatoire ·
  MISMATCH = arrêt (aucun retry) · aucune boucle · aucun pouvoir de dispatch ajouté.
- **Vocabulaire des layers** : `scripts/forge/layers.json`, source unique, 13 zones, LUE par
  `check_mutation_registry` (validation) et `candidate_selector` (4e priorité de départage).
  Effet mesuré : ORACLE_FALSE_NEGATIVE passe de 4 ex aequo à 3.
- **Knowledge Runtime V1** : `caller` + `matched_ids` + `consumed_refs` +
  `proof_of_consumption` ∈ {MEASURED, NOT_WIRED, NOT_MEASURED}. Mesuré réel :
  `games/kb_tactics` = MEASURED, `consumed_refs=["sys-reachability"]`.
- **Politique de preuve (Option C)** : les bundles `lab/forge_evidence/*/` sont versionnés
  (122 fichiers), les flux append-only restent ignorés. Avant : 0/13 mutation exécutable sur
  un clone frais ; après : 4/13, `evidence_missing` 13 → 0.

**Commits** : `d37f51b` (V2, tag `forge-v2`) · `d90ffc0` (--execute) · `d8f8143` (Option C) ·
`901d1b5` (layers) · `8812a0c` (zone de décision) · `74f726e` (SEARCH_USAGE).

**Tests** : forge 717 (716 pass) · knowledge_base 150 (149 pass) · pytest 1404 pass.
Deux rouges **pré-existants**, vérifiés sur l arbre commité avant la phase :
`studio_selfaudit.test.mjs:177` (PATH Python) · `search.test.mjs` (mots vides).

### Ce qui reste faux, et n est pas maquillé
- `quality_not_proven: true` et `production_ready: false` **partout**. L oracle atteste la
  fermeture du défaut MESURÉ, jamais la qualité de ce qui est écrit.
- `root_problem.lesson_ids` **vide sur les 4 problèmes** : trois critères fondés sur la preuve
  donnent zéro association (les 18 leçons viennent de runs de JEU, les problèmes racines
  d expériences WORKER — deux univers de preuve disjoints). Le vide est l information.
- **2 des 14** `run-oracle.mjs` invoquent `reuse_ratio.mjs` (`kb_tactics`, `shmup_slice`, tous
  deux MEASURED) ; **12 ne le font pas**. *(Corrigé le 2026-08-05 : j avais écrit « aucun ».)*
- **8 layers sur 13** employées par aucune mutation : les 5 ajoutées **et 3 antérieures**
  (`s3-decompo`, `s4-archi-contract`, `s5-wiremap-contract`). *(Corrigé le 2026-08-05.)*
- `branching_factor = 1` sur les 4 problèmes racines → **aucune exploration MCTS justifiable**.

### Décisions en attente de Pierre
- `ROLE_REPAIR_RUNTIME_V2` : `repair_runtime` accepté SOUS CONDITION — conditions inscrites
  dans les 3 fichiers, mais la case « accepter/refuser/restreindre » de
  `AGENT_FACTORY_EXECUTE_V1_CONTRACT` reste ouverte.
- `ROOT_PROBLEM_LINK_PROPOSAL_V1` : laisser `lesson_ids` vide (recommandé) ou retenir des
  rapprochements de jugement.
- `SEARCH_LOG_POLICY_PROPOSAL_V1` : statu quo recommandé ; chantier « politique des 239
  `.jsonl` suivis (95,5 Mo) » non ouvert.

### Prochain chantier — recommandation
Fermer le `NOT_WIRED` des projets (`reuse_ratio` dans `run-oracle.mjs`) OU rouvrir la
production de jeux, qui alimenterait enfin les 5 layers aval vides. Dette complète :
`docs/forge/FORGE_V2_CLOSURE_REPORT_V1.md`.

## Impasses connues (ne pas re-buter dessus)
- Aucun mécanisme d'exclusion de lecture pour un builder (`read: dépôt entier`). · Confinement
  outils en défaut de format (`Bash(node:*)` vs `Bash`). · `run_real` n'a pas de coupe-circuit
  budget intra-run (contrôle entre runs uniquement). · qwen3.6 INTERDIT pour le JSON (thinking
  vide le content). · Godot headless ne rend pas de pixels (fenêtre GPU obligatoire — confirmé
  à nouveau sur Breakout, 3 volets render FAIL en headless, verts en capture GPU réelle). · Gel
  wiremap_frozen jamais posé pour Snake NI Breakout (profil standard_godot sans s5, garde F5d
  advisory seulement) — régime connu, non bloquant.
