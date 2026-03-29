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
  skin: ["skin", "brown", "orange", "red"],
  brown: ["brown", "skin", "red", "orange"],
  red: ["red", "brown", "pink", "orange"],
  orange: ["orange", "yellow", "skin", "brown", "red"],
  yellow: ["yellow", "orange", "green"],
  green: ["green", "yellow", "cyan"],
  blue: ["blue", "cyan", "purple"],
  cyan: ["cyan", "blue", "green"],
  purple: ["purple", "blue", "pink"],
  pink: ["pink", "red", "purple", "skin"],
  metallic: ["metallic", "neutral", "yellow", "orange"],
};

function buildPaletteEntries(
  palette: PaletteColor[] = PALETTE,
): PaletteLabEntry[] {
  return palette
    .filter((color) => color.enabled)
    .map((color, index) => {
      const rgb = hexToRgb(color.hex);
      return {
        color,
        index,
        lab: rgbToLab(rgb.r, rgb.g, rgb.b),
      };
    });
}

function countColors(pixels: number[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const pixel of pixels) {
    counts.set(pixel, (counts.get(pixel) ?? 0) + 1);
  }
  return counts;
}

function cloneCounts(counts: Map<number, number>): Map<number, number> {
  return new Map<number, number>(counts);
}

function getPixelRgbFromJimp(img: any, x: number, y: number) {
  const px = img.getPixelColor(x, y);
  return {
    r: (px >> 24) & 255,
    g: (px >> 16) & 255,
    b: (px >> 8) & 255,
  };
}

function rgbToHsv(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;

  if (delta !== 0) {
    if (max === rn) {
      h = ((gn - bn) / delta) % 6;
    } else if (max === gn) {
      h = (bn - rn) / delta + 2;
    } else {
      h = (rn - gn) / delta + 4;
    }
  }

  h = Math.round(h * 60);
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : delta / max;
  const v = max;

  return { h, s, v };
}

function isLikelySkinPixel(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const { h, s, v } = rgbToHsv(r, g, b);

  const classicRgbRule =
    r > 95 &&
    g > 40 &&
    b > 20 &&
    delta > 15 &&
    Math.abs(r - g) > 12 &&
    r > g &&
    r > b;

  const hsvRule =
    ((h >= 0 && h <= 50) || (h >= 330 && h <= 360)) &&
    s >= 0.12 &&
    s <= 0.68 &&
    v >= 0.25;

  return classicRgbRule && hsvRule;
}

function isVeryLightPixel(pixelLab: LAB): boolean {
  return pixelLab.l >= 80;
}

function isLightPixel(pixelLab: LAB): boolean {
  return pixelLab.l >= 60;
}

function weightedDistanceForSkin(pixelLab: LAB, entry: PaletteLabEntry): number {
  let d = labDistance(pixelLab, entry.lab);
  const family = entry.color.family;

  if (family === "skin") {
    d *= 0.65;

    if (pixelLab.l > 80) {
      if (entry.lab.l >= 75) {
        d *= 0.6;
      } else {
        d += 25;
      }
    }

    if (pixelLab.l > 65) {
      if (entry.lab.l >= 65) {
        d *= 0.75;
      } else {
        d += 15;
      }
    }

    if (entry.lab.l < pixelLab.l - 12) {
      d += 25;
    }
  }

  if (family === "brown") {
    d *= 1.35;

    if (pixelLab.l > 60) {
      d += 25;
    }

    if (entry.lab.l < pixelLab.l - 10) {
      d += 30;
    }
  }

  if (family === "red" || family === "pink") {
    d += 12;
  }

  if (family === "neutral" && pixelLab.l > 70) {
    d += 10;
  }

  return d;
}

function findNearestPaletteEntryWeightedForSkin(
  pixelLab: LAB,
  activePalette: PaletteLabEntry[],
): PaletteLabEntry {
  let minDist = Infinity;
  let best = activePalette[0];

  for (const entry of activePalette) {
    const d = weightedDistanceForSkin(pixelLab, entry);
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

  if (isLikelySkinPixel(r, g, b)) {
    return findNearestPaletteEntryWeightedForSkin(pixelLab, activePalette).index;
  }

  let minDist = Infinity;
  let best = activePalette[0];

  for (const entry of activePalette) {
    let d = labDistance(pixelLab, entry.lab);

    if (entry.color.family === "metallic") {
      d += 16;
    }

    if (entry.color.family === "brown" && pixelLab.l > 68) {
      d += 8;
    }

    if (entry.color.family === "neutral" && pixelLab.l > 78) {
      d += 5;
    }

    if (d < minDist) {
      minDist = d;
      best = entry;
    }
  }

  return best.index;
}

function getNeighborIndexes(
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const indexes: number[] = [];

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;

      const nx = x + dx;
      const ny = y + dy;

      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      indexes.push(ny * width + nx);
    }
  }

  return indexes;
}

function buildEdgeProtectionMask(
  img: any,
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

      mask[y * width + x] = neighbors.some(
        (neighborLab) => labDistance(centerLab, neighborLab) > threshold,
      );
    }
  }

  return mask;
}

function buildSkinProtectionMask(
  img: any,
  width: number,
  height: number,
): boolean[] {
  const base = new Array<boolean>(width * height).fill(false);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const { r, g, b } = getPixelRgbFromJimp(img, x, y);
      if (isLikelySkinPixel(r, g, b)) {
        base[y * width + x] = true;
      }
    }
  }

  const dilated = [...base];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (base[idx]) continue;

      const neighbors = getNeighborIndexes(x, y, width, height);
      let skinNeighbors = 0;

      for (const neighbor of neighbors) {
        if (base[neighbor]) skinNeighbors++;
      }

      if (skinNeighbors >= 3) {
        dilated[idx] = true;
      }
    }
  }

  return dilated;
}

function buildFaceFeatureMask(
  img: any,
  width: number,
  height: number,
  skinMask: boolean[],
): boolean[] {
  const mask = new Array<boolean>(width * height).fill(false);

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (!skinMask[idx]) continue;

      const centerRgb = getPixelRgbFromJimp(img, x, y);
      const centerLab = rgbToLab(centerRgb.r, centerRgb.g, centerRgb.b);

      const neighbors = [
        getPixelRgbFromJimp(img, x - 1, y),
        getPixelRgbFromJimp(img, x + 1, y),
        getPixelRgbFromJimp(img, x, y - 1),
        getPixelRgbFromJimp(img, x, y + 1),
        getPixelRgbFromJimp(img, x - 1, y - 1),
        getPixelRgbFromJimp(img, x + 1, y - 1),
        getPixelRgbFromJimp(img, x - 1, y + 1),
        getPixelRgbFromJimp(img, x + 1, y + 1),
      ];

      let contrastCount = 0;
      let darkFeatureCount = 0;

      for (const rgb of neighbors) {
        const neighborLab = rgbToLab(rgb.r, rgb.g, rgb.b);
        const dist = labDistance(centerLab, neighborLab);

        if (dist > 16) {
          contrastCount++;
        }

        if (neighborLab.l < centerLab.l - 10) {
          darkFeatureCount++;
        }
      }

      if (contrastCount >= 3 || darkFeatureCount >= 2) {
        mask[idx] = true;
      }
    }
  }

  const expanded = [...mask];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (mask[idx]) continue;

      const neighbors = getNeighborIndexes(x, y, width, height);
      let featureNeighbors = 0;

      for (const neighbor of neighbors) {
        if (mask[neighbor]) featureNeighbors++;
      }

      if (featureNeighbors >= 2) {
        expanded[idx] = true;
      }
    }
  }

  return expanded;
}

function shouldProtectPixel(
  idx: number,
  edgeMask: boolean[],
  skinMask: boolean[],
  faceFeatureMask: boolean[],
): boolean {
  return edgeMask[idx] || faceFeatureMask[idx] || (!skinMask[idx] && false);
}

function applySmoothing(
  pixels: number[],
  width: number,
  height: number,
  edgeMask: boolean[],
  skinMask: boolean[],
  faceFeatureMask: boolean[],
): number[] {
  const result = [...pixels];

  for (let pass = 0; pass < 2; pass++) {
    let changed = false;
    const next = [...result];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;

        if (edgeMask[idx] || faceFeatureMask[idx]) {
          continue;
        }

        const neighbors = getNeighborIndexes(x, y, width, height);
        const counts = new Map<number, number>();

        for (const neighborIdx of neighbors) {
          const color = result[neighborIdx];
          counts.set(color, (counts.get(color) ?? 0) + 1);
        }

        let majorityColor = result[idx];
        let majorityCount = 0;

        for (const [color, count] of counts.entries()) {
          if (count > majorityCount) {
            majorityCount = count;
            majorityColor = color;
          }
        }

        const isSkinArea = skinMask[idx];

        if (!isSkinArea) {
          if (majorityColor !== result[idx] && majorityCount >= 5) {
            next[idx] = majorityColor;
            changed = true;
          }
          continue;
        }

        const currentColor = result[idx];
        const currentCount = counts.get(currentColor) ?? 0;

        if (
          majorityColor !== currentColor &&
          majorityCount >= 4 &&
          majorityCount >= currentCount + 2
        ) {
          next[idx] = majorityColor;
          changed = true;
        }
      }
    }

    result.splice(0, result.length, ...next);

    if (!changed) {
      break;
    }
  }

  return result;
}

function findBestReplacementIndex(
  removedIdx: number,
  surviving: PaletteLabEntry[],
  fullPalette: PaletteLabEntry[],
): number {
  const removedEntry = fullPalette.find((entry) => entry.index === removedIdx);
  if (!removedEntry) return removedIdx;

  const compatibleFamilies =
    FAMILY_COMPATIBILITY[removedEntry.color.family] ?? [
      removedEntry.color.family,
    ];

  const familyCompatibleSurvivors = surviving.filter((entry) =>
    compatibleFamilies.includes(entry.color.family),
  );

  const candidates =
    familyCompatibleSurvivors.length > 0 ? familyCompatibleSurvivors : surviving;

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

function chooseLocalReplacement(
  x: number,
  y: number,
  width: number,
  height: number,
  currentPixels: number[],
  removedIdx: number,
  survivingIndexes: Set<number>,
  fullPalette: PaletteLabEntry[],
): number | null {
  const removedEntry = fullPalette.find((entry) => entry.index === removedIdx);
  if (!removedEntry) return null;

  const compatibleFamilies =
    FAMILY_COMPATIBILITY[removedEntry.color.family] ?? [
      removedEntry.color.family,
    ];

  let bestColor: number | null = null;
  let bestScore = Infinity;

  for (const neighborIdx of getNeighborIndexes(x, y, width, height)) {
    const colorIndex = currentPixels[neighborIdx];
    if (!survivingIndexes.has(colorIndex)) continue;

    const paletteEntry = fullPalette.find((entry) => entry.index === colorIndex);
    if (!paletteEntry) continue;

    let score = labDistance(removedEntry.lab, paletteEntry.lab);

    if (!compatibleFamilies.includes(paletteEntry.color.family)) {
      score += 10;
    }

    if (score < bestScore) {
      bestScore = score;
      bestColor = colorIndex;
    }
  }

  return bestColor;
}

function enforceFinalThreshold(
  pixels: number[],
  threshold: number,
  palette: PaletteLabEntry[],
  width: number,
  height: number,
): number[] {
  if (threshold <= 0) return [...pixels];

  const result = [...pixels];
  const counts = countColors(result);

  const removable = Array.from(counts.entries())
    .filter(([, count]) => count < threshold)
    .map(([index]) => index);

  if (removable.length === 0) {
    return result;
  }

  let surviving = palette.filter(
    (entry) => (counts.get(entry.index) ?? 0) >= threshold,
  );

  if (surviving.length === 0) {
    const sortedByCount = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    const topIndex = sortedByCount[0]?.[0];

    if (topIndex !== undefined) {
      surviving = palette.filter((entry) => entry.index === topIndex);
    }
  }

  if (surviving.length === 0) {
    return result;
  }

  const survivingIndexes = new Set(surviving.map((entry) => entry.index));
  const fallbackMap = new Map<number, number>();

  for (const removedIdx of removable) {
    fallbackMap.set(
      removedIdx,
      findBestReplacementIndex(removedIdx, surviving, palette),
    );
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const current = result[idx];

      if (!fallbackMap.has(current)) continue;

      const replacement =
        chooseLocalReplacement(
          x,
          y,
          width,
          height,
          result,
          current,
          survivingIndexes,
          palette,
        ) ?? fallbackMap.get(current)!;

      result[idx] = replacement;
    }
  }

  return result;
}

function applyThreshold(
  pixels: number[],
  threshold: number,
  palette: PaletteLabEntry[],
  width: number,
  height: number,
  protectEdges: boolean,
  edgeMask: boolean[],
  skinMask: boolean[],
  faceFeatureMask: boolean[],
): number[] {
  if (threshold <= 0) {
    return [...pixels];
  }

  const result = [...pixels];

  for (let pass = 0; pass < 12; pass++) {
    const counts = countColors(result);
    const removable = Array.from(counts.entries())
      .filter(([, count]) => count < threshold)
      .map(([index]) => index);

    if (removable.length === 0) {
      break;
    }

    let surviving = palette.filter(
      (entry) => (counts.get(entry.index) ?? 0) >= threshold,
    );

    if (surviving.length === 0) {
      const sortedByCount = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
      const topIndex = sortedByCount[0]?.[0];

      if (topIndex !== undefined) {
        surviving = palette.filter((entry) => entry.index === topIndex);
      }
    }

    if (surviving.length === 0) {
      break;
    }

    const survivingIndexes = new Set(surviving.map((entry) => entry.index));
    const fallbackMap = new Map<number, number>();

    for (const removedIdx of removable) {
      fallbackMap.set(
        removedIdx,
        findBestReplacementIndex(removedIdx, surviving, palette),
      );
    }

    let changed = false;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const current = result[idx];

        if (!fallbackMap.has(current)) {
          continue;
        }

        let replacement =
          chooseLocalReplacement(
            x,
            y,
            width,
            height,
            result,
            current,
            survivingIndexes,
            palette,
          ) ?? fallbackMap.get(current)!;

        if (
          protectEdges &&
          (edgeMask[idx] || faceFeatureMask[idx])
        ) {
          const safeLocal =
            chooseLocalReplacement(
              x,
              y,
              width,
              height,
              result,
              current,
              survivingIndexes,
              palette,
            ) ?? replacement;

          replacement = safeLocal;
        }

        if (replacement !== current) {
          result[idx] = replacement;
          changed = true;
        }
      }
    }

    if (!changed) {
      break;
    }
  }

  const forced = enforceFinalThreshold(result, threshold, palette, width, height);
  const finalCounts = countColors(forced);
  const invalidFinalColors = Array.from(finalCounts.entries()).filter(
    ([, count]) => count < threshold,
  );

  console.log("COLOR_COUNTS_AFTER_THRESHOLD", Object.fromEntries(finalCounts));
  console.log("INVALID_FINAL_COLORS", invalidFinalColors);

  return forced;
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

  const quantizedPixels: number[] = new Array(targetW * targetH);

  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const { r, g, b } = getPixelRgbFromJimp(img, x, y);
      quantizedPixels[y * targetW + x] = findNearestColorIndexFamilyAware(
        r,
        g,
        b,
        activePalette,
      );
    }
  }

  const colorCountsBefore = cloneCounts(countColors(quantizedPixels));
  const protectEdges = options.protectEdges ?? true;

  const edgeMask = protectEdges
    ? buildEdgeProtectionMask(img, targetW, targetH)
    : new Array<boolean>(targetW * targetH).fill(false);

  const skinMask = protectEdges
    ? buildSkinProtectionMask(img, targetW, targetH)
    : new Array<boolean>(targetW * targetH).fill(false);

  const faceFeatureMask = protectEdges
    ? buildFaceFeatureMask(img, targetW, targetH, skinMask)
    : new Array<boolean>(targetW * targetH).fill(false);

  console.log("THRESHOLD_USED", threshold);
  console.log("COLOR_COUNTS_BEFORE", Object.fromEntries(colorCountsBefore));
  console.log("PROTECT_EDGES", protectEdges);

  const smoothedPixels = applySmoothing(
    quantizedPixels,
    targetW,
    targetH,
    edgeMask,
    skinMask,
    faceFeatureMask,
  );

  const finalPixels = applyThreshold(
    smoothedPixels,
    threshold,
    activePalette,
    targetW,
    targetH,
    protectEdges,
    edgeMask,
    skinMask,
    faceFeatureMask,
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