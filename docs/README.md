# Documentation

Welcome to the dependency-cruiser-reporter documentation.

## Quick Navigation

| Category | Document | Description |
|----------|----------|-------------|
| Overview | [Project Overview](overview/project-overview.md) | Project goals and core features |
| Architecture | [Architecture Overview](architecture/overview.md) | System design and data flow |
| | [Data Flow](architecture/data-flow.md) | Processing pipeline details |
| | [Aggregation Strategy](architecture/aggregation.md) | Node aggregation logic |
| Packages | [CLI Package](packages/cli.md) | CLI tool and HTTP server |
| | [WASM Package](packages/wasm.md) | Rust WASM module |
| | [Frontend Package](packages/frontend.md) | React visualization |
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
├── overview/
│   └── project-overview.md             # Project overview
├── architecture/
│   ├── overview.md                     # Architecture overview
│   ├── data-flow.md                    # Data flow diagram
│   └── aggregation.md                  # Aggregation strategy
├── packages/
│   ├── cli.md                          # CLI package design
│   ├── wasm.md                         # WASM package design
│   └── frontend.md                     # Frontend package design
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