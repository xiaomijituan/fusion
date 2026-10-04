import shippedFile from "../../scenarios/fusion-default.json?raw";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { customLines, type Lang, type View } from "./content";
import { advanceTickIndex, currentSeed, endRun, record, startRun } from "./event-stream";
import {
  importScenarioText,
  listScenarios,
  removeScenario as dropStored,
  type ImportResult,
} from "./library";
import { mulberry32 } from "./rng";
import { parseScenario, rulesFor, type Scenario } from "./scenario";
import {
  answer as answerAgent,
  dispatch as dispatchTask,
  revealedFor,
  step,
  type Agent,
} from "./sim";

export type { Agent };

/**
 * The shipped floor is loaded through the same parser as any community scenario —
 * no special branch. A corrupt file in the repo is a startup error, not a blank floor.
 */
const parsedShipped = parseScenario(shippedFile);
if (!parsedShipped.ok) {
  throw new Error(
    `出厂剧本不合法：\n${parsedShipped.errors.map((e) => `  ${e.path} — ${e.zh}`).join("\n")}`,
  );
}
export const shippedScenario: Scenario = parsedShipped.scenario;

type FloorState = {
  lang: Lang;
  view: View;
  entered: boolean;
  selectedId: string;
  dispatchText: string;
  helpOpen: boolean;
  scenario: Scenario;
  scenarios: Scenario[];
  agents: Agent[];
  flash: string | null;
  setLang: (lang: Lang) => void;
  setView: (view: View) => void;
  enter: () => void;
  loadScenario: (scenario: Scenario) => void;
  importScenario: (text: string) => ImportResult;
  removeStored: (id: string) => void;
  select: (id: string) => void;
  selectDelta: (delta: number) => void;
  jumpBlocked: () => void;
  setDispatch: (text: string) => void;
  runDispatch: () => void;
  answer: (agentId: string, optionId: string) => void;
  tick: () => void;
  setHelp: (open: boolean) => void;
};

const adhocTotal = customLines.en.length + 1;

/** Tick n draws from its own stream, so a resumed session replays identically. */
function rngForTick(seed: number, n: number) {
  return mulberry32((seed ^ Math.imul(n + 1, 0x9e3779b9)) >>> 0);
}

function hydrate(scenario: Scenario): Agent[] {
  const totals = rulesFor(scenario, adhocTotal).totals;
  return scenario.panes.map((p) => ({
    id: p.id,
    hostId: p.host,
    pane: p.pane,
    kind: p.kind,
    taskKey: p.task,
    status: p.status,
    progress: p.progress,
    revealed: revealedFor(p.status, p.progress, totals[p.task] ?? 4),
  }));
}

function runRef(scenario: Scenario) {
  return { name: scenario.name.zh, version: scenario.version };
}

export const useFloor = create<FloorState>()(
  persist(
    (set, get) => ({
      lang: "zh",
      view: "floor",
      entered: false,
      selectedId: "a1",
      dispatchText: "",
      helpOpen: false,
      scenario: shippedScenario,
      scenarios: listScenarios(),
      agents: hydrate(shippedScenario),
      flash: null,
      setLang: (lang) => set({ lang }),
      setView: (view) => set({ view, helpOpen: false }),
      enter: () => {
        startRun(runRef(get().scenario));
        set({ entered: true, view: "floor" });
      },
      loadScenario: (scenario) => {
        // A different floor is a different game: close the old run, open a new one.
        endRun("user");
        set({ scenario, agents: hydrate(scenario), selectedId: scenario.panes[0]?.id ?? "" });
        startRun(runRef(scenario));
      },
      importScenario: (text) => {
        const result = importScenarioText(text);
        if (result.ok) {
          get().loadScenario(result.scenario);
          set({ scenarios: listScenarios() });
        }
        return result;
      },
      removeStored: (id) => {
        dropStored(id);
        set({ scenarios: listScenarios() });
        if (get().scenario.id === id) get().loadScenario(shippedScenario);
      },
      select: (id) => set({ selectedId: id }),
      selectDelta: (delta) => {
        const { agents, selectedId } = get();
        const i = agents.findIndex((a) => a.id === selectedId);
        const next = agents[(i + delta + agents.length) % agents.length];
        if (next) set({ selectedId: next.id });
      },
      jumpBlocked: () => {
        const { agents, selectedId } = get();
        const blocked = agents.filter((a) => a.status === "blocked");
        if (!blocked.length) return;
        const i = blocked.findIndex((a) => a.id === selectedId);
        const next = blocked[(i + 1) % blocked.length];
        set({ selectedId: next.id, view: "floor" });
      },
      setDispatch: (text) => set({ dispatchText: text }),
      runDispatch: () => {
        const prev = get().agents;
        const text = get().dispatchText.trim();
        const out = dispatchTask(prev, text);
        if (!out) return;
        record(prev, out.agents, {
          paneId: out.paneId,
          kind: "dispatch",
          optionId: "dispatch",
          text,
        });
        set({
          agents: out.agents,
          dispatchText: "",
          selectedId: out.paneId,
          view: "floor",
          flash: out.paneId,
        });
        window.setTimeout(() => {
          if (get().flash === out.paneId) set({ flash: null });
        }, 900);
      },
      answer: (agentId, optionId) => {
        const prev = get().agents;
        const agents = answerAgent(prev, agentId, optionId, rulesFor(get().scenario, adhocTotal));
        if (agents === prev) return;
        record(prev, agents, {
          paneId: agentId,
          kind: optionId === "kill" ? "kill" : "answer",
          optionId,
        });
        set({ agents, selectedId: agentId });
      },
      tick: () => {
        const prev = get().agents;
        const n = advanceTickIndex();
        const agents = step(
          prev,
          rulesFor(get().scenario, adhocTotal),
          rngForTick(currentSeed() ?? 0, n),
        );
        record(prev, agents);
        set({ agents });
      },
      setHelp: (open) => set({ helpOpen: open }),
    }),
    {
      name: "fusion",
      partialize: (s) => ({ lang: s.lang, entered: s.entered }),
    },
  ),
);

export function counts(agents: Agent[]) {
  return {
    total: agents.length,
    working: agents.filter((a) => a.status === "working").length,
    blocked: agents.filter((a) => a.status === "blocked").length,
    done: agents.filter((a) => a.status === "done").length,
    idle: agents.filter((a) => a.status === "idle").length,
  };
}

let started = false;
export function startTicker() {
  if (started) return;
  started = true;
  window.setInterval(() => useFloor.getState().tick(), 1100);
}
