---
description: Generate an OpenSpec change (proposal, design, tasks, and spec deltas) from a milestone whose gate is clear
---

Load the `openidea` skill (Skill tool) to read section 2 (file location rules — `openspec/` is never touched directly except here), 3.2, 3.3, 3.4, 3.8, 3.9, 5, and 9 before proceeding.

Arguments from the user: milestone name or ID and/or specific idea slugs. Supports many-to-one (multiple ideas combined into one change). $ARGUMENTS

## Prerequisite (blocking)

1. `openspec/` must already exist at the project root. OpenIdea does **not** bootstrap this folder itself — if it doesn't exist, **stop** and tell the user explicitly (point them to `openspec init` first).
2. The target milestone must have at least 1 idea with status `ready`. If empty, **stop** — never generate an empty change.
3. The milestone's **gate must be clear**: no idea in it may have an open or validating high-impact gap. If blocked, stop and list the blocking gaps with their questions (point to `/openidea:resolve`).
4. If `openidea/proposals/` exists (the client path), the milestone must be `approved` in `ROADMAP.md`. On the solo path (no `proposals/`), approval is not required.

## Process

1. Read the full context:
   - `openidea/BRIEF.md` — product context & constraints.
   - `openidea/ROADMAP.md` — the milestone's **ID**, scope & order. The change folder is `openspec/changes/<ID>/`. A milestone without an **ID** line: use the slug of its name and tell the user to add the line.
   - `openidea/proposals/<approved version for this milestone>.md` — if it exists, the narrative already agreed with the client.
   - The related `openidea/ideas/<slug>.md` — full 5Q detail for each idea.
   - `openidea/blueprint/blueprint.json` — the elements derived from these ideas (flows, permissions, entities, scenarios).
   - Resolved and `accepted_risk` gaps for these ideas — resolutions are requirements; accepted risks are listed as risks in `design.md`.
   - `openspec/AGENTS.md` or `openspec/project.md` if present — **the project's own OpenSpec conventions win** over the defaults below.
2. If the target folder `openspec/changes/<ID>/` **already has content**: don't auto-overwrite. Offer the user options — append as an additional note, or leave the merge to be done manually.
3. Write the change:
   - `proposal.md` — Why (from Problem / Why now), What Changes (one bullet per idea), Impact (affected capabilities and systems).
   - `design.md` — the blueprint elements involved (entities, permissions, integrations, NFR), decisions taken from resolved gaps, and accepted risks.
   - `tasks.md` — numbered checklist (`- [ ] 1.1 …`) grouped by area; include `type: chore` ideas here.
   - `specs/<capability>/spec.md` — one per capability touched (usually one per category), as OpenSpec deltas:
     ```
     ## ADDED Requirements
     ### Requirement: <name>
     The system SHALL <behavior>.

     #### Scenario: <name>
     - **WHEN** <condition>
     - **THEN** <outcome>
     ```
     Every requirement needs at least one scenario. Derive requirements from "Done looks like" and the blueprint permissions; derive scenarios from each flow's `scenarios` (success, alternative, failure, empty state). Use `## MODIFIED Requirements` instead when changing a capability that already exists under `openspec/specs/`.
4. If the `openspec` CLI is available, run `openspec validate <ID> --strict` and fix what it reports. If it is not available, say that validation was skipped.

## Output

- `openspec/changes/<ID>/proposal.md`, `design.md`, `tasks.md`, and `specs/<capability>/spec.md`.
- Update the related ideas' status to `promoted`, move the files to `openidea/ideas/promoted/`, fill `promoted_to` (`openspec/changes/<ID>/`), fill `promoted_with` if many-to-one, add a `history[]` entry.
- Run `openidea validate`, `openidea index`, and `openidea dashboard` (section 9).
