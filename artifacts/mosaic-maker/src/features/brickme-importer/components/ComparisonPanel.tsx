import { Columns3, Layers, ScanSearch } from "lucide-react";
import type { ReactNode } from "react";
import type { FidelityMetrics } from "../utils/fidelityMetrics";
import type { Matrix } from "../utils/types";

type ComparisonMode = "side-by-side" | "overlay";

type ComparisonPanelProps<TSource, TMapped> = {
  croppedDataUrl: string | null;
  sourceMatrix: Matrix<TSource> | null;
  mappedMatrix: Matrix<TMapped> | null;
  sourceColorOf: (cell: TSource) => string;
  mappedColorOf: (cell: TMapped) => string;
  comparisonMode: ComparisonMode;
  overlayFade: number;
  zoom: number;
  fidelityMetrics: FidelityMetrics | null;
  onComparisonModeChange: (value: ComparisonMode) => void;
  onOverlayFadeChange: (value: number) => void;
  onZoomChange: (value: number) => void;
};

export function ComparisonPanel<TSource, TMapped>({
  croppedDataUrl,
  sourceMatrix,
  mappedMatrix,
  sourceColorOf,
  mappedColorOf,
  comparisonMode,
  overlayFade,
  zoom,
  fidelityMetrics,
  onComparisonModeChange,
  onOverlayFadeChange,
  onZoomChange,
}: ComparisonPanelProps<TSource, TMapped>) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-2">
          <ScanSearch className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Extraction Comparison</h2>
            <p className="text-sm text-muted-foreground">
              Compare the cropped BrickMe source against extracted and mapped previews.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onComparisonModeChange("side-by-side")}
            className={buttonClass(comparisonMode === "side-by-side")}
          >
            <Columns3 className="h-4 w-4" />
            Side by side
          </button>
          <button
            type="button"
            onClick={() => onComparisonModeChange("overlay")}
            className={buttonClass(comparisonMode === "overlay")}
          >
            <Layers className="h-4 w-4" />
            Overlay
          </button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_220px]">
        {fidelityMetrics ? (
          <div className="grid gap-2 rounded-xl border border-border bg-zinc-50 p-3 text-sm sm:grid-cols-4">
            <Metric label="Mean RGB" value={fidelityMetrics.meanRgbDifference.toFixed(1)} />
            <Metric label="Mean LAB" value={fidelityMetrics.meanLabDifference.toFixed(1)} />
            <Metric label="Matching" value={`${fidelityMetrics.percentMatchingPixels.toFixed(1)}%`} />
            <Metric label="Fidelity" value={fidelityMetrics.overallScore.toFixed(1)} />
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-zinc-50 px-3 py-3 text-sm text-muted-foreground">
            Fidelity metrics appear after extraction.
          </div>
        )}

        <label className="rounded-xl border border-border bg-zinc-50 px-3 py-2">
          <span className="text-sm font-semibold text-foreground">
            Synced zoom
          </span>
          <input
            type="range"
            min={100}
            max={500}
            value={zoom}
            onChange={(event) => onZoomChange(Number(event.target.value))}
            className="mt-2 w-full accent-primary"
          />
        </label>
      </div>

      {comparisonMode === "overlay" ? (
        <div className="space-y-3">
        </div>
      ) : null}

      {comparisonMode === "overlay" ? (
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-foreground">
              Original / extracted fade
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={overlayFade}
              onChange={(event) => onOverlayFadeChange(Number(event.target.value))}
              className="mt-2 w-full accent-primary"
            />
          </label>
          <div className="relative mx-auto max-w-[760px] overflow-auto rounded-xl border border-border bg-zinc-100">
            <div
              className="relative origin-top-left"
              style={{ width: `${zoom}%` }}
            >
            {croppedDataUrl ? (
              <img src={croppedDataUrl} alt="Original crop" className="block w-full" />
            ) : (
              <EmptyTile label="Original crop" />
            )}
            {sourceMatrix ? (
              <div
                className="absolute inset-0 grid"
                style={{
                  opacity: overlayFade / 100,
                  gridTemplateColumns: `repeat(${sourceMatrix.width}, minmax(0, 1fr))`,
                }}
              >
                {sourceMatrix.cells.map((cell, index) => (
                  <span
                    key={index}
                    className="block"
                    style={{ backgroundColor: sourceColorOf(cell) }}
                  />
                ))}
              </div>
            ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <PreviewTile title="Original cropped BrickMe">
            {croppedDataUrl ? (
              <img
                src={croppedDataUrl}
                alt="Original cropped BrickMe source"
                className="block object-contain"
                style={{ width: `${zoom}%` }}
              />
            ) : (
              <EmptyTile label="Original crop" />
            )}
          </PreviewTile>
          <PreviewTile title="Extracted Source Preview">
            {sourceMatrix ? (
              <MatrixTile
                matrix={sourceMatrix}
                colorOf={sourceColorOf}
                zoom={zoom}
              />
            ) : (
              <EmptyTile label="Extracted source" />
            )}
          </PreviewTile>
          <PreviewTile title="Mapped LEGO Preview">
            {mappedMatrix ? (
              <MatrixTile
                matrix={mappedMatrix}
                colorOf={mappedColorOf}
                zoom={zoom}
              />
            ) : (
              <EmptyTile label="Mapped LEGO" />
            )}
          </PreviewTile>
        </div>
      )}
    </section>
  );
}

function MatrixTile<T>({
  matrix,
  colorOf,
  zoom,
}: {
  matrix: Matrix<T>;
  colorOf: (cell: T) => string;
  zoom: number;
}) {
  return (
    <div
      className="grid"
      style={{
        width: "100%",
        minWidth: `${zoom}%`,
        aspectRatio: `${matrix.width} / ${matrix.height}`,
        gridTemplateColumns: `repeat(${matrix.width}, minmax(0, 1fr))`,
      }}
    >
      {matrix.cells.map((cell, index) => (
        <span
          key={index}
          className="block"
          style={{ backgroundColor: colorOf(cell) }}
        />
      ))}
    </div>
  );
}

function PreviewTile({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-zinc-50">
      <div className="border-b border-border bg-white px-3 py-2 text-sm font-semibold">
        {title}
      </div>
      <div className="flex min-h-[260px] items-start justify-start overflow-auto p-3">
        {children}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </div>
      <div className="font-mono text-sm font-semibold text-foreground">
        {value}
      </div>
    </div>
  );
}

function EmptyTile({ label }: { label: string }) {
  return (
    <div className="flex min-h-[180px] w-full items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function buttonClass(active: boolean): string {
  return [
    "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold",
    active
      ? "border-primary bg-primary/5 text-primary"
      : "border-border bg-white text-foreground hover:bg-zinc-50",
  ].join(" ");
}
