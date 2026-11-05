function Get-P0CommandPath {
    param([string]$Name)
    $command = Get-Command -Name $Name -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($command) { return $command.Source }
    return $null
}

function Join-P0KnownPath {
    param([string]$Base, [string]$Child)
    if ($Base) { return Join-Path -Path $Base -ChildPath $Child }
    return $null
}

function Get-P0FirstFile {
    param([object[]]$Candidates)
    foreach ($candidate in $Candidates) {
        if ($candidate -and (Test-Path -LiteralPath ([string]$candidate) -PathType Leaf)) {
            return (Get-Item -LiteralPath ([string]$candidate)).FullName
        }
    }
    return $null
}

function Get-P0ProgramOutput {
    param([string]$File, [string[]]$Arguments)
    if (-not $File) { return [pscustomobject]@{ Success = $false; Text = ''; ExitCode = -1 } }
    try {
        $lines = & $File @Arguments 2>&1
        $code = $LASTEXITCODE
        return [pscustomobject]@{ Success = ($code -eq 0); Text = (($lines | ForEach-Object { $_.ToString() }) -join "`n"); ExitCode = $code }
    } catch {
        return [pscustomobject]@{ Success = $false; Text = $_.Exception.Message; ExitCode = -1 }
    }
}

function Test-P0NodeVersion {
    param([string]$Version)
    if ($Version -notmatch '^v?(\d+)\.(\d+)\.') { return $false }
    $major = [int]$Matches[1]; $minor = [int]$Matches[2]
    return ($major -gt 22 -or ($major -eq 22 -and $minor -ge 12))
}

function Get-P0PythonInfo {
    param([string]$File)
    if (-not $File -or $File -match '\\Microsoft\\WindowsApps\\python(3)?\.exe$') { return $null }
    # Single-quoted Python literals survive Windows PowerShell 5.1's native
    # argument conversion; embedded double quotes would need extra escaping.
    $probe = "import sys,json,importlib.util; print(json.dumps({'path':sys.executable,'version':sys.version.split()[0],'supported':sys.version_info>=(3,9),'playwright':importlib.util.find_spec('playwright') is not None}))"
    $result = Get-P0ProgramOutput -File $File -Arguments @('-c', $probe)
    if ($result.Success) {
        try { return $result.Text | ConvertFrom-Json -ErrorAction Stop } catch { return $null }
    }
    return $null
}

function Get-P0Software {
    param([string]$ProjectRoot)
    $node = Get-P0FirstFile -Candidates @((Get-P0CommandPath 'node.exe'), (Join-P0KnownPath $env:ProgramFiles 'nodejs\node.exe'), (Join-P0KnownPath $env:NVM_SYMLINK 'node.exe'))
    $npm = Get-P0FirstFile -Candidates @((Get-P0CommandPath 'npm.cmd'), $(if ($node) { Join-Path (Split-Path $node) 'npm.cmd' }))
    $git = Get-P0FirstFile -Candidates @((Get-P0CommandPath 'git.exe'), (Join-P0KnownPath $env:ProgramFiles 'Git\cmd\git.exe'))
    $code = Get-P0FirstFile -Candidates @((Get-P0CommandPath 'code.cmd'), (Join-P0KnownPath $env:LOCALAPPDATA 'Programs\Microsoft VS Code\Code.exe'), (Join-P0KnownPath $env:ProgramFiles 'Microsoft VS Code\Code.exe'))
    $ffmpeg = Get-P0FirstFile -Candidates @((Get-P0CommandPath 'ffmpeg.exe'), 'C:\tools\ffmpeg\bin\ffmpeg.exe', 'C:\ffmpeg\bin\ffmpeg.exe', (Join-P0KnownPath $env:LOCALAPPDATA 'Microsoft\WinGet\Links\ffmpeg.exe'))
    $ffprobe = Get-P0FirstFile -Candidates @((Get-P0CommandPath 'ffprobe.exe'), $(if ($ffmpeg) { Join-Path (Split-Path $ffmpeg) 'ffprobe.exe' }))
    $browser = Get-P0FirstFile -Candidates @($env:CHROME_PATH, (Get-P0CommandPath 'chrome.exe'), (Get-P0CommandPath 'msedge.exe'), (Join-P0KnownPath $env:ProgramFiles 'Google\Chrome\Application\chrome.exe'), (Join-P0KnownPath ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'), (Join-P0KnownPath $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe'), (Join-P0KnownPath $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe'), (Join-P0KnownPath ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'), (Join-P0KnownPath $env:LOCALAPPDATA 'Microsoft\Edge\Application\msedge.exe'))

    # Query real interpreters and py's installed-runtime list. Never invoke a
    # Windows Store python alias or a py command that may install a runtime.
    $candidates = @((Join-Path $ProjectRoot '.venv\Scripts\python.exe'), $env:PYTHON, (Get-P0CommandPath 'python.exe'), (Get-P0CommandPath 'python3.exe'))
    $launcher = Get-P0CommandPath 'py.exe'
    if ($launcher) {
        $listing = Get-P0ProgramOutput -File $launcher -Arguments @('-0p')
        foreach ($line in ($listing.Text -split "`n")) {
            if ($line -match '(?i)([A-Z]:\\[^\r\n]*?python\.exe)\s*$') { $candidates += $Matches[1].Trim() }
        }
    }
    foreach ($key in @('HKCU:\Software\Python\PythonCore', 'HKLM:\Software\Python\PythonCore', 'HKLM:\Software\WOW6432Node\Python\PythonCore')) {
        if (Test-Path $key) {
            foreach ($version in (Get-ChildItem $key -ErrorAction SilentlyContinue)) {
                $install = Join-Path $version.PSPath 'InstallPath'
                if (Test-Path $install) {
                    $registry = Get-Item $install
                    $candidates += $registry.GetValue('ExecutablePath')
                    $base = $registry.GetValue('')
                    if ($base) { $candidates += Join-Path $base 'python.exe' }
                }
            }
        }
    }
    $pythons = @()
    foreach ($candidate in ($candidates | Where-Object { $_ } | Select-Object -Unique)) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
            $info = Get-P0PythonInfo -File $candidate
            if ($info -and -not ($pythons | Where-Object { $_.path -eq $info.path })) { $pythons += $info }
        }
    }
    $preferred = $pythons | Where-Object { $_.supported } | Select-Object -First 1
    $managedBrowser = $null
    if ($preferred -and $preferred.playwright) {
        $probe = 'from playwright.sync_api import sync_playwright; p=sync_playwright().start(); print(p.chromium.executable_path); p.stop()'
        $result = Get-P0ProgramOutput -File $preferred.path -Arguments @('-c', $probe)
        if ($result.Success) { $managedBrowser = Get-P0FirstFile -Candidates @($result.Text.Trim()) }
    }
    if (-not $browser) { $browser = $managedBrowser }
    return [pscustomobject]@{ Node = $node; Npm = $npm; Git = $git; VSCode = $code; FFmpeg = $ffmpeg; FFprobe = $ffprobe; Browser = $browser; ManagedBrowser = $managedBrowser; Pythons = @($pythons); Python = $preferred }
}
