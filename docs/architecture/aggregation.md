# Aggregation Strategy

## Overview

The Rust preprocessing engine automatically aggregates nodes based on count thresholds to handle large projects (100k+ nodes) without performance degradation.

## Aggregation Level Selection

```mermaid
flowchart TD
    Start[Input: node_count] --> Check1{node_count ≤ 1000?}
    Check1 -->|Yes| File[File Level\nNo aggregation]
    Check1 -->|No| Check2{node_count ≤ 5000?}
    Check2 -->|Yes| Dir[Directory Level\nGroup by directory]
    Check2 -->|No| Check3{node_count ≤ 20000?}
    Check3 -->|Yes| Pkg[Package Level\nGroup by npm package]
    Check3 -->|No| Root[Root Level\nSingle root node]

    style File fill:#dcfce7,stroke:#16a34a
    style Dir fill:#e0f2fe,stroke:#0284c7
    style Pkg fill:#fef9c3,stroke:#ca8a04
    style Root fill:#fee2e2,stroke:#dc2626
```

| Level | Description | Node Count Range |
|-------|-------------|-------------------|
| `file` | No aggregation, show all files | ≤ 1000 |
| `directory` | Group by parent directory | 1001 - 5000 |
| `package` | Group by npm package | 5001 - 20000 |
| `root` | Single root node | > 20000 |

## Selection Logic

```rust
fn select_aggregation_level(node_count: usize) -> AggregationLevel {
    match node_count {
        0..=1000    => AggregationLevel::File,
        1001..=5000  => AggregationLevel::Directory,
        5001..=20000 => AggregationLevel::Package,
        _           => AggregationLevel::Root,
    }
}
```

## Aggregation Rules

### Directory Aggregation

Multiple files are merged into a directory node:

```mermaid
flowchart TB
    subgraph Before["Before Aggregation"]
        F1[src/components/Button.tsx]
        F2[src/components/Input.tsx]
        F3[src/components/List.tsx]
    end

    subgraph After["After Aggregation"]
        Dir["src/components\n(node with 3 children)"]
    end

    F1 --> Dir
    F2 --> Dir
    F3 --> Dir

    style Dir fill:#e0f2fe,stroke:#0284c7
```

### Edge Compression

File-to-file edges become directory-to-directory edges:

```mermaid
flowchart LR
    subgraph Before["Before Compression"]
        B1[Button.tsx] -->|weight 1| H1[utils/helpers.ts]
        I1[Input.tsx] -->|weight 1| H2[utils/helpers.ts]
        L1[List.tsx] -->|weight 1| F1[utils/format.ts]
    end

    subgraph After["After Compression"]
        Comp[components] -->|weight 3| Utils[utils]
    end
```

**Edge type is determined by majority vote.**

### Violation Inheritance

When a child node has violations, the parent node displays a warning indicator:

```mermaid
flowchart TB
    subgraph Before["Before"]
        V1["src/components/Button.tsx\n(violation: error)"]
        V2["src/components/Input.tsx\n(no violations)"]
    end

    subgraph After["After"]
        Parent["src/components\n(warning indicator)"]
    end

    V1 --> Parent
    V2 --> Parent

    style V1 fill:#fee2e2,stroke:#dc2626
    style Parent fill:#fef9c3,stroke:#ca8a04
```

## Edge Type Detection

```mermaid
flowchart TD
    Start[dep_types] --> Npm{Contains npm or\nnode_modules?}
    Npm -->|Yes| NpmType[EdgeType::Npm]
    Npm -->|No| Core{Contains core?}
    Core -->|Yes| CoreType[EdgeType::Core]
    Core -->|No| Dynamic{Contains dynamic?}
    Dynamic -->|Yes| DynamicType[EdgeType::Dynamic]
    Dynamic -->|No| LocalType[EdgeType::Local]

    style NpmType fill:#dcfce7,stroke:#16a34a
    style CoreType fill:#f1f5f9,stroke:#64748b
    style DynamicType fill:#fff7ed,stroke:#ea580c
    style LocalType fill:#dbeafe,stroke:#2563eb
```

| Edge Type | Description | Color (UI) |
|-----------|-------------|------------|
| `local` | Project internal dependency | Blue |
| `npm` | External npm package | Green |
| `core` | Node.js built-in module | Gray |
| `dynamic` | Dynamic import (`import()`) | Orange |

## Circular Dependencies

Circular dependencies are preserved at aggregation boundaries:

```mermaid
flowchart LR
    subgraph Before["Before"]
        A --> B --> C --> A
    end

    subgraph After["After (directory-level)"]
        D1[dir1] --> D2[dir2] --> D3[dir3] --> D1
    end

    style A fill:#fee2e2,stroke:#dc2626
    style D1 fill:#fee2e2,stroke:#dc2626
    style D2 fill:#fee2e2,stroke:#dc2626
    style D3 fill:#fee2e2,stroke:#dc2626
```

The `children` array in each node allows drilling down to inspect the actual cycle.

## Performance Characteristics

| Nodes | Aggregation Level | Output Size | Load Time |
|-------|------------------|-------------|-----------|
| 100 | file | ~100 nodes | <100ms |
| 5,000 | directory | ~500 nodes | <500ms |
| 20,000 | package | ~100 nodes | <1s |
| 100,000 | root | 1 node | <3s |