# Reprise Prompt — Session suivante

Utilise ce fichier pour reprendre le projet après une interruption.

## Lire dans cet ordre

1. `00_STUDIO_CONTROL/00_MASTER_DOCS/00_VISION.md`
2. `00_STUDIO_CONTROL/00_MASTER_DOCS/01_ROADMAP.md`
3. `00_STUDIO_CONTROL/00_MASTER_DOCS/02_ROCKY.md`
4. `00_STUDIO_CONTROL/00_MASTER_DOCS/06_KNOWN_ISSUES.md`
5. `ml/coach.py`
6. `src/simulation/simulation_runner.rs` (bloc MOVE_DIAG)

## Sprint 2026-05-30 — ce qui a été fait

✅ Bug negamax + aspiration window pour les mats (6875b43)
✅ Nettoyage S-7 : select_root_move supprimé, argmax pur (90fe323)
✅ Zobrist hash pour la clé de répétition engine-side (f758ff4)
✅ Arc<str> pour Unit::template_name (f758ff4)
✅ Tri des coups légaux par tuple entier (f758ff4)
✅ Issues #16, #17, #18 fermées
✅ Issue #15 fermée — explosion combinatoire résolue (fd88b97)
  - maybe_log_move_weaknesses désactivée par défaut (TCS_WEAKNESS_LOG=1 pour opt-in)
  - best_capture_score remplacé par détection légère sans search_root
✅ Issue #23 fermée — build_root_diagnostics gatée derrière TCS_SEARCH_RUNTIME_DIAG (e141d16)
  - O(legal_moves) post-search éliminé en mode normal
  - build_root_diagnostics_summary_only ajoutée (O(1))
✅ Issue #26 fermée — transition_reply.rs trié par move_score avant take(max_replies) (6b85cda)
✅ Issue #2 — clone root conservé intentionnellement (9e17493)
  - Option B (&mut Engine) trop invasive : PassiveSearchBackendAdapter, API pub, cascade
  - HumanGate requis avant toute tentative future
  - Documenté dans 06_KNOWN_ISSUES.md
✅ MOVE_DIAG émis dans simulation_runner.rs avec FEN (fd88b97)
✅ Coach v0 opérationnel end-to-end — LM Studio génère explications en français
✅ Filtrage coups random dans coach.py (fd88b97)
✅ Docs mises à jour (83aaaf5)

## État actuel

✅ Coach v0 — pipeline complet opérationnel
✅ MOVE_DIAG contient : phase, band, selected, material, mobilité, FEN
✅ Search nettoyée : #23 et #26 résolus, overhead éliminé
⏳ Issue #2 — clone root, HumanGate requis, non urgent
⏳ Qualité explications LLM — à affiner (prompt, contexte)
⏳ Dataset promoted_pedagogy_pack.jsonl — bloqué Stockfish (P0 roadmap)

## Prochaine action recommandée

1. Installer Stockfish pour débloquer la génération de dataset (P0 roadmap).
2. Tester et affiner la qualité des explications coach avec la FEN.
3. Issue #2 (clone root) uniquement après HumanGate explicite.

## Commandes de lancement coach

```powershell
$env:TCS_MINIMAX_DEPTH = "3"
$env:TCS_MOVE_TIME_MS  = "300"
cargo run --release -- simulate_chess960 518 3 2>&1 | Out-File rocky_debug.log -Encoding utf8
.\.venv312\Scripts\python.exe ml\coach.py --file rocky_debug.log
```

## Règle

Code > docs. Si un doc contredit le code, le code a raison.
