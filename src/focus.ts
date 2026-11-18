import * as vscode from "vscode";
import { blockAround, PROSE_LANGUAGES } from "./modes.ts";

/** ADHD mode in the editor: dim every paragraph except the one with the cursor. */
export class Focus implements vscode.Disposable {
  private readonly dim = vscode.window.createTextEditorDecorationType({ opacity: "0.7" });
  private readonly subs: vscode.Disposable[] = [];
  private on = false;

  constructor() {
    this.subs.push(
      vscode.window.onDidChangeTextEditorSelection((e) => this.paint(e.textEditor)),
      vscode.window.onDidChangeVisibleTextEditors((eds) => eds.forEach((ed) => this.paint(ed))),
      vscode.workspace.onDidChangeTextDocument((e) => {
        for (const ed of vscode.window.visibleTextEditors) if (ed.document === e.document) this.paint(ed);
      }),
    );
  }

  set enabled(on: boolean) {
    this.on = on;
    vscode.window.visibleTextEditors.forEach((ed) => this.paint(ed));
  }

  private paint(ed: vscode.TextEditor): void {
    const prose = (PROSE_LANGUAGES as readonly string[]).includes(ed.document.languageId);
    if (!this.on || !prose) {
      ed.setDecorations(this.dim, []);
      return;
    }
    const doc = ed.document;
    const [start, end] = blockAround(doc.lineCount, (i) => doc.lineAt(i).isEmptyOrWhitespace, ed.selection.active.line);
    const ranges: vscode.Range[] = [];
    if (start > 0) ranges.push(new vscode.Range(0, 0, start, 0));
    if (end < doc.lineCount - 1) ranges.push(new vscode.Range(end + 1, 0, doc.lineCount, 0));
    ed.setDecorations(this.dim, ranges);
  }

  dispose(): void {
    this.dim.dispose();
    this.subs.forEach((s) => s.dispose());
  }
}
