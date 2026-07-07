use crate::simulation::simulation_runner::MatchSummary;

#[derive(Clone, Debug)]
pub struct BalanceReport {
    pub matches: usize,
    pub p1_rate: f32,
    pub p2_rate: f32,
    pub draw_rate: f32,
    pub avg_turns: f32,
    pub first_player_advantage: f32,
    pub balance_score: f32,
    pub quality_score: f32,
}

pub fn analyze_matches(results: &[MatchSummary]) -> BalanceReport {
    let total = results.len() as f32;
    let p1_wins = results.iter().filter(|r| r.winner == Some(1)).count() as f32;
    let p2_wins = results.iter().filter(|r| r.winner == Some(2)).count() as f32;
    let draws = results.iter().filter(|r| r.winner.is_none()).count() as f32;
    let avg_turns = if total > 0.0 { results.iter().map(|r| r.turns as f32).sum::<f32>() / total } else { 0.0 };
    let p1_rate = if total > 0.0 { p1_wins / total } else { 0.0 };
    let p2_rate = if total > 0.0 { p2_wins / total } else { 0.0 };
    let draw_rate = if total > 0.0 { draws / total } else { 0.0 };
    let first_player_advantage = p1_rate - p2_rate;
    let imbalance = (0.5 - p1_rate).abs();
    let balance_score = (1.0 - imbalance) * (1.0 - first_player_advantage.abs());
    let duration_score = if avg_turns > 0.0 { (1.0 - ((10.0 - avg_turns).abs() / 10.0)).max(0.0) } else { 0.0 };
    let quality_score = 0.7 * balance_score + 0.3 * duration_score;
    BalanceReport { matches: results.len(), p1_rate, p2_rate, draw_rate, avg_turns, first_player_advantage, balance_score, quality_score }
}

pub fn render_report(report: &BalanceReport) -> String {
    format!(
        "Matches:{}\nPlayer1 win rate:{:.3}\nPlayer2 win rate:{:.3}\nDraw rate:{:.3}\nAvg turns:{:.2}\nFirst-player advantage:{:.3}\nBalance score:{:.3}\nQuality score:{:.3}",
        report.matches,
        report.p1_rate,
        report.p2_rate,
        report.draw_rate,
        report.avg_turns,
        report.first_player_advantage,
        report.balance_score,
        report.quality_score,
    )
}

