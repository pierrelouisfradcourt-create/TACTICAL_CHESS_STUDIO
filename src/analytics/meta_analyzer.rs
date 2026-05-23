use postgres::Client;

#[derive(Debug, Clone)]
pub struct MetaSnapshotInput {
    pub snapshot_name: String,
    pub source_run_id: i32,
    pub total_matches: i32,
    pub avg_balance: f64,
    pub avg_quality: f64,
    pub collapse_rate: f64,
}

pub fn create_meta_snapshot(client: &mut Client, input: &MetaSnapshotInput) -> Result<i32, postgres::Error> {
    let row = client.query_one(
        "INSERT INTO meta_snapshots
        (snapshot_name, source_run_id, total_matches, avg_balance, avg_quality, collapse_rate)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id",
        &[
            &input.snapshot_name,
            &input.source_run_id,
            &input.total_matches,
            &input.avg_balance,
            &input.avg_quality,
            &input.collapse_rate,
        ],
    )?;

    Ok(row.get(0))
}

