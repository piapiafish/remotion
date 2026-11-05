# 新手界面与动画改造规划依据

日期：2026-11-02，北京时间。工作目录：`D:\remotion\p0\MultiAgent-3D-Promo-Studio`。范围：用户要求编写规划；本轮只核对已有实现、记录需求与更新文档，没有实施应用功能。

唯一任务及详细执行规则位于 [IMPLEMENTATION_ROADMAP.md](../../../IMPLEMENTATION_ROADMAP.md) 的 P1-10～18；本报告仅记录核对依据、用户选择和本轮检查，不另建任务总表。

## 用户确认

- 画布内有选中对象时，滚轮始终缩放该对象；点击空白取消选中后才调整相机远近。不采用按鼠标悬停位置分流的方案。
- 新增文字为固定在画面上的二维标题，可移动和设置关键帧；不随相机转动或被手机遮挡。
- 其余需求已覆盖到唯一计划：模板启动页、独立手机设置、对象/环境整合、直接画布操作、单对象一行时间轴、移除逐秒预览及多余工具、全中文、实际景深与动态模糊、关键帧过渡及易选。

## 源码核对结果

| 核对位置 | 本轮观察及其规划影响 |
| --- | --- |
| `src/App.tsx`、`ui/Templates/TemplatePicker.tsx` | 模板当前位于主侧栏；对象、相机、背景、环境、文字和效果分散。可复用现有模板数据创建独立入口 |
| `ui/Inspector/DeviceSection.tsx`、`store/project.ts` | 素材、填充、颜色已有设备级操作；当前活动选择以设备索引表示，需要补空选择及文字对象选择 |
| `scene/Stage.tsx`、`ui/Artboard/Artboard.tsx` | 当前相机控制依赖 Orbit 工具，画布显示 Select/Move/Rotate/Scale/Orbit；新交互需改事件归属，不能只删按钮 |
| `ui/Timeline/TimelineBar.tsx`、`timeline/editing.ts` | 当前按设备/相机切换目标并显示属性通道；聚合对象键需同时调整选择、整组改时/删除与快捷键 |
| `src/App.css` | 关键帧按钮宽高均为 9 像素；支持用户反馈的易选问题，但本轮未做真实浏览器命中测量 |
| `timeline/sample.ts`、`tracks.ts` | 采样已有区间时长归一化和连续插值；单键是静态值。不能直接认定固定时长为根因，需复现改时链路及显式动画启用语义 |
| `store/schema.ts`、`projectValidation.ts` | 当前无文字和效果配置，工程要求至少一台设备；新对象与纯文字/空场景需补兼容、校验和保存恢复 |
| `export/frameRenderer.ts`、`scene/SceneDriver.tsx` | 预览与导出共享采样，背景为独立合成；标题及后处理必须同时进入公共链路，避免只在界面显示 |
| 当前 Three.js 本地安装文件 | 有景深和后处理示例文件；本工程尚未验证其透明、色彩、性能及资源恢复，不记为已实现效果 |

MAN-012 为用户报告的改时/过渡症状，根因待复现；MAN-013 记录关键帧易选；UX-001 记录界面需求。MAN-010 中画面文字与两种效果由原后置范围提升为本轮明确需求。所有开发顺序仍只在唯一计划维护。

## 本轮修改与验证边界

修改四份正式文档：工作计划、问题表、开发日志、当前报告入口。备份见 [planning-context.json](planning-context.json)，原始文档以 `.original` 后缀保存在对应 archive 目录。新增本目录的核对证据；未修改运行源码、依赖、素材、用户工程或旧验证报告。

- 源码/配置基线：[source-before.json](source-before.json)。前后比对及需求覆盖检查：[planning-review.json](planning-review.json)。
- 本轮执行文档检查 `scripts/check-project-docs.py`，命令/退出码/耗时见 [validation-command.json](validation-command.json)，结果见 [document-check.json](document-check.json)。只运行默认文档检查，不使用旧组织基线 `--integrity`。
- 文档检查工具固定写入的旧 `reports/current/document-check.json` 在取得本轮结果后恢复原字节；本轮输出单独保存。
- 功能测试、构建、新浏览器检查、实际导出和人工验收均为 **NOT_RUN**。当前 P1-07～09 的实际版本及原轮次结果见 [应用报告](../p107-p109-writeback-20261102/README.md)，不借用其通过数表示新增规划已完成。

规划完成只表示功能范围、顺序、兼容性和验收规则已经明确；实施从 P1-10 的症状复现开始。
