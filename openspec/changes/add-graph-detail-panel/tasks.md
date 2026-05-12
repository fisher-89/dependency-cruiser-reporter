## 1. DependencyGraph click handling

- [ ] 1.1 Add `onNodeSelect?: (nodeId: string) => void` and `selectedNodeId?: string | null` props to DependencyGraph
- [ ] 1.2 Implement 300ms single-click/double-click disambiguation: set timer on `node:click`, cancel on `node:dblclick`, fire `onNodeSelect` when timer expires
- [ ] 1.3 Apply selected state styling (highlighted stroke) to the selected node via G6 node state

## 2. DetailPanel component

- [ ] 2.1 Create `packages/frontend/src/components/DetailPanel.tsx` with props: `node: GraphNode | null`, `edges: GraphEdge[]`, `violations: ViolationInfo[]`, `nodeMap: Map<string, GraphNode>`
- [ ] 2.2 Implement node identity section: label, full path, type badge, violation count
- [ ] 2.3 Implement stability metric: compute I = Ce / (Ce + Ca) from edges, display with progress bar
- [ ] 2.4 Implement dependencies section: filter edges where source === nodeId, group by edge_type, render grouped lists
- [ ] 2.5 Implement dependents section: filter edges where target === nodeId, group by edge_type, render grouped lists
- [ ] 2.6 Implement violations section: filter violations by from/to matching node label or path, show severity badge + rule + relationship
- [ ] 2.7 Implement placeholder state: when `node` is null, show "Click a node to view details" message

## 3. App integration

- [ ] 3.1 Add `selectedNodeId` state to App, reset to null on data fetch/upload
- [ ] 3.2 Wrap graph view in flex container: DependencyGraph (flex: 1) + DetailPanel (320px)
- [ ] 3.3 Pass `selectedNodeId` and `onNodeSelect` to DependencyGraph, compute node map and pass data to DetailPanel
- [ ] 3.4 Handle G6 resize: useEffect in DependencyGraph triggers `graph.resize()` when container width changes (panel appears/disappears)

## 4. Verification

- [ ] 4.1 Build and demo: `pnpm build && pnpm demo`, verify panel renders, click selects node, double-click expands dirs
- [ ] 4.2 Run `pnpm test` to ensure no regressions
- [ ] 4.3 Manual edge cases: click same node twice (no-op), orphan node (stability N/A, no deps), directory node with children
