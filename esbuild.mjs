import { build } from "esbuild";
import { cpSync, mkdirSync } from "node:fs";

mkdirSync("media/fonts", { recursive: true });
for (const w of [400, 700]) {
  const f = `atkinson-hyperlegible-latin-${w}-normal.woff2`;
  cpSync(`node_modules/@fontsource/atkinson-hyperlegible/files/${f}`, `media/fonts/${f}`);
}

await build({
  entryPoints: ["src/extension.ts"],
  bundle: true,
  outfile: "dist/extension.cjs",
  platform: "node",
  format: "cjs",
  target: "node20",
  external: ["vscode"],
  minify: true,
  sourcemap: false,
});
