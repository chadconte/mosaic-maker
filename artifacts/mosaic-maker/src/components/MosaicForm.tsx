import React, { useCallback, useState } from "react";
import { UploadCloud, Image as ImageIcon, LayoutGrid, Hash, Settings2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MosaicFormProps {
  onSubmit: (data: {
    image: File;
    baseplateSize: number;
    columns: number;
    rows: number;
    threshold: number;
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
  const [threshold, setThreshold] = useState<number>(10);

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
      threshold,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-8">
      {/* Upload Zone */}
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
              : "border-border bg-white hover:border-primary/50 hover:bg-zinc-50"
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
              <img src={preview} alt="Preview" className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
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
              <p className="text-base font-semibold text-foreground">Drag & drop your image here</p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse from your computer</p>
            </div>
          )}
          <input
            id="file-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      </div>

      {/* Grid Settings */}
      <div className="space-y-6 bg-white p-6 sm:p-8 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-2 border-b border-border pb-4">
          <LayoutGrid className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Canvas Setup</h3>
        </div>

        <div className="space-y-5">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-foreground">Baseplate Size</label>
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
                      : "border-border bg-white text-muted-foreground hover:bg-zinc-50"
                  )}
                >
                  {size} × {size}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Columns</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={columns}
                  onChange={(e) => setColumns(parseInt(e.target.value) || 1)}
                  className="w-full pl-4 pr-10 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">W</span>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Rows</label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  value={rows}
                  onChange={(e) => setRows(parseInt(e.target.value) || 1)}
                  className="w-full pl-4 pr-10 py-3 rounded-xl border border-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">H</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="space-y-6 bg-white p-6 sm:p-8 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-2 border-b border-border pb-4">
          <Settings2 className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Color Tuning</h3>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-foreground flex justify-between">
            <span>Minimum Color Uses</span>
            <span className="text-muted-foreground font-mono bg-zinc-100 px-2 py-0.5 rounded text-xs">{threshold}</span>
          </label>
          <p className="text-xs text-muted-foreground mb-3">
            Colors appearing fewer times than this threshold will be absorbed into the nearest dominant color.
          </p>
          <input
            type="range"
            min="1"
            max="100"
            value={threshold}
            onChange={(e) => setThreshold(parseInt(e.target.value) || 1)}
            className="w-full accent-primary h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer"
          />
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
            : "bg-primary text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0"
        )}
      >
        {isPending ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
