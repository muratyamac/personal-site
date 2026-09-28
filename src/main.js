import { profile, teams, products, buildLog, links } from "./data.js";
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
function onScroll() {
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
  steps.forEach((li, i) => li.classList.toggle("on", i === active));
  lego?.setProgress(Math.min(1, p / 0.9)); // finish before the last caption leaves
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
