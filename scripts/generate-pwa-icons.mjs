// 임시 PWA 아이콘 생성기. 단색 배경 + "SMM" 이니셜 PNG를 public/icons에 저장한다.
// 향후 실제 브랜드 아이콘으로 교체할 것.
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

const BG = [0x4f, 0x46, 0xe5, 0xff]; // #4f46e5 (theme primary)
const FG = [0xff, 0xff, 0xff, 0xff];

const FONT = {
  S: [
    "01110",
    "10001",
    "10000",
    "01110",
    "00001",
    "10001",
    "01110",
  ],
  M: [
    "10001",
    "11011",
    "10101",
    "10001",
    "10001",
    "10001",
    "10001",
  ],
};

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, pixels) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function drawChar(pixels, width, ch, x, y, scale, color) {
  const glyph = FONT[ch];
  if (!glyph) throw new Error(`Unsupported glyph: ${ch}`);
  for (let ry = 0; ry < 7; ry++) {
    for (let rx = 0; rx < 5; rx++) {
      if (glyph[ry][rx] !== "1") continue;
      for (let sy = 0; sy < scale; sy++) {
        for (let sx = 0; sx < scale; sx++) {
          const px = x + rx * scale + sx;
          const py = y + ry * scale + sy;
          const i = (py * width + px) * 4;
          pixels[i] = color[0];
          pixels[i + 1] = color[1];
          pixels[i + 2] = color[2];
          pixels[i + 3] = color[3];
        }
      }
    }
  }
}

function buildIcon(size, { safeZoneRatio = 0.7 } = {}) {
  const pixels = Buffer.alloc(size * size * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = BG[0];
    pixels[i + 1] = BG[1];
    pixels[i + 2] = BG[2];
    pixels[i + 3] = BG[3];
  }

  const text = "SMM";
  const charCols = 5;
  const gap = 1;
  const totalCols = text.length * charCols + (text.length - 1) * gap;
  const scale = Math.max(1, Math.floor((size * safeZoneRatio) / totalCols));
  const textWidth = totalCols * scale;
  const textHeight = 7 * scale;
  const startX = Math.floor((size - textWidth) / 2);
  const startY = Math.floor((size - textHeight) / 2);

  for (let i = 0; i < text.length; i++) {
    const cx = startX + i * (charCols + gap) * scale;
    drawChar(pixels, size, text[i], cx, startY, scale, FG);
  }

  return encodePng(size, size, pixels);
}

writeFileSync(resolve(outDir, "icon-192.png"), buildIcon(192, { safeZoneRatio: 0.7 }));
writeFileSync(resolve(outDir, "icon-512-maskable.png"), buildIcon(512, { safeZoneRatio: 0.55 }));

console.log("Generated icons in", outDir);
