import assert from "node:assert/strict";
import test from "node:test";
import { answer, dispatch, step, type Agent, type SimRules } from "./sim.ts";
import { mulberry32 } from "./rng.ts";

const rules: SimRules = {
  totals: { presence: 5, billing: 4, theme: 6 },
  adhocTotal: 5,
  keys: ["presence", "billing", "theme"],
};

function fleet(): Agent[] {
  return [
    {
      id: "a1",
      hostId: "omarchy-1",
      pane: 1,
      kind: "claude",
      taskKey: "presence",
      status: "working",
      progress: 40,
      revealed: 2,
    },
    {
      id: "a2",
      hostId: "omarchy-1",
      pane: 2,
      kind: "codex",
      taskKey: "billing",
      status: "blocked",
      progress: 55,
      revealed: 3,
    },
    {
      id: "a3",
      hostId: "framework",
      pane: 1,
      kind: "grok",
      taskKey: "theme",
      status: "idle",
      progress: 0,
      revealed: 0,
    },
  ];
}

function run(
  seed: number,
  ticks: number,
  script: (n: number, agents: Agent[]) => Agent[] = () => [],
) {
  const rng = mulberry32(seed);
  let agents = fleet();
  for (let n = 0; n < ticks; n += 1) {
    const decided = script(n, agents);
    agents = decided.length ? decided : agents;
    agents = step(agents, rules, rng);
  }
  return agents;
}

test("same seed and same decision sequence produce the same state", () => {
  assert.deepEqual(run(20261003, 100), run(20261003, 100));
});

test("a different seed diverges", () => {
  assert.notDeepEqual(run(1, 100), run(2, 100));
});

test("step does not mutate its input", () => {
  const before = fleet();
  const snapshot = structuredClone(before);
  step(before, rules, mulberry32(7));
  assert.deepEqual(before, snapshot);
});

test("answering a blocked agent resumes it and never kills the fleet", () => {
  const agents = answer(fleet(), "a2", "keep", rules);
  const a2 = agents.find((a) => a.id === "a2")!;
  assert.equal(a2.status, "working");
  assert.ok(a2.progress > 55);
});

test("the kill option empties the pane", () => {
  const agents = answer(fleet(), "a2", "kill", rules);
  const a2 = agents.find((a) => a.id === "a2")!;
  assert.equal(a2.status, "idle");
  assert.equal(a2.progress, 0);
  assert.equal(a2.revealed, 0);
});

test("answering a non-blocked agent is a no-op", () => {
  assert.deepEqual(answer(fleet(), "a1", "keep", rules), fleet());
});

test("dispatch hands the task to an idle pane", () => {
  const out = dispatch(fleet(), "给 CI 加缓存");
  assert.ok(out);
  const target = out!.agents.find((a) => a.id === out!.paneId)!;
  assert.equal(target.customTask, "给 CI 加缓存");
  assert.equal(target.status, "working");
});

test("dispatch prefers idle over done, and refuses when nothing can take it", () => {
  const busy = fleet().map((a) => ({ ...a, status: "working" as const }));
  assert.equal(dispatch(busy, "x"), null);
});

test("interleaved decisions are reproducible", () => {
  const script = (n: number, agents: Agent[]) =>
    n === 3
      ? answer(agents, "a2", "keep", rules)
      : n === 7
        ? dispatch(agents, "跑回归")!.agents
        : [];
  assert.deepEqual(run(99, 60, script), run(99, 60, script));
});
