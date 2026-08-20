param(
    [string]$InputPath = "lab/pedagogy_db/promoted_pedagogy_pack.jsonl",
    [string]$OutputPath = "lab/datasets/clean_conversion_pack.jsonl",
    [string]$StatsJsonPath = "lab/reports/clean_conversion_pack_stats.json",
    [string]$StatsMdPath = "lab/reports/clean_conversion_pack_stats.md",
    [int]$FinalNPlies = 12,
    [int]$OpeningMaxPly = 20,
    [int]$MinFinalPhasePly = 25
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($FinalNPlies -le 0) {
    throw "FinalNPlies must be positive."
}
if ($MinFinalPhasePly -le $OpeningMaxPly) {
    throw "MinFinalPhasePly must be greater than OpeningMaxPly."
}

function Get-JsonlRows {
    param([string]$Path)

    $rows = @()
    foreach ($line in Get-Content $Path) {
        if (-not [string]::IsNullOrWhiteSpace($line)) {
            $rows += ($line | ConvertFrom-Json)
        }
    }
    return $rows
}

function Get-AvgPly {
    param([object[]]$Rows)

    if ($Rows.Count -eq 0) {
        return 0.0
    }

    $sum = 0.0
    foreach ($row in $Rows) {
        $sum += [int]$row.ply_index
    }
    return ($sum / $Rows.Count)
}

function Get-OpeningRowCount {
    param([object[]]$Rows, [int]$Threshold)

    $count = 0
    foreach ($row in $Rows) {
        if ([int]$row.ply_index -le $Threshold) {
            $count += 1
        }
    }
    return $count
}

$rows = Get-JsonlRows -Path $InputPath
$conversionRows = @($rows | Where-Object {
    ([string]$_.candidate_family_guess).Trim().ToLowerInvariant() -eq "conversion"
})
$decisiveConversionRows = @($conversionRows | Where-Object {
    $_.result -eq "1-0" -or $_.result -eq "0-1"
})

$grouped = $decisiveConversionRows | Group-Object source_file, source_game_index, game_id
$keptRows = @()
$perGame = @()
$skippedGames = 0

foreach ($group in $grouped) {
    $gameRows = @($group.Group | Sort-Object { [int]$_.ply_index })
    if ($gameRows.Count -eq 0) {
        continue
    }

    $maxPly = [int]$gameRows[-1].ply_index
    $finalPhaseStart = [Math]::Max($maxPly - $FinalNPlies + 1, $MinFinalPhasePly)
    $selected = @($gameRows | Where-Object {
        [int]$_.ply_index -ge $finalPhaseStart -and
        [int]$_.ply_index -gt $OpeningMaxPly -and
        [int]$_.ply_index -ge $MinFinalPhasePly
    })

    if ($selected.Count -eq 0) {
        $skippedGames += 1
        continue
    }

    foreach ($row in $selected) {
        $row.candidate_family_guess = "conversion"
        Add-Member -InputObject $row -NotePropertyName conversion_phase_label -NotePropertyValue "final_phase" -Force
        Add-Member -InputObject $row -NotePropertyName conversion_filter_version -NotePropertyValue "clean_conversion_pack_v1" -Force
        Add-Member -InputObject $row -NotePropertyName conversion_filter_rule -NotePropertyValue ("decisive game, ply>{0}, ply>={1}, final_{2}_plies_only" -f $OpeningMaxPly, $MinFinalPhasePly, $FinalNPlies) -Force
    }

    $keptRows += $selected
    $first = $selected[0]
    $perGame += [pscustomobject]@{
        source_file = [string]$first.source_file
        source_game_index = [string]$first.source_game_index
        game_id = if ($first.PSObject.Properties.Name -contains "game_id" -and $first.game_id) { [string]$first.game_id } else { $null }
        rows_kept = $selected.Count
        min_ply_kept = [int]$selected[0].ply_index
        max_ply_kept = [int]$selected[-1].ply_index
        game_max_ply = $maxPly
    }
}

$beforeRows = $conversionRows.Count
$afterRows = $keptRows.Count
$beforeOpening = Get-OpeningRowCount -Rows $conversionRows -Threshold $OpeningMaxPly
$afterOpening = Get-OpeningRowCount -Rows $keptRows -Threshold $OpeningMaxPly
$removedOpening = $beforeOpening - $afterOpening
$openingRemovedPct = if ($beforeOpening -gt 0) {
    ($removedOpening / $beforeOpening) * 100.0
} else {
    0.0
}

$stats = [ordered]@{
    filter_version = "clean_conversion_pack_v1"
    source_dataset = $InputPath
    rules = [ordered]@{
        candidate_family_guess = "conversion"
        decisive_games_only = $true
        opening_max_ply = $OpeningMaxPly
        min_final_phase_ply = $MinFinalPhasePly
        final_n_plies = $FinalNPlies
    }
    before = [ordered]@{
        rows = $beforeRows
        avg_ply = [Math]::Round((Get-AvgPly -Rows $conversionRows), 4)
        opening_rows = $beforeOpening
    }
    after = [ordered]@{
        rows = $afterRows
        avg_ply = [Math]::Round((Get-AvgPly -Rows $keptRows), 4)
        opening_rows = $afterOpening
    }
    delta = [ordered]@{
        rows_kept = $afterRows
        rows_removed = ($beforeRows - $afterRows)
        opening_contamination_removed_pct = [Math]::Round($openingRemovedPct, 4)
    }
    games_considered = $grouped.Count
    games_with_rows_kept = $perGame.Count
    games_skipped_after_phase_filter = $skippedGames
    per_game = $perGame
}

$outputDir = Split-Path -Parent $OutputPath
$statsJsonDir = Split-Path -Parent $StatsJsonPath
$statsMdDir = Split-Path -Parent $StatsMdPath
if ($outputDir) { New-Item -ItemType Directory -Force -Path $outputDir | Out-Null }
if ($statsJsonDir) { New-Item -ItemType Directory -Force -Path $statsJsonDir | Out-Null }
if ($statsMdDir) { New-Item -ItemType Directory -Force -Path $statsMdDir | Out-Null }

$jsonlLines = foreach ($row in $keptRows) {
    $row | ConvertTo-Json -Compress -Depth 8
}
Set-Content -Path $OutputPath -Value $jsonlLines

$stats | ConvertTo-Json -Depth 8 | Set-Content -Path $StatsJsonPath

$statsMd = @(
    "# Clean Conversion Pack Stats",
    "",
    ("Source dataset: " + '`' + $InputPath + '`'),
    ("Output dataset: " + '`' + $OutputPath + '`'),
    "",
    "Rules:",
    ("- decisive games only: " + '`' + $true + '`'),
    ("- opening max ply: " + '`' + $OpeningMaxPly + '`'),
    ("- minimum final-phase ply: " + '`' + $MinFinalPhasePly + '`'),
    ("- final N plies: " + '`' + $FinalNPlies + '`'),
    "",
    "Before:",
    ("- rows: {0}" -f $stats.before.rows),
    ("- avg ply: {0:N2}" -f $stats.before.avg_ply),
    ("- opening rows: {0}" -f $stats.before.opening_rows),
    "",
    "After:",
    ("- rows: {0}" -f $stats.after.rows),
    ("- avg ply: {0:N2}" -f $stats.after.avg_ply),
    ("- opening rows: {0}" -f $stats.after.opening_rows),
    "",
    "Delta:",
    ("- rows kept: {0}" -f $stats.delta.rows_kept),
    ("- rows removed: {0}" -f $stats.delta.rows_removed),
    ("- opening contamination removed %: {0:N2}" -f $stats.delta.opening_contamination_removed_pct),
    "",
    "Game summary:",
    ("- games considered: {0}" -f $stats.games_considered),
    ("- games kept: {0}" -f $stats.games_with_rows_kept),
    ("- games skipped after phase filter: {0}" -f $stats.games_skipped_after_phase_filter)
)
Set-Content -Path $StatsMdPath -Value $statsMd

Write-Output ("rows kept: {0}" -f $stats.delta.rows_kept)
Write-Output ("rows removed: {0}" -f $stats.delta.rows_removed)
Write-Output ("avg ply before: {0:N2}" -f $stats.before.avg_ply)
Write-Output ("avg ply after: {0:N2}" -f $stats.after.avg_ply)
Write-Output ("opening contamination removed %: {0:N2}" -f $stats.delta.opening_contamination_removed_pct)
Write-Output ("output: {0}" -f $OutputPath)
Write-Output ("stats json: {0}" -f $StatsJsonPath)
Write-Output ("stats md: {0}" -f $StatsMdPath)
