---
description: Read-only drift audit between openspec/changes/<milestone> and proposals/ideas
---

Load the `openidea` skill (Skill tool) to read section 2, 3.4, 3.2 before proceeding.

Arguments from the user: target milestone name. $ARGUMENTS

## Prerequisite

The `openspec/changes/<milestone>` folder must exist. If not, stop and say so explicitly.

## Process

1. Check the target folder's completeness: are `proposal.md` + `design.md` + `tasks.md` all present?
   - If incomplete: report it as **"still in progress"**, not as drift.
2. If complete, compare the OpenSpec scope against `openidea/proposals/<approved for this milestone>.md` + the related `openidea/ideas/` — look for drift:
   - missing scope (present in the proposal/ideas, absent from OpenSpec)
   - added scope (present in OpenSpec, absent from the proposal/ideas)
   - inconsistent acceptance criteria
3. Also check: is the `openspec/changes/` folder referenced by an idea's `promoted_to` still active on the OpenSpec side (not yet archived/cancelled)? If it has been archived/cancelled on the OpenSpec side, flag the related idea's status for review (it may need to be reverted from `promoted`).

## Output

A drift report + recommendations for the user. **Read-only — never change any file automatically**, including not changing an idea's status even if drift is found.

## Note

This command is an entry point for technical feedback. If a lead engineer finds something technically infeasible during the audit, record that finding via a regular `/openidea:capture` (not a separate command) — this can trigger a new revision cycle back to the client via `/openidea:compile` if needed.
