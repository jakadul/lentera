/**
 * Post-build fixups for both targets.
 *
 *   fix-ext-paths.mjs          -> dist/       (extension)
 *   fix-ext-paths.mjs demo     -> dist-demo/  (hosted page)
 *
 * Vite emits root-absolute asset URLs ("/popup.js") because it assumes the HTML
 * is served from a domain root. An unpacked extension is served from
 * chrome-extension://<id>/, where "/popup.js" resolves above the extension and
 * 404s. The demo has the inverse problem on GitHub Pages, which serves from a
 * subpath. Both are fixed by rewriting those URLs to relative paths.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const target = process.argv[2];
const DIST = target === "demo" ? "dist-demo" : "dist";

function rewriteHtml(path) {
  const before = readFileSync(path, "utf8");
  const after = before.replace(/(src|href)="\/(?!https?:)/g, '$1="');
  if (after !== before) {
    writeFileSync(path, after);
    return true;
  }
  return false;
}

let touched = 0;
for (const name of readdirSync(DIST)) {
  if (!name.endsWith(".html")) continue;
  if (rewriteHtml(join(DIST, name))) {
    touched++;
    console.log(`[fix-ext-paths] ${name}: asset URLs made relative`);
  }
}
if (touched === 0) console.log("[fix-ext-paths] nothing to do");
