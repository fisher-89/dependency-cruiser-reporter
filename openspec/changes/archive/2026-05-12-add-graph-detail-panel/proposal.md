## Why

The graph view today renders nodes and edges but provides no way to inspect a node in depth. When a user sees a node, they naturally want to know: what does it depend on, who depends on it, is it stable, and what rules does it violate? Without this, the graph is visually interesting but not actionable for architectural analysis.

## What Changes

- Add a persistent side panel to the right of the graph view that shows details for the selected node
- Single-clicking a graph node selects it and populates the panel; double-clicking expands/collapses directories without selecting
- The panel displays: full path, stability metric (I = Ce / Ce+Ca), dependencies grouped by edge type, dependents grouped by edge type, and associated violations with severity and rule name
- The panel stays visible at all times, showing a placeholder message when no node is selected

## Capabilities

### New Capabilities

- `graph-detail-panel`: A persistent side panel in the graph view that, when a node is selected, displays its full path, stability metric, dependencies/dependents grouped by edge type, and associated violation details.

### Modified Capabilities

- `frontend`: Component architecture gains a DetailPanel component. Graph view layout switches from full-width G6 canvas to a split layout (canvas + panel). G6 node interaction adds click-to-select behavior with single-click/double-click disambiguation.

## Impact

- **Frontend**: New `DetailPanel.tsx` component, modified `DependencyGraph.tsx` (click handlers, selected state), modified `App.tsx` (layout, selectedNodeId state)
- **Rust backend**: No changes — all detail panel data is computed client-side from existing `ProcessedGraph` fields
- **Types**: No changes — existing `GraphNode`, `GraphEdge`, `ViolationInfo` types cover all needed data
