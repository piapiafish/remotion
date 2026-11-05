param([string]$ProjectRoot = $PSScriptRoot)
if ($env:OS -ne 'Windows_NT') { Write-Host 'This diagnostic targets Windows 10/11.'; exit 2 }
. (Join-Path $PSScriptRoot 'P0_ENV_COMMON.ps1')
$ProjectRoot = [IO.Path]::GetFullPath($ProjectRoot)
$software = Get-P0Software -ProjectRoot $ProjectRoot
$report = New-Object System.Collections.Generic.List[string]
function Add-Report { param([string]$Text); $report.Add($Text); Write-Host $Text }
Add-Report 'P0 项目环境检测：只检测，不安装，不修改系统设置。'
Add-Report ('时间：' + (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))
Add-Report ('检测目录：' + $ProjectRoot)
Add-Report ('系统架构：' + $env:PROCESSOR_ARCHITECTURE)
Add-Report ''
foreach ($item in @(@('VS Code', $software.VSCode), @('Node.js', $software.Node), @('npm', $software.Npm), @('Python', $(if ($software.Python) { $software.Python.path })), @('Chrome/Edge/Chromium', $software.Browser), @('FFmpeg', $software.FFmpeg), @('FFprobe', $software.FFprobe), @('Git（建议）', $software.Git))) {
    if ($item[1]) { Add-Report ('[已找到] ' + $item[0] + '：' + $item[1]) }
    else { Add-Report ('[待确认] ' + $item[0] + '：未找到可用路径，可能未安装或未配置 PATH。') }
}
if ($software.Node) {
    $node = Get-P0ProgramOutput -File $software.Node -Arguments @('--version')
    Add-Report ('Node 版本：' + $node.Text)
    if (-not (Test-P0NodeVersion $node.Text.Trim())) { Add-Report '[需调整] 本工程请使用 Node 22.12+；建议 Node 24.x。' }
}
if ($software.Npm) { $npm = Get-P0ProgramOutput -File $software.Npm -Arguments @('--version'); Add-Report ('npm 版本：' + $npm.Text) }
if ($software.Git) { $git = Get-P0ProgramOutput -File $software.Git -Arguments @('--version'); Add-Report ('Git 版本：' + $git.Text) }
if ($software.Browser) { Add-Report ('浏览器文件版本：' + (Get-Item -LiteralPath $software.Browser).VersionInfo.ProductVersion) }
foreach ($python in $software.Pythons) {
    Add-Report ('Python ' + $python.version + '：' + $python.path + '；可发现 Playwright 模块：' + $python.playwright)
}
if ($software.Python -and $software.Python.version -notmatch '^3\.12\.') { Add-Report '[提示] 已找到可尝试复用的 Python；本次完整实测版本系列为 3.12，最终以依赖安装和 agent:doctor 为准。' }
if ($software.FFmpeg) {
    $ffmpeg = Get-P0ProgramOutput -File $software.FFmpeg -Arguments @('-version')
    Add-Report (($ffmpeg.Text -split "`n")[0])
    $encoders = Get-P0ProgramOutput -File $software.FFmpeg -Arguments @('-hide_banner', '-encoders')
    Add-Report ('FFmpeg libx264 编码器：' + ($encoders.Text -match '\blibx264\b'))
}
Add-Report ''
foreach ($item in @(@('项目根 package.json', 'package.json'), @('根项目依赖', 'node_modules\vite\bin\vite.js'), @('Remotion 依赖', 'remotion-compositor\node_modules\@remotion\cli\remotion-cli.js'), @('项目 Python 环境', '.venv\Scripts\python.exe'), @('iPhone GLB', 'public\devices\iphone-17-pro.glb'))) {
    $exists = Test-Path -LiteralPath (Join-Path $ProjectRoot $item[1]) -PathType Leaf
    Add-Report ('[项目文件] ' + $item[0] + '：' + $exists)
}
Add-Report ''
Add-Report '说明：已找到不等于完整渲染已通过；浏览器 WebGL 与成片需要后续 agent:doctor / agent:p0 验证。'
Add-Report '软件若显示待确认，请先把本报告发回，不必马上重复下载安装。'
$file = Join-Path $ProjectRoot 'P0-Environment-Report.txt'
try { $report | Set-Content -LiteralPath $file -Encoding UTF8; Write-Host ('报告已保存：' + $file) -ForegroundColor Green }
catch { Write-Host '无法写入报告，请复制本窗口文字。' -ForegroundColor Yellow }
