import assert from "node:assert/strict";
import { test } from "node:test";
import { INJECT_MESSAGE_TYPE, readInjection, buildInjectionResult } from "./scenario-injection.ts";

const okMessage = { type: INJECT_MESSAGE_TYPE, scenario: '{"schemaVersion":1}' };
const embedded = { embedded: true, fromParent: true };

test("an embedded page can ask the simulator to load a scenario", () => {
  const out = readInjection(okMessage, embedded);
  assert.equal(out.accept, true);
  if (out.accept) assert.equal(out.text, '{"schemaVersion":1}');
});

test("a top-level tab ignores injection messages", () => {
  const out = readInjection(okMessage, { embedded: false, fromParent: true });
  assert.equal(out.accept, false);
  if (!out.accept) assert.match(out.reason, /不是被嵌|embed/i);
});

test("messages from anyone other than the parent frame are ignored", () => {
  const out = readInjection(okMessage, { embedded: true, fromParent: false });
  assert.equal(out.accept, false);
  if (!out.accept) assert.match(out.reason, /父|parent/i);
});

test("other message types are ignored, not rejected loudly", () => {
  const out = readInjection({ type: "something-else", scenario: "x" }, embedded);
  assert.equal(out.accept, false);
  if (!out.accept) assert.match(out.reason, /类型|type/i);
});

test("the scenario must arrive as text, not as a pre-parsed object", () => {
  // One shape only: the chapter page holds the JSON text and the simulator is the sole
  // parser, so a hand-built object can never skip past parseScenario's whitelist.
  const out = readInjection(
    { type: INJECT_MESSAGE_TYPE, scenario: { schemaVersion: 1 } },
    embedded,
  );
  assert.equal(out.accept, false);
  if (!out.accept) assert.match(out.reason, /字符串|string|文本/i);
});

test("unknown keys on the message are refused", () => {
  const out = readInjection({ ...okMessage, eval: "alert(1)" }, embedded);
  assert.equal(out.accept, false);
  if (!out.accept) assert.match(out.reason, /字段|field/i);
});

test("a malformed message body is refused without throwing", () => {
  for (const bad of [undefined, null, "text", 42, []]) {
    const out = readInjection(bad, embedded);
    assert.equal(out.accept, false);
  }
});

test("the reply tells the host page what happened, without leaking internals", () => {
  const good = buildInjectionResult(true, []);
  assert.deepEqual(good, { type: `${INJECT_MESSAGE_TYPE}-result`, ok: true, errors: [] });
  const bad = buildInjectionResult(false, ['出现了规范里没有的字段（"x"）']);
  assert.equal(bad.ok, false);
  assert.equal(bad.errors.length, 1);
  assert.equal(bad.type, `${INJECT_MESSAGE_TYPE}-result`);
});
