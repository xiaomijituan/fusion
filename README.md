# 聚变 Fusion

> 千万亿点星光——聚变。

**Fusion 是一个多 agent 编码工作流的交互式教学模拟器**：一块 16 个 pane 的"机房"地板上，一群 coding agent 在干活——有的卡住举手提问，有的完成待 review。你不需要打字写代码，你的工作是**拍板**：回答、下发、关掉。

灵感来自 DHH 在 Lex Fridman 访谈里展示的 16-session 工作流——别再叫 Agentic Engineering 了。

## 现在能玩什么

- **机房**：5 台机器 / 16 个 pane 实时演化，agent 会自己推进、卡住、完成
- **卡点决策**：blocked 的 agent 给你出选择题，Enter 即拍板
- **下发**：给空闲 pane 一句话任务，看它接住
- **剧本库**：粘贴或拖入一份剧本 JSON，机房就换成它（`scenarios/six-desk.json` 是 6 格样例）；写错的字段会一次全报，带路径、中英双行、"是否想写 X"
- **导出这一局**：点一下拿到 `.jsonl` 事件流——header 带剧本、随机种子与版本，正文只记你的决策与状态跃迁
- **可复现**：环境推进走带种子的伪随机数，同剧本 + 同种子 + 同决策 ⇒ 同一份事件流
- **课后笔记**：把事件流排成一页可打印的复盘——每个决策当时被问到什么、你选了什么、之后那个 pane 走到了哪；别人发给你的 `.jsonl` 也能直接打开成笔记（ADR-0007）
- **中英双语**：一键切换；剧本只写中文也合法（英文界面回退中文）
- 键盘流：`j/k` 选 pane · `n` 跳到等待中的 agent · `1/2/3/4` 切视图 · `?` 看全部快捷键

## 跑起来

```bash
npm install
npm run dev -- --port 5273
# 打开 http://127.0.0.1:5273/

npm run scenario:check        # 校验 scenarios/ 下的剧本
node output/qa-local.mjs http://127.0.0.1:5273/   # 33 项浏览器走查（CI 跑同一套）
```

## 写一份剧本

格式规范见 [docs/scenario-format.md](./docs/scenario-format.md)，最短合法剧本见 [scenarios/TEMPLATE.json](./scenarios/TEMPLATE.json)（12 行）。提交前跑 `npm run scenario:check -- 你的.json`。导出的 `.jsonl` 事件流也有对外规范：[docs/event-stream-format.md](./docs/event-stream-format.md)——项目三的手册章节按这两份规范读写。

## 路线

版本号只有一个来源：[src/lib/version.ts](./src/lib/version.ts)，现在是 `0.1.0`。0.1.0 已落地：可导入的**剧本（Scenario）**、可导出的**事件流**（JSONL 决策时间线）、带种子的确定性推进、剧本库与切换，以及**课后笔记**——事件流的第一个投影，只读流、不新增记录源；章节页嵌入用的 **postMessage 注入端点**与三个 release 资产（离线单文件模拟器、剧本校验器、事件流投影器）同批落地（ADR-0002 / ADR-0007 / ADR-0008）。设计定稿见 [CONTEXT.md](./CONTEXT.md) 与 [docs/adr/](./docs/adr/)。

下一步：更多社区剧本，以及把这套格式交给 项目三 的中文手册嵌入（一个 `.jsonl` 就能排出一页讲义）。

三项目一体：**Fusion 模拟器**（本仓库）· 真 agent 仪表盘 · 中文可运行手册——同一条星光，各自聚变。

## 声明

- 无账号、无后端、无数据库：状态全在你的浏览器里
- 教学模拟，不接真实 agent；真实编排是后续独立仓库的事
- 代码、剧本与两份格式规范都用 **MIT**（见 [LICENSE](./LICENSE)），随便用，带上版权声明就行
- 受 DHH on Lex Fridman 启发；与 37signals、Herdr、Omarchy 无关联
