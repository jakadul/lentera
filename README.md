# Lentera

**On-device when it fits, cloud when it has to — and honest about which.**

Lentera is a Chrome extension and hosted demo that summarises reading material with
[Firebase AI Logic](https://firebase.google.com/docs/ai-logic) hybrid inference.
Short documents run on-device with Gemini Nano through the Chrome Prompt API. Long
ones escalate to a cloud model. For every request the UI reports which path was
taken, using the SDK's own `inferenceSource` field rather than a guess.

Built for #BuildHybridAI 2026.

## The problem

Every summariser ships the document to a cloud model. That costs money per
character, needs a network, and means the text leaves the machine. Chrome 139
shipped an on-device model that is free, offline and private — but the hybrid SDK
falls back to cloud *silently*, so a user who believes their text stayed local has
no way to know otherwise.

Lentera treats that fallback as a product decision rather than an implementation
detail. The mode is chosen explicitly before the call, and the outcome is shown
after it.

## Why this design

`PREFER_ON_DEVICE` already falls back to the cloud by itself. Lentera computes the
decision first anyway: a silent fallback would make the privacy claim in the
header false for any request that quietly went to the cloud. Picking the mode
explicitly keeps the disclosure true, which is the entire premise.

Routing rules:

| Condition | Mode | What the UI says |
|---|---|---|
| ≤ 9216 tokens and Prompt API available | `PREFER_ON_DEVICE` | fits on-device budget |
| > 9216 tokens | `PREFER_IN_CLOUD` | ~N tokens exceeds the 9216 on-device limit |
| Prompt API missing or model unavailable | `PREFER_IN_CLOUD` | on-device model unavailable |
| Model present but unfetched | `PREFER_ON_DEVICE` | model will download on first use |
| User pins cloud | `PREFER_IN_CLOUD` | user pinned cloud |

Token count is estimated at 3.2 characters per token, deliberately low, so a
borderline document escalates instead of being truncated. The estimate appears in
the UI next to the decision, so a mis-estimate is visible rather than silent.

The default cloud fallback is `gemini-3.5-flash-lite`, overridable via
`inCloudParams.model`.

## Firebase AI Logic usage

`getAI(app, { backend: new GoogleAIBackend() })` then
`getGenerativeModel(ai, { mode, onDeviceParams, inCloudParams })`.
`initializeDeviceModel()` is called from the popup click handler only, because the
Chrome Prompt API gates the model download behind a user activation event. App
Check is enforced on AI Logic with reCAPTCHA Enterprise as the attestation
provider; the popup footer shows the live App Check state.

## Run it

### Extension

```bash
cp .env.example .env    # fill in Firebase config + reCAPTCHA site key
npm install
npm run build
```

Then `chrome://extensions` → Developer mode → Load unpacked → `dist/`.

Requires Chrome 139+ desktop for the on-device path, with
`chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` enabled. The cloud
path works on any Chrome version.

### Hosted demo

```bash
npm run build:demo      # emits dist-demo/demo.html, deployable as a static site
```

## Verify

```bash
npm test      # 8 router tests, no browser needed
npm run build # extension bundle
```

## Layout

```
src/router.js        routing, token estimate, inferenceSource classify
src/firebase.js      AI Logic init, hybrid model, App Check
src/popup.js         popup UI, user-activation warmup
src/background.js    MV3 service worker, context menu
src/extract.js       readable-text extraction
demo.html            hosted demo page
docs/HLD.md          architecture, security, failure modes
docs/SETUP.md        Firebase + Chrome setup from zero
docs/SUBMISSION.md   judging criteria mapped to code
docs/VIDEO_SCRIPT.md demo video shot list
docs/DEVPOST_COPY.md submission form text
```

## Licence

Apache-2.0.
