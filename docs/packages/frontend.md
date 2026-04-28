# Frontend Package

## Overview

The `packages/frontend` package provides the React-based visualization interface. It loads graph data from the server API or accepts uploaded JSON files.

## Package Structure

```
packages/frontend/
├── src/
│   ├── App.tsx           # Main application (all views inline)
│   ├── main.tsx          # React entry point
│   └── types.ts          # TypeScript type definitions
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
| D3.js 7 | Graph visualization |
| Vite 5 | Build tool |
| TypeScript 5 | Type safety |
| Biome | Linting/formatting |

## Component Architecture

```mermaid
flowchart TB
    App["App\n(state: data, viewMode, loading, error)"]

    App --> UploadArea["UploadArea\n(drag-and-drop + file input)"]
    App --> Nav["Navigation\n(Graph / Report / Metrics)"]

    Nav --> GraphView["GraphView\n(props: data)"]
    Nav --> ReportView["ReportView\n(props: violations)"]
    Nav --> MetricsView["MetricsView\n(props: data)"]
```

All view components (GraphView, ReportView, MetricsView) are defined inline in `App.tsx`.

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

```json
{
  "name": "@dcr-reporter/frontend",
  "version": "0.1.0",
  "type": "module",
  "dependencies": {
    "d3": "^7.9.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.0",
    "@playwright/test": "^1.45.0",
    "@types/d3": "^7.4.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "dependency-cruiser": "^17.3.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0"
  },
  "engines": {
    "node": ">=18"
  }
}
```

## Commands

```bash
pnpm dev           # Start dev server (http://localhost:5173)
pnpm build         # Production build
pnpm lint          # Biome linting
```
