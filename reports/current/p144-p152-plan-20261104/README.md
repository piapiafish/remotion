# P1-44～52 规划依据与检查记录

日期：2026-11-04，北京时间。范围：仅规划和文档。唯一执行计划位于 [IMPLEMENTATION_ROADMAP](../../../IMPLEMENTATION_ROADMAP.md)，本报告不维护第二份任务表。本批功能未实施，产品测试未运行。

## 人工记录与本次澄清

对比 [上一轮实施前快照](../../archive/p135-p143-before-20261104-185858-127226/人工核验清单.md.original) 与根目录 [人工核验清单](../../../人工核验清单.md)，仅六个场景结果新增：

- J01 未通过，原话：“立体文字也可以设置为聚焦对象，并且贴纸文字可以选择受不受景深影响”。
- J02、J03、K01、K02、K03 新增通过。
- 原始记录累计 24 通过、16 历史未通过、1 未执行/说明阻塞、24 空白；不是现版本未修复问题统计。用户免除剩余逐项核验，未改勾选为通过，也不要求补做整份清单。

本轮明确答复：“留在右侧原地缩小，不随缩放移动”。它替换 P1-36 以模板创建位置为固定锚点的旧规则。新计划会保持当前中心，旧保存的位置动画不在打开时被改写。

增量原文见 [manual-feedback.diff](manual-feedback.diff)，对话需求、澄清、免核范围和逐项计数见 [feedback.json](feedback.json)。核验文档中的旧操作说明是背景，不作为本次额外执行指令。

## 只读代码与画面依据

| 范围 | 现有证据 | 结论边界 |
| --- | --- | --- |
| 缩放 | [scaleAnchor](../../../src/store/scaleAnchor.ts) 以原锚点重新计算位置，[project](../../../src/store/project.ts) 的数值/关键帧缩放调用它 | 语义与本次澄清直接冲突；逐机型实际视觉中心仍需实施时测量 |
| 相机按键 | [useCameraKeyboard](../../../src/ui/Artboard/useCameraKeyboard.ts) 有 WASD 映射，但 activeObject 非空或画布不含焦点会退出；[Artboard](../../../src/ui/Artboard/Artboard.tsx) 只在部分事件恢复焦点 | 守卫是源码事实；尚未以本轮浏览器复现用户无响应的完整原因 |
| 相机动画 | [schema](../../../src/store/schema.ts) 只有 CameraConfig.tracks；[sample](../../../src/timeline/sample.ts) 直接采全局轨道；[project](../../../src/store/project.ts) 采用录制时覆盖区间内键 | 无段身份/独立删除，分开的运动之间仍可能插值；需要统一采样和格式迁移 |
| 时间轴 | [TimelineBar](../../../src/ui/Timeline/TimelineBar.tsx) 把相机当普通对象行，[TimelineObjectRow](../../../src/ui/Timeline/TimelineObjectRow.tsx) 每行创建指针头 | 隐藏点要连同导航/属性/快捷键处理；单头需要公共覆盖层 |
| 视频端点/分行 | [screenClips](../../../src/media/screenClips.ts) 的 packClips 仅比较显示区间；[App.css](../../../src/App.css) 的播放端点均宽 14px、同一层级 | 支持用户反馈所述风险；需浏览器真实拖到极限后重抓验证，不能只补数值测试 |
| 景深 | [sceneEffects](../../../src/scene/sceneEffects.ts) 的 focusDistance 只查 devices；[EnvironmentPanel](../../../src/ui/Inspector/EnvironmentPanel.tsx) 列表仅手机；[textOverlay](../../../src/scene/textOverlay.ts) 无贴纸景深参数 | J01 确属当前能力缺口；二维/三维的焦点含义和导出合成需一起处理 |
| 页面视觉 | 已查看 [上一轮真实截图](../p135-p143-implementation-20261104/browser-verified/multi-video-timeline.png) 与当前样式 | 用于设计依据，不是本轮新截图，也不声称当前用户页面状态已复现 |

## 文档变更与保护

本轮修改根 README、唯一计划、问题表、开发日志与当前报告入口。新增 P1-44～52 全部标待开发，更新用户免核安排；未修改源码、依赖、现有操作指南、架构说明或原人工清单。不会把计划中的新行为写成当前已经可用。

修改前七份文件的原字节备份位于 reports/archive/p144-p152-plan-before-20261104-212801-116417/，以 `.original` 结尾。[before.json](before.json) 记录路径和哈希；保护基线包含 224 份源码、脚本、配置、字体、入口与人工清单。用户工程/素材、work/output、C 盘旧导入副本和 5173 预览均未改动。

本轮文档检查退出码 0：118 份 Markdown、当前错误 0、历史链接警告 238；224 份受保护文件和七份备份逐项一致，功能代码、依赖与人工清单无变更。

实际证据见 [汇总结果](results.json)、[完整性](source-integrity.json)、[文档检查](document-check.json)、[命令输出](document-check.log) 和 [修改差异](changes.diff)。文档检查调用现有 `scripts/check-project-docs.py`，保留日期、命令、退出码、当前错误与历史警告；脚本固定写入的上轮 reports/current/document-check.json 在复制新结果后恢复原字节。未使用只针对旧整理基线的 `--integrity`。

读取清单差异的首个 Python 输出使用系统编码，终端中文显示异常，随后用 `-X utf8` 正确重读，文件未修改。读取上轮录制页截图时首次文件名不完整，没有取得图片，随后目录查询得到正确名称；只有已成功查看的时间轴图用于本报告。一次 README 补丁上下文不匹配未写入，随后准确定位后完成。以上均为本轮工具诊断，不是产品测试失败或产品修复。

产品单测、构建、lint、API、浏览器、视频输出均为 **NOT_RUN**；上轮 428 项和成片证据继续属于上一轮。人工新通过记录仅来自用户勾选，新增功能没有被代判为通过。
