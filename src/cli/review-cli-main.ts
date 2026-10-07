// Entry bundled into the `review-cli.mjs` release artifact: read one .jsonl, print, exit.
// The projection itself lives in review-cli.ts and is unit tested.
import { readFileSync } from "node:fs";
import { projectRun } from "./review-cli.ts";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));

if (!file) {
  console.log("usage: node review-cli.mjs <run.jsonl> [--json]");
  process.exit(2);
}

let text: string;
try {
  text = readFileSync(file, "utf8");
} catch {
  console.log(`FAIL ${file} — 读不到这个文件 / cannot read file`);
  process.exit(2);
}

const report = projectRun(text, { json: args.includes("--json") });
for (const line of report.lines) console.log(line);
process.exit(report.code);
