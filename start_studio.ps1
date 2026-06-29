# start_studio.ps1 - Demarrage ordonne des services Studio OS
# Windows uniquement.
#
# Usage : .\start_studio.ps1
# Stop  : Ctrl+C ou .\stop_studio.ps1

param(
    [switch]$NoAutopilot,
    [switch]$NoBrowser
)

$REPO = $PSScriptRoot
$PYTHON = Join-Path $REPO ".venv312\Scripts\python.exe"
if (-not (Test-Path $PYTHON)) {
    $PYTHON = "python"
    Write-Host "[WARN] .venv312 absent - utilisation python systeme"
}

function Wait-Healthy {
    param([string]$Url, [int]$TimeoutSec = 15, [string]$Label = "service")
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($r.StatusCode -eq 200) {
                Write-Host "  [OK] $Label repond"
                return $true
            }
        } catch {}
        Start-Sleep -Milliseconds 500
    }
    Write-Host "  [FAIL] $Label ne repond pas apres $TimeoutSec s"
    return $false
}

# Verification HMAC_KEY
$ENV_FILE = Join-Path $env:USERPROFILE ".openclaw\.env"
if (-not (Test-Path $ENV_FILE)) {
    Write-Host "[WARN] ~/.openclaw/.env absent - STUDIO_HMAC_KEY non configuree (claude_proxy/canvas peuvent rater)"
} else {
    $hmacOk = Select-String -Path $ENV_FILE -Pattern "^STUDIO_HMAC_KEY=.+" -Quiet
    if ($hmacOk) {
        Write-Host "[OK] STUDIO_HMAC_KEY presente"
    } else {
        Write-Host "[WARN] STUDIO_HMAC_KEY vide dans $ENV_FILE"
    }
}

# Verification LM Studio
Write-Host "[CHECK] LM Studio (port 1234)..."
try {
    $r = Invoke-WebRequest -Uri "http://localhost:1234/v1/models" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    Write-Host "  [OK] LM Studio repond"
} catch {
    Write-Host "  [WARN] LM Studio injoignable"
}

# Service 1 : claude_proxy (8765)
Write-Host "[START] claude_proxy (port 8765)..."
$env:CLAUDE_PROXY_SYSTEM_FILE = Join-Path $REPO "studio\openclaw-workspace\BOOTSTRAP.md"
$proc1 = Start-Process -FilePath $PYTHON -ArgumentList "scripts\claude_proxy.py" -WorkingDirectory $REPO -PassThru -WindowStyle Minimized
Write-Host "  PID: $($proc1.Id)"
Wait-Healthy "http://127.0.0.1:8765/health" 12 "claude_proxy" | Out-Null

# Service 2 : canvas_gateway (8766)
Write-Host "[START] canvas_gateway (port 8766)..."
$proc2 = Start-Process -FilePath $PYTHON -ArgumentList "scripts\canvas_gateway.py" -WorkingDirectory $REPO -PassThru -WindowStyle Minimized
Write-Host "  PID: $($proc2.Id)"
Wait-Healthy "http://127.0.0.1:8766/health" 12 "canvas_gateway" | Out-Null

# Service 3 : autopilot (7331)
if (-not $NoAutopilot) {
    Write-Host "[START] autopilot (port 7331)..."
    $proc3 = Start-Process -FilePath $PYTHON -ArgumentList "autopilot.py" -WorkingDirectory $REPO -PassThru -WindowStyle Normal
    Write-Host "  PID: $($proc3.Id)"
    Wait-Healthy "http://localhost:7331/api/health" 20 "autopilot" | Out-Null
}

Write-Host ""
Write-Host "============================================"
Write-Host " Studio OS - Services"
Write-Host "  claude_proxy   : http://127.0.0.1:8765"
Write-Host "  canvas_gateway : http://127.0.0.1:8766"
if (-not $NoAutopilot) { Write-Host "  autopilot      : http://localhost:7331" }
Write-Host "  Cockpit        : studio_v2_ux\studio_cockpit.html"
Write-Host "============================================"
