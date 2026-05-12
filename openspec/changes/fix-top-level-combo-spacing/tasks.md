## 1. Fix resolve_overlaps function

- [x] 1.1 Implement axis-aligned separation logic in resolve_overlaps (lines 364-453)
- [x] 1.2 Remove extra GAP from move_amount calculation (line 428)
- [x] 1.3 Add small epsilon (0.5) to required distance for float safety margin

## 2. Fix resolve_element_overlaps function

- [x] 2.1 Implement axis-aligned separation logic in resolve_element_overlaps (lines 463-550)
- [x] 2.2 Remove extra GAP from move_amount calculation (line 531)

## 3. Verification

- [x] 3.1 Run existing layout tests to ensure no regressions
- [x] 3.2 Build and run demo with wpsweb data to visually verify spacing
- [x] 3.3 Run pnpm test to verify all tests pass
