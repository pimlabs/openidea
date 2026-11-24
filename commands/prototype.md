---
description: Generate a clickable prototype from the blueprint to walk through every flow as every role, and turn what feels wrong into gaps
---

Load the `openidea` skill (Skill tool) to read sections 3.8 (gaps), 3.12 (prototype) and 9 before proceeding.

Arguments from the user (optional): nothing to (re)generate, or `feedback "<view> as <role>: <note>"` as copied from `review.html`'s "Note a problem" button. $ARGUMENTS

## Prerequisite

`openidea/blueprint/blueprint.json` exists. If not, point the user to `/openidea:blueprint`.

Write every piece of prose in the project language (`language:` in `openidea/BRIEF.md`, default `en`); keep ids, frontmatter keys, enum values and section headings as the schema defines them (skill section 6, Language).

## Process: generate

1. Run `openidea validate`, then `openidea prototype`.
2. Tell the user there are two files and who each is for, in at most four lines:
   - `openidea/prototype/index.html`: show this to real users or the client. It looks like the app and has nothing meta in it. Watch them use it; write down where they hesitate.
   - `openidea/prototype/review.html`: for the team. Red dashed marks are behaviour nobody defined; "Note a problem" copies a line to paste back here. Turn what you saw users do into notes the same way.
3. It is generated from the blueprint: never edit it. To change it, change the ideas or answer gaps, re-run `/openidea:blueprint`, regenerate.

## Process: `feedback "..."`

The note is a person's reaction to the simulated app, so it is evidence of a blind spot, not a decision.

1. Parse the view (`flow/<id>`, `screens`, `data`, `flows`) and the role. Read the blueprint elements that view shows and the ideas they derive from.
2. If an existing open gap already covers it, add the note to that gap's `## Finding` (quoted, with "from prototype, acting as <role>") and stop.
3. Otherwise create `openidea/gaps/<id>.md` per section 3.8 with `found_by: prototype`, `ideas` = the ideas behind the elements in that view, `affects` = those elements (`kind/id`), `sources: [prototype/index.html]`, `status: open`. Pick `kind` from the note (who may do something → decision or clarification; can it be built → feasibility; would people use it → desirability). Write all four body sections; the finding quotes the note verbatim.
4. Run `openidea validate`, `openidea index`, `openidea dashboard`; report the gap id and its question in one line.

Never change an idea or the blueprint from feedback directly. The gap goes through `/openidea:resolve` like any other.

## Output

`openidea/prototype/index.html` and `review.html` (generated) and, for feedback, one gap file.
