// The check behind the `scenario-check.mjs` release artifact (ADR-0008). Kept separate from
// src/cli/scenario-check-main.ts so the contract is testable without spawning a process.
import { parseScenario, type ScenarioIssue } from "../lib/scenario.ts";

export type CheckReport = { code: 0 | 1; lines: string[] };

/** Validate one scenario document. `strict` turns warnings into a failure. */
export function checkScenarioText(label: string, text: string, strict = false): CheckReport {
  const result = parseScenario(text);
  if (result.ok && result.warnings.length === 0) return { code: 0, lines: [`ok   ${label}`] };
  const issues: ScenarioIssue[] = result.ok ? result.warnings : result.errors;

  const lines: string[] = [];
  for (const issue of issues) {
    const where = issue.path ? `${label}: ${issue.path}` : label;
    lines.push(`${issue.level === "error" ? "FAIL" : "warn"} ${where} — ${issue.zh}`);
    lines.push(`     ${issue.en}`);
    if (issue.suggest) lines.push(`     ↳ ${issue.suggest.zh} / ${issue.suggest.en}`);
  }
  const failed = !result.ok || strict;
  return { code: failed ? 1 : 0, lines };
}
