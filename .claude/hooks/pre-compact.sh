#!/usr/bin/env bash
# IMP-145 — Hook PreCompact : capture l'état actif avant compaction du contexte.
# Écrit lab/reports/compact-state.json (IMP en cours, timestamp, dernier commit,
# fichiers modifiés, état des services studio) pour que post-compact.sh puisse
# afficher un résumé de reprise.
#
# Résilient : pas de set -e, écriture atomique, ne wedge jamais la session.
set -uo pipefail

PAYLOAD="$(cat 2>/dev/null || true)"

# --- Racine repo : jamais de chemin absolu codé en dur -----------------------
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ]; then
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." 2>/dev/null && pwd || echo .)"
fi

TS="$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || true)"; [ -z "$TS" ] && TS="unknown"

LAST_COMMIT="$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || true)"
[ -z "$LAST_COMMIT" ] && LAST_COMMIT="unknown"

# trigger PreCompact : "manual" | "auto" (depuis le payload), sinon "unknown".
TRIGGER="$(printf '%s' "$PAYLOAD" \
  | grep -oE '"trigger"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | head -n1 | sed -E 's/.*:[[:space:]]*"([^"]*)"/\1/' || true)"
[ -z "$TRIGGER" ] && TRIGGER="unknown"
TRIGGER="$(printf '%s' "$TRIGGER" | tr -cd '[:alnum:]_.-')"

# IMP en cours : env explicite, sinon premier IMP-XXX du payload, sinon unknown.
CURRENT_IMP="${TCS_CURRENT_IMP:-}"
if [ -z "$CURRENT_IMP" ]; then
  CURRENT_IMP="$(printf '%s' "$PAYLOAD" | grep -oE 'IMP-[0-9]+' | head -n1 || true)"
fi
[ -z "$CURRENT_IMP" ] && CURRENT_IMP="unknown"

# --- Fichiers modifiés (tracked) : tableau JSON sur une ligne ----------------
FILES_RAW="$(git -C "$REPO_ROOT" status --porcelain 2>/dev/null \
  | sed -E 's/^.{3}//' | sed -E 's/[\\"]//g' | head -n 100 || true)"
FILES_JSON=""
MODIFIED_COUNT=0
first=1
while IFS= read -r f; do
  [ -z "$f" ] && continue
  MODIFIED_COUNT=$((MODIFIED_COUNT + 1))
  if [ "$first" -eq 1 ]; then first=0; else FILES_JSON="$FILES_JSON, "; fi
  FILES_JSON="$FILES_JSON\"$f\""
done <<< "$FILES_RAW"

# --- État des services studio (probe TCP localhost) --------------------------
SERVICES_JSON=""
for port in 8765 8766 7331 1234; do
  st="down"
  if (exec 3<>"/dev/tcp/127.0.0.1/$port") 2>/dev/null; then
    st="up"; exec 3>&- 2>/dev/null || true; exec 3<&- 2>/dev/null || true
  fi
  [ -n "$SERVICES_JSON" ] && SERVICES_JSON="$SERVICES_JSON, "
  SERVICES_JSON="$SERVICES_JSON\"$port\": \"$st\""
done

# --- Écriture atomique (temp + mv = rollback si échec) -----------------------
REPORT_DIR="$REPO_ROOT/lab/reports"
mkdir -p "$REPORT_DIR" 2>/dev/null || true
TMP="$REPORT_DIR/.compact-state.json.tmp.$$"

cat > "$TMP" <<EOF
{
  "hook": "pre-compact",
  "timestamp": "$TS",
  "trigger": "$TRIGGER",
  "last_commit": "$LAST_COMMIT",
  "current_imp": "$CURRENT_IMP",
  "modified_count": $MODIFIED_COUNT,
  "modified_files": [$FILES_JSON],
  "services": {$SERVICES_JSON}
}
EOF

if [ -s "$TMP" ]; then
  mv -f "$TMP" "$REPORT_DIR/compact-state.json" 2>/dev/null || rm -f "$TMP" 2>/dev/null || true
else
  rm -f "$TMP" 2>/dev/null || true
fi

exit 0
