import { useMemo, useState, type ReactNode } from "react";
import type { Area } from "react-easy-crop";
import { ArrowLeft, BadgeCheck, Grid3X3, ImageDown } from "lucide-react";
import { Link } from "wouter";
import { CropStep } from "./components/CropStep";
import { SourceGridStep } from "./components/SourceGridStep";
import { MatrixPreview } from "./components/MatrixPreview";
import { ColorMappingPanel } from "./components/ColorMappingPanel";
import { TargetSizePanel } from "./components/TargetSizePanel";
import { ExportPanel } from "./components/ExportPanel";
import { clusterSourceColors } from "./utils/clusterSourceColors";
import { extractStudMatrix } from "./utils/extractStudMatrix";
import {
  buildMappedMatrix,
  createDefaultColorMapping,
  type ColorMapping,
} from "./utils/mapToLegoPalette";
import { resizeMatrixNearest } from "./utils/resizeMatrix";
import { rgbToCss } from "./utils/renderMatrix";
import type {
  ClusterResult,
  Matrix,
  ResizeMode,
  Rgb,
  SourceColorCluster,
} from "./utils/types";

const DEFAULT_SOURCE_WIDTH = 72;
const DEFAULT_SOURCE_HEIGHT = 120;
const DEFAULT_TARGET_WIDTH = 80;
const DEFAULT_TARGET_HEIGHT = 128;
const DEFAULT_CLUSTER_THRESHOLD = 18;

export function BrickMeImporterPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [cropArea, setCropArea] = useState<Area | null>(null);
  const [sourceWidth, setSourceWidth] = useState(DEFAULT_SOURCE_WIDTH);
  const [sourceHeight, setSourceHeight] = useState(DEFAULT_SOURCE_HEIGHT);
  const [targetWidth, setTargetWidth] = useState(DEFAULT_TARGET_WIDTH);
  const [targetHeight, setTargetHeight] = useState(DEFAULT_TARGET_HEIGHT);
  const [clusterThreshold, setClusterThreshold] = useState(
    DEFAULT_CLUSTER_THRESHOLD,
  );
  const [resizeMode, setResizeMode] = useState<ResizeMode>("cover-crop");
  const [showBaseplateGrid, setShowBaseplateGrid] = useState(true);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceMatrix, setSourceMatrix] = useState<Matrix<Rgb> | null>(null);
  const [clusterResult, setClusterResult] = useState<ClusterResult | null>(null);
  const [mapping, setMapping] = useState<ColorMapping>({});

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

  const handleFileChange = (file: File) => {
    if (imageSrc) {
      URL.revokeObjectURL(imageSrc);
    }
    setImageFile(file);
    setImageSrc(URL.createObjectURL(file));
    setSourceMatrix(null);
    setClusterResult(null);
    setMapping({});
    setError(null);
  };

  const handleExtract = async () => {
    if (!imageSrc || !cropArea) return;

    setIsExtracting(true);
    setError(null);

    try {
      const extracted = await extractStudMatrix(
        imageSrc,
        cropArea,
        Math.max(1, Math.round(sourceWidth)),
        Math.max(1, Math.round(sourceHeight)),
      );
      const clustered = clusterSourceColors(extracted, clusterThreshold);

      setSourceMatrix(extracted);
      setClusterResult(clustered);
      setMapping(createDefaultColorMapping(clustered.clusters));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to extract the BrickMe stud matrix.",
      );
    } finally {
      setIsExtracting(false);
    }
  };

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
              clusterThreshold={clusterThreshold}
              canExtract={Boolean(imageSrc && cropArea)}
              isExtracting={isExtracting}
              onSourceWidthChange={setSourceWidth}
              onSourceHeightChange={setSourceHeight}
              onClusterThresholdChange={setClusterThreshold}
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
              onTargetWidthChange={setTargetWidth}
              onTargetHeightChange={setTargetHeight}
              onResizeModeChange={setResizeMode}
              onShowBaseplateGridChange={setShowBaseplateGrid}
            />

            <ColorMappingPanel
              clusters={clusterResult?.clusters ?? []}
              mapping={mapping}
              onMappingChange={(clusterId, paletteCode) =>
                setMapping((current) => ({
                  ...current,
                  [clusterId]: paletteCode,
                }))
              }
            />
          </aside>

          <main className="space-y-6">
            <MatrixPreview
              title="Extracted BrickMe Matrix"
              subtitle="Center-sampled source studs before LEGO palette mapping."
              matrix={sourceMatrix}
              colorOf={rgbToCss}
            />

            <MatrixPreview
              title="Mapped LEGO Matrix"
              subtitle="Same source stud positions after cluster-to-palette mapping."
              matrix={mappedSourceMatrix}
              colorOf={(color) => color.hex}
            />

            <MatrixPreview
              title="Final Adapted Pattern"
              subtitle="Nearest-neighbor matrix resize to your target baseplate size."
              matrix={finalMatrix}
              colorOf={(color) => color.hex}
              showBaseplateGrid={showBaseplateGrid}
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
