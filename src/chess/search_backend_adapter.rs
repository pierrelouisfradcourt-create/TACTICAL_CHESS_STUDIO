use crate::chess::legal_action_adapter::action_id_from_action;
use crate::chess::root_decision::RootDecisionContext;
use crate::chess::search::{
    search_root_with_context as run_search_root_with_context, RootSearchResult,
};
use crate::engine::engine::Engine;
use crate::engine::entity::unit::PlayerId;
use tactical_chess_pure_lab::ai::{SearchBackend, SearchRequest, SearchResult};

pub struct PassiveSearchBackendAdapter<'a> {
    engine: &'a Engine,
    player: PlayerId,
}

impl<'a> PassiveSearchBackendAdapter<'a> {
    pub fn new(engine: &'a Engine, player: PlayerId) -> Self {
        Self { engine, player }
    }

    pub fn search_root_with_context(
        &mut self,
        context: Option<&RootDecisionContext>,
    ) -> Option<RootSearchResult> {
        run_search_root_with_context(self.engine, self.player, context)
    }
}

impl SearchBackend for PassiveSearchBackendAdapter<'_> {
    fn search(&mut self, request: &SearchRequest) -> SearchResult {
        let Some(root_search) = self.search_root_with_context(None) else {
            return SearchResult {
                selected_action_id: None,
                searched_nodes: Some(0),
                reached_depth: Some(0),
                fallback_reason: Some("search_root_returned_no_result".to_string()),
            };
        };

        let selected_action_id = action_id_from_action(self.engine, &root_search.best_action);
        let selected_is_legal = request.legal_action_ids.contains(&selected_action_id);

        SearchResult {
            selected_action_id: selected_is_legal.then_some(selected_action_id),
            searched_nodes: Some(root_search.diagnostics.counters.nodes),
            reached_depth: u32::try_from(root_search.completed_depth).ok(),
            fallback_reason: if selected_is_legal {
                None
            } else {
                Some("selected_action_not_in_request_legal_action_ids".to_string())
            },
        }
    }
}

pub fn search_root_via_adapter(
    engine: &Engine,
    player: PlayerId,
    context: Option<&RootDecisionContext>,
) -> Option<RootSearchResult> {
    PassiveSearchBackendAdapter::new(engine, player).search_root_with_context(context)
}
