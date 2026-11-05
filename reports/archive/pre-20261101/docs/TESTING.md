> 历史资料（2026-11-01 归档）：仅供回溯；当前任务以 [唯一工作计划](../../../../IMPLEMENTATION_ROADMAP.md) 为准。原始字节另存 original-documents.zip。

# 验证与回归

## 手机运动 JSON 与主画布（2026-10-30）

`npm.cmd test` 包含 phone-motion/1 校验、整周旋转、插值、关键帧与逐秒采样、事务撤销和 .mockup 保存恢复。Windows 浏览器检查：

```powershell
.venv/Scripts/python.exe scripts/test-motion-plan.py
.venv/Scripts/python.exe scripts/test-timeline-ui.py
```

最新“清除与连贯性”更新：214 项前端测试、13 项运动浏览器检查、构建和改动文件 lint 通过，改动文件 lint 无警告。此前同日 25 项 Agent/API、34 项原时间轴浏览器检查通过，全量 lint 保留 14 条原有警告；这三项未在本次小更新后重复执行。证据见 [PHONE_MOTION_VALIDATION.json](PHONE_MOTION_VALIDATION.json)，截图与详细报告位于 output/motion-plan-test/ 和 output/ui-timeline/。本轮未重新执行完整成片渲染。

## P0 当前执行入口（2026-10-29）

```bash
npm ci
python -m pip install -r services/render-worker/requirements.txt
python -m playwright install chromium
# 在 remotion-compositor 内执行 npm ci 后返回根目录
npm run agent:doctor
npm run agent:test
npm test
npm run build
npm run lint
python -m unittest discover -s tests -p '*_test.py' -v
npm run agent:p0
# 可选：同时测试 PNG 备用路径和四机型采样
npm run agent:p0 -- --force-png --models
```

`PYTHON` 可指定 Python 可执行文件，`CHROME_PATH` 可供 Playwright/Remotion 共用本地 Chrome。完整 Windows 命令见 [P0_WINDOWS.md](../../../../docs/P0_WINDOWS.md)。

实际成片结论及证据见 [P0_ACCEPTANCE_REPORT.md](P0_ACCEPTANCE_REPORT.md)。以下原有描述保留为历史基线，不能再把旧的 npm DNS 阻塞理解为本次最终状态。

## 历史基线

## 实际已经完成（无需 npm）

- `node --test tests/*.test.mjs`：Video DSL / 不安全路径 / 非法机型 / 时间轴确定性 / 字幕越界
- `node scripts/doctor.mjs`：Node、FFmpeg、FFprobe、4 个真实 GLB 文件头校验与本机依赖状态
- `python -m py_compile services/render-worker/worker.py`：渲染 worker 语法
- `ffprobe assets/demo.mp4`：自带视频素材结构

## 用户机器 P0 必须运行（npm 有网络访问后）

```bash
npm ci
npm run build
npm test
npm run lint
python -m pip install playwright
cd remotion-compositor && npm install && cd ..
npm run agent:doctor
```

随后运行 `DEMO_WINDOWS.bat` 或按 README CLI；核实 `output/shots/*.preview.png` 不是纯背景/黑屏，检查 iPhone/Pixel/Samsung 屏幕文字方向正确。抽取 MP4 第 0、居中、末尾帧，检查视频素材不是重复帧。Chrome 可能不支持 WebCodecs MP4，回退帧 PNG 序列再转码。

## 验收定义

- 端到端 MP4 总长 15 秒，3 段设备镜头；至少两台真实机型通过屏幕视觉检查。
- 任意素材不存在或非法机型时必须报错而不是生成一个假的空 MP4。
- Agent 改字幕后不应该重新渲染所有设备镜头（命中缓存）；修改某镜头后只重渲该镜头。
- `output/render-report.json` 明确输出成功/失败状态、问题原因。

## 待验证事项

当前交付环境 npm DNS 不可达，**原仓库构建、实际 Playwright 渲染、Remotion CLI 启动未能在此运行**。不能把静态检查等同于产品级视频成功。
