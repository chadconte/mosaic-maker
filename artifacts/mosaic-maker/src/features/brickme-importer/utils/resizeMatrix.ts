import type { Matrix, ResizeMode } from "./types";

function mostCommonCell<T>(matrix: Matrix<T>): T {
  const counts = new Map<T, number>();

  for (const cell of matrix.cells) {
    counts.set(cell, (counts.get(cell) ?? 0) + 1);
  }

  let best = matrix.cells[0];
  let bestCount = -1;
  for (const [cell, count] of counts) {
    if (count > bestCount) {
      best = cell;
      bestCount = count;
    }
  }

  return best;
}

function sampleNearest<T>(matrix: Matrix<T>, x: number, y: number): T {
  const sx = Math.max(0, Math.min(matrix.width - 1, Math.floor(x)));
  const sy = Math.max(0, Math.min(matrix.height - 1, Math.floor(y)));
  return matrix.cells[sy * matrix.width + sx];
}

export function resizeMatrixNearest<T>(
  matrix: Matrix<T>,
  targetWidth: number,
  targetHeight: number,
  mode: ResizeMode,
  padCell = mostCommonCell(matrix),
): Matrix<T> {
  const cells: T[] = new Array(targetWidth * targetHeight);
  const sourceAspect = matrix.width / matrix.height;
  const targetAspect = targetWidth / targetHeight;

  let scaleX = matrix.width / targetWidth;
  let scaleY = matrix.height / targetHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (mode === "cover-crop") {
    const scale =
      sourceAspect > targetAspect
        ? matrix.height / targetHeight
        : matrix.width / targetWidth;
    scaleX = scale;
    scaleY = scale;
    offsetX = (matrix.width - targetWidth * scale) / 2;
    offsetY = (matrix.height - targetHeight * scale) / 2;
  }

  if (mode === "contain-pad") {
    const scale =
      sourceAspect > targetAspect
        ? matrix.width / targetWidth
        : matrix.height / targetHeight;
    const renderedW = matrix.width / scale;
    const renderedH = matrix.height / scale;
    const padX = (targetWidth - renderedW) / 2;
    const padY = (targetHeight - renderedH) / 2;

    for (let y = 0; y < targetHeight; y++) {
      for (let x = 0; x < targetWidth; x++) {
        const sx = (x - padX) * scale;
        const sy = (y - padY) * scale;
        cells[y * targetWidth + x] =
          sx < 0 || sy < 0 || sx >= matrix.width || sy >= matrix.height
            ? padCell
            : sampleNearest(matrix, sx, sy);
      }
    }

    return {
      width: targetWidth,
      height: targetHeight,
      cells,
    };
  }

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      cells[y * targetWidth + x] = sampleNearest(
        matrix,
        offsetX + x * scaleX,
        offsetY + y * scaleY,
      );
    }
  }

  return {
    width: targetWidth,
    height: targetHeight,
    cells,
  };
}

