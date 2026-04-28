# Project Overview

dependency-cruiser-reporter is a visualization tool for [dependency-cruiser](https://github.com/sverrejo/nmc-dependency-cruiser) scan results.

## Problem Statement

[dependency-cruiser](https://github.com/sverrejo/nmc-dependency-cruiser) is a JavaScript/TypeScript static analysis tool that detects dependency issues:

- Circular dependencies
- Unused dependencies
- Rule violations (e.g., architecture constraints)

It outputs JSON format with detailed reports, but its native HTML report capabilities are limited.

## Solution

**dependency-cruiser-reporter** transforms dependency-cruiser JSON output into interactive visualizations:

```mermaid
flowchart LR
    DC[dependency-cruiser\nJSON output] --> CLI[CLI\ndep-report]
    CLI -->|Rust binary or\nNode.js fallback| JSON[Lightweight JSON]
    JSON --> FE[React Frontend\nVisualization]
    FE --> Graph[Graph View]
    FE --> Report[Report View]
    FE --> Metrics[Metrics View]
```

### Core Features

1. **Dependency Graph** — Interactive graph with node/edge display
2. **Error Report** — Violations grouped by severity (error/warn/info)
3. **Metrics Dashboard** — Summary statistics and edge type distribution

### Edge Types

| Type | Description |
|------|-------------|
| `local` | Project internal dependency |
| `npm` | External npm package |
| `core` | Node.js built-in module |
| `dynamic` | Dynamic import (`import()`) |

### CLI Commands

| Command | Description |
|---------|-------------|
| `dep-report scan` | Run dependency-cruiser on a project directory |
| `dep-report analyze` | Process dependency-cruiser JSON output |
| `dep-report open` | Start web viewer with HTTP server |

## Target Users

```mermaid
flowchart TB
    Dev[Developer] --> |Analyze dependencies| Tool[dependency-cruiser-reporter]
    Lead[Tech Lead] --> |Monitor compliance| Tool
    Ops[DevOps] --> |CI/CD integration| Tool
```

| Role | Use Case |
|------|----------|
| Developer | Analyze project dependencies during development |
| Tech Lead | Monitor architecture compliance during code review |
| DevOps | Integrate into CI/CD pipeline for automated checks |

## Feature Roadmap

```mermaid
flowchart LR
    subgraph P0["P0 - Must Have"]
        P0A[Rust Preprocessing]
        P0B[Auto Aggregation]
        P0C[Layout Pre-compute]
        P0D[Graph Display]
        P0E[Violation Report]
        P0F[Basic Metrics]
    end

    subgraph P1["P1 - Should Have"]
        P1A[Drill-down/Roll-up]
        P1B[Filters]
        P1C[Search]
        P1D[Multi-scan Compare]
        P1E[Export JSON/CSV]
    end

    subgraph P2["P2 - Nice to Have"]
        P2A[Dark Theme]
        P2B[Mobile Responsive]
        P2C[Source Explorer]
        P2D[Pre-commit Hook]
    end

    P0 --> P1 --> P2
```

## Non-Goals

- Real-time dependency monitoring
- IDE integration (out of scope for P0)
- Custom rule definition (use dependency-cruiser directly)
