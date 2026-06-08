import { PALETTE, type PaletteColor } from "@/lib/palette";
import { hexToRgb, labDistance, rgbToLab } from "./colorMath";
import type { Matrix, SourceColorCluster, LegoMatrix } from "./types";

export type ColorMapping = Record<string, string>;

const paletteLab = PALETTE.map((color) => ({
  color,
  lab: rgbToLab(hexToRgb(color.hex)),
}));

export function nearestPaletteColor(
  rgb: { r: number; g: number; b: number },
  palette: PaletteColor[] = PALETTE.filter((color) => color.enabled),
): PaletteColor {
  const pixelLab = rgbToLab(rgb);
  let best = palette[0] ?? PALETTE[0];
  let bestDistance = Infinity;

  for (const color of palette) {
    const cachedLab =
      paletteLab.find((entry) => entry.color.code === color.code)?.lab ??
      rgbToLab(hexToRgb(color.hex));
    const distance = labDistance(pixelLab, cachedLab);

    if (distance < bestDistance) {
      bestDistance = distance;
      best = color;
    }
  }

  return best;
}

export function createDefaultColorMapping(
  clusters: SourceColorCluster[],
): ColorMapping {
  const enabledPalette = PALETTE.filter((color) => color.enabled);
  return Object.fromEntries(
    clusters.map((cluster) => [
      cluster.id,
      nearestPaletteColor(cluster.rgb, enabledPalette).code,
    ]),
  );
}

export function buildMappedMatrix(
  clusterMatrix: Matrix<string>,
  mapping: ColorMapping,
): LegoMatrix {
  const paletteByCode = new Map(PALETTE.map((color) => [color.code, color]));
  const fallback = PALETTE.find((color) => color.name === "Black") ?? PALETTE[0];

  return {
    width: clusterMatrix.width,
    height: clusterMatrix.height,
    cells: clusterMatrix.cells.map(
      (clusterId) => paletteByCode.get(mapping[clusterId]) ?? fallback,
    ),
  };
}

