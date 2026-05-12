## Context

The layout algorithm in `packages/rust/src/layout.rs` positions combos via force-directed layout followed by overlap resolution. The `resolve_overlaps` function (used for top-level combos in Phase 2) and `resolve_element_overlaps` (used for children within combos in Phase 3) both have two bugs causing excessive spacing:

1. **Diagonal movement from max distance**: When two rectangles overlap, the code computes `min_dist_x` and `min_dist_y` (the center-to-center distance needed on each axis to achieve GAP separation), then uses `max(min_dist_x, min_dist_y)` as the target diagonal distance. This forces movement along both axes proportional to the larger axis requirement, even when only one axis needs separation.

2. **Double GAP**: `move_amount = (min_dist - dist) / 2.0 + GAP` adds GAP a second time. Since `min_dist_x/y` already includes GAP, the effective inter-combo gap becomes `2 * GAP = 60px`.

Current flow:
```
resolve_overlaps:
  min_dist_x = (w1+w2)/2 + GAP    ← GAP included here
  min_dist_y = (h1+h2)/2 + GAP    ← GAP included here
  min_dist = max(min_dist_x, min_dist_y)  ← takes larger axis
  move_amount = (min_dist - dist)/2 + GAP  ← GAP added again!
  move each combo by move_amount along diagonal
```

## Goals / Non-Goals

**Goals:**
- Fix overlap resolution so combos separate only along the axis(es) that actually overlap
- Remove double GAP accumulation so inter-combo gap is exactly `GAP` (30px)
- Maintain overlap-free results (no regressions in overlap detection)

**Non-Goals:**
- Changing GAP, COMBO_PADDING, or other layout constants
- Modifying the force-directed simulation parameters
- Changing the Phase 1 sizing algorithm

## Decisions

### Decision 1: Axis-aligned separation in `resolve_overlaps`

**Approach**: Compute horizontal and vertical overlap independently. For each overlapping pair, determine which axis has less overlap (the "easier" escape direction) and move along that axis only. If both axes overlap significantly, move along the axis with the smaller required separation.

**Algorithm**:
```
overlap_x = (w1/2 + w2/2) - |center_dx|   // positive = horizontal overlap
overlap_y = (h1/2 + h2/2) - |center_dy|   // positive = vertical overlap

if overlap_x > 0 && overlap_y > 0:
    // True overlap - choose axis with smaller overlap (easier escape)
    if overlap_x < overlap_y:
        // Separate horizontally
        needed_x = w1/2 + w2/2 + GAP
        current_dx = |center_dx|
        shift_x = needed_x - current_dx   // total shift needed
        move each combo by shift_x/2 along x-axis
    else:
        // Separate vertically (same logic)
```

**Alternative considered**: Move along both axes proportionally. Rejected because it still produces unnecessary gaps on the non-overlapping axis.

### Decision 2: Remove extra GAP from move_amount

Remove `+ GAP` from the `move_amount` calculation in both `resolve_overlaps` and `resolve_element_overlaps`. The GAP already in `min_dist_x/y` (or the new axis-specific calculation) ensures minimum spacing.

## Risks / Trade-offs

- **[Oscillation]** → Axis-aligned movement may cause oscillation if many combos need multi-axis separation. Mitigation: iterate until convergence (already done) and the single-axis approach actually reduces oscillation by avoiding unnecessary perpendicular movement.
- **[Touching rects]** → Removing the extra GAP safety margin could result in rects that are exactly GAP apart with no float margin. Mitigation: add a small epsilon (0.5px) to the required distance instead of a full GAP.
