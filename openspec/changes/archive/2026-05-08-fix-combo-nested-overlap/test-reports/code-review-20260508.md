# Code Review Report

> **Change**: fix-combo-nested-overlap
> **Date**: 2026-05-08 16:30
> **Reviewer**: Claude Agent (automated)
> **Verdict**: PASS (with warnings)

---

## Scope

**Staged Files** (committed in 780de37 and 88355de):
- packages/rust/src/layout.rs
- packages/rust/src/layout_test.rs
- packages/rust/src/lib.rs
- packages/rust/src/lib_test.rs
- packages/rust/Cargo.toml
- packages/rust/Cargo.lock
- openspec/changes/fix-combo-nested-overlap/.openspec.yaml
- openspec/changes/fix-combo-nested-overlap/design.md
- openspec/changes/fix-combo-nested-overlap/proposal.md
- openspec/changes/fix-combo-nested-overlap/specs/backend/spec.md
- openspec/changes/fix-combo-nested-overlap/tasks.md
- openspec/changes/fix-combo-nested-overlap/test-reports/code-review-2026-05-08.md
- openspec/changes/fix-combo-nested-overlap/test-cases-fix-combo-nested-overlap.md
- openspec/specs/backend/spec.md
- AGENTS.md
- CLAUDE.md

**Total Changes**: 16 files, 1815 insertions, 112 deletions

---

## Findings

### Critical Issues (ERROR)

> Must fix before commit.

None found.

---

### Warnings (WARN)

> Should fix, but not blocking.

#### [WARN-1] packages/rust/src/layout.rs:295 - resolve_overlaps move_amount calculation adds extra GAP

- **Category**: Logical Error (Potential)
- **Description**: The `move_amount` calculation in `resolve_overlaps` adds an extra `GAP` on top of the separation distance. The formula computes `min_dist` as the minimum center-to-center distance needed for no overlap plus `GAP` (line 291-293). Then `move_amount = (min_dist - dist) / 2.0 + GAP` (line 295). This means each combo is moved by `(min_dist - dist)/2 + GAP`, so the total separation increase is `min_dist - dist + 2*GAP`, which is `GAP` more than what `min_dist` already includes. The resulting gap between rectangles will be `3 * GAP` instead of the intended `GAP` (since `min_dist` already accounts for one `GAP`, and `2 * GAP` is added through the move_amount formula). This is not a correctness bug (combos will indeed not overlap), but the spacing will be wider than the design intent described in the design doc, which says "same overlap resolution logic as Phase 2". In `apply_force_layout`, the overlap-based repulsion does not apply this extra GAP.
- **Suggestion**: Verify the intended gap between non-overlapping combos. If `GAP` spacing is desired, change line 295 to:
  ```rust
  let move_amount = (min_dist - dist) / 2.0;
  ```
  If a larger gap is intentional for safety margin, add a comment explaining why.

#### [WARN-2] packages/rust/src/layout.rs:266-313 - resolve_overlaps does not constrain combos within parent bounds

- **Category**: Null/Boundary Handling
- **Description**: When `resolve_overlaps` is called on child combos inside `position_children_in_combo` (line 504), it separates overlapping combos by moving them apart. However, it does not check whether the moved combos still fit within their parent combo's boundaries. In extreme cases with many large sibling combos, the overlap resolution could push a child combo outside its parent's rect. The force simulation inside `position_children_in_combo` does clamp positions to the combo boundary (lines 439-446), but `resolve_overlaps` runs after that clamping and can undo it.
- **Suggestion**: After the `resolve_overlaps` call in `position_children_in_combo`, add a re-clamping step to ensure all child combos remain within their parent's padding boundary. Alternatively, add boundary checks inside `resolve_overlaps` when a parent rect is available.

#### [WARN-3] packages/rust/src/layout.rs:272 - resolve_overlaps hardcoded iteration limit may be insufficient

- **Category**: Logical Error (Potential)
- **Description**: The `resolve_overlaps` function runs at most 10 iterations (line 272). For scenarios with many tightly packed combos, 10 iterations may not be enough to fully resolve all overlaps. The function does break early if no overlaps are found (line 310-312), which is correct. However, if 10 iterations complete with overlaps still present, those overlaps will persist silently. The design doc acknowledges O(n^2) per iteration but notes sibling count is usually < 20, which makes 10 iterations reasonable for typical cases. For edge cases with many siblings, this could be a problem.
- **Suggestion**: Consider logging a warning or adding a debug assertion if overlaps remain after all iterations. Alternatively, increase the iteration limit or make it proportional to the number of siblings.

#### [WARN-4] packages/rust/src/layout.rs:524-558 - offset_subtree is O(n*m) per call

- **Category**: Performance
- **Description**: `offset_subtree` iterates over all nodes and all combos for each combo in the BFS queue. For a subtree with k combos and total N nodes and M combos in the entire graph, the cost is O(k * (N + M)). While the design doc notes that sibling counts are limited, the subtree offset can touch all elements in the graph each time. This is called both in the initial position application (line 487) and after resolve_overlaps (line 517). In the worst case with deep nesting and many resolve_overlaps corrections, this could become expensive.
- **Suggestion**: Consider building a parent-to-children index (similar to the existing `node_children` and `combo_children` indices) once and reusing it in `offset_subtree` to avoid scanning all nodes/combos each time. This would make offset_subtree O(size_of_subtree) instead of O(size_of_graph).

---

### Info (INFO)

> Observations, not requiring changes.

#### [INFO-1] Force layout constants are module-level but not configurable

- The constants `ITERATIONS`, `REPULSION_STRENGTH`, `ATTRACTION_STRENGTH`, `COOLING_FACTOR`, `NODE_SIZE`, `COMBO_PADDING`, and `GAP` are hardcoded as module-level constants. This is acceptable for now, but if the layout needs tuning for different graph sizes, these would need to become parameters.

#### [INFO-2] resolve_overlaps function is well-isolated and reusable

- The extraction of `resolve_overlaps` from `apply_force_layout` into a standalone function (lines 266-313) is a clean design decision that allows reuse in both Phase 2 (top-level combo overlap resolution) and Phase 3 (nested sibling combo overlap resolution). This matches the design doc's Decision 2.

#### [INFO-3] Comprehensive test coverage

- The change adds 12 layout-specific tests in `layout_test.rs` and 2 integration tests in `lib_test.rs`, covering: empty layouts, single node, multiple nodes, nested combos, top-level sibling overlap, deeply nested siblings, three-level nesting, four-level nesting, mixed nodes and combos, and stress tests with 8+ combos. All 33 tests pass.

#### [INFO-4] is_overlapping uses strict inequality (no-touch policy)

- The `is_overlapping` function (lines 317-322) uses strict inequalities (`<` and `>`), meaning rectangles that share an edge are NOT considered overlapping. This is a reasonable design choice for visual layout.

#### [INFO-5] The change correctly handles the "root" combo special case in depth calculation

- `sort_combos_by_depth` (line 81-83) correctly assigns depth 0 to "combo:root" and counts path segments for other combos. This ensures the bottom-up sizing and top-down positioning proceed in the correct order.

---

## Summary

| Level | Count |
|-------|-------|
| ERROR | 0     |
| WARN  | 4     |
| INFO  | 5     |

## Verdict

**PASS** -- No critical errors or security issues found. The core `resolve_overlaps` function is correct in that it successfully separates overlapping sibling combos at all nesting levels, as verified by all 33 passing tests. The warnings relate to: (1) a potential over-spacing bug where the gap between resolved combos is wider than intended due to an extra GAP term in the move calculation, (2) the lack of parent boundary constraints after overlap resolution which could push children outside their parent in edge cases, (3) a potentially insufficient iteration limit for extreme cases, and (4) a performance concern in the subtree offset function. These are non-blocking issues that should be addressed in a follow-up.
