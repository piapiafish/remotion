# 项目架构及模块界限

## 保留源仓库（尽量原样）

- `src/devices/manifest.ts`: 真机型号 → glb / 材质名 / UV / 修正位置 / 品牌色配置
- `src/scene/GltfDevice.tsx`: GLB 纹理加载、手机屏幕识别、视频材质替换
- `src/media/screenVideo.ts`: 预览/导出视频时钟统一；本分支新增 `waitForScreenVideosReady`
- `src/timeline/sample.ts`: 在绝对时间采样镜头状态，保证关键帧确定性
- `src/export/*`: WebCodecs / PNG Sequence 双出口
- `src/ui/*`: 完整保留原手工预览与编辑能力

## 我们新增（增量模式）

1. `packages/video-schema`: 接受 Director 输出的小型 DSL，限制已知设备和项目内素材路径。
2. `services/agent-orchestrator/planner.mjs`: 三段式 Director；有 API Key 可通过 OpenAI 兼容的 chat-completions 接口改写创意，无 API 时使用可编辑的确定性模板。
3. `services/compiler`: DSL 转原生 `Project`、`TrackSet` 和相机位置；不涉及 React。
4. `src/automation/bridge.ts`: Vite 页面 `?automation=1` 时暴露受限操作 `window.__PROMO_BRIDGE__`，只有 localhost 生效。
5. `services/render-worker/worker.py`: 原 Three.js R3F 引擎通过 Playwright Headless Chromium 加载，导出镜头 MP4；需要时帧 ZIP → FFmpeg。
6. `remotion-compositor`: 独立 Remotion 影片合成层，不把复杂 HTMLVideo / Canvas 依赖强迁到 Remotion ThreeCanvas。
7. `services/agent-orchestrator/critic.mjs`: 视频时长、尺寸、编码基础 QA、错误码与镜头缓存。

## 首版限制

- 单镜头一个真机实例；原编辑器多设备模板仍可手动使用，自动多机 DSL 尚未实现。
- LLM 目前只负责 Director 改写 DSL；Reviewer 是规则检查而不是大型 VLM 多轮反思。
- 源码 Agent 和自动操作录屏还没实现；请先确保 P0-P4 能真实输出。

## 工程协议

`schemaVersion=0.1.0`；`assets[].uri` 只能是项目内安全相对路径；`shot.screenAssetId` 不能无引用；只有已有真机允许进入生成器，禁止 fallback 冒名顶替。

输出：`work/storyboard.json` → `output/shots/<shotId>.mp4`、`output/shots/<shotId>.preview.png` → `output/film.remotion.json` → `output/final.mp4` 和 `output/render-report.json`。
