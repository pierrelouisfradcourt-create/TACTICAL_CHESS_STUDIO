#!/usr/bin/env bash
# IMP-146 — Hook SubagentStop : trace la fin d'une délégation dans
# lab/reports/subagent.log (ligne STOP). Le compte d'agents actifs est dérivé
# par subagent-start.sh comme (START - STOP). Append-only, jamais bloquant.
set -uo pipefail

PAYLOAD="$(cat 2>/dev/null || true)"

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ]; then
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." 2>/dev/null && pwd || echo .)"
fi

REPORT_DIR="$REPO_ROOT/lab/reports"
LOG="$REPORT_DIR/subagent.log"
mkdir -p "$REPORT_DIR" 2>/dev/null || true

TS="$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || true)"; [ -z "$TS" ] && TS="unknown"

AGENT_TYPE="$(printf '%s' "$PAYLOAD" \
  | grep -oE '"(subagent_type|agent_type)"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | head -n1 | sed -E 's/.*:[[:space:]]*"([^"]*)"/\1/' || true)"
[ -z "$AGENT_TYPE" ] && AGENT_TYPE="unknown"
AGENT_TYPE="$(printf '%s' "$AGENT_TYPE" | tr -cd '[:alnum:]_.:/-')"

printf '%s\tSTOP\t%s\n' "$TS" "$AGENT_TYPE" >> "$LOG" 2>/dev/null || true

# awk -F'\t' sur le champ 2 : robuste au tab littéral.
STARTS="$(awk -F'\t' '$2=="START"{n++} END{print n+0}' "$LOG" 2>/dev/null || echo 0)"
STOPS="$(awk -F'\t'  '$2=="STOP"{n++}  END{print n+0}' "$LOG" 2>/dev/null || echo 0)"
STARTS="$(printf '%s' "$STARTS" | tr -cd '0-9')"; [ -z "$STARTS" ] && STARTS=0
STOPS="$(printf '%s' "$STOPS" | tr -cd '0-9')";   [ -z "$STOPS" ] && STOPS=0
ACTIVE=$(( STARTS - STOPS ))
[ "$ACTIVE" -lt 0 ] && ACTIVE=0

echo "[subagent-stop] $AGENT_TYPE — actifs restants : $ACTIVE"

exit 0
