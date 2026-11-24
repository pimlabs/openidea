---
description: Produce the finished, client-safe report (features, phases and timeline, open questions, assumptions, next steps) as Markdown, PowerPoint or PDF
---

Load the `openidea` skill (Skill tool) to read sections 3.13 (report) and 6 (client safety) before proceeding.

Arguments from the user (optional): the format, `md`, `pptx` or `pdf` (default `md`); several are fine (`pptx pdf`). $ARGUMENTS

## Prerequisite

`openidea/blueprint/blueprint.json` exists. If not, point the user to `/openidea:blueprint`. Without `ROADMAP.md` the report has no phases; suggest `/openidea:plan` first. Without `calibration.md` the timeline uses default team settings; say so once.

## Process

1. Run `openidea validate`. If it reports errors, list them and ask whether to fix them first: a report built on broken files misleads a client.
2. For each requested format run `openidea report --format <format>`.
3. Reply with the file path(s) and, in at most three lines, the headline numbers (features, phases, timeline range, open questions).

The report is a renderer, so its content comes only from the files. Never edit the generated report to change a fact: change the idea, gap, blueprint, roadmap or calibration and regenerate. Wording or styling changes a person makes afterwards in PowerPoint are theirs; tell them a regeneration overwrites `openidea/reports/report.<format>`, so they should save edited copies under another name.

## Output

`openidea/reports/report.md`, `report.pptx` and/or `report.pdf`. Client-safe by construction: no `discovery/` material, gap sources, checks, chores, or internal notes.
