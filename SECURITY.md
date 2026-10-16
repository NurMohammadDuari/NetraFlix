# Security Policy

## Reporting a vulnerability

If you find a security issue in **this project's original code** (the metadata
backend, the static server, the patch script), please report it privately:

- Open a **private security advisory** on this repo
  (Security → Report a vulnerability), or
- Open an issue titled `[SECURITY]` with no exploit details and ask for a
  private channel.

Please don't open a public issue with exploit details for something that could
affect other users.

## What's in scope

- `server/server.mjs` — the metadata backend (injection, SSRF via the proxy,
  path traversal in the static server, unsafe upstream handling).
- `clone/server.mjs` — the static server + optional proxy.
- `clone/patch.mjs` — the patch script.

## What's out of scope

- The excluded third-party bundle (framextv.xyz's code) — it isn't in this
  repo and isn't maintained here.
- Issues in the upstream metadata providers (TMDB, AniList) or any stream
  host. Those aren't this project.
- "This site streams copyrighted content" — that's a known, documented design
  boundary, not a vulnerability. See `NOTICE` and `README.md`.

## Supported versions

This is a single-branch project. The latest commit on `main` is the supported
version.
