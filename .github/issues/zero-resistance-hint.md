# Zero resistance should trigger "switch to modified" hint

**Labels:** enhancement

## Description
The smart hint that suggests switching to modified resistance mode should also trigger when resistance is set to 0 (zero), not just low values between 0 and 20.

## Current Behavior
- Hint only shows when resistance is between 0 (exclusive) and 20
- A resistance value of exactly 0 does not trigger the hint
- Current logic: `if (rock.resistance === 0 || rock.resistance >= 20) return false;`

## Expected Behavior
- Hint should show when resistance is 0 OR between 0 and 20 (exclusive of 20)
- A value of 0 with equipment modifiers likely indicates a modified scan
- Suggested logic: `if (rock.resistance >= 20) return false;`

## Technical Details
- **Location:** `src/App.tsx` lines 65-74
- **Current condition:** `rock.resistance === 0 || rock.resistance >= 20`
- **Proposed condition:** `rock.resistance >= 20`

## Rationale
When a user enters a resistance of 0, especially with equipment that has resistance modifiers, it's very likely they scanned with their laser equipped (modified mode). The hint should help guide them to select the correct mode.

## Fix
Change line 66 in `src/App.tsx` from:
```typescript
if (rock.resistance === 0 || rock.resistance >= 20) return false;
```
To:
```typescript
if (rock.resistance >= 20) return false;
```
