// artifacts/mosaic-maker/src/components/MosaicResults.tsx

import React from "react";
import { motion } from "framer-motion";
import {
  Download,
  Palette,
  DownloadCloud,
  Ruler,
  Component,
  FileImage,
  FileText,
  Grid3X3,
} from "lucide-react";
import type { MosaicResult } from "@workspace/api-client-react";
import { getSectionUrl } from "../hooks/use-mosaic";

interface MosaicResultsProps {
  result: MosaicResult;
}

export function MosaicResults({ result }: MosaicResultsProps) {
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="grid grid-cols-2 2xl:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <StatCard
          icon={<Component className="h-5 w-5" />}
          label="Total Studs"
          value={result.totalStuds.toLocaleString()}
        />
        <StatCard
          icon={<Ruler className="h-5 w-5" />}
          label="Dimensions"
          value={`${result.width}×${result.height}`}
        />
        <StatCard
          icon={<Palette className="h-5 w-5" />}
          label="Colors (Before)"
          value={result.colorsBefore}
        />
        <StatCard
          icon={<Palette className="h-5 w-5" />}
          label="Colors (Final)"
          value={result.colorsAfter}
          highlight
        />
      </motion.div>

      <motion.div
        className="grid grid-cols-1 gap-6"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <div className="rounded-3xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-5">
            <div className="flex items-center gap-2">
              <FileImage className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Final Mosaic Preview
                </h3>
                <p className="text-sm text-muted-foreground">
                  Main build preview.
                </p>
              </div>
            </div>

            <a
              href={result.previewUrl}
              download
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-zinc-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              PNG
            </a>
          </div>

          <div className="p-6">
            <div className="rounded-2xl border border-border bg-zinc-50 p-4">
              <div className="flex justify-center">
                <img
                  src={result.previewUrl}
                  alt="Final mosaic preview"
                  className="block w-full max-w-[920px] rounded-2xl border border-border bg-white object-contain shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Inventory List
                </h3>
                <p className="text-sm text-muted-foreground">
                  Everything you need for the finished mosaic.
                </p>
              </div>
            </div>

            <a
              href={result.csvUrl}
              download
              className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-zinc-50 transition-colors"
            >
              <FileText className="h-4 w-4" />
              Download CSV
            </a>
          </div>

          <div className="p-4 sm:p-6">
            <div className="overflow-hidden rounded-2xl border border-border">
              <table className="min-w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[72px]" />
                  <col className="w-[28%]" />
                  <col className="w-[32%]" />
                  <col className="w-[20%]" />
                </colgroup>
                <thead className="bg-zinc-50">
                  <tr className="text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Color</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Code / Hex</th>
                    <th className="px-4 py-3 font-medium text-right">Studs</th>
                  </tr>
                </thead>
                <tbody>
                  {result.colorCounts.map((color) => (
                    <tr
                      key={`${color.code}-${color.hex}`}
                      className="border-t border-border align-top"
                    >
                      <td className="px-4 py-3">
                        <span
                          className="inline-block h-6 w-6 rounded-md border border-black/10"
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground break-words">
                        {color.name}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground break-words">
                        <div>{color.code}</div>
                        <div>{color.hex}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-primary">
                        {color.count.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 2xl:grid-cols-[320px_minmax(0,1fr)] gap-6 items-start">
          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-5">
                <div className="flex items-center gap-2">
                  <Grid3X3 className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      Section Layout
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Grid map for baseplate placement.
                    </p>
                  </div>
                </div>

                <a
                  href={result.layoutUrl}
                  download
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-zinc-50 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  PNG
                </a>
              </div>

              <div className="p-6">
                <div className="flex justify-center rounded-2xl border border-border bg-zinc-50 p-4">
                  <img
                    src={result.layoutUrl}
                    alt="Section layout"
                    className="block w-full max-w-[240px] rounded-2xl border border-border bg-white object-contain shadow-sm"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-5">
                <div className="flex items-center gap-2">
                  <DownloadCloud className="h-5 w-5 text-primary" />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
                      Build Guides
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Download individual sections or the full package.
                    </p>
                  </div>
                </div>

                <a
                  href={result.zipUrl}
                  download
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                >
                  <DownloadCloud className="h-4 w-4" />
                  ZIP
                </a>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  {result.sections.map((section) => (
                    <a
                      key={section.label}
                      href={getSectionUrl(result.sessionId, section.filename)}
                      download
                      className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-3 py-3 text-sm font-medium text-foreground hover:bg-zinc-50 transition-colors"
                    >
                      {section.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div />
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border bg-white px-5 py-4 shadow-sm",
        highlight
          ? "border-primary/30 ring-1 ring-primary/20"
          : "border-border",
      ].join(" ")}
    >
      <div className="mb-3 flex items-center gap-2 text-muted-foreground">
        <span className={highlight ? "text-primary" : ""}>{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>

      <div
        className={[
          "text-3xl font-bold tracking-tight",
          highlight ? "text-primary" : "text-foreground",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}