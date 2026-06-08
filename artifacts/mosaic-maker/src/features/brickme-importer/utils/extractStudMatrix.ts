import type { Area } from "react-easy-crop";
import type {
  ExtractStudMatrixResult,
  Matrix,
  Rgb,
  SamplingMethod,
} from "./types";

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

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export async function extractStudMatrix(
  imageSrc: string,
  cropArea: Area,
  sourceWidth: number,
  sourceHeight: number,
  sampleAreaPercent = 35,
  samplingMethod: SamplingMethod = "median",
): Promise<ExtractStudMatrixResult> {
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
  const cellW = cropW / sourceWidth;
  const cellH = cropH / sourceHeight;
  const sampleW = Math.max(1, Math.round(cellW * (sampleAreaPercent / 100)));
  const sampleH = Math.max(1, Math.round(cellH * (sampleAreaPercent / 100)));

  for (let row = 0; row < sourceHeight; row++) {
    for (let col = 0; col < sourceWidth; col++) {
      const centerX = Math.floor((col + 0.5) * cellW);
      const centerY = Math.floor((row + 0.5) * cellH);
      const reds: number[] = [];
      const greens: number[] = [];
      const blues: number[] = [];
      const halfW = Math.max(0, Math.floor(sampleW / 2));
      const halfH = Math.max(0, Math.floor(sampleH / 2));

      if (samplingMethod === "center") {
        const index =
          (clamp(centerY, 0, cropH - 1) * cropW + clamp(centerX, 0, cropW - 1)) *
          4;
        cells.push({
          r: data[index] ?? 0,
          g: data[index + 1] ?? 0,
          b: data[index + 2] ?? 0,
        });
        continue;
      }

      for (let y = centerY - halfH; y <= centerY + halfH; y++) {
        for (let x = centerX - halfW; x <= centerX + halfW; x++) {
          const sx = clamp(x, 0, cropW - 1);
          const sy = clamp(y, 0, cropH - 1);
          const index = (sy * cropW + sx) * 4;
          reds.push(data[index] ?? 0);
          greens.push(data[index + 1] ?? 0);
          blues.push(data[index + 2] ?? 0);
        }
      }

      cells.push({
        r: samplingMethod === "mean" ? mean(reds) : median(reds),
        g: samplingMethod === "mean" ? mean(greens) : median(greens),
        b: samplingMethod === "mean" ? mean(blues) : median(blues),
      });
    }
  }

  return {
    matrix: {
      width: sourceWidth,
      height: sourceHeight,
      cells,
    },
    croppedDataUrl: canvas.toDataURL("image/png"),
    cropPixelWidth: cropW,
    cropPixelHeight: cropH,
  };
}
