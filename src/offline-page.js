/**
 * On-device demonstration page.
 *
 * A hosted page is "highly encouraged" by the rules, and judges will not install
 * an unpacked extension. This page makes the hybrid path testable from a URL.
 *
 * Same router, same Firebase AI Logic call as the extension. The only difference
 * is transport: it runs in a normal tab rather than a popup. On Chrome 139+ with
 * the Prompt API available the badge reads On-device; elsewhere it reads Cloud and
 * says why. Either way it is the real thing.
 */

import { decideMode, classify, probeDeviceModel, ON_DEVICE_MAX_TOKENS } from "./router.js";
import { createHybridModel, appCheckStatus } from "./firebase.js";

const els = {
  input: document.getElementById("input"),
  go: document.getElementById("go"),
  out: document.getElementById("out"),
  badge: document.getElementById("badge"),
  hint: document.getElementById("hint"),
  diag: document.getElementById("diag"),
};

function setBadge(label, tone) {
  els.badge.textContent = label;
  els.badge.dataset.tone = tone || "neutral";
}

function setHint(text) {
  els.hint.textContent = text;
}

async function onGo() {
  const text = (els.input.value || "").trim();
  if (!text) {
    setHint("Paste some text first.");
    return;
  }

  els.go.disabled = true;
  els.out.textContent = "";
  setBadge("Checking", "busy");

  try {
    const probe = await probeDeviceModel();
    const decision = await decideMode(text, { probe: async () => probe });

    if (decision.mode === "PREFER_ON_DEVICE" && probe.state === "downloadable") {
      setBadge("Downloading model", "busy");
      const warm = createHybridModel("PREFER_ON_DEVICE");
      await warm.initializeDeviceModel((p) => setHint(`On-device model: ${Math.round(p * 100)}%`));
    }

    const model = createHybridModel(decision.mode);
    const result = await model.generateContent(
      "Summarise the following document in 5 short bullet points. Keep numbers and names. Do not invent anything.\n\n" + text
    );
    const cls = classify(result.response);

    els.out.textContent = result.response.text();
    setBadge(cls.label, cls.onDevice ? "local" : "cloud");
    setHint(
      `${decision.reason} · ~${decision.tokens} token` +
        (decision.tokens > ON_DEVICE_MAX_TOKENS ? " (over the on-device ceiling)" : "")
    );
  } catch (err) {
    setBadge("Failed", "err");
    setHint(String(err && err.message ? err.message : err));
  } finally {
    els.go.disabled = false;
  }
}

els.go.addEventListener("click", onGo);

(async function boot() {
  const probe = await probeDeviceModel();
  if (probe.state === "available") setBadge("On-device ready", "local");
  else if (probe.state === "downloadable") setBadge("Model not downloaded", "warn");
  else if (probe.state === "downloading") setBadge("Model downloading", "busy");
  else setBadge("Cloud only", "cloud");
  const check = await appCheckStatus();
  if (els.diag) els.diag.textContent = `App Check: ${check} · Prompt API: ${probe.state}`;
})();
