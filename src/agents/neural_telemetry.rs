use std::sync::atomic::{AtomicU64, Ordering};

use crate::tool::experiment_paths::append_tournament_runtime_line;

pub(crate) struct NeuralRuntimeCounters {
    pub(crate) selection_calls: AtomicU64,
    pub(crate) successful_inferences: AtomicU64,
    pub(crate) fallback_events: AtomicU64,
    pub(crate) fallback_no_uci_moves: AtomicU64,
    pub(crate) fallback_predicted_move_not_found: AtomicU64,
    pub(crate) fallback_python_bridge_failed: AtomicU64,
    pub(crate) query_retries: AtomicU64,
    pub(crate) retry_recoveries: AtomicU64,
    pub(crate) invalid_python_predictions: AtomicU64,
    pub(crate) rerank_salvages: AtomicU64,
    pub(crate) shortlist_used_count: AtomicU64,
    pub(crate) full_legal_fallback_count: AtomicU64,
    pub(crate) shortlist_total_size: AtomicU64,
    pub(crate) purity_violations: AtomicU64,
}

impl NeuralRuntimeCounters {
    pub(crate) const fn new() -> Self {
        Self {
            selection_calls: AtomicU64::new(0),
            successful_inferences: AtomicU64::new(0),
            fallback_events: AtomicU64::new(0),
            fallback_no_uci_moves: AtomicU64::new(0),
            fallback_predicted_move_not_found: AtomicU64::new(0),
            fallback_python_bridge_failed: AtomicU64::new(0),
            query_retries: AtomicU64::new(0),
            retry_recoveries: AtomicU64::new(0),
            invalid_python_predictions: AtomicU64::new(0),
            rerank_salvages: AtomicU64::new(0),
            shortlist_used_count: AtomicU64::new(0),
            full_legal_fallback_count: AtomicU64::new(0),
            shortlist_total_size: AtomicU64::new(0),
            purity_violations: AtomicU64::new(0),
        }
    }

    pub(crate) fn reset(&self) {
        self.selection_calls.store(0, Ordering::Relaxed);
        self.successful_inferences.store(0, Ordering::Relaxed);
        self.fallback_events.store(0, Ordering::Relaxed);
        self.fallback_no_uci_moves.store(0, Ordering::Relaxed);
        self.fallback_predicted_move_not_found
            .store(0, Ordering::Relaxed);
        self.fallback_python_bridge_failed
            .store(0, Ordering::Relaxed);
        self.query_retries.store(0, Ordering::Relaxed);
        self.retry_recoveries.store(0, Ordering::Relaxed);
        self.invalid_python_predictions.store(0, Ordering::Relaxed);
        self.rerank_salvages.store(0, Ordering::Relaxed);
        self.shortlist_used_count.store(0, Ordering::Relaxed);
        self.full_legal_fallback_count.store(0, Ordering::Relaxed);
        self.shortlist_total_size.store(0, Ordering::Relaxed);
        self.purity_violations.store(0, Ordering::Relaxed);
    }

    pub(crate) fn snapshot(&self) -> NeuralRuntimeStats {
        let shortlist_used_count = self.shortlist_used_count.load(Ordering::Relaxed);
        let shortlist_total_size = self.shortlist_total_size.load(Ordering::Relaxed);
        let average_shortlist_size =
            average_shortlist_size(shortlist_used_count, shortlist_total_size);

        NeuralRuntimeStats {
            selection_calls: self.selection_calls.load(Ordering::Relaxed),
            successful_inferences: self.successful_inferences.load(Ordering::Relaxed),
            fallback_events: self.fallback_events.load(Ordering::Relaxed),
            fallback_no_uci_moves: self.fallback_no_uci_moves.load(Ordering::Relaxed),
            fallback_predicted_move_not_found: self
                .fallback_predicted_move_not_found
                .load(Ordering::Relaxed),
            fallback_python_bridge_failed: self
                .fallback_python_bridge_failed
                .load(Ordering::Relaxed),
            query_retries: self.query_retries.load(Ordering::Relaxed),
            retry_recoveries: self.retry_recoveries.load(Ordering::Relaxed),
            invalid_python_predictions: self.invalid_python_predictions.load(Ordering::Relaxed),
            rerank_salvages: self.rerank_salvages.load(Ordering::Relaxed),
            shortlist_used_count,
            full_legal_fallback_count: self.full_legal_fallback_count.load(Ordering::Relaxed),
            shortlist_total_size,
            average_shortlist_size,
            purity_violations: self.purity_violations.load(Ordering::Relaxed),
        }
    }
}

pub(crate) static NEURAL_RUNTIME_COUNTERS: NeuralRuntimeCounters = NeuralRuntimeCounters::new();

#[derive(Clone, Debug, Default)]
pub struct NeuralRuntimeStats {
    pub selection_calls: u64,
    pub successful_inferences: u64,
    pub fallback_events: u64,
    pub fallback_no_uci_moves: u64,
    pub fallback_predicted_move_not_found: u64,
    pub fallback_python_bridge_failed: u64,
    pub query_retries: u64,
    pub retry_recoveries: u64,
    pub invalid_python_predictions: u64,
    pub rerank_salvages: u64,
    pub shortlist_used_count: u64,
    pub full_legal_fallback_count: u64,
    pub shortlist_total_size: u64,
    pub average_shortlist_size: f64,
    pub purity_violations: u64,
}

impl NeuralRuntimeStats {
    pub fn status_label(&self) -> &'static str {
        if self.fallback_events == 0 && self.invalid_python_predictions == 0 {
            "clean"
        } else if self.fallback_events == 0 {
            "rerank_salvaged"
        } else {
            "fallback_contaminated"
        }
    }
}

pub(crate) fn average_shortlist_size(shortlist_used_count: u64, shortlist_total_size: u64) -> f64 {
    if shortlist_used_count > 0 {
        shortlist_total_size as f64 / shortlist_used_count as f64
    } else {
        0.0
    }
}

pub(crate) fn emit_runtime_line(line: &str) {
    println!("{}", line);
    append_tournament_runtime_line(line);
}

pub(crate) fn log_bridge_ok(phase: &str) {
    emit_runtime_line(&format!("BRIDGE_OK|phase={}", phase));
}

pub(crate) fn log_bridge_timeout(phase: &str) {
    emit_runtime_line(&format!("BRIDGE_TIMEOUT|phase={}", phase));
}

pub(crate) fn log_bridge_retry(reason: &str) {
    emit_runtime_line(&format!("BRIDGE_RETRY|reason={}", reason));
}

pub(crate) fn log_bridge_fail(phase: &str, reason: &str) {
    emit_runtime_line(&format!("BRIDGE_FAIL|phase={}|reason={}", phase, reason));
}

#[cfg(test)]
mod tests {
    use super::{average_shortlist_size, NeuralRuntimeCounters, NeuralRuntimeStats};
    use std::sync::atomic::Ordering;

    #[test]
    fn average_shortlist_size_handles_empty_counter() {
        assert_eq!(average_shortlist_size(0, 12), 0.0);
    }

    #[test]
    fn snapshot_computes_average_shortlist_size() {
        let counters = NeuralRuntimeCounters::new();
        counters.shortlist_used_count.store(2, Ordering::Relaxed);
        counters.shortlist_total_size.store(7, Ordering::Relaxed);

        let snapshot = counters.snapshot();

        assert_eq!(snapshot.shortlist_used_count, 2);
        assert_eq!(snapshot.shortlist_total_size, 7);
        assert_eq!(snapshot.average_shortlist_size, 3.5);
    }

    #[test]
    fn reset_clears_counter_state() {
        let counters = NeuralRuntimeCounters::new();
        counters.selection_calls.store(3, Ordering::Relaxed);
        counters.purity_violations.store(2, Ordering::Relaxed);

        counters.reset();

        let snapshot = counters.snapshot();
        assert_eq!(snapshot.selection_calls, 0);
        assert_eq!(snapshot.purity_violations, 0);
    }

    #[test]
    fn status_label_preserves_existing_categories() {
        assert_eq!(NeuralRuntimeStats::default().status_label(), "clean");

        let salvaged = NeuralRuntimeStats {
            invalid_python_predictions: 1,
            ..NeuralRuntimeStats::default()
        };
        assert_eq!(salvaged.status_label(), "rerank_salvaged");

        let fallback = NeuralRuntimeStats {
            fallback_events: 1,
            ..NeuralRuntimeStats::default()
        };
        assert_eq!(fallback.status_label(), "fallback_contaminated");
    }
}
