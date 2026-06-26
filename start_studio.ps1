# start_studio.ps1 — Démarrage ordonné des services Studio OS
# Windows uniquement. Pour WSL : utiliser supervisord.conf
#
# Usage : .\start_studio.ps1
# Stop  : Ctrl+C dans chaque terminal ou stop-studio.ps1

param(
    [switch]$NoAutopilot,
    [switch]$NoBrowser
)

$REPO = $PSScriptRoot
$PYTHON = Join-Path $REPO ".venv312\Scripts\python.exe"
if (-not (Test-Path $PYTHON)) {
    $PYTHON = "python"
    Write-Host "[WARN] .venv312 absent — utilisation python système"
}

function Wait-Healthy {
    param([string]$Url, [int]$TimeoutSec = 15, [string]$Label = "service")
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($r.StatusCode -eq 200) {
                Write-Host "  [OK] $Label répond"
                return $true
            }
        } catch {}
        Start-Sleep -Milliseconds 500
    }
    Write-Host "  [FAIL] $Label ne répond pas après ${TimeoutSec}s"
    return $false
}

# Vérification HMAC_KEY
$ENV_FILE = Join-Path $env:USERPROFILE ".openclaw\.env"
if (-not (Test-Path $ENV_FILE)) {
    Write-Host "[FATAL] ~/.openclaw/.env absent — STUDIO_HMAC_KEY non configurée"
    Write-Host "  Générer : python -c `"import secrets; print(secrets.token_hex(32))`""
    Write-Host "  Puis écrire dans $ENV_FILE sous la forme STUDIO_HMAC_KEY=<clé>"
    exit 1
}
$hmacOk = Select-String -Path $ENV_FILE -Pattern "^STUDIO_HMAC_KEY=.+" -Quiet
if (-not $hmacOk) {
    Write-Host "[FATAL] STUDIO_HMAC_KEY vide dans $ENV_FILE"
    exit 1
}
Write-Host "[OK] STUDIO_HMAC_KEY présente dans $ENV_FILE"

# Vérification LM Studio
Write-Host "[CHECK] LM Studio (port 1234)..."
try {
    $r = Invoke-WebRequest -Uri "http://localhost:1234/v1/models" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Host "  [OK] LM Studio répond"
} catch {
    Write-Host "  [WARN] LM Studio injoignable — certaines fonctions Qwen indisponibles"
}

# Service 1 : claude_proxy (port 8765)
Write-Host "[START] claude_proxy (port 8765)..."
$env:CLAUDE_PROXY_SYSTEM_FILE = Join-Path $REPO "studio\openclaw-workspace\BOOTSTRAP.md"
$proc1 = Start-Process -FilePath $PYTHON -ArgumentList "scripts\claude_proxy.py" `
    -WorkingDirectory $REPO -PassThru -WindowStyle Minimized
Write-Host "  PID: $($proc1.Id)"
if (-not (Wait-Healthy "http://127.0.0.1:8765/health" 15 "claude_proxy")) {
    Write-Host "[ABORT] claude_proxy n'a pas démarré"
    exit 1
}

# Service 2 : canvas_gateway (port 8766)
Write-Host "[START] canvas_gateway (port 8766)..."
$proc2 = Start-Process -FilePath $PYTHON -ArgumentList "scripts\canvas_gateway.py" `
    -WorkingDirectory $REPO -PassThru -WindowStyle Minimized
Write-Host "  PID: $($proc2.Id)"
if (-not (Wait-Healthy "http://127.0.0.1:8766/health" 15 "canvas_gateway")) {
    Write-Host "[ABORT] canvas_gateway n'a pas démarré"
    $proc1 | Stop-Process -Force
    exit 1
}

# Service 3 : autopilot (port 7331) — optionnel
if (-not $NoAutopilot) {
    Write-Host "[START] autopilot (port 7331)..."
    $proc3 = Start-Process -FilePath $PYTHON -ArgumentList "autopilot.py" `
        -WorkingDirectory $REPO -PassThru -WindowStyle Normal
    Write-Host "  PID: $($proc3.Id)"
    if (-not (Wait-Healthy "http://localhost:7331/api/health" 20 "autopilot")) {
        Write-Host "  [WARN] autopilot lent au démarrage — vérifier manuellement"
    }
}

Write-Host ""
Write-Host "============================================"
Write-Host " Studio OS — Services actifs"
Write-Host "============================================"
Write-Host " claude_proxy  : http://127.0.0.1:8765"
Write-Host " canvas_gateway: http://127.0.0.1:8766"
if (-not $NoAutopilot) {
    Write-Host " autopilot     : http://localhost:7331"
}
Write-Host "============================================"
Write-Host " Canvas Pierre : studio\studio_canvas.html"
Write-Host "============================================"
Write-Host ""
Write-Host "Ctrl+C pour arrêter ce script (les services continuent en arrière-plan)"
Write-Host "Pour stopper tout : .\stop_studio.ps1"
