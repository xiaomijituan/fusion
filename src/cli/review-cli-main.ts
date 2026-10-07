// Entry bundled into the `review-cli.mjs` release artifact: read one .jsonl, print, exit.
// The projection itself lives in review-cli.ts and is unit tested.
// Exit codes (same for scenario-check.mjs, and written into ADR-0008):
//   0 = 排出来了   1 = 文件不是合法事件流   2 = 用法错、文件读不到
import { readFileSync } from "node:fs";
import { parseReviewArgs, projectRun } from "./review-cli.ts";

const args = parseReviewArgs(process.argv.slice(2));
if (!args.ok) {
  console.log(`usage: node review-cli.mjs <run.jsonl> [--json]\nFAIL ${args.reason}`);
  process.exit(2);
}

let text: string;
try {
  text = readFileSync(args.file, "utf8");
} catch {
  console.log(`FAIL ${args.file} — 读不到这个文件 / cannot read file`);
  process.exit(2);
}

const report = projectRun(text, { json: args.json });
for (const line of report.lines) console.log(line);
process.exit(report.code);
