import { parseScenario, type Scenario, type ScenarioIssue } from "./scenario.ts";

const STORE_KEY = "scenarios";
export const MAX_STORED_BYTES = 2_000_000;

type Envelope = { schemaVersion: number; items: Scenario[] };

export type ImportResult =
  | { ok: true; scenario: Scenario; warnings: ScenarioIssue[] }
  | { ok: false; errors: ScenarioIssue[] };

/** Anything unreadable in storage degrades to an empty library rather than a crash. */
function read(): Envelope {
  try {
    const raw = globalThis.localStorage?.getItem(STORE_KEY);
    if (!raw) return { schemaVersion: 1, items: [] };
    const parsed = JSON.parse(raw) as Partial<Envelope>;
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return { schemaVersion: 1, items };
  } catch {
    return { schemaVersion: 1, items: [] };
  }
}

function write(env: Envelope) {
  try {
    globalThis.localStorage?.setItem(STORE_KEY, JSON.stringify(env));
  } catch {
    // quota or private mode: the import result already told the user what happened
  }
}

export function listScenarios(): Scenario[] {
  return read().items;
}

export function findStored(id: string): Scenario | undefined {
  return listScenarios().find((s) => s.id === id);
}

/** Validate then persist a pasted/dropped scenario. Only whole-envelope writes. */
export function importScenarioText(text: string): ImportResult {
  const parsed = parseScenario(text);
  if (!parsed.ok) return parsed;
  const env = read();
  const warnings = [...parsed.warnings];
  if (env.items.some((s) => s.id === parsed.scenario.id)) {
    warnings.push({
      code: "duplicate_id",
      level: "warning",
      path: "id",
      zh: `已替换同名剧本「${parsed.scenario.id}」。`,
      en: `Replaced the stored scenario with the same id "${parsed.scenario.id}".`,
    });
  }
  const next: Envelope = {
    schemaVersion: env.schemaVersion,
    items: [...env.items.filter((s) => s.id !== parsed.scenario.id), parsed.scenario],
  };
  const bytes = new TextEncoder().encode(JSON.stringify(next)).length;
  if (bytes > MAX_STORED_BYTES) {
    return {
      ok: false,
      errors: [
        {
          code: "oversize",
          level: "error",
          path: "",
          zh: `加上这份剧本会到 ${(bytes / 1_000_000).toFixed(1)}MB，超过浏览器里 2MB 的上限。请先删除一个不用的剧本：${env.items.map((s) => s.id).join("、")}。`,
          en: `Storing this would need ${(bytes / 1_000_000).toFixed(1)}MB, over the 2MB browser budget. Delete a stored scenario first: ${env.items.map((s) => s.id).join(", ")}.`,
        },
      ],
    };
  }
  write(next);
  return { ok: true, scenario: parsed.scenario, warnings };
}

export function removeScenario(id: string): boolean {
  const env = read();
  const kept = env.items.filter((s) => s.id !== id);
  if (kept.length === env.items.length) return false;
  write({ ...env, items: kept });
  return true;
}
