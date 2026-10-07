// The projection behind the `review-cli.mjs` release artifact (ADR-0008): one exported event
// stream in, a decision table out. Separate from its entry so the shape is testable.
import { buildReview, parseRun, type ReviewEntry } from "../lib/review.ts";

export type RunReport = { code: 0 | 1; lines: string[] };

/**
 * argv → one file plus --json. Extra positional args are refused rather than ignored: a reader
 * who typed two paths deserves to hear that only one was read.
 */
export function parseReviewArgs(
  argv: string[],
): { ok: true; file: string; json: boolean } | { ok: false; reason: string } {
  const files = argv.filter((a) => !a.startsWith("--"));
  if (files.length === 0) return { ok: false, reason: "要给一个 .jsonl 事件流文件" };
  if (files.length > 1)
    return {
      ok: false,
      reason: `只读一个文件，多给了 ${files.length} 个：${files.join("、")}`,
    };
  return { ok: true, file: files[0]!, json: argv.includes("--json") };
}

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
