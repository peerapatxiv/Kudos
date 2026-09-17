// One-off generator for placeholder PWA icons (solid brand-color square with
// a simple "C" mark). No image-processing deps — hand-builds a PNG.
import { deflateSync } from "node:zlib";
import { writeFileSync } from "node:fs";

function crc32(buf) {
  let c;
  const table = crc32.table ?? (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function buildPng(size, bgHex, markHex, maskable) {
  const [br, bgG, bb] = hexToRgb(bgHex);
  const [mr, mg, mb] = hexToRgb(markHex);
  const raw = Buffer.alloc(size * (1 + size * 4));
  const pad = maskable ? Math.round(size * 0.2) : Math.round(size * 0.14);
  const cx = size / 2;
  const cy = size / 2;
  // A simple rounded "bolt"/chevron-ish mark: two diagonal bars forming a "K"-like cockpit glyph.
  const barW = size * 0.13;

  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0; // filter byte
    for (let x = 0; x < size; x++) {
      const offset = y * (1 + size * 4) + 1 + x * 4;
      let r = br, g = bgG, b = bb, a = 255;

      const inSafe = x > pad && x < size - pad && y > pad && y < size - pad;
      if (inSafe) {
        const dx = x - cx;
        const dy = y - cy;
        // vertical stem
        const onStem = Math.abs(dx + size * 0.12) < barW * 0.5 && Math.abs(dy) < size * 0.26;
        // two diagonal legs forming a chevron
        const legLen = size * 0.28;
        const onLeg1 = Math.abs(dx - dy * 0.55 - size * 0.02) < barW * 0.55 && dy > -legLen * 0.15 && dy < legLen;
        const onLeg2 = Math.abs(dx + dy * 0.55 - size * 0.02) < barW * 0.55 && dy < legLen * 0.15 && dy > -legLen;
        if (onStem || onLeg1 || onLeg2) {
          r = mr; g = mg; b = mb;
        }
      }
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
      raw[offset + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const BG = "#e2472a";
const MARK = "#ffffff";

writeFileSync("public/icons/icon-192.png", buildPng(192, BG, MARK, false));
writeFileSync("public/icons/icon-512.png", buildPng(512, BG, MARK, false));
writeFileSync("public/icons/icon-maskable-512.png", buildPng(512, BG, MARK, true));
writeFileSync("public/icons/apple-touch-icon.png", buildPng(180, BG, MARK, false));

console.log("Generated placeholder icons in public/icons/");
