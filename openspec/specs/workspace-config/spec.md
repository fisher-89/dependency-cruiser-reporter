## ADDED Requirements

### Requirement: Workspace directory

The system SHALL use `.dc-reporter/` as the workspace directory under the path specified by `--cwd`.

#### Scenario: Default cwd

- **WHEN** `dep-report dashboard` is executed without `--cwd`
- **THEN** the workspace directory SHALL default to `.dc-reporter/` in the current working directory

#### Scenario: Custom cwd

- **WHEN** `dep-report dashboard --cwd /path/to/project` is executed
- **THEN** the workspace directory SHALL be `/path/to/project/.dc-reporter/`

#### Scenario: Workspace subdirectories

- **WHEN** the workspace directory exists
- **THEN** it SHALL contain:
  - `architecture/` for manually authored `.c4` files
  - `scans/` for dependency-cruiser output JSON files

### Requirement: Workspace detection

The system SHALL detect the presence of `.dc-reporter/` on startup and expose this via the API.

#### Scenario: No workspace found

- **WHEN** `.dc-reporter/` does not exist at the cwd
- **THEN** the frontend SHALL display a directory picker prompting the user to select a project directory

### Requirement: CLI --cwd flag

The `dep-report` CLI SHALL accept a global `--cwd` option.

#### Scenario: dashboard with --cwd

- **WHEN** user executes `dep-report dashboard --cwd ./my-project`
- **THEN** the server SHALL resolve `.dc-reporter/` relative to `./my-project`
- **AND** the server SHALL read C4 files from `./my-project/.dc-reporter/architecture/`

#### Scenario: analyze with --cwd

- **WHEN** user executes `dep-report analyze --path ./src --cwd ./my-project`
- **THEN** the output JSON SHALL be saved to `./my-project/.dc-reporter/scans/`
