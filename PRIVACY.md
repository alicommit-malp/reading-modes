# Privacy

Reading Modes (the VS Code extension and the browser extension) collects no data.

- Nothing is sent anywhere: no analytics, no telemetry, no servers of its own. The only network
  requests are for the images of an article in the reader view, which load from the article's own
  website, as they do on the page itself.
- The browser extension stores your chosen modes in the browser's own storage. If you have browser
  sync turned on, the browser syncs that choice between your devices, as it does for any extension setting.
- Text opened in the reader view is kept in the browser's session storage, on your device, and is
  deleted when the browser closes. Only the 20 newest documents are kept.
- The extension reads a page only when you ask it to (the toolbar button, the right-click menu or
  Alt+Shift+R), to show it in the reader view. Its styles apply to every page so the modes work everywhere.

Questions: open an issue at https://github.com/alicommit-malp/reading-modes/issues.
