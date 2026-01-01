# Plan: Add Git Learning Mode to CLAUDE.md

**Issue:** #99
**Branch:** `chore/99-git-learning-mode`
**Status:** In Progress

## Request
Add a persistent rule that Claude should guide the user through git commands rather than running them directly, to reinforce git learning.

---

## Steps

1. **Create GitHub Issue** - Done (#99)
2. **Create Feature Branch** - Done (`chore/99-git-learning-mode`)
3. **Create Plans Folder and Save This Plan** - Done
4. **Edit CLAUDE.md** - Add new sections
5. **Commit Changes** - With proper attribution
6. **Push and Create PR** - Target `dev` branch

---

## Content Added to CLAUDE.md

### Git Learning Mode

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

### Planning Best Practices

When working on tasks that require planning:
1. **Save plan files** to `docs/plans/` with descriptive names (e.g., `99-git-learning-mode.md`)
2. **Keep plans for reference** - they document decisions and can help with similar future tasks
3. **Include in plan**: Issue number, steps, files to modify, and key decisions made

---

## Files Modified
- `CLAUDE.md` - Added "Git Learning Mode" and "Planning Best Practices" sections
- `docs/plans/99-git-learning-mode.md` - This plan file
