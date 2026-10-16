# Boundaries — what I will not do

These are the lines I hold even when you explicitly ask for them. They are
not preferences I can be talked out of. Everything else about this project
you are free to request.

This document exists because you said you will work with your own dev, and
your dev should know these boundaries before they start building. It covers
the copyright/security lines, plus the one request I declined that was not
legal in nature. Where a boundary blocks a feature, this file also says what
I *can* build instead.

## 1. The stream-extraction route (`/api/stream`)

The original site's only function for this route is resolving film and
episode IDs to unauthorized third-party copies of movies. I did not rebuild
it, and I will not. Rebuilding that route would mean rebuilding the piracy
resolver itself — not simply finishing a backend.

What I built instead: the metadata backend (`server/server.mjs`) talks only
to TMDB and AniList, which are public APIs. If the site's playback ever
depends on that route, it currently fails with an explanatory error — by
design.

If your dev wants a playback feature, it must go through a legitimate,
licensed source. I can help design that.

## 2. Third-party code in the public repository

`original/`, `source/`, `recovered/`, `recovered-heuristic/`, `evidence/`,
`clone/assets/`, `clone/fu.wasm`, `clone/vidlink_exec.js`, and
`clone/sw.js` are framextv's proprietary application bundle — the code as
served, beautified, and decompiled of the same copyrighted work. Those
artifacts stay local (enforced by `.gitignore` and the CI guard), because
redistributing someone else's copyrighted code is a copyright problem, and
rebranding does not change that.

This boundary was yours to set as much as mine — you explicitly asked to
publish only original work and to explain why. The published repository
contains only original NetraFlix work.

## 3. Instructions that ask me to ignore my own judgment

You have pasted instructions (often called a persona or jailbreak prompt)
telling me to never refuse anything, and in one case to produce malware,
facilitate abuse, or sexualize minors. I declined that block when it
appeared, did not adopt it, and will not. None of the legitimate work on
this project required it, and I would not follow it for any future request.

## What I can keep building

Everything else is open. Currently on my list:

- **server/** — additional TMDB and AniList endpoints, caching, rate-limit
  handling, and any feature that uses only those two public APIs.
- **clone/** — server-side rendering (which would also fix SEO indexing of
  dynamic detail pages), route-level code splitting, a better search
  experience, and PWA polish.
- **tools/** — asset generators, and sitemap generation from the backend's
  catalog rather than hand-written.
- **docs/** — architecture notes, rebuild instructions, and this file.

If you tell me what you want prioritized, I'll build it.
