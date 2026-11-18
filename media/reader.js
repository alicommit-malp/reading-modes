// Reader panel: live mode changes, refresh, gg/G scrolling, ADHD reading progress.
(() => {
  const vscode = acquireVsCodeApi();
  const doc = document.getElementById("doc");
  const bar = document.getElementById("readprogress");

  window.addEventListener("message", (e) => {
    if (typeof e.data.modes === "string") doc.className = e.data.modes;
  });

  document.getElementById("refresh").addEventListener("click", () => {
    vscode.postMessage({ type: "refresh" });
  });

  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a) return;
    e.preventDefault();
    vscode.postMessage({ type: "open", href: a.getAttribute("href") });
  });

  let lastG = 0;
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "r") vscode.postMessage({ type: "refresh" });
    else if (e.key === "G") window.scrollTo(0, document.body.scrollHeight);
    else if (e.key === "g") {
      if (Date.now() - lastG < 500) window.scrollTo(0, 0);
      lastG = Date.now();
    }
  });

  const progress = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = max > 0 ? `${(window.scrollY / max) * 100}%` : "100%";
  };
  window.addEventListener("scroll", progress, { passive: true });
  if (document.body.dataset.start === "end") window.scrollTo(0, document.body.scrollHeight);
  progress();
})();
