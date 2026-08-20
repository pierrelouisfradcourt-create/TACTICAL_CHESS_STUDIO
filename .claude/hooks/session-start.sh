#!/usr/bin/env bash
# IMP-144 — Hook SessionStart : onboarding à froid. Affiche au démarrage le
# contexte minimal dont l'agent a besoin sans lire manuellement les fichiers :
#   - branche git courante + dernier commit
#   - ELO courant (delta hybrid vs heuristic) depuis lab/reports/elo_match_latest.json
#   - nombre d'IMP OPEN dans lab/chains/IMPROVEMENT_LEDGER.yaml
#   - état des oracles (présence des binaires/outils : cargo, python venv)
#
# Lecture seule. Résilient : aucune dépendance (pas de jq), jamais bloquant.
set -uo pipefail

cat >/dev/null 2>&1 || true   # draine le payload stdin du hook

# --- Racine repo : jamais de chemin absolu codé en dur -----------------------
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ]; then
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." 2>/dev/null && pwd || echo .)"
fi

ELO_JSON="$REPO_ROOT/lab/reports/elo_match_latest.json"
LEDGER="$REPO_ROOT/lab/chains/IMPROVEMENT_LEDGER.yaml"

# Extraction d'un scalaire numérique JSON sans jq.
get_num() {
  grep -oE "\"$1\"[[:space:]]*:[[:space:]]*-?[0-9]+(\.[0-9]+)?" "$2" 2>/dev/null \
    | head -n1 | grep -oE '\-?[0-9]+(\.[0-9]+)?$' || true
}
# Extraction d'un scalaire string JSON sans jq.
get_str() {
  grep -oE "\"$1\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" "$2" 2>/dev/null \
    | head -n1 | sed -E 's/.*:[[:space:]]*"([^"]*)"/\1/' || true
}

# --- Git ---------------------------------------------------------------------
BRANCH="$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
[ -z "$BRANCH" ] && BRANCH="(détaché ou hors repo)"
COMMIT="$(git -C "$REPO_ROOT" log -1 --pretty='%h %s' 2>/dev/null || true)"
[ -z "$COMMIT" ] && COMMIT="(aucun commit)"

# --- ELO ---------------------------------------------------------------------
if [ -f "$ELO_JSON" ]; then
  HYBRID="$(get_num hybrid "$ELO_JSON")";      [ -z "$HYBRID" ] && HYBRID="?"
  HEUR="$(get_num heuristic "$ELO_JSON")";     [ -z "$HEUR" ] && HEUR="?"
  DELTA="$(get_num delta_hybrid_vs_heuristic "$ELO_JSON")"; [ -z "$DELTA" ] && DELTA="?"
  ELO_VERDICT="$(get_str verdict "$ELO_JSON")"; [ -z "$ELO_VERDICT" ] && ELO_VERDICT="?"
  ELO_LINE="hybrid=$HYBRID heuristic=$HEUR delta=$DELTA verdict=$ELO_VERDICT"
else
  ELO_LINE="(elo_match_latest.json absent — lancer ./bench/elo_match.sh)"
fi

# --- IMP OPEN (compte les lignes 'status: OPEN' du ledger) -------------------
if [ -f "$LEDGER" ]; then
  OPEN_COUNT="$(grep -cE '^[[:space:]]*status:[[:space:]]*OPEN[[:space:]]*$' "$LEDGER" 2>/dev/null || echo 0)"
  OPEN_COUNT="$(printf '%s' "$OPEN_COUNT" | tr -cd '0-9')"; [ -z "$OPEN_COUNT" ] && OPEN_COUNT=0
else
  OPEN_COUNT="?"
fi

# --- Oracles : présence des outils (pas d'exécution, juste disponibilité) ----
oracle_status() {
  # $1 = label, $2 = test command
  if eval "$2" >/dev/null 2>&1; then echo "✅ $1"; else echo "⚠️ $1 indisponible"; fi
}
CARGO_ST="$(oracle_status cargo 'command -v cargo')"
if [ -x "$REPO_ROOT/.venv312/Scripts/python.exe" ]; then
  PY_ST="✅ venv .venv312"
else
  PY_ST="⚠️ venv .venv312 absent"
fi

# --- Affichage ---------------------------------------------------------------
echo "=== SESSION TCS — contexte de démarrage ==="
echo "Branche        : $BRANCH"
echo "Dernier commit : $COMMIT"
echo "IMP OPEN       : $OPEN_COUNT"
echo "ELO            : $ELO_LINE"
echo "Oracles        : $CARGO_ST | $PY_ST"
echo "Routing         : voir CLAUDE.md (intention → /skill)"
echo "==========================================="

exit 0
