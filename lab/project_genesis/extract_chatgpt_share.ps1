$ErrorActionPreference = "Stop"

param(
  [Parameter(Mandatory = $true)][string]$InputDir,
  [Parameter(Mandatory = $true)][string]$OutputDir,
  [int]$TopK = 2
)

function Repair-Mojibake([string]$s) {
  if (($s -notmatch "Ã") -and ($s -notmatch "â")) { return $s }
  try {
    $bytes = [System.Text.Encoding]::GetEncoding("iso-8859-1").GetBytes($s)
    return [System.Text.Encoding]::UTF8.GetString($bytes)
  } catch {
    return $s
  }
}

function Unescape-JsonString([string]$raw) {
  try {
    # Deserialize as JSON string to interpret backslash escapes safely.
    return [System.Text.Json.JsonSerializer]::Deserialize([string]('"' + $raw + '"'))
  } catch {
    return ($raw -replace "\\n", "`n" -replace "\\t", "`t" -replace "\\r", "" -replace "\\/", "/" -replace "\\\\", '\')
  }
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$htmlFiles = Get-ChildItem -Path $InputDir -Filter "*.html" | Sort-Object Name
if (-not $htmlFiles) { throw "No .html files found in $InputDir" }

$re = [regex]::new('"((?:[^"\\]|\\.){200,})"')

foreach ($file in $htmlFiles) {
  $content = Get-Content -Raw -Encoding UTF8 $file.FullName
  $candidates = New-Object System.Collections.Generic.List[object]

  foreach ($m in $re.Matches($content)) {
    $raw = $m.Groups[1].Value
    if ($raw -notmatch "\\n") { continue }

    $text = Unescape-JsonString $raw
    $text = [System.Net.WebUtility]::HtmlDecode($text)
    $text = Repair-Mojibake $text

    $score = 0
    $score += [Math]::Min($text.Length, 20000)
    if ($text.Contains("```")) { $score += 1500 }
    if ($text.Contains('# ')) { $score += 2000 }
    if ($text.Contains("`n---`n")) { $score += 1000 }
    if ($text -match "(?i)matrice|matrix") { $score += 800 }
    if ($text -match "cdn/assets|favicon|og:|viewport") { $score -= 2500 }

    $alpha = 0
    $sample = $text.Substring(0, [Math]::Min(400, $text.Length))
    foreach ($ch in $sample.ToCharArray()) { if ([char]::IsLetter($ch)) { $alpha++ } }
    if ($alpha -lt 40) { continue }

    $candidates.Add([pscustomobject]@{ Text = $text.Trim(); Score = $score })
  }

  $chosen = $candidates | Sort-Object Score -Descending | Select-Object -First ([Math]::Max(1, $TopK))
  $outPath = Join-Path $OutputDir ($file.BaseName + ".txt")

  $parts = @()
  foreach ($c in $chosen) { $parts += $c.Text }
  $joined = ($parts -join ("`n`n" + ("=" * 80) + "`n`n")) + "`n"
  Set-Content -Encoding UTF8 -Path $outPath -Value $joined
}

Write-Output "OK"
