# 验证与回归

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
