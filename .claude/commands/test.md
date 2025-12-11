---
description: Run tests and fix any failures
allowed-tools: Bash(npm test:*), Bash(npm run test:*)
---

# Run Tests

Run the test suite and help fix any failures.

## Process

1. **Run tests once**
   ```bash
   npm run test:run
   ```

2. **Analyze results**
   - If all pass: Report success with summary
   - If failures: List each failing test with details

3. **For failures, offer to fix**
   - Read the failing test to understand expected behavior
   - Read the source code being tested
   - Determine if it's a test bug or implementation bug
   - Propose a fix

## Output Format

### On Success
```
All tests passed!

Summary:
- 32 tests in 1 file
- Calculator functions: 30 passed
- Formatter functions: 2 passed
```

### On Failure
```
Test Failures Found: 2

1. calculateLaserPower > should handle null modules
   Expected: 3600
   Received: NaN
   File: src/utils/calculator.test.ts:45

2. deriveBaseResistance > should handle zero modifier
   Expected: 30
   Received: Infinity
   File: src/utils/calculator.test.ts:78

Would you like me to investigate and fix these?
```

## Notes

- Tests must pass before committing (Victor will check)
- If fixing tests, ensure the fix matches intended game behavior
- Add new tests when adding calculation logic

User request: $ARGUMENTS
