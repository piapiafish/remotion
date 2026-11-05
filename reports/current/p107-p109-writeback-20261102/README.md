# P1-07～09 正式更新与本机复核

日期：2026-11-02，北京时间。目标：`D:\remotion\p0\MultiAgent-3D-Promo-Studio`。**版本已正式应用，安装与本轮检查通过；长片、新增模型及最终人工验收仍待补。**

本轮按用户“更新版本”指令应用最新 P1-07-09-Update-20261102.zip，重点为导出分环节错误提示、取消/超时、重试、预检、资源恢复与导出期间编辑保护，以及 Generic Phone 贴屏 UV 修复。保留 P1-06 的录屏时序、恢复、撤销及之前的环境补验记录。

## 安装与保护

原包位于 C 盘 deliveries/，SHA-256 为 `8be6521421810abff8c42accdb593dda4e689ba1ccb9f40d14ee80349c1e9c1e`，原 ZIP 未修改。审阅安装器后核对 159 份载荷及七项前置要求，无版本冲突；READY 159，备份安装 159 项后逐项哈希一致，立即复查 ALREADY_APPLIED、待写入 0。

备份：`reports/archive/p10709-before-20261102-174227-421716/`。[安装凭据](../p107-p109-20261102/writeback-receipt.json)、[安装步骤与退出码](installation.json)、[包与前置核对](package-review.json)已保存。暂存源码位于 C 盘 deliveries/p10709-update-20261102-applied/，没有加入 D 盘测试扫描。备份中没有需要改后缀的旧测试文件，恢复映射仍保存。

应用源码按包写入，未额外开发功能或升级依赖。收尾合并官方文档，修正旧的“待应用”描述；原包工作副本报告、环境中断和未完成项目保持原样。源码/依赖与记录保留核对见 [source-integrity.json](source-integrity.json) 和 [history-preservation.json](history-preservation.json)。个人工程、素材、work、已有 output 和旧备份没有被安装器覆盖。

安装前检测到原有用户 Vite 进程，未停止或替换它；每轮浏览器检查使用独立端口、独立浏览器会话和项目外临时目录，测试服务均在完成后停止。

## 当前 D 盘实际检查

环境为已有 Node、项目 .venv Python/Playwright、Chrome 156.0.8078.76、FFmpeg/FFprobe。以下均是本轮新结果，命令、日期、退出码和耗时存同名 .result.json；完整汇总见 [results.json](results.json)。

| 检查 | 结果与证据 |
| --- | --- |
| `npm.cmd test` | PASS，32 文件 / 325 项，[日志](frontend-tests.txt) |
| `npm.cmd run build` | PASS，[日志](build.txt) |
| `npm.cmd run lint` | 退出 0；全量 25 条 warning 含历史备份，应用范围 14 条既有 warning，[全量](lint.txt)、[应用范围](lint-runtime.txt) |
| `npm.cmd run agent:test` | PASS，25 通过、0 失败、0 跳过，[日志](agent-tests.txt) |
| 最终版本导出异常 | PASS，38 项；配置、encode、flush、渲染、画布分配、下载、解码和 seek 错误；取消、重试、恢复、编辑锁定及 PNG 回退，[结果](export-errors/report.json)、[日志](export-errors.txt)、[服务与命令](export-errors.result.json) |
| 录屏/工程回归 | PASS，8 场景 / 62 项；不同录屏、共享源独立播放、720°、时序撤销、背景恢复、缺失素材、保存失败、刷新取消及异步上传，[结果](media-regression/report.json)、[日志](media-regression.txt)、[服务与命令](media-regression.result.json) |
| 通用机型复核 | PASS，两项：旋转导出及多实例材质/屏幕隔离；四视图、配色与两秒 MP4 重新生成，[结果](generic-model/report.json)、[日志](generic-model.txt)、[服务与命令](generic-model.result.json) |
| 实际双设备 MP4 | PASS，H.264、1920×1080、30FPS、4 秒 / 120 帧，[视频](media-regression/P1-06-dual-timing-1080p30.mp4)、[FFprobe](media-regression/02-ffprobe.json) |
| 边界帧一致性 | PASS，19 帧、整图和可见屏幕区域共 40 次比较；整图最低 SSIM 0.993670、屏幕区域最低 0.982241，[结果](media-regression/frame-comparison.json)、[日志](frame-comparison.txt) |
| 文档及历史记录 | 见 [文档检查](document-check.json)、[机器汇总](results.json) |

三轮浏览器均使用真实本机 Vite HTTP/TCP，页面异常为 0；导出受控故障在每例后恢复。受控导出错误不作为正常业务失败。录屏回归是 01～08 连续运行，总计 60 项场景断言加两项页面/资源检查；此前 P1-06 的 53+11 分两轮包含重复的两项总检查，本轮 62 并未删去场景断言。

19 帧覆盖两台设备的起播、片段结束和循环边界。整图阈值 0.97，可见屏幕区域阈值 0.95；旋转到背面时不声称可见屏幕已逐像素验证，源时间另有独立断言。Generic Phone 新正面图已查看，四角标识和全文本行可见；最终材质及观感仍由用户确认。

## 审阅与后续

- [录屏时序界面](media-regression/08-timing-controls.png)和[可继续编辑的双设备工程](media-regression/01-dual-timed.mockup)。本轮录屏为现有示例及其变色测试副本，不是用户应用录制。
- [修复后的通用手机正面](generic-model/procedural-phone-front.png)、[旋转视频](generic-model/procedural-phone-spin.mp4)、[机型工程](generic-model/procedural-phone.mockup)。四个 GLB 与 manifest 保持原字节，未重新导入模型。
- 原包的五机型视图/配色、两份独立演示页面录屏、手工创作和十秒拼接片仍见 [原包报告](../p107-p109-20261102/README.md)，属于原轮次证据。本轮没有重跑原 42 项 P1-03～05 完整浏览器套件、五机型全量或拼接测试。
- 当前使用方法见 [阶段一指南](../../../docs/PHASE_ONE_GUIDE.md)。在现有编辑器刷新后可使用新版；当前工程有修改时先保存。

本次只执行版本应用所需的本机复核，未运行 30/60 秒、模型下载、实际用户作品及最终人工验收。原包的审批拒绝和中断报告保留历史事实，本轮未触发相应操作，也没有把它们标为通过。P1-07、P1-08、P1-09 均按唯一计划继续待验证，第一阶段未完成验收；自动草稿和编辑器内完整字幕、音乐、多镜头仍保持既有边界。
