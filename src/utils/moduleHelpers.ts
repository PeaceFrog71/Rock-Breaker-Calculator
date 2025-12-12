import type { Module } from '../types';

/**
 * Updates the moduleActive array when toggling a module's active state.
 * Implements the stacking rules:
 * - Stackable modules (Surge) can run alongside any other active module
 * - Sustained modules (all others) are mutually exclusive - activating one deactivates others
 *
 * @param modules - Array of modules in the laser's slots
 * @param currentActive - Current active states for each module slot
 * @param moduleIndex - Index of the module being toggled
 * @returns Updated moduleActive array
 */
export function toggleModuleActive(
  modules: (Module | null)[],
  currentActive: boolean[],
  moduleIndex: number
): boolean[] {
  const targetModule = modules[moduleIndex];
  const isActivating = !currentActive[moduleIndex];

  const updatedActive = [...currentActive];

  // If activating a sustained module, deactivate other sustained modules (Surge can stack)
  if (isActivating && targetModule?.category === 'active' && targetModule.activationType === 'sustained') {
    modules.forEach((mod, idx) => {
      if (mod && mod.category === 'active' && mod.activationType === 'sustained' && idx !== moduleIndex) {
        updatedActive[idx] = false;
      }
    });
  }

  updatedActive[moduleIndex] = isActivating;

  return updatedActive;
}
