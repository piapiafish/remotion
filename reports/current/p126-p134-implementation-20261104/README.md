# P1-26～34 第二批反馈实施与验证

日期：2026-11-04（北京时间）。实际项目：`D:\remotion\p0\MultiAgent-3D-Promo-Studio`。代码已在正式项目应用；P1-26～34 转为待人工验收，第一阶段未整体验收。原首批五项按用户安排保留待复核，人工清单未改写。

[唯一工作计划](../../../IMPLEMENTATION_ROADMAP.md) · [新操作与复核说明](../../../docs/SECOND_FEEDBACK_GUIDE.md) · [最终结果](results.json) · [源码与数据保护核对](source-integrity.json)

## 本轮实际修改

| 任务 | 已实现行为 | 核验重点 |
| --- | --- | --- |
| P1-26 | 手机/两类文字的显示区间；粗条两端调整、整体平移动作；区间外无绘制/投影/命中，视频解码器与纹理可回收 | 区间边界、隐藏键保留、反向恢复、六轮资源计数 |
| P1-27 | 同行视频细条裁切/平移；精确字段与 0.25～4 倍；移除循环入口，旧循环保留至编辑；具体字段错误 | 不同/相同源的独立时钟、倍速、裁切、非法输入 |
| P1-28 | 上下键、跨键、超过末尾自动延长；poseId 与同刻独立叠放；可展开选层，首键保护和中文工具名称 | 原生焦点、100 次微调、层选择/删除、撤销与保存 |
| P1-29 | 画布方向键按镜头方向平移，Shift 精调；与时间轴/数值框分工 | 一次撤销、输入隔离 |
| P1-30 | 相机专页、3 秒倒计时、连续录制/停留、回放/采用/放弃；录制锁对象，页外不自动写动画 | 对象轨道保持、整次撤销、实际镜头回放 |
| P1-31 | 贴纸与真实实体中文字形；XYZ/方向/厚度动画，设置输入对齐；保存字形子集 | 字形孔洞、正侧背、厚度、离线恢复 |
| P1-32 | 贴纸在场景前/后；实体与手机按空间深度遮挡；共享预览/导出合成 | 四组手机中心区域对照、透明输出、效果 |
| P1-33 | 新流程说明及 G02 五时点指引、可编辑示例 | 数字步骤实际执行，不代填人工结论 |
| P1-34 | 旧通过场景回归、完整新流程、短/长视频及图像对照 | 各轮结果与人工边界分开记录 |

继续沿用 Project/TrackSet/sampleTimeline/history。版本 3 新增时间范围、姿态身份和实体数据，旧 1/2 继续读取。普通同刻数值编辑仍更新当前姿态；拖动叠放不会覆盖其他姿态，采样时仅临时选取同属性上层值。欧拉 360°/720°、静态编辑及时间差插值继续保留。

## 最终自动检查

环境：Windows / PowerShell，Node v24.22.2，项目 Python 3.10.6，Chrome 156.0.8078.80；使用原有 Playwright SDK 和 FFmpeg/FFprobe。本轮浏览器测试连接真实本地 Vite，限制页面请求到 localhost/127.0.0.1；使用既有自动化演示素材，没有导入个人作品。

| 检查 | 最终结果 | 命令 / 原始证据 |
| --- | --- | --- |
| 前端测试 | 38 文件 / 389 通过 | `npm.cmd test`；[结果](tests-final.result.json)、[日志](tests-final.txt) |
| 构建 | 退出 0 | `npm.cmd run build`；[结果](build-final.result.json)、[日志](build-final.txt) |
| lint | 退出 0，25 条既有 warning | `npm.cmd run lint`；[结果](lint-release.result.json)、[日志](lint-release.txt)；包含旧备份中的既有提醒 |
| 旧接口/编译测试 | 25 通过，0 失败/跳过 | `npm.cmd run agent:test`；[结果](agent-final.result.json)、[日志](agent-final.txt) |
| 新流程 | 六场景 / 43 项通过 | [browser-final](browser-final/report.json)，[启动命令/退出码](browser-final.result.json) |
| 已通过行为回归 | 手工动画/预设/文字/环境 14 项检查通过；录屏及遮挡 7 项通过 | [authoring](regression-authoring-final/report.json)、[media/occlusion](regression-visual-verified/report.json)，数量含各轮无异常检查，不相加为独立人工场景数 |
| G02 说明 | 5 项通过 | [g02-final](g02-final/report.json)；含原始前后数值与撤销 |
| 取消/重试/继续编辑 | 5 项通过；重试实际生成两秒视频 | [cancel-verified](cancel-verified/report.json)、[重试视频](cancel-verified/cancel-retry-2s.mp4) |
| 参考采集 | 3 项通过，11 张参考图 | [references-final](references-final/report.json)；使用正式导出会话唤醒资源 |
| 编码图像对照 | 33 次通过，阈值 0.98，最低 0.990848 | [逐帧结果](video-verification.json)、[解码帧](video-frames/) |
| 遮挡区域 | 四组通过 | [区域比较](occlusion-verification.json)；手机内部 160×280 区域，后方贴纸/实体与无文字基准 SSIM 均为 1，前方分别约 0.762 / 0.749 |
| 文档 | 结果见文件中的实际统计 | `scripts/check-project-docs.py`；[检查结果](document-check.json) |

新增 13 个用户已通过场景对应 D02/D03、E01～05、G01、H02/H04、I01～03；G02 单独按说明核对。上述自动检查不改变根目录人工勾选，也不证明所有素材、机器和窗口配置均已验收。

## 可审阅的工程与产物

- [四秒 1080P/30FPS 视频](browser-final/second-feedback-1080p30.mp4)：H.264，1920×1080，120 帧，包含两台真实 GLB/独立录屏、2 倍播放、相机录制、两类文字、显示区间、景深与两次曝光采样。
- [30 秒视频](browser-final/second-feedback-30s.mp4)：H.264，1920×1080，900 帧，时序/轨道和对象区间扩展到 30 秒；本样本关闭效果，不扩大为 30 秒所有效果组合的性能保证。
- [短片可编辑工程](browser-final/second-feedback-scene.mockup)、[30 秒工程](browser-final/second-feedback-30s.mockup)。工程包含所需示例媒体与实体字形子集。
- [G02 数字试验工程](g02-final/G02-numeric-example.mockup)：预设撤销后的 0/1/2/6/8 秒版本，可按指南从第 2 秒应用旋转一周。
- [文字设置截图](browser-final/solid-settings-alignment.png)、[时间轴叠放](browser-final/timeline-stacks.png)、[紧凑窗口](regression-visual-verified/compact-layout.png)、[透明遮挡图](regression-visual-verified/transparent-occlusion.png)。

文件尺寸、帧数和 SHA-256 见 [exports.json](exports.json)。最终完整浏览器轮次约 178.7 秒，包含 UI、保存重开、截图和两段导出，不是某一视频独立导出耗时。编码对照覆盖 0、7、8、29、30、60、104、105、107、108、119 帧，包括对象出现、文字消失和手机消失边界。

## 资源、字体与兼容边界

六次隐藏/恢复中，隐藏状态解码器均为 0，渲染器几何计数 81、纹理计数 37 保持；记录见 [resource-cycles.json](browser-final/resource-cycles.json)。GLB 实例、共享缓存、工程数据和源素材仍保留，不能描述成所有内存归零，也不是整个 Chrome/GPU 峰值内存测量。

仅新增锁定的直接依赖 OpenType.js 1.3.4，以及其两项依赖；旧锁定项未升级。字体来自 [官方 Noto CJK](https://github.com/notofonts/noto-cjk/tree/main/Sans/OTF/SimplifiedChinese)，原始字节/来源/哈希见 [font-source.json](font-source.json)，完整许可证在 `public/fonts/OFL.txt`。实体使用常规字形，导出子集改名为 Studio CJK Outlines，工程同时包含 OFL 许可证；未支持的字符明确报错。全新上下文阻断字体请求后的重开已通过，贴纸仍使用系统字体，跨系统排版可能不同。

本轮模型视觉使用 iPhone 17 Pro、Pixel 9 Pro XL 及程序模型；没有接入新机型，也没有重做全部五机型的人工质感验收。4K、60FPS、更多对象及所有字体字重未作本轮保证。原首批录屏观感/清晰度与系统保存窗口仍按原状态待用户复核，本次没有借新增通过结果替它们关闭。

## 失败诊断与修正记录

所有原日志和失败结果保留；以下不能计入最终通过轮次。

- `tests-first` 五项失败涉及新版本/可见状态/边界期待，以及给无关通道补身份。修订迁移期待、自动延长和保持无关通道后，新增真实字形、叠放身份、隐藏对焦、纯文字恢复和准备等待取消测试，最终 389 项通过。
- 编译接入错误分别保留在 build-first/second/fourth/sixth：参数插入、类型收窄、Node 测试类型及选中姿态类型；修正后 build-final 退出 0。
- `browser-first` 暴露文字控件 10px 偏差、片尾预热导致视频未释放，以及探针撤销/重做后未重新选键。分别修正布局、活动窗和探针。
- `browser-second` 的非活动视频就绪判断失败后，改为可见性就绪，并让导出/bridge 等待唤醒资源。实际回收恢复、未来帧截图和六轮计数在 browser-final 通过。
- `regression-first` 首先是探针未展开位置设置；随后 `regression-authoring` 真实复现版本 3 纯文字文件重开后多出默认手机。补齐 v3 空设备迁移并加单测，authoring-final 通过。
- `video-verification-initial.json` 保留 FAIL：内部参考探针未开启正式导出会话，导致未来可见视频未唤醒，部分参考图不完整。实际 MP4 未重写；改用 withExportSession 重采 11 帧后，video-verification.json 的 33 次比较全部通过。
- `cancel-final` 探针在 UI 提示提交前即时检查可见性而失败；改为等待取消提示后，cancel-verified 实际重试视频和编辑通过。清理验证脚本时误删 still 帮助函数的 regression-visual-final 失败保留，恢复后 regression-visual-verified 通过。

## 文件保管与交接

修改前 213 个文件保存在 `reports/archive/p126-p134-before-20261104-075007-920321/`，以 `.original` 后缀避免旧测试被收集。[before.json](before.json) 保存映射与起始哈希；[changes.diff](changes.diff) 汇总本轮差异。原人工清单、AGENTS、机型 manifest、既有文档媒体/参考等保护项保持。个人作品、素材、work/output 与 C 盘历史导入副本未进行写回。

文档检查脚本会写公共 document-check.json；本轮将新结果另存后恢复旧字节，不覆盖此前证据，也不使用仅适用于旧整理轮次的 --integrity。原失败日志、旧报告和旧任务状态均保留。

本地 [编辑器](http://127.0.0.1:5173) 已确认加载新代码，并保留运行；各轮专用测试服务均停止，见 [preview.json](preview.json)。下一步按新操作说明人工复核 C04、D01/D04、F01～04、G02/G03、H01/H03；用户确认后再更新相应验收状态。
