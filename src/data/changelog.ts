/**
 * Rock Breaker Calculator changelog — update this file with each release to main.
 *
 * Adding a new release:
 *   1. Add a new entry at the TOP of the array (newest first)
 *   2. Set version to match package.json
 *   3. Set date to the release date (YYYY-MM-DD)
 *   4. Add bullets under new / improved / fixed (omit empty categories)
 */

export interface ChangelogEntry {
  version: string;
  date: string;
  new?: string[];
  improved?: string[];
  fixed?: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '2.27.0',
    date: '2026-02-27',
    new: [
      'Import saved ship loadouts from Regolith — auto-populates lasers, modules, and saves to Ship Library',
      'Regolith icon on import buttons for quick recognition',
    ],
    improved: [
      'Collapsible panels scroll into view when expanded',
    ],
  },
  {
    version: '2.26.0',
    date: '2026-02-27',
    new: [
      'Swipe-to-close gesture on mobile drawers (rock properties, gadgets, results)',
    ],
  },
  {
    version: '2.25.0',
    date: '2026-02-26',
    new: [
      'Add Ship choice dialog with Ship Library, Regolith import, and manual options',
      'Save & Remove option when removing ships from a mining group',
      'File System Access API for import/export on supported browsers',
    ],
    improved: [
      'All native browser dialogs replaced with themed modals for consistent look',
    ],
  },
  {
    version: '2.23.0',
    date: '2026-02-26',
    improved: [
      'Rock "Name" field renamed to "Type" for clarity — existing data migrated automatically',
    ],
  },
  {
    version: '2.22.0',
    date: '2026-02-26',
    improved: [
      'Laser setup panel collapses automatically after saving a ship',
    ],
  },
  {
    version: '2.21.0',
    date: '2026-02-25',
    new: [
      'Instability Base/Modified back-calculation — same scan mode toggle as resistance',
      'Multi-ship instability penalty display (doubles per additional ship)',
    ],
  },
  {
    version: '2.20.0',
    date: '2026-02-24',
    new: [
      'Multi-session selector for Regolith rock import — pick from recent mining sessions',
    ],
    improved: [
      'Regolith setup flow polished — Integrations renamed to Connections, improved text and layout',
    ],
  },
  {
    version: '2.19.0',
    date: '2026-02-24',
    improved: [
      'Regolith setup UX improvements and Connections page polish',
    ],
  },
  {
    version: '2.18.1',
    date: '2026-02-23',
    fixed: [
      'Regolith session ID query parameter type corrected for API compatibility',
      'OAuth redirect now preserves /beta/ path for beta site users',
    ],
  },
  {
    version: '2.18.0',
    date: '2026-02-23',
    new: [
      'Import rock scans directly from Regolith.rocks — mass, resistance, instability, and ore composition in one click',
      'Regolith API key management in Profile → Integrations (stored locally or in your BreakIt account)',
      'Rock scan data (including ore percentages) contributed anonymously to global mining analytics',
    ],
    improved: [
      'Abandoned and depleted finds are filtered out of the import list automatically',
    ],
    fixed: [
      'Instability field now correctly accepts 0 as a valid entry',
    ],
  },
  {
    version: '2.17.0',
    date: '2026-02-23',
    new: [
      'Clickable version tag in the header opens a What\'s New modal showing recent updates',
    ],
  },
  {
    version: '2.16.0',
    date: '2026-02-15',
    new: [
      'RSI community logo links to the Rock Breaker Calculator community page',
    ],
  },
  {
    version: '2.15.0',
    date: '2026-01-20',
    new: [
      'Save ship configurations with custom names for quick recall',
    ],
    improved: [
      'Ship names are preserved when switching between saved configurations',
      'Laser setup panel opens automatically after loading a saved config',
    ],
  },
  {
    version: '2.14.0',
    date: '2026-01-10',
    new: [
      'Fourth rock slot for tracking multiple scan targets per session',
    ],
    improved: [
      'Desktop view uses labeled text buttons for clearer navigation',
      'Mobile hint shown when tapping the ship name to switch ships',
    ],
  },
  {
    version: '2.0.0',
    date: '2025-12-01',
    new: [
      'Full mobile and tablet layout — BreakIt now works in the field',
      'Multi-ship mining group support (up to 4 ships)',
      'Gadgets panel with In Scan toggle for accurate resistance reverse-calculation',
    ],
    improved: [
      'Resistance mode selector (Base vs Modified scan) with contextual hints',
    ],
  },
];
