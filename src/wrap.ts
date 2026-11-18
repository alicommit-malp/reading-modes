import type { Mode } from "./modes.ts";

export const wrapperClass = (modes: Mode[]) =>
  ["rm", ...modes.map((m) => `m-${m}`)].join(" ");

// Only the part of markdown-it this plugin touches, so it accepts both the
// CJS and ESM markdown-it type declarations.
interface Html { content: string }
interface CoreState { tokens: Html[]; Token: new (type: string, tag: string, nesting: 0) => Html }
interface MarkdownLike { core: { ruler: { push(name: string, rule: (state: CoreState) => void): void } } }

/**
 * markdown-it plugin that wraps the whole document in <div class="rm m-...">
 * so the mode CSS applies. `getModes` is read on every render, so a refresh is
 * enough to pick up a change. With no active mode the output is untouched.
 */
export function wrapPlugin(md: MarkdownLike, getModes: () => Mode[]): void {
  md.core.ruler.push("reading_modes_wrap", (state) => {
    const modes = getModes();
    if (modes.length === 0) return;
    const open = new state.Token("html_block", "", 0);
    open.content = `<div class="${wrapperClass(modes)}">\n`;
    const close = new state.Token("html_block", "", 0);
    close.content = "</div>\n";
    state.tokens.unshift(open);
    state.tokens.push(close);
  });
}
