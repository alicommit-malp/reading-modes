// Opens the selection, or the page's main article, in reader.html.
// Called from a user action (popup, menu, shortcut), which grants activeTab.
import { ext } from "./modes.js";

const KEEP = 20;

function grabSelection() {
  const sel = getSelection();
  if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
  const box = document.createElement("div");
  for (let i = 0; i < sel.rangeCount; i++) box.append(sel.getRangeAt(i).cloneContents());
  return { title: document.title, url: location.href, html: box.innerHTML };
}

function grabArticle() {
  /* global Readability */
  const article = new Readability(document.cloneNode(true)).parse();
  if (!article?.content) return { title: document.title, url: location.href, error: "No article found on this page. Select the text you want to read and try again." };
  return { title: article.title || document.title, url: location.href, byline: article.byline || "", html: article.content };
}

async function inPage(tab, frameId, func) {
  const [res] = await ext.scripting.executeScript({ target: { tabId: tab.id, frameIds: [frameId ?? 0] }, func });
  return res?.result ?? null;
}

async function selection(tab, frameId) {
  try {
    return await inPage(tab, frameId, grabSelection);
  } catch (e) {
    // A selection inside a cross-origin frame is out of activeTab's reach.
    console.warn("Reading Modes: cannot read the selection, reading the page instead", e);
    return null;
  }
}

async function extract(tab, frameId, preferSelection) {
  try {
    const sel = preferSelection ? await selection(tab, frameId) : null;
    if (sel) return sel;
    await ext.scripting.executeScript({ target: { tabId: tab.id }, files: ["vendor/Readability.js"] });
    return await inPage(tab, 0, grabArticle);
  } catch (e) {
    // Browser pages, the extension stores and some PDFs refuse scripts.
    return { title: tab.title || "", url: tab.url || "", error: `This page cannot be read: ${e.message}` };
  }
}

// The reader is an extension page: no script can be injected there, and it is already the reader.
export const isReader = (tab) => (tab.url || "").startsWith(ext.runtime.getURL("reader.html"));

export async function openReader(tab, { frameId, preferSelection = true } = {}) {
  if (isReader(tab)) throw new Error("This tab is already the reader.");
  const doc = await extract(tab, frameId, preferSelection);
  const id = crypto.randomUUID();
  // Session storage: gone when the browser closes, and never leaves this machine.
  // Only the newest KEEP documents stay, so it never fills up (Chrome caps it at 10 MB).
  const { docs = [] } = await ext.storage.session.get("docs");
  const keep = [...docs, id].slice(-KEEP);
  await ext.storage.session.remove(docs.filter((d) => !keep.includes(d)).map((d) => `doc:${d}`));
  await ext.storage.session.set({ [`doc:${id}`]: doc, docs: keep });
  await ext.tabs.create({ url: ext.runtime.getURL(`reader.html#${id}`), index: tab.index + 1, openerTabId: tab.id });
}
