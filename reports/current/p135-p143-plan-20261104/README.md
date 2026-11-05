# 实体文字、多视频时间轴与相机交互规划依据

日期：2026-11-04（北京时间）。实际项目：D:\remotion\p0\MultiAgent-3D-Promo-Studio。本轮仅分析和更新规划文档，没有实施新功能。任务、顺序与验收条件仅在 [唯一工作计划](../../../IMPLEMENTATION_ROADMAP.md) 的 P1-35～43 维护，本报告不另建任务总表。

## 输入与用户决定

用户在对话提出实体文字操作/触地、时间轴结构与真实出入场、多视频双区间/层序、相机键盘/速度/录制页和手机缩放要求。完整原话及三项回答见 [反馈记录](feedback.json)。本轮未通过重新统计人工清单推断任何新增通过结果。

已确认：视频在蓝色显示区间内、播放区间外保持首帧/停止帧；相机左右键绕场景中心环绕；手机以最初放置位置为缩放锚点。后两项都采用用户选择，没有沿用先前建议的镜头滚转和当前自身中心缩放。手机移开后缩小会向最初放置点靠拢，已在规划给出数值例子。

第二对滑块的橙色、速度档位/初值、布局尺寸和复杂交叠时先保层级再压缩行数属于规划补充。区间外移出的是运行场景，工程内的对象/素材与撤销数据保留，以便回到区间内恢复；这与永久删除工程对象区分清楚。

## 只读核对到的当前实现

| 范围 | 当前事实与证据 | 结论边界 |
| --- | --- | --- |
| 实体文字 | [SolidText](../../../src/scene/SolidText.tsx) 使用像素差估算 XY 拖动，[TextSettings](../../../src/ui/Inspector/TextSettings.tsx) 已有 XYZ 数值，[DeviceControls](../../../src/scene/DeviceControls.tsx) 仅绑定手机 | 应补齐选中/三轴手柄，而不是重复增加已有数值字段；本轮未运行新浏览器截图 |
| 地面 | [deviceBounds](../../../src/scene/deviceBounds.ts) 对手机限制最低点，[solidPose](../../../src/scene/solidPose.ts) 只应用文字姿态/可见性，[solidGeometry](../../../src/scene/solidGeometry.ts) 可产生非对称多行字形 | 实体需要实际字形边界、厚度与全部姿态的触地处理 |
| 手机缩放 | [Artboard](../../../src/ui/Artboard/Artboard.tsx) 滚轮改标量，[store](../../../src/store/project.ts) 的 setDeviceScale 没有独立初始锚点，[DeviceInstanceView](../../../src/scene/DeviceInstanceView.tsx) 有模型校正与重心变换 | 用户选定新的固定初始点语义；实际异常位移仍待逐机型复现，不能断言某个 GLB 原点就是根因 |
| 对象出入场 | [Stage](../../../src/scene/Stage.tsx) 挂载所有设备，[applySceneState](../../../src/scene/applySceneState.ts) 使用 group.visible；文字也使用可见标志 | 当前不是透明度归零，但也没有把节点真正移出场景；新生命周期需要同时调整导出/子采样 |
| 单个视频时钟 | [schema](../../../src/store/schema.ts) 每设备一个 screen/screenPlayback，[videoTiming](../../../src/media/videoTiming.ts) 有单片段首末定格/倍速 | 多源、独立显示与播放区间是结构性扩展，不只是增加滑块 |
| 媒体资源与保存 | [useScreenVideo](../../../src/media/useScreenVideo.ts) 按设备区间唤醒/释放解码器，[persist](../../../src/store/persist.ts) 仍按每设备单素材收集 | 需按片段身份登记/合成/打包与重绑，保持共享源和独立时钟 |
| 时间条 | [TimelineBar](../../../src/ui/Timeline/TimelineBar.tsx) 分开的 display-clip/media-clip/pose-key，[样式](../../../src/App.css) 固定对象行 67px、内容 58px | 需要底条融合、动态行高、真实优先命中和稳定层序；单改 z-index 不足以完成全部交互 |
| 相机 | [useCameraKeyboard](../../../src/ui/Artboard/useCameraKeyboard.ts) 四方向仅平移，[CameraRecorder](../../../src/ui/Camera/CameraRecorder.tsx) 固定侧栏，[cameraSession](../../../src/store/cameraSession.ts) 已有录制草稿/采用 | 复用既有录制流程，新增控制分工与界面状态，不重建第二套相机动画 |

## 文档变更与保留范围

更新根 README、IMPLEMENTATION_ROADMAP、ISSUES_LOG、DEVELOPMENT_LOG 和 reports/current/README；P1-35～43 全部标为待开发。上一轮 P1-26～34 的实施记录和人工验收边界保留。没有改架构说明为未来实现，没有把新功能写入当前操作指南。

修改前 7 份文件字节备份在 reports/archive/p135-p143-plan-before-20261104-165842-308908/，均以 .original 结尾。起始记录见 [before.json](before.json)。中断恢复后核对 198 个唯一基线文件无变化；首个长补丁因空行上下文不匹配未写入，随后分段更新完成，没有回退其他改动。

未修改产品源码、依赖、字体、原人工清单和旧计划跳转；未读写本轮无需使用的个人工程/素材，未改 work/output、C 盘旧副本，未启停用户预览。测试、构建、浏览器和成片导出均未在本轮运行；上轮 389 项通过仅作为历史基线。

## 验证方式与结果入口

- 本轮 [源码/配置与清单完整性](source-integrity.json)：核对 193 份受保护文件，检查源码/脚本/字体目录没有额外文件增删；备份原字节校验同时记录。
- 本轮 [文档检查](document-check.json)：执行项目现有 scripts/check-project-docs.py，检查入口、唯一计划跳转与当前本地链接；历史链接警告保留，不改为当前错误。
- [修改差异](changes.diff)与[汇总结果](results.json)记录实际命令、退出码、检查状态和未执行项目。

文档检查脚本固定写 reports/current/document-check.json；本轮复制新结果到本报告后恢复其原字节，保护上一报告。未使用只针对 2026-11-01 旧整理基线的 --integrity。当前计划不代表功能已实现或人工已验收。
