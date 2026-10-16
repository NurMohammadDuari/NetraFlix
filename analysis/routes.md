# Frontend routes (react-router)

All client-side routes recovered from the main bundle. The server
(`clone/server.mjs`) falls back to `index.html` for any extensionless path so
deep links work on refresh.

## Main pages

| Route | Page chunk | Notes |
|---|---|---|
| `/` | `HomePage-BAMm4eiZ.js` | hero + rails |
| `/movies` | `MoviesPage-Cvu5o8qj.js` | `?type=movie` discovery |
| `/tv` | `TVPage-Bt9gkPaN.js` | `?type=tv` discovery |
| `/anime` | `AnimePage-BimEfxXd.js` | AniList grid |
| `/search` | `SearchPage-D_XN9LMB.js` | `?q=` |
| `/history` | `HistoryPage-Bjb5T0ZU.js` | localStorage |
| `/my-list` | — | `framextv_my_list_v1` localStorage key |
| `/docs` | `DocsPage-NTSX4L3O.js` | API + embed documentation |
| `/configurator` | `Dashboard-C0ilqFsY.js` | embed configurator |
| `/api` | — | API info page |
| `/404` | — | not found |

## Detail pages

| Route | Chunk |
|---|---|
| `/movie/:id` | TMDB movie details |
| `/tv/:id` | TMDB tv details |
| `/watch/:tmdbId` | `WatchPage-Ct_I5hhW.js` — player + metadata |
| `/watch/:tmdbId/:s/:e` | episode-aware watch route (tested: `/watch/550` → 200) |

## Embed / player (used inside iframes)

| Route | Chunk |
|---|---|
| `/embed/:id` | `EmbedPage-Bo5r1zZB.js` (tested live: `/embed/550?autoplay=1&origin=internal`) |
| `/embed/:id/:s/:e` | episode embed |
| `/anime/embed/*` | `AnimeEmbedPage-nWANog0P.js` |

Watch pages nest the embed as a same-origin iframe:

```html
<iframe src="/embed/550?autoplay=1&origin=internal"></iframe>
```

## Query parameters honoured by the router / config

| Param | Effect |
|---|---|
| `?backend=prod\|local` | original backend switch (kept in clone) |
| `?api=<url>` | **clone addition** — point at any backend |
| `?no_ads=1` | documented ad-off switch (superseded: clone hard-disables ads) |
| `?test_ads=1` / `?preview_ads=1` | force ads on for testing (defeated by clone patch) |
| `?server=<provider>` | pre-select stream provider (documented) |
| `?embed=1` | embed mode |

## Service worker (`sw.js`, cache `framextv-shell-v2`)

- **Navigations:** network-first with cache fallback → edits show up immediately.
- **Hard bypass (never cached):** `/api/*`, `/anime/api/*`, paths containing
  `/stream`, `/proxy`, `/subtitles`, `*.m3u8|ts|m4s|mp4|webm|mkv|vtt|srt`,
  and `themoviedb.org` / `anilist.co` / `strem.io` / `stream` / `vidsonic`
  / `vidsrc` hostnames.
- **Cache-first:** TMDB + AniList poster images (`image.tmdb.org`,
  `s4.anilist.co`, `anilistcdn`) with cache trimming.

If you ever see a stale shell while developing, run in the console:

```js
navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()))
```
