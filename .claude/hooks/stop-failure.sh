#!/usr/bin/env bash
# IMP-143 — Hook StopFailure : écrit lab/reports/recovery.json avec le contexte
# de session (error_type, timestamp, last_commit, current_imp) pour récupération
# après une API error / arrêt anormal.
#
# Résilient par conception : ne jamais avorter avant d'avoir écrit recovery.json.
# Pas de set -e (un échec ponctuel ne doit pas empêcher l'écriture du rapport).
set -uo pipefail

# --- Payload du hook (stdin JSON, possiblement vide) -------------------------
PAYLOAD="$(cat 2>/dev/null || true)"

# --- Racine repo : jamais de chemin absolu codé en dur -----------------------
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ]; then
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." 2>/dev/null && pwd || echo .)"
fi

# --- Champs de contexte ------------------------------------------------------
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || true)"
[ -z "$TS" ] && TS="unknown"

LAST_COMMIT="$(git -C "$REPO_ROOT" rev-parse --short HEAD 2>/dev/null || true)"
[ -z "$LAST_COMMIT" ] && LAST_COMMIT="unknown"

# error_type : depuis le payload, sinon "unknown". Sanitize -> JSON sûr.
ERROR_TYPE="$(printf '%s' "$PAYLOAD" \
  | grep -oE '"error_type"[[:space:]]*:[[:space:]]*"[^"]*"' \
  | head -n1 \
  | sed -E 's/.*:[[:space:]]*"([^"]*)"/\1/' || true)"
[ -z "$ERROR_TYPE" ] && ERROR_TYPE="unknown"
ERROR_TYPE="$(printf '%s' "$ERROR_TYPE" | tr -cd '[:alnum:] _.:/-')"

# IMP en cours : env explicite, sinon premier IMP-XXX du payload, sinon unknown.
CURRENT_IMP="${TCS_CURRENT_IMP:-}"
if [ -z "$CURRENT_IMP" ]; then
  CURRENT_IMP="$(printf '%s' "$PAYLOAD" | grep -oE 'IMP-[0-9]+' | head -n1 || true)"
fi
[ -z "$CURRENT_IMP" ] && CURRENT_IMP="unknown"

# --- Écriture atomique (temp + mv = rollback si échec) -----------------------
REPORT_DIR="$REPO_ROOT/lab/reports"
mkdir -p "$REPORT_DIR" 2>/dev/null || true
TMP="$REPORT_DIR/.recovery.json.tmp.$$"

cat > "$TMP" <<EOF
{
  "hook": "stop-failure",
  "error_type": "$ERROR_TYPE",
  "timestamp": "$TS",
  "last_commit": "$LAST_COMMIT",
  "current_imp": "$CURRENT_IMP"
}
EOF

if [ -s "$TMP" ]; then
  mv -f "$TMP" "$REPORT_DIR/recovery.json" 2>/dev/null || rm -f "$TMP" 2>/dev/null || true
else
  rm -f "$TMP" 2>/dev/null || true
fi

# Un hook de récupération ne doit jamais wedger la session.
exit 0
