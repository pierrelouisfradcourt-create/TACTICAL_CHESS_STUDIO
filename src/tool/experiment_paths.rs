use std::fs::{create_dir_all, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};

const DEFAULT_EXPERIMENT_ID: &str = "exp_003_aggressive";

pub fn experiment_id() -> String {
    std::env::var("TCS_EXPERIMENT_ID")
        .ok()
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| DEFAULT_EXPERIMENT_ID.to_string())
}

pub fn experiment_dir() -> PathBuf {
    if let Ok(dir) = std::env::var("TCS_EXPERIMENT_DIR") {
        let trimmed = dir.trim();
        if !trimmed.is_empty() {
            return PathBuf::from(trimmed);
        }
    }

    Path::new("lab").join("experiments").join(experiment_id())
}

pub fn tournament_dir() -> PathBuf {
    experiment_dir().join("tournaments")
}

pub fn tournament_log_path() -> PathBuf {
    experiment_dir().join("tournament.log")
}

pub fn analysis_dir() -> PathBuf {
    experiment_dir().join("analysis")
}

pub fn append_tournament_runtime_line(line: &str) {
    let log_path = tournament_log_path();
    if let Some(parent) = log_path.parent() {
        let _ = create_dir_all(parent);
    }

    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&log_path) {
        let _ = writeln!(file, "{}", line);
    }
}
