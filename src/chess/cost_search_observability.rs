use crate::chess::search_diagnostics::RootSearchDiagnostics;
use serde::{Deserialize, Serialize};
use std::fmt;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Component, Path, PathBuf};

pub const COST_SEARCH_SCHEMA_VERSION: &str = "cost_search_observability_v0";
pub const COST_SEARCH_REPORT_MODE: &str = "observation_only";
pub const DEFAULT_DETAILED_GAME_ID: u64 = 1;

const SAFE_ROUTE: [&str; 4] = [
    "lab",
    "gameplay_observation",
    "sandbox_outputs",
    "rocky_cost_search",
];

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CostSearchRouteError {
    EmptyPath,
    LatestJsonForbidden,
    LatestAliasForbidden,
    LabRunsRunStarForbidden,
    UnsafeRoute,
}

impl fmt::Display for CostSearchRouteError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            CostSearchRouteError::EmptyPath => write!(f, "cost search output path is empty"),
            CostSearchRouteError::LatestJsonForbidden => {
                write!(f, "cost search output path must not target latest.json")
            }
            CostSearchRouteError::LatestAliasForbidden => {
                write!(f, "cost search output route must not use a latest alias")
            }
            CostSearchRouteError::LabRunsRunStarForbidden => {
                write!(f, "cost search output path must not target lab/runs/RUN_*")
            }
            CostSearchRouteError::UnsafeRoute => {
                write!(
                    f,
                    "cost search output path must end in lab/gameplay_observation/sandbox_outputs/rocky_cost_search/<run_id>"
                )
            }
        }
    }
}

impl std::error::Error for CostSearchRouteError {}

#[derive(Debug)]
pub enum CostSearchReportError {
    Route(CostSearchRouteError),
    Io(std::io::Error),
    Json(serde_json::Error),
}

impl fmt::Display for CostSearchReportError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            CostSearchReportError::Route(err) => err.fmt(f),
            CostSearchReportError::Io(err) => err.fmt(f),
            CostSearchReportError::Json(err) => err.fmt(f),
        }
    }
}

impl std::error::Error for CostSearchReportError {}

impl From<CostSearchRouteError> for CostSearchReportError {
    fn from(value: CostSearchRouteError) -> Self {
        CostSearchReportError::Route(value)
    }
}

impl From<std::io::Error> for CostSearchReportError {
    fn from(value: std::io::Error) -> Self {
        CostSearchReportError::Io(value)
    }
}

impl From<serde_json::Error> for CostSearchReportError {
    fn from(value: serde_json::Error) -> Self {
        CostSearchReportError::Json(value)
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct CostSearchSummaryReport {
    pub schema_version: String,
    pub report_mode: String,
    pub game_id: u64,
    pub result: String,
    pub moves: u32,
    pub total_ms: f64,
    pub avg_move_ms: f64,
    pub max_move_ms: f64,
    pub total_nodes: u64,
    pub max_depth: usize,
    pub neural_calls: u64,
    pub fallback_count: u64,
    pub anomaly_count: u64,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct CostSearchMoveDetailReport {
    pub schema_version: String,
    pub report_mode: String,
    pub game_id: u64,
    pub ply: u32,
    pub side: String,
    pub legal_moves: usize,
    pub selected_move: String,
    pub decision_source: String,
    pub search_depth: usize,
    pub search_nodes: u64,
    pub quiescence_nodes: u64,
    pub elapsed_ms: f64,
    pub neural_ms: f64,
    pub fallback_reason: Option<String>,
    pub mirror_evals: u64,
    pub notes: String,
}

impl CostSearchSummaryReport {
    pub fn new(
        game_id: u64,
        result: impl Into<String>,
        moves: u32,
        total_ms: f64,
        max_move_ms: f64,
        total_nodes: u64,
        max_depth: usize,
        neural_calls: u64,
        fallback_count: u64,
        anomaly_count: u64,
    ) -> Self {
        let avg_move_ms = if moves == 0 {
            0.0
        } else {
            total_ms / f64::from(moves)
        };

        Self {
            schema_version: COST_SEARCH_SCHEMA_VERSION.to_string(),
            report_mode: COST_SEARCH_REPORT_MODE.to_string(),
            game_id,
            result: result.into(),
            moves,
            total_ms,
            avg_move_ms,
            max_move_ms,
            total_nodes,
            max_depth,
            neural_calls,
            fallback_count,
            anomaly_count,
        }
    }
}

impl CostSearchMoveDetailReport {
    #[allow(clippy::too_many_arguments)]
    pub fn from_root_diagnostics(
        game_id: u64,
        ply: u32,
        side: impl Into<String>,
        selected_move: impl Into<String>,
        decision_source: impl Into<String>,
        elapsed_ms: f64,
        neural_ms: f64,
        fallback_reason: Option<String>,
        notes: impl Into<String>,
        diagnostics: &RootSearchDiagnostics,
    ) -> Self {
        Self {
            schema_version: COST_SEARCH_SCHEMA_VERSION.to_string(),
            report_mode: COST_SEARCH_REPORT_MODE.to_string(),
            game_id,
            ply,
            side: side.into(),
            legal_moves: diagnostics.ordering.legal_move_count,
            selected_move: selected_move.into(),
            decision_source: decision_source.into(),
            search_depth: diagnostics.branching.max_depth,
            search_nodes: diagnostics.counters.nodes,
            quiescence_nodes: diagnostics.counters.quiescence_nodes,
            elapsed_ms,
            neural_ms,
            fallback_reason,
            mirror_evals: diagnostics.mirror_ordering.mirror_ordering_candidate_evals,
            notes: notes.into(),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CostSearchDetailWriteStatus {
    Written,
    SummaryOnly,
}

pub struct CostSearchReportWriter {
    output_dir: PathBuf,
}

impl CostSearchReportWriter {
    pub fn new(output_dir: impl AsRef<Path>) -> Result<Self, CostSearchRouteError> {
        let output_dir = output_dir.as_ref().to_path_buf();
        validate_cost_search_output_dir(&output_dir)?;
        Ok(Self { output_dir })
    }

    pub fn output_dir(&self) -> &Path {
        &self.output_dir
    }

    pub fn write_summary(
        &self,
        report: &CostSearchSummaryReport,
    ) -> Result<PathBuf, CostSearchReportError> {
        self.append_jsonl("summary.jsonl", report)
    }

    pub fn write_detail(
        &self,
        report: &CostSearchMoveDetailReport,
    ) -> Result<CostSearchDetailWriteStatus, CostSearchReportError> {
        if !allows_cost_search_detail_report(report.game_id) {
            return Ok(CostSearchDetailWriteStatus::SummaryOnly);
        }

        self.append_jsonl("game_1_detail.jsonl", report)?;
        Ok(CostSearchDetailWriteStatus::Written)
    }

    fn append_jsonl<T: Serialize>(
        &self,
        file_name: &str,
        report: &T,
    ) -> Result<PathBuf, CostSearchReportError> {
        validate_cost_search_output_dir(&self.output_dir)?;
        let output_path = self.output_dir.join(file_name);
        reject_forbidden_output_path(&output_path)?;
        fs::create_dir_all(&self.output_dir)?;

        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&output_path)?;
        serde_json::to_writer(&mut file, report)?;
        writeln!(file)?;
        Ok(output_path)
    }
}

pub fn allows_cost_search_detail_report(game_id: u64) -> bool {
    game_id == DEFAULT_DETAILED_GAME_ID
}

pub fn validate_cost_search_output_dir(path: impl AsRef<Path>) -> Result<(), CostSearchRouteError> {
    let path = path.as_ref();
    let components = normal_components(path);
    if components.is_empty() {
        return Err(CostSearchRouteError::EmptyPath);
    }

    reject_forbidden_components(&components)?;

    if components.len() < SAFE_ROUTE.len() + 1 {
        return Err(CostSearchRouteError::UnsafeRoute);
    }

    let route_start = components.len() - SAFE_ROUTE.len() - 1;
    let route_matches = SAFE_ROUTE
        .iter()
        .enumerate()
        .all(|(offset, expected)| components[route_start + offset] == *expected);
    if !route_matches {
        return Err(CostSearchRouteError::UnsafeRoute);
    }

    let run_id = &components[components.len() - 1];
    if run_id.is_empty() {
        return Err(CostSearchRouteError::UnsafeRoute);
    }
    if run_id.eq_ignore_ascii_case("latest") {
        return Err(CostSearchRouteError::LatestAliasForbidden);
    }

    Ok(())
}

fn reject_forbidden_output_path(path: &Path) -> Result<(), CostSearchRouteError> {
    let components = normal_components(path);
    reject_forbidden_components(&components)
}

fn reject_forbidden_components(components: &[String]) -> Result<(), CostSearchRouteError> {
    if components
        .iter()
        .any(|component| component.eq_ignore_ascii_case("latest.json"))
    {
        return Err(CostSearchRouteError::LatestJsonForbidden);
    }

    for window in components.windows(3) {
        if window[0].eq_ignore_ascii_case("lab")
            && window[1].eq_ignore_ascii_case("runs")
            && window[2].to_ascii_uppercase().starts_with("RUN_")
        {
            return Err(CostSearchRouteError::LabRunsRunStarForbidden);
        }
    }

    Ok(())
}

fn normal_components(path: &Path) -> Vec<String> {
    path.components()
        .filter_map(|component| match component {
            Component::Normal(value) => Some(value.to_string_lossy().replace('\\', "/")),
            _ => None,
        })
        .collect()
}
