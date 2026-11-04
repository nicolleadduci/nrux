#!/usr/bin/env node
// Full-page screenshot of a web build, for the auto-scrolling browser frame
// on project cards and case studies.
//
// Usage:
//   node tools/capture-page.mjs <url-or-file> <slug> [name] [--width 1440] [--wait 2500]
//
// Writes media/<slug>/<name>.jpg (default name: "site"). Uses Playwright from the
// parent nrux project with the installed Google Chrome, so nothing to download.

import { createRequire } from "node:module";
import { mkdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "..", "..", "package.json"));
const { chromium } = require("playwright");

const [target, slug, maybeName, ...rest] = process.argv.slice(2);
if (!target || !slug) {
  console.error("Usage: node tools/capture-page.mjs <url-or-file> <slug> [name] [--width 1440] [--wait 2500]");
  process.exit(1);
}
const args = maybeName?.startsWith("--") ? [maybeName, ...rest] : rest;
const name = maybeName && !maybeName.startsWith("--") ? maybeName : "site";
const opt = (k, d) => (args.includes(`--${k}`) ? Number(args[args.indexOf(`--${k}`) + 1]) : d);
const width = opt("width", 1440);
const wait = opt("wait", 2500);

const url = /^https?:/.test(target) ? target : pathToFileURL(resolve(target)).href;
if (!/^https?:/.test(target) && !existsSync(resolve(target))) throw new Error(`Not found: ${target}`);

const out = join(ROOT, "media", slug);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: "networkidle" });
// Scroll through once so lazy images and scroll-reveals fire, then return to top.
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 600) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
  window.scrollTo(0, 0);
});
// Force every reveal-on-scroll element visible so the capture is not half blank.
await page.addStyleTag({
  content: `*{animation-play-state:paused!important}
  [class*="reveal"],[data-reveal],.fade-up,.is-hidden{opacity:1!important;transform:none!important;filter:none!important}`,
});
await page.waitForTimeout(wait);
const file = join(out, `${name}.jpg`);
await page.screenshot({ path: file, fullPage: true, type: "jpeg", quality: 78 });
await browser.close();
console.log(`saved ${file}`);
