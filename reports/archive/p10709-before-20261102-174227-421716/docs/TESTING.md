# 验证方法与证据维护

本页说明如何检查；最新结果只看 [reports/current/](../reports/current/README.md)。任务完成条件见 [工作计划](../IMPLEMENTATION_ROADMAP.md)。

## 基础检查

在项目根目录执行，现有依赖可用时不先重装：

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run lint
```

涉及 Video DSL、编译器或本地 API 时增加：

```powershell
npm.cmd run agent:test
```

## 文件整理与文档

```powershell
.venv/Scripts/python.exe scripts/check-project-docs.py
.venv/Scripts/python.exe scripts/check-project-docs.py --integrity
```

没有虚拟环境时，可用现有 Python 执行同一脚本；它只使用标准库。默认检查核心入口、唯一计划与当前文档的本地链接；--integrity 额外核对本轮整理前后的受保护文件和归档。完整性基线只服务这次整理，不用于禁止后续正常修改代码。

## 浏览器与实际作品

已有 Playwright 与本地浏览器时，可以运行原检查脚本，使用 --out 为每轮指定独立输出，避免覆盖旧证据：

```powershell
.venv/Scripts/python.exe scripts/test-timeline-ui.py --out output/validation-run/timeline
.venv/Scripts/python.exe scripts/test-motion-plan.py --out output/validation-run/motion
```

原脚本会启动临时 Vite 与独立无界面浏览器。时间轴脚本覆盖播放头、逐帧、真实 GLB 与录屏同步，不覆盖关键帧拖动改时。运动脚本检查 JSON 编译到画布、保存重开、清除与撤销，不等于自然语言理解或完整成片验收。

人工编辑器阶段还必须实际验证：从静态工程加关键帧；多设备不同素材与运动；撤销重做；关闭后在全新会话恢复 .mockup；录屏时序；1080P/30FPS MP4；导出失败、取消和继续编辑。模型正背面、屏幕清晰度、运动节奏与成片美感由用户审阅。

旧自动成片链路的独立检查为 npm.cmd run agent:doctor、npm.cmd run agent:p0；需要 Python、Playwright、FFmpeg / FFprobe 与独立 Remotion 依赖，详见 [P0_WINDOWS.md](P0_WINDOWS.md)。它会产生 work/ 和 output/ 数据，不是文档整理的必跑项。

## 报告规则

reports/current/README.md 汇总本轮日期、范围、实际命令、结果和未验证项；机器结果及必要日志放同目录。每项区分 PASS、FAIL、NOT_RUN、INCOMPLETE，保留退出码和证据路径。历史报告引用时保留原日期、平台和局限。

新一轮替换当前报告前，把有价值的旧结果及对应工程/截图归档；不要为了生成报告复制所有渲染缓存。work/、output/ 里的重要项目和个人录屏由用户备份。不得把未完成脚本里未走到的检查写成通过，也不能用单测代替用户视觉验收。

## P1-03～05 编辑流程回归

先 npm.cmd run build，再 node scripts/test-editor-interactions.cjs。需要 Chrome/Edge、FFprobe、项目 .venv 中的 Playwright JavaScript SDK 和现有 Node 依赖。可用 CHROME_PATH、PLAYWRIGHT_CORE_PATH 指定安装，P10305_AUDIT_ROOT 指定新一轮输出目录。脚本使用实际生产构建的本地路由供给，不验证 Vite/API TCP。

默认执行五个独立上下文场景、42 项检查并实际导出两份 MP4；测试第二录屏来自本轮报告的 reproduce/secondary-recording.mp4，由现有 assets/demo.mp4 调色得到。脚本不保存浏览器界面截图。产物均写 output 独立轮次，不放入 src，避免测试副本被扫描。

操作说明见 [手动动画指南](MANUAL_ANIMATION_GUIDE.md)，原始命令与限制见 [本轮报告](../reports/current/p103-p105-20261102/README.md)。FFmpeg 抽帧比较为独立检查，实际使用的脚本保留在报告 reproduce 中。

## P1-06 录屏和工程回归

构建后在根目录运行 `node scripts/test-media-project.cjs`。默认使用项目 .venv 中已有的 Playwright JavaScript SDK、系统 Chrome、PATH 中的 FFmpeg/FFprobe。可通过 PLAYWRIGHT_CORE_PATH、CHROME_PATH、P106_AUDIT_ROOT 和 P106_SECONDARY_VIDEO 覆盖路径；默认辅助视频位于 reports/current/p106-20261102/reproduce/secondary-recording.mp4。Windows 环境的 TEMP/TMP 需可写，运行真实 Vite 时将其放到项目外，避免浏览器临时文件占用触发 watcher 错误。输出默认放独立 output/p106-*。

脚本默认通过本地路由供给实际生产构建。设置 P106_BASE_URL 为已启动的本地 Vite 地址时，使用实际 HTTP/TCP，跳过请求拦截；两种运行方式在报告中明确记录。可用 CASES 选择场景编号，默认执行 01～08。包含裁切/错峰/循环、共享素材独立解码、手工 720° 动画、新会话恢复、真实 1080P/30FPS 短片、损坏工程和素材、保存失败重试、缺失媒体重新绑定、背景恢复、实际刷新取消及异步上传跨工程保护。08 额外检查缺失背景的取消/恢复、较短源视频重新绑定后的提示、空白时序输入及普通替换的默认值和撤销。脚本保存场景截图；录屏控制截图位于 08-timing-controls.png。

P1-03～05 回归脚本在专用测试上下文自动接受工程替换确认，原 42 项断言保留；默认仍使用生产构建离线路由。普通手工使用时保留真实确认。最新实际命令、结果及分批执行范围见 [本机 P1-06 报告](../reports/current/p106-writeback-20261102/README.md)。
