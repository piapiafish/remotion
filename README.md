# Multi-Agent 3D Promo Studio · 可扩展 MVP 工程

> **独立工程目录，基于真实 Device Mockup Studio 源码增量开发，不是只有几个 Agent 空壳。**

原始工程：[binarybeastt/device-mockup-studio](https://github.com/binarybeastt/device-mockup-studio)；保留 `LICENSE`（Apache-2.0）、`ASSETS.md` 与 `THIRD_PARTY_NOTICES.md`（模型第三方授权）。原 README 见 [README_UPSTREAM.md](README_UPSTREAM.md)。

## 现在实现了什么

| 功能 | 状态 | 入口 |
|---|---|---|
| 原 3D 编辑器（含 Agent Director 分镜面板）与 4 台真机 GLB | 保留/新增面板 | `src/`、`public/devices/` |
| 15 秒示例录屏、示例音乐 | 已随项目打包 | `assets/demo.mp4`、`assets/music-demo.mp3` |
| Video DSL 0.1.0 / 资产路径校验 | 已实现、有 Node 测试 | `packages/video-schema/` |
| Director：自然语言 → 3 镜头分镜 | 已实现；无 API 时可离线规划 | `services/agent-orchestrator/` |
| 纯数据镜头编译（关键帧与摄像机） | 已实现、有 Node 测试 | `services/compiler/` |
| 浏览器自动化桥接 / 模型就绪等待 / 导出 | 已编写，待真实浏览器回归 | `src/automation/` |
| Playwright Chrome 设备镜头渲染 | 已编写，待安装原 npm 依赖实测 | `services/render-worker/` |
| WebCodecs MP4，失败回退 PNG + FFmpeg | 代码已接通，待端到端实测 | `src/export/` + worker |
| Remotion 整片字幕 / 配乐 / 镜头合成 | 已编写合成工程，待安装验证 | `remotion-compositor/` |
| FFmpeg 镜头拼接 / BGM 兼容模式 | 已实现；兼容模式不绘制字幕 | `services/agent-orchestrator/cli.mjs` |
| 基础技术审核、分镜缓存、失败报告 | 已实现 | `services/agent-orchestrator/critic.mjs` |
| 源码理解 Agent / 自动操作录屏 | **V2 尚未实现** | 见 docs/WORK_PLAN.md |

**状态说明：** 当前环境不具备 npm 网络访问，无法安装 Three.js / Vite / Remotion 依赖。因此已通过的只是原生 Node 工具链测试、GLB 文件结构、Python 语法与示例素材检查，**没有声称端到端生成的 MP4 已经测试通过**。先在本地运行 P0。

## Windows 快速启动

要求：**Node.js 22+、Python 3.10+、FFmpeg（包含 ffprobe）、Chrome/Edge、可用网络（第一次安装 npm 依赖）**。

1. 双击 **`SETUP_WINDOWS.bat`**，安装原仓库、Python Playwright 及 Remotion 依赖。若 Chrome 未安装，可 `python -m playwright install chromium`。
2. 双击 **`START_STUDIO.bat`**，打开原 3D 模型编辑器（交互模式）。
3. 双击 **`DEMO_WINDOWS.bat`**，执行 **生成分镜 → 校验 → 3 个真机镜头 → Remotion 合成**。结果在 `output/final.mp4`；错误报告在 `output/render-report.json`。
4. `DEMO_WINDOWS.bat` 使用项目自带的 **8 秒手机录屏视频**；并非项目运行时从外部下载模型。

首次先运行：

```powershell
npm run agent:doctor
npm run agent:test
```

## 手工指定自己的录屏

将 MP4 放在 `assets/my-app.mp4`（文件名请使用不包含中文路径空格的短名称，首版路径校验较严格），执行：

```powershell
npm run agent:plan -- --brief "智能学习 APP，记录进步、个性化推荐、跨端同步" --media assets/my-app.mp4 --device pixel-9-pro-xl --shots 3
npm run agent:validate
npm run agent:render -- --storyboard work/storyboard.json --out output
```

无需大模型 API，也能确定性生成合法分镜；若希望使用在线 Director：

```powershell
copy .env.example .env
# 编辑 .env，填入 OPENAI_API_KEY / OPENAI_MODEL / OPENAI_BASE_URL
npm run agent:plan -- --brief "..." --media assets/my-app.mp4
```

目前 Agent 分工采用 **Director（模型可选）+ Executor（确定性）+ Reviewer（技术检查）**，没有提前引入繁重的多进程框架。

## 工作流与核心原则

```text
Brief + 本地录屏
   → Director 生成 work/storyboard.json (可人工编辑)
   → packages/video-schema 校验（路径/设备 ID/时长）
   → compiler 编译每段镜头的 Project/Keyframes
   → Playwright 无头 Chrome 驱动原 R3F Scene + GLB + VideoTexture
   → output/shots/*.mp4（不支持 MP4 时为帧序列 FFmpeg 转码）
   → Remotion 合成镜头、字幕与 BGM
   → output/final.mp4 + output/render-report.json
```

不让 AI 在浏览器里乱写 Three.js 代码；镜头参数必须落到严格但小巧的 JSON DSL。视觉创意由 Director 自由探索，硬性拦截只限缺素材、未知机型、越权路径、非法帧数等确定性错误。失败有日志、不伪造成功。

## 注意事项

- 目前自动化镜头只支持 **手机屏幕视频**（MP4/MOV/WEBM/MKV；非 MP4 输入先转码），普通编辑器仍保留图片贴图支持。平板/电脑/手表模型需后续合法补充。
- 本地自动化模式访问 `http://127.0.0.1:5178/?automation=1`，只启用本地桥接，**不对公网开放**，自动化渲染时跳过原仓库会联网请求的 HDRI 环境贴图，改用本地灯光。
- 若 Remotion 未安装，自动改用 FFmpeg 拼接 + 配乐兼容模式，**此时没有 Remotion 字幕**。安装 Remotion 后默认使用完整合成模式。
- `public/devices/` 第三方模型的授权与项目代码授权不同。发布前查看 [`ASSETS.md`](ASSETS.md) 和 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。
- 当前导出路径是针对本机 Chrome + WebGL/WebCodecs 的实现；Windows 不同驱动环境仍需按照规划文档进行逐台实测。

更多细节：[docs/WORK_PLAN.md](docs/WORK_PLAN.md) · [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [docs/TESTING.md](docs/TESTING.md)
