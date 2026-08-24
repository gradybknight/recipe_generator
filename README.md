# Recipe Card Generator

A React/Vite single-page app that turns structured recipe JSON into a process-oriented recipe card. The matrix view lays ingredients out as rows and cooking steps as columns, showing how ingredients flow into each operation. A traditional view presents ingredients and instructions in separate scrolling panels.

## Features

- Import a `recipe.json` file from the browser
- Matrix and traditional recipe views
- Step completion and reversible collapsed progress state
- Optional ingredients placed in the recipe flow
- Light and dark themes
- Sticky ingredient column while scrolling horizontally
- No backend or runtime LLM required

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Vite, usually `http://localhost:5173`.

Build and preview the production bundle:

```bash
npm run build
npm run preview
```

## Testing

The app is written in TypeScript; `npm run build` type-checks (`tsc -b`) before bundling. Run just the type-check with:

```bash
npm run typecheck
```

Unit tests (Vitest) cover the pure recipe logic in `src/App.tsx` — schema validation, matrix row/layout building, and timeline scheduling. The recipe JSON contract is typed in `src/types.ts`.

```bash
npm test          # run once
npm run test:watch
```

End-to-end tests (Playwright) drive the app in a real browser and are the primary safety net for behavior — they exercise the rendered DOM rather than internals, so they keep working across refactors:

```bash
npm run test:e2e      # run headless against a dev server Playwright starts automatically
npm run test:e2e:ui   # interactive UI mode
```

The first run needs browser binaries: `npx playwright install chromium`.

## Recipe JSON

The renderer consumes the contract documented in [`skills/recipe-card-structurer/references/schema.md`](skills/recipe-card-structurer/references/schema.md). The structuring instructions for converting plain-text recipes are in [`skills/recipe-card-structurer/SKILL.md`](skills/recipe-card-structurer/SKILL.md).

Example recipe artifacts are in [`example_recipes/`](example_recipes/). The app discovers every `*.json` file in that folder during the Vite build and embeds it in the deployed bundle. To add another built-in recipe, place a valid recipe artifact in that folder and run the deployment script; no code changes are required:

```bash
cp /path/to/new-recipe.json example_recipes/
./scripts/deploy.sh
```

The app starts with an upload target; choose a compatible JSON file to render it, or select any bundled example from the example-recipe menu.

## Deploy

The app is hosted from S3 behind CloudFront at [https://recipe.gradyknight.com](https://recipe.gradyknight.com).

```bash
./scripts/deploy.sh
```

The deployment script builds the app, syncs `dist/` to the recipe S3 bucket, and requests a CloudFront cache invalidation. It uses the default recipe bucket and distribution, or accepts an alternate bucket and region:

```bash
./scripts/deploy.sh <bucket-name> <aws-region>
```

Override the CloudFront distribution when needed:

```bash
DISTRIBUTION_ID=<distribution-id> ./scripts/deploy.sh
```
