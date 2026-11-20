/**
 * Build entry point for both targets.
 *
 *   npm run build       -> dist/        MV3 extension
 *   npm run build:demo  -> dist-demo/   hosted page
 *
 * Vite's `define` only replaces an identifier that appears verbatim in the
 * source, and the placeholder tokens in src/firebase.js get mangled on disk by
 * some editors. So this script reads .env, patches src/firebase.js with the real
 * values, builds, then restores the placeholders. The committed source never
 * holds a project value, and the bundle always does.
 *
 * It also runs the post-build fixups itself, because invoking vite directly skips
 * the npm lifecycle hooks.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { loadEnv } from "vite";

const FIELDS = [
  ["apiKey", "VITE_FB_API_KEY"],
  ["authDomain", "VITE_FB_AUTH_DOMAIN"],
  ["projectId", "VITE_FB_PROJECT_ID"],
  ["storageBucket", "VITE_FB_STORAGE_BUCKET"],
  ["messagingSenderId", "VITE_FB_SENDER_ID"],
  ["appId", "VITE_FB_APP_ID"],
];

const args = process.argv.slice(2);
const isDemo = args.includes("--mode") && args[args.indexOf("--mode") + 1] === "demo";
const outDir = isDemo ? "dist-demo" : "dist";

const target = "src/firebase.js";
const original = readFileSync(target, "utf8");

const env = { ...process.env, ...loadEnv("production", process.cwd(), "VITE_") };
const missing = FIELDS.filter(([, k]) => !env[k]).map(([, k]) => k);
if (missing.length) {
  console.error("build: missing in .env -> " + missing.join(", "));
  process.exit(1);
}

let patched = original;
for (const [field, envKey] of FIELDS) {
  const pattern = new RegExp(`(^[ \\t]*${field}:[ \\t]*)"[^"]*"(,?[ \\t]*$)`, "m");
  if (!pattern.test(patched)) {
    console.error(`build: field ${field} not found in ${target}`);
    process.exit(1);
  }
  // $ is special in a replacement string, so escape it.
  const value = String(env[envKey]).replace(/\$/g, "\\$");
  patched = patched.replace(pattern, `$1"${value}"$2`);
}

// The App Check site key is a separate const, not part of firebaseConfig.
const siteKeyValue = String(env.VITE_FB_APPCHECK_SITE_KEY || "");
if (!siteKeyValue) {
  console.error("build: VITE_FB_APPCHECK_SITE_KEY is empty in .env");
  process.exit(1);
}
patched = patched.replace(
  /(^[ \t]*const APPCHECK_SITE_KEY = )"[^"]*";/m,
  `$1"${siteKeyValue}";`
);

writeFileSync(target, patched);

try {
  execFileSync("npx", ["vite", "build", ...args], { stdio: "inherit" });
  execFileSync("node", ["scripts/fix-ext-paths.mjs", ...(isDemo ? ["demo"] : [])], {
    stdio: "inherit",
  });
} finally {
  // Always restore, so a failed build cannot leave real values in the source.
  writeFileSync(target, original);
}

// Confirm the injection actually landed, and that no placeholder survived.
const { readdirSync, readFileSync: rf, statSync } = await import("node:fs");
const { join } = await import("node:path");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".js")) out.push(p);
  }
  return out;
}

let ok = 0;
let bad = 0;
for (const f of walk(outDir)) {
  const s = rf(f, "utf8");
  // The Firebase SDK ships its own __FIREBASE_DEFAULTS__ reference, which is
  // library code, not our config. Only our own tokens count as a leftover.
  const leftovers = ["__FIREBASE_API_KEY__", "__FIREBASE_PROJECT_ID__", "__APPCHECK_SITE_KEY__"].filter(
    (t) => s.includes(t)
  );
  if (leftovers.length) {
    console.error(`build: placeholder left in ${f}: ${leftovers.join(", ")}`);
    bad++;
  }
  if (s.includes(env.VITE_FB_PROJECT_ID) && s.includes(env.VITE_FB_APPCHECK_SITE_KEY)) ok++;
}
if (bad) process.exit(1);
console.log(
  ok > 0
    ? `build: config injected into ${ok} bundle file(s), no placeholders left`
    : "build: WARNING - config not found in output"
);
