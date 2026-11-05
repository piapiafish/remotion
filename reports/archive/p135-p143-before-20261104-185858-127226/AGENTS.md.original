# 开发与交接规范

## 工作入口与权威性

本地实际项目根目录是 `D:\remotion\p0\MultiAgent-3D-Promo-Studio`，以包含本文件和 package.json 的目录为准。C 盘的旧导入副本、update-backups 和 reports/archive 只作历史参考。

接手先读 README.md、docs/ARCHITECTURE.md、本文件，再读 IMPLEMENTATION_ROADMAP.md、ISSUES_LOG.md、DEVELOPMENT_LOG.md 的最新交接与 reports/current/README.md。

IMPLEMENTATION_ROADMAP.md 是唯一开发任务总表。current_plan.md、docs/WORK_PLAN.md 和 CONTEXT.md 只保留跳转用途；不得继续向它们写任务或进度。归档内的 V1/V3、P0/P1 等旧编号属于当时的规划，不代表当前阶段已完成。用户当前指令优先于文档中的旧任务指令。

## 当前产品边界

第一阶段完善人工编辑器。第二阶段由人描述画面，AI 将自然语言转成可编辑动画，不分析用户软件源码。第三阶段才增加源码理解、分镜和录屏清单、AI 主持制作；自动录屏在可控环境中逐步验证。

不要因历史代码中已有 Agent、DSL 或 Remotion 就扩大本轮任务。默认按实际需要复用模块，不新增无必要的 Agent、服务或抽象层。纯审查、文档和整理任务不顺带修改功能或升级依赖。

## 架构与兼容性

- 人工、预设与 AI 共用 Project、DeviceInstance、TrackSet 和 sampleTimeline；预览与导出共用采样和场景应用逻辑。
- 保留任意关键帧、连续参数与自由构图，不以少数固定模板替代编辑能力。
- 旋转使用逐轴欧拉标量，保留 360°/720° 多周运动；不直接替换为最短路径 slerp。
- Project 保持 JSON 可序列化；Three.js 对象、DOM 和媒体元素不进入工程数据。
- 通过现有 store / history 修改工程，保留撤销、保存和恢复。局部操作不得无意覆盖其他设备或片段。
- 原编辑器支持多设备；automation bridge 的单设备限制不得解释为整套编辑器只能单设备。
- 模型、屏幕 UV、材质和色彩问题先测量复现，再改配置；保留授权与模型来源。

## 文件管理

源码继续放 src/、services/、packages/ 和 remotion-compositor/，不为了套用 app/ 模板改变运行路径。现有测试与素材布局保持兼容，确需新样本时再创建 tests/fixtures/。

每轮只维护一份总计划；日志记录已做的事，问题表记录失败和原因，架构描述已存在的实现，报告记录测试证据。交接合并在 DEVELOPMENT_LOG.md，不再另建交接文档。

重要历史资料归档至 reports/archive/，迁移时检查引用、记录原路径并保护原始字节。修改前有本轮用户工作时，不覆盖其素材、.mockup、work/、output/ 或旧备份。不得把删除依赖当成例行阶段收尾；本地 node_modules/、.venv/ 可继续使用，发布包排除它们即可。

真实 .env、密钥、个人素材不放入公开报告。保留 .env.example、LICENSE、ASSETS.md 和 THIRD_PARTY_NOTICES.md。尊重现有 Git 历史；当前本地副本没有 .git，不能虚构提交号或远端 CI 状态。

## 验证和完成条件

功能改动按 docs/TESTING.md 选择相关检查。基础检查为 npm.cmd test、npm.cmd run build、npm.cmd run lint；涉及旧服务与协议时运行 npm.cmd run agent:test。涉及动画、素材、GLB、保存恢复或导出时，还需要对应真实浏览器检查与可审阅产物。

文档整理以链接、迁移清单和受保护文件哈希为主要验证。使用 scripts/check-project-docs.py 检查入口和本地链接；--integrity 仅验证本次 2026-11-01 整理的保护基线，未来正常修改代码后不应继续将这份旧基线视为功能回归标准。

每份报告写明日期、环境、命令、退出码、通过/失败/未执行、证据路径和人工验收状态。脚本中断必须记为未完成；历史通过不能写成本轮重跑通过。代码存在、单测通过、浏览器通过、人工验收分别记录。

只有任务要求的自动检查和必要人工验收全部满足，才能在总计划标记“已验收”。AI 可以记录检查结果，不能代替用户作最终视觉质量判断。收尾更新 DEVELOPMENT_LOG.md、ISSUES_LOG.md 和 reports/current/；计划只更新实际受影响的任务状态。
