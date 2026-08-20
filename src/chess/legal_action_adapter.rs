use crate::chess::uci::action_key;
use crate::engine::action::action::Action;
use crate::engine::engine::Engine;
use crate::engine::entity::unit::PlayerId;
use tactical_chess_pure_lab::core::{ActionId, ActionMask, ActionMaskError, LegalAction};

pub fn legal_action_from_action(engine: &Engine, action: &Action) -> LegalAction {
    let key = action_key(action, &engine.units);
    LegalAction::from_action_key(&key)
}

pub fn action_id_from_action(engine: &Engine, action: &Action) -> ActionId {
    legal_action_from_action(engine, action).action_id
}

pub fn legal_actions_from_engine(engine: &Engine, player: PlayerId) -> Vec<LegalAction> {
    engine
        .legal_actions(player)
        .into_iter()
        .map(|action| legal_action_from_action(engine, &action))
        .collect()
}

pub fn action_mask_from_engine<F>(
    engine: &Engine,
    player: PlayerId,
    project_policy_index: Option<F>,
    move_vocab_fingerprint: Option<String>,
) -> Result<ActionMask, ActionMaskError>
where
    F: Fn(&str) -> Option<usize>,
{
    let legal_actions = legal_actions_from_engine(engine, player);
    ActionMask::from_legal_actions(&legal_actions, project_policy_index, move_vocab_fingerprint)
}

pub fn legal_action_ids_from_engine(engine: &Engine, player: PlayerId) -> Vec<ActionId> {
    legal_actions_from_engine(engine, player)
        .into_iter()
        .map(|legal_action| legal_action.action_id)
        .collect()
}
