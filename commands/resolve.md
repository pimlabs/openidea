---
description: Close a gap with evidence (an answer, interview notes, a spike result) or record an accepted risk, then update the affected ideas
---

Load the `openidea` skill (Skill tool) to read sections 3.2, 3.8, 5, 9, and 10.3 before proceeding.

Arguments from the user: a gap id, optionally followed by the answer or evidence. $ARGUMENTS

## Prerequisite

The gap exists in `openidea/gaps/` with status `open` or `validating`. With no gap id, show the decision queue (top 5 open gaps from `openidea/ideas/INDEX.md`, regenerate it first with `openidea index`) and ask which one to resolve.

Write every piece of prose in the project language (`language:` in `openidea/BRIEF.md`, default `en`); keep ids, frontmatter keys, enum values and section headings as the schema defines them (skill section 6, Language).

## Process

1. Show the gap's question, its proposed validation, and its decision criteria.
2. Get the outcome from the user. It is one of:
   - **An answer or evidence** → status `resolved`.
   - **Work started but not finished** (interviews scheduled, spike running) → status `validating`, note who and when in `resolution`.
   - **Proceed anyway** → status `accepted_risk`. The user must say why, in their own words; record it verbatim in `resolution`.
   - **Not a real gap** → status `dismissed`, with the reason.
   Never pick the outcome yourself.
3. Save the evidence: answers longer than one line, interview notes, or spike results go to `openidea/discovery/<date>-<gap-id>.md`, and `resolution` cites that file. The `discovery/` rules still apply (section 3.6).
4. Add a `history[]` entry to the gap.
5. Apply the decision criteria to the affected ideas: propose the concrete edits (a changed "Done looks like", a new "Out of scope" line, a status change such as `killed` with a `triage_note`) and write them only after the user approves. Each idea whose status changes gets a `history[]` entry and an updated `updated` date.
6. If the change affects the blueprint (a permission, an entity, a flow), say so and offer to run `/openidea:blueprint`.
7. Run `openidea validate`, `openidea index`, and `openidea dashboard` (section 9).

## Output

The gap file updated, any evidence saved under `discovery/`, affected ideas updated after approval, and the regenerated index and dashboard. Report which gate (if any) is now clear.
