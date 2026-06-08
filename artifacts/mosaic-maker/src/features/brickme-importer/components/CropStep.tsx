import type { Area } from "react-easy-crop";
import { Upload } from "lucide-react";
import { MosaicImageCropper } from "@/components/MosaicImageCropper";

type CropStepProps = {
  imageSrc: string | null;
  sourceWidth: number;
  sourceHeight: number;
  onFileChange: (file: File) => void;
  onCropAreaChange: (area: Area | null) => void;
};

export function CropStep({
  imageSrc,
  sourceWidth,
  sourceHeight,
  onFileChange,
  onCropAreaChange,
}: CropStepProps) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Upload className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">BrickMe Source</h2>
          <p className="text-sm text-muted-foreground">
            Upload the BrickMe screenshot/export and crop to the exact mosaic.
          </p>
        </div>
      </div>

      <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-zinc-50 px-4 py-5 text-center hover:bg-zinc-100">
        <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground">
          Choose BrickMe image
        </span>
        <span className="mt-1 text-xs text-muted-foreground">
          PNG, JPG, or screenshot
        </span>
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              onFileChange(file);
            }
          }}
        />
      </label>

      {imageSrc ? (
        <div className="mt-5">
          <MosaicImageCropper
            imageSrc={imageSrc}
            aspect={sourceWidth / sourceHeight}
            mosaicLabel={`${sourceWidth}x${sourceHeight} source grid`}
            onCropAreaChange={onCropAreaChange}
          />
        </div>
      ) : null}
    </section>
  );
}

