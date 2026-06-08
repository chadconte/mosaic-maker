import type { Area } from "react-easy-crop";
import type { Matrix, Rgb } from "./types";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.src = src;
  });
}

function median(values: number[]): number {
  const sorted = values.sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export async function extractStudMatrix(
  imageSrc: string,
  cropArea: Area,
  sourceWidth: number,
  sourceHeight: number,
  sampleRadius = 2,
): Promise<Matrix<Rgb>> {
  const image = await loadImage(imageSrc);
  const cropX = clamp(Math.round(cropArea.x), 0, image.naturalWidth - 1);
  const cropY = clamp(Math.round(cropArea.y), 0, image.naturalHeight - 1);
  const cropW = clamp(Math.round(cropArea.width), 1, image.naturalWidth - cropX);
  const cropH = clamp(
    Math.round(cropArea.height),
    1,
    image.naturalHeight - cropY,
  );

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) {
    throw new Error("Canvas is not available");
  }

  canvas.width = cropW;
  canvas.height = cropH;
  ctx.drawImage(image, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  const data = ctx.getImageData(0, 0, cropW, cropH).data;
  const cells: Rgb[] = [];

  for (let row = 0; row < sourceHeight; row++) {
    for (let col = 0; col < sourceWidth; col++) {
      const centerX = Math.floor((col + 0.5) * (cropW / sourceWidth));
      const centerY = Math.floor((row + 0.5) * (cropH / sourceHeight));
      const reds: number[] = [];
      const greens: number[] = [];
      const blues: number[] = [];

      for (let y = centerY - sampleRadius; y <= centerY + sampleRadius; y++) {
        for (let x = centerX - sampleRadius; x <= centerX + sampleRadius; x++) {
          const sx = clamp(x, 0, cropW - 1);
          const sy = clamp(y, 0, cropH - 1);
          const index = (sy * cropW + sx) * 4;
          reds.push(data[index] ?? 0);
          greens.push(data[index + 1] ?? 0);
          blues.push(data[index + 2] ?? 0);
        }
      }

      cells.push({
        r: median(reds),
        g: median(greens),
        b: median(blues),
      });
    }
  }

  return {
    width: sourceWidth,
    height: sourceHeight,
    cells,
  };
}

