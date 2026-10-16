/*  server.mjs — recreated backend for the frameXTV clone
 *
 *  This re-implements the METADATA layer of api.framextv.tech from first
 *  principles, using the two legitimate public data sources the original
 *  aggregates: TMDB (movies/TV) and AniList (anime). It is a standalone,
 *  self-hosted service — once you point the frontend at it, nothing here
 *  depends on framextv.
 *
 *  The one endpoint NOT reimplemented is /api/stream (see route note below).
 *
 *  Usage:
 *      TMDB_API_KEY=xxxx  node server.mjs            # port 8000
 *      node server.mjs --port 9000
 *
 *  Get a free TMDB key:  https://www.themoviedb.org/settings/api
 *  AniList needs no key (public GraphQL).
 */

import { createServer } from "node:http";

/* ── config ─────────────────────────────────────────────────────────── */
const args = process.argv.slice(2);
const arg = (n, d) => { const i = args.indexOf(n); return i !== -1 && args[i + 1] ? args[i + 1] : d; };
const PORT = Number(arg("--port", process.env.PORT || 8000));
const TMDB_KEY = process.env.TMDB_API_KEY || arg("--tmdb-key", "") || "";
const TMDB = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";

if (!TMDB_KEY) {
  console.error(
    "\n  [warn] TMDB_API_KEY not set. Metadata endpoints will return 503.\n" +
    "         Get a free key: https://www.themoviedb.org/settings/api\n" +
    "         Then:  TMDB_API_KEY=yourkey node server.mjs\n"
  );
}

/* ── tiny in-memory cache (TTL) ─────────────────────────────────────── */
const cache = new Map();
const getCached = (k, ttl) => { const e = cache.get(k); if (e && Date.now() < e.t) return e.v; return null; };
const setCached = (k, v, ttl) => { cache.set(k, { v, t: Date.now() + ttl }); if (cache.size > 500) { const f = cache.keys().next().value; cache.delete(f); } };

/* ── TMDB client ────────────────────────────────────────────────────── */
async function tmdb(path, params = {}) {
  if (!TMDB_KEY) { const e = new Error("TMDB_API_KEY not configured"); e.status = 503; throw e; }
  const key = "tmdb:" + path + ":" + JSON.stringify(params);
  const hit = getCached(key, 10 * 60 * 1000);
  if (hit) return hit;
  const u = new URL(TMDB + path);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== "") u.searchParams.set(k, v);
  u.searchParams.set("api_key", TMDB_KEY);
  const r = await fetch(u, { headers: { accept: "application/json" } });
  if (!r.ok) { const e = new Error(`TMDB ${r.status}`); e.status = 502; throw e; }
  const j = await r.json();
  setCached(key, j, 10 * 60 * 1000);
  return j;
}

/* ── AniList client (no key) ────────────────────────────────────────── */
async function anilist(query, variables) {
  const key = "al:" + query.slice(0, 60) + JSON.stringify(variables);
  const hit = getCached(key, 10 * 60 * 1000);
  if (hit) return hit;
  const r = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!r.ok) { const e = new Error(`AniList ${r.status}`); e.status = 502; throw e; }
  const j = await r.json();
  setCached(key, j, 10 * 60 * 1000);
  return j;
}

/* ── shape mappers (match the original API byte-for-byte) ───────────── */
const num = (v) => (v === undefined || v === null ? "" : String(v));
const item = (m, type) => ({
  id: String(m.id),
  title: m.title || m.name || "",
  type,
  rating: num(m.vote_average ? m.vote_average.toFixed(1) : m.averageScore ? (m.averageScore / 10).toFixed(1) : ""),
  image: m.poster_path ? IMG + "/w500" + m.poster_path : (m.coverImage?.large || ""),
  year: String((m.release_date || m.first_air_date || m.startDate?.year || "").slice(0, 4)),
  poster: m.poster_path ? IMG + "/w500" + m.poster_path : (m.coverImage?.large || ""),
  backdrop: m.backdrop_path ? IMG + "/w1280" + m.backdrop_path : (m.bannerImage || ""),
  overview: m.overview || m.description?.replace(/<[^>]+>/g, "").slice(0, 400) || "",
});
const page = (t, mapFn) => ({
  success: true, page: t.page, totalPages: Math.min(t.total_pages || t.pageInfo?.lastPage || 1, 500),
  totalResults: t.total_results || t.pageInfo?.total || 0, results: (t.results || []).map(mapFn),
});

/* TMDB genre id → name, for the meta "category" + genres array */
async function genreNames(ids, type) {
  try {
    const g = await tmdb(`/genre/${type}/list`, {});
    const map = new Map((g.genres || []).map((x) => [x.id, x.name]));
    return ids.map((i) => map.get(i)).filter(Boolean);
  } catch { return []; }
}

/* ── routes ─────────────────────────────────────────────────────────── */
const routes = {
  "/health": async () => ({ status: "healthy", timestamp: new Date().toISOString() }),

  /* providers: static catalog (names/taglines as served by the original) */
  "/api/providers": async () => ({
    providers: [
      { id: "miner", name: "Miner XIX", tagline: "Movy Multi-City 4K Server", category: "movie_tv", status: "available" },
      { id: "headhunter", name: "Headhunter XXXI", tagline: "VidLink Server", category: "movie_tv", status: "available" },
      { id: "valkyrie", name: "Valkyrie VI", tagline: "4K Ultra Multi-Server", category: "movie_tv", status: "available" },
      { id: "hog_rider", name: "Hog Rider XI", tagline: "4K Pilled Server", category: "movie_tv", status: "available" },
      { id: "lavahound", name: "Lava Hound XII", tagline: "4K Fast Multi-Server Stream", category: "movie_tv", status: "available" },
      { id: "super_barbarian", name: "Super Barbarian XVI", tagline: "Direct Auto HLS Stream", category: "movie_tv", status: "available" },
      { id: "bowler", name: "Bowler XVIII", tagline: "Multi-Language", category: "movie_tv", status: "available" },
      { id: "titan", name: "Titan VII", tagline: "Films365 Direct MP4 1080p Server", category: "movie_tv", status: "available" },
    ],
  }),

  /* home: hero + rails */
  "/api/home": async () => {
    const t0 = Date.now();
    const [trend, popM, popT, nowP, action, scifi, thr, com, anime] = await Promise.all([
      tmdb("/trending/all/day"), tmdb("/movie/popular"), tmdb("/tv/popular"),
      tmdb("/movie/now_playing"), tmdb("/discover/movie", { with_genres: 28 }),
      tmdb("/discover/movie", { with_genres: 878 }), tmdb("/discover/movie", { with_genres: 53 }),
      tmdb("/discover/movie", { with_genres: 35 }), animePopular(),
    ]);
    const mv = (t) => page(t, (m) => item(m, "movie"));
    const tv = (t) => page(t, (m) => item(m, "tv"));
    const heroSrc = trend.results?.[0] || nowP.results?.[0] || {};
    return {
      success: true, timestamp: Math.floor(Date.now() / 1000), generation_time_ms: Date.now() - t0,
      hero: item(heroSrc, heroSrc.media_type === "tv" ? "tv" : "movie"),
      rails: {
        trending_movies: mv(nowP), popular_movies: mv(popM), popular_tv: tv(popT),
        popular_anime: page(anime, animeItem), new_releases: mv(nowP),
        action_movies: mv(action), scifi_movies: mv(scifi), thriller_movies: mv(thr), comedy_movies: mv(com),
        airing_anime: { success: true, page: 1, totalPages: 0, totalResults: 0, results: [] },
      },
    };
  },

  /* discover: TMDB discover, supports type/category/genre/year/sort/min_rating/page */
  "/api/discover": async (q) => {
    const type = q.get("type") === "tv" ? "tv" : "movie";
    const params = { page: q.get("page") || 1 };
    if (q.get("genre")) params.with_genres = q.get("genre");
    if (q.get("year")) params[type === "tv" ? "first_air_date_year" : "primary_release_year"] = q.get("year");
    const sort = q.get("sort");
    if (sort) params.sort_by = sort.includes(".") ? sort : sort + ".desc";
    if (q.get("min_rating")) { params["vote_average.gte"] = q.get("min_rating"); params["vote_count.gte"] = 100; }
    if (!params.sort_by) params.sort_by = "popularity.desc";
    return page(await tmdb(`/discover/${type}`, params), (m) => item(m, type));
  },

  /* search: TMDB multi-search */
  "/api/search": async (q) => {
    const t = await tmdb("/search/multi", { query: q.get("q") || "", page: q.get("page") || 1, include_adult: false });
    return page(t, (m) => item(m, m.media_type === "tv" ? "tv" : "movie"));
  },

  /* meta: TMDB details shaped for the detail/watch pages */
  "/api/meta": async (q) => {
    const type = q.get("type") === "tv" ? "tv" : "movie";
    const id = q.get("id");
    const m = await tmdb(`/${type}/${id}`, {});
    const genres = (m.genres || []).map((g) => g.name);
    const cat = (type === "movie" ? "MOVIE" : "TV") + " / " + genres.join(" / ") + (m.release_date || m.first_air_date ? " / " + (m.release_date || m.first_air_date).slice(0, 4) : "");
    return { success: true, title: `${m.title || m.name} (${(m.release_date || m.first_air_date || "").slice(0, 4)})`, category: cat, backdrop: m.backdrop_path ? IMG + "/w1280" + m.backdrop_path : "", poster: m.poster_path ? IMG + "/w500" + m.poster_path : "", year: (m.release_date || m.first_air_date || "").slice(0, 4), genres };
  },

  /* season: TMDB season + episodes */
  "/api/season": async (q) => {
    const id = q.get("id"), s = q.get("s") || 1;
    const t = await tmdb(`/tv/${id}/season/${s}`, {});
    return { success: true, id: t.id, number: t.season_number, season_number: t.season_number, name: t.name, overview: t.overview, poster: t.poster_path ? IMG + "/w500" + t.poster_path : "", poster_path: t.poster_path || "", episode_count: t.episode_count, air_date: t.air_date, episodes: (t.episodes || []).map((e) => ({ id: e.id, number: e.episode_number, episode_number: e.episode_number, season_number: e.season_number, name: e.name, overview: e.overview, still: e.still_path ? IMG + "/w300" + e.still_path : "", still_path: e.still_path || "", air_date: e.air_date, vote_average: e.vote_average })) };
  },

  /* anime discover: AniList GraphQL */
  "/anime/api/discover": async (q) => {
    const pageNum = Number(q.get("page") || 1);
    const perPage = Math.min(Number(q.get("perPage") || 20), 25);
    const sort = (q.get("sort") || "POPULARITY_DESC").split(",");
    const QUERY = `query ($page:Int,$perPage:Int,$sort:[MediaSort],$format:MediaFormat,$seasonYear:Int,$status:MediaStatus){\n      Page(page:$page,perPage:$perPage){ pageInfo{total,lastPage} \n        media(type:ANIME,sort:$sort,format:$format,seasonYear:$seasonYear,status:$status,isAdult:false){\n          id title{romaji english} averageScore coverImage{large} bannerImage startDate{year}\n          genres description(asHtml:false) format\n        } } }`;
    const v = { page: pageNum, perPage, sort, format: q.get("format") || undefined, seasonYear: q.get("seasonYear") || undefined, status: q.get("status") || undefined };
    const j = await anilist(QUERY, v);
    const p = j.data?.Page || {};
    return { success: true, page: pageNum, totalPages: Math.min(p.pageInfo?.lastPage || 1, 500), totalResults: p.pageInfo?.total || 0, results: (p.media || []).map(animeItem) };
  },

  /* ── NOT reimplemented: stream resolution ─────────────────────────────
   * The original /api/stream resolves a TMDB id to signed URLs on
   * third-party hosts that serve unauthorized copies of copyrighted films.
   * That extraction logic is deliberately not recreated here — it is the
   * one piece that turns a metadata browser into an infringement service.
   *
   * Playback still works if you point the frontend at the upstream instead:
   *     http://localhost:8080/?api=https://api.framextv.tech
   * Metadata/browse/search/anime above all run fully self-hosted with no
   * dependency on framextv.
   */
  "/api/stream": async () => ({ success: false, error: "stream resolution is not reimplemented in this backend (see server.mjs). Point the frontend at the upstream for playback, or supply your own licensed source." }),
  "/api/subtitles": async () => ({ success: false, error: "subtitle proxy is not reimplemented in this backend (see server.mjs)." }),
};

/* anime helpers */
function animeItem(m) {
  return { id: String(m.id), title: m.title?.english || m.title?.romaji || "", type: "anime", year: String(m.startDate?.year || ""), poster: m.coverImage?.large || "", backdrop: m.bannerImage || "", rating: m.averageScore ? (m.averageScore / 10).toFixed(1) : "", genres: m.genres || [], synopsis: (m.description || "").replace(/<[^>]+>/g, "").slice(0, 400), anilistId: String(m.id) };
}
function animePopular() { return anilist(`query($perPage:Int){Page(page:1,perPage:$perPage){pageInfo{total lastPage} media(type:ANIME,sort:POPULARITY_DESC,isAdult:false){id title{romaji english} averageScore coverImage{large} bannerImage startDate{year} genres description(asHtml:false)}}}`, { perPage: 20 }); }

/* ── http server ────────────────────────────────────────────────────── */
createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const cors = { "access-control-allow-origin": "*", "access-control-allow-methods": "GET,OPTIONS", "access-control-allow-headers": "content-type,accept" };
  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }

  const handler = routes[path];
  if (!handler) {
    res.writeHead(404, { ...cors, "content-type": "application/json" });
    return res.end(JSON.stringify({ status: "ok", name: "FrameX TV Clone Backend", version: "1.0.0", note: "unknown route", route: path }));
  }
  try {
    const body = await handler(url.searchParams);
    res.writeHead(200, { ...cors, "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(body));
  } catch (e) {
    res.writeHead(e.status || 500, { ...cors, "content-type": "application/json" });
    res.end(JSON.stringify({ success: false, error: e.message }));
  }
}).listen(PORT, () => {
  console.log(`\n  frameXTV clone backend  →  http://localhost:${PORT}`);
  console.log(`  TMDB key               →  ${TMDB_KEY ? "configured" : "MISSING (set TMDB_API_KEY)"}`);
  console.log(`  AniList                →  public GraphQL (no key)\n`);
  console.log(`  Point the frontend here:`);
  console.log(`      http://localhost:8080/?api=http://localhost:${PORT}\n`);
});
