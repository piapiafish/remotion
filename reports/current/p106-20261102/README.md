# P1-06：录屏时序、工程与素材反馈

日期：2026-11-02，北京时间。状态：工作副本实现与机器验证通过，待应用和用户人工验收。实际 D 盘在当前会话未修改；累计安装包覆盖前置 P1-03～05，不将包内实现等同于已回写。

## 完成与验证

| 内容 | 本轮证据 |
| --- | --- |
| 前端 | 28 文件 / 299 项通过，新增 40 项时序、可靠性、撤销和异步交错测试；[日志](tests-final.txt) |
| 构建 / lint | 都退出 0；14 条既有 warning，没有新增 warning；[构建](build-final.txt)、[lint](lint-final.txt) |
| P1-06 浏览器 | Chrome 156.0.8078.76，7 个独立上下文 / 51 项；[原始结果](browser/report.json)、[日志](browser-final.txt) |
| P1-03～05 回归 | 5 上下文 / 原 42 项通过；[结果](regression/browser/report.json)、[日志](regression-p10305.txt) |
| 实际导出 | [双设备四秒 MP4](browser/P1-06-dual-timing-1080p30.mp4)，H.264 1920×1080 / 30FPS / 120 帧；[ffprobe](browser/02-ffprobe.json) |
| 抽帧 | 0/30/72/114 帧，与同工程同帧 Standard 引擎输出比较，SSIM 均 >=0.97；[结果](browser/frame-comparison.json) |
| 新会话 | [原工程](browser/01-dual-timed.mockup)、[重开工程](browser/02-reopened.mockup) 的媒体字节、关键帧与时序一致 |
| 安装 | 独立检查、双基线安装/备份、重复应用、冲突拒绝和失败回滚；[交付验证](delivery-validation.json) |

两台真实机型为 iPhone 17 Pro、Google Pixel 9 Pro XL。源视频 A 为 assets/demo.mp4，B 是它的色相变体，各 8 秒，不是两份独立用户录制。A 使用源 1～2.2 秒、镜头 0.4 秒起播且末帧保持；B 使用源 4～5.3 秒、镜头 1.1 秒起播并循环，另有手工 720° 旋转。共享同一媒体 ID 的双程序模型另有独立时钟和就绪检查。

错误用例包括无效 ZIP、缺少 project.json、坏 JSON、错误模型、损坏包内视频、坏录屏导入、缺失媒体和保存时存储不可读；原工程继续可编辑、保存重试可恢复。另验证同 ID 不同字节不覆盖旧素材、导入写入失败回滚、保存期间修改保持未保存、工程加载期间修改不被覆盖，以及读取尚未结束的上传不会写入重新打开的同 ID 设备。

## 复现

在实际项目根目录复用已有依赖：`npm.cmd test`、`npm.cmd run build`、`npm.cmd run lint`，构建后运行 `node scripts/test-media-project.cjs`。脚本默认使用项目 .venv 中已有 JavaScript Playwright SDK 和系统 Chrome；参数说明见 [测试文档](../../../docs/TESTING.md)。已有 P1-03～05 脚本的回归适配仅自动接受新增丢弃确认，其原始断言未删改；当轮适配源码见 reproduce/，含本轮临时路径，便携入口仍在 scripts/。

浏览器以本地路由供给未经注入修改的实际 dist。只在错误用例注入可恢复的存储/上传延迟故障，不更改业务实现以制造通过。不代表 Vite/API TCP 已通过。导出帧、工程、原始日志及命令保留；未包含浏览器界面截图。机器详情见 [results.json](results.json)。

## 处理中的问题与边界

首轮构建发现就绪探针空值类型收窄及输入校验类型错误，修复后构建通过；一条新增直接修改 hook 状态对象的 lint warning 改为媒体资源函数处理，最终只剩 14 条既有 warning。原始日志保存在 diagnostics/。首轮 45 项、第二轮 50 项均通过；最终增加异步上传跨工程用例为 51 项，不将早期结果写成最终构建已验证。

自动草稿未实现。已落实手动 .mockup、真实刷新取消及新建/打开丢弃确认，缓存媒体不等于保存工程；强制退出或崩溃无法保证恢复未保存文档。下载成功仅能确认浏览器接收请求，磁盘保存仍需用户确认。

本轮短片不证明约 30 秒、更长片段、全部编码格式、Vite/API TCP 或所有模型质量。MAN-008 导出侧留给 P1-07，MAN-009 总体验收留给 P1-09；P1-05 已记录的范围外相邻插值变化仍属其原边界。最终视觉与交互由用户验收。
