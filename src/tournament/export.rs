use std::fs::{create_dir_all, File};
use std::io::{BufWriter, Write};
use std::path::PathBuf;

use crate::simulation::neural_tournament_runner::{
    GameRecord, TournamentBenchmarkStatus, TournamentResult,
};
use crate::tool::experiment_paths::{experiment_id, tournament_dir};

pub fn ensure_tournament_dir() -> std::io::Result<()> {
    create_dir_all(tournament_dir())
}

fn tournament_file(name: &str) -> PathBuf {
    tournament_dir().join(name)
}

pub fn export_games_csv(
    records: &[GameRecord],
    _benchmark_status: &TournamentBenchmarkStatus,
) -> std::io::Result<()> {
    ensure_tournament_dir()?;

    let file = File::create(tournament_file("games.csv"))?;
    let mut writer = BufWriter::new(file);

    writeln!(
        writer,
        "game_id,agent_a,agent_b,white,black,winner,turns,termination,termination_type,termination_ply,progress_counter,last_capture_ply,last_pawn_move_ply,winner_reason,match_block,purity_violations"
    )?;

    for r in records {
        let winner = match r.winner {
            Some(1) => "white",
            Some(2) => "black",
            None => "draw",
            _ => "draw",
        };

        writeln!(
            writer,
            "{},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{}",
            r.game_id,
            r.agent_a,
            r.agent_b,
            r.white,
            r.black,
            winner,
            r.turns,
            r.termination,
            r.termination_type,
            r.termination_ply,
            r.progress_counter,
            r.last_capture_ply,
            r.last_pawn_move_ply,
            r.winner_reason,
            r.match_block,
            r.purity_violations
        )?;
    }

    Ok(())
}

pub fn export_matches_csv(results: &[TournamentResult]) -> std::io::Result<()> {
    ensure_tournament_dir()?;

    let file = File::create(tournament_file("matches.csv"))?;
    let mut writer = BufWriter::new(file);

    writeln!(
        writer,
        "agent_a,agent_b,games,wins_a,wins_b,draws,match_block"
    )?;

    for r in results {
        writeln!(
            writer,
            "{},{},{},{},{},{},{}",
            r.agent_a, r.agent_b, r.games, r.wins_a, r.wins_b, r.draws, r.match_block
        )?;
    }

    Ok(())
}

pub fn export_elo_csv(rows: &[(String, f64)]) -> std::io::Result<()> {
    ensure_tournament_dir()?;

    let file = File::create(tournament_file("elo.csv"))?;
    let mut writer = BufWriter::new(file);

    writeln!(writer, "agent,elo")?;

    for (agent, elo) in rows {
        writeln!(writer, "{},{:.2}", agent, elo)?;
    }

    Ok(())
}

pub fn export_benchmark_status_csv(
    benchmark_status: &TournamentBenchmarkStatus,
) -> std::io::Result<()> {
    ensure_tournament_dir()?;

    let file = File::create(tournament_file("benchmark_status.csv"))?;
    let mut writer = BufWriter::new(file);

    writeln!(
        writer,
        "benchmark_invalid,contaminated_match_count,purity_violation_total,contamination_reason"
    )?;

    writeln!(
        writer,
        "{},{},{},\"{}\"",
        if benchmark_status.benchmark_invalid {
            "yes"
        } else {
            "no"
        },
        benchmark_status.contaminated_match_count,
        benchmark_status.purity_violation_total,
        benchmark_status.contamination_reason
    )?;

    Ok(())
}

// ========================================
// COUVEUSE V1.1 — NEW EXPORTS
// ========================================

pub fn export_games_detailed_csv(records: &[GameRecord]) -> std::io::Result<()> {
    ensure_tournament_dir()?;

    let file = File::create(tournament_file("games_detailed.csv"))?;
    let mut writer = BufWriter::new(file);

    writeln!(
        writer,
        "run_id,game_id,model_profile,opponent_type,winner,result,termination,termination_type,termination_ply,progress_counter,last_capture_ply,last_pawn_move_ply,winner_reason,turn_count,match_block"
    )?;

    for r in records {
        let winner = match r.winner {
            Some(1) => "white",
            Some(2) => "black",
            None => "draw",
            _ => "draw",
        };

        let result = match r.winner {
            Some(1) => "1-0",
            Some(2) => "0-1",
            None if r.termination == "capped_draw" => "capped_draw",
            None => "1/2-1/2",
            _ => "1/2-1/2",
        };

        writeln!(
            writer,
            "{},{},{},{},{},{},{},{},{},{},{},{},{},{},{}",
            experiment_id(),
            r.game_id,
            r.agent_b,
            r.agent_a,
            winner,
            result,
            r.termination,
            r.termination_type,
            r.termination_ply,
            r.progress_counter,
            r.last_capture_ply,
            r.last_pawn_move_ply,
            r.winner_reason,
            r.turns,
            r.match_block
        )?;
    }

    Ok(())
}
