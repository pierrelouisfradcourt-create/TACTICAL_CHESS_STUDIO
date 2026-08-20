
TACTICAL CHESS STUDIO — PATCH OMEGA V1

This patch adds:

- Tournament runner
- Self-play runner
- Dataset builder
- Basic agents (random / heuristic)
- Telemetry logging
- ML dataset export (for PyTorch)

INSTALLATION (simple):

1. Backup your project folder.
2. Copy folders from this patch into your project /src directory.
3. Merge if folders already exist.
4. Rebuild:

cargo build

5. Run examples:

cargo run simulate 10
cargo run tournament 10
cargo run selfplay 100
cargo run dataset_build
