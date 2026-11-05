# P1-03～05 正式应用与本机复核

日期：2026-11-02（北京时间）。实际项目：`D:\remotion\p0\MultiAgent-3D-Promo-Studio`。

## 安装

已应用 `P1-03-05-Update-20261102.zip`，SHA-256：`363A7E74BEDA53C8E53696F440118AAD7A33BB77569BCD5C0ED29A1C8A13335F`。经审阅的应用器确认当前 P1-02 基线和六项依赖要求，备份后安装 121 文件；安装后逐项哈希一致，立即只读复查为 ALREADY_APPLIED、待写入 0。

- [安装凭据](../p103-p105-20261102/writeback-receipt.json)、[本轮安装摘要](installation.json)、[121 项哈希记录](payload-verification.json)。
- 备份：`reports/archive/p103-p105-before-20261102-080233-468621/`。其中唯一的测试文件备份追加 `.original` 后缀，原字节及哈希未变；该目录的 test-backup-restore-map.json 记录恢复路径，防止 Vitest 将旧测试副本当作当前测试。
- 解包目录：`C:\Users\20153\Documents\ChatGPT\remotion\deliveries\p10305-update-20261102-applied`，位于正式项目测试扫描范围外。C 盘历史导入副本未覆盖。
- 安装前未发现本项目 Vite 服务；无需停止用户其他进程。项目文件正常写入，未更改 Windows ACL。

## 本机正式项目实际重跑

| 命令或检查 | 结果 / 退出码 | 本轮证据 |
| --- | --- | --- |
| npm.cmd test | PASS，0；26 文件 / 259 项 | [日志](frontend-tests.txt)、[退出码](frontend-tests.result.json) |
| npm.cmd run build | PASS，0；原有大 chunk 提醒保留 | [日志](build.txt)、[退出码](build.result.json) |
| npm.cmd run lint | PASS，0；17 条 warning，其中 3 条来自旧 Stage 备份 | [日志](lint.txt)、[退出码](lint.result.json) |
| 产品源码单独 lint | PASS，0；14 条原有 warning，无新增 | [日志](lint-runtime.txt)、[命令/退出码](lint-runtime.result.json) |
| node scripts/test-editor-interactions.cjs | PASS，0；Chrome 5 场景 / 42 检查，页面异常、资源缺失均为 0 | [日志](browser-run.txt)、[原始报告](browser/report.json)、[退出码](browser.result.json) |
| 保存重开 / 双录屏 / 独立轨道 | PASS；真实 iPhone 17 Pro、Pixel 9 Pro XL，不同录屏与动作在新上下文恢复一致 | [恢复工程](browser/04-reopened.mockup) |
| 实际 MP4 × 2 | PASS；手工 720°、双设备独立动画均为 H.264 / 1920×1080 / 30FPS / 2 秒 / 60 帧 | [手工动画](browser/P1-03-manual-720-1080p30.mp4)、[双设备视频](browser/P1-03-05-dual-animation-1080p30.mp4) |
| FFprobe / FFmpeg 抽帧 | PASS，0；两片共六帧 SSIM 均 >0.993 | [比较结果](browser/frame-comparison.json)、[脚本](verify-export.py)、[退出码](export-verification.result.json) |
| 文档链接 | PASS，0；81 份 Markdown，当前链接错误 0；63 条历史链接警告单独保留，未运行旧整理的 --integrity 基线 | [报告](document-check.json)、[日志](document-check-run.txt) |

手工视频第 0/15/59 帧 SSIM：0.995659 / 0.995181 / 0.995975；双设备第 0/30/59 帧：0.993990 / 0.995337 / 0.994777。机器汇总见 [results.json](results.json)。

测试使用本机现有依赖。前端及 Chrome 运行于允许临时文件和浏览器进程的测试环境；应用本身按正常项目写权限完成。浏览器使用真实生产构建和本地路由供给，不证明 Vite/API TCP；旧服务协议未涉及，Agent/API 本轮未重跑。包内工作副本的旧日志保留原字节，不替代本轮正式项目复核。

## 使用与验收

启动 `npm.cmd run dev` 后切换 Movie。时间轴提供通道选择、Add keyframe、拖动改时、删除、数值和 Ease；画布工具提供 Select / Move / Rotate / Scale / Orbit；设备预设默认只影响当前设备，并可设 Start / Length。详见 [手动动画操作说明](../../../docs/MANUAL_ANIMATION_GUIDE.md)。

P1-03、P1-04、P1-05 均已正式应用，保持“待人工验收”。预设范围外的键会保留，但边界重连可能影响相邻插值；竖屏过宽机身、长片资源边界、录屏入出点及错误提示不属于本轮完成项。第一阶段整体尚未验收。本轮未应用 P1-06 包，也未额外修改运行代码、升级依赖、导入新机型或覆盖用户素材、.mockup、work 和既有输出。
