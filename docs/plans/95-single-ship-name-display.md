# Plan: Issue #95 - Single Ship Custom Name Display

**Issue:** #95 ✓
**Branch:** `feat/95-single-ship-name-display` ✓
**Plan File:** `docs/plans/95-single-ship-name-display.md`

## Workflow Status
- [x] Create GitHub Issue (#95)
- [x] Create feature branch (`feat/95-single-ship-name-display`)
- [x] Save plan to `docs/plans/95-single-ship-name-display.md`
- [ ] Implement changes
- [ ] Commit with version bump
- [ ] Push and create PR

## Problem
In single-ship mode, the visual display shows only the ship type (e.g., "Prospector"). Users who save configs with custom names see that name in the Mining Config tab header, but NOT in the visual display.

## Discovery
- `currentConfigName` state already exists in App.tsx (line 51)
- It's already passed to ShipSelector and displayed in the header (line 16)
- It's NOT passed to ResultDisplay - that's the only missing piece!
- Multi-ship mode already has this pattern at line 1041: displays `shipInstance.name` with ship type tooltip

## Solution
Match multi-ship behavior, minimize duplication.

### 1. ResultDisplay.tsx - Add helper function (top of file, ~line 20)
Extract the repeated `name.split(" ").slice(1).join(" ")` logic:

```tsx
// Helper to get short ship name (e.g., "MISC Prospector" → "Prospector")
function getShortShipName(fullName: string): string {
  return fullName.split(" ").slice(1).join(" ");
}
```

### 2. ResultDisplay.tsx - Add prop to SingleShipDisplayProps (line 134)
```tsx
configName?: string;
```

### 3. ResultDisplay.tsx - Update single-ship label (line 556-558)
**Current:**
```tsx
<div className="ship-label">
  {selectedShip.name.split(" ").slice(1).join(" ")}
</div>
```

**New (matches multi-ship pattern):**
```tsx
<div className="ship-label" title={getShortShipName(selectedShip.name)}>
  {configName || getShortShipName(selectedShip.name)}
</div>
```

### 4. ResultDisplay.tsx - Update multi-ship usages
Replace inline `split().slice().join()` calls with `getShortShipName()`:
- Line 974-977 (tooltip)
- Any other occurrences

### 5. App.tsx - Pass prop to ResultDisplay
Add `configName={currentConfigName}` to the ResultDisplay component call.

## Files to Modify
- `src/App.tsx` - Add prop to ResultDisplay call
- `src/components/ResultDisplay.tsx` - Add helper, add prop, update displays
