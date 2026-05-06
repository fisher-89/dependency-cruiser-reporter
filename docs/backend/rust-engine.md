# Rust Engine Design

## Overview

The Rust preprocessing engine is the core of dependency-cruiser-reporter, responsible for parsing, aggregating, and transforming dependency-cruiser JSON output. It compiles to a native binary (`dcr-aggregate`) invoked by the CLI.

## Dependencies

| Crate | Purpose |
|-------|---------|
| `serde` + `serde_json` | JSON serialization/deserialization |
| `thiserror` | Error handling |
| `clap` | CLI argument parsing (binary only) |

## Module Structure

```
packages/rust/
├── Cargo.toml
├── src/
│   ├── lib.rs           # Library entry point, re-exports types
│   ├── lib_test.rs      # Unit tests
│   ├── types.rs         # Data structures (ProcessedGraph, GraphNode, etc.)
│   ├── main.rs          # CLI entry point (dcr-aggregate binary)
│   └── aggregate/       # Aggregation logic
│       ├── mod.rs       # Module exports
│       ├── edges.rs     # Edge extraction, aggregation, type detection
│       ├── expand.rs    # Auto-compute expanded directories algorithm
│       └── hybrid.rs    # Hybrid node building with combo generation
```

The codebase is organized into modules:
- `types.rs`: All data structures and error types
- `aggregate/`: Processing logic for node aggregation and edge handling
- `lib_test.rs`: Comprehensive unit tests

## Processing Flow

```mermaid
flowchart TB
    Input[Read input file] --> Parse[Parse JSON\nserde_json::from_str]
    Parse --> Validate[Validate CruiseResult]
    Validate --> Violations[Extract violations]
    Violations --> ComputeExpanded{expanded_dirs\nprovided?}
    ComputeExpanded -->|No| AutoExpand[compute_auto_expanded_dirs]
    ComputeExpanded -->|Yes| UseProvided[Use provided set]
    AutoExpand --> BuildHybrid[build_hybrid_nodes]
    UseProvided --> BuildHybrid

    BuildHybrid --> Combos[Generate combos\nwith single-child collapse]
    Combos --> EdgeProc[aggregate_edges]
    EdgeProc --> Output[Serialize ProcessedGraph]

    style Input fill:#e0f2fe,stroke:#0284c7
    style Output fill:#dcfce7,stroke:#16a34a
```

The hybrid aggregation approach allows mixing expanded (file-level) and collapsed (directory-level) nodes in the same graph.

## Entry Point

### Library API (`lib.rs`)

```rust
pub fn parse_and_aggregate(
    input: &Path,
    max_nodes: usize,
    expanded_dirs: Option<Vec<String>>,
) -> Result<ProcessedGraph, DcrError>
```

Reads the input file, parses the JSON, determines which directories to expand, builds nodes/combos/edges, and returns the processed graph.

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `input` | `&Path` | Path to dependency-cruiser JSON file |
| `max_nodes` | `usize` | Maximum edges in output (default: 5000) |
| `expanded_dirs` | `Option<Vec<String>>` | Directories to expand; `None` triggers auto-computation |

When `expanded_dirs` is `None`, the `compute_auto_expanded_dirs` function determines which directories to expand based on a budget algorithm. Directories in this set show file-level nodes; others are collapsed to directory nodes.

### CLI (`main.rs`)

```bash
dcr-aggregate --input <path> --output <path> [options]
```

Uses clap derive API. Parses arguments, calls `parse_and_aggregate`, and writes the output JSON.

## Error Handling

> Error handling is defined in the [Rust package docs](../packages/rust.md#error-handling).

## Core Functions

### Aggregation Builders

| Function | Module | Purpose |
|----------|--------|---------|
| `build_hybrid_nodes` | `aggregate/hybrid.rs` | Build nodes and combos based on expanded_dirs set |
| `compute_auto_expanded_dirs` | `aggregate/expand.rs` | Auto-compute expanded directories using budget algorithm |
| `aggregate_edges` | `aggregate/edges.rs` | Aggregate and sort edges by weight |
| `extract_edges` | `aggregate/edges.rs` | Extract raw edges from modules |
| `compute_violation_counts` | `aggregate/edges.rs` | Count violations per module |

### Edge Processing

```mermaid
flowchart LR
    EdgeMap["Edge Map\nHashMap<(src, tgt), Vec<String>>"] --> Convert[Convert to Vec]
    Convert --> Sort["Sort by weight\ndescending"]
    Sort --> Truncate["Truncate to max_nodes\ncapped at 10000"]
    Truncate --> Result["Vec<GraphEdge>"]
```

1. Convert edge map to vector
2. Sort by weight (descending)
3. Truncate to `max_nodes` (capped at 10000)

### Helper Functions

| Function | Module | Purpose |
|----------|--------|---------|
| `detect_edge_type` | `aggregate/edges.rs` | Classify edge from `dependencyTypes` |
| `is_path_expanded` | `aggregate/hybrid.rs` | Check if path should show files |
| `find_closest_unexpanded_ancestor` | `aggregate/hybrid.rs` | Find collapsed ancestor for a path |

## Testing

Tests are in `lib_test.rs`:

```bash
cargo test        # Run unit tests
cargo clippy      # Lint
cargo fmt         # Format
```

### Test Coverage

| Test | Purpose |
|------|---------|
| `test_aggregation_level_selection` | Verify level determination from expanded_set |
| `test_edge_type_detection` | Verify edge type classification |
| `test_violation_counts` | Verify violation counting |
| `test_edge_aggregation` | Verify edge weight aggregation |

## Build Profiles

Release builds are optimized for:
- Maximum optimization level (`opt-level = 3`)
- Link-time optimization (`lto = true`)
- Single codegen unit for better optimization
