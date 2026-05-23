use std::cmp::Reverse;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use std::time::Instant;

use serde::Deserialize;

static RETRIEVAL_INDEX: OnceLock<RetrievalIndex> = OnceLock::new();

#[derive(Clone, Debug)]
pub struct RetrievalBias {
    pub matches: usize,
    pub phase: String,
    pub piece_count_bucket: usize,
    pub lookup_us: u128,
    pub unique_good_moves: usize,
    pub unique_bad_moves: usize,
    pub load_status: &'static str,
    good_move_hits: HashMap<String, u8>,
    bad_move_hits: HashMap<String, u8>,
}

impl RetrievalBias {
    pub fn empty(
        phase: &str,
        piece_count_bucket: usize,
        lookup_us: u128,
        load_status: &'static str,
    ) -> Self {
        Self {
            matches: 0,
            phase: phase.to_string(),
            piece_count_bucket,
            lookup_us,
            unique_good_moves: 0,
            unique_bad_moves: 0,
            load_status,
            good_move_hits: HashMap::new(),
            bad_move_hits: HashMap::new(),
        }
    }

    pub fn move_hits(&self, mv: &str) -> (usize, usize) {
        (
            self.good_move_hits.get(mv).copied().unwrap_or(0) as usize,
            self.bad_move_hits.get(mv).copied().unwrap_or(0) as usize,
        )
    }

    pub fn move_bias(&self, mv: &str, good_bonus: f32, bad_penalty: f32) -> f32 {
        let (good_hits, bad_hits) = self.move_hits(mv);
        (good_hits.min(3) as f32 * good_bonus) - (bad_hits.min(3) as f32 * bad_penalty)
    }
}

#[derive(Clone, Debug)]
struct RetrievalEntry {
    good_move: String,
    bad_moves: Vec<String>,
}

#[derive(Clone, Debug, Eq, Hash, PartialEq)]
struct RetrievalKey {
    phase: String,
    material_signature: String,
    piece_count_bucket: usize,
}

#[derive(Default)]
struct RetrievalIndex {
    buckets: HashMap<RetrievalKey, Vec<RetrievalEntry>>,
    load_error: Option<String>,
}

#[derive(Deserialize)]
struct RetrievalManifest {
    files: Vec<String>,
}

#[derive(Deserialize)]
struct RetrievalRow {
    fen: String,
    good_move: String,
    #[serde(default)]
    bad_moves: Vec<String>,
    phase: String,
    material_signature: String,
    #[serde(default)]
    quality: String,
    #[serde(default)]
    trainable: bool,
}

pub fn warm_index() {
    let _ = RETRIEVAL_INDEX.get_or_init(load_index);
}

pub fn piece_count_bucket(piece_count: usize) -> usize {
    piece_count / 4
}

pub fn query_similar_positions(
    phase: &str,
    material_signature: &str,
    piece_count_bucket: usize,
    top_n: usize,
) -> RetrievalBias {
    let start = Instant::now();
    let index = RETRIEVAL_INDEX.get_or_init(load_index);
    let lookup_us = start.elapsed().as_micros();

    if index.load_error.is_some() {
        return RetrievalBias::empty(phase, piece_count_bucket, lookup_us, "unavailable");
    }

    let mut collected: Vec<&RetrievalEntry> = Vec::new();

    for bucket in nearby_buckets(piece_count_bucket) {
        let key = RetrievalKey {
            phase: phase.to_string(),
            material_signature: material_signature.to_string(),
            piece_count_bucket: bucket,
        };

        if let Some(entries) = index.buckets.get(&key) {
            for entry in entries {
                collected.push(entry);
                if collected.len() >= top_n {
                    break;
                }
            }
        }

        if collected.len() >= top_n {
            break;
        }
    }

    if collected.is_empty() {
        return RetrievalBias::empty(phase, piece_count_bucket, lookup_us, "ready");
    }

    let mut good_move_hits: HashMap<String, u8> = HashMap::new();
    let mut bad_move_hits: HashMap<String, u8> = HashMap::new();

    for entry in &collected {
        *good_move_hits.entry(entry.good_move.clone()).or_insert(0) += 1;
        for bad_move in &entry.bad_moves {
            *bad_move_hits.entry(bad_move.clone()).or_insert(0) += 1;
        }
    }

    RetrievalBias {
        matches: collected.len(),
        phase: phase.to_string(),
        piece_count_bucket,
        lookup_us,
        unique_good_moves: good_move_hits.len(),
        unique_bad_moves: bad_move_hits.len(),
        load_status: "ready",
        good_move_hits,
        bad_move_hits,
    }
}

fn nearby_buckets(bucket: usize) -> Vec<usize> {
    let mut buckets = vec![bucket];
    for delta in 1..=2 {
        if let Some(lower) = bucket.checked_sub(delta) {
            buckets.push(lower);
        }
        buckets.push(bucket + delta);
    }
    buckets
}

fn load_index() -> RetrievalIndex {
    let manifest_path = retrieval_manifest_path();
    let manifest_parent = manifest_path
        .parent()
        .map(Path::to_path_buf)
        .unwrap_or_else(|| PathBuf::from("."));

    let manifest_text = match fs::read_to_string(&manifest_path) {
        Ok(text) => text,
        Err(err) => {
            return RetrievalIndex {
                buckets: HashMap::new(),
                load_error: Some(format!(
                    "failed_to_read_manifest:{}:{}",
                    manifest_path.display(),
                    err
                )),
            };
        }
    };

    let manifest: RetrievalManifest = match serde_json::from_str(&manifest_text) {
        Ok(manifest) => manifest,
        Err(err) => {
            return RetrievalIndex {
                buckets: HashMap::new(),
                load_error: Some(format!("failed_to_parse_manifest:{}", err)),
            };
        }
    };

    let mut buckets: HashMap<RetrievalKey, Vec<(u8, RetrievalEntry)>> = HashMap::new();

    for relative_file in manifest.files {
        if !relative_file.ends_with(".jsonl") {
            continue;
        }

        let path = resolve_manifest_file(&manifest_parent, &relative_file);
        let content = match fs::read_to_string(&path) {
            Ok(content) => content,
            Err(err) => {
                return RetrievalIndex {
                    buckets: HashMap::new(),
                    load_error: Some(format!("failed_to_read_dataset:{}:{}", path.display(), err)),
                };
            }
        };

        for line in content.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }

            let row: RetrievalRow = match serde_json::from_str(line) {
                Ok(row) => row,
                Err(err) => {
                    return RetrievalIndex {
                        buckets: HashMap::new(),
                        load_error: Some(format!(
                            "failed_to_parse_dataset_row:{}:{}",
                            path.display(),
                            err
                        )),
                    };
                }
            };

            if !row.trainable || row.good_move.is_empty() {
                continue;
            }

            let piece_count = piece_count_from_fen(&row.fen).unwrap_or(0);
            let key = RetrievalKey {
                phase: row.phase,
                material_signature: row.material_signature,
                piece_count_bucket: piece_count_bucket(piece_count),
            };

            buckets.entry(key).or_default().push((
                quality_rank(&row.quality),
                RetrievalEntry {
                    good_move: row.good_move,
                    bad_moves: row.bad_moves,
                },
            ));
        }
    }

    let buckets = buckets
        .into_iter()
        .map(|(key, mut entries)| {
            entries.sort_by_key(|(rank, entry)| {
                (
                    *rank,
                    Reverse(entry.bad_moves.len()),
                    entry.good_move.clone(),
                )
            });
            (
                key,
                entries
                    .into_iter()
                    .map(|(_, entry)| entry)
                    .collect::<Vec<_>>(),
            )
        })
        .collect();

    RetrievalIndex {
        buckets,
        load_error: None,
    }
}

fn resolve_manifest_file(manifest_parent: &Path, relative_file: &str) -> PathBuf {
    let relative_path = PathBuf::from(relative_file);
    if relative_path.is_absolute() {
        relative_path
    } else if relative_path.starts_with("lab") {
        relative_path
    } else {
        manifest_parent.join(relative_path)
    }
}

fn retrieval_manifest_path() -> PathBuf {
    std::env::var("TCS_RETRIEVAL_MANIFEST")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("lab\\reverse_dataset\\manifest.json"))
}

fn piece_count_from_fen(fen: &str) -> Option<usize> {
    let board_part = fen.split_whitespace().next()?;
    let mut count = 0usize;
    for ch in board_part.chars() {
        if ch == '/' || ch.is_ascii_digit() {
            continue;
        }
        count += 1;
    }
    Some(count)
}

fn quality_rank(quality: &str) -> u8 {
    match quality {
        "elite" => 0,
        "good" => 1,
        "noisy" => 2,
        _ => 3,
    }
}

#[cfg(test)]
mod tests {
    use super::{piece_count_bucket, query_similar_positions, warm_index};
    use std::fs;

    #[test]
    fn piece_count_bucket_groups_in_quads() {
        assert_eq!(piece_count_bucket(32), 8);
        assert_eq!(piece_count_bucket(17), 4);
        assert_eq!(piece_count_bucket(8), 2);
    }

    #[test]
    fn retrieval_query_finds_opening_start_position() {
        let fixture_root = std::env::temp_dir().join(format!(
            "kenpachi_retrieval_fixture_{}",
            std::process::id()
        ));
        fs::create_dir_all(&fixture_root).expect("fixture dir should be created");

        let manifest_path = fixture_root.join("manifest.json");
        let rows_path = fixture_root.join("opening.jsonl");
        fs::write(&manifest_path, r#"{"files":["opening.jsonl"]}"#)
            .expect("manifest fixture should be written");
        fs::write(
            &rows_path,
            r#"{"fen":"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1","good_move":"e2e4","bad_moves":["a2a3"],"phase":"opening","material_signature":"W:Q1R2B2N2P8|B:Q1R2B2N2P8","quality":"elite","trainable":true}"#,
        )
        .expect("retrieval row fixture should be written");

        std::env::set_var("TCS_RETRIEVAL_MANIFEST", &manifest_path);
        warm_index();
        let bias = query_similar_positions("opening", "W:Q1R2B2N2P8|B:Q1R2B2N2P8", 8, 10);
        assert!(bias.matches > 0, "expected opening matches, got {:?}", bias);
        assert!(bias.unique_good_moves > 0, "expected known good moves");
        assert!(bias.unique_bad_moves > 0, "expected known bad moves");
    }
}
