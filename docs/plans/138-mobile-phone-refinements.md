# Plan: Mobile Phone Layout Refinements (#138)

**Status**: ACTIVE
**Issue**: #138
**Branch**: feat/138-mobile-phone-refinements

## Summary

10 mobile layout refinements for Single Ship and Mining Group modes.

---

## SINGLE SHIP MODE

### 1. Ship Library Bottom Tab Image
**File**: `src/App.tsx` (line ~830), `src/components/MobileDrawer.css`

- Add `tabImage={shipLibraryLabelVertical}` to bottom drawer
- Add CSS rotation for horizontal orientation:
```css
.mobile-drawer-tab.bottom .mobile-drawer-tab-image {
  transform: rotate(90deg);
  height: auto;
  width: 70%;
}
```

### 2. Remove Configured Laser Count
**File**: `src/components/LasersSetup.tsx` (lines 32-37)

- Delete the entire `laser-summary` block
- Keep only the expand indicator if needed

### 3. Bump Mode Toggle Font Size
**File**: `src/App.css` (line ~1065)

- Change `.mode-button` font-size from `0.75rem` to `0.85rem` in portrait media query

### 4. Bottom Padding for Tab Clearance
**File**: `src/App.css`

- Add to portrait media query:
```css
.mining-config-tab {
  padding-bottom: 4rem !important;
}
```

---

## MINING GROUP MODE

### 5. Ship Names Word Wrap
**File**: `src/components/ShipPoolManager.css` (lines 152-159)

- Remove: `white-space: nowrap`, `text-overflow: ellipsis`, `overflow: hidden`
- Add: `word-wrap: break-word`, `white-space: normal`, `max-width: calc(100% - 4rem)`
- Add `gap: 1rem` to `.ship-card-header`

### 6. Spread & Enlarge Action Icons (50% larger)
**File**: `src/components/ShipPoolManager.css` (lines 167-217)

- Change `.ship-actions` to `justify-content: space-between`
- Increase font sizes:
  - `.edit-button`: 1.1rem → 1.65rem
  - `.save-library-button`: 0.85rem → 1.3rem
  - `.remove-button`: 1.2rem → 1.8rem

### 7. Narrower Library Side Tabs
**File**: `src/components/MobileDrawer.css` (lines 339, 351, 507)

- Reduce base width from `8rem` to `6rem`
- Reduce landscape width from `6rem` to `4.5rem`

### 8. ON Button Width on Tablets
**File**: `src/components/ShipPoolManager.css` (lines 109-121)

- Verify `width: auto` is working
- Add `max-width: fit-content` if needed

### 9. Ship Section 75% Width + Larger Side Tabs (Tablets)
**Files**: `src/components/ShipPoolManager.css`, `src/components/MobileDrawer.css`

Add tablet media query:
```css
@media (orientation: landscape) and (pointer: coarse) and (min-height: 600px) and (min-width: 768px) {
  .ship-pool-manager {
    max-width: 75%;
    margin: 0 auto;
  }

  .mobile-drawer-tab.left,
  .mobile-drawer-tab.right {
    width: 7rem;
    height: 30vh;
  }
}
```

### 10. Group Library Image Redesign
**File**: `src/assets/group_library_small.png`

- **User will provide** new image with:
  - 1/3 vertical overlap between ships
  - 1/2 horizontal overlap as ships fan out
- Replace existing file (no code changes needed)

---

## Files to Modify

| File | Items |
|------|-------|
| `src/App.tsx` | 1 |
| `src/App.css` | 3, 4 |
| `src/components/LasersSetup.tsx` | 2 |
| `src/components/ShipPoolManager.css` | 5, 6, 8, 9 |
| `src/components/MobileDrawer.css` | 1, 7, 9 |
| `src/assets/group_library_small.png` | 10 (user provides) |

---

## Implementation Order

**Phase 1** - Quick wins (2, 3, 4, 6, 7)
**Phase 2** - Layout adjustments (5, 8, 9)
**Phase 3** - Assets (1, 10 when image ready)

---

## Progress

- [ ] 1. Ship Library bottom tab image
- [x] 2. Remove configured laser count
- [x] 3. Bump mode toggle font size
- [x] 4. Bottom padding for tab clearance
- [ ] 5. Ship names word wrap
- [x] 6. Spread & enlarge action icons
- [x] 7. Narrower library side tabs
- [ ] 8. ON button width on tablets
- [ ] 9. Ship section 75% width + larger side tabs
- [ ] 10. Group library image (awaiting user asset)

---

## Verification

1. Run `npm run dev` and test on mobile device/emulator
2. Test Single Ship mode:
   - Bottom tab shows rotated image
   - No "X configured" text under Lasers Setup
   - Mode toggle buttons readable
   - Can scroll to bottom without tab obstruction
3. Test Mining Group mode:
   - Long ship names wrap correctly
   - Icons spread out and larger
   - Side tabs narrower
   - ON button doesn't span full width on tablet
   - Ship section 75% width on tablet with larger tabs
4. Replace group_library_small.png when user provides new image
