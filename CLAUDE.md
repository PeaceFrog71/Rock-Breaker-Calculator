# BreakIt Calculator - Project Memory

This document provides Claude with persistent context about the BreakIt Calculator project.

## Project Overview

**BreakIt Calculator** is a Star Citizen mining power calculator that helps miners determine if they can break asteroids with their current equipment configuration.

- **Version**: See `package.json` for current version
- **Tech Stack**: React 19 + TypeScript + Vite
- **Repository**: PeaceFrog71/BreakIt-Calculator

## Deployment

### Sites
| Site | URL | Branch | Deploy Method |
|------|-----|--------|---------------|
| **Main (Production)** | https://rockbreaker.peacefroggaming.com | `main` | GitHub Actions |
| **Beta (Testing)** | https://rockbreaker.peacefroggaming.com/beta/ | `beta` | GitHub Actions |

### How Deployment Works
- **GitHub Actions** (`.github/workflows/deploy.yml`) handles all deployments
- Triggers automatically on push to `main` or `beta` branches
- Builds both sites and deploys to GitHub Pages
- Beta is built with `/beta/` base path and served as subdirectory

### Workflow
1. **Development**: Work on feature branches, merge to `dev`
2. **Beta Testing**: Merge `dev` → `beta`, auto-deploys to beta site
3. **Production Release**: Merge `dev` → `main`, auto-deploys to main site

### Manual Deploy (if needed)
```bash
npm run deploy   # Deploys current branch to gh-pages (legacy method)
```
Note: Prefer using GitHub Actions by pushing to main/beta branches

## Quick Commands

```bash
npm run dev      # Start dev server (port 5173)
npm run build    # TypeScript check + Vite build
npm run test     # Run Vitest in watch mode
npm run test:run # Run tests once
npm run lint     # ESLint check
npm run deploy   # Build and deploy to GitHub Pages
```

## Architecture

### Directory Structure
```
src/
├── components/     # React components (LaserPanel, ResultDisplay, etc.)
├── types/          # TypeScript types + equipment database
├── utils/          # Calculation engine, formatters, helpers
├── assets/         # Ship images, animations
├── App.tsx         # Main application component
└── App.css         # Styling
```

### Key Files
- `src/types/index.ts` - Equipment database (lasers, modules, gadgets, ships)
- `src/utils/calculator.ts` - Core mining calculation formulas
- `src/utils/calculator.test.ts` - Unit tests for calculations

### Supported Ships
1. **MISC Prospector** - 1 laser, Size 1
2. **Argo MOLE** - 3 lasers, Size 2
3. **Drake GOLEM** - 1 laser, Size 1 (fixed equipment)

## Calculation Logic

### Power Stacking
- Module power percentages **ADD** together (e.g., two +35% = +70%)
- Combined modifier is then **MULTIPLIED** by laser base power
- Example: 3600 power × 1.70 modifier = 6120 power

### Resistance Stacking
- Resistance modifiers **MULTIPLY** together
- Example: 0.90 × 0.90 = 0.81 (not 0.80)

### Breakability Formula
```
powerMargin = (totalPower - powerNeeded) / powerNeeded
```
- **CAN BREAK**: margin >= 20%
- **LOW MARGIN BREAK (marginal)**: 0% <= margin < 20%
- **POSSIBLE BREAK**: -15% <= margin < 0%
- **CANNOT BREAK**: margin < -15%

## Version Control

**CRITICAL**: Always use `/vc` (Victor) for all git operations. Victor enforces:
- Issue-based workflow ("If it's not in an issue, it doesn't exist")
- Branch naming: `feat/<issue#>-<desc>`, `fix/<issue#>-<desc>`, `chore/<issue#>-<desc>`
- Semantic versioning (patch for fixes, minor for features)
- PR workflow: feature → dev → main
- **NEVER push directly to main**

See `.claude/commands/vc.md` for full Victor documentation.

## Git Learning Mode

**Note**: This section complements Victor (above). Victor enforces *workflow rules* (issue-based workflow, branch naming, PR process). Learning Mode governs *how Claude teaches* - Drew runs commands himself while Claude explains.

**IMPORTANT**: Guide Drew through git commands rather than executing them directly.

When git operations are needed:
1. **Explain** what command is needed and why
2. **Show** the exact command to run
3. **Wait** for Drew to run it (or confirm he wants Claude to run it)
4. **Explain** the output if needed

This applies to:
- All git commands (status, add, commit, push, pull, branch, checkout, merge, etc.)
- GitHub CLI commands (gh pr create, gh issue, etc.)

**Exception**: If Drew explicitly says "just do it" or "run it for me", proceed with execution.

This is a learning exercise - the goal is git fluency, not speed.

## Planning Best Practices

When working on tasks that require planning:
1. **Save plan files** to `docs/plans/` with descriptive names (e.g., `99-git-learning-mode.md`)
2. **Keep plans for reference** - they document decisions and can help with similar future tasks
3. **Include in plan**: Issue number, steps, files to modify, and key decisions made

## Coding Standards

### TypeScript
- Strict mode enabled
- Prefer `type` over `interface` for object shapes
- Export types from `src/types/index.ts`

### React Components
- Functional components with hooks only
- Props interface defined above component
- Keep component files focused - extract utilities to `src/utils/`

### Testing
- Use Vitest for unit tests
- Test files co-located: `calculator.test.ts` next to `calculator.ts`
- Focus on calculation accuracy - verify against in-game values

## Data Source

Equipment data is based on **Star Citizen v4.3.1** from community mining spreadsheets and in-game testing. Data may need updates with new game patches.

## References

- @package.json - Version and scripts
- @src/types/index.ts - Equipment database
- @src/utils/calculator.ts - Calculation formulas
- @.claude/commands/vc.md - Victor (version control)
- @docs/kofi-integration.md - Ko-fi button overlay technique
- @.github/workflows/deploy.yml - Deployment workflow
