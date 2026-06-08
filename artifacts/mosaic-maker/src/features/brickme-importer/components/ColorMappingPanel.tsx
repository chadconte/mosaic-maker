import { Download, Lock, Palette, RotateCcw, Unlock, Upload } from "lucide-react";
import type { ReactNode } from "react";
import { PALETTE } from "@/lib/palette";
import { hexToRgb, labDistance, rgbToHex, rgbToLab } from "../utils/colorMath";
import { nearestPaletteColor } from "../utils/mapToLegoPalette";
import type { ColorMapping } from "../utils/mapToLegoPalette";
import type { SourceColorCluster } from "../utils/types";

export type SourcePaletteSort =
  | "count-desc"
  | "hue"
  | "distance-desc"
  | "mapped-lego";

export type SourcePaletteView = "all" | "grouped";

export type MappingExportPayload = {
  version: 1;
  sourceDimensions: { width: number; height: number };
  targetDimensions: { width: number; height: number };
  clusters: Array<{
    id: string;
    rgb: { r: number; g: number; b: number };
    hex: string;
    count: number;
    mappedLegoCode: string;
    locked: boolean;
  }>;
  mergeHistory: Array<{ fromId: string; toId: string; count: number }>;
};

type ColorMappingPanelProps = {
  clusters: SourceColorCluster[];
  mapping: ColorMapping;
  lockedMappings: Record<string, boolean>;
  minVisibleCount: number;
  selectedClusterIds: string[];
  highlightedClusterId: string | null;
  highlightedLegoCode: string | null;
  sortMode: SourcePaletteSort;
  viewMode: SourcePaletteView;
  changedStudCount: number | null;
  canRestore: boolean;
  canUndoMerge: boolean;
  sourceDimensions: { width: number; height: number };
  targetDimensions: { width: number; height: number };
  mergeHistory: Array<{ fromId: string; toId: string; count: number }>;
  onMinVisibleCountChange: (value: number) => void;
  onSelectedClusterIdsChange: (value: string[]) => void;
  onMappingChange: (clusterId: string, paletteCode: string) => void;
  onToggleLock: (clusterId: string) => void;
  onLockAll: () => void;
  onUnlockAll: () => void;
  onResetClusterMapping: (clusterId: string) => void;
  onResetAllMappings: () => void;
  onAutoMapUnlocked: () => void;
  onMergeCluster: (fromId: string, toId: string) => void;
  onMergeSelectedClusters: (toId: string) => void;
  onDeleteCluster: (clusterId: string) => void;
  onRestoreClusters: () => void;
  onUndoMerge: () => void;
  onResetMerges: () => void;
  onSortModeChange: (value: SourcePaletteSort) => void;
  onViewModeChange: (value: SourcePaletteView) => void;
  onHighlightCluster: (clusterId: string | null) => void;
  onHighlightLegoColor: (legoCode: string | null) => void;
  onImportMapping: (payload: MappingExportPayload) => void;
};

export function ColorMappingPanel({
  clusters,
  mapping,
  lockedMappings,
  minVisibleCount,
  selectedClusterIds,
  highlightedClusterId,
  highlightedLegoCode,
  sortMode,
  viewMode,
  changedStudCount,
  canRestore,
  canUndoMerge,
  sourceDimensions,
  targetDimensions,
  mergeHistory,
  onMinVisibleCountChange,
  onSelectedClusterIdsChange,
  onMappingChange,
  onToggleLock,
  onLockAll,
  onUnlockAll,
  onResetClusterMapping,
  onResetAllMappings,
  onAutoMapUnlocked,
  onMergeCluster,
  onMergeSelectedClusters,
  onDeleteCluster,
  onRestoreClusters,
  onUndoMerge,
  onResetMerges,
  onSortModeChange,
  onViewModeChange,
  onHighlightCluster,
  onHighlightLegoColor,
  onImportMapping,
}: ColorMappingPanelProps) {
  const enabledPalette = PALETTE.filter((color) => color.enabled);
  const totalStuds = clusters.reduce((sum, cluster) => sum + cluster.count, 0);
  const visibleClusters = sortClusters(
    clusters.filter((cluster) => cluster.count >= minVisibleCount),
    mapping,
    sortMode,
  );
  const grouped = groupClustersByMappedColor(visibleClusters, mapping);

  const exportMapping = () => {
    const payload: MappingExportPayload = {
      version: 1,
      sourceDimensions,
      targetDimensions,
      mergeHistory,
      clusters: clusters.map((cluster) => ({
        id: cluster.id,
        rgb: cluster.rgb,
        hex: rgbToHex(cluster.rgb),
        count: cluster.count,
        mappedLegoCode: mapping[cluster.id] ?? "",
        locked: Boolean(lockedMappings[cluster.id]),
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "mosaic-adapter-source-palette-mapping.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importMapping = (file: File) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      try {
        const payload = JSON.parse(String(reader.result)) as MappingExportPayload;
        onImportMapping(payload);
      } catch {
        // Keep import failure non-destructive; the existing mapping remains active.
      }
    });
    reader.readAsText(file);
  };

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Source Palette Control</h2>
            <p className="text-sm text-muted-foreground">
              Inspect every source cluster before LEGO palette mapping.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        <ControlButton onClick={onResetAllMappings} label="Reset mappings" />
        <ControlButton onClick={onAutoMapUnlocked} label="Auto-map unlocked" />
        <ControlButton onClick={onLockAll} label="Lock all" icon={<Lock className="h-4 w-4" />} />
        <ControlButton onClick={onUnlockAll} label="Unlock all" icon={<Unlock className="h-4 w-4" />} />
        <ControlButton onClick={onUndoMerge} label="Undo merge" disabled={!canUndoMerge} />
        <ControlButton onClick={onResetMerges} label="Reset merges" disabled={!canRestore} />
        <ControlButton onClick={exportMapping} label="Export JSON" icon={<Download className="h-4 w-4" />} />
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-zinc-50">
          <Upload className="h-4 w-4" />
          Import JSON
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) importMapping(file);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      {changedStudCount !== null ? (
        <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary">
          Last change affects {changedStudCount.toLocaleString()} studs.
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-foreground">View</span>
          <select
            value={viewMode}
            onChange={(event) => onViewModeChange(event.target.value as SourcePaletteView)}
            className="mt-1 h-10 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-2"
          >
            <option value="all">All source clusters</option>
            <option value="grouped">Grouped by mapped LEGO color</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium text-foreground">Sort</span>
          <select
            value={sortMode}
            onChange={(event) => onSortModeChange(event.target.value as SourcePaletteSort)}
            className="mt-1 h-10 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-2"
          >
            <option value="count-desc">Stud count descending</option>
            <option value="hue">Hue / color family</option>
            <option value="distance-desc">LAB distance descending</option>
            <option value="mapped-lego">Mapped LEGO color</option>
          </select>
        </label>
      </div>

      <label className="mb-4 block">
        <span className="text-sm font-medium text-foreground">
          Hide colors under X studs
        </span>
        <input
          type="number"
          min={0}
          value={minVisibleCount}
          onChange={(event) => onMinVisibleCountChange(Number(event.target.value))}
          className="mt-1 h-10 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-2"
        />
      </label>

      {selectedClusterIds.length ? (
        <div className="mb-4 rounded-xl border border-border bg-zinc-50 p-3">
          <div className="mb-2 text-sm font-semibold">
            {selectedClusterIds.length} source colors selected
          </div>
          <select
            value=""
            onChange={(event) => {
              if (event.target.value) {
                onMergeSelectedClusters(event.target.value);
                event.target.value = "";
              }
            }}
            className="h-10 w-full rounded-lg border border-border bg-white px-2 text-sm outline-none ring-primary/20 focus:ring-2"
          >
            <option value="">Merge selected into...</option>
            {clusters
              .filter((target) => !selectedClusterIds.includes(target.id))
              .map((target) => (
                <option key={target.id} value={target.id}>
                  {target.id} / {rgbToHex(target.rgb)} ({target.count})
                </option>
              ))}
          </select>
        </div>
      ) : null}

      {clusters.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-zinc-50 p-6 text-center text-sm text-muted-foreground">
          Source colors will appear after extraction.
        </div>
      ) : viewMode === "grouped" ? (
        <div className="max-h-[720px] space-y-4 overflow-auto pr-1">
          {grouped.map(({ legoCode, clusters: groupClusters }) => {
            const lego = enabledPalette.find((color) => color.code === legoCode);
            return (
              <div key={legoCode} className="rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() =>
                    onHighlightLegoColor(highlightedLegoCode === legoCode ? null : legoCode)
                  }
                  className="flex w-full items-center justify-between gap-3 border-b border-border bg-zinc-50 px-3 py-2 text-left"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span
                      className="h-5 w-5 rounded border border-black/10"
                      style={{ backgroundColor: lego?.hex ?? "#000" }}
                    />
                    {lego?.name ?? legoCode}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {groupClusters.length} source clusters
                  </span>
                </button>
                <div className="space-y-2 p-2">
                  {groupClusters.map((cluster) => (
                    <ClusterRow
                      key={cluster.id}
                      cluster={cluster}
                      clusters={clusters}
                      totalStuds={totalStuds}
                      mapping={mapping}
                      locked={Boolean(lockedMappings[cluster.id])}
                      selected={selectedClusterIds.includes(cluster.id)}
                      highlighted={highlightedClusterId === cluster.id}
                      enabledPalette={enabledPalette}
                      onSelectedClusterIdsChange={onSelectedClusterIdsChange}
                      selectedClusterIds={selectedClusterIds}
                      onMappingChange={onMappingChange}
                      onToggleLock={onToggleLock}
                      onResetClusterMapping={onResetClusterMapping}
                      onMergeCluster={onMergeCluster}
                      onDeleteCluster={onDeleteCluster}
                      onHighlightCluster={onHighlightCluster}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="max-h-[720px] space-y-2 overflow-auto pr-1">
          {visibleClusters.map((cluster) => (
            <ClusterRow
              key={cluster.id}
              cluster={cluster}
              clusters={clusters}
              totalStuds={totalStuds}
              mapping={mapping}
              locked={Boolean(lockedMappings[cluster.id])}
              selected={selectedClusterIds.includes(cluster.id)}
              highlighted={highlightedClusterId === cluster.id}
              enabledPalette={enabledPalette}
              onSelectedClusterIdsChange={onSelectedClusterIdsChange}
              selectedClusterIds={selectedClusterIds}
              onMappingChange={onMappingChange}
              onToggleLock={onToggleLock}
              onResetClusterMapping={onResetClusterMapping}
              onMergeCluster={onMergeCluster}
              onDeleteCluster={onDeleteCluster}
              onHighlightCluster={onHighlightCluster}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ClusterRow({
  cluster,
  clusters,
  totalStuds,
  mapping,
  locked,
  selected,
  highlighted,
  enabledPalette,
  selectedClusterIds,
  onSelectedClusterIdsChange,
  onMappingChange,
  onToggleLock,
  onResetClusterMapping,
  onMergeCluster,
  onDeleteCluster,
  onHighlightCluster,
}: {
  cluster: SourceColorCluster;
  clusters: SourceColorCluster[];
  totalStuds: number;
  mapping: ColorMapping;
  locked: boolean;
  selected: boolean;
  highlighted: boolean;
  enabledPalette: typeof PALETTE;
  selectedClusterIds: string[];
  onSelectedClusterIdsChange: (value: string[]) => void;
  onMappingChange: (clusterId: string, paletteCode: string) => void;
  onToggleLock: (clusterId: string) => void;
  onResetClusterMapping: (clusterId: string) => void;
  onMergeCluster: (fromId: string, toId: string) => void;
  onDeleteCluster: (clusterId: string) => void;
  onHighlightCluster: (clusterId: string | null) => void;
}) {
  const nearest = nearestPaletteColor(cluster.rgb, enabledPalette);
  const mapped = enabledPalette.find((color) => color.code === mapping[cluster.id]);
  const lab = rgbToLab(cluster.rgb);
  const mappedDistance = mapped
    ? labDistance(lab, rgbToLab(hexToRgb(mapped.hex)))
    : 0;
  const percent = totalStuds ? (cluster.count / totalStuds) * 100 : 0;

  return (
    <div
      className={[
        "grid grid-cols-[24px_36px_1fr] gap-3 rounded-xl border p-3 sm:grid-cols-[24px_36px_minmax(0,1fr)_220px]",
        highlighted ? "border-primary ring-1 ring-primary" : "border-border",
      ].join(" ")}
      onMouseEnter={() => onHighlightCluster(cluster.id)}
      onMouseLeave={() => onHighlightCluster(null)}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={(event) => {
          onSelectedClusterIdsChange(
            event.target.checked
              ? [...selectedClusterIds, cluster.id]
              : selectedClusterIds.filter((id) => id !== cluster.id),
          );
        }}
        className="mt-1 h-4 w-4 accent-primary"
      />
      <button
        type="button"
        onClick={() => onHighlightCluster(highlighted ? null : cluster.id)}
        className="h-9 w-9 rounded-md border border-black/10"
        style={{ backgroundColor: rgbToHex(cluster.rgb) }}
        title="Highlight cluster"
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-foreground">
            {cluster.id}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {rgbToHex(cluster.rgb)}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          RGB {cluster.rgb.r},{cluster.rgb.g},{cluster.rgb.b} / LAB{" "}
          {lab.l.toFixed(1)}, {lab.a.toFixed(1)}, {lab.b.toFixed(1)}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {cluster.count.toLocaleString()} studs / {percent.toFixed(2)}% / nearest{" "}
          {nearest.name} / mapped {mapped?.name ?? "unmapped"} / dLAB{" "}
          {mappedDistance.toFixed(1)}
        </div>
      </div>

      <div className="col-span-3 grid gap-2 sm:col-span-1">
        <select
          value={mapping[cluster.id] ?? ""}
          onChange={(event) => onMappingChange(cluster.id, event.target.value)}
          disabled={locked}
          className="h-10 rounded-lg border border-border bg-white px-2 text-sm outline-none ring-primary/20 focus:ring-2 disabled:bg-zinc-100 disabled:text-muted-foreground"
        >
          {enabledPalette.map((color) => (
            <option key={color.code} value={color.code}>
              {color.name} ({color.code})
            </option>
          ))}
        </select>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onToggleLock(cluster.id)}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border text-xs font-semibold hover:bg-zinc-50"
            title={locked ? "Unlock mapping" : "Lock mapping"}
          >
            {locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => onResetClusterMapping(cluster.id)}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-border text-xs font-semibold hover:bg-zinc-50"
            title="Reset to nearest LEGO color"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDeleteCluster(cluster.id)}
            className="h-9 rounded-lg border border-border text-xs font-semibold hover:bg-zinc-50"
          >
            Delete
          </button>
        </div>
        <select
          value=""
          onChange={(event) => {
            if (event.target.value) {
              onMergeCluster(cluster.id, event.target.value);
              event.target.value = "";
            }
          }}
          className="h-9 rounded-lg border border-border bg-white px-2 text-xs outline-none ring-primary/20 focus:ring-2"
        >
          <option value="">Merge into...</option>
          {clusters
            .filter((target) => target.id !== cluster.id)
            .map((target) => (
              <option key={target.id} value={target.id}>
                {target.id} / {rgbToHex(target.rgb)} ({target.count})
              </option>
            ))}
        </select>
      </div>
    </div>
  );
}

function sortClusters(
  clusters: SourceColorCluster[],
  mapping: ColorMapping,
  sortMode: SourcePaletteSort,
) {
  return [...clusters].sort((a, b) => {
    if (sortMode === "count-desc") return b.count - a.count;
    if (sortMode === "mapped-lego") {
      return (mapping[a.id] ?? "").localeCompare(mapping[b.id] ?? "");
    }
    if (sortMode === "distance-desc") {
      return mappedDistance(b, mapping[b.id]) - mappedDistance(a, mapping[a.id]);
    }
    const aLab = rgbToLab(a.rgb);
    const bLab = rgbToLab(b.rgb);
    return Math.atan2(aLab.b, aLab.a) - Math.atan2(bLab.b, bLab.a);
  });
}

function groupClustersByMappedColor(
  clusters: SourceColorCluster[],
  mapping: ColorMapping,
) {
  const groups = new Map<string, SourceColorCluster[]>();

  for (const cluster of clusters) {
    const legoCode = mapping[cluster.id] ?? "unmapped";
    groups.set(legoCode, [...(groups.get(legoCode) ?? []), cluster]);
  }

  return Array.from(groups.entries())
    .map(([legoCode, groupedClusters]) => ({
      legoCode,
      clusters: groupedClusters,
    }))
    .sort((a, b) => b.clusters.length - a.clusters.length);
}

function mappedDistance(cluster: SourceColorCluster, legoCode?: string): number {
  const mapped = PALETTE.find((color) => color.code === legoCode);
  if (!mapped) return 0;
  return labDistance(rgbToLab(cluster.rgb), rgbToLab(hexToRgb(mapped.hex)));
}

function ControlButton({
  label,
  icon,
  disabled,
  onClick,
}: {
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  );
}
