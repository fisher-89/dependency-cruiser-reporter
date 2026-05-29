# CLAUDE.md

## Core Principle

**`openspec/README.md` is the single source of truth.** Read it before implementing anything. Update it after making changes.
**Never run `pnpm run demo` or `dep-report dashboard` in the background.** These commands start Express servers that bind to ports 3000-3002. Running them in the background leaves orphaned processes that block ports for subsequent runs.

## Architecture

```
[dependency-cruiser JSON] → [Rust preprocessing] → [Lightweight JSON] → [React visualization]
```

- **CLI** (`packages/cli/`): Command-line tool (`dep-report`) with three commands: `analyze` (process dependency-cruiser JSON via Rust binary or Node.js fallback), `dashboard` (serve web viewer), `archi-to-rules` (convert C4 architecture model to dependency-cruiser rules). Also exports a programmatic Express server. The `convert.ts` module provides a Node.js fallback (`convertDcOutput`) when the Rust binary is unavailable.
- **Rust backend** (`packages/rust/`): Native binary (`dcr-aggregate`) that parses dependency-cruiser output, aggregates nodes by count thresholds, computes layout coordinates
- **React frontend** (`packages/frontend/`): Interactive visualization with graph/report/metrics views
- **E2E tests** (`packages/e2e/`): Integration tests using Node.js built-in test runner. Tests CLI commands and Rust binary with fixture data.

Shared type contracts exist in `packages/frontend/src/types.ts` (TypeScript) and `packages/rust/src/lib.rs` (Rust).

## Commands

```bash
pnpm build           # Build all packages (TS + Rust)
pnpm build:ts        # Build TypeScript packages only
pnpm build:rust      # Build Rust binary
pnpm test            # Run all tests
pnpm lint            # Lint all packages
pnpm demo            # Scan demo project and open viewer
```

## Coding Guidelines

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

1. **Think before coding**: State assumptions. If unclear, stop and ask.
2. **Simplicity first**: No speculative features. No abstractions for single-use code.
3. **Surgical changes**: Touch only what's needed. Match existing style.
4. **Goal-Driven Execution**: Define success criteria. Loop until verified.

## Stack

- Frontend: Vite, React, TypeScript, AntV G6 (graph viz), Biome (linting)
- CLI: TypeScript, Commander.js, Express, dependency-cruiser
- Backend: Rust, serde, thiserror
- E2E: Node.js built-in test runner (node:test)