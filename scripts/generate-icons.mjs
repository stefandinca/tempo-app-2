#!/usr/bin/env node
/**
 * Generates the raster app icons from one definition.
 *
 *   node scripts/generate-icons.mjs
 *
 * Why this exists: the icons used to be SVG only, and the Notification API
 * does NOT render SVG. Chrome silently substituted a blank image, which is why
 * every push notification showed a white square. Notification icons must be
 * raster. The PWA manifest wants raster too — SVG manifest icons are unevenly
 * supported and are not a safe basis for the install prompt.
 *
 * No image library is used on purpose. The mark is a solid square with a white
 * "T", and a T is two rectangles, so it can be drawn into a pixel buffer and
 * encoded as PNG with nothing but the built-in zlib. That avoids adding a
 * native-binary dependency (sharp/canvas) to a project that needs it for
 * exactly one shape, and it keeps the icons reproducible on any machine.
 *
 * Text is deliberately not used: rendering a font would depend on whichever
 * fonts happen to exist where the script runs, and Arial is not guaranteed.
 * The drawn T matches the proportions of the old SVG closely enough to be the
 * same mark, and is crisper at small sizes.
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "icons");

const BRAND = [0x4a, 0x90, 0xe2]; // #4A90E2 — same blue as the old SVG and the manifest theme

// ---------------------------------------------------------------------------
// PNG encoding
// ---------------------------------------------------------------------------
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
  let c = ~0;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** rgba: Buffer of size w*h*4 */
function encodePng(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // Each scanline is prefixed with its filter type. 0 (None) keeps this simple
  // and compresses fine for flat colour.
  const raw = Buffer.alloc(h * (1 + w * 4));
  for (let y = 0; y < h; y++) {
    raw[y * (1 + w * 4)] = 0;
    rgba.copy(raw, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// The mark
// ---------------------------------------------------------------------------
/**
 * @param size    edge length in px
 * @param opts.bg background colour, or null for transparent (badge)
 */
function drawT(size, { bg }) {
  const px = Buffer.alloc(size * size * 4); // zero-filled => transparent
  const set = (x, y, [r, g, b], a = 255) => {
    const i = (y * size + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
  };

  if (bg) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) set(x, y, bg);

  // Proportions chosen to sit inside the maskable safe zone (the middle 80%),
  // so a circular or squircle mask never clips the mark.
  const barX0 = Math.round(size * 0.26), barX1 = Math.round(size * 0.74);
  const barY0 = Math.round(size * 0.28), barY1 = Math.round(size * 0.40);
  const stemX0 = Math.round(size * 0.435), stemX1 = Math.round(size * 0.565);
  const stemY1 = Math.round(size * 0.72);

  const WHITE = [0xff, 0xff, 0xff];
  for (let y = barY0; y < barY1; y++) for (let x = barX0; x < barX1; x++) set(x, y, WHITE);
  for (let y = barY1; y < stemY1; y++) for (let x = stemX0; x < stemX1; x++) set(x, y, WHITE);

  return px;
}

// ---------------------------------------------------------------------------
mkdirSync(OUT, { recursive: true });

const targets = [
  // The notification icon and the manifest icons: brand square, white mark.
  { file: "icon-192.png", size: 192, bg: BRAND },
  { file: "icon-512.png", size: 512, bg: BRAND },
  { file: "apple-touch-icon.png", size: 180, bg: BRAND },
  // The badge is the small monochrome glyph Android draws in the status bar.
  // It must be white on TRANSPARENT: the platform tints it, and a coloured
  // background here renders as a solid blob.
  { file: "badge-96.png", size: 96, bg: null },
];

for (const { file, size, bg } of targets) {
  const png = encodePng(size, size, drawT(size, { bg }));
  writeFileSync(join(OUT, file), png);
  console.log(`  ${file.padEnd(22)} ${size}x${size}  ${String(png.length).padStart(6)} bytes${bg ? "" : "  (transparent, for tinting)"}`);
}
console.log("");
