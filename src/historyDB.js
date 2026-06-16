// Persistent calculation history via IndexedDB. Degrades gracefully when
// IndexedDB is unavailable (private mode, SSR, the in-app artifact preview):
// loads resolve to [] and saves are silent no-ops, so the app works regardless.
// History entries are plain serializable objects ({expr, result, fraction?,
// type, showDecimal?}) — structured-cloneable, no class instances.
const DB_NAME = "handycalc";
const STORE = "kv";
const KEY = "history";
const MAX = 200; // cap persisted entries so storage can't grow unbounded

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no indexedDB"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadHistory() {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const r = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
      r.onsuccess = () => resolve(Array.isArray(r.result) ? r.result : []);
      r.onerror = () => reject(r.error);
    });
  } catch {
    return [];
  }
}

export async function saveHistory(entries) {
  try {
    const db = await openDB();
    const trimmed = entries.slice(-MAX);
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(trimmed, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* unavailable — ignore */
  }
}

export async function clearHistory() {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* unavailable — ignore */
  }
}
