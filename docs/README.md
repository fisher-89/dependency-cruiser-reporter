# Documentation Index

Single-source index for dependency-cruiser-reporter documentation. Each entry lists the file, summary, and searchable keywords (API names, types, commands, config options).

## By Topic

### Project Overview
- [Project Overview](overview/project-overview.md) — Core features, edge types, roadmap
  - `dep-report` `scan` `open` `circular dependencies` `unused dependencies` `rule violations` `edge types: local/npm/core/dynamic` `ProcessedGraph` `Rust preprocessing` `hybrid aggregation` `Node.js fallback`

### Architecture
- [Architecture Overview](architecture/overview.md) — Three-component system, key files, design decisions
  - `convertDcOutput` `Express server` `React SPA` `GraphNode` `GraphEdge` `GraphMeta` `GraphCombo` `ViolationInfo` `dcr-aggregate` `expanded_dirs` `packages/cli` `packages/rust` `packages/frontend`
- [Data Flow](architecture/data-flow.md) — Pipeline from dependency-cruiser JSON to ProcessedGraph
  - `parse_and_aggregate` `DcOutput` `DcModule` `DcDependency` `CruiseResult` `RawViolation` `/api/config` `POST /api/graph` `expandedDirs` `graph.json` `cruise()` `spawn dcr-aggregate`
- [Aggregation Strategy](architecture/aggregation.md) — Hybrid aggregation, expanded directories, edge compression
  - `hybrid aggregation` `expanded_dirs` `compute_auto_expanded_dirs` `TARGET_NODE_BUDGET: 200` `combo generation` `single-child collapse` `edge compression` `circular dependencies`

### Backend
- [Rust Engine](backend/rust-engine.md) — Binary design, modules, error handling, build
  - `parse_and_aggregate` `DcrError: IoError/JsonError/InvalidInput` `build_hybrid_nodes` `compute_auto_expanded_dirs` `aggregate_edges` `detect_edge_type` `expanded_dirs` `cargo test` `cargo clippy`
- [Data Structures](backend/data-structures.md) — Shared type contracts (Rust ↔ TypeScript)
  - `ProcessedGraph` `GraphNode: id/label/node_type/path/violation_count/orphan/children/combo` `GraphCombo: id/label/combo` `GraphEdge: source/target/edge_type/weight/circular` `GraphMeta: expanded_dirs` `ViolationInfo` `NodeType` `EdgeType` `AggregationLevel` `DcModule` `DcDependency`
- [Rust Package](packages/rust.md) — Library API, CLI binary, Cargo config
  - `dcr-aggregate` `--input` `--output` `--max-nodes` `expanded_dirs` `parse_and_aggregate` `target/release/dcr-aggregate` `cargo build --release` `test_aggregation_level_selection`

### CLI
- [CLI Package](packages/cli.md) — Commands, options, HTTP server, programmatic API
  - `@dcr-reporter/cli` `dep-report scan: --path/--output/--config` `dep-report open: --file/--port/--host` `convertDcOutput` `analyzeWithFallback` `createServer` `POST /api/graph` `expanded_dirs`
- [CLI Reference](usage/cli.md) — Full command reference, CI/CD integration
  - `npm install -g @dcr-reporter/cli` `npx @dcr-reporter/cli` `hybrid aggregation` `expanded_dirs` `GitHub Actions` `actions/upload-artifact`

### Frontend
- [Frontend Package](packages/frontend.md) — React app, tech stack, component architecture
  - `@dcr-reporter/frontend` `React 19` `AntV G6 5` `Vite 5` `DependencyGraph` `buildGraphData` `comboCombined layout` `combos` `force layout` `ViewMode` `POST /api/graph` `expandedDirs` `pnpm dev`
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
| `parse_and_aggregate`, `dcr-aggregate`, `expanded_dirs` | [Rust Engine](backend/rust-engine.md) |
| `convertDcOutput`, Node.js fallback | [CLI Package](packages/cli.md) |
| `dep-report scan/open`, CLI options | [CLI Reference](usage/cli.md) |
| `expanded_dirs`, hybrid aggregation, `compute_auto_expanded_dirs` | [Aggregation Strategy](architecture/aggregation.md) |
| `EdgeType`, `NodeType`, `AggregationLevel` | [Data Structures](backend/data-structures.md) |
| `createServer`, `/api/config`, `POST /api/graph` | [CLI Package](packages/cli.md) |
| `AntV G6`, `DependencyGraph`, layout | [Frontend Package](packages/frontend.md) |
| Graph/Report/Metrics views | [Views](frontend/views.md) |
| CI/CD, GitHub Actions, pre-commit | [Scenarios](usage/scenarios.md) |
| Setup, build, `pnpm` commands | [Setup](development/setup.md) |
| Testing: `cargo test`, `node:test` | [Testing](development/testing.md) |
| Contributing, commit style | [Contributing](development/contributing.md) |