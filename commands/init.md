---
description: Structure a product vision into openidea/BRIEF.md
---

Load the `openidea` skill (Skill tool) to read section 1 (Philosophy), 3.1 (`BRIEF.md` schema) before proceeding.

Arguments from the user (if any): $ARGUMENTS

## Prerequisite

No hard prerequisite. But first check whether `openidea/BRIEF.md` already exists.

## Process

1. If `openidea/BRIEF.md` **doesn't exist yet**: ask the user for a free-form story about the product vision (if not already given in $ARGUMENTS or a prior message). Structure it into the body per schema 3.1: Vision, Target Users, Core Value Prop, Key Features (rough checklist), Non-goals, Constraints.
2. If `openidea/BRIEF.md` **already exists**:
   - A small revision (add/change one section) → edit directly, no archiving needed.
   - A full rewrite → **must** confirm with the user first. Once confirmed, copy the old content to `openidea/discovery/brief-v{N}-superseded.md` (N = increment from the last superseded version) before overwriting `BRIEF.md`.
3. Write the frontmatter: `schema_version: 1`, `project_status: active`.
4. Don't make up details the user didn't mention — ask back if there's an important gap (e.g. unclear target users).

## Output

`openidea/BRIEF.md` (create or update). Show the final result to the user for review.
