import type { LegoMatrix } from "./types";

export type ColorCount = {
  code: string;
  name: string;
  hex: string;
  count: number;
};

export type PlateBreakdown = {
  plateColumn: number;
  plateRow: number;
  label: string;
  counts: ColorCount[];
};

function escapeCsv(value: string | number): string {
  const raw = String(value);
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

export function getColorCounts(matrix: LegoMatrix): ColorCount[] {
  const counts = new Map<string, ColorCount>();

  for (const color of matrix.cells) {
    const existing = counts.get(color.code);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(color.code, {
        code: color.code,
        name: color.name,
        hex: color.hex,
        count: 1,
      });
    }
  }

  return Array.from(counts.values()).sort((a, b) => b.count - a.count);
}

export function exportPatternCsv(matrix: LegoMatrix): string {
  const rows = [["row", "column", "color name", "color code", "color hex"]];

  for (let y = 0; y < matrix.height; y++) {
    for (let x = 0; x < matrix.width; x++) {
      const color = matrix.cells[y * matrix.width + x];
      rows.push([
        y + 1,
        x + 1,
        color.name,
        color.code,
        color.hex,
      ].map(String));
    }
  }

  return rows
    .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
    .join("\n");
}

export function exportColorCountsCsv(counts: ColorCount[]): string {
  const rows = [["color name", "color code", "color hex", "stud count"]];
  rows.push(...counts.map((count) => [
    count.name,
    count.code,
    count.hex,
    String(count.count),
  ]));
  return rows
    .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
    .join("\n");
}

export function getPlateBreakdown(
  matrix: LegoMatrix,
  plateSize = 16,
): PlateBreakdown[] {
  const plateColumns = Math.ceil(matrix.width / plateSize);
  const plateRows = Math.ceil(matrix.height / plateSize);
  const plates: PlateBreakdown[] = [];

  for (let py = 0; py < plateRows; py++) {
    for (let px = 0; px < plateColumns; px++) {
      const cells = [];
      const startX = px * plateSize;
      const startY = py * plateSize;
      const endX = Math.min(matrix.width, startX + plateSize);
      const endY = Math.min(matrix.height, startY + plateSize);

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          cells.push(matrix.cells[y * matrix.width + x]);
        }
      }

      plates.push({
        plateColumn: px + 1,
        plateRow: py + 1,
        label: `${String.fromCharCode(65 + py)}${px + 1}`,
        counts: getColorCounts({
          width: endX - startX,
          height: endY - startY,
          cells,
        }),
      });
    }
  }

  return plates;
}

export function exportPlateBreakdownCsv(matrix: LegoMatrix): string {
  const rows = [
    ["plate", "plate row", "plate column", "color name", "color code", "color hex", "stud count"],
  ];

  for (const plate of getPlateBreakdown(matrix)) {
    for (const count of plate.counts) {
      rows.push([
        plate.label,
        String(plate.plateRow),
        String(plate.plateColumn),
        count.name,
        count.code,
        count.hex,
        String(count.count),
      ]);
    }
  }

  return rows
    .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
    .join("\n");
}

