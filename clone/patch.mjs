// patch.mjs — applies the 3 control patches to the production-identical bundle.
// Run: node patch.mjs   (idempotent: asserts before/after, refuses double-apply)
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const P = (f) => fileURLToPath(new URL(f, import.meta.url));
const apply = (file, from, to, label) => {
  let s = readFileSync(P(file), "utf8");
  if (s.includes(to)) return console.log(`SKIP (already)  ${label}`);
  if (!s.includes(from)) throw new Error(`TARGET MISSING: ${label}`);
  writeFileSync(P(file), s.replace(from, to));
  console.log(`APPLIED         ${label}`);
};

/* ── 1. config: LO controls API base, site base, workers ────────────────── */
apply(
  "assets/config-NP0lLLKN.js",
  "var e=()=>{if(typeof window<`u`&&window.location){let e=typeof window.location.search==`string`?window.location.search:``,t=new URLSearchParams(e);if(t.get(`backend`)===`prod`)return`https://api.framextv.tech`;if(t.get(`backend`)===`local`)return``;if(window.location.hostname===`localhost`||window.location.hostname===`127.0.0.1`)return window.location.port===`4174`||window.location.port===`5174`?`https://api.framextv.tech`:``}return`https://api.framextv.tech`},",
  // ?api=<url> or window.__FRAMEX_CONFIG__.api wins; ?backend=local kept for proxy mode;
  // default = their prod API so the clone works from any host with zero setup.
  "var fx=()=>typeof window<`u`&&window.__FRAMEX_CONFIG__||{},e=()=>{if(typeof window<`u`&&window.location){let e=typeof window.location.search==`string`?window.location.search:``,t=new URLSearchParams(e);if(t.get(`backend`)===`local`)return``;if(t.get(`api`))return t.get(`api`).replace(/\\/+$/,``);if(fx().api)return String(fx().api).replace(/\\/+$/,``);if(t.get(`backend`)===`prod`)return`https://api.framextv.tech`}return`https://api.framextv.tech`},",
  "config: backend URL controllable (?api= / __FRAMEX_CONFIG__.api)"
);

apply(
  "assets/config-NP0lLLKN.js",
  "t=()=>{if(typeof window<`u`&&window.location){let e=typeof window.location.search==`string`?window.location.search:``,t=new URLSearchParams(e);if(t.get(`backend`)===`prod`)return`https://api.framextv.tech/anime`;if(t.get(`backend`)===`local`)return`/anime`;if(window.location.hostname===`localhost`||window.location.hostname===`127.0.0.1`)return window.location.port===`4174`||window.location.port===`5174`?`https://api.framextv.tech/anime`:`/anime`}return`${e()}/anime`},",
  "t=()=>{if(typeof window<`u`&&window.location){let t=new URLSearchParams(typeof window.location.search==`string`?window.location.search:``);if(t.get(`backend`)===`local`)return`/anime`}return`${e()}/anime`},",
  "config: anime API tracks the api base"
);

apply(
  "assets/config-NP0lLLKN.js",
  "n=()=>`https://framextv.xyz`,",
  "n=()=>(typeof window<`u`&&window.location&&/^https?:$/.test(window.location.protocol)?window.location.origin:``)||fx().site||`https://framextv.xyz`,",
  "config: site base = YOUR origin (embed snippets point at your clone)"
);

apply(
  "assets/config-NP0lLLKN.js",
  "o=`https://vidlink.hybrows.workers.dev`.replace(/\\/+$/,``),s=`https://spatula.hybrows.workers.dev`.replace(/\\/+$/,``),c=`https://zenith.hybrows.workers.dev`.replace(/\\/+$/,``);",
  "o=(fx().vidlink||`https://vidlink.hybrows.workers.dev`).replace(/\\/+$/,``),s=(fx().spatula||`https://spatula.hybrows.workers.dev`).replace(/\\/+$/,``),c=(fx().zenith||`https://zenith.hybrows.workers.dev`).replace(/\\/+$/,``);",
  "config: stream workers overridable"
);

/* ── 2. main bundle: ad gate permanently off = "premium/ad-free" ────────── */
apply(
  "assets/index-DvJNhmfl.js",
  "function fd(){if(typeof window>`u`)return!1;",
  "function fd(){return!1;if(typeof window>`u`)return!1;",
  "bundle: embed-ad gate forced OFF (no im.frshery.com script ever injects)"
);

apply(
  "assets/index-DvJNhmfl.js",
  "md=`//im.frshery.com/rkDi2CKbjnezt9wF/156020`",
  "md=``",
  "bundle: ad-network URL blanked (defense in depth)"
);

/* ── 3. index.html: strip original site's analytics, add control hook ───── */
{
  const f = P("index.html");
  let s = readFileSync(f, "utf8");
  const drop = [
    [/\s*<!-- Google tag \(gtag\.js\) -->[\s\S]*?<\/script>\s*<script>[\s\S]*?gtag\('config', 'G-C6Z04QLBBE'\);\s*<\/script>/, "GA"],
    [/\s*<!-- Cloudflare Web Analytics -->[\s\S]*?<\/script><!-- End Cloudflare Web Analytics -->/, "CF beacon"],
    [/\s*<link rel="canonical" href="https:\/\/framextv\.xyz" \/>/, "canonical"],
    [/\s*<meta property="og:url" content="https:\/\/framextv\.xyz" \/>/, "og:url"],
  ];
  for (const [re, label] of drop) {
    if (re.test(s)) { s = s.replace(re, ""); console.log(`APPLIED         index.html: removed ${label}`); }
  }
  const hook = `  <script>
    // ── YOUR CONTROL PANEL ──────────────────────────────────────────────
    // Everything below is optional. Edit, reload, done.
    window.__FRAMEX_CONFIG__ = {
      // name: "YourSiteName",        // overrides <title> + PWA identity
      // api:   "https://api.framextv.tech",  // or your own backend, or "" + npm start proxy
      // site:  "https://your.domain",        // defaults to this page's origin
      // vidlink / spatula / zenith: "https://..."  // stream worker overrides
    };
    if (window.__FRAMEX_CONFIG__.name) document.title = window.__FRAMEX_CONFIG__.name;
  </script>
  <script type="module" crossorigin src="/assets/index-DvJNhmfl.js">`;
  if (s.includes('window.__FRAMEX_CONFIG__')) console.log("SKIP (already)  index.html control hook");
  else if (s.includes('<script type="module" crossorigin src="/assets/index-DvJNhmfl.js">')) {
    s = s.replace('<script type="module" crossorigin src="/assets/index-DvJNhmfl.js">', hook);
    console.log("APPLIED         index.html: control hook inserted");
  } else throw new Error("TARGET MISSING: index.html module script");
  writeFileSync(f, s);
}
console.log("\nDone. Bundle is production-identical + 3 control patches.");
