# 课后笔记是事件流的投影，导出内联剧本快照

一页复盘要写清"当时被问到什么、你选了什么、之后发生了什么"，而事件流按 ADR-0004 只记
`paneId` 与 `optionId`——文案在剧本里。于是两条路：笔记去读应用当前加载的剧本（那别人发给你的
`.jsonl` 单独就排不出笔记），或者把笔记需要的字段内联进导出文件。

决定：**导出时在 header 增加可选的 `snapshot` 字段**，只含 `panes[{id, task}]` 与
`tasks[{key, title, question:{text, options}}]`——不含进度台词与主机描述。
`buildReview(run, scenario, lang)` 优先用显式传入的剧本（本机正跑着的一局），否则用 header 里的
快照（外来文件），两者都没有就退化成只显示 id 并给出提示。这是**加字段，不是改格式**：事件流的
`schemaVersion` 仍是 1，旧文件照样能出笔记，只是没有文案。

## Considered Options

- **内联整份剧本**（含 `lines` / `hosts`）：header 单行涨到 ~28 KB，而笔记一行都用不到那些字段。
- **笔记直接读 store 里的 agents 状态**：那就有了第二个记录源，违 ADR-0002。
- **每个事件行都带全文案**：剧本一改版，历史流就和现在的文案对不上；重复存也不是投影。

## Consequences

- `src/components/review-view.tsx` 只吃 `serializeRun()` 的文本，不写任何存储；它渲染的是**打开
  那一刻**的快照——机房还在跑，印出来的那页不会边印边变。
- 打印样式在 `src/styles.css` 的 `@media print`：隐去头部与操作按钮，配色翻成纸面黑白，条目
  不跨页断（`break-inside: avoid`）。
- 导出的文件自此可自解释：项目三拿一个 `.jsonl` 就能排出一页讲义，不必同时拿到剧本。
- ADR-0004 的 header 字段表以本文为准增补 `snapshot?`；`docs/scenario-format.md` 不受影响
  （剧本格式与事件流格式各有版本，见 ADR-0004）。
