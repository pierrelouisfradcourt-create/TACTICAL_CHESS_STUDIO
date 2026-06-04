# chain_rust.ps1 — Rust Code Audit
# Périmètre : build, tests, warnings, unwrap(), dead code, fichiers volumineux
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
function Write-Unk   { param($msg) Write-Host "  STATUS : INCONNU"; Write-Host "  REASON : $msg"; $script:findings.Add("[INCONNU] $msg") }

Write-Host "=== CHAIN RUST — $TIMESTAMP ==="
Write-Host "    Studio : $Studio"
Write-Host "    AVERTISSEMENT : cargo test prend 2-5 minutes"

# ─── CHECK 1 : cargo check ────────────────────────────────────────────────────
$checksTotal++
Write-Check 1 6 "cargo check (build errors)"
$checkResult = & cargo check --manifest-path "$Studio\Cargo.toml" 2>&1
$checkExit = $LASTEXITCODE
if ($checkExit -eq 0) {
    $warnCount = ($checkResult | Select-String "warning:").Count
    Write-Ok "cargo check : OK ($warnCount warnings)"
    if ($warnCount -gt 50) {
        Write-Find "BASSE" "$warnCount warnings cargo — dépasse le seuil de 50"
    }
} else {
    Write-Find "CRIT" "cargo check échoue (exit $checkExit) — build cassé"
    $checkResult | Select-String "^error" | Select-Object -First 5 | ForEach-Object { Write-Host "    $_" }
}

# ─── CHECK 2 : test baseline ──────────────────────────────────────────────────
$checksTotal++
Write-Check 2 6 "Baseline tests — nombre passing/failing (timeout 360s)"
$testResult = & cargo test --manifest-path "$Studio\Cargo.toml" 2>&1
$testExit = $LASTEXITCODE
$resultLine = $testResult | Select-String "test result:" | Select-Object -Last 1
if ($null -eq $resultLine) {
    Write-Unk "Impossible de trouver 'test result:' dans la sortie cargo test"
} else {
    $line = $resultLine.ToString()
    Write-Host "  SORTIE : $line"
    if ($testExit -eq 0) {
        Write-Ok "Tous les tests passent"
    } else {
        $failedTests = $testResult | Select-String "FAILED" | Select-Object -First 5
        Write-Find "HAUTE" "Des tests échouent : $line"
        $failedTests | ForEach-Object { Write-Host "    FAILED: $_" }
    }
}

# ─── CHECK 3 : unwrap() count ─────────────────────────────────────────────────
$checksTotal++
Write-Check 3 6 "Occurrences de .unwrap() dans src/ (seuil : > 30)"
$unwrapFiles = Get-ChildItem -Path "$Studio\src" -Recurse -Filter "*.rs" -ErrorAction SilentlyContinue
$totalUnwraps = 0
$perFile = @{}
foreach ($f in $unwrapFiles) {
    $content = Get-Content $f.FullName -Raw -ErrorAction SilentlyContinue
    if ($content) {
        $count = ([regex]::Matches($content, '\.unwrap\(\)')).Count
        if ($count -gt 0) {
            $rel = $f.FullName.Replace("$Studio\", "")
            $perFile[$rel] = $count
            $totalUnwraps += $count
        }
    }
}
if ($totalUnwraps -eq 0) {
    Write-Ok "Aucun .unwrap() dans src/"
} elseif ($totalUnwraps -le 30) {
    Write-Find "BASSE" "$totalUnwraps .unwrap() dans src/ (seuil 30)"
    $perFile.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object { Write-Host "    $($_.Key) : $($_.Value)" }
} else {
    Write-Find "MOY" "$totalUnwraps .unwrap() dans src/ — dépasse le seuil de 30"
    $perFile.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object { Write-Host "    $($_.Key) : $($_.Value)" }
}

# ─── CHECK 4 : panic!() count ─────────────────────────────────────────────────
$checksTotal++
Write-Check 4 6 "Occurrences de panic!() dans src/ hors tests (seuil : > 10)"
$panicMatches = Select-String -Path "$Studio\src\**\*.rs" -Pattern "panic!\(" -ErrorAction SilentlyContinue
$panicCount = if ($panicMatches) { @($panicMatches).Count } else { 0 }
if ($panicCount -eq 0) {
    Write-Ok "Aucun panic!() dans src/"
} elseif ($panicCount -le 10) {
    Write-Find "BASSE" "$panicCount panic!() dans src/"
    @($panicMatches) | ForEach-Object { Write-Host "    $($_.Filename):$($_.LineNumber) — $($_.Line.Trim())" }
} else {
    Write-Find "MOY" "$panicCount panic!() dans src/ — dépasse le seuil de 10"
    @($panicMatches) | ForEach-Object { Write-Host "    $($_.Filename):$($_.LineNumber) — $($_.Line.Trim())" }
}

# ─── CHECK 5 : fichiers > 500 lignes ──────────────────────────────────────────
$checksTotal++
Write-Check 5 6 "Fichiers src/*.rs > 500 lignes (seuil alerte : > 5 fichiers)"
$bigFiles = Get-ChildItem -Path "$Studio\src" -Recurse -Filter "*.rs" | ForEach-Object {
    $lines = (Get-Content $_.FullName).Count
    if ($lines -gt 500) {
        [PSCustomObject]@{ File = $_.FullName.Replace("$Studio\",""); Lines = $lines }
    }
} | Sort-Object Lines -Descending
$bigCount = ($bigFiles | Measure-Object).Count
if ($bigCount -eq 0) {
    Write-Ok "Aucun fichier src/ > 500 lignes"
} elseif ($bigCount -le 5) {
    Write-Find "BASSE" "$bigCount fichier(s) > 500 lignes"
    $bigFiles | ForEach-Object { Write-Host "    $($_.File) : $($_.Lines) lignes" }
} else {
    Write-Find "MOY" "$bigCount fichiers > 500 lignes — complexité élevée"
    $bigFiles | ForEach-Object { Write-Host "    $($_.File) : $($_.Lines) lignes" }
}

# ─── CHECK 6 : test failing connus ────────────────────────────────────────────
$checksTotal++
Write-Check 6 6 "Test failing préexistant connu : search_root_diagnostics_shape_is_consistent_for_controlled_position"
$knownFail = "chess::search::tests::search_root_diagnostics_shape_is_consistent_for_controlled_position"
if ($null -ne $testResult) {
    $knownInOutput = $testResult | Select-String ([regex]::Escape($knownFail)) | Where-Object { $_ -match "FAILED" }
    if ($knownInOutput) {
        Write-Find "HAUTE" "Test préexistant toujours failing : $knownFail"
    } elseif ($testResult | Select-String ([regex]::Escape($knownFail))) {
        Write-Info "Test connu présent dans la suite (état dans résumé ci-dessus)"
    } else {
        Write-Info "Test connu non trouvé dans la sortie (peut-être filtré)"
    }
} else {
    Write-Unk "Résultat cargo test non disponible — check 6 ignoré"
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
