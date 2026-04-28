# Web UI Guide

## Starting the Server

```bash
# From pre-processed file
dep-report open -f graph.json

# Custom port
dep-report open -f graph.json -p 8080
```

## Interface Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Dependency Cruiser Reporter    [Graph] [Report] [Metrics]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    ┌───────────────────┐                     │
│                    │                   │                     │
│                    │  Drop JSON file   │                     │
│                    │  here or click    │                     │
│                    │  to upload        │                     │
│                    └───────────────────┘                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

When started with `-f graph.json`, the server loads the file automatically via the `/api/graph` endpoint. The frontend checks `/api/config` on mount to determine if a graph file is available.

## Upload Area

### Drag-and-Drop

Drag a `.json` file onto the upload area.

### Click to Upload

Click the upload area to open file picker, select a `.json` file.

### File Format

Expected format: [`ProcessedGraph`](../backend/data-structures.md) JSON output from `dep-report analyze` or `dep-report scan`.

Uploaded files are parsed directly with `JSON.parse` — no server-side processing occurs.

## Views

### Graph View

Default view showing dependency graph.

**Display:**

- Nodes positioned in 5-column grid
- Edges rendered as lines
- Weight determines line thickness (max 3px)
- Max 20 edges displayed

**Info Bar:**

- Node count
- Edge count
- Aggregation level

### Report View

Violation list by severity.

**Summary Cards:**

| Card | Description |
|------|-------------|
| Errors | `severity === 'error'` |
| Warnings | `severity === 'warn'` |
| Info | `severity === 'info'` |

**Violation Items:**

- Rule name
- Source → Target path
- Message (if available)

### Metrics View

Statistics dashboard.

**Metrics Grid:**

| Metric | Description |
|--------|-------------|
| Original Nodes | Count before aggregation |
| Aggregated Nodes | Count after aggregation |
| Dependencies | Total edge count |
| Violations | Total violation count |

**Edge Types Breakdown:**

- `local` — Project internal
- `npm` — External packages
- `core` — Node.js built-ins
- `dynamic` — Dynamic imports

## Actions

| Action | Elements | Behavior |
|--------|----------|----------|
| Upload New File | Button | Reset and show upload area |
