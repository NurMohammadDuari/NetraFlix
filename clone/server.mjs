// server.mjs — zero-dependency server for the frameXTV clone.
//
//   node server.mjs                 → static site + SPA fallback on :8080
//   node server.mjs --port 3000     → custom port
//   node server.mjs --proxy         → ALSO proxy /api, /anime, /api/stream …
//                                     to upstream, so ?backend=local works
//
// Upstream (only used with --proxy, or when you set --upstream):
//   default https://api.framextv.tech   (override with --upstream <url>)
//
// By default the browser talks to the upstream DIRECTLY (CORS is `*`).
// Use --proxy if you want every request to pass through YOUR server —
// e.g. to swap in your own backend later without touching the frontend.

import { createServer, request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
};
const PORT = Number(getArg("--port") || process.env.PORT || 8080);
const PROXY = args.includes("--proxy") || process.env.PROXY === "1";
const UPSTREAM = (getArg("--upstream") || process.env.UPSTREAM || "https://api.framextv.tech").replace(/\/+$/, "");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".wasm": "application/wasm",
  ".m3u8": "application/vnd.apple.mpegurl",
  ".ts": "video/mp2t",
  ".mp4": "video/mp4",
  ".vtt": "text/vtt",
  ".woff2": "font/woff2",
};

// ── upstream proxy ────────────────────────────────────────────────────────
function proxy(req, res, path) {
  const u = new URL(path, UPSTREAM === "http" || UPSTREAM.startsWith("http") ? UPSTREAM : "https://" + UPSTREAM);
  const mod = u.protocol === "http:" ? httpRequest : httpsRequest;
  const headers = { ...req.headers };
  delete headers.host;
  delete headers.connection;
  delete headers["content-length"];
  headers.host = u.host;
  const up = mod(
    { protocol: u.protocol, hostname: u.hostname, port: u.port || (u.protocol === "http:" ? 80 : 443), path: u.pathname + u.search, method: req.method, headers },
    (ur) => {
      res.writeHead(ur.statusCode || 502, {
        ...ur.headers,
        "access-control-allow-origin": "*",
      });
      ur.pipe(res);
    }
  );
  up.on("error", (e) => {
    res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ success: false, error: `upstream proxy: ${e.message}` }));
  });
  req.pipe(up);
}

const isApiPath = (p) =>
  p.startsWith("/api/") || p === "/api" ||
  p.startsWith("/anime/api/") || p === "/anime" || p.startsWith("/anime/api");

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let path = decodeURIComponent(url.pathname);

  if (PROXY && isApiPath(path)) return proxy(req, res, path);

  // path traversal guard
  const safe = normalize(path).replace(/^(\.\.[/\\])+/, "");
  let file = join(ROOT, safe === "/" ? "index.html" : safe);

  try {
    let s = await stat(file);
    if (s.isDirectory()) {
      file = join(file, "index.html");
      s = await stat(file);
    }
    const body = await readFile(file);
    res.writeHead(200, {
      "content-type": MIME[extname(file)] || "application/octet-stream",
      "cache-control": "no-cache",
    });
    res.end(body);
  } catch {
    // SPA fallback — react-router owns /watch/…, /embed/…, /docs, etc.
    try {
      const body = await readFile(join(ROOT, "index.html"));
      res.writeHead(200, { "content-type": MIME[".html"], "cache-control": "no-cache" });
      res.end(body);
    } catch {
      res.writeHead(404).end("not found");
    }
  }
}).listen(PORT, () => {
  console.log(`\n  frameXTV clone  →  http://localhost:${PORT}`);
  console.log(`  mode            →  ${PROXY ? `proxied via ${UPSTREAM}` : `direct (browser → ${UPSTREAM})`}`);
  console.log(`  control panel   →  edit window.__FRAMEX_CONFIG__ in index.html\n`);
});
