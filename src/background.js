/**
 * Lentera background service worker.
 *
 * Three jobs: run summaries from the context menu, answer the Alt+Shift+L
 * shortcut, and relay messages from the popup.
 *
 * Why this worker never warms the model: the Chrome Prompt API gates model
 * download behind a user activation event. A service worker has no such gesture,
 * so `initializeDeviceModel()` here would hang or throw. The worker therefore
 * only ever runs inference against an already-warm model, and the popup owns
 * warmup.
 *
 * Commands and the context menu need user feedback that a worker cannot render,
 * so they hand off to the popup by opening it and passing the text through
 * chrome.storage.session.
 */

import { decideMode, classify } from "./router.js";
import { createHybridModel } from "./firebase.js";

const PROMPT =
  "Summarise the following document in 5 short bullet points. Keep numbers and names. Do not invent anything.\n\n";

/** Handoff slot the popup reads on open. Session storage dies with the browser. */
const HANDOFF_KEY = "lentera.pendingText";

const hasChrome = typeof chrome !== "undefined" && chrome.runtime;

hasChrome && chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "lentera-summarise",
    title: "Summarise with Lentera",
    contexts: ["selection", "page"],
  });
});

/**
 * Pull readable text from a tab and hand it to the popup.
 *
 * Selection wins when it is long enough to be worth summarising; otherwise the
 * page's main text block is used.
 */
async function handOffToPopup(tabId) {
  const results = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const selection = (globalThis.getSelection?.()?.toString() || "").trim();
      if (selection.length > 200) return selection;

      const clone = document.body.cloneNode(true);
      for (const sel of ["script", "style", "nav", "header", "footer", "aside", "form", "noscript", "iframe"]) {
        clone.querySelectorAll(sel).forEach((n) => n.remove());
      }
      let best = null;
      let bestScore = 0;
      for (const el of clone.querySelectorAll("article, main, div, section")) {
        const ps = el.querySelectorAll("p");
        if (ps.length < 2) continue;
        let textLen = 0;
        for (const p of ps) textLen += (p.textContent || "").trim().length;
        let linkLen = 0;
        for (const a of el.querySelectorAll("a")) linkLen += (a.textContent || "").trim().length;
        const score = textLen / Math.max(1, linkLen + 1);
        if (textLen > 400 && score > bestScore) {
          bestScore = score;
          best = el;
        }
      }
      const source = best || clone;
      return (source.innerText || source.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
    },
  });

  const text = (results[0] && results[0].result) || "";
  if (!text) return false;

  await chrome.storage.session.set({ [HANDOFF_KEY]: text });
  await chrome.action.open();
  return true;
}

hasChrome && chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "lentera-summarise" || !tab || tab.id == null) return;
  try {
    await handOffToPopup(tab.id);
  } catch (err) {
    console.error("[lentera] context menu failed", err);
  }
});

// Alt+Shift+L is declared in the manifest but does nothing without a listener.
// It cannot summarise on its own: a keyboard event grants no user activation for
// a popup, and the summary needs to be visible, so it opens the popup instead.
hasChrome && chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "_execute_action") return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id != null) await handOffToPopup(tab.id);
  } catch (err) {
    console.error("[lentera] command failed", err);
  }
});

hasChrome && chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "LENTERA_SUMMARISE") {
    runSummary(msg.text || "")
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ error: String(err && err.message ? err.message : err) }));
    return true;
  }
  return false;
});

/**
 * Run a summary for a message-passed request.
 *
 * Only the popup calls this, and only after it has warmed the model, so the
 * device path is safe here. A direct call from any other context that somehow
 * knows the message shape would hit a cold model and fall back to cloud, which
 * the badge reports honestly rather than hiding.
 */
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

// Exposed for the popup and for tests; the message listener below is the only
// entry point in production.
export { runSummary, PROMPT, HANDOFF_KEY };
