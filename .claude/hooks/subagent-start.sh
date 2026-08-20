#!/usr/bin/env bash
# IMP-146 — Hook SubagentStart : trace chaque délégation d'agent dans
# lab/reports/subagent.log et alerte si plus de 5 agents sont actifs en
# parallèle (garde-fou contre la parallélisation excessive de /council et
# /team-feature).
#
# Modèle d'état : subagent.log est un journal append-only. Le nombre d'agents
# "actifs" = (lignes START) - (lignes STOP). Résilient, lecture/écriture
# concurrente tolérée (append atomique ligne par ligne), jamais bloquant.
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

# agent_type depuis le payload du hook (subagent_type), sinon "unknown". Sanitize.
AGENT_TYPE="$(printf '%s' "$PAYLOAD" \
  | grep -oE '"(subagent_type|agent_type)"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | head -n1 | sed -E 's/.*:[[:space:]]*"([^"]*)"/\1/' || true)"
[ -z "$AGENT_TYPE" ] && AGENT_TYPE="unknown"
AGENT_TYPE="$(printf '%s' "$AGENT_TYPE" | tr -cd '[:alnum:]_.:/-')"

# Append de l'événement START.
printf '%s\tSTART\t%s\n' "$TS" "$AGENT_TYPE" >> "$LOG" 2>/dev/null || true

# Compte des agents actifs = START - STOP sur tout le journal.
# awk -F'\t' sur le champ 2 : robuste au tab littéral (grep -E n'interprète
# pas \t comme une tabulation).
STARTS="$(awk -F'\t' '$2=="START"{n++} END{print n+0}' "$LOG" 2>/dev/null || echo 0)"
STOPS="$(awk -F'\t'  '$2=="STOP"{n++}  END{print n+0}' "$LOG" 2>/dev/null || echo 0)"
STARTS="$(printf '%s' "$STARTS" | tr -cd '0-9')"; [ -z "$STARTS" ] && STARTS=0
STOPS="$(printf '%s' "$STOPS" | tr -cd '0-9')";   [ -z "$STOPS" ] && STOPS=0
ACTIVE=$(( STARTS - STOPS ))
[ "$ACTIVE" -lt 0 ] && ACTIVE=0

echo "[subagent-start] $AGENT_TYPE — actifs : $ACTIVE"

if [ "$ACTIVE" -gt 5 ]; then
  echo "⚠️ [subagent-start] ALERTE : $ACTIVE agents actifs (> 5). Parallélisation excessive — vérifier /council et /team-feature." >&2
fi

exit 0
