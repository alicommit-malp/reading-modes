import { test } from "node:test";
import assert from "node:assert/strict";
import { blockAround, parseModes, syncSettings, type ConfigStore, type Saved, type SavedStore } from "../src/modes.ts";

const id = (k: string, l?: string) => (l ? `[${l}]${k}` : k);

function fakeSettings(initial: Record<string, unknown> = {}, failOn?: string) {
  const data = new Map(Object.entries(initial));
  const store: ConfigStore = {
    get: (k, l) => data.get(id(k, l)),
    async set(k, l, v) {
      if (id(k, l) === failOn) throw new Error("settings.json is invalid");
      if (v === undefined) data.delete(id(k, l));
      else data.set(id(k, l), v);
    },
  };
  return { store, data };
}

function fakeSaved(): SavedStore & { map: Map<string, Saved> } {
  const map = new Map<string, Saved>();
  return {
    map,
    get: (i) => map.get(i),
    async set(i, v) {
      if (v === undefined) map.delete(i);
      else map.set(i, v);
    },
  };
}

test("parseModes keeps known modes in canonical order", () => {
  assert.deepEqual(parseModes(["adhd", "bold", "dyslexia"]), ["dyslexia", "adhd"]);
  assert.deepEqual(parseModes("adhd"), []);
});

test("turning a mode on then off restores the user's values", async () => {
  const { store, data } = fakeSettings({ "editor.cursorBlinking": "phase" });
  const saved = fakeSaved();
  await syncSettings(store, saved, ["autism"]);
  assert.equal(data.get("editor.cursorBlinking"), "solid");
  assert.equal(data.get("workbench.reduceMotion"), "on");

  await syncSettings(store, saved, []);
  assert.equal(data.get("editor.cursorBlinking"), "phase");
  assert.equal(data.has("workbench.reduceMotion"), false);
  assert.equal(saved.map.size, 0);
});

test("language-specific overrides go to [markdown] and [plaintext]", async () => {
  const { store, data } = fakeSettings();
  await syncSettings(store, fakeSaved(), ["dyslexia"]);
  assert.equal(data.get("[markdown]editor.wordWrapColumn"), 68);
  assert.equal(data.get("[plaintext]editor.wordWrapColumn"), 68);
  assert.equal(data.has("editor.wordWrapColumn"), false);
});

test("a value the user sets while the mode is on survives other syncs and turning it off", async () => {
  const { store, data } = fakeSettings({ "editor.smoothScrolling": true });
  const saved = fakeSaved();
  await syncSettings(store, saved, ["autism"]);
  data.set("editor.smoothScrolling", true);
  await syncSettings(store, saved, ["autism", "dyslexia"]);
  assert.equal(data.get("editor.smoothScrolling"), true);
  await syncSettings(store, saved, []);
  assert.equal(data.get("editor.smoothScrolling"), true);
});

test("a second window never records the mode's value as the original", async () => {
  const { store, data } = fakeSettings({ "editor.cursorBlinking": "phase" });
  const windowA = fakeSaved();
  await syncSettings(store, windowA, ["autism"]);
  // Window B runs before it sees A's saved entries.
  const windowB = fakeSaved();
  await syncSettings(store, windowB, ["autism"]);
  assert.equal(windowB.map.size, 0);
  await syncSettings(store, windowA, []);
  assert.equal(data.get("editor.cursorBlinking"), "phase");
});

test("a failed write keeps the originals of settings already changed", async () => {
  const { store, data } = fakeSettings({ "editor.cursorBlinking": "phase" }, "editor.smoothScrolling");
  const saved = fakeSaved();
  await assert.rejects(syncSettings(store, saved, ["autism"]), /invalid/);
  assert.equal(data.get("editor.cursorBlinking"), "solid");

  const fixed = fakeSettings(Object.fromEntries(data));
  await syncSettings(fixed.store, saved, []);
  assert.equal(fixed.data.get("editor.cursorBlinking"), "phase");
});

test("blockAround finds the paragraph around a line", () => {
  const lines = ["a", "b", "", "c", "d", "e", "", "f"];
  const around = (l: number) => blockAround(lines.length, (i) => lines[i] === "", l);
  assert.deepEqual(around(4), [3, 5]);
  assert.deepEqual(around(0), [0, 1]);
  assert.deepEqual(around(2), [2, 2]);
  assert.deepEqual(around(7), [7, 7]);
});

