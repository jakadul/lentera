/**
 * Firebase AI Logic init for Lentera.
 *
 * Two things here are easy to get wrong and will fail the submission if they are:
 *
 *   1. App Check is enforced on AI Logic by the Firebase console workflow.
 *      Locally you must register a debug token, and that token must never be
 *      committed. The debug switch therefore comes from an environment variable
 *      resolved at build time, never from a value written in source.
 *
 *   2. The Firebase web config is a client config and is public by design. It is
 *      injected at build time from .env so no real project value is committed.
 *
 * Build with real values:
 *   cp .env.example .env   # then fill it in
 *   npm run build
 */

import { initializeApp, getApps } from "firebase/app";
import { initializeAppCheck, getToken, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAI, getGenerativeModel, GoogleAIBackend } from "firebase/ai";

const firebaseConfig = {
  apiKey: "__FIREBASE_API_KEY__",
  authDomain: "__FIREBASE_AUTH_DOMAIN__",
  projectId: "__FIREBASE_PROJECT_ID__",
  storageBucket: "__FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__FIREBASE_MESSAGING_SENDER_ID__",
  appId: "__FIREBASE_APP_ID__",
};

/** True when the build injected a real config rather than leaving placeholders. */
const isConfigured = () => !String(firebaseConfig.apiKey).startsWith("__");
export { isConfigured };

/**
 * App Check debug switch, baked in at build time from VITE_FB_APPCHECK_DEBUG.
 * Only ever true in a local build; the production build leaves it unset.
 */
const APPCHECK_DEBUG = "__APPCHECK_DEBUG__" === "true";

/**
 * reCAPTCHA Enterprise site key for App Check in a web build.
 *
 * App Check is not optional here: the Firebase console workflow enforces it on
 * AI Logic, and every generateContent() call is rejected without a valid token.
 * The site key is public (it ships in the client); the reCAPTCHA secret belongs
 * in the Firebase console only.
 */
const APPCHECK_SITE_KEY = "__APPCHECK_SITE_KEY__";

export function initFirebase() {
  if (!isConfigured()) {
    throw new Error(
      "Firebase config is still a placeholder. Fill in .env from Firebase console > Project settings, then run npm run build."
    );
  }

  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

  // Enabling the debug provider makes the SDK print a token to the console.
  // Safelist it in Firebase console > App Check > Apps > Manage debug tokens.
  // Never ship a build with this on.
  if (APPCHECK_DEBUG) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  initializeAppCheck(app, {
    isTokenAutoRefreshEnabled: true,
    provider: new ReCaptchaEnterpriseProvider(
      APPCHECK_SITE_KEY.startsWith("__") ? "6Le_placeholder" : APPCHECK_SITE_KEY
    ),
  });

  return app;
}

/**
 * Build the hybrid model.
 *
 * `mode` comes from router.js. `onDeviceParams` pins the expected languages and a
 * system prompt, because without it the on-device model receives no system
 * prompt at all and its answers drift away from the cloud path.
 */
export function createHybridModel(mode) {
  if (!isConfigured()) {
    throw new Error("Firebase is not configured; cannot create a model.");
  }
  const app = getApps().length ? getApps()[0] : initFirebase();
  const ai = getAI(app, { backend: new GoogleAIBackend() });

  const onDeviceParams = {
    createOptions: {
      expectedInputs: [{ type: "text", languages: ["en", "id"] }],
      expectedOutputs: [{ type: "text", languages: ["en", "id"] }],
      initialPrompts: [
        {
          role: "system",
          content: [
            {
              type: "text",
              value:
                "You are Lentera, a reading companion. Summarise faithfully. Never invent facts that are absent from the source text. Answer in the language of the source text.",
            },
          ],
        },
      ],
    },
  };

  return getGenerativeModel(ai, {
    mode,
    onDeviceParams,
    inCloudParams: { model: "gemini-3.5-flash-lite" },
  });
}

/** Reports whether an App Check token is obtainable, for the debug panel. */
export async function appCheckStatus() {
  try {
    const app = getApps()[0];
    if (!app) return "no-app";
    const { token } = await getToken(app, false);
    return token ? "present" : "absent";
  } catch (err) {
    return `error: ${err && err.message ? err.message : err}`;
  }
}
