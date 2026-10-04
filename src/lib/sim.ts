import type { AgentKind, AgentStatus } from "./content";
import type { Rng } from "./rng";

export type Agent = {
  id: string;
  hostId: string;
  pane: number;
  kind: AgentKind;
  taskKey: string;
  status: AgentStatus;
  progress: number;
  revealed: number;
  customTask?: string;
};

/** What the environment needs to know about the scenario: line counts and pickable tasks. */
export type SimRules = {
  totals: Record<string, number>;
  adhocTotal: number;
  keys: string[];
};

export function revealedFor(status: AgentStatus, progress: number, total: number) {
  if (status === "idle") return 0;
  if (status === "done") return total;
  const n = Math.max(1, Math.round((progress / 100) * total));
  return Math.min(total, n);
}

function totalFor(a: Agent, rules: SimRules): number {
  if (a.customTask) return rules.adhocTotal;
  return rules.totals[a.taskKey] ?? 6;
}

/** One environment tick. All randomness comes from `rng`, so the same seed replays the same floor. */
export function step(agents: Agent[], rules: SimRules, rng: Rng): Agent[] {
  const next = agents.map((a) => ({ ...a }));
  for (const a of next) {
    const total = totalFor(a, rules);
    if (a.status === "working") {
      a.progress = Math.min(100, a.progress + 3 + Math.floor(rng() * 5));
      if (a.revealed < total && rng() > 0.35) a.revealed += 1;
      if (a.progress >= 100) {
        a.status = "done";
        a.progress = 100;
        a.revealed = total;
      } else if (
        a.progress > 42 &&
        a.progress < 88 &&
        a.revealed >= Math.max(3, total - 2) &&
        rng() < 0.08
      ) {
        a.status = "blocked";
      }
    } else if (a.status === "done") {
      if (rng() < 0.04) {
        a.status = "idle";
        a.progress = 0;
        a.revealed = 0;
        a.customTask = undefined;
      }
    } else if (a.status === "idle") {
      if (rng() < 0.015 && rules.keys.length) {
        a.taskKey = rules.keys[Math.floor(rng() * rules.keys.length)]!;
        a.customTask = undefined;
        a.status = "working";
        a.progress = 8;
        a.revealed = 1;
      }
    }
  }
  return next;
}

/** The only human intervention on a blocked pane. `kill` empties it; anything else resumes work. */
export function answer(
  agents: Agent[],
  agentId: string,
  optionId: string,
  rules: SimRules,
): Agent[] {
  const next = agents.map((a) => ({ ...a }));
  const agent = next.find((a) => a.id === agentId);
  if (!agent || agent.status !== "blocked") return agents;
  if (optionId === "kill") {
    agent.status = "idle";
    agent.progress = 0;
    agent.revealed = 0;
    agent.customTask = undefined;
  } else {
    agent.status = "working";
    agent.progress = Math.min(92, agent.progress + 18);
    agent.revealed = Math.min(totalFor(agent, rules), agent.revealed + 1);
  }
  return next;
}

/** Hand a one-line task to a free pane. Returns null when the floor is fully occupied. */
export function dispatch(
  agents: Agent[],
  text: string,
): { agents: Agent[]; paneId: string } | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const next = agents.map((a) => ({ ...a }));
  const target = next.find((a) => a.status === "idle") ?? next.find((a) => a.status === "done");
  if (!target) return null;
  target.status = "working";
  target.progress = 6;
  target.revealed = 1;
  target.customTask = trimmed;
  return { agents: next, paneId: target.id };
}
