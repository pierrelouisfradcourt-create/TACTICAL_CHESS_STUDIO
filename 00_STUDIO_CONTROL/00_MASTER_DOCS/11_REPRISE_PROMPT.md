# Reprise Prompt — Session suivante

Utilise ce fichier pour reprendre le projet après une interruption.

## Lire dans cet ordre

1. `00_STUDIO_CONTROL/00_MASTER_DOCS/00_VISION.md`
2. `00_STUDIO_CONTROL/00_MASTER_DOCS/01_ROADMAP.md`
3. `00_STUDIO_CONTROL/00_MASTER_DOCS/02_ROCKY.md`
4. `00_STUDIO_CONTROL/00_MASTER_DOCS/06_KNOWN_ISSUES.md`
5. `ml/coach.py`
6. `src/simulation/simulation_runner.rs` (bloc MOVE_DIAG)

## Sprint 2026-06-03 — ce qui a été fait

✅ IMP-010 CLOSED — SearchTraceSchema : pv_changes, DepthSnapshot, nodes_per_root_move (737ffa0, 5b8ba0c)
✅ IMP-025 CLOSED — Finales élémentaires KR vs K dans eval.rs (737ffa0)
✅ IMP-027 CLOSED — Outposts et cases faibles dans eval.rs (737ffa0)
✅ KI-25 CLOSED — FEN en passant : validation rang 3/6 dans fen.rs (5eb2459, 97bff6e)
✅ KI-15 CLOSED — terminal_score stale description résolue (5eb2459)
✅ Autopilot refactorisé — retrait complet Claude API, 100% Devstral local (078589d)
✅ Holdout datasets L1/L2/L3 créés (1 000 positions chacun)
✅ Scripts ML : bench_puzzles.py, build_holdout.py, sunfish.py, sunfish_vs_rocky.py, rebuild_levels_large.py
✅ Charters IMP-007/012-016/021/031/032/036 créés dans lab/chains/charters/
✅ HUMANGATE_DECISION_LOG.yaml créé dans lab/chains/
✅ FILE_ROUTING_MANIFEST.yaml — 5 orphelins routés (0 orphelins restants)
✅ BRAIN_REPORT_20260603.md, STUDIO_FULL_MAP.md, SYSTEM_MAP.md créés
✅ Docs master mises à jour (07_CURRENT_STATE, 00_NAVIGATION_INDEX, 11_REPRISE_PROMPT)

## Sprint 2026-06-02 — pour mémoire

✅ 14 IMP Rocky closées (PST, opening book, quiescence, SEE, sécurité roi, futility, etc.)
✅ Pool pipeline exécuté : pool_2400.jsonl (43.3M lignes, draw_rate=8.8%) + 4 datasets
✅ IMP-041 : play_fen historique coups pour répétition
✅ EloTable K=24 câblée (IMP-033/034/035)
✅ Draw structurel RÉSOLU (IMP-007/014)

## État actuel

✅ 17 IMP closées — moteur Rocky avec eval enrichie (PST, SEE, outposts, KR vs K, etc.)
✅ SearchTraceSchema complet — diagnostics search opérationnels
✅ Autopilot 100% Devstral local — plus de dépendance Claude API
✅ Holdout puzzles disponibles pour benchmark
⚠ ACTIVE_DATASET.txt pointe sur teacher_samples corrompu — HumanGate requis
⚠ pool_sf draw_rate=94% — SF depth 14 trop défensif, critère <30% non atteint
⏳ ELO post-17 IMP non mesuré (benchmark à relancer)
⏳ Checkpoint promotion — HumanGate requis

## Prochaine action recommandée

1. Rediriger `ACTIVE_DATASET.txt` vers pool_2400 ou dataset_a_rocky (HumanGate requis — IMP-008 FORBIDDEN lane).
2. Relancer benchmark puzzles + smoke pour mesurer ELO Rocky post-17 IMP.
3. Décider checkpoint à promouvoir depuis `lab/runs/` (HumanGate requis).

## Commandes de lancement coach

```powershell
$env:TCS_MINIMAX_DEPTH = "3"
$env:TCS_MOVE_TIME_MS  = "300"
cargo run --release -- simulate_chess960 518 3 2>&1 | Out-File rocky_debug.log -Encoding utf8
.\.venv312\Scripts\python.exe ml\coach.py --file rocky_debug.log
```

## Règle

Code > docs. Si un doc contredit le code, le code a raison.
