import { rgbDistance } from "./colorMath";
import type { ClusterResult, Matrix, Rgb, SourceColorCluster } from "./types";

type MutableCluster = SourceColorCluster & {
  totalR: number;
  totalG: number;
  totalB: number;
};

export function clusterSourceColors(
  matrix: Matrix<Rgb>,
  threshold = 18,
): ClusterResult {
  const clusters: MutableCluster[] = [];
  const clusterIds: string[] = [];

  for (const rgb of matrix.cells) {
    let bestCluster: MutableCluster | null = null;
    let bestDistance = Infinity;

    for (const cluster of clusters) {
      const distance = rgbDistance(rgb, cluster.rgb);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestCluster = cluster;
      }
    }

    if (!bestCluster || bestDistance > threshold) {
      const id = `source-${clusters.length + 1}`;
      bestCluster = {
        id,
        rgb: { ...rgb },
        count: 0,
        totalR: 0,
        totalG: 0,
        totalB: 0,
      };
      clusters.push(bestCluster);
    }

    bestCluster.count += 1;
    bestCluster.totalR += rgb.r;
    bestCluster.totalG += rgb.g;
    bestCluster.totalB += rgb.b;
    bestCluster.rgb = {
      r: Math.round(bestCluster.totalR / bestCluster.count),
      g: Math.round(bestCluster.totalG / bestCluster.count),
      b: Math.round(bestCluster.totalB / bestCluster.count),
    };
    clusterIds.push(bestCluster.id);
  }

  return {
    clusters: clusters
      .map(({ totalR, totalG, totalB, ...cluster }) => cluster)
      .sort((a, b) => b.count - a.count),
    clusterMatrix: {
      width: matrix.width,
      height: matrix.height,
      cells: clusterIds,
    },
  };
}

