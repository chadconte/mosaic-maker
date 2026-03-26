import { Router, type IRouter, Request, Response } from "express";
import multer from "multer";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { v4 as uuidv4 } from "uuid";
import { processImage } from "../mosaic/imageProcessing.js";
import { exportMosaic } from "../mosaic/exportUtils.js";
import type { PaletteColor } from "../mosaic/palette.js";

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

type DetailMode = "detail" | "balanced" | "clean";

const MODE_THRESHOLD_MAP: Record<DetailMode, number> = {
  detail: 4,
  balanced: 8,
  clean: 15,
};

function resolveThreshold(mode: DetailMode): number {
  return MODE_THRESHOLD_MAP[mode] ?? MODE_THRESHOLD_MAP.balanced;
}

function parsePalette(rawPalette: unknown): PaletteColor[] | undefined {
  if (!rawPalette) return undefined;

  try {
    const parsed =
      typeof rawPalette === "string" ? JSON.parse(rawPalette) : rawPalette;

    if (!Array.isArray(parsed)) {
      throw new Error("Palette must be an array");
    }

    return parsed.map((item) => ({
      name: String(item.name),
      code: String(item.code),
      hex: String(item.hex),
      enabled: Boolean(item.enabled),
      family: item.family,
    })) as PaletteColor[];
  } catch (error) {
    throw new Error("Invalid palette payload");
  }
}

router.post(
  "/generate",
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "No image file provided" });
        return;
      }

      const baseplateSize = parseInt(String(req.body.baseplateSize), 10);
      const columns = parseInt(String(req.body.columns), 10);
      const rows = parseInt(String(req.body.rows), 10);

      const mode = String(req.body.mode ?? "balanced") as DetailMode;
      const threshold = resolveThreshold(mode);

      const protectEdges =
        String(req.body.protectEdges ?? "true").toLowerCase() !== "false";

      const palette = parsePalette(req.body.palette);

      if (![16, 32].includes(baseplateSize)) {
        res.status(400).json({ error: "baseplateSize must be 16 or 32" });
        return;
      }

      if (isNaN(columns) || columns < 1 || isNaN(rows) || rows < 1) {
        res
          .status(400)
          .json({ error: "columns and rows must be positive integers" });
        return;
      }

      if (!["detail", "balanced", "clean"].includes(mode)) {
        res
          .status(400)
          .json({ error: "mode must be detail, balanced, or clean" });
        return;
      }

      const sessionId = uuidv4();

      console.log("REQUEST_SETTINGS", {
        baseplateSize,
        columns,
        rows,
        mode,
        resolvedThreshold: threshold,
        protectEdges,
        paletteCount: palette?.length ?? 0,
        enabledPaletteCount: palette?.filter((c) => c.enabled).length ?? 0,
      });

      const mosaicData = await processImage(
        req.file.buffer,
        baseplateSize,
        columns,
        rows,
        threshold,
        {
          palette,
          protectEdges,
        },
      );

      const exported = await exportMosaic(
        sessionId,
        mosaicData,
        baseplateSize,
        columns,
        rows,
      );

      const colorCounts = Array.from(mosaicData.colorCountsAfter.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([idx, count]) => {
          const color = mosaicData.palette[idx];
          return {
            name: color?.name ?? "Unknown",
            code: color?.code ?? "",
            hex: color?.hex ?? "#000000",
            count,
            beforeCleanup: mosaicData.colorCountsBefore.get(idx) ?? 0,
          };
        });

      const baseUrl = `/api/mosaic/download/${sessionId}`;

      res.json({
        sessionId,
        totalStuds: mosaicData.width * mosaicData.height,
        width: mosaicData.width,
        height: mosaicData.height,
        baseplateSize,
        columns,
        rows,
        mode,
        thresholdUsed: threshold,
        protectEdges,
        colorsBefore: mosaicData.colorCountsBefore.size,
        colorsAfter: mosaicData.colorCountsAfter.size,
        colorCounts,
        sections: exported.sections,
        previewUrl: `${baseUrl}/${exported.previewFilename}`,
        layoutUrl: `${baseUrl}/${exported.layoutFilename}`,
        csvUrl: `${baseUrl}/${exported.csvFilename}`,
        zipUrl: `${baseUrl}/${exported.zipFilename}`,
      });
    } catch (err) {
      req.log.error({ err }, "Error generating mosaic");
      res.status(500).json({ error: "Failed to generate mosaic" });
    }
  },
);

router.get("/download/:sessionId/:filename", (req: Request, res: Response) => {
  const { sessionId, filename } = req.params;

  if (!/^[a-f0-9-]{36}$/.test(sessionId)) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  if (!/^[\w\-. ]+\.(png|csv|zip)$/i.test(filename)) {
    res.status(400).json({ error: "Invalid filename" });
    return;
  }

  const filePath = path.join(os.tmpdir(), "mosaic-maker", sessionId, filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.download(filePath, filename);
});

export default router;
