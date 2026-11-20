/**
 * Lentera background service worker.
 *
 * Two jobs: run summaries triggered from the context menu, and route messages
 * from the popup.
 *
 * Why this worker never warms the model: the Chrome Prompt API gates model
 * download behind a user activation event. A service worker has no such gesture,
 * so `initializeDeviceModel()` here would hang or throw. The worker therefore
 * only ever runs inference against an already-warm model, and the popup owns
 * warmup.
 */

import { decideMode, classify } from "./router.js";
import { createHybridModel } from "./firebase.js";

const PROMPT =
  "Summarise the following document in 5 short bullet points. Keep numbers and names. Do not invent anything.\n\n";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "lentera-summarise",
    title: "Summarise with Lentera",
    contexts: ["selection", "page"],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "lentera-summarise" || !tab || tab.id == null) return;
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.body.innerText,
    });
    const text = (results[0] && results[0].result) || "";
    const out = await runSummary(text);
    if (out.error) console.warn("[lentera]", out.error);
    else console.info("[lentera] summarised via", out.source);
  } catch (err) {
    console.error("[lentera] context menu failed", err);
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "LENTERA_SUMMARISE") {
    runSummary(msg.text || "")
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ error: String(err && err.message ? err.message : err) }));
    return true;
  }
  return false;
});

async function runSummary(text) {
  if (!text || !text.trim()) return { error: "no text" };

  const decision = await decideMode(text);
  const model = createHybridModel(decision.mode);
  const result = await model.generateContent(PROMPT + text);
  const cls = classify(result.response);

  return {
    text: result.response.text(),
    source: cls.source,
    reason: decision.reason,
    tokens: decision.tokens,
    at: Date.now(),
  };
}
