# Findings: premium / auth / ads investigation

**Bottom line: frameXTV has no premium, pro, subscription, account, or paywall
system of any kind.** The only gate-like mechanism in the entire codebase is an
embed ad gate, which the clone disables permanently.

## Search methodology

Searches run across all 47 beautified sources in `source/`, the raw
`original/` bytes, `original/index.css`, `sw.js`, and `index.html`.

### Terms with zero hits

```
premium            0
subscription       0
subscribed         0
stripe             0
lemonsqueezy       0
paddle             0
paypal             0
billing            0
checkout           0
paywall            0
plan_ / price_     0
is_pro / isPro()   0 (see false positives below)
tier / upgrade     0
auth / login       0  (no auth chunk, no auth headers, no tokens)
/api/auth /user    0  (route returns generic status JSON)
JWT / oauth        0
```

### False positives (not paywalls)

| Match | Real meaning |
|---|---|
| `isPro` (3 hits) | React internals: `isPropagationStopped`, `isDefaultPrevented` |
| `unlock` (7 hits) | `screen.orientation.unlock()` — fullscreen orientation |
| `restricted` (3, Player) | HLS.js `restrictedLevels` (level capping) + HDCP `output-restricted` |
| `quota` (2, sw.js + Player) | service-worker cache trimming; MediaSource internals |
| `blocked` (1) | unrelated string |

### Feature-flag audit

`featureFlag`, `flagEnabled`, `isGated`, `gated`, `entitled`, `requiresPro`,
`hasPro`, `adFree` → **all zero**. There is no flag system to flip because
nothing was ever closed.

## The one real gate: embed ad injection

`fd()` in the main bundle (`source/index-DvJNhmfl.js` ≈ line 19611, raw form
`function fd(){if(typeof window>\`u\`)return!1;…`):

```js
function fd(){
  if (typeof window > `u`) return !1;
  const e = new URLSearchParams(window.location.search);
  if (e.get(`test_ads`) === `1` || e.get(`preview_ads`) === `1`) return !0;
  if (e.get(`no_ads`) === `1`) return !1;
  if (window.self === window.top) return !1;                    // top-level → never
  // only when iframed on a host that is NOT framextv.* or localhost:
  const t = document.referrer ? new URL(document.referrer).hostname : "";
  if (isFramextvOrigin || isLocalhost) return !1;
  return !0;                                                    // → inject ad script
}
```

Effects of `fd() === true`:

- `_d()` hook sets `isExternal: true` → router switches to full page navigation
  on link clicks (`location.href = …` instead of SPA push).
- `hd()` injects `<script src="//im.frshery.com/rkDi2CKbjnezt9wF/156020">`
  (id `framex_embed_ad_script`); `gd()` removes it on unmount.

So ads appear **only** when someone else's site iframes frameXTV's embed pages.
On the real site's own domain, top-level visits already show no ads — the
original supports `?no_ads=1` as a documented switch for exactly this.

### Clone patch (patches 5 + 6)

```js
function fd(){ return !1; … }   // unreachable original body retained for auditability
md = ``                          // ad-network URL blanked
```

Verified in the running clone: `document.getElementById('framex_embed_ad_script')`
is `null`, and no `im.frshery.com` request ever occurs — with or without
`?test_ads=1`.

## What "all premium activated" concretely meant for this build

Since no paid tier exists, the deliverable is:

1. **Ads:** permanently off (patch 5 + 6) — equivalent to always `?no_ads=1`.
2. **Providers:** all 8 already `available`, nothing to unlock; Player exposes
   every one of them via the top-right server menu.
3. **Routes/features:** history, my-list, theater mode, autoplay preference,
   embed configurator, API docs, watch progress — all localStorage-driven and
   open to every visitor by design.
4. **Original site's telemetry removed:** Google Analytics `G-C6Z04QLBBE` and
   Cloudflare beacon token `70b05d6e0c524495af9b0bce7c335515` no longer load,
   so the clone does not report to the original operator.

## Auth surface

The frontend sends **no** `Authorization`, `Cookie`, `X-Api-Key`, or token in
any fetch. The backend accepts anonymous GETs from any origin. There is
consequently nothing to bypass — and nothing on the backend that could be
"activated" client-side.

## Verification transcript (running clone)

| Check | Result |
|---|---|
| `document.title` | `frameXTV` |
| `#root` children | 1 (app mounted) |
| `document.images` | 173 loaded |
| console errors | **0** |
| `script[src*=googletagmanager]` | absent |
| `script[src*=cloudflareinsights]` | absent |
| `#framex_embed_ad_script` | absent |
| `/watch/550` video | `readyState 4`, `currentTime 58s`, "0:57 / 2:19:08" |
| `/docs?api=…` | control hook `window.__FRAMEX_CONFIG__` = object |
| local server responses | all `200` (the one `500` came from an external extractor host) |
