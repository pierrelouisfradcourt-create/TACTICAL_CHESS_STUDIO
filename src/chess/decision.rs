use crate::chess::root_decision::RootDecisionContext;
use crate::chess::search::RootSearchResult;
use crate::chess::search_backend_adapter::search_root_via_adapter;
use crate::engine::action::action::Action;
use crate::engine::engine::Engine;
use crate::engine::entity::unit::PlayerId;

use std::str::FromStr;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DecisionMode {
    Random,
    Heuristic,
    Neural,
    Minimax,
    Hybrid,
}

#[allow(dead_code)]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SelectionAuthority {
    Search,
    Neural,
    Heuristic,
    Fallback,
    Unknown,
}

impl SelectionAuthority {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Search => "search",
            Self::Neural => "neural",
            Self::Heuristic => "heuristic",
            Self::Fallback => "fallback",
            Self::Unknown => "unknown",
        }
    }
}

#[allow(dead_code)]
#[derive(Clone, Debug)]
pub struct DecisionTrace {
    pub selected_action: Action,
    pub mode: DecisionMode,
    pub selection_authority: SelectionAuthority,
    pub used_search: bool,
    pub root_search: Option<RootSearchResult>,
}

impl DecisionMode {
    pub fn from_env() -> Self {
        std::env::var("TCS_AGENT_MODE")
            .ok()
            .and_then(|value| Self::from_str(&value).ok())
            .unwrap_or(Self::Hybrid)
    }
}

impl FromStr for DecisionMode {
    type Err = ();

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value {
            "random" => Ok(Self::Random),
            "heuristic" => Ok(Self::Heuristic),
            "neural" => Ok(Self::Neural),
            "minimax" => Ok(Self::Minimax),
            "hybrid" => Ok(Self::Hybrid),
            _ => Err(()),
        }
    }
}

pub fn choose_best_action(engine: &Engine, player: PlayerId) -> Option<Action> {
    choose_best_action_for_mode(engine, player, DecisionMode::from_env())
}

pub fn choose_best_action_for_mode(
    engine: &Engine,
    player: PlayerId,
    mode: impl IntoDecisionMode,
) -> Option<Action> {
    choose_best_action_with_trace(engine, player, mode).map(|trace| trace.selected_action)
}

pub fn choose_best_action_with_trace(
    engine: &Engine,
    player: PlayerId,
    mode: impl IntoDecisionMode,
) -> Option<DecisionTrace> {
    choose_best_action_with_trace_and_context(engine, player, mode, None)
}

pub fn choose_best_action_with_trace_and_context(
    engine: &Engine,
    player: PlayerId,
    mode: impl IntoDecisionMode,
    context: Option<&RootDecisionContext>,
) -> Option<DecisionTrace> {
    let legal = engine.legal_actions(player);

    if legal.is_empty() {
        return None;
    }

    let resolved_mode = mode.into_mode();

    match resolved_mode {
        DecisionMode::Random => {
            choose_random(engine, &legal).map(|selected_action| DecisionTrace {
                selected_action,
                mode: resolved_mode,
                selection_authority: SelectionAuthority::Fallback,
                used_search: false,
                root_search: None,
            })
        }
        DecisionMode::Heuristic => search_authority_trace(engine, player, context, resolved_mode),
        DecisionMode::Neural => search_authority_trace(engine, player, context, resolved_mode),
        DecisionMode::Minimax => search_authority_trace(engine, player, context, resolved_mode),
        DecisionMode::Hybrid => search_authority_trace(engine, player, context, resolved_mode),
    }
}

pub trait IntoDecisionMode {
    fn into_mode(self) -> DecisionMode;
}

impl IntoDecisionMode for DecisionMode {
    fn into_mode(self) -> DecisionMode {
        self
    }
}

impl IntoDecisionMode for &str {
    fn into_mode(self) -> DecisionMode {
        DecisionMode::from_str(self).unwrap_or(DecisionMode::Minimax)
    }
}

fn choose_random(engine: &Engine, legal: &[Action]) -> Option<Action> {
    let idx = pseudo_random_index(engine, legal.len());
    Some(legal[idx].clone())
}

fn search_authority_trace(
    engine: &Engine,
    player: PlayerId,
    context: Option<&RootDecisionContext>,
    resolved_mode: DecisionMode,
) -> Option<DecisionTrace> {
    search_root_via_adapter(engine, player, context).map(|root_search| DecisionTrace {
        selected_action: root_search.best_action.clone(),
        mode: resolved_mode,
        selection_authority: SelectionAuthority::Search,
        used_search: true,
        root_search: Some(root_search),
    })
}

fn pseudo_random_index(engine: &Engine, len: usize) -> usize {
    if len <= 1 {
        return 0;
    }

    let seed = engine.action_log.len() as u64
        + (engine.turn_manager.turn_index as u64 * 31)
        + (engine.units.len() as u64 * 17);

    (seed as usize) % len
}
