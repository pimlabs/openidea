---
description: Arrange ready ideas into milestones in openidea/ROADMAP.md
---

Load the `openidea` skill (Skill tool) to read sections 3.3 (`ROADMAP.md` schema), 5 (the ready gate), and 9 before proceeding.

Arguments from the user (optional, milestone name / specific reprioritization): $ARGUMENTS

## Prerequisite

At least 1 idea with status `ready`. If none, stop and point the user to `/openidea:evaluate` first.

Write every piece of prose in the project language (`language:` in `openidea/BRIEF.md`, default `en`); keep ids, frontmatter keys, enum values and section headings as the schema defines them (skill section 6, Language).

## Process

1. Arrange `ready` ideas into milestones in `openidea/ROADMAP.md` (create new or update existing).
2. Give every milestone an explicit `**ID**:` line (kebab-case, unique). It becomes the OpenSpec folder name `openspec/changes/<ID>/`. Propose one from the name; if it collides with another milestone's ID, ask the user for an alternative. Add missing ID lines to existing milestones too, with the slug they already resolve to.
3. Check circular dependency at the **aggregate milestone level** (not just per-idea): if an idea in a later milestone is a prerequisite (`depends_on`) for an idea in an earlier milestone, flag it for the ordering to be reviewed — don't auto-reorder without confirmation.
4. Renaming a milestone's display name is safe; changing its **ID** is not once it has gone through `spec-draft` (has an idea with status `promoted` inside it): **warn first** — the existing OpenSpec folder keeps the old ID.
5. If an idea is moved between milestones and one of them is already `approved`: reset that milestone's approval status (`status: draft`, `approved_in: null`) and notify the user why.
6. Show each milestone's gate (clear, or the open high-impact gaps blocking it). A blocked milestone can still be planned; it just cannot go to `spec-draft` yet.

## Output

`openidea/ROADMAP.md` (create/update). Heading order top-to-bottom = the agreed execution order. Then run `openidea validate` (fix errors this command introduced), `openidea index`, `openidea estimate` (phases and timeline per milestone, section 3.11; if `calibration.md` is missing, mention `/openidea:estimate` once instead), and `openidea dashboard` (section 9).
