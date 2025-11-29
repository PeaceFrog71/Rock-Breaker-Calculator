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

### 3. Merging to Dev for Testing

When your feature is ready for broader testing:

```bash
# Switch to dev branch
git checkout dev

# Merge your feature
git merge feature/your-feature-name

# Push to GitHub
git push origin dev

# Test thoroughly in dev mode
npm run dev
```

### 4. Merging to Main (Production)

Only when dev is stable and tested:

```bash
# Switch to main
git checkout main

# Merge dev into main
git merge dev

# Push to main
git push origin main

# Build and deploy to GitHub Pages
npm run deploy
```

### 5. Cleaning Up

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

## Best Practices

1. **Never commit directly to `main`** - Always work in `dev` or feature branches
2. **Keep commits focused** - One logical change per commit
3. **Write clear commit messages** - Describe what and why
4. **Test before merging** - Always test in dev mode before merging
5. **Pull before pushing** - Always `git pull` before `git push` to avoid conflicts
6. **Deploy only from main** - Only run `npm run deploy` when on the `main` branch

## Current Branch

You are currently on: **`dev`**

This is your working branch. Create feature branches from here for new work.
