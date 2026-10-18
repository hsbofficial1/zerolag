// Render preview stills (bundle once):  node stills.mjs 90 300 ...
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const out = process.env.STILLS || "out/stills";
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const opts = { serveUrl, id: "ZeroLag", browserExecutable: "C:/Program Files/Google/Chrome/Application/chrome.exe" };
const composition = await selectComposition(opts);
for (const fr of process.argv.slice(2).map(Number)) {
  await renderStill({ ...opts, composition, frame: fr, output: path.join(out, `f${String(fr).padStart(5, "0")}.png`), scale: 0.5 });
  console.log("frame", fr);
}
