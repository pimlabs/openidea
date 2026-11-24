---
description: Derive phases and a timeline range from the blueprint and roadmap, show what each open gap costs in days, and record actuals to calibrate
---

Load the `openidea` skill (Skill tool) to read sections 3.11 (estimate and calibration) and 9 before proceeding.

Arguments from the user (optional): nothing to (re)generate, or `actual <milestone-id> <person-days>` to record what a finished milestone really took. $ARGUMENTS

## Prerequisite

`openidea/blueprint/blueprint.json` exists. If not, point the user to `/openidea:blueprint`. Without `ROADMAP.md` everything is one phase; suggest `/openidea:plan` for real phases.

## Process: generate

1. If `openidea/calibration.md` does not exist, ask once for team size and start date (offer the defaults: 1 person, 5 days a week, 70% focus, no start date) and create it from the template in section 3.11. Do not invent a team.
2. Run `openidea validate`, then `openidea estimate`, then `openidea dashboard` so the Roadmap page shows the same numbers.
3. Report in at most six lines: the total range in weeks (and dates if a start date is set), the widest phase, and the top three entries of "What open gaps cost". If the high end is more than twice the low end, say that the definition is still thin and point to `/openidea:resolve` on the costliest gap, because answering it is cheaper than padding the plan.

Never edit `estimate.json` or `work-breakdown.csv`, and never change a number by hand. To change an estimate, change its inputs: the blueprint (re-run `/openidea:blueprint`), the gaps, or `calibration.md` coefficients, and say which input you changed.

## Process: `actual <milestone-id> <person-days>`

1. Read `openidea/blueprint/estimate.json` for that milestone's current `low_days` and `high_days`. If the milestone is not in it, stop and say so.
2. Append to `actuals` in `calibration.md`: `- {milestone: <id>, estimate_low: <low>, estimate_high: <high>, actual_days: <days>}`.
3. Regenerate (`openidea estimate`, `openidea dashboard`) and report the new calibration factor (median of actual ÷ estimated midpoint) and how the remaining phases moved.

## Output

Raw `openidea/blueprint/estimate.json` and `work-breakdown.csv` (generated), `openidea/calibration.md` (human-owned inputs), and the Roadmap page of the dashboard. For a finished document, `/openidea:report`.
