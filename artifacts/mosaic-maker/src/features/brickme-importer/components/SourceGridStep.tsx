import { Grid3X3, ScanLine } from "lucide-react";

type SourceGridStepProps = {
  sourceWidth: number;
  sourceHeight: number;
  clusterThreshold: number;
  canExtract: boolean;
  isExtracting: boolean;
  onSourceWidthChange: (value: number) => void;
  onSourceHeightChange: (value: number) => void;
  onClusterThresholdChange: (value: number) => void;
  onExtract: () => void;
};

export function SourceGridStep({
  sourceWidth,
  sourceHeight,
  clusterThreshold,
  canExtract,
  isExtracting,
  onSourceWidthChange,
  onSourceHeightChange,
  onClusterThresholdChange,
  onExtract,
}: SourceGridStepProps) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Grid3X3 className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">Source Grid</h2>
          <p className="text-sm text-muted-foreground">
            Tell the importer how many studs BrickMe used.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Source width"
          value={sourceWidth}
          min={1}
          onChange={onSourceWidthChange}
        />
        <NumberField
          label="Source height"
          value={sourceHeight}
          min={1}
          onChange={onSourceHeightChange}
        />
      </div>

      <div className="mt-4">
        <NumberField
          label="Color cluster tolerance"
          value={clusterThreshold}
          min={1}
          max={80}
          onChange={onClusterThresholdChange}
        />
      </div>

      <button
        type="button"
        onClick={onExtract}
        disabled={!canExtract || isExtracting}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ScanLine className="h-4 w-4" />
        {isExtracting ? "Extracting..." : "Extract Stud Matrix"}
      </button>
    </section>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-2"
      />
    </label>
  );
}

