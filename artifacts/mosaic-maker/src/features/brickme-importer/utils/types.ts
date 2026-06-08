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
};

export type ClusterResult = {
  clusters: SourceColorCluster[];
  clusterMatrix: Matrix<string>;
};

export type LegoMatrix = Matrix<PaletteColor>;

export type ResizeMode = "stretch" | "cover-crop" | "contain-pad";

