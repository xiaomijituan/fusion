import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { parseScenario } from "./scenario.ts";
import { buildReview, parseRun, snapshotFor } from "./review.ts";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..", "..");

type Line = Record<string, unknown>;

function stream(lines: Line[]): string {
  return `${lines.map((l) => JSON.stringify(l)).join("\n")}\n`;
}

const header = {
  schemaVersion: 1,
  runId: "r-test",
  scenario: { name: "six-desk", version: "0.1.0" },
  seed: 7,
  startedAt: "2026-10-04T00:00:00.000Z",
  appVersion: "0.1.0",
};

function decision(seq: number, n: number, t: number, paneId: string, payload: Line): Line {
  return { seq, t, n, type: "decision", paneId, payload };
}

function transition(seq: number, n: number, t: number, paneId: string, from: string, to: string) {
  return { seq, t, n, type: "transition", paneId, payload: { from, to } };
}

const parsedSixDesk = parseScenario(readFileSync(join(ROOT, "scenarios", "six-desk.json"), "utf8"));
if (!parsedSixDesk.ok) {
  throw new Error(`six-desk fixture must be legal: ${JSON.stringify(parsedSixDesk.errors)}`);
}
const sixDesk = parsedSixDesk.scenario;
const deskPane = sixDesk.panes.find((p) => p.status === "blocked") ?? sixDesk.panes[0]!;
const deskTask = sixDesk.tasks.find((t) => t.key === deskPane.task)!;
const deskOption = deskTask.question.options.find((o) => o.id !== "kill")!;

test("parseRun rejects a file whose first line is not JSON", () => {
  const out = parseRun("not json\n");
  assert.equal(out.ok, false);
  if (!out.ok) assert.match(out.errors.join(" "), /1/);
});

test("parseRun rejects a first line that is JSON but not a header", () => {
  const out = parseRun(stream([{ seq: 1, type: "transition" }]));
  assert.equal(out.ok, false);
  if (!out.ok) assert.ok(out.errors.length >= 1);
});

test("parseRun refuses a stream newer than this build understands", () => {
  const out = parseRun(stream([{ ...header, schemaVersion: 9 }]));
  assert.equal(out.ok, false);
  if (!out.ok) assert.match(out.errors.join(" "), /升级|upgrade/i);
});

test("parseRun keeps events in file order and drops blank lines", () => {
  const text = `${JSON.stringify(header)}\n${JSON.stringify(transition(1, 0, 10, "a1", "working", "blocked"))}\n\n`;
  const out = parseRun(text);
  assert.equal(out.ok, true);
  if (out.ok) {
    assert.equal(out.header.runId, "r-test");
    assert.equal(out.events.length, 1);
    assert.equal(out.events[0]?.paneId, "a1");
  }
});

test("a decision owns the transitions that follow it until the next decision", () => {
  const out = parseRun(
    stream([
      header,
      decision(1, 3, 100, deskPane.id, { kind: "answer", optionId: deskOption.id }),
      transition(2, 3, 120, deskPane.id, "blocked", "working"),
      transition(3, 9, 900, deskPane.id, "working", "done"),
      decision(4, 12, 1200, "a2", { kind: "answer", optionId: "x" }),
    ]),
  );
  assert.equal(out.ok, true);
  if (!out.ok) return;
  const doc = buildReview(out, null, "zh");
  assert.equal(doc.entries.length, 2);
  const first = doc.entries[0]!;
  assert.equal(first.paneId, deskPane.id);
  assert.deepEqual(
    first.caused.map((c) => `${c.from}->${c.to}`),
    ["blocked->working", "working->done"],
  );
});

test("transitions before any decision are ambient, not entries", () => {
  const out = parseRun(
    stream([
      header,
      transition(1, 1, 50, "a1", "idle", "working"),
      transition(2, 2, 90, "a2", "working", "blocked"),
    ]),
  );
  assert.equal(out.ok, true);
  if (!out.ok) return;
  const doc = buildReview(out, null, "zh");
  assert.equal(doc.entries.length, 0);
  assert.equal(doc.ambient, 2);
});

test("the note resolves question and option text from the inlined snapshot alone", () => {
  const out = parseRun(
    stream([
      { ...header, snapshot: snapshotFor(sixDesk) },
      decision(1, 3, 100, deskPane.id, { kind: "answer", optionId: deskOption.id }),
      transition(2, 3, 120, deskPane.id, "blocked", "working"),
    ]),
  );
  assert.equal(out.ok, true);
  if (!out.ok) return;
  const doc = buildReview(out, null, "zh");
  const entry = doc.entries[0]!;
  assert.equal(doc.known, true);
  assert.equal(entry.prompt, deskTask.question.text.zh);
  assert.equal(entry.optionLabel, deskOption.label.zh);
  assert.equal(entry.taskTitle, deskTask.title.zh);
});

test("a stream without snapshot and without scenario degrades to ids, never crashes", () => {
  const out = parseRun(
    stream([header, decision(1, 1, 10, "a1", { kind: "answer", optionId: "nope" })]),
  );
  assert.equal(out.ok, true);
  if (!out.ok) return;
  const doc = buildReview(out, null, "zh");
  assert.equal(doc.known, false);
  assert.equal(doc.entries[0]!.optionLabel, null);
  assert.equal(doc.entries[0]!.prompt, null);
});

test("an explicitly passed scenario fills in what the snapshot lacks", () => {
  const out = parseRun(
    stream([header, decision(1, 1, 10, deskPane.id, { kind: "answer", optionId: deskOption.id })]),
  );
  assert.equal(out.ok, true);
  if (!out.ok) return;
  const doc = buildReview(out, sixDesk, "en");
  assert.equal(doc.known, true);
  assert.equal(doc.entries[0]!.optionLabel, deskOption.label.en);
});

test("a dispatch decision shows the dispatched line as its prompt", () => {
  const out = parseRun(
    stream([
      header,
      decision(1, 4, 10, "a3", { kind: "dispatch", optionId: "dispatch", text: "把门禁补上" }),
    ]),
  );
  assert.equal(out.ok, true);
  if (!out.ok) return;
  const doc = buildReview(out, null, "zh");
  assert.equal(doc.entries[0]!.kind, "dispatch");
  assert.equal(doc.entries[0]!.prompt, "把门禁补上");
});

test("choosing the kill option is reported as its own kind", () => {
  const out = parseRun(
    stream([header, decision(1, 2, 10, "a1", { kind: "kill", optionId: "kill" })]),
  );
  assert.equal(out.ok, true);
  if (!out.ok) return;
  assert.equal(buildReview(out, null, "zh").entries[0]!.kind, "kill");
});

test("the summary counts ticks, wall-clock duration and how the run ended", () => {
  const out = parseRun(
    stream([
      header,
      decision(1, 5, 100, "a1", { kind: "answer", optionId: "x" }),
      { seq: 2, t: 4200, n: 30, type: "run.end", paneId: null, payload: { reason: "export" } },
    ]),
  );
  assert.equal(out.ok, true);
  if (!out.ok) return;
  const doc = buildReview(out, null, "zh");
  assert.equal(doc.ticks, 30);
  assert.equal(doc.durationMs, 4200);
  assert.equal(doc.end?.reason, "export");
  assert.equal(doc.entries.length, 1);
});

test("snapshotFor keeps only what the note reads, and the round trip resolves text", () => {
  const snapshot = snapshotFor(sixDesk) as { panes: unknown[]; tasks: Record<string, unknown>[] };
  assert.equal(snapshot.panes.length, sixDesk.panes.length);
  assert.equal(snapshot.tasks.length, sixDesk.tasks.length);
  for (const task of snapshot.tasks) {
    assert.equal("lines" in task, false, "the note never needs progress lines");
  }
  const out = parseRun(
    stream([
      { ...header, snapshot },
      decision(1, 1, 10, deskPane.id, { kind: "answer", optionId: deskOption.id }),
    ]),
  );
  assert.equal(out.ok, true);
  if (!out.ok) return;
  assert.equal(buildReview(out, null, "zh").entries[0]!.optionLabel, deskOption.label.zh);
});
