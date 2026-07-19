---
description: Generate OpenSpec proposal/design/tasks from a milestone/ready ideas
---

Load the `openidea` skill (Skill tool) to read section 2 (file location rules — `openspec/` is never touched directly except here), 3.3, 3.4, 3.2 before proceeding.

Arguments from the user: milestone name and/or specific idea slugs. Supports many-to-one (multiple ideas combined into one proposal). $ARGUMENTS

## Prerequisite (blocking)

1. `openspec/` must already exist at the project root. OpenIdea does **not** bootstrap this folder itself — if it doesn't exist, **stop** and tell the user explicitly (point them to the OpenSpec tooling's own init first).
2. The target milestone must have at least 1 idea with status `ready`. If empty, **stop** — never generate an empty proposal.

## Process

1. Read the full context:
   - `openidea/BRIEF.md` — product context & constraints.
   - `openidea/ROADMAP.md` — target milestone's scope & order.
   - `openidea/proposals/<approved version for this milestone>.md` — if it exists, the narrative already agreed with the client.
   - The related `openidea/ideas/<slug>.md` — full 5Q detail for each idea.
2. If `openidea/proposals/` doesn't exist at all (a solo case with no client-approval cycle): still proceed directly from `ROADMAP.md` + `ideas/` alone. `compile`/approval is **not** a required prerequisite on this path.
3. If the target folder `openspec/changes/<milestone-name>/` **already has content**: don't auto-overwrite. Offer the user options — append as an additional note, or leave the merge to be done manually.

## Output

- `openspec/changes/<milestone-name>/proposal.md`, `design.md`, `tasks.md` — following standard OpenSpec convention.
- Update the related ideas' status to `promoted`, move the files to `openidea/ideas/promoted/`, fill `promoted_to` (openspec folder path), fill `promoted_with` if many-to-one.
- Check off the related idea in `openidea/ROADMAP.md`.
- Regenerate `openidea/ideas/INDEX.md`.
