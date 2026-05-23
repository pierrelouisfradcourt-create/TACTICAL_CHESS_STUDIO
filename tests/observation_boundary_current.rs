fn read_repo_file(path: &str) -> String {
    let root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    std::fs::read_to_string(root.join(path))
        .unwrap_or_else(|err| panic!("expected to read {path}: {err}"))
}

fn read_repo_sources_under(path: &str) -> String {
    fn visit(path: &std::path::Path, out: &mut String) {
        let entries = std::fs::read_dir(path)
            .unwrap_or_else(|err| panic!("expected to read {path:?}: {err}"));

        for entry in entries {
            let entry = entry.unwrap_or_else(|err| panic!("expected directory entry: {err}"));
            let path = entry.path();
            if path.is_dir() {
                visit(&path, out);
            } else if path.extension().is_some_and(|extension| extension == "rs") {
                out.push_str(
                    &std::fs::read_to_string(&path)
                        .unwrap_or_else(|err| panic!("expected to read {path:?}: {err}")),
                );
                out.push('\n');
            }
        }
    }

    let root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let mut out = String::new();
    visit(&root.join(path), &mut out);
    out
}

fn assert_contains_all(source: &str, needles: &[&str]) {
    for needle in needles {
        assert!(
            source.contains(needle),
            "expected source to contain stable boundary marker: {needle}"
        );
    }
}

fn assert_not_contains_any(source: &str, needles: &[&str], context: &str) {
    for needle in needles {
        assert!(
            !source.contains(needle),
            "{context} should not contain active boundary marker: {needle}"
        );
    }
}

fn count_occurrences(haystack: &str, needle: &str) -> usize {
    haystack.matches(needle).count()
}

#[test]
fn observation_view_and_encoder_exist_as_passive_contracts() {
    let observation_view = read_repo_file("src/core/observation_view.rs");
    let observation_encoder = read_repo_file("src/core/observation_encoder.rs");
    let architecture = read_repo_file("MASTER_DOCS/AAA_TACTICAL_CORE_ARCHITECTURE.md");

    assert_contains_all(
        &architecture,
        &[
            "## 12. Observation Boundary",
            "`ObservationView`",
            "`ObservationEncoder` outputs",
        ],
    );
    assert_contains_all(
        &observation_view,
        &[
            "pub struct ObservationView",
            "pub observation_id: String",
            "pub player_identity: Option<String>",
            "pub state_key: String",
            "pub legal_action_ids: Vec<ActionId>",
            "pub legal_action_count: usize",
            "pub dataset_admissibility: DatasetAdmissibility",
            "pub action_mask_authority: ActionMaskAuthority",
            "DatasetAdmissibility::RequiresHumanGate",
            "ActionMaskAuthority::NotAuthoritative",
        ],
    );
    assert_contains_all(
        &observation_encoder,
        &[
            "trait ObservationEncoder",
            "pub struct ObservationInputProvenance",
            "pub struct EncodedObservation",
            "pub fn passive(",
            "DatasetAdmissibility::RequiresHumanGate",
            "ActionMaskAuthority::NotAuthoritative",
            "ObservationEncoderRuntimeAuthority::PassiveOnly",
            "fn can_drive_runtime(&self) -> bool {",
        ],
    );
}

#[test]
fn tactical_env_and_env_observation_exist_as_passive_environment_boundary() {
    let tactical_env = read_repo_file("src/env/tactical_env.rs");
    let tactical_env_contract = read_repo_file("tests/tactical_env_contract.rs");

    assert_contains_all(
        &tactical_env,
        &[
            "pub struct EnvObservation",
            "pub state_key: String",
            "pub viewer: Option<String>",
            "pub trait TacticalEnv",
            "fn reset(&mut self, request: &EnvResetRequest) -> EnvObservation;",
            "fn legal_actions(&self) -> Vec<LegalAction>;",
            "fn step(&mut self, request: &EnvStepRequest) -> EnvStepResult;",
            "fn observation(&self) -> EnvObservation;",
            "fn is_done(&self) -> bool;",
        ],
    );
    assert_contains_all(
        &tactical_env_contract,
        &[
            "use tactical_chess_pure_lab::env::{",
            "EnvObservation, EnvResetRequest, EnvStepRequest, EnvStepResult, TacticalEnv,",
            "boundary_does_not_require_current_chess_runtime_modules",
        ],
    );
    assert_not_contains_any(
        &tactical_env,
        &[
            "Engine",
            "ActionMask",
            "ObservationView",
            "ObservationEncoder",
        ],
        "passive TacticalEnv boundary",
    );
}

#[test]
fn search_currently_consumes_engine_directly_and_calls_engine_legal_actions() {
    let search = read_repo_file("src/chess/search.rs");

    assert_contains_all(
        &search,
        &[
            "use crate::engine::engine::{",
            "set_search_runtime_profile_enabled, Engine,",
            "pub fn search_best_action(engine: &Engine, player: PlayerId) -> Option<Action>",
            "pub fn search_root(engine: &Engine, player: PlayerId) -> Option<RootSearchResult>",
            "pub(crate) fn search_root_with_context(",
            "engine: &Engine,",
            "fn search_root_in_place(",
            "engine: &mut Engine,",
            "let legal = engine.legal_actions(player);",
            "let legal = engine.legal_actions(to_move);",
        ],
    );
    assert!(
        count_occurrences(&search, "engine.legal_actions(") >= 4,
        "search should still call engine.legal_actions directly in active search code"
    );
    assert_not_contains_any(
        &search,
        &[
            "ObservationView",
            "ObservationEncoder",
            "ActionMask",
            "action_mask",
        ],
        "active search source",
    );
}

#[test]
fn neural_agent_currently_consumes_engine_and_converts_engine_to_fen_for_python() {
    let neural_agent = read_repo_file("src/agents/neural_agent.rs");

    assert_contains_all(
        &neural_agent,
        &[
            "use crate::engine::engine::Engine;",
            "fn query_python(&self, fen: &str, moves: &[String]) -> Result<PythonPrediction, String>",
            "pub fn select_action(&self, engine: &Engine, _player: u32, actions: &[Action]) -> Action",
            "let fen = engine.to_fen();",
            "let rerank_context = RerankContext::from_engine(engine);",
            "let action_moves = action_moves_from_legal_actions(engine, actions);",
            ".query_python(&fen, &moves)",
            "select_move_with_rerank(",
            "engine,",
            "&fen,",
        ],
    );
    assert_not_contains_any(
        &neural_agent,
        &["ObservationView", "ObservationEncoder"],
        "active NeuralAgent source",
    );
}

#[test]
fn neural_legal_helper_uses_uci_surface_not_native_legal_action_boundary() {
    let neural_legal = read_repo_file("src/agents/neural_legal.rs");

    assert_contains_all(
        &neural_legal,
        &[
            "use crate::chess::uci::action_to_uci;",
            "use crate::engine::action::action::Action;",
            "use crate::engine::engine::Engine;",
            "pub(crate) type LegalActionMove = (Action, String);",
            "pub(crate) fn action_moves_from_legal_actions(",
            "engine: &Engine,",
            "actions: &[Action],",
            "if let Some(mv) = action_to_uci(action, &engine.units) {",
            "pub(crate) fn uci_moves(action_moves: &[LegalActionMove]) -> Vec<String>",
            "pub(crate) fn is_legal_uci(legal_moves: &[String], uci_move: &str) -> bool",
            "pub(crate) fn selected_action_for_uci(",
        ],
    );
    assert_not_contains_any(
        &neural_legal,
        &[
            "use crate::core",
            "use tactical_chess_pure_lab::core",
            "ActionId",
            "ActionMask",
        ],
        "neural legal helper",
    );
}

#[test]
fn action_mask_remains_passive_and_not_search_authority() {
    let action_mask = read_repo_file("src/core/action_mask.rs");
    let legal_action_adapter = read_repo_file("src/chess/legal_action_adapter.rs");
    let search = read_repo_file("src/chess/search.rs");
    let decision_authority_test = read_repo_file("tests/decision_authority_boundary_current.rs");
    let protocol = read_repo_file("docs/evidence/ROCKY_OBSERVATION_PROTOCOL_V0.md");

    assert_contains_all(
        &action_mask,
        &[
            "pub struct ActionMask",
            "pub fn from_legal_actions<F>(",
            "pub fn to_policy_bitvec(&self, vocab_size: usize) -> Result<Vec<bool>, ActionMaskError>",
        ],
    );
    assert_contains_all(
        &legal_action_adapter,
        &[
            "pub fn action_mask_from_engine<F>(",
            "ActionMask::from_legal_actions(&legal_actions, project_policy_index, move_vocab_fingerprint)",
        ],
    );
    assert_contains_all(
        &decision_authority_test,
        &[
            "current_boundary_keeps_action_mask_out_of_active_search_authority",
            "!search_source.contains(\"ActionMask\")",
            "!search_source.contains(\"action_mask\")",
        ],
    );
    assert_contains_all(
        &protocol,
        &[
            "`ActionMask`: not authoritative in Rust",
            "`ActionMask` remains PASSIVE and is not authoritative in active search.",
            "Until ActionMask authority is explicitly decided and versioned, policy targets and training labels remain blocked.",
        ],
    );
    assert_not_contains_any(
        &search,
        &["ActionMask", "action_mask", "action_mask_from_engine"],
        "active search source",
    );
}

#[test]
fn selected_search_and_neural_moves_are_observations_not_dataset_labels() {
    let protocol = read_repo_file("docs/evidence/ROCKY_OBSERVATION_PROTOCOL_V0.md");

    assert_contains_all(
        &protocol,
        &[
            "Raw trace output is observation, not training truth.",
            "Selected move is not automatically a training label.",
            "Neural suggestion is not final decision authority.",
            "final_selected_move` | Preserve the move emitted by the observed run. | Observation of runtime output only. | Must not be treated as a training label.",
            "search_selected_move` | Preserve the move selected by search when separable. | Candidate future policy target only after gates and provenance checks. | Does not become policy truth without HumanGate and stable action contracts.",
            "search_best_move` | Preserve diagnostic search context. | Search-context evidence if directly visible. | Is not a training label unless explicitly promoted by HumanGate.",
            "neural_predicted_move` | Preserve neural proposal context. | Neural suggestion or proposal context. | Is not final authority or label truth.",
            "final selected move | UNSAFE_TRAINING_LABEL | Requires HumanGate, attribution, and stable action contracts.",
            "search selected move | POTENTIAL_POLICY_TARGET_AFTER_GATES | Requires HumanGate, search authority attribution, and stable action contracts.",
            "neural predicted move | UNSAFE_TRAINING_LABEL | Requires HumanGate and separate authority decision; default is proposal context.",
        ],
    );
}
