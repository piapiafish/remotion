# Video DSL v0.1

`index.mjs` 暴露：`DEVICE_IDS`、`MOTION_IDS`、`TEMPLATE_IDS`、`safeAssetUri`、`validateStoryboard` 与 `assertStoryboard`。不依赖任何外部包，可同时由 Node 的 Agent 工具和编译器使用。

所有资产引用必须是项目内路径；帧长、允许设备和镜头模板都有精确的硬性校验，字幕文案和审美不做硬约束。

`node --test tests/schema.test.mjs` 验证协议与确定性编译。
