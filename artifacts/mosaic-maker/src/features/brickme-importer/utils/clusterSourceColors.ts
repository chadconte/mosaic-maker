import { rgbDistance } from "./colorMath";
import type {
  ClusterResult,
  ExtractionMode,
  FixedSourceColorCount,
  Matrix,
  Rgb,
  SourceColorCluster,
  SourcePaletteStats,
} from "./types";

function averageRgb(values: Rgb[]): Rgb {
  if (values.length === 0) {
    return { r: 0, g: 0, b: 0 };
  }

  return {
    r: Math.round(values.reduce((sum, rgb) => sum + rgb.r, 0) / values.length),
    g: Math.round(values.reduce((sum, rgb) => sum + rgb.g, 0) / values.length),
    b: Math.round(values.reduce((sum, rgb) => sum + rgb.b, 0) / values.length),
  };
}

function luminance(rgb: Rgb): number {
  return rgb.r * 0.2126 + rgb.g * 0.7152 + rgb.b * 0.0722;
}

function rgbKey(rgb: Rgb): string {
  return `${rgb.r},${rgb.g},${rgb.b}`;
}

function initialCentroids(cells: Rgb[], count: number): Rgb[] {
  const sorted = [...cells].sort((a, b) => {
    const delta = luminance(a) - luminance(b);
    if (delta !== 0) return delta;
    if (a.r !== b.r) return a.r - b.r;
    if (a.g !== b.g) return a.g - b.g;
    return a.b - b.b;
  });
  const centroids: Rgb[] = [];

  for (let i = 0; i < count; i++) {
    const index = Math.floor(((i + 0.5) / count) * sorted.length);
    centroids.push({ ...sorted[Math.min(sorted.length - 1, index)] });
  }

  return centroids;
}

function nearestCentroidId(rgb: Rgb, centroids: Rgb[]): number {
  let bestIndex = 0;
  let bestDistance = Infinity;

  for (let i = 0; i < centroids.length; i++) {
    const distance = rgbDistance(rgb, centroids[i]);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = i;
    }
  }

  return bestIndex;
}

export function clusterSourceColors(matrix: Matrix<Rgb>, colorCount = 20): ClusterResult {
  const targetCount = Math.max(1, Math.min(colorCount, matrix.cells.length));
  let centroids = initialCentroids(matrix.cells, targetCount);

  for (let iteration = 0; iteration < 18; iteration++) {
    const buckets = Array.from({ length: targetCount }, () => [] as Rgb[]);

    for (const rgb of matrix.cells) {
      buckets[nearestCentroidId(rgb, centroids)].push(rgb);
    }

    const nextCentroids = buckets.map((bucket, index) =>
      bucket.length ? averageRgb(bucket) : centroids[index],
    );

    const moved = nextCentroids.some(
      (centroid, index) => rgbDistance(centroid, centroids[index]) > 0.5,
    );
    centroids = nextCentroids;

    if (!moved) {
      break;
    }
  }

  const clusterIds = matrix.cells.map(
    (rgb) => `source-${nearestCentroidId(rgb, centroids) + 1}`,
  );
  const counts = new Map<string, number>();

  for (const id of clusterIds) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return {
    clusters: centroids
      .map((rgb, index) => ({
        id: `source-${index + 1}`,
        rgb,
        count: counts.get(`source-${index + 1}`) ?? 0,
      }))
      .filter((cluster) => cluster.count > 0)
      .sort((a, b) => b.count - a.count),
    clusterMatrix: {
      width: matrix.width,
      height: matrix.height,
      cells: clusterIds,
    },
  };
}

export function extractExactSourceColors(matrix: Matrix<Rgb>): ClusterResult {
  const clusterByKey = new Map<string, SourceColorCluster>();
  const keyToId = new Map<string, string>();
  const clusterIds: string[] = [];

  for (const rgb of matrix.cells) {
    const key = rgbKey(rgb);
    let id = keyToId.get(key);

    if (!id) {
      id = `source-${keyToId.size + 1}`;
      keyToId.set(key, id);
      clusterByKey.set(key, {
        id,
        rgb,
        count: 0,
        rawColorCount: 1,
      });
    }

    const cluster = clusterByKey.get(key);
    if (cluster) {
      cluster.count += 1;
    }
    clusterIds.push(id);
  }

  return {
    clusters: Array.from(clusterByKey.values()).sort((a, b) => b.count - a.count),
    clusterMatrix: {
      width: matrix.width,
      height: matrix.height,
      cells: clusterIds,
    },
  };
}

function chooseAutoColorCount(matrix: Matrix<Rgb>): FixedSourceColorCount {
  const uniqueCount = new Set(matrix.cells.map(rgbKey)).size;
  const studs = matrix.cells.length;

  if (uniqueCount <= 12) return 12;
  if (uniqueCount <= 16) return 16;
  if (uniqueCount <= 24 || studs < 6000) return 24;
  if (uniqueCount <= 36) return 32;
  return 48;
}

export function recoverSourcePalette(
  matrix: Matrix<Rgb>,
  mode: ExtractionMode,
  fixedCount: FixedSourceColorCount,
): ClusterResult {
  if (mode === "exact") {
    return extractExactSourceColors(matrix);
  }

  const count = mode === "auto" ? chooseAutoColorCount(matrix) : fixedCount;
  return clusterSourceColors(matrix, count);
}

export function mergeSourceClusters(
  result: ClusterResult,
  fromId: string,
  toId: string,
): ClusterResult {
  if (fromId === toId) return result;

  const cells = result.clusterMatrix.cells.map((id) => (id === fromId ? toId : id));
  const clusterById = new Map(result.clusters.map((cluster) => [cluster.id, cluster]));
  const counts = new Map<string, number>();

  for (const id of cells) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return {
    clusters: result.clusters
      .filter((cluster) => cluster.id !== fromId)
      .map((cluster) => ({
        ...cluster,
        count: counts.get(cluster.id) ?? 0,
        rgb: clusterById.get(cluster.id)?.rgb ?? cluster.rgb,
      }))
      .filter((cluster) => cluster.count > 0)
      .sort((a, b) => b.count - a.count),
    clusterMatrix: {
      ...result.clusterMatrix,
      cells,
    },
  };
}

export function deleteSourceCluster(
  result: ClusterResult,
  clusterId: string,
): ClusterResult {
  const remaining = result.clusters.filter((cluster) => cluster.id !== clusterId);
  if (remaining.length === 0) return result;

  const deleted = result.clusters.find((cluster) => cluster.id === clusterId);
  const cells = result.clusterMatrix.cells.map((id) => {
    if (id !== clusterId || !deleted) return id;
    let nearest = remaining[0];
    let nearestDistance = Infinity;

    for (const candidate of remaining) {
      const distance = rgbDistance(deleted.rgb, candidate.rgb);
      if (distance < nearestDistance) {
        nearest = candidate;
        nearestDistance = distance;
      }
    }

    return nearest.id;
  });
  const counts = new Map<string, number>();

  for (const id of cells) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return {
    clusters: remaining
      .map((cluster) => ({ ...cluster, count: counts.get(cluster.id) ?? 0 }))
      .filter((cluster) => cluster.count > 0)
      .sort((a, b) => b.count - a.count),
    clusterMatrix: {
      ...result.clusterMatrix,
      cells,
    },
  };
}

export function getSourcePaletteStats(
  rawMatrix: Matrix<Rgb> | null,
  result: ClusterResult | null,
): SourcePaletteStats {
  const counts = result?.clusters.map((cluster) => cluster.count) ?? [];
  return {
    rawSampledColorCount: rawMatrix
      ? new Set(rawMatrix.cells.map(rgbKey)).size
      : 0,
    sourceClusterCount: result?.clusters.length ?? 0,
    largestCluster: counts.length ? Math.max(...counts) : 0,
    smallestCluster: counts.length ? Math.min(...counts) : 0,
    under10: counts.filter((count) => count < 10).length,
    under25: counts.filter((count) => count < 25).length,
    under50: counts.filter((count) => count < 50).length,
  };
}
