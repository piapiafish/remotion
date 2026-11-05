> 历史资料（2026-11-01 归档）：仅供回溯；当前任务以 [唯一工作计划](../../../../IMPLEMENTATION_ROADMAP.md) 为准。原始字节另存 original-documents.zip。

# 阶段：P0 — 分镜导入、保存和视频生成自动化

日期：2026-10-30。

## 目标

将原来“页面生成/下载 JSON → 手动写入 work/storyboard.json → 在终端执行渲染”的流程，接成现有编辑器里的实际操作入口。

## 如何使用

按原来的方式在项目根目录启动：

```powershell
npm.cmd run dev
```

打开终端打印的 localhost 网址。在右侧顶部 **AI 导演 · 手机运动计划** 内展开最下面的 **旧版素材分镜与成片渲染**（本节为旧 Video DSL 成片流程；主画布手机运动入口见 [PHONE_MOTION_PLAN.md](PHONE_MOTION_PLAN.md)）：

1. 将外部 AI 返回的完整 Video DSL 分镜粘贴到“AI 分镜方案”，点击“导入并自动保存”；也可以选择 JSON 文件，选择后会自动导入。
2. 应用会识别纯 JSON、Markdown JSON 代码块，或前后带说明文字的一份 JSON；使用已有 Video DSL 校验器验证格式、设备、时间与素材路径。
3. 查看镜头数量、时长、画幅及镜头运动。点击“生成已保存方案的视频”。
4. 面板显示排队、逐镜头进度、合成字幕/音乐、完成或失败状态；完成后可以在面板播放，并点击“下载 final.mp4”。

没有 AI 分镜时，可以展开“没有分镜？生成离线方案”，填写宣传重点、设备和录屏相对路径，点击生成。此模式复用现有 deterministicPlan，生成 540×960、30 FPS、三个 5 秒镜头，**不调用模型 API**。

外部 AI 仍需返回本项目的 Video DSL。自然语言提示词本身不会被当作分镜执行；错误的格式、非法机型或不存在的素材会直接提示，不会静默生成空视频。

## 保存与恢复

- 分镜自动写入 `work/studio/<方案编号>/storyboard.json`，每次导入/生成都是独立方案，不覆盖旧的 `work/storyboard.json` 或其他方案。
- 视频、逐镜头文件、原渲染报告和日志在 `output/studio/<方案编号>/`。
- 浏览器记住最近方案编号；刷新页面或重启本地服务后，重新展开面板可以恢复。生成中刷新或关闭面板不会取消后台任务。
- 关闭本地服务会停止其正在执行的渲染；重开后会提示任务中断，可以重试。已完成镜头由原有缓存机制决定是否复用。
- 同一个本地服务将渲染任务串行执行，避免多个任务同时覆盖原 Remotion 公共合成素材。重复点击同一任务不会重复启动进程。

现有 `.gitignore` 忽略 work 和 output。需要长期备份时，请同时保留 `work/studio`、`output/studio` 及自己的录屏素材。

## 素材和当前画布

素材仍采用原协议的项目相对路径，例如 `assets/demo.mp4`。使用自己的录屏时，先放入项目目录，在方案的 assets 中引用相对路径。当前不会把外部绝对路径或网络 URL 当作本地素材使用。

视频按面板中**已保存的分镜**生成。原画布的 `.mockup` 项目继续使用原来的存储和编辑方式；本次未实现二者完整双向编辑同步。

## 安装/更新

本次没有新增 npm 或 Python 包。已有 P0 依赖完整时，只需覆盖更新文件并重启开发服务，无需重新安装。

更新补丁包含上一轮的时间轴拖动、点击偏移和菜单修复。应用本补丁后，无需再覆盖旧的 P0-UI-Fixes.zip。

如果之前只安装了前端依赖，还需按原 P0 安装要求补齐：

```powershell
npm.cmd ci --prefix remotion-compositor
& $env:PYTHON -m pip install -r services/render-worker/requirements.txt
npm.cmd run agent:doctor
```

PYTHON 可以由原来的 OPEN_P0_TERMINAL.cmd 设置。服务执行渲染时优先选用当前项目 `.venv` 的解释器，避免系统默认 Python 变更影响项目；CHROME_PATH 沿用原配置，也会尝试复用已有 Chrome/Edge 或 Playwright 浏览器。

本地保存/渲染接口只在 Vite 开发服务中启用，并要求 localhost/127.0.0.1 本机访问。静态 Pages 部署与 `npm run preview` 不提供这套本地文件和进程能力。

## 复用的旧模块

| 步骤 | 复用 |
| --- | --- |
| 离线生成与分镜验证 | services/agent-orchestrator/planner.mjs、packages/video-schema/index.mjs |
| 逐镜头执行、缓存与报告 | 原 agent-orchestrator CLI、cache、critic |
| 真实 GLB、录屏贴图和动画 | 原 compiler、render-worker、R3F、sampleTimeline |
| 完整成片 | 原 WebCodecs/PNG 回退与 Remotion 字幕/音乐合成 |

原 CLI 仍可使用。需要调试新方案时，在面板“查看方案与保存位置”中取得路径，显式传给 `--storyboard`。

## 验证入口

```powershell
npm.cmd run agent:test
npm.cmd test
npm.cmd run build
npm.cmd run lint
& $env:PYTHON scripts/test-agent-flow.py
```

浏览器脚本会实际从页面生成方案、导入 JSON 文件和带 Markdown 的回复、检查错误提示、启动原渲染链路、播放/下载 MP4、检查 FFprobe/完整解码、复跑缓存并测试重启恢复。它会生成真实视频，耗时取决于机器。结果默认位于 `output/agent-flow-test/`。

## 验收结果

Linux 实际执行通过，完整数据见同目录的 `AGENT_FLOW_VALIDATION.json`：

| 命令或检查 | 真实结果 |
| --- | --- |
| 根目录 `npm ci` | 成功，安装 126 个包 |
| `npm ci --prefix remotion-compositor` | 成功，安装 190 个包 |
| render-worker requirements | 成功，Playwright 1.58.0 |
| `npm run agent:doctor` | 退出 0；依赖、浏览器启动与 WebGL2 检测通过 |
| `npm test` | 190/190 通过 |
| `npm run agent:test` | 25/25 通过，其中 13 项为本次 API 回归 |
| `npm run build` | 退出 0；保留原有 bundle 体积提示 |
| `npm run lint` | 退出 0，14 条原有警告，没有新增警告 |
| `python scripts/test-agent-flow.py` | 14 项真实浏览器检查全部通过 |
| 页面触发完整渲染 | 三个镜头首次均 DONE，Remotion 合成成功 |
| 下载视频 FFprobe | H.264/AAC，540×960，30 FPS，450 视频帧，视频轨 15.000 秒；音轨/容器约 15.061 秒 |
| 播放和跳转 | 面板内实际播放并跳至 11 秒成功；完整 FFmpeg 解码通过 |
| 画面和音频 | 实查第 30、225、405 帧的真实手机、贴屏、中文字幕；音轨非静音，平均 -36 dB、峰值 -30 dB |
| 缓存复跑 | 同一方案再生成，三个镜头均 CACHED，重新合成最终视频 |
| 刷新/重启恢复 | 渲染中刷新、完成后重启服务，均能恢复方案；重启后仍可下载 |
| 非法输入 | 提示词、坏 JSON、非法机型、缺素材、不安全路径、跨来源请求均有明确拒绝和错误 |

测试浏览器为 Chrome for Testing Headless Shell 145.0.7632.6，Node 24.22.1、Python 3.12。测试用的“外部 AI 回复”是将已知合法分镜包裹在说明文字/JSON 代码块中，未调用真实 LLM。离线生成使用原 deterministicPlan。

Windows 实机与 taskkill 原生进程树行为尚未运行；在线 LLM 对话、新的源码理解/协商方案、`.mockup` 与分镜完整双向同步也未实现。跨方案目录不共享镜头缓存；本次验证的是同一已保存方案的重复生成。

测试运行环境原本没有中文字体，额外安装了 Noto Sans SC 以实查字幕。该字体仅安装于测试系统，未加入工程素材或改变授权文件；Linux 上渲染中文需要可用的 CJK 字体。没有进行人工主观音乐听评。

## 本阶段修改

- `src/ui/AgentPanel/AgentPanel.tsx`：从只生成/下载 JSON，接成导入、自动保存、任务进度、播放/下载和恢复。
- `src/ui/AgentPanel/studioClient.ts`：同源本地请求与错误处理。
- `services/studio-api/index.mjs`、类型声明、`vite.config.ts`：受限本机接口、原 CLI 调度、串行队列、保存/恢复与视频字节范围服务；进程通过 Node 可执行文件和参数数组启动，不经过 Windows .cmd 或 JSON shell 转义。
- `src/App.css`：仅增加面板所需控件、错误/状态和视频区域样式，保留旧时间轴修复。
- `tests/studio-api.test.mjs`、`scripts/test-agent-flow.py`：接口回归和真实浏览器成片验证。
- 本入口和验证文档：更新使用方法与实际结果。

原 GLB、录屏、音乐、版权和授权文件保持不变。现有 Video DSL、编译器、时间轴、导出器和 CLI 算法未重写。
