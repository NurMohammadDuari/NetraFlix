# Backend API map — `https://api.framextv.tech`

All endpoints below were probed live during inspection. The Go backend
identifies itself as `{"status":"ok","name":"FrameX TV Go Backend","version":"1.0.0"}`.

## CORS / transport

| Check | Result |
|---|---|
| Preflight `OPTIONS` | `204` |
| `access-control-allow-origin` | `*` (both preflight and actual) |
| Auth headers / cookies / API keys | **none** — no request in the frontend carries credentials |
| HTTPS | yes, Cloudflare-proxied (HTTP/2) |

Because CORS is `*`, the clone can talk to the API directly from any origin —
no proxy strictly required (see `clone/server.mjs --proxy` for when you want one).

## Core metadata endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | liveness |
| GET | `/api/home` | home page rails (trending, popular, …) |
| GET | `/api/discover?type=movie\|tv&…` | filtered discovery grid (`page`, `sort`, `genre`, `year`, …) |
| GET | `/api/search?q=<query>` | unified movie/TV search |
| GET | `/api/meta?id=<tmdbId>&type=movie\|tv` | full details (title, overview, seasons, artwork) |
| GET | `/api/season?id=<tvId>&s=<n>` | season/episode listing |
| GET | `/api/providers` | stream provider registry (see below) |
| GET | `/api/stream?id=<tmdbId>&type=movie\|tv[&s=&e=]` | resolves playable HLS sources |
| GET | `/api/subtitles?id=<tmdbId>&type=…[&s=&e=]` | subtitle tracks |
| GET | `/api/subtitles/proxy?url=<encoded>` | CORS proxy for subtitle files |
| GET | `/anime/api/discover?…` | anime grid (AniList-backed) |

Unknown paths return the generic status JSON (`200`), e.g. `/api/anime/search`
on this host → status JSON, not an anime payload. That is expected: the frontend
requests `${window.location.origin}/api/anime/search` and, when the response is
not `{success:true, results:[...]}`, falls back to **AniList GraphQL directly**.
Falling through is the designed behaviour, not an error.

## Stream providers (`GET /api/providers`)

All 8 return `status: "available"` with no credentials:

| key | tier hint observed in bundle |
|---|---|
| `miner` | — (4K hint for some URL patterns) |
| `headhunter` | — |
| `valkyrie` | 4K |
| `hog_rider` | — |
| `lavahound` | — |
| `super_barbarian` | 4K |
| `bowler` | — |
| `titan` | — |

`/api/providers?type=movie|tv` filters by media type. The Player's server menu is
driven entirely by this list — nothing is ever hidden behind a flag.

Verified live during testing:

```
GET /api/providers            → 8 providers, all "available"
GET /api/stream?id=550&type=movie → real HLS sources (Fight Club resolves & plays)
GET /anime/api/discover       → 200 with AniList results
GET /health                   → 200
```

## Third-party hosts referenced by the frontend

| Host | Purpose | CORS |
|---|---|---|
| `vidlink.hybrows.workers.dev` | stream worker (config `a`) | `*` |
| `spatula.hybrows.workers.dev` | stream worker (config `i`) | `*` |
| `zenith.hybrows.workers.dev` | stream worker (config `o`) | `*` |
| `api.wecollege.net/seed?mediaId=` | seed helper | `*` |
| `api.wing.st` | extraction (`/dallas/sources…`) | `*` |
| `enc-dec.app` | decrypt helper (`/dec-cinejoy`, `/enc-cinejoy`, `/g`) | — |
| `cinejoy.pk` | provider host | — |
| `www.movy.bz`, `player.videasy.to` | subtitle proxy base per provider | — |
| `yifysubtitles.ch`, `opensubtitles.org` | subtitle sources | — |
| `image.tmdb.org` | artwork (SW-cached) | — |
| `graphql.anilist.co` | anime search/details fallback | — |
| `im.frshery.com` | **ad script — embed-only, disabled in clone** | — |

Note: during testing one upstream extractor (`…e.net/dallas/sources`) returned
`500` and a 12s safety timeout fired. This is third-party scraper flakiness on
their side; the Player's fallback pipeline retries the remaining providers
automatically. Our own server returned only `200`s.

## Config export surface (`config-NP0lLLKN.js`)

```js
export { o as a, s as i, r as n, c as o, a as r, i as t }
// a = vidlink worker      n = API base (cleaned)
// i = spatula worker      o = zenith worker
// r = site base           t = anime base (API base + "/anime")
```

Original resolution order for the API base:

1. `?backend=prod` → `https://api.framextv.tech`
2. `?backend=local` → `""` (same-origin relative, i.e. dev proxy)
3. `localhost`/`127.0.0.1` on port `4174`/`5174` → prod; any other local port → `""`
4. default → prod

The clone rewrites this to: `?backend=local` → `""` · `?api=<url>` → that URL ·
`window.__FRAMEX_CONFIG__.api` → that URL · else prod. Site base now defaults to
`window.location.origin` so embeds and docs reference *your* host.
