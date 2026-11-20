/**
 * Hybrid routing for Lentera.
 *
 * The product is the routing decision, not the model call. `PREFER_ON_DEVICE`
 * already falls back to the cloud by itself, but a silent fallback means the UI
 * would claim "on-device" for a request that actually left the machine. So the
 * mode is computed here, before the call, and the result is reported honestly
 * afterwards from `response.inferenceSource`.
 */

/** The Chrome Prompt API reports a hard ceiling of 9216 tokens for on-device. */
export const ON_DEVICE_MAX_TOKENS = 9216;

/**
 * Rough characters-per-token for mixed English/Indonesian prose.
 * Deliberately low: escalate a borderline document rather than truncate it.
 */
const CHARS_PER_TOKEN = 3.2;

/** Estimate tokens without a tokenizer round-trip. */
export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Availability of the on-device model, mirroring LanguageModel.availability().
 * Possible values: "unavailable" | "downloadable" | "downloading" | "available".
 */
export async function probeDeviceModel() {
  if (typeof globalThis.LanguageModel === "undefined") {
    return { state: "unavailable", reason: "Prompt API not present (needs Chrome 139+ desktop)" };
  }
  try {
    const state = await globalThis.LanguageModel.availability();
    return { state };
  } catch (err) {
    return { state: "unavailable", reason: String(err && err.message ? err.message : err) };
  }
}

/**
 * Decide the inference mode for one request.
 *
 * Returns { mode, reason, tokens, device }. `mode` is one of the InferenceMode
 * values from firebase/ai, so it can be passed straight to getGenerativeModel().
 */
export async function decideMode(text, opts = {}) {
  const tokens = opts.estimateTokens ? opts.estimateTokens(text) : estimateTokens(text);
  const forceCloud = opts.forceCloud === true;
  const probe = opts.probe ? await opts.probe() : await probeDeviceModel();

  if (forceCloud) {
    return { mode: "PREFER_IN_CLOUD", reason: "user pinned cloud", tokens, device: probe.state };
  }

  // Over the on-device ceiling. Cloud, and say why.
  if (tokens > ON_DEVICE_MAX_TOKENS) {
    return {
      mode: "PREFER_IN_CLOUD",
      reason: `~${tokens} tokens exceeds the ${ON_DEVICE_MAX_TOKENS} on-device limit`,
      tokens,
      device: probe.state,
    };
  }

  if (probe.state === "unavailable") {
    return { mode: "PREFER_IN_CLOUD", reason: "on-device model unavailable", tokens, device: probe.state };
  }

  // Present but unfetched. Let the SDK start the download on first use.
  if (probe.state === "downloadable" || probe.state === "downloading") {
    return {
      mode: "PREFER_ON_DEVICE",
      reason: probe.state === "downloadable" ? "model will download on first use" : "model downloading",
      tokens,
      device: probe.state,
    };
  }

  return { mode: "PREFER_ON_DEVICE", reason: "fits on-device budget", tokens, device: "available" };
}

/**
 * Classify a response so the UI can label it.
 *
 * `inferenceSource` is "on_device" or "in_cloud" (JS SDK v12.5.0+). Compared
 * case-insensitively so an SDK casing change cannot silently turn a real
 * on-device response into an "Unknown" in the badge.
 */
export function classify(response) {
  const raw = response && response.inferenceSource ? String(response.inferenceSource) : "";
  const src = raw.toLowerCase();
  const onDevice = src === "on_device";
  const inCloud = src === "in_cloud";
  return {
    source: raw || "UNKNOWN",
    onDevice,
    label: onDevice ? "On-device" : inCloud ? "Cloud" : "Unknown",
  };
}
