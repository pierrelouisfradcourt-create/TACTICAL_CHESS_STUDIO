#[derive(Debug, Clone)]
pub struct CardRule {
    pub rule_code: String,
    pub severity: String,
    pub rule_type: String,
    pub description: String,
}

pub fn is_hard_rule(rule: &CardRule) -> bool {
    rule.severity.eq_ignore_ascii_case("hard")
}

