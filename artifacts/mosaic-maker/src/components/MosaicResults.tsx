import React from "react";
import { motion } from "framer-motion";
import { Download, LayoutGrid, Palette, DownloadCloud, Ruler, Component, FileImage, FileText } from "lucide-react";
import type { MosaicResult } from "@workspace/api-client-react";
import { getSectionUrl } from "../hooks/use-mosaic";

interface MosaicResultsProps {
  result: MosaicResult;
}

export function MosaicResults({ result }: MosaicResultsProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Stats Header */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Component className="w-4 h-4" />} label="Total Studs" value={result.totalStuds.toLocaleString()} />
        <StatCard icon={<Ruler className="w-4 h-4" />} label="Dimensions" value={`${result.width}×${result.height}`} />
        <StatCard icon={<Palette className="w-4 h-4" />} label="Colors (Before)" value={result.colorsBefore} />
        <StatCard icon={<Palette className="w-4 h-4 text-primary" />} label="Colors (Final)" value={result.colorsAfter} highlight />
      </motion.div>

      {/* Main Previews */}
      <motion.div variants={itemVariants} className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileImage className="w-4 h-4 text-primary" />
              Mosaic Preview
            </h3>
            <a 
              href={result.previewUrl} 
              download
              className="text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
            >
              <Download className="w-3 h-3" /> PNG
            </a>
          </div>
          <div className="bg-white p-2 rounded-2xl border border-border shadow-sm overflow-hidden">
            <img 
              src={result.previewUrl} 
              alt="Mosaic Preview" 
              className="w-full h-auto rounded-xl object-contain bg-zinc-50 pattern-grid"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <LayoutGrid className="w-4 h-4 text-primary" />
              Section Layout
            </h3>
            <a 
              href={result.layoutUrl} 
              download
              className="text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
            >
              <Download className="w-3 h-3" /> PNG
            </a>
          </div>
          <div className="bg-white p-2 rounded-2xl border border-border shadow-sm overflow-hidden">
            <img 
              src={result.layoutUrl} 
              alt="Section Layout" 
              className="w-full h-auto rounded-xl object-contain bg-zinc-50"
            />
          </div>
        </div>
      </motion.div>

      {/* Color Palette Table */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-zinc-50/50">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            Color Requirements
          </h3>
          <a 
            href={result.csvUrl} 
            download
            className="text-sm font-medium text-zinc-700 bg-white border border-border hover:bg-zinc-50 hover:text-foreground px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <FileText className="w-4 h-4" /> Download CSV
          </a>
        </div>
        <div className="overflow-x-auto custom-scrollbar max-h-96">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-zinc-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 font-semibold">Color</th>
                <th className="px-6 py-3 font-semibold">Name</th>
                <th className="px-6 py-3 font-semibold">Code / Hex</th>
                <th className="px-6 py-3 font-semibold text-right">Required Studs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {result.colorCounts.map((color, idx) => (
                <tr key={idx} className="hover:bg-zinc-50/50 transition-colors">
                  <td className="px-6 py-3">
                    <div 
                      className="w-8 h-8 rounded-md shadow-sm border border-black/10"
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  </td>
                  <td className="px-6 py-3 font-medium text-foreground">{color.name}</td>
                  <td className="px-6 py-3 text-muted-foreground font-mono text-xs">
                    {color.code} <span className="opacity-50 mx-1">•</span> {color.hex}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <span className="inline-flex items-center justify-center bg-primary/10 text-primary font-mono font-bold px-3 py-1 rounded-md min-w-[3rem]">
                      {color.count.toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Sections Download Grid */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-border shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <DownloadCloud className="w-5 h-5 text-primary" />
              Build Guides
            </h3>
            <p className="text-sm text-muted-foreground mt-1">Download individual baseplate maps for easier building.</p>
          </div>
          <a 
            href={result.zipUrl}
            download
            className="inline-flex items-center justify-center bg-primary text-white hover:bg-primary/90 hover:shadow-md px-6 py-3 rounded-xl font-bold transition-all duration-200"
          >
            Download Complete Package (ZIP)
          </a>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {result.sections.map((section) => (
            <a
              key={section.label}
              href={getSectionUrl(result.sessionId, section.filename)}
              download
              className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm transition-all group"
            >
              <span className="font-mono font-bold text-foreground group-hover:text-primary transition-colors">
                {section.label}
              </span>
              <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </a>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({ icon, label, value, highlight = false }: { icon: React.ReactNode, label: string, value: string | number, highlight?: boolean }) {
  return (
    <div className={`p-4 rounded-2xl border transition-colors ${highlight ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-white border-border shadow-sm'}`}>
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-2xl font-bold font-mono ${highlight ? 'text-primary' : 'text-foreground'}`}>
        {value}
      </div>
    </div>
  );
}
