// Shared by the background script, popup and reader (ES module).
// Same names and labels as src/modes.ts.

export const ext = globalThis.browser ?? globalThis.chrome;

export const MODES = ["dyslexia", "autism", "adhd"];

export const MODE_LABELS = {
  dyslexia: "Dyslexia: wider spacing, legible font, cream background (reader)",
  autism: "Autism: muted colours, no motion",
  adhd: "ADHD: one paragraph in focus, highlighted key terms",
};

export const parseModes = (v) => (Array.isArray(v) ? MODES.filter((m) => v.includes(m)) : []);

// Synced storage, so the choice follows the browser profile like VS Code's settings sync.
export async function getModes() {
  const { modes } = await ext.storage.sync.get("modes");
  return parseModes(modes);
}

export const setModes = (modes) => ext.storage.sync.set({ modes: parseModes(modes) });

export function onModes(fn) {
  ext.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.modes) fn(parseModes(changes.modes.newValue));
  });
}

export const wrapperClass = (modes) => ["rm", ...modes.map((m) => `m-${m}`)].join(" ");
