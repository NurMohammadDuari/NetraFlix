#!/usr/bin/env node
// tools/make-icons.mjs — generates ORIGINAL NetraFlix raster assets.
// Pure Node (zlib built-in), no dependencies. Reproducible branding.
//
//   node tools/make-icons.mjs
//
// Emits:
//   clone/icon-192.png   (192×192)   PWA icon
//   clone/icon-512.png   (512×512)   PWA icon (maskable)
//   clone/og-image.png   (1200×630)  Open Graph / Twitter card image
//
// These are drawn from scratch (dark rounded tile + NetraFlix "N" mark) so the
// repo ships working images without redistributing the original site's icons.

import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLONE = join(HERE, "..", "clone");

/* ── NetraFlix "N" mark, defined in a 512-unit viewBox ────────────────── */
// Same silhouette as favicon.svg. Closed polygon, filled.
const N_PATH = [
  [150, 372], [150, 140], [200, 140], [312, 296], [312, 140],
  [362, 140], [362, 372], [312, 372], [200, 216], [200, 372],
];

/* ── minimal PNG encoder (RGBA, 8-bit) ─────────────────────────────────── */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const typ = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([typ, data])));
  return Buffer.concat([len, typ, data, crc]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter: None
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

/* ── rasterizer (supersampled for clean edges) ────────────────────────── */
const BG = [9, 9, 11];        // #09090b
const FG = [255, 255, 255];   // white "N"
const SS = 4;                 // supersample factor

function inPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
// rounded-rect SDF (<0 inside) for the tile background + border ring
function roundRectSD(x, y, w, h, r) {
  const cx = Math.max(r - x, x - (w - 1 - r));
  const cy = Math.max(r - y, y - (h - 1 - r));
  return Math.hypot(Math.max(cx, 0), Math.max(cy, 0)) - r;
}

function render(size, drawTile) {
  const W = size, H = size;
  const out = Buffer.alloc(W * H * 4);
  const pad = 40; // viewBox → canvas padding (512 space)
  const scale = (size - pad * 2 * (size / 512)) / 512;
  const off = (size - 512 * scale) / 2;
  const toCanvas = (poly) => poly.map(([x, y]) => [x * scale + off, y * scale + off]);
  const nPoly = toCanvas(N_PATH);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const px = x + (sx + 0.5) / SS, py = y + (sy + 0.5) / SS;
          if (drawTile) {
            const sd = roundRectSD(px, py, W, H, size * 0.215);
            if (sd > 0) { continue; } // transparent outside tile
          }
          const isN = inPoly(px, py, nPoly);
          const c = isN ? FG : BG;
          r += c[0]; g += c[1]; b += c[2]; a += 255;
        }
      }
      const n = SS * SS;
      const o = (y * W + x) * 4;
      out[o] = a ? Math.round(r / (a / 255)) : 0;
      out[o + 1] = a ? Math.round(g / (a / 255)) : 0;
      out[o + 2] = a ? Math.round(b / (a / 255)) : 0;
      out[o + 3] = Math.round((a / 255 / n) * 255);
    }
  }
  return out;
}

/* ── generate ─────────────────────────────────────────────────────────── */
const jobs = [
  ["icon-192.png", 192, true],
  ["icon-512.png", 512, true],
  ["og-image.png", 1200, false], // handled specially below (wide)
];

// square icons (transparent-corner tiles)
for (const [name, size, tile] of jobs.slice(0, 2)) {
  const rgba = render(size, tile);
  writeFileSync(join(CLONE, name), encodePNG(size, size, rgba));
  console.log(`  wrote clone/${name} (${size}×${size})`);
}

// OG image: 1200×630, full-bleed dark + centered N (no transparent corners)
{
  const W = 1200, H = 630, SS2 = 3;
  const out = Buffer.alloc(W * H * 4);
  const nSize = 460;                 // render N box
  const scale = nSize / 512;
  const offX = (W - 512 * scale) / 2, offY = (H - 512 * scale) / 2;
  const nPoly = N_PATH.map(([x, y]) => [x * scale + offX, y * scale + offY]);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let r = 0, g = 0, bl = 0, n = 0;
      for (let sy = 0; sy < SS2; sy++) for (let sx = 0; sx < SS2; sx++) {
        const px = x + (sx + 0.5) / SS2, py = y + (sy + 0.5) / SS2;
        const c = inPoly(px, py, nPoly) ? FG : BG;
        r += c[0]; g += c[1]; bl += c[2]; n++;
      }
      const o = (y * W + x) * 4;
      out[o] = Math.round(r / n); out[o + 1] = Math.round(g / n); out[o + 2] = Math.round(bl / n); out[o + 3] = 255;
    }
  }
  writeFileSync(join(CLONE, "og-image.png"), encodePNG(W, H, out));
  console.log(`  wrote clone/og-image.png (${W}×${H})`);
}
console.log("done.");
