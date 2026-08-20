#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum HumanDecision {
    ApproveForObservationOnly,
    ApproveForDatasetCandidate,
    Reject,
    Defer,
    Revoke,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum HumanGateScope {
    Observation,
    DatasetCandidate,
    DatasetLabelPromotion,
    TrainingAdmission,
    Chess960Activation,
    ClaimPublication,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum HumanGateError {
    EmptyReason,
    EmptyOperatorSource,
    EmptyTraceId,
    EmptyCreatedAt,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct HumanGateAuthorization {
    authorized: bool,
    decision: HumanDecision,
    reason: String,
    operator_source: String,
    trace_id: String,
    created_at: String,
    scope: HumanGateScope,
    review_packet_id: Option<String>,
    dataset_candidate_id: Option<String>,
    notes: Option<String>,
    expires_at: Option<String>,
}

impl HumanGateAuthorization {
    pub fn new(
        authorized: bool,
        decision: HumanDecision,
        reason: impl Into<String>,
        operator_source: impl Into<String>,
        trace_id: impl Into<String>,
        created_at: impl Into<String>,
        scope: HumanGateScope,
        review_packet_id: Option<String>,
        dataset_candidate_id: Option<String>,
        notes: Option<String>,
        expires_at: Option<String>,
    ) -> Result<Self, HumanGateError> {
        let reason = reason.into();
        if reason.trim().is_empty() {
            return Err(HumanGateError::EmptyReason);
        }

        let operator_source = operator_source.into();
        if operator_source.trim().is_empty() {
            return Err(HumanGateError::EmptyOperatorSource);
        }

        let trace_id = trace_id.into();
        if trace_id.trim().is_empty() {
            return Err(HumanGateError::EmptyTraceId);
        }

        let created_at = created_at.into();
        if created_at.trim().is_empty() {
            return Err(HumanGateError::EmptyCreatedAt);
        }

        Ok(Self {
            authorized,
            decision,
            reason,
            operator_source,
            trace_id,
            created_at,
            scope,
            review_packet_id,
            dataset_candidate_id,
            notes,
            expires_at,
        })
    }

    pub fn authorized(&self) -> bool {
        self.authorized
    }

    pub fn decision(&self) -> HumanDecision {
        self.decision
    }

    pub fn reason(&self) -> &str {
        &self.reason
    }

    pub fn operator_source(&self) -> &str {
        &self.operator_source
    }

    pub fn trace_id(&self) -> &str {
        &self.trace_id
    }

    pub fn created_at(&self) -> &str {
        &self.created_at
    }

    pub fn scope(&self) -> HumanGateScope {
        self.scope
    }

    pub fn review_packet_id(&self) -> Option<&str> {
        self.review_packet_id.as_deref()
    }

    pub fn dataset_candidate_id(&self) -> Option<&str> {
        self.dataset_candidate_id.as_deref()
    }

    pub fn notes(&self) -> Option<&str> {
        self.notes.as_deref()
    }

    pub fn expires_at(&self) -> Option<&str> {
        self.expires_at.as_deref()
    }

    pub fn is_scope(&self, scope: HumanGateScope) -> bool {
        self.scope == scope
    }

    pub fn blocks_dataset_use(&self) -> bool {
        !self.approves_downstream_use() || self.scope != HumanGateScope::DatasetLabelPromotion
    }

    pub fn blocks_training_use(&self) -> bool {
        !self.approves_downstream_use() || self.scope != HumanGateScope::TrainingAdmission
    }

    pub fn blocks_chess960_activation(&self) -> bool {
        !self.approves_downstream_use() || self.scope != HumanGateScope::Chess960Activation
    }

    pub fn blocks_claim_publication(&self) -> bool {
        !self.approves_downstream_use() || self.scope != HumanGateScope::ClaimPublication
    }

    fn approves_downstream_use(&self) -> bool {
        self.authorized && self.decision == HumanDecision::ApproveForDatasetCandidate
    }
}

#[cfg(test)]
mod tests {
    use super::{HumanDecision, HumanGateAuthorization, HumanGateError, HumanGateScope};

    fn authorization(
        authorized: bool,
        decision: HumanDecision,
        scope: HumanGateScope,
    ) -> HumanGateAuthorization {
        HumanGateAuthorization::new(
            authorized,
            decision,
            "human reviewed fixture",
            "operator-console",
            "trace-001",
            "2026-05-13T18:00:00Z",
            scope,
            None,
            None,
            None,
            None,
        )
        .expect("fixture authorization should build")
    }

    #[test]
    fn constructs_valid_human_gate_authorization() {
        let authorization = HumanGateAuthorization::new(
            true,
            HumanDecision::ApproveForObservationOnly,
            "observe only",
            "operator-console",
            "trace-123",
            "2026-05-13T18:00:00Z",
            HumanGateScope::Observation,
            Some("review-packet-1".to_string()),
            Some("dataset-candidate-1".to_string()),
            Some("review notes".to_string()),
            Some("2026-05-14T18:00:00Z".to_string()),
        )
        .expect("valid authorization should build");

        assert!(authorization.authorized());
        assert_eq!(
            authorization.decision(),
            HumanDecision::ApproveForObservationOnly
        );
        assert_eq!(authorization.reason(), "observe only");
        assert_eq!(authorization.operator_source(), "operator-console");
        assert_eq!(authorization.trace_id(), "trace-123");
        assert_eq!(authorization.created_at(), "2026-05-13T18:00:00Z");
        assert_eq!(authorization.scope(), HumanGateScope::Observation);
        assert!(authorization.is_scope(HumanGateScope::Observation));
        assert_eq!(authorization.review_packet_id(), Some("review-packet-1"));
        assert_eq!(
            authorization.dataset_candidate_id(),
            Some("dataset-candidate-1")
        );
        assert_eq!(authorization.notes(), Some("review notes"));
        assert_eq!(authorization.expires_at(), Some("2026-05-14T18:00:00Z"));
    }

    #[test]
    fn rejects_empty_reason() {
        let err = HumanGateAuthorization::new(
            true,
            HumanDecision::ApproveForObservationOnly,
            " ",
            "operator-console",
            "trace-001",
            "2026-05-13T18:00:00Z",
            HumanGateScope::Observation,
            None,
            None,
            None,
            None,
        )
        .expect_err("empty reason should fail closed");

        assert_eq!(err, HumanGateError::EmptyReason);
    }

    #[test]
    fn rejects_empty_operator_source() {
        let err = HumanGateAuthorization::new(
            true,
            HumanDecision::ApproveForObservationOnly,
            "observe only",
            "",
            "trace-001",
            "2026-05-13T18:00:00Z",
            HumanGateScope::Observation,
            None,
            None,
            None,
            None,
        )
        .expect_err("empty operator_source should fail closed");

        assert_eq!(err, HumanGateError::EmptyOperatorSource);
    }

    #[test]
    fn rejects_empty_trace_id() {
        let err = HumanGateAuthorization::new(
            true,
            HumanDecision::ApproveForObservationOnly,
            "observe only",
            "operator-console",
            "",
            "2026-05-13T18:00:00Z",
            HumanGateScope::Observation,
            None,
            None,
            None,
            None,
        )
        .expect_err("empty trace_id should fail closed");

        assert_eq!(err, HumanGateError::EmptyTraceId);
    }

    #[test]
    fn rejects_empty_created_at() {
        let err = HumanGateAuthorization::new(
            true,
            HumanDecision::ApproveForObservationOnly,
            "observe only",
            "operator-console",
            "trace-001",
            "\t",
            HumanGateScope::Observation,
            None,
            None,
            None,
            None,
        )
        .expect_err("empty created_at should fail closed");

        assert_eq!(err, HumanGateError::EmptyCreatedAt);
    }

    #[test]
    fn false_authorization_blocks_dataset_use() {
        let authorization = authorization(
            false,
            HumanDecision::ApproveForDatasetCandidate,
            HumanGateScope::DatasetLabelPromotion,
        );

        assert!(authorization.blocks_dataset_use());
    }

    #[test]
    fn reject_blocks_dataset_use() {
        let authorization = authorization(
            true,
            HumanDecision::Reject,
            HumanGateScope::DatasetLabelPromotion,
        );

        assert!(authorization.blocks_dataset_use());
    }

    #[test]
    fn defer_blocks_dataset_use() {
        let authorization = authorization(
            true,
            HumanDecision::Defer,
            HumanGateScope::DatasetLabelPromotion,
        );

        assert!(authorization.blocks_dataset_use());
    }

    #[test]
    fn revoke_blocks_dataset_use() {
        let authorization = authorization(
            true,
            HumanDecision::Revoke,
            HumanGateScope::DatasetLabelPromotion,
        );

        assert!(authorization.blocks_dataset_use());
    }

    #[test]
    fn observation_scope_blocks_dataset_label_promotion() {
        let authorization = authorization(
            true,
            HumanDecision::ApproveForObservationOnly,
            HumanGateScope::Observation,
        );

        assert!(authorization.blocks_dataset_use());
    }

    #[test]
    fn dataset_candidate_does_not_authorize_training() {
        let authorization = authorization(
            true,
            HumanDecision::ApproveForDatasetCandidate,
            HumanGateScope::DatasetCandidate,
        );

        assert!(authorization.blocks_training_use());
    }

    #[test]
    fn dataset_candidate_does_not_authorize_dataset_label_promotion() {
        let authorization = authorization(
            true,
            HumanDecision::ApproveForDatasetCandidate,
            HumanGateScope::DatasetCandidate,
        );

        assert!(authorization.blocks_dataset_use());
    }

    #[test]
    fn dataset_label_promotion_does_not_authorize_training() {
        let authorization = authorization(
            true,
            HumanDecision::ApproveForDatasetCandidate,
            HumanGateScope::DatasetLabelPromotion,
        );

        assert!(authorization.blocks_training_use());
    }

    #[test]
    fn training_admission_does_not_authorize_dataset_labels() {
        let authorization = authorization(
            true,
            HumanDecision::ApproveForDatasetCandidate,
            HumanGateScope::TrainingAdmission,
        );

        assert!(authorization.blocks_dataset_use());
    }

    #[test]
    fn training_admission_blocks_wrong_decision() {
        let authorization = authorization(
            true,
            HumanDecision::ApproveForObservationOnly,
            HumanGateScope::TrainingAdmission,
        );

        assert!(authorization.blocks_training_use());
    }

    #[test]
    fn chess960_activation_does_not_authorize_dataset_or_training() {
        let authorization = authorization(
            true,
            HumanDecision::ApproveForDatasetCandidate,
            HumanGateScope::Chess960Activation,
        );

        assert!(authorization.blocks_dataset_use());
        assert!(authorization.blocks_training_use());
    }

    #[test]
    fn claim_publication_does_not_authorize_dataset_or_training() {
        let authorization = authorization(
            true,
            HumanDecision::ApproveForDatasetCandidate,
            HumanGateScope::ClaimPublication,
        );

        assert!(authorization.blocks_dataset_use());
        assert!(authorization.blocks_training_use());
    }

    #[test]
    fn human_gate_has_no_python_authority() {
        let authorization = HumanGateAuthorization::new(
            true,
            HumanDecision::ApproveForObservationOnly,
            "python source recorded as metadata only",
            "python-control-plane",
            "trace-python",
            "2026-05-13T18:00:00Z",
            HumanGateScope::Observation,
            None,
            None,
            None,
            None,
        )
        .expect("operator source is metadata only");

        assert_eq!(authorization.operator_source(), "python-control-plane");
        assert!(authorization.blocks_dataset_use());
        assert!(authorization.blocks_training_use());
        assert!(authorization.blocks_chess960_activation());
        assert!(authorization.blocks_claim_publication());
    }

    #[test]
    fn human_gate_does_not_create_dataset_admission_gate() {
        let authorization = authorization(
            true,
            HumanDecision::ApproveForDatasetCandidate,
            HumanGateScope::DatasetCandidate,
        );

        assert!(authorization.blocks_dataset_use());
        assert!(authorization.blocks_training_use());
    }
}
