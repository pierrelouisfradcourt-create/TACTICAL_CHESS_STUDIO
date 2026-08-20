# chain_models.ps1 — Models Audit
# Périmètre : modèles chess .pt, LLMs GGUF, latest_run.json cohérence
# claim_verdict: NO_CLAIM_ALLOWED

param(
    [string]$Studio = "C:\TACTICAL_CHESS_STUDIO"
)

$TIMESTAMP = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$findings = [System.Collections.Generic.List[string]]::new()
$checksTotal = 0
$checksOk = 0

function Write-Check { param($num, $total, $label) Write-Host ""; Write-Host "[CHECK $num/$total] $label" }
function Write-Ok    { param($msg) Write-Host "  STATUS : OK";    Write-Host "  DETAIL : $msg"; $script:checksOk++ }
function Write-Find  { param($level, $msg) Write-Host "  STATUS : $level"; Write-Host "  FINDING: $msg"; $script:findings.Add("[$level] $msg") }
function Write-Info  { param($msg) Write-Host "  STATUS : INFO";  Write-Host "  DETAIL : $msg"; $script:checksOk++ }

Write-Host "=== CHAIN MODELS — $TIMESTAMP ==="
Write-Host "    Studio : $Studio"

# ─── CHECK 1 : models/best.pt présence ────────────────────────────────────────
$checksTotal++
Write-Check 1 5 "models/best.pt — présence et taille"
$bestPt = Get-Item -Path "$Studio\models\best.pt" -ErrorAction SilentlyContinue
if (-not $bestPt) {
    Write-Find "HAUTE" "models/best.pt absent — meilleur checkpoint manquant"
} else {
    $sizeMB = [math]::Round($bestPt.Length / 1MB, 1)
    $age = [math]::Round(((Get-Date) - $bestPt.LastWriteTime).TotalDays, 0)
    Write-Ok "best.pt : $sizeMB MB | modifié il y a $age jour(s)"
    if ($sizeMB -lt 1) { Write-Find "BASSE" "best.pt très petit ($sizeMB MB) — checkpoint peut-être corrompu" }
}

# ─── CHECK 2 : models/latest.pt présence ──────────────────────────────────────
$checksTotal++
Write-Check 2 5 "models/latest.pt — présence et cohérence avec best.pt"
$latestPt = Get-Item -Path "$Studio\models\latest.pt" -ErrorAction SilentlyContinue
if (-not $latestPt) {
    Write-Find "HAUTE" "models/latest.pt absent"
} else {
    $sizeMB = [math]::Round($latestPt.Length / 1MB, 1)
    $age = [math]::Round(((Get-Date) - $latestPt.LastWriteTime).TotalDays, 0)
    Write-Ok "latest.pt : $sizeMB MB | modifié il y a $age jour(s)"
    if ($bestPt -and $latestPt) {
        $diff = [math]::Abs($bestPt.Length - $latestPt.Length)
        if ($diff -lt 1024) {
            Write-Info "best.pt et latest.pt de taille identique (probablement même checkpoint)"
        }
    }
}

# ─── CHECK 3 : models/latest_run.json cohérence ───────────────────────────────
$checksTotal++
Write-Check 3 5 "models/latest_run.json — présence et JSON valide"
$runJson = Get-Item -Path "$Studio\models\latest_run.json" -ErrorAction SilentlyContinue
if (-not $runJson) {
    Write-Find "MOY" "models/latest_run.json absent — métadonnées de run manquantes"
} else {
    $content = Get-Content $runJson.FullName -Raw -ErrorAction SilentlyContinue
    try {
        $parsed = $content | ConvertFrom-Json -ErrorAction Stop
        $keys = ($parsed | Get-Member -MemberType NoteProperty).Name -join ", "
        Write-Ok "latest_run.json valide | champs : $keys"
    } catch {
        Write-Find "MOY" "latest_run.json invalide ou vide — JSON malformé"
    }
}

# ─── CHECK 4 : LLMs GGUF présence ─────────────────────────────────────────────
$checksTotal++
Write-Check 4 5 "LLMs GGUF dans models/lmstudio/ — présence et taille"
$ggufFiles = @(Get-ChildItem -Path "$Studio\models" -Recurse -Filter "*.gguf" -ErrorAction SilentlyContinue)
if ($ggufFiles.Count -eq 0) {
    Write-Find "BASSE" "Aucun fichier .gguf dans models/ — LLM local non disponible"
} else {
    $totalGB = [math]::Round(($ggufFiles | Measure-Object Length -Sum).Sum / 1GB, 2)
    Write-Info "$($ggufFiles.Count) LLM(s) GGUF | $totalGB GB total"
    $ggufFiles | ForEach-Object {
        $gb = [math]::Round($_.Length / 1GB, 2)
        $age = [math]::Round(((Get-Date) - $_.LastWriteTime).TotalDays, 0)
        Write-Host "    $($_.Name) : $gb GB | $age jour(s)"
    }
}

# ─── CHECK 5 : stockfish teacher engine ───────────────────────────────────────
$checksTotal++
Write-Check 5 5 "Stockfish teacher engine — tools/vendor_tools/stockfish/*.exe"
$sfExe = @(Get-ChildItem -Path "$Studio\tools\vendor_tools\stockfish" -Filter "*.exe" -ErrorAction SilentlyContinue)
if ($sfExe.Count -eq 0) {
    Write-Find "HAUTE" "Stockfish .exe absent — teacher engine non disponible"
} else {
    $sf = $sfExe[0]
    $sizeMB = [math]::Round($sf.Length / 1MB, 0)
    $age = [math]::Round(((Get-Date) - $sf.LastWriteTime).TotalDays, 0)
    Write-Ok "$($sf.Name) : $sizeMB MB | $age jour(s)"
}

# ─── RÉSUMÉ ───────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=== RÉSUMÉ ==="
Write-Host "Checks  : $checksTotal total | $checksOk OK | $($findings.Count) findings"
if ($findings.Count -gt 0) {
    Write-Host "Findings :"
    $findings | ForEach-Object { Write-Host "  $_" }
}
$hasHigher = $findings | Where-Object { $_ -match "^\[CRIT\]|^\[HAUTE\]|^\[MOY\]|^\[INCONNU\]" }
if ($findings.Count -eq 0)      { $verdict = "PASS" }
elseif ($hasHigher.Count -gt 0) { $verdict = "FAIL" }
else                             { $verdict = "PARTIAL" }
Write-Host ""
Write-Host "VERDICT : $verdict"
Write-Host "claim_verdict: NO_CLAIM_ALLOWED"
