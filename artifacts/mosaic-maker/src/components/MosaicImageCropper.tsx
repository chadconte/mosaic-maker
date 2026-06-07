import { useCallback, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { Move, ZoomIn } from "lucide-react";
import { Slider } from "./ui/slider";
import { cn } from "@/lib/utils";

type MosaicImageCropperProps = {
  imageSrc: string;
  aspect: number;
  mosaicLabel: string;
  onCropAreaChange: (area: Area | null) => void;
  className?: string;
};

export function MosaicImageCropper({
  imageSrc,
  aspect,
  mosaicLabel,
  onCropAreaChange,
  className,
}: MosaicImageCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const handleCropAreaChange = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      onCropAreaChange(croppedAreaPixels);
    },
    [onCropAreaChange],
  );

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Move className="h-3.5 w-3.5" />
          Drag to pan
        </span>
        <span className="font-mono bg-zinc-100 px-2 py-0.5 rounded">
          Crop frame: {mosaicLabel}
        </span>
      </div>

      <div className="relative w-full h-64 sm:h-80 rounded-xl overflow-hidden bg-zinc-900 border border-border">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropAreaChange={handleCropAreaChange}
          showGrid
          objectFit="contain"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <ZoomIn className="h-4 w-4 text-primary" />
          Zoom
        </label>
        <Slider
          min={1}
          max={3}
          step={0.01}
          value={[zoom]}
          onValueChange={(value) => setZoom(value[0] ?? 1)}
          aria-label="Crop zoom"
        />
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>1×</span>
          <span>{zoom.toFixed(2)}×</span>
          <span>3×</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        The highlighted frame is exactly what will be sent to the mosaic generator.
        Adjust columns and rows above to change the crop shape.
      </p>
    </div>
  );
}
