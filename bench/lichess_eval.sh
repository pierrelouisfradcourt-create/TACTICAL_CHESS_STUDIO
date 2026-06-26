#!/usr/bin/env bash
# Oracle tactique — Lichess puzzles L1 / L2 / L3
# DÉCIDE. Ne pas modifier (FORBIDDEN — voir AGENTS.md).
# Usage : ./bench/lichess_eval.sh [--level 1|2|3|all] [--limit N] [--agent search|hybrid|heuristic]
# Sortie : lab/reports/lichess_eval_latest.json (+ .hmac)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

LEVEL="all"
LIMIT=250
AGENT="hybrid"
while [[ $# -gt 0 ]]; do
    case "$1" in
        --level) LEVEL="$2"; shift 2 ;;
        --limit) LIMIT="$2"; shift 2 ;;
        --agent) AGENT="$2"; shift 2 ;;
        *) echo "Usage: $0 [--level 1|2|3|all] [--limit N] [--agent search|hybrid|heuristic]" >&2; exit 1 ;;
    esac
done

OUT="lab/reports/lichess_eval_latest.json"
TMPDIR_REPORTS="lab/reports"
mkdir -p "$TMPDIR_REPORTS"

echo "[lichess_eval] building release binary..."
cargo build --release 2>&1 | tail -3

run_level() {
    local LVL="$1"
    local INPUT="lab/puzzles/level${LVL}.jsonl"
    local OUT_LVL="${TMPDIR_REPORTS}/puzzle_score_level${LVL}.json"

    if [[ ! -f "$INPUT" ]]; then
        echo "[lichess_eval] L${LVL}: fichier absent ($INPUT) — skip" >&2
        echo "null"
        return
    fi

    echo "[lichess_eval] L${LVL}: puzzle_eval --agent $AGENT --limit $LIMIT..." >&2
    cargo run --release -- puzzle_eval \
        --input "$INPUT" \
        --agent "$AGENT" \
        --limit "$LIMIT" \
        --output "$OUT_LVL" 2>&1 | grep -E 'PUZZLE_EVAL_STATUS|ERROR' >&2 || true

    if [[ -f "$OUT_LVL" ]]; then
        echo "$OUT_LVL"
    else
        echo "null"
    fi
}

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if [[ "$LEVEL" == "all" ]]; then
    L1=$(run_level 1)
    L2=$(run_level 2)
    L3=$(run_level 3)
else
    case "$LEVEL" in
        1) L1=$(run_level 1); L2="null"; L3="null" ;;
        2) L1="null"; L2=$(run_level 2); L3="null" ;;
        3) L1="null"; L2="null"; L3=$(run_level 3) ;;
    esac
fi

python3 - <<PYEOF
import json, os

def load(path):
    if path and path != "null" and os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    return None

l1 = load("$L1" if "$L1" != "null" else None)
l2 = load("$L2" if "$L2" != "null" else None)
l3 = load("$L3" if "$L3" != "null" else None)

def extract(data, level):
    if not data:
        return {"level": level, "solved_pct": None, "verdict": "MISSING"}
    total = data.get("total", 0) or 1
    solved = data.get("solved", 0)
    pct = round(solved / total * 100, 1)
    # Seuils : L1>=80%, L2>=10%, L3>=20%
    thresholds = {1: 80.0, 2: 10.0, 3: 20.0}
    thr = thresholds.get(level, 0)
    return {
        "level": level,
        "solved": solved,
        "total": total,
        "solved_pct": pct,
        "threshold_pct": thr,
        "verdict": "PASS" if pct >= thr else "FAIL",
    }

results = [extract(l1, 1), extract(l2, 2), extract(l3, 3)]
verdicts = [r["verdict"] for r in results if r["verdict"] != "MISSING"]
global_verdict = "PASS" if all(v == "PASS" for v in verdicts) and verdicts else "FAIL"

output = {
    "timestamp": "$TIMESTAMP",
    "agent": "$AGENT",
    "limit": $LIMIT,
    "levels": results,
    "verdict": global_verdict,
}
with open("$OUT", "w", encoding="utf-8") as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

for r in results:
    if r["solved_pct"] is not None:
        print(f"[lichess_eval] L{r['level']}: {r['solved_pct']}% (seuil {r['threshold_pct']}%) → {r['verdict']}")
print(f"[lichess_eval] verdict global → {global_verdict}")
PYEOF

# Signature HMAC
if [[ -n "${STUDIO_HMAC_KEY:-}" ]]; then
    openssl dgst -sha256 -hmac "$STUDIO_HMAC_KEY" "$OUT" > "${OUT}.hmac"
    echo "[lichess_eval] HMAC signé → ${OUT}.hmac"
else
    echo "[lichess_eval] WARN: STUDIO_HMAC_KEY absent — verdict non signé" >&2
fi

echo "[lichess_eval] rapport → $OUT"
