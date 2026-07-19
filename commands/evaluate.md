---
description: Evaluate captured ideas — detect overlap/conflict, recommend status & category
---

Load the `openidea` skill (Skill tool) to read section 3.2, 5 (status lifecycle), 7 before proceeding.

Arguments from the user (optional, e.g. scope to a specific category, or bulk category rename): $ARGUMENTS

## Prerequisite

At least 1 idea with status `captured`. If none, stop and say there's nothing to evaluate.

## Process

1. Compare **Problem** & **Who uses it** across ideas to detect **overlap** (genuinely intersecting scope, not just a similar topic).
2. Distinguish overlap from **conflict** (requirements that contradict each other from different sources). For conflicts: don't guess a resolution — always flag it to the user and ask for explicit clarification.
3. The overlap check covers **3 sources**: active `ideas/*.md`, `ideas/archive/*.md`, `ideas/promoted/*.md` — not just active ideas.
4. If an idea is too large (contains 2+ scopes belonging to different milestones/work periods): recommend splitting it into 2+ new ideas. If the user agrees: the original idea → status `split`, fill `split_into`, move to `archive/`.
5. Structural validation (not judgment):
   - `depends_on` must not form a cycle, direct or indirect. A direct cycle is **blocking** — stop and ask the user to fix it first.
   - Every `depends_on` reference must point to a slug that actually exists. A broken reference is a **flag** (advisory, not blocking).
6. Traverse the `merged_into` chain — if the merge target turns out to also be `killed`, give a notice to review it.
7. Recommend a status (`ready`/`parked`/`merged`/`killed`) and category per idea → **user reviews & approves** before writing to file.
8. Bulk category rename: support it if explicitly requested via $ARGUMENTS or by the user (not a separate command).
9. This command is **not a locked mode** — if the user thinks of a new idea mid-session, feel free to slip in `/openidea:capture`. That new idea enters with status `captured`, and is **not** evaluated in the same session.

## Output

- Update frontmatter on each affected idea per the user's approval.
- `killed` **requires** a `triage_note` — never write status `killed` without one.
- Category **must** be filled before status can move up to `ready`.
- Files with a final status (`killed`/`merged`/`split`) get moved to `archive/`.
- Add a new entry to `history[]` for every idea whose status changed.
- Regenerate `openidea/ideas/INDEX.md`.
