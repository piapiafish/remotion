# P1-03、P1-04、P1-05 实现与验证

日期：2026-11-02（北京时间）。结论：**三个任务已在最新正式源码的临时工作副本实现并通过下述检查，待应用更新和用户人工验收。** 当前会话授权可写目录不含 D 盘，没有改动实际项目。实际安装以本目录 writeback-receipt.json 为准。

## 实现

- P1-03 / MAN-001、MAN-002：设备与相机标量通道显式加帧，选择、拖动改时、删除、输入数值和基本缓动；静态编辑规则保留，删除至单键或最后键时保持静态值。关键帧拖动按帧率吸附，同时间由移动键覆盖目标键，取消或拖回时使用原始轨道恢复。360°/720° 保留逐轴欧拉采样。
- P1-04 / MAN-007：画布点选与实例、列表、参数同步；Move/Rotate/等比 Scale 和独立 Orbit 相机模式；手势及数字框长拖动一次撤销，Escape 取消。编辑标记由公共帧渲染器排除，并在渲染异常时恢复可见性。
- P1-05 / MAN-005：设备预设只作用于当前实例，Start/Length 控制关键帧替换范围，声明的通道之外保持不变；相机 Orbit 只写相机位置。选中设备与时间轴通道归属清楚，每次应用独立撤销。

操作步骤见 [手动动画指南](../../../docs/MANUAL_ANIMATION_GUIDE.md)，源码差异见 [source-changes.patch](source-changes.patch)。

## 本轮实跑

| 命令或检查 | 结果 | 证据 |
| --- | --- | --- |
| npm.cmd test -- --reporter=dot | 退出 0；26 文件 / 259 项，新增 31 项 | [日志](tests-final.txt) |
| npm.cmd run build | 退出 0；保留原有大 chunk 提醒 | [日志](build-final.txt) |
| npm.cmd run lint | 退出 0；14 条原有模块位置 warning，无新增 | [日志](lint-final.txt) |
| node audit-editing.cjs | 退出 0；Chrome 五独立场景 / 42 检查；页面异常、缺失资源均为 0 | [原始报告](browser/report.json)、[执行日志](browser-final.txt) |
| 保存重开 | 手工动画及双真实机型、不同视频、独立轨道在新上下文恢复，媒体字节哈希一致 | [恢复工程](browser/04-reopened.mockup) |
| 实际 MP4 × 2 | H.264，1920×1080，30FPS，2 秒、60 帧 | [手工动画](browser/P1-03-manual-720-1080p30.mp4)、[双设备](browser/P1-03-05-dual-animation-1080p30.mp4) |
| FFprobe / FFmpeg | 两片各三帧 SSIM 均通过 >=0.97 | [比较结果](browser/frame-comparison.json)、[执行日志](export-verification.txt) |

手工视频第 0/15/59 帧 SSIM：0.995659 / 0.995181 / 0.995975；双设备第 0/30/59 帧：0.993990 / 0.995337 / 0.994777。实际媒体是现有 demo.mp4 和其调色测试副本，后一份仅用作不同媒体字节的回归样本。双设备使用 iPhone 17 Pro、Google Pixel 9 Pro XL，分别 Float 和错时 Spin；不代表录屏入出点控制已实现。

浏览器直接供给本轮生产构建，测试真实 UI、WebGL、上传和下载，不验证 Vite/API TCP。未修改旧服务协议，本轮未重跑 Agent/API；此前环境阻塞保留原记录。环境沿用现有 Windows、Node/npm、Chrome、Playwright JavaScript SDK 和 FFmpeg，没有升级依赖。浏览器具体版本见原始报告。

## 诊断过程

初次下载因默认临时目录返回 canceled，显式设置可写 TEMP/TMP 和 downloadsPath 后正常。程序机型的视频就绪检查不能由当前桥接正确判定，主录屏验收改用两台真实 GLB；该探针兼容性没有被当成实际屏幕功能失败。

首轮画布脚本未把侧栏数字框滚入视口，未触发拖动；另有重做选中项的预期与“优先保留现存实例”规则不符，以及新增手工导出步骤未先选择 MP4。脚本已修正并重跑；最初全量脚本留下 RUNNING 的报告属于未完成，不能算通过。[初次全量报告](diagnostics/first-full-run.json)、[日志](diagnostics/browser-full-01.txt)、[程序机型诊断](diagnostics/procedural-fixture.json)。最初两个变换控件类型接入错误修正后构建通过，新增 lint 提醒也已消除。

## 边界与后续

- 预设替换的是范围内的关键帧；外部键保留并重新连接边界，邻接插值可能变化。尚未增加片段剪切。选择命名缓动会显式替换该通道的 Continuous 插值。
- 本轮给出两秒样本，约 30 秒、错误提示/重试和长片资源边界继续归 P1-06/P1-07/P1-09；P1-08 的所有机型视觉质量未验收。
- P1-02 的过宽竖屏构图与整段自动避碰边界保持原记录。手柄操作不是自动构图。
- 人工验收仍需用户确认加帧入口、选中反馈、手柄操作、预设范围与实际视频观感。

## 复跑和应用

先构建，再 node scripts/test-editor-interactions.cjs；该可移植版本不保存界面截图，新输出在 output 独立目录。原始执行脚本保留在 [reproduce](reproduce/)，其临时路径只作审计。

解压本次更新包，先运行 python apply_update.py --check，再运行 APPLY_UPDATE.cmd。应用器校验全部载荷与目标已知版本后，备份到 reports/archive/p103-p105-before-时间，原子安装并核对哈希；失败回滚，未知本地修改在写入前拒绝。请先关闭运行中的开发服务，应用后重新启动 npm.cmd run dev。

备份、安装凭据和实际写入状态以本机执行结果为准。本轮交付检查记录见 [delivery-validation.json](delivery-validation.json)。
