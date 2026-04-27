# Documentation

Welcome to the dependency-cruiser-reporter documentation.

## Quick Navigation

| Category | Document | Description |
|----------|----------|-------------|
| Overview | [Project Overview](overview/project-overview.md) | Project goals and core features |
| Architecture | [Architecture Overview](architecture/overview.md) | System design and data flow |
| | [Data Flow](architecture/data-flow.md) | Processing pipeline details |
| | [Aggregation Strategy](architecture/aggregation.md) | Node aggregation logic |
| Backend | [Rust Engine](backend/rust-engine.md) | Rust preprocessing engine design |
| | [Data Structures](backend/data-structures.md) | Type definitions and contracts |
| Frontend | [Components](frontend/components.md) | UI component design |
| | [Views](frontend/views.md) | Three main views (Graph/Report/Metrics) |
| Usage | [CLI Reference](usage/cli.md) | Command-line interface |
| | [Web UI](usage/web-ui.md) | Web interface guide |
| | [Scenarios](usage/scenarios.md) | Common use cases |
| Development | [Setup](development/setup.md) | Development environment |
| | [Testing](development/testing.md) | Testing guidelines |
| | [Contributing](development/contributing.md) | Contribution guide |

## Document Index

```
docs/
├── README.md                           # This file
├── SPEC.md                            # Full specification (single source of truth)
├── overview/
│   └── project-overview.md             # Project overview
├── architecture/
│   ├── overview.md                     # Architecture overview
│   ├── data-flow.md                    # Data flow diagram
│   └── aggregation.md                  # Aggregation strategy
├── backend/
│   ├── rust-engine.md                  # Rust engine design
│   └── data-structures.md              # Data structures
├── frontend/
│   ├── components.md                   # Component design
│   └── views.md                        # View design
├── usage/
│   ├── cli.md                          # CLI usage
│   ├── web-ui.md                       # Web UI guide
│   └── scenarios.md                    # Use case scenarios
└── development/
    ├── setup.md                        # Dev setup
    ├── testing.md                      # Testing guide
    └── contributing.md                 # Contributing guide
```

## Related Files

- [`CLAUDE.md`](../CLAUDE.md) — Claude Code instructions
- [`AGENTS.md`](../AGENTS.md) — AI agent configuration