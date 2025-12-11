# Git Safety Rules

## CRITICAL: Main Branch Protection

**NEVER commit or push directly to `main` without EXPLICIT user permission.**

This rule applies to:
- Direct commits to main
- Direct pushes to main
- Force pushes to main
- Any operation that modifies main without a PR

### If Asked to Commit to Main

1. **STOP** - Do not proceed
2. **Explain** - "Committing directly to main bypasses our PR review process"
3. **Suggest Alternative** - "Let's create a branch and PR instead"
4. **Require Explicit Override** - Only proceed if user types "yes, commit to main"

### Correct Workflow

```
feature/fix branch → PR to dev → PR to main (releases only)
```

## Version Control Partner

**Always use `/vc` (Victor) for git operations.** Victor enforces:
- Issue-based workflow
- Branch naming conventions
- Semantic versioning
- PR workflow
- Co-author attribution

## Protected Operations

These operations require explicit user confirmation:
- `git push origin main`
- `git commit` while on main branch
- `git merge` into main
- `git push --force` (any branch)
- Deleting branches without merge verification

## Safe Operations

These can proceed without extra confirmation:
- Creating feature/fix branches
- Committing to feature/fix branches
- Pushing feature/fix branches
- Creating PRs to dev
- Pulling from any branch

## When in Doubt

Ask the user before any git operation that could:
- Modify the main branch
- Lose commit history
- Affect other developers
- Skip the review process
