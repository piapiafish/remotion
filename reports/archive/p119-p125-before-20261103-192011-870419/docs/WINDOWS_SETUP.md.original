# Windows 本地使用

本页负责运行环境，当前开发任务见 [工作计划](../IMPLEMENTATION_ROADMAP.md)。旧安装指南原文已[归档](../reports/archive/pre-20261101/P0-Windows-Guide.md)。

## 人工编辑器

实际项目目录为 D:\remotion\p0\MultiAgent-3D-Promo-Studio。确认所在目录有 package.json、src/ 和 public/。已有根工程 node_modules 可先复用；安装版本按依赖要求核对，既有指南采用 Node 22.12+。

```powershell
Set-Location -LiteralPath 'D:\remotion\p0\MultiAgent-3D-Promo-Studio'
node --version
npm.cmd --version
npm.cmd run dev
```

首次缺依赖时先 npm.cmd ci。打开 Vite 输出的本地网址，切换 Movie 后显示时间轴。也可双击根目录 START_STUDIO.bat；该脚本根据自身位置启动，保留在根目录。

CHECK_P0_ENV.cmd 用于检测已有工具并生成本地环境报告，OPEN_P0_TERMINAL.cmd 会在当前 PowerShell 窗口优先选择项目 .venv 和已有浏览器；它们不代表完整渲染已经成功。无需重复复制旧安装包或每天重装依赖。

## 自动化检查和旧成片链路

Python / Playwright 与 Chrome/Edge 用于浏览器自动化；FFmpeg / FFprobe 用于媒体检查与回退编码；remotion-compositor/ 使用自己的 package.json 和依赖。需要这些能力时按 [P0_WINDOWS.md](P0_WINDOWS.md) 配置，使用 [TESTING.md](TESTING.md) 中相应命令验证。

SETUP_WINDOWS.bat 会安装完整旧流水线依赖；仅使用人工前端时可先安装根工程依赖。DEMO_WINDOWS.bat 和 agent:p0 为旧成片演示，输出文件与个人录屏不要作为缓存随意清除。

## 长期保管

日常修改使用同一真实项目目录。保存 .mockup，并备份个人录屏、work/ 和重要 output/。本地 .env 不纳入交付；.env.example 只提供空凭据示例。打包源码排除 node_modules/、.venv/、dist/ 和缓存，保留锁文件、测试样本、模型授权与必要报告。
