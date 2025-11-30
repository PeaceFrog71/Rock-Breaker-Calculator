# Improve ship size consistency across single and group mining modes

**Labels:** enhancement, ui

## Description
Standardize ship sizes for better visual consistency and usability across single-ship and multi-ship mining modes.

## Current Behavior
Ship sizes vary based on their real-world dimensions:
- **MOLE:** 148.5px wide
- **Prospector:** 99px wide
- **GOLEM:** 66px wide

This causes visual inconsistency, especially in single-ship mode where only one ship is displayed.

## Proposed Changes

### Single-Ship Mode
All ships should be displayed at the same size (Prospector size: 99px) for visual consistency:
- Makes all ships equally prominent
- Simplifies UI layout
- Provides consistent user experience regardless of ship selection
- Ship identity is clear from the graphic itself, size isn't needed for differentiation

### Multi-Ship (Group Mining) Mode
Ships should maintain relative size differences but with adjusted proportions:
- **MOLE:** Keep at 148.5px (largest ship)
- **Prospector:** Increase to ~110-120px (slightly larger than current)
- **GOLEM:** Increase to ~90-100px (slightly larger than current)

**Rationale for multi-ship sizing:**
- MOLE remains largest to reflect its multi-crew nature
- Prospector and GOLEM increased in size for better visibility and clickability
- Maintains relative size hierarchy while improving usability
- Prevents small ships from being difficult to interact with when displayed alongside MOLE

## Technical Details

**Location:** `src/components/ResultDisplay.tsx` lines 345-352

**Current logic:**
```typescript
const shipWidth =
  selectedShip.id === "mole"
    ? 148.5
    : selectedShip.id === "prospector"
    ? 99
    : 66;
```

**Proposed logic:**
```typescript
const shipWidth = useMiningGroup
  ? // Multi-ship mode: relative sizes with better visibility
    selectedShip.id === "mole"
    ? 148.5
    : selectedShip.id === "prospector"
    ? 115  // Increased from 99
    : 95   // Increased from 66 (GOLEM)
  : // Single-ship mode: consistent size for all ships
    99;
```

## Benefits
- **Single-ship mode:** Clean, consistent visual presentation
- **Multi-ship mode:** Better visibility and interaction for smaller ships
- **Overall:** Improved UX without losing ship identity or hierarchy

## Implementation Notes
- Requires passing `useMiningGroup` prop to ResultDisplay component
- May need to adjust ship label positioning for consistency
- Test sensor icon placement with new ship sizes
- Verify laser beam positioning scales correctly
