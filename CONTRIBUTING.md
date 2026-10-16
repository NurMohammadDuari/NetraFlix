# Contributing to NetraFlix

Thanks for wanting to help. This project has one hard rule that everything
else depends on.

## The rule: original work only

**Do not commit any third-party proprietary code.** Specifically, these must
never be added to the repo:

- `original/`, `source/`, `recovered/`, `recovered-heuristic/`, `evidence/`
- `clone/assets/`
- `clone/fu.wasm`, `clone/vidlink_exec.js`, `clone/sw.js`,
  `clone/icon-192.png`, `clone/icon-512.png`

They're already in `.gitignore`. If you find yourself wanting to add any of
them, don't — open an issue and we'll figure out an original-work path instead.
See `NOTICE` for the reasoning.

## What we do accept

- **`server/`** — improvements to the metadata backend (TMDB/AniList mapping,
  caching, new endpoints, error handling).
- **`clone/patch.mjs`** — new or better control patches.
- **`clone/server.mjs`** — static-serving, SPA-fallback, and proxy improvements.
- **`analysis/`** — corrections or additions to the API map, routes, findings.
- **Docs** — README, templates, CI.

## How to contribute

1. Fork the repo and create a branch: `git checkout -b feature/my-thing`
2. Make your change. Keep it focused — one idea per PR.
3. Test locally:
   ```bash
   node --check server/server.mjs
   node --check clone/server.mjs
   node --check clone/patch.mjs
   ```
   CI runs these checks plus JSON validation.
4. Open a pull request with a clear description of *what* changed and *why*.

## Style

- Node ≥ 18, zero runtime dependencies where possible.
- Comment the non-obvious parts, not the obvious ones.
- Keep the MIT license header scope intact — don't relicense third-party code.

## Reporting bugs

Use the bug report template. Include what you ran, what you expected, what
happened, and your Node version. If it's a stream/playback issue, note whether
you're on the upstream API or your own backend.
