import assert from "node:assert/strict";
import { test } from "node:test";
import { projectRun } from "./review-cli.ts";

const snapshot = {
  panes: [{ id: "a1", task: "t1" }],
  tasks: [
    {
      key: "t1",
      title: { zh: "把第一段改短", en: "Shorten the first paragraph" },
      question: {
        text: { zh: "这段留不留？", en: "Keep this paragraph?" },
        options: [
          { id: "keep", label: { zh: "留", en: "Keep" } },
          { id: "kill", label: { zh: "关掉", en: "Close" } },
        ],
      },
    },
  ],
};

const header = {
  schemaVersion: 1,
  runId: "r-cli",
  scenario: { name: "cli-demo", version: "0.1" },
  seed: 7,
  startedAt: "2026-10-04T00:00:00.000Z",
  appVersion: "0.1.0",
  snapshot,
};

function stream(...rows: unknown[]): string {
  return [header, ...rows].map((r) => JSON.stringify(r)).join("\n") + "\n";
}

test("a real run projects into a markdown decision table", () => {
  const out = projectRun(
    stream(
      {
        seq: 1,
        t: 1200,
        n: 2,
        type: "decision",
        paneId: "a1",
        payload: { kind: "answer", optionId: "keep" },
      },
      {
        seq: 2,
        t: 1210,
        n: 2,
        type: "transition",
        paneId: "a1",
        payload: { from: "blocked", to: "working" },
      },
    ),
  );
  assert.equal(out.code, 0);
  const text = out.lines.join("\n");
  assert.match(text, /\| # \| 第几拍 \| 哪一格 \|/);
  assert.match(text, /这段留不留？/);
  assert.match(text, /\| 留 \|/);
  assert.match(text, /blocked→working/);
  assert.match(text, /cli-demo（seed 7/);
});

test("--json hands back the projection itself, not prose", () => {
  const out = projectRun(
    stream({
      seq: 1,
      t: 10,
      n: 1,
      type: "decision",
      paneId: "a1",
      payload: { kind: "dispatch", optionId: "dispatch", text: "把 changelog 排一页 PDF" },
    }),
    { json: true },
  );
  assert.equal(out.code, 0);
  const doc = JSON.parse(out.lines.join("\n"));
  assert.equal(doc.header.runId, "r-cli");
  assert.equal(doc.entries.length, 1);
  assert.equal(doc.entries[0].prompt, "把 changelog 排一页 PDF");
});

// This is the hole the artifacts would have shipped with: a scenario file has a schemaVersion too,
// so "is it JSON with a version" is not enough to accept a run.
test("a scenario file is refused as an event stream", () => {
  const out = projectRun(JSON.stringify({ schemaVersion: 1, id: "x", version: "0.1", name: "n" }));
  assert.equal(out.code, 1);
  assert.match(out.lines.join(" "), /不是事件流 header/);
});

test("an empty file and a non-JSON first line both fail", () => {
  for (const text of ["", "   \n", "not json\n"]) {
    const out = projectRun(text);
    assert.equal(out.code, 1, `应当拒绝：${JSON.stringify(text)}`);
  }
});

test("without an inlined snapshot the table still prints, and says what is missing", () => {
  const bare = { ...header } as Record<string, unknown>;
  delete bare.snapshot;
  const out = projectRun(
    `${JSON.stringify(bare)}\n${JSON.stringify({
      seq: 1,
      t: 5,
      n: 1,
      type: "decision",
      paneId: "a1",
      payload: { kind: "answer", optionId: "keep" },
    })}\n`,
  );
  assert.equal(out.code, 0);
  const text = out.lines.join("\n");
  assert.match(text, /没带剧本快照/);
  assert.match(text, /\| a1 \|.*\| keep \|/);
});
