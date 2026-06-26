#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub(crate) struct MemoryHints {
    pub(crate) phase: Option<String>,
    pub(crate) tags: Vec<String>,
    pub(crate) plans: Vec<String>,
}

#[derive(Clone, Debug, PartialEq)]
pub(crate) struct PythonPrediction {
    pub(crate) best_move: String,
    pub(crate) best_index: String,
    pub(crate) pred_value: f32,
    pub(crate) candidate_moves: Vec<String>,
    pub(crate) memory_hints: MemoryHints,
}

pub(crate) fn parse_python_response(
    response: &str,
    include_memory_hints: bool,
) -> Result<PythonPrediction, String> {
    let response = response.trim();

    if response.is_empty() {
        return Err("Python returned empty response".to_string());
    }

    if response.starts_with("ERROR|") {
        return Err(response.to_string());
    }

    let parts: Vec<&str> = response.splitn(5, '|').collect();
    let best_move = parts.first().copied().unwrap_or("").trim().to_string();
    let best_index = parts.get(1).copied().unwrap_or("-1").trim().to_string();
    let pred_value = parts
        .get(2)
        .copied()
        .unwrap_or("0")
        .trim()
        .parse::<f32>()
        .unwrap_or(0.0);
    let candidate_moves = parts
        .get(3)
        .copied()
        .unwrap_or("")
        .split(',')
        .filter_map(|entry| entry.split(':').next())
        .map(|mv| mv.trim())
        .filter(|mv| !mv.is_empty())
        .map(|mv| mv.to_string())
        .collect();
    let memory_hints = if parts.len() >= 5 && include_memory_hints {
        parse_memory_hints(parts[4])
    } else {
        MemoryHints::default()
    };

    if best_move.is_empty() {
        return Err("Python returned empty move".to_string());
    }

    Ok(PythonPrediction {
        best_move,
        best_index,
        pred_value,
        candidate_moves,
        memory_hints,
    })
}

pub(crate) fn parse_memory_hints(raw: &str) -> MemoryHints {
    let s = raw.trim();
    if s.is_empty() || s == "{}" {
        return MemoryHints::default();
    }

    let phase = extract_json_string_field(s, "phase");
    let tags = extract_json_string_array_field(s, "tags");
    let plans = extract_json_string_array_field(s, "plans");

    MemoryHints { phase, tags, plans }
}

fn extract_json_string_field(raw: &str, key: &str) -> Option<String> {
    let needle = format!("\"{}\":\"", key);
    let start = raw.find(&needle)? + needle.len();
    let rest = &raw[start..];
    let end = rest.find('"')?;
    Some(rest[..end].to_string())
}

fn extract_json_string_array_field(raw: &str, key: &str) -> Vec<String> {
    let needle = format!("\"{}\":[", key);
    let start = match raw.find(&needle) {
        Some(idx) => idx + needle.len(),
        None => return Vec::new(),
    };
    let rest = &raw[start..];
    let end = match rest.find(']') {
        Some(idx) => idx,
        None => return Vec::new(),
    };
    let body = &rest[..end];
    if body.trim().is_empty() {
        return Vec::new();
    }

    body.split(',')
        .map(|item| item.trim().trim_matches('"').to_string())
        .filter(|item| !item.is_empty())
        .collect()
}

#[cfg(test)]
mod tests {
    use super::{parse_memory_hints, parse_python_response, MemoryHints};

    #[test]
    fn parses_prediction_without_memory_payload() {
        let parsed = parse_python_response("e2e4|825|0.250000|e2e4:825,g1f3:786", false)
            .expect("valid protocol response");

        assert_eq!(parsed.best_move, "e2e4");
        assert_eq!(parsed.best_index, "825");
        assert!((parsed.pred_value - 0.25).abs() < 1e-5);
        assert_eq!(parsed.candidate_moves, vec!["e2e4", "g1f3"]);
        assert_eq!(parsed.memory_hints, MemoryHints::default());
    }

    #[test]
    fn parses_memory_payload_only_when_enabled() {
        let response = r#"e7e5|910|-0.500000|e7e5:910|{"phase":"endgame","tags":["material_up"],"plans":["trade_when_winning"]}"#;

        let disabled = parse_python_response(response, false).expect("valid response");
        assert_eq!(disabled.memory_hints, MemoryHints::default());

        let enabled = parse_python_response(response, true).expect("valid response");
        assert_eq!(enabled.memory_hints.phase.as_deref(), Some("endgame"));
        assert_eq!(enabled.memory_hints.tags, vec!["material_up"]);
        assert_eq!(enabled.memory_hints.plans, vec!["trade_when_winning"]);
    }

    #[test]
    fn parses_empty_memory_payload_as_default() {
        assert_eq!(parse_memory_hints("{}"), MemoryHints::default());
        assert_eq!(parse_memory_hints(""), MemoryHints::default());
    }

    #[test]
    fn preserves_existing_error_strings() {
        assert_eq!(
            parse_python_response("", false).expect_err("empty response should fail"),
            "Python returned empty response"
        );
        assert_eq!(
            parse_python_response("ERROR|bad fen", false).expect_err("error response should fail"),
            "ERROR|bad fen"
        );
        assert_eq!(
            parse_python_response("|-1|", false).expect_err("empty move should fail"),
            "Python returned empty move"
        );
    }
}
