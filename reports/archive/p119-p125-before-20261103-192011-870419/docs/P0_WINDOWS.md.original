> 能力参考：下文保留已有入口和协议用法，不维护当前开发优先级。任务以 [唯一工作计划](../IMPLEMENTATION_ROADMAP.md) 为准，验证状态见 [当前报告](../reports/current/README.md)。

# P0：Windows + VS Code 从安装到真实 MP4

本次真实渲染在 Linux + Node 24.22.1 + Python 3.12.14 + Chrome Headless Shell 145 + FFmpeg 6.1.1 上完成。Windows 已修复启动路径与参数传递，并增加测试；**没有 Windows 实机，不能把这些测试等同于 Windows 端到端实测**。

以下命令在 VS Code 的 **PowerShell** 终端中逐段执行。使用 `npm.cmd` 可避开 PowerShell 对 `npm.ps1` 的执行策略限制；引擎内部启动 Vite、Remotion 时直接执行 Node 的 JS 入口，不再调用 `.cmd` 或 shell 传递 JSON。

## 1. 安装一次性的运行环境

已有相应软件时跳过安装。Node 需要 22 或更高版本；建议先使用本次接近的 Node 24 和 Python 3.12。

```powershell
winget install -e --id OpenJS.NodeJS.LTS
winget install -e --id Python.Python.3.12
winget install -e --id Gyan.FFmpeg
```

完成后重新打开 VS Code，让 PATH 更新。如果没有 winget，可从 [Node.js](https://nodejs.org/en/download)、[Python](https://www.python.org/downloads/windows/)、[FFmpeg Windows builds](https://www.gyan.dev/ffmpeg/builds/) 安装。手工解压 FFmpeg 时，把包含 `ffmpeg.exe` 和 `ffprobe.exe` 的 `bin` 目录加入 PATH。

```powershell
node --version
npm.cmd --version
py -3.12 --version
ffmpeg -version
ffprobe -version
```

上述 winget 包标识来自微软 [winget-pkgs](https://github.com/microsoft/winget-pkgs)；安装行为本身未在本次 Linux 环境执行。

## 2. 解压源码并安装项目依赖

把源码 ZIP 解压到例如 `D:\dev\MultiAgent-3D-Promo-Studio`。进入含 `package.json` 的目录，而不是上一层目录。

```powershell
Set-Location "D:\dev\MultiAgent-3D-Promo-Studio"
npm.cmd ci
Push-Location remotion-compositor
npm.cmd ci
Pop-Location
```

两个目录都附带 lockfile；不要复制本次 Linux 的 `node_modules` 到 Windows。

创建独立 Python 环境，无需激活脚本：

```powershell
py -3.12 -m venv .venv
$env:PYTHON = (Resolve-Path ".\.venv\Scripts\python.exe").Path
& $env:PYTHON -m pip install -r services/render-worker/requirements.txt
& $env:PYTHON -m playwright install chromium
```

每次打开新的终端，重新执行设置 `$env:PYTHON` 的一行。项目不会调用付费 API，后续生成命令显式使用 `--offline`。

如果浏览器下载失败，但电脑已经安装 Chrome，可指定它供 **Playwright 和 Remotion 同时使用**：

```powershell
$env:CHROME_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

也可填写实际存在的 Edge 可执行文件完整路径。不要填写浏览器安装文件或带额外参数的字符串。取消自定义路径：

```powershell
Remove-Item Env:CHROME_PATH -ErrorAction SilentlyContinue
```

## 3. 环境检查与基础测试

```powershell
npm.cmd run agent:doctor
npm.cmd run agent:test
npm.cmd test
npm.cmd run build
npm.cmd run lint
& $env:PYTHON -m unittest discover -s tests -p "*_test.py" -v
```

Doctor 会真正启动浏览器并创建 WebGL2 上下文，还会检查 FFmpeg、FFprobe、GLB、解码器及本地 HDRI。`npm test` 运行 Vitest，`agent:test` 运行 Node 原生测试，两者都要执行。

原有 lint 警告仍保留，退出码为 0；详细范围见验收报告。不要把警告当作本次做过全部修复。

## 4. 打开原编辑器

```powershell
npm.cmd run dev
```

打开 Vite 打印的本地 URL。四台 GLB 和四种 HDR 环境都改用本地资源，不再依赖 Google Draco CDN 或 HDRI CDN。原来的设备、轨道、项目保存结构和 UI 保留。

查看完可按 Ctrl+C 停止。后续渲染 CLI 会自动启动并关闭自己的本地 Vite，默认端口 5178。

## 5. 导出第一条 5 秒镜头

```powershell
npm.cmd run agent:plan -- --offline --brief "智能效率软件的功能宣传" --media assets/demo.mp4 --shots 1 --seconds 5 --width 540 --height 960 --fps 30 --output work/single.json
npm.cmd run agent:validate -- --storyboard work/single.json
npm.cmd run agent:render -- --storyboard work/single.json --out output/single --compose false
ffprobe -v error -show_streams -show_format -of json output/single/shots/shot-001.mp4
```

成功输出 `output/single/shots/shot-001.mp4`，另有 `.preview.png`、`.project.json`、`.job.json`、`.render.json`、`.vite.log`。期望 540×960、H.264、30 FPS、150 帧、5 秒。

浏览器先尝试原 WebCodecs MP4 编码；失败时使用原 PNG Sequence，再由 FFmpeg 编码。单独复测备用分支：

```powershell
npm.cmd run agent:render -- --storyboard work/single.json --out output/png-fallback --compose false --force-png
```

`--force-png` 是明确的备用路径测试，不代表电脑原本不支持 MP4。原始帧 ZIP 和解压帧可能占用较多空间，可在验证后手工删除。

## 6. 导出三镜头完整成片

```powershell
npm.cmd run agent:plan -- --offline --brief "智能分析；自动规划；精彩呈现" --media assets/demo.mp4 --shots 3 --seconds 5 --width 540 --height 960 --fps 30
npm.cmd run agent:validate
npm.cmd run agent:render -- --storyboard work/storyboard.json --out output
ffprobe -v error -show_streams -show_format -of json output/final.mp4
ffmpeg -v error -i output/final.mp4 -f null -
```

成功时输出三条 `output/shots/shot-00N.mp4` 和 `output/final.mp4`。完整流程为：离线 Video DSL → 原轨道编译器 → 原 Three.js/VideoTexture → 三条 MP4 → Remotion 的字幕、顺序与音乐 → 最终 H.264/AAC MP4。

`output/render-report.json` 应满足：`status = DONE`、`compositor = remotion`、`final.audio = true`。片长约 15 秒。

同一窗口再次执行 render，可检查缓存：

```powershell
npm.cmd run agent:render -- --storyboard work/storyboard.json --out output
(Get-Content -Raw output/render-report.json | ConvertFrom-Json).jobs | Format-Table id,status
```

三条任务都应是 `CACHED`，Remotion 仍会重新合成。改字幕只重新合成；改某条镜头或其素材只重渲受影响的镜头；改公共渲染代码会使镜头缓存失效。

## 7. 以后的一条命令冒烟检查

```powershell
npm.cmd run agent:p0
```

可选完整验证（含四机型预览与备用编码）：

```powershell
npm.cmd run agent:p0 -- --force-png --models
```

它会真实生成单镜头、三镜头和 Remotion 成片，解码最终视频，再复跑检查缓存。输出位于 `output/p0-smoke/`；画面质量还需查看预览图，脚本不会把媒体元数据检查冒称为审美或全画面视觉检查。

## 8. 替换自己的录屏和排错

将 MP4 放入 `assets/`，生成方案时使用 `--media assets/your-recording.mp4`。路径使用项目相对路径和 `/`，不要填写 `D:\...` 或网络 URL。尽量使用接近手机屏幕比例的竖屏录屏；原引擎会对近似比例做轻微适配。

缺素材时会得到 `ASSET_MISSING`，非法设备会得到 `INVALID_STORYBOARD`。查看输出目录中的 `render-report.json` 和对应镜头 `.render.json`、`.vite.log`，命令终端日志也应保留。

若端口占用，在 PowerShell 中设置其他端口再执行：

```powershell
$env:PROMO_PORT = "5188"
$env:REMOTION_CONCURRENCY = "2"
```

字幕在 Windows 默认使用微软雅黑。Linux 需安装 Noto Sans CJK SC 等中文字体；本次已安装并实查中文画面。

合成时会测量音乐音量：低于 -35 dB 平均音量的极轻输入会生成加了固定增益的副本，目标约 -20 dB，并限制峰值；再由 Remotion 应用 DSL 中的音量。原始音乐不修改，测量和增益写入 `audio-preparation.json`。这是对自带示例音乐几乎听不见的修复。

没有 Remotion 时现在明确失败，要求先安装子项目依赖。`--compositor ffmpeg` 仅用于兼容性排查，不渲染字幕，报告状态为 `COMPATIBILITY_ONLY`，不能用于宣称 P0 完整成片通过。
