# 接口形状：剧本扁平三导出，事件流行形状加 tick 序号

design-an-interface 并行产出六套设计后定稿。两条决定都是"表面尽量小、格式尽量早定死"。

## 剧本（Scenario）

导出面只有三个：`Scenario` 类型、`defaultScenario`、`parseScenario(raw)`（外加一个返回结构化错误的变体供 CLI 与导入 UI 用，见下）。格式**扁平**：`hosts[]` / `tasks[]` / `panes[]`，无 `extends`、无 `$ref`、无 `defs` 池、无 `capabilities` 声明。

被拒的方案与理由：可组合性（`extends` + 引用）会造出**导入顺序依赖**，让 `missing_parent` 变成用户可见错误，并且与 ADR-0005"文件即分享物"正面冲突——自包含分享优先于去重。v1 社区剧本量小时，重复的 task 文本是可接受的成本；真痛了再开 `schemaVersion` 2 讨论。

从"作者体验"方案吸收的东西全部保留：zod `.strict()` 白名单（未知键即错误，可执行载荷天然失败关闭）、**一次报全**的结构化错误（`code` / `level` / `path` / 中英双语消息 / 编辑距离 ≤2 的 did-you-mean）、`scenarios/TEMPLATE.json` 与 `npm run scenario:check` 预 PR 命令、JSON 而非 YAML（锚点与 `!!python/object` 攻击面直接消失）。

从"社区规范"方案吸收的只有一条政策：**迁移窗口只留一个大版本**（接受 `schemaVersion ∈ [CURRENT-1, CURRENT]`，更旧指向文档、更新提示升级应用），以及**导出必内联**（导出的文件永远自包含）。

归一化是这设计的承重墙：文件里文本字段可写 `"就叫编程"` 或 `{ "zh": …, "en": … }`，parse 之后一律是 `{ zh, en }`（缺 en 填 zh），pane id 由文件顺序派生，`kill` 选项缺失自动追加。于是渲染层零语言分支、事件流的 `paneId` 稳定、导出就是 `JSON.stringify`。

## 事件流

公开面：`startRun(scenarioRef)`、`advanceTickIndex()`、`record(prev, next, decision?)`、`serializeRun()`、`exportRun()`、`endRun(reason)`，外加两个只读探针 `currentSeed()` / `currentTickIndex()`。设计期说的是「三个函数」，落地是 9 个导出，差在哪：`advanceTickIndex` 与 `currentSeed` 必须公开，因为 tick 时钟和种子同时被两处需要（store 用它派生每拍 PRNG，流用它给事件盖 `n`），藏起来就会变成两份真相；`serializeRun` 只吐真实发生过的字节（可测），`exportRun` 在其上补一个合成的 `run.end{reason:"export"}` 让交付的文件是闭合的；`endRun` 公开，`pagehide` 只是它的一个调用者。跃迁由 `record` 对 prev/next 差分派生，所以将来任何新 mutation 路径（导入剧本、撤销）自动被记录；`decision` 事件排在它所引发的跃迁之前。开局不写 `run.start` 事件——header 行本身就是开局，`run.end` 才是显式事件。

**行形状在 ADR-0004 的 `{seq,t,type,paneId,payload}` 之上加一个 `n`：tick 序号，因果时钟。** 这是本 ADR 唯一改到已发布格式的地方，理由是：`t` 是墙钟、含 setInterval 抖动与后台节流，不可用于复现；而 ADR-0003 承诺的"同剧本+同种子+同决策⇒同流"要能被断言、将来回放要能对齐，就必须知道每个决策发生在第几个 tick。事后补 `n` 等于 bump `schemaVersion`，而格式是要发出去给社区和 项目三 用的。成本是一行字段。

被拒：把流做成事件溯源内核（fold 为唯一真相、store 派生）。ADR-0002 说流是唯一运行时产物，讲的是**导出物**，不是要求运行时状态由日志折叠而来；为一个 1100ms 的玩具级模拟器重写 store 换取回放能力，收益要等 项目二 才兑现。被拒之二：`subscribe` 广播层——五个消费者里现在只有两个真实存在（下载、课后笔记投影），iframe 直播等真接 项目三 时加一个 `getBytes()` 出口即可。

reload 决定：**sessionStorage 续跑同一局**（种子、seq、n 全部保留）。理由：F5 是真实事故，跨天续跑则会写出与已重置状态对不上半截流；导出仍是唯一的持久化契约（ADR-0005）。
