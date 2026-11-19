/**
 * Uso (desde la raíz del repo, con bash): node shoot.mjs <rootDir> <outDir> <w>x<h> board1.dc.html board2.dc.html ...
 * Sirve rootDir en 127.0.0.1 (puerto efímero), captura cada board con Playwright (apps/e2e), reporta errores de consola y cierra el servidor.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(path.join(process.cwd(), "apps/e2e/package.json"));
const { chromium } = require("@playwright/test");

const [root, outDir, size, ...boards] = process.argv.slice(2);
const [w, h] = size.split("x").map(Number);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
};

const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(root, rel);
  if (
    !file.startsWith(root) ||
    !fs.existsSync(file) ||
    fs.statSync(file).isDirectory()
  ) {
    res.writeHead(404);
    res.end("not found");
    return;
  }
  res.writeHead(200, {
    "content-type": types[path.extname(file)] || "application/octet-stream",
  });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: w, height: h },
  deviceScaleFactor: 1,
});
const report = [];
try {
  for (const b of boards) {
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
    page.on("console", (m) => {
      if (
        m.type() === "error" &&
        !/fonts\.g|ERR_|Failed to load resource/.test(m.text())
      )
        errs.push(m.text().slice(0, 200));
    });
    const out = path.join(outDir, b.replace(".dc.html", ".png"));
    try {
      await page.goto(`http://127.0.0.1:${port}/${b}`, { waitUntil: "load" });
      await page.waitForTimeout(900);
      await page.screenshot({ path: out, type: "png", fullPage: false });
    } catch (e) {
      report.push(`${b} FAILED ${String(e).slice(0, 160)}`);
      await page.close();
      continue;
    }
    const overflow = await page.evaluate(() => {
      const de = document.documentElement;
      return { sw: de.scrollWidth, sh: de.scrollHeight };
    });
    report.push(
      `${b} -> ${path.basename(out)} scroll=${overflow.sw}x${overflow.sh}${errs.length ? " ERR: " + errs.join(" | ") : ""}`,
    );
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log(report.join("\n"));
