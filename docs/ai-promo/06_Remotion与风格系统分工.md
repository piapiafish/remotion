# Three.js 与 Remotion 的实际职责边界

## 明确区分：谁做 3D，谁剪整片

| 能力 | 技术责任 |
|---|---|
| GLB 手机/平板加载、材质、屏幕纹理 | Three.js / R3F / Device Mockup Studio |
| 录屏镶嵌手机屏幕与逐帧 Seek | Three.js `VideoTexture` + `screenVideo.ts` |
| 设备组、相机、空间投影及关键帧 | Composition Engine + 原 `sampleTimeline` |
| 独立镜头交互预览、按帧渲染 | 原 3D 引擎 / WebCodecs / 自动化渲染进程 |
| 多镜头时间轴、片段排序 | Remotion |
| 全片文字动画、全局字幕、BGM、转场 | Remotion + 小型视觉风格系统 |
| 视觉分析、源码分析、录屏指导 | AI 模型 + 代码工具，非 Remotion |

旧扩展工程可能已有 `remotion-compositor/src/Film.tsx`、`root.tsx`、`services/agent-orchestrator/cli.mjs` 等代码，但**存在 ≠ 已经完成整片端到端真实渲染**，必须依 P0 实测。

## 为什么不要求大模型每次设计转场

复杂转场与字幕遮挡高度依赖视觉内容；对于多模态能力不强的模型，由模型直接生成全部参数会不稳定。第一版采用简单、可自由编辑的 `VideoStyle` 设计：

```json
{
  "styleId": "minimal-tech",
  "captions": {"placement": "safe", "animation": "fade-up", "duration": 0.45},
  "transitionPolicy": {"sameFeature": "cut", "newFeature": "crossfade", "outro": "fade"},
  "music": {"duckUnderVoice": true, "fadeIn": 0.6, "fadeOut": 0.8}
}
```

这里仅是未来协议参考，并未在现有原仓库实现。

可先支持硬切、短交叉淡化、渐隐三种转场，以及淡入、上浮、逐词三种文字动画。AI 根据**功能关系**选风格，不必对每一帧做多模态分析。背景、文字安全区由镜头构图信息支持，用户可一键调整。

## 重要的原则

- Remotion 不重复计算世界坐标；以已渲染的镜头素材为输入。
- 同一段录屏可以被放进 3D 手机内；不要再错误地把它当成最终 MP4 的单独背景层叠一次。
- 关键帧和时码来自绝对时间，避免预览和导出不一致。
- “镜头可读性优先”是建议，不是强制每个镜头静止；标题大字、出画、透视等都可能有意为之。
- 渲染失败要明确标 `FAILED`，不能生成假成片或宣称测试通过。
