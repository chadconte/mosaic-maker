import { Jimp } from "jimp";
import { PaletteColor } from "./palette.js";
import { hexToRgb } from "./colorUtils.js";

const STUD_SIZE = 16;
const SECTION_LABEL_HEIGHT = 24;

type JimpImage = InstanceType<typeof Jimp>;

// Added: code text color helpers
const CODE_TEXT_DARK = 0x222222ff;
const CODE_TEXT_LIGHT = 0xffffffff;

function getCodeTextColor(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance < 140 ? CODE_TEXT_LIGHT : CODE_TEXT_DARK;
}

function getTextWidth(text: string): number {
  const glyphs: Record<string, number[][]> = getGlyphs();
  let width = 0;

  for (const ch of text.toUpperCase()) {
    const glyph = glyphs[ch] || glyphs[" "];
    width += (glyph?.[0]?.length ?? 4) + 1;
  }

  return Math.max(0, width - 1);
}

function drawCenteredText(
  img: JimpImage,
  text: string,
  boxX: number,
  boxY: number,
  boxSize: number,
  color: number
): void {
  const textWidth = getTextWidth(text);
  const textHeight = 5;
  const x = boxX + Math.floor((boxSize - textWidth) / 2);
  const y = boxY + Math.floor((boxSize - textHeight) / 2);
  drawText(img, text, x, y, color);
}

export async function renderMosaic(
  pixels: number[],
  width: number,
  height: number,
  palette: PaletteColor[]
): Promise<Buffer> {
  const img = new Jimp({ width, height, color: 0xffffffff });

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const colorIdx = pixels[y * width + x];
      const color = palette[colorIdx];
      if (!color) continue;

      const rgb = hexToRgb(color.hex);
      const packed =
        ((rgb.r & 0xff) << 24) |
        ((rgb.g & 0xff) << 16) |
        ((rgb.b & 0xff) << 8) |
        0xff;

      img.setPixelColor(packed >>> 0, x, y);
    }
  }

  return await img.getBuffer("image/png");
}

export async function renderSection(
  pixels: number[],
  fullWidth: number,
  palette: PaletteColor[],
  startX: number,
  startY: number,
  sectionW: number,
  sectionH: number,
  label: string
): Promise<Buffer> {
  const renderW = sectionW * STUD_SIZE;
  const renderH = sectionH * STUD_SIZE + SECTION_LABEL_HEIGHT;
  const img = new Jimp({ width: renderW, height: renderH, color: 0xf5f5f5ff });

  for (let sy = 0; sy < sectionH; sy++) {
    for (let sx = 0; sx < sectionW; sx++) {
      const px = startX + sx;
      const py = startY + sy;

      const colorIdx = pixels[py * fullWidth + px];
      const color = palette[colorIdx];
      if (!color) continue;

      const rgb = hexToRgb(color.hex);
      const ox = sx * STUD_SIZE;
      const oy = sy * STUD_SIZE + SECTION_LABEL_HEIGHT;

      for (let dy = 0; dy < STUD_SIZE; dy++) {
        for (let dx = 0; dx < STUD_SIZE; dx++) {
          const isBorder =
            dx === 0 ||
            dy === 0 ||
            dx === STUD_SIZE - 1 ||
            dy === STUD_SIZE - 1;

          let r = rgb.r;
          let g = rgb.g;
          let b = rgb.b;

          if (isBorder) {
            r = Math.max(0, r - 30);
            g = Math.max(0, g - 30);
            b = Math.max(0, b - 30);
          }

          const packed =
            ((r & 0xff) << 24) |
            ((g & 0xff) << 16) |
            ((b & 0xff) << 8) |
            0xff;

          img.setPixelColor(packed >>> 0, ox + dx, oy + dy);
        }
      }

      // Added: draw the palette code inside each stud
      const code = color.code?.toUpperCase() ?? "";
      if (code) {
        drawCenteredText(
          img,
          code,
          ox,
          oy,
          STUD_SIZE,
          getCodeTextColor(color.hex)
        );
      }
    }
  }

  drawText(img, label, 4, 4, 0x222222ff);

  return await img.getBuffer("image/png");
}

export async function renderLayoutMap(
  totalColumns: number,
  totalRows: number,
  baseplateSize: number
): Promise<Buffer> {
  const cellW = 80;
  const cellH = 60;
  const imgW = totalColumns * cellW;
  const imgH = totalRows * cellH;
  const img = new Jimp({ width: imgW, height: imgH, color: 0xf0f0f0ff });

  const colors = [
    0xd0e8ffff,
    0xd0ffd8ff,
    0xfff4d0ff,
    0xffd0d0ff,
    0xf0d0ffff,
    0xd0fff4ff,
  ];

  for (let row = 0; row < totalRows; row++) {
    for (let col = 0; col < totalColumns; col++) {
      const label = String.fromCharCode(65 + row) + (col + 1);
      const color = colors[(row * totalColumns + col) % colors.length];
      const x0 = col * cellW;
      const y0 = row * cellH;

      for (let dy = 1; dy < cellH - 1; dy++) {
        for (let dx = 1; dx < cellW - 1; dx++) {
          img.setPixelColor(color, x0 + dx, y0 + dy);
        }
      }

      for (let dx = 0; dx < cellW; dx++) {
        img.setPixelColor(0x888888ff, x0 + dx, y0);
        img.setPixelColor(0x888888ff, x0 + dx, y0 + cellH - 1);
      }

      for (let dy = 0; dy < cellH; dy++) {
        img.setPixelColor(0x888888ff, x0, y0 + dy);
        img.setPixelColor(0x888888ff, x0 + cellW - 1, y0 + dy);
      }

      drawText(img, label, x0 + cellW / 2 - 8, y0 + cellH / 2 - 6, 0x333333ff);
      drawText(
        img,
        `${baseplateSize}×${baseplateSize}`,
        x0 + cellW / 2 - 16,
        y0 + cellH / 2 + 6,
        0x666666ff
      );
    }
  }

  return await img.getBuffer("image/png");
}

function drawText(
  img: JimpImage,
  text: string,
  x: number,
  y: number,
  color: number
): void {
  const glyphs: Record<string, number[][]> = getGlyphs();
  let cx = x;

  for (const ch of text.toUpperCase()) {
    const glyph = glyphs[ch] || glyphs[" "];
    if (!glyph) {
      cx += 5;
      continue;
    }

    for (let gy = 0; gy < glyph.length; gy++) {
      for (let gx = 0; gx < glyph[gy].length; gx++) {
        if (glyph[gy][gx]) {
          const px = cx + gx;
          const py = y + gy;

          if (
            px >= 0 &&
            py >= 0 &&
            px < img.bitmap.width &&
            py < img.bitmap.height
          ) {
            img.setPixelColor(color, px, py);
          }
        }
      }
    }

    cx += (glyph[0]?.length ?? 4) + 1;
  }
}

function getGlyphs(): Record<string, number[][]> {
  return {
    A: [[0, 1, 1, 0], [1, 0, 0, 1], [1, 1, 1, 1], [1, 0, 0, 1], [1, 0, 0, 1]],
    B: [[1, 1, 1, 0], [1, 0, 0, 1], [1, 1, 1, 0], [1, 0, 0, 1], [1, 1, 1, 0]],
    C: [[0, 1, 1, 1], [1, 0, 0, 0], [1, 0, 0, 0], [1, 0, 0, 0], [0, 1, 1, 1]],
    D: [[1, 1, 1, 0], [1, 0, 0, 1], [1, 0, 0, 1], [1, 0, 0, 1], [1, 1, 1, 0]],
    E: [[1, 1, 1, 1], [1, 0, 0, 0], [1, 1, 1, 0], [1, 0, 0, 0], [1, 1, 1, 1]],
    F: [[1, 1, 1, 1], [1, 0, 0, 0], [1, 1, 1, 0], [1, 0, 0, 0], [1, 0, 0, 0]],
    G: [[0, 1, 1, 1], [1, 0, 0, 0], [1, 0, 1, 1], [1, 0, 0, 1], [0, 1, 1, 1]],
    H: [[1, 0, 0, 1], [1, 0, 0, 1], [1, 1, 1, 1], [1, 0, 0, 1], [1, 0, 0, 1]],
    I: [[1, 1, 1], [0, 1, 0], [0, 1, 0], [0, 1, 0], [1, 1, 1]],
    J: [[0, 0, 1], [0, 0, 1], [0, 0, 1], [1, 0, 1], [0, 1, 1]],
    K: [[1, 0, 0, 1], [1, 0, 1, 0], [1, 1, 0, 0], [1, 0, 1, 0], [1, 0, 0, 1]],
    L: [[1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 1, 1]],
    M: [[1, 0, 0, 0, 1], [1, 1, 0, 1, 1], [1, 0, 1, 0, 1], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1]],
    N: [[1, 0, 0, 1], [1, 1, 0, 1], [1, 0, 1, 1], [1, 0, 0, 1], [1, 0, 0, 1]],
    O: [[0, 1, 1, 0], [1, 0, 0, 1], [1, 0, 0, 1], [1, 0, 0, 1], [0, 1, 1, 0]],
    P: [[1, 1, 1, 0], [1, 0, 0, 1], [1, 1, 1, 0], [1, 0, 0, 0], [1, 0, 0, 0]],
    Q: [[0, 1, 1, 0], [1, 0, 0, 1], [1, 0, 0, 1], [1, 0, 1, 0], [0, 1, 0, 1]],
    R: [[1, 1, 1, 0], [1, 0, 0, 1], [1, 1, 1, 0], [1, 0, 1, 0], [1, 0, 0, 1]],
    S: [[0, 1, 1, 1], [1, 0, 0, 0], [0, 1, 1, 0], [0, 0, 0, 1], [1, 1, 1, 0]],
    T: [[1, 1, 1], [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0]],
    U: [[1, 0, 0, 1], [1, 0, 0, 1], [1, 0, 0, 1], [1, 0, 0, 1], [0, 1, 1, 0]],
    V: [[1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [0, 1, 0, 1, 0], [0, 1, 0, 1, 0], [0, 0, 1, 0, 0]],
    W: [[1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 0, 1, 0, 1], [1, 1, 0, 1, 1], [1, 0, 0, 0, 1]],
    X: [[1, 0, 0, 1], [0, 1, 1, 0], [0, 0, 0, 0], [0, 1, 1, 0], [1, 0, 0, 1]],
    Y: [[1, 0, 0, 1], [0, 1, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
    Z: [[1, 1, 1, 1], [0, 0, 0, 1], [0, 0, 1, 0], [0, 1, 0, 0], [1, 1, 1, 1]],
    "0": [[0, 1, 1, 0], [1, 0, 0, 1], [1, 0, 0, 1], [1, 0, 0, 1], [0, 1, 1, 0]],
    "1": [[0, 1], [1, 1], [0, 1], [0, 1], [1, 1, 1]],
    "2": [[0, 1, 1, 0], [1, 0, 0, 1], [0, 0, 1, 0], [0, 1, 0, 0], [1, 1, 1, 1]],
    "3": [[1, 1, 1, 0], [0, 0, 0, 1], [0, 1, 1, 0], [0, 0, 0, 1], [1, 1, 1, 0]],
    "4": [[1, 0, 0, 1], [1, 0, 0, 1], [1, 1, 1, 1], [0, 0, 0, 1], [0, 0, 0, 1]],
    "5": [[1, 1, 1, 1], [1, 0, 0, 0], [1, 1, 1, 0], [0, 0, 0, 1], [1, 1, 1, 0]],
    "6": [[0, 1, 1, 0], [1, 0, 0, 0], [1, 1, 1, 0], [1, 0, 0, 1], [0, 1, 1, 0]],
    "7": [[1, 1, 1, 1], [0, 0, 0, 1], [0, 0, 1, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
    "8": [[0, 1, 1, 0], [1, 0, 0, 1], [0, 1, 1, 0], [1, 0, 0, 1], [0, 1, 1, 0]],
    "9": [[0, 1, 1, 0], [1, 0, 0, 1], [0, 1, 1, 1], [0, 0, 0, 1], [0, 1, 1, 0]],
    "×": [[0, 0, 0], [1, 0, 1], [0, 1, 0], [1, 0, 1], [0, 0, 0]],
    " ": [[0], [0], [0], [0], [0]],
    "-": [[0, 0, 0], [0, 0, 0], [1, 1, 1], [0, 0, 0], [0, 0, 0]],
    "_": [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1]],
  };
}