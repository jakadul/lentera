/**
 * Router tests. Run with: node --test tests/
 *
 * No Firebase, no Chrome. The router is pure apart from one injected probe, so
 * every branch is reachable without a browser.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { decideMode, estimateTokens, classify, probeDeviceModel, ON_DEVICE_MAX_TOKENS } from "../src/router.js";

const longText = "a".repeat(ON_DEVICE_MAX_TOKENS * 4);
const shortText = "The cat sat on the mat.";

test("estimateTokens is linear and conservative", () => {
  assert.equal(estimateTokens(""), 0);
  assert.ok(estimateTokens(shortText) > 0);
  assert.ok(estimateTokens(longText) > ON_DEVICE_MAX_TOKENS);
});

test("short text with an available model stays on-device", async () => {
  const d = await decideMode(shortText, { probe: async () => ({ state: "available" }) });
  assert.equal(d.mode, "PREFER_ON_DEVICE");
  assert.match(d.reason, /fits on-device budget/);
});

test("oversized text escalates to cloud with a stated reason", async () => {
  const d = await decideMode(longText, { probe: async () => ({ state: "available" }) });
  assert.equal(d.mode, "PREFER_IN_CLOUD");
  assert.match(d.reason, /exceeds the \d+ on-device limit/);
  assert.ok(d.tokens > ON_DEVICE_MAX_TOKENS);
});

test("missing Prompt API escalates to cloud", async () => {
  const d = await decideMode(shortText, {
    probe: async () => ({ state: "unavailable", reason: "no LanguageModel" }),
  });
  assert.equal(d.mode, "PREFER_IN_CLOUD");
  assert.match(d.reason, /unavailable/);
});

test("downloadable model still prefers on-device", async () => {
  const d = await decideMode(shortText, { probe: async () => ({ state: "downloadable" }) });
  assert.equal(d.mode, "PREFER_ON_DEVICE");
  assert.match(d.reason, /download/);
});

test("user pin overrides size and capability", async () => {
  const d = await decideMode(longText, {
    forceCloud: true,
    probe: async () => ({ state: "available" }),
  });
  assert.equal(d.mode, "PREFER_IN_CLOUD");
  assert.equal(d.reason, "user pinned cloud");
});

test("classify reads the SDK enum values, not a guess", () => {
  assert.deepEqual(classify({ inferenceSource: "on_device" }), {
    source: "on_device",
    onDevice: true,
    label: "On-device",
  });
  assert.deepEqual(classify({ inferenceSource: "in_cloud" }), {
    source: "in_cloud",
    onDevice: false,
    label: "Cloud",
  });
  // Unknown must not silently claim local processing.
  assert.equal(classify({}).label, "Unknown");
  assert.equal(classify(undefined).onDevice, false);
});

test("probeDeviceModel degrades instead of throwing in Node", async () => {
  const p = await probeDeviceModel();
  assert.equal(p.state, "unavailable");
  assert.match(p.reason, /Prompt API not present/);
});