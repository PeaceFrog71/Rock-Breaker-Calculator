import type { Rock } from '../types';

// Default rock values per save slot (slot 0-3)
// Slot 1: large rock, Slot 2: medium, Slot 3: small, Slot 4: very small
export const DEFAULT_ROCKS: Rock[] = [
  { mass: 50000, resistance: 25, instability: 50, type: "", resistanceMode: 'base', includeGadgetsInScan: false },
  { mass: 30000, resistance: 25, instability: 50, type: "", resistanceMode: 'base', includeGadgetsInScan: false },
  { mass: 10000, resistance: 25, instability: 50, type: "", resistanceMode: 'base', includeGadgetsInScan: false },
  { mass: 5000, resistance: 25, instability: 50, type: "", resistanceMode: 'base', includeGadgetsInScan: false },
];

/**
 * Safely parse and clamp an active slot index from localStorage.
 * Returns 0 if the value is missing, NaN, negative, or out of range.
 */
export function parseActiveSlotIndex(raw: string | null): number {
  if (raw === null) return 0;
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed >= DEFAULT_ROCKS.length) {
    return 0;
  }
  return parsed;
}

/**
 * Load rock data from localStorage for the active slot.
 * Falls back to per-slot default if slot data is missing or corrupted.
 */
export function loadRockFromStorage(): Rock {
  try {
    const savedSlots = localStorage.getItem('rockbreaker-rock-slots');
    const savedActiveSlot = localStorage.getItem('rockbreaker-active-rock-slot');
    const activeIndex = parseActiveSlotIndex(savedActiveSlot);

    if (savedSlots) {
      const slots = JSON.parse(savedSlots);
      if (slots[activeIndex]) {
        const slot = slots[activeIndex];
        // Migrate legacy "name" field to "type" (#236)
        if (slot && typeof slot === 'object' && 'name' in slot && !('type' in slot)) {
          const { name, ...rest } = slot;
          return { ...rest, type: name };
        }
        return { ...slot };
      }
    }
    return { ...DEFAULT_ROCKS[activeIndex] };
  } catch {
    return { ...DEFAULT_ROCKS[0] };
  }
}
