// Pre-PR check for scenario files: node scripts/check-scenarios.mjs [file...] [--strict]
// With no file arguments it checks every scenarios/*.json in the repo.
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseScenario } from "../src/lib/scenario.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const args = process.argv.slice(2);
const strict = args.includes("--strict");
const files = args.filter((a) => !a.startsWith("--"));
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
  const result = parseScenario(readFileSync(file, "utf8"));
  const issues = result.ok ? result.warnings : result.errors;
  if (result.ok && issues.length === 0) {
    console.log(`ok   ${label}`);
    continue;
  }
  for (const issue of issues) {
    const where = issue.path ? `${label}: ${issue.path}` : label;
    console.log(`${issue.level === "error" ? "FAIL" : "warn"} ${where} — ${issue.zh}`);
    console.log(`     ${issue.en}`);
    if (issue.suggest) console.log(`     ↳ ${issue.suggest.zh} / ${issue.suggest.en}`);
  }
  if (!result.ok || strict) failed = true;
}

if (targets.length === 0) {
  console.log("no scenario files to check (only TEMPLATE.json)");
  process.exit(0);
}
process.exit(failed ? 1 : 0);
