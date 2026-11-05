> 历史资料（2026-11-01 归档）：仅供回溯；当前任务以 [唯一工作计划](../../../../IMPLEMENTATION_ROADMAP.md) 为准。原始字节另存 original-documents.zip。

# 时间轴交互修复 — 2026-10-29

适用于交付的 MultiAgent-3D-Promo-Studio P0 版本。本次修改两个运行文件，新增一个浏览器回归脚本及两份说明/验证文件。没有新增 npm 依赖，没有修改 DSL、关键帧采样器、项目存储、渲染 worker 或导出逻辑。

## 修复内容

| 问题 | 原因 | 修改 |
| --- | --- | --- |
| 进度条只能点击，不能连续拖动 | 轨道只有 pointerdown 处理 | 增加 pointermove/up/cancel 与 pointer capture；拖出轨道仍更新，松手或取消后停止；鼠标和触摸使用同一路径 |
| 点击位置与播放指针不一致 | 时间换算包含左侧 64px 标签及 10px 间距，指针又加了 74px 偏移 | 指针放进实际时间范围的独立容器，读取同一个容器的真实尺寸；刻度、轨道、指针共用标签宽度/间距变量 |
| 动画下拉菜单选项看不清 | 控件继承浅色文字，但原生弹出菜单背景未设置 | 仅为动画选择器指定 dark color-scheme，并为 option 指定不透明背景与文字颜色；保留原生选择器 |

原有动画预设继续生成同一套关键帧。时间指针还支持方向键逐帧移动、Home/End 跳转。关键帧菱形仍为只读显示，本次没有增加关键帧拖拽编辑。

## 在 Windows 更新现有工程

1. 在编辑器中保存需要保留的 `.mockup` 项目。
2. 在运行 `npm.cmd run dev` 的终端按 Ctrl+C 停止服务。
3. 解压 `P0-UI-Fixes.zip`，将其中的 `src`、`scripts`、`docs` 文件夹复制到当前项目根目录，与 `package.json` 同层。合并文件夹并替换同名文件。
4. 在原项目目录重新执行 `npm.cmd run dev`，打开终端显示的网址，并按 Ctrl+F5 刷新。

不需要重装 Node.js、Python、FFmpeg 或 npm 依赖。补丁不含 node_modules、录屏、GLB 或项目输出目录。

修改/新增文件：

- 修改 `src/ui/Timeline/TimelineBar.tsx`
- 修改 `src/App.css`
- 新增 `scripts/test-timeline-ui.py`
- 新增 `docs/UI_TIMELINE_FIXES.md`
- 新增 `docs/UI_TIMELINE_VALIDATION.json`

## 实际验证

测试环境：Linux、Node 24.22.1、Python 3.12、Playwright 1.58.0、Chrome for Testing Headless Shell 145.0.7632.6。完整结果见同目录的 `UI_TIMELINE_VALIDATION.json`。

| 验证 | 结果 |
| --- | --- |
| 原版问题复现 | 实测点击指针向右偏约 74px；拖动到 3.2s 时仍停在 1.02s；展开菜单出现浅色文字配白背景 |
| 修复后真实浏览器交互 | 34 项检查通过：1440×960 / DPR 1 与 1024×768 / DPR 1.25，分别使用浅色和深色浏览器偏好 |
| 点击精度 | 刻度和轨道多个位置实测最大偏差 0.015625 CSS 像素 |
| 拖动与结束 | 鼠标、可见指针手柄、触摸、拖出轨道、首尾限位、松手、取消及丢失捕获均通过 |
| 播放与时长 | 拖动暂停播放、修改时长后的坐标、方向键逐帧和 Home/End 通过 |
| 真实 GLB 与录屏 | 使用真实 iPhone 17 Pro + assets/demo.mp4，拖到 0.8s 与 2.8s，手机旋转和屏幕解码时间跟随；画面实查有录屏贴图 |
| 动画菜单 | 真实展开菜单检查通过，选项清楚可读；选择动画仍生成关键帧 |
| `npm test` | 190/190 通过 |
| `npm run agent:test` | 12/12 通过 |
| `npm run build` | 退出 0，保留原有 bundle 大于 500KB 提示 |
| `npm run lint` | 退出 0，保留原有 14 条警告，两个修改文件没有新增警告 |

本次没有实际运行 Windows，也没有为 UI 修改重渲整条 MP4/Remotion 成片；不把这些标记为本次验证通过。原 P0 验收报告记录的是此前的引擎验收。

## 手工复测

切换 Movie，选一个动画。点击刻度或轨道的左、中、右位置，检查指针是否落在点击处；按住拖动指针及轨道，拖出轨道后松手，确认不会继续跟随鼠标。展开 Add animation，检查各项文字和选中项。

再导入 assets/demo.mp4，选择 iPhone 17 Pro，拖动时间轴观察手机动画和屏幕内容。保存并重新打开 `.mockup`，确认原有项目流程正常。

## 重跑浏览器回归

在已经准备好 PYTHON 和 CHROME_PATH 的项目 PowerShell 中运行：

```powershell
& $env:PYTHON scripts/test-timeline-ui.py
```

脚本复用原 worker 的浏览器配置，自动启动一个独立的本地 Vite 服务，测试后关闭。结果在 `output/ui-timeline/report.json`，截图及 Vite 日志也在该目录。需要根目录 npm 依赖和现有 render-worker 的 Python requirements。

已有本地 Vite 服务时也可以指定：

```powershell
& $env:PYTHON scripts/test-timeline-ui.py --url http://localhost:5173
```
