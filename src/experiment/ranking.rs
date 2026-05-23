use postgres::Client;

pub fn print_top_rulesets(client: &mut Client, limit: i32) {
    let rows = client
        .query(
            "SELECT r.id, r.name, b.balance_score, b.quality_score
             FROM balance_reports b
             JOIN simulation_runs s ON s.id = b.run_id
             JOIN rulesets r ON r.id = s.ruleset_id
             ORDER BY b.balance_score DESC, b.quality_score DESC
             LIMIT $1",
            &[&limit],
        )
        .unwrap();
    println!("Top Rulesets:");
    for row in rows {
        let id: i32 = row.get(0);
        let name: String = row.get(1);
        let balance: f32 = row.get(2);
        let quality: f32 = row.get(3);
        println!("{} | {} | balance {:.3} | quality {:.3}", id, name, balance, quality);
    }
}

