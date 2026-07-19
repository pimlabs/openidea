---
description: Arrange ready ideas into milestones in openidea/ROADMAP.md
---

Load the `openidea` skill (Skill tool) to read section 3.3 (`ROADMAP.md` schema) before proceeding.

Arguments from the user (optional, milestone name / specific reprioritization): $ARGUMENTS

## Prerequisite

At least 1 idea with status `ready`. If none, stop and point the user to `/openidea:evaluate` first.

## Process

1. Arrange `ready` ideas into milestones in `openidea/ROADMAP.md` (create new or update existing).
2. Validate that the milestone name produces a unique slug — no collision with another milestone. If it collides, ask the user for an alternative name.
3. Check circular dependency at the **aggregate milestone level** (not just per-idea): if an idea in a later milestone is a prerequisite (`depends_on`) for an idea in an earlier milestone, flag it for the ordering to be reviewed — don't auto-reorder without confirmation.
4. If the milestone being renamed has already gone through `spec-draft` (has an idea with status `promoted` inside it): **warn first** before proceeding — renaming in ROADMAP doesn't automatically rename the existing OpenSpec folder, so a name mismatch will result.
5. If an idea is moved between milestones and one of them is already `approved`: reset that milestone's approval status (`status: draft`, `approved_in: null`) and notify the user why.

## Output

`openidea/ROADMAP.md` (create/update). Heading order top-to-bottom = the agreed execution order.
