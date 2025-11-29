# GitHub Labels Setup Guide

This document provides instructions for setting up labels in your Rock Breaker Calculator repository.

## How to Set Up Labels

1. Navigate to your repository on GitHub
2. Click on **Issues** tab
3. Click on **Labels** (next to Milestones)
4. Use the guide below to create each label

## Required Labels

### Type Labels
Each issue gets exactly ONE type label.

| Label | Color | Description |
|-------|-------|-------------|
| `type: bug` | `#d73a4a` (red) | Something isn't working |
| `type: feature` | `#0075ca` (blue) | New feature or enhancement |
| `type: chore` | `#fef2c0` (yellow) | Maintenance, refactoring, dependencies |
| `type: question` | `#d876e3` (purple) | Questions that might lead to work |

### Priority Labels
Each issue gets ONE priority label.

| Label | Color | Description |
|-------|-------|-------------|
| `P0` | `#b60205` (dark red) | Critical - prod down, game-breaking, must fix ASAP |
| `P1` | `#d93f0b` (orange) | High priority - major impact but not a full stop |
| `P2` | `#0e8a16` (green) | Normal priority - most work lives here |
| `P3` | `#1d76db` (light blue) | Nice-to-have / low impact |

### Area Labels (Optional)
Use when helpful for filtering.

| Label | Color | Description |
|-------|-------|-------------|
| `area: UI/UX` | `#c5def5` (light blue) | User interface and experience |
| `area: game-logic` | `#bfdadc` (teal) | Mining calculations, game mechanics |
| `area: infra` | `#e99695` (pink) | Build, deploy, infrastructure |
| `area: docs` | `#c2e0c6` (light green) | Documentation |

### Status Labels (Optional)
Use only if they add clarity beyond project board columns.

| Label | Color | Description |
|-------|-------|-------------|
| `status: needs-triage` | `#fbca04` (yellow) | Needs review and prioritization |
| `status: in-progress` | `#0052cc` (blue) | Currently being worked on |
| `status: blocked` | `#e11d21` (red) | Blocked by something |
| `status: ready-for-release` | `#5319e7` (purple) | Done and ready to ship |

## Quick Setup Script

If you have the GitHub CLI (`gh`) installed, you can create labels with these commands:

```bash
# Type labels
gh label create "type: bug" --color d73a4a --description "Something isn't working"
gh label create "type: feature" --color 0075ca --description "New feature or enhancement"
gh label create "type: chore" --color fef2c0 --description "Maintenance, refactoring, dependencies"
gh label create "type: question" --color d876e3 --description "Questions that might lead to work"

# Priority labels
gh label create "P0" --color b60205 --description "Critical - must fix ASAP"
gh label create "P1" --color d93f0b --description "High priority - major impact"
gh label create "P2" --color 0e8a16 --description "Normal priority - most work lives here"
gh label create "P3" --color 1d76db --description "Nice-to-have / low impact"

# Area labels
gh label create "area: UI/UX" --color c5def5 --description "User interface and experience"
gh label create "area: game-logic" --color bfdadc --description "Mining calculations, game mechanics"
gh label create "area: infra" --color e99695 --description "Build, deploy, infrastructure"
gh label create "area: docs" --color c2e0c6 --description "Documentation"
```

## GitHub Project Board

Create a new Project for "PFG - Mining Calculator" with these columns:

1. **Backlog** - Everything not being worked on yet
2. **Next Up** - Selected work for the upcoming block of time
3. **In Progress** - Currently being worked on
4. **In Review** - Work with an open PR, or needs testing
5. **Done** - Shipped, verified, and released

## Workflow Reminder

1. Create issue with template
2. Add labels (type + priority + optional area)
3. Add to Project board (starts in Backlog)
4. When starting work: move to "In Progress" and create branch `feat/123-description` or `bugfix/123-description`
5. Open PR with "Fixes #123" in description
6. Move to "In Review"
7. After merge: move to "Done"

For full workflow details, see `PeaceFrog_GitHub_Workflow.pdf`
