// historyDB persists via IndexedDB in the browser; here (Node, no IndexedDB)
// we verify it DEGRADES GRACEFULLY — loads return [], saves/clears are silent
// no-ops — so the app never breaks where storage is unavailable. Real
// persistence is verified in a browser.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadHistory, saveHistory, clearHistory } from "../src/historyDB.js";

test("loadHistory returns [] when IndexedDB is unavailable", async () => {
  assert.deepEqual(await loadHistory(), []);
});

test("saveHistory / clearHistory never throw without IndexedDB", async () => {
  await saveHistory([{ expr: "1+1", result: "2", type: "calc" }]);
  await clearHistory();
  assert.ok(true);
});
