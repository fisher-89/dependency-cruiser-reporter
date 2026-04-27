# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Principle

**`docs/SPEC.md` is the single source of truth.** Read it before implementing anything. Update it after making changes.

## Architecture

```
[dependency-cruiser JSON] → [Rust preprocessing] → [Lightweight JSON] → [React visualization]
```

- **Rust backend** (`packages/rust/`): Parses dependency-cruiser output, aggregates nodes by count thresholds, computes layout coordinates
- **React frontend** (`packages/frontend/`): Interactive visualization with graph/report/metrics views

Shared type contracts exist in `packages/frontend/src/types.ts` (TypeScript) and `packages/rust/src/lib.rs` (Rust).

## Commands

### Frontend (packages/frontend/)
```bash
pnpm dev           # Development server
pnpm build         # Production build (typecheck + lint + build)
pnpm typecheck     # TypeScript check
pnpm lint          # Biome linting
pnpm test:e2e      # Playwright tests
```

### Rust (packages/rust/)
```bash
cargo build        # Compile
cargo test         # Run unit tests
cargo clippy       # Lint
cargo fmt          # Format
cargo run --release -- <input.json> <output.json>  # Process file
```

## Aggregation Thresholds

The Rust engine selects aggregation level based on node count:
- ≤1000 nodes → File level (no aggregation)
- 1001-5000 → Directory level
- 5001-20000 → Package level
- >20000 → Root level

## Coding Guidelines

1. **Think before coding**: State assumptions. If unclear, stop and ask.
2. **Simplicity first**: No speculative features. No abstractions for single-use code.
3. **Surgical changes**: Touch only what's needed. Match existing style.
4. **Verify**: Every change should trace to the request.

## Stack

- Frontend: Vite, React, TypeScript, Biome (linting), Playwright (e2e)
- Backend: Rust, serde, clap, thiserror