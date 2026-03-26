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
    protectEdges: boolean;
    palette: PaletteColor[];
  }) => void;
  isPending: boolean;
}

export function MosaicForm({ onSubmit, isPending }: MosaicFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [baseplateSize, setBaseplateSize] = useState<number>(32);
  const [columns, setColumns] = useState<number>(5);
  const [rows, setRows] = useState<number>(8);

  const [mode, setMode] = useState<DetailMode>("balanced");
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
    detail: "Keeps more variation and fine image detail.",
    balanced: "Best all-around setting for most mosaics.",
    clean: "Favors larger color regions and a simpler final build.",
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-8">
      <div className="space-y-3">
        <label className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-primary" />
          Source Image
        </label>
        <div
          className={cn(
            "relative w-full h-48 sm:h-64 rounded-2xl border-2 border-dashed transition-all duration-200 ease-out flex flex-col items-center justify-center overflow-hidden group cursor-pointer",
            isDragging
              ? "border-primary bg-primary/5"
              : preview
                ? "border-transparent"
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
                className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg font-medium text-sm text-foreground shadow-sm">
                  Click to change image
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center text-center p-6">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-base font-semibold text-foreground">
                Drag & drop your image here
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
            onChange={(e) =>
              e.target.files?.[0] && handleFile(e.target.files[0])
            }
          />
        </div>
      </div>

      <div className="space-y-6 bg-white p-6 sm:p-8 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-2 border-b border-border pb-4">
          <LayoutGrid className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            Canvas Setup
          </h3>
        </div>

        <div className="space-y-5">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Columns
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={columns}
                  onChange={(e) => setColumns(parseInt(e.target.value) || 1)}
                  className="w-full pl-4 pr-10 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  W
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">
                Rows
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={rows}
                  onChange={(e) => setRows(parseInt(e.target.value) || 1)}
                  className="w-full pl-4 pr-10 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  H
                </span>
              </div>
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

          <div className="grid grid-cols-3 gap-3">
            {(["detail", "balanced", "clean"] as DetailMode[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setMode(option)}
                className={cn(
                  "py-3 px-4 rounded-xl border text-center font-medium transition-all capitalize",
                  mode === option
                    ? "border-primary bg-primary/5 text-primary ring-1 ring-primary"
                    : "border-border bg-white text-muted-foreground hover:bg-zinc-50",
                )}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Edge Protection
          </label>
          <p className="text-xs text-muted-foreground">
            Preserves high-contrast details like outlines, text edges, and
            facial features during cleanup.
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

      <div className="space-y-6 bg-white p-6 sm:p-8 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-2 border-b border-border pb-4">
          <PaletteIcon className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            Palette Control
          </h3>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Enabled Colors</span>
          <span className="font-mono bg-zinc-100 px-2 py-0.5 rounded text-xs">
            {enabledCount} / {palette.length}
          </span>
        </div>

        <div className="space-y-5 max-h-[420px] overflow-y-auto pr-1">
          {Object.entries(groupedPalette).map(([family, colors]) => (
            <div key={family} className="space-y-3">
              <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {family}
              </div>

              <div className="grid grid-cols-1 gap-2">
                {colors.map((color) => (
                  <label
                    key={color.code}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-3 py-2 cursor-pointer transition-all",
                      color.enabled
                        ? "border-border bg-white hover:bg-zinc-50"
                        : "border-border bg-zinc-50 text-muted-foreground",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={color.enabled}
                      onChange={() => togglePaletteColor(color.code)}
                      className="h-4 w-4 accent-primary"
                    />

                    <div
                      className="w-5 h-5 rounded-md border border-black/10 shrink-0"
                      style={{ backgroundColor: color.hex }}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {color.name}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
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

      <button
        type="submit"
        disabled={!file || isPending}
        className={cn(
          "w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-300",
          !file
            ? "bg-zinc-100 text-zinc-400 cursor-not-allowed"
            : isPending
              ? "bg-primary/80 text-white cursor-wait"
              : "bg-primary text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0",
        )}
      >
        {isPending ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Generating Pattern...
          </>
        ) : (
          <>
            <Hash className="w-5 h-5" />
            Generate Mosaic
          </>
        )}
      </button>
    </form>
  );
}
