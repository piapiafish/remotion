# P1-06 正式应用与本机验证

日期：2026-11-02，北京时间。实际目录：`D:\remotion\p0\MultiAgent-3D-Promo-Studio`。状态：**已应用，自动检查通过，待用户人工验收**。本轮执行唯一工作计划中的 P1-06，下一开发项为 P1-07。

## 已实现行为

每台设备可独立设置 Source in、Source out、Timeline start 和 Loop selected range；共用素材也有独立解码与时钟。起播前保持入点，非循环结束保持片段末帧，循环限定在所选源区间。时序接入现有撤销、保存及统一预览/导出路径，保留 720° 累计旋转及旧工程默认值。

工程与素材错误在界面反馈；损坏 ZIP/JSON/工程或视频不替换当前文档，保存缺少必要字节时明确失败，可重试。缺失设备/背景素材在写入前可选择继续打开或取消，继续后可重新绑定；较短录屏重新绑定时保留合法参数并提示范围收缩。保存包括设备和背景媒体；同 ID 不同字节隔离，写入失败回滚。顶栏未保存状态、替换确认、刷新取消及异步编辑/加载/上传保护已接入。

## 应用与备份

原累计包：`C:\Users\20153\Documents\ChatGPT\remotion\deliveries\P1-06-Update-20261102.zip`，SHA-256 为 `6556ab651713ec8a610c894386af6b1bb21012e8384da14fcdf25f407fb12814`，原 ZIP 未修改。解包及适配清单保存在 C 盘 deliveries/p106-update-20261102-applied/，不放入 D 盘测试扫描范围。

四份官方文档包含较新的 P1-03～05 正式应用、P1-01 环境补验及本次执行计划，已排除包内自动覆盖并显式合并，其余载荷哈希及已知版本检查保留。预检 READY 174，备份安装 174，累计 285 文件哈希一致，随即复查 ALREADY_APPLIED、待写入 0。此结果属于安装时；之后的必要修补另存差异，不用旧载荷哈希冒充最终代码完全相同。

- [应用核对](installation.json)、[安装凭据](../p106-20261102/writeback-receipt.json)、[包与原清单核对](package-review.json)。
- 备份目录：`reports/archive/p106-before-20261102-090323-512524/`。原始官方文档额外保存在本目录 documents-before/，后缀 .original。
- [安装器检查](installer-guards.json)：隔离验证预检、安装、重复执行、未知修改拒绝、受控写入失败回滚、移除失败安装的新文件及保留原凭据。
- [本机补充差异](local-changes.patch)、[源码与依赖核对](source-integrity.json)：276 项仍等于原载荷，9 项有已审阅的本机修补或说明更新，无意外差异。5 项要求不变的依赖/采样/放置/编码基线均一致。应用源码基线 133 文件，最终 143 文件，20 项修改、10 项新增，均在任务范围。

本机补充包括缺失素材打开前选择、取消后的保存指引、较短源重新绑定提示、空白时序错误反馈、三项数据保护测试；浏览器脚本增加真实 HTTP 模式、背景恢复、边界参考帧和截图，原 42 项回归断言保留。未升级依赖，未覆盖个人工程、素材、work 或已有 output。

## 实际检查

本机 Node、项目 .venv 的 Python/Playwright、Chrome 156.0.8078.76、FFmpeg/FFprobe。命令均在实际根目录执行，TEMP/TMP 使用项目外 `C:\Users\20153\Documents\ChatGPT\remotion\environment-probes\p106-runtime-temp`。

| 本轮检查 | 结果与日志 |
| --- | --- |
| `npm.cmd test` | PASS，28 文件 / 302 项，[日志](frontend-tests.txt) |
| `npm.cmd run build` | PASS，保留现有大 chunk 提醒，[日志](build.txt) |
| `npm.cmd run lint` | 退出 0，22 条 warning 含历史备份；当前应用范围 14 条既有 warning，[全量](lint.txt)、[应用范围](lint-runtime.txt)；新增脚本最终检查退出 0、无 warning，[日志](lint-scripts-final.txt) |
| `npm.cmd run agent:test` | PASS，25 通过、0 失败、0 跳过，[日志](agent-tests.txt) |
| P1-06 主浏览器场景 | PASS，7 场景 / 53 项，[结果](browser/report.json)、[日志](browser.txt)、[命令与服务退出](browser.result.json) |
| P1-06 补充场景 08 | PASS，1 场景 / 11 项，覆盖背景缺失及短素材重绑，[结果](browser-extra/report.json)、[日志](browser-extra.txt)、[命令与服务退出](browser-extra.result.json) |
| P1-03～05 原回归 | PASS，5 场景 / 原 42 项，关键帧、长手势、画布变换、独立预设、设备选择及保存导出，[结果](regression/report.json)、[日志](regression.txt) |
| 实际 MP4 | PASS，H.264、1920×1080、30FPS、4 秒 / 120 帧，[视频](browser/P1-06-dual-timing-1080p30.mp4)、[FFprobe](browser/02-ffprobe.json) |
| 导出抽帧 | PASS，19 个边界帧，整图及可见屏幕区域共 40 次比较；整图最低 SSIM 0.993712、屏幕区域最低 0.982154，[结果](browser/frame-comparison.json)、[日志](frame-comparison.txt) |
| 官方文档合并、链接与最终状态 | 见 [机器结果](results.json)、[文档检查](document-check.json)及[记录保留核对](documentation-merge.json) |
| 人工视觉及交互验收 | PENDING，由用户审阅，阶段一未整体验收 |

每条检查的完整命令、日期、退出码和耗时保存在同名 .result.json。基础检查通过后，仅新增脚本场景和文档，应用运行代码未再改变；补充运行 08 及最终脚本 lint，不重复冒称整套浏览器又跑了一轮。

P1-06 的两批浏览器均通过实际本地 Vite HTTP/TCP，未用 route.fulfill；各有独立服务，完成后均停止，capabilities 返回正常。P1-03～05 回归沿用实际生产构建离线路由，自动接受工程替换确认，其证据不扩大为 TCP 验证。所有浏览器报告中的页面异常和缺失资源均为 0。

## 场景与可审阅产物

主工程使用 iPhone 17 Pro 和 Pixel 9 Pro XL。录屏 A 为 assets/demo.mp4，B 为其变色测试副本，各 8 秒；B 具有不同字节，不声称是独立用户录制。A 为源 1～2.2 秒、0.4 秒起播、不循环；B 为源 4～5.3 秒、1.1 秒起播、循环，并手动制作 720° 旋转。

起播前/后、片段结束与循环附近检查第 0/11/12/13、30/32/33/34、47/48/49、71/72/73、110/111/112/114、119 帧。整图阈值 0.97，屏幕区域阈值 0.95；Pixel 旋转至背面时不声称其屏幕可见，仅在正面样本作屏幕裁切比较，源时间另由浏览器独立断言。共享源的两台程序模型也检查独立时钟和播放/暂停。

- [原工程](browser/01-dual-timed.mockup)和[新上下文重开工程](browser/02-reopened.mockup)：JSON、轨道、时序与媒体字节一致，可继续编辑。
- [新上下文背景恢复工程](browser/04-background-fresh-context.mockup)：含背景及两台设备的素材字节。
- [录屏时序界面](browser-extra/08-timing-controls.png)、[背景缺失与保存失败界面](browser-extra/08-missing-background.png)、[短录屏重新绑定工程](browser-extra/08-shorter-relinked.mockup)。
- 损坏 ZIP、缺 project.json、坏 JSON、非法模型、坏录屏/嵌入媒体、存储读失败、保存重试、真实刷新取消、新建/打开取消、异步上传跨工程均有逐项浏览器证据；存储写失败、媒体 ID 冲突、异步保存/加载交错另有单测证据。

人工审阅时，按 [操作指南](../../../docs/MEDIA_PROJECT_GUIDE.md) 打开原工程：播放并拖动到 0.4、1.1、1.6、2.4、3.7 秒，查看两台录屏的起播、保持与循环；修改第二台时序并撤销；保存关闭后重开，确认画面和操作符合预期。示例用于功能验证，模型观感和节奏仍需用户确认。

## 边界与交接

P1-06 转待人工验收，MAN-006、MAN-008 工程/素材侧和 MAN-009 恢复部分新增通过证据。MAN-008 导出侧、约 30 秒及更长片段归 P1-07，逐机型质量归 P1-08，全流程真实作品归 P1-09。自动草稿未实现，崩溃或强制关闭不能保证恢复未保存修改；浏览器下载请求成功不等于已确认磁盘落盘。

本轮首次只读进程查询受到环境限制，改在允许读取的环境中确认无本项目 Vite；未修改 Windows 权限。本机功能验证无失败或跳过；原包的历史诊断保留原轮次。正式结果仅以本报告和实际日志为准。
