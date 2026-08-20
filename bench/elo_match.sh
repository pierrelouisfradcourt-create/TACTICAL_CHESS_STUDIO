#!/usr/bin/env bash
# Oracle ELO — Rocky vs league (heuristic / hybrid / neural)
# DÉCIDE. Ne pas modifier (FORBIDDEN — voir AGENTS.md).
# Usage : ./bench/elo_match.sh [--games N]
# Sortie : lab/reports/elo_match_latest.json (+ .hmac)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

GAMES=20
while [[ $# -gt 0 ]]; do
    case "$1" in
        --games) GAMES="$2"; shift 2 ;;
        *) echo "Usage: $0 [--games N]" >&2; exit 1 ;;
    esac
done

OUT="lab/reports/elo_match_latest.json"
mkdir -p lab/reports

echo "[elo_match] building release binary..."
cargo build --release 2>&1 | tail -3

# Chemin du elo.csv produit par le binary (experiment_paths.rs → tournament_dir())
EXPERIMENT_ID="${TCS_EXPERIMENT_ID:-exp_003_aggressive}"
ELO_CSV="lab/experiments/${EXPERIMENT_ID}/tournaments/elo.csv"

echo "[elo_match] running neural_tournament (games=$GAMES)..."
# stdout vers log — 35k+ lignes de traces diagnostiques, inutiles ici
LOG="lab/reports/elo_match_run.log"
cargo run --release -- neural_tournament "$GAMES" > "$LOG" 2>&1
EXIT_CODE=$?

# Afficher uniquement les lignes de rapport (REPORT/ELO/WARNING/Saved)
grep -E "^(NEURAL TOURNAMENT REPORT|MAIN_EVAL|CALIBRATION|ELO LEADERBOARD|WARNING|Saved to|Running|Neural bridge)" "$LOG" || true

if [[ $EXIT_CODE -ne 0 ]]; then
    echo "[elo_match] ERROR: binary exited with code $EXIT_CODE" >&2
    tail -20 "$LOG" >&2
    exit 1
fi

if [[ ! -f "$ELO_CSV" ]]; then
    echo "[elo_match] ERROR: elo.csv absent ($ELO_CSV) — le tournoi a-t-il abouti ?" >&2
    exit 1
fi

echo "[elo_match] elo.csv trouvé : $ELO_CSV"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

python3 - "$ELO_CSV" "$GAMES" "$TIMESTAMP" "$OUT" <<'PYEOF'
import csv, json, sys

elo_csv_path, games_str, timestamp, out_path = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]

ratings = {}
with open(elo_csv_path, encoding="utf-8") as f:
    for row in csv.DictReader(f):
        ratings[row["agent"]] = float(row["elo"])

heuristic = ratings.get("heuristic")
hybrid    = ratings.get("hybrid")
neural    = ratings.get("neural")

if hybrid is not None and heuristic is not None:
    delta   = hybrid - heuristic
    verdict = "PASS" if delta >= 20 else "FAIL"
    reason  = f"hybrid={hybrid:.0f} heuristic={heuristic:.0f} delta={delta:+.0f} (target>=+20)"
else:
    delta   = None
    verdict = "BLOCKED"
    reason  = "rating heuristic ou hybrid absent du elo.csv"

result = {
    "timestamp": timestamp,
    "games": int(games_str),
    "ratings": ratings,
    "delta_hybrid_vs_heuristic": round(delta, 1) if delta is not None else None,
    "verdict": verdict,
    "reason": reason,
}
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(result, f, indent=2, ensure_ascii=False)

print(f"[elo_match] {', '.join(f'{a}={v:.0f}' for a, v in sorted(ratings.items()))}")
print(f"[elo_match] verdict={verdict} -- {reason}")
PYEOF

# Signature HMAC
if [[ -n "${STUDIO_HMAC_KEY:-}" ]]; then
    openssl dgst -sha256 -hmac "$STUDIO_HMAC_KEY" "$OUT" > "${OUT}.hmac"
    echo "[elo_match] HMAC signe -> ${OUT}.hmac"
else
    echo "[elo_match] WARN: STUDIO_HMAC_KEY absent -- verdict non signe" >&2
fi

echo "[elo_match] rapport -> $OUT"
