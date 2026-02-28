---
paths:
  - src/**/*.test.ts
  - src/**/*.spec.ts
---

# Testing Rules

**Testing Director**: Use `/tess` for test coverage design, reviews, and standards enforcement.

## Framework

- **Vitest** for unit testing
- Run with `npm test` (watch mode) or `npm run test:run` (single run)

## Testing Priority Pyramid

**MUST test** — calculation accuracy = user trust:

- Calculator formulas (power, resistance, instability, breakability)
- Stacking logic (additive vs multiplicative)
- Edge cases (zero values, max resistance cap, null equipment)
- Multi-ship group calculations
- Data transformations (Regolith mapping, resistance mode conversions)

**SHOULD test** — data integrity + integrations:

- API integration functions with mocked externals (Supabase, fetch)
- Encryption/decryption round-trips
- Storage helpers (localStorage interactions)
- State management helpers (module toggle, ship defaults)

**CONDITIONAL** — only when design specifies strict I/O:

- React components where design specifies exact inputs, outputs, or behavior
- Hooks where design calls for specific side effects

**DON'T test** — low value, high maintenance:

- Static data objects (changelog, avatar maps, image configs)
- Simple pass-through props or render-only components
- CSS class assignment

> **Golden rule**: Every test should answer — what breaks if this fails?

## Standards

1. **Descriptive test names** — scenario-based, explain setup and expected outcome
2. **Arrange-Act-Assert** — every test follows this structure
3. **Factory helpers** — use factory functions with defaults and overrides, not inline literals
4. **Mock external boundaries only** — mock `fetch`, `localStorage`, Supabase; never mock internal pure functions
5. **Float comparisons** — use `toBeCloseTo()` for mining calculations
6. **Issue-linked regressions** — bug fix tests wrapped in `describe('Regression: Issue #X - ...')`
7. **Co-located files** — `calculator.test.ts` next to `calculator.ts`, grouped with `describe`
8. **Real equipment data** — use `LASER_HEADS.find()`, `MODULES.find()` from the database for integration tests

## Test Patterns

```typescript
// Arrange
const rock: Rock = { mass: 11187, resistance: 17 };
const config: MiningConfiguration = { lasers: [{ laserHead: null, modules: [null, null, null] }] };

// Act
const result = calculateBreakability(config, rock, [null, null, null]);

// Assert
expect(result.baseLPNeeded).toBeCloseTo(2695.6627, 2);
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
- Bug fixes MUST include a regression test referencing the issue
