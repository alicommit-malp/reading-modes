// Pure mode logic (no vscode import) so it can be unit tested with node --test.

export const MODES = ["dyslexia", "autism", "adhd"] as const;
export type Mode = (typeof MODES)[number];

export const MODE_NAMES: Record<Mode, string> = {
  dyslexia: "Dyslexia",
  autism: "Autism",
  adhd: "ADHD",
};

export const MODE_LABELS: Record<Mode, string> = {
  dyslexia: "Dyslexia: wider spacing, legible font, cream background",
  autism: "Autism: muted colours, no motion",
  adhd: "ADHD: one paragraph in focus, highlighted key terms",
};

// Languages that are prose, not code: they get the proportional reading font.
export const PROSE_LANGUAGES = ["markdown", "plaintext"] as const;

export interface Override {
  key: string;
  lang?: string;
  value: unknown;
}

const FONT = "'Atkinson Hyperlegible', Verdana, Arial, sans-serif";

const prose = (key: string, value: unknown): Override[] =>
  PROSE_LANGUAGES.map((lang) => ({ key, lang, value }));

export const OVERRIDES: Record<Mode, Override[]> = {
  dyslexia: [
    { key: "terminal.integrated.letterSpacing", value: 2 },
    { key: "terminal.integrated.lineHeight", value: 1.3 },
    ...prose("editor.fontFamily", FONT),
    ...prose("editor.letterSpacing", 1.7), // px: ~0.12em at 14px
    ...prose("editor.lineHeight", 1.8),
    ...prose("editor.wordWrap", "wordWrapColumn"),
    ...prose("editor.wordWrapColumn", 68),
  ],
  autism: [
    { key: "workbench.reduceMotion", value: "on" },
    { key: "workbench.list.smoothScrolling", value: false },
    { key: "editor.cursorBlinking", value: "solid" },
    { key: "editor.cursorSmoothCaretAnimation", value: "off" },
    { key: "editor.smoothScrolling", value: false },
    { key: "terminal.integrated.cursorBlinking", value: false },
    { key: "terminal.integrated.smoothScrolling", value: false },
  ],
  adhd: [],
};

export function parseModes(raw: unknown): Mode[] {
  if (!Array.isArray(raw)) return [];
  return MODES.filter((m) => raw.includes(m));
}

export const slotId = (o: { key: string; lang?: string }) =>
  o.lang ? `[${o.lang}]${o.key}` : o.key;

// The user's own value from before a mode changed it, and what the mode set.
export interface Saved {
  had: boolean;
  original: unknown;
  applied: unknown;
}

export interface ConfigStore {
  // The user-level (global) value, or undefined when the user has none.
  get(key: string, lang?: string): unknown;
  set(key: string, lang: string | undefined, value: unknown): Promise<void>;
}

// One entry per setting slot, written before that setting is touched, so a
// failure part-way through never loses an original.
export interface SavedStore {
  get(id: string): Saved | undefined;
  set(id: string, saved: Saved | undefined): Promise<void>;
}

export const ALL_SLOTS = [...new Set(MODES.flatMap((m) => OVERRIDES[m].map(slotId)))];

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Bring the user settings in line with the active modes. A setting is saved
 * when a mode first overrides it. After that it only changes while it still
 * holds what a mode applied, so a value the user sets by hand while a mode is
 * on is kept, and is not replaced when the mode turns off.
 *
 * Several windows run this for the same change. A window that finds a setting
 * already holding the mode's value but no saved entry assumes another window
 * did the override, and does not record the mode's value as the original.
 */
export async function syncSettings(store: ConfigStore, saved: SavedStore, active: Mode[]): Promise<void> {
  const wanted = new Map<string, Override>();
  for (const m of active) for (const o of OVERRIDES[m]) wanted.set(slotId(o), o);

  for (const id of ALL_SLOTS) {
    const s = saved.get(id);
    if (!s || wanted.has(id)) continue;
    const { key, lang } = parseSlot(id);
    if (same(store.get(key, lang), s.applied)) {
      await store.set(key, lang, s.had ? s.original : undefined);
    }
    await saved.set(id, undefined);
  }

  for (const [id, o] of wanted) {
    const current = store.get(o.key, o.lang);
    const s = saved.get(id);
    if (s) {
      if (same(current, s.applied) && !same(current, o.value)) {
        await saved.set(id, { ...s, applied: o.value });
        await store.set(o.key, o.lang, o.value);
      }
      continue;
    }
    if (same(current, o.value)) continue;
    await saved.set(id, { had: current !== undefined, original: current, applied: o.value });
    await store.set(o.key, o.lang, o.value);
  }
}

function parseSlot(id: string): { key: string; lang?: string } {
  const m = /^\[([^\]]+)\](.+)$/.exec(id);
  return m ? { lang: m[1], key: m[2] } : { key: id };
}

/** Line range [start, end] of the blank-line separated block around `line`. */
export function blockAround(count: number, isBlank: (i: number) => boolean, line: number): [number, number] {
  if (isBlank(line)) return [line, line];
  let start = line;
  let end = line;
  while (start > 0 && !isBlank(start - 1)) start--;
  while (end < count - 1 && !isBlank(end + 1)) end++;
  return [start, end];
}
