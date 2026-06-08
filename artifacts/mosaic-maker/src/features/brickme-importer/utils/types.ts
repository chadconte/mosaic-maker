import type { PaletteColor } from "@/lib/palette";

export type Rgb = {
  r: number;
  g: number;
  b: number;
};

export type Matrix<T> = {
  width: number;
  height: number;
  cells: T[];
};

export type SourceColorCluster = {
  id: string;
  rgb: Rgb;
  count: number;
  rawColorCount?: number;
  deleted?: boolean;
};

export type ClusterResult = {
  clusters: SourceColorCluster[];
  clusterMatrix: Matrix<string>;
};

export type LegoMatrix = Matrix<PaletteColor>;

export type ResizeMode = "stretch" | "cover-crop" | "contain-pad";

export type SamplingMethod = "median" | "mean" | "center";

export type ExtractionMode = "exact" | "auto" | "fixed";

export type FixedSourceColorCount = 12 | 16 | 20 | 24 | 32 | 48;

export type ExtractStudMatrixResult = {
  matrix: Matrix<Rgb>;
  croppedDataUrl: string;
  cropPixelWidth: number;
  cropPixelHeight: number;
};

export type SourcePaletteStats = {
  rawSampledColorCount: number;
  sourceClusterCount: number;
  largestCluster: number;
  smallestCluster: number;
  under10: number;
  under25: number;
  under50: number;
};
