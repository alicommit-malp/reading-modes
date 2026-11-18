import * as vscode from "vscode";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// One capture at a time: an overlapping one would save the other's marker
// text as the "user's clipboard" and restore that.
let queue: Promise<unknown> = Promise.resolve();

/**
 * The stable API cannot read a terminal's buffer, so this selects everything,
 * copies it through the clipboard and puts the user's clipboard text back.
 * Only text can be restored: an image on the clipboard is lost.
 */
export function captureTerminal(terminal: vscode.Terminal): Promise<string> {
  const run = queue.then(() => capture(terminal));
  queue = run.catch(() => undefined);
  return run;
}

async function capture(terminal: vscode.Terminal): Promise<string> {
  if (!vscode.window.terminals.includes(terminal)) {
    throw new Error(`The terminal "${terminal.name}" was closed.`);
  }
  const before = await vscode.env.clipboard.readText();
  const sentinel = `reading-modes-capture-${Math.random().toString(36).slice(2)}`;
  // preserveFocus: makes it the active terminal for the commands below without
  // pulling focus out of the reader panel on refresh.
  terminal.show(true);
  await vscode.env.clipboard.writeText(sentinel);
  try {
    await vscode.commands.executeCommand("workbench.action.terminal.selectAll");
    // copySelection needs the "text selected" context key, which is set a
    // moment after selectAll returns.
    for (let i = 0; i < 10; i++) {
      await vscode.commands.executeCommand("workbench.action.terminal.copySelection");
      const text = await vscode.env.clipboard.readText();
      if (text !== sentinel) return text;
      await wait(50);
    }
    throw new Error("Could not copy the terminal text (the terminal may be empty).");
  } finally {
    await vscode.commands.executeCommand("workbench.action.terminal.clearSelection");
    await vscode.env.clipboard.writeText(before);
  }
}
