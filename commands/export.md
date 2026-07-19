---
description: Package a milestone's technical content for handoff to a party without repo access
---

Load the `openidea` skill (Skill tool) to read section 3.6, 3.7 before proceeding.

Arguments from the user: milestone name (required), language parameter (optional). $ARGUMENTS

## Prerequisite

No hard prerequisite, but ask for the milestone name first if it's not already in $ARGUMENTS.

## Process

1. Gather:
   - `openidea/BRIEF.md` — relevant context only (not the entire raw content).
   - The milestone's scope from `openidea/ROADMAP.md`.
   - `openidea/proposals/<approved for this milestone>.md` — if it exists.
   - The full content of each `openidea/ideas/<slug>.md` related to the milestone (including `type: chore` — export does **not** exclude chores, unlike `/openidea:compile`).
2. **Always** exclude `openidea/discovery/` — no exceptions, this is a client data-security principle.
3. **Always** exclude ideas from other, unrelated milestones.
4. If a language parameter is requested, translate **only** in this export file — don't change the `ideas/` source.
5. Add an explanatory header at the top of the document: what this is, how to read each section, for a reader who may not be using any AI/skill.

## Output

`openidea/exports/<milestone-slug>-vN.md` — auto-versioned, never overwrites a previous export file.
