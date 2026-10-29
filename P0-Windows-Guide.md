# MultiAgent-3D-Promo-Studio：Windows 安装、检测与长期使用

适用：本次交付的 P0 工程，Windows 10/11 + VS Code。核心视频链路已在 Linux 实测；Windows 实机是否通过，必须以你电脑执行后的结果为准。本说明没有读取你电脑，不能提前断言某项软件已经安装。

推荐顺序：**先检测已有环境 → 只补缺少的软件 → 安装项目依赖 → 启动网页 → 验证完整成片 → 长期修改与备份。**

## 1. 先解压正确的源码

使用 `MultiAgent-3D-Promo-Studio-P0.zip`。已经下载这一版就不用再次下载。解压到例如：

`D:\dev\MultiAgent-3D-Promo-Studio`

真正的项目根目录是能同时看到 `package.json`、`src`、`services`、`remotion-compositor`、`assets` 的这一层。不要在 ZIP 中直接运行。

再把 `P0-Windows-Run-Kit.zip` 中的文件**直接复制到项目根目录**，与 `package.json` 同层。不要再套一个 windows-run-kit 子目录。

## 2. 检测哪些已经安装

双击 `CHECK_P0_ENV.cmd`。它会读取常用程序路径、版本、Python 安装项和项目依赖文件，生成根目录下的：

`P0-Environment-Report.txt`

把报告发给我，我可以逐项告诉你：可直接复用、只需配置路径、需要补依赖、确实需要安装。

检测不安装软件，不联网下载浏览器，不修改系统环境变量。非常规目录中的便携软件可能显示“待确认”，这不等于没有安装；可以提供实际 exe 路径进一步确认。

| 检测结果 | 应该怎么做 |
| --- | --- |
| 已找到，版本满足要求 | 先复用，不重新下载安装 |
| 未找到可用路径 | 先检查是否装在其他位置；也可能只是 PATH 未配置 |
| Node 低于 22.12 | 调整 Node 版本；推荐 24.x，与本次实测同系列 |
| 找到 Python，但没有 Playwright | 保留 Python，仅安装项目 Python 依赖 |
| 找到 Chrome 或 Edge | 优先复用该浏览器，通常可以省去下载 Playwright Chromium；最终运行 Doctor 确认 |
| node_modules 文件存在 | 不代表依赖完整；Doctor/build 通过后，日常启动可以跳过重新安装 |

## 3. 需要的软件及下载位置

| 项目 | 用途 | 本项目采用的选择 | 下载位置 |
| --- | --- | --- | --- |
| VS Code | 编辑代码、查看终端和 Git 修改 | 已有就保留 | https://code.visualstudio.com/download |
| Node.js（含 npm） | 启动 React/Vite、运行 CLI 和 Remotion | 优先 24.x；已有 22.12+ 可先验证 | https://nodejs.org/en/download |
| Python | 执行 Playwright 视频渲染 worker | 首选 3.12 系列；已有版本先检测，包要求至少 3.9，最终以安装和 Doctor 为准 | https://www.python.org/downloads/windows/ |
| Chrome 或 Edge | 显示编辑器和自动渲染 | Windows 已有 Edge/Chrome 时优先复用 | https://www.google.com/chrome/ 或现有 Edge |
| FFmpeg（含 FFprobe） | 编码、探测视频，准备配乐 | 现有版本支持 libx264 且 Doctor/渲染通过即可 | https://ffmpeg.org/download.html ，Windows 构建 https://www.gyan.dev/ffmpeg/builds/ |
| Git | 长期修改时记录版本、回滚 | 建议安装，首次启动可先跳过 | https://git-scm.com/install/windows |

React、Three.js、Remotion、TypeScript 通过 npm 安装；Playwright 通过 Python pip 安装，不需要逐个找“应用安装包”。

### VS Code

下载 Windows 对应架构的 User Installer。常见 Intel/AMD 电脑选择 x64；ARM 电脑选择 ARM64。安装时保留“Add to PATH”。已有 VS Code 可直接“文件 → 打开文件夹”打开项目根目录。

### Node.js

在官网版本选项中选 **24.x**，下载 Windows Installer `.msi` 并安装，保留 npm 和 PATH 默认项。若已有版本满足最低要求，先验证，不为本项目主动替换其他项目正在使用的 Node。

安装后完全退出 VS Code 所有窗口，再重新打开。终端执行：

```powershell
node --version
npm.cmd --version
```

应显示具体版本。这里用 `npm.cmd`，避免 PowerShell 把命令转到 `npm.ps1` 后遇到执行策略问题。

### Python

检测已经找到可运行 Python 时，先不额外安装第二份。新装想贴近本次实测可选 Python 3.12 系列的 Windows 完整安装程序；3.12.10 的官方 64 位安装程序页面为：

https://www.python.org/downloads/release/python-31210/

这是该系列提供的 Windows 安装包选择，不是宣称它是当前最新 Python。安装时勾选 **Add python.exe to PATH**，保留 pip 和 Python Launcher。不要选 embeddable package 作为普通开发环境。

已有 3.11、3.13 等版本可先尝试创建本项目虚拟环境并安装依赖，Doctor 和渲染通过后再决定是否需要另装 3.12。

### FFmpeg 和 FFprobe

打开 Gyan 页面，在 **release builds** 中选择 `ffmpeg-release-essentials.zip`。解压后，把包含 `ffmpeg.exe` 和 `ffprobe.exe` 的 `bin` 目录放到例如：

`C:\tools\ffmpeg\bin`

Windows 搜索“编辑账户的环境变量” → 用户变量中的 `Path` → 编辑 → 新建 → 填入上述 `bin` 路径。保留原有条目。不要填 exe 文件本身。

完全退出并重新打开 VS Code/终端后验证：

```powershell
ffmpeg -version
ffprobe -version
```

### Git（长期开发建议）

下载 Git for Windows，安装时使用允许命令行及第三方软件调用 Git 的 PATH 选项，其他选项可保持默认。重新打开终端验证：

```powershell
git --version
```

所有软件补齐后，可再次双击 `CHECK_P0_ENV.cmd` 复查。

## 4. 首次安装项目依赖

双击根目录的 `OPEN_P0_TERMINAL.cmd`。它会打开已定位到项目目录的 PowerShell，自动选择已有 Python、优先使用项目 `.venv`，并查找现有 Chrome/Edge/Chromium。它只为当前窗口准备环境，不改系统变量。

以下步骤均在这个窗口中进行。每段没有报错再继续；有报错时保留完整文字。

### 4.1 安装两套 Node 依赖

首次解压源码时执行：

```powershell
npm.cmd ci
Push-Location remotion-compositor
npm.cmd ci
Pop-Location
```

根目录负责编辑器，子目录负责最终合成，两者都需要安装。已经安装过且检查通过时，不必日常重复执行；`npm ci` 会按 lockfile 重建依赖目录。

### 4.2 创建项目独立 Python 环境

如果终端已经打印 PYTHON 的实际路径，且尚无 `.venv`：

```powershell
& $env:PYTHON -m venv .venv
```

若已存在有效 `.venv`，跳过创建。接着在同一窗口执行：

```powershell
$env:PYTHON = (Resolve-Path ".\.venv\Scripts\python.exe").Path
& $env:PYTHON -m pip install -r services/render-worker/requirements.txt
```

如果 `$env:PYTHON` 为空，先补齐/确认 Python，不要继续执行上面的创建命令。也可使用检测报告里查到的具体解释器路径，例如：

```powershell
& "C:\你的Python安装路径\python.exe" -m venv .venv
```

这种方式不需要运行 Activate.ps1；以后打开 `OPEN_P0_TERMINAL.cmd` 会自动选中 `.venv`。

### 4.3 选择浏览器，优先复用已有安装

如果 `OPEN_P0_TERMINAL.cmd` 已打印有效 CHROME_PATH，直接进行下一节 Doctor，不用先下载 Chromium。

如果没找到浏览器，但你知道安装位置，可在当前窗口设置，例如：

```powershell
$env:CHROME_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

也可以填写真实存在的 `msedge.exe` 路径。Playwright 和 Remotion 会共用这个变量。

只有没有可用浏览器，或现有浏览器无法通过测试时，再执行：

```powershell
& $env:PYTHON -m playwright install chromium
```

然后关闭并重新打开 `OPEN_P0_TERMINAL.cmd`。入口会尝试查到该 Playwright 版本对应的已安装 Chromium，并将路径交给两个渲染模块，减少重复下载。Playwright 更新版本后可能需要匹配的新浏览器，不能只看缓存目录存在就断言可用。

## 5. 首次验收

先检查环境：

```powershell
npm.cmd run agent:doctor
```

Doctor 会真正启动浏览器并检测 WebGL2。只有“程序路径存在”还不够，Doctor 必须通过。

再执行基础检查：

```powershell
npm.cmd run agent:test
npm.cmd test
npm.cmd run build
npm.cmd run lint
& $env:PYTHON -m unittest discover -s tests -p "*_test.py" -v
```

本次 P0 对应的结果为：12 项 Agent 测试、190 项前端测试、3 项 Python 测试通过。lint 有保留的警告，构建有包体积提示，不能说成零警告。

最后跑一次真实成片测试：

```powershell
npm.cmd run agent:p0
```

它会生成单镜头、三镜头成片，再复跑验证缓存。最终示例位于：

`output\p0-smoke\film\final.mp4`

它会实际渲染，耗时取决于电脑，不要求实时完成。只有本机这一步通过，才能说你的 Windows 环境完整跑通。

## 6. 日常打开网页和修改代码

以后每次：双击 `OPEN_P0_TERMINAL.cmd`，执行：

```powershell
npm.cmd run dev
```

用 Chrome/Edge 打开终端显示的本地 URL，通常是 `http://localhost:5173`，以实际打印地址为准。启动后保留终端；停止时按 Ctrl+C。只开编辑器也可使用原有 `START_STUDIO.bat`。

在 VS Code 中打开项目根目录后，修改 `src/` 文件并保存，开发服务器通常会自动更新页面；修改依赖、Vite 配置或出现无法恢复的编译错误时再重启。

网页操作要点：

1. 在 Device 中选真实设备，在屏幕内容区域导入录屏。
2. 做动画时切换到 Movie，使用现有时间轴和关键帧。
3. 关闭或刷新前，用左上角保存按钮下载 `.mockup`；下次用文件夹按钮重新打开。不要把浏览器中的临时状态当作完整备份。
4. 左上角下载箭头是 PNG 快速导出；视频使用 Export 区域或下节的自动化命令。

当前网页手工编辑使用 Project/.mockup；自动化成片使用 storyboard JSON。这两种格式不能直接当作同一个文件交换，本次没有实现网页与 CLI 分镜的完整双向同步。

## 7. 自动生成一条 5 秒镜头

在项目终端执行：

```powershell
npm.cmd run agent:plan -- --offline --brief "智能效率软件的功能宣传" --media assets/demo.mp4 --shots 1 --seconds 5 --width 540 --height 960 --fps 30 --output work/single.json
npm.cmd run agent:validate -- --storyboard work/single.json
npm.cmd run agent:render -- --storyboard work/single.json --out output/single --compose false
```

输出：`output\single\shots\shot-001.mp4`。正常为 540×960、30 FPS、约 5 秒。

浏览器先尝试 MP4，失败才走 PNG→FFmpeg。需要主动排查备用流程时加 `--force-png`，不用每次都强制使用它。

## 8. 长期按项目生成完整成片

给每个宣传视频使用独立分镜路径和输出目录，可以减少重复覆盖。

```powershell
New-Item -ItemType Directory -Force projects/promo01 | Out-Null
npm.cmd run agent:plan -- --offline --brief "智能分析；自动规划；精彩呈现" --media assets/demo.mp4 --shots 3 --seconds 5 --width 540 --height 960 --fps 30 --output projects/promo01/storyboard.json
npm.cmd run agent:validate -- --storyboard projects/promo01/storyboard.json
npm.cmd run agent:render -- --storyboard projects/promo01/storyboard.json --out output/promo01
```

输出：`output\promo01\final.mp4`。这条是含字幕和音乐的完整合成，不是单条设备镜头。

`--offline` 使用现有本地导演模板，本阶段示例不需要 API Key。当前 P0 入口从录屏/分镜开始，软件源码 AI 理解与协商方案尚未接入。

换自己的素材时，把 MP4 放到 `assets/`，例如 `assets/my-recording.mp4`，将 `--media` 改成该路径。使用项目相对路径和 `/`；路径含空格时整体加引号。

之后可以在 VS Code 修改 `projects/promo01/storyboard.json`：字幕文案、镜头 motion/template、设备 ID 等。每次修改后先 validate，再 render。不要在每次修改后重新 plan，否则会重新生成并覆盖该分镜。

复用命令：

```powershell
npm.cmd run agent:validate -- --storyboard projects/promo01/storyboard.json
npm.cmd run agent:render -- --storyboard projects/promo01/storyboard.json --out output/promo01
```

已有缓存时会显示/记录 CACHED；字幕修改不会改变 3D 镜头指纹，仍会重新合成最终视频。

## 9. 长期维护和备份

| 内容 | 建议 |
| --- | --- |
| `src/` | 网页与 3D 场景代码，保存后通常可看到开发预览 |
| `services/agent-orchestrator/` | 离线规划、CLI 调度、缓存、合成准备 |
| `services/compiler/` | 分镜编译为原设备轨道 |
| `services/render-worker/` | Python 浏览器渲染 |
| `remotion-compositor/src/` | 整片顺序、字幕、音乐 |
| `projects/` | 建议放长期保留的分镜 JSON；命令中显式指定路径 |
| `assets/`、`public/devices/` | 录屏、音乐、模型及授权资料，随源码/媒体备份 |
| `node_modules/`、`.venv/` | 可重新安装的依赖，不必每次备份 |
| `output/`、`.mockup`、原始录屏 | 按需要单独备份；别只备份 Git |

建议先为当前代码创建一个本地 Git 基线，再开始修改：

```powershell
git init
git add .
git commit -m "P0 working baseline"
```

Git 首次要求身份时，按提示填写你自己的姓名和邮箱。初始化本地 Git 不会自动上传到 GitHub。

现有 `.gitignore` 忽略 `work/` 和 `output/`，因此 `work/storyboard.json` 和成片不会自动随普通 git add 进入版本历史。长期分镜放 `projects/` 更便于管理；重要 `.mockup`、输出视频、原始录屏仍要单独备份。

普通修改不需要重新安装软件。只有新增/更新依赖时才处理 npm 或 pip；`npm ci` 按 lockfile 恢复，新增 npm 包才用相应的 npm install 并保存 lockfile。涉及引擎修改时先跑基础检查，再跑一次 agent:p0。

## 10. 出错时怎么定位

| 现象 | 先做什么 |
| --- | --- |
| npm 不是内部命令 | 检查 Node/PATH；安装后完全重开 VS Code，或用 OPEN_P0_TERMINAL.cmd |
| npm.ps1 执行策略错误 | 使用教程中的 npm.cmd |
| 找不到 package.json | 确认在真正的项目根目录 |
| Python/Playwright 找不到 | 看当前 `$env:PYTHON` 是否指向项目 `.venv`；用该解释器安装 requirements |
| 浏览器下载失败 | 查现有 Chrome/Edge；设置正确 CHROME_PATH 后运行 Doctor |
| ffmpeg/ffprobe 找不到 | 两个 exe 所在 bin 加入 PATH；不要只复制其中一个 |
| ASSET_MISSING | 核对分镜里的相对媒体路径和文件是否存在 |
| INVALID_STORYBOARD | 先 validate，按错误中的字段修正 |
| 端口占用 | 当前终端 `$env:PROMO_PORT = "5188"` 后重试 |
| 有独立镜头，没有 final.mp4 | 检查 Remotion 依赖及输出目录中的 render-report.json |
| 想反馈问题 | 发命令、完整报错、P0-Environment-Report.txt 和对应 render-report.json |

Node 依赖要求来自本工程锁定的 Vite/plugin-react：Node ^20.19 或 >=22.12；考虑项目 Doctor 的 22+ 判断，本教程统一选 22.12+，优先 24.x。

## 官方资料

- Node/npm：https://nodejs.org/en/download 、https://docs.npmjs.com/downloading-and-installing-node-js-and-npm/
- VS Code Windows：https://code.visualstudio.com/docs/setup/windows
- Python Windows：https://docs.python.org/3.12/using/windows.html
- Playwright 浏览器：https://playwright.dev/python/docs/browsers
- FFmpeg：https://ffmpeg.org/download.html 、https://www.gyan.dev/ffmpeg/builds/
- Git：https://git-scm.com/install/windows

检测工具经过 Linux PowerShell 7.4.6 的解析和部分函数测试，包括版本边界、实际 Python 查询、空格/Unicode 路径和失败退出码。Windows 注册表、GUI、Windows PowerShell 5.1 原生参数行为及本机渲染仍需你电脑实际确认，不标记为已完成 Windows 实机验收。
