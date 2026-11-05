> 历史资料（2026-11-01 归档）：仅供回溯；当前任务以 [唯一工作计划](../../../../IMPLEMENTATION_ROADMAP.md) 为准。原始字节另存 original-documents.zip。

# 阶段：P0 — 视频制作引擎打通

验收日期：2026-10-29（北京时间）。

**结论：P0 核心自动成片链路在本次 Linux 环境通过。** 实际生成了真实 GLB + 录屏 + 关键帧的单镜头 MP4，以及三镜头、中文字幕和背景音乐的 Remotion 成片。Windows 尚未实机运行，不能把本次结果扩展为 Windows 已验收。

## 目标

复用现有 Video DSL、编译器、Three.js/R3F 设备场景、视频纹理、轨道采样、Playwright worker 和 Remotion，让本地录屏能真正导出为可播放宣传视频。本次没有开发源码 AI 理解、协商方案、录屏指导、新构图引擎、多设备求解或新版 UI；没有调用付费 LLM。

| 验收层 | 结果 | 实际证据 |
| --- | --- | --- |
| 第一层：基础运行 | 通过，有警告 | npm 安装、构建、测试、原编辑器截图及 WebGL2 探测 |
| 第二层：单镜头 | 通过 | 540×960、30 FPS、H.264、150 帧、5 秒；画面和浏览器播放检查 |
| 第三层：完整成片 | 通过 | 三条独立镜头；Remotion 4.0.300 输出 H.264/AAC、450 视频帧、15 秒视频轨；字幕、顺序和音乐验证 |

## 本阶段修改

| 文件 | 修复内容与原因 |
| --- | --- |
| `src/scene/GltfDevice.tsx`、`public/draco/` | 四台 GLB 都使用 Draco；原 drei 默认从 Google CDN 下载解码器，本环境请求失败，模型无法加载。改为随项目分发的本地解码器，保留授权文件。 |
| `src/scene/Stage.tsx`、`public/environments/` | 原编辑器的四个环境预设依赖外网 HDRI。分发同一套预设的本地副本；预览和自动化使用相同环境、强度和旋转设置。 |
| `src/media/useScreenVideo.ts`、`src/scene/GltfDevice.tsx`、`src/scene/Device.tsx` | 原来在 useMemo 中创建浏览器视频资源，StrictMode 重放清理会释放正在显示的纹理，产生黑屏和残留注册。改为在 effect 中成对创建、清理。 |
| `src/scene/materials/screenMaterial.ts` | 自定义屏幕 Shader 原先对 VideoTexture 缺少 Three.js 内建材质所做的 sRGB 解码，录屏被额外提亮。补上仅用于视频的解码，图片路径保留。 |
| `src/automation/bridge.ts` | 就绪条件现在要求设备屏幕上真正挂载了视频纹理，而非仅有任意网格；预览采样先停渲染循环，再异步 seek，避免被 UI 播放头覆盖。 |
| `src/media/screenVideo.ts` | 导出 seek 超时、解码失败或视频未就绪时明确失败，避免静默编码旧帧；片尾定位到可解码时刻。 |
| `services/render-worker/worker.py` | 使用 UTF-8 job 文件传数据；Node 直接启动 Vite，避开 Windows npm.cmd；记录浏览器、路径、回退原因和 FFprobe 信息；先写临时文件，验证后发布；PNG 检查连续编号、数量、空文件并清除旧帧；明确从第 0 帧编码。 |
| `services/agent-orchestrator/cli.mjs` | 增加显式离线规划；使用 Node 直接执行 Remotion JS，避开 .cmd、shell 和 JSON 转义；共享 CHROME_PATH；Remotion 缺失时明确失败，FFmpeg 兼容模式单独标为 COMPATIBILITY_ONLY。 |
| `services/agent-orchestrator/cache.mjs` | 缓存纳入渲染源码、依赖 lockfile、设备 GLB 和录屏内容；字幕不进入 3D 镜头指纹。 |
| `services/agent-orchestrator/critic.mjs` | 验证预期分辨率、帧率、时长和音频流，不能仅凭 MP4 文件存在判成功。 |
| `scripts/remotion-loopback.cjs` | Remotion 4.0.300 在本环境枚举网络接口时抛出权限错误。仅对该特定失败提供已知的 IPv4 localhost 信息；不改 node_modules、不提升权限，其他异常仍抛出。 |
| `remotion-compositor/src/Film.tsx` | 字幕原字号按 1080 宽写死，540 输出出现过大换行和遮挡。所有文字像素尺寸随画幅宽度缩放，字幕时序和结构不变。 |
| `services/agent-orchestrator/audio.mjs` | 自带音乐平均仅 -50.2 dB，叠加 0.22 音量后几乎听不见。仅对平均低于 -35 dB 的输入创建固定增益副本，目标约 -20 dB并限制峰值，然后应用原 DSL 音量；原文件不修改。 |
| `package.json`、`.oxlintrc.json` | Vitest 只收集 src 测试，Node 测试单独运行；增加 agent:p0 入口；忽略未修改的第三方 Draco 源码 lint。 |
| `scripts/doctor.mjs`、`scripts/p0-smoke.mjs`、`scripts/p0-visual.py` | Doctor 实际启动浏览器并检测 WebGL2；冒烟脚本检查单镜头、Remotion、解码和缓存；四机型脚本保存真实画面、视频时间、解码像素和重复渲染证据。 |
| `services/render-worker/requirements.txt`、`remotion-compositor/package-lock.json`、Windows 批处理 | 固定本次可复现依赖；安装浏览器；Windows Demo 明确离线、540×960；Doctor 失败时返回失败。 |
| `src/media/screenVideo.test.ts`、`src/scene/materials/screenMaterial.test.ts`、`tests/` 中新增测试 | 回归覆盖精确 seek、超时/错误、视频颜色路径、缓存、缺素材、非法设备、真实 FFprobe、网络接口退化和极低音乐音量。 |
| `docs/P0_WINDOWS.md`、状态与测试文档、资源来源说明 | 记录安装命令、操作步骤、失败复现、当前结论和授权来源；旧状态作为历史保留。 |

完整文件级清单见 `P0_FILE_CHANGES.json`；原始文件和素材保留检查见 `P0_SOURCE_PRESERVATION.json`。没有删除原 GLB、录屏、参考视频或原授权内容。

## 复用的旧模块

| 调用步骤 | 输入 | 输出 | 实际模块 |
| --- | --- | --- | --- |
| 离线 Director | brief、媒体路径、画幅、镜头数 | Video DSL storyboard JSON | `services/agent-orchestrator/planner.mjs`，现有 deterministicPlan |
| DSL 验证 | storyboard JSON | 校验结果或清晰错误 | `packages/video-schema/index.mjs` |
| CLI 调度和缓存 | 分镜、素材、策略 | 逐镜头 UTF-8 job、状态报告 | `services/agent-orchestrator/cli.mjs` |
| 素材准备与探测 | 本地 MP4、偏移、FFprobe | 视频尺寸/时长、localhost 媒体 URL | `services/render-worker/worker.py` |
| 镜头编译 | canvas、shot、assetInfo、publicUrl | 原 version=1 Project 与 TrackSet | `services/compiler/compile-cli.mjs`、`compile.mjs`，未重写 |
| 真实设备与贴屏 | 原 GLB、设备 manifest、MediaRef | Three.js 场景和 VideoTexture | `src/devices/manifest.ts`、`GltfDevice.tsx`、`screenMaterial.ts` |
| 时间采样 | Project、t=i/fps | 设备/相机状态和视频时间 | `src/timeline/sample.ts`、`applySceneState.ts`、`screenVideo.ts` |
| 独立镜头导出 | 精确采样后的同一场景 | WebCodecs MP4 或 PNG ZIP→FFmpeg MP4 | `src/export/` 全套原模块 + Playwright bridge |
| 完整合成 | 独立镜头、文字时序、派生音乐 | final.mp4 | 原 Remotion Sequence、OffthreadVideo、Audio 与 Composition |

设备 manifest、原时间轴采样器、原 Project 存储结构、核心编译器、`src/export/` 目录中的原导出算法均保留。新逻辑没有另建时间轴，也没有重做编辑器 UI。

## 实际运行命令与结果

实测环境：Node 24.22.1、npm 11.9.0、Python 3.12.14、Playwright 1.58.0、Chrome for Testing Headless Shell 145.0.7632.6、FFmpeg/FFprobe 6.1.1、Remotion 4.0.300。渲染使用真实 WebGL2，当前环境由软件后端提供。

| 命令/检查 | 最终结果 | 证据日志（output/p0/logs/） |
| --- | --- | --- |
| `npm ci` | 退出 0，根依赖安装成功 | `01-npm-ci.log` |
| `npm run agent:doctor` | 初始缺依赖失败；最终退出 0，浏览器和 WebGL2 实启通过 | `baseline-doctor.log`、`20-doctor-fixed.log`、冒烟日志中的 Doctor |
| `npm run agent:test` | 退出 0，12/12 通过 | `35-agent-tests-final.log` |
| `npm test` | 初始退出 1：误收集 Node 测试；最终 20 文件、190/190 通过 | `baseline-test.log`、`39-tests-final.log` |
| `npm run build` | 退出 0；保留 bundle 大于 500 KB 的提示 | `38-build-final.log` |
| `npm run lint` | 退出 0；14 条警告、没有 error，并非零警告 | `40-lint-final.log` |
| `python3 -m pip install -r services/render-worker/requirements.txt` | 退出 0，固定 Playwright 1.58.0 | `44-requirements-final.log` |
| `python3 -m playwright install chromium` | CDN 下载失败，收到 HTML 而非 ZIP；未当作通过 | `04-browser-install.log`、`06-browser-pinned.log` |
| 官方 Chrome for Testing 源下载与 headless shell 探测 | 官方分发源下载成功；完整 Chrome 受本环境 Unix socket 限制；headless shell 启动和 WebGL2 成功 | `11-single-browser.log`、Doctor 与各 `.render.json` |
| Remotion 目录内 `npm install`、随后 `npm ci` | 均退出 0，已交付 lockfile | `03-remotion-install.log`、`29-remotion-ci.log` |
| `python3 -m unittest discover -s tests -p '*_test.py' -v` | 退出 0，3/3 通过 | `19-python-tests.log` |
| Python py_compile、Node --check | 通过 worker/CLI 语法检查；真实渲染也执行了代码 | 工具执行及渲染日志 |
| Remotion TypeScript 单独检查 | 首次缺 --ignoreConfig 导致命令错误；补齐参数后退出 0 | `41-remotion-typecheck.log`、`42-remotion-typecheck-final.log` |
| `agent:plan -- --offline ... --shots 3 --width 540 --height 960 --fps 30` | 退出 0，离线生成 3 镜头、450 帧 | `22-three-plan.log` |
| `npm run agent:validate` | 退出 0，totalFrames=450 | `23-three-validate.log` |
| 单镜头 `agent:render ... --compose false` | 最终退出 0，真实 5 秒 MP4 | `17-single-final-engine.log` |
| 单镜头 `agent:render ... --force-png --compose false` | 退出 0，真实 PNG→FFmpeg 备用 MP4 | `26-png-fallback.log` |
| 三镜头 `agent:render -- --storyboard work/storyboard.json --out output/film` | 初次在 Remotion 接口枚举处失败；修复后退出 0，compositor=remotion，status=DONE | `24-three-render.log`、`30-remotion-local-retry.log`、`34-remotion-audio-level.log` |
| `python3 scripts/p0-visual.py` | 退出 0，原编辑器和四机型真实采样通过 | `21-model-visuals.log` |
| `npm run agent:p0` | 退出 0；实际复用本次已经渲染的镜头，重新合成、完整解码并再次验证缓存 | `37-p0-smoke-final.log`、`output/p0-smoke/smoke-report.json` |
| 实际浏览器播放与跳转 | 单镜头、最终视频均播放成功，前约 0.5 秒测试无丢帧；成片音频有解码字节；跳转 11 秒成功 | `36-browser-playback-fixed.log`、`output/p0/final/browser-playback.json` |
| 全片 FFmpeg 解码、FFprobe、镜头顺序、音轨对比 | 通过 | `output/p0/final/validation.json`、`ffprobe.json` |

所有必要命令都实际执行过；初次失败日志没有删除。`command-results.json` 汇总退出码。首次 Doctor、Vitest、浏览器启动、模型加载、黑屏以及 Remotion 失败，均没有被当作最终验收通过。

Windows 的完整安装、Python 虚拟环境、Chrome 路径、单镜头、三镜头、缓存和冒烟命令见 [P0_WINDOWS.md](../../../../docs/P0_WINDOWS.md)。Windows 需要单独实机复测。

### 媒体验证结果

| 输出 | 编码/画幅 | FPS / 视频帧数 | 时长 |
| --- | --- | --- | --- |
| `output/single/shots/shot-001.mp4` | H.264 yuv420p，540×960 | 30 / 150 | 5.000 秒 |
| `output/png-fallback/shots/shot-001.mp4` | H.264 yuv420p，540×960 | 30 / 150 | 5.000 秒 |
| `output/film/shots/shot-001.mp4` | H.264，540×960，hero-reveal | 30 / 150 | 5.000 秒 |
| `output/film/shots/shot-002.mp4` | H.264，540×960，spin-y-360 | 30 / 150 | 5.000 秒 |
| `output/film/shots/shot-003.mp4` | H.264，540×960，tilt-in / low-hero | 30 / 150 | 5.000 秒 |
| `output/film/final.mp4` | H.264 + AAC，540×960 | 30 / 450 | 视频轨 15.000 秒；容器/音轨约 15.061 秒 |

三个镜头逐帧解码，独特帧数依次为 118、150、110。第一和第三镜头在动作结束后保持姿态，而示例录屏前 5 秒本身仅有 17 种画面，所以停留段存在相同帧，不能据此误判整个导出被冻结。第二镜头的 150 帧互不相同；旋转到背面时屏幕自然不可见，这是背面镜头，并非丢失视频纹理。

四台模型均在 0、2.5、4.966666 秒进行真实画面检查；位置、旋转、缩放改变后贴屏保持。源录屏尺寸 480×960；未发现异常镜像、倒置、结构破损或非预期遮挡。原引擎会对近似屏幕比例做轻微适配，本次没有改这套 fit 规则。

同一模型在 2.5 秒再次导出的 PNG SHA256 与第一次完全相同。四机型对应时刻的视频解码像素校验值也一致，视频时间与目标时间误差小于 0.0001 秒；这验证了材质确实使用正在采样的录屏，而非残留注册或固定截图。四机型均完成浏览器动态采样；没有为另外三台机型各导出整段 MP4。

最终片第 0、150、300 帧分别与三个镜头首帧做像素比较，最佳匹配顺序为 1→2→3。第 30、180、330 帧实查中文标题、字幕和收尾文字，没有乱码或越出画面。

音乐三个 5 秒区间均非静音；增益后的音轨与派生音乐参考在测得约 5.9 ms 编解码起始偏差对齐后，相关性约 0.99954，实际音量倍率约 0.21936，符合 DSL 的 0.22。最终双声道平均约 -36 dB、峰值约 -30 dB，没有削波；原素材保持不变。未做人工主观听感评价。

### 缓存和错误路径

实际多次复跑，三条镜头均为 `CACHED`，Remotion 仍重新合成。冒烟分镜把文案改成“智能分析 / 自动规划 / 精彩呈现”，仍命中同一组真实镜头缓存，字幕变化未重渲 3D。冒烟首次运行前从本次真实渲染结果拷贝了缓存夹具，记录于 `output/p0/smoke-cache-fixtures.json`，没有把这次冒烟说成从零重新渲染三条镜头。

修改镜头姿态、素材、模型或公共引擎代码的指纹失效已由回归测试覆盖；未再单独做一次“改一条镜头后重新渲染整片”的额外耗时试验。

缺素材实测退出 1 并写 `ASSET_MISSING` 报告；非法设备实测退出 1 并输出 `INVALID_STORYBOARD`。证据在 `output/p0/negative/`。PNG 回退为显式强制分支测试：本次浏览器实际支持原 MP4 编码，不能声称自动遇到了 MP4 不支持。备用分支确实生成 150 个连续 PNG 并编码为可播放 MP4，不是只生成 ZIP。

## 截图或 MP4 证据

交付的 Evidence ZIP 按原项目目录组织，可解压到源码旁并合并同名目录；包含真实视频和以下证据。源码 ZIP 排除了可重装依赖、dist、浏览器安装包和批量渲染临时帧。

- `output/p0/models-overview.png`：四台真实 GLB 的录屏贴屏总览。
- `output/p0/models/editor.png`：原编辑器正常启动截图。
- `output/p0/models/*-{000,075,149}.png`、`report.json`：四机型动态采样、同步和重复渲染数据。
- `output/p0/single/`：单镜头首、中、尾帧、FFprobe、逐帧 MD5 和重复帧统计。
- `output/p0/png-fallback/`：PNG/FFmpeg 备用输出的关键帧和 FFprobe。
- `output/p0/shots-keyframes.png`、`output/p0/shots/`：三条镜头首、中、尾及完整帧检查。
- `output/p0/final-overview.png`、`output/p0/final/`：字幕画面、最终 FFprobe、浏览器播放和音轨/顺序验证。
- `output/film/render-report.json`、镜头 `.render.json`、`.project.json`、`.job.json`、`.vite.log`：渲染与编译日志。
- `output/p0/logs/`、`failures/`：真实失败、修复复测、安装和测试结果。

## 已知失败/未验证

已经解决且保留证据：Vitest 错误收集、Draco 外网加载失败、StrictMode 视频黑屏、视频颜色提亮、预览 seek 竞争、Remotion 接口枚举异常、540 宽字幕过大，以及示例音乐过低。完整 Chrome 在本环境的 Unix socket 失败、Playwright CDN 返回 HTML、apt 的系统权限失败，均未被冒称为成功；最终使用官方 headless shell 与本地资源完成了核心链路。

仍有明确边界：

1. **Windows + VS Code 实机端到端未验证**。启动方式已改为直接执行 Node/Python；Windows 风格路径单元测试通过，完整 Windows 操作系统行为仍需用户机器确认。
2. 4K、60 FPS、长片、大量设备、多种录屏编码、特殊显卡驱动、透明 WebM、任意媒体偏移组合均未在本次全覆盖。
3. lint 保留 14 个警告，包括 Three.js 对象命令式修改、Fast Refresh 和 effect 状态更新提示；构建保留体积提示。这些不是“全部消除”的状态。
4. 配乐是项目现有的合成示例音乐，已验证音频内容、音量和解码；没有人工主观听评。
5. 本次未单独运行无字幕的 FFmpeg concat 兼容模式；完整验收使用的是 Remotion。该模式现在明确报告 COMPATIBILITY_ONLY。
6. 原项目的多设备布局模板命名、编辑器其余 UI 和未来智能构图能力没有扩展。

## 下一步及必要原因

先按 `P0_WINDOWS.md` 在你的 Windows 机器执行 `npm run agent:p0`，确认本地浏览器、驱动和路径配置。通过后，把自带 demo 录屏替换成一段真实软件录屏复测，因为它的尺寸、码率和编码可能不同。

源码理解、协商视频方案和录屏指导继续留在下一阶段。本次已提供可用的底层成片入口，可以在保持现有 DSL、轨道和项目结构的前提下继续开发。
