use postgres::Client;

use crate::tool::balance_tool::BalanceReport;

pub fn insert_balance_report(client: &mut Client, run_id: i32, report: &BalanceReport) {
    client
        .execute(
            "INSERT INTO balance_reports
            (run_id,balance_score,quality_score,dominant_strategy_score,confidence)
            VALUES ($1,$2,$3,$4,$5)",
            &[
                &run_id,
                &(report.balance_score as f64),
                &(report.quality_score as f64),
                &(0.0 as f64),
                &(1.0 as f64),
            ],
        )
        .unwrap();
}

pub fn list_balance_reports(client: &mut Client) {
    let rows = client
        .query(
            "SELECT id,run_id,balance_score,quality_score FROM balance_reports ORDER BY id DESC",
            &[],
        )
        .unwrap();

    for r in rows {
        let id: i32 = r.get(0);
        let run: i32 = r.get(1);
        let balance: f64 = r.get(2);
        let quality: f64 = r.get(3);

        println!("report {} run {} balance {} quality {}", id, run, balance, quality);
    }
}
