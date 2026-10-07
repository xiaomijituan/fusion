// Entry bundled into the `scenario-check.mjs` release artifact: read files, print, exit.
// Every rule lives in scenario-check.ts, which is unit tested.
import { readFileSync } from "node:fs";
import { checkScenarioText } from "./scenario-check.ts";

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const files = args.filter((a) => !a.startsWith("--"));

if (files.length === 0) {
  console.log("usage: node scenario-check.mjs <scenario.json> [...] [--strict]");
  process.exit(2);
}

let failed = false;
for (const file of files) {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    console.log(`FAIL ${file} — 读不到这个文件 / cannot read file`);
    failed = true;
    continue;
  }
  const report = checkScenarioText(file, text, strict);
  for (const line of report.lines) console.log(line);
  if (report.code !== 0) failed = true;
}

process.exit(failed ? 1 : 0);
