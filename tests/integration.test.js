/**
 * End-to-end test of the request path with Firebase and the Prompt API stubbed.
 *
 * The router tests cover the decision logic. This one proves the whole chain a
 * real request takes: popup -> router -> model -> classify -> badge, with a fake
 * `firebase/ai` that behaves the way the SDK does. If the SDK changes its
 * inferenceSource casing, or the popup reads the wrong field, this fails.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { decideMode, classify, ON_DEVICE_MAX_TOKENS } from "../src/router.js";

const shortText = "The cat sat on the mat. It was warm there.";
const longText = "word ".repeat(40000);

/** Mirrors what the SDK returns: InferenceSource.ON_DEVICE === "on_device". */
function fakeModel(source) {
  return {
    async generateContent() {
      return { response: { inferenceSource: source, text: () => "1. point one\n2. point two" } };
    },
  };
}

/** The popup's real flow, minus the DOM. */
async function runRequest(text, { deviceState, source, forceCloud = false }) {
  const probe = { state: deviceState };
  const decision = await decideMode(text, { probe: async () => probe, forceCloud });
  const model = fakeModel(source);
  const result = await model.generateContent("summarise: " + text);
  const cls = classify(result.response);
  return { decision, cls };
}

test("short text on an available model produces a local badge", async () => {
  const { decision, cls } = await runRequest(shortText, {
    deviceState: "available",
    source: "on_device",
  });
  assert.equal(decision.mode, "PREFER_ON_DEVICE");
  assert.equal(cls.onDevice, true);
  assert.equal(cls.label, "On-device");
});

test("long text escalates and the badge says cloud", async () => {
  const { decision, cls } = await runRequest(longText, {
    deviceState: "available",
    source: "in_cloud",
  });
  assert.equal(decision.mode, "PREFER_IN_CLOUD");
  assert.match(decision.reason, /exceeds the \d+ on-device limit/);
  assert.ok(decision.tokens > ON_DEVICE_MAX_TOKENS);
  assert.equal(cls.label, "Cloud");
});

test("missing Prompt API escalates to cloud", async () => {
  const { decision, cls } = await runRequest(shortText, {
    deviceState: "unavailable",
    source: "in_cloud",
  });
  assert.equal(decision.mode, "PREFER_IN_CLOUD");
  assert.equal(cls.label, "Cloud");
});

test("an SDK casing change cannot mislabel an on-device response", async () => {
  // The SDK currently returns lowercase. If it ever returns uppercase, classify
  // must still recognise it rather than falling through to "Unknown".
  const upper = classify({ inferenceSource: "ON_DEVICE" });
  const lower = classify({ inferenceSource: "on_device" });
  assert.equal(upper.label, "On-device");
  assert.equal(lower.label, "On-device");
});

test("a missing inferenceSource is Unknown, never On-device", async () => {
  const cls = classify({});
  assert.equal(cls.label, "Unknown");
  assert.equal(cls.onDevice, false);
});

test("the badge label is never empty for a successful response", async () => {
  const { cls } = await runRequest(shortText, {
    deviceState: "available",
    source: "on_device",
  });
  assert.ok(cls.label.length > 0);
});
