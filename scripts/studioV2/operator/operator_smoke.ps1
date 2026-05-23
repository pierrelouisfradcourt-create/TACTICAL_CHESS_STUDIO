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

function Add-CheckResult {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Status,
        [Parameter(Mandatory = $true)][string]$Detail
    )
    $script:results += [ordered]@{
        name = $Name
        status = $Status
        detail = $Detail
    }
}

$repoRoot = Get-RepoRoot
$script:results = @()

Push-Location $repoRoot
try {
    $prInspectScript = Join-Path $repoRoot "scripts/operator/pr_inspect.ps1"
    if (Test-Path $prInspectScript) {
        & $prInspectScript
        if ($LASTEXITCODE -eq 0) {
            Add-CheckResult -Name "pr_inspect" -Status "PASS" -Detail "read-only git and optional gh inspection completed"
        } else {
            Add-CheckResult -Name "pr_inspect" -Status "BLOCKED" -Detail "pr_inspect returned non-zero"
        }
    } else {
        Add-CheckResult -Name "pr_inspect" -Status "UNKNOWN" -Detail "script not found"
    }

    $validateStagedScript = Join-Path $repoRoot "scripts/operator/validate_staged.ps1"
    if (Test-Path $validateStagedScript) {
        & $validateStagedScript
        if ($LASTEXITCODE -eq 0) {
            Add-CheckResult -Name "validate_staged" -Status "PASS" -Detail "staged/operator smoke validation completed"
        } else {
            Add-CheckResult -Name "validate_staged" -Status "BLOCKED" -Detail "validate_staged returned non-zero"
        }
    } else {
        Add-CheckResult -Name "validate_staged" -Status "UNKNOWN" -Detail "script not found"
    }

    $pythonCommand = Get-PythonCommand
    $jsonValidator = "scripts/operator/validate_json_artifacts.py"
    if (-not $pythonCommand) {
        Add-CheckResult -Name "validate_json_artifacts" -Status "UNKNOWN" -Detail "python is not available"
    } elseif (Test-Path $jsonValidator) {
        $jsonExitCode = Invoke-Python -PythonCommand $pythonCommand -Args @($jsonValidator)
        if ($jsonExitCode -eq 0) {
            Add-CheckResult -Name "validate_json_artifacts" -Status "PASS" -Detail "json parseability checks passed"
        } else {
            Add-CheckResult -Name "validate_json_artifacts" -Status "BLOCKED" -Detail "validate_json_artifacts returned non-zero"
        }
    } else {
        Add-CheckResult -Name "validate_json_artifacts" -Status "UNKNOWN" -Detail "script not found"
    }

    $overall = "PASS"
    if (@($results | Where-Object { $_.status -eq "BLOCKED" }).Count -gt 0) {
        $overall = "BLOCKED"
    } elseif (@($results | Where-Object { $_.status -eq "UNKNOWN" }).Count -gt 0) {
        $overall = "UNKNOWN"
    }

    $summary = [ordered]@{
        operator_pack = "free-clean-operator-pack-v0"
        overall_status = $overall
        checks = $results
    }

    $summary | ConvertTo-Json -Depth 8

    if ($overall -eq "BLOCKED") {
        exit 1
    }
    exit 0
} finally {
    Pop-Location
}
