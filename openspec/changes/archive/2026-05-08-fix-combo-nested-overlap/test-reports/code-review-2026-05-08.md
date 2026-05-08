# Code Review Report

> **Change**: fix-combo-nested-overlap
> **Date**: 2026-05-08 00:00
> **Reviewer**: Claude Agent (automated)
> **Verdict**: PASS (with warnings)

---

## Scope

**Staged Files**:
- (none staged -- all changes are in working tree)

**Changed Files**:
- packages/rust/src/layout.rs
- packages/rust/src/layout_test.rs
- openspec/specs/backend/spec.md

**Total Changes**: 3 files, 352 insertions, 6 deletions

---

## Findings

### Critical Issues (ERROR)

> Must fix before commit.

(None found.)

---

### Warnings (WARN)

> Should fix, but not blocking.

#### [WARN-1] layout.rs:460 - Exact floating-point comparison

- **Category**: Logical Error (latent bug)
- **Description**: The guard `if dx != 0.0 || dy != 0.0` uses exact floating-point equality to decide whether to call `offset_subtree`. Because `dx` and `dy` are computed as `new_left - old_left` and `new_top - old_top` from `resolve_overlaps` (which adds `move_amount * dx_or_dy / dist`), these values are unlikely to be exactly 0.0 even when effectively zero. The check is meant as an optimization to skip `offset_subtree` when nothing moved. In practice this is safe because if both deltas are truly zero, `offset_subtree` would add 0.0 to all coordinates, which is a no-op. However, the intent of the guard is to avoid an O(nodes + combos) traversal, and it will almost never fire. The real risk is minor: unnecessary subtree traversals. A threshold-based check would be more correct and self-documenting.
- **Current Code**:
  ```rust
  if dx != 0.0 || dy != 0.0 {
      offset_subtree(ci, dx, dy, nodes, combos);
  }
  ```
- **Suggestion**:
  ```rust
  if dx.abs() > 1e-6 || dy.abs() > 1e-6 {
      offset_subtree(ci, dx, dy, nodes, combos);
  }
  ```

#### [WARN-2] spec.md:178-181 - Spec parameter table does not match implementation

- **Category**: Redundant Logic / Documentation Drift
- **Description**: The spec's force parameter table lists `REPULSION_STRENGTH = 1000.0`, `ATTRACTION_STRENGTH = 0.01`, `ITERATIONS = 100`, `COOLING_FACTOR = 0.95`. However, the actual constants in `layout.rs` are `REPULSION_STRENGTH = 5000.0`, `ATTRACTION_STRENGTH = 0.001`, `ITERATIONS = 500`, `COOLING_FACTOR = 0.98`. These were changed in a prior commit (780de37) but the spec was not updated at that time. While the current change does not introduce this mismatch, it is important to flag because the spec is documented as the single source of truth (per CLAUDE.md). This discrepancy could mislead future implementers.
- **Suggestion**: Update the spec parameter table to match the actual values in `layout.rs`, or add a note that the spec values are aspirational targets while the code values reflect tuning.

#### [WARN-3] layout.rs:295 - `move_amount` includes extra GAP that may over-separate

- **Category**: Logical Error (over-separation)
- **Description**: In `resolve_overlaps`, the move amount is computed as `(min_dist - dist) / 2.0 + GAP`. Here `min_dist` already includes `+ GAP` (from `min_dist_x`/`min_dist_y` which are `(ri.width + rj.width) / 2.0 + GAP`). So the total gap between the edges of two separated combos will be `2 * GAP` rather than `GAP`. Each combo moves by `(min_dist - dist) / 2.0 + GAP`, so the total separation increases by `2 * GAP` beyond the geometric minimum. This is the same behavior that existed before the refactor (it was in `apply_force_layout`), so it is not a regression. However, it means the guaranteed inter-combo gap is `2 * GAP = 60.0` rather than the documented `GAP = 30.0`. This may cause unnecessarily sparse layouts for deeply nested combo trees where `resolve_overlaps` runs at every level.
- **Suggestion**: Decide on the intended gap semantics. If `GAP` between combo edges is the goal, use `(min_dist - dist) / 2.0` without the extra `+ GAP`. If a wider gap is intentional, document it.

---

### Info (INFO)

> Observations, not requiring changes.

#### [INFO-1]
The refactoring of the overlap resolution from inline code in `apply_force_layout` into the standalone `resolve_overlaps` function is clean and well-structured. The extraction preserves identical behavior while enabling reuse in Phase 3.

#### [INFO-2]
The three new test cases (`test_three_level_nested_siblings`, `test_four_level_deeply_nested_siblings`, `test_mixed_nodes_and_combos_nested`) provide good coverage of the nested overlap scenario. The mixed-nodes test is particularly valuable because it verifies the interaction between direct child nodes and child combos within the same parent.

#### [INFO-3]
The spec.md changes accurately describe the new Phase 3 step and the updated layout guarantee ("all levels" instead of just "top level"). The test coverage table is also updated correctly.

#### [INFO-4]
The `resolve_overlaps` function hard-codes 10 iterations. For the Phase 3 context with typically 2-5 child combos, this is more than sufficient. For Phase 2 with potentially dozens of top-level combos, 10 iterations may sometimes be insufficient to fully resolve all overlaps, though the prior force layout pass generally leaves only minor overlaps.

#### [INFO-5]
The new test `test_three_level_nested_siblings` does not verify containment (that parent combos fully contain their children), while the existing `test_mixed_nodes_and_combos_nested` does check partial containment for the src combo. Containment verification would strengthen the nested tests, but this is not a defect since the layout guarantee of containment is tested elsewhere.

---

## Summary

| Level | Count |
|-------|-------|
| ERROR | 0 |
| WARN  | 3 |
| INFO  | 5 |

## Verdict

**PASS** -- No critical issues found. The refactoring is correct, tests pass (33/33), and the change achieves its goal of preventing nested combo overlaps. Three warnings noted: (1) a floating-point exact comparison guard that rarely triggers as intended, (2) a pre-existing spec-to-code parameter mismatch that should be corrected, and (3) a double-GAP over-separation in `resolve_overlaps` that may cause sparse layouts at deep nesting levels but is not a regression.
