# Setup — Lentera from zero to loaded extension

Two things must be true before anything works: the extension has a Firebase
project behind it, and App Check is enforced on AI Logic. Everything else follows.

## 1. Firebase project

1. console.firebase.google.com → Add project. Analytics optional, skip it.
2. Project settings → Your apps → Web app (`</>`). Register, copy the config.
3. Build → AI Logic → Get started. Choose the **Gemini Developer API** provider
   (free tier). The workflow sets up the required APIs and, critically, **enables
   App Check enforcement on AI Logic**.

## 2. App Check

App Check is not optional. AI Logic rejects every request that arrives without a
valid App Check token.

1. Build → App Check → Apps → your web app → enable **reCAPTCHA Enterprise**.
2. Copy the **site key** it gives you. That goes in `VITE_FB_APPCHECK_SITE_KEY`.
   The reCAPTCHA *secret* stays in the Firebase console — never in the repo.
3. Local development: App Check → Apps → ⋮ → Manage debug tokens. Run the build
   once with `VITE_FB_APPCHECK_DEBUG=true`; the console prints a debug token;
   paste it back into that dialog and safelist it.

## 3. Environment

```bash
cp .env.example .env
# fill in the six Firebase values plus the reCAPTCHA site key
npm install
npm run build
```

For a local build with App Check debugging:

```bash
VITE_FB_APPCHECK_DEBUG=true npm run build
```

## 4. Chrome

On-device inference needs **Chrome 139+ on desktop**. Check `chrome://settings/help`.

1. Enable the flag `chrome://flags/#prompt-api-for-gemini-nano-multimodal-input`.
2. Restart Chrome.
3. Pre-download the model, otherwise the first request waits minutes:
   open DevTools on any page and run
   ```js
   await LanguageModel.availability()   // "available" | "downloadable" | "unavailable"
   await LanguageModel.create()          // starts the download if needed
   ```

The model is a few GB and needs free disk space. Without it, the extension still
works — it just runs everything in the cloud.

## 5. Load it

1. `chrome://extensions` → Developer mode on.
2. Load unpacked → select `dist/`.
3. Open any article, hit `Alt+Shift+L` or click the toolbar icon.

The popup footer prints the live App Check and Prompt API state. If it reads
`App Check: error ...`, the site key or the enforcement setting is wrong. If it
reads `Prompt API: unavailable`, the Chrome version or the flag is wrong.

## Troubleshooting

| Symptom | Cause |
|---|---|
| `Firebase config is still a placeholder` | `.env` not filled, or build run before editing it |
| `App Check: error` | site key missing, or App Check not enabled on the app |
| Badge stuck on "Cloud only" | Chrome < 139, flag off, or model not downloaded |
| Everything cloud, badge says over limit | document really is over 9216 tokens |
| `Failed` on first call | model still downloading; wait, then retry |
