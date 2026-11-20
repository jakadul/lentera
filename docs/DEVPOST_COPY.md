# Devpost submission text (English)

Paste into the submission form fields as marked.

---

## Project name

Lentera — on-device when it fits, cloud when it has to

## Tagline (one line)

Summarise long documents locally with Firebase AI Logic, and know exactly when
your text left the machine.

## Elevator pitch (first 2 sentences judges read)

Lentera is a Chrome extension that summarises reading material using Firebase AI
Logic hybrid inference: short documents run on-device with Gemini Nano, long ones
escalate to the cloud, and the UI reports which path was taken for every single
request. The routing decision is the product — not a hidden fallback, but a
visible privacy signal.

## Built with

Firebase AI Logic, Gemini Nano (Chrome Prompt API), Firebase App Check with
reCAPTCHA Enterprise, Cloud Firestore, Chrome Extensions MV3, Vite.

## Inspiration

Every summariser on the market ships the document to a cloud model. Chrome 139
shipped an on-device model that is free, offline, and private — and almost nobody
uses it, because the hybrid SDK falls back to cloud silently and the user never
learns their text left the machine. Lentera exists to make that legible.

## What it does

- Summarises the current page, a selection, or pasted text into five faithful
  bullet points.
- Decides per request whether the text fits the 9216-token on-device ceiling and
  whether the Chrome Prompt API is available.
- Runs on-device when it can, and says so in the header badge.
- Escalates to `gemini-3.5-flash-lite` when the text is too long or the browser
  cannot run a local model, and says so in the same badge.
- Writes a history entry to Firestore when Firebase is configured.
- Shows the real App Check and Prompt API state in the footer, for diagnosis.

## How we built it

`router.js` estimates tokens (3.2 chars/token, deliberately conservative) and
probes `LanguageModel.availability()`, then returns an explicit `InferenceMode`
for `getGenerativeModel()`. Relying on the SDK's built-in fallback would be
simpler, but it would make the privacy claim in the UI false for any request
that quietly went to the cloud.

`initializeDeviceModel()` is called from the popup click handler only, because the
Chrome Prompt API gates the model download behind a user activation event. The
service worker has no such gesture, so it only ever runs inference against an
already-warm model.

`classify()` reads `response.inferenceSource` (JS SDK v12.5.0+) and compares
case-insensitively, so an SDK casing change cannot silently mislabel an on-device
response as "Unknown".

## How we use Firebase AI Logic

`getAI(app, { backend: new GoogleAIBackend() })` then
`getGenerativeModel(ai, { mode, onDeviceParams, inCloudParams })`. The same model
surface serves both runtimes; only `mode` differs. App Check is enforced on AI
Logic by the console workflow, with reCAPTCHA Enterprise as the attestation
provider, so no unauthenticated request can reach the Gemini API.

## Challenges we ran into

- The on-device ceiling (9216 tokens) is easy to hit on real articles, so the
  router has to escalate rather than truncate — truncation would silently drop
  content.
- Model download takes minutes and needs a user gesture, so warmup lives in the
  popup and the background worker stays strictly inference-only.
- On-device inference rejects PDFs and audio outright, so the extension reads
  rendered text from the DOM instead of accepting files.

## What's next

- Selection-scoped summarisation from the context menu (wired, needs product
  polish).
- Firefox and Safari fall back to cloud cleanly; Android and iOS builds would
  complete the multi-platform story the Grand Prize favours.
- Citation spans that map summary bullets back to source paragraphs.

## Accomplishments we're proud of

- The privacy badge is derived from the SDK's own `inferenceSource` field, so it
  cannot drift from reality.
- Every routing branch is covered by tests that run without a browser
  (`npm test`, 8 passing).
- Verified offline on-device summarisation with the network tab empty.

## What we learned

Hybrid inference is a product decision, not a fallback strategy. Once the mode is
chosen explicitly, the honest disclosure of which runtime served a request
becomes the feature.

---

## Built with (Devpost tag list)

firebase, google-gemini, chrome-extension, javascript, ai

## Try it

Repo: (GitHub URL)
Video: (YouTube URL)
Build: `npm install && npm run build`, then load `dist/` unpacked in
`chrome://extensions`. Requires Chrome 139+ desktop with
`chrome://flags/#prompt-api-for-gemini-nano-multimodal-input` enabled for the
on-device path; the cloud path works on any Chrome version.
