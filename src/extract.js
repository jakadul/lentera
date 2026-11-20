/**
 * Readable-text extraction for Lentera.
 *
 * Reading-mode heuristic: pick the element with the highest ratio of paragraph
 * text to link text. Cheap, no readability dependency, works on most article
 * layouts. Returns { text, title }.
 */

export function extractReadableText(doc = document) {
  const clone = doc.body.cloneNode(true);

  // Drop what is never article content.
  for (const sel of ["script", "style", "nav", "header", "footer", "aside", "form", "noscript", "iframe"]) {
    clone.querySelectorAll(sel).forEach((n) => n.remove());
  }

  let best = null;
  let bestScore = 0;

  for (const el of clone.querySelectorAll("article, main, div, section")) {
    const paragraphs = el.querySelectorAll("p");
    if (paragraphs.length < 2) continue;

    let textLen = 0;
    for (const p of paragraphs) textLen += (p.textContent || "").trim().length;
    let linkLen = 0;
    for (const a of el.querySelectorAll("a")) linkLen += (a.textContent || "").trim().length;

    const score = textLen / Math.max(1, linkLen + 1);
    if (textLen > 400 && score > bestScore) {
      bestScore = score;
      best = el;
    }
  }

  const source = best || clone;
  const text = (source.innerText || source.textContent || "").replace(/\n{3,}/g, "\n\n").trim();
  return { text, title: doc.title || "" };
}

/** Selection if the user highlighted something substantial, else whole page. */
export function selectionOrPage() {
  const sel = (globalThis.getSelection?.()?.toString() || "").trim();
  if (sel.length > 200) return { text: sel, title: document.title };
  return extractReadableText(document);
}
