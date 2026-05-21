## ADDED Requirements

### Requirement: Detail panel displays when node is selected

The system SHALL render a persistent side panel to the right of the graph canvas. When no node is selected, the panel SHALL display a placeholder message. When a node is selected, the panel SHALL display the node's metadata.

#### Scenario: No node selected

- **WHEN** the graph view is rendered and no node has been clicked
- **THEN** the detail panel displays a placeholder message (e.g., "Click a node to view details")

#### Scenario: Node selected via click

- **WHEN** the user single-clicks a graph node
- **THEN** the node becomes selected
- **AND** the detail panel displays that node's metadata
- **AND** the panel remains populated until a different node is selected or graph data is refreshed

#### Scenario: Double-click does not select

- **WHEN** the user double-clicks a graph node
- **THEN** the directory expand/collapse behavior fires
- **AND** the selected node does NOT change

### Requirement: Panel shows node identity information

The system SHALL display the node's label, full path, node type, and violation count at the top of the detail panel.

#### Scenario: File node identity

- **WHEN** a file-type node is selected
- **THEN** the panel displays the node label, full path from `node.path`, type "file", and violation count from `node.violation_count`

#### Scenario: Directory node identity

- **WHEN** a directory-type node is selected
- **THEN** the panel displays the node label, full path from `node.path`, type "directory", and violation count

### Requirement: Panel shows stability metric

The system SHALL compute and display the instability metric I = Ce / (Ce + Ca), where Ce is the count of outgoing edges and Ca is the count of incoming edges.

#### Scenario: Stability for a node with both dependencies and dependents

- **WHEN** a node has 5 outgoing edges and 12 incoming edges
- **THEN** stability is computed as 5 / (5 + 12) = 0.29
- **AND** the panel displays the numeric value with a visual indicator (progress bar or color coding)

#### Scenario: Stability for an isolated node

- **WHEN** a node has 0 outgoing and 0 incoming edges
- **THEN** the panel displays "N/A" for stability

### Requirement: Panel shows dependencies grouped by edge type

The system SHALL list the node's outgoing dependencies (where node is the source) grouped by `edge_type` (local, npm, core, dynamic). Each dependency SHALL show the target node's label.

#### Scenario: Dependencies with multiple edge types

- **WHEN** a node has outgoing edges of types local and npm
- **THEN** dependencies are displayed in grouped sections: "Local (N)", "NPM (N)", etc.
- **AND** each section lists the target node labels
- **AND** sections with zero edges are hidden

### Requirement: Panel shows dependents grouped by edge type

The system SHALL list the node's incoming dependencies (where node is the target) grouped by `edge_type`. Each dependent SHALL show the source node's label.

#### Scenario: Dependents with multiple edge types

- **WHEN** a node has incoming edges of types local and npm
- **THEN** dependents are displayed in grouped sections by edge type
- **AND** each section lists the source node labels

### Requirement: Panel shows associated violations

The system SHALL display violations from `ProcessedGraph.violations` where either `violation.from` or `violation.to` matches the selected node's label or path. Each violation SHALL show severity, rule name, and the from/to relationship.

#### Scenario: Node with violations

- **WHEN** a node has 3 associated violations (2 errors, 1 warning)
- **THEN** the panel displays each violation with severity badge, rule name, and from/to info
- **AND** violations are sorted by severity (errors first, then warnings, then info)

#### Scenario: Node without violations

- **WHEN** a node has no associated violations
- **THEN** the violations section displays "No violations" or is hidden
