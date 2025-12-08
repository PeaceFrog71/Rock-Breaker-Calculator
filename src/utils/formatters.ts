/**
 * Formatting Utilities
 *
 * Centralizes tooltip and effect formatting functions used across
 * LaserPanel, ResultDisplay, and App components.
 */

import type { Module, Gadget } from '../types';

/**
 * Format a number as a percentage string.
 * @param value - The modifier value (e.g., 1.15 for +15%, 0.85 for -15%)
 * @returns Formatted string like "+15%" or "-15%", or null if no effect
 *
 * @example
 * formatPct(1.15)  // → "+15%"
 * formatPct(0.85)  // → "-15%"
 * formatPct(1)     // → null (no effect)
 */
export function formatPct(value: number | undefined): string | null {
  if (value === undefined || value === 1) return null;
  return value > 1
    ? `+${Math.round((value - 1) * 100)}%`
    : `-${Math.round((1 - value) * 100)}%`;
}

/**
 * Format module effects for tooltip display.
 * Shows all stat modifiers for a module in a readable format.
 *
 * @example
 * formatModuleTooltip(surgeModule)
 * // → "Surge: Power: +35%, Resist: +15%, 60s/2 uses"
 */
export function formatModuleTooltip(module: Module): string {
  if (!module || module.id === 'none') return '';

  const effects: string[] = [];

  const addEffect = (value: number | undefined, label: string) => {
    const pct = formatPct(value);
    if (pct) effects.push(`${label}: ${pct}`);
  };

  addEffect(module.powerModifier, 'Power');
  addEffect(module.resistModifier, 'Resist');
  addEffect(module.instabilityModifier, 'Instability');
  addEffect(module.chargeWindowModifier, 'Window');
  addEffect(module.chargeRateModifier, 'Rate');
  addEffect(module.overchargeRateModifier, 'Overcharge');
  addEffect(module.shatterDamageModifier, 'Shatter');
  addEffect(module.extractionPowerModifier, 'Extraction');
  addEffect(module.inertMaterialsModifier, 'Inert');
  addEffect(module.clusterModifier, 'Cluster');

  if (module.category === 'active' && module.duration) {
    effects.push(`${module.duration}/${module.uses} uses`);
  }

  if (effects.length === 0) return `${module.name}: No stat effects`;
  return `${module.name}: ${effects.join(', ')}`;
}

/**
 * Format gadget effects for tooltip display.
 * Shows all stat modifiers for a gadget in a readable format.
 *
 * @example
 * formatGadgetTooltip(optimaxGadget)
 * // → "Optimax: Resist: -30%, Instability: +15%"
 */
export function formatGadgetTooltip(gadget: Gadget | null): string {
  if (!gadget || gadget.id === 'none') return '';

  const effects: string[] = [];

  const addEffect = (value: number | undefined, label: string) => {
    const pct = formatPct(value);
    if (pct) effects.push(`${label}: ${pct}`);
  };

  addEffect(gadget.resistModifier, 'Resist');
  addEffect(gadget.instabilityModifier, 'Instability');
  addEffect(gadget.chargeWindowModifier, 'Window');
  addEffect(gadget.chargeRateModifier, 'Rate');
  addEffect(gadget.clusterModifier, 'Cluster');

  if (effects.length === 0) return `${gadget.name}: No stat effects`;
  return `${gadget.name}: ${effects.join(', ')}`;
}

/**
 * Gadget effect with display metadata
 */
export interface GadgetEffect {
  label: string;
  pct: string;
  isPositive: boolean;
}

/**
 * Get gadget effects as an array for UI display.
 * Includes whether each effect is positive or negative for styling.
 *
 * @example
 * getGadgetEffects(optimaxGadget)
 * // → [
 * //     { label: 'Resist', pct: '-30%', isPositive: true },
 * //     { label: 'Instability', pct: '+15%', isPositive: false }
 * //   ]
 *
 * Note: For Resist and Instability, LOWER is better (so negative % is positive)
 */
export function getGadgetEffects(gadget: Gadget | null): GadgetEffect[] {
  if (!gadget || gadget.id === 'none') return [];

  const effects: GadgetEffect[] = [];

  const addEffect = (value: number | undefined, label: string) => {
    if (value === undefined || value === 1) return;

    const pct = value > 1
      ? `+${Math.round((value - 1) * 100)}%`
      : `-${Math.round((1 - value) * 100)}%`;

    // For Resist and Instability, lower is better
    const lowerIsBetter = label === 'Resist' || label === 'Instability';
    const isPositive = lowerIsBetter ? value < 1 : value > 1;

    effects.push({ label, pct, isPositive });
  };

  addEffect(gadget.resistModifier, 'Resist');
  addEffect(gadget.instabilityModifier, 'Instability');
  addEffect(gadget.chargeWindowModifier, 'Window');
  addEffect(gadget.chargeRateModifier, 'Rate');
  addEffect(gadget.clusterModifier, 'Cluster');

  return effects;
}
