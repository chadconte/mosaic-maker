# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (not used by Mosaic Maker)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (ESM bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server (shared backend)
│   └── mosaic-maker/       # Mosaic Maker React frontend
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml     # pnpm workspace
├── tsconfig.base.json      # Shared TS options
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## Mosaic Maker App

A tool for creating LEGO-style mosaic patterns from uploaded images.

### Features
- Upload any image
- Choose baseplate size (16×16 or 32×32)
- Set columns and rows to determine total canvas size
- Minimum color threshold cleanup (removes rarely-used colors, remaps pixels)
- LAB color space matching for accurate color mapping
- Built-in 50-color LEGO palette
- Outputs: full mosaic PNG, section layout PNG, per-section PNGs, color counts CSV, ZIP bundle

### Architecture
- **Frontend**: `artifacts/mosaic-maker` — React + Vite, React Query, Tailwind, lucide-react, framer-motion
- **Backend**: `artifacts/api-server` — Express API
  - `POST /api/mosaic/generate` — processes image, returns session data
  - `GET /api/mosaic/download/:sessionId/:filename` — download generated files
- **Image processing**: Jimp (pure JS PNG manipulation, no native deps)
- **Color matching**: Custom RGB→LAB conversion with Euclidean distance in LAB space
- **Temporary files**: Stored in `/tmp/mosaic-maker/<sessionId>/` on the server

### Key files (backend)
- `artifacts/api-server/src/mosaic/palette.ts` — built-in LEGO color palette
- `artifacts/api-server/src/mosaic/colorUtils.ts` — RGB↔LAB conversion
- `artifacts/api-server/src/mosaic/imageProcessing.ts` — image crop, resize, color mapping, threshold cleanup
- `artifacts/api-server/src/mosaic/renderUtils.ts` — PNG rendering for mosaic, sections, layout map
- `artifacts/api-server/src/mosaic/exportUtils.ts` — file export, zip bundling
- `artifacts/api-server/src/routes/mosaic.ts` — API route handlers

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes in `src/routes/`. Uses `@workspace/api-zod` for validation.

- Entry: `src/index.ts`
- App setup: `src/app.ts`
- Routes: `/api/healthz`, `/api/mosaic/generate`, `/api/mosaic/download/:sessionId/:filename`
- Key deps: multer, archiver, jimp, uuid

### `artifacts/mosaic-maker` (`@workspace/mosaic-maker`)

React + Vite frontend at `previewPath: "/"`.

- Key deps: @workspace/api-client-react, framer-motion, lucide-react, clsx, tailwind-merge

### `lib/api-spec` (`@workspace/api-spec`)

OpenAPI 3.1 spec + Orval codegen config. Run `pnpm --filter @workspace/api-spec run codegen`.

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client.

### `lib/db` (`@workspace/db`)

Drizzle ORM with PostgreSQL (not used by Mosaic Maker — no persistence needed).
