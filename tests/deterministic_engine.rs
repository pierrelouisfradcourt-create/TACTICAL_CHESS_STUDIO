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

use chess::fen::engine_from_fen;
use chess::piece_kind::ChessPieceKind;
use chess::uci::action_key;
use engine::action::action::Action;
use engine::engine::Engine;
use engine::entity::unit::{Position, UnitId};
use std::collections::HashSet;

fn position(square: &str) -> Position {
    let bytes = square.as_bytes();
    Position {
        x: (bytes[0] - b'a') as u32,
        y: (bytes[1] - b'1') as u32,
    }
}

fn unit_id_at(engine: &Engine, square: &str) -> UnitId {
    engine
        .board
        .occupant(position(square))
        .unwrap_or_else(|| panic!("expected unit at {square}"))
}

fn legal_action_keys(engine: &Engine, player: u32) -> Vec<String> {
    engine
        .legal_actions(player)
        .iter()
        .map(|action| action_key(action, &engine.units))
        .collect()
}

fn assert_unique_action_keys(keys: &[String], label: &str) {
    let unique = keys.iter().collect::<HashSet<_>>();

    assert_eq!(
        unique.len(),
        keys.len(),
        "duplicate action_key values for {label}: {keys:?}"
    );
}

fn action_for_uci(engine: &Engine, player: u32, uci: &str) -> Action {
    engine
        .legal_actions(player)
        .into_iter()
        .find(|action| action_key(action, &engine.units).as_str() == uci)
        .unwrap_or_else(|| panic!("expected legal move {uci}"))
}

struct LegalActionCase {
    label: &'static str,
    fen: &'static str,
    player: u32,
}

fn legal_action_stability_cases() -> Vec<LegalActionCase> {
    vec![
        LegalActionCase {
            label: "quiet development",
            fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            player: 1,
        },
        LegalActionCase {
            label: "capture-rich tactical",
            fen: "r3k2r/1p3pp1/2n5/3pP3/3P4/2N2N2/PPP2PPP/R3K2R w KQkq d6 8 12",
            player: 1,
        },
        LegalActionCase {
            label: "castling available",
            fen: "4k3/8/8/8/8/8/8/R3K2R w KQ - 7 4",
            player: 1,
        },
        LegalActionCase {
            label: "promotion available",
            fen: "1k6/P7/8/8/8/8/4P3/4K3 w - - 0 1",
            player: 1,
        },
        LegalActionCase {
            label: "en passant available",
            fen: "7k/8/8/3pP3/8/8/8/4K3 w - d6 12 31",
            player: 1,
        },
    ]
}

#[derive(Debug, PartialEq)]
struct EngineSnapshot {
    fen: String,
    current_player: u32,
    turn_index: u32,
    repetition_counts: Vec<(String, u32)>,
    en_passant_target: Option<Position>,
    halfmove_clock: u32,
    white_can_castle_kingside: bool,
    white_can_castle_queenside: bool,
    black_can_castle_kingside: bool,
    black_can_castle_queenside: bool,
    action_log_len: usize,
    board_occupants: Vec<(u32, u32, Option<UnitId>)>,
    units: Vec<(
        UnitId,
        u32,
        ChessPieceKind,
        Position,
        String,
        i32,
        i32,
        bool,
        i32,
        i32,
        i32,
        u32,
    )>,
}

impl EngineSnapshot {
    fn capture(engine: &Engine) -> Self {
        let mut repetition_counts = engine
            .repetition_counts
            .iter()
            .map(|(key, count)| (key.clone(), *count))
            .collect::<Vec<_>>();
        repetition_counts.sort();

        let mut board_occupants = Vec::new();
        for y in 0..engine.board.height {
            for x in 0..engine.board.width {
                board_occupants.push((x, y, engine.board.occupant(Position { x, y })));
            }
        }

        let mut units = engine
            .units
            .values()
            .map(|unit| {
                (
                    unit.id,
                    unit.owner,
                    unit.kind,
                    unit.position,
                    unit.template_name.clone(),
                    unit.hp,
                    unit.power_shot_cd,
                    unit.has_moved,
                    unit.stats.attack,
                    unit.stats.defense,
                    unit.stats.armor,
                    unit.stats.range,
                )
            })
            .collect::<Vec<_>>();
        units.sort_by_key(|unit| unit.0);

        Self {
            fen: engine.to_fen(),
            current_player: engine.turn_manager.current_player,
            turn_index: engine.turn_manager.turn_index,
            repetition_counts,
            en_passant_target: engine.en_passant_target,
            halfmove_clock: engine.halfmove_clock,
            white_can_castle_kingside: engine.white_can_castle_kingside,
            white_can_castle_queenside: engine.white_can_castle_queenside,
            black_can_castle_kingside: engine.black_can_castle_kingside,
            black_can_castle_queenside: engine.black_can_castle_queenside,
            action_log_len: engine.action_log.len(),
            board_occupants,
            units,
        }
    }
}

#[test]
fn repeated_legal_actions_calls_return_identical_action_key_order_on_same_engine() {
    let engine = engine_from_fen("r3k2r/1p3pp1/2n5/3pP3/3P4/2N2N2/PPP2PPP/R3K2R w KQkq d6 8 12")
        .expect("valid FEN for repeated legal action ordering");
    let first_keys = legal_action_keys(&engine, 1);

    for attempt in 0..8 {
        assert_eq!(
            legal_action_keys(&engine, 1),
            first_keys,
            "legal action ordering changed on repeated call {attempt}"
        );
    }
}

#[test]
fn legal_actions_are_returned_in_sorted_stable_action_key_order_across_categories() {
    for case in legal_action_stability_cases() {
        let engine = engine_from_fen(case.fen).unwrap_or_else(|err| {
            panic!(
                "valid FEN for legal action stability category {}: {err}",
                case.label
            )
        });
        let keys = legal_action_keys(&engine, case.player);
        let mut sorted_keys = keys.clone();
        sorted_keys.sort();

        assert_eq!(
            keys, sorted_keys,
            "legal actions were not sorted for {}",
            case.label
        );
        assert_eq!(
            legal_action_keys(&engine, case.player),
            keys,
            "legal action ordering was not stable for {}",
            case.label
        );
    }
}

#[test]
fn action_key_values_are_unique_within_legal_actions_across_categories() {
    for case in legal_action_stability_cases() {
        let engine = engine_from_fen(case.fen).unwrap_or_else(|err| {
            panic!(
                "valid FEN for action_key uniqueness category {}: {err}",
                case.label
            )
        });
        let keys = legal_action_keys(&engine, case.player);

        assert_unique_action_keys(&keys, case.label);
    }
}

#[test]
fn promotion_action_keys_preserve_distinct_promotion_suffixes() {
    let engine = engine_from_fen("1k6/P7/8/8/8/8/4P3/4K3 w - - 0 1")
        .expect("valid promotion identity position");
    let keys = legal_action_keys(&engine, 1);
    let promotion_keys = ["a7a8q", "a7a8r", "a7a8b", "a7a8n"];

    assert_unique_action_keys(&keys, "promotion available");
    for key in promotion_keys {
        assert!(
            keys.contains(&key.to_string()),
            "expected promotion action_key {key}"
        );
    }
}

#[test]
fn castling_action_keys_are_distinguishable_from_normal_king_moves() {
    let engine = engine_from_fen("4k3/8/8/8/8/8/8/R3K2R w KQ - 7 4")
        .expect("valid castling identity position");
    let keys = legal_action_keys(&engine, 1);

    assert_unique_action_keys(&keys, "castling available");
    assert!(keys.contains(&"e1g1".to_string()));
    assert!(keys.contains(&"e1c1".to_string()));
    assert!(keys.contains(&"e1f1".to_string()));
    assert!(keys.contains(&"e1d1".to_string()));
}

#[test]
fn en_passant_action_key_is_uci_like_and_unique_among_legal_actions() {
    let engine = engine_from_fen("7k/8/8/3pP3/8/8/8/4K3 w - d6 12 31")
        .expect("valid en passant identity position");
    let keys = legal_action_keys(&engine, 1);
    let en_passant_key = "e5d6".to_string();

    assert_unique_action_keys(&keys, "en passant available");
    assert_eq!(
        keys.iter().filter(|key| *key == &en_passant_key).count(),
        1,
        "expected one en passant action_key"
    );
    assert!(keys.contains(&en_passant_key));
    assert_eq!(en_passant_key.len(), 4);
    assert!(en_passant_key.chars().all(|ch| ch.is_ascii_alphanumeric()));
}

#[test]
fn repeated_legal_action_generation_does_not_introduce_duplicate_action_keys() {
    for case in legal_action_stability_cases() {
        let engine = engine_from_fen(case.fen).unwrap_or_else(|err| {
            panic!(
                "valid FEN for repeated action_key uniqueness category {}: {err}",
                case.label
            )
        });

        for attempt in 0..8 {
            let keys = legal_action_keys(&engine, case.player);
            assert_unique_action_keys(&keys, case.label);
            assert!(
                !keys.is_empty(),
                "expected legal actions for {} on repeated generation {attempt}",
                case.label
            );
        }
    }
}

#[test]
fn legal_action_keys_are_stable_after_simulate_undo_round_trip() {
    let mut engine =
        engine_from_fen("r3k2r/1p3pp1/2n5/3pP3/3P4/2N2N2/PPP2PPP/R3K2R w KQkq d6 8 12")
            .expect("valid FEN for legal ordering round trip");
    let player = 1;
    let before_keys = legal_action_keys(&engine, player);
    let before_snapshot = EngineSnapshot::capture(&engine);
    let action = action_for_uci(&engine, player, "e5d6");

    let undo = engine
        .simulate_action_for_search(player, &action)
        .expect("legal en passant move should simulate");
    assert_ne!(legal_action_keys(&engine, 2), before_keys);

    engine.undo_action_for_search(undo);

    assert_eq!(EngineSnapshot::capture(&engine), before_snapshot);
    assert_eq!(legal_action_keys(&engine, player), before_keys);
}

#[test]
fn action_key_investigation_documents_current_uci_identity() {
    let engine = engine_from_fen("1k6/P7/8/8/8/8/4P3/4K3 w - - 0 1")
        .expect("valid action identity investigation position");
    let keys = legal_action_keys(&engine, 1);

    // Current identity is only the UCI-like action_key string; no production ActionId exists yet.
    assert!(keys.contains(&"a7a8q".to_string()));
    assert!(keys.contains(&"a7a8r".to_string()));
    assert!(keys.contains(&"a7a8b".to_string()));
    assert!(keys.contains(&"a7a8n".to_string()));
    assert!(keys.contains(&"e2e3".to_string()));
}

#[test]
fn simulate_action_for_search_restores_state_for_en_passant_capture() {
    let mut engine = engine_from_fen("7k/8/8/3pP3/8/8/8/4K3 w - d6 12 31")
        .expect("valid FEN for en passant restore test");
    let player = 1;
    let moving_unit_id = unit_id_at(&engine, "e5");
    let captured_unit_id = unit_id_at(&engine, "d5");
    let before = EngineSnapshot::capture(&engine);

    let action = action_for_uci(&engine, player, "e5d6");
    let undo = engine
        .simulate_action_for_search(player, &action)
        .expect("legal en passant capture should simulate");

    assert_eq!(engine.board.occupant(position("e5")), None);
    assert_eq!(engine.board.occupant(position("d5")), None);
    assert_eq!(engine.board.occupant(position("d6")), Some(moving_unit_id));
    assert!(!engine.units.contains_key(&captured_unit_id));
    assert_eq!(engine.en_passant_target, None);
    assert_eq!(engine.halfmove_clock, 0);

    engine.undo_action_for_search(undo);

    assert_eq!(EngineSnapshot::capture(&engine), before);
}

#[test]
fn simulate_action_for_search_restores_state_for_quiet_non_capture_move() {
    let mut engine = engine_from_fen("7k/8/8/8/8/8/8/4K1N1 w - - 17 5")
        .expect("valid FEN for quiet restore test");
    let player = 1;
    let moving_unit_id = unit_id_at(&engine, "g1");
    let before = EngineSnapshot::capture(&engine);

    let action = action_for_uci(&engine, player, "g1f3");
    let undo = engine
        .simulate_action_for_search(player, &action)
        .expect("legal quiet move should simulate");

    assert_eq!(engine.board.occupant(position("g1")), None);
    assert_eq!(engine.board.occupant(position("f3")), Some(moving_unit_id));
    assert_eq!(engine.units.len(), before.units.len());
    assert_eq!(engine.en_passant_target, None);
    assert_eq!(engine.halfmove_clock, before.halfmove_clock + 1);

    engine.undo_action_for_search(undo);

    assert_eq!(EngineSnapshot::capture(&engine), before);
}

#[test]
fn simulate_action_for_search_restores_state_for_normal_capture_move() {
    let mut engine = engine_from_fen("7k/8/8/8/8/3p4/4P3/4K3 w - - 17 5")
        .expect("valid FEN for normal capture restore test");
    let player = 1;
    let moving_unit_id = unit_id_at(&engine, "e2");
    let captured_unit_id = unit_id_at(&engine, "d3");
    let before = EngineSnapshot::capture(&engine);

    let action = action_for_uci(&engine, player, "e2d3");
    let undo = engine
        .simulate_action_for_search(player, &action)
        .expect("legal normal capture should simulate");

    assert_eq!(engine.board.occupant(position("e2")), None);
    assert_eq!(engine.board.occupant(position("d3")), Some(moving_unit_id));
    assert!(!engine.units.contains_key(&captured_unit_id));
    assert_eq!(engine.en_passant_target, None);
    assert_eq!(engine.halfmove_clock, 0);

    engine.undo_action_for_search(undo);

    assert_eq!(EngineSnapshot::capture(&engine), before);
    assert_eq!(engine.board.occupant(position("e2")), Some(moving_unit_id));
    assert_eq!(
        engine.board.occupant(position("d3")),
        Some(captured_unit_id)
    );
}

#[test]
fn simulate_action_for_search_restores_state_for_kingside_castling_move() {
    let mut engine = engine_from_fen("4k3/8/8/8/8/8/8/R3K2R w KQ - 7 4")
        .expect("valid FEN for kingside castling restore test");
    let player = 1;
    let king_id = unit_id_at(&engine, "e1");
    let rook_id = unit_id_at(&engine, "h1");
    let before = EngineSnapshot::capture(&engine);

    let action = action_for_uci(&engine, player, "e1g1");
    let undo = engine
        .simulate_action_for_search(player, &action)
        .expect("legal kingside castling should simulate");

    assert_eq!(engine.board.occupant(position("e1")), None);
    assert_eq!(engine.board.occupant(position("h1")), None);
    assert_eq!(engine.board.occupant(position("g1")), Some(king_id));
    assert_eq!(engine.board.occupant(position("f1")), Some(rook_id));
    assert!(!engine.white_can_castle_kingside);
    assert!(!engine.white_can_castle_queenside);
    assert_eq!(engine.halfmove_clock, before.halfmove_clock + 1);

    engine.undo_action_for_search(undo);

    assert_eq!(EngineSnapshot::capture(&engine), before);
}

#[test]
fn simulate_action_for_search_restores_state_for_queenside_castling_move() {
    let mut engine = engine_from_fen("4k3/8/8/8/8/8/8/R3K2R w KQ - 7 4")
        .expect("valid FEN for queenside castling restore test");
    let player = 1;
    let king_id = unit_id_at(&engine, "e1");
    let rook_id = unit_id_at(&engine, "a1");
    let before = EngineSnapshot::capture(&engine);

    let action = action_for_uci(&engine, player, "e1c1");
    let undo = engine
        .simulate_action_for_search(player, &action)
        .expect("legal queenside castling should simulate");

    assert_eq!(engine.board.occupant(position("e1")), None);
    assert_eq!(engine.board.occupant(position("a1")), None);
    assert_eq!(engine.board.occupant(position("c1")), Some(king_id));
    assert_eq!(engine.board.occupant(position("d1")), Some(rook_id));
    assert!(!engine.white_can_castle_kingside);
    assert!(!engine.white_can_castle_queenside);
    assert_eq!(engine.halfmove_clock, before.halfmove_clock + 1);

    engine.undo_action_for_search(undo);

    assert_eq!(EngineSnapshot::capture(&engine), before);
}

#[test]
fn simulate_action_for_search_restores_state_for_promotion_move() {
    let mut engine = engine_from_fen("1k6/P7/8/8/8/8/8/4K3 w - - 9 1")
        .expect("valid FEN for promotion restore test");
    let player = 1;
    let moving_unit_id = unit_id_at(&engine, "a7");
    let before = EngineSnapshot::capture(&engine);

    let action = action_for_uci(&engine, player, "a7a8n");
    let undo = engine
        .simulate_action_for_search(player, &action)
        .expect("legal promotion should simulate");

    assert_eq!(engine.board.occupant(position("a7")), None);
    assert_eq!(engine.board.occupant(position("a8")), Some(moving_unit_id));
    assert_eq!(
        engine.units.get(&moving_unit_id).map(|unit| unit.kind),
        Some(ChessPieceKind::Knight)
    );

    engine.undo_action_for_search(undo);

    assert_eq!(EngineSnapshot::capture(&engine), before);
    assert_eq!(
        engine.units.get(&moving_unit_id).map(|unit| unit.kind),
        Some(ChessPieceKind::Pawn)
    );
}

#[test]
fn null_move_simulate_undo_restores_engine_snapshot() {
    let mut engine =
        engine_from_fen("r3k2r/1p3pp1/2n5/3pP3/3P4/2N2N2/PPP2PPP/R3K2R w KQkq d6 8 12")
            .expect("valid FEN for null move restore test");
    let player = engine.turn_manager.current_player;
    let before = EngineSnapshot::capture(&engine);

    let undo = engine
        .simulate_null_move_for_search(player)
        .expect("null move should simulate for current player");

    assert_ne!(engine.turn_manager.current_player, before.current_player);
    assert_eq!(engine.turn_manager.turn_index, before.turn_index + 1);
    assert_eq!(engine.en_passant_target, None);
    assert_eq!(engine.halfmove_clock, before.halfmove_clock + 1);

    let _ = engine.undo_null_move_for_search(undo);

    assert_eq!(EngineSnapshot::capture(&engine), before);
}

#[test]
fn null_move_simulate_undo_preserves_repetition_counts() {
    let mut engine =
        engine_from_fen("r3k2r/1p3pp1/2n5/3pP3/3P4/2N2N2/PPP2PPP/R3K2R w KQkq d6 8 12")
            .expect("valid FEN for null move repetition count test");
    let player = engine.turn_manager.current_player;
    let before_counts = engine.repetition_counts.clone();

    let undo = engine
        .simulate_null_move_for_search(player)
        .expect("null move should simulate for current player");
    assert_eq!(engine.repetition_counts, before_counts);

    let _ = engine.undo_null_move_for_search(undo);
    assert_eq!(engine.repetition_counts, before_counts);
}

#[test]
fn simulate_undo_restores_repetition_counts_when_fen_after_already_seen() {
    let mut engine = engine_from_fen("7k/8/8/8/8/8/4P3/4K3 w - - 0 1")
        .expect("valid FEN for repeated fen-after test");
    let player = engine.turn_manager.current_player;
    let action = action_for_uci(&engine, player, "e2e3");

    let mut preview = engine.clone();
    let preview_undo = preview
        .simulate_action_for_search(player, &action)
        .expect("preview move should simulate");
    let fen_after = preview.to_fen();
    let _ = preview.undo_action_for_search(preview_undo);

    let seeded_count = 2;
    engine.repetition_counts.insert(fen_after.clone(), seeded_count);
    let before_counts = engine.repetition_counts.clone();

    let undo = engine
        .simulate_action_for_search(player, &action)
        .expect("test move should simulate");
    assert_eq!(
        engine.repetition_counts.get(&fen_after).copied(),
        Some(seeded_count + 1)
    );

    let _ = engine.undo_action_for_search(undo);
    assert_eq!(engine.repetition_counts, before_counts);
}
