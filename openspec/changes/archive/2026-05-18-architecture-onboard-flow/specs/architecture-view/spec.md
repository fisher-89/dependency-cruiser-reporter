## MODIFIED Requirements

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
- **AND** ArchitectureView SHALL display the onboard prompt with a "Generate Architecture Model" button (see architecture-onboard spec)
- **AND** the prompt SHALL explain the architecture design feature

#### Scenario: C4 parsing error

- **WHEN** a `.c4` file contains invalid DSL syntax
- **THEN** the server SHALL catch the error from `fromSources`
- **AND** return an error response with the parse error details
- **AND** ArchitectureView SHALL display the error message
- **AND** the other views (Graph/Report/Metrics) SHALL remain functional

### Requirement: Architecture view i18n

The system SHALL provide i18n keys for the Architecture view.

#### Scenario: Nav tab label

- **WHEN** the nav bar renders
- **THEN** the Architecture tab SHALL display the localized label from `t('nav.architecture')`
- **AND** English: "Architecture", Chinese: "架构设计"
- **AND** the tab SHALL be visible regardless of whether `.dc-reporter/architecture/` exists

#### Scenario: Empty state message

- **WHEN** no C4 files are found
- **THEN** the empty state SHALL use localized text from `t('architecture.empty')` and `t('architecture.createPrompt')` for the onboard message
