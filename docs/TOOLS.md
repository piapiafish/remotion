# Agent 工具接口

已经实现的 JSON 调用入口：

```bash
node services/agent-orchestrator/cli.mjs tool --name list_devices
node services/agent-orchestrator/cli.mjs tool --name probe_media --input '{"uri":"assets/demo.mp4"}'
node services/agent-orchestrator/cli.mjs tool --name inspect_render --input '{"uri":"output/final.mp4"}'
```

第四个工具 `create_device_shot` 接收 `storyboard` JSON、`shotId`、`assetInfo` 与本地 `publicUrl`，返回原生编辑器 `Project`。Agent 不执行 JS 代码，只调用已登记的工具。

自动渲染与合成由完整流水线 `node services/agent-orchestrator/cli.mjs render` 实现；`preview_frame` 由 `window.__PROMO_BRIDGE__.previewFrame(frameIndex)` 调用（仅 localhost automation 模式）。这些工具为后续替换成 MCP / HTTP 接口保留了稳定边界。
