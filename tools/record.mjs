#!/usr/bin/env node
// Record a live HTML build (animations, hovers, clicks) as a web-ready MP4.
//
// Usage:
//   node tools/record.mjs <url-or-file> <slug> <name> [--w 1440] [--h 900] [--secs 8] [--skip 0.6] [--actions '<json>']
//
// --actions is a list run in order while recording, e.g.
//   jump:{selector} scrolls a section to the top first (offset: px), scrollBy:px, focus:selector, type:text
//   '[{"wait":1500},{"hover":".nav__item:nth-child(1)"},{"wait":1800},{"move":[700,400]},{"click":"button.next"},{"scroll":600}]'
// Writes media/<slug>/<name>.mp4 (muted, faststart) and media/<slug>/<name>.jpg (poster, last frame region).

import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { homedir, tmpdir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(ROOT, "..", "..", "package.json"));
const { chromium } = require("playwright");
const FF = process.env.FFMPEG_DIR || join(homedir(), "my-video/node_modules/@remotion/compositor-darwin-arm64");

const [target, slug, name, ...rest] = process.argv.slice(2);
if (!target || !slug || !name) { console.error("Usage: node tools/record.mjs <url-or-file> <slug> <name> [--w] [--h] [--secs] [--skip] [--actions]"); process.exit(1); }
const opt = (k, d) => (rest.includes(`--${k}`) ? rest[rest.indexOf(`--${k}`) + 1] : d);
const W = +opt("w", 1440), H = +opt("h", 900), SECS = +opt("secs", 8), SKIP = opt("skip", "0.6");
const actions = JSON.parse(opt("actions", "[]"));
const url = /^https?:/.test(target) ? target : pathToFileURL(resolve(target)).href;

const tmp = join(tmpdir(), `rec-${slug}-${name}-${Date.now()}`);
mkdirSync(tmp, { recursive: true });
const out = join(ROOT, "media", slug);
mkdirSync(out, { recursive: true });

const browser = await chromium.launch(); // bundled headless shell: screencast matches the emulated viewport exactly
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: "load" });
// Chrome's own screencast: exact pixels, one JPEG per painted frame, with timestamps.
const cdp = await page.context().newCDPSession(page);
const frames = [];
let lastFrameAt = Date.now();
cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
  frames.push({ t: metadata.timestamp, data });
  lastFrameAt = Date.now();
  await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
const t0 = Date.now();
for (const a of actions) {
  if (a.wait) await page.waitForTimeout(a.wait);
  if (a.hover) await page.hover(a.hover).catch(() => console.warn("hover miss", a.hover));
  if (a.move) await page.mouse.move(a.move[0], a.move[1], { steps: a.steps || 20 });
  if (a.click) await page.click(a.click).catch(() => console.warn("click miss", a.click));
  if (a.clickAt) await page.mouse.click(a.clickAt[0], a.clickAt[1]);
  if (a.jump) await page.evaluate(([sel, off]) => { const el = document.querySelector(sel); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - (off || 0), behavior: "instant" }); }, [a.jump, a.offset]);
  if (a.scrollBy) await page.evaluate((y) => window.scrollBy({ top: y, behavior: "smooth" }), a.scrollBy);
  if (a.focus) await page.focus(a.focus).catch(() => console.warn("focus miss", a.focus));
  if (a.type) await page.keyboard.type(a.type, { delay: 60 });
  if (a.scroll !== undefined) await page.evaluate((y) => window.scrollTo({ top: y, behavior: "smooth" }), a.scroll);
}
const left = SECS * 1000 - (Date.now() - t0);
if (left > 0) await page.waitForTimeout(left);
await cdp.send("Page.stopScreencast");
const endT = frames.length ? frames[frames.length - 1].t + (Date.now() - lastFrameAt) / 1000 : 0;
await browser.close();

// frames → concat list with real durations → constant 30fps MP4
const list = [];
frames.forEach((f, i) => {
  const name = `f${String(i).padStart(5, "0")}.jpg`;
  writeFileSync(join(tmp, name), Buffer.from(f.data, "base64"));
  const next = frames[i + 1] ? frames[i + 1].t : Math.max(endT, f.t + 0.1); // hold the last frame to the end
  list.push(`file '${name}'`, `duration ${Math.max(0.001, next - f.t).toFixed(4)}`);
});
list.push(`file 'f${String(frames.length - 1).padStart(5, "0")}.jpg'`);
writeFileSync(join(tmp, "list.txt"), list.join("\n"));
const run = (args) => spawnSync(join(FF, "ffmpeg"), ["-hide_banner", "-loglevel", "error", "-y", ...args], { env: { ...process.env, DYLD_LIBRARY_PATH: FF }, stdio: "inherit" });
const mp4 = join(out, `${name}.mp4`);
run(["-f", "concat", "-safe", "0", "-i", join(tmp, "list.txt"), "-ss", SKIP, "-r", "30", "-vf", `scale=${Math.min(W, 1440)}:-2`, "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "26", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4]);
run(["-sseof", "-0.4", "-i", mp4, "-frames:v", "1", "-q:v", "3", join(out, `${name}.jpg`)]);
console.log(`  ${frames.length} frames`);
rmSync(tmp, { recursive: true, force: true });
console.log(existsSync(mp4) ? `saved ${mp4}` : "FAILED");
