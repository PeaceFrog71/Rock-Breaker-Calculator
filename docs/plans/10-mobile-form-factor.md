# Mobile Form Factor Implementation (Issue #10)

## Summary
Design and implement a mobile-responsive version of the BreakIt Calculator app.

## User Requirements (Gathered)

### Use Case
- Both quick reference (while mining) AND full configuration needed
- Multi-ship/full configs may be limited on mobile to avoid clutter
- Must not become cumbersome to use

### Visual Approach
- **Toggle between modes**: Full graphics vs Lite mode
- New mobile-specific visualization: **Vertical bar chart with rock on top**
- Graphics need to be parsed down/simplified for mobile

### Navigation Pattern
- **Hybrid approach**:
  - Modals for ship configuration (click ship → modal opens)
  - Wizard flow for new ship creation
  - Some scrolling acceptable for details
  - Most key info visible by default without scrolling

### Target Devices
- Modern mobile phones (iPhone, Samsung - last 3-4 years)
- No need to support older/budget devices

### Scope
- **MVP first** with expandability toward comprehensive redesign

---

## Current State Analysis

### Layout Constraints (CRITICAL BLOCKERS)
- **600px min-width** on ResultDisplay - forces horizontal scroll on all phones
- 3-column grid (200px | flex | 200px) doesn't collapse on mobile
- Max content width: 1190px, padding: 2rem
- Existing breakpoints (1050px, 768px, 480px) only adjust fonts, not layout

### Visual Complexity
- Large assets: 945KB asteroid, 2.2MB landscape, 2MB logo
- 24 CSS animations (5-15 running simultaneously)
- Heavy filter usage (drop-shadows, brightness, blur)
- Complex 800x800 virtual coordinate system for laser positioning
- No canvas/SVG - all HTML divs with CSS transforms

### Component Space Usage (ranked)
1. **LaserPanel** - 1200-1500px for 3 lasers (HIGHEST priority)
2. **ShipPoolManager** - ~700px with 4 ships
3. **ConfigManager** - ~400px (already scrollable)
4. **RockInput** - ~200px (already compact)
5. **ShipSelector** - ~200-300px (already responsive grid)

---

## Brainstorming Notes (From Discussion)

### Mobile Visualization Concept: "Thermometer Style"
- Vertical bar like a thermometer
- 100% = breakability threshold (goal)
- Color gradient: Red (low) → Green (approaching/at breakability)
- Rock icon on top - **maybe cracks at 100%** (fun idea!)
- Consider: Add lower breakability scale feature (Issue #38) before mobile push?

### Ship Interaction on Mobile
- 1-4 ship icons along top or side of screen
- **Tap** = enable/disable ship
- **Long tap** (or gesture) = open config modal
- Config modal contains:
  - Laser head selection
  - Module selection
  - Manned/unmanned toggle for Mole seats
- Ship icons should be small but recognizable

### Gadgets on Mobile
- Gadgets should be available
- Scanning sensors for entering base resistance
- Possible: Separate base resistance calculator?

### MVP Scope (Confirmed)
- **Single ship only** for MVP
- Multi-ship (up to 4) added later
- Save/load for single ship configs (local storage on phone)
- No cross-device sync yet

---

## Proposed MVP Approach (Draft)

### Phase 1: Make It Work (Remove Blockers)
- Remove 600px min-width constraint for mobile
- Add mobile detection (viewport < 768px)
- Stack 3-column layout into single column on mobile

### Phase 2: Simplify ResultDisplay for Mobile
- Create MobileResultDisplay component (or conditional rendering)
- New visualization: Vertical power bar with rock icon
- Status-based coloring (green/orange/red)
- Essential stats in compact cards

### Phase 3: Reorganize Inputs
- Ship selection → Compact header or modal
- Laser configuration → Accordion or modal per laser
- Rock input → Always visible, compact form
- Gadgets → Collapsible section or modal

### Phase 4: Navigation
- Bottom tab bar or hamburger menu
- Quick access to: Results | Ship Config | Rock Input
- Modal system for detailed configuration

---

## Files to Modify (Estimated)

### Core Layout
- `src/App.tsx` - Mobile layout detection and structure
- `src/App.css` - Mobile breakpoints, single-column layout

### New Components (potentially)
- `src/components/MobileResultDisplay.tsx` - Simplified mobile visualization
- `src/components/MobileResultDisplay.css`
- `src/components/MobileNav.tsx` - Mobile navigation component

### Existing Component Updates
- `src/components/ResultDisplay.tsx` - Add mobile conditional or extract shared logic
- `src/components/ResultDisplay.css` - Remove min-width, add mobile styles
- `src/components/LaserPanel.tsx` - Collapsible/accordion for mobile
- `src/components/LaserPanel.css` - Mobile-specific styling
- `src/components/ShipSelector.tsx` - Compact mobile mode
- `src/components/RockInput.tsx` - Mobile layout adjustments

---

## Final MVP Implementation Plan

### Milestone 1: Foundation (Remove Blockers)
**Files:** `App.tsx`, `App.css`, `ResultDisplay.css`

1. Add mobile detection hook (`useIsMobile`) with 768px breakpoint
2. Remove 600px min-width constraint from ResultDisplay (mobile only)
3. Create mobile-specific CSS class structure
4. Stack 3-column layout into single column for mobile

### Milestone 2: Mobile Result Display
**Files:** New `MobileResultDisplay.tsx`, `MobileResultDisplay.css`

1. Create thermometer-style vertical power bar component
   - Height represents power % toward breakability (100% = goal)
   - Color gradient: Red (low) → Orange (medium) → Green (near/at break)
   - Animated fill based on current power output
2. Rock icon at top of thermometer
   - Static rock image (simplified from desktop)
   - Crack animation when reaching 100% breakability
3. Essential stats display below bar:
   - Current power output
   - Breakability threshold
   - Status indicator (Safe/Caution/Breaking)
   - Optimal power range (if applicable)

### Milestone 3: Mobile Ship Configuration
**Files:** New `MobileShipConfig.tsx`, updates to `ShipSelector.tsx`, `LaserPanel.tsx`

1. Ship icon bar (horizontal, top of screen)
   - Single ship for MVP (expandable to 4 later)
   - Tap = toggle enabled/disabled
   - Long-press = open config modal
2. Ship config modal
   - Laser head dropdown
   - Module selection grid
   - Manned/unmanned toggle (for Mole seats)
   - Save button

### Milestone 4: Mobile Input Layout
**Files:** `RockInput.tsx`, new `MobileGadgets.tsx`

1. Rock input section (always visible, compact)
   - Mass slider or input
   - Resistance slider or input
2. Gadgets section (collapsible accordion)
   - Same functionality as desktop
   - Compact display

### Milestone 5: Navigation & Polish
**Files:** New `MobileNav.tsx`, `App.tsx`

1. Simple tab bar or toggle for:
   - Results view (thermometer + stats)
   - Configuration view (ship + rock + gadgets)
2. Smooth transitions between views
3. Touch-friendly tap targets (min 44px)

---

## Dependency Note

Consider implementing **Issue #38** (lower breakability scale) before mobile, as the thermometer visualization would benefit from showing both upper and lower thresholds.

---

## Status: READY FOR IMPLEMENTATION

User requirements gathered. MVP scope confirmed: single ship, thermometer visualization, modal-based config, local save/load.
