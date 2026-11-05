param([string]$ProjectRoot = $PSScriptRoot)
if ($env:OS -ne 'Windows_NT') { Write-Host 'This launcher targets Windows 10/11.'; exit 2 }
. (Join-Path $PSScriptRoot 'P0_ENV_COMMON.ps1')
Set-Location -LiteralPath $ProjectRoot
$software = Get-P0Software -ProjectRoot $ProjectRoot
foreach ($file in @($software.Node, $software.Npm, $software.Git, $software.FFmpeg, $software.FFprobe)) {
    if ($file) {
        $directory = Split-Path $file
        if (($env:PATH -split ';') -notcontains $directory) { $env:PATH = $directory + ';' + $env:PATH }
    }
}
if ($software.Python) { $env:PYTHON = $software.Python.path }
if ($software.Browser) { $env:CHROME_PATH = $software.Browser }
$env:PYTHONUTF8 = '1'
Write-Host 'P0 项目终端已打开。此窗口的路径设置不会修改系统环境变量。' -ForegroundColor Green
Write-Host ('目录：' + (Get-Location).Path)
Write-Host ('PYTHON：' + $env:PYTHON)
Write-Host ('CHROME_PATH：' + $env:CHROME_PATH)
if (-not (Test-Path '.venv\Scripts\python.exe')) { Write-Host '首次使用：尚未创建项目 .venv，请按教程安装项目 Python 依赖。' -ForegroundColor Yellow }
if (-not $software.Browser) { Write-Host '尚未找到浏览器；安装 Playwright Chromium 后重新打开本终端。' -ForegroundColor Yellow }
Write-Host ''
Write-Host '日常启动编辑器：npm.cmd run dev'
Write-Host '环境检查：npm.cmd run agent:doctor'
Write-Host '端到端测试：npm.cmd run agent:p0'
