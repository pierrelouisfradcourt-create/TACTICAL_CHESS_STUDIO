# chain_hygiene.ps1 - Studio Hygiene Audit
# Perimetre : fichiers temporaires, sentinelles, racine parasite, artefacts stale
# claim_verdict: NO_CLAIM_ALLOWED

param(
    [string]$Studio = "C:\TACTICAL_CHESS_STUDIO"
)

$TIMESTAMP = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$findings = [System.Collections.Generic.List[string]]::new()
$checksTotal = 0
$checksOk = 0

function Add-Ok   { param($msg) Write-Host "  STATUS : OK";    Write-Host "  DETAIL : $msg"; $script:checksOk++ }
function Add-Find { param($level, $msg) Write-Host "  STATUS : $level"; Write-Host "  FINDING: $msg"; $script:findings.Add("[$level] $msg") }
function Add-Info { param($msg) Write-Host "  STATUS : INFO";  Write-Host "  DETAIL : $msg"; $script:checksOk++ }

Write-Host "=== CHAIN HYGIENE - $TIMESTAMP ==="
Write-Host "    Studio : $Studio"

# CHECK 1 : fichiers tmp_share_*.html dans lab/
$checksTotal++
Write-Host ""
Write-Host "[CHECK 1/9] Fichiers temporaires tmp_share_*.html dans lab/"
$tmpHtml = @(Get-ChildItem -Path "$Studio\lab" -Filter "tmp_share_*.html" -ErrorAction SilentlyContinue)
if ($tmpHtml.Count -eq 0) {
    Add-Ok "Aucun fichier tmp_share_*.html"
} else {
    $sizeKB = [math]::Round(($tmpHtml | Measure-Object Length -Sum).Sum / 1KB, 0)
    Add-Find "BASSE" "$($tmpHtml.Count) fichiers tmp_share_*.html dans lab/ - $sizeKB KB non purges"
    $tmpHtml | ForEach-Object { Write-Host "    $($_.Name)  ($([math]::Round($_.Length/1KB,0)) KB)" }
}

# CHECK 2 : rocky_debug.log a la racine
$checksTotal++
Write-Host ""
Write-Host "[CHECK 2/9] Log de debug a la racine (rocky_debug.log)"
$debugLog = Get-Item -Path "$Studio\rocky_debug.log" -ErrorAction SilentlyContinue
if (-not $debugLog) {
    Add-Ok "rocky_debug.log absent de la racine"
} else {
    $sizeKB = [math]::Round($debugLog.Length / 1KB, 0)
    Add-Find "BASSE" "rocky_debug.log a la racine - $sizeKB KB (devrait etre archive dans lab/ ou supprime)"
}

# CHECK 3 : ENGINE_SEARCH_NEURAL_SCAN.txt a la racine
$checksTotal++
Write-Host ""
Write-Host "[CHECK 3/9] Fichier scan brut a la racine (ENGINE_SEARCH_NEURAL_SCAN.txt)"
$scanFile = Get-Item -Path "$Studio\ENGINE_SEARCH_NEURAL_SCAN.txt" -ErrorAction SilentlyContinue
if (-not $scanFile) {
    Add-Ok "ENGINE_SEARCH_NEURAL_SCAN.txt absent de la racine"
} else {
    $sizeKB = [math]::Round($scanFile.Length / 1KB, 0)
    Add-Find "BASSE" "ENGINE_SEARCH_NEURAL_SCAN.txt a la racine - $sizeKB KB (fichier brut non archive)"
}

# CHECK 4 : dossiers sentinelles vides
$checksTotal++
Write-Host ""
Write-Host "[CHECK 4/9] Dossiers sentinelles vides (datasets/, runs/, tmp/)"
$sentinelles = @("datasets", "runs", "tmp")
$nonVides = @()
foreach ($s in $sentinelles) {
    $count = @(Get-ChildItem -Path "$Studio\$s" -Recurse -File -ErrorAction SilentlyContinue).Count
    if ($count -gt 0) { $nonVides += "$s ($count fichiers)" }
}
if ($nonVides.Count -eq 0) {
    Add-Info "Sentinelles vides comme attendu : $($sentinelles -join ', ')"
} else {
    Add-Find "MOY" "Sentinelles non vides - routage incorrect : $($nonVides -join ' | ')"
}

# CHECK 5 : artefacts target/ dans studioV2_MIGRATED_HOLD
$checksTotal++
Write-Host ""
Write-Host "[CHECK 5/9] Artefacts build dans repos/games/studioV2_MIGRATED_HOLD/target/"
$holdTarget = "$Studio\repos\games\studioV2_MIGRATED_HOLD\target"
if (-not (Test-Path $holdTarget)) {
    Add-Ok "Pas de target/ dans studioV2_MIGRATED_HOLD"
} else {
    $items = @(Get-ChildItem -Path $holdTarget -Recurse -File -ErrorAction SilentlyContinue)
    $count = $items.Count
    $sizesMB = [math]::Round(($items | Measure-Object Length -Sum).Sum / 1MB, 1)
    Add-Find "MOY" "studioV2_MIGRATED_HOLD/target/ non nettoye : $count fichiers, $sizesMB MB"
}

# CHECK 6 : document_work/ hors-studio
$checksTotal++
Write-Host ""
Write-Host "[CHECK 6/9] Repertoire hors-studio (document_work/)"
$docWork = "$Studio\document_work"
if (-not (Test-Path $docWork)) {
    Add-Ok "document_work/ absent"
} else {
    $items = @(Get-ChildItem -Path $docWork -Recurse -File -ErrorAction SilentlyContinue)
    $count = $items.Count
    $sizeKB = [math]::Round(($items | Measure-Object Length -Sum).Sum / 1KB, 0)
    Add-Find "BASSE" "document_work/ present ($count fichiers, $sizeKB KB) - contenu hors-studio (Skynet)"
}

# CHECK 7 : lab/runs/ taille
$checksTotal++
Write-Host ""
Write-Host "[CHECK 7/9] Taille lab/runs/ (seuil alerte : > 5000 MB)"
$labRuns = "$Studio\lab\runs"
if (-not (Test-Path $labRuns)) {
    Add-Ok "lab/runs/ absent"
} else {
    $items = @(Get-ChildItem -Path $labRuns -Recurse -File -ErrorAction SilentlyContinue)
    $sizeMB = [math]::Round(($items | Measure-Object Length -Sum).Sum / 1MB, 0)
    $count = $items.Count
    Write-Host "  MESURE : $sizeMB MB | $count fichiers"
    if ($sizeMB -gt 5000) {
        Add-Find "MOY" "lab/runs/ depasse 5000 MB : $sizeMB MB ($count fichiers) - purge recommandee"
    } elseif ($sizeMB -gt 2000) {
        Add-Find "BASSE" "lab/runs/ volumieux : $sizeMB MB ($count fichiers) - surveiller"
    } else {
        Add-Ok "lab/runs/ : $sizeMB MB ($count fichiers)"
    }
}

# CHECK 8 : lab/puzzles/ taille
$checksTotal++
Write-Host ""
Write-Host "[CHECK 8/9] Taille lab/puzzles/ (seuil alerte : > 2000 MB)"
$labPuzzles = "$Studio\lab\puzzles"
if (-not (Test-Path $labPuzzles)) {
    Add-Info "lab/puzzles/ absent"
} else {
    $items = @(Get-ChildItem -Path $labPuzzles -Recurse -File -ErrorAction SilentlyContinue)
    $sizeMB = [math]::Round(($items | Measure-Object Length -Sum).Sum / 1MB, 0)
    $count = $items.Count
    Write-Host "  MESURE : $sizeMB MB | $count fichiers"
    if ($sizeMB -gt 2000) {
        Add-Find "BASSE" "lab/puzzles/ : $sizeMB MB ($count fichiers) - base volumineuse, surveiller croissance"
    } else {
        Add-Ok "lab/puzzles/ : $sizeMB MB ($count fichiers)"
    }
}

# CHECK 9 : AI_MEMORY/ et .studio_state/ stubs vides
$checksTotal++
Write-Host ""
Write-Host "[CHECK 9/9] Stubs declares vides (AI_MEMORY/, .studio_state/)"
$stubOk = $true
$stubThresholds = @{ "AI_MEMORY" = 1; ".studio_state" = 2 }
foreach ($kv in $stubThresholds.GetEnumerator()) {
    $path = "$Studio\$($kv.Key)"
    if (Test-Path $path) {
        $count = @(Get-ChildItem -Path $path -Recurse -File -ErrorAction SilentlyContinue).Count
        if ($count -gt $kv.Value) {
            Add-Find "BASSE" "$($kv.Key) : $count fichiers (attendu <= $($kv.Value))"
            $stubOk = $false
        }
    }
}
if ($stubOk) {
    Add-Info "AI_MEMORY/ et .studio_state/ contiennent uniquement leurs fichiers structurels"
}

# RESUME
Write-Host ""
Write-Host "=== RESUME ==="
Write-Host "Checks  : $checksTotal total | $checksOk OK | $($findings.Count) findings"
if ($findings.Count -gt 0) {
    Write-Host "Findings :"
    foreach ($f in $findings) { Write-Host "  $f" }
}

$hasHigher = $findings | Where-Object { $_ -match "^\[CRIT\]|^\[HAUTE\]|^\[MOY\]|^\[INCONNU\]" }
if ($findings.Count -eq 0) {
    $verdict = "PASS"
} elseif ($hasHigher.Count -gt 0) {
    $verdict = "FAIL"
} else {
    $verdict = "PARTIAL"
}

Write-Host ""
Write-Host "VERDICT : $verdict"
Write-Host "claim_verdict: NO_CLAIM_ALLOWED"
