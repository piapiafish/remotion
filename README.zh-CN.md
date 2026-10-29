# P0 Windows 检测与日常启动小工具

把本 ZIP 的文件**直接复制到项目根目录**，与 `package.json` 放在同一层，不要保留多余的套层目录。

1. 双击 `CHECK_P0_ENV.cmd`。它只读取常用程序路径、版本和项目依赖状态，生成 `P0-Environment-Report.txt`；不会安装软件，不会联网下载浏览器，不会修改系统环境变量。把报告发回，即可逐项判断哪些不必下载。
2. 按运行教程完成首次安装后，双击 `OPEN_P0_TERMINAL.cmd`。它会优先使用项目 `.venv`，查找 Chrome/Edge 或现有的 Playwright Chromium，为当前窗口设置 `PYTHON`、`CHROME_PATH` 和工具 PATH。
3. 在打开的窗口运行 `npm.cmd run dev` 或教程中的成片命令。重新开机后仍可使用此入口；无需重新安装依赖。

脚本使用 Windows 自带的 Windows PowerShell 5.1，不要求另装 PowerShell 7。`.cmd` 的 ExecutionPolicy Bypass 只针对该次 PowerShell 进程，不修改系统执行策略。

检测优先使用 PATH 和常见安装路径，并读取 Python 的已安装运行时列表和安装注册项。放在非常规目录、没有注册或 PATH 的便携软件，可能显示“待确认”，这不等于断定没有安装。手工提供实际 exe 路径即可进一步确认。

“找到程序”不等于渲染成功。最终需要运行 `npm.cmd run agent:doctor`；首次全流程运行 `npm.cmd run agent:p0`。

脚本在 Linux 环境进行了 PowerShell 语法与函数检查（可运行检查的实际范围见随附报告）；未进行 Windows 实机验收，执行结果仍需用户电脑确认。
