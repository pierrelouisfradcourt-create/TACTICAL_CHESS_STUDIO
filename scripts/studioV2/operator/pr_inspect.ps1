[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:HasBlockingError = $false

function Write-Section {
    param([Parameter(Mandatory = $true)][string]$Title)
    Write-Host ""
    Write-Host ("=== {0} ===" -f $Title)
}

function Invoke-ReadOnlyCommand {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][scriptblock]$Command,
        [switch]$Optional
    )

    try {
        $output = & $Command 2>&1
        $exitCode = $LASTEXITCODE
        if ($exitCode -ne 0) {
            throw "exit code $exitCode"
        }
        Write-Host ("[{0}] PASS" -f $Name)
        if ($output) {
            $output | ForEach-Object { Write-Host $_ }
        }
        return "PASS"
    } catch {
        if ($Optional) {
            Write-Host ("[{0}] UNKNOWN - {1}" -f $Name, $_.Exception.Message)
            return "UNKNOWN"
        }

        Write-Host ("[{0}] BLOCKED - {1}" -f $Name, $_.Exception.Message)
        $script:HasBlockingError = $true
        return "BLOCKED"
    }
}

Write-Section "Local Git Inspect"
$null = Invoke-ReadOnlyCommand -Name "branch" -Command { git branch --show-current }
$null = Invoke-ReadOnlyCommand -Name "status" -Command { git status --porcelain }
$null = Invoke-ReadOnlyCommand -Name "recent_commits" -Command { git log --oneline -8 }

Write-Section "Optional GitHub CLI Inspect"
$ghCommand = Get-Command gh -ErrorAction SilentlyContinue
if (-not $ghCommand) {
    Write-Host "[gh] UNKNOWN - gh is not installed on PATH."
} else {
    $null = Invoke-ReadOnlyCommand -Name "gh_pr_list" -Optional -Command {
        gh pr list --limit 5 --json number,title,state,headRefName,baseRefName,updatedAt
    }
    $null = Invoke-ReadOnlyCommand -Name "gh_run_list" -Optional -Command {
        gh run list --limit 5 --json databaseId,workflowName,status,conclusion,createdAt
    }
}

if ($script:HasBlockingError) {
    exit 1
}

exit 0
