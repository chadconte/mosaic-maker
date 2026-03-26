import { Jimp } from "jimp";
import { PALETTE, PaletteColor, ColorFamily } from "./palette.js";
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

interface ProcessImageOptions {
  palette?: PaletteColor[];
  protectEdges?: boolean;
}

const FAMILY_COMPATIBILITY: Record<ColorFamily, ColorFamily[]> = {
  neutral: ["neutral"],
  skin: ["skin", "brown"],
  brown: ["brown", "skin", "red"],
  red: ["red", "pink", "orange", "brown"],
  pink: ["pink", "red", "purple"],
  orange: ["orange", "red", "yellow"],
  yellow: ["yellow", "orange"],
  green: ["green"],
  blue: ["blue", "cyan", "purple"],
  cyan: ["cyan", "blue", "green"],
  purple: ["purple", "pink", "blue"],
  metallic: ["metallic"],
};

function buildPaletteEntries(inputPalette?: PaletteColor[]): PaletteLabEntry[] {
  const sourcePalette = (
    inputPalette && inputPalette.length > 0 ? inputPalette : PALETTE
  ).filter((c) => c.enabled);

  return sourcePalette.map((color, index) => {
    const rgb = hexToRgb(color.hex);
    return {
      color,
      index,
      lab: rgbToLab(rgb.r, rgb.g, rgb.b),
    };
  });
}

function findNearestPaletteEntry(
  pixelLab: LAB,
  activePalette: PaletteLabEntry[],
): PaletteLabEntry {
  let minDist = Infinity;
  let best = activePalette[0];

  for (const entry of activePalette) {
    const d = labDistance(pixelLab, entry.lab);
    if (d < minDist) {
      minDist = d;
      best = entry;
    }
  }

  return best;
}

function findNearestColorIndexFamilyAware(
  r: number,
  g: number,
  b: number,
  activePalette: PaletteLabEntry[],
): number {
  const pixelLab = rgbToLab(r, g, b);

  const nearestGlobal = findNearestPaletteEntry(pixelLab, activePalette);
  const compatibleFamilies = FAMILY_COMPATIBILITY[
    nearestGlobal.color.family
  ] ?? [nearestGlobal.color.family];

  const compatiblePalette = activePalette.filter((entry) =>
    compatibleFamilies.includes(entry.color.family),
  );

  const best = findNearestPaletteEntry(
    pixelLab,
    compatiblePalette.length > 0 ? compatiblePalette : activePalette,
  );

  return best.index;
}

function countColors(pixels: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const p of pixels) {
    counts.set(p, (counts.get(p) ?? 0) + 1);
  }
  return counts;
}

function cloneCounts(counts: Map<number, number>): Map<number, number> {
  return new Map<number, number>(counts);
}

function getPixelRgbFromJimp(img: Jimp, x: number, y: number) {
  const px = img.getPixelColor(x, y);
  return {
    r: (px >> 24) & 255,
    g: (px >> 16) & 255,
    b: (px >> 8) & 255,
  };
}

function buildEdgeProtectionMask(
  img: Jimp,
  width: number,
  height: number,
  threshold = 18,
): boolean[] {
  const mask = new Array<boolean>(width * height).fill(false);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const centerRgb = getPixelRgbFromJimp(img, x, y);
      const centerLab = rgbToLab(centerRgb.r, centerRgb.g, centerRgb.b);

      const neighbors: LAB[] = [];

      if (x > 0) {
        const rgb = getPixelRgbFromJimp(img, x - 1, y);
        neighbors.push(rgbToLab(rgb.r, rgb.g, rgb.b));
      }
      if (x < width - 1) {
        const rgb = getPixelRgbFromJimp(img, x + 1, y);
        neighbors.push(rgbToLab(rgb.r, rgb.g, rgb.b));
      }
      if (y > 0) {
        const rgb = getPixelRgbFromJimp(img, x, y - 1);
        neighbors.push(rgbToLab(rgb.r, rgb.g, rgb.b));
      }
      if (y < height - 1) {
        const rgb = getPixelRgbFromJimp(img, x, y + 1);
        neighbors.push(rgbToLab(rgb.r, rgb.g, rgb.b));
      }

      const isEdge = neighbors.some(
        (neighborLab) => labDistance(centerLab, neighborLab) > threshold,
      );
      mask[y * width + x] = isEdge;
    }
  }

  return mask;
}

function findBestReplacementIndex(
  removedIdx: number,
  surviving: PaletteLabEntry[],
  fullPalette: PaletteLabEntry[],
): number {
  const removedEntry = fullPalette.find((entry) => entry.index === removedIdx);
  if (!removedEntry) return removedIdx;

  const compatibleFamilies = FAMILY_COMPATIBILITY[
    removedEntry.color.family
  ] ?? [removedEntry.color.family];

  const familyCompatibleSurvivors = surviving.filter((entry) =>
    compatibleFamilies.includes(entry.color.family),
  );

  const candidates =
    familyCompatibleSurvivors.length > 0
      ? familyCompatibleSurvivors
      : surviving;

  let minDist = Infinity;
  let bestIdx = removedIdx;

  for (const survivor of candidates) {
    const d = labDistance(removedEntry.lab, survivor.lab);
    if (d < minDist) {
      minDist = d;
      bestIdx = survivor.index;
    }
  }

  return bestIdx;
}

function applyDitheringPlaceholder(pixels: number[]): number[] {
  // Future spot for dithering.
  // Keep unchanged for now.
  return pixels;
}

function applyThreshold(
  pixels: number[],
  threshold: number,
  palette: PaletteLabEntry[],
  width: number,
  height: number,
  protectEdges: boolean,
  edgeMask: boolean[],
): number[] {
  const result = [...pixels];
  const maxPasses = 20;
  let pass = 0;

  while (pass < maxPasses) {
    pass += 1;

    const counts = countColors(result);
    const removed = new Set<number>();

    for (const [colorIdx, count] of counts) {
      if (count < threshold) {
        removed.add(colorIdx);
      }
    }

    console.log("CLEANUP_PASS_START", {
      pass,
      threshold,
      colorsBelowThreshold: Array.from(removed.values()),
      counts: Object.fromEntries(counts),
    });

    if (removed.size === 0) {
      break;
    }

    const surviving = palette.filter((entry) => !removed.has(entry.index));
    if (surviving.length === 0) {
      break;
    }

    const remap = new Map<number, number>();

    for (const removedIdx of removed) {
      const replacementIdx = findBestReplacementIndex(
        removedIdx,
        surviving,
        palette,
      );
      remap.set(removedIdx, replacementIdx);
    }

    let changed = false;

    for (let i = 0; i < result.length; i++) {
      const current = result[i];

      if (!removed.has(current)) continue;
      if (protectEdges && edgeMask[i]) continue;

      const mapped = remap.get(current);
      if (mapped !== undefined && mapped !== current) {
        result[i] = mapped;
        changed = true;
      }
    }

    if (!changed) {
      // If protected edges prevent cleanup from finishing, force one pass ignoring edge protection
      for (let i = 0; i < result.length; i++) {
        const current = result[i];
        if (!removed.has(current)) continue;

        const mapped = remap.get(current);
        if (mapped !== undefined && mapped !== current) {
          result[i] = mapped;
          changed = true;
        }
      }
    }

    if (!changed) {
      break;
    }
  }

  const finalCounts = countColors(result);
  const invalidFinalColors = Array.from(finalCounts.entries()).filter(
    ([, count]) => count < threshold,
  );

  console.log("COLOR_COUNTS_AFTER_THRESHOLD", Object.fromEntries(finalCounts));
  console.log("INVALID_FINAL_COLORS", invalidFinalColors);

  return result;
}

export async function processImage(
  imageBuffer: Buffer,
  baseplateSize: number,
  columns: number,
  rows: number,
  threshold: number,
  options: ProcessImageOptions = {},
): Promise<MosaicData> {
  const targetW = baseplateSize * columns;
  const targetH = baseplateSize * rows;
  const aspectRatio = targetW / targetH;

  const img = await Jimp.fromBuffer(imageBuffer);
  const srcW = img.width;
  const srcH = img.height;
  const srcAspect = srcW / srcH;

  let cropX = 0;
  let cropY = 0;
  let cropW = srcW;
  let cropH = srcH;

  if (srcAspect > aspectRatio) {
    cropW = Math.round(srcH * aspectRatio);
    cropX = Math.round((srcW - cropW) / 2);
  } else if (srcAspect < aspectRatio) {
    cropH = Math.round(srcW / aspectRatio);
    cropY = Math.round((srcH - cropH) / 2);
  }

  img.crop({ x: cropX, y: cropY, w: cropW, h: cropH });
  img.resize({ w: targetW, h: targetH });

  const activePalette = buildPaletteEntries(options.palette);

  if (activePalette.length === 0) {
    throw new Error("At least one palette color must be enabled.");
  }

  const pixels: number[] = new Array(targetW * targetH);

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const { r, g, b } = getPixelRgbFromJimp(img, x, y);
      pixels[y * targetW + x] = findNearestColorIndexFamilyAware(
        r,
        g,
        b,
        activePalette,
      );
    }
  }

  const ditheredPixels = applyDitheringPlaceholder(pixels);

  const colorCountsBefore = cloneCounts(countColors(ditheredPixels));

  const protectEdges = options.protectEdges ?? true;
  const edgeMask = protectEdges
    ? buildEdgeProtectionMask(img, targetW, targetH)
    : new Array<boolean>(targetW * targetH).fill(false);

  console.log("THRESHOLD_USED", threshold);
  console.log("COLOR_COUNTS_BEFORE", Object.fromEntries(colorCountsBefore));
  console.log("PROTECT_EDGES", protectEdges);

  const finalPixels = applyThreshold(
    ditheredPixels,
    threshold,
    activePalette,
    targetW,
    targetH,
    protectEdges,
    edgeMask,
  );

  const colorCountsAfter = countColors(finalPixels);

  console.log("COLOR_COUNTS_AFTER", Object.fromEntries(colorCountsAfter));

  return {
    width: targetW,
    height: targetH,
    pixels: finalPixels,
    palette: activePalette.map((entry) => entry.color),
    colorCountsBefore,
    colorCountsAfter,
  };
}
