use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};

use crate::chess::uci::action_to_uci;
use crate::engine::action::action::Action;
use crate::engine::engine::Engine;
use crate::engine::entity::unit::PlayerId;

pub struct UciAgent {
    child: Child,
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
    depth: u32,
    multipv: u32,
}

impl UciAgent {
    pub fn new(stockfish_path: &str, depth: u32) -> Self {
        let raw_path = PathBuf::from(stockfish_path);
        let canonical = raw_path.canonicalize().unwrap_or_else(|_| raw_path.clone());

        println!("UCI DEBUG - launching executable: {}", canonical.display());

        let mut child = Command::new(&canonical)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()
            .unwrap();

        let stdin = child.stdin.take().unwrap();
        let stdout = child.stdout.take().unwrap();

        let mut agent = Self {
            child,
            stdin,
            stdout: BufReader::new(stdout),
            depth,
            multipv: 3, // 🔥 TOP 3 MOVES
        };

        agent.initialize();
        agent
    }

    fn initialize(&mut self) {
        self.send_line("uci");
        self.read_until("uciok");

        // 🔥 ACTIVE MULTIPV
        self.send_line(&format!("setoption name MultiPV value {}", self.multipv));

        self.send_line("isready");
        self.read_until("readyok");
    }

    pub fn new_game(&mut self) {
        self.send_line("ucinewgame");
        self.send_line("isready");
        self.read_until("readyok");
    }

    // 🔥 NOUVEAU : MultiPV request
    pub fn request_top_moves(&mut self, fen: &str) -> (Vec<String>, Vec<f32>, Option<f32>) {
        self.send_line(&format!("position fen {}", fen));
        self.send_line(&format!("go depth {}", self.depth));

        let mut best_move = String::new();
        let mut eval_cp: Option<f32> = None;

        let mut moves: Vec<String> = Vec::new();
        let mut scores: Vec<f32> = Vec::new();

        loop {
            let line = self.read_line();

            if line.starts_with("info ") {
                let parts: Vec<&str> = line.split_whitespace().collect();

                let mut current_move: Option<String> = None;
                let mut current_score: Option<f32> = None;

                for i in 0..parts.len() {
                    if parts[i] == "pv" && i + 1 < parts.len() {
                        current_move = Some(parts[i + 1].to_string());
                    }

                    if parts[i] == "score" && i + 2 < parts.len() {
                        if parts[i + 1] == "cp" {
                            if let Ok(v) = parts[i + 2].parse::<f32>() {
                                current_score = Some(v / 100.0);
                            }
                        } else if parts[i + 1] == "mate" {
                            if let Ok(v) = parts[i + 2].parse::<f32>() {
                                let sign = if v >= 0.0 { 1.0 } else { -1.0 };
                                current_score = Some(sign * 1000.0);
                            }
                        }
                    }
                }

                if let (Some(mv), Some(sc)) = (current_move, current_score) {
                    if !moves.contains(&mv) {
                        moves.push(mv);
                        scores.push(sc);
                    }
                }

                // garde eval principal
                if let Some(sc) = current_score {
                    eval_cp = Some(sc);
                }
            }

            if line.starts_with("bestmove ") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    best_move = parts[1].to_string();
                }
                break;
            }
        }

        if moves.is_empty() && !best_move.is_empty() {
            moves.push(best_move.clone());
            scores.push(eval_cp.unwrap_or(0.0));
        }

        (moves, scores, eval_cp)
    }

    pub fn select_action_from_engine(
        &mut self,
        engine: &Engine,
        player: PlayerId,
    ) -> Option<Action> {
        let fen = engine.to_fen();
        let legal_actions = engine.legal_actions(player);

        if legal_actions.is_empty() {
            return None;
        }

        let (moves, _, _) = self.request_top_moves(&fen);

        for mv in moves {
            if let Some(action) = legal_actions
                .iter()
                .find(|a| action_to_uci(a, &engine.units).as_deref() == Some(mv.as_str()))
            {
                return Some(action.clone());
            }
        }

        legal_actions.first().cloned()
    }

    fn send_line(&mut self, s: &str) {
        writeln!(self.stdin, "{}", s).unwrap();
        self.stdin.flush().unwrap();
    }

    fn read_until(&mut self, needle: &str) {
        loop {
            let line = self.read_line();
            if line.contains(needle) {
                break;
            }
        }
    }

    fn read_line(&mut self) -> String {
        let mut line = String::new();
        self.stdout.read_line(&mut line).unwrap();
        line.trim().to_string()
    }
}

impl Drop for UciAgent {
    fn drop(&mut self) {
        let _ = writeln!(self.stdin, "quit");
        let _ = self.stdin.flush();
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}
