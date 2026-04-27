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
cd packages/frontend && pnpm install
cd ../rust && cargo build

# 3. Create a branch
git checkout -b feature/my-feature
```

## Workflow

### 1. Before Starting

- Check existing issues
- Read [`docs/SPEC.md`](../SPEC.md) for context
- Discuss approach in issue comments

### 2. Make Changes

- Follow existing code style
- Run linters: `pnpm lint` / `cargo clippy`
- Write/update tests
- Update documentation if needed

### 3. Before Submitting

```bash
# Frontend
cd packages/frontend
pnpm typecheck
pnpm lint
pnpm test:e2e

# Rust
cd packages/rust
cargo test
cargo clippy
cargo fmt --check
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
pnpm lint        # Check
pnpm format      # Auto-fix
```

### Rust

- Follow standard Rust conventions
- Run `cargo fmt` before committing
- Run `cargo clippy` and fix warnings

```bash
cargo fmt        # Format
cargo clippy     # Lint
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
feat: add force-directed layout for graph
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