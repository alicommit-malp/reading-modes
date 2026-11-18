// Reader page: shows a document extracted by read.js with the active modes.
// Mirrors media/reader.js (gg/G, ADHD progress bar, live mode changes).
import { ext, getModes, onModes, wrapperClass } from "./modes.js";

const doc = document.getElementById("doc");
const bar = document.getElementById("readprogress");

const DROP = "script, style, link, meta, base, iframe, frame, frameset, object, embed, form, input, button, textarea, select, noscript, svg, template";
const UNWRAP = "div, section, article, main";
const KEEP_ATTRS = new Set(["href", "src", "alt", "title", "colspan", "rowspan", "start", "datetime", "cite", "lang", "dir"]);

// null for a value that is not a URL (URL.parse would need Chrome 126 / Safari 18).
function absolute(value, base) {
  try {
    return new URL(value, base);
  } catch {
    return null;
  }
}

// The page's HTML is untrusted and this is a privileged extension page: keep
// only inert markup, and links and images that resolve to http(s).
function clean(html, base) {
  const tree = new DOMParser().parseFromString(html, "text/html").body;
  tree.querySelectorAll(DROP).forEach((el) => el.remove());
  // Readability nests the article in wrapper divs; flattening them makes the
  // paragraphs direct children of #doc, which the ADHD focus rule needs.
  tree.querySelectorAll(UNWRAP).forEach((el) => el.replaceWith(...el.childNodes));
  for (const el of tree.querySelectorAll("*")) {
    for (const { name } of [...el.attributes]) {
      if (!KEEP_ATTRS.has(name)) el.removeAttribute(name);
    }
    for (const name of ["href", "src", "cite"]) {
      const v = el.getAttribute(name);
      if (v === null) continue;
      const url = absolute(v, base);
      if (url && /^https?:$/.test(url.protocol)) el.setAttribute(name, url.href);
      else el.removeAttribute(name);
    }
    if (el.tagName === "A" && el.hasAttribute("href")) {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }
  }
  return [...tree.childNodes];
}

function theme() {
  const dark = matchMedia("(prefers-color-scheme: dark)").matches;
  document.body.classList.toggle("vscode-dark", dark);
  document.body.classList.toggle("vscode-light", !dark);
}

function progress() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  bar.style.width = max > 0 ? `${(window.scrollY / max) * 100}%` : "100%";
}

async function load() {
  const key = `doc:${location.hash.slice(1)}`;
  const item = (await ext.storage.session.get(key))[key];
  if (!item) {
    doc.append(Object.assign(document.createElement("p"), { className: "error", textContent: "This reader tab has expired (the browser was restarted). Open the page in the reader again." }));
    return;
  }
  document.title = item.title || "Reader";
  document.getElementById("title").textContent = item.title || "";
  const source = document.getElementById("source");
  if (/^https?:/.test(item.url || "")) source.href = item.url;
  else source.remove();
  if (item.error) {
    doc.append(Object.assign(document.createElement("p"), { className: "error", textContent: item.error }));
    return;
  }
  if (item.title) doc.append(Object.assign(document.createElement("h1"), { textContent: item.title }));
  if (item.byline) doc.append(Object.assign(document.createElement("p"), { className: "byline", textContent: item.byline }));
  doc.append(...clean(item.html, item.url));
  progress();
}

theme();
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", theme);
doc.className = wrapperClass(await getModes());
onModes((modes) => (doc.className = wrapperClass(modes)));

let lastG = 0;
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === "G") window.scrollTo(0, document.body.scrollHeight);
  else if (e.key === "g") {
    if (Date.now() - lastG < 500) window.scrollTo(0, 0);
    lastG = Date.now();
  }
});
window.addEventListener("scroll", progress, { passive: true });

await load();
