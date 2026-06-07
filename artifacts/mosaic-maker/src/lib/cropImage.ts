import type { Area } from "react-easy-crop";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    if (!src.startsWith("blob:") && !src.startsWith("data:")) {
      image.crossOrigin = "anonymous";
    }
    image.src = src;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to export cropped image"));
          return;
        }
        resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

/**
 * Renders the user-selected crop region to a File for the existing upload API.
 */
export async function getCroppedImageFile(
  imageSrc: string,
  pixelCrop: Area,
  originalFile: File,
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas is not available");
  }

  const naturalWidth = image.naturalWidth;
  const naturalHeight = image.naturalHeight;

  const cropX = Math.max(0, Math.min(Math.round(pixelCrop.x), naturalWidth - 1));
  const cropY = Math.max(0, Math.min(Math.round(pixelCrop.y), naturalHeight - 1));
  const cropW = Math.max(
    1,
    Math.min(Math.round(pixelCrop.width), naturalWidth - cropX),
  );
  const cropH = Math.max(
    1,
    Math.min(Math.round(pixelCrop.height), naturalHeight - cropY),
  );

  canvas.width = cropW;
  canvas.height = cropH;

  ctx.drawImage(image, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  const usePng = originalFile.type === "image/png";
  const mimeType = usePng ? "image/png" : "image/jpeg";
  const quality = usePng ? undefined : 0.92;
  const blob = await canvasToBlob(canvas, mimeType, quality);

  const baseName = originalFile.name.replace(/\.[^.]+$/, "") || "mosaic-source";
  const extension = usePng ? "png" : "jpg";
  const fileName = `${baseName}-cropped.${extension}`;

  return new File([blob], fileName, { type: mimeType });
}
