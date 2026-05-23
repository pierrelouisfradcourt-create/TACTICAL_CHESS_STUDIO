<#
.SYNOPSIS
Runs or summarizes TacticalChessPureLab benchmarks.

.EXAMPLE
powershell -ExecutionPolicy Bypass -File .\scripts\run_benchmark.ps1 -Fast -Games 2 -RunClass exploration_only -TimeoutSeconds 180

.NOTES
-Fast enables faster exploratory runs and writes `lab\reports\latest_benchmark_summary.json` continuously during the run.
#>
param(
    [int]$Games = 12,
    [ValidateSet("exploration_only", "promotion_eligible")]
    [string]$RunClass = "exploration_only",
    [switch]$Fast,
    [switch]$Smoke,
    [switch]$SummarizeOnly,
    [int]$TimeoutSeconds = 0,
    [string]$TournamentDir = $null
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$PythonRuntime = Join-Path $PSScriptRoot "python_runtime.ps1"
$BenchmarkRunner = Join-Path $RepoRoot "benchmark_runner.py"

$effectiveGames = $Games
if ($Fast -and -not $PSBoundParameters.ContainsKey("Games")) {
    $effectiveGames = 2
}
if ($Smoke -and -not $PSBoundParameters.ContainsKey("Games")) {
    $effectiveGames = 2
}
if ($Smoke -and $effectiveGames -gt 2) {
    $effectiveGames = 2
}

$commandArgs = @(
    $BenchmarkRunner,
    "--games",
    $effectiveGames.ToString(),
    "--run-class",
    $RunClass
)

if ($Fast) {
    $commandArgs += "--fast"
}

if ($Smoke) {
    $commandArgs += "--smoke"
}

if ($SummarizeOnly) {
    $commandArgs += "--summarize-only"
}

if ($SummarizeOnly -and $TimeoutSeconds -gt 0) {
    Write-Warning "TimeoutSeconds is ignored when -SummarizeOnly is set (no cargo tournament run)."
}

if ($TimeoutSeconds -gt 0) {
    $commandArgs += @("--timeout-seconds", $TimeoutSeconds.ToString())
}

if (-not [string]::IsNullOrWhiteSpace($TournamentDir)) {
    $commandArgs += @("--tournament-dir", $TournamentDir)
}

& $PythonRuntime @commandArgs
exit $LASTEXITCODE
