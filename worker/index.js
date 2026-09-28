// API for muratyamac.bio. Static assets are served by Workers Assets;
// only /api/* reaches this code.

const JOLPICA = "https://api.jolpi.ca/ergast/f1/current";
const DRIVER_ID = "hamilton";
const F1_TTL = 900; // seconds

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/f1") return f1(request, ctx);

    return json({ error: "not_found" }, 404);
  },
};

async function f1(request, ctx) {
  const cache = caches.default;
  const key = new Request(new URL("/api/f1", request.url), { method: "GET" });
  const hit = await cache.match(key);
  if (hit) return hit;

  try {
    const [standings, next] = await Promise.all([
      getJson(`${JOLPICA}/driverStandings.json`),
      getJson(`${JOLPICA}/next.json`),
    ]);

    const list = standings.MRData.StandingsTable.StandingsLists[0];
    const rows = (list?.DriverStandings ?? []).map((s) => ({
      pos: Number(s.position),
      points: Number(s.points),
      wins: Number(s.wins),
      code: s.Driver.code,
      number: s.Driver.permanentNumber,
      id: s.Driver.driverId,
      name: `${s.Driver.givenName} ${s.Driver.familyName}`,
      team: s.Constructors.at(-1)?.name ?? "",
    }));
    const race = next.MRData.RaceTable.Races[0] ?? null;

    const body = {
      season: list?.season ?? null,
      round: list ? Number(list.round) : null,
      driver: rows.find((r) => r.id === DRIVER_ID) ?? null,
      top: rows.slice(0, 6),
      next: race && {
        name: race.raceName,
        round: Number(race.round),
        circuit: race.Circuit.circuitName,
        locality: race.Circuit.Location.locality,
        country: race.Circuit.Location.country,
        start: `${race.date}T${race.time ?? "00:00:00Z"}`,
      },
      fetchedAt: new Date().toISOString(),
    };

    const res = json(body, 200, { "cache-control": `public, max-age=${F1_TTL}` });
    ctx.waitUntil(cache.put(key, res.clone()));
    return res;
  } catch (err) {
    return json({ error: "upstream_unavailable" }, 502);
  }
}

async function getJson(url) {
  const res = await fetch(url, { cf: { cacheTtl: F1_TTL } });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}
