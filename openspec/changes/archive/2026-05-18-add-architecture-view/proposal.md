## Why

The reporter currently only visualizes actual dependency structure from static analysis. Teams need to compare actual dependencies against intended architecture (C4 model) in a single tool, enabling architecture compliance review directly alongside dependency graphs.

## What Changes

- Add `architecture` view mode alongside existing Graph/Report/Metrics views
- Server-side C4 parsing: `@likec4/language-services` (Node.js) in CLI parses and merges `.c4` files; client uses `@likec4/core`, `@likec4/layouts`, and `@likec4/diagram` for model construction, layout, and rendering
- Add `GET /api/architecture/model` endpoint that reads `.c4` files from `.dc-reporter/architecture/`, parses and merges them server-side, and returns computed model data (`$ModelData`) for client-side model construction
- Add `--cwd` global CLI flag to specify workspace root; defaults to current directory
- Define `.dc-reporter/` workspace directory structure with `architecture/` and `scans/` subdirectories
- Auto-detect `.dc-reporter/` on startup; show directory picker when absent, upload fallback unchanged
- C4 files are manually authored and read-only (no editing support)

## Capabilities

### New Capabilities

- `architecture-view`: Read and render C4 architecture models from manually authored `.c4` DSL files. Server parses and merges multiple `.c4` files via `@likec4/language-services` (Node.js), returning computed `$ModelData` as JSON. Client constructs `LikeC4Model` from this data, computes layout, and renders via `ReactLikeC4`. Supports multiple `.c4` files combined into a single navigable model.
- `workspace-config`: `.dc-reporter` workspace directory with `--cwd` flag, containing `architecture/` for C4 files and `scans/` for dependency-cruiser outputs.

### Modified Capabilities

- `frontend`: New `architecture` ViewMode, nav tab, and ArchitectureView component using `ReactLikeC4` from `@likec4/diagram`
- `cli`: New `--cwd` global option on `dep-report`, updated `/api/config` response, new `GET /api/architecture/model` endpoint that parses `.c4` files server-side

## Impact

- `packages/cli/package.json`: New `@likec4/language-services`, `@likec4/core` dependencies
- `packages/frontend/package.json`: 3 new `@likec4/*` dependencies (`core`, `layouts`, `diagram`)
- `packages/frontend/src/App.tsx`: Nav bar, view routing, startup config detection
- `packages/frontend/src/types.ts`: ViewMode union
- `packages/frontend/src/i18n/`: New i18n keys
- `packages/frontend/src/components/ArchitectureView.tsx`: New component
- `packages/cli/src/bin/cli.ts`: `--cwd` global option
- `packages/cli/src/commands/open.ts`: Pass cwd to server
- `packages/cli/src/utils/server.ts`: New endpoint, updated config
