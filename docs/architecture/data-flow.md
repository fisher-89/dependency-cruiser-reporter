# Data Flow

## Processing Pipeline

```mermaid
flowchart TB
    Input[dependency-cruiser JSON] --> Upload[File Upload / CLI Input]
    Upload --> WASM[WASM Module]
    WASM --> Parse[Parse & Validate]
    Parse --> Agg[Aggregate Nodes]
    Agg --> Compress[Compress Edges]
    Compress --> Output[Output ProcessedGraph]
    Output --> Render[Frontend Render]

    style Input fill:#e0f2fe,stroke:#0284c7
    style WASM fill:#fef3c7,stroke:#d97706
    style Render fill:#dcfce7,stroke:#16a34a
```

## Processing Modes

```mermaid
flowchart LR
    subgraph Browser["Browser Mode"]
        Upload[File Upload] --> WASM1[WASM Module]
        WASM1 --> React[React Visualization]
    end

    subgraph CLI["CLI Mode"]
        File[Input JSON] --> WASM2[Node.js WASM]
        WASM2 --> Output[graph.json]
        Output --> Server[HTTP Server]
        Server --> Browser2[Browser]
    end
```

## Input Format

dependency-cruiser outputs JSON with this structure:

```mermaid
classDiagram
    class CruiseResult {
        +Module[] modules
        +Dependency[] dependencies
        +Violation[] violations
        +Summary summary
    }

    class Module {
        +string source
        +string[] dependencies
        +number size
    }

    class Dependency {
        +string from
        +string to
        +string resolved
        +string[] dependencyTypes
    }

    class Violation {
        +string from
        +string to
        +Rule rule
        +string message
    }

    class Rule {
        +string name
        +string severity
    }

    class Summary {
        +number violations
        +number error
        +number warn
        +number info
    }

    CruiseResult --> Module
    CruiseResult --> Dependency
    CruiseResult --> Violation
    CruiseResult --> Summary
    Violation --> Rule
```

Example:

```json
{
  "modules": [{ "source": "src/index.ts", "dependencies": ["src/app.ts"], "size": 42 }],
  "dependencies": [{ "from": "src/index.ts", "to": "src/app.ts", "resolved": "src/app.ts", "dependencyTypes": ["local"] }],
  "violations": [{ "from": "src/index.ts", "to": "src/app.ts", "rule": { "name": "no-circular", "severity": "error" }, "message": "Circular dependency detected" }],
  "summary": { "violations": 1, "error": 1, "warn": 0, "info": 0 }
}
```

## Output Format

Rust preprocessing outputs lightweight JSON:

```mermaid
classDiagram
    class ProcessedGraph {
        +GraphNode[] nodes
        +GraphEdge[] edges
        +GraphMeta meta
        +ViolationInfo[] violations
    }

    class GraphNode {
        +string id
        +string label
        +NodeType node_type
        +string path
        +number violation_count
        +string[] children
    }

    class GraphEdge {
        +string source
        +string target
        +EdgeType edge_type
        +number weight
    }

    class GraphMeta {
        +number original_node_count
        +number aggregated_node_count
        +AggregationLevel aggregation_level
        +number total_violations
    }

    class ViolationInfo {
        +string from
        +string to
        +string rule
        +string severity
        +string message
    }

    ProcessedGraph --> GraphNode
    ProcessedGraph --> GraphEdge
    ProcessedGraph --> GraphMeta
    ProcessedGraph --> ViolationInfo
```

Example:

```json
{
  "nodes": [{ "id": "src/components", "label": "components", "node_type": "directory", "path": "src/components", "violation_count": 0, "children": ["src/components/Button.tsx", "src/components/Input.tsx"] }],
  "edges": [{ "source": "src/components", "target": "src/utils", "edge_type": "local", "weight": 5 }],
  "meta": { "original_node_count": 150, "aggregated_node_count": 25, "aggregation_level": "directory", "total_violations": 3 },
  "violations": []
}
```

## Browser Mode Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant WASM
    participant React

    Browser->>React: Load page
    React->>WASM: init()
    WASM-->>React: Ready
    User->>Browser: Upload JSON file
    Browser->>WASM: parse_and_aggregate(json)
    WASM-->>Browser: ProcessedGraph JSON
    Browser->>React: setState(graph)
    React->>User: Render visualization
```

## CLI Mode Flow

```mermaid
sequenceDiagram
    participant User
    participant CLI
    participant WASM
    participant Server
    participant Browser

    User->>CLI: dep-report analyze -i input.json
    CLI->>WASM: init()
    WASM-->>CLI: Ready
    CLI->>WASM: parse_and_aggregate(json)
    WASM-->>CLI: ProcessedGraph
    CLI->>CLI: Write graph.json

    User->>CLI: dep-report open -f graph.json
    CLI->>Server: Start HTTP server
    Server->>Browser: Serve frontend
    Browser->>Server: GET /api/graph
    Server-->>Browser: graph.json content
    Browser->>Browser: Render visualization
```

## Frontend Interaction Flow

```mermaid
stateDiagram-v2
    [*] --> Upload: Open app
    Upload --> GraphView: File loaded
    GraphView --> ReportView: Click Report tab
    GraphView --> MetricsView: Click Metrics tab
    ReportView --> GraphView: Click Graph tab
    ReportView --> MetricsView: Click Metrics tab
    MetricsView --> GraphView: Click Graph tab
    MetricsView --> ReportView: Click Report tab
    GraphView --> Upload: Click Upload New File
    ReportView --> Upload: Click Upload New File
    MetricsView --> Upload: Click Upload New File
```

### Interaction Details

```mermaid
flowchart LR
    subgraph GraphInteraction["Graph Interaction Loop"]
        direction TB
        Browse[Browse nodes]
        Drill[Drill-down: click aggregated node]
        Rollup[Roll-up: click back button]
        Zoom[Zoom / Pan]
        Search[Search: filter by path]

        Browse --> Drill
        Drill --> Browse
        Browse --> Rollup
        Rollup --> Browse
        Browse --> Zoom
        Browse --> Search
    end
```

| Action | Behavior |
|--------|----------|
| Click aggregated node | Expand to show children |
| Click "back" button | Return to parent level |
| Zoom/Pan | Navigate large graphs |
| Search | Filter nodes by path |