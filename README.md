# 3D 设备宣传视频编辑器

本项目帮助软件开发者把截图、录屏和真实 3D 设备模型制作成产品宣传视频。基于 Device Mockup Studio，沿用 React、Three.js / React Three Fiber、Zustand、关键帧和导出系统，优先在 Windows 本地使用。

## 从这里接手

| 文件 | 唯一职责 |
| --- | --- |
| [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) | 唯一开发任务总表：三个阶段、当前任务、依赖和验收条件 |
| [AGENTS.md](AGENTS.md) | AI 与开发者的工作规范、修改边界和验证要求 |
| [DEVELOPMENT_LOG.md](DEVELOPMENT_LOG.md) | 已做的工作、实际结果与最新交接；不另建 HANDOFF.md |
| [ISSUES_LOG.md](ISSUES_LOG.md) | 已发现的问题、证据、原因、处理方向和遗留事项 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 当前实现的模块、数据流与架构约束 |
| [docs/TESTING.md](docs/TESTING.md) | 检查命令及何时需要浏览器和人工验收 |
| [reports/current/README.md](reports/current/README.md) | 最近一轮验证结果及证据边界 |
| [reports/archive/README.md](reports/archive/README.md) | 历史方案、报告、参考视频和原始文档备份 |

## 产品路线与当前能力

最新已实施 [P1-44～52](IMPLEMENTATION_ROADMAP.md)：当前中心原地缩放、可用的 WASD、多段相机动画/空档停留/按段删除、视频端点避让/完整双区间分行、单播放头、文字景深及整页美化。463 项前端、构建/lint、25 API 和真实浏览器复核通过；四秒及三十秒视频有实际输出。用户已免除剩余旧清单逐项核验，原记录保留。请按 [新版工作台指南](docs/FOURTH_FEEDBACK_GUIDE.md) 使用；[实施报告](reports/current/p144-p152-implementation-20261104/README.md) 写明验证范围和失败诊断。

路线为：人工编辑器 → 人工主导的自然语言动画助手 → AI 主持的视频制作。当前重点是第一阶段，尚未通过人工编辑器完整验收。

当前本机已实施 P1-10～18 的新手界面与动画改造：先选模板再进入编辑器；手机与画面文字统一为对象，使用独立设置卡片和每对象一行的时间轴；支持空白区域操作相机、滚轮缩放对象、整组关键帧改时、中文标题、景深与动态模糊。保留多设备、独立录屏时序、撤销、工程恢复及导出取消重试。使用方式见 [新版指南](docs/BEGINNER_GUIDE.md)，实际证据与验收边界见 [实施报告](reports/current/p110-p118-implementation-20261102/README.md)，最终操作与视觉质量待用户确认。

顶栏“动画助手”里的手机运动计划目前使用固定模拟计划，可导入 `phone-motion/1` JSON；它尚不理解任意自然语言。旧 Video DSL / CLI / Remotion 成片流程保留为已有能力，与人工工程并未完整双向同步。

本次人工体验请使用根目录的 [新增改动人工核验清单](新增改动人工核验清单.md)：27 项，只覆盖原反馈修正与后续新增行为，逐项给出操作、数值例子、预期结果和填写位置。原 [人工核验清单](人工核验清单.md) 的 65 项及批注保留用于回溯；已通过的 24 项不重复安排，已免验的 24 个空白项目不补做。

2026-11-03 已按首批反馈实施 P1-19～25：连续拖动时间轴、三选项保存提示、连续录屏同步与更清晰的默认预览、删除朝向按钮、固定地面和触地限制。355 项前端及本机流程复核通过；原清单 A02、A03、B02、B03、C03 仍待人工复核，详细证据及保存窗口/播放预览边界见 [本轮报告](reports/current/p119-p125-implementation-20261103/README.md)。

2026-11-04 已实施 P1-26～34：对象显示与录屏片段条、倍速、上下键与同刻独立叠放、相机平移/录制、实体文字及前后遮挡。389 项前端、构建、lint、25 项 API 和真实浏览器复核通过，实际短片及 30 秒输出已保存。请按 [新版操作与复核说明](docs/SECOND_FEEDBACK_GUIDE.md) 体验；[本轮证据](reports/current/p126-p134-implementation-20261104/README.md) 写明自动检查与人工验收边界，原人工清单保留。

同日已实施 [P1-35～43](IMPLEMENTATION_ROADMAP.md)：实体文字选中/三轴/触地、手机固定初始点缩放、对象底条和真实场景出入场、多视频双区间/层级、相机新按键/速度与录制页。428 项前端、构建/lint、25 项 API 和真实浏览器复核通过，四秒效果短片与 30 秒单次输出已保存。请按 [新版操作说明](docs/THIRD_FEEDBACK_GUIDE.md) 体验；[实施报告](reports/current/p135-p143-implementation-20261104/README.md) 保留验证范围和失败诊断，人工验收仍待用户确认。

## Windows 启动

在含 `package.json` 的项目根目录执行。现有依赖完整时无需重复安装：

```powershell
npm.cmd run dev
```

打开终端显示的本地网址；也可以双击根目录 `START_STUDIO.bat`。启动后先显示模板页，选择构图后默认进入视频编辑模式；从“导出”面板也可选择图片。

首次仅运行人工编辑器，安装根工程 Node 依赖即可：

```powershell
npm.cmd ci
npm.cmd run dev
```

Node 版本要求按现有 Vite 依赖与环境检测确认；现有 Windows 指南采用 Node 22.12+。Python / Playwright、FFmpeg / FFprobe、独立 Remotion 依赖用于自动化检查和旧成片链路，浏览器人工编辑入口不要求先安装这些组件。详细配置见 [Windows 使用说明](docs/WINDOWS_SETUP.md)；扩展流水线见 [P0_WINDOWS.md](docs/P0_WINDOWS.md)。

## 文件位置与保管

```text
src/                    人工编辑器源码；保留现有结构，不另套 app/
services/               编译、旧渲染流水线与本地 API
packages/               共享 Video DSL 协议
public/                 GLB、HDRI、解码器与公开示例
assets/                 必须保留的测试与演示素材
remotion-compositor/    独立合成工程及自己的 package.json
tests/                  Node / Python 测试；前端单测仍与源码相邻
scripts/                检查与维护工具
docs/                   当前技术说明与原始项目参考
reports/current/        当前验证与文件整理清单
reports/archive/        历史资料和重要证据
work/                   本地分镜、任务状态和用户工作数据
output/                 渲染结果与自动化临时输出
```

本机实际工作目录是 `D:\remotion\p0\MultiAgent-3D-Promo-Studio`。C 盘工作区中的 `update-stage-20261030/` 是旧导入副本，不会自动与当前项目同步。

`.mockup` 由浏览器下载到用户选择的位置。`work/`、`output/` 和个人录屏需另行备份；重要验证证据移入 `reports/` 后再考虑清理临时输出。开发机保留现有 `node_modules/`、`.venv/`，交付源码包时排除依赖和缓存。真实密钥只放本地环境，示例见 [.env.example](.env.example)。当前目录未包含 `.git`，本次整理不创建或替换 Git 历史。

原始项目说明见 [README_UPSTREAM.md](docs/reference/README_UPSTREAM.md)。[LICENSE](LICENSE)、[ASSETS.md](ASSETS.md)、[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) 保留原有授权与来源记录。

阶段一制作与少量镜头拼接见 [阶段一指南](docs/PHASE_ONE_GUIDE.md)。P1-07～09 的旧工作副本、环境中断及其原始报告保留历史状态；当前进度只看唯一工作计划和最新实施报告。
