# Git Branching Workflow

## Branch Structure

- **`main`** - Production branch (stable, deployed to GitHub Pages)
- **`dev`** - Development branch (for ongoing work and testing)
- **`feature/*`** - Feature branches (for specific features or fixes)

## Workflow

### 1. Starting New Work

Always create a new feature branch from `dev`:

```bash
# Make sure you're on dev and it's up to date
git checkout dev
git pull origin dev

# Create a new feature branch
git checkout -b feature/your-feature-name
```

### 2. Working on a Feature

```bash
# Make your changes to code
# Test in dev mode: npm run dev

# Stage and commit your changes
git add .
git commit -m "Description of changes"

# Push feature branch to GitHub
git push -u origin feature/your-feature-name
```

### 3. Creating Pull Requests

When your feature is ready, create a PR to `dev`:

```bash
# Push your feature branch to GitHub
git push -u origin feature/your-feature-name

# Create PR targeting dev (IMPORTANT: always specify --base dev)
gh pr create --base dev --title "feat: Your feature description (#issue)" --body "Description here. Fixes #issue"
```

**IMPORTANT:** Always include `--base dev` when creating PRs!
- Without `--base dev`, PRs default to `main` (dangerous!)
- If you forget, fix it with: `gh pr edit <PR#> --base dev`

**PR Checklist:**
- [ ] Target branch is `dev` (not `main`)
- [ ] Title includes issue number
- [ ] Body includes `Fixes #<issue>` to auto-close the issue

### 4. Merging to Dev for Testing

After PR review and approval:

```bash
# Merge PR via GitHub UI or CLI
gh pr merge <PR#>

# Or manually merge and push
git checkout dev
git merge feature/your-feature-name
git push origin dev

# Test thoroughly in dev mode
npm run dev
```

### 5. Merging to Main (Production)

Only when dev is stable and tested:

```bash
# Switch to main
git checkout main

# Merge dev into main
git merge dev

# Bump version (see Versioning section below)
npm version patch  # or minor/major depending on changes

# Push to main with tags
git push origin main --tags

# Build and deploy to GitHub Pages
npm run deploy
```

### 6. Cleaning Up

After merging to main, delete the feature branch:

```bash
# Delete local branch
git branch -d feature/your-feature-name

# Delete remote branch
git push origin --delete feature/your-feature-name
```

## Quick Reference Commands

```bash
# See all branches
git branch -a

# See current branch
git branch --show-current

# Switch branches
git checkout <branch-name>

# Create and switch to new branch
git checkout -b <branch-name>

# Update current branch from remote
git pull

# See status
git status

# See commit history
git log --oneline -10
```

## Versioning

This project uses **Semantic Versioning (SemVer)**: `MAJOR.MINOR.PATCH`

### Version Number Guidelines

- **PATCH** (x.x.1) - Bug fixes, small tweaks, typo corrections
  - Example: Fixing a calculation error, fixing display issues
  - Command: `npm version patch`

- **MINOR** (x.1.x) - New features (backwards compatible)
  - Example: Adding resistance mode, new ship support, new UI features
  - Command: `npm version minor`

- **MAJOR** (1.x.x) - Breaking changes, major rewrites
  - Example: Complete UI redesign, changing how data is stored
  - Command: `npm version major`

### When to Version

**Always bump the version when merging to main** (Step 4 above). The `npm version` command:
1. Updates the version in `package.json`
2. Creates a git commit with the version change
3. Creates a git tag (e.g., `v1.1.0`)

### Version Examples

```bash
# Bug fix: 1.0.0 → 1.0.1
npm version patch

# New feature: 1.0.1 → 1.1.0
npm version minor

# Breaking change: 1.1.0 → 2.0.0
npm version major
```

### Viewing Version History

```bash
# See all version tags
git tag

# See latest tag
git describe --tags

# See tags with dates
git log --tags --simplify-by-decoration --pretty="format:%ai %d"
```

### Release Notes

Keep track of changes for each version in a simple format. After bumping version and before deploying:

1. **Create or update CHANGELOG.md** in the project root
2. **Add an entry** with the version number and date
3. **List changes** in simple categories

**CHANGELOG.md Format:**

```markdown
# Changelog

## [1.1.0] - 2024-11-30

### Added
- Resistance mode selector (base vs modified resistance)
- Auto-detection for single-laser ships in modified mode
- Smart hints when low resistance detected

### Fixed
- Ship label truncation on long names
- Sensor icon glow rendering

### Changed
- Reduced header height by 15%
- Reformatted resistance controls for better sidebar layout

## [1.0.1] - 2024-11-20

### Fixed
- Calculation error in multi-ship mode
- Display bug with GOLEM laser configuration
```

**Simple Categories:**
- **Added** - New features
- **Fixed** - Bug fixes
- **Changed** - Changes to existing features
- **Removed** - Removed features

**Optional: GitHub Releases**

After pushing tags, you can create a release on GitHub:
1. Go to your repository on GitHub
2. Click "Releases" → "Draft a new release"
3. Select your version tag (e.g., `v1.1.0`)
4. Copy the relevant section from CHANGELOG.md
5. Publish release

This gives users a nice web page to see what's new and download specific versions.

## Best Practices

1. **Never commit directly to `main`** - Always work in `dev` or feature branches
2. **Keep commits focused** - One logical change per commit
3. **Write clear commit messages** - Describe what and why
4. **Test before merging** - Always test in dev mode before merging
5. **Pull before pushing** - Always `git pull` before `git push` to avoid conflicts
6. **Deploy only from main** - Only run `npm run deploy` when on the `main` branch
7. **Version every release** - Bump version when merging to main (use `npm version`)

## Current Branch

You are currently on: **`dev`**

This is your working branch. Create feature branches from here for new work.
