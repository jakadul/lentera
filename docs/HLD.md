# High Level Design — Lentera

## 1. Context

Lentera summarises reading material for people who read long documents on a
laptop: students with PDFs of papers, analysts with reports, anyone with forty
tabs. The existing options all send the whole document to a cloud model. That
costs money per character, needs a network, and means the text leaves the
machine.

Chrome 139 shipped an on-device model (Gemini Nano) reachable through the
Prompt API. It is free to run, works offline, and keeps text local. Its ceiling
is 9216 tokens, it does not accept PDFs or audio, and it is absent on Firefox,
Safari, and older Chrome. A product that only uses it fails for most documents;
a product that ignores it makes a privacy claim it cannot keep.

Lentera routes per request and reports which path was used.

## 2. Goals and non-goals

Goals
- Summarise a document in five faithful points, on-device when it fits.
- Tell the user, before and after the request, whether the text stayed local.
- Degrade to cloud silently for capability reasons, loudly for size reasons.

Non-goals
- Multi-turn chat over a document.
- PDF and audio input.
- Cross-device sync of document text.

## 3. Architecture

```
  user gesture (popup click / Alt+Shift+L)
            |
            v
  +-------------------+      +----------------------+
  |  popup.js         |      |  background.js (SW)  |
  |  user activation  |      |  context menu, msg   |
  +---------+---------+      +----------+-----------+
            |                           |
            +-------------+-------------+
                          |
                          v
                 +-------------------+
                 |  router.js        |  decides mode
                 |  - estimateTokens |
                 |  - probeDevice    |
                 +---------+---------+
                           |
                 getGenerativeModel(mode)
                           |
             +-------------+-------------+
             |                           |
     PREFER_ON_DEVICE           PREFER_IN_CLOUD
     Chrome Prompt API          gemini-3.5-flash-lite
     (Gemini Nano, local)       (Firebase AI Logic)
             |                           |
             +-------------+-------------+
                           |
                 response.inferenceSource
                 ("on_device" | "in_cloud")
                           |
                           v
                    UI badge + Firestore log
```

Two processes because they have different capabilities. The popup has a user
activation event, so only it may call `initializeDeviceModel()` and start the
model download. The service worker has no such gesture, so it can run
inference against an already-warm model but cannot warm it.

## 4. Routing

`router.js` decides mode from three inputs.

| Condition | Mode | Reason shown to user |
|---|---|---|
| text ≤ 9216 tokens and Prompt API available | `PREFER_ON_DEVICE` | fits on-device budget |
| text > 9216 tokens | `PREFER_IN_CLOUD` | over the on-device limit |
| Prompt API missing or model unavailable | `PREFER_IN_CLOUD` | on-device unavailable |
| model `downloadable` | `PREFER_ON_DEVICE` | download starts on first use |
| user pinned cloud | `PREFER_IN_CLOUD` | user pinned cloud |

Token count is estimated at 3.2 characters per token, deliberately low so a
document near the boundary escalates rather than truncates. The estimate is
shown in the UI alongside the final decision, so a mis-estimate is visible.

The default cloud fallback is `gemini-3.5-flash-lite`, overridable through
`inCloudParams.model`.

## 5. Key decisions

**Self-routing instead of relying on the SDK fallback.** `PREFER_ON_DEVICE`
already falls back to cloud when the local model is unavailable. Lentera
computes the decision first anyway, because a silent fallback means the UI
would claim local processing for a request that went to the cloud. Picking the
mode explicitly keeps the disclosure true, which is the product.

**`initializeDeviceModel()` in the click handler only.** The Chrome Prompt API
gates model download behind user activation. Calling it from the service worker
throws or hangs. Warmup therefore runs on popup open, and the worker only ever
sees a warm model.

**Per-request model instances.** Model configuration is fixed for the lifetime
of the instance, so a mode change needs a new instance rather than a mutation.

**No PDF support.** On-device inference rejects PDFs. Rather than half-support
them, the extension reads `document.body.innerText` and works on rendered text.

## 6. Data flow

1. Read the page via `chrome.scripting.executeScript` or the popup textarea.
2. `probeDeviceModel()` reads `LanguageModel.availability()`.
3. `decideMode()` returns `{ mode, reason, tokens, device }`.
4. Build the model, call `generateContent()`, then read
   `response.inferenceSource`.
5. Render text, badge, and hint; write a summary row to Firestore if signed in.

## 7. Security

- App Check is enforced on AI Logic by the console setup workflow. Local
  development uses the debug provider, whose token is printed to the console
  and registered in the Firebase console. It is gitignored and never shipped.
- The Firebase web config is a client config and is public by design; it is
  injected at build time from environment variables so no real value is
  committed.
- `host_permissions` is `<all_urls>` because the extension summarises any page.
  It is the minimum that makes the context menu work everywhere; narrowing it
  would break the feature on most sites.
- Extension CSP allows `'wasm-unsafe-eval'`, which the Firebase SDK needs.

## 8. Failure modes

| Failure | Behaviour |
|---|---|
| Prompt API absent | Routes to cloud, badge shows Cloud |
| Model download interrupted | Popup shows percentage; request proceeds in cloud |
| Request over token ceiling | Routes to cloud, hint states the token count |
| App Check token rejected | Badge shows Gagal, error text in hint |
| Offline with local model | Summarises locally, badge shows On-device |
| Offline without local model | Request fails, error surfaced in hint |

## 9. Evaluation

Judge-facing claims and where to verify them:
- Firebase AI Logic is called at runtime, not just imported: `createHybridModel()`
  in `src/firebase.js`, invoked from both `src/popup.js` and `src/background.js`.
- The mode decision is real: `src/router.js`, unit-testable in isolation.
- The inference source is reported truthfully: `classify()` reads
  `response.inferenceSource`, never a guess.
- App Check is enforced: console screenshot plus the debug-token flow in
  `initFirebase()`.
## 10. Extension entry points

Three ways in, all landing in the same place:

| Entry | Handler | Why it hands off |
|---|---|---|
| Toolbar icon | popup opens directly | it is the popup |
| Context menu item | `chrome.contextMenus.onClicked` | worker has no DOM to render into |
| `Alt+Shift+L` | `chrome.commands.onCommand` | same |

The worker cannot show a result, so both the context menu and the shortcut pull
the page text, stash it in `chrome.storage.session`, and call
`chrome.action.open()`. The popup drains that slot on boot and clears it, so a
later manual open does not re-summarise the same page.

A shortcut also cannot warm the on-device model: `initializeDeviceModel()` needs
a user activation event, and a command handler is not one. Opening the popup
gives the user a click to spend, which is why every path funnels there.

`storage.session` is used rather than `local` because the handoff is transient:
it is worthless once consumed, and session storage is cleared with the browser
session, so a stale page cannot resurface days later.

## 11. Known gaps

Deliberate, with reasons:

- **No PDF or audio input.** On-device inference rejects both outright.
- **No multi-turn chat.** Also unsupported on-device; a chat UI would silently
  be cloud-only on most documents, which defeats the premise.
- **No account system.** History is scoped by an anonymous device id. It is a
  128-bit random UUID, but it is a bearer token: anyone holding one can read
  that device's summaries. Document text is what is worth protecting, and that
  is what the rules guard.
- **No Chrome Web Store listing.** Review can take longer than the deadline.
