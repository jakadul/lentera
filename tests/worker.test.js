/**
 * Tests for the background worker's exported surface.
 *
 * The worker registers chrome.* listeners at import time, so these tests import
 * it in Node where `chrome` is undefined and assert the listeners are skipped
 * rather than throwing. That guard is what makes the module testable at all.
 */

import test from "node:test";
import assert from "node:assert/strict";

test("worker imports cleanly without a chrome global", async () => {
  const mod = await import("../src/background.js");
  assert.equal(typeof mod.runSummary, "function");
  assert.equal(typeof mod.PROMPT, "string");
  assert.equal(mod.HANDOFF_KEY, "lentera.pendingText");
});

test("runSummary rejects empty input instead of calling a model", async () => {
  const { runSummary } = await import("../src/background.js");
  assert.deepEqual(await runSummary(""), { error: "no text" });
  assert.deepEqual(await runSummary("   \n  "), { error: "no text" });
});

test("the summariser prompt asks for five points and no invention", async () => {
  const { PROMPT } = await import("../src/background.js");
  assert.match(PROMPT, /5 short bullet points/);
  assert.match(PROMPT, /Do not invent/);
});
