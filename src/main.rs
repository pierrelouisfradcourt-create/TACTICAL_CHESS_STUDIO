mod agents;
mod chess;
mod engine;
mod prototype;
mod simulation;
mod tool;
mod tournament;

use simulation::teacher_uci_runner::TeacherUciRunner;

fn resolve_stockfish_path() -> String {
    if let Ok(path) = std::env::var("TCS_STOCKFISH_PATH") {
        return path;
    }

    let candidates = [
        r"C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\TacticalChessPureLab\stockfish.exe",
        r"C:\Users\wazou\Desktop\TACTICAL_CHESS_STUDIO\TacticalChessPureLab\stockfish.exe.exe",
    ];

    for candidate in candidates {
        if std::path::Path::new(candidate).exists() {
            return candidate.to_string();
        }
    }

    candidates[0].to_string()
}

fn main() {
    let args: Vec<String> = std::env::args().collect();

    if args.len() < 2 {
        tool::cli::run_cli(args);
        return;
    }

    match args[1].as_str() {
        "teacher_uci" => {
            let games = if args.len() > 2 {
                args[2].parse::<usize>().unwrap_or(10)
            } else {
                10
            };

            let stockfish_path = resolve_stockfish_path();

            let depth = std::env::var("TCS_TEACHER_DEPTH")
                .ok()
                .and_then(|value| value.parse::<u32>().ok())
                .unwrap_or(12);

            println!("Generating teacher dataset with {} games...", games);
            println!("Using Stockfish path: {}", stockfish_path);

            let runner = TeacherUciRunner::new(games, stockfish_path, depth);
            runner.run_batch();

            println!("Dataset written to lab/datasets/teacher_samples.jsonl");
        }

        _ => {
            tool::cli::run_cli(args);
        }
    }
}
