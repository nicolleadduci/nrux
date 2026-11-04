// nr/ux — interactions. Plain JS, no framework.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ── nav: frosted on scroll, hides on the way down ───────── */
  const nav = $(".nav");
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY;
    nav?.classList.toggle("is-scrolled", y > 20);
    nav?.classList.toggle("is-hidden", y > 400 && y > lastY + 4);
    if (y < lastY - 4) nav?.classList.remove("is-hidden");
    document.documentElement.classList.toggle("nav-off", !!nav?.classList.contains("is-hidden"));
    lastY = y;
    const bar = $(".progress");
    if (bar) {
      const max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    }
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ── mobile sheet ────────────────────────────────────────── */
  const sheet = $(".sheet");
  $(".menu-btn")?.addEventListener("click", () => { sheet.classList.add("open"); sheet.removeAttribute("inert"); $(".sheet .close").focus(); });
  $(".sheet .close")?.addEventListener("click", () => { sheet.classList.remove("open"); sheet.setAttribute("inert", ""); $(".menu-btn").focus(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && sheet?.classList.contains("open")) $(".sheet .close").click(); });

  /* ── split headings into words ───────────────────────────── */
  $$("[data-split]").forEach((el) => {
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) return frag.append(document.createTextNode(part));
            const w = document.createElement("span");
            w.className = "w";
            const s = document.createElement("span");
            s.style.setProperty("--i", i++);
            s.textContent = part;
            w.append(s);
            frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
      });
    };
    walk(el);
    el.classList.add("split");
  });

  /* ── reveal on view ──────────────────────────────────────── */
  const io = new IntersectionObserver((ents) => {
    ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
  $$(".rv, .split").forEach((el) => io.observe(el));

  /* ── elastic name: letters stretch toward the cursor ─────── */
  $$("[data-elastic]").forEach((el) => {
    const text = el.textContent;
    el.textContent = "";
    el.setAttribute("aria-label", text);
    let i = 0;
    const chars = [...text].map((c) => {
      const s = document.createElement("span");
      s.className = "ch";
      s.setAttribute("aria-hidden", "true");
      s.style.setProperty("--i", i++);
      s.textContent = c === " " ? " " : c;
      el.append(s);
      return s;
    });
    el.classList.add("intro");
    if (!fine || reduce) return;
    setTimeout(() => {
      el.classList.remove("intro");
      let raf = 0, mx = -1e4;
      const host = el.closest("section") || document.body;
      const apply = () => {
        raf = 0;
        chars.forEach((c) => {
          const r = c.getBoundingClientRect();
          const d = Math.abs(mx - (r.left + r.width / 2));
          const t = Math.max(0, 1 - d / 420);
          c.style.setProperty("--w", (78 + t * 47).toFixed(1));
        });
      };
      host.addEventListener("mousemove", (e) => { mx = e.clientX; if (!raf) raf = requestAnimationFrame(apply); });
      host.addEventListener("mouseleave", () => chars.forEach((c) => c.style.setProperty("--w", 112)));
    }, 1400 + chars.length * 40);
  });

  /* ── media: play only what is on screen ──────────────────── */
  const mio = new IntersectionObserver((ents) => {
    ents.forEach((e) => {
      const el = e.target;
      el.classList.toggle("in-view", e.isIntersecting);
      if (el.tagName === "VIDEO") {
        if (e.isIntersecting && !reduce) {
          if (!el.src && el.dataset.src) el.src = el.dataset.src;
          el.play().catch(() => {});
        } else el.pause();
      }
      if (el.classList.contains("term") && e.isIntersecting) typeTerm(el);
    });
  }, { threshold: 0.15 });
  $$("video[data-src]:not([data-manual]), .media, .term:not([data-manual])").forEach((el) => mio.observe(el));

  /* ── terminal: type lines, loop ──────────────────────────── */
  const cls = (l) => (l.startsWith("$") ? "cmd" : l.startsWith("✓") ? "ok" : l.startsWith("✗") ? "err" : "info");
  async function typeTerm(el) {
    if (el.dataset.typing) return;
    el.dataset.typing = "1";
    const lines = JSON.parse(el.dataset.lines || "[]");
    if (reduce) { el.innerHTML = lines.map((l) => `<div class="ln ${cls(l)}">${esc(l)}</div>`).join(""); return; }
    for (;;) {
      el.innerHTML = "";
      for (const l of lines) {
        const d = document.createElement("div");
        d.className = `ln ${cls(l)}`;
        el.append(d);
        const cur = document.createElement("span");
        cur.className = "cur";
        if (l.startsWith("$")) {
          for (let k = 1; k <= l.length; k++) { d.textContent = l.slice(0, k); d.append(cur); await sleep(22 + Math.random() * 30); }
          await sleep(380);
        } else { d.textContent = l; d.append(cur); await sleep(420); }
        cur.remove();
      }
      const last = el.lastElementChild;
      const cur = document.createElement("span"); cur.className = "cur"; last?.append(cur);
      await sleep(3600);
      while (!el.classList.contains("in-view")) await sleep(400);
    }
  }
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ── home console: prompt → product ──────────────────────── */
  const con = $(".console");
  if (con) {
    const items = JSON.parse($("#console-data").textContent);
    const promptEl = $(".console-prompt .txt", con);
    const logEl = $(".console-log", con);
    const frames = $$(".console-out .frame", con);
    const scan = $(".console-out .scan", con);
    const steps = $$(".console-steps button", con);
    const link = $(".console-out", con);
    const capT = $(".console-out .cap b", con);
    const capK = $(".console-out .cap .chip", con);
    let idx = -1, token = 0;
    const show = async (n) => {
      const my = ++token;
      idx = n;
      const it = items[n];
      steps.forEach((b, k) => b.classList.toggle("on", k === n));
      frames.forEach((f) => f.classList.remove("show"));
      $$("video", con).forEach((v) => v.pause());
      logEl.innerHTML = "";
      capT.textContent = ""; capK.textContent = "";
      link.href = it.href;
      if (reduce) promptEl.textContent = it.prompt;
      else {
        promptEl.textContent = "";
        for (let k = 1; k <= it.prompt.length; k++) { if (my !== token) return; promptEl.textContent = it.prompt.slice(0, k); await sleep(18 + Math.random() * 26); }
      }
      await sleep(300); if (my !== token) return;
      logEl.innerHTML = `› ${esc(it.stack)}`;
      await sleep(500); if (my !== token) return;
      scan.classList.remove("go"); void scan.offsetWidth; scan.classList.add("go");
      const f = frames[n];
      f.classList.add("show");
      const v = $("video", f);
      if (v) { if (!v.src) v.src = v.dataset.src; v.currentTime = 0; v.play().catch(() => {}); }
      await sleep(700); if (my !== token) return;
      logEl.innerHTML = `› ${esc(it.stack)}<br><span class="ok">✓ shipped</span> · ${esc(it.kind)}`;
      capT.textContent = it.title; capK.textContent = it.year || it.kind;
      await sleep(5200); if (my !== token) return;
      show((idx + 1) % items.length);
    };
    steps.forEach((b, k) => b.addEventListener("click", () => show(k)));
    show(0);
  }

  /* ── thumbnails: still until hovered ───────────────────── */
  $$("[data-hover]").forEach((el) => {
    const vids = $$("video[data-manual]", el);
    if (!vids.length) return;
    el.addEventListener("mouseenter", () => vids.forEach((v) => { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); }));
    el.addEventListener("mouseleave", () => vids.forEach((v) => { v.pause(); try { v.currentTime = 0; } catch {} }));
  });

  /* ── custom cursor ───────────────────────────────────────── */
  if (fine && !reduce) {
    const c = document.createElement("div");
    c.className = "cursor";
    c.innerHTML = "<span></span>";
    document.body.append(c);
    let x = -100, y = -100, cx = x, cy = y;
    addEventListener("mousemove", (e) => { x = e.clientX; y = e.clientY; c.classList.add("on"); }, { passive: true });
    document.addEventListener("mouseleave", () => c.classList.remove("on"));
    const tick = () => { cx += (x - cx) * 0.22; cy += (y - cy) * 0.22; c.style.transform = `translate(${cx}px, ${cy}px)`; requestAnimationFrame(tick); };
    tick();
    document.addEventListener("mouseover", (e) => {
      const t = e.target.closest("[data-cursor]");
      c.classList.toggle("big", !!t);
      c.firstChild.textContent = t ? t.dataset.cursor : "";
    });
  }

  /* ── work: filters, view toggle, hover peek ──────────────── */
  const filters = $$(".filters button");
  if (filters.length) {
    const apply = (k) => {
      filters.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.k === k)));
      $$("[data-kind]").forEach((el) => el.classList.toggle("hide", k !== "all" && el.dataset.kind !== k));
      history.replaceState(null, "", k === "all" ? location.pathname : `#${k}`);
    };
    filters.forEach((b) => b.addEventListener("click", () => apply(b.dataset.k)));
    const h = location.hash.slice(1);
    if (h && filters.some((b) => b.dataset.k === h)) apply(h);
  }
  const views = $$(".views button");
  views.forEach((b) => b.addEventListener("click", () => {
    views.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    $(".work-list").classList.toggle("show-grid", b.dataset.v === "grid");
    try { localStorage.setItem("nrux-view-v4", b.dataset.v); } catch {}
  }));
  try { if (localStorage.getItem("nrux-view-v4") === "grid") views.find((b) => b.dataset.v === "grid")?.click(); } catch {}

  const peek = $(".peek");
  if (peek && fine) {
    let px = 0, py = 0, tx = 0, ty = 0, on = false;
    const tick = () => { px += (tx - px) * 0.16; py += (ty - py) * 0.16; peek.style.left = px + "px"; peek.style.top = py + "px"; requestAnimationFrame(tick); };
    tick();
    $$(".row a").forEach((a) => {
      a.addEventListener("mouseenter", () => {
        const slug = a.dataset.slug;
        $$(".peek > div").forEach((d) => {
          const hit = d.dataset.slug === slug;
          d.classList.toggle("on", hit);
          const v = $("video", d);
          if (v) { if (hit) { if (!v.src) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause(); }
          $(".site-scroll", d)?.classList.toggle("play", hit);
          const t = $(".term", d); if (hit && t) typeTerm(t);
        });
        peek.style.setProperty("--rot", (Math.random() * 6 - 3).toFixed(1) + "deg");
        peek.classList.add("on"); on = true;
      });
      a.addEventListener("mouseleave", () => { peek.classList.remove("on"); on = false; });
    });
    addEventListener("mousemove", (e) => { tx = e.clientX + 40; ty = e.clientY; if (!on) { px = tx; py = ty; } }, { passive: true });
  }

  /* ── film player ─────────────────────────────────────────── */
  $$(".film").forEach((f) => {
    const btn = $(".film-play", f);
    btn?.addEventListener("click", () => {
      const v = $("video", f);
      if (v) { v.controls = true; v.play(); }
      const tpl = $("template", f);
      if (tpl) f.append(tpl.content.cloneNode(true));
      f.classList.add("playing");
    });
  });

  /* case hero: swap the muted loop for the full film, with sound */
  $(".cs-hero [data-film]").forEach((h) => {
    $(".sound-on", h)?.addEventListener("click", () => {
      const v = $("video", h);
      if (!v) return;
      mio.unobserve(v);
      v.src = h.dataset.film; v.loop = false; v.muted = false; v.controls = true;
      v.removeAttribute("aria-hidden");
      v.play().catch(() => {});
      h.classList.add("with-sound");
    });
  });

  /* ── GitHub: live stars + profile ────────────────────────── */
  const gh = document.body.dataset.github;
  if (gh && $("[data-repo], .gh-card")) {
    fetch(`https://api.github.com/users/${gh}/repos?per_page=100&sort=pushed`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((list) => {
        const map = Object.fromEntries(list.map((r) => [r.name, r]));
        $$("[data-repo]").forEach((el) => {
          const r = map[el.dataset.repo];
          if (!r) return;
          const s = $(".stars", el); if (s) s.textContent = `★ ${r.stargazers_count}`;
          const u = $(".updated", el); if (u) u.textContent = ago(r.pushed_at);
        });
        const own = list.filter((r) => !r.fork);
        const set = (k, v) => { const n = $(`[data-gh="${k}"]`); if (n) n.textContent = v; };
        set("repos", own.length);
        set("stars", own.reduce((a, r) => a + r.stargazers_count, 0));
        if (own[0]) set("pushed", ago(own[0].pushed_at));
      })
      .catch(() => {});
  }
  function ago(iso) {
    const d = (Date.now() - new Date(iso)) / 864e5;
    if (d < 1) return "today";
    if (d < 2) return "yesterday";
    if (d < 30) return `${Math.round(d)}d ago`;
    if (d < 365) return `${Math.round(d / 30)}mo ago`;
    return `${Math.round(d / 365)}y ago`;
  }

  /* ── copy email ──────────────────────────────────────────── */
  $$("[data-copy]").forEach((b) => b.addEventListener("click", async (e) => {
    e.preventDefault();
    try { await navigator.clipboard.writeText(b.dataset.copy); } catch { location.href = `mailto:${b.dataset.copy}`; return; }
    const chip = $(".chip", b);
    if (chip) { const t = chip.textContent; chip.textContent = "copied ✓"; setTimeout(() => (chip.textContent = t), 1600); }
  }));

  /* ── contact form (Web3Forms) ────────────────────────────── */
  const form = $("#contact-form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const st = $(".form-status", form);
    if (!form.reportValidity()) return;
    st.className = "form-status"; st.textContent = "sending…";
    const data = Object.fromEntries(new FormData(form));
    try {
      const r = await fetch("https://api.web3forms.com/submit", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(data) });
      const j = await r.json();
      if (!j.success) throw new Error(j.message);
      st.textContent = "✓ sent. I'll reply within a day.";
      form.reset();
    } catch {
      st.className = "form-status err";
      st.textContent = `✗ couldn't send. Email ${form.dataset.email} instead.`;
    }
  });
})();
