// The one way an embedding page (a handbook chapter) can hand the simulator a scenario.
//
// This is deliberately NOT a second trust channel: the text that passes the checks below is
// fed into the same `importScenario()` path as pasting, so it gets the same whitelist, the
// same size caps and the same error reporting. Nothing here parses a scenario.

export const INJECT_MESSAGE_TYPE = "fusion:load-scenario";
export const INJECT_RESULT_TYPE = `${INJECT_MESSAGE_TYPE}-result`;

export type InjectionContext = {
  /** Are we inside an iframe at all? */
  embedded: boolean;
  /** Did the message come from that parent frame, not from some third-party window? */
  fromParent: boolean;
};

export type Injection = { accept: true; text: string } | { accept: false; reason: string };

const ALLOWED_KEYS = ["type", "scenario"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Decide whether a message is a load-this-scenario request. Cheap to test, no DOM. */
export function readInjection(data: unknown, context: InjectionContext): Injection {
  if (!context.embedded) {
    return {
      accept: false,
      reason: "ignored: 这是顶层标签页，不是被嵌进来的，不接受注入 / not embedded",
    };
  }
  if (!context.fromParent) {
    return { accept: false, reason: "ignored: 消息不是父页面发来的 / not from parent" };
  }
  if (!isRecord(data)) {
    return { accept: false, reason: "ignored: 消息体不是对象 / body is not an object" };
  }
  const keys = Object.keys(data);
  if (keys.some((key) => !ALLOWED_KEYS.includes(key))) {
    return {
      accept: false,
      reason: `rejected: 消息里有规范外的字段（${keys.filter((k) => !ALLOWED_KEYS.includes(k)).join("、")}）/ unknown fields`,
    };
  }
  if (data.type !== INJECT_MESSAGE_TYPE) {
    return { accept: false, reason: `ignored: 消息类型不是 ${INJECT_MESSAGE_TYPE} / wrong type` };
  }
  if (typeof data.scenario !== "string") {
    return {
      accept: false,
      reason:
        "rejected: scenario 必须是剧本 JSON 文本字符串，不接受已解析的对象 / must be a string",
    };
  }
  return { accept: true, text: data.scenario };
}

export type InjectionResult = {
  type: string;
  ok: boolean;
  errors: string[];
  warnings: string[];
};

/** What we post back so the chapter page can tell the reader why a scenario was refused. */
export function buildInjectionResult(
  ok: boolean,
  errors: string[],
  warnings: string[] = [],
): InjectionResult {
  return { type: INJECT_RESULT_TYPE, ok, errors, warnings };
}
