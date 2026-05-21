## Context

The Architecture view is currently gated behind `hasArchitectureDir` — if `.dc-reporter/architecture/` doesn't exist, the tab is hidden entirely. There is no discoverable path to create a C4 model from within the UI. Users must manually create the directory and write `.c4` files.

The server-side architecture model endpoint (`GET /api/architecture/model`) already handles three states: success (200), not found (404), parse error (422). The frontend ArchitectureView maps these to loading/ready/empty/error states. The empty state currently shows a static message with no action.

## Goals / Non-Goals

**Goals:**
- Always show the Architecture tab so users can discover the feature
- Provide a one-click path to generate a valid starter `.c4` file
- After generation, seamlessly transition to the rendered diagram

**Non-Goals:**
- A multi-step wizard or form-based creation flow
- Intelligent C4 model generation from dependency graph analysis
- Editing `.c4` files from within the UI
- Template selection (only one default template)

## Decisions

### 1. Template content: workspace-name-based minimal model

The generated `main.c4` uses the workspace directory basename as the system name, with one `person` (User) and one `softwareSystem` connected by a single relationship.

**Rationale**: Simple, always valid, immediately viewable. The user edits the file to add real elements. Deriving systems from dependency graph data would require the graph to be loaded first and adds complexity that can be deferred.

**Alternative considered**: Dependency-graph-driven generation that identifies top-level modules and creates containers for each. Rejected for this iteration — adds coupling between graph data and architecture generation, and the graph may not always be available.

### 2. Server-side generation via POST endpoint

A new `POST /api/architecture/generate` endpoint creates the directory and file on the server.

**Rationale**: The server already owns filesystem concerns for the architecture feature (reading `.c4` files, checking directory existence). Keeping generation server-side avoids exposing filesystem paths to the client and keeps the `@likec4` imports only in the server bundle.

**Alternative considered**: Client-side generation with a download. Rejected — the file must land in `.dc-reporter/architecture/` on the server's filesystem for subsequent `GET /api/architecture/model` calls to find it.

### 3. No overwrite — generate only when no `.c4` files exist

The endpoint creates `main.c4` unconditionally when called. The UI only shows the generate button when the model endpoint returns 404, so the endpoint is only reachable when no `.c4` files exist.

**Rationale**: Simpler than implementing overwrite detection. If the user deletes all `.c4` files, they get the generate button back.

### 4. Frontend state machine: load → empty → generating → load → ready

```
ArchitectureView mounts
  → GET /api/architecture/model
    → 200: render diagram
    → 404: show onboard prompt
      → User clicks "Generate"
        → POST /api/architecture/generate (show spinner)
          → success: re-fetch model → render diagram
          → failure: show error with retry
    → 422: show parse error
    → other: show error with retry
```

A new `generating` sub-state sits within the empty state rather than adding a top-level status to the State union — keeps the change minimal.

## Risks / Trade-offs

- **Tab always visible, sometimes empty**: Users may click the Architecture tab and see the onboard prompt even when they have no interest in C4 models. Mitigation: the prompt is brief and the generate button is optional — the other tabs remain fully functional.
- **Template may not match project reality**: The auto-generated model is intentionally generic. Users must edit it. This is communicated through the prompt text.
- **E2E test workspace cleanup**: The generate endpoint creates the `.dc-reporter/architecture/` directory. E2E tests already clean up `.test-workspace` between runs, so no additional cleanup is needed.

## Open Questions

None.
