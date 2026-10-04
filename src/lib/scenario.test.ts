import assert from "node:assert/strict";
import test from "node:test";
import { MAX_FILE_BYTES, parseScenario } from "./scenario.ts";

const minimal = {
  schemaVersion: 1,
  id: "hello",
  version: "0.1",
  name: "第一个剧本",
  hosts: [{ id: "h1", role: "笔记本" }],
  tasks: [
    {
      key: "t1",
      title: "改一个 bug",
      lines: { zh: ["打开仓库", "跑测试", "等你看一眼"] },
      question: {
        text: "继续还是停？",
        options: [
          { id: "keep", label: "继续" },
          { id: "kill", label: "关掉" },
        ],
      },
    },
  ],
  panes: [{ host: "h1", task: "t1" }],
};

const doc = (patch = {}) => JSON.stringify({ ...minimal, ...patch });
const parse = (obj: unknown) => parseScenario(JSON.stringify(obj));

test("a minimal scenario parses and normalizes", () => {
  const result = parseScenario(doc());
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const s = result.scenario;
  assert.deepEqual(s.name, { zh: "第一个剧本", en: "第一个剧本" });
  assert.deepEqual(s.hosts[0].role, { zh: "笔记本", en: "笔记本" });
  assert.equal(s.panes[0].id, "a1");
  assert.equal(s.panes[0].status, "working");
  assert.equal(s.panes[0].kind, "claude");
});

test("English falls back to Chinese when absent, and is kept when present", () => {
  const withEn = {
    ...minimal,
    name: { zh: "剧本", en: "Scenario" },
  };
  const a = parse(minimal);
  const b = parse(withEn);
  assert.equal(a.ok && a.scenario.hosts[0].role.en, "笔记本");
  assert.equal(b.ok && b.scenario.name.en, "Scenario");
});

test("pane ids are derived from file order and stay stable", () => {
  const twoHosts = {
    ...minimal,
    hosts: [
      { id: "h1", role: "一" },
      { id: "h2", role: "二" },
    ],
    panes: [
      { host: "h1", task: "t1" },
      { host: "h1", task: "t1" },
      { host: "h2", task: "t1" },
    ],
  };
  const first = parse(twoHosts);
  const second = parse(twoHosts);
  assert.equal(first.ok && second.ok, true);
  if (!first.ok || !second.ok) return;
  assert.deepEqual(
    first.scenario.panes.map((p) => p.id),
    ["a1", "a2", "a3"],
  );
  assert.deepEqual(
    first.scenario.panes.map((p) => p.id),
    second.scenario.panes.map((p) => p.id),
  );
  assert.deepEqual(
    first.scenario.panes.map((p) => p.pane),
    [1, 2, 1],
  );
});

test("a missing kill option is appended so every question can empty a pane", () => {
  const noKill = {
    ...minimal,
    tasks: [
      {
        ...minimal.tasks[0],
        question: { text: "怎么办？", options: [{ id: "keep", label: "继续" }] },
      },
    ],
  };
  const result = parse(noKill);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const options = result.scenario.tasks[0].question.options;
  assert.equal(options.at(-1)?.id, "kill");
});

test("missing Chinese text is an error naming the field path", () => {
  const bad = {
    ...minimal,
    tasks: [{ ...minimal.tasks[0], title: { en: "only english" } }],
  };
  const result = parse(bad);
  assert.equal(result.ok, false);
  if (result.ok) return;
  const issue = result.errors.find((e) => e.path.includes("title"));
  assert.ok(issue, `expected a title error, got ${JSON.stringify(result.errors)}`);
  assert.equal(issue.level, "error");
  assert.match(issue.zh, /中文/);
  assert.match(issue.en, /Chinese/i);
});

test("a pane pointing at an unknown host is rejected with a suggestion", () => {
  const bad = { ...minimal, panes: [{ host: "h3", task: "t1" }] };
  const result = parse(bad);
  assert.equal(result.ok, false);
  if (result.ok) return;
  const issue = result.errors.find((e) => e.code === "bad_reference");
  assert.ok(issue);
  assert.match(issue.path, /panes\[0]\.host/);
  assert.equal(issue.suggest?.zh.includes("h1"), true);
});

test("a misspelled kill warns but still imports, with kill appended", () => {
  const typo = {
    ...minimal,
    tasks: [
      {
        ...minimal.tasks[0],
        question: {
          text: "继续还是停？",
          options: [
            { id: "keep", label: "继续" },
            { id: "kil", label: "关掉" },
          ],
        },
      },
    ],
  };
  const result = parse(typo);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const warning = result.warnings.find((w) => w.code === "kill_typo");
  assert.ok(warning, "expected a warning about the kill id");
  assert.match(warning.zh, /kill/);
  assert.equal(result.scenario.tasks[0].question.options.at(-1)?.id, "kill");
});

test("every problem is reported at once, not one per save", () => {
  const bad = {
    ...minimal,
    name: { en: "english only" },
    panes: [{ host: "nope", task: "also-nope" }],
  };
  const result = parse(bad);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.ok(result.errors.length >= 3, `got ${result.errors.length}`);
});

test("unknown keys are rejected, so an executable payload fails closed", () => {
  const hostile = { ...minimal, onLoad: "eval(require('fs').readdirSync('/'))" };
  const result = parse(hostile);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(
    result.errors.some((e) => e.code === "unknown_field"),
    true,
  );
});

test("an oversized file is refused before parsing", () => {
  const huge = `{"schemaVersion":1,"pad":"${"x".repeat(MAX_FILE_BYTES + 10)}"}`;
  const result = parseScenario(huge);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.errors[0].code, "oversize");
});

test("a newer schemaVersion tells the user to upgrade the app", () => {
  const result = parse({ ...minimal, schemaVersion: 99 });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.errors[0].code, "schema_version");
  assert.match(result.errors[0].zh, /升级/);
});

test("non-JSON input reports where it broke", () => {
  const result = parseScenario("{ not json");
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.errors[0].code, "not_json");
});

test("duplicate task keys are rejected", () => {
  const dupe = { ...minimal, tasks: [minimal.tasks[0], minimal.tasks[0]] };
  const result = parse(dupe);
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(
    result.errors.some((e) => e.code === "duplicate_id"),
    true,
  );
});
