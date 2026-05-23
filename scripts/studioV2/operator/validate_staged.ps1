[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-RepoRoot {
    return (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

function Get-PythonCommand {
    $repoRoot = Get-RepoRoot
    $venvPython = Join-Path $repoRoot ".venv312\Scripts\python.exe"
    if (Test-Path $venvPython) {
        return $venvPython
    }

    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python) {
        return "python"
    }

    $py = Get-Command py -ErrorAction SilentlyContinue
    if ($py) {
        return "py -3"
    }

    return $null
}

function Invoke-Python {
    param(
        [Parameter(Mandatory = $true)][string]$PythonCommand,
        [Parameter(Mandatory = $true)][string[]]$Args
    )

    if ($PythonCommand -eq "py -3") {
        & py -3 @Args | Out-Null
    } else {
        & $PythonCommand @Args | Out-Null
    }
    return [int]$LASTEXITCODE
}

function Test-JsonSchemaDependency {
    param([Parameter(Mandatory = $true)][string]$PythonCommand)
    $cmd = @("-c", "import jsonschema")
    $exitCode = Invoke-Python -PythonCommand $PythonCommand -Args $cmd
    return ($exitCode -eq 0)
}

$summary = [ordered]@{
    status = "PASS"
    blocked_reasons = @()
    warnings = @()
    checked_json_files = @()
    schema_validation = "SKIPPED"
    hygiene_checks = @()
}

$repoRoot = Get-RepoRoot
Push-Location $repoRoot
try {
    $pythonCommand = Get-PythonCommand
    if (-not $pythonCommand) {
        $summary.status = "BLOCKED"
        $summary.blocked_reasons += "PYTHON_NOT_FOUND"
        $summary | ConvertTo-Json -Depth 8
        exit 1
    }

    $stagedFilesRaw = git diff --cached --name-only
    if ($LASTEXITCODE -ne 0) {
        $summary.status = "BLOCKED"
        $summary.blocked_reasons += "GIT_DIFF_CACHED_FAILED"
        $summary | ConvertTo-Json -Depth 8
        exit 1
    }

    $stagedFiles = @($stagedFilesRaw | Where-Object { $_ -and $_.Trim().Length -gt 0 })
    if ($stagedFiles.Count -eq 0) {
        $summary.warnings += "NO_STAGED_FILES"
    }

    $jsonFiles = @(
        $stagedFiles |
            Where-Object { $_.ToLowerInvariant().EndsWith(".json") }
    )

    foreach ($relativePath in $jsonFiles) {
        if (-not (Test-Path $relativePath)) {
            $summary.warnings += ("JSON_PATH_NOT_FOUND_SKIPPED: {0}" -f $relativePath)
            continue
        }

        $exitCode = Invoke-Python -PythonCommand $pythonCommand -Args @("-m", "json.tool", $relativePath)
        if ($exitCode -ne 0) {
            $summary.status = "BLOCKED"
            $summary.blocked_reasons += ("INVALID_JSON: {0}" -f $relativePath)
        } else {
            $summary.checked_json_files += $relativePath
        }
    }

    $schemaValidator = "scripts/validate_control_plane_json.py"
    if (Test-Path $schemaValidator) {
        if (Test-JsonSchemaDependency -PythonCommand $pythonCommand) {
            $schemaExitCode = Invoke-Python -PythonCommand $pythonCommand -Args @($schemaValidator, "--pretty")
            if ($schemaExitCode -eq 0) {
                $summary.schema_validation = "PASS"
            } else {
                $summary.status = "BLOCKED"
                $summary.schema_validation = "BLOCKED"
                $summary.blocked_reasons += "CONTROL_PLANE_SCHEMA_VALIDATION_FAILED"
            }
        } else {
            $summary.schema_validation = "UNKNOWN"
            $summary.warnings += "CONTROL_PLANE_SCHEMA_VALIDATION_SKIPPED_MISSING_JSONSCHEMA"
        }
    } else {
        $summary.schema_validation = "UNKNOWN"
        $summary.warnings += "CONTROL_PLANE_SCHEMA_VALIDATOR_NOT_FOUND"
    }

    $hygieneScript = "scripts/check_workspace_hygiene.py"
    if (Test-Path $hygieneScript) {
        $hygieneExitCode = Invoke-Python -PythonCommand $pythonCommand -Args @($hygieneScript, "--pretty")
        if ($hygieneExitCode -eq 0) {
            $summary.hygiene_checks += "check_workspace_hygiene:PASS"
        } else {
            $summary.status = "BLOCKED"
            $summary.hygiene_checks += "check_workspace_hygiene:BLOCKED"
            $summary.blocked_reasons += "WORKSPACE_HYGIENE_FAILED"
        }
    } else {
        $summary.hygiene_checks += "check_workspace_hygiene:UNKNOWN_NOT_FOUND"
    }

    $sessionReportScript = "scripts/report_local_agent_session.py"
    if (Test-Path $sessionReportScript) {
        $sessionExitCode = Invoke-Python -PythonCommand $pythonCommand -Args @($sessionReportScript, "--pretty")
        if ($sessionExitCode -eq 0) {
            $summary.hygiene_checks += "report_local_agent_session:PASS"
        } else {
            $summary.status = "BLOCKED"
            $summary.hygiene_checks += "report_local_agent_session:BLOCKED"
            $summary.blocked_reasons += "LOCAL_AGENT_SESSION_REPORT_FAILED"
        }
    } else {
        $summary.hygiene_checks += "report_local_agent_session:UNKNOWN_NOT_FOUND"
    }

    $summary.blocked_reasons = @($summary.blocked_reasons | Select-Object -Unique)
    $summary.warnings = @($summary.warnings | Select-Object -Unique)
    $summary.checked_json_files = @($summary.checked_json_files | Select-Object -Unique)

    $summary | ConvertTo-Json -Depth 8
    if ($summary.status -eq "BLOCKED") {
        exit 1
    }
    exit 0
} finally {
    Pop-Location
}
