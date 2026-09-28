import { profile, teams, products, buildLog, links, garage } from "./data.js";
import { initCommands } from "./commands.js";

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ——— Static content ———
$("#avatar").src = profile.avatar;
$("#year").textContent = new Date().getFullYear();

$("#build-steps").innerHTML = buildLog
  .map(
    (s) => `<li data-step="${s.step}">
      <span class="step mono"><b>${s.step}</b> ${esc(s.part)}</span>
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.text)}</p>
    </li>`,
  )
  .join("");

let pos = 0;
$("#timing-rows").innerHTML = teams
  .map((t) => {
    const rows = products
      .filter((p) => p.team === t.name)
      .map((p) => {
        pos++;
        const running = p.status === "running";
        const name = p.url
          ? `<a class="trow__link" href="${p.url}" target="_blank" rel="noopener">${esc(p.name)}</a>`
          : esc(p.name);
        const sub = p.sub?.length
          ? `<span class="trow__sub">${p.sub.map((x) => `<a class="chip" href="${x.url}" target="_blank" rel="noopener">${esc(x.name)} ↗</a>`).join("")}</span>`
          : "";
        return `<div class="trow ${running ? "" : "garage-row"} ${p.url ? "has-link" : ""}" role="row" style="--c:${p.color}">
          <span class="trow__pos" role="cell">${String(pos).padStart(2, "0")}</span>
          <span class="trow__car" role="cell"><span class="trow__bar"></span><span><strong>${name}</strong><small>${p.code}</small></span></span>
          <span class="trow__desc" role="cell">${esc(p.blurb)}${sub}</span>
          <span class="trow__status" role="cell"><span class="s s--${p.status}">${running ? "● ON TRACK" : "○ IN GARAGE"}</span>${p.url ? '<span class="go" aria-hidden="true">↗</span>' : ""}</span>
        </div>`;
      })
      .join("");
    return `<div class="tteam mono" role="row" style="--c:${t.color}"><span role="cell"><i></i>${esc(t.name)}</span><span role="cell" class="dim">${t.short}</span></div>${rows}`;
  })
  .join("");

$("#links").innerHTML = links
  .map((l) => `<li><a href="${l.url}" target="_blank" rel="noopener">${esc(l.label)} <small>${esc(l.handle)} ↗</small></a></li>`)
  .join("");

// ——— Garage ———
const bodies = {
  muscle: "M8 40 L14 28 L40 24 L58 14 L96 14 L114 24 L150 27 L156 40 Z",
  gt: "M6 40 L12 30 L46 24 L70 12 L104 12 L126 24 L154 30 L158 40 Z",
  formula: "M4 40 L4 32 L30 32 L44 28 L66 28 L72 18 L86 18 L92 28 L140 30 L140 22 L158 22 L158 40 Z",
  wagon: "M8 40 L12 26 L34 22 L50 12 L138 12 L150 24 L156 40 Z",
};
const carSvg = (c) => `<svg viewBox="0 0 164 54" aria-hidden="true">
  <ellipse cx="82" cy="50" rx="74" ry="3" fill="rgba(0,0,0,.6)"/>
  <path d="${bodies[c.body] ?? bodies.gt}" fill="${c.color}"/>
  <path d="${bodies[c.body] ?? bodies.gt}" fill="url(#shine)" opacity=".35"/>
  <circle cx="38" cy="40" r="10" fill="#111"/><circle cx="38" cy="40" r="4.5" fill="#bbb"/>
  <circle cx="126" cy="40" r="10" fill="#111"/><circle cx="126" cy="40" r="4.5" fill="#bbb"/>
  <defs><linearGradient id="shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>
</svg>`;

$("#garage-track").innerHTML = garage
  .map(
    (c) => `<article class="hw" style="--c:${c.color}">
      <div class="hw__top"><span class="hw__logo">1:64</span><span class="mono dim">${c.year}</span></div>
      <div class="hw__stage">${carSvg(c)}</div>
      <h3>${esc(c.name)}</h3>
      <span class="mono dim">${esc(c.series)}</span>
    </article>`,
  )
  .join("");

// drag-to-scroll with momentum
(() => {
  const track = $("#garage-track");
  let down = false, startX = 0, startScroll = 0, v = 0, lastX = 0, raf = 0, moved = false;
  track.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse") return;
    down = true; moved = false;
    startX = lastX = e.clientX;
    startScroll = track.scrollLeft;
    cancelAnimationFrame(raf);
    track.setPointerCapture(e.pointerId);
  });
  track.addEventListener("pointermove", (e) => {
    if (!down) return;
    if (Math.abs(e.clientX - startX) > 4) { moved = true; track.classList.add("dragging"); }
    v = e.clientX - lastX; lastX = e.clientX;
    track.scrollLeft = startScroll - (e.clientX - startX);
  });
  const up = () => {
    if (!down) return;
    down = false;
    track.classList.remove("dragging");
    if (!moved || reducedMotion) return;
    const glide = () => { track.scrollLeft -= v; v *= 0.94; if (Math.abs(v) > 0.5) raf = requestAnimationFrame(glide); };
    raf = requestAnimationFrame(glide);
  };
  track.addEventListener("pointerup", up);
  track.addEventListener("pointercancel", up);
})();

// ——— F1 / ticker ———
const f1State = { data: null };

function setTicker(items) {
  const html = items.map((t) => `<span>${t}</span>`).join("");
  $("#ticker-run").innerHTML = html + html; // doubled for a seamless loop
}
setTicker([
  `<b>MY</b> Murat Yamac`,
  `I build things that stay`,
  ...products.filter((p) => p.status === "running").map((p) => `<b>${p.code}</b> ${p.name} <span class="g">ON TRACK</span>`),
  `Press <b>⌘K</b>`,
]);

async function loadF1() {
  try {
    const res = await fetch("/api/f1");
    if (!res.ok) throw new Error(res.status);
    f1State.data = await res.json();
  } catch {
    f1State.data = await fetchF1Direct().catch(() => null);
  }
  renderF1(f1State.data);
}

// Fallback when the Worker isn't running (e.g. plain `vite` dev).
async function fetchF1Direct() {
  const base = "https://api.jolpi.ca/ergast/f1/current";
  const [s, n] = await Promise.all([fetch(`${base}/driverStandings.json`).then((r) => r.json()), fetch(`${base}/next.json`).then((r) => r.json())]);
  const list = s.MRData.StandingsTable.StandingsLists[0];
  const rows = list.DriverStandings.map((d) => ({
    pos: +d.position, points: +d.points, wins: +d.wins, code: d.Driver.code, id: d.Driver.driverId,
    name: `${d.Driver.givenName} ${d.Driver.familyName}`, team: d.Constructors.at(-1)?.name ?? "",
  }));
  const r = n.MRData.RaceTable.Races[0];
  return {
    season: list.season, round: +list.round, driver: rows.find((x) => x.id === "hamilton"), top: rows.slice(0, 6),
    next: r && { name: r.raceName, round: +r.round, circuit: r.Circuit.circuitName, locality: r.Circuit.Location.locality, country: r.Circuit.Location.country, start: `${r.date}T${r.time ?? "00:00:00Z"}` },
  };
}

function renderF1(d) {
  if (!d?.driver) {
    $("#next-race").textContent = "Timing feed unavailable. Back after the safety car.";
    return;
  }
  const me = d.driver;
  const leader = d.top[0];
  $("#d-pos").textContent = `P${me.pos}`;
  $("#d-pts").textContent = me.points;
  $("#d-gap").textContent = me.pos === 1 ? "LEADER" : `−${leader.points - me.points}`;
  $("#d-team").textContent = `${me.team} · ${d.season} season · after round ${d.round}`;
  $("#standings-label").textContent = `Drivers' championship ${d.season}`;

  const top = d.top.some((r) => r.id === me.id) ? d.top : [...d.top.slice(0, 5), me];
  $("#standings").innerHTML = top
    .map((r) => `<li class="${r.id === me.id ? "me" : ""}"><b class="${r.pos === 1 ? "p1" : ""}">${r.pos}</b><b>${r.code}</b><span>${esc(r.team)}</span><span class="pts">${r.points}</span></li>`)
    .join("");

  if (d.next) {
    const start = new Date(d.next.start);
    const date = start.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    $("#next-race").innerHTML = `<strong>${esc(d.next.name)}</strong>${esc(d.next.circuit)} · ${esc(d.next.locality)}, ${esc(d.next.country)} — ${date}`;
    tickCountdown(start);
  }

  setTicker([
    `<b>MY</b> Murat Yamac`,
    `<b>P${me.pos}</b> HAM ${me.points} PTS`,
    `<span class="p">${leader.code}</span> leads on ${leader.points}`,
    d.next ? `Next: <b>R${d.next.round}</b> ${esc(d.next.name)}` : "",
    ...products.filter((p) => p.status === "running").map((p) => `<b>${p.code}</b> ${p.name} <span class="g">ON TRACK</span>`),
    `Press <b>⌘K</b>`,
  ].filter(Boolean));
}

function tickCountdown(start) {
  const els = Object.fromEntries([...document.querySelectorAll("#countdown b")].map((b) => [b.dataset.u, b]));
  const pad = (n) => String(n).padStart(2, "0");
  const tick = () => {
    let s = Math.max(0, Math.floor((start - Date.now()) / 1000));
    const d = Math.floor(s / 86400); s %= 86400;
    const h = Math.floor(s / 3600); s %= 3600;
    const m = Math.floor(s / 60); s %= 60;
    els.d.textContent = pad(d); els.h.textContent = pad(h); els.m.textContent = pad(m); els.s.textContent = pad(s);
  };
  tick();
  setInterval(tick, 1000);
}

loadF1();

// ——— LEGO build (lazy) ———
const canvas = $("#lego");
const steps = [...document.querySelectorAll("#build-steps li")];
let lego = null;

// Progress follows the step captions: each step that crosses the
// viewport's midline adds 1/n of the car.
let lastActive = -1;
function measure() {
  scrollQueued = false;
  const mid = innerHeight * 0.6;
  let p = 0;
  let active = 0;
  steps.forEach((li, i) => {
    const r = li.getBoundingClientRect();
    if (r.top <= mid) {
      active = i;
      p = (i + Math.min(1, (mid - r.top) / r.height)) / steps.length;
    }
  });
  if (active !== lastActive) {
    lastActive = active;
    steps.forEach((li, i) => li.classList.toggle("on", i === active));
  }
  lego?.setProgress(Math.min(1, p / 0.9)); // finish before the last caption leaves
}
// at most one measurement per frame; phones fire scroll events faster than they paint
let scrollQueued = false;
function onScroll() {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(measure);
}
addEventListener("scroll", onScroll, { passive: true });
onScroll();

new IntersectionObserver(
  async ([entry], obs) => {
    if (!entry.isIntersecting) return;
    obs.disconnect();
    try {
      const { createLego } = await import("./lego.js");
      lego = createLego(canvas, {
        reducedMotion,
        onCount: (n, pct) => {
          $("#brick-count").textContent = String(n).padStart(3, "0");
          $("#build-pct").textContent = `${pct}%`;
        },
      });
      onScroll();
    } catch (err) {
      console.warn("LEGO build unavailable", err);
    }
  },
  { rootMargin: "400px" },
).observe(canvas);

// ——— Palette + terminal ———
initCommands({ getF1: () => f1State.data, getLego: () => lego });
