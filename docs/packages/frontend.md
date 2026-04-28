# Frontend Package

## Overview

The `packages/frontend` package provides the React-based visualization interface. It loads graph data from the server API or accepts uploaded JSON files.

## Package Structure

```
packages/frontend/
├── src/
│   ├── App.tsx           # Main application (upload + view switching)
│   ├── main.tsx          # React entry point
│   ├── types.ts          # TypeScript type definitions
│   └── components/
│       └── DependencyGraph.tsx  # G6 graph visualization component
├── index.html            # HTML template
├── vite.config.ts        # Vite configuration
├── tsconfig.json         # TypeScript config
├── biome.json            # Biome linting config
└── package.json
```

## Technology Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| AntV G6 5 | Graph visualization (combo tree + force layout) |
| Vite 5 | Build tool |
| TypeScript 5 | Type safety |
| Biome | Linting/formatting |

## Component Architecture

```mermaid
flowchart TB
    App["App\n(state: data, viewMode, loading, error)"]

    App --> UploadArea["UploadArea\n(drag-and-drop + file input)"]
    App --> Nav["Navigation\n(Graph / Report / Metrics)"]

    Nav --> DependencyGraph["DependencyGraph\n(G6 comboCombined layout)"]
    Nav --> ReportView["ReportView\n(props: violations)"]
    Nav --> MetricsView["MetricsView\n(props: data)"]
```

The GraphView is now implemented as `DependencyGraph` component using AntV G6 v5 with `comboCombined` layout (directory nesting + force layout).

## Data Loading

The frontend supports two data loading paths:

1. **Server mode**: On mount, fetches `/api/config` to check if a graph file is available, then loads it via `/api/graph`
2. **File upload**: User drops or selects a `.json` file, which is parsed directly with `JSON.parse`

```mermaid
flowchart TB
    Mount["App mounts"] --> Config["GET /api/config"]
    Config -->|hasGraphFile: true| Load["GET /api/graph"]
    Config -->|hasGraphFile: false| Upload["Show upload area"]
    Load --> Render["Render visualization"]
    Upload -->|File selected| Parse["JSON.parse(file.text())"]
    Parse --> Render
```

## State Management

```mermaid
stateDiagram-v2
    [*] --> Idle: App initialized
    Idle --> Loading: File selected / server load
    Loading --> Loaded: Parse success
    Loading --> Error: Parse failed
    Error --> Loading: Retry upload
    Loaded --> GraphView: Default view
    Loaded --> ReportView: Switch tab
    Loaded --> MetricsView: Switch tab
    Loaded --> Idle: Reset
    Error --> Idle: Reset
```

Current implementation uses React `useState`. No external state management library.

| State | Type | Owner |
|-------|------|-------|
| `data` | `ProcessedGraph \| null` | App |
| `viewMode` | `'graph' \| 'report' \| 'metrics'` | App |
| `loading` | `boolean` | App |
| `error` | `string \| null` | App |

## Styling

Inline styles defined in `styles` object within `App.tsx`:

```tsx
const styles: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', ... },
  header: { background: '#fff', ... },
  // ...
};
```

Color palette:

| Token | Hex | Usage |
|-------|-----|-------|
| Primary | `#4a90d9` | Nodes, links |
| Error | `#ef4444` | Errors |
| Warning | `#f59e0b` | Warnings |
| Info | `#3b82f6` | Info |
| Background | `#f8fafc` | Page background |

## npm Package Configuration

> See [packages/frontend/package.json](../../packages/frontend/package.json) for current package configuration.

## Commands

```bash
pnpm dev           # Start dev server (http://localhost:5173)
pnpm build         # Production build
pnpm lint          # Biome linting
```
