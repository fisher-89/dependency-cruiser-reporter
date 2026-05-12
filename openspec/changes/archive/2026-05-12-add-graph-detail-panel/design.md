## Context

The graph view (DependencyGraph + G6) renders nodes and edges in a full-width canvas. A node click today triggers no action; double-click expands/collapses directory combos. To make the graph actionable for architectural analysis, users need a way to inspect a node's metadata — dependencies, dependents, stability, and violations.

The data is already available in `ProcessedGraph`. All computation happens client-side with zero backend changes.

## Goals / Non-Goals

**Goals:**
- Add a persistent side panel to the right of the graph canvas
- Single-click a node to select it and populate the panel
- Display full path, stability (I = Ce / Ce+Ca), dependencies grouped by edge type, dependents grouped by edge type, and associated violations
- Double-click behavior unchanged (expand/collapse directories, no selection triggered)
- Panel remains visible until a different node is selected or graph data is refreshed
- Panel shows a placeholder when no node is selected

**Non-Goals:**
- Internal file listing (deferred)
- Node search / filter integration
- Panel close button or click-away-to-dismiss
- Dark theme support
- Mobile responsive panel

## Decisions

### Decision 1: Split layout vs overlay drawer

**Chosen**: Split layout — canvas on the left, fixed-width panel on the right.

**Rationale**: The graph view is space-hungry but the panel is a reference tool; users need to see both simultaneously. An overlay drawer would obscure nodes and complicate G6 coordinate mapping. A split layout lets the graph re-fit into its remaining space naturally.

**Alternative considered**: Ant Design Drawer component. Rejected because (a) it adds a dependency, (b) overlay behavior conflicts with G6's canvas interactions, and (c) the project uses inline styles, not a component library.

### Decision 2: Single-click/double-click disambiguation

**Chosen**: 300ms timer delay on `node:click`. If `node:dblclick` fires within the window, cancel the selection and proceed with expand/collapse.

**Rationale**: G6 fires `node:click` before `node:dblclick` unconditionally. Without disambiguation, every double-click would also trigger a selection update. A timer-based gate is the standard DOM pattern.

**Alternative considered**: Setting `node:click` + `node:dblclick` and accepting the redundant click. Rejected because it causes a flash of panel content change on every expand/collapse.

### Decision 3: Data computation location

**Chosen**: Pure client-side computation in `DetailPanel` via `useMemo`.

**Rationale**: All required data (edges, nodes, violations) is already in `ProcessedGraph`. Adding Rust-side computation would increase WASM bundle size and API surface for no latency gain — the filtering is O(n) on datasets under 200 nodes.

**Alternative considered**: Pre-computing per-node metadata in the Rust backend. Rejected as unnecessary until datasets grow beyond the node budget.

### Decision 4: State ownership

**Chosen**: `selectedNodeId` state lives in `App.tsx`, passed as prop to both `DependencyGraph` and `DetailPanel`.

**Rationale**: `DependencyGraph` needs it for node highlight styling; `DetailPanel` needs it for data lookup. Lifting to `App` avoids prop drilling through intermediate layers (there are none — both are direct children of the graph view container).

### Decision 5: Panel width

**Chosen**: Fixed 320px panel.

**Rationale**: Wide enough to show file paths and edge lists without horizontal scroll, narrow enough to leave meaningful canvas space. This is a common inspection-panel width (Chrome DevTools, VS Code sidebar).

## Risks / Trade-offs

- **300ms click delay**: Users will feel a slight lag between click and panel update. Mitigation: 300ms is below the perceptual threshold for intentional interactions; the delay aligns with the OS double-click speed default.
- **Data refresh clears selection**: When `expandedDirs` changes, `ProcessedGraph` is replaced with new node IDs. The previous `selectedNodeId` may no longer exist. Mitigation: clear `selectedNodeId` on data refresh (simple, predictable).
- **G6 resize on panel appearance**: When the first node is selected, the graph container shrinks and G6 must resize. Mitigation: call `graph.resize()` in a useEffect when panel width changes.
