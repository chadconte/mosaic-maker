import { Router, type IRouter, Request, Response } from "express";
import multer from "multer";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { v4 as uuidv4 } from "uuid";
import { processImage } from "../mosaic/imageProcessing.js";
import { exportMosaic } from "../mosaic/exportUtils.js";
import { PALETTE, type PaletteColor } from "../mosaic/palette.js";

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
    if (Array.isArray(rawPalette)) {
      return rawPalette as PaletteColor[];
    }

    if (typeof rawPalette === "string") {
      const trimmed = rawPalette.trim();

      if (!trimmed) return undefined;

      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        const parsed = JSON.parse(trimmed);

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
      }

      if (trimmed.includes("[object Object]")) {
        console.warn(
          "Invalid palette payload from multipart form, falling back to default palette.",
        );
        return undefined;
      }
    }

    return undefined;
  } catch (error) {
    console.warn(
      "Failed to parse palette payload, falling back to default palette.",
      error,
    );
    return undefined;
  }
}

function getSingleParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

console.log("mosaic route booting");
console.log("processImage type:", typeof processImage);
console.log("exportMosaic type:", typeof exportMosaic);
console.log(
  "PALETTE loaded:",
  Array.isArray(PALETTE),
  "count:",
  PALETTE.length,
);

router.post(
  "/generate",
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      console.log("generate route hit");

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

      const parsedPalette = parsePalette(req.body.palette);
      const palette = parsedPalette?.length ? parsedPalette : PALETTE;

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
        paletteSource: parsedPalette?.length ? "request" : "default",
        paletteCount: palette.length,
        enabledPaletteCount: palette.filter((c) => c.enabled).length,
      });

      console.log("calling processImage...");
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
      console.log("processImage complete");

      console.log("calling exportMosaic...");
      const exported = await exportMosaic(
        sessionId,
        mosaicData,
        baseplateSize,
        columns,
        rows,
      );
      console.log("exportMosaic complete");

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
      console.error("ERROR generating mosaic:");
      console.error(err);

      res.status(500).json({
        error: "Failed to generate mosaic",
        details: err instanceof Error ? err.message : String(err),
      });
    }
  },
);

router.get("/download/:sessionId/:filename", (req: Request, res: Response) => {
  const sessionId = getSingleParam(req.params.sessionId);
  const filename = getSingleParam(req.params.filename);

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
