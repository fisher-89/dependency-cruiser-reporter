## ADDED Requirements

### Requirement: Overlap resolution separates along minimum-overlap axis
When two rectangles overlap, the overlap resolution algorithm SHALL move them apart along the axis with the smaller overlap (or smaller required separation distance), not along an arbitrary diagonal.

#### Scenario: Horizontal overlap only
- **WHEN** two rectangles overlap horizontally but not vertically
- **THEN** they shall be moved apart horizontally only, with no vertical displacement

#### Scenario: Vertical overlap only
- **WHEN** two rectangles overlap vertically but not horizontally
- **THEN** they shall be moved apart vertically only, with no horizontal displacement

#### Scenario: Both axes overlap
- **WHEN** two rectangles overlap on both axes
- **THEN** they shall be moved apart along the axis with the smaller overlap amount

### Requirement: Inter-rectangle gap equals GAP constant
The gap between non-overlapping adjacent rectangles after overlap resolution SHALL equal the GAP constant (30px), not double it.

#### Scenario: Two combos separated
- **WHEN** two combos are positioned next to each other after overlap resolution
- **THEN** the distance between their edges shall be GAP (30px), not 2*GAP (60px)
