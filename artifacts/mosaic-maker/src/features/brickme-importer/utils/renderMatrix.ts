import type { Matrix, Rgb } from "./types";

type RenderOptions<T> = {
  cellSize?: number;
  gridEvery?: number;
  roundStuds?: boolean;
  colorOf: (cell: T) => string;
};

export function matrixToPngDataUrl<T>(
  matrix: Matrix<T>,
  options: RenderOptions<T>,
): string {
  const cellSize = options.cellSize ?? 10;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Canvas is not available");
  }

  canvas.width = matrix.width * cellSize;
  canvas.height = matrix.height * cellSize;

  for (let y = 0; y < matrix.height; y++) {
    for (let x = 0; x < matrix.width; x++) {
      const cell = matrix.cells[y * matrix.width + x];
      ctx.fillStyle = options.colorOf(cell);
      ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

      if (options.roundStuds) {
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.beginPath();
        ctx.arc(
          x * cellSize + cellSize * 0.36,
          y * cellSize + cellSize * 0.34,
          Math.max(1, cellSize * 0.16),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }

  if (options.gridEvery) {
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = Math.max(1, cellSize * 0.08);

    for (let x = options.gridEvery; x < matrix.width; x += options.gridEvery) {
      ctx.beginPath();
      ctx.moveTo(x * cellSize, 0);
      ctx.lineTo(x * cellSize, canvas.height);
      ctx.stroke();
    }

    for (let y = options.gridEvery; y < matrix.height; y += options.gridEvery) {
      ctx.beginPath();
      ctx.moveTo(0, y * cellSize);
      ctx.lineTo(canvas.width, y * cellSize);
      ctx.stroke();
    }
  }

  return canvas.toDataURL("image/png");
}

export function rgbToCss(rgb: Rgb): string {
  return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

export function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

export function downloadText(text: string, filename: string, mime = "text/csv") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

