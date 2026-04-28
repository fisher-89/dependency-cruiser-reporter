# Views

Three main views in the application.

## View Navigation

```mermaid
flowchart LR
    App[Dependency Cruiser Reporter] --> G[Graph]
    App --> R[Report]
    App --> M[Metrics]
```

## Graph View

Interactive dependency graph visualization.

### Features

- AntV G6 canvas/SVG rendering
- comboCombined layout with automatic node positioning
- Edge rendering with weight-based stroke width (max 3px)
- Node/edge counts display
- Max 20 edges displayed

### Layout Algorithm

Layout uses AntV G6's `comboCombined` layout algorithm, which automatically positions nodes in a force-directed arrangement with combo (group) support for aggregated nodes.

### Data Rendering

```mermaid
flowchart LR
    Data["ProcessedGraph"] --> Nodes["data.nodes\n→ G6 nodes"]
    Data --> Edges["data.edges (max 20)\n→ G6 edges"]
    Data --> Meta["data.meta\n→ Info bar"]
```

### Data Displayed

| Element | Source |
|---------|--------|
| Nodes | `data.nodes` |
| Edges | `data.edges` (max 20 shown) |
| Counts | `data.meta` |

---

## Report View

Violation list grouped by severity.

### Summary Cards

```mermaid
flowchart LR
    Violations["violations[]"] --> Filter1["filter: severity=error"]
    Violations --> Filter2["filter: severity=warn"]
    Violations --> Filter3["filter: severity=info"]
    Filter1 --> Card1["Errors Card"]
    Filter2 --> Card2["Warnings Card"]
    Filter3 --> Card3["Info Card"]
```

### Violation Items

Each violation item displays:

```mermaid
flowchart LR
    V["ViolationInfo"] --> Rule["rule name + severity badge"]
    V --> Path["from → to"]
    V --> Msg["message (optional)"]
```

### Severity Colors

| Severity | Border Color |
|----------|--------------|
| `error` | `#ef4444` (red) |
| `warn` | `#f59e0b` (amber) |
| `info` | `#3b82f6` (blue) |

### Filtering

Current: No filtering

---

## Metrics View

Summary statistics dashboard.

### Key Metrics

```mermaid
flowchart TB
    Data["ProcessedGraph"] --> M1["Original Nodes\nmeta.original_node_count"]
    Data --> M2["Aggregated Nodes\nmeta.aggregated_node_count"]
    Data --> M3["Dependencies\nedges.length"]
    Data --> M4["Violations\nmeta.total_violations"]
    Data --> M5["Edge Types\nreduce edges by edge_type"]
```

### Edge Type Distribution

| Type | Source |
|------|--------|
| `local` | `edges.filter(e => e.edge_type === 'local').length` |
| `npm` | `edges.filter(e => e.edge_type === 'npm').length` |
| `core` | `edges.filter(e => e.edge_type === 'core').length` |
| `dynamic` | `edges.filter(e => e.edge_type === 'dynamic').length` |

### Data Sources

| Metric | Source |
|--------|--------|
| Original Nodes | `meta.original_node_count` |
| Aggregated Nodes | `meta.aggregated_node_count` |
| Dependencies | `edges.length` |
| Violations | `meta.total_violations` |
| Edge Types | `edges[].edge_type` aggregation |

---

## View Mode Switching

```mermaid
stateDiagram-v2
    [*] --> GraphView: File loaded (default)
    GraphView --> ReportView: Click Report
    GraphView --> MetricsView: Click Metrics
    ReportView --> GraphView: Click Graph
    ReportView --> MetricsView: Click Metrics
    MetricsView --> GraphView: Click Graph
    MetricsView --> ReportView: Click Report
```

View switching uses React `useState` with a `ViewMode` union type (`'graph' | 'report' | 'metrics'`). The active view is rendered conditionally based on the current state.
