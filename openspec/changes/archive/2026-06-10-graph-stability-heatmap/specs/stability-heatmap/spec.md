# Stability Heatmap Spec

## ADDED Requirements

### Requirement: Heatmap toggle in action bar

`GraphViewLayout` SHALL render a stability heatmap toggle button in the action bar, positioned between the Scan button and the Refresh button.

#### Scenario: Toggle button rendered in action bar

- **WHEN** `GraphViewLayout` renders the action bar
- **THEN** a toggle button SHALL be rendered between the Scan button and the Refresh button
- **AND** the button SHALL display the text from i18n key `action.stabilityHeatmap`
- **AND** the button SHALL use the same `actionBtn` style as Scan and Refresh buttons
- **AND** when toggled ON, the button SHALL have an active visual state (e.g., accent border or background)
- **AND** when toggled OFF, the button SHALL match the default action button style

#### Scenario: Default state is OFF

- **WHEN** the graph view first renders
- **THEN** the heatmap toggle SHALL be OFF
- **AND** nodes SHALL NOT display instability shadows

### Requirement: Heatmap state managed in App

The `stabilityHeatmap` boolean state SHALL be managed in `App` and passed down through `GraphViewLayout` and `DependencyGraph`.

#### Scenario: State passed through component tree

- **WHEN** `App` renders the Graph view
- **THEN** `stabilityHeatmap` state SHALL be passed to `GraphViewLayout` as `stabilityHeatmap` prop
- **AND** `stabilityHeatmap` SHALL be passed to `DependencyGraph` as `stabilityHeatmap` prop
- **AND** `onStabilityHeatmapChange` callback SHALL allow `GraphViewLayout` to update the state upstream

### Requirement: Shadow rendering based on instability

`DependencyGraph` SHALL apply `shadowBlur` and `shadowColor` to node style when `stabilityHeatmap` is enabled. The shadow SHALL be computed from `node.instability` value (0.0 to 1.0).

#### Scenario: Stable node (instability = 0.0)

- **WHEN** `stabilityHeatmap` is ON and a node has `instability` of `0.0`
- **THEN** `shadowBlur` SHALL be `0`
- **AND** no shadow SHALL be visible

#### Scenario: Moderately unstable node (instability = 0.45)

- **WHEN** `stabilityHeatmap` is ON and a node has `instability` of `0.45`
- **THEN** `shadowBlur` SHALL be approximately `0.45 * 16 = 7.2px`
- **AND** `shadowColor` SHALL interpolate between transparent and orange (e.g., `rgba(250, 140, 22, 0.35)`)

#### Scenario: Highly unstable node (instability = 0.85)

- **WHEN** `stabilityHeatmap` is ON and a node has `instability` of `0.85`
- **THEN** `shadowBlur` SHALL be approximately `0.85 * 16 = 13.6px`
- **AND** `shadowColor` SHALL interpolate toward warm red (e.g., `rgba(245, 34, 45, 0.50)`)

#### Scenario: Node with no instability (undefined/null)

- **WHEN** `stabilityHeatmap` is ON and a node has no `instability` value (isolated node)
- **THEN** no shadow SHALL be applied to that node

#### Scenario: Heatmap OFF restores original appearance

- **WHEN** `stabilityHeatmap` transitions from ON to OFF
- **THEN** all node shadow properties SHALL be removed
- **AND** nodes SHALL revert to their original fill/stroke appearance without shadow

### Requirement: Original node type colors preserved

The heatmap shadow SHALL NOT alter the node's `fill` or `stroke` color. Only `shadowBlur`, `shadowColor`, `shadowOffsetX`, and `shadowOffsetY` SHALL be affected.

#### Scenario: File node type color unchanged

- **WHEN** `stabilityHeatmap` is ON and a file-type node has instability
- **THEN** the node's `fill` SHALL remain `#C6E5FF` (light) or `#1e3a5f` (dark)
- **AND** the node's `stroke` SHALL remain `#5B8FF9` (light) or `#93c5fd` (dark)
- **AND** only shadow properties SHALL differ from the heatmap-OFF state

### Requirement: Instability data passed through buildGraphData

`buildGraphData` SHALL forward the `instability` field from `GraphNode` into the `G6NodeData` payload.

#### Scenario: Instability in G6NodeData

- **WHEN** `buildGraphData` maps a `GraphNode` that has `instability: 0.2941`
- **THEN** the resulting `G6Node` SHALL have `data.instability` equal to `0.2941`
- **AND** when `GraphNode.instability` is `undefined`, `G6NodeData.instability` SHALL be `undefined`

### Requirement: i18n keys for heatmap toggle

The frontend i18n system SHALL include translation keys for the heatmap toggle label.

#### Scenario: English translation

- **WHEN** the current language is English
- **THEN** `t('action.stabilityHeatmap')` SHALL return `"Heatmap"`

#### Scenario: Chinese translation

- **WHEN** the current language is Chinese (zh-CN)
- **THEN** `t('action.stabilityHeatmap')` SHALL return `"稳定性热力图"`

### Requirement: DependencyGraph prop interface updated

`DependencyGraph`'s `Props` interface SHALL include the `stabilityHeatmap` property.

#### Scenario: Props type includes stabilityHeatmap

- **WHEN** TypeScript compiles `DependencyGraph.tsx`
- **THEN** the `Props` type SHALL include `stabilityHeatmap?: boolean`
- **AND** when the prop is omitted or `undefined`, the behavior SHALL be the same as `false` (heatmap OFF)

## Module Contract

### Component: GraphViewLayout (modified)

| Prop | Type | Change |
|------|------|--------|
| `stabilityHeatmap` | `boolean` | ADDED — controls toggle button active state |
| `onStabilityHeatmapChange` | `(value: boolean) => void` | ADDED — callback when toggle is clicked |

### Component: DependencyGraph (modified)

| Prop | Type | Change |
|------|------|--------|
| `stabilityHeatmap` | `boolean \| undefined` | ADDED — when true, renders shadow glow based on instability |

### Interface: G6NodeData (modified)

| Field | Type | Change |
|-------|------|--------|
| `instability` | `number \| undefined` | ADDED — forwarded from `GraphNode.instability` |

### Interface: GraphViewLayoutProps (modified)

| Field | Type | Change |
|-------|------|--------|
| `stabilityHeatmap` | `boolean` | ADDED |
| `onStabilityHeatmapChange` | `(value: boolean) => void` | ADDED |

### State: App (modified)

| State | Type | Default | Description |
|-------|------|---------|-------------|
| `stabilityHeatmap` | `boolean` | `false` | Controls heatmap visual mode in graph view |

### i18n keys (added)

| Key | English | Chinese |
|-----|---------|---------|
| `action.stabilityHeatmap` | Heatmap | 稳定性热力图 |

## References

- DependencyGraph: `packages/frontend/src/components/DependencyGraph/DependencyGraph.tsx`
- buildGraphData: `packages/frontend/src/components/DependencyGraph/buildGraphData.ts`
- GraphViewLayout: `packages/frontend/src/components/GraphViewLayout.tsx`
- App: `packages/frontend/src/App.tsx`
- i18n en: `packages/frontend/src/i18n/en.ts`
- i18n zh-CN: `packages/frontend/src/i18n/zh-CN.ts`
- Theme constants: `packages/frontend/src/theme/constants.ts` — G6 node style references
