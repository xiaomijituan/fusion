// Entry bundled into the `scenario-check.mjs` release artifact: read files, print, exit.
// Every rule lives in scenario-check.ts, which is unit tested.
// Exit codes (same for review-cli.mjs, and written into ADR-0008):
//   0 = 全都合法   1 = 有内容错误（剧本不合法）   2 = 工具本身没跑成（用法错、文件读不到）
import { readFileSync } from "node:fs";
import { checkScenarioText, parseCheckArgs } from "./scenario-check.ts";

const { strict, files } = parseCheckArgs(process.argv.slice(2));

if (files.length === 0) {
  console.log("usage: node scenario-check.mjs <scenario.json> [...] [--strict]");
  process.exit(2);
}

let contentFail = false;
let ioFail = false;
for (const file of files) {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    console.log(`FAIL ${file} — 读不到这个文件 / cannot read file`);
    ioFail = true;
    continue;
  }
  const report = checkScenarioText(file, text, strict);
  for (const line of report.lines) console.log(line);
  if (report.code !== 0) contentFail = true;
}

process.exit(contentFail ? 1 : ioFail ? 2 : 0);
