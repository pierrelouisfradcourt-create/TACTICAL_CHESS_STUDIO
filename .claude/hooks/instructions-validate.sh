#!/usr/bin/env bash
# IMP-147 — Hook instructions-validate : vérifie que l'infrastructure OpenClaw
# minimale est présente à chaque chargement des instructions. Contrôle
# l'existence de :
#   - studio/openclaw-workspace/BOOTSTRAP.md
#   - studio/openclaw-workspace/TOOLS.md
#   - studio/openclaw-workspace/AGENTS.md
#
# Si un fichier manque : émet un JSON {"systemMessage": "..."} sur stdout
# (réinjecté dans le contexte) et sort en code 1. Sinon code 0.
# Évite qu'un agent démarre sans l'infra openclaw complète.
set -uo pipefail

cat >/dev/null 2>&1 || true   # draine le payload stdin du hook

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [ -z "$REPO_ROOT" ]; then
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." 2>/dev/null && pwd || echo .)"
fi

WS="$REPO_ROOT/studio/openclaw-workspace"
REQUIRED="BOOTSTRAP.md TOOLS.md AGENTS.md"

MISSING=""
for f in $REQUIRED; do
  if [ ! -f "$WS/$f" ]; then
    [ -n "$MISSING" ] && MISSING="$MISSING, "
    MISSING="$MISSING$f"
  fi
done

if [ -n "$MISSING" ]; then
  # JSON sûr : MISSING ne contient que des noms de fichiers connus (pas de quote).
  printf '{"systemMessage": "[instructions-validate] Infra OpenClaw incomplète — fichier(s) manquant(s) dans studio/openclaw-workspace/: %s. Restaurer avant de déléguer."}\n' "$MISSING"
  exit 1
fi

echo "[instructions-validate] OpenClaw infra OK — BOOTSTRAP.md + TOOLS.md + AGENTS.md présents."
exit 0
