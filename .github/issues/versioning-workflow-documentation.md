# Add versioning and release notes workflow documentation

**Labels:** chore, documentation

## Description
Document the versioning and release notes process to establish clear guidelines for version management and changelog maintenance.

## Current State
- No formal versioning guidelines
- No changelog or release notes process
- Developers unsure when/how to bump versions

## Proposed Changes

Add comprehensive versioning documentation to `BRANCHING_WORKFLOW.md` including:

1. **Semantic Versioning (SemVer) Guidelines**
   - PATCH: Bug fixes and small tweaks
   - MINOR: New features (backwards compatible)
   - MAJOR: Breaking changes

2. **Version Management Workflow**
   - When to bump versions (always on merge to main)
   - How to use `npm version` command
   - Git tagging process

3. **Release Notes Process**
   - CHANGELOG.md format and structure
   - Simple categories: Added, Fixed, Changed, Removed
   - Optional GitHub Releases integration

4. **Integration with Existing Workflow**
   - Updated "Merging to Main" step to include versioning
   - Added to Best Practices

## Benefits
- Clear, consistent versioning across releases
- Easy tracking of changes between versions
- Better communication with users about new features and fixes
- Professional release management suitable for small studio/solo dev

## Implementation Notes
- Follows simple, practical approach suitable for single developer or small team
- Integrated into existing branching workflow documentation
- Examples based on actual project features (resistance mode)

## Files Modified
- `BRANCHING_WORKFLOW.md` - Added versioning and release notes sections

## Acceptance Criteria
- [x] Versioning section added to workflow documentation
- [x] Release notes guidelines documented
- [x] Examples provided for each version type
- [x] Integrated into existing workflow steps
- [x] Added to best practices list
- [ ] Documentation committed and pushed to repository
