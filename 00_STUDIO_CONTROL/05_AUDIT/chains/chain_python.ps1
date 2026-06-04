# chain_python.ps1 — Python Code Audit
# Périmètre : syntaxe, imports, requirements, __pycache__ stale
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

Write-Host "=== CHAIN PYTHON — $TIMESTAMP ==="
Write-Host "    Studio : $Studio"

# Résoudre Python
$pythonExe = $null
$candidates = @(
    "$Studio\.venv312\Scripts\python.exe",
    "python",
    "python3"
)
foreach ($c in $candidates) {
    if (Get-Command $c -ErrorAction SilentlyContinue) { $pythonExe = $c; break }
    if (Test-Path $c) { $pythonExe = $c; break }
}
if (-not $pythonExe) {
    Write-Host "  AVERTISSEMENT : Python non trouvé — checks de syntaxe ignorés"
}

# ─── CHECK 1 : syntaxe ml/*.py ────────────────────────────────────────────────
$checksTotal++
Write-Check 1 5 "Syntaxe Python — ml/*.py"
$mlFiles = Get-ChildItem -Path "$Studio\ml" -Filter "*.py" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch "__pycache__" }
if (-not $pythonExe) {
    Write-Unk "Python non disponible — check syntaxe ml/ ignoré"
} elseif (($mlFiles | Measure-Object).Count -eq 0) {
    Write-Info "Aucun fichier .py dans ml/"
} else {
    $errors = @()
    foreach ($f in $mlFiles) {
        $result = & $pythonExe -m py_compile $f.FullName 2>&1
        if ($LASTEXITCODE -ne 0) { $errors += "$($f.Name) : $result" }
    }
    if ($errors.Count -eq 0) {
        Write-Ok "$($mlFiles.Count) fichiers ml/*.py syntaxiquement valides"
    } else {
        Write-Find "HAUTE" "$($errors.Count) erreur(s) de syntaxe dans ml/"
        $errors | ForEach-Object { Write-Host "    $_" }
    }
}

# ─── CHECK 2 : syntaxe scripts/studioV2/*.py ──────────────────────────────────
$checksTotal++
Write-Check 2 5 "Syntaxe Python — scripts/studioV2/*.py (racine seulement)"
$studioFiles = Get-ChildItem -Path "$Studio\scripts\studioV2" -Filter "*.py" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch "__pycache__" }
if (-not $pythonExe) {
    Write-Unk "Python non disponible — check syntaxe scripts/studioV2/ ignoré"
} elseif (($studioFiles | Measure-Object).Count -eq 0) {
    Write-Info "Aucun fichier .py dans scripts/studioV2/ (racine)"
} else {
    $errors = @()
    foreach ($f in $studioFiles) {
        $result = & $pythonExe -m py_compile $f.FullName 2>&1
        if ($LASTEXITCODE -ne 0) { $errors += "$($f.Name) : $result" }
    }
    if ($errors.Count -eq 0) {
        Write-Ok "$($studioFiles.Count) fichiers scripts/studioV2/*.py valides"
    } else {
        Write-Find "HAUTE" "$($errors.Count) erreur(s) syntaxe dans scripts/studioV2/"
        $errors | ForEach-Object { Write-Host "    $_" }
    }
}

# ─── CHECK 3 : requirements.txt cohérence ─────────────────────────────────────
$checksTotal++
Write-Check 3 5 "requirements.txt — présence et non-vide"
$req = Get-Item -Path "$Studio\requirements.txt" -ErrorAction SilentlyContinue
if (-not $req) {
    Write-Find "MOY" "requirements.txt absent à la racine"
} else {
    $lines = (Get-Content $req.FullName | Where-Object { $_ -match '\S' }).Count
    if ($lines -eq 0) {
        Write-Find "BASSE" "requirements.txt présent mais vide"
    } else {
        Write-Ok "requirements.txt : $lines dépendances déclarées"
    }
}

# ─── CHECK 4 : __pycache__ à la racine ou dans ml/ ───────────────────────────
$checksTotal++
Write-Check 4 5 "Répertoires __pycache__ dans ml/ (acceptables) vs racine (suspect)"
$rootCache = Get-ChildItem -Path $Studio -Depth 0 -Filter "__pycache__" -Directory -ErrorAction SilentlyContinue
if ($rootCache) {
    Write-Find "BASSE" "__pycache__ présent à la racine du studio"
} else {
    Write-Ok "Pas de __pycache__ à la racine"
}
$mlCacheCount = @(Get-ChildItem -Path "$Studio\ml" -Filter "__pycache__" -Recurse -Directory -ErrorAction SilentlyContinue).Count
if ($mlCacheCount -gt 0) {
    Write-Info "$mlCacheCount répertoire(s) __pycache__ dans ml/ (normal en développement)"
}

# ─── CHECK 5 : fichiers Python orphelins à la racine ─────────────────────────
$checksTotal++
Write-Check 5 5 "Fichiers .py orphelins à la racine (non dans un sous-dossier)"
$rootPy = Get-ChildItem -Path $Studio -Depth 0 -Filter "*.py" -ErrorAction SilentlyContinue
if (($rootPy | Measure-Object).Count -eq 0) {
    Write-Ok "Aucun .py orphelin à la racine"
} else {
    $names = ($rootPy | Select-Object -ExpandProperty Name) -join ", "
    Write-Find "BASSE" "$($rootPy.Count) fichier(s) .py à la racine : $names"
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
