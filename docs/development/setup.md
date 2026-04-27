# Development Setup

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Frontend runtime |
| pnpm | 8+ | Package manager |
| Rust | 1.70+ | Backend compilation |
| cargo | 1.70+ | Rust build tool |

## Quick Start

```bash
# Clone repository
git clone <repo-url>
cd dependency-cruiser-reporter

# Install frontend dependencies
cd packages/frontend
pnpm install

# Build Rust backend
cd ../rust
cargo build

# Start development
cd ../frontend
pnpm dev
```

## Project Structure

```
dependency-cruiser-reporter/
├── packages/
│   ├── frontend/          # React + Vite app
│   │   ├── src/
│   │   ├── e2e/
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── rust/              # Rust preprocessing engine
│       ├── src/
│       │   ├── lib.rs     # Library
│       │   └── main.rs    # CLI
│       └── Cargo.toml
├── docs/                  # Documentation
├── CLAUDE.md              # Claude Code instructions
└── AGENTS.md              # Agent configuration
```

## Frontend Development

```bash
cd packages/frontend

# Install dependencies
pnpm install

# Start dev server (http://localhost:5173)
pnpm dev

# Type check
pnpm typecheck

# Lint
pnpm lint

# Format
pnpm format

# Build for production
pnpm build

# Preview production build
pnpm preview
```

### Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main application component |
| `src/types.ts` | TypeScript type definitions |
| `vite.config.ts` | Vite configuration |
| `biome.json` | Linting/formatting rules |

### Tech Stack

- **Vite 5** — Build tool
- **React 18** — UI framework
- **TypeScript 5** — Type safety
- **D3.js 7** — Graph visualization
- **Biome** — Linting and formatting
- **Playwright** — E2E testing

## Rust Development

```bash
cd packages/rust

# Build
cargo build

# Build release (optimized)
cargo build --release

# Run tests
cargo test

# Lint
cargo clippy

# Format
cargo fmt

# Run CLI
cargo run -- --input <path> --output <path>
```

### Key Files

| File | Purpose |
|------|---------|
| `src/lib.rs` | Core library with data structures |
| `src/main.rs` | CLI entry point |
| `Cargo.toml` | Dependencies and build config |
| `.clippy.toml` | Clippy configuration |

### Tech Stack

- **serde** — JSON serialization
- **clap** — CLI argument parsing
- **thiserror** — Error handling

## IDE Setup

### VS Code

Recommended extensions:

```json
{
  "recommendations": [
    "rust-lang.rust-analyzer",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "biomejs.biome"
  ]
}
```

### Settings

```json
{
  "editor.formatOnSave": true,
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer"
  },
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome"
  }
}
```

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

# Clean and rebuild
cargo clean
cargo build
```

### Type errors

```bash
# Regenerate type declarations
pnpm typecheck
```