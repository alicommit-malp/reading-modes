import * as vscode from "vscode";
import MarkdownIt from "markdown-it";
import { type Mode } from "./modes.ts";
import { wrapperClass } from "./wrap.ts";

// html: false escapes any raw HTML in the text, so terminal output can't inject markup.
const md = new MarkdownIt({ html: false, linkify: false, breaks: false });

export interface Source {
  title: string;
  // Open scrolled to the bottom, where the newest terminal output is.
  startAtEnd?: boolean;
  // Re-reads the text (e.g. captures the terminal again) for the refresh button.
  load(): Promise<string>;
}

export class Reader {
  private static panels = new Set<Reader>();
  private text = "";

  static updateAll(modes: Mode[]): void {
    for (const r of Reader.panels) void r.panel.webview.postMessage({ modes: wrapperClass(modes) });
  }

  static async open(ctx: vscode.ExtensionContext, source: Source, modes: () => Mode[]): Promise<void> {
    const text = await source.load();
    const media = vscode.Uri.joinPath(ctx.extensionUri, "media");
    const panel = vscode.window.createWebviewPanel(
      "readingModes.reader",
      `Read: ${source.title}`,
      { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false },
      { enableScripts: true, localResourceRoots: [media] },
    );
    const reader = new Reader(ctx, panel, source, modes, text);
    Reader.panels.add(reader);
    panel.onDidDispose(() => Reader.panels.delete(reader));
  }

  private constructor(
    private readonly ctx: vscode.ExtensionContext,
    private readonly panel: vscode.WebviewPanel,
    private readonly source: Source,
    private readonly modes: () => Mode[],
    text: string,
  ) {
    this.text = text;
    // A hidden webview is torn down and rebuilt from its html when shown again,
    // so mode changes it missed while hidden are applied by re-rendering.
    panel.onDidChangeViewState((e) => {
      if (e.webviewPanel.visible) this.render();
    });
    panel.webview.onDidReceiveMessage((msg: { type: string; href?: string }) => {
      if (msg.type === "refresh") void this.refresh();
      if (msg.type === "open" && msg.href && /^https?:\/\//i.test(msg.href)) {
        void vscode.env.openExternal(vscode.Uri.parse(msg.href));
      }
    });
    this.render();
  }

  private async refresh(): Promise<void> {
    try {
      this.text = await this.source.load();
      this.render();
    } catch (e) {
      void vscode.window.showErrorMessage(`Reading Modes: ${(e as Error).message}`);
    }
  }

  private render(): void {
    const w = this.panel.webview;
    const css = w.asWebviewUri(vscode.Uri.joinPath(this.ctx.extensionUri, "media", "modes.css"));
    const js = w.asWebviewUri(vscode.Uri.joinPath(this.ctx.extensionUri, "media", "reader.js"));
    const nonce = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16)).join("");
    const body = md.render(tidy(this.text));
    w.html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${w.cspSource}; font-src ${w.cspSource}; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${css}">
</head><body class="reader"${this.source.startAtEnd ? ' data-start="end"' : ""}>
<div id="readprogress"></div>
<header><span>${escapeHtml(this.source.title)}</span><button id="refresh" title="Refresh (r)">Refresh</button></header>
<div id="doc" class="${wrapperClass(this.modes())}">
${body}
</div>
<script nonce="${nonce}" src="${js}"></script>
</body></html>`;
  }
}

// Terminal lines carry trailing padding; drop it and runs of blank lines.
export function tidy(text: string): string {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
