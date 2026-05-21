## 1. Dependencies & Setup

- [x] 1.1 Add `@likec4/language-services`, `@likec4/core` to `packages/cli/package.json` at version `1.56.0`
- [x] 1.2 Add `@likec4/core`, `@likec4/layouts`, `@likec4/diagram` to `packages/frontend/package.json` at version `1.56.0`
- [x] 1.3 Run `pnpm install` and verify no peer dependency warnings

## 2. CLI Changes

- [x] 2.1 Add `--cwd` global option to `packages/cli/src/bin/cli.ts` (defaults to `.`)
- [x] 2.2 Update `OpenOptions` in `packages/cli/src/commands/open.ts` to include `cwd` and pass to server
- [x] 2.3 Update `ServerOptions` in `packages/cli/src/utils/server.ts` to include `cwd`
- [x] 2.4 Update `GET /api/config` to return `{ cwd, hasArchitectureDir, hasGraphFile }`
- [x] 2.5 Add `GET /api/architecture/model` endpoint that reads `.c4` files from `<cwd>/.dc-reporter/architecture/`, parses and merges them via `fromSources()`, and returns computed `$ModelData` as JSON
- [x] 2.6 Add unit tests for server-side `.c4` parsing and merging logic

## 3. Frontend Types & i18n

- [x] 3.1 Add `'architecture'` to `ViewMode` union type in `packages/frontend/src/types.ts`
- [x] 3.2 Add `AppConfig` interface to `packages/frontend/src/types.ts`
- [x] 3.3 Add i18n keys: `nav.architecture`, `architecture.empty`, `architecture.loading`, `architecture.error` to `en.ts` and `zh-CN.ts`

## 4. ArchitectureView Component

- [x] 4.1 Create `packages/frontend/src/components/ArchitectureView.tsx` with loading, error, and empty states
- [x] 4.2 Fetch `GET /api/architecture/model`, construct `LikeC4Model` via `LikeC4Model.create(data)`, compute layout, render
- [x] 4.3 Render `<LikeC4ModelProvider><ReactLikeC4 /></LikeC4ModelProvider>` on successful model construction

## 5. App Integration

- [x] 5.1 Update `App.tsx` startup flow: fetch config, check `hasArchitectureDir` and `hasGraphFile`, show directory picker when both false
- [x] 5.2 Add Architecture nav tab (first position) with lazy loading via `React.lazy`
- [x] 5.3 Add Suspense boundary for ArchitectureView lazy load
- [x] 5.4 Wire ArchitectureView into view routing alongside Graph/Report/Metrics

## 6. Verification

- [x] 6.1 Run `pnpm build` and verify no TypeScript or build errors
- [x] 6.2 Run server-side unit tests for `.c4` parsing and merging
- [x] 6.3 Create sample `.c4` files in `.dc-reporter/architecture/` and verify rendering in browser
- [x] 6.4 Verify lazy loading: Architecture chunk should not load on initial page load (check network tab)
- [x] 6.5 Verify existing views (Graph/Report/Metrics/dark mode/i18n) are unaffected
- [x] 6.6 Run `pnpm test` and verify all tests pass
