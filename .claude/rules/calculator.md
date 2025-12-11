---
paths: src/utils/calculator.ts, src/utils/calculator.test.ts
---

# Calculator Logic Rules

## Core Formulas

### Power Calculation
Module percentages ADD, then MULTIPLY by base power:
```typescript
// Two +35% modules = 1.70 multiplier
const moduleSum = 0.35 + 0.35; // = 0.70
const multiplier = 1 + moduleSum; // = 1.70
const power = basePower * multiplier; // 3600 * 1.70 = 6120
```

### Resistance Calculation
Resistance stacking has TWO levels:

**Level 1 - Within a single laser** (modules on one laser):
Module resistance percentages ADD, then MULTIPLY by laser head modifier:
```typescript
// Laser (0.7x) + Module (+15%) + Module (+15%)
const moduleSum = 0.15 + 0.15; // = 0.30
const moduleMultiplier = 1 + moduleSum; // = 1.30
const combinedModifier = 0.7 * moduleMultiplier; // = 0.91
```

**Level 2 - Across multiple lasers** (ship-to-ship or laser-to-laser):
Laser resistance modifiers MULTIPLY together:
```typescript
// Two lasers with 0.90 modifiers = 0.81 (not 0.80!)
const totalModifier = 0.90 * 0.90; // = 0.81
const effectiveResistance = baseResistance * totalModifier;
```

### Power Needed
```typescript
const powerNeeded = mass * effectiveResistance;
```

### Breakability Margin
```typescript
const powerMargin = (totalPower - powerNeeded) / powerNeeded;
// >= 0%: CAN BREAK
// -15% to 0%: POSSIBLE BREAK
// < -15%: CANNOT BREAK
```

## Modified Resistance Mode
When user scans with laser equipped (modified mode):
1. Reverse-calculate base resistance: `base = modified / laserModifier`
2. Apply all equipment modifiers to derived base
3. If gadgets were "In Scan", include gadget modifier in reversal

## Testing Requirements
- Every formula change MUST have corresponding test
- Test edge cases: zero values, maximum values
- Verify against in-game testing when possible
- Use descriptive test names explaining the scenario

## Data Accuracy
- Equipment stats from Star Citizen v4.3.1
- Source: Community mining spreadsheets + in-game verification
- Update `src/types/index.ts` when game patches change values
