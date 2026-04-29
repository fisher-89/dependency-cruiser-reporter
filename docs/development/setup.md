# Development Setup

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Runtime for CLI and frontend |
| pnpm | 8+ | Package manager (workspace) |
| Rust | 1.70+ | Native binary compilation |

## Quick Start

```bash
# Clone repository
git clone <repo-url>
cd dependency-cruiser-reporter

# Install dependencies (workspace)
pnpm install

# Build Rust binary
cd packages/rust
cargo build --release
cd ../..

# Build TypeScript packages
pnpm build:ts

# Test CLI
cd packages/cli
pnpm link --global
dep-report --help
```

## Project Structure

```
dependency-cruiser-reporter/
├── packages/
│   ├── cli/               # CLI command and HTTP server
│   │   ├── bin/
│   │   │   └── cli.js     # Entry point
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   │   ├── analyze.ts
│   │   │   │   ├── convert.ts
│   │   │   │   ├── scan.ts
│   │   │   │   └── open.ts
│   │   │   ├── server.ts
│   │   │   └── index.ts
│   │   └── package.json
│   ├── rust/              # Rust native binary
│   │   ├── src/
│   │   │   ├── lib.rs     # Library (parse_and_aggregate)
│   │   │   └── main.rs    # CLI entry (dcr-aggregate)
│   │   └── Cargo.toml
│   ├── frontend/          # React + Vite app
│   │   ├── src/
│   │   │   ├── App.tsx    # Main component with all views
│   │   │   ├── types.ts   # Type definitions
│   │   │   └── main.tsx   # Entry point
│   │   └── package.json
│   └── e2e/               # Integration tests
│       ├── cli.test.js    # node:test based tests
│       ├── fixtures/
│       │   └── sample-cruise.json
│       └── package.json
├── docs/                  # Documentation
├── CLAUDE.md              # Claude Code instructions
└── package.json           # Workspace root
```

## Package Development

### Rust Package (`packages/rust`)

```bash
cd packages/rust

# Build debug binary
cargo build

# Build release binary (optimized)
cargo build --release

# Run tests
cargo test

# Lint
cargo clippy

# Format check
cargo fmt --check
```

The binary outputs to `target/debug/dcr-aggregate` or `target/release/dcr-aggregate`.

### Frontend Package (`packages/frontend`)

```bash
cd packages/frontend

# Start dev server (http://localhost:5173)
pnpm dev

# Type check
pnpm typecheck

# Lint
pnpm lint

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### CLI Package (`packages/cli`)

```bash
cd packages/cli

# Build
pnpm build

# Link globally
pnpm link --global

# Run
dep-report --help
dep-report analyze --input input.json
dep-report scan --path ./src
dep-report open --file graph.json
```

## Workspace Commands

```bash
# Run from root directory

# Build all packages (TS + Rust)
pnpm build

# Build TypeScript packages only
pnpm build:ts

# Build Rust binary only
pnpm build:rust

# Run tests across all packages
pnpm test

# Lint all packages
pnpm lint

# Run demo (scan demo project + open viewer)
pnpm demo
```

## Tech Stack

### Frontend
- **Vite 5** — Build tool
- **React 19** — UI framework
- **TypeScript 5** — Type safety
- **AntV G6 5** — Graph visualization
- **Biome** — Linting and formatting (root-level config)

### Rust
- **serde / serde_json** — JSON serialization
- **clap** — CLI argument parsing
- **thiserror** — Error types

### CLI
- **commander** — CLI framework
- **express** — HTTP server (open command)
- **dependency-cruiser** — Scan command integration

## Testing

See [Testing Guide](./testing.md).

## Troubleshooting

### Node modules issues

```bash
# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Rust build errors

```bash
# Update toolchain
rustup update

# Rebuild
cd packages/rust
cargo build --release
```

### CLI not found

```bash
# Re-link globally
cd packages/cli
pnpm link --global
```
