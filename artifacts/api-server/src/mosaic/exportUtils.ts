import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import archiver from "archiver";
import { MosaicData } from "./imageProcessing.js";
import { renderMosaic, renderSection, renderLayoutMap } from "./renderUtils.js";

export interface SectionInfo {
  label: string;
  row: number;
  col: number;
  filename: string;
}

export interface ExportResult {
  sessionDir: string;
  previewFilename: string;
  layoutFilename: string;
  csvFilename: string;
  zipFilename: string;
  sections: SectionInfo[];
}

export async function exportMosaic(
  sessionId: string,
  data: MosaicData,
  baseplateSize: number,
  columns: number,
  rows: number
): Promise<ExportResult> {
  const sessionDir = path.join(os.tmpdir(), "mosaic-maker", sessionId);
  fs.mkdirSync(sessionDir, { recursive: true });

  const previewBuf = await renderMosaic(
    data.pixels,
    data.width,
    data.height,
    data.palette
  );
  const previewFilename = "mosaic_preview.png";
  fs.writeFileSync(path.join(sessionDir, previewFilename), previewBuf);

  const layoutBuf = await renderLayoutMap(columns, rows, baseplateSize);
  const layoutFilename = "section_layout.png";
  fs.writeFileSync(path.join(sessionDir, layoutFilename), layoutBuf);

  const sections: SectionInfo[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const label = String.fromCharCode(65 + row) + (col + 1);
      const startX = col * baseplateSize;
      const startY = row * baseplateSize;
      const sectionBuf = await renderSection(
        data.pixels,
        data.width,
        data.palette,
        startX,
        startY,
        baseplateSize,
        baseplateSize,
        label
      );
      const filename = `section_${label}.png`;
      fs.writeFileSync(path.join(sessionDir, filename), sectionBuf);
      sections.push({ label, row, col, filename });
    }
  }

  const csvFilename = "color_counts.csv";
  const csvLines = ["Name,Code,Hex,Count After,Count Before"];
  for (const [colorIdx, afterCount] of data.colorCountsAfter) {
    const color = data.palette[colorIdx];
    if (!color) continue;
    const beforeCount = data.colorCountsBefore.get(colorIdx) ?? 0;
    csvLines.push(
      `"${color.name}","${color.code}","${color.hex}",${afterCount},${beforeCount}`
    );
  }
  fs.writeFileSync(path.join(sessionDir, csvFilename), csvLines.join("\n"));

  const zipFilename = "mosaic_all.zip";
  await createZip(sessionDir, zipFilename);

  return {
    sessionDir,
    previewFilename,
    layoutFilename,
    csvFilename,
    zipFilename,
    sections,
  };
}

async function createZip(sessionDir: string, zipFilename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(path.join(sessionDir, zipFilename));
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", resolve);
    archive.on("error", reject);

    archive.pipe(output);

    const files = fs.readdirSync(sessionDir).filter((f) => f !== zipFilename);
    for (const file of files) {
      archive.file(path.join(sessionDir, file), { name: file });
    }

    archive.finalize();
  });
}
