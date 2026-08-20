mod agents {
    pub mod neural_agent {
        use crate::engine::action::action::Action;
        use crate::engine::engine::Engine;
        use crate::engine::entity::unit::PlayerId;

        pub struct NeuralAgent;

        impl NeuralAgent {
            pub fn new() -> Self {
                Self
            }

            pub fn select_action(
                &self,
                _engine: &Engine,
                _player: PlayerId,
                actions: &[Action],
            ) -> Action {
                actions.first().cloned().unwrap_or(Action::Pass)
            }
        }
    }
}

#[path = "../src/chess/mod.rs"]
mod chess;
#[path = "../src/engine/mod.rs"]
mod engine;
#[path = "../src/prototype/mod.rs"]
mod prototype;

use chess::decision::{
    choose_best_action_with_trace_and_context, DecisionMode, SelectionAuthority,
};
use chess::fen::engine_from_fen;
use chess::legal_action_adapter::{action_id_from_action, legal_action_ids_from_engine};
use chess::search::search_root;
use chess::search_backend_adapter::PassiveSearchBackendAdapter;
use engine::engine::Engine;
use engine::entity::unit::Position;
use tactical_chess_pure_lab::ai::{SearchBackend, SearchBudget, SearchRequest};
use tactical_chess_pure_lab::core::ActionId;

#[derive(Debug, Clone, PartialEq, Eq)]
struct EngineSnapshot {
    fen: String,
    current_player: u32,
    turn_index: u32,
    en_passant_target: Option<Position>,
    halfmove_clock: u32,
    action_log_len: usize,
    repetition_counts: Vec<(u64, u32)>,
    white_can_castle_kingside: bool,
    white_can_castle_queenside: bool,
    black_can_castle_kingside: bool,
    black_can_castle_queenside: bool,
}

impl EngineSnapshot {
    fn capture(engine: &Engine) -> Self {
        let mut repetition_counts = engine
            .repetition_counts
            .iter()
            .map(|(key, count)| (*key, *count))
            .collect::<Vec<_>>();
        repetition_counts.sort();

        Self {
            fen: engine.to_fen(),
            current_player: engine.turn_manager.current_player,
            turn_index: engine.turn_manager.turn_index,
            en_passant_target: engine.en_passant_target,
            halfmove_clock: engine.halfmove_clock,
            action_log_len: engine.action_log.len(),
            repetition_counts,
            white_can_castle_kingside: engine.white_can_castle_kingside,
            white_can_castle_queenside: engine.white_can_castle_queenside,
            black_can_castle_kingside: engine.black_can_castle_kingside,
            black_can_castle_queenside: engine.black_can_castle_queenside,
        }
    }
}

fn controlled_root_boundary_engine() -> Engine {
    engine_from_fen("6k1/8/8/8/3q4/8/8/3RK3 w - - 0 1").expect("valid controlled root FEN")
}

fn controlled_single_legal_non_mate_engine() -> Engine {
    engine_from_fen("7k/8/8/8/8/8/1q6/K7 w - - 0 1")
        .expect("valid single-legal controlled root FEN")
}

fn sample_request(engine: &Engine, player: u32) -> SearchRequest {
    SearchRequest {
        state_key: engine.to_fen(),
        legal_action_ids: legal_action_ids_from_engine(engine, player),
        budget: SearchBudget {
            max_depth: Some(4),
            max_nodes: Some(50_000),
            max_time_ms: Some(1_000),
        },
    }
}

fn read_repo_file(path: &str) -> String {
    let root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    std::fs::read_to_string(root.join(path))
        .unwrap_or_else(|err| panic!("expected to read {path}: {err}"))
}

#[test]
fn adapter_compiles_against_existing_search_backend_trait() {
    let engine = controlled_root_boundary_engine();
    let player = engine.turn_manager.current_player;
    let request = sample_request(&engine, player);

    let mut backend: Box<dyn SearchBackend + '_> =
        Box::new(PassiveSearchBackendAdapter::new(&engine, player));
    let result = backend.search(&request);

    let selected = result
        .selected_action_id
        .as_ref()
        .expect("adapter should select a legal action id for controlled position");
    assert!(request.legal_action_ids.contains(selected));
}

#[test]
fn adapter_delegates_to_current_root_search_behavior() {
    let engine = controlled_single_legal_non_mate_engine();
    let player = engine.turn_manager.current_player;
    let direct = search_root(&engine, player).expect("search_root should return a move");
    let expected_id = action_id_from_action(&engine, &direct.best_action);
    let request = sample_request(&engine, player);

    let mut backend = PassiveSearchBackendAdapter::new(&engine, player);
    let result = backend.search(&request);

    assert_eq!(result.selected_action_id, Some(expected_id.clone()));
    assert_eq!(
        result.searched_nodes,
        Some(direct.diagnostics.counters.nodes)
    );
    assert_eq!(
        result.reached_depth,
        u32::try_from(direct.completed_depth).ok()
    );
    assert_eq!(result.fallback_reason, None);
}

#[test]
fn adapter_exposes_root_search_result_for_decision_trace_preservation() {
    let engine = controlled_single_legal_non_mate_engine();
    let player = engine.turn_manager.current_player;
    let direct = search_root(&engine, player).expect("search_root should return a move");
    let expected_id = action_id_from_action(&engine, &direct.best_action);

    let mut backend = PassiveSearchBackendAdapter::new(&engine, player);
    let root_search = backend
        .search_root_with_context(None)
        .expect("adapter should preserve RootSearchResult");
    let observed_id = action_id_from_action(&engine, &root_search.best_action);

    assert_eq!(observed_id, expected_id);
    assert_eq!(root_search.best_score, direct.best_score);
    assert_eq!(root_search.completed_depth, direct.completed_depth);
    assert_eq!(root_search.heuristic_score, direct.heuristic_score);
    assert_eq!(root_search.policy_score, direct.policy_score);
    assert_eq!(root_search.decision_score, direct.decision_score);
    assert_eq!(
        root_search.diagnostics.counters.nodes,
        direct.diagnostics.counters.nodes
    );
}

#[test]
fn adapter_result_action_id_matches_direct_selected_action_canonicalization() {
    let engine = controlled_root_boundary_engine();
    let player = engine.turn_manager.current_player;
    let direct = search_root(&engine, player).expect("search_root should return a move");
    let expected_id = action_id_from_action(&engine, &direct.best_action);
    let expected_key = chess::uci::action_key(&direct.best_action, &engine.units);
    let request = sample_request(&engine, player);

    let mut backend = PassiveSearchBackendAdapter::new(&engine, player);
    let result = backend.search(&request);

    assert_eq!(result.selected_action_id, Some(expected_id.clone()));
    assert_eq!(expected_id, ActionId::from_normalized_key(expected_key));
}

#[test]
fn adapter_result_is_deterministic_across_fresh_equivalent_engine_construction() {
    let expected = {
        let engine = controlled_single_legal_non_mate_engine();
        let player = engine.turn_manager.current_player;
        let request = sample_request(&engine, player);
        let mut backend = PassiveSearchBackendAdapter::new(&engine, player);
        backend.search(&request).selected_action_id
    };

    for attempt in 0..8 {
        let engine = controlled_single_legal_non_mate_engine();
        let player = engine.turn_manager.current_player;
        let request = sample_request(&engine, player);
        let mut backend = PassiveSearchBackendAdapter::new(&engine, player);
        let observed = backend.search(&request).selected_action_id;

        assert_eq!(
            observed, expected,
            "adapter selected_action_id changed on fresh construction {attempt}"
        );
    }
}

#[test]
fn adapter_does_not_mutate_source_engine_state() {
    let engine = controlled_root_boundary_engine();
    let player = engine.turn_manager.current_player;
    let before = EngineSnapshot::capture(&engine);

    for _ in 0..8 {
        let request = sample_request(&engine, player);
        let mut backend = PassiveSearchBackendAdapter::new(&engine, player);
        let _ = backend.search(&request);
    }

    let after = EngineSnapshot::capture(&engine);
    assert_eq!(after, before);
}

#[test]
fn decision_traces_keep_root_search_result_when_using_adapter_boundary() {
    let engine = controlled_single_legal_non_mate_engine();
    let player = engine.turn_manager.current_player;

    for mode in [
        DecisionMode::Minimax,
        DecisionMode::Heuristic,
        DecisionMode::Hybrid,
        DecisionMode::Neural,
    ] {
        let trace = choose_best_action_with_trace_and_context(&engine, player, mode, None)
            .expect("Search-authority mode should return a trace");
        let root_search = trace
            .root_search
            .as_ref()
            .expect("Search-authority trace should retain RootSearchResult");

        assert_eq!(trace.mode, mode);
        assert_eq!(trace.selection_authority, SelectionAuthority::Search);
        assert!(trace.used_search);
        assert_eq!(
            action_id_from_action(&engine, &trace.selected_action),
            action_id_from_action(&engine, &root_search.best_action)
        );
    }
}

#[test]
fn random_trace_remains_fallback_without_root_search_result() {
    let engine = controlled_single_legal_non_mate_engine();
    let player = engine.turn_manager.current_player;

    let trace =
        choose_best_action_with_trace_and_context(&engine, player, DecisionMode::Random, None)
            .expect("Random mode should return a trace");

    assert_eq!(trace.mode, DecisionMode::Random);
    assert_eq!(trace.selection_authority, SelectionAuthority::Fallback);
    assert!(!trace.used_search);
    assert!(trace.root_search.is_none());
}

#[test]
fn search_backend_adapter_is_active_boundary_in_decision_layer() {
    let decision_source = read_repo_file("src/chess/decision.rs");

    assert!(
        decision_source.contains("search_backend_adapter::search_root_via_adapter"),
        "decision route should import the adapter-backed search boundary"
    );
    assert!(
        decision_source.contains("search_root_via_adapter(engine, player, context)"),
        "decision route should call the adapter-backed search boundary"
    );
    assert!(
        !decision_source.contains("search_root_with_context(engine, player, context)"),
        "decision route should not call raw search_root_with_context directly"
    );
    assert!(
        !decision_source.contains("DecisionController"),
        "decision route should not activate DecisionController"
    );
    assert!(
        !decision_source.contains("ActionMask"),
        "decision route should not activate ActionMask authority"
    );
    assert!(
        !decision_source.contains("NeuralAgent"),
        "decision route should not call NeuralAgent directly"
    );
}
