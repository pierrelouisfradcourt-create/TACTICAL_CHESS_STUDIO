param(
  [Parameter(Mandatory = $true)][string]$InputFile,
  [Parameter(Mandatory = $true)][string]$OutputDir
)

$ErrorActionPreference = "Stop"

function Repair-Mojibake([string]$s) {
  if (($s -notmatch "Ã") -and ($s -notmatch "â")) { return $s }
  try {
    $bytes = [System.Text.Encoding]::GetEncoding("iso-8859-1").GetBytes($s)
    return [System.Text.Encoding]::UTF8.GetString($bytes)
  } catch {
    return $s
  }
}

function Slug([string]$s) {
  $x = $s.ToLowerInvariant()
  $x = $x -replace "[’'`]", ""
  $x = $x -replace "[^a-z0-9]+", "_"
  $x = $x.Trim("_")
  if (-not $x) { return "section" }
  return $x
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$raw = Get-Content -Raw -Encoding UTF8 $InputFile
$raw = $raw -replace "`r`n", "`n"

# Some exports are JSON-ish with literal "\n" sequences instead of real newlines.
if ($raw -match "\\\\n") {
  $raw = $raw -replace "\\\\r", ""
  $raw = $raw -replace "\\\\t", "`t"
  $raw = $raw -replace "\\\\n", "`n"
  $raw = $raw -replace "\\\\/", "/"
  $raw = $raw -replace "\\\\\\\\", "\\"
}

$lines = $raw -split "`n"

$sections = New-Object System.Collections.Generic.List[object]
$currentTitle = "Préambule"
$current = New-Object System.Collections.Generic.List[string]

foreach ($line in $lines) {
  $lineFixed = Repair-Mojibake $line
  if ($lineFixed -match '^\s*SECTION\s+(\d+)\s*(.*)\s*$') {
    if ($current.Count -gt 0) {
      $sections.Add([pscustomobject]@{ Title = $currentTitle; Lines = @($current) })
      $current.Clear() | Out-Null
    }
    $num = $Matches[1]
    $rest = ""
    if ($Matches.Count -ge 3) { $rest = [string]$Matches[2] }
    $rest = $rest.Trim()
    $rest = ($rest -replace '^[—–-]\s*', '').Trim()
    $currentTitle = ("SECTION " + $num + " - " + $rest)
    $current.Add("# $currentTitle") | Out-Null
    continue
  }
  $current.Add($lineFixed) | Out-Null
}
if ($current.Count -gt 0) {
  $sections.Add([pscustomobject]@{ Title = $currentTitle; Lines = @($current) })
}

$manifest = @()
$i = 0
foreach ($sec in $sections) {
  $i++
  $title = [string]$sec.Title
  $slug = Slug $title
  $path = Join-Path $OutputDir ("{0:D2}_{1}.md" -f $i, $slug)
  $text = ($sec.Lines -join "`n").Trim() + "`n"
  Set-Content -Encoding UTF8 -Path $path -Value $text
  $manifest += [pscustomobject]@{ order = $i; title = $title; file = (Split-Path -Leaf $path) }
}

$manifestPath = Join-Path $OutputDir "_manifest.json"
($manifest | ConvertTo-Json -Depth 5) | Set-Content -Encoding UTF8 -Path $manifestPath

Write-Output ("OK ({0} sections)" -f $sections.Count)
