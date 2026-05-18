## Context

The reporter currently has three views (Graph/Report/Metrics) all driven by dependency-cruiser JSON processed through a Rust/WASM pipeline. Adding a C4 architecture view introduces a second, independent data pipeline — `.c4` DSL files parsed server-side and rendered client-side via the LikeC4 library. This is a greenfield addition: the architecture view shares only the app shell (header, nav, theme) with existing views.

Key constraints:
- C4 files are manually authored and read-only (no editing)
- Multiple `.c4` files combine into a single navigable model
- Complex parsing/merging logic lives on the server for testability
- The app must detect `.dc-reporter/` on startup and show a directory picker when absent
- No client-side upload of `.c4` files (server reads from filesystem only)
- All `@likec4/*` packages must stay at the same version (lockstep releases)

## Goals / Non-Goals

**Goals:**
- Render interactive C4 architecture diagrams from `.c4` DSL files in `.dc-reporter/architecture/`
- Support multiple `.c4` files as one combined model with view navigation
- Server-side parsing and merging (complex, testable logic on server)
- Client-side model construction, layout, and rendering (client retains control over model lifecycle)
- Clean separation: server returns structured `$ModelData` as JSON, client constructs `LikeC4Model`

**Non-Goals:**
- Editing C4 files in the browser
- Hot reload when `.c4` files change on disk
- Client-side upload of `.c4` files (server reads from filesystem only)
- Validating architecture against actual dependencies (comparison view)
- Replacing or modifying the existing dependency-cruiser pipeline

## Decisions

### 1. Server-side C4 parsing

**Decision:** Parse and merge `.c4` DSL files on the server using `@likec4/language-services` (Node.js entry point via `fromSources()`). Return computed `$ModelData` as JSON to the client. Client constructs `LikeC4Model` via `LikeC4Model.create()`.

**Rationale:** The parsing and merging of `.c4` DSL is the most complex and error-prone part of the pipeline. Moving it server-side:
- Makes parsing logic testable with standard Node.js unit tests (no browser needed)
- Keeps the server as the single source of truth for model data
- Eliminates `@likec4/language-services` (~50KB+ including Langium runtime) from the client bundle
- `fromSources(sources: Record<string, string>)` accepts in-memory file content — no filesystem coupling needed

The data pipeline:
```
Server:  .c4 files → fromSources({...}) → LikeC4 instance
         → syncComputedModel() → model.$data (JSON) → HTTP response

Client:  JSON → LikeC4Model.create($data) → layoutedModel()
         → <ReactLikeC4 />
```

`$ModelData` is a plain JSON-serializable object containing `elements`, `relations`, `views`, `specification`, and `globals`. `LikeC4Model.create()` accepts it directly and returns a `LikeC4Model.Computed` ready for layout and rendering.

**Alternatives considered:**
- Client-side parsing with `@likec4/language-services/browser`: Simpler server (just serve raw text), but parsing logic is untestable without browser E2E tests, and adds Langium runtime to client bundle. Rejected in favor of server-side testability.
- Server-side layout computation: Could also move `@likec4/layouts` (Graphviz) to server to save 2MB WASM from client bundle. Rejected for now — layout in browser provides faster interactivity (view switching without server round-trips). Can be revisited later.

### 2. Rendering with ReactLikeC4

**Decision:** Use `ReactLikeC4` from `@likec4/diagram` wrapped in `LikeC4ModelProvider`, with the model constructed client-side from server-provided `$ModelData`.

**Rationale:** The server handles parsing and merging (complex, testable), returning structured `$ModelData` as JSON. The client uses `LikeC4Model.create($data)` to construct the runtime model, then computes layout and renders. The component tree is:

```tsx
// ArchitectureView.tsx (pseudo-code)
const data = await fetch('/api/architecture/model').then(r => r.json());
const model = LikeC4Model.create(data);
const layouted = await model.layoutedModel();

<LikeC4ModelProvider likec4={layouted}>
  <ReactLikeC4 />
</LikeC4ModelProvider>
```

**Alternatives considered:**
- `LikeC4View` for single-view rendering: Requires building custom view navigation. Rejected because ReactLikeC4 provides that built-in.
- Custom renderer extracting layout data from `LikeC4Model.Layouted`: Massive effort to reimplement XYFlow-level interactivity. Rejected.

### 3. @likec4/* scoped packages over main likec4

**Decision:** Depend on individual `@likec4/*` packages, split across packages by role:

| Package | Location | Purpose |
|---------|----------|---------|
| `@likec4/language-services` | `packages/cli` | Parse `.c4` DSL server-side (Node.js entry) |
| `@likec4/core` | `packages/cli` + `packages/frontend` | Types in CLI; model construction (`LikeC4Model.create()`) in frontend |
| `@likec4/layouts` | `packages/frontend` | Graphviz-based layout computation (WASM) |
| `@likec4/diagram` | `packages/frontend` | ReactLikeC4 rendering component |

All pinned to the same version.

**Rationale:** The main `likec4` package bundles everything including CLI and Node.js-specific modules. Scoped packages give finer control over the dependency graph — the CLI only needs `language-services` + `core` types, while the frontend needs `core` (model), `layouts` (layout), and `diagram` (rendering).

### 4. Workspace directory structure

**Decision:** All process files live under `.dc-reporter/` at the project root specified by `--cwd`.

```
<cwd>/.dc-reporter/
├── architecture/       ← manually authored .c4 files
└── scans/              ← dependency-cruiser output JSON
```

The `--cwd` flag defaults to `.` (current directory). The server reads `.dc-reporter/` at startup and exposes its contents via API endpoints.

### 5. App startup flow

**Decision:** Frontend calls `GET /api/config` on mount. Response includes `cwd`, `hasArchitectureDir`, and `hasGraphFile`. Architecture tab fetches `GET /api/architecture/model` which reads `.c4` files from `<cwd>/.dc-reporter/architecture/`, parses and merges them via `fromSources()`, and returns computed `$ModelData` as JSON.

If no `.dc-reporter/` exists, show directory picker. If it exists but has no C4 files, `GET /api/architecture/model` returns 404 and Architecture tab shows empty state. If it exists but has no graph file, Graph/Report/Metrics tabs follow existing upload flow.

### 6. ArchitectureView as lazy-loaded component

**Decision:** Dynamic `import()` for `ArchitectureView` to defer loading `@likec4/diagram` (~25 transitive deps including Mantine, XYFlow, XState) until the user actually navigates to the Architecture tab.

**Rationale:** The `@likec4/diagram` dependency tree is heavy. Most users will visit Graph/Report/Metrics first. Lazy loading avoids penalizing the initial bundle.

## Risks / Trade-offs

- **Bundle size**: `@likec4/diagram` + deps (Mantine, XYFlow, XState, Graphviz WASM) adds significant weight. `@likec4/language-services` (Langium runtime) is **not** in the client bundle — it lives server-side. Mitigation: dynamic `import()` so diagram deps are only loaded when the Architecture tab is clicked.
- **Graphviz WASM**: `@likec4/layouts` uses `@hpcc-js/wasm-graphviz` (~2MB WASM) for layout computation. Mitigation: layouts happen once on model load; WASM is cached by the browser after first download.
- **Server-side LikeC4 dependency**: Adding `@likec4/language-services` (and its transitive deps: Langium, vscode-languageserver-types, etc.) to the CLI increases server startup size. Mitigation: parsing happens once on first request, not at server start. The CLI already bundles Express and other deps; the relative increase is acceptable.
- **Mantine CSS leak**: `@likec4/diagram` depends on Mantine v9 which injects global CSS reset styles. The `react-shadow` dep (already bundled with `@likec4/diagram`) provides shadow DOM isolation. Risk is low but worth verifying visually.
- **LikeC4 version lockstep**: All `@likec4/*` packages release at the same version. A mismatch across `packages/cli` and `packages/frontend` would cause runtime errors. Mitigation: pin all to a single version via `pnpm.overrides` or a catalog entry.
- **Two canvas libraries**: AntV G6 (dependency graph) and XYFlow (architecture diagram) coexist in the same app. Both are tree-shaken to their respective views, so no runtime conflict expected.
