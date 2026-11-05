> 能力参考：下文保留已有入口和协议用法，不维护当前开发优先级。任务以 [唯一工作计划](../IMPLEMENTATION_ROADMAP.md) 为准，验证状态见 [当前报告](../reports/current/README.md)。

# 手机运动计划：JSON → 主画布 → 时间轴

本轮优先规划手机模型本身的位置、旋转和缩放，不需要应用页面、截图或录屏素材。未来 AI 返回同一 JSON 格式即可复用这条链路。

## 当前入口

1. `npm.cmd run dev` 后打开编辑器。右侧顶部“AI 导演 · 手机运动计划”默认展开。
2. 选择手机，点击“生成运动计划并应用”。目前是明确标记的模拟 AI，固定返回 15 秒 / 16 个关键帧；输入的运动要求作为 brief 保存，不会调用在线模型，也不会解析任意自然语言。
3. JSON 经过校验后一次性写入原生 TrackSet，自动切到 Movie，停止在 0 秒。点击播放或“从头预览手机运动”。
4. 左侧时间轴的 Device 轨道显示全部真实关键帧（含小数秒）；点击菱形精确定位。下方显示每一整数秒及结束时刻的真实 GLB 画面、时间和说明；点击画面可定位，横向滚动查看全片。底部显示当前时刻和计划说明，鼠标悬停画面可看位置、角度、缩放。
5. “导入本地 JSON / 粘贴 AI 运动计划”位于生成区下面。支持原始 JSON、Markdown JSON 代码块和前后说明文字，选择文件后自动应用。
6. 保存 `.mockup` 可保留原生轨道和说明，支持撤销/重做。生成/导入的原始 JSON 可单独下载；后续手动修改画布不会反写这个原始 JSON。
7. 生成按钮下面的“一键清除 AI 动画”会停止播放、移除 AI 关键帧和预览、清空本次 JSON，并让手机居中静止；保留手机型号、外观、背景与画幅，可撤销恢复。没有 AI 计划时按钮禁用。

模拟计划现在使用连续速度插值：旋转贯穿中间关键帧，起止平稳减速，收尾不再反向扭动。AI 计划播到结尾会停在最后姿态，再点播放从头开始；原有普通动画仍保持循环播放。播放期间暂停采集逐秒缩略图，避免离屏渲染抢占预览帧。

旧版 Video DSL、录屏路径、CLI 和 Remotion 成片入口移入最后的“旧版素材分镜与成片渲染”。旧文件继续走原渲染链路，不会被误认为手机运动计划。

## JSON 约定

完整可导入示例：[phone-motion.json](../public/examples/phone-motion.json)。

| 字段 | 含义 |
| --- | --- |
| schema | 固定 `phone-motion/1`。 |
| title / brief | 计划标题 / 运动要求。 |
| deviceId | `iphone-17-pro`、`iphone-17-pro-max`、`pixel-9-pro-xl` 或 `galaxy-s26-ultra`。 |
| duration / fps | 秒数（0.1～120），帧率 30 或 60。 |
| interpolation | 可选 `continuous` / `eased`。模拟 AI 和示例使用 continuous，连续速度、不过冲、起止静止；未指定时保持旧 JSON 的逐段 ease 语义。 |
| canvas | 整数 width / height（256～3840）。 |
| camera | 静态 position、target、fov。相机与目标不可重合，fov 10～100。 |
| keyframes | 2～241 个关键帧，时间严格递增，第一个必须是 0 秒。 |
| keyframes[].t | 时间，单位秒，支持小数，不能超过 duration。 |
| keyframes[].position | `[x,y,z]`，场景单位；1 单位为 10 cm。+X 右、+Y 上、+Z 朝向默认正面相机。 |
| keyframes[].rotationDeg | XYZ 欧拉角，单位度。`0 → 360 → 720` 保留整周旋转，不进行最短路径折算。 |
| keyframes[].scale | 等比缩放，0.05～5。 |
| keyframes[].description | 这个时刻的机身运动或画面说明，显示在时间轴。 |
| keyframes[].ease | `linear`、`smooth` 或 `ease-out`，默认 smooth；在 eased 模式控制从本关键帧到下一帧的插值。continuous 模式使用共享切线，不逐秒重置缓动。 |

每个关键帧都提供完整位置、旋转和缩放。最后一个关键帧若早于 duration，则保持最后姿态到结束。description 表示这一段的计划说明；非关键帧时刻的实际模型姿态由原生轨道插值得到。

当前格式为单手机连续运动和静态取景；导入时替换设备轨迹、清空贴屏素材、保留背景和环境。不会执行文本、访问素材路径或自动加载录屏。自动构图、多设备编排、动态相机的 AI 规划仍属于后续范围。

## 实现与验证

- `src/timeline/motionPlan.ts`：解析、校验、模拟响应和编译；只在导入时运行，输出原有标量轨道，角度转换成原工程的弧度。
- `src/store/project.ts`：单次可撤销的文档更新，重置播放头并进入 Movie。
- `sampleTimeline` / `SceneDriver`：继续负责预览、拖动和导出；没有另建动画运行时。
- `Project.motionPlan`：只保存标题、brief 和时间点说明，不是第二套执行轨迹。
- 逐秒缩略图从当前真实 GLB 场景的离屏目标采集，等待模型及屏幕材质就绪；渲染后恢复当前播放头的姿态，不改变用户的播放位置。工程修改会取消旧缩略图任务，播放与导出期间暂停缩略图采集。

本机回归：

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run lint
.venv/Scripts/python.exe scripts/test-motion-plan.py
.venv/Scripts/python.exe scripts/test-timeline-ui.py
```

运动测试检查实际 Three.js 机身姿态和逐秒真实图片，覆盖模拟生成、360°、插值、1.25 秒关键帧、无效 JSON 不修改画布、本地文件、`.mockup` 保存恢复、撤销/重做及紧凑视口。报告与截图写入 `output/motion-plan-test/`；本轮汇总见 [PHONE_MOTION_VALIDATION.json](../reports/archive/pre-20261101/docs/PHONE_MOTION_VALIDATION.json)。完整视频合成验收仍是另一个检查范围。
