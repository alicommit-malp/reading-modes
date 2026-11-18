// Copies the shared and third-party files into browser/ so it loads as an
// unpacked extension: the mode stylesheet of the VS Code reader, the font and
// Mozilla Readability. Run from the repo root: npm run build:browser
import { cpSync, mkdirSync } from "node:fs";

mkdirSync("browser/fonts", { recursive: true });
mkdirSync("browser/vendor", { recursive: true });
for (const w of [400, 700]) {
  const f = `atkinson-hyperlegible-latin-${w}-normal.woff2`;
  cpSync(`node_modules/@fontsource/atkinson-hyperlegible/files/${f}`, `browser/fonts/${f}`);
}
cpSync("node_modules/@fontsource/atkinson-hyperlegible/LICENSE", "browser/fonts/LICENSE");
cpSync("media/modes.css", "browser/modes.css");
cpSync("node_modules/@mozilla/readability/Readability.js", "browser/vendor/Readability.js");
cpSync("node_modules/@mozilla/readability/LICENSE.md", "browser/vendor/Readability-LICENSE.md");
