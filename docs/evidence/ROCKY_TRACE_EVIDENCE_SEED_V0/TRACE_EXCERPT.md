# TRACE_EXCERPT

## Source

These lines are selected raw lines from `RAW_OUTPUT.txt`. `RAW_OUTPUT.txt` remains the truth source.

## Why These Lines Were Selected

The selected lines show the command target, root decision trace-like rows, selected move, runtime/search counters, and final JSON status. No context is invented beyond what appears in `RAW_OUTPUT.txt`.

## Selected Raw Lines

```text
     Running `target\debug\tactical_chess_pure_lab.exe observe_fen "6k1/8/8/8/3q4/8/8/3RK3 w - - 0 1" --depth 1`
REPLY_SCAN|move=d1b1|enemy_best=d4b4|penalty=475
REPLY_SCAN|move=d1c1|enemy_best=d4d2|penalty=1875
ROOT_DECISION_SIGNAL|move=d1c1|candidate_idx=7|search_score=660|search_rank=2|worst_case=-792|worst_case_sampled=1|worst_case_rank=1|transition_score=8633|transition_rank=2|final_rank=1|inside_gate=1|primary_dynamic=quiet|secondary_dynamics=|capture_exchange=0|capture_safety=0|tactical_score=-36|repetition_signal=0|resulting_state_value=-656
ROOT_DECISION_AUDIT|move=d1c1|worst_case=-792|worst_case_sampled=1|search_score=660|transition_score=8633|selected_rank=1|search_best_rank=2
ROOT_DECISION_SIGNAL|move=d1b1|candidate_idx=6|search_score=660|search_rank=1|worst_case=-796|worst_case_sampled=1|worst_case_rank=2|transition_score=10033|transition_rank=1|final_rank=2|inside_gate=1|primary_dynamic=quiet|secondary_dynamics=|capture_exchange=0|capture_safety=0|tactical_score=-36|repetition_signal=0|resulting_state_value=-660
ROOT_DECISION_AUDIT|move=d1b1|worst_case=-796|worst_case_sampled=1|search_score=660|transition_score=10033|selected_rank=2|search_best_rank=1
ROOT_DECISION_SELECTED|selected=d1c1|search_best=d1b1|worst_case_best=d1c1|transition_best=d1b1|final_selected=d1c1|expected_best_if_available=none
MOVE_DIAG|source=search|phase=endgame|band=winning|plan=create_threats|selected=d1c1|material=-400|own_moves=8|enemy_moves=32|repetition_pressure=0|passed_pawn_distance=8|no_progress_pressure=0|score=-132|enemy_moves_delta=0|passed_pawn_delta=0|repeat=1
SEARCH_RUNTIME_DIAG|nodes=10|q_nodes=19|move_sims=243|move_undos=243|move_total_ns=1772600|simulate_ns=1141900|undo_ns=630700|snapshot_ns=116100|apply_ns=218300|repetition_ns=1025600|restore_ns=271300|capture_snapshots=15|rook_snapshots=0|null_sims=0|null_undos=0|null_total_ns=0
SEARCH_TRACE|ply=0|legal_moves=8|depth=1|nodes=0|q_nodes=0
SEARCH_TRACE|ply=1|legal_moves=0|depth=0|nodes=10|q_nodes=10
SEARCH_SUMMARY|max_branching=8|avg_branching=8.00|max_depth=3|nodes_total=10
{"best_score":660,"candidate_count":3,"candidate_diagnostics_note":null,"candidates":[{"decision_score":16360,"heuristic_score":16420,"move":"d1d4","policy_score":0,"search_score":-1038},{"decision_score":10033,"heuristic_score":40,"move":"d1b1","policy_score":0,"search_score":660},{"decision_score":8633,"heuristic_score":40,"move":"d1c1","policy_score":0,"search_score":660}],"completed_depth":1,"error":null,"fen":"6k1/8/8/8/3q4/8/8/3RK3 w - - 0 1","legal_moves_count":8,"score_gap":0,"search_score":660,"second_best_score":660,"selected_move":"d1c1","selection_source":"search_root","side_to_move":"w","status":"ok"}
```
