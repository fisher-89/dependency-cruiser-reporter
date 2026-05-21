## ADDED Requirements

### Requirement: Architecture tab always visible

The Architecture nav tab SHALL be rendered regardless of whether `.dc-reporter/architecture/` exists or contains `.c4` files.

#### Scenario: Tab visible without architecture directory

- **WHEN** the frontend loads and `GET /api/config` returns `hasArchitectureDir: false`
- **THEN** the Architecture tab SHALL still be visible in the nav bar
- **AND** the tab label SHALL display the localized text from `t('nav.architecture')`

#### Scenario: Tab visible without C4 files

- **WHEN** `.dc-reporter/architecture/` exists but contains no `.c4` files
- **THEN** the Architecture tab SHALL still be visible in the nav bar

### Requirement: Onboard prompt when no C4 model exists

When no C4 files are available, the Architecture view SHALL display an onboard prompt that explains the feature and offers to generate a starter model.

#### Scenario: Onboard prompt displayed

- **WHEN** the user navigates to the Architecture view
- **AND** `GET /api/architecture/model` returns 404
- **THEN** the view SHALL display a descriptive message about C4 architecture modeling
- **AND** the view SHALL display a "Generate Architecture Model" button
- **AND** the prompt and button SHALL use localized text from i18n keys

#### Scenario: User dismisses prompt

- **WHEN** the onboard prompt is displayed
- **THEN** the user MAY navigate to other tabs without taking action
- **AND** all other views (Graph, Report, Metrics) SHALL remain functional

### Requirement: One-click C4 model generation

The system SHALL provide a `POST /api/architecture/generate` endpoint that creates a valid starter `.c4` file.

#### Scenario: Successful generation

- **WHEN** the client sends `POST /api/architecture/generate`
- **AND** `.dc-reporter/architecture/` does not contain any `.c4` files
- **THEN** the server SHALL create `.dc-reporter/architecture/main.c4`
- **AND** the file SHALL contain a valid C4 workspace with the workspace directory basename as the system name, one `person` (User), one `softwareSystem`, and one `view` named `index` including all elements
- **AND** the server SHALL return `{ success: true }`

#### Scenario: Directory creation

- **WHEN** `.dc-reporter/architecture/` does not exist
- **AND** the client sends `POST /api/architecture/generate`
- **THEN** the server SHALL create the `.dc-reporter/architecture/` directory recursively
- **AND** then create `main.c4` within it

#### Scenario: Generation failure due to filesystem error

- **WHEN** the server cannot create the directory or write the file (e.g., permissions)
- **THEN** the server SHALL return an error response with status 500
- **AND** the error SHALL include a descriptive message

### Requirement: Post-generation auto-reload

After successful generation, the Architecture view SHALL automatically reload the model.

#### Scenario: Auto-reload after generation

- **WHEN** `POST /api/architecture/generate` returns success
- **THEN** the Architecture view SHALL re-fetch `GET /api/architecture/model`
- **AND** upon receiving the parsed model, SHALL transition from the onboard prompt to the rendered diagram
- **AND** the frontend SHALL re-fetch `GET /api/config` to update `hasArchitectureDir`

#### Scenario: Generation in progress state

- **WHEN** the generate request is in-flight
- **THEN** the generate button SHALL be disabled or replaced with a loading indicator
- **AND** the loading state SHALL use localized text

### Requirement: Onboard flow i18n

The system SHALL provide i18n keys for the onboard flow in English and Chinese.

#### Scenario: English labels

- **WHEN** the locale is English
- **THEN** the prompt text SHALL describe the architecture design feature
- **AND** the button label SHALL read "Generate Architecture Model"
- **AND** the generating state SHALL read "Generating..."
- **AND** the generation error message SHALL read "Failed to generate architecture model"

#### Scenario: Chinese labels

- **WHEN** the locale is Chinese
- **THEN** the prompt text SHALL describe the architecture design feature in Chinese
- **AND** the button label SHALL read "一键生成架构模型"
- **AND** the generating state SHALL read "正在生成..."
- **AND** the generation error message SHALL read "生成架构模型失败"
