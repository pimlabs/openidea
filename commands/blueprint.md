---
description: Derive the app blueprint (actors, entities, permissions, flows, screens, integrations, NFR) from the ideas, and record the hidden assumptions it exposes as gaps
---

Load the `openidea` skill (Skill tool) to read sections 3.2, 3.8, 3.9, 9, and 10 before proceeding.

Arguments from the user (optional, e.g. limit to certain ideas or a category): $ARGUMENTS

## Prerequisite

`openidea/BRIEF.md` exists and at least 1 idea is `captured` or `ready`. If not, stop and point the user to `/openidea:init` or `/openidea:capture`.

## Process

1. Read `BRIEF.md`, every active idea (`captured`, `ready`, `parked` only for context), resolved and `accepted_risk` gaps (their resolutions are now facts), and the existing `blueprint/blueprint.json` if any. Reuse existing element ids wherever the meaning is unchanged, so links and comments stay stable.
2. Derive the blueprint per schema 3.9: actors, entities, permissions, flows, screens, integrations, nfr. Every element lists the idea ids it comes from in `derived_from`.
3. **Derivation probe** (section 10.1): while deriving, whenever the app clearly needs something no idea states (an actor, an entity, a permission, a step), add it with `"derived_from": []` and `"assumption": true`. Do not hide it inside another element.
4. Fill every mandatory slot from the sources. When the sources do not say, write `"TBD"`. **Never invent** a lifecycle, a failure scenario, or a permission to make the blueprint look complete: a `TBD` is a finding, an invented value is a hidden blind spot.
5. Set `"generated"` to today's date. Write `openidea/blueprint/blueprint.json` in full (it is a derived file, never patched by hand).
6. Run `openidea validate` (section 9). Fix any error this command introduced (bad references, missing ids). Report permission conflicts as findings, do not resolve them yourself.
7. Turn what the probe found into gaps (schema 3.8, `found_by: probe`), for the ones that matter:
   - each `assumption: true` element,
   - each `TBD` slot whose absence would change the build,
   - each permission conflict,
   - each active feature idea that produced no element (`idea-not-in-blueprint`).
   Check `openidea/gaps/` first and update an existing gap instead of creating a duplicate. Fill all four body sections, including a concrete proposed validation (section 10.3).
8. Run `openidea index` and `openidea dashboard`.

## Output

- `openidea/blueprint/blueprint.json`
- New or updated `openidea/gaps/*.md` (status `open`)
- Regenerated `openidea/ideas/INDEX.md` and `openidea/dashboard/index.html`

Report to the user in this order: the depth score, the number of hidden assumptions, the top gaps (at most 5, ranked per section 10.3), and the dashboard path.
