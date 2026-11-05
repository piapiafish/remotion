# 问题、原因与遗留记录

更新：2026-11-01。这里记录问题事实和处理依据；开发排期只在 [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) 维护。尚未修改功能的问题不得标为已修复。

## 已有证据支持的问题

| 编号 | 问题 / 用户影响 | 证据与原因 | 处理方向 | 状态 |
| --- | --- | --- | --- | --- |
| MAN-001 | 从静态工程在不同时间改参数仍不能起步制作动画 | 2026-10-30 浏览器观察：轨道仍只有 t=0 一帧；tracks.setValueAt 对单关键帧按静态值编辑，这是设计行为，UI 缺少显式加关键帧/启用动画入口 | 接入已有 setKey 等轨道操作，保留静态编辑语义 | 已确认交互缺口，未修复 |
| MAN-002 | 菱形可定位，不能拖动改时间；缺少删除和基本缓动编辑 | 同次浏览器拖动前后 keys 不变；TimelineBar 只处理 seek，底层轨道操作未完整接入 UI | 新增选中、增删、改时与撤销，逐步加入缓动 | 已确认缺口，未修复 |
| MAN-003 | 添加第二台后撤销，参数区无法继续编辑 | 同次观察：devices.length=1，activeDevice=1，Transform 字段数=0；undo 恢复工程而未校正 transient selection | 在撤销/重做和设备列表变化后校正选择；复核是否触发页面错误及如何恢复 | 已复现，未修复 |
| MAN-004 | 添加第二台设备看起来没有变化 | 同次观察两台默认 transform 完全相同；addDevice 使用原点默认姿态 | 添加/复制后给出可见位置或明确的选择反馈 | 已复现，未修复 |
| DOC-001 | 多份计划、旧交接和验证状态互相冲突 | current_plan、WORK_PLAN、V3、CONTEXT 对入口/任务/环境描述不一致 | 唯一总计划、历史归档、兼容跳转和链接检查 | 已整理；本轮文档链接与完整性检查通过 |

浏览器原始记录：[manual-audit.json](reports/archive/pre-20261101/evidence/manual-editor-audit-20261030/manual-audit.json)。该次脚本在 MAN-003 后的后续步骤超时，整体 INCOMPLETE；以上观察不扩展为其他操作已经通过。

## 源码审查支持、仍需完整使用验证

| 编号 | 范围与现状 | 证据位置 | 下一次验证 |
| --- | --- | --- | --- |
| MAN-005 | 动画预设作用于所有设备；时间轴只显示 Camera 与活动 Device，独立编排入口不足 | src/timeline/presets.ts、src/ui/Timeline/TimelineBar.tsx | 两台分别做不同动作，确认覆盖范围与轨道辨识 |
| MAN-006 | 录屏虽然跟随时间轴，但工程/界面没有完整的入点、裁剪和独立起播控制 | src/media/screenVideo.ts、src/store/schema.ts、DeviceSection | 设备分别从不同源时间、不同镜头时间开始播放 |
| MAN-007 | 设备选择主要通过列表，变换主要通过可拖动数字框；画布没有设备变换操控器 | Stage、DeviceInstanceView、TransformSection | 直接点击设备、拖动变换与相机操作的冲突评估 |
| MAN-008 | 未见完整的工程自动恢复、未保存提示及导出/导入统一错误反馈 | project、persist、TopBar、ExportDialog | 刷新/关闭重开、无效工程、缺失素材、编码失败与取消恢复 |
| MAN-009 | Windows 完整人工导出与素材跨全新会话恢复证据不足 | 上次审查未走到对应步骤；旧成片记录不能替代 | 真实 .mockup + 录屏，1080P/30FPS 短片和较长片段 |
| MAN-010 | 人工编辑器 Labels / Effects 仍有占位；可视化多镜头、音乐/字幕不完整 | src/App.tsx、工程 schema；旧 Remotion 是另一入口 | 明确最低版的片段输出与拼接方式，再决定新增范围 |

## 记录与关闭规则

新增问题写复现步骤、期望/实际、环境、原因的确定程度、修复位置和回归证据。修复后记录结果；需要审美或交互判断时保留“待人工验收”。历史修复与模型/导出陷阱见 [架构说明](docs/ARCHITECTURE.md) 和 [旧 CONTEXT](reports/archive/pre-20261101/CONTEXT.md)。
