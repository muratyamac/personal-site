// API for muratyamac.com.tr. Static assets are served by Workers Assets;
// only /api/* reaches this code.

const JOLPICA = "https://api.jolpi.ca/ergast/f1/current";
const DRIVER_ID = "hamilton";
const F1_TTL = 900; // seconds
const GARAGE = "murat"; // muratwheels holds more than one garage; only this one is public
const GARAGE_TTL = 3600;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/f1") return f1(request, ctx);
    if (url.pathname === "/api/garage") return garage(request, env, ctx);

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

// Hot Wheels collection from the muratwheels D1 database (read-only queries).
async function garage(request, env, ctx) {
  const cache = caches.default;
  const key = new Request(new URL("/api/garage", request.url), { method: "GET" });
  const hit = await cache.match(key);
  if (hit) return hit;

  try {
    const db = env.WHEELS;
    const shine = (k) => `json_extract(shine_json, '$.${k}')`;
    const [stats, complete, latest, top] = await db.batch([
      db.prepare(
        `SELECT SUM(quantity) AS cars, COUNT(DISTINCT series) AS series,
                MIN(created_at) AS since,
                SUM(created_at >= strftime('%Y-01-01', 'now')) AS thisYear
         FROM cars WHERE garage_key = ?1`,
      ).bind(GARAGE),
      db.prepare(
        `SELECT series FROM cars
         WHERE garage_key = ?1 AND series_size IS NOT NULL
         GROUP BY series, series_size
         HAVING COUNT(DISTINCT number_in_series) >= series_size
         ORDER BY series`,
      ).bind(GARAGE),
      db.prepare(
        `SELECT id, car_name AS name, series, collection_number AS no,
                ${shine("nickname")} AS nick, ${shine("rating")} AS rating, created_at AS added
         FROM cars WHERE garage_key = ?1
         ORDER BY created_at DESC LIMIT 12`,
      ).bind(GARAGE),
      db.prepare(
        `SELECT id, car_name AS name, series, ${shine("nickname")} AS nick,
                ${shine("personality")} AS blurb, ${shine("rating")} AS rating
         FROM cars WHERE garage_key = ?1 AND ${shine("rating")} >= 9
         ORDER BY random() LIMIT 6`,
      ).bind(GARAGE),
    ]);

    const s = stats.results[0] ?? {};
    const body = {
      stats: {
        cars: s.cars ?? 0,
        series: s.series ?? 0,
        since: s.since ? Number(s.since.slice(0, 4)) : null,
        thisYear: s.thisYear ?? 0,
        complete: complete.results.map((r) => r.series),
      },
      latest: latest.results.map((r) => ({ ...r, added: r.added?.slice(0, 10) ?? null })),
      top: top.results,
      fetchedAt: new Date().toISOString(),
    };

    const res = json(body, 200, { "cache-control": `public, max-age=${GARAGE_TTL}` });
    ctx.waitUntil(cache.put(key, res.clone()));
    return res;
  } catch (err) {
    console.error("garage", err);
    return json({ error: "garage_unavailable" }, 502);
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
