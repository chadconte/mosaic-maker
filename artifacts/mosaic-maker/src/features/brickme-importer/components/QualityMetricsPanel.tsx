import { BarChart3 } from "lucide-react";
import type { ColorCount } from "../utils/exportCsv";
import type { ExtractionMode } from "../utils/types";

type QualityMetricsPanelProps = {
  sourceWidth: number;
  sourceHeight: number;
  targetWidth: number;
  targetHeight: number;
  sourceColorCount: number;
  rawSampledColorCount: number;
  extractedClusterCount: number;
  mappedColorCount: number;
  totalStuds: number;
  largestCluster: number;
  smallestCluster: number;
  under10: number;
  under25: number;
  under50: number;
  extractionMode: ExtractionMode;
  preserveSmallClusters: boolean;
  autoMerge: boolean;
  topColors: ColorCount[];
  tinyClusters: Array<{ id: string; count: number; hex: string }>;
  onTinyClusterSelect?: (clusterId: string) => void;
  onMappedColorSelect?: (legoCode: string) => void;
};

export function QualityMetricsPanel({
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight,
  sourceColorCount,
  rawSampledColorCount,
  extractedClusterCount,
  mappedColorCount,
  totalStuds,
  largestCluster,
  smallestCluster,
  under10,
  under25,
  under50,
  extractionMode,
  preserveSmallClusters,
  autoMerge,
  topColors,
  tinyClusters,
  onTinyClusterSelect,
  onMappedColorSelect,
}: QualityMetricsPanelProps) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">Extraction Metrics</h2>
          <p className="text-sm text-muted-foreground">
            Quick checks for source detail and palette mapping.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <Metric label="Extraction mode" value={extractionMode} />
        <Metric label="Source studs" value={`${sourceWidth}x${sourceHeight}`} />
        <Metric label="Target studs" value={`${targetWidth}x${targetHeight}`} />
        <Metric label="Fixed color target" value={sourceColorCount} />
        <Metric label="Raw sampled colors" value={rawSampledColorCount || "-"} />
        <Metric label="Extracted clusters" value={extractedClusterCount || "-"} />
        <Metric label="Mapped LEGO colors" value={mappedColorCount || "-"} />
        <Metric label="Total studs" value={totalStuds.toLocaleString()} />
        <Metric label="Largest cluster" value={largestCluster || "-"} />
        <Metric label="Smallest cluster" value={smallestCluster || "-"} />
        <Metric label="Under 10 studs" value={under10} />
        <Metric label="Under 25 studs" value={under25} />
        <Metric label="Under 50 studs" value={under50} />
        <Metric
          label="Small clusters"
          value={preserveSmallClusters ? "Preserved" : "Not preserved"}
        />
        <Metric label="Auto merge" value={autoMerge ? "On" : "Off"} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold">Top mapped colors</h3>
          <div className="space-y-1">
            {topColors.slice(0, 8).map((color) => (
              <button
                type="button"
                key={color.code}
                onClick={() => onMappedColorSelect?.(color.code)}
                className="flex w-full items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2 text-left text-sm hover:bg-zinc-100"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-4 w-4 rounded border border-black/10"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="truncate">{color.name}</span>
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {color.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Tiny source clusters</h3>
          <div className="space-y-1">
            {tinyClusters.length ? (
              tinyClusters.slice(0, 20).map((cluster) => (
                <button
                  type="button"
                  key={cluster.id}
                  onClick={() => onTinyClusterSelect?.(cluster.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2 text-left text-sm hover:bg-zinc-100"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-4 w-4 rounded border border-black/10"
                      style={{ backgroundColor: cluster.hex }}
                    />
                    {cluster.id}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {cluster.count}
                  </span>
                </button>
              ))
            ) : (
              <div className="rounded-lg bg-zinc-50 px-3 py-2 text-sm text-muted-foreground">
                No clusters under 50 studs.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-zinc-50 px-3 py-2">
      <div className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-lg font-bold text-foreground">{value}</div>
    </div>
  );
}
