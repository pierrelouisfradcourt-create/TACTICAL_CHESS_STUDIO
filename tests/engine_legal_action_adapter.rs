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
use chess::legal_action_adapter::{
    action_id_from_action, action_mask_from_engine, legal_action_ids_from_engine,
    legal_actions_from_engine,
};
use chess::uci::action_key;
use engine::engine::Engine;
use engine::entity::unit::Position;
use std::collections::BTreeSet;
use tactical_chess_pure_lab::core::{
    duplicate_legal_action_ids, ActionId, ActionMaskHumanGateAuthorizationState,
    ActionMaskProvenance, HumanDecision, HumanGateAuthorization, HumanGateScope, LegalAction,
    ACTION_ID_VERSION, ACTION_MASK_VERSION, LEGAL_ACTION_VERSION,
};

struct LegalActionCase {
    label: &'static str,
    fen: &'static str,
    player: u32,
}

fn legal_action_cases() -> Vec<LegalActionCase> {
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
        LegalActionCase {
            label: "black castling available",
            fen: "r3k2r/8/8/8/8/8/8/4K3 b kq - 0 1",
            player: 2,
        },
        LegalActionCase {
            label: "black promotion available",
            fen: "4k3/8/8/8/8/8/7p/4K3 b - - 0 1",
            player: 2,
        },
        LegalActionCase {
            label: "black promotion capture available",
            fen: "4k3/8/8/8/8/8/6p1/4K2R b - - 0 1",
            player: 2,
        },
        LegalActionCase {
            label: "pinned piece constrained",
            fen: "4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1",
            player: 1,
        },
        LegalActionCase {
            label: "king safety constrained",
            fen: "4k3/8/8/8/8/8/5r2/4K3 w - - 0 1",
            player: 1,
        },
        LegalActionCase {
            label: "check evasion by block or capture",
            fen: "4r1k1/8/8/8/8/8/3B4/4K3 w - - 0 1",
            player: 1,
        },
        LegalActionCase {
            label: "check evasion by capture",
            fen: "4r1k1/2N5/8/8/8/8/8/4K3 w - - 0 1",
            player: 1,
        },
    ]
}

fn engine_action_keys(engine: &Engine, player: u32) -> Vec<String> {
    engine
        .legal_actions(player)
        .iter()
        .map(|action| action_key(action, &engine.units))
        .collect()
}

fn legal_action_keys(legal_actions: &[LegalAction]) -> Vec<String> {
    legal_actions
        .iter()
        .map(|legal_action| legal_action.action_key.clone())
        .collect()
}

fn string_slice(values: &[String]) -> Vec<&str> {
    values.iter().map(String::as_str).collect()
}

fn action_id_strings(action_ids: &[ActionId]) -> Vec<String> {
    action_ids
        .iter()
        .map(|action_id| action_id.as_str().to_string())
        .collect()
}

fn assert_legal_keys(case: &LegalActionCase, expected_present: &[&str], expected_absent: &[&str]) {
    let engine = engine_from_fen(case.fen)
        .unwrap_or_else(|err| panic!("valid FEN for {}: {err}", case.label));
    let legal_keys = legal_action_keys(&legal_actions_from_engine(&engine, case.player))
        .into_iter()
        .collect::<BTreeSet<_>>();

    for key in expected_present {
        assert!(
            legal_keys.contains(*key),
            "{} expected legal action key {}; observed {:?}",
            case.label,
            key,
            legal_keys
        );
    }

    for key in expected_absent {
        assert!(
            !legal_keys.contains(*key),
            "{} expected illegal action key {} to be absent; observed {:?}",
            case.label,
            key,
            legal_keys
        );
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct EngineAdapterSnapshot {
    fen: String,
    current_player: u32,
    turn_index: u32,
    en_passant_target: Option<Position>,
    halfmove_clock: u32,
    action_log_len: usize,
    repetition_counts: Vec<(u64, u32)>,
}

impl EngineAdapterSnapshot {
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
        }
    }
}

#[test]
fn adapter_legal_action_count_matches_engine_legal_action_count() {
    for case in legal_action_cases() {
        let engine = engine_from_fen(case.fen)
            .unwrap_or_else(|err| panic!("valid FEN for {}: {err}", case.label));
        let engine_count = engine.legal_actions(case.player).len();
        let adapted = legal_actions_from_engine(&engine, case.player);

        assert_eq!(
            adapted.len(),
            engine_count,
            "adapter count mismatch for {}",
            case.label
        );
    }
}

#[test]
fn adapter_action_key_sequence_matches_engine_action_key_sequence() {
    for case in legal_action_cases() {
        let engine = engine_from_fen(case.fen)
            .unwrap_or_else(|err| panic!("valid FEN for {}: {err}", case.label));
        let expected_keys = engine_action_keys(&engine, case.player);
        let adapted = legal_actions_from_engine(&engine, case.player);
        let adapted_keys = legal_action_keys(&adapted);

        assert_eq!(
            adapted_keys, expected_keys,
            "adapter action_key sequence mismatch for {}",
            case.label
        );
    }
}

#[test]
fn adapter_action_id_sequence_is_deterministic_across_fresh_engine_construction() {
    let fen = "r3k2r/1p3pp1/2n5/3pP3/3P4/2N2N2/PPP2PPP/R3K2R w KQkq d6 8 12";
    let expected_ids = {
        let engine =
            engine_from_fen(fen).expect("valid FEN for deterministic adapter action_id sequence");
        action_id_strings(&legal_action_ids_from_engine(&engine, 1))
    };

    for attempt in 0..8 {
        let engine =
            engine_from_fen(fen).expect("valid FEN for deterministic adapter action_id sequence");
        let observed_ids = action_id_strings(&legal_action_ids_from_engine(&engine, 1));
        assert_eq!(
            observed_ids, expected_ids,
            "adapter action_id ordering changed on fresh construction {attempt}"
        );
    }
}

#[test]
fn adapter_output_is_sorted_and_unique_for_engine_legal_actions() {
    for case in legal_action_cases() {
        let engine = engine_from_fen(case.fen)
            .unwrap_or_else(|err| panic!("valid FEN for {}: {err}", case.label));
        let adapted = legal_actions_from_engine(&engine, case.player);
        let keys = legal_action_keys(&adapted);
        let mut sorted = keys.clone();
        sorted.sort();

        assert_eq!(
            keys, sorted,
            "adapter keys are not sorted for {}",
            case.label
        );

        let duplicates = duplicate_legal_action_ids(&adapted);
        assert!(
            duplicates.is_empty(),
            "adapter generated duplicate ActionId values for {}: {:?}",
            case.label,
            action_id_strings(&duplicates)
        );
    }
}

#[test]
fn curated_standard_edge_case_keys_match_engine_legality() {
    let cases = [
        (
            LegalActionCase {
                label: "en passant curated",
                fen: "7k/8/8/3pP3/8/8/8/4K3 w - d6 12 31",
                player: 1,
            },
            vec!["e5d6"],
            vec![],
        ),
        (
            LegalActionCase {
                label: "black castling curated",
                fen: "r3k2r/8/8/8/8/8/8/4K3 b kq - 0 1",
                player: 2,
            },
            vec!["e8g8", "e8c8"],
            vec![],
        ),
        (
            LegalActionCase {
                label: "black promotion curated",
                fen: "4k3/8/8/8/8/8/7p/4K3 b - - 0 1",
                player: 2,
            },
            vec!["h2h1q", "h2h1r", "h2h1b", "h2h1n"],
            vec![],
        ),
        (
            LegalActionCase {
                label: "black promotion capture curated",
                fen: "4k3/8/8/8/8/8/6p1/4K2R b - - 0 1",
                player: 2,
            },
            vec!["g2h1q", "g2h1r", "g2h1b", "g2h1n"],
            vec![],
        ),
        (
            LegalActionCase {
                label: "pin curated",
                fen: "4r1k1/8/8/8/8/8/4R3/4K3 w - - 0 1",
                player: 1,
            },
            vec!["e2e3"],
            vec!["e2d2"],
        ),
        (
            LegalActionCase {
                label: "king safety curated",
                fen: "4k3/8/8/8/8/8/5r2/4K3 w - - 0 1",
                player: 1,
            },
            vec!["e1d1", "e1f2"],
            vec!["e1f1"],
        ),
        (
            LegalActionCase {
                label: "check evasion block capture curated",
                fen: "4r1k1/8/8/8/8/8/3B4/4K3 w - - 0 1",
                player: 1,
            },
            vec!["d2e3"],
            vec!["e1e2"],
        ),
        (
            LegalActionCase {
                label: "check evasion capture curated",
                fen: "4r1k1/2N5/8/8/8/8/8/4K3 w - - 0 1",
                player: 1,
            },
            vec!["c7e8"],
            vec!["c7d5"],
        ),
    ];

    for (case, expected_present, expected_absent) in cases {
        assert_legal_keys(&case, &expected_present, &expected_absent);
    }
}

#[test]
fn selected_action_maps_to_action_id_via_existing_action_key_canonicalization() {
    let engine = engine_from_fen("7k/8/8/8/8/3p4/4P3/4K2K w - - 17 5")
        .expect("valid FEN for selected action mapping");
    let selected_action = engine
        .legal_actions(1)
        .into_iter()
        .find(|action| action_key(action, &engine.units).as_str() == "e2d3")
        .expect("expected legal move e2d3");

    let mapped = action_id_from_action(&engine, &selected_action);
    let expected = LegalAction::from_action_key(&action_key(&selected_action, &engine.units));

    assert_eq!(mapped, expected.action_id);
}

#[test]
fn adapter_calls_do_not_mutate_engine_state() {
    let engine = engine_from_fen("r3k2r/1p3pp1/2n5/3pP3/3P4/2N2N2/PPP2PPP/R3K2R w KQkq d6 8 12")
        .expect("valid FEN for adapter no-mutation test");
    let player = 1;
    let before = EngineAdapterSnapshot::capture(&engine);
    let expected_keys = engine_action_keys(&engine, player);

    for _ in 0..8 {
        let adapted = legal_actions_from_engine(&engine, player);
        assert_eq!(legal_action_keys(&adapted), expected_keys);

        let adapted_ids = legal_action_ids_from_engine(&engine, player);
        assert_eq!(adapted_ids.len(), adapted.len());

        let selected_action = engine
            .legal_actions(player)
            .into_iter()
            .next()
            .expect("expected at least one legal action");
        let _selected_action_id = action_id_from_action(&engine, &selected_action);
    }

    let after = EngineAdapterSnapshot::capture(&engine);
    assert_eq!(after, before);
}

#[test]
fn action_mask_adapter_derives_mask_from_engine_legal_actions() {
    let engine = engine_from_fen("7k/8/8/8/8/8/4P3/4K1N1 w - - 0 1")
        .expect("valid FEN for action mask adapter derivation");
    let legal_actions = legal_actions_from_engine(&engine, 1);

    let mask = action_mask_from_engine(
        &engine,
        1,
        None::<fn(&str) -> Option<usize>>,
        Some("adapter-fixture".to_string()),
    )
    .expect("action mask should build from engine legal actions");

    assert_eq!(mask.legal_action_keys(), legal_action_keys(&legal_actions));
    assert_eq!(
        action_id_strings(mask.legal_action_ids()),
        action_id_strings(&legal_action_ids_from_engine(&engine, 1))
    );
    assert_eq!(mask.move_vocab_fingerprint(), Some("adapter-fixture"));
}

#[test]
fn action_mask_adapter_preserves_engine_legal_action_ordering() {
    let engine = engine_from_fen("r3k2r/1p3pp1/2n5/3pP3/3P4/2N2N2/PPP2PPP/R3K2R w KQkq d6 8 12")
        .expect("valid FEN for action mask adapter ordering");
    let expected_keys = engine_action_keys(&engine, 1);

    let mask = action_mask_from_engine(&engine, 1, None::<fn(&str) -> Option<usize>>, None)
        .expect("action mask should build from engine legal actions");

    assert_eq!(string_slice(mask.legal_action_keys()), expected_keys);
}

#[test]
fn action_mask_adapter_projection_callback_sets_policy_indices() {
    let engine = engine_from_fen("7k/8/8/8/8/8/4P3/4K1N1 w - - 0 1")
        .expect("valid FEN for action mask adapter projection");

    let mask = action_mask_from_engine(
        &engine,
        1,
        Some(|key: &str| match key {
            "e2e3" => Some(2),
            "g1f3" => Some(5),
            _ => None,
        }),
        None,
    )
    .expect("action mask should build with projection callback");

    let e2e3 = mask
        .legal_action_keys()
        .iter()
        .position(|key| key == "e2e3")
        .expect("expected e2e3 legal action");
    let g1f3 = mask
        .legal_action_keys()
        .iter()
        .position(|key| key == "g1f3")
        .expect("expected g1f3 legal action");

    assert_eq!(mask.policy_indices()[e2e3], Some(2));
    assert_eq!(mask.policy_indices()[g1f3], Some(5));
}

#[test]
fn action_mask_adapter_tracks_unprojected_legal_actions_without_policy_bits() {
    let engine = engine_from_fen("7k/8/8/8/8/8/4P3/4K1N1 w - - 0 1")
        .expect("valid FEN for action mask adapter unprojected actions");

    let mask = action_mask_from_engine(
        &engine,
        1,
        Some(|key: &str| (key == "e2e3").then_some(3)),
        None,
    )
    .expect("action mask should build with partial projection");

    let projected_count = mask
        .policy_indices()
        .iter()
        .filter(|policy_index| policy_index.is_some())
        .count();
    let bitvec = mask
        .to_policy_bitvec(8)
        .expect("policy bitvec should build for projected index");

    assert_eq!(projected_count, 1);
    assert_eq!(
        mask.unencodable_action_ids().len(),
        mask.legal_action_ids().len() - 1
    );
    assert_eq!(
        bitvec,
        vec![false, false, false, true, false, false, false, false]
    );
}

#[test]
fn action_mask_adapter_projects_promotion_qrbn_keys_distinctly() {
    let engine = engine_from_fen("1k6/P7/8/8/8/8/4P3/4K3 w - - 0 1")
        .expect("valid FEN for action mask adapter promotion projection");

    let mask = action_mask_from_engine(
        &engine,
        1,
        Some(|key: &str| match key {
            "a7a8q" => Some(10),
            "a7a8r" => Some(11),
            "a7a8b" => Some(12),
            "a7a8n" => Some(13),
            _ => None,
        }),
        None,
    )
    .expect("action mask should build for promotion projection");

    for (key, policy_index) in [
        ("a7a8q", Some(10)),
        ("a7a8r", Some(11)),
        ("a7a8b", Some(12)),
        ("a7a8n", Some(13)),
    ] {
        let index = mask
            .legal_action_keys()
            .iter()
            .position(|candidate| candidate == key)
            .unwrap_or_else(|| panic!("expected promotion action key {key}"));
        assert_eq!(mask.policy_indices()[index], policy_index);
    }
}

#[test]
fn action_mask_adapter_projects_classical_castling_keys_distinctly() {
    let engine = engine_from_fen("4k3/8/8/8/8/8/8/R3K2R w KQ - 7 4")
        .expect("valid FEN for action mask adapter castling projection");

    let mask = action_mask_from_engine(
        &engine,
        1,
        Some(|key: &str| match key {
            "e1g1" => Some(20),
            "e1c1" => Some(21),
            _ => None,
        }),
        None,
    )
    .expect("action mask should build for castling projection");

    for (key, policy_index) in [("e1g1", Some(20)), ("e1c1", Some(21))] {
        let index = mask
            .legal_action_keys()
            .iter()
            .position(|candidate| candidate == key)
            .unwrap_or_else(|| panic!("expected castling action key {key}"));
        assert_eq!(mask.policy_indices()[index], policy_index);
    }
}

#[test]
fn action_mask_adapter_without_projection_does_not_activate_dataset_training_or_chess960() {
    let engine = engine_from_fen("7k/8/8/8/8/8/4P3/4K1N1 w - - 0 1")
        .expect("valid FEN for action mask adapter passive behavior");

    let mask = action_mask_from_engine(&engine, 1, None::<fn(&str) -> Option<usize>>, None)
        .expect("action mask should build without projection");

    assert!(mask.policy_indices().iter().all(Option::is_none));
    assert_eq!(
        mask.unencodable_action_ids().len(),
        mask.legal_action_ids().len()
    );
    assert!(!mask.is_fully_projectable());
}

#[test]
fn engine_action_mask_provenance_is_passive_observation_metadata_only() {
    let engine = engine_from_fen("7k/8/8/8/8/8/4P3/4K1N1 w - - 0 1")
        .expect("valid FEN for passive provenance gate");
    let player = 1;
    let before = EngineAdapterSnapshot::capture(&engine);
    let legal_actions = legal_actions_from_engine(&engine, player);
    let legal_keys = legal_action_keys(&legal_actions);

    let mask = action_mask_from_engine(
        &engine,
        player,
        Some(|key: &str| match key {
            "e2e3" => Some(2),
            "g1f3" => Some(5),
            _ => None,
        }),
        Some("engine-adapter-passive-fingerprint".to_string()),
    )
    .expect("engine-derived action mask should build");
    let authorization = HumanGateAuthorization::new(
        true,
        HumanDecision::ApproveForObservationOnly,
        "observation-only parity gate",
        "operator-console",
        "trace-engine-mask-passive-001",
        "2026-05-18T00:00:00Z",
        HumanGateScope::Observation,
        Some("review-packet-engine-mask-passive-001".to_string()),
        None,
        Some("metadata only; no dataset admission".to_string()),
        None,
    )
    .expect("observation-only HumanGate authorization should build");
    let provenance = ActionMaskProvenance::from_action_mask_with_human_gate_state(
        &mask,
        "rust_engine_legal_actions",
        "classical_ruleset_v0",
        "classical",
        ActionMaskHumanGateAuthorizationState::PassiveAuthorization(authorization),
        None,
    )
    .expect("passive action mask provenance should build");

    assert_eq!(mask.legal_action_keys(), legal_keys.as_slice());
    assert_eq!(
        action_id_strings(mask.legal_action_ids()),
        action_id_strings(&legal_action_ids_from_engine(&engine, player))
    );
    assert_eq!(provenance.action_id_version(), ACTION_ID_VERSION);
    assert_eq!(provenance.legal_action_version(), LEGAL_ACTION_VERSION);
    assert_eq!(provenance.action_mask_version(), ACTION_MASK_VERSION);
    assert_eq!(provenance.legal_move_source(), "rust_engine_legal_actions");
    assert_eq!(provenance.ruleset(), "classical_ruleset_v0");
    assert_eq!(provenance.variant(), "classical");
    assert!(provenance.human_gate_authorization_state().is_passive());
    assert!(provenance.blocks_dataset_use());

    let bitvec = mask
        .to_policy_bitvec(8)
        .expect("policy bitvec should build for passive projected availability");
    assert_eq!(
        bitvec,
        vec![false, false, true, false, false, true, false, false]
    );
    assert_eq!(EngineAdapterSnapshot::capture(&engine), before);
}

#[test]
fn rust_generated_standard_fixture_keys_are_engine_legal_actions() {
    let fixture_text =
        std::fs::read_to_string("tests/fixtures/standard_move_vocab_cross_fixture.json")
            .expect("standard move vocab fixture should be readable");
    let fixture: serde_json::Value = serde_json::from_str(&fixture_text)
        .expect("standard move vocab fixture should be valid JSON");

    let metadata = fixture
        .get("metadata")
        .and_then(serde_json::Value::as_object)
        .expect("fixture metadata object");
    assert_eq!(
        metadata
            .get("legal_action_version")
            .and_then(serde_json::Value::as_str),
        Some(LEGAL_ACTION_VERSION)
    );
    assert_eq!(
        metadata
            .get("action_mask_version")
            .and_then(serde_json::Value::as_str),
        Some(ACTION_MASK_VERSION)
    );
    assert_eq!(
        metadata.get("chess960").and_then(serde_json::Value::as_str),
        Some("EXCLUDED_BLOCKED")
    );
    assert_eq!(
        metadata
            .get("dataset_label_readiness")
            .and_then(serde_json::Value::as_str),
        Some("BLOCKED")
    );

    let samples = fixture
        .get("rust_generated_standard_samples")
        .and_then(serde_json::Value::as_array)
        .expect("fixture rust-generated samples array");
    assert!(samples.len() >= 5);

    for sample in samples {
        let label = sample
            .get("label")
            .and_then(serde_json::Value::as_str)
            .expect("sample label");
        let fen = sample
            .get("fen")
            .and_then(serde_json::Value::as_str)
            .unwrap_or_else(|| panic!("sample {label} should carry a FEN"));
        let player = sample
            .get("player")
            .and_then(serde_json::Value::as_u64)
            .unwrap_or_else(|| panic!("sample {label} should carry a player"))
            as u32;
        assert_eq!(
            sample
                .get("representative_not_exhaustive")
                .and_then(serde_json::Value::as_bool),
            Some(true),
            "sample {label} should be marked representative-only"
        );

        let engine = engine_from_fen(fen)
            .unwrap_or_else(|err| panic!("valid fixture FEN for {label}: {err}"));
        let legal_keys = legal_action_keys(&legal_actions_from_engine(&engine, player))
            .into_iter()
            .collect::<BTreeSet<_>>();

        let expected_keys = sample
            .get("expected_keys")
            .and_then(serde_json::Value::as_array)
            .unwrap_or_else(|| panic!("sample {label} should carry expected keys"));
        assert!(
            !expected_keys.is_empty(),
            "sample {label} should not be empty"
        );

        for row in expected_keys {
            let key = row
                .get("uci")
                .and_then(serde_json::Value::as_str)
                .unwrap_or_else(|| panic!("sample {label} key row should carry uci"));
            assert!(
                legal_keys.contains(key),
                "sample {label} expected Rust-generated legal action key {key}; observed {:?}",
                legal_keys
            );
        }

        if let Some(absent_keys) = sample
            .get("expected_absent_keys")
            .and_then(serde_json::Value::as_array)
        {
            for row in absent_keys {
                let key = row
                    .get("uci")
                    .and_then(serde_json::Value::as_str)
                    .unwrap_or_else(|| panic!("sample {label} absent key row should carry uci"));
                assert!(
                    !legal_keys.contains(key),
                    "sample {label} expected illegal Rust action key {key} to be absent; observed {:?}",
                    legal_keys
                );
            }
        }
    }
}
