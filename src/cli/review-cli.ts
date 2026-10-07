// Release artifact #2 (ADR-0008): project an exported event stream into a decision table.
// This is the same projection the in-app 课后笔记 uses — a chapter page that ships a
// 掘金-friendly text version renders this instead of an iframe, and both come from one file.
import { readFileSync } from "node:fs";
import { buildReview, parseRun, type ReviewEntry } from "../lib/review";

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const file = args.find((a) => !a.startsWith("--"));

if (!file) {
  console.log("usage: node review-cli.mjs <run.jsonl> [--json]");
  process.exit(2);
}

const parsed = parseRun(readFileSync(file, "utf8"));
if (!parsed.ok) {
  for (const line of parsed.errors) console.log(`FAIL ${line}`);
  process.exit(1);
}

const doc = buildReview(parsed, null, "zh");
if (asJson) {
  console.log(JSON.stringify(doc, null, 2));
  process.exit(0);
}

const cell = (value: string | null) => (value ?? "—").replace(/\|/g, "\\|").replace(/\n/g, " ");
const caused = (entry: ReviewEntry) =>
  entry.caused.length ? entry.caused.map((c) => `${c.from}→${c.to}`).join("、") : "—";

const lines: string[] = [];
lines.push(
  `# 复盘：${doc.header.scenario.name}（seed ${doc.header.seed}，拍板 ${doc.entries.length} 次，` +
    `${doc.ticks} 拍，${doc.durationMs} ms，结束于 ${doc.end?.reason ?? "未结束"}）`,
);
lines.push("");
if (!doc.known) {
  lines.push(
    "> 这份事件流没带剧本快照，只能显示 paneId 与 optionId / no inlined snapshot in the header",
  );
  lines.push("");
}
lines.push("| # | 第几拍 | 哪一格 | 问到什么 / 派了什么活 | 你选的 | 它引发的跃迁 |");
lines.push("| -- | -- | -- | -- | -- | -- |");
for (const entry of doc.entries) {
  lines.push(
    `| ${entry.seq} | n=${entry.n} | ${entry.paneId} | ${cell(entry.prompt)} | ` +
      `${cell(entry.optionLabel ?? entry.optionId)} | ${caused(entry)} |`,
  );
}
lines.push("");
lines.push(`其余 ${doc.ambient} 条是环境跃迁，不由你的拍板引发。`);
console.log(lines.join("\n"));
