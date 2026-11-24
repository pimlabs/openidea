---
description: Hunt for blind spots in captured ideas — overlap, conflict, coverage, domain — write them as gaps with a validation plan, and recommend status & category
---

Load the `openidea` skill (Skill tool) to read sections 3.2, 3.8, 5 (status lifecycle and the ready gate), 9, and 10 before proceeding.

Arguments from the user (optional, e.g. scope to a specific category, or bulk category rename): $ARGUMENTS

## Prerequisite

At least 1 idea with status `captured`. If none, stop and say there's nothing to evaluate.

## Process

1. Run `openidea validate` (section 9) first and keep its structural findings (cycles, broken references, permission conflicts) as input. A direct dependency **cycle** is **blocking**: stop and ask the user to fix it first. A broken `depends_on` reference is advisory.
2. **Overlap**: compare **Problem** & **Who uses it** across ideas — active `ideas/*.md`, `ideas/archive/*.md`, and `ideas/promoted/*.md`, not just active ones. Overlap means genuinely intersecting scope, not a similar topic.
3. **Blind spots**, per section 10.1:
   - **Consistency**: idea vs idea, idea vs its `source` in `discovery/`, idea vs `BRIEF.md` Non-goals and Constraints. A conflict is never resolved by guessing — it becomes a gap that quotes both sides.
   - **Coverage**: every captured idea against the checklist in 10.2 plus `openidea/checklists/*.md` if present.
   - **Domain**: regulations or well-known pitfalls for the BRIEF's domain that nobody mentioned. Set `confidence` honestly.
   - **Probe**: if `blueprint/blueprint.json` exists, use its assumptions, `TBD` slots, and missing ideas; if it does not, recommend `/openidea:blueprint` first, since the probe is the strongest mechanism.
4. Write each real finding as `openidea/gaps/<gap-id>.md` (schema 3.8), with all four body sections and a concrete **proposed validation** chosen by kind (section 10.3). Before creating one, check `openidea/gaps/` and update an existing gap instead of duplicating it. Prefer fewer, sharper gaps over a long list of generic ones; a gap with no plausible effect on the build is noise.
5. If an idea is too large (contains 2+ scopes belonging to different milestones/work periods): recommend splitting it into 2+ new ideas. If the user agrees: the original idea → status `split`, fill `split_into`, move to `archive/`.
6. Traverse the `merged_into` chain — if the merge target turns out to also be `killed`, give a notice to review it.
7. Present to the user:
   - the **decision queue**: at most 5 open gaps ranked per section 10.3, each with its question and proposed validation;
   - a recommended status (`ready`/`parked`/`merged`/`killed`) and category per idea. An idea with an open high-impact gap can only be recommended as `ready` together with the explicit option of `accepted_risk` on that gap.
   **The user reviews & approves** before any idea file changes.
8. Bulk category rename: support it if explicitly requested via $ARGUMENTS or by the user (not a separate command).
9. This command is **not a locked mode** — if the user thinks of a new idea mid-session, feel free to slip in `/openidea:capture`. That new idea enters with status `captured`, and is **not** evaluated in the same session.

## Output

- `openidea/gaps/*.md` created or updated.
- Update frontmatter on each affected idea per the user's approval.
- `killed` **requires** a `triage_note` — never write status `killed` without one.
- Category **must** be filled before status can move up to `ready`, and the ready gate (section 5) must be clear.
- Files with a final status (`killed`/`merged`/`split`) get moved to `archive/`.
- Add a new entry to `history[]` for every idea whose status changed.
- Run `openidea validate` (fix errors this command introduced), then `openidea index` and `openidea dashboard`.
