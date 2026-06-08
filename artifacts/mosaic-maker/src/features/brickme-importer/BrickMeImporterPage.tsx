import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Area } from "react-easy-crop";
import { ArrowLeft, BadgeCheck, Grid3X3, ImageDown } from "lucide-react";
import { Link } from "wouter";
import { CropStep } from "./components/CropStep";
import { SourceGridStep } from "./components/SourceGridStep";
import { MatrixPreview } from "./components/MatrixPreview";
import {
  ColorMappingPanel,
  type MappingExportPayload,
  type SourcePaletteSort,
  type SourcePaletteView,
} from "./components/ColorMappingPanel";
import { TargetSizePanel } from "./components/TargetSizePanel";
import { ExportPanel } from "./components/ExportPanel";
import { ComparisonPanel } from "./components/ComparisonPanel";
import { QualityMetricsPanel } from "./components/QualityMetricsPanel";
import {
  deleteSourceCluster,
  getSourcePaletteStats,
  mergeSourceClusters,
  recoverSourcePalette,
} from "./utils/clusterSourceColors";
import { extractStudMatrix } from "./utils/extractStudMatrix";
import {
  buildMappedMatrix,
  createDefaultColorMapping,
  nearestPaletteColor,
  type ColorMapping,
} from "./utils/mapToLegoPalette";
import { resizeMatrixNearest } from "./utils/resizeMatrix";
import { rgbToCss } from "./utils/renderMatrix";
import { rgbToHex } from "./utils/colorMath";
import { getColorCounts } from "./utils/exportCsv";
import {
  computeFidelityMetrics,
  type FidelityMetrics,
} from "./utils/fidelityMetrics";
import type {
  ClusterResult,
  ExtractionMode,
  FixedSourceColorCount,
  Matrix,
  ResizeMode,
  Rgb,
  SamplingMethod,
  SourceColorCluster,
} from "./utils/types";

const DEFAULT_SOURCE_WIDTH = 72;
const DEFAULT_SOURCE_HEIGHT = 120;
const DEFAULT_TARGET_WIDTH = 80;
const DEFAULT_TARGET_HEIGHT = 128;
const DEFAULT_FIXED_SOURCE_COLOR_COUNT: FixedSourceColorCount = 24;
const DEFAULT_SAMPLE_AREA_PERCENT = 35;

export function BrickMeImporterPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [cropArea, setCropArea] = useState<Area | null>(null);
  const [sourceWidth, setSourceWidth] = useState(DEFAULT_SOURCE_WIDTH);
  const [sourceHeight, setSourceHeight] = useState(DEFAULT_SOURCE_HEIGHT);
  const [targetWidth, setTargetWidth] = useState(DEFAULT_TARGET_WIDTH);
  const [targetHeight, setTargetHeight] = useState(DEFAULT_TARGET_HEIGHT);
  const [extractionMode, setExtractionMode] = useState<ExtractionMode>("auto");
  const [sourceColorCount, setSourceColorCount] = useState(
    DEFAULT_FIXED_SOURCE_COLOR_COUNT,
  );
  const [sampleAreaPercent, setSampleAreaPercent] = useState(
    DEFAULT_SAMPLE_AREA_PERCENT,
  );
  const [samplingMethod, setSamplingMethod] = useState<SamplingMethod>("median");
  const [resizeMode, setResizeMode] = useState<ResizeMode>("cover-crop");
  const [showBaseplateGrid, setShowBaseplateGrid] = useState(true);
  const [showStudGrid, setShowStudGrid] = useState(false);
  const [preserveSmallClusters] = useState(true);
  const [autoMerge] = useState(false);
  const [minVisibleClusterCount, setMinVisibleClusterCount] = useState(0);
  const [selectedClusterIds, setSelectedClusterIds] = useState<string[]>([]);
  const [lockedMappings, setLockedMappings] = useState<Record<string, boolean>>(
    {},
  );
  const [highlightedClusterId, setHighlightedClusterId] = useState<string | null>(
    null,
  );
  const [highlightedLegoCode, setHighlightedLegoCode] = useState<string | null>(
    null,
  );
  const [sourcePaletteSort, setSourcePaletteSort] =
    useState<SourcePaletteSort>("count-desc");
  const [sourcePaletteView, setSourcePaletteView] =
    useState<SourcePaletteView>("all");
  const [mergeHistory, setMergeHistory] = useState<
    Array<{ fromId: string; toId: string; count: number }>
  >([]);
  const [changedStudCount, setChangedStudCount] = useState<number | null>(null);
  const [comparisonMode, setComparisonMode] = useState<
    "side-by-side" | "overlay"
  >("side-by-side");
  const [overlayFade, setOverlayFade] = useState(50);
  const [comparisonZoom, setComparisonZoom] = useState(100);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceMatrix, setSourceMatrix] = useState<Matrix<Rgb> | null>(null);
  const [originalClusterResult, setOriginalClusterResult] =
    useState<ClusterResult | null>(null);
  const [clusterResult, setClusterResult] = useState<ClusterResult | null>(null);
  const [croppedDataUrl, setCroppedDataUrl] = useState<string | null>(null);
  const [mapping, setMapping] = useState<ColorMapping>({});
  const [fidelityMetrics, setFidelityMetrics] =
    useState<FidelityMetrics | null>(null);
  const mappingRef = useRef<ColorMapping>({});
  const lockedMappingsRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    mappingRef.current = mapping;
  }, [mapping]);

  useEffect(() => {
    lockedMappingsRef.current = lockedMappings;
  }, [lockedMappings]);

  const clusterById = useMemo(() => {
    const map = new Map<string, SourceColorCluster>();
    for (const cluster of clusterResult?.clusters ?? []) {
      map.set(cluster.id, cluster);
    }
    return map;
  }, [clusterResult]);

  const mappedSourceMatrix = useMemo(() => {
    if (!clusterResult) return null;
    return buildMappedMatrix(clusterResult.clusterMatrix, mapping);
  }, [clusterResult, mapping]);

  const extractedSourcePreviewMatrix = useMemo(() => {
    if (!clusterResult) return null;
    return clusterResult.clusterMatrix;
  }, [clusterResult]);

  const sourceClusterRgbMatrix = useMemo(() => {
    if (!clusterResult) return null;
    return {
      width: clusterResult.clusterMatrix.width,
      height: clusterResult.clusterMatrix.height,
      cells: clusterResult.clusterMatrix.cells.map(
        (clusterId) => clusterById.get(clusterId)?.rgb ?? { r: 0, g: 0, b: 0 },
      ),
    };
  }, [clusterById, clusterResult]);

  const finalMatrix = useMemo(() => {
    if (!mappedSourceMatrix) return null;
    return resizeMatrixNearest(
      mappedSourceMatrix,
      Math.max(1, targetWidth),
      Math.max(1, targetHeight),
      resizeMode,
    );
  }, [mappedSourceMatrix, resizeMode, targetHeight, targetWidth]);

  const sourceAspect = sourceWidth / sourceHeight;
  const targetAspect = targetWidth / targetHeight;
  const aspectDelta = Math.abs(sourceAspect - targetAspect);
  const mappedCounts = mappedSourceMatrix ? getColorCounts(mappedSourceMatrix) : [];
  const sourcePaletteStats = getSourcePaletteStats(sourceMatrix, clusterResult);
  const tinyClusters =
    clusterResult?.clusters
      .filter((cluster) => cluster.count < 50)
      .map((cluster) => ({
        id: cluster.id,
        count: cluster.count,
        hex: rgbToHex(cluster.rgb),
      })) ?? [];
  const handleFileChange = (file: File) => {
    if (imageSrc) {
      URL.revokeObjectURL(imageSrc);
    }
    setImageFile(file);
    setImageSrc(URL.createObjectURL(file));
    setSourceMatrix(null);
    setOriginalClusterResult(null);
    setClusterResult(null);
    setCroppedDataUrl(null);
    setMapping({});
    setFidelityMetrics(null);
    setError(null);
  };

  const handleExtract = useCallback(async () => {
    if (!imageSrc || !cropArea) return;

    setIsExtracting(true);
    setError(null);

    try {
      const extracted = await extractStudMatrix(
        imageSrc,
        cropArea,
        Math.max(1, Math.round(sourceWidth)),
        Math.max(1, Math.round(sourceHeight)),
        Math.max(15, Math.min(70, Math.round(sampleAreaPercent))),
        samplingMethod,
      );
      const clustered = recoverSourcePalette(
        extracted.matrix,
        extractionMode,
        sourceColorCount as FixedSourceColorCount,
      );

      setSourceMatrix(extracted.matrix);
      setCroppedDataUrl(extracted.croppedDataUrl);
      setOriginalClusterResult(clustered);
      setClusterResult(clustered);
      const defaultMapping = createDefaultColorMapping(clustered.clusters);
      const currentMapping = mappingRef.current;
      const currentLocks = lockedMappingsRef.current;
      setMapping(() => {
        const next = { ...defaultMapping };
        for (const cluster of clustered.clusters) {
          if (currentLocks[cluster.id] && currentMapping[cluster.id]) {
            next[cluster.id] = currentMapping[cluster.id];
          }
        }
        return next;
      });
      setSelectedClusterIds([]);
      setHighlightedClusterId(null);
      setHighlightedLegoCode(null);
      setMergeHistory([]);
      setChangedStudCount(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to extract the BrickMe stud matrix.",
      );
    } finally {
      setIsExtracting(false);
    }
  }, [
    cropArea,
    extractionMode,
    imageSrc,
    sampleAreaPercent,
    samplingMethod,
    sourceColorCount,
    sourceHeight,
    sourceWidth,
  ]);

  const replayMerges = useCallback(
    (history: Array<{ fromId: string; toId: string; count: number }>) => {
      if (!originalClusterResult) return null;
      return history.reduce(
        (current, merge) => mergeSourceClusters(current, merge.fromId, merge.toId),
        originalClusterResult,
      );
    },
    [originalClusterResult],
  );

  const resetClusterMapping = useCallback(
    (clusterId: string) => {
      const cluster = clusterById.get(clusterId);
      if (!cluster) return;
      const nearest = nearestPaletteColor(cluster.rgb);
      setMapping((current) => ({
        ...current,
        [clusterId]: nearest.code,
      }));
      setChangedStudCount(cluster.count);
    },
    [clusterById],
  );

  const autoMapUnlocked = useCallback(() => {
    if (!clusterResult) return;
    let affected = 0;
    setMapping((current) => {
      const next = { ...current };
      for (const cluster of clusterResult.clusters) {
        if (!lockedMappings[cluster.id]) {
          next[cluster.id] = nearestPaletteColor(cluster.rgb).code;
          affected += cluster.count;
        }
      }
      return next;
    });
    setChangedStudCount(affected);
  }, [clusterResult, lockedMappings]);

  const resetAllMappings = useCallback(() => {
    if (!clusterResult) return;
    setMapping(createDefaultColorMapping(clusterResult.clusters));
    setChangedStudCount(clusterResult.clusters.reduce((sum, cluster) => sum + cluster.count, 0));
  }, [clusterResult]);

  const applyMerge = useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId) return;
      const fromCluster = clusterById.get(fromId);
      setClusterResult((current) =>
        current ? mergeSourceClusters(current, fromId, toId) : current,
      );
      setMapping((current) => {
        const next = { ...current };
        delete next[fromId];
        return next;
      });
      setLockedMappings((current) => {
        const next = { ...current };
        delete next[fromId];
        return next;
      });
      setMergeHistory((current) => [
        ...current,
        { fromId, toId, count: fromCluster?.count ?? 0 },
      ]);
      setChangedStudCount(fromCluster?.count ?? null);
      setHighlightedClusterId(toId);
    },
    [clusterById],
  );

  const importMapping = useCallback((payload: MappingExportPayload) => {
    setMapping((current) => {
      const next = { ...current };
      for (const item of payload.clusters) {
        if (clusterById.has(item.id) && item.mappedLegoCode) {
          next[item.id] = item.mappedLegoCode;
        }
      }
      return next;
    });
    setLockedMappings((current) => {
      const next = { ...current };
      for (const item of payload.clusters) {
        if (clusterById.has(item.id)) {
          next[item.id] = item.locked;
        }
      }
      return next;
    });
    setMergeHistory(payload.mergeHistory ?? []);
    setChangedStudCount(null);
  }, [clusterById]);

  useEffect(() => {
    if (!croppedDataUrl || !sourceClusterRgbMatrix) {
      setFidelityMetrics(null);
      return;
    }

    let cancelled = false;
    void computeFidelityMetrics(croppedDataUrl, sourceClusterRgbMatrix)
      .then((metrics) => {
        if (!cancelled) {
          setFidelityMetrics(metrics);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFidelityMetrics(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [croppedDataUrl, sourceClusterRgbMatrix]);

  useEffect(() => {
    if (!imageSrc || !cropArea || !sourceMatrix) return;
    const timeout = window.setTimeout(() => {
      void handleExtract();
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [
    cropArea,
    handleExtract,
    imageSrc,
    sampleAreaPercent,
    samplingMethod,
    sourceColorCount,
    sourceHeight,
    sourceMatrix,
    sourceWidth,
  ]);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-[1720px] px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-2xl border border-border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-3">
                <ImageDown className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Mosaic Adapter
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Import BrickMe stud art, map it to your palette, and adapt it
                  to your baseplates.
                </p>
              </div>
            </div>

            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-zinc-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Mosaic Maker
            </Link>
          </div>
        </header>

        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <StatusCard
            icon={<Grid3X3 className="h-5 w-5" />}
            label="Source"
            value={
              imageFile
                ? `${sourceWidth}x${sourceHeight} from ${imageFile.name}`
                : "Upload a BrickMe image"
            }
          />
          <StatusCard
            icon={<BadgeCheck className="h-5 w-5" />}
            label="Detected Colors"
            value={clusterResult ? clusterResult.clusters.length : "Pending"}
          />
          <StatusCard
            icon={<Grid3X3 className="h-5 w-5" />}
            label="Target"
            value={`${targetWidth}x${targetHeight} studs`}
          />
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {aspectDelta > 0.03 && clusterResult ? (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Source and target ratios differ. Use crop or pad mode to preserve
            proportions, or stretch if you want every stud position filled
            exactly.
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[440px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <SourceGridStep
              sourceWidth={sourceWidth}
              sourceHeight={sourceHeight}
              extractionMode={extractionMode}
              sourceColorCount={sourceColorCount}
              sampleAreaPercent={sampleAreaPercent}
              samplingMethod={samplingMethod}
              canExtract={Boolean(imageSrc && cropArea)}
              isExtracting={isExtracting}
              onSourceWidthChange={setSourceWidth}
              onSourceHeightChange={setSourceHeight}
              onExtractionModeChange={setExtractionMode}
              onSourceColorCountChange={setSourceColorCount}
              onSampleAreaPercentChange={setSampleAreaPercent}
              onSamplingMethodChange={setSamplingMethod}
              onExtract={handleExtract}
            />

            <CropStep
              imageSrc={imageSrc}
              sourceWidth={sourceWidth}
              sourceHeight={sourceHeight}
              onFileChange={handleFileChange}
              onCropAreaChange={setCropArea}
            />

            <TargetSizePanel
              targetWidth={targetWidth}
              targetHeight={targetHeight}
              resizeMode={resizeMode}
              showBaseplateGrid={showBaseplateGrid}
              showStudGrid={showStudGrid}
              onTargetWidthChange={setTargetWidth}
              onTargetHeightChange={setTargetHeight}
              onResizeModeChange={setResizeMode}
              onShowBaseplateGridChange={setShowBaseplateGrid}
              onShowStudGridChange={setShowStudGrid}
            />

            <ColorMappingPanel
              clusters={clusterResult?.clusters ?? []}
              mapping={mapping}
              lockedMappings={lockedMappings}
              minVisibleCount={minVisibleClusterCount}
              selectedClusterIds={selectedClusterIds}
              highlightedClusterId={highlightedClusterId}
              highlightedLegoCode={highlightedLegoCode}
              sortMode={sourcePaletteSort}
              viewMode={sourcePaletteView}
              changedStudCount={changedStudCount}
              canRestore={Boolean(originalClusterResult)}
              canUndoMerge={mergeHistory.length > 0}
              sourceDimensions={{ width: sourceWidth, height: sourceHeight }}
              targetDimensions={{ width: targetWidth, height: targetHeight }}
              mergeHistory={mergeHistory}
              onMinVisibleCountChange={setMinVisibleClusterCount}
              onSelectedClusterIdsChange={setSelectedClusterIds}
              onMappingChange={(clusterId, paletteCode) =>
                {
                  const cluster = clusterById.get(clusterId);
                  setMapping((current) => ({
                    ...current,
                    [clusterId]: paletteCode,
                  }));
                  setChangedStudCount(cluster?.count ?? null);
                }
              }
              onToggleLock={(clusterId) =>
                setLockedMappings((current) => ({
                  ...current,
                  [clusterId]: !current[clusterId],
                }))
              }
              onLockAll={() =>
                setLockedMappings(
                  Object.fromEntries(
                    (clusterResult?.clusters ?? []).map((cluster) => [
                      cluster.id,
                      true,
                    ]),
                  ),
                )
              }
              onUnlockAll={() => setLockedMappings({})}
              onResetClusterMapping={resetClusterMapping}
              onResetAllMappings={resetAllMappings}
              onAutoMapUnlocked={autoMapUnlocked}
              onMergeCluster={applyMerge}
              onMergeSelectedClusters={(toId) => {
                let affected = 0;
                for (const fromId of selectedClusterIds) {
                  if (fromId !== toId) {
                    affected += clusterById.get(fromId)?.count ?? 0;
                    applyMerge(fromId, toId);
                  }
                }
                setChangedStudCount(affected);
                setSelectedClusterIds([]);
              }}
              onDeleteCluster={(clusterId) => {
                const cluster = clusterById.get(clusterId);
                setClusterResult((current) =>
                  current ? deleteSourceCluster(current, clusterId) : current,
                );
                setMapping((current) => {
                  const next = { ...current };
                  delete next[clusterId];
                  return next;
                });
                setSelectedClusterIds((current) =>
                  current.filter((id) => id !== clusterId),
                );
                setChangedStudCount(cluster?.count ?? null);
              }}
              onRestoreClusters={() => {
                if (originalClusterResult) {
                  setClusterResult(originalClusterResult);
                  setMapping(createDefaultColorMapping(originalClusterResult.clusters));
                  setSelectedClusterIds([]);
                  setMergeHistory([]);
                  setChangedStudCount(null);
                }
              }}
              onUndoMerge={() => {
                const undone = mergeHistory.at(-1);
                const nextHistory = mergeHistory.slice(0, -1);
                const replayed = replayMerges(nextHistory);
                if (replayed) {
                  setClusterResult(replayed);
                  if (undone) {
                    const restoredCluster = originalClusterResult?.clusters.find(
                      (cluster) => cluster.id === undone.fromId,
                    );
                    if (restoredCluster) {
                      setMapping((current) => ({
                        ...current,
                        [restoredCluster.id]: nearestPaletteColor(restoredCluster.rgb).code,
                      }));
                    }
                  }
                  setMergeHistory(nextHistory);
                  setChangedStudCount(undone?.count ?? null);
                }
              }}
              onResetMerges={() => {
                if (originalClusterResult) {
                  setClusterResult(originalClusterResult);
                  setMapping((current) => ({
                    ...createDefaultColorMapping(originalClusterResult.clusters),
                    ...Object.fromEntries(
                      originalClusterResult.clusters
                        .filter(
                          (cluster) =>
                            lockedMappings[cluster.id] && current[cluster.id],
                        )
                        .map((cluster) => [cluster.id, current[cluster.id]]),
                    ),
                  }));
                  setMergeHistory([]);
                  setChangedStudCount(null);
                }
              }}
              onSortModeChange={setSourcePaletteSort}
              onViewModeChange={setSourcePaletteView}
              onHighlightCluster={(clusterId) => {
                setHighlightedClusterId(clusterId);
                if (clusterId) setHighlightedLegoCode(null);
              }}
              onHighlightLegoColor={(legoCode) => {
                setHighlightedLegoCode(legoCode);
                if (legoCode) setHighlightedClusterId(null);
              }}
              onImportMapping={importMapping}
            />
          </aside>

          <main className="space-y-6">
            <ComparisonPanel
              croppedDataUrl={croppedDataUrl}
              sourceMatrix={extractedSourcePreviewMatrix}
              mappedMatrix={mappedSourceMatrix}
              sourceColorOf={(clusterId) =>
                rgbToCss(clusterById.get(clusterId)?.rgb ?? { r: 0, g: 0, b: 0 })
              }
              mappedColorOf={(color) => color.hex}
              comparisonMode={comparisonMode}
              overlayFade={overlayFade}
              zoom={comparisonZoom}
              fidelityMetrics={fidelityMetrics}
              onComparisonModeChange={setComparisonMode}
              onOverlayFadeChange={setOverlayFade}
              onZoomChange={setComparisonZoom}
            />

            <QualityMetricsPanel
              sourceWidth={sourceWidth}
              sourceHeight={sourceHeight}
              targetWidth={targetWidth}
              targetHeight={targetHeight}
              sourceColorCount={sourceColorCount}
              extractedClusterCount={clusterResult?.clusters.length ?? 0}
              mappedColorCount={mappedCounts.length}
              totalStuds={finalMatrix?.cells.length ?? sourceWidth * sourceHeight}
              topColors={mappedCounts}
              tinyClusters={tinyClusters}
              rawSampledColorCount={sourcePaletteStats.rawSampledColorCount}
              largestCluster={sourcePaletteStats.largestCluster}
              smallestCluster={sourcePaletteStats.smallestCluster}
              under10={sourcePaletteStats.under10}
              under25={sourcePaletteStats.under25}
              under50={sourcePaletteStats.under50}
              extractionMode={extractionMode}
              preserveSmallClusters={preserveSmallClusters}
              autoMerge={autoMerge}
              onTinyClusterSelect={(clusterId) => {
                setHighlightedClusterId(clusterId);
                setHighlightedLegoCode(null);
              }}
              onMappedColorSelect={(legoCode) => {
                setHighlightedLegoCode(legoCode);
                setHighlightedClusterId(null);
              }}
            />

            <MatrixPreview
              title="Extracted Source Preview"
              subtitle="Detected BrickMe/source color clusters before LEGO palette mapping."
              matrix={extractedSourcePreviewMatrix}
              colorOf={(clusterId) =>
                rgbToCss(clusterById.get(clusterId)?.rgb ?? { r: 0, g: 0, b: 0 })
              }
              showStudGrid={showStudGrid}
              highlightOf={(clusterId) =>
                highlightedClusterId
                  ? clusterId === highlightedClusterId
                    ? "active"
                    : "dim"
                  : highlightedLegoCode
                    ? mapping[clusterId] === highlightedLegoCode
                      ? "active"
                      : "dim"
                    : "normal"
              }
            />

            <MatrixPreview
              title="Mapped LEGO Preview"
              subtitle="Same source stud positions after cluster-to-palette mapping."
              matrix={mappedSourceMatrix}
              colorOf={(color) => color.hex}
              showStudGrid={showStudGrid}
              highlightOf={(color) =>
                highlightedLegoCode
                  ? color.code === highlightedLegoCode
                    ? "active"
                    : "dim"
                  : "normal"
              }
            />

            <MatrixPreview
              title="Final Adapted Pattern"
              subtitle="Nearest-neighbor matrix resize to your target baseplate size."
              matrix={finalMatrix}
              colorOf={(color) => color.hex}
              showBaseplateGrid={showBaseplateGrid}
              showStudGrid={showStudGrid}
              highlightOf={(color) =>
                highlightedLegoCode
                  ? color.code === highlightedLegoCode
                    ? "active"
                    : "dim"
                  : "normal"
              }
            />

            <ExportPanel matrix={finalMatrix} />
          </main>
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white px-4 py-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        <span className="text-primary">{icon}</span>
        <span className="text-xs font-semibold uppercase">{label}</span>
      </div>
      <div className="truncate text-sm font-semibold text-foreground">
        {value}
      </div>
    </div>
  );
}
