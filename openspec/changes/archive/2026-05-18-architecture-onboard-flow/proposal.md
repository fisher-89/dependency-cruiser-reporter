## Why

The Architecture tab is currently invisible when no `.c4` files exist, so users never discover the architecture design feature. By always showing the tab and providing a one-click path to create a starter model, we turn a hidden feature into a discoverable one.

## What Changes

- Architecture tab ("架构设计") is always visible in the nav bar, regardless of whether `.dc-reporter/architecture/` exists
- When no `.c4` files are found, the Architecture view shows a descriptive prompt with a "Generate Architecture Model" button
- Clicking the button calls `POST /api/architecture/generate`, which creates `.dc-reporter/architecture/main.c4` with a minimal valid template derived from the workspace name
- After generation, the view automatically reloads and renders the diagram
- New i18n keys for the onboard prompt, button label, generating state, and error state (en + zh-CN)

## Capabilities

### New Capabilities

- `architecture-onboard`: Architecture tab visibility and one-click C4 model generation flow

### Modified Capabilities

- `architecture-view`: Empty state behavior changes from static message to interactive onboard prompt with generation; nav tab is no longer gated on `hasArchitectureDir`

## Impact

- **Frontend**: `App.tsx` (tab visibility), `ArchitectureView.tsx` (empty state), i18n files (new keys)
- **CLI**: `server.ts` (new `POST /api/architecture/generate` endpoint)
- **E2E**: New tests for the generate endpoint and updated expectations for the onboard flow
