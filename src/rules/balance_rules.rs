#[derive(Debug, Clone)]
pub struct BalanceThreshold {
    pub metric_code: String,
    pub min_value: Option<f64>,
    pub max_value: Option<f64>,
    pub warn_value: Option<f64>,
    pub critical_value: Option<f64>,
}

pub fn is_metric_out_of_bounds(value: f64, threshold: &BalanceThreshold) -> bool {
    if let Some(min) = threshold.min_value {
        if value < min {
            return true;
        }
    }
    if let Some(max) = threshold.max_value {
        if value > max {
            return true;
        }
    }
    false
}

