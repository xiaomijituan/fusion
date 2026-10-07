import type { Lang } from "./content";
import type { Bi, Scenario } from "./scenario";

/**
 * What the note reads out of a scenario. Deliberately not the whole scenario: progress
 * lines and host flavour never appear in a review, so the export stays small.
 */
export type RunSnapshot = {
  panes: { id: string; task: string }[];
  tasks: { key: string; title: Bi; question: { text: Bi; options: { id: string; label: Bi }[] } }[];
};

export type RunHeader = {
  schemaVersion: number;
  runId: string;
  scenario: { name: string; version: string };
  seed: number;
  startedAt: string;
  appVersion: string;
  snapshot?: RunSnapshot;
};

export type RunEvent = {
  seq: number;
  t: number;
  n: number;
  type: "transition" | "decision" | "run.end";
  paneId: string | null;
  payload: unknown;
};

export type ParsedRun = { header: RunHeader; events: RunEvent[] };

export type ParseRunResult = ({ ok: true } & ParsedRun) | { ok: false; errors: string[] };

export type ReviewEntry = {
  seq: number;
  n: number;
  t: number;
  paneId: string;
  kind: "answer" | "dispatch" | "kill";
  optionId: string;
  optionLabel: string | null;
  prompt: string | null;
  taskTitle: string | null;
  caused: { from: string; to: string }[];
};

export type ReviewDoc = {
  header: RunHeader;
  known: boolean;
  entries: ReviewEntry[];
  ambient: number;
  ticks: number;
  durationMs: number;
  end: { reason: string } | null;
};

export const RUN_SCHEMA_VERSION = 1;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** One JSONL stream in, structured run out. Errors are plain strings: this file is ours. */
export function parseRun(text: string): ParseRunResult {
  const rows = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (rows.length === 0) return { ok: false, errors: ["空文件：没有 header 行"] };

  const first: unknown = (() => {
    try {
      return JSON.parse(rows[0]!);
    } catch {
      return undefined;
    }
  })();
  if (first === undefined || !isRecord(first) || typeof first.schemaVersion !== "number") {
    return { ok: false, errors: ["第 1 行不是事件流 header（缺 schemaVersion）"] };
  }
  // Same window as the scenario parser: [current, current-1]. Only the upper bound used to be
  // enforced, so -5 and 0.5 were parsed as if they were v1 — a silent guess about an unknown format.
  if (!Number.isInteger(first.schemaVersion)) {
    return {
      ok: false,
      errors: [
        `schemaVersion 必须是整数，这份文件写的是 ${first.schemaVersion} / schemaVersion must be an integer`,
      ],
    };
  }
  if (first.schemaVersion > RUN_SCHEMA_VERSION) {
    return {
      ok: false,
      errors: [
        `这份事件流来自更新的导出格式（schemaVersion ${first.schemaVersion} > ${RUN_SCHEMA_VERSION}），请升级应用 / upgrade the app`,
      ],
    };
  }
  if (first.schemaVersion < RUN_SCHEMA_VERSION - 1) {
    return {
      ok: false,
      errors: [
        `这份事件流太旧（schemaVersion ${first.schemaVersion}），本应用支持 ${RUN_SCHEMA_VERSION - 1} 或 ${RUN_SCHEMA_VERSION}，请先用一次性升级脚本处理 / too old, run the upgrade script`,
      ],
    };
  }
  // schemaVersion alone does not make a header, and neither does "the field is there". A null
  // identity used to pass and come back as a run whose runId is "" and seed is 0 — a table that
  // cannot say whose game it is. So: present and of the right type, or refuse.
  const scenarioRecord = isRecord(first.scenario) ? first.scenario : {};
  const identity = [
    ["runId", typeof first.runId === "string"],
    [
      "scenario",
      isRecord(first.scenario) &&
        typeof scenarioRecord.name === "string" &&
        typeof scenarioRecord.version === "string",
    ],
    ["seed", typeof first.seed === "number"],
    ["startedAt", typeof first.startedAt === "string"],
    ["appVersion", typeof first.appVersion === "string"],
  ] as const;
  const unusable = identity.filter(([, ok]) => !ok).map(([key]) => key);
  if (unusable.length) {
    return {
      ok: false,
      errors: [
        `第 1 行不是事件流 header（${unusable.join("、")} 缺失或类型不对）/ not a run header`,
      ],
    };
  }
  const scenario = scenarioRecord;
  const header: RunHeader = {
    schemaVersion: first.schemaVersion,
    runId: typeof first.runId === "string" ? first.runId : "",
    scenario: {
      name: typeof scenario.name === "string" ? scenario.name : "",
      version: typeof scenario.version === "string" ? scenario.version : "",
    },
    seed: typeof first.seed === "number" ? first.seed : 0,
    startedAt: typeof first.startedAt === "string" ? first.startedAt : "",
    appVersion: typeof first.appVersion === "string" ? first.appVersion : "",
    snapshot: isRecord(first.snapshot) ? (first.snapshot as RunSnapshot) : undefined,
  };

  const events: RunEvent[] = [];
  const errors: string[] = [];
  rows.slice(1).forEach((row, i) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(row);
    } catch {
      errors.push(`第 ${i + 2} 行不是合法 JSON`);
      return;
    }
    if (!isRecord(parsed) || typeof parsed.type !== "string") {
      errors.push(`第 ${i + 2} 行不是事件行（缺 type）`);
      return;
    }
    events.push({
      seq: typeof parsed.seq === "number" ? parsed.seq : events.length + 1,
      t: typeof parsed.t === "number" ? parsed.t : 0,
      n: typeof parsed.n === "number" ? parsed.n : 0,
      type: parsed.type as RunEvent["type"],
      paneId: typeof parsed.paneId === "string" ? parsed.paneId : null,
      payload: parsed.payload,
    });
  });
  if (errors.length) return { ok: false, errors };
  return { ok: true, header, events };
}

/** The note's whole view of a scenario — nothing else may be needed to render it. */
export function snapshotFor(scenario: Scenario): RunSnapshot {
  return {
    panes: scenario.panes.map((p) => ({ id: p.id, task: p.task })),
    tasks: scenario.tasks.map((t) => ({
      key: t.key,
      title: t.title,
      question: {
        text: t.question.text,
        options: t.question.options.map((o) => ({ id: o.id, label: o.label })),
      },
    })),
  };
}

function kindOf(payload: Record<string, unknown>, optionId: string): ReviewEntry["kind"] {
  if (payload.kind === "dispatch" || payload.kind === "kill" || payload.kind === "answer") {
    return payload.kind;
  }
  if (optionId === "kill") return "kill";
  return optionId === "dispatch" ? "dispatch" : "answer";
}

/**
 * The first projection of the event stream (ADR-0002): a decision plus whatever the
 * floor did afterwards. Read-only — nothing here is stored or recomputed.
 */
export function buildReview(run: ParsedRun, scenario: Scenario | null, lang: Lang): ReviewDoc {
  const source = scenario ? snapshotFor(scenario) : run.header.snapshot;
  const taskOfPane = new Map<string, string>();
  const taskByKey = new Map<string, RunSnapshot["tasks"][number]>();
  if (source) {
    for (const pane of source.panes) taskOfPane.set(pane.id, pane.task);
    for (const task of source.tasks) taskByKey.set(task.key, task);
  }

  const entries: ReviewEntry[] = [];
  let current: ReviewEntry | null = null;
  let ambient = 0;
  let ticks = 0;
  let durationMs = 0;
  let end: { reason: string } | null = null;

  for (const event of run.events) {
    ticks = Math.max(ticks, event.n);
    durationMs = Math.max(durationMs, event.t);
    const payload = isRecord(event.payload) ? event.payload : {};

    if (event.type === "run.end") {
      end = { reason: typeof payload.reason === "string" ? payload.reason : "unknown" };
      continue;
    }
    if (event.type === "decision" && event.paneId) {
      const optionId = typeof payload.optionId === "string" ? payload.optionId : "";
      const kind = kindOf(payload, optionId);
      const task = taskByKey.get(taskOfPane.get(event.paneId) ?? "");
      const option = task?.question.options.find((o) => o.id === optionId);
      const entry: ReviewEntry = {
        seq: event.seq,
        n: event.n,
        t: event.t,
        paneId: event.paneId,
        kind,
        optionId,
        optionLabel: option ? option.label[lang] : null,
        prompt:
          kind === "dispatch" && typeof payload.text === "string"
            ? payload.text
            : task
              ? task.question.text[lang]
              : null,
        taskTitle: task ? task.title[lang] : null,
        caused: [],
      };
      current = entry;
      entries.push(entry);
      continue;
    }
    if (event.type === "transition" && event.paneId) {
      const from = typeof payload.from === "string" ? payload.from : "";
      const to = typeof payload.to === "string" ? payload.to : "";
      if (current && current.paneId === event.paneId) current.caused.push({ from, to });
      else ambient += 1;
      continue;
    }
    ambient += 1;
  }

  return {
    header: run.header,
    known: Boolean(source),
    entries,
    ambient,
    ticks,
    durationMs,
    end,
  };
}
