# Directory Tree Sidebar Spec

## ADDED Requirements

### Requirement: DirTree component renders in GraphViewLayout

The system SHALL render a `DirTree` component as the left sidebar in the graph view layout, positioned between the action bar area and the G6 canvas. The `DirTree` SHALL be a new component in `packages/frontend/src/components/DirTree.tsx`.

#### Scenario: DirTree rendered in graph view

- **WHEN** the graph view route (`/graph`) is active and `ProcessedGraph` data is loaded
- **THEN** the `DirTree` SHALL be rendered as the leftmost element in the graph view flex container
- **AND** the `DirTree` SHALL receive `data`, `expandedDirs`, and `onToggleDir` as props

#### Scenario: DirTree not rendered in other views

- **WHEN** the user navigates to `/report`, `/metrics`, or `/architecture`
- **THEN** the `DirTree` SHALL NOT be rendered
- **AND** the layout SHALL remain unchanged from the current two-column layout

### Requirement: Tree built from ProcessedGraph combos and nodes

The `DirTree` SHALL build the directory hierarchy from `ProcessedGraph.combos` and `ProcessedGraph.nodes`. The tree structure SHALL be computed on every render when `data` reference changes.

#### Scenario: Root combos as top-level tree entries

- **WHEN** building the tree from `ProcessedGraph`
- **THEN** combos where `combo` field is `null` or `undefined` SHALL be rendered as top-level directory entries
- **AND** the combo's `label` SHALL be used as the display name
- **AND** the combo's `id` (without the `combo:` prefix) SHALL be used as the directory path

#### Scenario: Nested combos as subdirectory entries

- **WHEN** a combo `A` has field `combo = "B"` where `B` is another combo's id
- **THEN** combo `A` SHALL be rendered as a child of the entry corresponding to combo `B`
- **AND** this nesting SHALL be recursive to any depth

#### Scenario: File nodes as leaf entries

- **WHEN** a node has `node_type = "file"` and a non-null `combo` field
- **THEN** the node SHALL be rendered as a leaf entry under the directory entry corresponding to its parent combo
- **AND** the node's `label` SHALL be used as the display name
- **AND** file nodes SHALL NOT be expandable

#### Scenario: Directory nodes as tree entries

- **WHEN** a node has `node_type = "directory"`
- **THEN** it SHALL be rendered as a directory entry at the appropriate depth
- **AND** its `children` field (list of child module paths) SHALL indicate expandability
- **AND** directory nodes with `children.length > 0` SHALL show an expand icon

#### Scenario: Minimal display in tree items

- **WHEN** rendering each tree item
- **THEN** each item SHALL display the directory/file label text only
- **AND** file items SHALL NOT display file extensions or paths in the tree
- **AND** the full path SHALL be available via the item's `title` attribute for tooltip display

### Requirement: Sorting rules in DirTree

The `DirTree` SHALL sort entries within each directory level: directories (expandable entries) before files, and alphabetical within each group.

#### Scenario: Directories before files at each level

- **WHEN** a directory contains both child directories and file nodes
- **THEN** all child directory entries SHALL precede all file entries
- **AND** within the directory group, entries SHALL be sorted by label in ascending case-insensitive alphabetical order
- **AND** within the file group, entries SHALL be sorted by label in ascending case-insensitive alphabetical order

#### Scenario: Single-level sort example

- **WHEN** directory `src` contains subdirectories `zebra` and `alpha`, and files `main.ts` and `utils.ts`
- **THEN** the sort order SHALL be: `alpha`, `zebra`, `main.ts`, `utils.ts`

### Requirement: Indentation per depth level

The `DirTree` SHALL apply left padding to indicate nesting depth. Each depth level SHALL add 16px of left padding to the tree item.

#### Scenario: Root level items have no extra indentation

- **WHEN** rendering a root-level directory entry (depth 0)
- **THEN** the item SHALL have base padding-left of 8px

#### Scenario: Nested level indentation

- **WHEN** rendering a tree entry at depth `N`
- **THEN** the item SHALL have `N * 16px` additional left padding beyond the base padding
- **AND** at depth 1: `8 + 16 = 24px`, at depth 2: `8 + 32 = 40px`, etc.

### Requirement: Expand/collapse icons

The `DirTree` SHALL display an expand/collapse icon next to each expandable directory entry. Directory entries that are not expandable (no children) SHALL NOT show an icon. File entries SHALL NOT show an icon.

#### Scenario: Expandable directory shows collapse icon when expanded

- **WHEN** a directory entry is expandable AND its path is in the current `expandedDirs` set
- **THEN** a collapse icon (▼) SHALL be displayed to the left of the directory label
- **AND** clicking the icon SHALL call `onToggleDir(path)` to collapse the directory

#### Scenario: Expandable directory shows expand icon when collapsed

- **WHEN** a directory entry is expandable AND its path is NOT in the current `expandedDirs` set
- **THEN** an expand icon (▶) SHALL be displayed to the left of the directory label
- **AND** clicking the icon SHALL call `onToggleDir(path)` to expand the directory

#### Scenario: Non-expandable directory has no icon

- **WHEN** a directory entry has no children (empty directory)
- **THEN** no expand/collapse icon SHALL be displayed for that entry
- **AND** the label SHALL be aligned with where the icon would be (maintaining indentation)

#### Scenario: File entry has no icon

- **WHEN** rendering a file entry
- **THEN** no expand/collapse icon SHALL be displayed
- **AND** the label SHALL be aligned with the icon offset of its parent level

#### Scenario: Click on label text does not toggle

- **WHEN** the user clicks on a tree item's label text (not the expand/collapse icon)
- **THEN** `onToggleDir` SHALL NOT be called

### Requirement: Expand in DirTree triggers graph update

Expanding or collapsing a directory in the DirTree SHALL use the same `toggleDir` mechanism as the G6 graph view, ensuring both views stay synchronized.

#### Scenario: Tree expand fetches new graph data

- **WHEN** user clicks expand icon on a directory in DirTree
- **THEN** `onToggleDir(directoryPath)` SHALL be called
- **AND** the `useGraphData` hook SHALL update `expandedDirs` and call `fetchGraph`
- **AND** the graph SHALL re-render with the new `ProcessedGraph` showing the expanded directory

#### Scenario: Graph collapse updates tree

- **WHEN** user double-clicks a combo in the G6 canvas to collapse it
- **THEN** `expandedDirs` SHALL be updated
- **AND** the DirTree SHALL re-render with the collapsed state reflected (`▶` icon shown)

### Requirement: Sidebar collapse/expand toggle

The DirTree sidebar SHALL be collapsible. The user SHALL be able to toggle the sidebar open and closed. When closed, a narrow handle SHALL remain visible to re-open it.

#### Scenario: Sidebar visible by default

- **WHEN** the graph view first renders
- **THEN** the DirTree sidebar SHALL be visible (open state)
- **AND** the sidebar SHALL occupy 260px of fixed width

#### Scenario: Collapse sidebar

- **WHEN** the user clicks the collapse button on the DirTree sidebar header
- **THEN** the sidebar SHALL collapse to a narrow handle (approximately 32px width)
- **AND** the DependencyGraph canvas SHALL expand to fill the freed space

#### Scenario: Re-open collapsed sidebar

- **WHEN** the user clicks on the collapsed handle
- **THEN** the DirTree sidebar SHALL expand back to 260px
- **AND** the DependencyGraph canvas SHALL resize to accommodate the restored sidebar

### Requirement: DirTree sidebar header

The DirTree SHALL have a header area at the top of the sidebar displaying the title and the collapse button.

#### Scenario: Sidebar header rendering

- **WHEN** the DirTree sidebar is visible
- **THEN** the header SHALL display the title "Directories" (localized via `t('tree.title')`)
- **AND** the header SHALL display a collapse button (◀ icon) on the right side
- **AND** the header SHALL have a bottom border to visually separate from the tree content

#### Scenario: Collapsed sidebar handle rendering

- **WHEN** the DirTree sidebar is collapsed
- **THEN** the handle SHALL display an expand button (▶ icon)
- **AND** the handle SHALL have a vertical orientation to indicate the sidebar is to the left

### Requirement: Sidebar styling

The DirTree sidebar SHALL use the project's CSS variable tokens for consistent theming with the rest of the application.

#### Scenario: Sidebar surface styling

- **WHEN** the DirTree sidebar is rendered
- **THEN** it SHALL use `var(--color-surface)` for its background
- **AND** it SHALL use `var(--color-border)` for its right border (separating it from the graph canvas)
- **AND** it SHALL have a fixed width of 260px when open
- **AND** it SHALL have `overflow-y: auto` for vertical scrolling
- **AND** it SHALL have `height: 100%` within its container

#### Scenario: Tree item text color

- **WHEN** rendering a tree item
- **THEN** the label text SHALL use `var(--color-text-secondary)`
- **AND** the expand/collapse icon SHALL use `var(--color-text-muted)`
- **AND** on hover, the tree item background SHALL use `var(--color-accent-bg)` with 50% opacity

#### Scenario: Dark mode support

- **WHEN** the theme is set to dark mode (`data-theme="dark"`)
- **THEN** all DirTree styles SHALL automatically adapt via the existing CSS variable tokens
- **AND** no additional dark mode-specific styles SHALL be needed

### Requirement: localStorage persistence of expanded directories

The `useGraphData` hook SHALL persist the expanded directory state to localStorage keyed by graph file path (source). On mount, it SHALL read cached state and pass it to the initial `fetchGraph` call before the first response arrives.

#### Scenario: Read cache before first request

- **WHEN** `useGraphData` initializes on page load
- **THEN** the hook SHALL read `localStorage['dcr:source:{origin}']` to find the last-known source path
- **AND** if found, read `localStorage['dcr:expanded:{source}']` to get cached expandedDirs
- **AND** the cached expandedDirs (or empty array if not found) SHALL be passed directly to the initial `fetchGraph` call
- **AND** NO separate pre-flight request SHALL be made to determine the source

#### Scenario: Update cache from server response

- **WHEN** `fetchGraph` returns successfully with `meta.source` and `meta.expanded_dirs`
- **THEN** `localStorage['dcr:source:{origin}']` SHALL be set to `meta.source`
- **AND** `localStorage['dcr:expanded:{source}']` SHALL be set to `JSON.stringify(meta.expanded_dirs)`
- **AND** the server's `expanded_dirs` SHALL be the authoritative source — it may differ from the requested dirs (e.g., invalid paths dropped)

#### Scenario: Persist sidebar visibility

- **WHEN** `sidebarVisible` changes
- **THEN** `localStorage['dcr:layout:graph:dir_tree']` SHALL be updated with the new value
- **AND** on mount, `sidebarVisible` SHALL default to the stored value, or `true` if no stored value exists

#### Scenario: Cold cache (first ever use)

- **WHEN** no `dcr:source:{origin}` entry exists in localStorage
- **THEN** `fetchGraph` SHALL be called with an empty array
- **AND** the server SHALL compute auto-expanded directories via `compute_auto_expanded_dirs`
- **AND** the returned `meta.source` and `meta.expanded_dirs` SHALL be saved to localStorage

#### Scenario: Different data source on same origin

- **WHEN** the same port serves a different graph file (e.g., server restarted with different `--file`)
- **THEN** the cached expandedDirs from the old source MAY be sent in the first request
- **AND** the server SHALL respond with `expanded_dirs` that reflect the actual new data (non-existent paths dropped)
- **AND** the response SHALL update `dcr:source:{origin}` to the new source
- **AND** `dcr:expanded:{new_source}` SHALL be set to the server's `expanded_dirs`

### Requirement: Server meta extensions

The `POST /api/graph` endpoint SHALL include a `source` field in the response `meta` object. This field SHALL be injected by the server layer (`graph.ts`) after the Rust/WASM aggregation, not by the Rust backend itself.

#### Scenario: source in response meta

- **WHEN** the server processes a POST /api/graph request
- **THEN** the response `ProcessedGraph.meta` SHALL include `source: string`
- **AND** `source` SHALL be the absolute path of the graph file (the `graphFile` option passed to the server)
- **AND** the server SHALL inject this field after receiving the result from `convert()` by spreading: `{ ...graph, meta: { ...graph.meta, source: graphFile } }`

### Requirement: DirTree icons

The `icons.tsx` component SHALL include new SVG icon components for the DirTree expand/collapse interactions.

#### Scenario: ChevronRightIcon for collapsed directories

- **WHEN** rendering an expand icon (collapsed directory)
- **THEN** the icon SHALL be a right-pointing chevron (▶) SVG
- **AND** the SVG SHALL follow the same pattern as existing icons (16x16 viewBox, currentColor stroke)
- **AND** the `aria-label` SHALL be set in English to `"Expand"` (localized via `t('tree.expand')`)

#### Scenario: ChevronDownIcon for expanded directories

- **WHEN** rendering a collapse icon (expanded directory)
- **THEN** the icon SHALL be a down-pointing chevron (▼) SVG
- **AND** the SVG SHALL follow the same pattern as existing icons
- **AND** the `aria-label` SHALL be set in English to `"Collapse"` (localized via `t('tree.collapse')`)

#### Scenario: SidebarToggleIcon

- **WHEN** rendering the sidebar collapse button
- **THEN** a double-chevron icon (◀ or ▶) SHALL be used
- **AND** the icon direction SHALL indicate the sidebar's movement direction when clicked

### Requirement: i18n keys for DirTree

The frontend i18n system SHALL include translation keys for the DirTree sidebar accessibility labels.

#### Scenario: English i18n keys

- **WHEN** the current language is English
- **THEN** `t('tree.title')` SHALL return `"Directories"`
- **AND** `t('tree.expand')` SHALL return `"Expand directory"`
- **AND** `t('tree.collapse')` SHALL return `"Collapse directory"`
- **AND** `t('tree.toggleSidebar')` SHALL return `"Toggle sidebar"`

#### Scenario: Chinese i18n keys

- **WHEN** the current language is Chinese (zh-CN)
- **THEN** `t('tree.title')` SHALL return `"目录"`
- **AND** `t('tree.expand')` SHALL return `"展开目录"`
- **AND** `t('tree.collapse')` SHALL return `"折叠目录"`
- **AND** `t('tree.toggleSidebar')` SHALL return `"切换侧边栏"`

## Module Contract

### Component: DirTree (added)

| Prop | Type | Description |
|------|------|-------------|
| `data` | `ProcessedGraph` | Current graph data to build tree from |
| `expandedDirs` | `Set<string>` | Currently expanded directory paths |
| `onToggleDir` | `(dir: string) => void` | Callback to expand/collapse a directory |
| `sidebarVisible` | `boolean` | Whether the sidebar is open |
| `onToggleSidebar` | `() => void` | Callback to toggle sidebar visibility |

### Component: icons (added)

| Icon | Usage |
|------|-------|
| `ChevronRightIcon` | Expand icon for collapsed directory entries |
| `ChevronDownIcon` | Collapse icon for expanded directory entries |
| `SidebarToggleIcon` | Toggle button for collapsing/expanding the sidebar |

### Hook: useGraphData (modified)

| Return field | Type | Change |
|-------------|------|--------|
| `sidebarVisible` | `boolean` | ADDED — controls DirTree sidebar visibility |
| `setSidebarVisible` | `(visible: boolean) => void` | ADDED — setter for sidebar visibility |

### State: App (modified)

| State | Type | Default | Description |
|-------|------|---------|-------------|
| `sidebarVisible` | `boolean` | `true` | Controls DirTree sidebar visibility |

### Meta: GraphMeta (extended by server)

| Field | Type | Description |
|-------|------|-------------|
| `source` | `string` | Absolute path of the graph file, used as localStorage cache key |

### i18n keys (added)

| Key | English | Chinese |
|-----|---------|---------|
| `tree.title` | Directories | 目录 |
| `tree.expand` | Expand directory | 展开目录 |
| `tree.collapse` | Collapse directory | 折叠目录 |
| `tree.toggleSidebar` | Toggle sidebar | 切换侧边栏 |

## References

- DirTree: `packages/frontend/src/components/DirTree.tsx` (NEW)
- useGraphData: `packages/frontend/src/hooks/useGraphData.ts`
- GraphViewLayout: `packages/frontend/src/components/GraphViewLayout.tsx`
- App: `packages/frontend/src/App.tsx`
- icons: `packages/frontend/src/components/icons.tsx`
- Server graph route: `packages/cli/src/server/dep/graph.ts`
- i18n en: `packages/frontend/src/i18n/en.ts`
- i18n zh-CN: `packages/frontend/src/i18n/zh-CN.ts`
