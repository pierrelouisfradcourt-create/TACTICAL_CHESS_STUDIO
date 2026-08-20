#!/usr/bin/env bash
# IMP-145 — Hook PostCompact : relit lab/reports/compact-state.json (écrit par
# pre-compact.sh) et affiche un résumé de reprise sur stdout, réinjecté dans le
# contexte après compaction.
#
# Résilient : aucun état → message clair, jamais d'échec bloquant.
set -uo pipefail

cat >/dev/null 2>&1 || true   # draine le payload stdin du hook

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ]; then
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." 2>/dev/null && pwd || echo .)"
fi

STATE="$REPO_ROOT/lab/reports/compact-state.json"

if [ ! -f "$STATE" ]; then
  echo "[post-compact] Aucun compact-state.json — pas d'état de reprise à restaurer."
  exit 0
fi

# Extraction d'un champ scalaire string sans dépendance (pas de jq).
get_str() {
  grep -oE "\"$1\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" "$STATE" \
    | head -n1 | sed -E 's/.*:[[:space:]]*"([^"]*)"/\1/' || true
}
# Extraction d'un champ scalaire numérique.
get_num() {
  grep -oE "\"$1\"[[:space:]]*:[[:space:]]*[0-9]+" "$STATE" \
    | head -n1 | grep -oE '[0-9]+$' || true
}
# Extraction d'une ligne (tableau/objet inline).
get_line() {
  grep -oE "\"$1\"[[:space:]]*:[[:space:]]*.*" "$STATE" | head -n1 \
    | sed -E "s/^\"$1\"[[:space:]]*:[[:space:]]*//; s/,?[[:space:]]*$//" || true
}

TS="$(get_str timestamp)";        [ -z "$TS" ] && TS="?"
TRIGGER="$(get_str trigger)";     [ -z "$TRIGGER" ] && TRIGGER="?"
COMMIT="$(get_str last_commit)";  [ -z "$COMMIT" ] && COMMIT="?"
IMP="$(get_str current_imp)";     [ -z "$IMP" ] && IMP="?"
COUNT="$(get_num modified_count)";[ -z "$COUNT" ] && COUNT="?"
FILES="$(get_line modified_files)"
SERVICES="$(get_line services)"

# Résumé scannable : ne pas réinjecter 100 chemins dans le contexte. On affiche
# les 12 premiers fichiers, puis un compteur de reste.
SHOWN="$(printf '%s' "$FILES" | grep -oE '"[^"]*"' | head -n 12 | paste -sd ' ' - 2>/dev/null || true)"
TOTAL_TOKENS="$(printf '%s' "$FILES" | grep -oE '"[^"]*"' | wc -l | tr -d ' ' || echo 0)"
EXTRA=$(( TOTAL_TOKENS > 12 ? TOTAL_TOKENS - 12 : 0 ))
FILES_LINE="${SHOWN:-(aucun)}"
[ "$EXTRA" -gt 0 ] && FILES_LINE="$FILES_LINE … (+$EXTRA autres)"

echo "=== REPRISE POST-COMPACTION ==="
echo "État capturé   : $TS (trigger: $TRIGGER)"
echo "IMP en cours   : $IMP"
echo "Dernier commit : $COMMIT"
echo "Fichiers modifiés ($COUNT) : $FILES_LINE"
echo "Services       : ${SERVICES:-{}}"
echo "==============================="

exit 0
