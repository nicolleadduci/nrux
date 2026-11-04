#!/usr/bin/env node
// Turn any source video into the three files a project uses:
//   media/<slug>/loop.mp4    8s muted preview (cards + case-study hero)
//   media/<slug>/poster.jpg  still frame shown before the loop plays
//   media/<slug>/film.mp4    full film, 1280w, with sound (only with --film)
//
// Usage:
//   node tools/make-media.mjs "<source.mp4>" <slug> [--start 12] [--len 8] [--poster 20] [--film]
//
// Uses the ffmpeg that ships inside Remotion (this Mac has no system ffmpeg).
// Point FFMPEG_DIR somewhere else if that moves.

import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FFMPEG_DIR = process.env.FFMPEG_DIR || join(homedir(), "my-video/node_modules/@remotion/compositor-darwin-arm64");

const [src, slug, ...rest] = process.argv.slice(2);
if (!src || !slug) {
  console.error('Usage: node tools/make-media.mjs "<source.mp4>" <slug> [--start 12] [--len 8] [--poster 20] [--film]');
  process.exit(1);
}
const opt = (name, fallback) => {
  const i = rest.indexOf(`--${name}`);
  return i === -1 ? fallback : rest[i + 1];
};
const start = opt("start", "0");
const len = opt("len", "8");
const poster = opt("poster", start);
const film = rest.includes("--film");

const out = join(ROOT, "media", slug);
mkdirSync(out, { recursive: true });

function ff(args, label) {
  process.stdout.write(`  ${label} … `);
  const r = spawnSync(join(FFMPEG_DIR, "ffmpeg"), ["-hide_banner", "-loglevel", "error", "-y", ...args], {
    env: { ...process.env, DYLD_LIBRARY_PATH: FFMPEG_DIR },
    stdio: ["ignore", "inherit", "inherit"],
  });
  console.log(r.status === 0 ? "ok" : "FAILED");
  if (r.status !== 0) process.exit(1);
}

const h264 = ["-c:v", "libx264", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart"];

console.log(`${slug}:`);
ff(["-ss", start, "-t", len, "-i", src, "-vf", "scale=1280:-2", "-an", ...h264, "-crf", "30", join(out, "loop.mp4")], "loop.mp4");
ff(["-ss", poster, "-i", src, "-frames:v", "1", "-vf", "scale=1600:-2", "-q:v", "3", join(out, "poster.jpg")], "poster.jpg");
if (film) {
  ff(["-i", src, "-vf", "scale=1280:-2", ...h264, "-crf", "28", "-c:a", "aac", "-b:a", "112k", join(out, "film.mp4")], "film.mp4");
}
