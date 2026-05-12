# OpenSpec Documentation Index

dependency-cruiser-reporter OpenSpec 规范索引。每个条目列出规范文件、摘要和可搜索关键词。

## Project Files

| 文件 | 描述 |
|------|------|
| [project.md](project.md) | 项目级全局约定：技术栈、架构、编码规范、路线图 |
| [AGENTS.md](AGENTS.md) | AI 编程助手统一指令 |

## Specs (正式生效的规范)

### Project
- [项目规范](specs/project/spec.md) — 核心功能、边类型、CLI 命令、目标用户、路线图
  - `dep-report` `analyze` `open` `circular dependencies` `unused dependencies` `rule violations` `edge types: local/npm/core/dynamic` `ProcessedGraph` `Rust preprocessing` `hybrid aggregation` `Node.js fallback`

### Architecture
- [架构规范](specs/architecture/spec.md) — 三组件架构、数据流、混合聚合策略、展开算法
  - `convertDcOutput` `Express server` `React SPA` `GraphNode` `GraphEdge` `GraphMeta` `GraphCombo` `ViolationInfo` `dcr-aggregate` `expanded_dirs` `compute_auto_expanded_dirs` `TARGET_NODE_BUDGET: 200` `combo generation` `single-child collapse` `edge compression`

### Backend
- [后端规范](specs/backend/spec.md) — 数据结构契约、WASM 接口、聚合算法、力导向布局、序列化规则
  - `ProcessedGraph` `GraphNode` `GraphEdge` `GraphCombo` `GraphMeta` `ViolationInfo` `NodeType` `EdgeType` `aggregate` `aggregate_from_str` `tsify` `force-directed layout` `combo overlap` `detect_edge_type` `build_hybrid_nodes` `compute_auto_expanded_dirs` `snake_case`

### Frontend
- [前端规范](specs/frontend/spec.md) — 组件架构、视图行为、数据加载、G6 布局、样式规范
  - `@dcr-reporter/frontend` `React 19` `AntV G6 5` `Vite 5` `DependencyGraph` `buildGraphData` `comboCombined layout` `combos` `force layout` `ViewMode` `POST /api/graph` `expandedDirs`

### Graph Detail Panel
- [节点详情面板规范](specs/graph-detail-panel/spec.md) — 选中节点时的详情面板行为：稳定性指标、依赖分组、违规关联
  - `DetailPanel` `stability` `instability metric` `Ce/(Ce+Ca)` `dependencies` `dependents` `edge type grouping` `violation association` `node selection` `click/double-click disambiguation`

### CLI
- [CLI 规范](specs/cli/spec.md) — 命令接口、HTTP API 端点、Node.js 回退、编程式 API
  - `@dcr-reporter/cli` `dep-report analyze: --path/--output/--config` `dep-report open: --file/--port/--host` `convertDcOutput` `analyzeWithFallback` `createServer` `POST /api/graph` `expanded_dirs` `@dcr-reporter/wasm`

### Usage
- [使用规范](specs/usage/spec.md) — 使用场景、Web UI、CI/CD 集成、Monorepo 分析
  - `CI/CD` `GitHub Actions` `monorepo` `drill-down` `pre-commit hook` `husky` `drag-and-drop` `.json file upload` `NPM scripts`

### Development
- [开发规范](specs/development/spec.md) — 环境配置、测试执行、代码风格、贡献流程
  - `Node.js 18+` `pnpm 8+` `Rust 1.70+` `cargo test` `node:test` `Biome` `cargo clippy` `cargo fmt --check` `conventional commits`

## Quick Keyword Lookup

| Looking for... | Go to |
|---|---|
| `ProcessedGraph`, `GraphNode`, `GraphEdge`, type contracts | [Backend Spec](specs/backend/spec.md) |
| `aggregate`, `aggregate_from_str`, `expanded_dirs`, `tsify` | [Backend Spec](specs/backend/spec.md) |
| `convertDcOutput`, Node.js fallback | [CLI Spec](specs/cli/spec.md) |
| `dep-report analyze/open`, CLI options | [CLI Spec](specs/cli/spec.md) |
| `expanded_dirs`, hybrid aggregation, `compute_auto_expanded_dirs` | [Architecture Spec](specs/architecture/spec.md) |
| `EdgeType`, `NodeType` enums | [Backend Spec](specs/backend/spec.md) |
| `createServer`, `/api/config`, `POST /api/graph` | [CLI Spec](specs/cli/spec.md) |
| `compute_layout`, force-directed layout, combo positioning | [Backend Spec](specs/backend/spec.md) |
| `AntV G6`, `DependencyGraph`, `comboCombined` layout | [Frontend Spec](specs/frontend/spec.md) |
| Graph/Report/Metrics views | [Frontend Spec](specs/frontend/spec.md) |
| DetailPanel, stability metric, node selection | [Graph Detail Panel Spec](specs/graph-detail-panel/spec.md) |
| CI/CD, GitHub Actions, pre-commit | [Usage Spec](specs/usage/spec.md) |
| Setup, build, `pnpm` commands | [Development Spec](specs/development/spec.md) |
| Testing: `cargo test`, `node:test` | [Development Spec](specs/development/spec.md) |
| Contributing, commit style | [Development Spec](specs/development/spec.md) |

## Changes (未归档的变更提案)

变更提案存放在 `changes/` 目录，每个功能独立隔离。当前无活跃变更提案。
