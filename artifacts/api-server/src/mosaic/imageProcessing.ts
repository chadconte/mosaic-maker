import { Jimp } from "jimp";
import { PALETTE, PaletteColor } from "./palette.js";
import { hexToRgb, rgbToLab, labDistance, LAB } from "./colorUtils.js";

export interface PixelMapping {
  colorIndex: number;
}

export interface MosaicData {
  width: number;
  height: number;
  pixels: number[];
  palette: PaletteColor[];
  colorCountsBefore: Map<number, number>;
  colorCountsAfter: Map<number, number>;
}

interface PaletteLabEntry {
  color: PaletteColor;
  index: number;
  lab: LAB;
}

let precomputedPalette: PaletteLabEntry[] | null = null;

function getPrecomputedPalette(): PaletteLabEntry[] {
  if (!precomputedPalette) {
    precomputedPalette = PALETTE.filter((c) => c.enabled).map((color, i) => {
      const rgb = hexToRgb(color.hex);
      return {
        color,
        index: i,
        lab: rgbToLab(rgb.r, rgb.g, rgb.b),
      };
    });
  }
  return precomputedPalette;
}

function findNearestColorIndex(
  r: number,
  g: number,
  b: number,
  activePalette: PaletteLabEntry[],
): number {
  const pixelLab = rgbToLab(r, g, b);
  let minDist = Infinity;
  let best = 0;
  for (const entry of activePalette) {
    const d = labDistance(pixelLab, entry.lab);
    if (d < minDist) {
      minDist = d;
      best = entry.index;
    }
  }
  return best;
}

export async function processImage(
  imageBuffer: Buffer,
  baseplateSize: number,
  columns: number,
  rows: number,
  threshold: number,
): Promise<MosaicData> {
  const targetW = baseplateSize * columns;
  const targetH = baseplateSize * rows;
  const aspectRatio = targetW / targetH;

  const img = await Jimp.fromBuffer(imageBuffer);
  const srcW = img.width;
  const srcH = img.height;
  const srcAspect = srcW / srcH;

  let cropX = 0,
    cropY = 0,
    cropW = srcW,
    cropH = srcH;

  if (srcAspect > aspectRatio) {
    cropW = Math.round(srcH * aspectRatio);
    cropX = Math.round((srcW - cropW) / 2);
  } else if (srcAspect < aspectRatio) {
    cropH = Math.round(srcW / aspectRatio);
    cropY = Math.round((srcH - cropH) / 2);
  }

  img.crop({ x: cropX, y: cropY, w: cropW, h: cropH });
  img.resize({ w: targetW, h: targetH });

  const fullPalette = getPrecomputedPalette();
  const pixels: number[] = new Array(targetW * targetH);

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const px = img.getPixelColor(x, y);
      const r = (px >> 24) & 255;
      const g = (px >> 16) & 255;
      const b = (px >> 8) & 255;
      pixels[y * targetW + x] = findNearestColorIndex(r, g, b, fullPalette);
    }
  }

  const colorCountsBefore = countColors(pixels);

  const finalPixels = applyThreshold(pixels, threshold, fullPalette);
  const colorCountsAfter = countColors(finalPixels);

  return {
    width: targetW,
    height: targetH,
    pixels: finalPixels,
    palette: PALETTE.filter((c) => c.enabled),
    colorCountsBefore,
    colorCountsAfter,
  };
}

function countColors(pixels: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const p of pixels) {
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  return counts;
}

function applyThreshold(
  pixels: number[],
  threshold: number,
  palette: PaletteLabEntry[],
): number[] {
  const result = [...pixels];
  const maxPasses = 5;

  for (let pass = 0; pass < maxPasses; pass++) {
    const counts = countColors(result);
    const removed = new Set<number>();

    for (const [colorIdx, count] of counts) {
      if (count < threshold) {
        removed.add(colorIdx);
      }
    }

    if (removed.size === 0) break;

    const surviving = palette.filter((e) => !removed.has(e.index));
    if (surviving.length === 0) break;

    // Precompute remap table once per pass
    const remap = new Map<number, number>();

    for (const removedIdx of removed) {
      const origEntry = palette.find((e) => e.index === removedIdx);
      if (!origEntry) continue;

      let minDist = Infinity;
      let bestIdx = removedIdx;

      for (const survivor of surviving) {
        const d = labDistance(origEntry.lab, survivor.lab);
        if (d < minDist) {
          minDist = d;
          bestIdx = survivor.index;
        }
      }

      remap.set(removedIdx, bestIdx);
    }

    // Replace pixels using remap table
    for (let i = 0; i < result.length; i++) {
      const mapped = remap.get(result[i]);
      if (mapped !== undefined) {
        result[i] = mapped;
      }
    }
  }

  return result;
}
