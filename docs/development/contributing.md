# Contributing Guide

## Development Philosophy

Following the principles in `CLAUDE.md`:

1. **Think before coding** — State assumptions, ask if unclear
2. **Simplicity first** — No speculative features
3. **Surgical changes** — Touch only what's needed
4. **Verify** — Every change traces to a request

## Getting Started

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/dependency-cruiser-reporter.git
cd dependency-cruiser-reporter

# 2. Install dependencies
pnpm install

# 3. Build Rust binary
cd packages/rust && cargo build --release && cd ../..

# 4. Build TypeScript packages
pnpm build:ts

# 5. Create a branch
git checkout -b feature/my-feature
```

## Workflow

### 1. Before Starting

- Check existing issues
- Discuss approach in issue comments

### 2. Make Changes

- Follow existing code style
- Run linters: `pnpm lint` / `cargo clippy`
- Write/update tests
- Update documentation if needed

### 3. Before Submitting

```bash
# TypeScript packages
pnpm build:ts

# Frontend
cd packages/frontend
pnpm typecheck
pnpm lint
cd ../..

# Rust
cd packages/rust
cargo test
cargo clippy
cargo fmt --check
cd ../..

# Integration tests
cd packages/e2e
pnpm test
cd ../..
```

### 4. Submit PR

- Clear title and description
- Link to issue
- Describe testing done

## Code Style

### TypeScript

- Use Biome for formatting/linting
- Prefer functional components with hooks
- Use TypeScript strict mode

```bash
# Frontend lint
cd packages/frontend
pnpm lint          # Check
pnpm format        # Auto-fix (biome format --write)
```

### Rust

- Follow standard Rust conventions
- Run `cargo fmt` before committing
- Run `cargo clippy` and fix warnings

```bash
cd packages/rust
cargo fmt          # Format
cargo clippy       # Lint
```

## Commit Messages

Follow conventional commits:

```
<type>: <description>

[optional body]
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

Examples:

```
feat: add scan command for running dependency-cruiser
fix: correct edge type detection for dynamic imports
docs: update API reference with new options
```

## Areas to Contribute

### P1 Features (High Priority)

- [ ] Drill-down/roll-up interaction
- [ ] Filters (by rule, path, package)
- [ ] Search functionality
- [ ] Incremental updates

### P2 Features (Nice to Have)

- [ ] Dark theme
- [ ] Mobile responsive design
- [ ] Export (JSON/CSV)
- [ ] Multi-scan comparison

### Improvements

- [ ] Better graph layout algorithm
- [ ] Performance optimization
- [ ] Test coverage
- [ ] Documentation

## Pull Request Checklist

- [ ] Code compiles without errors
- [ ] Linters pass (Biome, Clippy)
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] PR links to issue

## Questions?

- Open a GitHub issue for bugs/features
- Check [`docs/`](../) for documentation
- Read [`CLAUDE.md`](../../CLAUDE.md) for dev guidelines
