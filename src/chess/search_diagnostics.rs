use crate::chess::search_mirror_ordering::MirrorOrderingDiagnostics;
use crate::chess::transition_analysis::TransitionAnalysis;
use crate::engine::action::action::Action;

#[allow(dead_code)]
#[derive(Clone, Debug)]
pub struct SearchCounters {
    pub nodes: u64,
    pub quiescence_nodes: u64,
    pub tt_hits: u64,
    pub tt_cutoffs: u64,
    pub null_move_attempts: u64,
    pub null_move_cutoffs: u64,
    pub beta_cutoffs: u64,
    pub killer_cutoffs: u64,
    pub tt_move_order_hits: u64,
    pub countermove_order_hits: u64,
    pub lmr_reductions: u64,
    pub check_extensions: u64,
    pub pv_researches: u64,
    pub aspiration_retries: u64,
    pub pv_changes: u64,
}

#[allow(dead_code)]
#[derive(Clone, Debug)]
pub struct DepthSnapshot {
    pub depth: i32,
    pub score: i32,
    pub nodes: u64,
}

#[allow(dead_code)]
#[derive(Clone, Debug)]
pub struct RootAlternative {
    pub action: Action,
    pub search_score: i32,
    pub heuristic_score: i32,
    pub policy_score: i32,
    pub decision_score: i32,
    pub transition_analysis: TransitionAnalysis,
}

#[allow(dead_code)]
#[derive(Clone, Debug)]
pub struct OrderingQuality {
    pub legal_move_count: usize,
    pub fully_evaluated_moves: usize,
    pub cutoff_index: Option<usize>,
    pub best_move_initial_rank: usize,
    pub best_move_final_rank: usize,
    pub principal_move_changed: bool,
}

#[allow(dead_code)]
#[derive(Clone, Debug)]
pub struct DecisionMetrics {
    pub chosen_search_score: i32,
    pub chosen_heuristic_score: i32,
    pub chosen_policy_score: i32,
    pub chosen_decision_score: i32,
    pub chosen_transition_analysis: TransitionAnalysis,
    pub second_best_search_gap: Option<i32>,
    pub second_best_decision_gap: Option<i32>,
}

#[allow(dead_code)]
#[derive(Clone, Debug)]
pub struct RootSearchDiagnostics {
    pub counters: SearchCounters,
    pub runtime: RuntimeCostDiagnostics,
    pub mirror_ordering: MirrorOrderingDiagnostics,
    pub branching: BranchingDiagnostics,
    pub ordering: OrderingQuality,
    pub decision: DecisionMetrics,
    pub principal_alternatives: Vec<RootAlternative>,
    pub mate_in_one_selected: bool,
}

#[allow(dead_code)]
#[derive(Clone, Debug)]
pub struct SearchPlyTrace {
    pub ply: usize,
    pub legal_moves: usize,
    pub depth: i32,
    pub nodes: u64,
    pub quiescence_nodes: u64,
}

#[allow(dead_code)]
#[derive(Clone, Debug)]
pub struct BranchingDiagnostics {
    pub max_branching: usize,
    pub avg_branching: f64,
    pub max_depth: usize,
    pub traces: Vec<SearchPlyTrace>,
    pub depth_snapshots: Vec<DepthSnapshot>,
    pub nodes_per_root_move: Vec<u64>,
}

#[allow(dead_code)]
#[derive(Clone, Debug, Default)]
pub struct RuntimeCostDiagnostics {
    pub move_simulations: u64,
    pub move_undos: u64,
    pub null_move_simulations: u64,
    pub null_move_undos: u64,
    pub capture_snapshots: u64,
    pub rook_snapshots: u64,
    pub move_simulation_nanos: u64,
    pub move_undo_nanos: u64,
    pub move_snapshot_nanos: u64,
    pub move_apply_nanos: u64,
    pub move_repetition_nanos: u64,
    pub move_undo_repetition_nanos: u64,
    pub move_restore_nanos: u64,
    pub null_move_simulation_nanos: u64,
    pub null_move_undo_nanos: u64,
}
