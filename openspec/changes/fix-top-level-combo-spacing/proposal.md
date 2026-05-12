## Why

Top-level combos in the graph visualization have excessive spacing between them, making the layout unnecessarily spread out and hard to navigate. Two bugs in `resolve_overlaps` cause this: (1) using `max(min_dist_x, min_dist_y)` for diagonal movement pushes combos apart on both axes even when only one axis needs separation, and (2) a double GAP accumulation results in 60px gaps instead of the intended 30px.

## What Changes

- Replace the single `max(min_dist_x, min_dist_y)` distance calculation in `resolve_overlaps` with axis-aware separation that moves combos only along the axis that needs correction
- Remove the redundant `+ GAP` from `move_amount` in both `resolve_overlaps` and `resolve_element_overlaps` — the GAP already included in `min_dist_x/y` is sufficient

## Capabilities

### New Capabilities

- `axis-aligned-separation`: Axis-aware overlap resolution that separates rectangles along the minimum-overlap axis instead of using a single diagonal distance

### Modified Capabilities

## Impact

- `packages/rust/src/layout.rs`: `resolve_overlaps` and `resolve_element_overlaps` functions modified
- Existing layout tests may need updated expected values for spacing
- Visual appearance: combos will be closer together, matching the intended GAP of 30px
