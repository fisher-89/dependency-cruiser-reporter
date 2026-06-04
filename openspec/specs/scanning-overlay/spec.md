# Scanning Overlay Specification

## Purpose

Defines the full-screen scan overlay component (`ScanOverlay`) that provides visual feedback during project scanning operations.

## Requirements

### Requirement: Full-screen overlay renders during scanning

The system SHALL render a full-screen overlay component (`ScanOverlay`) when scanning is in progress. The overlay SHALL use `position: fixed; inset: 0; z-index: 9999` to cover all visual content including header navigation, and SHALL be rendered at the root level of the App component tree.

#### Scenario: Overlay appears on scan start

- **WHEN** the user clicks the Scan button and `scanning` state transitions from `false` to `true`
- **THEN** the `ScanOverlay` is rendered as a direct child of App's root `<div>`
- **AND** the overlay covers the entire viewport with `position: fixed; inset: 0; z-index: 9999`
- **AND** the overlay background is semi-transparent (e.g., `rgba(0, 0, 0, 0.5)` in light mode, `rgba(0, 0, 0, 0.7)` in dark mode)

#### Scenario: Overlay disappears on scan completion

- **WHEN** the `POST /api/analyze` request completes successfully and `scanning` state transitions to `false`
- **THEN** the `ScanOverlay` is unmounted
- **AND** the underlying UI becomes fully visible and interactive

### Requirement: Overlay blocks all user interactions

The system SHALL prevent all user interactions with the underlying UI while the overlay is displayed. This includes mouse clicks, drag operations, touch events, and keyboard inputs targeting content beneath the overlay.

#### Scenario: Clicks on underlying elements are blocked

- **WHEN** the overlay is displayed and the user clicks on a navigation tab, graph node, or button beneath the overlay
- **THEN** the click event is not propagated to the underlying element
- **AND** no state changes occur in response to the click

#### Scenario: Canvas drag interactions are blocked

- **WHEN** the overlay is displayed and the user attempts to drag the G6 canvas beneath it
- **THEN** the drag interaction does not trigger any canvas behavior (pan, zoom, selection)

#### Scenario: Keyboard shortcuts are blocked

- **WHEN** the overlay is displayed and the user presses a keyboard shortcut (e.g., Ctrl+R for refresh)
- **THEN** the shortcut is not processed by any underlying component

### Requirement: Overlay shows indeterminate progress bar

The system SHALL display an indeterminate progress bar animation at the center of the overlay, indicating that the scan is in progress without showing a specific percentage.

#### Scenario: Indeterminate progress bar animation

- **WHEN** the overlay is first rendered
- **THEN** an indeterminate progress bar is displayed inside the overlay's centered card
- **AND** the progress bar uses CSS `@keyframes` animation with `transform: translateX()` for smooth, continuous motion
- **AND** the progress bar color uses `var(--color-accent)` CSS variable for theme compatibility

### Requirement: Overlay shows scanning status text

The system SHALL display localized status text inside the overlay's centered card, updating the user on the current scanning state.

#### Scenario: Scanning status text displayed

- **WHEN** the overlay is rendered and scanning is in progress
- **THEN** the text content displays the localized string for `action.scanning` (English: "Scanning...", Chinese: "扫描中...")
- **AND** a loading spinner or scan icon with a spinning CSS animation is displayed above the text

### Requirement: Overlay shows scan failure with dismiss

The system SHALL display error information inside the overlay when the scan fails, and provide a dismiss button for the user to close the overlay.

#### Scenario: Scan failure displays error

- **WHEN** `POST /api/analyze` returns a non-OK status or throws an exception
- **THEN** the overlay transitions from "scanning" state to "error" state
- **AND** the centered card displays the error message: if the response body contains a `details` field, that value is shown; otherwise the `error` or `statusText` is shown; network exceptions show the exception message
- **AND** a "Close" or "Dismiss" button is displayed below the error message
- **AND** the progress bar is replaced by an error indicator (e.g., icon in `var(--color-error)`)

#### Scenario: User dismisses error overlay

- **WHEN** the overlay is in error state and the user clicks the dismiss button
- **THEN** the overlay is unmounted
- **AND** `scanning` state is set to `false`
- **AND** the UI returns to its pre-scan interactive state

### Requirement: Overlay supports dark mode

The overlay SHALL respect the current theme settings and use CSS variables for all colors.

#### Scenario: Dark theme overlay styling

- **WHEN** `[data-theme="dark"]` is set on the `<html>` element
- **THEN** the overlay background uses the dark semi-transparent variant
- **AND** the centered card uses `var(--color-surface)` for background
- **AND** all text uses `var(--color-text-primary)` and `var(--color-text-secondary)` as appropriate

#### Scenario: Light theme overlay styling

- **WHEN** no `data-theme` attribute or `data-theme="light"` is set on the `<html>` element
- **THEN** the overlay background uses the light semi-transparent variant
- **AND** the centered card uses `var(--color-surface)` for background
- **AND** all text uses `var(--color-text-primary)` and `var(--color-text-secondary)` as appropriate

## Module Contract

### Component: ScanOverlay

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `visible` | `boolean` | `false` | Controls overlay render state |
| `status` | `'scanning' \| 'error'` | `'scanning'` | Current overlay state |
| `errorMessage` | `string \| null` | `null` | Error message to display when `status === 'error'` |
| `onDismiss` | `(() => void) \| undefined` | `undefined` | Callback fired when user clicks dismiss in error state |

### States

| State | Visual |
|-------|--------|
| `scanning` | Full-screen overlay, centered card with spinning icon + localized "Scanning..." text + indeterminate progress bar |
| `error` | Full-screen overlay, centered card with error icon + error message text + "Dismiss" button |
| (hidden) | Component not rendered (null) when `visible === false` |

### CSS animations

| Name | Element | Description |
|------|---------|-------------|
| `scan-progress` | Progress bar fill | Indeterminate width oscillation via `@keyframes` with `transform: translateX()` |
| `scan-spin` | Scan icon | 1s linear infinite rotation via existing `.spinning` class |
