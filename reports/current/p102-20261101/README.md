# P1-02 设备选择与放置修复报告

日期：2026-11-01（北京时间）。结论：**功能已在隔离副本实现并通过自动及真实浏览器检查，待本机应用与用户人工验收。**

## 实现与原因

MAN-003 的根因是设备列表恢复后活动索引没有同步修复。现在文档更新和选中项在一次 store 更新中提交，优先按 instanceId 保持同一设备；设备消失时回退到合法相邻项。新增/复制选择新实例，删除其他行不切换正在编辑的设备，撤销/重做保持有效。打开工程、新建、模板及 localhost bridge 替换也处理选择；参数面板补充临时无效选择保护。

MAN-004 使用 src/store/devicePlacement.ts 处理：按播放头上的相机、输出画幅、姿态和机型 bodySize 评估候选位置；只对新设备位置轨道增加恒定偏移，保留动画形状、时序、缓动、连续插值、旋转和媒体，不重新布局旧设备或移动相机。拥挤时优先可见的部分错开。

同时修复连续设备按钮操作被手势合并，以及切换设备后参数修改跨设备合并的问题。无依赖升级，未改手动关键帧或预设作用范围。完整源码差异见 [source-changes.patch](source-changes.patch)。

## 实际验证

| 检查 / 命令 | 退出码与结果 | 证据 |
| --- | --- | --- |
| npm.cmd test -- --reporter=dot | 0；23 文件 / 228 项通过，含新增 14 项 | [测试日志](baseline/tests.txt) |
| npm.cmd run build | 0；TypeScript 和 Vite 通过，保留大 chunk 提醒 | [构建日志](baseline/build.txt) |
| npm.cmd run lint | 0；14 条 warning，均为原有模块位置，本轮日志逐项保留 | [lint 日志](baseline/lint.txt) |
| node audit-browser.cjs | 0；Chrome 4 场景 / 24 检查通过，无页面异常和资源缺失 | [浏览器原始结果](browser/report.json)、[执行日志](browser-run.txt) |
| FFprobe | 0；H.264、1920×1080、30/1 FPS、1 秒、30 帧 | [结果](browser/04-ffprobe.json) |
| verify-export.py / FFmpeg | 0；首/中/尾三帧 SSIM 0.992847 / 0.995629 / 0.993222 | [逐帧结果](browser/04-frame-comparison.json) |
| 源文件 / 文档 / 应用器 | 见本轮校验记录；D 盘仍未写入 | [delivery-validation.json](delivery-validation.json) |

测试环境为 Windows、项目现有 Node/npm、Chrome 与 Playwright JavaScript SDK，具体浏览器版本见原始结果。当前会话对 D 盘只读，源码在允许写入的临时目录验证，依赖从本机现有安装复制使用。浏览器路由直接提供本轮真实 Vite 构建产物，执行原界面、文件输入和下载；不代表 Vite 或 studio API 的 TCP 网络已通过。

本轮未涉及旧服务和协议，未重跑 Agent/API；P1-01 的 10 项 EACCES 阻塞维持原记录，不能算本轮通过。最初新增测试的红灯诊断用来定位缺口；其中测试入口拼写及 easing 导入已在正式回归前校正，正式结果以本节绿色日志为准。

## 可审阅产物

- [双设备录屏 MP4](browser/P1-02-dual-device-1080p30.mp4)
- [导出所用 .mockup](browser/04-export-project.mockup)、[动画复制工程](browser/03-animated-duplicate.mockup)、[全新会话重存工程](browser/04-reopened.mockup)
- [复制后真实引擎帧](browser/03-duplicate-frame.png)、[正面新增帧](browser/02-front-frame.png)、[侧面新增帧](browser/02-side-frame.png)
- [竖屏横置设备边界样本](browser/02-portrait-canvas-frame.png)

这些 PNG 是实际引擎导出及视频解码帧，不包含浏览器界面截图。两台视频设备使用同一录屏，以验证复制保留媒体；不同录屏时序、约 30 秒与更长片段仍归后续任务，不将本次一秒短片扩大为完整 P1-07 验收。

## 交互与构图边界

默认画幅与正/侧视角下新增实例可辨识，动画复制能保留轨迹与素材。竖屏画幅的横置设备如果本身超过可视宽度，本轮仅改变新设备位置，保持原设备尺寸及镜头，因此可能仍有裁切或部分遮挡；边界样本已保留。该放置策略针对添加时的当前播放头，不保证整个动画或高密度场景自动避碰。

用户需在本机应用后审阅新增位置、选择反馈和整体操作。P1-02 在唯一计划标为待人工验收；MAN-003/MAN-004 记录为隔离副本已修复待应用/人工确认，阶段一整体未验收。

## 复跑与应用

在项目根目录先运行 npm.cmd run build，再运行 node scripts/test-device-lifecycle.cjs。脚本默认写入 output 下独立轮次，可用 P102_AUDIT_ROOT 指定输出父目录；需要项目现有 .venv 中 Playwright SDK 或 PLAYWRIGHT_CORE_PATH，以及 Chrome/Edge 和 FFprobe。CHROME_PATH 可覆盖浏览器路径。

本次原始执行脚本在 [reproduce](reproduce/) 保留，带原临时路径仅作审计；项目 scripts 中提供可复跑版本。

应用更新包内 APPLY_P1_02.cmd，默认目标为 D 盘实际项目。应用器校验已知原版本、备份将改动文件后安装；可兼容尚未应用 P1-01 包、已应用原审查包或已应用计划修订版，未知本地修改会停止。重复应用同版不重复写入。当前会话没有改动 D 盘，真实应用凭本目录 writeback-receipt.json 确认。
