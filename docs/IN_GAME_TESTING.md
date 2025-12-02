# In-Game Testing Results

This document records in-game testing procedures, results, and verified game mechanics for Star Citizen mining.

---

## Verified Game Mechanics

### Multi-Ship Mining Stat Stacking

| Stat | Stacking Behavior | Verified |
|------|-------------------|----------|
| **Power** | Additive (sum of all ships) | Yes |
| **Resistance** | Multiplicative (all modifiers multiply together) | Yes |
| **Instability** | Multiplicative + doubles per additional ship | Yes |
| **Window Size** | Multiplicative | Yes |
| **Charge Rate** | Multiplicative | Yes |

**Example - Resistance:**
- Ship 1: Helix I (0.7x)
- Ship 2: Pitman (1.25x)
- Combined: 0.7 × 1.25 = 0.875x (not min, not average)

### Active Module Behavior

| Finding | Status |
|---------|--------|
| Only one sustained active module can be active at a time | Verified (tested with 2x Lifeline) |
| Surge may be instantaneous (can stack with sustained?) | Pending - Issue #27 |
| Stampede may be instantaneous | Pending - Issue #27 |

### Back-Calculation for Base Values

When scanning a rock with a laser active, the displayed resistance is modified. To derive the base value:
- Use only **passive module** modifiers (active modules are temporary)
- Use only the **scanning laser's** modifier (not all lasers combined)
- Formula: `baseResistance = scannedResistance / scanningLaserModifier`

---

## Test Log

### Test: Multi-Ship Resistance Stacking
**Date:** 2024-12-02
**Tester:** Drew
**Issue:** #22

**Setup:**
- Ship 1: GOLEM with Pitman (1.25x resist) + Focus + Focus II
- Ship 2: Prospector with Helix I (0.7x resist) + 2x Torrent

**Hypothesis:**
- If "best of": effective resistance = 0.7x (35% on 50% base rock)
- If multiplicative: effective resistance = 0.875x (43.75% on 50% base rock)

**Result:** Multiplicative confirmed
**Action:** Updated `calculateGroupBreakability()` to use `reduce((acc, mod) => acc * mod, 1)` instead of `Math.min()`

---

### Test: Active Module Stacking (One at a Time)
**Date:** 2024-12-02
**Tester:** Drew
**Issue:** #27

**Setup:**
- Laser with 2x Lifeline modules

**Result:** Activating a second Lifeline stops the first and starts the second, wasting the first Lifeline's remaining duration.

**Conclusion:**
- Sustained active modules cannot stack - only one active at a time
- Activating a new sustained module **cancels** the currently active one (not blocked)
- This wastes the remaining duration of the cancelled module

**Open Questions:**
- Does Surge bypass this rule (instantaneous)?
- Does Stampede bypass this rule?
- Can instant modules stack with sustained modules?

---

## Pending Tests

### Issue #27: Active Module Stacking Behavior
- [ ] Test 1: Activate Rime, then try Brandt - does it replace or fail?
- [ ] Test 2: Activate Rime, then Surge - does Surge fire while Rime stays active?
- [ ] Test 3: Activate Rime, then Stampede - same question
- [ ] Test 4: If Surge and Stampede are both instant, can they stack?

---

## Equipment Data Corrections

### Pitman Laser (GOLEM bespoke)
Updated stats from in-game (Size 0 Mining Lasers):
| Stat | Value |
|------|-------|
| Size | 0 |
| Module Slots | 2 |
| Max Power | 3,150 |
| Resistance | +25% |
| Instability | +35% |
| Inert Materials | -40% |
| Opt Charge Rate | -40% |
| Opt Charge Window | +40% |

*Note: Our `types/index.ts` needs updating to include instability, inert, charge rate, and charge window modifiers for all lasers.*

---

## Notes

- Always scan from cockpit first to get true base resistance before laser modifiers
- When using "Modified Resistance" mode in calculator, specify which laser performed the scan
- Gadgets can optionally be included in scan calculations (checkbox in UI)
