import assert from "node:assert/strict";
import { test } from "node:test";
import { checkScenarioText } from "./scenario-check.ts";

// The shape the QA walk uses: two hosts, one task, three panes.
function scenarioText(over: Record<string, unknown> = {}): string {
  return JSON.stringify({
    schemaVersion: 1,
    id: "qa-mini",
    version: "0.1",
    name: "命令行走查用剧本",
    hosts: [
      { id: "ka", role: "小主机" },
      { id: "kb", role: "笔记本" },
    ],
    tasks: [
      {
        key: "t1",
        title: "把 README 的第一段改短",
        lines: { zh: ["打开仓库", "读第一段"] },
        question: {
          text: "这段留不留？",
          options: [
            { id: "keep", label: "留" },
            { id: "kill", label: "关掉" },
          ],
        },
      },
    ],
    panes: [
      { host: "ka", task: "t1" },
      { host: "kb", task: "t1", status: "blocked" },
      { host: "kb", task: "t1", status: "idle", progress: 0 },
    ],
    ...over,
  });
}

test("a legal scenario passes with one quiet line", () => {
  const report = checkScenarioText("qa-mini.json", scenarioText());
  assert.equal(report.code, 0);
  assert.deepEqual(report.lines, ["ok   qa-mini.json"]);
});

test("a bad host reference is refused, with the path and the Chinese text", () => {
  const report = checkScenarioText(
    "bad.json",
    scenarioText({ panes: [{ host: "ghost", task: "t1" }] }),
  );
  assert.equal(report.code, 1);
  const joined = report.lines.join("\n");
  assert.match(joined, /FAIL bad.json: panes\[0\]\.host/);
  assert.match(joined, /找不到主机/);
  assert.match(joined, /Unknown host/);
});

test("garbage input reports instead of throwing", () => {
  for (const text of ["not json", "", "{}", "[]"]) {
    const report = checkScenarioText("junk.json", text);
    assert.equal(report.code, 1, `应当拒绝：${JSON.stringify(text.slice(0, 12))}`);
    assert.ok(report.lines.length >= 1);
  }
});

// kill_typo is a warning, so --strict is what turns a merely smelly scenario into a failure.
test("warnings pass by default and fail under --strict", () => {
  const smelly = scenarioText({
    tasks: [
      {
        key: "t1",
        title: "把 README 的第一段改短",
        lines: { zh: ["打开仓库", "读第一段"] },
        question: {
          text: "这段留不留？",
          options: [
            { id: "kii", label: "留" },
            { id: "kill", label: "关掉" },
          ],
        },
      },
    ],
  });
  const loose = checkScenarioText("smelly.json", smelly);
  assert.equal(loose.code, 0);
  assert.match(loose.lines.join("\n"), /warn smelly.json/);

  const strict = checkScenarioText("smelly.json", smelly, true);
  assert.equal(strict.code, 1);
});
