## ADDED Requirements

### Requirement: C4 model parsing

The system SHALL parse and merge multiple `.c4` DSL files into a single computed model **server-side** using `@likec4/language-services` (Node.js entry point). The server returns `$ModelData` as JSON; the client constructs the runtime `LikeC4Model`.

#### Scenario: Server parses and merges C4 files

- **WHEN** the client calls `GET /api/architecture/model`
- **THEN** the server reads all `.c4` files from `<cwd>/.dc-reporter/architecture/`
- **AND** calls `fromSources(files)` to parse and merge them into a `LikeC4` instance
- **AND** calls `syncComputedModel()` to produce a `LikeC4Model.Computed`
- **AND** returns the model's `$data` as JSON
- **AND** the client calls `LikeC4Model.create($data)` to construct the runtime model

#### Scenario: Multiple C4 files as one model

- **WHEN** `.dc-reporter/architecture/` contains multiple `.c4` files (e.g., `system.c4`, `containers.c4`, `deployment.c4`)
- **THEN** all files SHALL be passed to `fromSources` as a `Record<string, string>` keyed by filename
- **AND** the resulting model SHALL contain all views from all files

#### Scenario: No C4 files available

- **WHEN** `.dc-reporter/architecture/` exists but contains no `.c4` files
- **THEN** `GET /api/architecture/model` SHALL return 404
- **AND** ArchitectureView SHALL display an empty state message
- **AND** the message SHALL indicate where to add `.c4` files

#### Scenario: C4 parsing error

- **WHEN** a `.c4` file contains invalid DSL syntax
- **THEN** the server SHALL catch the error from `fromSources`
- **AND** return an error response with the parse error details
- **AND** ArchitectureView SHALL display the error message
- **AND** the other views (Graph/Report/Metrics) SHALL remain functional

### Requirement: Architecture diagram rendering

The system SHALL render C4 architecture diagrams using `ReactLikeC4` from `@likec4/diagram`, wrapped in `LikeC4ModelProvider`.

#### Scenario: Render ReactLikeC4

- **WHEN** a LikeC4 model is successfully constructed via `LikeC4Model.create(data)` and layout is computed
- **THEN** the system SHALL render `<LikeC4ModelProvider likec4={layoutedModel}><ReactLikeC4 /></LikeC4ModelProvider>`
- **AND** the diagram SHALL be interactive (pan, zoom, node click)

#### Scenario: View navigation

- **WHEN** the C4 model contains multiple views (e.g., System Context, Container, Component)
- **THEN** `ReactLikeC4` SHALL provide built-in view navigation
- **AND** the user SHALL be able to switch between views

#### Scenario: Loading state

- **WHEN** C4 files are being fetched and parsed
- **THEN** ArchitectureView SHALL display a loading indicator
- **AND** the loading indicator SHALL use the same visual style as existing views

#### Scenario: Error state

- **WHEN** C4 file fetch or parsing fails
- **THEN** ArchitectureView SHALL display the error message
- **AND** a retry mechanism SHALL be available

### Requirement: Lazy loading

The ArchitectureView component SHALL be lazy-loaded via dynamic `import()` to defer loading `@likec4/diagram` and its dependencies.

#### Scenario: Deferred bundle loading

- **WHEN** the app first loads and the active view is not Architecture
- **THEN** the `@likec4/diagram` chunk SHALL NOT be loaded
- **AND** the chunk SHALL only load when the user clicks the Architecture nav tab

#### Scenario: React.Suspense fallback

- **WHEN** the ArchitectureView chunk is loading
- **THEN** a Suspense fallback SHALL be displayed
- **AND** the fallback SHALL be consistent with existing loading states

### Requirement: Architecture view i18n

The system SHALL provide i18n keys for the Architecture view.

#### Scenario: Nav tab label

- **WHEN** the nav bar renders
- **THEN** the Architecture tab SHALL display the localized label from `t('nav.architecture')`
- **AND** English: "Architecture", Chinese: "架构设计"

#### Scenario: Empty state message

- **WHEN** no C4 files are found
- **THEN** the empty state message SHALL use the localized text from `t('architecture.empty')`
