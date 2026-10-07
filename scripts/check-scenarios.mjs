// Pre-PR check for scenario files: node scripts/check-scenarios.mjs [file...] [--strict]
// With no file arguments it checks every scenarios/*.json in the repo.
// The rules themselves live in src/cli/scenario-check.ts — the same code the release artifact
// ships — so this file cannot drift away from what 项目三 actually runs in its CI.
import { readFileSync, globSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { checkScenarioText, parseCheckArgs } from "../src/cli/scenario-check.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const { strict, files } = parseCheckArgs(process.argv.slice(2));
const targets = files.length
  ? files
  : globSync("scenarios/*.json", { cwd: root })
      .filter((f) => !f.includes("TEMPLATE"))
      .sort()
      .map((f) => root + f);

let failed = false;

for (const file of targets) {
  const label = file
    .replace(root, "")
    .replace(/^[/\\]/, "")
    .replace(/\\/g, "/");
  const report = checkScenarioText(label, readFileSync(file, "utf8"), strict);
  for (const line of report.lines) console.log(line);
  if (report.code !== 0) failed = true;
}

if (targets.length === 0) {
  console.log("no scenario files to check (only TEMPLATE.json)");
  process.exit(0);
}
process.exit(failed ? 1 : 0);
