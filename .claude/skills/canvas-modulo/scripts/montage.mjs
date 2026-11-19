/**
 * Uso (desde la raíz del repo): node montage.mjs <out.png> <columnas> <escala> img1.png img2.png ...
 * Arma una hoja de contactos con varias capturas para revisarlas de una vez.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire(path.join(process.cwd(), "apps/e2e/package.json"));
const { chromium } = require("@playwright/test");

const [out, colsS, scaleS, ...imgs] = process.argv.slice(2);
const cols = Number(colsS);
const scale = Number(scaleS);
const cells = imgs
  .map(
    (f) =>
      `<figure style="margin:0"><img style="width:100%;display:block;border:1px solid #888" src="data:image/png;base64,${fs.readFileSync(f).toString("base64")}"><figcaption style="font:12px monospace;color:#222">${f.split("/").pop()}</figcaption></figure>`,
  )
  .join("");
const browser = await chromium.launch();
const probe = await browser.newPage();
const first = imgs[0];
const buf = fs.readFileSync(first);
const w = buf.readUInt32BE(16);
const cw = Math.round(w * scale);
const page = await browser.newPage({
  viewport: { width: cols * (cw + 12) + 12, height: 400 },
});
await page.setContent(
  `<body style="margin:0;background:#ddd"><div style="display:grid;grid-template-columns:repeat(${cols},${cw}px);gap:12px;padding:12px">${cells}</div></body>`,
);
await page.waitForTimeout(300);
await page.screenshot({ path: out, type: "png", fullPage: true });
await browser.close();
