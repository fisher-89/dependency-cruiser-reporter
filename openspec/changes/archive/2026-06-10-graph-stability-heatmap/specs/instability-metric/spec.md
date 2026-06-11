# Instability Metric Spec

## ADDED Requirements

### Requirement: GraphNode instability field

`GraphNode` SHALL contain an optional `instability` field of type `Option<f32>`.

#### Scenario: Instability serialized in JSON

- **WHEN** `GraphNode` has `instability` set to `Some(0.29)`
- **THEN** the serialized JSON SHALL contain `"instability": 0.29`
- **AND** the field SHALL use snake_case key matching the existing convention

#### Scenario: Instability absent for isolated node

- **WHEN** `GraphNode` has no edges (Ce + Ca == 0)
- **THEN** `instability` SHALL be `None`
- **AND** the serialized JSON SHALL omit the `instability` key (via `skip_serializing_if`)

### Requirement: compute_instability function

The Rust backend SHALL provide a `compute_instability` function that computes Ce/(Ce+Ca) for each node and sets `instability` on the corresponding `GraphNode`.

#### Scenario: Basic instability calculation

- **WHEN** a node has 5 outgoing edges (Ce=5) and 12 incoming edges (Ca=12)
- **THEN** `instability` SHALL equal `5.0 / (5.0 + 12.0) = 0.29411766`
- **AND** the value SHALL be rounded to 4 decimal places (0.2941)

#### Scenario: Node with only outgoing edges

- **WHEN** a node has 3 outgoing edges and 0 incoming edges
- **THEN** `instability` SHALL equal `1.0`

#### Scenario: Node with only incoming edges

- **WHEN** a node has 0 outgoing edges and 7 incoming edges
- **THEN** `instability` SHALL equal `0.0`

#### Scenario: Isolated node

- **WHEN** a node has 0 outgoing edges and 0 incoming edges
- **THEN** `instability` SHALL be `None`

### Requirement: Instability computed after aggregate_edges

The `aggregate()` function in `lib.rs` SHALL call `compute_instability` immediately after `aggregate_edges`, passing the aggregated edge list and nodes.

#### Scenario: Integration in aggregate pipeline

- **WHEN** `aggregate()` executes the full pipeline
- **THEN** `compute_instability` SHALL be invoked after `aggregate_edges` returns
- **AND** the returned `ProcessedGraph` SHALL have `instability` populated on each `GraphNode`

#### Scenario: No edges does not panic

- **WHEN** `aggregate_edges` returns an empty `Vec<GraphEdge>` (e.g., for single isolated module)
- **THEN** `compute_instability` SHALL handle the empty edge list gracefully
- **AND** all nodes SHALL have `instability` set to `None`

### Requirement: Node lookup for instability computation

`compute_instability` SHALL count edges by node ID, computing Ce as the count of edges where `edge.source == node.id` and Ca as the count where `edge.target == node.id`.

#### Scenario: Edge counting

- **WHEN** the edge list contains `[(A,B), (A,C), (B,C)]`
- **THEN** node A has Ce=2, Ca=0, instability=1.0
- **AND** node B has Ce=1, Ca=1, instability=0.5
- **AND** node C has Ce=0, Ca=2, instability=0.0

### Requirement: Instability accessible in TypeScript

The `instability` field SHALL be available on the TypeScript `GraphNode` type via the existing `@dcr-reporter/wasm` type export.

#### Scenario: TypeScript type includes instability

- **WHEN** TypeScript code imports `GraphNode` from `@dcr-reporter/wasm`
- **THEN** `GraphNode` SHALL include a property `instability?: number`
- **AND** the property SHALL be `undefined` when the Rust value is `None`

## Module Contract

### Struct: GraphNode (modified)

| Field | Type | Change |
|-------|------|--------|
| `instability` | `Option<f32>` | ADDED — computed instability value, None when isolated |

### Function: compute_instability (added)

| Aspect | Specification |
|--------|---------------|
| Module | `aggregate/instability.rs` (new file) |
| Visibility | `pub(super)` |
| Signature | `pub(super) fn compute_instability(nodes: &mut [GraphNode], edges: &[GraphEdge])` |
| Side effects | Mutates `nodes` in place, setting `instability` on each `GraphNode` |
| Edge list | Uses the already-aggregated `GraphEdge` list — edges have resolved source/target IDs |
| Precision | f32, rounded to 4 decimal places via `(value * 10000.0).round() / 10000.0` |

### Module: aggregate/mod.rs (modified)

| Export | Change |
|--------|--------|
| `compute_instability` | ADDED — re-exported from new `instability` submodule |

### Function: aggregate in lib.rs (modified)

| Change | Location |
|--------|----------|
| Call `compute_instability` after `aggregate_edges` | After line 78, before `let meta = GraphMeta { ... }` |

## References

- Rust types: `packages/rust/src/types.rs` — `GraphNode` struct at line 23
- Aggregate entry: `packages/rust/src/lib.rs` — `aggregate()` function at line 31
- Edge aggregation: `packages/rust/src/aggregate/edges.rs` — `aggregate_edges()` at line 44
- DetailPanel client-side calc: `packages/frontend/src/components/DetailPanel.tsx` (for reference, not modified)
