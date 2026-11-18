import { ext } from "./modes.js";
import { isReader, openReader } from "./read.js";

function read(tab, options) {
  if (isReader(tab)) return; // Alt+Shift+R on the reader itself: nothing to do.
  openReader(tab, options).catch((e) => {
    console.error("Reading Modes: cannot open the reader", e);
    ext.action.setBadgeBackgroundColor({ color: "#c0392b" });
    ext.action.setBadgeText({ text: "!", tabId: tab.id });
    ext.action.setTitle({ title: `Reading Modes: cannot open the reader: ${e.message}`, tabId: tab.id });
  });
}

// Web pages only: not the reader tab, which is an extension page.
const PAGES = ["<all_urls>"];

// Firefox for Android has no context menus or commands; the popup still works there.
ext.runtime.onInstalled.addListener(async () => {
  if (!ext.contextMenus) return;
  await ext.contextMenus.removeAll();
  ext.contextMenus.create({ id: "rm-selection", title: "Read selection with Reading Modes", contexts: ["selection"], documentUrlPatterns: PAGES });
  ext.contextMenus.create({ id: "rm-page", title: "Read page with Reading Modes", contexts: ["page"], documentUrlPatterns: PAGES });
});

ext.contextMenus?.onClicked.addListener((info, tab) => {
  read(tab, { frameId: info.frameId, preferSelection: info.menuItemId === "rm-selection" });
});

ext.commands?.onCommand.addListener(async (command, tab) => {
  if (command !== "read") return;
  tab = tab ?? (await ext.tabs.query({ active: true, currentWindow: true }))[0];
  read(tab);
});
