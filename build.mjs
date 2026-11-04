#!/usr/bin/env node
// Builds every page of the site from src/*.  Run:  node build.mjs
// Output is plain static HTML next to this file (index.html, work/…, articles/…).

import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { projects, KINDS } from "./src/projects.mjs";
import { profile, repos, toolbox, stack, career, awards, education, fun } from "./src/site.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const articles = JSON.parse(readFileSync(join(ROOT, "src/articles.json"), "utf8"));
const reels = existsSync(join(ROOT, "src/reels.json")) ? JSON.parse(readFileSync(join(ROOT, "src/reels.json"), "utf8")) : [];
const VERSION = Date.now().toString(36);

const esc = (s = "") => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// Arrows are drawn, not typed: one stroke icon that scales with the text (1em) and takes currentColor.
const ico = (d, cls) => `<svg class="ico${cls ? " " + cls : ""}" viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
const ARR = ico("M4 12h16M13 5l7 7-7 7");
const ARR_L = ico("M20 12H4M11 5l-7 7 7 7");
const ARR_NE = ico("M7 17 17 7M8 7h9v9");
const bySlug = Object.fromEntries(projects.map((p) => [p.slug, p]));
const linkedin = profile.links.find((l) => l.label === "LinkedIn");

/* ── shared chrome ─────────────────────────────────────────── */
const NAV = [
  { k: "work", label: "Work", href: "work.html" },
  { k: "lab", label: "Lab", href: "lab.html", dot: true },
  { k: "library", label: "AI Library", href: "ai-library.html" },
  { k: "about", label: "About", href: "about.html" },
  { k: "writing", label: "Writing", href: "articles.html" },
];
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,300..900&family=Geist+Mono:wght@400;500&display=swap">`;

function head({ title, desc, b, extra = "" }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta name="theme-color" content="#eceef5">
<link rel="icon" href="${b}assets/favicon.svg" type="image/svg+xml">
${FONTS}
<link rel="stylesheet" href="${b}assets/site.css?v=${VERSION}">
<script>document.documentElement.classList.add("js")</script>
${extra}</head>`;
}

function nav(b, cur) {
  const links = NAV.map((n) => `<li><a href="${b}${n.href}"${n.k === cur ? ' aria-current="page"' : ""}>${n.label}${n.dot ? '<span class="dot" aria-hidden="true"></span>' : ""}</a></li>`).join("");
  return `<a class="skip" href="#main">Skip to content</a>
<header class="nav">
  <div class="wrap">
    <a class="mark" href="${b}index.html" aria-label="Nicolle Rodrigues, home">nr<span class="sl">/</span>ux<span class="caret" aria-hidden="true"></span></a>
    <nav aria-label="Primary"><ul class="nav-links">${links}</ul></nav>
    <a class="btn" href="${b}contact.html">Let's talk <span class="arr">${ARR}</span></a>
    <button class="menu-btn" aria-label="Open menu"><span></span></button>
  </div>
</header>
<div class="sheet" inert>
  <button class="close" aria-label="Close menu">×</button>
  <nav aria-label="Mobile">${NAV.map((n) => `<a href="${b}${n.href}">${n.label}</a>`).join("")}<a href="${b}contact.html">Contact</a></nav>
  <p class="mono">${esc(profile.email)}</p>
</div>`;
}

function footerMarkup(b) {
  return `<footer class="foot" id="contact">
  <div class="wrap">
    <a class="foot-big" href="${b}contact.html" data-cursor="Say hi">Let's build<span class="ln2">something <span class="arr">${ARR}</span></span></a>
    <div class="foot-row">
      <button class="copy-email" data-copy="${esc(profile.email)}">${esc(profile.email)} <span class="chip">copy</span></button>
      <div class="foot-links">${profile.links.map((l) => `<a href="${l.href}" target="_blank" rel="noopener">${l.label}</a>`).join("")}</div>
    </div>
    <div class="foot-row" style="border:0;padding-top:28px">
      <span class="mono">© <span class="n">${new Date().getFullYear()}</span> ${esc(profile.name)} · ${esc(profile.location)} · ${esc(profile.citizenship)}</span>
      <span class="mono">Designed + built with Claude Code · static HTML, no framework</span>
    </div>
  </div>
</footer>`;
}
const footer = (b) => `${footerMarkup(b)}
<script src="${b}assets/site.js?v=${VERSION}" defer></script>
<script defer src="/_vercel/insights/script.js"></script>
</body></html>`;

function page({ file, title, desc, cur, body, depth = 0, extraHead = "", bodyAttr = "" }) {
  const b = depth ? "../".repeat(depth) : "";
  const html = `${head({ title, desc, b, extra: extraHead })}
<body data-github="${profile.github}"${bodyAttr}>
${nav(b, cur)}
<main id="main">
${body(b)}
</main>
${footer(b)}`;
  const out = join(ROOT, file);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  console.log("  ✓", file);
}

/* ── media renderers ───────────────────────────────────────── */
const hostOf = (p, m) => m?.host || (p.link ? p.link.label.split("/")[0] : `${p.slug}.com`);
const isVideo = (s) => /\.(mp4|webm|mov)$/i.test(s);

function media(m, b, { manual = false, host = "" } = {}) {
  if (!m) return "";
  const man = manual ? " data-manual" : "";
  const vid = (src, poster) => `<video muted loop playsinline preload="${manual ? "none" : "metadata"}"${man} data-src="${b}${src}"${poster ? ` poster="${b}${poster}"` : ""} aria-hidden="true"></video>`;
  switch (m.type) {
    case "video":
      return vid(m.src, m.poster);
    case "site": {
      const h = m.host || host;
      return `<div class="browser"><div class="browser-bar"><i></i><i></i><i></i><span>${esc(h)}</span></div><div class="site-scroll" style="background-image:url('${b}${m.src}')" role="img" aria-label="${esc(h)}"></div></div>`;
    }
    case "phone":
      if (m.still) return `<div><img src="${b}${m.src}" alt="${esc(m.alt || "Mobile screen")}" loading="lazy" style="width:100%;height:100%;object-fit:cover;object-position:top"></div>`;
      return isVideo(m.src) ? vid(m.src, m.poster) : `<div><div class="site-scroll" style="background-image:url('${b}${m.src}')" role="img" aria-label="Full mobile page"></div></div>`;
    case "terminal":
      return `<div class="term"${man} data-lines="${esc(JSON.stringify(m.lines))}" aria-label="${esc(m.lines.join(" / "))}">${m.lines.map((l) => `<div class="ln">${esc(l)}</div>`).join("")}</div>`;
    case "image":
      return `<img src="${b}${m.src}" alt="${esc(m.alt || "")}" loading="lazy">`;
    default:
      return "";
  }
}
const box = (m, b, o) => `<div class="${m.type === "phone" ? "phone media" : "media"}"${m.ratio ? ` style="aspect-ratio:${m.ratio}"` : ""}>${media(m, b, o)}</div>`;
// Thumbnails stay still (site captures show their hero); they animate only while hovered.
const coverOf = (p, b, o = {}) => media(p.cover, b, { host: hostOf(p, p.cover), ...o });

function card(p, b) {
  const tag = p.award ? `<span class="chip blue">${esc(p.award.split(" · ")[0])}</span>` : p.status ? `<span class="chip">${esc(p.status)}</span>` : "";
  return `<a class="card rv" href="${b}work/${p.slug}.html" data-kind="${p.kind}" data-hover data-cursor="${p.films?.length ? "Watch" : "View"}">
    <div class="media">${coverOf(p, b, { manual: true })}<div class="tag-row"><span class="chip">${KINDS[p.kind]}</span>${tag}</div></div>
    <div class="card-meta"><div><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p></div></div>
  </a>`;
}

function repoCard(r, i) {
  const color = { JavaScript: "#f1e05a", HTML: "#e34c26", TypeScript: "#3178c6", Python: "#3572A5" }[r.lang] || "#aaa";
  return `<a class="repo rv" style="--d:${i * 80}ms" href="https://github.com/${profile.github}/${r.name}" target="_blank" rel="noopener" data-repo="${r.name}" data-cursor="Repo">
    <div><h3>${esc(r.name)}</h3><p>${esc(r.desc)}</p></div>
    <div class="repo-foot"><span class="lang" style="--c:${color}">${r.lang}</span><span class="updated"></span><span class="stars n">★ ${r.stars}</span></div>
  </a>`;
}

/* ── HOME ──────────────────────────────────────────────────── */
const featured = projects.filter((p) => p.featured);
const consoleData = featured.map((p) => ({ prompt: p.prompt, title: p.title, kind: KINDS[p.kind], stack: p.stack.slice(0, 3).join(" + "), href: `work/${p.slug}.html` }));

page({
  file: "index.html",
  title: `${profile.name} · ${profile.title}`,
  desc: `${profile.line} ${profile.sub}`,
  cur: "home",
  body: (b) => `
<section class="hero wrap" aria-labelledby="hero-name">
  <h1 class="hero-name d-xxl" id="hero-name">
    <span class="elastic" data-elastic>Nicolle</span>
    <span class="elastic l2" data-elastic>Rodrigues</span>
  </h1>
  <div class="hero-bottom">
    <div>
      <p class="d-m" data-split>${profile.lineHtml}</p>
      <p class="lead mute">${esc(profile.sub)}</p>
      <div class="hero-cta"><a class="btn" href="${b}work.html">See the work <span class="arr">${ARR}</span></a><a class="btn ghost" href="${b}lab.html">Inside the Lab</a></div>
      <p class="hero-status mono"><span class="status"><i></i></span>${esc(profile.title)} · ${esc(profile.location)} · open to select projects</p>
    </div>
    <div class="console" role="region" aria-label="Prompt to product: featured projects">
      <div class="console-l">
        <div class="console-head"><span class="dots"><i></i><i></i><i></i></span></div>
        <div class="console-prompt" aria-live="polite"><span class="pr">&gt; </span><span class="txt"></span><span class="cur"></span></div>
        <div class="console-log"></div>
        <div class="console-steps">${featured.map((p) => `<button aria-label="Show ${esc(p.title)}"></button>`).join("")}</div>
      </div>
      <a class="console-out" href="${b}work/${featured[0].slug}.html" data-cursor="Open">
        ${featured.map((p) => `<div class="frame">${coverOf(p, b, { manual: true })}</div>`).join("")}
        <div class="scan"></div>
        <div class="cap"><b></b><span class="chip"></span></div>
      </a>
    </div>
  </div>
  <script type="application/json" id="console-data">${JSON.stringify(consoleData)}</script>
</section>

<section class="sec wrap" aria-labelledby="sel">
  <div class="sec-head">
    <h2 class="d-xl" id="sel" data-split>Made, then shipped.</h2>
    <p class="lead mute rv">Product, web, campaigns, AI tooling and motion.</p>
  </div>
  <div class="feat">${featured.map((p) => card(p, b)).join("")}</div>
  <a class="all-link" href="${b}work.html" data-cursor="All"><span>All projects</span> <span class="arr">${ARR}</span></a>
</section>

<section class="ink" aria-labelledby="lab-h">
  <div class="marquee" aria-hidden="true"><div class="marquee-track">${[0, 1].map(() => stack.flatMap((s) => s.items).slice(0, 16).map((t) => `<span>${esc(t)}</span>`).join("")).join("")}</div></div>
  <div class="sec wrap">
    <div class="sec-head">
      <h2 class="d-xl" id="lab-h" data-split>I build the tools too.</h2>
      <a class="btn on-ink" href="${b}lab.html">Open the Lab <span class="arr">${ARR}</span></a>
    </div>
    <div class="repos">${repos.slice(0, 3).map((r, i) => repoCard(r, i)).join("")}</div>
  </div>
</section>`,
});

/* ── WORK index ────────────────────────────────────────────── */
page({
  file: "work.html",
  title: `Work · ${profile.name}`,
  desc: "Product and UX, web and interactive builds, campaigns, AI tooling and motion built in code.",
  cur: "work",
  body: (b) => `
<section class="page-head wrap">
  <h1 class="d-xxl" data-split>Work</h1>
</section>
<section class="wrap work-list" aria-label="All projects">
  <div class="toolbar">
    <div class="filters" role="group" aria-label="Filter by type">
      <button data-k="all" aria-pressed="true">All <span class="n">(${projects.length})</span></button>
      ${Object.entries(KINDS).filter(([k]) => projects.some((p) => p.kind === k)).map(([k, v]) => `<button data-k="${k}" aria-pressed="false">${v} <span class="n">(${projects.filter((p) => p.kind === k).length})</span></button>`).join("")}
    </div>
    <div class="views" role="group" aria-label="Layout"><button data-v="list" aria-pressed="true">List</button><button data-v="grid" aria-pressed="false">Grid</button></div>
  </div>
  <div class="grid-view">${projects.map((p) => card(p, b)).join("")}</div>
  <ol class="rows">
    ${projects.map((p) => `<li class="row" data-kind="${p.kind}"><a href="${b}work/${p.slug}.html" data-slug="${p.slug}">
      <h2>${esc(p.title)}</h2>
      <span class="r-client">${esc(p.client.split(" · ")[0])}</span>
      <span class="r-kind">${KINDS[p.kind]}</span>
      <span class="arr" aria-hidden="true">${ARR}</span>
      <div class="row-thumb media">${coverOf(p, b, { manual: true })}</div>
    </a></li>`).join("")}
  </ol>
</section>
<div class="peek" aria-hidden="true">${projects.map((p) => `<div data-slug="${p.slug}">${coverOf(p, b, { manual: true })}</div>`).join("")}</div>
<div style="height:clamp(80px,10vw,160px)"></div>`,
});

/* ── CASE STUDIES ──────────────────────────────────────────── */
function filmBlock(f, b) {
  if (f.embed) return `<div class="film rv"><button class="film-play" aria-label="Play ${esc(f.title)}"><span>Play ▶</span></button>${f.poster ? `<img src="${b}${f.poster}" alt="" style="width:100%;height:100%;object-fit:cover">` : ""}<template><iframe src="${esc(f.embed)}?autoplay=1" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="${esc(f.title)}" style="position:absolute;inset:0"></iframe></template></div>`;
  return `<div class="film rv"><video preload="metadata" playsinline poster="${b}${f.poster}" src="${b}${f.src}"></video><button class="film-play" aria-label="Play ${esc(f.title)} with sound" data-cursor="Play"><span>Play ▶</span></button></div>`;
}
function component(c, p, b) {
  const list = Array.isArray(c.media) ? c.media : [c.media];
  const phones = list.every((m) => m.type === "phone");
  const inner = list.length > 1
    ? `<div class="vis-multi${phones ? " phones" : ""}" style="--cols:${list.length}">${list.map((m) => box(m, b, { host: hostOf(p, m) })).join("")}</div>`
    : phones ? `<div class="phone-stage">${box(list[0], b, { host: hostOf(p, list[0]) })}</div>` : box(list[0], b, { host: hostOf(p, list[0]) });
  return `<figure class="comp rv${list.length > 1 || c.wide ? " wide" : phones ? " solo-phone" : ""}">${inner}${c.name ? `<figcaption>${esc(c.name)}</figcaption>` : ""}</figure>`;
}

projects.forEach((p, i) => {
  const next = projects[(i + 1) % projects.length];
  const films = p.films || [];
  const comps = p.components || [];
  const rel = p.related && bySlug[p.related];
  page({
    file: `work/${p.slug}.html`,
    depth: 1,
    title: `${p.title} · ${profile.name}`,
    desc: p.summary,
    cur: "work",
    body: (b) => `
<article>
  <header class="cs-head wrap">
    <a class="back" href="${b}work.html">${ARR_L} All work</a>
    <h1 class="cs-title d-xl" data-split>${esc(p.title)}</h1>
    <div class="cs-sub">
      <div>
        <p class="lead rv">${esc(p.summary)}</p>
        <div class="cs-chips rv"><span class="chip line">${KINDS[p.kind]}</span>${p.award ? `<span class="chip blue">${esc(p.award)}</span>` : ""}${p.status ? `<span class="chip">${esc(p.status)}</span>` : ""}</div>
      </div>
      ${p.prompt ? `<div class="prompt-line rv" style="--d:120ms"><span class="pr">&gt; </span>${esc(p.prompt)}</div>` : ""}
    </div>
  </header>
  <div class="cs-hero wrap rv"><div class="media" data-hover${(p.films?.[0]?.src && !p.films[0].silent) ? ` data-film="${b}${p.films[0].src}"` : ""}>${coverOf(p, b, p.cover.type === "site" ? { manual: true } : {})}${(p.films?.[0]?.src && !p.films[0].silent) ? `<button class="sound-on" data-cursor="Play">Watch with sound <span aria-hidden="true">♪</span></button>` : ""}</div></div>
  <div class="wrap">
    <dl class="specs specs-3">
      <div><dt>Client</dt><dd>${esc(p.client)}</dd></div>
      <div><dt>Role</dt><dd>${esc(p.role)}</dd></div>
      <div><dt>Built with</dt><dd class="tools">${p.stack.map((s) => `<span class="chip line">${esc(s)}</span>`).join("")}</dd></div>
    </dl>
    ${p.link ? `<p style="margin:18px 0 0"><a class="ext-link" href="${p.link.href}" target="_blank" rel="noopener">${esc(p.link.label)} ${ARR_NE}</a></p>` : ""}
  </div>

  ${p.brief || p.move ? `<section class="sec wrap" aria-label="Brief and approach"${!p.stats ? ' style="padding-bottom:0"' : ""}>
    <div class="bm">
      ${p.brief ? `<div class="rv"><h3>The brief</h3><p>${esc(p.brief)}</p></div>` : ""}
      ${p.move ? `<div class="move rv" style="--d:120ms"><h3>The move</h3><p>${esc(p.move)}</p></div>` : ""}
    </div>
  </section>` : ""}

  ${p.stats ? `<section class="wrap" aria-label="Results"${!p.brief && !p.move ? ' style="margin-top:clamp(60px,8vw,120px)"' : ""}>
    <div class="stats rv">${p.stats.map((s) => `<div class="stat"><b>${esc(s.v)}</b><span>${esc(s.l)}</span></div>`).join("")}</div>
  </section>` : ""}

  ${films.length ? `<section class="sec wrap" aria-label="Films">
    <div class="sec-head"><h2 class="d-l">${films.length > 1 ? "The films" : "Watch the film"}</h2>${rel ? `<p class="lead mute">Made with my <a class="ext-link" style="font:inherit" href="${b}work/${rel.slug}.html">${esc(rel.title)}</a> skill.</p>` : ""}</div>
    <div class="films">${films.map((f) => `<figure>${filmBlock(f, b)}<figcaption><b>${esc(f.title)}</b>${f.note ? `<span>${esc(f.note)}</span>` : ""}</figcaption></figure>`).join("")}</div>
  </section>` : ""}

  ${comps.length ? `<section class="sec wrap" aria-labelledby="comp-h">
    <div class="sec-head"><h2 class="d-l" id="comp-h">${p.kind === "campaign" ? "The campaign" : p.kind === "ai" ? "In use" : "Components"}</h2></div>
    <div class="comps">${comps.map((c) => component(c, p, b)).join("")}</div>
  </section>` : ""}

  ${!films.length && !comps.length ? '<div style="height:clamp(60px,8vw,120px)"></div>' : ""}

  <div class="wrap">
    <a class="next" href="${b}work/${next.slug}.html" data-cursor="Next" data-hover>
      <span class="d-xl">${esc(next.title)} <span class="arr">${ARR}</span></span>
      <div class="next-media media">${coverOf(next, b, { manual: true })}</div>
    </a>
  </div>
</article>`,
  });
});

/* ── LAB ───────────────────────────────────────────────────── */
const DARK_NAV = ".nav.is-scrolled{background:rgb(12 12 13/.78)}.nav-links{background:rgb(236 238 245/.07)}.nav-links a:hover{background:rgb(236 238 245/.1)}.nav-links a[aria-current=page]{background:var(--paper);color:var(--ink)}.mark{color:var(--paper)}";
page({
  file: "lab.html",
  title: `Lab · ${profile.name}`,
  desc: "GitHub, Claude Code skills, tools and the stack behind the work.",
  cur: "lab",
  bodyAttr: ' class="ink" style="background:var(--ink)"',
  extraHead: `<meta name="theme-color" content="#0c0c0d"><style>${DARK_NAV}.toolbar{background:var(--ink)}</style>`,
  body: (b) => `
<section class="page-head wrap">
  <h1 class="d-xxl" data-split>Lab</h1>
  <p class="lead mute rv">Skills, tools and repos I build to design and ship faster.</p>
</section>

<section class="wrap" aria-labelledby="gh-h">
  <h2 class="sr-only" id="gh-h">GitHub</h2>
  <div class="gh-card rv">
    <img src="https://github.com/${profile.github}.png?size=128" alt="" width="64" height="64" loading="lazy">
    <div>
      <div style="font-weight:750;font-size:18px;margin-bottom:12px">@${profile.github}</div>
      <div class="gh-stats">
        <div><b data-gh="repos">${repos.length}</b>public repos</div>
        <div><b data-gh="stars">${repos.reduce((a, r) => a + r.stars, 0)}</b>stars</div>
        <div><b data-gh="pushed">—</b>last push</div>
        <div><b>MIT</b>licence</div>
      </div>
    </div>
    <a class="btn" href="https://github.com/${profile.github}" target="_blank" rel="noopener">Follow on GitHub <span class="arr">${ARR}</span></a>
  </div>
  <div class="repos">${repos.map((r, i) => repoCard(r, i)).join("")}</div>
</section>

<section class="sec wrap" aria-labelledby="tb-h">
  <div class="sec-head"><h2 class="d-l" id="tb-h" data-split>The toolbox</h2><p class="lead mute rv">Claude Code skills and small Node tools. Some public, most built for a client or a team.</p></div>
  <div class="tools">${toolbox.map((t, i) => `<div class="tool rv" style="--d:${(i % 4) * 60}ms"><span class="chip line-ink" style="align-self:flex-start">${esc(t.tag)}</span><code>${esc(t.name)}</code><p>${esc(t.what)}</p></div>`).join("")}</div>
</section>

<section class="wrap" aria-labelledby="ai-proj">
  <div class="sec-head"><h2 class="d-l" id="ai-proj" data-split>Tools as projects</h2></div>
  <div class="feat">${projects.filter((p) => p.kind === "ai").map((p) => card(p, b)).join("")}</div>
</section>

<section class="sec" aria-labelledby="st-h" style="background:var(--paper);color:var(--ink);margin-top:clamp(80px,10vw,160px)">
  <div class="wrap">
    <div class="sec-head"><h2 class="d-l" id="st-h" data-split>Design. Build. AI. Motion.</h2></div>
    <div class="stack">${stack.map((s) => `<div class="stack-col rv"><h3>${s.group}</h3><ul>${s.items.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>`).join("")}</div>
  </div>
</section>

${reels.length ? `<section class="sec wrap" aria-labelledby="rl-h"><div class="sec-head"><h2 class="d-l" id="rl-h">Process reels</h2></div><div class="reels">${reels.map((r) => `<figure class="rv" style="margin:0"><div class="film"><video controls preload="metadata" playsinline src="${b}${r.src}"${r.poster ? ` poster="${b}${r.poster}"` : ""}></video></div><figcaption style="margin-top:12px;font-weight:700">${esc(r.title)}</figcaption></figure>`).join("")}</div></section>` : ""}

<section class="sec wrap" aria-labelledby="lib-h">
  <div class="lib-cta rv">
    <div><h2 class="d-l" id="lib-h">The AI Library</h2><p class="lead mute" style="margin-top:16px"><span class="n">28</span> live, dev-ready components designed and coded with AI. Copy, paste, ship.</p>
      <div class="lib-swatch"><span>Button</span><span>Gravity pills</span><span>Accordion</span><span>Draggable cards</span><span>Stat row</span></div></div>
    <a class="btn" href="${b}ai-library.html">Play with it <span class="arr">${ARR}</span></a>
  </div>
</section>`,
});

/* ── ABOUT ─────────────────────────────────────────────────── */
// Hover scenes for the unserious part. viewBox 0 0 200 120.
const CLAUDE = "#D97757";
const SCENES = {
  coffee: `<rect x="62" y="40" width="64" height="62" rx="10" class="paper-f"/><clipPath id="cup"><rect x="62" y="40" width="64" height="62" rx="10"/></clipPath><g clip-path="url(#cup)"><rect x="62" y="40" width="64" height="62" class="liquid" fill="#6b3f22"/></g><rect x="62" y="40" width="64" height="62" rx="10" class="ink-s"/><path d="M126 56 h10 a12 12 0 0 1 0 24 h-10" class="ink-s"/><path class="steam ink-s" d="M78 30 q-6 -8 0 -16"/><path class="steam ink-s" d="M94 30 q-6 -8 0 -16"/><path class="steam ink-s" d="M110 30 q-6 -8 0 -16"/><path d="M48 106 h104" class="ink-s"/>`,
  chess: (() => {
    let s = "";
    for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) s += `<rect x="${28 + c * 24}" y="${18 + r * 24}" width="24" height="24" class="${(r + c) % 2 ? "ink-f" : "paper-f"}"/>`;
    return `${s}<rect x="28" y="18" width="144" height="96" class="ink-s"/><rect class="target" x="100" y="42" width="24" height="24" fill="#2b1cff" opacity=".85"/><text class="knight" x="88" y="110" font-size="26" text-anchor="middle" fill="#2b1cff" stroke="#eceef5" stroke-width="1">♞</text>`;
  })(),
  home: `<path class="route ink-s" d="M170 92 C 130 10, 60 10, 28 44"/><circle cx="170" cy="92" r="6" fill="#18a957"/><g class="pin-chi"><circle cx="28" cy="44" r="7" class="blue-f"/></g><path class="plane blue-f" d="M-8 -5 L9 0 L-8 5 L-4 0 Z"/>`,
  cats: `<g class="cat one"><path d="M44 112 v-36 l10 -16 l10 14 h18 l10 -14 l10 16 v36 z" class="ink-f"/><ellipse class="eye" cx="62" cy="88" rx="4" ry="5" fill="#9be15d"/><ellipse class="eye" cx="84" cy="88" rx="4" ry="5" fill="#9be15d"/><path d="M70 98 l3 3 l3 -3" stroke="#eceef5" stroke-width="2" fill="none"/></g><g class="cat two"><path d="M108 112 v-40 l11 -17 l11 15 h18 l11 -15 l11 17 v40 z" fill="#e8873a"/><ellipse class="eye" cx="128" cy="86" rx="4" ry="5" fill="#ffe680"/><ellipse class="eye" cx="150" cy="86" rx="4" ry="5" fill="#ffe680"/><path d="M136 97 l3 3 l3 -3" stroke="#0c0c0d" stroke-width="2" fill="none"/></g><path d="M20 112 h160" class="ink-s"/>`,
  sushi: `<ellipse cx="100" cy="104" rx="84" ry="8" fill="#d4d8e5"/><g class="piece"><rect x="34" y="72" width="46" height="26" rx="12" class="paper-f" stroke="#0c0c0d" stroke-width="2.5"/><rect x="34" y="66" width="46" height="14" rx="7" fill="#ff7a59" stroke="#0c0c0d" stroke-width="2.5"/></g><g class="piece pick"><rect x="104" y="72" width="46" height="26" rx="12" class="paper-f" stroke="#0c0c0d" stroke-width="2.5"/><rect x="104" y="66" width="46" height="14" rx="7" fill="#ff7a59" stroke="#0c0c0d" stroke-width="2.5"/></g><g class="sticks"><path d="M190 6 L134 60" stroke="#0c0c0d" stroke-width="4" stroke-linecap="round"/><path d="M196 16 L144 66" stroke="#0c0c0d" stroke-width="4" stroke-linecap="round"/></g>`,
  claude: (() => {
    // pixel mascot: wide body, eyes up top, little side arms, four short legs (6px grid)
    const px = (x, y, w = 1, h = 1, fill = CLAUDE) => `<rect x="${58 + x * 6}" y="${36 + y * 6}" width="${w * 6}" height="${h * 6}" fill="${fill}"/>`;
    const body = px(1, 1, 12, 6) + px(0, 3, 1, 2) + px(13, 3, 1, 2) + px(2, 7, 1, 2) + px(4, 7, 1, 2) + px(9, 7, 1, 2) + px(11, 7, 1, 2);
    const eyes = `<g class="eyes">${px(3, 2, 1, 2, "#0c0c0d")}${px(10, 2, 1, 2, "#0c0c0d")}</g>`;
    const heart = (x, y, c) => `<path class="heart ${c}" transform="translate(${x} ${y})" d="M0 4 C0 -1 7 -1 7 4 C7 -1 14 -1 14 4 C14 9 7 12 7 14 C7 12 0 9 0 4 Z" fill="#ff5d8f"/>`;
    return `<g class="clawd">${body}${eyes}</g>${heart(40, 30, "h1")}${heart(150, 24, "h2")}${heart(96, 14, "h3")}<path d="M30 112 h140" stroke="#eceef5" stroke-opacity=".25" stroke-width="3" stroke-linecap="round"/>`;
  })(),
};

// Badge ring: the phrase twice, stretched to the exact circumference so the loop has no gap.
const BADGE_R = 50;
const BADGE_C = (2 * Math.PI * BADGE_R).toFixed(2);

page({
  file: "about.html",
  title: `About · ${profile.name}`,
  desc: "Senior AI UX Design Engineer in Chicago. 10+ years of human-centred design, now shipping with AI.",
  cur: "about",
  body: (b) => `
<section class="page-head wrap">
  <h1 class="d-xl" data-split>Human in the loop.</h1>
</section>
<section class="wrap" aria-label="Intro">
  <div class="about-intro">
    <div class="rv">
      <p class="lead" style="max-width:28ch;font-weight:600;color:var(--ink)">I'm Nicolle, a Senior AI UX Design Engineer in Chicago.</p>
      <p>I live somewhere between UX and front-end. For <b class="n">10+</b> years I've been turning messy problems into simple, useful experiences, and these days Claude Code helps me get from idea to a real, working interface fast.</p>
      <p>Part strategist, part designer, part builder. I care a lot about accessibility and mobile-first, and I love helping teams grow. Powered by AI, caffeine and curiosity.</p>
      <div class="facts-inline"><span class="chip line">${esc(profile.citizenship)}</span><span class="chip line">${esc(profile.location)}</span><span class="chip line">English + Portuguese</span><span class="chip line"><span class="n">10+</span>&nbsp;years of experience</span></div>
      <div class="hero-cta" style="margin-top:28px"><a class="btn" href="${linkedin.href}" target="_blank" rel="noopener">Connect on LinkedIn <span class="arr">${ARR}</span></a><a class="btn ghost" href="${b}contact.html">Get in touch</a></div>
    </div>
    <figure class="portrait rv" style="margin:0">
      <div class="ph"><img src="${b}${profile.photo}" alt="Nicolle Rodrigues" width="436" height="480"></div>
      <div class="badge-wrap" aria-hidden="true">
        <svg class="badge" viewBox="0 0 150 150"><defs><path id="ring" d="M75 75 m-${BADGE_R} 0 a${BADGE_R} ${BADGE_R} 0 1 1 ${BADGE_R * 2} 0 a${BADGE_R} ${BADGE_R} 0 1 1 -${BADGE_R * 2} 0"/></defs><circle cx="75" cy="75" r="73" fill="#eceef5"/><text><textPath href="#ring" textLength="${BADGE_C}" lengthAdjust="spacing">Design it · Build it · Ship it · Design it · Build it · Ship it ·&#160;</textPath></text><circle class="core" cx="75" cy="75" r="30"/></svg>
        <svg class="star" viewBox="0 0 150 150"><path d="M75 60 C76.6 71 79 73.4 90 75 C79 76.6 76.6 79 75 90 C73.4 79 71 76.6 60 75 C71 73.4 73.4 71 75 60 Z" fill="#fff"/></svg>
      </div>
    </figure>
  </div>
</section>

<section class="sec wrap" aria-labelledby="cv-h">
  <div class="sec-head"><h2 class="d-l" id="cv-h" data-split>Ten years of experience and still better than AI.</h2></div>
  <ol class="tl">${career.map((c) => `<li class="rv"><span class="mono n">${c.years}</span><h3>${esc(c.role)}<small>${esc(c.org)}</small></h3><p>${esc(c.note)}</p></li>`).join("")}</ol>
</section>

<section class="wrap" aria-labelledby="aw-h">
  <div class="sec-head"><h2 class="d-l" id="aw-h" data-split>Awards &amp; Recognition</h2></div>
  <div class="award-grid">${awards.map((a, i) => `<div class="award rv" style="--d:${i * 50}ms"><b>${esc(a.name)}</b><span class="mute"><span class="n">${a.year}</span> · ${esc(a.for)}</span></div>`).join("")}</div>
</section>

<section class="sec wrap" aria-labelledby="fun-h">
  <div class="sec-head"><h2 class="d-l" id="fun-h" data-split>The unserious part.</h2></div>
  <div class="fun">${fun.map((f, i) => `<div class="fun-card f-${f.k}${f.k === "claude" ? " claude" : ""} rv" style="--d:${i * 60}ms" tabindex="0">
    <svg class="scene" viewBox="0 0 200 120" aria-hidden="true" font-family="Archivo, sans-serif">${SCENES[f.k]}</svg>
    <h3>${esc(f.title)}</h3><p>${esc(f.text)}</p></div>`).join("")}</div>
</section>

<section class="wrap" aria-label="Education, writing and languages" style="padding-bottom:clamp(80px,10vw,160px)">
  <div class="facts">
    <div class="rv"><h3 class="d-s">Education</h3><ul>${education.map((e) => `<li>${esc(e.name)}<small>${esc(e.org)} · <span class="n">${e.year}</span></small></li>`).join("")}</ul></div>
    <div class="rv"><h3 class="d-s">Published</h3><ul>${articles.map((a) => `<li><a href="${b}articles/${a.slug}.html">${esc(a.title)}</a><small>${a.date}</small></li>`).join("")}<li>Dell Technologies e-commerce UX evaluation<small>Case study for CMOs</small></li><li>Kaiser Permanente UX evaluation<small>Case study for CMOs</small></li></ul></div>
    <div class="rv"><h3 class="d-s">Languages</h3><ul><li>Portuguese<small>Native</small></li><li>English<small>Bilingual proficiency</small></li></ul></div>
  </div>
</section>`,
});

/* ── ARTICLES ──────────────────────────────────────────────── */
page({
  file: "articles.html",
  title: `Writing · ${profile.name}`,
  desc: "Essays on UX, psychology, data and design.",
  cur: "writing",
  body: (b) => `
<section class="page-head wrap">
  <div class="page-head-row"><h1 class="d-xxl" data-split>Writing</h1><p class="lead mute rv">Psychology, data and UX, grounded in real projects.</p></div>
</section>
<section class="wrap" style="padding-bottom:clamp(80px,10vw,160px)">
  <hr class="rule" style="background:var(--ink);height:1.5px">
  <ol class="rows">${articles.map((a) => `<li class="post-row rv"><a href="${b}articles/${a.slug}.html" data-cursor="Read">
    <span class="mono p-date n">${a.date}</span>
    <div><h2>${esc(a.title)}</h2><p>${esc(a.excerpt)}</p></div>
    <span class="mono mute p-cat">${esc(a.category)} · <span class="n">${a.read}</span></span>
    <span class="arr" aria-hidden="true">${ARR}</span>
  </a></li>`).join("")}</ol>
</section>`,
});

articles.forEach((a, i) => {
  const next = articles[(i + 1) % articles.length];
  page({
    file: `articles/${a.slug}.html`,
    depth: 1,
    title: `${a.title} · ${profile.name}`,
    desc: a.excerpt,
    cur: "writing",
    body: (b) => `
<div class="progress" aria-hidden="true"></div>
<article>
  <header class="page-head wrap">
    <a class="back" href="${b}articles.html">${ARR_L} All writing</a>
    <h1 class="d-l article-head" data-split>${esc(a.title)}</h1>
    <div class="article-meta rv"><span class="chip line">${esc(a.category)}</span><span class="chip line">${a.date}</span><span class="chip line">${a.read} read</span><span class="chip line">by ${esc(profile.name)}</span></div>
  </header>
  <div class="wrap"><div class="article rv">${a.body.join("\n")}</div></div>
  <div class="wrap" style="margin-top:clamp(60px,8vw,120px)">
    <a class="next" href="${b}articles/${next.slug}.html" data-cursor="Read"><small>Next read</small><span class="d-l" style="display:block;max-width:18ch">${esc(next.title)} <span class="arr">${ARR}</span></span></a>
  </div>
</article>`,
  });
});

/* ── CONTACT ───────────────────────────────────────────────── */
page({
  file: "contact.html",
  title: `Contact · ${profile.name}`,
  desc: "Start a project or say hello.",
  cur: "contact",
  body: (b) => `
<section class="page-head wrap">
  <h1 class="d-xl" data-split>Tell me what you want to ship.</h1>
</section>
<section class="wrap" style="padding-bottom:clamp(80px,10vw,160px)">
  <div class="contact-grid">
    <div class="rv">
      <p class="lead">I lead with empathy and back it up with data. If you've got a product, site, tool or film that needs both, send a note.</p>
      <div class="direct">
        <a href="mailto:${profile.email}" data-cursor="Email">${esc(profile.email)} <span class="arr">${ARR_NE}</span></a>
        ${profile.links.map((l) => `<a href="${l.href}" target="_blank" rel="noopener">${l.label} <span class="arr">${ARR_NE}</span></a>`).join("")}
      </div>
    </div>
    <form class="form rv" id="contact-form" data-email="${profile.email}" novalidate>
      <input type="hidden" name="access_key" value="${profile.web3formsKey}">
      <input type="hidden" name="subject" value="New message from the nr/ux portfolio">
      <input type="hidden" name="from_name" value="Portfolio Contact Form">
      <input type="checkbox" name="botcheck" class="sr-only" tabindex="-1" autocomplete="off">
      <fieldset style="border:0;padding:0;margin:0"><legend style="font-weight:700;margin-bottom:10px">What are we making?</legend>
        <div class="pills">${["Product / UX", "Website", "AI tool or skill", "Campaign", "Motion / video", "Full-time role"].map((t, k) => `<input type="radio" name="type" id="t${k}" value="${t}"${k === 0 ? " checked" : ""}><label for="t${k}">${t}</label>`).join("")}</div></fieldset>
      <label>Name<input name="name" autocomplete="name" required></label>
      <label>Email<input name="email" type="email" autocomplete="email" required></label>
      <label>Message<textarea name="message" required placeholder="A sentence or two is plenty."></textarea></label>
      <button class="btn" type="submit" style="justify-self:start">Send message <span class="arr">${ARR}</span></button>
      <div class="form-status" role="status"></div>
    </form>
  </div>
</section>`,
});

/* ── AI LIBRARY ────────────────────────────────────────────────
   The 28-component library is ported from the previous site
   (src/ai-library.source.html). Its components stay untouched; we swap in
   the new nav + footer, move it onto paper + ink, and re-point every
   purple/pink colour in its CSS to the brand blue. */
{
  let lib = readFileSync(join(ROOT, "src/ai-library.source.html"), "utf8");
  const swap = (re, to, label) => {
    if (!re.test(lib)) throw new Error(`AI Library port: could not find ${label}`);
    lib = lib.replace(re, to);
  };
  // oklch(L C H …): purples and pinks (hue 250–335) → ultramarine 268; near-greys lose their purple tint.
  lib = lib.replace(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/g, (m, L, C, H) => {
    const h = +H, c = +C;
    if (h >= 250 && h <= 335) return c < 0.06 ? `oklch(${L} 0.012 268` : `oklch(${L} ${Math.max(c, 0.12)} 268`;
    return m;
  });
  const tokens = `<style>
  :root {
    --color-bg: #eceef5; --color-bg-2: #eceef5; --color-accent: #2b1cff;
    --orb-1: transparent; --orb-2: transparent; --orb-3: transparent;
    --font-display: "Archivo", "Helvetica Neue", Arial, sans-serif;
    --font-body: "Archivo", "Helvetica Neue", Arial, sans-serif;
    --font-mono: "Archivo", "Helvetica Neue", Arial, sans-serif;
  }
  body { background: var(--paper); color: var(--ink); font-family: var(--font-body); }
  body * { font-style: normal !important; }
  .global-backdrop, .orb-layer { display: none !important; }
  .article-eyebrow, .lib-card-idx, .lib-modal-cat { display: none !important; }
  .lib-header { padding-top: calc(var(--nav-h) + clamp(48px, 9vw, 130px)); }
  .lib-title { color: var(--ink); font-weight: 800; letter-spacing: -0.04em; font-size: clamp(44px, 7vw, 112px); line-height: 0.92; font-variation-settings: "wdth" 104; }
  .lib-title em { background: none; -webkit-text-fill-color: var(--blue); color: var(--blue); }
  .lib-sub { color: var(--mute); font-size: clamp(18px, 1.5vw, 22px); }
  .lib-filter-card { background: var(--paper-2); border-color: transparent; backdrop-filter: none; }
  .lib-filter-title { display: none; }
  .lib-filter { color: var(--ink); font-weight: 550; }
  .lib-filter:hover { background: rgb(12 12 13 / 0.06); }
  .lib-filter.active { background: var(--ink); color: var(--paper); border-color: transparent; }
  .lib-filter-n { color: inherit; opacity: 0.65; font-weight: 700; }
  .lib-count { color: var(--mute); border-top-color: var(--line); font-weight: 600; }
  .lib-card { background: var(--ink); border-color: transparent; }
  .lib-card:hover { border-color: transparent; box-shadow: 0 24px 48px -24px rgb(12 12 13 / 0.6); }
  .lib-card-foot { border-top-color: rgb(236 238 245 / 0.08); }
  .lib-card-foot:hover .lib-card-name { color: var(--blue-soft); }
  .lib-card-desc { color: var(--mute-on-ink); }
  .lib-card-open { text-transform: none !important; letter-spacing: 0 !important; font-weight: 600; color: var(--blue-soft); }
  .lib-modal-card { background: var(--ink); }
  .lib-modal-scrim { background: rgb(12 12 13 / 0.6); }
  .lib-copy.copied { background: var(--blue); }
  .lib-code-pre, .lib-code-pre code { font-family: "Geist Mono", ui-monospace, Menlo, monospace !important; }
  .lib-body { padding-bottom: clamp(80px, 10vw, 160px); }
  </style>`;
  swap(/<head>/, `<head>\n${FONTS}<link rel="stylesheet" href="assets/site.css?v=${VERSION}"><link rel="icon" href="assets/favicon.svg" type="image/svg+xml"><script>document.documentElement.classList.add("js")</script>`, "<head>");
  swap(/<\/head>/, `${tokens}\n</head>`, "</head>");
  swap(/<title>[\s\S]*?<\/title>/, `<title>AI Library · ${esc(profile.name)}</title>`, "<title>");
  swap(/<header class="site-nav">[\s\S]*?<\/header>/, nav("", "library"), "site-nav header");
  swap(/<section class="contact-block">[\s\S]*?<\/section>\s*(?=<\/main>)/, "", "contact-block");
  swap(/<footer class="site-footer">[\s\S]*?<\/footer>/, footerMarkup(""), "site-footer");
  swap(/<\/body>/, `<script src="assets/site.js?v=${VERSION}" defer></script>\n</body>`, "</body>");
  lib = lib.replace(/<body([^>]*)>/, `<body$1 data-github="${profile.github}">`);
  writeFileSync(join(ROOT, "ai-library.html"), lib);
  console.log("  ✓ ai-library.html (ported)");
}

/* ── 404 ───────────────────────────────────────────────────── */
page({
  file: "404.html",
  title: `Not found · ${profile.name}`,
  desc: "This page doesn't exist.",
  cur: "",
  body: () => `<section class="nf wrap"><h1 class="d-xxl">Lost the <span class="blue">loop.</span></h1><p class="lead mute" style="margin:24px 0">That page isn't here. The work is.</p><div class="hero-cta"><a class="btn" href="/">Home <span class="arr">${ARR}</span></a><a class="btn ghost" href="/work">All work</a></div></section>`,
});

console.log(`\nBuilt ${projects.length} projects, ${articles.length} articles.`);
