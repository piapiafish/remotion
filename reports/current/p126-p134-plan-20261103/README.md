# 第二批新增人工核验反馈核对记录

日期：2026-11-03（北京时间）。实际项目：`D:\remotion\p0\MultiAgent-3D-Promo-Studio`。本轮仅分析和编写修改计划/操作说明，应用功能未修改。唯一任务总表见 [IMPLEMENTATION_ROADMAP.md](../../../IMPLEMENTATION_ROADMAP.md) 的 P1-26～34。

## 反馈范围与已确认决定

输入为根目录 [人工核验清单](../../../人工核验清单.md)，对比上轮实施前的字节快照 `reports/archive/p119-p125-before-20261103-192011-870419/人工核验清单.md.original`。读取结果冻结在本轮备份中；原文件不改写。

| 分类 | 本次新增 | 编号 |
| --- | --- | --- |
| 通过 | 13 | D02、D03、E01～05、G01、H02、H04、I01～03 |
| 未通过 / 需求调整 | 10 | C04、D01、D04、F01～04、G03、H01、H03 |
| 未执行／阻塞 | 1 | G02，没读懂操作说明 |

本次共新增 24 项；累计 19 通过、15 未通过、1 未执行／阻塞、30 未填写。原首批 A02、A03、B02、B03、C03 的结果行未变。用户明确旧修正尚未复看、本轮不用处理，故其状态保持，也不作为新规划的前置阻塞。精确原话与差异见 [feedback-diff.json](feedback-diff.json) 和 [feedback.diff](feedback.diff)。

用户随后确认两点，原文见 [clarifications.json](clarifications.json)：关键帧允许跨过其他键、超过末尾自动延长；取消合并但允许同刻叠放。正式计划采用独立身份与堆叠选择，未采用先前建议的冲突拒绝或自动错开时间。堆叠中同属性以上层为有效画面，是计划补充的执行规则，不能冒称用户已逐条确认所有细节。

实体文字、对象出现区间、视频倍速、相机录制属于新增能力；G02 属于说明问题。原“源出点要小于源入点”的批注按要求明确错误原因的意图理解，实际合法关系仍为开始 < 结束；原话保留。

## 只读源码观察

| 范围 | 核对到的事实 | 依据 |
| --- | --- | --- |
| 对象显示范围 | schema 无对象出入场字段，Stage 挂载所有设备，SceneState 应用没有活动状态；当前没有按区间管理解码器的能力 | [schema](../../../src/store/schema.ts)、[Stage](../../../src/scene/Stage.tsx)、[场景应用](../../../src/scene/applySceneState.ts) |
| 录屏操作 | 当前三个数字字段及循环勾选；公共映射按 1 倍；多类非法输入共用同一错误句 | [VideoTimingControls](../../../src/ui/Inspector/VideoTimingControls.tsx)、[videoTiming](../../../src/media/videoTiming.ts)、[store](../../../src/store/project.ts) |
| 关键帧键盘 | 仅处理左右键；对象行按下 preventDefault 后没有显式转焦点；store 夹取至总时长。未在本轮运行浏览器，不宣称已完整复现“两下到边界” | [TimelineBar](../../../src/ui/Timeline/TimelineBar.tsx)、[store](../../../src/store/project.ts) |
| 同刻叠放 | 当前选择以 target/channel/time 定位，moveEditableKey 通过 setKey 覆盖目标同属性键；仅改图标不足以实现独立叠放 | [editing](../../../src/timeline/editing.ts)、[objectEditing](../../../src/timeline/objectEditing.ts) |
| 首键删除 | deleteEditableKey 会做单键静态回退，并没有完整的首键不可删与提示语义；需作为行为调整规划 | [editing](../../../src/timeline/editing.ts) |
| 相机 | 平移关闭；普通手势释放后提交相机轨道，开启动画后普通操作会记键；没有连续录制会话 | [Stage](../../../src/scene/Stage.tsx)、[SceneDriver](../../../src/scene/SceneDriver.tsx)、[store](../../../src/store/project.ts) |
| 文字 | 现有文字只有二维通道，最终画在场景上方；公开素材目录未找到可直接复用的字体文件，实体字形需先验证字体/轮廓方案 | [textOverlay](../../../src/scene/textOverlay.ts)、[frameRenderer](../../../src/export/frameRenderer.ts)、[schema](../../../src/store/schema.ts) |
| 属性布局 | ObjectPanel 同一网格混合底部标签 NumberField 和顶部标签 stack-field；本轮尚无截图复现，不将源码风险写成视觉验证通过 | [ObjectPanel](../../../src/ui/Inspector/ObjectPanel.tsx)、[NumberField](../../../src/ui/controls/NumberField.tsx) |
| G02 指引 | 目前入口默认从播放头到作品末尾；旋转一周只写 rotation.y。旧 PresetControls 虽存在但不在新时间轴挂载，不指导用户找旧 Start/Length | [TimelineBar](../../../src/ui/Timeline/TimelineBar.tsx)、[presets](../../../src/timeline/presets.ts) |

## 实际文档工作

在唯一计划新增 P1-26～34，明确依赖、同一对象行的不同时间含义、关键帧身份/叠放、格式迁移、资源生命周期、录制页边界、两类文字及共享导出验收。问题表按缺陷、需求变化和说明阻塞分别记录，第一阶段及原任务不改成已验收。

在 [新版指南](../../../docs/BEGINNER_GUIDE.md#g02-补充步骤检查动作预设是否影响了其他内容) 增加适用于现版本的 G02 具体操作：五个时间点的水平位置/偏航、2 秒应用“旋转一周”、8 秒从 120° 变成 420°、前段及位置/缩放保持、一次撤销恢复。按源码核对步骤，未代替用户执行该人工项目。其余未来功能没有写成当前已可用。

同步 README、问题表、开发日志与当前报告入口；没有另建任务总表或改 current_plan 等跳转文件。未修改根目录人工清单，未读取或改写本轮无需使用的个人 `.mockup`、素材、work、output；未启动/停止用户预览，未下载字体、安装依赖或运行产品功能测试。

## 本轮验证与边界

环境为 Windows/PowerShell，沿用项目 `.venv` 的 Python 3.10.6 和现有 rg。核对、备份及报告写入均在 D 盘实际项目完成。189 份受保护源码/脚本/配置及清单等文件的起始哈希见 [before.json](before.json)，最终核对见 [source-integrity.json](source-integrity.json)。本轮差异见 [changes.diff](changes.diff)。

文档检查命令为 `.venv\Scripts\python.exe -X utf8 scripts/check-project-docs.py`，退出码及结果见 [document-check.json](document-check.json) 和 [results.json](results.json)。检查脚本会写根目录 `reports/current/document-check.json`；本轮保存新结果后恢复旧字节，使此前报告不被覆盖。未运行只适用于 2026-11-01 整理基线的 `--integrity`。

修改前备份：`reports/archive/p126-p134-plan-before-20261103-215049-965134/`，以 `.original` 后缀保留六份文档、人工清单和旧文档检查的原始字节。运行源码/依赖未改，npm test/build/lint、API、浏览器、视频导出本轮均为 **NOT_RUN**；此前 355 项及视频证据仍只属于上一实施轮次。

人工验收未完成。新反馈问题保持待处理，G02 待按说明重新操作，旧五项本次不复核。后续实现和验证只按唯一计划执行，不能把本次计划与文档核对表述成新增功能已经交付。
