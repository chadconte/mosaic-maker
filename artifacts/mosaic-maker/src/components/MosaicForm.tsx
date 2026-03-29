// artifacts/mosaic-maker/src/components/MosaicForm.tsx

import React, { useCallback, useMemo, useState } from "react";
import {
  UploadCloud,
  Image as ImageIcon,
  LayoutGrid,
  Hash,
  Settings2,
  Shield,
  Palette as PaletteIcon,
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { PALETTE, type PaletteColor } from "../lib/palette";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type DetailMode = "detail" | "balanced" | "clean";

interface MosaicFormProps {
  onSubmit: (data: {
    image: File;
    baseplateSize: number;
    columns: number;
    rows: number;
    mode: DetailMode;
    threshold: number;
    protectEdges: boolean;
    palette: PaletteColor[];
  }) => void;
  isPending: boolean;
}

const DEFAULT_THRESHOLD = 10;

export function MosaicForm({ onSubmit, isPending }: MosaicFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [baseplateSize, setBaseplateSize] = useState<number>(32);
  const [columns, setColumns] = useState<number>(5);
  const [rows, setRows] = useState<number>(8);

  const [mode, setMode] = useState<DetailMode>("balanced");
  const [threshold, setThreshold] = useState<number>(DEFAULT_THRESHOLD);
  const [protectEdges, setProtectEdges] = useState(true);
  const [palette, setPalette] = useState<PaletteColor[]>(PALETTE);

  const handleFile = useCallback((selectedFile: File) => {
    if (selectedFile && selectedFile.type.startsWith("image/")) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    onSubmit({
      image: file,
      baseplateSize,
      columns,
      rows,
      mode,
      threshold,
      protectEdges,
      palette,
    });
  };

  const togglePaletteColor = (code: string) => {
    setPalette((prev) =>
      prev.map((color) =>
        color.code === code ? { ...color, enabled: !color.enabled } : color,
      ),
    );
  };

  const groupedPalette = useMemo(() => {
    return palette.reduce<Record<string, PaletteColor[]>>((acc, color) => {
      if (!acc[color.family]) acc[color.family] = [];
      acc[color.family].push(color);
      return acc;
    }, {});
  }, [palette]);

  const enabledCount = palette.filter((c) => c.enabled).length;

  const modeDescriptions: Record<DetailMode, string> = {
    detail:
      "Most realistic. Strongest dithering, least smoothing, best for painterly detail.",
    balanced:
      "Middle ground. Preserves detail while keeping the image a little cleaner.",
    clean:
      "Simpler rendering. Less dithering and more smoothing for flatter, cleaner shapes.",
  };

  const thresholdDescription =
    threshold <= 4
      ? "Very low cleanup. More tiny color variation survives."
      : threshold <= 8
        ? "Moderate cleanup. Good detail with some simplification."
        : threshold <= 12
          ? "Strong cleanup. Small color clusters are reduced more aggressively."
          : "Very strong cleanup. Better for simpler, cleaner builds.";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-6">
        <div className="space-y-3 bg-white p-6 sm:p-8 rounded-2xl border border-border shadow-sm">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" />
            Source Image
          </label>

          <div
            className={cn(
              "relative w-full h-56 sm:h-72 rounded-2xl border-2 border-dashed transition-all duration-200 ease-out flex flex-col items-center justify-center overflow-hidden group cursor-pointer",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border bg-white hover:border-primary/50 hover:bg-zinc-50",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files?.[0]) {
                handleFile(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => document.getElementById("file-upload")?.click()}
          >
            {preview ? (
              <>
                <img
                  src={preview}
                  alt="Preview"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="px-4 py-2 rounded-xl bg-white/90 text-sm font-medium text-foreground shadow-sm">
                    Click to change image
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center px-6">
                <UploadCloud className="w-10 h-10 text-primary mb-3" />
                <p className="text-base font-semibold text-foreground">
                  Drag &amp; drop your image here
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse from your computer
                </p>
              </div>
            )}

            <input
              id="file-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFile(e.target.files[0]);
                }
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_340px] items-start">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-6 bg-white p-6 sm:p-8 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-2 border-b border-border pb-4">
                  <LayoutGrid className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">
                    Canvas Setup
                  </h3>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground">
                    Baseplate Size
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[16, 32].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setBaseplateSize(size)}
                        className={cn(
                          "py-3 px-4 rounded-xl border text-center font-medium transition-all",
                          baseplateSize === size
                            ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                            : "border-border bg-white text-muted-foreground hover:bg-zinc-50",
                        )}
                      >
                        {size} × {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Hash className="w-4 h-4 text-primary" />
                      Columns
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        value={columns}
                        onChange={(e) =>
                          setColumns(parseInt(e.target.value, 10) || 1)
                        }
                        className="w-full pl-4 pr-10 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                        W
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Hash className="w-4 h-4 text-primary" />
                      Rows
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        value={rows}
                        onChange={(e) => setRows(parseInt(e.target.value, 10) || 1)}
                        className="w-full pl-4 pr-10 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                        H
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6 bg-white p-6 sm:p-8 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-2 border-b border-border pb-4">
                  <Settings2 className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">
                    Color Tuning
                  </h3>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground flex justify-between items-center">
                    <span>Detail Mode</span>
                    <span className="text-muted-foreground font-mono bg-zinc-100 px-2 py-0.5 rounded text-xs capitalize">
                      {mode}
                    </span>
                  </label>

                  <p className="text-xs text-muted-foreground">
                    {modeDescriptions[mode]}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(["detail", "balanced", "clean"] as DetailMode[]).map(
                      (option) => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setMode(option)}
                          className={cn(
                            "min-h-[46px] px-4 rounded-xl border text-center text-sm font-medium transition-all capitalize whitespace-nowrap",
                            mode === option
                              ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                              : "border-border bg-white text-muted-foreground hover:bg-zinc-50",
                          )}
                        >
                          {option}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground flex justify-between items-center">
                    <span>Minimum Color Uses</span>
                    <span className="text-muted-foreground font-mono bg-zinc-100 px-2 py-0.5 rounded text-xs">
                      {threshold}
                    </span>
                  </label>

                  <p className="text-xs text-muted-foreground">
                    Any color used fewer than this number gets removed and folded
                    into the closest surviving color. Default is 10.
                  </p>

                  <input
                    type="range"
                    min={0}
                    max={25}
                    step={1}
                    value={threshold}
                    onChange={(e) => setThreshold(parseInt(e.target.value, 10))}
                    className="w-full accent-primary"
                  />

                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>0</span>
                    <span>Gentle</span>
                    <span>Balanced</span>
                    <span>Strong</span>
                    <span>25</span>
                  </div>

                  <div className="rounded-xl border border-border bg-zinc-50 px-4 py-3 text-sm text-muted-foreground">
                    {thresholdDescription}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    Edge Protection
                  </label>

                  <p className="text-xs text-muted-foreground">
                    Preserves outlines, facial features, and other sharp detail
                    during smoothing and cleanup.
                  </p>

                  <button
                    type="button"
                    onClick={() => setProtectEdges((prev) => !prev)}
                    className={cn(
                      "w-full py-3 px-4 rounded-xl border text-left font-medium transition-all flex items-center justify-between",
                      protectEdges
                        ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                        : "border-border bg-white text-muted-foreground hover:bg-zinc-50",
                    )}
                  >
                    <span>
                      {protectEdges ? "Protect Edges: On" : "Protect Edges: Off"}
                    </span>
                    <span
                      className={cn(
                        "inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        protectEdges ? "bg-primary" : "bg-zinc-300",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-5 w-5 transform rounded-full bg-white transition-transform",
                          protectEdges ? "translate-x-5" : "translate-x-1",
                        )}
                      />
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending || !file || enabledCount === 0}
              className={cn(
                "w-full py-4 rounded-2xl font-semibold text-white transition-all shadow-sm",
                isPending || !file || enabledCount === 0
                  ? "bg-zinc-400 cursor-not-allowed"
                  : "bg-primary hover:opacity-90 active:scale-[0.99]",
              )}
            >
              {isPending ? "Generating Pattern..." : "Generate Mosaic"}
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden 2xl:sticky 2xl:top-6">
            <div className="p-6 sm:p-8 border-b border-border">
              <div className="flex items-center gap-2">
                <PaletteIcon className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">
                  Palette Control
                </h3>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                Enabled Colors{" "}
                <span className="font-semibold text-foreground">
                  {enabledCount} / {palette.length}
                </span>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6 sm:p-8 space-y-5">
              {Object.entries(groupedPalette).map(([family, colors]) => (
                <div key={family} className="space-y-3">
                  <h4 className="text-sm font-semibold capitalize text-foreground">
                    {family}
                  </h4>

                  <div className="grid grid-cols-1 gap-3">
                    {colors.map((color) => (
                      <label
                        key={color.code}
                        className="flex items-center gap-3 rounded-xl border border-border bg-white px-3 py-3 hover:bg-zinc-50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={color.enabled}
                          onChange={() => togglePaletteColor(color.code)}
                          className="h-4 w-4 accent-primary"
                        />

                        <span
                          className="h-5 w-5 rounded-full border border-black/10 shrink-0"
                          style={{ backgroundColor: color.hex }}
                        />

                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">
                            {color.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {color.code} · {color.hex}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}