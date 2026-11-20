/**
 * Anonymous device identity for Lentera.
 *
 * There is no account system, so Firestore needs something to scope rows by.
 * This module mints a random UUID on first run and keeps it in
 * chrome.storage.local. It is never displayed, never logged, and never derived
 * from document text — it is only an ownership handle.
 *
 * The Firestore rules require every write to carry this value as `ownerId`, and
 * refuse any read whose document has a different one.
 */

const STORAGE_KEY = "lentera.deviceId";

/** RFC 4122 v4 UUID. Falls back to getRandomValues when randomUUID is absent. */
function uuidv4() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  if (!c || !c.getRandomValues) {
    throw new Error("no crypto source for device id");
  }
  const b = c.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0"));
  return `${h.slice(0, 4).join("")}-${h.slice(4, 6).join("")}-${h.slice(6, 8).join("")}-${h.slice(8, 10).join("")}-${h.slice(10).join("")}`;
}

export async function getDeviceId() {
  const store = globalThis.chrome?.storage?.local;
  if (!store) {
    // No extension storage (e.g. the hosted demo page). Use a per-load id so
    // the call still works instead of throwing.
    return uuidv4();
  }
  const { [STORAGE_KEY]: existing } = await store.get(STORAGE_KEY);
  if (existing) return existing;
  const created = uuidv4();
  await store.set({ [STORAGE_KEY]: created });
  return created;
}
