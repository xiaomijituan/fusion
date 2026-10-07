// The projection behind the `review-cli.mjs` release artifact (ADR-0008): one exported event
// stream in, a decision table out. Separate from its entry so the shape is testable.
import { buildReview, parseRun, type ReviewEntry } from "../lib/review.ts";

export type RunReport = { code: 0 | 1; lines: string[] };

const cell = (value: string | null) => (value ?? "—").replace(/\|/g, "\\|").replace(/\n/g, " ");
const caused = (entry: ReviewEntry) =>
  entry.caused.length ? entry.caused.map((c) => `${c.from}→${c.to}`).join("、") : "—";

export function projectRun(text: string, options: { json?: boolean } = {}): RunReport {
  const parsed = parseRun(text);
  if (!parsed.ok) return { code: 1, lines: parsed.errors.map((line) => `FAIL ${line}`) };

  const doc = buildReview(parsed, null, "zh");
  if (options.json) return { code: 0, lines: [JSON.stringify(doc, null, 2)] };

  const lines: string[] = [];
  lines.push(
    `# 复盘：${doc.header.scenario.name}（seed ${doc.header.seed}，拍板 ${doc.entries.length} 次，` +
      `${doc.ticks} 拍，${doc.durationMs} ms，结束于 ${doc.end?.reason ?? "未结束"}）`,
    "",
  );
  if (!doc.known) {
    lines.push(
      "> 这份事件流没带剧本快照，只能显示 paneId 与 optionId / no inlined snapshot in the header",
      "",
    );
  }
  lines.push("| # | 第几拍 | 哪一格 | 问到什么 / 派了什么活 | 你选的 | 它引发的跃迁 |");
  lines.push("| -- | -- | -- | -- | -- | -- |");
  for (const entry of doc.entries) {
    lines.push(
      `| ${entry.seq} | n=${entry.n} | ${entry.paneId} | ${cell(entry.prompt)} | ` +
        `${cell(entry.optionLabel ?? entry.optionId)} | ${caused(entry)} |`,
    );
  }
  lines.push("", `其余 ${doc.ambient} 条是环境跃迁，不由你的拍板引发。`);
  return { code: 0, lines };
}
