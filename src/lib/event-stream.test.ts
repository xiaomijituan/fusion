import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import {
  advanceTickIndex,
  endRun,
  exportRun,
  record,
  serializeRun,
  startRun,
} from "./event-stream.ts";

type Line = {
  schemaVersion?: number;
  runId?: string;
  scenario?: { name: string; version: string };
  seed?: number;
  startedAt?: string;
  appVersion?: string;
  seq?: number;
  t?: number;
  n?: number;
  type?: string;
  paneId?: string | null;
  payload?: unknown;
};

function lines(): Line[] {
  return serializeRun()
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l) as Line);
}

function store() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
}

beforeEach(() => {
  // event-stream persists the run in sessionStorage; give it a fake one.
  (globalThis as { sessionStorage?: unknown }).sessionStorage = store();
});

afterEach(() => {
  delete (globalThis as { sessionStorage?: unknown }).sessionStorage;
});

const factory = { name: "聚变出厂剧本", version: "0.1.0" };

test("startRun writes a header carrying the scenario ref, the seed and its own schemaVersion", () => {
  startRun(factory);
  const header = lines()[0];
  assert.equal(header.schemaVersion, 1);
  assert.deepEqual(header.scenario, factory);
  assert.equal(typeof header.seed, "number");
  assert.equal(typeof header.runId, "string");
  assert.equal(typeof header.startedAt, "string");
  assert.equal(typeof header.appVersion, "string");
});

test("a tick that only moves progress records nothing", () => {
  startRun(factory);
  const before = lines().length;
  advanceTickIndex();
  record([{ id: "a1", status: "working" }], [{ id: "a1", status: "working" }]);
  assert.equal(lines().length, before);
});

test("a status transition records exactly one event", () => {
  startRun(factory);
  advanceTickIndex();
  record([{ id: "a1", status: "working" }], [{ id: "a1", status: "blocked" }]);
  const events = lines().slice(1);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "transition");
  assert.equal(events[0].paneId, "a1");
  assert.deepEqual(events[0].payload, { from: "working", to: "blocked" });
});

test("a decision is recorded before the transition it caused", () => {
  startRun(factory);
  advanceTickIndex();
  record([{ id: "a1", status: "blocked" }], [{ id: "a1", status: "working" }], {
    paneId: "a1",
    kind: "answer",
    optionId: "split",
  });
  const events = lines().slice(1);
  assert.equal(events.length, 2);
  assert.equal(events[0].type, "decision");
  assert.equal(events[1].type, "transition");
  assert.ok((events[0]?.seq ?? 0) < (events[1]?.seq ?? 0));
});

test("seq is monotonic and n tracks the tick clock", () => {
  startRun(factory);
  advanceTickIndex();
  advanceTickIndex();
  record(
    [
      { id: "a1", status: "working" },
      { id: "a2", status: "working" },
    ],
    [
      { id: "a1", status: "done" },
      { id: "a2", status: "blocked" },
    ],
  );
  const events = lines().slice(1);
  assert.equal(events.length, 2);
  assert.deepEqual(
    events.map((e) => e.seq),
    [1, 2],
  );
  assert.equal(events[0].n, 2);
});

test("re-entering the same scenario resumes the same run instead of starting over", () => {
  const first = startRun(factory);
  advanceTickIndex();
  record([{ id: "a1", status: "working" }], [{ id: "a1", status: "blocked" }]);
  const again = startRun(factory);
  assert.equal(again.seed, first.seed);
  assert.equal(again.runId, first.runId);
  assert.equal(lines().length, 2);
});

test("endRun closes the stream and the next startRun opens a fresh run", () => {
  const first = startRun(factory);
  endRun("left");
  const last = lines().at(-1)!;
  assert.equal(last.type, "run.end");
  assert.equal((last.payload as { reason: string }).reason, "left");
  const next = startRun(factory);
  assert.notEqual(next.runId, first.runId);
});

test("exportRun degrades to null when there is no DOM to download through", () => {
  startRun(factory);
  assert.equal(exportRun(), null);
});

test("every event line has the ADR-0004 shape", () => {
  startRun(factory);
  advanceTickIndex();
  record([{ id: "a1", status: "working" }], [{ id: "a1", status: "idle" }]);
  for (const line of lines().slice(1)) {
    const keys = Object.keys(line).sort().join(",");
    assert.equal(keys, "n,paneId,payload,seq,t,type");
  }
});
