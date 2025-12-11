---
paths: src/**/*.test.ts, src/**/*.spec.ts
---

# Testing Rules

## Framework
- **Vitest** for unit testing
- Run with `npm test` (watch mode) or `npm run test:run` (single run)

## Test Organization
- Co-locate test files with source: `calculator.test.ts` next to `calculator.ts`
- Group related tests with `describe` blocks
- Use clear, descriptive test names

```typescript
describe('calculateLaserPower', () => {
  it('should add module percentages before multiplying', () => {
    // Test implementation
  });

  it('should return 0 when no laser head is configured', () => {
    // Test implementation
  });
});
```

## What to Test
- **Calculator functions**: All power/resistance calculations
- **Edge cases**: Zero values, null inputs, maximum values
- **Formula accuracy**: Verify stacking behavior matches game mechanics

## Test Patterns
```typescript
// Arrange
const laser: LaserConfiguration = { /* setup */ };

// Act
const result = calculateLaserPower(laser);

// Assert
expect(result).toBe(expectedValue);
```

## Running Tests
```bash
npm test          # Watch mode - rerun on changes
npm run test:run  # Single run - for CI/pre-commit
npm run test:ui   # Visual UI dashboard
```

## Before Committing
- All tests must pass
- Add tests for new calculation logic
- Update existing tests if behavior changes intentionally
