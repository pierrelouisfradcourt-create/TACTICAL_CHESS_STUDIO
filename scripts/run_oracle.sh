#!/usr/bin/env bash
# run_oracle.sh — Wrapper callsite pour les oracles FORBIDDEN.
# Appelle bench/oracle.sh puis ingère le résultat dans le backbone.
# NE PAS modifier bench/elo_match.sh ou bench/lichess_eval.sh.
#
# Usage :
#   ./scripts/run_oracle.sh elo_match [args...]
#   ./scripts/run_oracle.sh lichess_eval [args...]
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

ORACLE="${1:-}"
if [[ -z "$ORACLE" ]]; then
    echo "Usage: $0 <elo_match|lichess_eval> [oracle args...]" >&2
    exit 1
fi
shift

declare -A REPORTS=(
    [elo_match]="lab/reports/elo_match_latest.json"
    [lichess_eval]="lab/reports/lichess_eval_latest.json"
)

declare -A BENCH_SCRIPTS=(
    [elo_match]="bench/elo_match.sh"
    [lichess_eval]="bench/lichess_eval.sh"
)

if [[ -z "${REPORTS[$ORACLE]+x}" ]]; then
    echo "[run_oracle] oracle inconnu: $ORACLE. connus: ${!REPORTS[*]}" >&2
    exit 1
fi

REPORT="${REPORTS[$ORACLE]}"
BENCH="${BENCH_SCRIPTS[$ORACLE]}"

# On Windows, python3 points to the Windows Store stub (unusable in scripts).
# Inject a shim so bench scripts that call python3 get the real interpreter.
_REAL_PYTHON="${TCS_PYTHON_EXE:-}"
if [[ -z "$_REAL_PYTHON" ]]; then
    _REAL_PYTHON="$(command -v python 2>/dev/null || true)"
fi
if [[ -n "$_REAL_PYTHON" ]] && ! python3 -c "" &>/dev/null 2>&1; then
    _SHIM_DIR="$(mktemp -d)"
    printf '#!/usr/bin/env sh\nexec "%s" "$@"\n' "$_REAL_PYTHON" > "$_SHIM_DIR/python3"
    chmod +x "$_SHIM_DIR/python3"
    export PATH="$_SHIM_DIR:$PATH"
fi

echo "[run_oracle] -> $BENCH $*"
bash "$BENCH" "$@"

echo "[run_oracle] -> backbone ingest ($ORACLE)"
PYTHON="${TCS_PYTHON_EXE:-python3}"
"$PYTHON" scripts/ingest_event.py --oracle "$ORACLE" --report "$REPORT" \
    || echo "[run_oracle] WARN: backbone ingest failed (non-blocking)" >&2

echo "[run_oracle] done"
