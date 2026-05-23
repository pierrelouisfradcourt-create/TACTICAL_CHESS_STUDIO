from pathlib import Path
import sys

ROOT = Path(".")
EXP_ID = sys.argv[1] if len(sys.argv) > 1 else "exp_002_test"

REPLACEMENTS = {
    'create_dir_all("lab/tournaments")': f'create_dir_all("lab/experiments/{EXP_ID}/tournaments")',
    'Path::new("lab/tournaments/games.csv")': f'Path::new("lab/experiments/{EXP_ID}/tournaments/games.csv")',
    'Path::new("lab/tournaments/matches.csv")': f'Path::new("lab/experiments/{EXP_ID}/tournaments/matches.csv")',
    'Path::new("lab/tournaments/elo.csv")': f'Path::new("lab/experiments/{EXP_ID}/tournaments/elo.csv")',
    'Path::new("lab/tournaments/games_detailed.csv")': f'Path::new("lab/experiments/{EXP_ID}/tournaments/games_detailed.csv")',
    'let path = "lab/tournaments/moves_detailed.csv";': f'let path = "lab/experiments/{EXP_ID}/tournaments/moves_detailed.csv";',
    'MOVES_PATH = "lab/tournaments/moves_detailed.csv"': f'MOVES_PATH = "lab/experiments/{EXP_ID}/tournaments/moves_detailed.csv"',
    'GAMES_PATH = "lab/tournaments/games.csv"': f'GAMES_PATH = "lab/experiments/{EXP_ID}/tournaments/games.csv"',
    'OUTPUT_DIR = "lab/analysis"': f'OUTPUT_DIR = "lab/experiments/{EXP_ID}/analysis"',
}

TARGETS = [
    ROOT / "src" / "simulation" / "simulation_runner.rs",
    ROOT / "src" / "tournament" / "export.rs",
    ROOT / "ml" / "analyze_move_profiles.py",
]

def patch_file(path: Path) -> None:
    if not path.exists():
        print(f"[SKIP] Missing: {path}")
        return

    original = path.read_text(encoding="utf-8")
    patched = original

    for old, new in REPLACEMENTS.items():
        patched = patched.replace(old, new)

    if patched != original:
        backup = path.with_suffix(path.suffix + ".bak")
        backup.write_text(original, encoding="utf-8")
        path.write_text(patched, encoding="utf-8")
        print(f"[PATCHED] {path}")
        print(f"[BACKUP]  {backup}")
    else:
        print(f"[NO CHANGE] {path}")

def ensure_dirs() -> None:
    (ROOT / "lab" / "experiments" / EXP_ID / "tournaments").mkdir(parents=True, exist_ok=True)
    (ROOT / "lab" / "experiments" / EXP_ID / "analysis").mkdir(parents=True, exist_ok=True)
    config = ROOT / "lab" / "experiments" / EXP_ID / "config.json"
    if not config.exists():
        config.write_text(
            '{\n'
            f'  "experiment_id": "{EXP_ID}",\n'
            '  "status": "active"\n'
            '}\n',
            encoding="utf-8",
        )
        print(f"[CREATED] {config}")

def main() -> None:
    ensure_dirs()
    for target in TARGETS:
        patch_file(target)
    print(f"\nDone. Active experiment: {EXP_ID}")

if __name__ == "__main__":
    main()