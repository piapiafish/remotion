# P1-44～52 实施与本机验证

日期：2026-11-04，北京时间。实际项目：D:\remotion\p0\MultiAgent-3D-Promo-Studio。用户授权执行既定计划；本轮已正式应用，唯一任务状态在 [IMPLEMENTATION_ROADMAP](../../../IMPLEMENTATION_ROADMAP.md)。当前操作见 [新版工作台指南](../../../docs/FOURTH_FEEDBACK_GUIDE.md)。剩余旧清单逐项人工核验由用户明确免除，原文件未代填或改写。

## 实施结果

手机围绕当前放置中心缩放；WASD 在画布焦点下即使选中对象也可移动相机，位置/观察点原子更新。相机按非重叠动画段管理，空档保持上段结束视角，内部点不可选/拖/改，支持按段删除、重录与一次撤销。格式版本 5 读取 1～4，旧曲线保留为完整一段，保存、新会话和桥接兼容。

视频共行同时检查显示/播放区间和点击间距，接近端点上下避让并用细线标识真实时间。时间轴只有一个公共指针头/竖线，对象名称有独立间距，关键帧删除/属性入口加大。整个工作台统一深色、蓝色主操作、字号、卡片和录制状态。

实体文字可作为景深焦点，按真实字形和三维姿态求焦距；贴纸默认清晰，每个可独立选择参与景深并设置虚拟距离。实际 Canvas、保存重开、PNG 和 MP4 使用同一文字合成逻辑。

## 实际检查

环境：Windows，本地 Node 24.22.2 / Python 3.10.6、系统 Chrome 156.0.8078.80、FFmpeg/FFprobe 9.0.2，沿用已有依赖，无新安装。命令、退出码、耗时保存在同名 `.result.json` 和日志；自动检查不代替用户的最终视觉/手感评价。

| 检查 | 本轮结果 | 证据 |
| --- | --- | --- |
| 前端 | 40 文件 / 463 通过，0 失败 | tests-verified.txt / tests-verified.result.json |
| 构建 | 退出 0；保留字体静态/动态导入和大包提示 | build-finished.txt / build-finished.result.json |
| lint | 退出 0，29 条静态/历史提示；辅助脚本未使用代码已清理 | lint-verified.txt；最终交付复核以 lint-finished 日志为准 |
| API / 本地服务 | 25 通过，0 失败、0 跳过 | api.txt / api.result.json |
| 修正前观察 | 五个已知故障被实际观察到，PASS 表示确认故障存在 | [baseline/report.json](baseline/report.json) |
| 操作与相机 | 三场景 / 37 通过，页面/控制台错误 0 | [browser-complete/report.json](browser-complete/report.json) |
| 景深、恢复和输出 | 两场景 / 14 通过，页面/控制台错误 0 | [effects-complete/report.json](effects-complete/report.json) |
| 边界与兼容 | 四场景 / 14 通过，页面/控制台错误 0 | [regression-verified/report.json](regression-verified/report.json) |
| 两种 125% 缩放 | 三项通过，实际浏览器缩放与显示缩放分别测量 | [zoom-complete/report.json](zoom-complete/report.json) |
| 时间轴/焦点 | 端点连接线和时间尺焦点交接后，十一项专项通过 | [timeline-final/report.json](timeline-final/report.json) |
| 视频对照 | 20 个时刻 × 四个区域，共 80 次通过；最低 SSIM 0.992337，阈值 0.98 | [video-verification.json](video-verification.json) |

主流程和布局合计 68 项，时间轴/焦点专项另列 11 项，不把重复断言当成额外独立功能。五机型记录了世界中心与输出投影中心；最大位移约 0.038 像素，其余小于 0.001 像素，见 [scale-measurements.json](browser-complete/scale-measurements.json)。

贴纸真实模糊测试覆盖像素数由清晰时 7061 增到 23489，包含透明边缘。真实浏览器 125% 缩放测得 1600px 窗口对应 innerWidth=1280、devicePixelRatio=1.25、visualViewport.scale=1；另以 deviceScaleFactor=1.25 测显示缩放。三个编辑器/录制页窗口分别为 1920×1080、1366×768、1000×800，主要区域和主按钮可用。

## 可直接审阅的产物

- [四秒 1080P/30FPS MP4](effects-complete/fourth-feedback-1080p30.mp4)：H.264、1920×1080、120 帧，包含两段镜头/空档、多视频、实体文字及两种效果、清晰和景深贴纸。
- [三十秒单次 MP4](effects-complete/fourth-feedback-30s.mp4)：H.264、1920×1080、900 帧，本样本关闭效果；没有拼接或拉伸编码冒充单次输出。
- [取消重试两秒 MP4](regression-verified/cancel-retry-2s.mp4)：60 帧，取消后的实际重新导出。
- [整合可编辑工程](effects-complete/fourth-integrated.mockup)、[三十秒工程](effects-complete/fourth-feedback-30s.mockup)、[原始实时相机录制工程](browser-complete/fourth-camera-recording.mockup)。整合工程的真实录制轨迹重设为 0.4～1.4 秒和 2.5～3.5 秒；没有把整合时间段冒称原始实录时长。
- [工作台截图](browser-complete/editor-refined.png)、[端点与关键帧属性](endpoint-lines/timeline-handles-properties.png)、[整合页面](effects-complete/integrated-editor.png)、[录制页面](regression-verified/recorder-1920x1080.png)、[原生 125% 缩放](zoom-complete/native-browser-zoom-125.png)。

## 诊断与晚期修改

原失败记录全部保留：

- build-first 为已移除逻辑留下未使用 import；build-complete 为旧测试 import 未清理，后续构建通过。
- tests-first 的八项包含旧版本号、旧模板锚点、只按显示区间分行的旧期待，以及相机动画意图测试的旧建键设置。按新契约更新、保留旧实际回放检查；tests-third 的旧相机逐点可编辑要求改为验证不可编辑。tests-final 新边界测试发现非整帧尾端提前取整，修正后 463 项通过。
- browser-first 暴露旧 ghost-btn 100% 宽使导航挤成整行，时间轴无可操作空间。修正后 browser-second / browser-complete 和专项通过，拖动探针同时补滚入视区。
- effects-first 的 range 输入 `.65` 被浏览器拒绝；改 `0.65`。effects-second 的导出按钮选择器使用了不存在的“视频”，尚未导出；改为实际按钮后 effects-complete 的 120/900 帧均完成。辅助脚本准备的一次根变量遗漏未写出脚本，不是产品失败。
- regression-first 真正发现 Esc 没恢复临时查看视角；改为恢复手势前 view 并停止按键，regression-complete / regression-verified 通过。
- zoom 首次把缩放偏好写成数字，实际未生效，保留 FAIL。随后依据 [Chromium 官方实现](https://raw.githubusercontent.com/chromium/chromium/main/chrome/browser/ui/zoom/chrome_zoom_level_prefs.cc) 使用独立配置的分区字典，并实测缩放比例后才记通过；用户浏览器设置未改动。
- 初次读取部分文件的工具参数/路径和辅助脚本 lint 未使用声明均已整理，不涉及用户素材或产品数据回退。

整合视频之后的修改只涉及临时相机 Esc、录制边界采集、时间轴端点连接线、时间尺/播放头交接键盘焦点及测试/说明。分别由 regression-verified、边界单测、timeline-final 与最终基础检查验证；**已保存工程的运动采样、景深/文字合成、帧渲染和编码没有在视频之后改变**。未把早期失败或未执行项改写为通过。

## 文件保护和边界

修改前 209 份原文件备份在 reports/archive/p144-p152-before-20261104-214059-718569/，以 `.original` 结尾。before.json 记录起始哈希；最终文件保护、修改差异和命令汇总存于 source-integrity.json、changes.diff、results.json。文档检查的输出复制到本报告，再恢复 reports/current/document-check.json 原字节。

原人工清单、AGENTS、旧计划跳转、package/lock、许可证、字体、个人工程/素材、work/output 和 C 盘历史导入副本未写入。所有测试使用独立浏览器/端口，测试服务已停止；原 [5173 用户预览](http://127.0.0.1:5173) 保留并已确认提供新代码。

本轮不扩展为所有硬件、更多对象/视频层、4K/60FPS 或长期 GPU 峰值的保证。实体字仍限常规字重，二维贴纸依赖本机字体；未接入新模型和真实 AI。任务已实施、本机复核通过，旧清单不再要求逐项补验，最终视觉/手感和第一阶段总体状态仍分别记录。
