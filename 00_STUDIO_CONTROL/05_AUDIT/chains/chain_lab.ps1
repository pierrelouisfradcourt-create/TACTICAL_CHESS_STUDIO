# chain_lab.ps1 — Lab Directory Audit
# Périmètre : datasets JSONL, lab/runs taille, puzzles, ACTIVE_DATASET.txt, chains ledger
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

Write-Host "=== CHAIN LAB — $TIMESTAMP ==="
Write-Host "    Studio : $Studio"

# ─── CHECK 1 : ACTIVE_DATASET.txt présence et contenu ────────────────────────
$checksTotal++
Write-Check 1 6 "ACTIVE_DATASET.txt — présence et contenu non vide"
$adFile = Get-Item -Path "$Studio\lab\ACTIVE_DATASET.txt" -ErrorAction SilentlyContinue
if (-not $adFile) {
    Write-Find "HAUTE" "lab/ACTIVE_DATASET.txt absent — dataset actif non déclaré"
} else {
    $content = (Get-Content $adFile.FullName -Raw).Trim()
    if ([string]::IsNullOrWhiteSpace($content)) {
        Write-Find "MOY" "lab/ACTIVE_DATASET.txt présent mais vide"
    } else {
        $firstLine = ($content -split "`n")[0].Trim()
        Write-Ok "ACTIVE_DATASET.txt déclaré : $firstLine"
    }
}

# ─── CHECK 2 : datasets JSONL présence ────────────────────────────────────────
$checksTotal++
Write-Check 2 6 "Datasets JSONL dans lab/datasets/ — présence et lignes"
$jsonlFiles = @(Get-ChildItem -Path "$Studio\lab\datasets" -Filter "*.jsonl" -ErrorAction SilentlyContinue)
if ($jsonlFiles.Count -eq 0) {
    Write-Find "HAUTE" "Aucun fichier .jsonl dans lab/datasets/"
} else {
    $totalLines = 0
    foreach ($f in $jsonlFiles) {
        $lines = (Get-Content $f.FullName | Measure-Object -Line).Lines
        $sizeKB = [math]::Round($f.Length / 1KB, 0)
        Write-Host "    $($f.Name) : $lines lignes | $sizeKB KB"
        $totalLines += $lines
        if ($lines -eq 0) {
            Write-Find "MOY" "$($f.Name) : fichier JSONL vide"
        }
    }
    Write-Ok "$($jsonlFiles.Count) fichiers JSONL | $totalLines lignes totales"
}

# ─── CHECK 3 : lab/runs/ taille et ancienneté ────────────────────────────────
$checksTotal++
Write-Check 3 6 "lab/runs/ — taille et fichier le plus récent"
$labRuns = "$Studio\lab\runs"
if (-not (Test-Path $labRuns)) {
    Write-Find "MOY" "lab/runs/ absent"
} else {
    $allFiles = @(Get-ChildItem -Path $labRuns -Recurse -File -ErrorAction SilentlyContinue)
    $sizeMB = [math]::Round(($allFiles | Measure-Object Length -Sum).Sum / 1MB, 0)
    $newest = $allFiles | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    $newestAge = if ($newest) { [math]::Round(((Get-Date) - $newest.LastWriteTime).TotalDays, 0) } else { 999 }
    Write-Host "    Taille : $sizeMB MB | $($allFiles.Count) fichiers | dernier modifié il y a $newestAge jour(s)"
    if ($sizeMB -gt 5000) {
        Write-Find "MOY" "lab/runs/ : $sizeMB MB — dépasse 5 000 MB, purge recommandée"
    } elseif ($sizeMB -gt 2000) {
        Write-Find "BASSE" "lab/runs/ : $sizeMB MB — volumieux (seuil info 2 000 MB)"
    } else {
        Write-Ok "lab/runs/ : $sizeMB MB"
    }
    if ($newestAge -gt 30) {
        Write-Find "BASSE" "Dernier run il y a $newestAge jours — lab potentiellement inactif"
    }
}

# ─── CHECK 4 : lab/chains/ — ledger et decision log ──────────────────────────
$checksTotal++
Write-Check 4 6 "lab/chains/ — IMPROVEMENT_LEDGER.yaml et HUMANGATE_DECISION_LOG.yaml"
$ledger = Get-Item -Path "$Studio\lab\chains\IMPROVEMENT_LEDGER.yaml" -ErrorAction SilentlyContinue
$decLog = Get-Item -Path "$Studio\lab\chains\HUMANGATE_DECISION_LOG.yaml" -ErrorAction SilentlyContinue
if (-not $ledger) {
    Write-Find "HAUTE" "lab/chains/IMPROVEMENT_LEDGER.yaml absent"
} else {
    $lines = (Get-Content $ledger.FullName).Count
    Write-Ok "IMPROVEMENT_LEDGER.yaml : $lines lignes"
}
if (-not $decLog) {
    Write-Find "MOY" "lab/chains/HUMANGATE_DECISION_LOG.yaml absent"
} else {
    $lines = (Get-Content $decLog.FullName).Count
    Write-Ok "HUMANGATE_DECISION_LOG.yaml : $lines lignes"
}

# ─── CHECK 5 : lab/puzzles/ présence ──────────────────────────────────────────
$checksTotal++
Write-Check 5 6 "lab/puzzles/ — présence et contenu"
$puzzlesDir = "$Studio\lab\puzzles"
if (-not (Test-Path $puzzlesDir)) {
    Write-Find "MOY" "lab/puzzles/ absent — base de puzzles manquante"
} else {
    $pFiles = @(Get-ChildItem -Path $puzzlesDir -Recurse -File -ErrorAction SilentlyContinue)
    $sizeMB = [math]::Round(($pFiles | Measure-Object Length -Sum).Sum / 1MB, 0)
    Write-Info "lab/puzzles/ : $($pFiles.Count) fichiers | $sizeMB MB"
    $pFiles | ForEach-Object { Write-Host "    $($_.Name) : $([math]::Round($_.Length/1MB,1)) MB" }
}

# ─── CHECK 6 : lab/gameplay_observation/ — traces récentes ───────────────────
$checksTotal++
Write-Check 6 6 "lab/gameplay_observation/ — au moins 1 trace présente"
$goDir = "$Studio\lab\gameplay_observation"
if (-not (Test-Path $goDir)) {
    Write-Find "BASSE" "lab/gameplay_observation/ absent"
} else {
    $goFiles = @(Get-ChildItem -Path $goDir -Recurse -File -ErrorAction SilentlyContinue)
    if ($goFiles.Count -eq 0) {
        Write-Find "BASSE" "lab/gameplay_observation/ vide — aucune trace de partie"
    } else {
        $newest = $goFiles | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        $age = [math]::Round(((Get-Date) - $newest.LastWriteTime).TotalDays, 0)
        Write-Ok "$($goFiles.Count) traces | dernière il y a $age jour(s)"
    }
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
