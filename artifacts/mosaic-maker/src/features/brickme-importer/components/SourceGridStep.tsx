import { Grid3X3, ScanLine } from "lucide-react";
import type {
  ExtractionMode,
  FixedSourceColorCount,
  SamplingMethod,
} from "../utils/types";

type SourceGridStepProps = {
  sourceWidth: number;
  sourceHeight: number;
  extractionMode: ExtractionMode;
  sourceColorCount: number;
  sampleAreaPercent: number;
  samplingMethod: SamplingMethod;
  canExtract: boolean;
  isExtracting: boolean;
  onSourceWidthChange: (value: number) => void;
  onSourceHeightChange: (value: number) => void;
  onExtractionModeChange: (value: ExtractionMode) => void;
  onSourceColorCountChange: (value: FixedSourceColorCount) => void;
  onSampleAreaPercentChange: (value: number) => void;
  onSamplingMethodChange: (value: SamplingMethod) => void;
  onExtract: () => void;
};

export function SourceGridStep({
  sourceWidth,
  sourceHeight,
  extractionMode,
  sourceColorCount,
  sampleAreaPercent,
  samplingMethod,
  canExtract,
  isExtracting,
  onSourceWidthChange,
  onSourceHeightChange,
  onExtractionModeChange,
  onSourceColorCountChange,
  onSampleAreaPercentChange,
  onSamplingMethodChange,
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

      <label className="mt-4 block">
        <span className="text-sm font-medium text-foreground">
          Extraction Mode
        </span>
        <select
          value={extractionMode}
          onChange={(event) =>
            onExtractionModeChange(event.target.value as ExtractionMode)
          }
          className="mt-1 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-2"
        >
          <option value="auto">Auto</option>
          <option value="exact">Exact</option>
          <option value="fixed">Fixed Count</option>
        </select>
      </label>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-medium text-foreground">
            Source Color Count
          </span>
          <select
            value={sourceColorCount}
            disabled={extractionMode !== "fixed"}
            onChange={(event) =>
              onSourceColorCountChange(
                Number(event.target.value) as FixedSourceColorCount,
              )
            }
            className="mt-1 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-2 disabled:bg-zinc-100 disabled:text-muted-foreground"
          >
            {[12, 16, 20, 24, 32, 48].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </label>
        <NumberField
          label="Sample Area %"
          value={sampleAreaPercent}
          min={15}
          max={70}
          onChange={onSampleAreaPercentChange}
        />
      </div>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-foreground">
          Sampling Method
        </span>
        <select
          value={samplingMethod}
          onChange={(event) =>
            onSamplingMethodChange(event.target.value as SamplingMethod)
          }
          className="mt-1 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none ring-primary/20 focus:ring-2"
        >
          <option value="median">Median RGB</option>
          <option value="mean">Mean RGB</option>
          <option value="center">Center pixel</option>
        </select>
      </label>

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
