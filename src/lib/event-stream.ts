export type RunRef = { name: string; version: string };
export type Row = { id: string; status: string };
export type Decision = {
  paneId: string;
  kind: "answer" | "dispatch" | "kill";
  optionId: string;
  text?: string;
};

type EventLine = {
  seq: number;
  t: number;
  n: number;
  type: "transition" | "decision" | "run.end";
  paneId: string | null;
  payload: unknown;
};

type Header = {
  schemaVersion: number;
  runId: string;
  scenario: RunRef;
  seed: number;
  startedAt: string;
  appVersion: string;
};

type Buffer = { header: Header; events: EventLine[]; n: number; closed: boolean };

const STORE_KEY = "fusion.run";
const SCHEMA_VERSION = 1;
// Bumped with releases; kept here so the stream says what produced it.
const APP_VERSION = "0.1.0";

/**
 * The run lives in sessionStorage and is read on every call — no module cache, so a
 * reload, another tab, or a test fixture all see the same truth.
 */
function load(): Buffer | null {
  try {
    const raw = globalThis.sessionStorage?.getItem(STORE_KEY);
    return raw ? (JSON.parse(raw) as Buffer) : null;
  } catch {
    return null;
  }
}

function save(b: Buffer) {
  try {
    globalThis.sessionStorage?.setItem(STORE_KEY, JSON.stringify(b));
  } catch {
    // private mode: the run lives only as long as the tab
  }
}

function newSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]!;
}

function newRunId(seed: number) {
  return `r${Date.now().toString(36)}-${(seed >>> 0).toString(36)}`;
}

function push(b: Buffer, type: EventLine["type"], paneId: string | null, payload: unknown) {
  b.events.push({
    seq: b.events.length + 1,
    t: Math.max(0, Date.now() - Date.parse(b.header.startedAt)),
    n: b.n,
    type,
    paneId,
    payload,
  });
}

/**
 * Open a run, or resume the open one for this scenario.
 * The header line *is* the run start; `run.end` is an explicit event.
 */
export function startRun(scenario: RunRef): { seed: number; runId: string } {
  const existing = load();
  if (existing && !existing.closed && existing.header.scenario.name === scenario.name) {
    return { seed: existing.header.seed, runId: existing.header.runId };
  }
  const seed = newSeed();
  const b: Buffer = {
    header: {
      schemaVersion: SCHEMA_VERSION,
      runId: newRunId(seed),
      scenario,
      seed,
      startedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
    },
    events: [],
    n: 0,
    closed: false,
  };
  save(b);
  return { seed, runId: b.header.runId };
}

/** The tick clock belongs to the stream, so the PRNG and the events agree on `n`. */
export function advanceTickIndex(): number {
  const b = load();
  if (!b || b.closed) return 0;
  b.n += 1;
  save(b);
  return b.n;
}

export function currentTickIndex(): number {
  return load()?.n ?? 0;
}

export function currentSeed(): number | null {
  return load()?.header.seed ?? null;
}

/**
 * Append what a mutation changed. Transitions come from diffing prev/next, so a new
 * mutation path cannot forget to log itself; a decision is written before the
 * transitions it caused.
 */
export function record(prev: Row[], next: Row[], decision?: Decision): void {
  const b = load();
  if (!b || b.closed) return;
  if (decision) {
    const { paneId, ...payload } = decision;
    push(b, "decision", paneId, payload);
  }
  for (const after of next) {
    const before = prev.find((p) => p.id === after.id);
    if (before && before.status !== after.status) {
      push(b, "transition", after.id, { from: before.status, to: after.status });
    }
  }
  save(b);
}

export function endRun(reason: "left" | "user"): void {
  const b = load();
  if (!b || b.closed) return;
  push(b, "run.end", null, { reason, eventCount: b.events.length });
  b.closed = true;
  save(b);
}

/** JSONL bytes of what actually happened: header line first, then one line per event. */
export function serializeRun(): string {
  const b = load();
  if (!b) return "";
  return `${[JSON.stringify(b.header), ...b.events.map((e) => JSON.stringify(e))].join("\n")}\n`;
}

/**
 * A file you hand to someone must be closed, so an open run gets a synthetic
 * `run.end{reason:"export"}` at serialization time — the stream itself keeps growing.
 */
function serializeForExport(b: Buffer): string {
  const body = serializeRun();
  if (b.closed) return body;
  const closing = JSON.stringify({
    seq: b.events.length + 1,
    t: Math.max(0, Date.now() - Date.parse(b.header.startedAt)),
    n: b.n,
    type: "run.end",
    paneId: null,
    payload: { reason: "export", eventCount: b.events.length },
  });
  return `${body}${closing}\n`;
}

/** Hand the run to the user as a file. Returns the filename, or null with no DOM. */
export function exportRun(): string | null {
  const b = load();
  if (!b) return null;
  if (typeof document === "undefined" || typeof Blob === "undefined") return null;
  const filename = `fusion-${b.header.scenario.name}-${b.header.runId}.jsonl`;
  const url = URL.createObjectURL(
    new Blob([serializeForExport(b)], { type: "application/x-ndjson" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return filename;
}

// A tab that goes away mid-run should leave a well-formed stream behind.
globalThis.addEventListener?.("pagehide", () => endRun("left"));
