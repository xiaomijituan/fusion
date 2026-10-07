// Release artifact #1 (ADR-0008): validate a scenario file with nothing but node.
// scripts/build-artifacts.mjs bundles this into a single `scenario-check.mjs` — a handbook
// repo downloads that file in CI and never reads fusion's source.
import { readFileSync } from "node:fs";
import { parseScenario, type ScenarioIssue } from "../lib/scenario";

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
  const result = parseScenario(text);
  const issues: ScenarioIssue[] = result.ok ? result.warnings : result.errors;
  if (result.ok && issues.length === 0) {
    console.log(`ok   ${file}`);
    continue;
  }
  for (const issue of issues) {
    const where = issue.path ? `${file}: ${issue.path}` : file;
    console.log(`${issue.level === "error" ? "FAIL" : "warn"} ${where} — ${issue.zh}`);
    console.log(`     ${issue.en}`);
    if (issue.suggest) console.log(`     ↳ ${issue.suggest.zh} / ${issue.suggest.en}`);
  }
  if (!result.ok || strict) failed = true;
}

process.exit(failed ? 1 : 0);
