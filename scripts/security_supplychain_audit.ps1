[CmdletBinding()]
param(
  [string]$Workspace = 'C:\TACTICAL_CHESS_STUDIO'
)

$ErrorActionPreference = 'SilentlyContinue'
$timestamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$outDir = Join-Path $Workspace 'outputs\security_audit'
New-Item -ItemType Directory -Path $outDir -Force | Out-Null
$outFile = Join-Path $outDir ("security_supplychain_audit_$timestamp.txt")

function Add-Section {
  param([string]$Title)
  "" | Out-File -FilePath $outFile -Append -Encoding UTF8
  "=== $Title ===" | Out-File -FilePath $outFile -Append -Encoding UTF8
}

function Add-Line {
  param([string]$Text)
  $Text | Out-File -FilePath $outFile -Append -Encoding UTF8
}

function Add-CommandOutput {
  param(
    [string]$Label,
    [scriptblock]$Command
  )
  Add-Line ("-- " + $Label)
  try {
    $result = & $Command 2>&1
    if ($null -eq $result -or ($result | Out-String).Trim().Length -eq 0) {
      Add-Line "(no output)"
    } else {
      $result | Out-String | Out-File -FilePath $outFile -Append -Encoding UTF8
    }
  } catch {
    Add-Line ("ERROR: " + $_.Exception.Message)
  }
}

"Security Supply Chain Audit" | Out-File -FilePath $outFile -Encoding UTF8
"Generated: $(Get-Date -Format s)" | Out-File -FilePath $outFile -Append -Encoding UTF8
"Workspace: $Workspace" | Out-File -FilePath $outFile -Append -Encoding UTF8

Add-Section "Identity"
Add-CommandOutput -Label "whoami" -Command { whoami }
Add-CommandOutput -Label "hostname" -Command { hostname }

Add-Section "Defender"
Add-CommandOutput -Label "Get-MpComputerStatus" -Command { Get-MpComputerStatus | Format-List * }

Add-Section "Firewall"
Add-CommandOutput -Label "Get-NetFirewallProfile" -Command { Get-NetFirewallProfile | Format-Table Name, Enabled, DefaultInboundAction, DefaultOutboundAction -AutoSize }

Add-Section "RDP"
Add-CommandOutput -Label "fDenyTSConnections" -Command { Get-ItemPropertyValue -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server' -Name 'fDenyTSConnections' }

Add-Section "LSA"
Add-CommandOutput -Label "RunAsPPL" -Command { Get-ItemPropertyValue -Path 'HKLM:\SYSTEM\CurrentControlSet\Control\Lsa' -Name 'RunAsPPL' }

Add-Section "BitLocker"
Add-CommandOutput -Label "manage-bde -status" -Command { manage-bde -status }

Add-Section "ASR"
Add-CommandOutput -Label "Get-MpPreference ASR IDs/Actions" -Command {
  $mp = Get-MpPreference
  [pscustomobject]@{
    AttackSurfaceReductionRules_Ids     = ($mp.AttackSurfaceReductionRules_Ids -join ', ')
    AttackSurfaceReductionRules_Actions = ($mp.AttackSurfaceReductionRules_Actions -join ', ')
  } | Format-List *
}

Add-Section "Git State"
if (Test-Path (Join-Path $Workspace '.git')) {
  Add-Line "RepoStatus: FOUND"
  Add-CommandOutput -Label "git branch" -Command { git -C $Workspace rev-parse --abbrev-ref HEAD }
  Add-CommandOutput -Label "git HEAD" -Command { git -C $Workspace rev-parse HEAD }
  Add-CommandOutput -Label "git status --short" -Command { git -C $Workspace status --short }
} else {
  Add-Line "RepoStatus: NOT_FOUND"
}

Add-Section "Repo-Level Checks"
$reposRoot = Join-Path $Workspace 'repos'
if (-not (Test-Path $reposRoot)) {
  Add-Line "ReposRoot: NOT_FOUND ($reposRoot)"
} else {
  $repoGitDirs = Get-ChildItem -Path $reposRoot -Recurse -Directory -Force |
    Where-Object { $_.Name -eq '.git' }
  if (-not $repoGitDirs) {
    Add-Line "RepoDiscovery: NOT_FOUND (.git under $reposRoot)"
  } else {
    $secretIgnorePatterns = @(
      '.env',
      '.env*',
      '*.pem',
      '*.key',
      '*.p12',
      '*.pfx',
      'id_rsa',
      'id_ed25519'
    )
    $repoSecretPatterns = @('*.env', '.env', '.env.*', '*.pem', '*.key', 'id_rsa', 'id_ed25519')

    foreach ($gitDir in $repoGitDirs) {
      $repoPath = $gitDir.Parent.FullName
      Add-Line ""
      Add-Line ("Repo: " + $repoPath)
      Add-CommandOutput -Label "git branch" -Command { git -C $repoPath rev-parse --abbrev-ref HEAD }
      Add-CommandOutput -Label "git HEAD" -Command { git -C $repoPath rev-parse HEAD }
      Add-CommandOutput -Label "git status --short" -Command { git -C $repoPath status --short }

      $gitignorePath = Join-Path $repoPath '.gitignore'
      if (Test-Path $gitignorePath) {
        Add-Line ("gitignore: FOUND (" + $gitignorePath + ")")
        $gitignoreRaw = Get-Content -Path $gitignorePath -Raw
        foreach ($expected in $secretIgnorePatterns) {
          if ($gitignoreRaw -match [regex]::Escape($expected)) {
            Add-Line ("gitignore pattern present: " + $expected)
          } else {
            Add-Line ("gitignore pattern missing: " + $expected)
          }
        }
      } else {
        Add-Line "gitignore: NOT_FOUND"
      }

      Add-Line "Repo sensitive file discovery:"
      foreach ($repoPattern in $repoSecretPatterns) {
        Add-Line ("Pattern: " + $repoPattern)
        Get-ChildItem -Path $repoPath -Recurse -Force -File -Filter $repoPattern |
          Select-Object -ExpandProperty FullName |
          Out-File -FilePath $outFile -Append -Encoding UTF8
      }
    }
  }
}

Add-Section "Sensitive File Discovery"
$patterns = @(
  '.env', '.env.*', '*.pem', '*.key', '*.p12', '*.pfx',
  'id_rsa', 'id_dsa', 'id_ed25519', '*.kdbx', '*.ovpn'
)
foreach ($pattern in $patterns) {
  Add-Line ("Pattern: " + $pattern)
  try {
    Get-ChildItem -Path $Workspace -Recurse -Force -File -Filter $pattern |
      Select-Object -ExpandProperty FullName |
      Out-File -FilePath $outFile -Append -Encoding UTF8
  } catch {
    Add-Line ("ERROR scanning pattern " + $pattern + ": " + $_.Exception.Message)
  }
}

Write-Output "Audit file: $outFile"
