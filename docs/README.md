# Documentation Index

Single-source index for dependency-cruiser-reporter documentation. Each entry lists the file, summary, and searchable keywords (API names, types, commands, config options).

## By Topic

### Project Overview
- [Project Overview](overview/project-overview.md) — Core features, edge types, roadmap
  - `dep-report` `scan` `analyze` `open` `circular dependencies` `unused dependencies` `rule violations` `edge types: local/npm/core/dynamic` `ProcessedGraph` `Rust preprocessing` `Node.js fallback`

### Architecture
- [Architecture Overview](architecture/overview.md) — Three-component system, key files, design decisions
  - `convertDcOutput` `Express server` `React SPA` `GraphNode` `GraphEdge` `GraphMeta` `ViolationInfo` `dcr-aggregate` `packages/cli` `packages/rust` `packages/frontend`
- [Data Flow](architecture/data-flow.md) — Pipeline from dependency-cruiser JSON to ProcessedGraph
  - `parse_and_aggregate` `DcOutput` `DcModule` `DcDependency` `CruiseResult` `RawViolation` `/api/config` `/api/graph` `graph.json` `cruise()` `spawn dcr-aggregate`
- [Aggregation Strategy](architecture/aggregation.md) — Node grouping thresholds, edge compression
  - `aggregation levels: file/directory/package/root` `thresholds: 1000/5000/20000` `select_aggregation_level` `edge compression` `violation inheritance` `circular dependencies`

### Backend
- [Rust Engine](backend/rust-engine.md) — Binary design, modules, error handling, build
  - `parse_and_aggregate` `DcrError: IoError/JsonError/InvalidInput` `build_file_nodes` `build_directory_nodes` `build_package_nodes` `aggregate_edges` `detect_edge_type` `cargo test` `cargo clippy`
- [Data Structures](backend/data-structures.md) — Shared type contracts (Rust ↔ TypeScript)
  - `ProcessedGraph` `GraphNode: id/label/node_type/path/violation_count/children` `GraphEdge: source/target/edge_type/weight` `GraphMeta` `ViolationInfo` `NodeType` `EdgeType` `AggregationLevel` `DcModule` `DcDependency`
- [Rust Package](packages/rust.md) — Library API, CLI binary, Cargo config
  - `dcr-aggregate` `--input` `--output` `--max-nodes` `--level` `target/release/dcr-aggregate` `cargo build --release` `test_aggregation_level_selection`

### CLI
- [CLI Package](packages/cli.md) — Commands, options, HTTP server, programmatic API
  - `@dcr-reporter/cli` `dep-report scan: --path/--output/--config` `dep-report analyze: --input/--output/--level/--max-nodes` `dep-report open: --file/--port/--host` `convertDcOutput` `analyzeWithFallback` `createServer` `.dependency-cruiser.json`
- [CLI Reference](usage/cli.md) — Full command reference, CI/CD integration
  - `npm install -g @dcr-reporter/cli` `npx @dcr-reporter/cli` `aggregation levels` `GitHub Actions` `actions/upload-artifact`

### Frontend
- [Frontend Package](packages/frontend.md) — React app, tech stack, component architecture
  - `@dcr-reporter/frontend` `React 19` `AntV G6 5` `Vite 5` `DependencyGraph` `comboCombined layout` `force layout` `ViewMode` `pnpm dev`
- [Components](frontend/components.md) — Component hierarchy, props, behavior, styling
  - `App` `UploadArea` `DependencyGraph` `ReportView` `MetricsView` `AntV G6 rendering` `comboCombined layout` `severity filtering` `color palette`
- [Views](frontend/views.md) — Graph/Report/Metrics view features, switching
  - `Graph View` `Report View: summary cards/violation list` `Metrics View: original_node_count/aggregated_node_count/edges.length/total_violations`

### Usage
- [Web UI](usage/web-ui.md) — Server startup, upload, views
  - `dep-report open` `-f` `-p` `drag-and-drop` `.json file upload`
- [Scenarios](usage/scenarios.md) — Quick scan, CI/CD, monorepo, pre-commit
  - `CI/CD` `GitHub Actions` `monorepo` `drill-down` `pre-commit hook` `husky` `npx dependency-cruiser`

### Development
- [Setup](development/setup.md) — Prerequisites, quick start, project structure
  - `Node.js 18+` `pnpm 8+` `Rust 1.70+` `pnpm install` `pnpm build` `pnpm test` `pnpm lint` `pnpm demo` `rustup update`
- [Testing](development/testing.md) — Rust unit tests, CLI/E2E tests
  - `cargo test` `node:test` `node --test` `cli.test.js` `fixtures/sample-cruise.json` `--test-name-pattern`
- [Contributing](development/contributing.md) — Dev philosophy, workflow, commit conventions
  - `conventional commits: feat/fix/docs/refactor/test/chore` `pnpm build:ts` `pnpm typecheck` `cargo clippy` `cargo fmt --check` `Biome`

## Quick Keyword Lookup

| Looking for... | Go to |
|---|---|
| `ProcessedGraph`, `GraphNode`, `GraphEdge`, type contracts | [Data Structures](backend/data-structures.md) |
| `parse_and_aggregate`, `dcr-aggregate`, Rust API | [Rust Engine](backend/rust-engine.md) |
| `convertDcOutput`, Node.js fallback | [CLI Package](packages/cli.md) |
| `dep-report scan/analyze/open`, CLI options | [CLI Reference](usage/cli.md) |
| Aggregation levels, `select_aggregation_level` | [Aggregation Strategy](architecture/aggregation.md) |
| `EdgeType`, `NodeType`, `AggregationLevel` | [Data Structures](backend/data-structures.md) |
| `createServer`, `/api/config`, `/api/graph` | [CLI Package](packages/cli.md) |
| `AntV G6`, `DependencyGraph`, layout | [Frontend Package](packages/frontend.md) |
| Graph/Report/Metrics views | [Views](frontend/views.md) |
| CI/CD, GitHub Actions, pre-commit | [Scenarios](usage/scenarios.md) |
| Setup, build, `pnpm` commands | [Setup](development/setup.md) |
| Testing: `cargo test`, `node:test` | [Testing](development/testing.md) |
| Contributing, commit style | [Contributing](development/contributing.md) |