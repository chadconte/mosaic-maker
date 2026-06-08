import { labDistance, rgbToLab } from "./colorMath";
import type { Matrix, Rgb } from "./types";

export type FidelityMetrics = {
  meanRgbDifference: number;
  meanLabDifference: number;
  percentMatchingPixels: number;
  overallScore: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.src = src;
  });
}

function rgbDiff(a: Rgb, b: Rgb): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export async function computeFidelityMetrics(
  croppedDataUrl: string,
  extractedMatrix: Matrix<Rgb>,
): Promise<FidelityMetrics> {
  const image = await loadImage(croppedDataUrl);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  if (!ctx) {
    throw new Error("Canvas is not available");
  }

  const width = image.naturalWidth;
  const height = image.naturalHeight;
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0);

  const data = ctx.getImageData(0, 0, width, height).data;
  let totalRgb = 0;
  let totalLab = 0;
  let matching = 0;
  const totalPixels = width * height;

  for (let y = 0; y < height; y++) {
    const matrixY = Math.min(
      extractedMatrix.height - 1,
      Math.floor((y / height) * extractedMatrix.height),
    );

    for (let x = 0; x < width; x++) {
      const matrixX = Math.min(
        extractedMatrix.width - 1,
        Math.floor((x / width) * extractedMatrix.width),
      );
      const index = (y * width + x) * 4;
      const original = {
        r: data[index] ?? 0,
        g: data[index + 1] ?? 0,
        b: data[index + 2] ?? 0,
      };
      const extracted =
        extractedMatrix.cells[matrixY * extractedMatrix.width + matrixX];
      const rgbDifference = rgbDiff(original, extracted);
      const labDifference = labDistance(rgbToLab(original), rgbToLab(extracted));

      totalRgb += rgbDifference;
      totalLab += labDifference;
      if (rgbDifference <= 18) {
        matching += 1;
      }
    }
  }

  const meanRgbDifference = totalRgb / totalPixels;
  const meanLabDifference = totalLab / totalPixels;
  const percentMatchingPixels = (matching / totalPixels) * 100;
  const rgbScore = Math.max(0, 100 - (meanRgbDifference / 90) * 100);
  const labScore = Math.max(0, 100 - (meanLabDifference / 45) * 100);

  return {
    meanRgbDifference,
    meanLabDifference,
    percentMatchingPixels,
    overallScore: rgbScore * 0.45 + labScore * 0.35 + percentMatchingPixels * 0.2,
  };
}

