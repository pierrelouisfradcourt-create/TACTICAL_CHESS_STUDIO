[CmdletBinding()]
param(
    [switch]$PrintExe,
    [switch]$Doctor,
    [switch]$Repair,
    [switch]$NoInstall,
    [switch]$Json,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$CommandArgs
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$LocalPython = Join-Path $RepoRoot ".python312\python.exe"
$VenvSitePackages = Join-Path $RepoRoot ".venv312\Lib\site-packages"
$InstallerPath = Join-Path $RepoRoot "python-3.12.5-amd64.exe"
$script:ResolvePythonFailureReason = $null

function Get-RepoLocalPythonExe {
    $targetDir = Split-Path -Parent $LocalPython
    if (-not (Test-Path -LiteralPath $targetDir)) {
        return $null
    }

    if (Test-Path -LiteralPath $LocalPython) {
        return $LocalPython
    }

    try {
        $hit = Get-ChildItem -LiteralPath $targetDir -Recurse -Filter python.exe -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($null -ne $hit -and -not [string]::IsNullOrWhiteSpace($hit.FullName)) {
            return $hit.FullName
        }
    }
    catch {
        return $null
    }

    return $null
}

function Test-PythonExe {
    param(
        [string]$Path
    )

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return $false
    }

    if (-not (Test-Path -LiteralPath $Path)) {
        return $false
    }

    try {
        & $Path -c "import sys; print(sys.version)" *> $null
        return $LASTEXITCODE -eq 0
    }
    catch {
        return $false
    }
}

function Normalize-PythonExePath {
    param(
        [string]$Path
    )

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return $null
    }

    $p = $Path.Trim()
    if ($p.StartsWith('"') -and $p.EndsWith('"') -and $p.Length -ge 2) {
        $p = $p.Substring(1, $p.Length - 2)
    }

    if ([string]::IsNullOrWhiteSpace($p)) {
        return $null
    }

    return $p
}

function Split-CommandLineTokensFallback {
    param(
        [string]$CommandLine
    )

    if ([string]::IsNullOrWhiteSpace($CommandLine)) {
        return @()
    }

    $tokens = New-Object System.Collections.Generic.List[string]
    $current = New-Object System.Text.StringBuilder
    $inSingle = $false
    $inDouble = $false

    for ($i = 0; $i -lt $CommandLine.Length; $i++) {
        $ch = $CommandLine[$i]

        if ($inSingle) {
            if ($ch -eq "'") {
                $inSingle = $false
                continue
            }
            [void]$current.Append($ch)
            continue
        }

        if ($inDouble) {
            if ($ch -eq '"') {
                $inDouble = $false
                continue
            }
            if ($ch -eq '`' -and ($i + 1) -lt $CommandLine.Length) {
                $i++
                [void]$current.Append($CommandLine[$i])
                continue
            }
            [void]$current.Append($ch)
            continue
        }

        if ([char]::IsWhiteSpace($ch)) {
            if ($current.Length -gt 0) {
                $tokens.Add($current.ToString())
                $current.Clear() | Out-Null
            }
            continue
        }

        if ($ch -eq "'") {
            $inSingle = $true
            continue
        }

        if ($ch -eq '"') {
            $inDouble = $true
            continue
        }

        [void]$current.Append($ch)
    }

    if ($current.Length -gt 0) {
        $tokens.Add($current.ToString())
    }

    return $tokens.ToArray()
}

function Split-CommandLineTokens {
    param(
        [string]$CommandLine
    )

    if ([string]::IsNullOrWhiteSpace($CommandLine)) {
        return @()
    }

    $cmd = $CommandLine.Trim()
    try {
        $parseErrors = $null
        $tokens = [System.Management.Automation.PSParser]::Tokenize($cmd, [ref]$parseErrors)
        if ($null -ne $parseErrors -and $parseErrors.Count -gt 0) {
            return (Split-CommandLineTokensFallback -CommandLine $cmd)
        }

        $parts = New-Object System.Collections.Generic.List[string]
        foreach ($t in $tokens) {
            if ($t.Type -eq "Command" -or $t.Type -eq "CommandArgument" -or $t.Type -eq "String" -or $t.Type -eq "Parameter" -or $t.Type -eq "Number") {
                if (-not [string]::IsNullOrWhiteSpace($t.Content)) {
                    $parts.Add($t.Content)
                }
            }
        }

        if ($parts.Count -gt 0) {
            return $parts.ToArray()
        }
    }
    catch {
        # ignore and fall back
    }

    return (Split-CommandLineTokensFallback -CommandLine $cmd)
}

function Normalize-PythonCmdLine {
    param(
        [string]$CmdLine
    )

    if ([string]::IsNullOrWhiteSpace($CmdLine)) {
        return $null
    }

    $p = $CmdLine.Trim()
    if ($p.StartsWith('"') -and $p.EndsWith('"') -and $p.Length -ge 2) {
        $p = $p.Substring(1, $p.Length - 2)
    }
    if ($p.StartsWith("'") -and $p.EndsWith("'") -and $p.Length -ge 2) {
        $p = $p.Substring(1, $p.Length - 2)
    }

    if ([string]::IsNullOrWhiteSpace($p)) {
        return $null
    }

    return $p
}

function Format-ArgForDisplay {
    param(
        [string]$Arg
    )

    if ($null -eq $Arg) {
        return '""'
    }

    if ($Arg -match '[\s"]') {
        return '"' + ($Arg -replace '"', '\"') + '"'
    }

    return $Arg
}

function Format-CommandForDisplay {
    param(
        [string]$Exe,
        [string[]]$CommandArgsForDisplay
    )

    $parts = New-Object System.Collections.Generic.List[string]
    $parts.Add((Format-ArgForDisplay -Arg $Exe))
    foreach ($a in $CommandArgsForDisplay) {
        $parts.Add((Format-ArgForDisplay -Arg $a))
    }
    return ($parts -join ' ')
}

function Invoke-CapturedCommand {
    param(
        [string]$Exe,
        [string[]]$CommandArgs
    )

    $stdoutPath = Join-Path $env:TEMP ([System.IO.Path]::GetRandomFileName())
    $stderrPath = Join-Path $env:TEMP ([System.IO.Path]::GetRandomFileName())

    $exitCode = $null
    $caughtException = $null

    try {
        try {
            & $Exe @CommandArgs 1> $stdoutPath 2> $stderrPath
            $exitCode = $LASTEXITCODE
        }
        catch {
            $caughtException = $_.Exception
            $exitCode = -1
            try {
                Set-Content -LiteralPath $stderrPath -Value $caughtException.Message -Encoding UTF8
            }
            catch {
                # ignore
            }
        }

        $stdout = ""
        $stderr = ""
        try { if (Test-Path -LiteralPath $stdoutPath) { $stdout = (Get-Content -LiteralPath $stdoutPath -Raw) } } catch { $stdout = "" }
        try { if (Test-Path -LiteralPath $stderrPath) { $stderr = (Get-Content -LiteralPath $stderrPath -Raw) } } catch { $stderr = "" }

        return [pscustomobject]@{
            exit_code = [int]$exitCode
            stdout = if ($null -eq $stdout) { "" } else { $stdout.TrimEnd("`r", "`n") }
            stderr = if ($null -eq $stderr) { "" } else { $stderr.TrimEnd("`r", "`n") }
        }
    }
    finally {
        try { if (Test-Path -LiteralPath $stdoutPath) { Remove-Item -LiteralPath $stdoutPath -Force } } catch { }
        try { if (Test-Path -LiteralPath $stderrPath) { Remove-Item -LiteralPath $stderrPath -Force } } catch { }
    }
}

function Parse-PythonVersionFromBanner {
    param(
        [string]$Banner
    )

    if ([string]::IsNullOrWhiteSpace($Banner)) {
        return ""
    }

    if ($Banner -match 'Python\\s+([0-9]+\\.[0-9]+\\.[0-9]+)') {
        return $Matches[1]
    }

    return ""
}

function Test-PythonLauncher312Detailed {
    param(
        [string]$Exe,
        [string[]]$LauncherArgs,
        [string]$RawCmdLine,
        [switch]$VerboseDebug
    )

    if ([string]::IsNullOrWhiteSpace($Exe)) {
        return [pscustomobject]@{ ok = $false }
    }

    if ($null -eq $LauncherArgs) { $LauncherArgs = @() }

    if ($VerboseDebug) {
        Write-Verbose ("TCS_PYTHON_CMD(raw)=" + $RawCmdLine)
        Write-Verbose ("TCS_PYTHON_CMD(parsed_exe)=" + $Exe)
        Write-Verbose ("TCS_PYTHON_CMD(parsed_args)=" + (($LauncherArgs -join ' ')))
    }

    $verArgs = @($LauncherArgs + @("--version"))
    if ($VerboseDebug) {
        Write-Verbose ("TCS_PYTHON_CMD(attempt)=" + (Format-CommandForDisplay -Exe $Exe -CommandArgsForDisplay $verArgs))
    }
    $verRes = Invoke-CapturedCommand -Exe $Exe -CommandArgs $verArgs
    if ($VerboseDebug) {
        Write-Verbose ("TCS_PYTHON_CMD(--version exit_code)=" + $verRes.exit_code)
        Write-Verbose ("TCS_PYTHON_CMD(--version stdout)=" + $verRes.stdout)
        Write-Verbose ("TCS_PYTHON_CMD(--version stderr)=" + $verRes.stderr)
    }

    $code = "import sys; print(sys.version_info[0]); print(sys.version_info[1])"
    $infoArgs = @($LauncherArgs + @("-c", $code))
    if ($VerboseDebug) {
        Write-Verbose ("TCS_PYTHON_CMD(attempt)=" + (Format-CommandForDisplay -Exe $Exe -CommandArgsForDisplay $infoArgs))
    }
    $infoRes = Invoke-CapturedCommand -Exe $Exe -CommandArgs $infoArgs
    if ($VerboseDebug) {
        Write-Verbose ("TCS_PYTHON_CMD(version_info exit_code)=" + $infoRes.exit_code)
        Write-Verbose ("TCS_PYTHON_CMD(version_info stdout)=" + $infoRes.stdout)
        Write-Verbose ("TCS_PYTHON_CMD(version_info stderr)=" + $infoRes.stderr)
    }

    $major = $null
    $minor = $null
    if ($infoRes.exit_code -eq 0 -and -not [string]::IsNullOrWhiteSpace($infoRes.stdout)) {
        $lines = $infoRes.stdout -split "`r?`n"
        $nums = @()
        foreach ($ln in $lines) {
            $t = $ln.Trim()
            if ($t -match '^[0-9]+$') {
                $nums += [int]$t
            }
        }
        if ($nums.Count -ge 2) {
            $major = $nums[0]
            $minor = $nums[1]
        }
    }

    $banner = ""
    if (-not [string]::IsNullOrWhiteSpace($verRes.stdout)) { $banner = $verRes.stdout }
    elseif (-not [string]::IsNullOrWhiteSpace($verRes.stderr)) { $banner = $verRes.stderr }

    $version = Parse-PythonVersionFromBanner -Banner $banner
    $ok = ($verRes.exit_code -eq 0 -and $infoRes.exit_code -eq 0 -and $major -eq 3 -and $minor -eq 12)

    return [pscustomobject]@{
        ok = $ok
        major = $major
        minor = $minor
        version = $version
        banner = $banner
        version_check = $verRes
        info_check = $infoRes
    }
}

function Install-LocalPython {
    if (-not (Test-Path -LiteralPath $InstallerPath)) {
        throw "Missing Python installer in repo: $InstallerPath"
    }

    try {
        Unblock-File -LiteralPath $InstallerPath -ErrorAction SilentlyContinue | Out-Null
    }
    catch {
        # best-effort only
    }

    $targetDir = Split-Path -Parent $LocalPython
    if (-not (Test-Path -LiteralPath $targetDir)) {
        New-Item -ItemType Directory -Path $targetDir | Out-Null
    }

    $args = @(
        "/quiet",
        "SimpleInstall=1",
        "InstallAllUsers=0",
        "PrependPath=0",
        "Include_test=0",
        "Include_launcher=0",
        "Include_pip=1",
        "Shortcuts=0",
        "TargetDir=$targetDir",
        "DefaultJustForMeTargetDir=$targetDir",
        "DefaultAllUsersTargetDir=$targetDir"
    )

    $proc = Start-Process -FilePath $InstallerPath -ArgumentList $args -Wait -PassThru
    if ($proc.ExitCode -ne 0) {
        $extra = ""
        if ($proc.ExitCode -eq 5) {
            $extra = " (exit code 5 usually means access denied; try running PowerShell as Administrator, and/or ensure the installer is not blocked by policy)."
        }
        throw "Python installer failed with exit code $($proc.ExitCode): $InstallerPath$extra"
    }

    $postInstallCandidates = @(
        (Get-RepoLocalPythonExe),
        (Join-Path $env:LOCALAPPDATA "Programs\\Python\\Python312\\python.exe"),
        (Join-Path $env:LOCALAPPDATA "Programs\\Python\\Python312-64\\python.exe"),
        (Join-Path $env:LOCALAPPDATA "Python\\pythoncore-3.12-64\\python.exe"),
        (Get-PythonExeFromPath "python"),
        (Get-PythonExeFromPyLauncher)
    ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

    $installedExe = $null
    foreach ($candidate in $postInstallCandidates) {
        if (Test-PythonExe $candidate) {
            $installedExe = $candidate
            break
        }
    }

    if ([string]::IsNullOrWhiteSpace($installedExe)) {
        throw "Python installer completed but no runnable python.exe was discovered (TargetDir=$targetDir): $InstallerPath"
    }

    return $installedExe
}

function Get-PythonExeFromPath {
    param(
        [string]$CommandName
    )

    try {
        $cmd = Get-Command $CommandName -ErrorAction SilentlyContinue
        if ($null -ne $cmd -and -not [string]::IsNullOrWhiteSpace($cmd.Source)) {
            return $cmd.Source
        }
    }
    catch {
        return $null
    }

    return $null
}

function Get-PythonExeFromPyLauncher {
    if (-not (Get-Command py -ErrorAction SilentlyContinue)) {
        return $null
    }

    try {
        $exe = (& py -3.12 -c "import sys; print(sys.executable)" 2>$null).Trim()
        if (-not [string]::IsNullOrWhiteSpace($exe)) {
            return $exe
        }
    }
    catch {
        return $null
    }

    return $null
}

function Get-PythonDoctorInfo {
    param(
        [string]$PythonExe
    )

    $code = @"
import json, sys, platform
info = {
  "executable": sys.executable,
  "version": sys.version.split()[0],
  "version_info": [sys.version_info[0], sys.version_info[1], sys.version_info[2]],
  "platform": platform.platform(),
}
print(json.dumps(info))
"@

    try {
        $raw = & $PythonExe -c $code 2>$null
        if ([string]::IsNullOrWhiteSpace($raw)) {
            return $null
        }
        return ($raw | ConvertFrom-Json)
    }
    catch {
        return $null
    }
}

function Test-PythonIs312 {
    param(
        [object]$Info
    )

    if ($null -eq $Info) {
        return $false
    }

    if ($null -eq $Info.version_info -or $Info.version_info.Count -lt 2) {
        return $false
    }

    return ($Info.version_info[0] -eq 3 -and $Info.version_info[1] -eq 12)
}

function Resolve-PythonRuntime {
    param(
        [switch]$AllowInstall
    )

    $script:ResolvePythonFailureReason = $null

    $firstWorkingNon312 = $null
    $firstWorkingNon312Info = $null

    function Try-Python312ExeCandidate {
        param(
            [string]$CandidatePath
        )

        $candidate = Normalize-PythonExePath -Path $CandidatePath
        if ([string]::IsNullOrWhiteSpace($candidate)) {
            return $null
        }

        $info = Get-PythonDoctorInfo -PythonExe $candidate
        if ($null -eq $info) {
            return $null
        }

        if (Test-PythonIs312 -Info $info) {
            return [pscustomobject]@{ mode = "exe"; exe = $candidate }
        }

        if ($null -eq $firstWorkingNon312) {
            $firstWorkingNon312 = $candidate
            $firstWorkingNon312Info = $info
        }

        return $null
    }

    function Try-Python312CmdCandidate {
        param(
            [string]$CandidateCmdLine,
            [switch]$VerboseDebug
        )

        $cmdLine = Normalize-PythonCmdLine -CmdLine $CandidateCmdLine
        if ([string]::IsNullOrWhiteSpace($cmdLine)) {
            return $null
        }

        $tokens = Split-CommandLineTokens -CommandLine $cmdLine
        if ($tokens.Count -lt 1) {
            return $null
        }

        $exe = $tokens[0]
        $launcherArgs = @()
        if ($tokens.Count -gt 1) {
            $launcherArgs = $tokens[1..($tokens.Count - 1)]
        }

        $check = Test-PythonLauncher312Detailed -Exe $exe -LauncherArgs $launcherArgs -RawCmdLine $CandidateCmdLine -VerboseDebug:$VerboseDebug
        if ($check.ok) {
            return [pscustomobject]@{
                mode = "launcher"
                cmd_line = $cmdLine
                exe = $exe
                args = $launcherArgs
                version_major = $check.major
                version_minor = $check.minor
                version = $check.version
                banner = $check.banner
            }
        }

        if ($null -eq $firstWorkingNon312 -and $check.info_check.exit_code -eq 0 -and $null -ne $check.major -and $null -ne $check.minor) {
            $firstWorkingNon312 = $cmdLine
            $firstWorkingNon312Info = [pscustomobject]@{
                version = if ([string]::IsNullOrWhiteSpace($check.version)) { "$($check.major).$($check.minor)" } else { $check.version }
                version_info = @($check.major, $check.minor, 0)
                executable = ""
                platform = ""
            }
        }

        return $null
    }

    # Priority order:
    # 1) TCS_PYTHON_CMD (launcher mode, e.g. "py -3.12")
    # 2) TCS_PYTHON_EXE (direct exe path)
    # 3) py -3.12 (launcher)
    # 4) .\.python312\python.exe
    # 5) system python (PATH)
    # 6) installer/repair only if -Repair was passed (AllowInstall)
    $resolved = Try-Python312CmdCandidate -CandidateCmdLine $env:TCS_PYTHON_CMD -VerboseDebug:($VerbosePreference -ne "SilentlyContinue")
    if ($resolved) { return $resolved }

    $resolved = Try-Python312ExeCandidate -CandidatePath $env:TCS_PYTHON_EXE
    if ($resolved) { return $resolved }

    $resolved = Try-Python312CmdCandidate -CandidateCmdLine "py -3.12"
    if ($resolved) { return $resolved }

    $resolved = Try-Python312ExeCandidate -CandidatePath $LocalPython
    if ($resolved) { return $resolved }

    $resolved = Try-Python312ExeCandidate -CandidatePath (Get-PythonExeFromPath "python")
    if ($resolved) { return $resolved }

    $resolved = Try-Python312ExeCandidate -CandidatePath (Get-PythonExeFromPath "python3")
    if ($resolved) { return $resolved }

    if ($NoInstall -or -not $AllowInstall) {
        if ($null -ne $firstWorkingNon312) {
            $ver = ""
            try { $ver = ($firstWorkingNon312Info.version_info -join ".") } catch { $ver = "" }
            $script:ResolvePythonFailureReason = "Found a working Python interpreter but it is not Python 3.12 (first working: $firstWorkingNon312 version=$ver)."
        }
        else {
            $script:ResolvePythonFailureReason = "No working Python interpreter found in candidates (TCS_PYTHON_CMD, TCS_PYTHON_EXE, py -3.12, .python312, PATH python/python3)."
        }
        return $null
    }

    $installed = Install-LocalPython
    $installedInfo = Get-PythonDoctorInfo -PythonExe $installed
    if ($null -eq $installedInfo) {
        $script:ResolvePythonFailureReason = "Repo-local Python install succeeded, but the resulting interpreter is not runnable (blocked by policy or missing dependencies): $installed"
        return $null
    }

    if (-not (Test-PythonIs312 -Info $installedInfo)) {
        $ver = ""
        try { $ver = ($installedInfo.version_info -join ".") } catch { $ver = "" }
        $script:ResolvePythonFailureReason = "Repo-local Python install succeeded, but the resulting interpreter is not Python 3.12: $installed version=$ver"
        return $null
    }

    return [pscustomobject]@{ mode = "exe"; exe = $installed }
}

function Write-Doctor {
    param(
        [object]$ResolvedRuntime,
        [string]$FailureReason
    )

    $sitePackagesPresent = Test-Path -LiteralPath $VenvSitePackages
    $installerPresent = Test-Path -LiteralPath $InstallerPath

    $mode = ""
    $pythonExe = ""
    $pythonCmd = ""
    $is312 = $false
    $info = $null

    if ($null -ne $ResolvedRuntime) {
        try { $mode = $ResolvedRuntime.mode } catch { $mode = "" }
        if ($mode -eq "launcher") {
            try { $pythonCmd = $ResolvedRuntime.cmd_line } catch { $pythonCmd = "" }
            $maj = $null
            $min = $null
            $ver = ""
            $banner = ""
            try { $maj = $ResolvedRuntime.version_major } catch { $maj = $null }
            try { $min = $ResolvedRuntime.version_minor } catch { $min = $null }
            try { $ver = $ResolvedRuntime.version } catch { $ver = "" }
            try { $banner = $ResolvedRuntime.banner } catch { $banner = "" }

            $info = [pscustomobject]@{
                executable = ""
                version = $ver
                version_info = @($maj, $min, 0)
                platform = ""
                banner = $banner
            }
            $is312 = ($maj -eq 3 -and $min -eq 12)
        }
        elseif ($mode -eq "exe") {
            try { $pythonExe = $ResolvedRuntime.exe } catch { $pythonExe = "" }
            $info = Get-PythonDoctorInfo -PythonExe $pythonExe
            $is312 = Test-PythonIs312 -Info $info
        }
    }

    $payload = [ordered]@{
        status = if ($null -ne $ResolvedRuntime) { "ok" } else { "failed" }
        python_mode = if ([string]::IsNullOrWhiteSpace($mode)) { "" } else { $mode }
        python_exe = if ([string]::IsNullOrWhiteSpace($pythonExe)) { "" } else { $pythonExe }
        python_cmd = if ([string]::IsNullOrWhiteSpace($pythonCmd)) { "" } else { $pythonCmd }
        python_is_312 = $is312
        venv_site_packages_present = $sitePackagesPresent
        installer_present = $installerPresent
        repo_root = $RepoRoot
        failure_reason = if ($null -eq $FailureReason) { "" } else { $FailureReason }
        details = $info
        suggested_fixes = @(
            "Set TCS_PYTHON_CMD to a launcher command (example: 'py -3.12'), or set TCS_PYTHON_EXE to a Python 3.12 interpreter path.",
            "If you want the repo to self-install Python, ensure python-3.12.5-amd64.exe is in the repo root and run scripts/python_runtime.ps1 -Repair.",
            "If .venv312 exists but is broken, recreate it against the resolved interpreter, then rerun."
        )
    }

    if ($Json) {
        $payload | ConvertTo-Json -Depth 8
        return
    }

    Write-Output ("PY_RUNTIME_STATUS=" + $payload.status)
    if (-not [string]::IsNullOrWhiteSpace($payload.python_mode)) {
        Write-Output ("PY_RUNTIME_MODE=" + $payload.python_mode)
    }
    Write-Output ("PY_RUNTIME_EXE=" + $payload.python_exe)
    if (-not [string]::IsNullOrWhiteSpace($payload.python_cmd)) {
        Write-Output ("PY_RUNTIME_CMD=" + $payload.python_cmd)
    }
    Write-Output ("PY_RUNTIME_IS_312=" + ($payload.python_is_312.ToString().ToLower()))
    Write-Output ("PY_RUNTIME_VENV_SITE_PACKAGES_PRESENT=" + ($payload.venv_site_packages_present.ToString().ToLower()))
    Write-Output ("PY_RUNTIME_INSTALLER_PRESENT=" + ($payload.installer_present.ToString().ToLower()))
    if (-not [string]::IsNullOrWhiteSpace($payload.failure_reason)) {
        Write-Output ("PY_RUNTIME_FAILURE_REASON=" + $payload.failure_reason)
    }
    if ($null -ne $payload.details -and -not [string]::IsNullOrWhiteSpace($payload.details.version)) {
        Write-Output ("PY_RUNTIME_VERSION=" + $payload.details.version)
    }
}

if ($Doctor) {
    $pythonRuntime = Resolve-PythonRuntime -AllowInstall:$Repair
    if ($null -eq $pythonRuntime) {
        $reason = $script:ResolvePythonFailureReason
        if ([string]::IsNullOrWhiteSpace($reason)) {
            $reason = "No working Python 3.12 interpreter found (doctor mode does not auto-install; pass -Repair to allow local install)."
        }
        else {
            $reason = $reason + " Doctor mode does not auto-install; pass -Repair to allow local install."
        }

        Write-Doctor -ResolvedRuntime $null -FailureReason $reason
        exit 1
    }

    Write-Doctor -ResolvedRuntime $pythonRuntime -FailureReason $null
    exit 0
}

$pythonRuntime = Resolve-PythonRuntime -AllowInstall:$Repair
if ($null -eq $pythonRuntime) {
    $reason = $script:ResolvePythonFailureReason
    if ([string]::IsNullOrWhiteSpace($reason)) {
        $reason = "No working Python 3.12 interpreter found."
    }
    throw ($reason + " Set TCS_PYTHON_CMD (example: 'py -3.12'), set TCS_PYTHON_EXE, or run scripts/python_runtime.ps1 -Repair to attempt a repo-local install (installer at $InstallerPath).")
}

if (Test-Path -LiteralPath $VenvSitePackages) {
    if ([string]::IsNullOrWhiteSpace($env:PYTHONPATH)) {
        $env:PYTHONPATH = $VenvSitePackages
    }
    elseif (-not $env:PYTHONPATH.Split(';').Contains($VenvSitePackages)) {
        $env:PYTHONPATH = "$VenvSitePackages;$($env:PYTHONPATH)"
    }
}

if ($PrintExe) {
    if ($pythonRuntime.mode -eq "launcher") {
        Write-Output ("PY_RUNTIME_CMD=" + $pythonRuntime.cmd_line)
    }
    else {
        Write-Output $pythonRuntime.exe
    }
    exit 0
}

if ($CommandArgs.Count -eq 0) {
    if ($pythonRuntime.mode -eq "launcher") {
        Write-Output ("PY_RUNTIME_CMD=" + $pythonRuntime.cmd_line)
    }
    else {
        Write-Output $pythonRuntime.exe
    }
    exit 0
}

if ($pythonRuntime.mode -eq "launcher") {
    & $pythonRuntime.exe @($pythonRuntime.args) @CommandArgs
    exit $LASTEXITCODE
}

& $pythonRuntime.exe @CommandArgs
exit $LASTEXITCODE
