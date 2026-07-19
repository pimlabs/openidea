---
description: Compile ready ideas into a new client-facing proposal narrative (proposals/vN.md)
---

Load the `openidea` skill (Skill tool) to read section 3.4, 3.6 (why `discovery/` is excluded) before proceeding.

Arguments from the user (optional, scope to a specific milestone): $ARGUMENTS

## Prerequisite

There must be a `ready` idea already in `openidea/ROADMAP.md`. If not, stop and point the user to `/openidea:plan` first.

## Process

1. Determine scope: if $ARGUMENTS scopes to a specific milestone, use that. Otherwise, ask the user or pull in every milestone in ROADMAP.
2. Pull `openidea/BRIEF.md` + `ready` ideas (grouped by `category`) matching the scope.
3. Order them per the heading order in `openidea/ROADMAP.md`.
4. Write a presentable narrative (client-facing language, not raw technical jargon). `type: chore` is **excluded** from this document (non-user-facing).
5. Save a reference snapshot of `openidea/ROADMAP.md` at that moment (hash or timestamp) into the `compiled_from_roadmap_snapshot` field.
6. Advisory guard rail: if this command is called >5 times for the same milestone without any version reaching `approved`, give the user a light observation note (not blocking) — it may suggest a live sync session is needed rather than another document iteration.

## Output

A new `openidea/proposals/vN.md` — N auto-incremented from the highest existing version. Status `draft` (or `revision_requested` if this is a revision cycle). **Old versions are never overwritten.**
