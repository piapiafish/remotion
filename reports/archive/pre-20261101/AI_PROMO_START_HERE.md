> 历史资料（2026-11-01 归档）：仅供回溯；当前任务以 [唯一工作计划](../../../IMPLEMENTATION_ROADMAP.md) 为准。原始字节另存 original-documents.zip。

# AI Promo Studio｜新版规划与视频参考（请先阅读）

## 当前重点：手机运动计划直接驱动画布（2026-10-30）

使用 `npm.cmd run dev` 启动，右侧顶部 **AI 导演 · 手机运动计划** 默认展开。点击“生成运动计划并应用”，模拟 AI 的 JSON 会直接写入左侧手机模型的位置、旋转和缩放轨道，自动进入 Movie。时间轴显示全部关键帧、逐秒真实模型图片和运动说明，可播放、点击定位，并保存为 .mockup。JSON 导入位于生成区下方，本轮无需录屏素材。

详情见 [当前进度](current_plan.md)、[手机运动 JSON 格式与使用说明](docs/PHONE_MOTION_PLAN.md) 和 [本机验证记录](docs/PHONE_MOTION_VALIDATION.json)。在线 AI 尚未接入，当前明确使用固定的模拟规划示例。

原 Video DSL 导入、自动保存和成片生成保留在最后的“旧版素材分镜与成片渲染”，见 [原分镜自动化说明](docs/AUTOMATED_STORYBOARD_FLOW.md)。

## 原始规划资料

我们**未覆盖原项目的 README**。本次把讨论成果存入 [`docs/ai-promo/`](docs/ai-promo/)。请先看：

- [总入口与素材索引](docs/ai-promo/00_从这里开始.md)
- [最新执行计划 V3](docs/ai-promo/02_后续执行计划_V3.md)
- [智能构图引擎设计](docs/ai-promo/03_智能构图引擎技术设计.md)
- [新版前端效果图与导航说明](docs/ai-promo/04_页面结构与交互规范.md)
- [参考视频分析](docs/ai-promo/07_视频案例拆解与设计规则.md)

原规划资料包含早期文档、图像、静态前端设计及参考视频，不能据此宣称完整 Composition Engine 已实现；实际进度以 current_plan.md 和专项验证记录为准。素材版权和第三方模型授权说明见 `ASSETS.md`、`THIRD_PARTY_NOTICES.md`。
