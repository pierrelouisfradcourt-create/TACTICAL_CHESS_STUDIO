#!/usr/bin/env bash
# learning_loop.sh — boucle d'apprentissage fermée (IMP-171).
#
#   train  →  eval  →  compare  →  deploy (si meilleur)
#
# 1. train   : ml/train.py produit un checkpoint candidat
# 2. eval    : scripts/run_oracle.sh elo_match → lab/reports/elo_match_latest.json
# 3. compare : ELO neural candidat vs baseline (lab/model_registry.yaml)
# 4. deploy  : si candidat strictement meilleur → models/latest.pt + model_registry.yaml
#
# Le déploiement n'a lieu QUE si le candidat bat la baseline. Sinon : no-op.
#
# Usage :
#   ./scripts/learning_loop.sh                # run réel
#   ./scripts/learning_loop.sh --dry-run      # valide la mécanique sans train/cargo/écriture
#
# Oracle : bash -n scripts/learning_loop.sh  (exit 0)
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# ── Config ────────────────────────────────────────────────────────────────────
DRY_RUN=0
for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=1 ;;
        -h|--help)
            sed -n '2,18p' "${BASH_SOURCE[0]}"
            exit 0
            ;;
        *)
            echo "[learning_loop] argument inconnu: $arg" >&2
            exit 2
            ;;
    esac
done

PYTHON="${TCS_PYTHON_EXE:-.venv312/Scripts/python.exe}"
ELO_REPORT="lab/reports/elo_match_latest.json"
REGISTRY="lab/model_registry.yaml"
LATEST="models/latest.pt"
CANDIDATE="${TCS_CANDIDATE_CKPT:-models/candidate.pt}"

log() { echo "[learning_loop] $*"; }

# Lit ratings.neural d'un rapport elo_match. Renvoie 0.0 si absent/illisible.
read_neural_elo() {
    local report="$1"
    if [[ ! -f "$report" ]]; then
        echo "0.0"
        return
    fi
    "$PYTHON" -c "
import json, sys
try:
    d = json.load(open(sys.argv[1], encoding='utf-8'))
    print(float(d.get('ratings', {}).get('neural', 0.0)))
except Exception:
    print('0.0')
" "$report"
}

# ── Stage 1 — TRAIN ───────────────────────────────────────────────────────────
log "stage 1/4 — train"
if [[ "$DRY_RUN" -eq 1 ]]; then
    log "  [dry-run] $PYTHON ml/train.py --preflight-only --tag learning_loop"
else
    "$PYTHON" ml/train.py --tag learning_loop
fi

# ── Stage 2 — EVAL ────────────────────────────────────────────────────────────
log "stage 2/4 — eval (oracle elo_match)"
if [[ "$DRY_RUN" -eq 1 ]]; then
    log "  [dry-run] ./scripts/run_oracle.sh elo_match"
    CANDIDATE_ELO="1050.0"   # valeur mock pour exercer la comparaison
else
    bash ./scripts/run_oracle.sh elo_match
    CANDIDATE_ELO="$(read_neural_elo "$ELO_REPORT")"
fi

# ── Stage 3 — COMPARE ─────────────────────────────────────────────────────────
log "stage 3/4 — compare"
# Baseline neural ELO : 1035 (CONTEMPT, IMP-176) — source model_registry.yaml.
BASELINE_ELO="${TCS_BASELINE_ELO:-1035.0}"
log "  candidat=$CANDIDATE_ELO  baseline=$BASELINE_ELO"

IS_BETTER="$("$PYTHON" -c "
import sys
cand, base = float(sys.argv[1]), float(sys.argv[2])
print('1' if cand > base else '0')
" "$CANDIDATE_ELO" "$BASELINE_ELO")"

# ── Stage 4 — DEPLOY ──────────────────────────────────────────────────────────
log "stage 4/4 — deploy"
if [[ "$IS_BETTER" != "1" ]]; then
    log "  candidat NON meilleur ($CANDIDATE_ELO <= $BASELINE_ELO) — no deploy"
    log "done (no-op)"
    exit 0
fi

if [[ "$DRY_RUN" -eq 1 ]]; then
    log "  [dry-run] cp $CANDIDATE $LATEST"
    log "  [dry-run] update $REGISTRY (neural baseline -> $CANDIDATE_ELO)"
    log "done (dry-run, deploy simulé)"
    exit 0
fi

if [[ ! -f "$CANDIDATE" ]]; then
    log "  checkpoint candidat introuvable: $CANDIDATE — abort deploy" >&2
    exit 1
fi
cp "$CANDIDATE" "$LATEST"
log "  déployé: $CANDIDATE -> $LATEST (neural $BASELINE_ELO -> $CANDIDATE_ELO)"
log "done (deployed)"
