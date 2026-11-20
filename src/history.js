/**
 * Firestore history for Lentera.
 *
 * Writes are best-effort by design: a failed write must never cost the user
 * their summary, so every function here swallows its own errors after logging.
 *
 * The rules in firebase/firestore.rules enforce the same shape server-side, so
 * a bug in this file produces a rejected write rather than a bad row.
 */

import { getDeviceId } from "./identity.js";

const MAX_TEXT = 6000;

async function db() {
  const { getFirestore } = await import("firebase/firestore");
  const { getApps } = await import("firebase/app");
  const app = getApps()[0];
  if (!app) throw new Error("firebase not initialised");
  return getFirestore(app);
}

/**
 * @param {{text: string, source: string, tokens: number, charCount: number}} entry
 */
export async function saveSummary(entry) {
  try {
    const [{ collection, addDoc, serverTimestamp }, store] = await Promise.all([
      import("firebase/firestore"),
      db(),
    ]);
    const ownerId = await getDeviceId();
    await addDoc(collection(store, "summaries"), {
      ownerId,
      text: String(entry.text || "").slice(0, MAX_TEXT),
      source: entry.source,
      tokens: entry.tokens,
      charCount: entry.charCount,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.warn("[lentera] history write skipped:", err?.message || err);
    return false;
  }
}

/** Most recent summaries for this device, newest first. */
export async function listHistory(limit = 20) {
  try {
    const [{ collection, query, where, orderBy, limit: take, getDocs }, store] = await Promise.all([
      import("firebase/firestore"),
      db(),
    ]);
    const ownerId = await getDeviceId();
    const q = query(
      collection(store, "summaries"),
      where("ownerId", "==", ownerId),
      orderBy("createdAt", "desc"),
      take(limit)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn("[lentera] history read skipped:", err?.message || err);
    return [];
  }
}
