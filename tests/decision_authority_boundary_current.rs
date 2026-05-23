fn read_repo_file(path: &str) -> String {
    let root = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    std::fs::read_to_string(root.join(path))
        .unwrap_or_else(|err| panic!("expected to read {path}: {err}"))
}

fn count_occurrences(haystack: &str, needle: &str) -> usize {
    haystack.matches(needle).count()
}

fn assert_branch_routes_to_search_authority_helper(source: &str, branch: &str) {
    let start = source
        .find(branch)
        .unwrap_or_else(|| panic!("expected branch to exist: {branch}"));
    let rest = &source[start..];
    let next_branch_offset = rest[branch.len()..]
        .find("DecisionMode::")
        .map(|offset| branch.len() + offset)
        .unwrap_or(rest.len());
    let branch_source = &rest[..next_branch_offset];

    assert!(
        branch_source.contains("search_authority_trace(engine, player, context, resolved_mode)"),
        "search authority trace: {branch} should route through search_authority_trace"
    );
}

#[test]
fn current_boundary_records_explicit_selection_authority_in_active_trace() {
    let decision_source = read_repo_file("src/chess/decision.rs");

    assert!(
        decision_source.contains("pub enum SelectionAuthority"),
        "active trace evidence: explicit selection authority enum should exist"
    );
    assert!(
        decision_source.contains("pub selection_authority: SelectionAuthority"),
        "active trace evidence: DecisionTrace should carry explicit selection authority"
    );
}

#[test]
fn current_boundary_records_search_selection_authority_explicitly() {
    let decision_source = read_repo_file("src/chess/decision.rs");
    let search_authority_hits = count_occurrences(
        &decision_source,
        "selection_authority: SelectionAuthority::Search",
    );
    let search_helper_hits = count_occurrences(
        &decision_source,
        "search_authority_trace(engine, player, context, resolved_mode)",
    );

    assert!(
        decision_source.contains("fn search_authority_trace("),
        "search authority trace: shared helper should construct Search-authority traces"
    );
    assert_eq!(
        search_authority_hits, 1,
        "search authority trace: Search authority should be recorded in the shared helper only"
    );
    assert_eq!(
        search_helper_hits, 4,
        "search authority trace: Minimax, explicit Heuristic, Neural, and Hybrid should share the helper"
    );
    assert!(
        decision_source.contains("selected_action: root_search.best_action.clone()"),
        "search authority trace: helper should select the root search best action"
    );
    assert!(
        decision_source.contains("used_search: true"),
        "search authority trace: helper should record used_search=true"
    );
    assert!(
        decision_source.contains("root_search: Some(root_search)"),
        "search authority trace: helper should retain the root search result"
    );
    assert!(
        decision_source.contains("DecisionMode::Minimax =>"),
        "search authority trace: Minimax branch should remain explicit"
    );
    assert_branch_routes_to_search_authority_helper(&decision_source, "DecisionMode::Minimax =>");
}

#[test]
fn current_boundary_routes_explicit_heuristic_mode_through_search_authority() {
    let decision_source = read_repo_file("src/chess/decision.rs");

    assert!(
        decision_source.contains("DecisionMode::Heuristic =>"),
        "heuristic mode boundary: explicit Heuristic branch should remain visible in active routing"
    );
    assert!(
        decision_source.contains("search_root_via_adapter(engine, player, context)"),
        "heuristic mode boundary: shared helper should route through the SearchBackend adapter boundary"
    );
    assert_branch_routes_to_search_authority_helper(&decision_source, "DecisionMode::Heuristic =>");
    assert!(
        !decision_source.contains(
            "DecisionMode::Heuristic => {\n            heuristic_best_action(engine, player, &legal).map(|selected_action| DecisionTrace {"
        ),
        "heuristic mode boundary: explicit Heuristic branch should not directly call heuristic_best_action anymore"
    );
}

#[test]
fn current_boundary_keeps_decision_controller_passive() {
    let decision_source = read_repo_file("src/chess/decision.rs");

    assert!(
        !decision_source.contains("DecisionController"),
        "current boundary guard: active decision route must not invoke DecisionController"
    );
    assert!(
        !decision_source.contains("decision_controller_adapter"),
        "current boundary guard: active decision route must not import the passive adapter"
    );
}

#[test]
fn current_boundary_routes_search_authority_through_search_backend_adapter() {
    let decision_source = read_repo_file("src/chess/decision.rs");

    assert!(
        decision_source.contains("search_backend_adapter::search_root_via_adapter"),
        "current boundary guard: active search route should import the adapter-backed boundary"
    );
    assert!(
        decision_source.contains("search_root_via_adapter(engine, player, context)"),
        "current boundary guard: active search route should call the adapter-backed boundary"
    );
    assert!(
        !decision_source.contains("search_root_with_context(engine, player, context)"),
        "current boundary guard: active decision route must not call raw search_root_with_context directly"
    );
    assert!(
        !decision_source.contains("SearchBackend"),
        "current boundary guard: active decision route must not depend on the SearchBackend trait"
    );
}

#[test]
fn current_boundary_keeps_action_mask_out_of_active_search_authority() {
    let search_source = read_repo_file("src/chess/search.rs");

    assert!(
        search_source.contains("engine.legal_actions(player)"),
        "current boundary guard: active search still consumes engine legal actions directly"
    );
    assert!(
        !search_source.contains("ActionMask"),
        "current boundary guard: active search must not consume ActionMask as authority"
    );
    assert!(
        !search_source.contains("action_mask"),
        "current boundary guard: active search must not import action_mask helpers as authority"
    );
}

#[test]
fn current_boundary_routes_neural_mode_through_search_authority() {
    let decision_source = read_repo_file("src/chess/decision.rs");

    assert!(
        decision_source.contains("Neural,"),
        "neural mode boundary: DecisionMode::Neural variant should remain explicit"
    );
    assert!(
        decision_source.contains("DecisionMode::Neural =>"),
        "neural mode boundary: Neural branch should remain visible in active routing"
    );
    assert!(
        decision_source.contains("selection_authority: SelectionAuthority::Search"),
        "neural mode boundary: shared helper should record Search authority"
    );
    assert_branch_routes_to_search_authority_helper(&decision_source, "DecisionMode::Neural =>");
    assert!(
        !decision_source.contains("choose_neural("),
        "neural mode boundary: decision.rs must not call choose_neural for final action selection"
    );
    assert!(
        !decision_source.contains("agent.select_action("),
        "neural mode boundary: NeuralAgent selection must not be directly reachable from decision.rs"
    );
    assert!(
        !decision_source.contains("selection_authority: SelectionAuthority::Neural"),
        "neural mode boundary: Neural branch must not record Neural final-selection authority"
    );
}

#[test]
fn current_boundary_routes_hybrid_mode_through_search_authority() {
    let decision_source = read_repo_file("src/chess/decision.rs");

    assert!(
        decision_source.contains("unwrap_or(Self::Hybrid)"),
        "current boundary: default decision mode remains Hybrid"
    );
    assert!(
        decision_source.contains("DecisionMode::Hybrid =>"),
        "current boundary: Hybrid branch should remain visible in active routing"
    );
    assert!(
        decision_source.contains("selection_authority: SelectionAuthority::Search"),
        "hybrid mode boundary: shared helper should record Search authority"
    );
    assert_branch_routes_to_search_authority_helper(&decision_source, "DecisionMode::Hybrid =>");
    assert!(
        !decision_source.contains("if should_use_search(engine, player, &legal)"),
        "hybrid mode boundary: Hybrid should no longer gate final authority through should_use_search"
    );
    assert!(
        !decision_source.contains("heuristic_best_action(engine, player, &legal).map"),
        "hybrid mode boundary: Hybrid should no longer have a heuristic_best_action final-selection fallback"
    );
}

#[test]
fn current_boundary_records_fallback_or_unknown_selection_authority_explicitly() {
    let decision_source = read_repo_file("src/chess/decision.rs");

    assert!(
        decision_source.contains("Fallback,"),
        "fallback or unknown trace: SelectionAuthority should keep an explicit fallback variant"
    );
    assert!(
        decision_source.contains("Unknown,"),
        "fallback or unknown trace: SelectionAuthority should keep an explicit unknown variant"
    );
    assert!(
        decision_source.contains("selection_authority: SelectionAuthority::Fallback"),
        "fallback or unknown trace: Random branch should be explicitly tagged as fallback authority"
    );
}
