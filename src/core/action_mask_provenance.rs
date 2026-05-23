use crate::core::action_id::{ActionId, ACTION_ID_VERSION};
use crate::core::action_mask::ActionMask;
use crate::core::human_gate::HumanGateAuthorization;
use crate::core::legal_action::LEGAL_ACTION_VERSION;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ActionMaskProvenanceError {
    MissingMoveVocabFingerprint,
    MissingLegalMoveSource,
    MissingRuleset,
    MissingVariant,
}

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct ActionMaskProvenanceDiagnostics {
    pub decision_mode: Option<String>,
    pub authority_source: Option<String>,
    pub final_selected_move: Option<String>,
    pub search_selected_move: Option<String>,
    pub search_best_move: Option<String>,
    pub neural_predicted_move: Option<String>,
    pub rerank_status: Option<String>,
    pub fallback_reason: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ActionMaskHumanGateAuthorizationState {
    Missing,
    PassiveCompatibilityFlag,
    PassiveAuthorization(HumanGateAuthorization),
    PromotionAuthorizationRequired(HumanGateAuthorization),
}

impl ActionMaskHumanGateAuthorizationState {
    pub fn from_legacy_flag(human_gate_authorization: bool) -> Self {
        if human_gate_authorization {
            Self::PassiveCompatibilityFlag
        } else {
            Self::Missing
        }
    }

    pub fn authorization(&self) -> Option<&HumanGateAuthorization> {
        match self {
            Self::PassiveAuthorization(authorization)
            | Self::PromotionAuthorizationRequired(authorization) => Some(authorization),
            Self::Missing | Self::PassiveCompatibilityFlag => None,
        }
    }

    pub fn has_authorization(&self) -> bool {
        !matches!(self, Self::Missing)
    }

    pub fn is_passive(&self) -> bool {
        matches!(
            self,
            Self::PassiveCompatibilityFlag | Self::PassiveAuthorization(_)
        )
    }

    pub fn requires_promotion_authorization(&self) -> bool {
        matches!(self, Self::PromotionAuthorizationRequired(_))
    }

    pub fn blocks_dataset_use(&self) -> bool {
        true
    }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ActionMaskProvenance {
    action_id_version: &'static str,
    legal_action_version: &'static str,
    action_mask_version: &'static str,
    move_vocab_fingerprint: String,
    legal_move_source: String,
    ruleset: String,
    variant: String,
    policy_indices: Vec<Option<usize>>,
    unencodable_action_ids: Vec<ActionId>,
    human_gate_authorization: bool,
    human_gate_authorization_state: ActionMaskHumanGateAuthorizationState,
    diagnostics: Option<ActionMaskProvenanceDiagnostics>,
}

impl ActionMaskProvenance {
    pub fn from_action_mask(
        mask: &ActionMask,
        legal_move_source: impl Into<String>,
        ruleset: impl Into<String>,
        variant: impl Into<String>,
        human_gate_authorization: bool,
        diagnostics: Option<ActionMaskProvenanceDiagnostics>,
    ) -> Result<Self, ActionMaskProvenanceError> {
        Self::from_action_mask_with_human_gate_state(
            mask,
            legal_move_source,
            ruleset,
            variant,
            ActionMaskHumanGateAuthorizationState::from_legacy_flag(human_gate_authorization),
            diagnostics,
        )
    }

    pub fn from_action_mask_with_human_gate_state(
        mask: &ActionMask,
        legal_move_source: impl Into<String>,
        ruleset: impl Into<String>,
        variant: impl Into<String>,
        human_gate_authorization_state: ActionMaskHumanGateAuthorizationState,
        diagnostics: Option<ActionMaskProvenanceDiagnostics>,
    ) -> Result<Self, ActionMaskProvenanceError> {
        let move_vocab_fingerprint = mask
            .move_vocab_fingerprint()
            .ok_or(ActionMaskProvenanceError::MissingMoveVocabFingerprint)?
            .to_string();

        let legal_move_source = legal_move_source.into();
        if legal_move_source.trim().is_empty() {
            return Err(ActionMaskProvenanceError::MissingLegalMoveSource);
        }

        let ruleset = ruleset.into();
        if ruleset.trim().is_empty() {
            return Err(ActionMaskProvenanceError::MissingRuleset);
        }

        let variant = variant.into();
        if variant.trim().is_empty() {
            return Err(ActionMaskProvenanceError::MissingVariant);
        }

        let human_gate_authorization = human_gate_authorization_state.has_authorization();

        Ok(Self {
            action_id_version: ACTION_ID_VERSION,
            legal_action_version: LEGAL_ACTION_VERSION,
            action_mask_version: mask.version(),
            move_vocab_fingerprint,
            legal_move_source,
            ruleset,
            variant,
            policy_indices: mask.policy_indices().to_vec(),
            unencodable_action_ids: mask.unencodable_action_ids().to_vec(),
            human_gate_authorization,
            human_gate_authorization_state,
            diagnostics,
        })
    }

    pub fn action_id_version(&self) -> &'static str {
        self.action_id_version
    }

    pub fn legal_action_version(&self) -> &'static str {
        self.legal_action_version
    }

    pub fn action_mask_version(&self) -> &'static str {
        self.action_mask_version
    }

    pub fn move_vocab_fingerprint(&self) -> &str {
        &self.move_vocab_fingerprint
    }

    pub fn legal_move_source(&self) -> &str {
        &self.legal_move_source
    }

    pub fn ruleset(&self) -> &str {
        &self.ruleset
    }

    pub fn variant(&self) -> &str {
        &self.variant
    }

    pub fn policy_indices(&self) -> &[Option<usize>] {
        &self.policy_indices
    }

    pub fn unencodable_action_ids(&self) -> &[ActionId] {
        &self.unencodable_action_ids
    }

    pub fn human_gate_authorization(&self) -> bool {
        self.human_gate_authorization
    }

    pub fn human_gate_authorization_state(&self) -> &ActionMaskHumanGateAuthorizationState {
        &self.human_gate_authorization_state
    }

    pub fn human_gate_authorization_metadata(&self) -> Option<&HumanGateAuthorization> {
        self.human_gate_authorization_state.authorization()
    }

    pub fn diagnostics(&self) -> Option<&ActionMaskProvenanceDiagnostics> {
        self.diagnostics.as_ref()
    }

    pub fn blocks_dataset_use(&self) -> bool {
        self.human_gate_authorization_state.blocks_dataset_use()
    }
}
