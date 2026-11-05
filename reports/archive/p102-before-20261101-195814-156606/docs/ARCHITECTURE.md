# 当前架构与数据流

更新：2026-11-01。本文描述实际源码与边界；开发顺序只看 [工作计划](../IMPLEMENTATION_ROADMAP.md)。

## 工程组成

| 目录 / 入口 | 实际职责 |
| --- | --- |
| src/App.tsx、ui/ | 人工编辑界面、预览画布、参数区、时间轴和导出操作 |
| src/store/schema.ts、project.ts、history.ts | JSON 工程、活动设备/播放头等临时状态、文档操作与撤销 |
| src/timeline/ | TrackSet、标量关键帧、预设、模板、运动 JSON 编译和绝对时间采样 |
| src/scene/、devices/ | 多设备场景、GLB/程序模型、屏幕材质、相机、光照及模型元数据 |
| src/media/、store/persist.ts | 图片/录屏、统一媒体时钟、OPFS/IndexedDB、.mockup ZIP |
| src/export/ | 共享逐帧渲染、背景合成/降采样、PNG/序列/WebCodecs 编码 |
| src/automation/bridge.ts | localhost 且 ?automation=1 时启用的自动化桥接，目前 loadProject 限单设备 |
| packages/video-schema/、services/compiler/ | 旧 Video DSL 验证及转换为原生 Project / TrackSet |
| services/studio-api/、agent-orchestrator/、render-worker/ | Vite 本地保存/队列、旧分镜规划、缓存、无头渲染与 FFmpeg 回退 |
| remotion-compositor/ | 独立整片合成工程，处理片段、字幕和音乐；有独立 package.json |

## 人工编辑与统一动画

UI 操作 → Zustand 文档更新与 history → Project.devices[].transform / camera.tracks → sampleTimeline(project, t) → SceneState → applySceneState → Three.js 场景。

SceneDriver 在预览中选择时间并应用状态；导出用帧号 / fps 选择时间，调用相同采样与场景应用。导出录屏时等待精确 seek。不要建立导出专用动画或另一份 AI 运行状态。

TrackSet 的每个通道为标量关键帧，例如 position.y、rotation.y、scale。单帧代表静态值，多帧代表动画。setValueAt 对静态轨道只改原值；当前缺少显式启用动画 UI，属于待补交互。旋转按 XYZ 欧拉值采样，0→360° 与 0→720° 必须保留整周运动。

设备始终是列表，每台独立保存模型、颜色、屏幕素材和变换。activeDevice 是临时索引，撤销/重做时也需保持有效；已观察的越界问题见问题表。人工编辑器支持多设备，自动化桥接与运动计划的单设备限制只属于对应入口。

## 素材与工程

MediaRef 保存媒体 ID、类型、尺寸、视频时长和会话 object URL，Blob 在 OPFS 或 IndexedDB。.mockup 使用 ZIP 存 project.json 和媒体字节，加载时重建 URL。媒体保存/恢复具备基础实现，跨全新会话及异常路径仍需验证。

背景是 CSS 预览/导出合成层；导出通过 backdrop painter 与透明场景合成。改动背景类型时须同时核对预览、序列、静帧和视频，不能仅修改 Canvas 样式。

## 已有两种自动化入口

phone-motion/1 → 校验 → motionPlan 编译 → 原生 TrackSet，随后共用人工预览和导出。Project.motionPlan 只保存说明，不保存第二份执行轨迹。当前生成是固定模拟，导入会替换为单台设备并清空屏幕；尚不满足第二阶段的上下文局部编辑要求。协议见 [PHONE_MOTION_PLAN.md](PHONE_MOTION_PLAN.md)。

旧 Video DSL → schema 校验 → compiler → localhost bridge / Playwright → 原引擎逐镜头导出 → Remotion / 兼容合成 → 成片与报告。Vite plugin 的 /__studio__ 本地 API 把 work/studio 与 output/studio 接到旧 CLI；静态部署和 vite preview 不提供这套磁盘/进程能力。用法见 [AUTOMATED_STORYBOARD_FLOW.md](AUTOMATED_STORYBOARD_FLOW.md)。

人工 .mockup、运动 JSON 和旧分镜没有完整双向同步。第二阶段应优先复用文档操作并局部更新；第三阶段通过第二阶段的能力生成可编辑镜头。上述未来要求以工作计划为准。

## 容易回归的约束

- GLB 屏幕按材质标识匹配；不同模型的朝向、UV、可见屏幕开口和修正变换由 manifest 明确配置。
- 修改颜色前克隆共享材质，防止一台设备改变其他实例或加载缓存。
- 屏幕色彩空间、contain/cover、边框遮挡与视频旋转都需要真实素材检查。
- 导出时暂停预览渲染并在 finally 恢复；降采样、GPU 限制和编码支持须按实际参数验证。
- 用真实正背面和旋转视频判断模型质感，不凭模型名称推测摄像头是否缺失。

完整历史测量、失败与修复背景保存在 [原 CONTEXT](../reports/archive/pre-20261101/CONTEXT.md)，历史产品规格在 [mockup-app-spec.md](reference/mockup-app-spec.md)。其中旧里程碑、机器路径和完成数不作为当前状态。
