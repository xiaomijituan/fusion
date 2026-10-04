# 聚变 / Fusion（原 就叫编程 / Just Programming）— 领域词表

本仓库（项目一）的目标：**开源教学模拟器 + 剧本格式规范**。真实 agent 编排（项目二）与中文可运行手册（项目三）各在独立仓库，见 `docs/adr/0001-one-repo-per-project.md`。

> 状态：设计问答已全部落定（Q1–Q11），本词表即结论。

## Language

已确认（Q3）

**Scenario（剧本）**:
一个可版本化、可导入的 authored 文件：pane 布局、任务、卡点问题与选项、初始状态。社区贡献的单位。
_Avoid_: 任务包、场景、scenario 模板

**Run（一局）**:
某人加载一个 Scenario 后的一次播放实例，产出事件流（见 ADR-0002）。
_Avoid_: 会话、session（与 tmux session 撞词）

**Decision（决策）**:
Run 中一次人的介入：回答卡点问题、下发任务（Dispatch）、关掉 pane。事件流的主要来源。
_Avoid_: 操作、交互

**Task**:
Scenario 内部单元——一个 pane 的一条工作项（台词、卡点问题、选项）。
_Avoid_: 用"任务"指下发的一句话

**Dispatch**:
一种 Decision：把一句话任务下发给 idle/done 的 pane。
_Avoid_: 用"任务"指 Dispatch

已确认（来自 ADR）

**事件流 / 决策时间线**:
Run 的追加式结构化记录，唯一运行时产物；课后笔记与未来评分都是它的投影。v1 不含"对错"概念。格式（ADR-0004）：JSONL——header 行（含独立整数 `schemaVersion`、seed、剧本名与版本）+ 事件行（Run 起止、状态跃迁、Decision），不记逐 tick。接口形状与 `n`（tick 序号）的来由见 ADR-0006。

**出厂默认剧本**:
今天写死在 `src/lib/content.ts` 里的那套内容（16 任务 / 5 台机器 / 16 pane）。已确认边界："16 pane / 5 台机器"是这份出厂剧本的属性，不是 Scenario 概念的属性——6 pane 剧本合法。

已确认（Q4 · schema 边界）

**Scenario 文件约束**:
pane 数/机器数可变，由数组长度决定（软帽 24 pane）；文案 zh 必填、en 选填（缺 en 回退 zh）；顶层 `schemaVersion`（整数，格式版本，规范管）+ `version`（字符串，作者内容版本）分开。

已确认（Q6 · 导入与信任边界）

**导入**:
v1 只有粘贴文本 + 拖/选本地文件两条路，不做 URL fetch。导入即 zod schema 校验，白名单字段，尺寸帽（单文件 ≤ 512KB，总 ≤ 2MB），存 localStorage `scenarios`。剧本严格是数据：永不 eval、永不注 DOM、台词只走 React 文本转义。

已确认（Q8–Q11 · 快车道）

**社区剧本库**:
本仓 `scenarios/` 目录 + PR 贡献；格式规范文档 `docs/scenario-format.md`（发布物，README 链接）。出厂默认剧本导出为该目录第一份文件。不建独立 index 仓库——量大了再拆。

**文件即分享物**:
无排行榜、无账号、无后端（ADR-0005）。剧本文件与导出的 JSONL 事件流本身就是可传播工件。

**项目三章节**:
内容单元 = 一段正文 + 一个可玩 Scenario；嵌入方式 iframe + postMessage 注入剧本 JSON（不触发 URL fetch）。仓库形态/技术栈留给项目三开工时定（倾向静态站），不属本仓词表。

## Relationships

- 一个 **Scenario** 可被反复加载，产生多个 **Run**
- 一个 **Run** 由零个或多个 **Decision** 与状态跃迁组成，全部追加进它的事件流
- 一个 **Run** 携带一个随机种子（ADR-0003）：同剧本 + 同种子 + 同决策序列 ⇒ 同事件流
- **Decision** 属于恰好一个 **Run**，并引用 **Scenario** 里的一个卡点
- 课后笔记 / 评分 / 项目二的决策日志 = **事件流** 的导出投影，不是新的记录源

## Example dialogue

> **Dev:** "学员导入一个只有 6 个 pane 的**剧本**，跑完点导出，我们给他什么？"
> **Domain:** "那个**剧本**合法——16 pane 只是**出厂默认剧本**的属性，不是 Scenario 概念的。导出的是这一**局**的**事件流**：他做的每个**决策**、当时 pane 的状态、以及后果。至于是他答对了还是教得不好，v1 不判断。"

## Flagged ambiguities

已解决（Q3）：剧本/任务包 → 统一为 Scenario，废掉"任务包"；"任务"双义 → Task（Scenario 内部单元）与 Dispatch（一种 Decision），见上。

已解决（Q8–Q11 快车道）：项目三"**场景模板**" = Scenario 的一种用途（章节绑定的可玩剧本），不是新概念，废掉该词。

仍开放：

- "**决策日志**"在项目一叫事件流、在项目二叫 decision log，是否同一份格式（ADR-0002 假定同源）待项目二开工时确认。
