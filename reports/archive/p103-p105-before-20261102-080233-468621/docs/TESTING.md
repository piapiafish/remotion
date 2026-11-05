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
