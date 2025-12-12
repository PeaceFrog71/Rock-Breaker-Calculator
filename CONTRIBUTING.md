# Contributing to BreakIt Calculator

Thank you for contributing to the BreakIt Calculator!

## Quick Start

1. **Create an issue first** - All work must tie to a GitHub issue
2. **Branch from `dev`** - Never branch directly from `main`
3. **Follow branch naming** - `feat/<issue#>-description`, `fix/<issue#>-description`, or `chore/<issue#>-description`
4. **PR to `dev`** - All PRs target `dev`, not `main`

## Git Workflow

See [BRANCHING_WORKFLOW.md](./BRANCHING_WORKFLOW.md) for the complete workflow documentation.

### Branch Naming Convention

| Type | Pattern | Example |
|------|---------|---------|
| Feature | `feat/<issue#>-<description>` | `feat/42-dark-mode` |
| Bug Fix | `fix/<issue#>-<description>` | `fix/15-calculation-error` |
| Chore | `chore/<issue#>-<description>` | `chore/70-update-docs` |

### Pull Request Workflow

```
feature branch → PR to dev → dev → PR to main (release)
```

**Important:** When creating PRs with the GitHub CLI, always specify the base branch:

```bash
gh pr create --base dev --title "Your PR title" --body "Description"
```

If you forget `--base dev`, the PR will default to `main`. You can fix it with:

```bash
gh pr edit <PR#> --base dev
```

### Commit Messages

- Reference the issue number: `Fix resistance calculation (#14)`
- Include co-author attribution for AI-assisted work:
  ```
  Co-Authored-By: Claude <noreply@anthropic.com>
  ```

## Code Standards

- Run `npm run build` before committing to catch TypeScript errors
- Test changes locally with `npm run dev`
- Keep commits focused - one logical change per commit

## Questions?

Open an issue or check the existing documentation in this repository.
