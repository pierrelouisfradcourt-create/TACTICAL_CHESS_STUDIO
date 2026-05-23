use std::fs::{create_dir_all, OpenOptions};
use std::io::Write;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::chess::search::choose_best_action;
use crate::engine::action::command::Command;
use crate::prototype::minimal_ruleset::{load_engine_from_ruleset, minimal_runtime_ruleset};
use crate::prototype::runtime_ruleset::RuntimeRuleset;
use crate::simulation::simulation_runner::{MatchSummary, MatchTermination};

pub struct SelfPlayConfig {
    pub games: u32,
    pub results_path: String,
    pub moves_path: String,
    pub max_steps: u32,
}

pub struct SelfPlayManager {
    pub config: SelfPlayConfig,
    pub ruleset: RuntimeRuleset,
}

impl SelfPlayManager {
    pub fn new(games: u32) -> Self {
        Self {
            config: SelfPlayConfig {
                games,
                results_path: "lab/selfplay/results.csv".to_string(),
                moves_path: "lab/selfplay/moves.csv".to_string(),
                max_steps: 150,
            },
            ruleset: minimal_runtime_ruleset(),
        }
    }

    pub fn run(&mut self) -> Vec<MatchSummary> {
        ensure_parent_dir(&self.config.results_path);
        ensure_parent_dir(&self.config.moves_path);

        self.prepare_results_file();
        self.prepare_moves_file();

        let mut summaries = Vec::with_capacity(self.config.games as usize);

        for game_index in 0..self.config.games {
            let game_id = game_index + 1;

            let (summary, move_rows) = self.run_one_game(game_id);

            self.append_result(game_id, &summary);
            self.append_moves(&move_rows);

            println!(
                "SelfPlay Match {}/{} -> winner: {:?}, turns: {}, actions: {}, termination: {:?}",
                game_id,
                self.config.games,
                summary.winner,
                summary.turns,
                summary.actions,
                summary.termination
            );

            if game_id % 10 == 0 || game_id == self.config.games {
                println!("SelfPlay Progress: {}/{}", game_id, self.config.games);
            }

            summaries.push(summary);
        }

        summaries
    }

    fn run_one_game(&self, game_id: u32) -> (MatchSummary, Vec<MoveRow>) {
        let mut engine = load_engine_from_ruleset(&self.ruleset);
        let mut step: u32 = 0;
        let mut move_rows: Vec<MoveRow> = Vec::new();

        while !engine.game_over() && step < self.config.max_steps {
            let player = engine.turn_manager.current_player;
            let legal_count = engine.legal_actions(player).len() as u32;
            let position_before = board_snapshot(&engine);

            let Some(action) = choose_best_action(&engine, player) else {
                break;
            };

            let action_text = format!("{:?}", action);

            let cmd = Command {
                player_id: player,
                action,
            };

            engine.execute(cmd);

            let position_after = board_snapshot(&engine);

            move_rows.push(MoveRow {
                game_id,
                ply: step + 1,
                player,
                action: action_text,
                legal_actions: legal_count,
                turn_index: engine.turn_manager.turn_index,
                position_before,
                position_after,
                winner_final: String::new(),
                termination: String::new(),
            });

            step += 1;
        }

        let winner = engine.winner();

        let termination = if engine.game_over() {
            if winner.is_some() {
                MatchTermination::Winner
            } else {
                MatchTermination::Draw
            }
        } else {
            MatchTermination::TurnLimit
        };

        let termination_text = match &termination {
            MatchTermination::Winner => "winner".to_string(),
            MatchTermination::Draw => "draw".to_string(),
            MatchTermination::ForcedDrawStagnation => "forced_draw_stagnation".to_string(),
            MatchTermination::TurnLimit => "turn_limit".to_string(),
        };

        let summary = MatchSummary {
            winner,
            turns: engine.turn_manager.turn_index,
            actions: engine.action_log.len(),
            termination,
            termination_ply: step,
            progress_counter: 0,
            last_capture_ply: 0,
            last_pawn_move_ply: 0,
            winner_reason: termination_text.clone(),
            purity_violations: 0,
            ..Default::default()
        };

        let winner_text = match summary.winner {
            Some(w) => w.to_string(),
            None => "draw".to_string(),
        };

        let termination_text = match &summary.termination {
            MatchTermination::Winner => "winner".to_string(),
            MatchTermination::Draw => "draw".to_string(),
            MatchTermination::ForcedDrawStagnation => "forced_draw_stagnation".to_string(),
            MatchTermination::TurnLimit => "turn_limit".to_string(),
        };

        for row in &mut move_rows {
            row.winner_final = winner_text.clone();
            row.termination = termination_text.clone();
        }

        (summary, move_rows)
    }

    fn prepare_results_file(&self) {
        let path = std::path::Path::new(&self.config.results_path);

        if !path.exists() {
            let mut file = OpenOptions::new()
                .create(true)
                .append(true)
                .open(path)
                .expect("failed to create results.csv");

            writeln!(file, "timestamp,game_id,winner,turns,actions,termination")
                .expect("failed to write results header");
        }
    }

    fn prepare_moves_file(&self) {
        let path = std::path::Path::new(&self.config.moves_path);

        if !path.exists() {
            let mut file = OpenOptions::new()
                .create(true)
                .append(true)
                .open(path)
                .expect("failed to create moves.csv");

            writeln!(
                file,
                "timestamp,game_id,ply,player,action,legal_actions,turn_index,position_before,position_after,winner_final,termination"
            )
            .expect("failed to write moves header");
        }
    }

    fn append_result(&self, game_id: u32, summary: &MatchSummary) {
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.config.results_path)
            .expect("failed to open results.csv");

        let winner_text = match summary.winner {
            Some(w) => w.to_string(),
            None => "draw".to_string(),
        };

        let termination_text = match &summary.termination {
            MatchTermination::Winner => "winner",
            MatchTermination::Draw => "draw",
            MatchTermination::ForcedDrawStagnation => "forced_draw_stagnation",
            MatchTermination::TurnLimit => "turn_limit",
        };

        writeln!(
            file,
            "{},{},{},{},{},{}",
            now_unix(),
            game_id,
            winner_text,
            summary.turns,
            summary.actions,
            termination_text
        )
        .expect("failed to append result row");
    }

    fn append_moves(&self, rows: &[MoveRow]) {
        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.config.moves_path)
            .expect("failed to open moves.csv");

        for row in rows {
            writeln!(
                file,
                "{},{},{},{},{},{},{},{},{},{},{}",
                now_unix(),
                row.game_id,
                row.ply,
                row.player,
                sanitize_csv(&row.action),
                row.legal_actions,
                row.turn_index,
                sanitize_csv(&row.position_before),
                sanitize_csv(&row.position_after),
                row.winner_final,
                row.termination
            )
            .expect("failed to append move row");
        }
    }
}

struct MoveRow {
    game_id: u32,
    ply: u32,
    player: u32,
    action: String,
    legal_actions: u32,
    turn_index: u32,
    position_before: String,
    position_after: String,
    winner_final: String,
    termination: String,
}

fn board_snapshot(engine: &crate::engine::engine::Engine) -> String {
    let mut parts: Vec<String> = engine
        .units
        .values()
        .map(|unit| {
            format!(
                "{}:{}:{}:{}:{}",
                unit.owner, unit.template_name, unit.position.x, unit.position.y, unit.id
            )
        })
        .collect();

    parts.sort();
    parts.join("|")
}

fn now_unix() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("time went backwards")
        .as_secs()
}

fn ensure_parent_dir(path: &str) {
    if let Some(parent) = std::path::Path::new(path).parent() {
        if !parent.as_os_str().is_empty() {
            create_dir_all(parent).expect("failed to create parent directory");
        }
    }
}

fn sanitize_csv(s: &str) -> String {
    s.replace(',', ";").replace('\n', " ").replace('\r', " ")
}
