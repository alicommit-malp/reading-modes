// Runs on every page (classic script: content scripts cannot be modules).
// Puts rm-<mode> classes on <html>; page.css does the rest. For ADHD it also
// tracks the text block under the pointer and draws the reading progress bar.
(() => {
  const ext = globalThis.browser ?? globalThis.chrome;
  const MODES = ["dyslexia", "autism", "adhd"];
  const BLOCKS = "p, li, dd, dt, blockquote, pre, figcaption, td, th, h1, h2, h3, h4, h5, h6";
  const root = document.documentElement;
  const top = window === window.top;

  let fontAdded = false;
  function addFont() {
    // Content-script CSS cannot point url() at the extension, so the @font-face goes in from here.
    const style = document.createElement("style");
    style.textContent = [400, 700]
      .map((w) => `@font-face { font-family: "Atkinson Hyperlegible"; font-weight: ${w}; font-style: normal;
        font-display: swap; src: url("${ext.runtime.getURL(`fonts/atkinson-hyperlegible-latin-${w}-normal.woff2`)}") format("woff2"); }`)
      .join("\n");
    root.append(style);
    fontAdded = true;
  }

  let focused = null;
  let frame = 0;
  function setFocus(el) {
    if (el === focused) return;
    focused?.classList.remove("rm-focus");
    el?.classList.add("rm-focus");
    root.classList.toggle("rm-reading", !!el);
    focused = el;
  }
  function onMove(e) {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      setFocus(e.target instanceof Element ? e.target.closest(BLOCKS) : null);
    });
  }
  const onLeave = () => setFocus(null);

  let bar = null;
  function progress() {
    const max = root.scrollHeight - window.innerHeight;
    bar.style.width = max > 0 ? `${(window.scrollY / max) * 100}%` : "100%";
  }

  function adhd(on) {
    const method = on ? "addEventListener" : "removeEventListener";
    document[method]("mousemove", onMove, { passive: true });
    document[method]("mouseleave", onLeave);
    if (!on) setFocus(null);
    if (!top) return;
    window[method]("scroll", progress, { passive: true });
    if (on && !bar) {
      bar = document.createElement("div");
      bar.id = "rm-progress";
      root.append(bar);
      progress();
    } else if (!on && bar) {
      bar.remove();
      bar = null;
    }
  }

  let adhdOn = false;
  let wanted = [];
  const classesFor = (modes) => [
    ...modes.filter((m) => top || m !== "autism").map((m) => `rm-${m}`),
    ...(modes.length ? ["rm-any"] : []),
  ];
  function setClasses() {
    for (const m of MODES) root.classList.toggle(`rm-${m}`, wanted.includes(`rm-${m}`));
    root.classList.toggle("rm-any", wanted.includes("rm-any"));
  }
  // Inline scripts and frameworks often assign <html>'s className outright.
  new MutationObserver(() => {
    if (wanted.some((c) => !root.classList.contains(c))) setClasses();
  }).observe(root, { attributes: true, attributeFilter: ["class"] });

  function apply(modes) {
    wanted = classesFor(modes);
    setClasses();
    if (modes.includes("dyslexia") && !fontAdded) addFont();
    if (modes.includes("adhd") !== adhdOn) {
      adhdOn = !adhdOn;
      adhd(adhdOn);
    }
  }

  const parse = (v) => (Array.isArray(v) ? MODES.filter((m) => v.includes(m)) : []);
  ext.storage.sync.get("modes").then(({ modes }) => apply(parse(modes)), (e) => console.error("Reading Modes:", e));
  ext.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.modes) apply(parse(changes.modes.newValue));
  });
})();
