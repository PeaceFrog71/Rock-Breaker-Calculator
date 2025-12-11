---
description: Start work on a GitHub issue with proper branch setup
allowed-tools: Bash(git:*), Bash(gh:*)
---

# Start Work on Issue

You are helping Drew start work on a GitHub issue. This command integrates with Victor's workflow.

## Process

1. **Fetch the issue details**
   ```bash
   gh issue view $ARGUMENTS
   ```

2. **Determine branch type from issue labels/title**
   - `type: bug` or title contains "BUG" → `fix/`
   - `type: feature` or title contains "FEAT" → `feat/`
   - `type: chore` or title contains "CHORE" → `chore/`
   - Default to `feat/` if unclear

3. **Suggest branch name**
   Format: `<type>/<issue#>-<short-description>`
   - Use lowercase
   - Use hyphens for spaces
   - Keep description to 3-4 words max

4. **Create the branch via Victor**
   Use `/vc branch <suggested-name>` workflow

5. **Confirm setup**
   - Show issue title and description summary
   - Confirm branch is created and checked out
   - Remind about version bumping (Victor handles this on commit)

## Example

Input: `/issue 40`

Output:
```
Issue #40: BUG: Gadgets not in Modified Base calculation

Labels: type: bug, P2
Description: When using Modified resistance mode, gadgets marked "In Scan"
are not being included in the reverse calculation...

Suggested branch: fix/40-gadgets-modified-base-calc

Creating branch via Victor workflow...
```

## Notes

- Always ensure we're on `dev` before creating branch
- Pull latest changes before branching
- If issue doesn't exist, prompt to create it first (PFG rule: "If it's not in an issue, it doesn't exist")

User request: Start work on issue $ARGUMENTS
