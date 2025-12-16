---
paths: src/components/**/*.tsx
---

# React Component Rules

## Structure
- Use functional components with hooks - no class components
- Define Props interface directly above the component
- Export component as default at the bottom of the file

```tsx
interface MyComponentProps {
  value: number;
  onChange: (value: number) => void;
}

function MyComponent({ value, onChange }: MyComponentProps) {
  // Component logic
}

export default MyComponent;
```

## State Management
- Use `useState` for local component state
- Use `useMemo` for expensive calculations
- Use `useEffect` sparingly - prefer derived state where possible
- Avoid prop drilling - consider lifting state to App.tsx

## Styling
- Component styles can go in `App.css` (global styles) or in component-specific CSS files (e.g., `LaserPanel.css`, `ResultDisplay.css`, `ConfigManager.css`)
- Use descriptive class names: `.laser-panel`, `.result-display`
- Star Citizen theme: dark backgrounds, cyan/orange accents

## Component Responsibilities
- **LaserPanel**: Laser head and module selection for 1-3 lasers
- **ResultDisplay**: Power visualization and breakability status
- **ShipSelector**: Ship selection grid
- **RockInput**: Mass and resistance input
- **ConfigManager**: Save/load configurations
- **ShipPoolManager**: Multi-ship group management
- **GadgetSelector**: Consumable gadget selection

## Imports
- Import types from `../types`
- Import utilities from `../utils/`
- Import assets with proper file extensions
