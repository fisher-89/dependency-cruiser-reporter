# Data Flow

## Processing Pipeline

```mermaid
flowchart TB
    Input[dependency-cruiser JSON] --> CLI[dep-report CLI]
    CLI --> Rust{Rust binary\navailable?}
    Rust -->|Yes| Native[Native Rust\nparse_and_aggregate]
    Rust -->|No| Node[Node.js\nconvertDcOutput]
    Native --> Output[ProcessedGraph JSON]
    Node --> Output
    Output --> Render[Frontend Render]

    style Input fill:#e0f2fe,stroke:#0284c7
    style Render fill:#dcfce7,stroke:#16a34a
```

## Processing Modes

```mermaid
flowchart LR
    subgraph Scan["Scan Mode (dep-report scan)"]
        Path["Project directory"] --> DC["dependency-cruiser\nAPI (cruise)"]
        DC --> Convert["convertDcOutput()\nNode.js"]
        Convert --> File1["graph.json"]
    end

    subgraph Analyze["Analyze Mode (dep-report analyze)"]
        Input["Input JSON"] --> Check{"dcr-aggregate\nbinary?"}
        Check -->|Found| Rust["Rust binary"]
        Check -->|Not found| Fallback["convertDcOutput()\nNode.js fallback"]
        Rust --> File2["graph.json"]
        Fallback --> File2
    end

    subgraph Open["Open Mode (dep-report open)"]
        File3["graph.json"] --> Server["Express server"]
        Server --> Browser["Browser"]
    end
```

## Input Format

dependency-cruiser outputs JSON. The CLI supports two input structures:

### Structure with nested dependencies (used by `scan` command)

The `scan` command uses the dependency-cruiser API, which returns modules with nested dependencies:

```typescript
interface DcOutput {
  modules: DcModule[];
  summary?: {
    violations: number;
    error: number;
    warn: number;
    info: number;
    totalCruised: number;
    totalDependenciesCruised: number;
  };
}

interface DcModule {
  source: string;
  dependencies: DcDependency[];
  valid: boolean;
}

interface DcDependency {
  resolved: string;
  moduleSystem: string;
  coreModule: boolean;
  couldNotResolve: boolean;
  dependencyTypes: string[];
  followable: boolean;
  rules?: { name: string; severity: string }[];
}
```

### Structure with top-level dependencies (used by Rust engine)

The Rust engine expects a flat structure with separate top-level arrays:

```rust
struct CruiseResult {
    modules: Option<Vec<Module>>,
    dependencies: Option<Vec<Dependency>>,
    violations: Option<Vec<RawViolation>>,
    summary: Option<Summary>,
}

struct Module {
    source: String,
    dependencies: Vec<String>,
    dependency_types: Option<Vec<String>>,
    size: Option<usize>,
}

struct Dependency {
    resolved: Option<String>,
    core_module: Option<String>,
    dependency_types: Vec<String>,
    from: Option<String>,
    to: Option<String>,
}
```

## Output Format

Both Rust and Node.js paths output the same `ProcessedGraph` JSON:

```typescript
interface ProcessedGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  meta: GraphMeta;
  violations: ViolationInfo[];
}
```

See [Data Structures](../backend/data-structures.md) for full type definitions.

## Scan Mode Flow

```mermaid
sequenceDiagram
    participant User
    participant CLI
    participant DC as dependency-cruiser
    participant Convert as convertDcOutput

    User->>CLI: dep-report scan --path ./project
    CLI->>CLI: Find .dependency-cruiser config
    CLI->>DC: cruise([path], options)
    DC-->>CLI: CruiseResult
    CLI->>Convert: convertDcOutput(json)
    Convert-->>CLI: ProcessedGraph
    CLI->>CLI: Write graph.json
```

## Analyze Mode Flow

```mermaid
sequenceDiagram
    participant User
    participant CLI
    participant Rust as dcr-aggregate
    participant Fallback as convertDcOutput

    User->>CLI: dep-report analyze --input cruise.json
    CLI->>CLI: Find dcr-aggregate binary
    alt Binary found
        CLI->>Rust: spawn dcr-aggregate --input --output
        Rust-->>CLI: exit 0
    else Binary not found
        CLI->>Fallback: convertDcOutput(json)
        Fallback-->>CLI: ProcessedGraph
        CLI->>CLI: Write graph.json
    end
```

## Open Mode Flow

```mermaid
sequenceDiagram
    participant User
    participant CLI
    participant Server as Express Server
    participant Browser

    User->>CLI: dep-report open --file graph.json
    CLI->>Server: Start HTTP server
    Browser->>Server: GET / (index.html)
    Browser->>Server: GET /api/config
    Server-->>Browser: { hasGraphFile: true }
    Browser->>Server: GET /api/graph
    Server-->>Browser: ProcessedGraph JSON
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
```
