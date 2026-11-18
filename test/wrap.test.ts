import { test } from "node:test";
import assert from "node:assert/strict";
import MarkdownIt from "markdown-it";
import { wrapPlugin } from "../src/wrap.ts";
import type { Mode } from "../src/modes.ts";

test("wraps rendered Markdown in the mode classes", () => {
  let modes: Mode[] = ["dyslexia", "adhd"];
  const md = new MarkdownIt().use(wrapPlugin, () => modes);
  assert.equal(md.render("hi"), '<div class="rm m-dyslexia m-adhd">\n<p>hi</p>\n</div>\n');
  modes = [];
  assert.equal(md.render("hi"), "<p>hi</p>\n");
});

test("wrapping works even when raw HTML is disabled", () => {
  const md = new MarkdownIt({ html: false }).use(wrapPlugin, () => ["autism"] as Mode[]);
  assert.equal(md.render("<b>x</b>"), '<div class="rm m-autism">\n<p>&lt;b&gt;x&lt;/b&gt;</p>\n</div>\n');
});
