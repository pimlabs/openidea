---
description: Capture a new idea (free-form story or extracted from a document) into openidea/ideas/<slug>.md
---

Load the `openidea` skill (Skill tool) to read section 3.2 (idea schema), section 7 (INDEX.md regeneration) before proceeding.

Input from the user (free-form story, or a path/content of a meeting-notes/transcript document): $ARGUMENTS

## Prerequisite

`openidea/BRIEF.md` must exist. If not, stop and point the user to `/openidea:init` first.

## Process

1. **Detect input mode** — auto-detect from the kind of input:
   - Long document (meeting notes/transcript/summary): extract candidate ideas as a one-liner list → show them to the user for review → only approved ones continue to step 2.
   - Free-form story: parse directly, can be multiple ideas in one batch.
2. For each idea that continues: quick similarity check against `openidea/ideas/INDEX.md` (exact/near-exact match based on the problem statement). If a similar candidate is found, ask the user before creating a new file (update the existing idea or still create a new one).
3. Structure into 5Q (schema 3.2 in SKILL.md), set `type: feature` or `type: chore` accordingly (skip point 3 "who uses it" for chore).
4. If the input is too vague to fill a given field: fill that field with an explicit `TBD`, set `needs_clarification: true`. **Don't make things up.**
5. Partial processing: if one item in a batch is ambiguous, process the clear ones first, then ask back about the ambiguous one (don't block the whole batch).
6. Advisory guard rail: if a new idea appears relevant to a milestone that already has a folder under `openspec/changes/`, give a light notice (not blocking).

## Output

- New file `openidea/ideas/<slug>.md` per idea, status `captured`, `history: [{date: <today>, status: captured}]`.
- Document mode: archive the original source to `openidea/discovery/<session>.md`, fill the `source` field on each idea extracted from it.
- Regenerate `openidea/ideas/INDEX.md` (procedure in SKILL.md section 7).
