import type { Matrix } from "../utils/types";

type MatrixPreviewProps<T> = {
  title: string;
  subtitle: string;
  matrix: Matrix<T> | null;
  colorOf: (cell: T) => string;
  showBaseplateGrid?: boolean;
  showStudGrid?: boolean;
  highlightOf?: (cell: T) => "active" | "dim" | "normal";
};

export function MatrixPreview<T>({
  title,
  subtitle,
  matrix,
  colorOf,
  showBaseplateGrid = false,
  showStudGrid = false,
  highlightOf,
}: MatrixPreviewProps<T>) {
  return (
    <section className="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {matrix ? (
          <span className="rounded-lg bg-zinc-100 px-2 py-1 font-mono text-xs text-muted-foreground">
            {matrix.width}x{matrix.height}
          </span>
        ) : null}
      </div>

      {matrix ? (
        <div className="overflow-auto rounded-xl border border-border bg-zinc-100 p-3">
          <div
            className="mx-auto grid w-full max-w-[680px] overflow-hidden rounded-lg border border-black/10 bg-white"
            style={{
              aspectRatio: `${matrix.width} / ${matrix.height}`,
              gridTemplateColumns: `repeat(${matrix.width}, minmax(0, 1fr))`,
            }}
          >
            {matrix.cells.map((cell, index) => {
              const x = index % matrix.width;
              const y = Math.floor(index / matrix.width);
              const highlight = highlightOf?.(cell) ?? "normal";
              return (
                <span
                  key={index}
                  className="block aspect-square"
                  style={{
                    backgroundColor: colorOf(cell),
                    opacity: highlight === "dim" ? 0.18 : 1,
                    boxShadow:
                      highlight === "active"
                        ? "inset 0 0 0 2px rgba(255,255,255,0.9), inset 0 0 0 3px rgba(0,0,0,0.85)"
                        : showBaseplateGrid && (x % 16 === 0 || y % 16 === 0)
                        ? "inset 1px 1px 0 rgba(0,0,0,0.35)"
                        : showStudGrid
                          ? "inset 0 0 0 1px rgba(0,0,0,0.10)"
                        : undefined,
                  }}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-zinc-50 p-8 text-center text-sm text-muted-foreground">
          Extract the source grid to populate this preview.
        </div>
      )}
    </section>
  );
}
