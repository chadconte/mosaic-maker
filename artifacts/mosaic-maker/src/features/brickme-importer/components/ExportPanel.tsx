import { Download, FileImage, FileText, Grid3X3 } from "lucide-react";
import type { ReactNode } from "react";
import {
  exportColorCountsCsv,
  exportPatternCsv,
  exportPlateBreakdownCsv,
  getColorCounts,
} from "../utils/exportCsv";
import { downloadDataUrl, downloadText, matrixToPngDataUrl } from "../utils/renderMatrix";
import type { LegoMatrix } from "../utils/types";

type ExportPanelProps = {
  matrix: LegoMatrix | null;
};

export function ExportPanel({ matrix }: ExportPanelProps) {
  const counts = matrix ? getColorCounts(matrix) : [];

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Download className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">Exports</h2>
          <p className="text-sm text-muted-foreground">
            PNG preview, CSV pattern, color counts, and plate counts.
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <ExportButton
          icon={<FileImage className="h-4 w-4" />}
          label="PNG Preview"
          disabled={!matrix}
          onClick={() => {
            if (!matrix) return;
            downloadDataUrl(
              matrixToPngDataUrl(matrix, {
                cellSize: 12,
                gridEvery: 16,
                roundStuds: true,
                colorOf: (color) => color.hex,
              }),
              "mosaic-adapter-preview.png",
            );
          }}
        />
        <ExportButton
          icon={<FileText className="h-4 w-4" />}
          label="CSV Pattern"
          disabled={!matrix}
          onClick={() => matrix && downloadText(exportPatternCsv(matrix), "mosaic-adapter-pattern.csv")}
        />
        <ExportButton
          icon={<FileText className="h-4 w-4" />}
          label="Color Counts"
          disabled={!matrix}
          onClick={() =>
            matrix &&
            downloadText(
              exportColorCountsCsv(getColorCounts(matrix)),
              "mosaic-adapter-color-counts.csv",
            )
          }
        />
        <ExportButton
          icon={<Grid3X3 className="h-4 w-4" />}
          label="16x16 Plates"
          disabled={!matrix}
          onClick={() =>
            matrix &&
            downloadText(
              exportPlateBreakdownCsv(matrix),
              "mosaic-adapter-plate-breakdown.csv",
            )
          }
        />
      </div>

      {counts.length ? (
        <div className="mt-5 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Color</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 text-right font-medium">Studs</th>
              </tr>
            </thead>
            <tbody>
              {counts.map((count) => (
                <tr key={count.code} className="border-t border-border">
                  <td className="px-3 py-2">
                    <span
                      className="inline-block h-5 w-5 rounded border border-black/10"
                      style={{ backgroundColor: count.hex }}
                    />
                  </td>
                  <td className="px-3 py-2 font-medium text-foreground">
                    {count.name}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-primary">
                    {count.count.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function ExportButton({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {icon}
      {label}
    </button>
  );
}
