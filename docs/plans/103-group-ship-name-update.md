# Plan: Issue #103 - Update Ship Name in Group When Saved to Library

**Issue:** #103
**Branch:** `feat/103-group-ship-name-update`
**Plan File:** `docs/plans/103-group-ship-name-update.md`

## Workflow Status
- [x] Create GitHub Issue (#103)
- [x] Create feature branch (`feat/103-group-ship-name-update`)
- [x] Save plan to `docs/plans/103-group-ship-name-update.md`
- [ ] Implement changes
- [ ] Commit with version bump
- [ ] Push and create PR

## Problem
When a user saves a ship config to the Ship Library in multi-ship (group) mode:
- The config is saved to the library with the user-provided name
- BUT the ship's name in the current mining group is NOT updated
- User expects the group ship name to match the saved library name

## Discovery
In `ShipPoolManager.tsx`, `handleSaveShipToLibrary()` (lines 71-93):
- Line 72: Prompts user for a name
- Lines 85, 88, 91: Saves to library with that name
- **Missing**: Does NOT update `ship.name` in `miningGroup.ships`

## Solution
After saving to library, also update the ship's name in the mining group.

### ShipPoolManager.tsx - Update `handleSaveShipToLibrary()` (lines 71-93)

**Current flow:**
1. Prompt for name
2. Save to library
3. Done (ship in group keeps old name)

**New flow:**
1. Prompt for name
2. Save to library
3. **Update ship.name in miningGroup.ships**
4. Call `onChange()` to propagate update

**Code change (after the save logic, before closing brace):**
```tsx
// Update the ship's name in the mining group to match saved name
const updatedShips = miningGroup.ships.map((s) =>
  s.id === ship.id ? { ...s, name: trimmedName } : s
);
onChange({ ...miningGroup, ships: updatedShips });
```

## Files Modified
- `src/components/ShipPoolManager.tsx` - Update `handleSaveShipToLibrary()` to also update group ship name
