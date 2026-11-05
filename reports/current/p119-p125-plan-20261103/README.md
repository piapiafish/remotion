# 首批人工核验反馈核对记录

日期：2026-11-03，北京时间。实际项目为 `D:\remotion\p0\MultiAgent-3D-Promo-Studio`。本轮响应用户“根据部分核验内容给出修改计划”，只读取反馈/源码、记录依据及修订正式计划。

## 人工输入

| 状态 | 数量 | 编号 |
| --- | --- | --- |
| 用户标记通过 | 6 | A01、B01、B04、B05、C01、C02 |
| 用户标记未通过 | 5 | A02、A03、B02、B03、C03 |
| 未填写 | 54 | C04 及后续未勾选内容 |

当前清单见 [人工核验清单](../../../人工核验清单.md)。本轮捕获的完整逐项结果和原文见 [feedback.json](feedback.json)；“未填写”不推断为未执行、失败或通过。清单首页“所有结果均留空”属于原稿说明，以上统计以用户实际勾选为准。未修改清单中的任何字节。

五项反馈分别是：时间轴无法拖动；未保存时需要保存并打开、不保存并打开、取消三个选项；大幅变化录屏卡顿/重复且默认尺寸模糊；删除横向按钮改用旋转；手机投影相互牵连，要求固定地面、不能穿地。

## 只读源码依据

| 观察对象 | 当前代码事实 | 结论边界 |
| --- | --- | --- |
| [时间轴](../../../src/ui/Timeline/TimelineBar.tsx)、[样式](../../../src/App.css) | 顶部秒尺已有连续拖动；对象行空白仅按下定位，移动分支只拖关键帧；播放头线 pointer-events 为 none | 明确存在不同区域的行为差异；用户实际操作位置尚未浏览器复现 |
| [工程 store](../../../src/store/project.ts)、[持久化](../../../src/store/persist.ts) | canReplace 使用 window.confirm；saveProject 返回 Promise<void>，失败内部提示，下载通过锚点交给浏览器 | 三选项需调整保存/替换的串行流程；不能直接把保存 Promise resolve 当成成功落盘 |
| [视频同步](../../../src/media/screenVideo.ts)、[效果预览](../../../src/scene/EffectsDriver.tsx) | 普通播放超过 0.12 秒偏差时定位；效果采样通过精确定位取帧 | 仅是排查入口，未证明重复片段根因；需真实连续播放日志 |
| [画布](../../../src/scene/Stage.tsx)、[预览布局](../../../src/ui/Artboard/Artboard.tsx)、[截图过滤](../../../src/scene/materials/screenTexture.ts) | 布局限制实际画布大小，DPR 为 1～2；视频无 mipmap、截图有 mipmap | 需要同显示尺寸比较源图/预览/输出，不能只凭“放大更清楚”断言过滤错误 |
| [手机设置](../../../src/ui/Inspector/DeviceSection.tsx)、[模型实例](../../../src/scene/DeviceInstanceView.tsx) | 存在横竖按钮；旧朝向为内层旋转 | 删除 UI 与保留旧工程显示应分别处理，不强行合并成单一欧拉角 |
| [地面](../../../src/scene/groundPlane.ts)、[场景](../../../src/scene/Stage.tsx)、[采样](../../../src/timeline/sample.ts) | 地面取所有设备 17 个采样时刻最低点并在工程变化时重算；普通采样没有触地约束 | 地面跨对象耦合有源码依据；屏幕遮挡等额外视觉问题待复现 |

源码观察没有运行浏览器、解码性能测量、屏幕图像对比或新的导出。旧版本自动检查记录仍保留其原来的范围，不能直接排除本次用户反馈。

## 已找到的个人工程

只读查看 `D:\remotion\验收输出\验收-01素材.mockup` 的 ZIP 目录及 project.json。约 29 MB，版本 2，8 秒、30FPS、1920×1080，三台设备，景深与动态模糊均关闭。包含一段 720×1584、约 18.084 秒视频，以及 1000×969、178×74 两张图片；一个手机仍有旧 landscape 朝向并叠加外层旋转。

本轮没有打开播放或提取私人媒体。该工程为后续复现入口，与用户 B02 当时双录屏状态不完全相同；178×74 图片的源分辨率限制单独记录，不据此否定用户对视频清晰度的反馈。文件路径、大小及保护哈希见 [before.json](before.json)。

## 计划与检查

执行范围、优先级、兼容策略及验收矩阵只维护在 [IMPLEMENTATION_ROADMAP.md](../../../IMPLEMENTATION_ROADMAP.md) 的 P1-19～25。本报告仅保存依据，不另建任务总表。

计划包含六个功能任务和一个复核任务：时间轴、三选项保存、视频连续性、预览清晰度、移除朝向入口、固定地面与投影；最后复核五项反馈及六项已通过行为。修正后再继续其余未填写核验，P1-09 最终验收和后续 AI 阶段状态保持。

本轮环境为 Windows、项目 `.venv` Python。只读检查、前后文件完整性和文档检查的实际结果见 [results.json](results.json)；链接检查使用现有命令：

```powershell
.venv\Scripts\python.exe scripts/check-project-docs.py
```

检查输出保存到本目录 `document-check.json`，实际退出码记录在 results.json。旧 `reports/current/document-check.json` 检查后恢复原字节。未运行 npm test、build、lint、Agent/API、浏览器或 MP4 导出；本轮不产生新的产品通过结论。

## 文件保护

备份目录：`reports/archive/p119-p125-plan-before-20261103-174324-450937/`。修订前计划、问题表、开发日志、报告入口、旧文档检查及用户已填写清单以 `.original` 后缀保留。

[before.json](before.json) 记录 173 个应用源码/脚本/配置文件基线，以及个人核验清单、个人工程的哈希。修改范围为唯一计划、问题表、开发日志、当前报告入口和本轮报告；具体前后核对见 results.json。没有修改产品功能、安装依赖、覆盖用户素材或同步 C 盘历史副本。
