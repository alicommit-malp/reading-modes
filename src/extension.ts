import * as vscode from "vscode";
import type MarkdownIt from "markdown-it";
import { ALL_SLOTS, MODES, MODE_LABELS, MODE_NAMES, type Mode, parseModes, syncSettings, type ConfigStore, type Saved, type SavedStore } from "./modes.ts";
import { wrapPlugin } from "./wrap.ts";
import { Reader } from "./reader.ts";
import { captureTerminal } from "./terminal.ts";
import { Focus } from "./focus.ts";

const savedKey = (id: string) => `readingModes.saved:${id}`;

const activeModes = (): Mode[] =>
  parseModes(vscode.workspace.getConfiguration("readingModes").get("modes"));

const userSettings: ConfigStore = {
  get(key, lang) {
    const info = vscode.workspace
      .getConfiguration(undefined, lang ? { languageId: lang } : undefined)
      .inspect(key);
    return lang ? info?.globalLanguageValue : info?.globalValue;
  },
  async set(key, lang, value) {
    await vscode.workspace
      .getConfiguration(undefined, lang ? { languageId: lang } : undefined)
      .update(key, value, vscode.ConfigurationTarget.Global, lang ? true : undefined);
  },
};

async function setModes(modes: Mode[]): Promise<void> {
  await vscode.workspace
    .getConfiguration("readingModes")
    .update("modes", MODES.filter((m) => modes.includes(m)), vscode.ConfigurationTarget.Global);
}

// The built-in Markdown extension can be disabled; then there is no preview to refresh.
async function refreshPreview(): Promise<void> {
  const commands = await vscode.commands.getCommands(true);
  if (!commands.includes("markdown.preview.refresh")) return;
  try {
    await vscode.commands.executeCommand("markdown.preview.refresh");
  } catch (e) {
    void vscode.window.showErrorMessage(`Reading Modes: could not refresh the Markdown preview: ${(e as Error).message}`);
  }
}

export function activate(ctx: vscode.ExtensionContext) {
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  status.command = "readingModes.pick";
  const focus = new Focus();
  ctx.subscriptions.push(status, focus);

  // Synced with Settings Sync, like the settings they belong to.
  ctx.globalState.setKeysForSync(ALL_SLOTS.map(savedKey));
  const saved: SavedStore = {
    get: (id) => ctx.globalState.get<Saved>(savedKey(id)),
    set: async (id, v) => ctx.globalState.update(savedKey(id), v),
  };

  // Serialised so overlapping toggles can't interleave their saves.
  let chain = Promise.resolve();
  const apply = () => {
    chain = chain.then(async () => {
      const modes = activeModes();
      await syncSettings(userSettings, saved, modes);
      status.text = `$(eye) ${modes.length ? modes.map((m) => MODE_NAMES[m]).join(" · ") : "Read"}`;
      status.tooltip = modes.length ? modes.map((m) => MODE_LABELS[m]).join("\n") : "Reading modes: off";
      status.show();
      focus.enabled = modes.includes("adhd");
      Reader.updateAll(modes);
    }).catch((e: Error) => {
      void vscode.window.showErrorMessage(`Reading Modes: could not apply settings: ${e.message}`);
    }).then(refreshPreview);
  };

  // Queued so two quick toggles don't both start from the same old list.
  let toggles = Promise.resolve();
  const toggle = (m: Mode) => () => {
    toggles = toggles.then(() => {
      const modes = activeModes();
      return setModes(modes.includes(m) ? modes.filter((x) => x !== m) : [...modes, m]);
    });
    return toggles;
  };

  const run = (fn: () => Promise<void>) => async () => {
    try {
      await fn();
    } catch (e) {
      void vscode.window.showErrorMessage(`Reading Modes: ${(e as Error).message}`);
    }
  };

  ctx.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("readingModes.modes")) apply();
    }),
    vscode.commands.registerCommand("readingModes.toggleDyslexia", toggle("dyslexia")),
    vscode.commands.registerCommand("readingModes.toggleAutism", toggle("autism")),
    vscode.commands.registerCommand("readingModes.toggleAdhd", toggle("adhd")),
    vscode.commands.registerCommand("readingModes.off", () => setModes([])),
    vscode.commands.registerCommand("readingModes.pick", async () => {
      const on = activeModes();
      const picked = await vscode.window.showQuickPick(
        MODES.map((m) => ({ label: MODE_LABELS[m], mode: m, picked: on.includes(m) })),
        { canPickMany: true, title: "Reading modes" },
      );
      if (picked) await setModes(picked.map((p) => p.mode));
    }),
    vscode.commands.registerCommand("readingModes.readTerminal", run(async () => {
      const t = vscode.window.activeTerminal;
      if (!t) throw new Error("No terminal is open.");
      await Reader.open(ctx, { title: t.name, startAtEnd: true, load: () => captureTerminal(t) }, activeModes);
    })),
    vscode.commands.registerCommand("readingModes.readSelection", run(async () => {
      const ed = vscode.window.activeTextEditor;
      if (!ed || ed.selection.isEmpty) throw new Error("Select some text first.");
      const text = ed.document.getText(ed.selection);
      const title = ed.document.fileName.split(/[\\/]/).pop() ?? "Selection";
      await Reader.open(ctx, { title, load: async () => text }, activeModes);
    })),
  );

  apply();

  return {
    extendMarkdownIt(md: MarkdownIt) {
      return md.use(wrapPlugin, activeModes);
    },
  };
}

export function deactivate() {}
