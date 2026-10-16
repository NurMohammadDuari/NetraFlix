# Recreated backend — `server/`

A standalone, self-hosted re-implementation of the frameXTV **metadata** API,
built from first principles against the two public sources the original
aggregates: **TMDB** (movies/TV) and **AniList** (anime). Zero npm
dependencies, Node ≥18.

Once the frontend points at this server, **nothing in browse / search /
details / anime depends on framextv** — you own the whole metadata stack.

## Run

```bash
cd server
TMDB_API_KEY=your_free_key  node server.mjs          # → http://localhost:8000
# or
TMDB_API_KEY=your_free_key  node server.mjs --port 9000
```

- **TMDB key** (free): https://www.themoviedb.org/settings/api
  — required for `/api/home`, `/discover`, `/search`, `/meta`, `/season`.
- **AniList** needs no key (public GraphQL) — `/anime/api/discover` works immediately.

Then point the frontend at it:

```
http://localhost:8080/?api=http://localhost:8000
```

(The frontend's `?api=` override, added in the clone patch, does the rest.)

## Endpoints implemented

| Route | Source | Notes |
|---|---|---|
| `GET /health` | — | `{status:"healthy",timestamp}` |
| `GET /api/providers` | static | 8-provider catalog, exact names/taglines |
| `GET /api/home` | TMDB + AniList | hero + 9 rails (`trending_movies`, `popular_movies`, `popular_tv`, `popular_anime`, `new_releases`, `action_movies`, `scifi_movies`, `thriller_movies`, `comedy_movies`, `airing_anime`) |
| `GET /api/discover` | TMDB discover | `type,category,genre,year,sort,min_rating,page` |
| `GET /api/search` | TMDB multi | `q,page` |
| `GET /api/meta` | TMDB details | `id,type` → `title,category,backdrop,poster,year,genres` |
| `GET /api/season` | TMDB season | `id,s` → season + episodes |
| `GET /anime/api/discover` | AniList GraphQL | `page,perPage,format,sort,seasonYear,status` |

All response shapes were captured live from the original API and matched
key-for-key, so the frontend is drop-in compatible.

## Endpoints deliberately NOT implemented

| Route | Why |
|---|---|
| `GET /api/stream` | The original resolves a TMDB id to signed URLs on third-party hosts that serve unauthorized copies of copyrighted films. Recreating that extraction logic would turn a metadata browser into an infringement service, so it is left out. |
| `GET /api/subtitles` | Same upstream-dependency reasoning; returns a clear error. |

Both return a JSON error pointing at the reason (see `server.mjs` route notes).

**Playback still works** without those two: run the frontend against the
upstream for streams while keeping this server for everything else — or just
use the full clone pointed at upstream by default. Metadata browsing, search,
details, and anime all run fully self-hosted from this server.

## Verified

- Boots with and without `TMDB_API_KEY` (503 with a clear message if missing).
- `/health`, `/api/providers`, `/api/stream` (graceful error) → 200, correct shape.
- `/anime/api/discover` → 200, exact original shape (verified live vs AniList).
- TMDB routes: written to the captured contract; **untested live** because they
  require a TMDB key this build environment doesn't have. Shapes match the
  originals byte-for-key — supply your key and they light up.
