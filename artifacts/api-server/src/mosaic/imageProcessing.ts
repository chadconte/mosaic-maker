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
  mode?: "detail" | "balanced" | "clean";
}

interface ModeTuning {
  smoothingPasses: number;
  nonSkinMajorityThreshold: number;
  nonSkinLeadRequired: number;
  skinMajorityThreshold: number;
  skinLeadRequired: number;
  outlierDistanceThreshold: number;
  glowPenalty: number;
}

const MODE_TUNING: Record<"detail" | "balanced" | "clean", ModeTuning> = {
  detail: {
    smoothingPasses: 2,
    nonSkinMajorityThreshold: 5,
    nonSkinLeadRequired: 3,
    skinMajorityThreshold: 4,
    skinLeadRequired: 3,
    outlierDistanceThreshold: 12,
    glowPenalty: 1,
  },
  balanced: {
    smoothingPasses: 3,
    nonSkinMajorityThreshold: 4,
    nonSkinLeadRequired: 2,
    skinMajorityThreshold: 5,
    skinLeadRequired: 3,
    outlierDistanceThreshold: 9,
    glowPenalty: 2,
  },
  clean: {
    smoothingPasses: 4,
    nonSkinMajorityThreshold: 3,
    nonSkinLeadRequired: 2,
    skinMajorityThreshold: 3,
    skinLeadRequired: 2,
    outlierDistanceThreshold: 7,
    glowPenalty: 3,
  },
};

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

function buildGreenSkinMask(img: any, width: number, height: number): boolean[] {
  const mask = new Array<boolean>(width * height).fill(false);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const { r, g, b } = getPixelRgbFromJimp(img, x, y);
      mask[y * width + x] = isLikelyGreenSkinPixel(r, g, b);
    }
  }

  return mask;
}

function buildGreenFaceInfluenceMask(
  img: any,
  width: number,
  height: number,
  greenSkinMask: boolean[],
  faceFeatureMask: boolean[],
): boolean[] {
  const mask = [...greenSkinMask];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (greenSkinMask[idx]) continue;

      const adjacentToGreenSkin = getNeighborIndexes(x, y, width, height).some(
        (neighbor) => greenSkinMask[neighbor],
      );
      if (!adjacentToGreenSkin) continue;

      const { r, g, b } = getPixelRgbFromJimp(img, x, y);
      const lab = rgbToLab(r, g, b);

      if (
        faceFeatureMask[idx] ||
        (lab.l <= 45 && !isLikelySaberOrGlowPixel(r, g, b))
      ) {
        mask[idx] = true;
      }
    }
  }

  return mask;
}

function paletteFaceFamilyBucket(entry: PaletteLabEntry): string {
  if (entry.color.family === "green") return "green";
  if (entry.color.family === "brown") return "brown";
  if (entry.color.name.includes("Black")) return "black";
  if (entry.color.family === "neutral") return "gray";
  return "other";
}

function logFaceColorDiagnostics(
  label: string,
  pixels: number[],
  palette: PaletteLabEntry[],
  skinMask: boolean[],
  faceFeatureMask: boolean[],
  greenSkinMask: boolean[],
) {
  const counts = {
    green: 0,
    gray: 0,
    brown: 0,
    black: 0,
    other: 0,
    total: 0,
  };

  for (let idx = 0; idx < pixels.length; idx++) {
    if (!skinMask[idx] && !faceFeatureMask[idx] && !greenSkinMask[idx]) continue;

    const entry = palette.find((item) => item.index === pixels[idx]);
    if (!entry) continue;

    counts[paletteFaceFamilyBucket(entry) as keyof typeof counts]++;
    counts.total++;
  }

  const pct = (count: number) =>
    counts.total > 0 ? Number(((count / counts.total) * 100).toFixed(2)) : 0;

  console.log("FACE_STAGE_COUNTS", label, {
    ...counts,
    greenPct: pct(counts.green),
    grayPct: pct(counts.gray),
    brownPct: pct(counts.brown),
    blackPct: pct(counts.black),
  });
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

function isLikelySaberOrGlowPixel(r: number, g: number, b: number): boolean {
  const { h, s, v } = rgbToHsv(r, g, b);
  const lab = rgbToLab(r, g, b);

  const brightCore = lab.l >= 78 && lab.b <= -4 && b >= r - 16 && g >= r - 20;
  const blueGlow = h >= 175 && h <= 225 && s >= 0.32 && v >= 0.5 && b > r + 14;
  const greenGlow =
    h >= 78 && h <= 138 && s >= 0.52 && v >= 0.78 && g > r + 34 && g > b + 22;

  return brightCore || blueGlow || greenGlow;
}

function isLikelyGreenSkinPixel(r: number, g: number, b: number): boolean {
  if (isLikelySaberOrGlowPixel(r, g, b)) return false;

  const { h, s, v } = rgbToHsv(r, g, b);
  const lab = rgbToLab(r, g, b);

  const greenHue = h >= 48 && h <= 145;
  const saturatedEnough = s >= 0.18;
  const visibleEnough = v >= 0.16;
  const greenLabBias = lab.a <= -3 || lab.b >= 8;
  const notGrayRobe = s >= 0.28 || (lab.a <= -8 && lab.l >= 22);

  return greenHue && saturatedEnough && visibleEnough && greenLabBias && notGrayRobe;
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

function weightedDistanceForGreenSkin(
  pixelLab: LAB,
  entry: PaletteLabEntry,
): number {
  let d = labDistance(pixelLab, entry.lab);
  const family = entry.color.family;
  const isDeepShadow = pixelLab.l <= 25;

  if (family === "green") {
    d *= 0.58;
  }

  if (family === "yellow") {
    d *= pixelLab.l >= 45 ? 0.82 : 1.05;
  }

  if (family === "neutral") {
    if (isDeepShadow && entry.lab.l <= 32) {
      d *= 0.85;
    } else {
      d += pixelLab.l > 25 ? 32 : 12;
    }
  }

  if (family === "brown") {
    d += pixelLab.l > 25 ? 38 : 16;
  }

  if (
    family === "red" ||
    family === "orange" ||
    family === "skin" ||
    family === "metallic"
  ) {
    d += pixelLab.l > 25 ? 34 : 14;
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

function findNearestPaletteEntryWeightedForGreenSkin(
  pixelLab: LAB,
  activePalette: PaletteLabEntry[],
): PaletteLabEntry {
  let minDist = Infinity;
  let best = activePalette[0];

  for (const entry of activePalette) {
    const d = weightedDistanceForGreenSkin(pixelLab, entry);
    if (d < minDist) {
      minDist = d;
      best = entry;
    }
  }

  return best;
}

function findNearestGreenFaceReplacement(
  pixelLab: LAB,
  activePalette: PaletteLabEntry[],
): PaletteLabEntry | null {
  let minDist = Infinity;
  let best: PaletteLabEntry | null = null;
  const allowYellow = pixelLab.l >= 42;

  for (const entry of activePalette) {
    const family = entry.color.family;
    if (family !== "green" && !(allowYellow && family === "yellow")) continue;

    let d = labDistance(pixelLab, entry.lab);
    if (pixelLab.l <= 35 && entry.color.name === "Dark Green") {
      d *= 0.7;
    }

    if (d < minDist) {
      minDist = d;
      best = entry;
    }
  }

  return best;
}

function remapGreenFaceInfluencePixels(
  pixels: number[],
  img: any,
  width: number,
  height: number,
  palette: PaletteLabEntry[],
  greenFaceInfluenceMask: boolean[],
): number[] {
  const result = [...pixels];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (!greenFaceInfluenceMask[idx]) continue;

      const currentEntry = palette.find((entry) => entry.index === result[idx]);
      if (!currentEntry) continue;

      const bucket = paletteFaceFamilyBucket(currentEntry);
      if (bucket !== "gray" && bucket !== "brown" && bucket !== "black") continue;

      const { r, g, b } = getPixelRgbFromJimp(img, x, y);
      const sourceLab = rgbToLab(r, g, b);
      if (bucket === "black" && sourceLab.l <= 22) continue;

      const replacement = findNearestGreenFaceReplacement(sourceLab, palette);
      if (replacement) {
        result[idx] = replacement.index;
      }
    }
  }

  return result;
}

function isGlowFamily(entry: PaletteLabEntry): boolean {
  return entry.color.family === "blue" || entry.color.family === "cyan";
}

function glowContainmentPenalty(
  pixelLab: LAB,
  entry: PaletteLabEntry,
  glowPenalty: number,
): number {
  const entryChroma = Math.sqrt(
    entry.lab.a * entry.lab.a + entry.lab.b * entry.lab.b,
  );

  if (entryChroma <= 40 || !isGlowFamily(entry)) {
    return 0;
  }

  const pixelChroma = Math.sqrt(
    pixelLab.a * pixelLab.a + pixelLab.b * pixelLab.b,
  );

  const entryIsMuchBrighter = entry.lab.l > pixelLab.l + 6;

  // More negative b means bluer in Lab.
  const pixelIsClearlyBlue = pixelLab.b < -18 || (pixelLab.b < -10 && pixelChroma > 26);

  if (!entryIsMuchBrighter || pixelIsClearlyBlue) {
    return 0;
  }

  // Strongest protection when the source pixel is not very saturated
  // and not already meaningfully blue.
  let penalty = glowPenalty;

  if (pixelChroma < 18) {
    penalty += glowPenalty * 0.8;
  } else if (pixelChroma < 28) {
    penalty += glowPenalty * 0.35;
  }

  if (pixelLab.b > -6) {
    penalty += glowPenalty * 0.5;
  }

  return penalty;
}

function findNearestColorIndexFamilyAware(
  r: number,
  g: number,
  b: number,
  activePalette: PaletteLabEntry[],
  tuning: ModeTuning,
): number {
  const pixelLab = rgbToLab(r, g, b);

  if (isLikelySkinPixel(r, g, b)) {
    return findNearestPaletteEntryWeightedForSkin(pixelLab, activePalette).index;
  }

  if (isLikelyGreenSkinPixel(r, g, b)) {
    return findNearestPaletteEntryWeightedForGreenSkin(
      pixelLab,
      activePalette,
    ).index;
  }

  let minDist = Infinity;
  let best = activePalette[0];

  for (const entry of activePalette) {
    let d = labDistance(pixelLab, entry.lab);

    d += glowContainmentPenalty(pixelLab, entry, tuning.glowPenalty);

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
      if (isLikelySkinPixel(r, g, b) || isLikelyGreenSkinPixel(r, g, b)) {
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

function getAverageNeighborPaletteDistance(
  pixelIndex: number,
  neighborIndexes: number[],
  pixels: number[],
  palette: PaletteLabEntry[],
): number {
  const centerEntry = palette.find((entry) => entry.index === pixelIndex);
  if (!centerEntry || neighborIndexes.length === 0) {
    return 0;
  }

  let total = 0;
  let count = 0;

  for (const neighborIdx of neighborIndexes) {
    const neighborColorIndex = pixels[neighborIdx];
    const neighborEntry = palette.find((entry) => entry.index === neighborColorIndex);
    if (!neighborEntry) continue;

    total += labDistance(centerEntry.lab, neighborEntry.lab);
    count++;
  }

  return count > 0 ? total / count : 0;
}

function applyAdaptiveSmoothing(
  pixels: number[],
  width: number,
  height: number,
  palette: PaletteLabEntry[],
  edgeMask: boolean[],
  skinMask: boolean[],
  faceFeatureMask: boolean[],
  tuning: ModeTuning,
): number[] {
  const result = [...pixels];

  for (let pass = 0; pass < tuning.smoothingPasses; pass++) {
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

        const currentColor = result[idx];
        if (majorityColor === currentColor) continue;

        const currentCount = counts.get(currentColor) ?? 0;
        const isSkinArea = skinMask[idx];

        const averageDistanceToNeighbors = getAverageNeighborPaletteDistance(
          currentColor,
          neighbors,
          result,
          palette,
        );

        if (averageDistanceToNeighbors <= tuning.outlierDistanceThreshold) {
          continue;
        }

        if (!isSkinArea) {
          if (
            majorityCount >= tuning.nonSkinMajorityThreshold &&
            majorityCount >= currentCount + tuning.nonSkinLeadRequired
          ) {
            next[idx] = majorityColor;
            changed = true;
          }
          continue;
        }

        if (
          majorityCount >= tuning.skinMajorityThreshold &&
          majorityCount >= currentCount + tuning.skinLeadRequired
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

function isRobeBackgroundFamily(entry: PaletteLabEntry): boolean {
  return (
    entry.color.family === "neutral" ||
    entry.color.family === "skin" ||
    entry.color.family === "brown" ||
    entry.color.family === "orange" ||
    entry.color.family === "green"
  );
}

function isRobeGreenContamination(entry: PaletteLabEntry): boolean {
  return [
    "Dark Green",
    "Olive Green",
    "Sand Green",
    "Yellowish Green",
    "Green",
    "Bright Green",
  ].includes(entry.color.name);
}

function isRobeNeutralTarget(entry: PaletteLabEntry): boolean {
  return ["Dark Brown", "Dark Bluish Gray", "Black Grey"].includes(
    entry.color.name,
  );
}

function isSourceGlowPixel(r: number, g: number, b: number): boolean {
  const { h, s, v } = rgbToHsv(r, g, b);
  const lab = rgbToLab(r, g, b);

  const brightCore = lab.l >= 74 && lab.b <= -3 && b >= r - 20 && g >= r - 24;
  const blueGlow = h >= 175 && h <= 225 && s >= 0.24 && v >= 0.42 && b > r + 10;
  const greenGlow =
    h >= 75 && h <= 145 && s >= 0.42 && v >= 0.68 && g > r + 24 && g > b + 12;

  return brightCore || blueGlow || greenGlow;
}

function hasAdjacentProtectedSource(
  img: any,
  x: number,
  y: number,
  width: number,
  height: number,
  skinMask: boolean[],
): boolean {
  for (const neighbor of getNeighborIndexes(x, y, width, height)) {
    if (skinMask[neighbor]) return true;

    const nx = neighbor % width;
    const ny = Math.floor(neighbor / width);
    const { r, g, b } = getPixelRgbFromJimp(img, nx, ny);
    if (isSourceGlowPixel(r, g, b)) {
      return true;
    }
  }

  return false;
}

function findNearestRobeNeutralTarget(
  currentEntry: PaletteLabEntry,
  palette: PaletteLabEntry[],
): number | null {
  let bestIndex: number | null = null;
  let bestDistance = Infinity;

  for (const entry of palette) {
    if (!isRobeNeutralTarget(entry)) continue;

    const distance = labDistance(currentEntry.lab, entry.lab);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = entry.index;
    }
  }

  return bestIndex;
}

function consolidateRobeBackgroundColors(
  pixels: number[],
  width: number,
  height: number,
  palette: PaletteLabEntry[],
  img: any,
  edgeMask: boolean[],
  skinMask: boolean[],
  faceFeatureMask: boolean[],
): number[] {
  const result = [...pixels];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (edgeMask[idx] || skinMask[idx] || faceFeatureMask[idx]) continue;

      const currentEntry = palette.find((entry) => entry.index === result[idx]);
      if (!currentEntry || !isRobeBackgroundFamily(currentEntry)) continue;

      const neighbors = getNeighborIndexes(x, y, width, height);
      let sameNeighbors = 0;
      const counts = new Map<number, number>();
      const robeNeutralCounts = new Map<number, number>();

      for (const neighbor of neighbors) {
        if (edgeMask[neighbor] || skinMask[neighbor] || faceFeatureMask[neighbor]) {
          continue;
        }

        const neighborColor = result[neighbor];
        if (neighborColor === result[idx]) sameNeighbors++;

        const neighborEntry = palette.find((entry) => entry.index === neighborColor);
        if (!neighborEntry || !isRobeBackgroundFamily(neighborEntry)) continue;
        counts.set(neighborColor, (counts.get(neighborColor) ?? 0) + 1);

        if (isRobeNeutralTarget(neighborEntry)) {
          robeNeutralCounts.set(
            neighborColor,
            (robeNeutralCounts.get(neighborColor) ?? 0) + 1,
          );
        }
      }

      if (
        isRobeGreenContamination(currentEntry) &&
        !hasAdjacentProtectedSource(img, x, y, width, height, skinMask)
      ) {
        let replacement = findNearestRobeNeutralTarget(currentEntry, palette);
        let bestNeutralCount = 0;

        for (const [color, count] of robeNeutralCounts.entries()) {
          if (count > bestNeutralCount) {
            replacement = color;
            bestNeutralCount = count;
          }
        }

        if (replacement !== null) {
          result[idx] = replacement;
          continue;
        }
      }

      let bestColor = result[idx];
      let bestCount = 0;
      for (const [color, count] of counts.entries()) {
        if (count > bestCount) {
          bestColor = color;
          bestCount = count;
        }
      }

      const bestEntry = palette.find((entry) => entry.index === bestColor);
      if (!bestEntry) continue;

      const maxDistance = sameNeighbors <= 1 ? 18 : 10;
      const requiredNeighborVotes = sameNeighbors <= 1 ? 3 : 5;

      if (bestColor === result[idx] || bestCount < requiredNeighborVotes) continue;
      if (labDistance(currentEntry.lab, bestEntry.lab) > maxDistance) continue;

      result[idx] = bestColor;
    }
  }

  return result;
}

function diffuseError(
  imgLabs: LAB[],
  width: number,
  height: number,
  x: number,
  y: number,
  original: LAB,
  mapped: LAB,
  strength: number,
) {
  const error = {
    l: (original.l - mapped.l) * strength,
    a: (original.a - mapped.a) * strength,
    b: (original.b - mapped.b) * strength,
  };

  const spread = [
    { dx: 1, dy: 0, factor: 7 / 16 },
    { dx: -1, dy: 1, factor: 3 / 16 },
    { dx: 0, dy: 1, factor: 5 / 16 },
    { dx: 1, dy: 1, factor: 1 / 16 },
  ];

  for (const { dx, dy, factor } of spread) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;

    const idx = ny * width + nx;
    imgLabs[idx] = {
      l: imgLabs[idx].l + error.l * factor,
      a: imgLabs[idx].a + error.a * factor,
      b: imgLabs[idx].b + error.b * factor,
    };
  }
}

function quantizeWithDithering(
  img: any,
  width: number,
  height: number,
  palette: PaletteLabEntry[],
  tuning: ModeTuning,
  mode: "detail" | "balanced" | "clean",
): number[] {
  const pixels: number[] = new Array(width * height);
  const labs: LAB[] = new Array(width * height);
  const sourceRgbs: Array<{ r: number; g: number; b: number }> = new Array(
    width * height,
  );

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const { r, g, b } = getPixelRgbFromJimp(img, x, y);
      sourceRgbs[y * width + x] = { r, g, b };
      labs[y * width + x] = rgbToLab(r, g, b);
    }
  }

  const ditherStrength =
    mode === "detail" ? 0.25 :
    mode === "balanced" ? 0.12 :
    0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const lab = labs[idx];

      const mappedIndex = findNearestColorIndexFamilyAwareLab(
        lab,
        palette,
        tuning,
        sourceRgbs[idx],
      );

      pixels[idx] = mappedIndex;

      if (ditherStrength > 0) {
        const mappedEntry = palette.find((entry) => entry.index === mappedIndex);
        if (mappedEntry) {
          diffuseError(
            labs,
            width,
            height,
            x,
            y,
            lab,
            mappedEntry.lab,
            ditherStrength,
          );
        }
      }
    }
  }

  return pixels;
}

function findNearestColorIndexFamilyAwareLab(
  pixelLab: LAB,
  activePalette: PaletteLabEntry[],
  tuning: ModeTuning,
  sourceRgb?: { r: number; g: number; b: number },
): number {
  if (
    sourceRgb &&
    isLikelyGreenSkinPixel(sourceRgb.r, sourceRgb.g, sourceRgb.b)
  ) {
    return findNearestPaletteEntryWeightedForGreenSkin(
      pixelLab,
      activePalette,
    ).index;
  }

  let minDist = Infinity;
  let best = activePalette[0];

  for (const entry of activePalette) {
    let d = labDistance(pixelLab, entry.lab);

    d += glowContainmentPenalty(pixelLab, entry, tuning.glowPenalty);

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

function findBestReplacementIndex(
  removedIdx: number,
  surviving: PaletteLabEntry[],
  fullPalette: PaletteLabEntry[],
): number {
  const removedEntry = fullPalette.find((entry) => entry.index === removedIdx);
  if (!removedEntry) return removedIdx;

  const compatibleFamilies =
    FAMILY_COMPATIBILITY[removedEntry.color.family] ?? [removedEntry.color.family];

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
    FAMILY_COMPATIBILITY[removedEntry.color.family] ?? [removedEntry.color.family];

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

        if (protectEdges && faceFeatureMask[idx]) {
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

  const mode = options.mode ?? "balanced";
  const tuning = MODE_TUNING[mode];

  const quantizedPixels = quantizeWithDithering(
    img,
    targetW,
    targetH,
    activePalette,
    tuning,
    mode,
  );

  const colorCountsBefore = cloneCounts(countColors(quantizedPixels));
  const protectEdges = options.protectEdges ?? true;

  const edgeMask = protectEdges
    ? buildEdgeProtectionMask(img, targetW, targetH)
    : new Array<boolean>(targetW * targetH).fill(false);

  const skinMask = protectEdges
    ? buildSkinProtectionMask(img, targetW, targetH)
    : new Array<boolean>(targetW * targetH).fill(false);

  const greenSkinMask = protectEdges
    ? buildGreenSkinMask(img, targetW, targetH)
    : new Array<boolean>(targetW * targetH).fill(false);

  const faceFeatureMask = protectEdges
    ? buildFaceFeatureMask(img, targetW, targetH, skinMask)
    : new Array<boolean>(targetW * targetH).fill(false);

  const greenFaceInfluenceMask = protectEdges
    ? buildGreenFaceInfluenceMask(
        img,
        targetW,
        targetH,
        greenSkinMask,
        faceFeatureMask,
      )
    : new Array<boolean>(targetW * targetH).fill(false);

  const faceRemappedPixels = remapGreenFaceInfluencePixels(
    quantizedPixels,
    img,
    targetW,
    targetH,
    activePalette,
    greenFaceInfluenceMask,
  );

  console.log("MODE_USED", mode);
  console.log("THRESHOLD_USED", threshold);
  console.log("COLOR_COUNTS_BEFORE", Object.fromEntries(colorCountsBefore));
  console.log("PROTECT_EDGES", protectEdges);
  logFaceColorDiagnostics(
    "after_quantization",
    faceRemappedPixels,
    activePalette,
    skinMask,
    faceFeatureMask,
    greenSkinMask,
  );

  const smoothedPixels = applyAdaptiveSmoothing(
    faceRemappedPixels,
    targetW,
    targetH,
    activePalette,
    edgeMask,
    skinMask,
    faceFeatureMask,
    tuning,
  );
  logFaceColorDiagnostics(
    "after_adaptive_smoothing",
    smoothedPixels,
    activePalette,
    skinMask,
    faceFeatureMask,
    greenSkinMask,
  );

  const thresholdedPixels = applyThreshold(
    smoothedPixels,
    threshold,
    activePalette,
    targetW,
    targetH,
    protectEdges,
    edgeMask,
    faceFeatureMask,
  );
  logFaceColorDiagnostics(
    "after_threshold",
    thresholdedPixels,
    activePalette,
    skinMask,
    faceFeatureMask,
    greenSkinMask,
  );

  const finalPixels = consolidateRobeBackgroundColors(
    thresholdedPixels,
    targetW,
    targetH,
    activePalette,
    img,
    edgeMask,
    skinMask,
    faceFeatureMask,
  );
  logFaceColorDiagnostics(
    "after_robe_background_consolidation",
    finalPixels,
    activePalette,
    skinMask,
    faceFeatureMask,
    greenSkinMask,
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
