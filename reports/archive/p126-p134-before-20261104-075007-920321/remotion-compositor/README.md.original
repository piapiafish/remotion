# Remotion 组合层

这里不是设备模型引擎。设备镜头由原 Device Mockup Studio 的 R3F 引擎输出 MP4，本层负责镜头顺序、字幕以及 BGM。

安装：`npm install`（进入本目录执行）。整片渲染由根目录的 `services/agent-orchestrator/cli.mjs render` 调用。没有安装 Remotion 时会退回到 FFmpeg 拼接（该兼容模式目前不叠加字幕）。

`public/media/` 放置自动生成的设备镜头和音乐。`src/Film.tsx` 接收 `film.remotion.json` 作为输入。
