use crate::prototype::minimal_ruleset::minimal_runtime_ruleset;
use crate::prototype::runtime_ruleset::RuntimeRuleset;

pub fn generate_ruleset() -> RuntimeRuleset {
    minimal_runtime_ruleset()
}
