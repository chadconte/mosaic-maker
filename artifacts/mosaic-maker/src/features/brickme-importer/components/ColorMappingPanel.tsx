import { Palette } from "lucide-react";
import { PALETTE } from "@/lib/palette";
import { rgbToHex } from "../utils/colorMath";
import type { ColorMapping } from "../utils/mapToLegoPalette";
import type { SourceColorCluster } from "../utils/types";

type ColorMappingPanelProps = {
  clusters: SourceColorCluster[];
  mapping: ColorMapping;
  onMappingChange: (clusterId: string, paletteCode: string) => void;
};

export function ColorMappingPanel({
  clusters,
  mapping,
  onMappingChange,
}: ColorMappingPanelProps) {
  const enabledPalette = PALETTE.filter((color) => color.enabled);

  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Palette className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">Color Mapping</h2>
          <p className="text-sm text-muted-foreground">
            Override any BrickMe source swatch before adapting.
          </p>
        </div>
      </div>

      {clusters.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-zinc-50 p-6 text-center text-sm text-muted-foreground">
          Source colors will appear after extraction.
        </div>
      ) : (
        <div className="max-h-[520px] space-y-2 overflow-auto pr-1">
          {clusters.map((cluster) => {
            const selected = enabledPalette.find(
              (color) => color.code === mapping[cluster.id],
            );

            return (
              <div
                key={cluster.id}
                className="grid grid-cols-[32px_1fr] gap-3 rounded-xl border border-border p-3 sm:grid-cols-[32px_1fr_220px]"
              >
                <span
                  className="h-8 w-8 rounded-md border border-black/10"
                  style={{ backgroundColor: rgbToHex(cluster.rgb) }}
                  title={rgbToHex(cluster.rgb)}
                />
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-foreground">
                    {rgbToHex(cluster.rgb)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {cluster.count.toLocaleString()} studs
                    {selected ? ` -> ${selected.name}` : ""}
                  </div>
                </div>
                <select
                  value={mapping[cluster.id] ?? ""}
                  onChange={(event) =>
                    onMappingChange(cluster.id, event.target.value)
                  }
                  className="col-span-2 h-10 rounded-lg border border-border bg-white px-2 text-sm outline-none ring-primary/20 focus:ring-2 sm:col-span-1"
                >
                  {enabledPalette.map((color) => (
                    <option key={color.code} value={color.code}>
                      {color.name} ({color.code})
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

