use crate::chess::puzzle::{generate_puzzle_cases, PuzzleTheme};
use std::fs;

pub fn run_puzzle_rng(args: &[String]) {
    let mut theme = PuzzleTheme::Mate1;
    let mut count: usize = 100;
    let mut seed: u64 = 42;

    let mut index = 1;
    while index < args.len() {
        match args[index].as_str() {
            "--theme" => {
                if let Some(value) = args.get(index + 1) {
                    if let Some(parsed) = PuzzleTheme::parse(value) {
                        theme = parsed;
                    }
                }
                index += 2;
            }
            "--count" => {
                if let Some(value) = args.get(index + 1) {
                    if let Ok(parsed) = value.parse::<usize>() {
                        count = parsed;
                    }
                }
                index += 2;
            }
            "--seed" => {
                if let Some(value) = args.get(index + 1) {
                    if let Ok(parsed) = value.parse::<u64>() {
                        seed = parsed;
                    }
                }
                index += 2;
            }
            _ => {
                index += 1;
            }
        }
    }

    let cases = generate_puzzle_cases(theme, count, seed);
    let output_path = format!(
        "lab/puzzles/puzzle_rng_{}_seed{}.jsonl",
        theme.as_str(),
        seed
    );
    if let Some(parent) = std::path::Path::new(&output_path).parent() {
        let _ = fs::create_dir_all(parent);
    }

    let mut lines = Vec::new();
    for case in &cases {
        if let Ok(line) = serde_json::to_string(case) {
            lines.push(line);
        }
    }

    if lines.is_empty() {
        println!("PUZZLE_RNG_STATUS=failed|count=0");
        return;
    }

    match fs::write(&output_path, lines.join("\n")) {
        Ok(()) => {
            println!(
                "PUZZLE_RNG_STATUS=ok|count={}|theme={}|seed={}|path={}",
                cases.len(),
                theme.as_str(),
                seed,
                output_path
            );
        }
        Err(err) => {
            println!("PUZZLE_RNG_STATUS=failed|reason={} ", err);
        }
    }
}
