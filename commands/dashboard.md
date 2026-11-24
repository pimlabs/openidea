---
description: Generate the HTML dashboard (overview, decision queue, ideas, features, blueprint, diagrams, roadmap, checks) for people to read instead of the raw files
---

Load the `openidea` skill (Skill tool) to read sections 6 (client safety) and 9 before proceeding.

Arguments from the user (optional): `client` for the client-safe view. $ARGUMENTS

## Prerequisite

`openidea/BRIEF.md` exists. If not, point the user to `/openidea:init`.

## Process

1. Run `openidea validate`, `openidea index`, and (if a blueprint exists) `openidea diagrams`, so the dashboard reflects the current files.
2. Run `openidea dashboard` (internal view). If the user asked for a client view, or says the dashboard will be shown to a client or an external team, also run `openidea dashboard --client` and point them to `client.html`, never `index.html`: the internal view quotes `discovery/` material.
3. If Node.js is unavailable, say so plainly; there is no manual fallback for the dashboard.

## Output

`openidea/dashboard/index.html` (and `openidea/dashboard/client.html` on request): single self-contained files that open in any browser, offline. They are generated: never edit them; regenerate after changes.
