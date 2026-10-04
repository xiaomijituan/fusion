# 事件流格式：JSONL，只记离散事件，独立 schemaVersion

导出的一局（Run）要可复现、可流式解析、可 diff。决定：事件流用 **JSONL**——首行 header，后续一行一事件；**只记离散事件，不记每个 tick**，因为 ADR-0003 的带种子 PRNG 已使 tick 可从种子复现，逐 tick 记录是纯噪音（16 pane × ~1Hz）。

- **Header**：`{schemaVersion, runId, scenario:{name, version}, seed, startedAt, appVersion}`
- **事件行**：`{seq, t(相对开局 ms), n(tick 序号·因果时钟), type, paneId, payload}`（`n` 由 ADR-0006 补入：`t` 是墙钟、含节流抖动，不可用于复现与回放对齐）
- **记录清单**：Run 开始/结束；状态跃迁（working→blocked、blocked→working、→done、done→idle、idle→working）；每个 Decision（answer / dispatch / kill，含所选选项）。
- **版本**：事件流有自己的整数 `schemaVersion`，与剧本文件的 `schemaVersion` 互不绑定——两份规范演进节奏不同。

## Consequences

- "同剧本 + 同种子 + 同决策序列 ⇒ 同事件流"的重放承诺由 header 里的 seed + Decision 事件行完整承载。
- 未来评分/笔记/项目二 decision log 都从这份 JSONL 投影（ADR-0002），不得另立记录源。
- 若日后需要逐 tick 精度（如性能研究），加事件类型即可，不必推翻格式。
