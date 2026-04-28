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

- SVG-based rendering
- Node grid layout (5 columns)
- Edge rendering with weight-based stroke width (max 3px)
- Node/edge counts display
- Max 20 edges displayed

### Layout Algorithm

```tsx
const x = 100 + (i % 5) * 150;  // 5-column grid
const y = 100 + Math.floor(i / 5) * 100;
```

### Data Rendering

```mermaid
flowchart LR
    Data["ProcessedGraph"] --> Nodes["data.nodes\n→ SVG circles"]
    Data --> Edges["data.edges (max 20)\n→ SVG lines"]
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

```tsx
const [viewMode, setViewMode] = useState<ViewMode>('graph');

// Navigation buttons
<button onClick={() => setViewMode('graph')}>Graph</button>
<button onClick={() => setViewMode('report')}>Report</button>
<button onClick={() => setViewMode('metrics')}>Metrics</button>

// Conditional rendering
{viewMode === 'graph' && <GraphView data={data} />}
{viewMode === 'report' && <ReportView violations={data.violations} />}
{viewMode === 'metrics' && <MetricsView data={data} />}
```
