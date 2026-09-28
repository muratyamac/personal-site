// ⌘K command palette + ` terminal. Both share one command list.
import { profile, products, links, garage } from "./data.js";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
const open = (url) => window.open(url, "_blank", "noopener");

export function initCommands({ getF1, getLego }) {
  const palette = $("#palette");
  const pInput = $("#palette-input");
  const pList = $("#palette-list");
  const term = $("#term");
  const tOut = $("#term-out");
  const tInput = $("#term-input");
  let lastFocus = null;

  // ——— Palette ———
  const actions = [
    { icon: "↑", label: "Go to top", hint: "nav", run: () => go("top") },
    { icon: "▣", label: "Build the LEGO car", hint: "nav", run: () => go("build") },
    { icon: "≡", label: "The grid — products", hint: "nav", run: () => go("grid") },
    { icon: "44", label: "Pit wall — Lewis & next race", hint: "nav", run: () => go("f1") },
    { icon: "◐", label: "The garage — Hot Wheels", hint: "nav", run: () => go("garage") },
    { icon: "✉", label: "Contact", hint: "nav", run: () => go("contact") },
    ...products.filter((p) => p.url).map((p) => ({ icon: "↗", label: `Open ${p.name}`, hint: p.code, run: () => open(p.url) })),
    ...links.map((l) => ({ icon: "↗", label: `Open ${l.label}`, hint: "link", run: () => open(l.url) })),
    { icon: ">_", label: "Open terminal", hint: "`", run: () => openTerm() },
    { icon: "⧉", label: "Copy page link", hint: "share", run: () => navigator.clipboard?.writeText(location.origin) },
  ];
  let filtered = actions;
  let sel = 0;

  const score = (label, q) => {
    // tiny fuzzy match: all chars in order, bonus for word starts
    let li = 0, s = 0;
    const l = label.toLowerCase();
    for (const ch of q) {
      const i = l.indexOf(ch, li);
      if (i < 0) return -1;
      s += i === 0 || l[i - 1] === " " ? 3 : i === li ? 2 : 1;
      li = i + 1;
    }
    return s;
  };

  function renderPalette() {
    const q = pInput.value.trim().toLowerCase();
    filtered = q
      ? actions.map((a) => [a, score(a.label, q)]).filter(([, s]) => s >= 0).sort((a, b) => b[1] - a[1]).map(([a]) => a)
      : actions;
    sel = Math.min(sel, Math.max(0, filtered.length - 1));
    pList.innerHTML = filtered.length
      ? filtered
          .map((a, i) => `<li role="option" id="pal-${i}" aria-selected="${i === sel}" data-i="${i}"><span class="ic">${a.icon}</span>${esc(a.label)}<span class="hint">${esc(a.hint)}</span></li>`)
          .join("")
      : `<li class="empty">No matches. Try the terminal — press \`</li>`;
    pInput.setAttribute("aria-activedescendant", filtered.length ? `pal-${sel}` : "");
    pList.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }

  function openPalette() {
    if (!term.hidden) closeTerm();
    lastFocus = document.activeElement;
    palette.hidden = false;
    pInput.value = "";
    sel = 0;
    renderPalette();
    pInput.focus();
  }
  function closePalette() {
    palette.hidden = true;
    lastFocus?.focus?.();
  }
  function runSelected(i = sel) {
    const a = filtered[i];
    if (!a) return;
    closePalette();
    a.run();
  }

  pInput.addEventListener("input", () => { sel = 0; renderPalette(); });
  pInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); sel = (sel + 1) % filtered.length; renderPalette(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); sel = (sel - 1 + filtered.length) % filtered.length; renderPalette(); }
    else if (e.key === "Enter") { e.preventDefault(); runSelected(); }
  });
  pList.addEventListener("click", (e) => {
    const li = e.target.closest("li[data-i]");
    if (li) runSelected(+li.dataset.i);
  });
  pList.addEventListener("mousemove", (e) => {
    const li = e.target.closest("li[data-i]");
    if (li && +li.dataset.i !== sel) { sel = +li.dataset.i; renderPalette(); }
  });
  palette.addEventListener("click", (e) => { if (e.target.hasAttribute("data-close")) closePalette(); });
  $("#open-palette").addEventListener("click", openPalette);

  // ——— Terminal ———
  const history = [];
  let hIdx = 0;
  const print = (html = "") => {
    tOut.insertAdjacentHTML("beforeend", `<div>${html}</div>`);
    tOut.scrollTop = tOut.scrollHeight;
  };

  const find = (arg) => {
    const a = (arg || "").toLowerCase();
    return [...products, ...links.map((l) => ({ ...l, name: l.label, code: l.label }))].find(
      (p) => p.name.toLowerCase() === a || p.code.toLowerCase() === a,
    );
  };

  const cmds = {
    help: {
      desc: "list commands",
      run: () => {
        Object.entries(cmds)
          .filter(([, c]) => !c.hidden)
          .forEach(([name, c]) => print(`  <span class="y">${name.padEnd(10)}</span>${c.desc}`));
      },
    },
    whoami: {
      desc: "who's driving",
      run: () => {
        print(`<span class="y">${esc(profile.name)}</span>`);
        print(`${esc(profile.role)}`);
        print(`${profile.companies.map(esc).join(" / ")}`);
        print(`<span class="dim">"${esc(profile.tagline)}"</span>`);
      },
    },
    ls: {
      desc: "ls [products|links|garage]",
      run: (arg = "") => {
        if (arg === "links") return links.forEach((l) => print(`  ${l.label.padEnd(14)}<a href="${l.url}" target="_blank" rel="noopener">${esc(l.handle)}</a>`));
        if (arg === "garage") return garage.forEach((c) => print(`  ${String(c.year).padEnd(6)}${esc(c.name)} <span class="dim">(${esc(c.series)})</span>`));
        if (arg && arg !== "products") return print(`<span class="r">ls: ${esc(arg)}: no such directory</span>`);
        products.forEach((p) =>
          print(`  ${p.status === "running" ? '<span class="g">●</span>' : '<span class="dim">○</span>'} ${p.code}  ${esc(p.name.padEnd(12))}<span class="dim">${esc(p.blurb)}</span>`),
        );
      },
    },
    open: {
      desc: "open <name>   e.g. open payodin",
      run: (arg) => {
        const p = find(arg);
        if (!p) return print(`<span class="r">open: '${esc(arg ?? "")}' not found.</span> Try <span class="y">ls</span>.`);
        if (!p.url) return print(`${esc(p.name)} is still in the garage.`);
        print(`opening ${esc(p.url)} …`);
        open(p.url);
      },
    },
    f1: {
      desc: "championship snapshot",
      run: () => {
        const d = getF1();
        if (!d?.driver) return print(`<span class="r">timing feed offline.</span>`);
        print(`${d.season} · after round ${d.round}`);
        d.top.forEach((r) => print(`  ${String(r.pos).padStart(2)}  ${r.code}  ${String(r.points).padStart(4)}  <span class="dim">${esc(r.team)}</span>`));
        if (!d.top.some((r) => r.id === d.driver.id)) print(`  ${String(d.driver.pos).padStart(2)}  HAM  ${String(d.driver.points).padStart(4)}`);
        print(`<span class="y">#44 — P${d.driver.pos}, ${d.driver.points} pts.</span> Still I rise.`);
        if (d.next) print(`next: ${esc(d.next.name)} — ${new Date(d.next.start).toLocaleString()}`);
      },
    },
    build: {
      desc: "assemble the LEGO car",
      run: () => {
        const lego = getLego();
        if (!lego) { go("build"); return print("heading to the build plate…"); }
        print(`snapping ${lego.total} pieces together… <span class="g">done.</span>`);
        closeTerm();
        lego.buildAll();
      },
    },
    uptime: {
      desc: "how long things stay up",
      run: () => {
        products.filter((p) => p.status === "running").forEach((p) => print(`  <span class="g">▲</span> ${esc(p.name.padEnd(12))}<span class="dim">on track</span>`));
        print(`<span class="dim">live uptime board — coming in the next lap.</span>`);
      },
    },
    contact: { desc: "radio the pit wall", run: () => { closeTerm(); go("contact"); } },
    clear: { desc: "clear the screen", run: () => (tOut.innerHTML = "") },
    exit: { desc: "close terminal", run: () => closeTerm() },
    // easter eggs
    deploy: {
      hidden: true,
      run: () => {
        print(`<span class="r">✖ refusing to run wrangler deploy.</span>`);
        print(`<span class="dim">rule #1: push to GitHub. Cloudflare does the rest.</span>`);
      },
    },
    "wrangler": { hidden: true, run: (a) => cmds.deploy.run(a) },
    sudo: { hidden: true, run: () => print(`<span class="r">nice try.</span> this incident will be reported to race control.`) },
    rm: { hidden: true, run: () => print(`<span class="r">rm: things here are built to stay.</span>`) },
    box: { hidden: true, run: () => print(`<span class="y">📻 box, box. box this lap.</span>`) },
    lego: { hidden: true, run: () => print(`everything is awesome. try <span class="y">build</span>.`) },
    44: { hidden: true, run: () => print(`<span class="p">purple sector.</span> still I rise.`) },
    date: { hidden: true, run: () => print(new Date().toString()) },
    pwd: { hidden: true, run: () => print("/home/murat/pitwall") },
    cat: {
      hidden: true,
      run: (a) => (a === "about.txt" ? cmds.whoami.run() : print(`<span class="r">cat: ${esc(a ?? "")}: no such file</span> <span class="dim">(try about.txt)</span>`)),
    },
  };

  function exec(line) {
    const raw = line.trim();
    print(`<span class="cmd">❯ ${esc(raw)}</span>`);
    if (!raw) return;
    history.push(raw);
    hIdx = history.length;
    const [name, ...rest] = raw.split(/\s+/);
    const c = cmds[name.toLowerCase()];
    if (!c) return print(`<span class="r">command not found: ${esc(name)}</span> — type <span class="y">help</span>`);
    c.run(rest.join(" ").toLowerCase() || undefined);
  }

  let greeted = false;
  function openTerm() {
    if (!palette.hidden) closePalette();
    lastFocus = document.activeElement;
    term.hidden = false;
    if (!greeted) {
      greeted = true;
      print(`<span class="y">pitwall OS</span> <span class="dim">v1 · ${new Date().toDateString()}</span>`);
      print(`type <span class="y">help</span> to see commands.`);
      print();
    }
    tInput.focus();
  }
  function closeTerm() {
    term.hidden = true;
    lastFocus?.focus?.();
  }

  tInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { exec(tInput.value); tInput.value = ""; }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (hIdx > 0) tInput.value = history[--hIdx]; }
    else if (e.key === "ArrowDown") { e.preventDefault(); hIdx = Math.min(history.length, hIdx + 1); tInput.value = history[hIdx] ?? ""; }
    else if (e.key === "Tab") {
      e.preventDefault();
      const v = tInput.value.toLowerCase();
      const m = Object.keys(cmds).filter((k) => !cmds[k].hidden && k.startsWith(v));
      if (m.length === 1) tInput.value = m[0] + " ";
      else if (m.length > 1) print(`<span class="dim">${m.join("  ")}</span>`);
    } else if (e.key === "l" && e.ctrlKey) { e.preventDefault(); tOut.innerHTML = ""; }
  });
  term.addEventListener("click", (e) => {
    if (e.target === term) closeTerm();
    else if (e.target.closest("[data-close]")) closeTerm();
    else if (!getSelection().toString()) tInput.focus();
  });

  // ——— Global keys ———
  addEventListener("keydown", (e) => {
    const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      palette.hidden ? openPalette() : closePalette();
    } else if (e.key === "Escape") {
      if (!palette.hidden) closePalette();
      if (!term.hidden) closeTerm();
    } else if (e.key === "`" && (!typing || document.activeElement === tInput)) {
      e.preventDefault();
      term.hidden ? openTerm() : closeTerm();
    } else if (e.key === "/" && !typing) {
      e.preventDefault();
      openPalette();
    }
  });
}
