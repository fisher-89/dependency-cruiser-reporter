# CLAUDE.md

## Core Principle

**`docs/README.md` is the single source of truth.** Read it before implementing anything. Update it after making changes.

## Architecture

```
[dependency-cruiser JSON] → [Rust preprocessing] → [Lightweight JSON] → [React visualization]
```

- **CLI** (`packages/cli/`): Command-line tool (`dep-report`) with three commands: `analyze` (process dependency-cruiser JSON via Rust binary or Node.js fallback), `scan` (run dependency-cruiser on a project), `open` (serve web viewer). Also exports a programmatic Express server. The `convert.ts` module provides a Node.js fallback (`convertDcOutput`) when the Rust binary is unavailable.
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

## Commit Discipline

After each meaningful change, commit the code to ensure every commit is complete and executable:

1. **Build before commit**: Run `pnpm build:ts` (and `pnpm build:rust` if Rust code changed) to verify compilation passes.
2. **Test before commit**: Run `pnpm test` to verify tests pass.
3. **Commit per logical unit**: One commit per task or coherent change set. Do not batch unrelated changes.
4. **Complete commits**: Each commit must leave the project in a working state — no broken builds, no partial features that crash.
5. **Commit message**: Use conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`).

## Stack

- Frontend: Vite, React, TypeScript, AntV G6 (graph viz), Biome (linting)
- CLI: TypeScript, Commander.js, Express, dependency-cruiser
- Backend: Rust, serde, clap, thiserror
- E2E: Node.js built-in test runner (node:test)