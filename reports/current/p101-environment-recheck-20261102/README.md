# P1-01 环境阻塞项目补验

日期：2026-11-02（北京时间）。实际项目：`D:\remotion\p0\MultiAgent-3D-Promo-Studio`，当前已应用 P1-03～05。

结论：**原先因环境未通过的检查现已补验通过。** 原审查的失败及环境限制记录保留原字节，本目录为当前正式项目的新结果，不将历史结果追改成通过。P1-01 及阶段一仍需人工审阅。

## 原阻塞与本次结果

| 范围 | P1-01 原记录 | 本次实际执行 |
| --- | --- | --- |
| Agent/API | 15 通过、10 因 localhost EACCES 阻塞 | 完整原测试集 25 通过、0 失败、0 跳过，退出码 0；原 10 项逐项对应通过 |
| Python Playwright | 驱动初始化超过 55 秒未完成，转用 JS SDK | Python 3.10.6 驱动、Chrome 156.0.8078.76、WebGL2 通过；Doctor 共 17 项通过 |
| 真实 Vite/API TCP | 原浏览器用磁盘路由供给构建，未验证开发服务网络 | 启动实际 Vite 8.2.2，通过真实 127.0.0.1 HTTP、Python Playwright 和现有 studio plugin 完成 10 项检查，无路由拦截或离线供给 |

原 10 项涉及独立方案保存、离线规划、素材路径校验、请求校验、队列与重复执行、失败重试、成片确认、重启恢复及视频请求范围、任务中断、符号链接边界。名称和逐项结果见 [results.json](results.json)。完整测试沿用原受控渲染进程夹具，不能据此声称重新生成了旧三镜头成片。

## 实际命令与证据

| 命令 | 退出码 | 证据 |
| --- | --- | --- |
| npm.cmd run agent:test | 0 | [日志](agent-tests.txt)、[命令记录](agent-tests.result.json) |
| npm.cmd run agent:doctor，PYTHON 指向项目 .venv | 0 | [日志](doctor.txt)、[命令记录](doctor.result.json) |
| .venv/Scripts/python.exe reports/current/p101-environment-recheck-20261102/verify-local-service.py | 0 | [脚本](verify-local-service.py)、[日志](local-service.txt)、[原始结果](local-service.json)、[命令记录](local-service.result.json) |
| scripts/check-project-docs.py | 0；86 份 Markdown，当前链接错误 0；历史链接警告 120 单独保留 | [文档检查](document-check.json)、[日志](document-check-run.txt) |
| 应用源码与配置哈希 | 133 文件未改变 | [执行前基线](source-baseline.json)、[结束核对](source-integrity.json) |

本轮真实服务检查覆盖：HTTP 与 capabilities、Python 浏览器加载编辑器、真实 iPhone GLB/解码器/WebGL、页面 JSON 导入及自动保存、实际磁盘字节、浏览器 JSON 下载、拒绝外部 Origin、服务重启后从磁盘恢复方案并在同一浏览器上下文的新页面恢复选择、页面/资源异常、既有默认 storyboard 未变。证据包括 [页面截图](editor-real-tcp.png)、[下载的 JSON](downloaded-storyboard.json)、[启动日志](vite-start.txt)和[重启日志](vite-restart.txt)。

补验在允许本机网络、浏览器进程和临时文件的环境执行，没有更改全局沙箱策略或 Windows ACL。测试使用独立端口，自己启动的 Vite 已在 finally 中停止，未占用或终止用户原有服务。测试新增独立 work/studio 方案用于保存验证，路径及编号在原始结果中；未覆盖默认 storyboard、个人素材或工程。

## 复跑中保留的诊断

1. 初次真实 Vite 尝试的 TEMP 在项目 output 内，Vite 监听到 Chrome 锁定的 Cookies-journal 后报 EBUSY 并退出。该次只完成两项检查，整体 FAIL。移到有写权限的项目外临时目录后解决。[日志](diagnostics/vite-start.txt)、[未完成结果](diagnostics/local-service.json)。
2. 第二次保存、下载等七项已通过，但重启后 HMR 自动导航与主动 page.reload 竞争，测试报 ERR_ABORTED。脚本改为保留浏览器上下文及本地存储、先关闭页面，服务重启后打开新页面；完整第三轮 10 项通过。[第二次结果](diagnostics/hmr-navigation-race/local-service.json)、[日志](diagnostics/hmr-navigation-race/local-service.txt)。

两次诊断均未改产品代码；失败日志不当作通过。复跑临时目录见命令记录，位于 C 盘工作区 environment-probes 下，并非旧导入副本。

## 结果边界

已补齐原环境限制对应的 API、Python 驱动与真实 Vite/TCP 证据。未在本轮重复前端 259 项、构建、lint、旧完整成片或所有人工场景，因为运行源码未改；这些保留各自原轮次。已知产品缺口、较长片段、逐机型视觉和最终人工验收继续按唯一工作计划处理。P1-01 维持待人工验收，不将环境补验等同于阶段一完成。
