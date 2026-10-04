import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { importScenarioText, listScenarios, removeScenario } from "./library.ts";

const doc = (over = {}) =>
  JSON.stringify({
    schemaVersion: 1,
    id: "hello",
    version: "0.1",
    name: "第一个剧本",
    hosts: [{ id: "h1", role: "笔记本" }],
    tasks: [
      {
        key: "t1",
        title: "改一个 bug",
        lines: { zh: ["打开仓库", "跑测试"] },
        question: {
          text: "继续还是停？",
          options: [{ id: "kill", label: "关掉" }],
        },
      },
    ],
    panes: [{ host: "h1", task: "t1" }],
    ...over,
  });

beforeEach(() => {
  const map = new Map<string, string>();
  const fake = {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
  };
  // Node ships its own localStorage, so plain assignment would not stick.
  Object.defineProperty(globalThis, "localStorage", { value: fake, configurable: true });
});

test("an imported scenario is listed and survives a reload of the store", () => {
  const result = importScenarioText(doc());
  assert.equal(result.ok, true);
  assert.deepEqual(
    listScenarios().map((s) => s.id),
    ["hello"],
  );
});

test("a broken scenario is refused and nothing is stored", () => {
  const result = importScenarioText(doc({ panes: [{ host: "nope", task: "t1" }] }));
  assert.equal(result.ok, false);
  assert.equal(listScenarios().length, 0);
  if (result.ok) return;
  assert.ok(result.errors.length >= 1);
});

test("warnings do not block the import", () => {
  const result = importScenarioText(
    doc({
      tasks: [
        {
          key: "t1",
          title: "改一个 bug",
          lines: { zh: ["a", "b"] },
          question: {
            text: "q",
            options: [{ id: "kil", label: "关掉" }],
          },
        },
      ],
    }),
  );
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(
    result.warnings.some((w) => w.code === "kill_typo"),
    true,
  );
});

test("importing the same id replaces it and says so", () => {
  importScenarioText(doc());
  const again = importScenarioText(doc({ version: "0.2" }));
  assert.equal(again.ok, true);
  assert.equal(listScenarios().length, 1);
  if (!again.ok) return;
  assert.equal(again.scenario.version, "0.2");
  assert.equal(
    again.warnings.some((w) => w.code === "duplicate_id"),
    true,
  );
});

test("the 2MB total budget refuses with a named thing to delete", () => {
  const fat = (id: string) =>
    JSON.stringify({
      ...JSON.parse(doc()),
      id,
      tasks: [
        {
          key: "t1",
          title: "x",
          lines: { zh: ["a".repeat(300_000), "b"] },
          question: { text: "q", options: [{ id: "kill", label: "关" }] },
        },
      ],
    });
  for (const id of ["s0", "s1", "s2"]) {
    assert.equal(importScenarioText(fat(id)).ok, true, `seeding ${id}`);
  }
  const result = importScenarioText(fat("s3"));
  assert.equal(result.ok, false);
  if (result.ok) return;
  const oversize = result.errors.find((e) => e.code === "oversize");
  assert.ok(oversize, JSON.stringify(result.errors));
  assert.match(oversize.zh, /删除/);
  assert.equal(listScenarios().length, 3);
});

test("a scenario can be removed by id", () => {
  importScenarioText(doc());
  assert.equal(removeScenario("hello"), true);
  assert.equal(listScenarios().length, 0);
  assert.equal(removeScenario("hello"), false);
});

test("corrupted storage does not take the app down", () => {
  globalThis.localStorage?.setItem("scenarios", "{ not json");
  assert.deepEqual(listScenarios(), []);
  assert.equal(importScenarioText(doc()).ok, true);
});
