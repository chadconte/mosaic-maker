import { Maximize2 } from "lucide-react";
import type { ResizeMode } from "../utils/types";

type TargetSizePanelProps = {
  targetWidth: number;
  targetHeight: number;
  resizeMode: ResizeMode;
  showBaseplateGrid: boolean;
  showStudGrid: boolean;
  onTargetWidthChange: (value: number) => void;
  onTargetHeightChange: (value: number) => void;
  onResizeModeChange: (value: ResizeMode) => void;
  onShowBaseplateGridChange: (value: boolean) => void;
  onShowStudGridChange: (value: boolean) => void;
};

export function TargetSizePanel({
  targetWidth,
  targetHeight,
  resizeMode,
  showBaseplateGrid,
  showStudGrid,
  onTargetWidthChange,
  onTargetHeightChange,
  onResizeModeChange,
  onShowBaseplateGridChange,
  onShowStudGridChange,
}: TargetSizePanelProps) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Maximize2 className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">Target Output</h2>
          <p className="text-sm text-muted-foreground">
            Default is 5 by 8 of 16x16 plates: 80x128 studs.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Target width"
          value={targetWidth}
          onChange={onTargetWidthChange}
        />
        <NumberField
          label="Target height"
          value={targetHeight}
          onChange={onTargetHeightChange}
        />
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-foreground">Adapt mode</span>
        <select
          value={resizeMode}
          onChange={(event) =>
            onResizeModeChange(event.target.value as ResizeMode)
          }
          className="mt-1 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-2"
        >
          <option value="cover-crop">Preserve ratio, crop edges</option>
          <option value="contain-pad">Preserve ratio, pad edges</option>
          <option value="stretch">Stretch exactly</option>
        </select>
      </label>

      <label className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-border bg-zinc-50 px-3 py-3 text-sm">
        <span className="font-medium text-foreground">Show 16x16 grid</span>
        <input
          type="checkbox"
          checked={showBaseplateGrid}
          onChange={(event) => onShowBaseplateGridChange(event.target.checked)}
          className="h-5 w-5 accent-primary"
        />
      </label>

      <label className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-zinc-50 px-3 py-3 text-sm">
        <span className="font-medium text-foreground">Show stud grid</span>
        <input
          type="checkbox"
          checked={showStudGrid}
          onChange={(event) => onShowStudGridChange(event.target.checked)}
          className="h-5 w-5 accent-primary"
        />
      </label>
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        type="number"
        min={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-2"
      />
    </label>
  );
}
