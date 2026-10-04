import { z } from "zod";
import type { AgentKind, AgentStatus, Lang } from "./content";

/** A resolved bilingual field: English always exists because it falls back to Chinese. */
export type Bi = { zh: string; en: string };

export type ScenarioOption = { id: string; label: Bi };
export type ScenarioQuestion = { text: Bi; options: ScenarioOption[] };
export type ScenarioTask = {
  key: string;
  project?: string;
  title: Bi;
  lines: { zh: string[]; en: string[] };
  question: ScenarioQuestion;
};
export type ScenarioHost = { id: string; role: Bi; place: Bi };
export type ScenarioPane = {
  id: string;
  host: string;
  pane: number;
  kind: AgentKind;
  task: string;
  status: AgentStatus;
  progress: number;
};

export type Scenario = {
  schemaVersion: number;
  id: string;
  version: string;
  name: Bi;
  hosts: ScenarioHost[];
  tasks: ScenarioTask[];
  panes: ScenarioPane[];
};

export type IssueCode =
  | "not_json"
  | "oversize"
  | "schema_version"
  | "missing_field"
  | "bad_type"
  | "unknown_field"
  | "duplicate_id"
  | "bad_reference"
  | "kill_typo"
  | "too_many_panes";

export type ScenarioIssue = {
  code: IssueCode;
  level: "error" | "warning";
  path: string;
  zh: string;
  en: string;
  suggest?: Bi;
};

export type ParseResult =
  | { ok: true; scenario: Scenario; warnings: ScenarioIssue[] }
  | { ok: false; errors: ScenarioIssue[] };

export const MAX_FILE_BYTES = 512_000;
export const CURRENT_SCHEMA_VERSION = 1;
/** One major version back still loads; anything older needs the upgrade script. */
const SUPPORTED = [CURRENT_SCHEMA_VERSION, CURRENT_SCHEMA_VERSION - 1];
const SOFT_PANE_CAP = 24;
const KINDS = ["claude", "codex", "opencode", "grok"] as const;
const STATUSES = ["working", "blocked", "done", "idle"] as const;

const optionSchema = z.strictObject({ id: z.string().min(1), label: z.unknown() });
const questionSchema = z.strictObject({
  text: z.unknown(),
  options: z.array(optionSchema).min(1).max(6),
});
const linesSchema = z.strictObject({
  zh: z.array(z.string().min(1)).min(2),
  en: z.array(z.string()).optional(),
});
const taskSchema = z.strictObject({
  key: z.string().min(1),
  project: z.string().optional(),
  title: z.unknown(),
  lines: linesSchema,
  question: questionSchema,
});
const hostSchema = z.strictObject({
  id: z.string().min(1),
  role: z.unknown(),
  place: z.unknown().optional(),
});
const paneSchema = z.strictObject({
  host: z.string().min(1),
  task: z.string().min(1),
  kind: z.enum(KINDS).optional(),
  status: z.enum(STATUSES).optional(),
  progress: z.number().int().min(0).max(100).optional(),
});
const fileSchema = z.strictObject({
  schemaVersion: z.number().int(),
  id: z.string().min(1),
  version: z.string().min(1),
  name: z.unknown(),
  hosts: z.array(z.unknown()).min(1),
  tasks: z.array(z.unknown()).min(1),
  panes: z.array(z.unknown()).min(1),
});

const err = (
  code: IssueCode,
  path: string,
  zh: string,
  en: string,
  suggest?: Bi,
): ScenarioIssue => ({
  code,
  level: "error",
  path,
  zh,
  en,
  ...(suggest ? { suggest } : {}),
});

const warn = (
  code: IssueCode,
  path: string,
  zh: string,
  en: string,
  suggest?: Bi,
): ScenarioIssue => ({
  code,
  level: "warning",
  path,
  zh,
  en,
  ...(suggest ? { suggest } : {}),
});

function pathOf(issue: { path: PropertyKey[] }): string {
  return issue.path.reduce<string>(
    (acc, part) =>
      typeof part === "number" ? `${acc}[${part}]` : acc ? `${acc}.${String(part)}` : String(part),
    "",
  );
}

function describe(code: string, key: string): { zh: string; en: string; code: IssueCode } {
  if (code === "unrecognized_keys") {
    return {
      code: "unknown_field",
      zh: `出现了规范里没有的字段（${key}）。剧本只能是数据：未知字段一律拒绝。`,
      en: `Unknown field "${key}". A scenario is data only: unrecognised keys are rejected.`,
    };
  }
  if (key === "zh") {
    return {
      code: "missing_field",
      zh: "缺少必填中文文本（zh）。每个文本字段都要有中文；英文（en）可以不写。",
      en: "Missing required Chinese text (zh). Every text field needs Chinese; English is optional.",
    };
  }
  return {
    code: "bad_type",
    zh: `字段类型不对或缺失（${key}）。`,
    en: `Wrong type or missing value for "${key}".`,
  };
}

/** Accepts "中文" or { zh, en? }; missing English falls back to Chinese. */
function readBi(value: unknown, at: string, issues: ScenarioIssue[]): Bi {
  if (typeof value === "string") {
    if (!value.trim()) {
      issues.push(err("missing_field", at, "文本为空。", "Text is empty."));
      return { zh: "", en: "" };
    }
    return { zh: value, en: value };
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const zh = typeof obj.zh === "string" ? obj.zh : "";
    if (!zh.trim()) {
      issues.push(
        err(
          "missing_field",
          `${at}.zh`,
          "缺少必填中文文本（zh）。每个文本字段都要有中文；英文（en）可以不写。",
          "Missing required Chinese text (zh). Every text field needs Chinese; English is optional.",
        ),
      );
    }
    const extra = Object.keys(obj).filter((k) => k !== "zh" && k !== "en");
    for (const k of extra) {
      issues.push(
        err(
          "unknown_field",
          `${at}.${k}`,
          `出现了规范里没有的字段（${k}）。剧本只能是数据：未知字段一律拒绝。`,
          `Unknown field "${k}". A scenario is data only: unrecognised keys are rejected.`,
        ),
      );
    }
    const en = typeof obj.en === "string" && obj.en.trim() ? obj.en : zh;
    return { zh, en };
  }
  issues.push(
    err(
      "bad_type",
      at,
      "文本字段要写成字符串（只中文），或 { zh, en? } 对象。",
      "Write text as a string (Chinese only) or as { zh, en? }.",
    ),
  );
  return { zh: "", en: "" };
}

function nearest(needle: string, options: string[]): string | undefined {
  return options.find((candidate) => candidate !== needle && editDistance(needle, candidate) <= 2);
}

function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return prev[b.length];
}

/**
 * Parse, validate and normalize a scenario document.
 * Every problem is collected — an author fixing a first draft deserves the whole list at once.
 */
export function parseScenario(text: string): ParseResult {
  const issues: ScenarioIssue[] = [];

  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES) {
    return {
      ok: false,
      errors: [
        err(
          "oversize",
          "",
          `剧本超过 ${Math.round(MAX_FILE_BYTES / 1024)}KB 上限，装不下。`,
          `Scenario exceeds the ${Math.round(MAX_FILE_BYTES / 1024)}KB limit.`,
        ),
      ],
    };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    return {
      ok: false,
      errors: [
        err(
          "not_json",
          "",
          `不是合法 JSON：${(e as Error).message}`,
          `Not valid JSON: ${(e as Error).message}`,
        ),
      ],
    };
  }

  const shape = fileSchema.safeParse(raw);
  if (!shape.success) {
    for (const issue of shape.error.issues) {
      const at = pathOf(issue);
      const key = at.split(".").pop() ?? at;
      const found = describe(issue.code, key);
      issues.push(err(found.code, at, found.zh, found.en));
    }
    return { ok: false, errors: dedupe(issues) };
  }

  const file = shape.data;
  if (!SUPPORTED.includes(file.schemaVersion)) {
    return {
      ok: false,
      errors: [
        err(
          "schema_version",
          "schemaVersion",
          `本版本应用只支持 schemaVersion ${SUPPORTED.join(" 或 ")}；这份文件是 ${file.schemaVersion}，请升级应用。`,
          `This app supports schemaVersion ${SUPPORTED.join(" or ")}; the file declares ${file.schemaVersion}. Update the app.`,
        ),
      ],
    };
  }

  const name = readBi(file.name, "name", issues);

  const hosts: ScenarioHost[] = [];
  file.hosts.forEach((entry, i) => {
    const parsed = hostSchema.safeParse(entry);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const found = describe(issue.code, String(issue.path.at(-1) ?? "host"));
        issues.push(
          err(
            found.code,
            `hosts[${i}]${issue.path.length ? `.${issue.path.join(".")}` : ""}`,
            found.zh,
            found.en,
          ),
        );
      }
      return;
    }
    const at = `hosts[${i}]`;
    hosts.push({
      id: parsed.data.id,
      role: readBi(parsed.data.role, `${at}.role`, issues),
      place: readBi(parsed.data.place ?? parsed.data.role, `${at}.place`, issues),
    });
  });

  const hostIds = hosts.map((h) => h.id);
  const seenHosts = new Set<string>();
  for (const host of hosts) {
    if (seenHosts.has(host.id)) {
      issues.push(
        err(
          "duplicate_id",
          `hosts(id=${host.id})`,
          `主机 id「${host.id}」重复。`,
          `Duplicate host id "${host.id}".`,
        ),
      );
    }
    seenHosts.add(host.id);
  }

  const tasks: ScenarioTask[] = [];
  file.tasks.forEach((entry, i) => {
    const parsed = taskSchema.safeParse(entry);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const found = describe(issue.code, String(issue.path.at(-1) ?? "task"));
        issues.push(
          err(
            found.code,
            `tasks[${i}]${issue.path.length ? `.${issue.path.join(".")}` : ""}`,
            found.zh,
            found.en,
          ),
        );
      }
      return;
    }
    const at = `tasks[${i}]`;
    const d = parsed.data;
    const title = readBi(d.title, `${at}.title`, issues);
    const enLines = d.lines.en ?? d.lines.zh;
    if (d.lines.en && d.lines.en.length !== d.lines.zh.length) {
      issues.push(
        err(
          "bad_type",
          `${at}.lines.en`,
          "英文台词行数必须与中文一致。",
          "The English line count must match the Chinese one.",
        ),
      );
    }
    const questionAt = `${at}.question`;
    const text = readBi(d.question.text, `${questionAt}.text`, issues);
    const options: ScenarioOption[] = [];
    const seenOptions = new Set<string>();
    d.question.options.forEach((option, j) => {
      const optionAt = `${questionAt}.options[${j}]`;
      if (seenOptions.has(option.id)) {
        issues.push(
          err(
            "duplicate_id",
            optionAt,
            `选项 id「${option.id}」重复。`,
            `Duplicate option id "${option.id}".`,
          ),
        );
      }
      seenOptions.add(option.id);
      if (option.id !== "kill" && editDistance(option.id, "kill") <= 2) {
        issues.push(
          warn(
            "kill_typo",
            `${optionAt}.id`,
            `「${option.id}」疑似 "kill" 拼错（警告）。只有 id 恰好为 "kill" 的选项会关闭 pane，其余选项一律恢复推进。`,
            `"${option.id}" looks like a typo of "kill" (warning). Only an option with id exactly "kill" closes the pane; any other id resumes work.`,
            { zh: '把 id 改成 "kill"。', en: 'Rename the option id to "kill".' },
          ),
        );
      }
      options.push({ id: option.id, label: readBi(option.label, `${optionAt}.label`, issues) });
    });
    if (!options.some((option) => option.id === "kill")) {
      options.push({ id: "kill", label: { zh: "关掉", en: "Kill it" } });
    }
    tasks.push({
      key: d.key,
      ...(d.project ? { project: d.project } : {}),
      title,
      lines: { zh: d.lines.zh, en: enLines },
      question: { text, options },
    });
  });

  const seenTasks = new Set<string>();
  for (const task of tasks) {
    if (seenTasks.has(task.key)) {
      issues.push(
        err(
          "duplicate_id",
          `tasks(key=${task.key})`,
          `任务 key「${task.key}」重复。`,
          `Duplicate task key "${task.key}".`,
        ),
      );
    }
    seenTasks.add(task.key);
  }

  const panes: ScenarioPane[] = [];
  const perHost = new Map<string, number>();
  file.panes.forEach((entry, i) => {
    const parsed = paneSchema.safeParse(entry);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const found = describe(issue.code, String(issue.path.at(-1) ?? "pane"));
        issues.push(
          err(
            found.code,
            `panes[${i}]${issue.path.length ? `.${issue.path.join(".")}` : ""}`,
            found.zh,
            found.en,
          ),
        );
      }
      return;
    }
    const at = `panes[${i}]`;
    const d = parsed.data;
    if (!hostIds.includes(d.host)) {
      const hint = nearest(d.host, hostIds);
      issues.push(
        err(
          "bad_reference",
          `${at}.host`,
          `找不到主机「${d.host}」。本剧本的主机有：${hostIds.join("、")}。`,
          `Unknown host "${d.host}". This scenario defines: ${hostIds.join(", ")}.`,
          hint ? { zh: `是否想写「${hint}」？`, en: `Did you mean "${hint}"?` } : undefined,
        ),
      );
    }
    if (!seenTasks.has(d.task)) {
      const hint = nearest(d.task, [...seenTasks]);
      issues.push(
        err(
          "bad_reference",
          `${at}.task`,
          `找不到任务「${d.task}」。本剧本的任务有：${[...seenTasks].join("、")}。`,
          `Unknown task "${d.task}". This scenario defines: ${[...seenTasks].join(", ")}.`,
          hint ? { zh: `是否想写「${hint}」？`, en: `Did you mean "${hint}"?` } : undefined,
        ),
      );
    }
    const ordinal = (perHost.get(d.host) ?? 0) + 1;
    perHost.set(d.host, ordinal);
    panes.push({
      id: `a${i + 1}`,
      host: d.host,
      pane: ordinal,
      kind: (d.kind ?? "claude") as AgentKind,
      task: d.task,
      status: (d.status ?? "working") as AgentStatus,
      progress: d.progress ?? 20,
    });
  });

  if (panes.length > SOFT_PANE_CAP) {
    issues.push(
      warn(
        "too_many_panes",
        "panes",
        `一共 ${panes.length} 个 pane，超过 ${SOFT_PANE_CAP} 个后机房会挤。`,
        `${panes.length} panes is more than ${SOFT_PANE_CAP}; the floor gets cramped.`,
      ),
    );
  }

  const clean = dedupe(issues);
  const errors = clean.filter((issue) => issue.level === "error");
  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    warnings: clean.filter((issue) => issue.level === "warning"),
    scenario: {
      schemaVersion: file.schemaVersion,
      id: file.id,
      version: file.version,
      name,
      hosts,
      tasks,
      panes,
    },
  };
}

function dedupe(issues: ScenarioIssue[]): ScenarioIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.code}|${issue.path}|${issue.zh}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function resolveText(field: Bi, lang: Lang): string {
  return lang === "zh" ? field.zh : field.en;
}

export function findTask(scenario: Scenario, key: string): ScenarioTask | undefined {
  return scenario.tasks.find((task) => task.key === key);
}

export function findHost(scenario: Scenario, id: string): ScenarioHost | undefined {
  return scenario.hosts.find((host) => host.id === id);
}

/** Line counts and pickable keys — everything the environment needs to advance a run. */
export function rulesFor(scenario: Scenario, adhocTotal: number) {
  return {
    totals: Object.fromEntries(scenario.tasks.map((task) => [task.key, task.lines.zh.length])),
    adhocTotal,
    keys: scenario.tasks.map((task) => task.key),
  };
}
