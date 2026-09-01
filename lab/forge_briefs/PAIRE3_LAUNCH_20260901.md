# PAIRE 3 — LANCEMENT (GO Pierre 2026-09-01)

- HEAD des lancements : `fcf56b5e` (pré-enregistrement inclus), master, parallèle strict.
- Pré-vol au GO : `pair_preflight --run-tests` exit 0 (frais) · LM Studio UP: True ·
  oracles `p3_alpha`/`p3_beta` enregistrés · `games/p3_*` créés.
- Assignation opérationnelle (PAIRE3_SEALED_assignment.json) : p3_alpha = D3 · p3_beta = L3.
- Commande (par bras) : `run_real.py --project p3_<bras> --run-id p3_<bras>-20260901-run1
  --profile full_content --src-root games/p3_<bras> --is-game --step-timeout 3600
  --task-s9 <tâche d'exécution paire-2, slug adapté>` — brief canonique auto
  (lab/forge_briefs/<projet>/project_brief.yaml, gate fail-closed).
- Contrôle A1 post-s0 PAR BRAS : lecture du reçu `yaml_check` (PASS requis) + sha256 du
  charter.yaml consigné — jamais l'existence seule.
- Aveugle M7 : NON tiré ici ; descellement interdit avant M7.

claim_verdict: NO_CLAIM_ALLOWED
