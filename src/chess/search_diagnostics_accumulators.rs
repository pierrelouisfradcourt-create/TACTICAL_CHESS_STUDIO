use crate::chess::search_diagnostics::{
    BranchingDiagnostics, DepthSnapshot, RuntimeCostDiagnostics, SearchPlyTrace,
};
use crate::chess::search_mirror_ordering::MirrorOrderingDiagnostics;
use crate::engine::engine::{SearchMoveProfile, SearchNullMoveProfile, SearchUndoProfile};

#[derive(Default)]
pub(crate) struct SearchInstrumentation {
    pub(crate) counters: SearchCountersAcc,
    pub(crate) runtime: RuntimeCostDiagnostics,
    pub(crate) mirror_ordering: MirrorOrderingDiagnostics,
    pub(crate) branching: BranchingAcc,
}

#[derive(Default)]
pub(crate) struct SearchCountersAcc {
    pub(crate) nodes: u64,
    pub(crate) quiescence_nodes: u64,
    pub(crate) tt_hits: u64,
    pub(crate) tt_cutoffs: u64,
    pub(crate) null_move_attempts: u64,
    pub(crate) null_move_cutoffs: u64,
    pub(crate) beta_cutoffs: u64,
    pub(crate) killer_cutoffs: u64,
    pub(crate) tt_move_order_hits: u64,
    pub(crate) countermove_order_hits: u64,
    pub(crate) lmr_reductions: u64,
    pub(crate) check_extensions: u64,
    pub(crate) pv_researches: u64,
    pub(crate) aspiration_retries: u64,
    pub(crate) pv_changes: u64,
}

#[derive(Clone, Default)]
pub(crate) struct DepthSnapshotAcc {
    pub(crate) depth: i32,
    pub(crate) score: i32,
    pub(crate) nodes: u64,
}

#[derive(Default)]
pub(crate) struct BranchingAcc {
    pub(crate) max_branching: usize,
    pub(crate) branching_total: u64,
    pub(crate) branching_samples: u64,
    pub(crate) max_depth: usize,
    pub(crate) per_ply: Vec<PlyTraceAcc>,
    pub(crate) depth_snapshots: Vec<DepthSnapshotAcc>,
    pub(crate) nodes_per_root_move: Vec<u64>,
}

#[derive(Clone, Default)]
pub(crate) struct PlyTraceAcc {
    pub(crate) legal_moves: usize,
    pub(crate) depth: i32,
    pub(crate) nodes: u64,
    pub(crate) quiescence_nodes: u64,
}

impl SearchInstrumentation {
    pub(crate) fn record_node(&mut self, ply: usize, depth: i32) {
        self.counters.nodes += 1;
        self.branching.max_depth = self.branching.max_depth.max(ply);
        let trace = self.branching.trace_mut(ply);
        trace.nodes += 1;
        trace.depth = trace.depth.max(depth);
    }

    pub(crate) fn record_quiescence_node(&mut self, ply: usize) {
        self.counters.quiescence_nodes += 1;
        self.branching.max_depth = self.branching.max_depth.max(ply);
        self.branching.trace_mut(ply).quiescence_nodes += 1;
    }

    pub(crate) fn record_branching(&mut self, ply: usize, depth: i32, legal_moves: usize) {
        self.branching.max_branching = self.branching.max_branching.max(legal_moves);
        self.branching.branching_total += legal_moves as u64;
        self.branching.branching_samples += 1;
        let trace = self.branching.trace_mut(ply);
        trace.legal_moves = trace.legal_moves.max(legal_moves);
        trace.depth = trace.depth.max(depth);
    }

    pub(crate) fn record_move_simulation(&mut self, profile: SearchMoveProfile) {
        self.runtime.move_simulations += 1;
        self.runtime.move_simulation_nanos += profile.total_nanos;
        self.runtime.move_snapshot_nanos += profile.snapshot_nanos;
        self.runtime.move_apply_nanos += profile.apply_nanos;
        self.runtime.move_repetition_nanos += profile.repetition_nanos;
        self.runtime.capture_snapshots += profile.captured_snapshot as u64;
        self.runtime.rook_snapshots += profile.rook_snapshot as u64;
    }

    pub(crate) fn record_move_undo(&mut self, profile: SearchUndoProfile) {
        self.runtime.move_undos += 1;
        self.runtime.move_undo_nanos += profile.total_nanos;
        self.runtime.move_undo_repetition_nanos += profile.repetition_nanos;
        self.runtime.move_restore_nanos += profile.restore_nanos;
    }

    pub(crate) fn record_null_move_simulation(&mut self, profile: SearchNullMoveProfile) {
        self.runtime.null_move_simulations += 1;
        self.runtime.null_move_simulation_nanos += profile.total_nanos;
    }

    pub(crate) fn record_null_move_undo(&mut self, profile: SearchNullMoveProfile) {
        self.runtime.null_move_undos += 1;
        self.runtime.null_move_undo_nanos += profile.total_nanos;
    }
}

impl BranchingAcc {
    pub(crate) fn trace_mut(&mut self, ply: usize) -> &mut PlyTraceAcc {
        if self.per_ply.len() <= ply {
            self.per_ply.resize_with(ply + 1, PlyTraceAcc::default);
        }
        &mut self.per_ply[ply]
    }

    pub(crate) fn push_depth_snapshot(&mut self, depth: i32, score: i32, nodes: u64) {
        self.depth_snapshots.push(DepthSnapshotAcc { depth, score, nodes });
    }

    pub(crate) fn set_root_node_delta(&mut self, idx: usize, delta: u64) {
        if self.nodes_per_root_move.len() <= idx {
            self.nodes_per_root_move.resize(idx + 1, 0);
        }
        self.nodes_per_root_move[idx] = delta;
    }

    pub(crate) fn into_diagnostics(self) -> BranchingDiagnostics {
        let avg_branching = if self.branching_samples == 0 {
            0.0
        } else {
            self.branching_total as f64 / self.branching_samples as f64
        };
        let traces = self
            .per_ply
            .into_iter()
            .enumerate()
            .filter(|(_, trace)| {
                trace.legal_moves > 0 || trace.nodes > 0 || trace.quiescence_nodes > 0
            })
            .map(|(ply, trace)| SearchPlyTrace {
                ply,
                legal_moves: trace.legal_moves,
                depth: trace.depth,
                nodes: trace.nodes,
                quiescence_nodes: trace.quiescence_nodes,
            })
            .collect();
        let depth_snapshots = self
            .depth_snapshots
            .into_iter()
            .map(|s| DepthSnapshot { depth: s.depth, score: s.score, nodes: s.nodes })
            .collect();

        BranchingDiagnostics {
            max_branching: self.max_branching,
            avg_branching,
            max_depth: self.max_depth,
            traces,
            depth_snapshots,
            nodes_per_root_move: self.nodes_per_root_move,
        }
    }
}
