#!/usr/bin/env bash
# scripts/start_studio.sh — Démarre tous les services du studio dans l'ordre.
# Usage (WSL) : bash scripts/start_studio.sh
set -euo pipefail

# ── Constantes ──────────────────────────────────────────────────────────────
STUDIO_ROOT="/mnt/c/TACTICAL_CHESS_STUDIO"
LOG_FILE="$STUDIO_ROOT/lab/reports/studio_boot_$(date +%Y%m%d).log"
LM_STUDIO_URL="http://192.168.1.11:1234/v1/models"
CLAUDE_PROXY_PORT=8765
CANVAS_GW_PORT=8766
COCKPIT_PORT=8770
OPENCLAW_GW_PORT=18789
PROXY_WAIT_RETRIES=12   # 12 × 5s = 60s max
CONNECT_TIMEOUT=3

# ── Logging ──────────────────────────────────────────────────────────────────
mkdir -p "$STUDIO_ROOT/lab/reports"
exec > >(tee -a "$LOG_FILE") 2>&1

log()  { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }
ok()   { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ✓ $*"; }
warn() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ⚠ $*"; }
fail() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] ✗ $*"; }

log "═══════════════════════════════════════════"
log "STUDIO BOOT — $(date -u)"
log "═══════════════════════════════════════════"

# ── STEP 0 : Git hooks — wiring core.hooksPath → .claude/hooks ────────────────
# Les hooks vivent dans .claude/hooks (pre-commit, validate-commit-msg) mais ne
# sont pas câblés côté git par défaut → jamais exécutés. On les câble ici, de
# façon idempotente, et sans casser si on tourne hors d'un dépôt git.
log "[0/5] Git hooks — core.hooksPath → .claude/hooks"
if git -C "$STUDIO_ROOT" rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    if [ "$(git -C "$STUDIO_ROOT" config core.hooksPath 2>/dev/null || true)" != ".claude/hooks" ]; then
        git -C "$STUDIO_ROOT" config core.hooksPath .claude/hooks
        ok "core.hooksPath réglé sur .claude/hooks"
    else
        ok "core.hooksPath déjà sur .claude/hooks"
    fi
else
    warn "Pas dans un dépôt git ($STUDIO_ROOT) — wiring hooks ignoré"
fi

# ── Helper : check port ───────────────────────────────────────────────────────
port_up() {
    local port=$1
    timeout "$CONNECT_TIMEOUT" bash -c \
        "echo >/dev/tcp/127.0.0.1/$port" 2>/dev/null
}

# ── STEP 1 : LM Studio (192.168.1.11:1234) ───────────────────────────────────
log "[1/6] LM Studio — ping $LM_STUDIO_URL"
if curl -sf --max-time "$CONNECT_TIMEOUT" "$LM_STUDIO_URL" > /dev/null; then
    ok "LM Studio répond"
else
    warn "LM Studio injoignable ($LM_STUDIO_URL) — démarrer l'appli GUI Windows si nécessaire"
fi

# ── STEP 2 : OpenClaw gateway (port 18789 — log only) ────────────────────────
log "[2/6] OpenClaw gateway — port $OPENCLAW_GW_PORT"
if port_up "$OPENCLAW_GW_PORT"; then
    ok "openclaw_gateway déjà actif sur :$OPENCLAW_GW_PORT"
else
    warn "openclaw_gateway DOWN (:$OPENCLAW_GW_PORT) — démarrer manuellement si requis"
fi

# ── STEP 3 : claude_proxy (port 8765) ─────────────────────────────────────────
log "[3/6] claude_proxy — port $CLAUDE_PROXY_PORT"
if port_up "$CLAUDE_PROXY_PORT"; then
    ok "claude_proxy déjà actif sur :$CLAUDE_PROXY_PORT"
else
    log "Lancement de claude_proxy..."
    cd "$STUDIO_ROOT"
    CLAUDE_PROXY_SYSTEM_FILE="studio/openclaw-workspace/BOOTSTRAP.md" \
        python3 scripts/claude_proxy.py \
        >> "$STUDIO_ROOT/lab/logs/claude_proxy.log" 2>&1 &
    PROXY_PID=$!
    log "claude_proxy lancé (pid $PROXY_PID)"

    # Attendre que le port réponde
    for i in $(seq 1 $PROXY_WAIT_RETRIES); do
        sleep 5
        if port_up "$CLAUDE_PROXY_PORT"; then
            ok "claude_proxy opérationnel (:$CLAUDE_PROXY_PORT) après $((i * 5))s"
            break
        fi
        log "  attente claude_proxy... ($i/$PROXY_WAIT_RETRIES)"
        if [ "$i" -eq "$PROXY_WAIT_RETRIES" ]; then
            fail "claude_proxy n'a pas démarré dans les temps — vérifier lab/logs/claude_proxy.log"
        fi
    done
fi

# ── STEP 4 : canvas_gateway (port 8766) ───────────────────────────────────────
log "[4/6] canvas_gateway — port $CANVAS_GW_PORT"

if [ -z "${STUDIO_HMAC_KEY:-}" ]; then
    # Tenter de charger depuis ~/.openclaw/.env
    OPENCLAW_ENV="$HOME/.openclaw/.env"
    if [ -f "$OPENCLAW_ENV" ]; then
        # shellcheck disable=SC1090
        set -a; source "$OPENCLAW_ENV"; set +a
        log "STUDIO_HMAC_KEY chargée depuis $OPENCLAW_ENV"
    else
        warn "STUDIO_HMAC_KEY absente et $OPENCLAW_ENV introuvable — canvas_gateway refusera de démarrer"
    fi
fi

if port_up "$CANVAS_GW_PORT"; then
    ok "canvas_gateway déjà actif sur :$CANVAS_GW_PORT"
else
    cd "$STUDIO_ROOT"
    STUDIO_HMAC_KEY="${STUDIO_HMAC_KEY:-}" \
        python3 scripts/canvas_gateway.py \
        >> "$STUDIO_ROOT/lab/logs/canvas_gateway.log" 2>&1 &
    GW_PID=$!
    log "canvas_gateway lancé (pid $GW_PID)"

    sleep 5
    if port_up "$CANVAS_GW_PORT"; then
        ok "canvas_gateway opérationnel (:$CANVAS_GW_PORT)"
    else
        fail "canvas_gateway n'a pas démarré — vérifier lab/logs/canvas_gateway.log"
    fi
fi

# ── STEP 5 : healthcheck daemon ────────────────────────────────────────────────
log "[5/6] healthcheck daemon"
if pgrep -f "scripts/healthcheck.py" > /dev/null 2>&1; then
    ok "healthcheck déjà en cours (pid $(pgrep -f 'scripts/healthcheck.py' | head -1))"
else
    cd "$STUDIO_ROOT"
    python3 scripts/healthcheck.py \
        >> "$STUDIO_ROOT/lab/logs/healthcheck.log" 2>&1 &
    HC_PID=$!
    ok "healthcheck lancé (pid $HC_PID)"
fi

# ── STEP 6 : cockpit_server (port 8770 — FastAPI/uvicorn, .venv312) ───────────
# uvicorn/fastapi/starlette ne sont installés que dans .venv312 (Windows) — on lance
# donc le python Windows via l'interop WSL, pas python3. --app-dir scripts car
# cockpit_server.py vit dans scripts/. nohup : survit à la fin du shell de boot.
log "[6/6] cockpit_server — port $COCKPIT_PORT"
if port_up "$COCKPIT_PORT"; then
    ok "cockpit_server déjà actif sur :$COCKPIT_PORT"
else
    cd "$STUDIO_ROOT"
    nohup "$STUDIO_ROOT/.venv312/Scripts/python.exe" -m uvicorn cockpit_server:app \
        --host 127.0.0.1 --port "$COCKPIT_PORT" --app-dir scripts \
        > "$STUDIO_ROOT/lab/reports/cockpit_server.log" 2>&1 &
    COCKPIT_PID=$!
    log "cockpit_server lancé (pid $COCKPIT_PID)"

    # Le process Windows (interop WSL) peut prendre >5s à binder le port :
    # un sleep 5 fixe + port check rate les démarrages lents. On sonde /health
    # par curl jusqu'à 15s (1s × 15) et on s'arrête dès que le port répond.
    for i in $(seq 1 15); do
        sleep 1
        if curl -s --connect-timeout 1 "http://127.0.0.1:$COCKPIT_PORT/health" > /dev/null 2>&1; then
            ok "cockpit_server opérationnel (:$COCKPIT_PORT)"
            break
        fi
        if [ "$i" -eq 15 ]; then
            fail "cockpit_server n'a pas démarré — vérifier lab/reports/cockpit_server.log"
        fi
    done
fi

# ── Résumé ─────────────────────────────────────────────────────────────────────
log "═══════════════════════════════════════════"
log "RÉSUMÉ BOOT"
log "═══════════════════════════════════════════"

check_summary() {
    local name=$1 port=$2
    if port_up "$port"; then
        ok "$name :$port UP"
    else
        fail "$name :$port DOWN"
    fi
}

curl -sf --max-time "$CONNECT_TIMEOUT" "$LM_STUDIO_URL" > /dev/null \
    && ok "lm_studio :1234 UP" \
    || warn "lm_studio :1234 DOWN (GUI Windows)"

check_summary "openclaw_gateway" "$OPENCLAW_GW_PORT"
check_summary "claude_proxy"     "$CLAUDE_PROXY_PORT"
check_summary "canvas_gateway"   "$CANVAS_GW_PORT"
check_summary "cockpit_server"   "$COCKPIT_PORT"

pgrep -f "scripts/healthcheck.py" > /dev/null 2>&1 \
    && ok "healthcheck daemon RUNNING" \
    || fail "healthcheck daemon DOWN"

log "Log complet : $LOG_FILE"
log "═══════════════════════════════════════════"
