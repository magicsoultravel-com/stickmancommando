'use strict';
// Generates Stickman Commando favicon assets (favicon.ico / favicon.png /
// apple-touch-icon.png) — pure stdlib (fs + built-in zlib), no dependencies.
//
// Design: miniature/simplified "sage" model shooting, on a #58a6ff background —
// the exact color of the #hud h1 header text. Sage colors mirror js/characters.js
// (gold #e3b341, hat fill #c9a227 / outline #a88620).
//
// All geometry lives in a 256x256 unit grid, rendered at 4x supersampling per
// side for anti-aliasing, then downsampled to the requested sizes.
//
// Run: npm run favicon   (or: node scripts/make-favicon.js)

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const SS = 4; // supersample factor (SS*SS = 16 AA levels per output pixel)

const BG         = [0x58, 0xa6, 0xff]; // #hud h1 color
const GOLD       = [0xe3, 0xb3, 0x41];
const HAT        = [0xc9, 0xa2, 0x27];
const HAT_LINE   = [0xa8, 0x86, 0x20];
const FLASH      = [0xff, 0xe9, 0xa8];
const FLASH_CORE = [0xff, 0xff, 0xdf];

// ---- tiny 2D helpers (256x256 unit grid, +y is down) ----

function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  const qx = x1 + t * dx, qy = y1 + t * dy;
  const ex = px - qx, ey = py - qy;
  return Math.sqrt(ex * ex + ey * ey);
}

function insidePoly(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function insideRoundRect(px, py, corner) {
  if (px < 0 || px > 256 || py < 0 || py > 256) return false;
  if (corner <= 0) return true;
  const cx = Math.min(Math.max(px, corner), 256 - corner);
  const cy = Math.min(Math.max(py, corner), 256 - corner);
  const dx = px - cx, dy = py - cy;
  return dx * dx + dy * dy <= corner * corner;
}

function starPts(cx, cy, outer, inner) {
  const pts = [];
  for (let k = 0; k < 8; k++) {
    const ang = k * Math.PI / 4;
    const r = k % 2 === 0 ? outer : inner;
    pts.push([cx + r * Math.cos(ang), cy + r * Math.sin(ang)]);
  }
  return pts;
}

// ---- the sage model (miniature/simplified), shooting up-right ----

function sageShapes() {
  return [
    { kind: 'line', x1: 128, y1: 148, x2: 106, y2: 168, w: 8,  c: GOLD },         // back arm
    { kind: 'line', x1: 128, y1: 200, x2: 104, y2: 238, w: 9,  c: GOLD },         // left leg
    { kind: 'line', x1: 128, y1: 200, x2: 152, y2: 238, w: 9,  c: GOLD },         // right leg
    { kind: 'line', x1: 128, y1: 126, x2: 128, y2: 200, w: 11, c: GOLD },         // torso
    { kind: 'ring', cx: 128, cy: 130, r: 22, w: 11,              c: GOLD },       // head
    { kind: 'poly', pts: [[140, 38], [86, 108], [170, 108]],     c: HAT },        // tilted pointy hat
    { kind: 'polyline', pts: [[140, 38], [86, 108], [170, 108], [140, 38]], w: 5, c: HAT_LINE },
    { kind: 'line', x1: 128, y1: 150, x2: 178, y2: 138, w: 9,  c: GOLD },         // shooting arm
    { kind: 'line', x1: 178, y1: 138, x2: 170, y2: 154, w: 9,  c: GOLD },         // gun grip
    { kind: 'line', x1: 180, y1: 137, x2: 214, y2: 105, w: 9,  c: GOLD },         // gun barrel
    { kind: 'poly', pts: starPts(218, 104, 18, 6.5),              c: FLASH },      // muzzle flash
    { kind: 'circle', cx: 218, cy: 104, r: 6,                     c: FLASH_CORE }  // flash core
  ];
}

// ---- rasterizer ----

function render(size, corner) {
  const W = size * SS;
  const unit = 256.0 / W;
  const n = W * W;
  const R = new Float64Array(n), G = new Float64Array(n),
        B = new Float64Array(n), A = new Float64Array(n);
  const px = new Float64Array(W), py = new Float64Array(W);
  for (let i = 0; i < W; i++) { px[i] = i * unit; py[i] = i * unit; }

  const paint = (i, c) => { R[i] = c[0]; G[i] = c[1]; B[i] = c[2]; A[i] = 255; };

  // background
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      if (insideRoundRect(px[x], py[y], corner)) paint(y * W + x, BG);
    }
  }

  for (const s of sageShapes()) {
    const c = s.c;
    if (s.kind === 'circle') {
      const r2 = s.r * s.r;
      for (let y = 0; y < W; y++) {
        const dy = py[y] - s.cy;
        for (let x = 0; x < W; x++) {
          const dx = px[x] - s.cx;
          if (dx * dx + dy * dy <= r2) paint(y * W + x, c);
        }
      }
    } else if (s.kind === 'ring') {
      const half = s.w / 2;
      for (let y = 0; y < W; y++) {
        const dy = py[y] - s.cy;
        for (let x = 0; x < W; x++) {
          const dx = px[x] - s.cx;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (Math.abs(d - s.r) <= half) paint(y * W + x, c);
        }
      }
    } else if (s.kind === 'line') {
      const r = s.w / 2;
      for (let y = 0; y < W; y++) {
        for (let x = 0; x < W; x++) {
          if (segDist(px[x], py[y], s.x1, s.y1, s.x2, s.y2) <= r) paint(y * W + x, c);
        }
      }
    } else if (s.kind === 'poly') {
      for (let y = 0; y < W; y++) {
        for (let x = 0; x < W; x++) {
          if (insidePoly(px[x], py[y], s.pts)) paint(y * W + x, c);
        }
      }
    } else if (s.kind === 'polyline') {
      const r = s.w / 2;
      for (let y = 0; y < W; y++) {
        for (let x = 0; x < W; x++) {
          let hit = false;
          for (let j = 0; j < s.pts.length - 1 && !hit; j++) {
            if (segDist(px[x], py[y], s.pts[j][0], s.pts[j][1],
                        s.pts[j + 1][0], s.pts[j + 1][1]) <= r) hit = true;
          }
          if (hit) paint(y * W + x, c);
        }
      }
    }
  }

  // downsample SSxSS block -> one output pixel
  const out = Buffer.alloc(size * size * 4);
  let o = 0;
  const div = SS * SS;
  for (let oy = 0; oy < size; oy++) {
    for (let ox = 0; ox < size; ox++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const i = (oy * SS + sy) * W + (ox * SS + sx);
          r += R[i]; g += G[i]; b += B[i]; a += A[i];
        }
      }
      out[o++] = Math.round(r / div);
      out[o++] = Math.round(g / div);
      out[o++] = Math.round(b / div);
      out[o++] = Math.round(a / div);
    }
  }
  return out;
}

// ---- PNG encoder (RGBA, 8-bit) ----

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >> 1) : c >> 1;
    t[n] = c;
  }
  return t;
})();

function u32(x) { return x < 0 ? x + 4294967296 : x; }

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = u32((c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff]);
  }
  return u32(c ^ 0xffffffff);
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(u32(crc32(Buffer.concat([t, data]))), 0);
  return Buffer.concat([len, t, data, crc]);
}

function pngEncode(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  const stride = size * 4;
  const raw = Buffer.alloc(size * (stride + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    Buffer.from(rgba).copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// ---- ICO encoder (BMP entries for small sizes + one embedded PNG @256) ----

function icoBmpData(size, rgba) {
  const bgra = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dst = ((size - 1 - y) * size + x) * 4; // bottom-up rows
      bgra[dst]     = rgba[i + 2];
      bgra[dst + 1] = rgba[i + 1];
      bgra[dst + 2] = rgba[i];
      bgra[dst + 3] = rgba[i + 3];
    }
  }
  const andStride = ((size + 31) / 32) * 4 * size;
  const andData = Buffer.alloc(andStride); // all zero = fully opaque
  const hdr = Buffer.alloc(40);
  hdr.writeUInt32LE(40, 0);
  hdr.writeInt32LE(size, 4);
  hdr.writeInt32LE(size * 2, 8);           // height doubled (XOR + AND)
  hdr.writeUInt16LE(1, 12);                // planes
  hdr.writeUInt16LE(32, 14);               // bpp
  hdr.writeUInt32LE(0, 16);                // no compression
  hdr.writeUInt32LE(size * size * 4, 20);
  hdr.writeUInt32LE(0, 24);
  hdr.writeUInt32LE(0, 28);
  hdr.writeUInt32LE(0, 32);
  hdr.writeUInt32LE(0, 36);
  return Buffer.concat([hdr, bgra, andData]);
}

function buildIco(png256, bmps) {
  const entries = [];
  for (const size of [16, 24, 32, 48, 64]) entries.push({ size, data: bmps[size], png: false });
  entries.push({ size: 256, data: png256, png: true });

  const count = entries.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(count, 4);

  const bufs = [header];
  let offset = 6 + 16 * count;
  for (const e of entries) {
    const d = Buffer.alloc(16);
    d[0] = e.size === 256 ? 0 : e.size;
    d[1] = e.size === 256 ? 0 : e.size;
    d[2] = 0; d[3] = 0;
    d.writeUInt16LE(1, 4);                       // planes
    d.writeUInt16LE(e.png ? 0 : 32, 6);          // bit count (0 => embedded PNG)
    d.writeUInt32LE(e.data.length, 8);
    d.writeUInt32LE(offset, 12);
    bufs.push(d);
    offset += e.data.length;
  }
  for (const e of entries) bufs.push(e.data);
  return Buffer.concat(bufs);
}

// ---- terminal ASCII preview for eyeballing ----

function asciiPreview(size) {
  const rgba = render(size, 56);
  const ramp = ' .:-=+*#%@';
  let out = '';
  for (let y = 0; y < size; y++) {
    let row = '';
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const lum = 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2];
      row += ramp[Math.min(ramp.length - 1, Math.floor(lum / 256 * ramp.length))];
    }
    out += row + '\n';
  }
  return out;
}

// ---- main ----

function main() {
  const png256 = pngEncode(256, render(256, 56));      // favicon.png (rounded)
  const bmps = {};
  for (const s of [16, 24, 32, 48, 64]) bmps[s] = icoBmpData(s, render(s, 56));

  const ico = buildIco(png256, bmps);
  fs.writeFileSync(path.join(ROOT, 'favicon.ico'), ico);
  fs.writeFileSync(path.join(ROOT, 'favicon.png'), png256);
  fs.writeFileSync(path.join(ROOT, 'apple-touch-icon.png'), pngEncode(180, render(180, 0))); // full-bleed square

  console.log('wrote favicon.ico (' + ico.length + ' B, sizes 16/24/32/48/64 BMP + 256 PNG)');
  console.log('wrote favicon.png (256x256, rounded #58a6ff bg)');
  console.log('wrote apple-touch-icon.png (180x180, full-bleed)');
  console.log();
  console.log('32px preview:');
  console.log(asciiPreview(32));
}

if (require.main === module) main();

module.exports = { render, sageShapes, starPts };