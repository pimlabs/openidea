---
name: openidea
description: Manage a product idea lifecycle end-to-end, file-based — from product vision (BRIEF.md), raw idea capture, blind-spot detection with a validation plan per gap, a blueprint derived from the ideas, roadmap planning, an HTML dashboard, through to technical spec drafting (OpenSpec). Auto-triggers when the user mentions "openidea", "capture idea", "blind spot", "product blueprint", "product roadmap", "client proposal", "product brief", or runs any /openidea:* command.
---

# OpenIdea

A file-based product idea management system. State lives in markdown under an `openidea/` folder at the project root. This skill is the single reference for file schemas, design principles, blind-spot detection, and the CLI shared by all `/openidea:*` commands.

The goal: make an app's definition clear **before** anyone builds it. Claude finds the blind spots that meeting notes and documents hide, proposes the cheapest way to validate each one, and derives a concrete blueprint from the ideas. The human only validates and approves.

Individual commands live in `commands/*.md` in this plugin's repo. Each command file is self-contained (prerequisites + process + output), but still refers back to this document for schema details — don't duplicate schema in command files, just point to the relevant section here.

## 1. Core Philosophy

- **File-based** — all state lives in markdown, git-friendly, diffable, readable without extra tools.
- **Claude finds and proposes, the human validates and approves** — Claude structures content, hunts for blind spots, and proposes how to validate them; the decision always rests with the user. Never change an idea's/milestone's status, or close a gap, without user review, unless explicitly requested ("mark Milestone 1 approved").
- **Structure over prose** — anything a rule can be checked against (status, dependencies, permissions, mandatory blueprint slots, gates) lives in structured fields and is checked by the CLI (section 9), not by re-reading prose. The model extracts and judges; code checks.
- **Derived artifacts are never hand-edited** — `ideas/INDEX.md`, `blueprint/`, and `dashboard/` are regenerated from the ideas. If one is wrong, fix the idea (or answer the gap) and regenerate.
- **Independent from OpenSpec** — OpenIdea never writes directly to `openspec/changes/` or `openspec/specs/` except via `/openidea:spec-draft`. It doesn't depend on the generic `openspec-drafter` skill.
- **Portable** — everything under `openidea/` must be understandable by a human or another AI without additional conversational context. This skill is distributed as an installable plugin, not a personal skill.
- **Async-only** — designed for solo work or turn-based handoff across people/time, not simultaneous real-time multi-user editing. Git conflicts on auto-generated files (`ideas/INDEX.md`) are resolved by regenerating, not manual line-by-line merge.
- **Nothing disappears** — status changes, but files are never deleted or overwritten without a trace. History is always recorded in the `history[]` field.

## 2. Folder Structure

```
project/
├── openidea/
│   ├── BRIEF.md                 ← product vision, static, has schema_version & project_status
│   ├── ROADMAP.md               ← milestones (with ID), execution order, per-milestone approval
│   ├── gaps/
│   │   └── <gap-id>.md          ← one blind spot + its validation plan (section 3.8)
│   ├── blueprint/
│   │   ├── blueprint.json       ← derived app definition, every element traced (section 3.9)
│   │   ├── diagrams.md          ← generated feature list and Mermaid diagrams (section 3.10)
│   │   ├── estimate.json        ← raw: phases, timeline ranges, gap cost (section 3.11)
│   │   └── work-breakdown.csv   ← raw: one row per work item, for spreadsheets
│   ├── calibration.md           ← team capacity + actuals per milestone, human-owned (section 3.11)
│   ├── reports/
│   │   └── report.md|pptx|pdf   ← generated finished report, client-safe (section 3.13)
│   ├── prototype/
│   │   ├── index.html           ← generated prototype for real users, nothing meta (section 3.12)
│   │   └── review.html          ← the same with undefined behaviour marked, for the team
│   ├── checklists/
│   │   └── <domain>.md          ← optional extra coverage questions for this project (section 10)
│   ├── dashboard/
│   │   ├── index.html           ← generated internal dashboard (never edit)
│   │   └── client.html          ← generated client-safe dashboard (never edit)
│   ├── ideas/
│   │   ├── INDEX.md             ← auto-regenerated from a filesystem scan, summarized
│   │   ├── <slug>.md            ← 5Q + full frontmatter (active idea)
│   │   ├── assets/<slug>/       ← optional visual attachments
│   │   ├── archive/
│   │   │   └── <slug>.md        ← status: killed, merged, split
│   │   └── promoted/
│   │       └── <slug>.md        ← status: promoted (already turned into an OpenSpec change)
│   ├── proposals/
│   │   └── v1.md, v2.md, ...    ← versioned, client-facing narrative documents
│   ├── exports/
│   │   └── <milestone-slug>-vN.md  ← technical package for external handoff
│   └── discovery/
│       └── <session>.md         ← raw archive (meeting notes, transcripts, old BRIEFs)
└── openspec/                    ← NEVER touched directly, except via /openidea:spec-draft
    ├── changes/
    └── specs/
```

All folder paths are relative to the `openidea/` root at the project root. `openspec/` belongs to another tool — OpenIdea only *reads* from it when needed (e.g. checking whether a folder already exists), never writes to it except via `/openidea:spec-draft`.

Skill and command files don't live in this project either — they're loaded from the `openidea` plugin (installed via `/plugin install openidea@pimlabs`), a separate repo laid out as `skills/openidea/` + `commands/*.md` at the plugin root.

## 3. File Schemas

### 3.1 `BRIEF.md`

```yaml
---
schema_version: 2
project_status: active   # active | cancelled
---
```

The body's first `# Heading` is the project name (the dashboard uses it). Version 2 adds milestone IDs, `gaps/`, and `blueprint/`; on a version 1 project every command keeps working and the CLI derives what is missing (section 6, schema versioning).

Body (narrative, written by `/openidea:init`):
- **Vision** — the big problem & the product's purpose
- **Target Users** — who uses it
- **Core Value Prop** — the core value offered
- **Key Features** — a rough checklist, not yet detailed
- **Non-goals** — product-level boundaries
- **Constraints** — technical/time/infrastructure constraints

Written once at the start, rarely revised. A full rewrite → copy the old version to `discovery/brief-v{N}-superseded.md` before overwriting. Never a plain overwrite.

### 3.2 `ideas/<slug>.md`

```yaml
---
id: wa-booking
status: ready              # captured | ready | parked | merged | killed | split | promoted
type: feature               # feature | chore
category: Booking & Scheduling
created: 2026-07-16
updated: 2026-07-20
source: discovery/2026-07-16-session.md     # optional, set by /openidea:capture import mode
replaces: "Manual booking via spreadsheet"    # optional
depends_on: []                                 # optional, list of other idea ids
needs_clarification: false                      # true if captured from input too vague to fill in fully
merged_into: null                                # set if status: merged
split_into: []                                    # set if status: split
promoted_to: null                                  # openspec/changes/<milestone>/ folder path
promoted_with: []                                   # other idea ids promoted together
triage_note: null                                    # REQUIRED if status: killed
history:
  - {date: 2026-07-16, status: captured}
  - {date: 2026-07-18, status: ready}
---
```

Body (5Q, simplified for `type: chore` — skip point 3):
1. **Problem** — what problem this solves
2. **Why now** — why it matters now
3. **Who uses it** — *(skip for `type: chore`)*
4. **Done looks like** — the completion state, measurable if possible
5. **Out of scope** — what's deliberately not being done

### 3.3 `ROADMAP.md`

```markdown
# Roadmap

## Milestone 1 — Core Booking
**ID**: core-booking
**Status**: approved
**Approved in**: proposals/v3.md

- wa-booking
- occupancy-dashboard-basic

## Milestone 2 — Finance Module
**ID**: finance-module
**Status**: draft

- billing-insurance-integration
```

Rules:
- Heading order top-to-bottom = execution order.
- **ID** is the kebab-case name of the OpenSpec change: `openspec/changes/<ID>/`. The display name after the dash can be anything readable; the ID is what tools use. IDs must be unique. A milestone without an **ID** line falls back to the slug of its name (with a CLI warning) for version 1 projects.
- Per-milestone status: `draft` | `approved` — not a per-document proposal status.
- **Approved in** is filled in only when status is `approved` and `proposals/` exists (the client path), pointing to the proposal version where it was approved. On the solo path there is no proposal; approval is the user's own instruction.
- Approval auto-resets (`Status: draft`, no **Approved in**) if an idea is moved into/out of that milestone after it was approved.
- A milestone's **gate** is clear only when none of its ideas has an open high-impact gap (section 5).

### 3.4 `proposals/vN.md`

```yaml
---
version: 3
status: draft            # draft | revision_requested | approved | superseded
compiled_from_roadmap_snapshot: "<hash or timestamp of ROADMAP.md at compile time>"
milestones_covered: [Core Booking]   # can be scoped
created: 2026-07-20
---
```

Body: presentable narrative, grouped by `category`, ordered per `ROADMAP.md`. If `status: superseded`, the first line of the body **must** be:
> ⚠️ This document has been superseded by a newer version. See `proposals/` for the current one.

### 3.5 `ideas/INDEX.md`

Auto-regenerated from a filesystem scan — not an independent source of truth, **never edit manually**. See section 7 for the regeneration procedure.

### 3.6 `discovery/<session>.md`

Raw archive, as-is (meeting notes, summaries, or an old `BRIEF.md` being superseded). **Never** included in `exports/` or `proposals/` in any form — a data-security principle, since it can contain sensitive client information.

### 3.7 `exports/<milestone-slug>-vN.md`

A curated package for external parties without repo access. Auto-versioned, never overwritten. Contains: relevant context from `BRIEF.md` + milestone scope from `ROADMAP.md` + the full content of each related `ideas/<slug>.md`. Always excludes `discovery/`. Must be self-explanatory (a "how to read this" header) for readers without any AI/skill. Supports an optional language parameter (translation applies only to the export file, not the `ideas/` source).

### 3.8 `gaps/<gap-id>.md`

One blind spot per file. Gaps live apart from ideas because one gap can touch several ideas.

```yaml
---
id: refund-permission          # must equal the file name
kind: clarification            # decision | clarification | desirability | feasibility | compliance
found_by: consistency          # probe | coverage | consistency | domain | walkthrough | prototype | manual
question: May the cashier issue refunds, or only the owner?   # REQUIRED: the one line a human answers
ideas: [refund-by-cashier]     # ideas this gap touches; [] = project-wide
affects: [permissions/cashier-refund]  # optional: blueprint elements (kind/id) this gap makes uncertain; used by the estimate
sources: [discovery/2026-10-12-kickoff.md, ideas/refund-by-cashier.md]
impact: high                   # high | medium | low — cost if this surfaces during the build
confidence: high               # high | medium | low — how sure we are this is a real gap, not noise
status: open                   # open | validating | resolved | accepted_risk | dismissed
resolution: null               # REQUIRED for resolved | accepted_risk | dismissed
history:
  - {date: 2026-11-24, status: open}
---
```

Body, four sections in this order:
1. `## Finding` — what is missing or contradictory, **quoting** the sources on each side.
2. `## Why it matters` — what breaks or gets reworked if this is discovered during the build.
3. `## Proposed validation` — the cheapest method that settles it, who to ask, rough effort, and the ready-to-use question or script (section 10.3).
4. `## Decision criteria` — which outcome changes which idea, and which outcome makes it safe. Without this, validation is ritual.

Exits: `resolved` (validated; `resolution` points at the evidence), `accepted_risk` (the human knowingly proceeds; the reason is recorded), `dismissed` (not a real gap; the reason is recorded, and dismissal rates measure detection quality).

### 3.9 `blueprint/blueprint.json`

The concrete app definition, **derived** from the ideas by `/openidea:blueprint`. JSON because it is machine-written and machine-checked; people read it through the dashboard.

```json
{
  "generated": "2026-11-24",
  "actors":      [{"id": "cashier", "name": "Cashier", "description": "...", "derived_from": ["refund-by-cashier"]}],
  "entities":    [{"id": "booking", "name": "Booking", "attributes": ["status"], "lifecycle": {"create": "...", "update": "...", "archive": "...", "delete": "..."},
                   "states": ["requested", "confirmed", "cancelled"],
                   "transitions": [{"from": "requested", "to": "confirmed", "flow": "confirm-booking"}, {"from": "requested", "to": "cancelled", "event": "Patient cancels"}],
                   "derived_from": ["..."]}],
  "permissions": [{"actor": "cashier", "action": "refund", "entity": "payment", "allow": true, "derived_from": ["refund-by-cashier"]}],
  "flows":       [{"id": "book", "name": "...", "actor": "patient", "trigger": "...", "steps": ["..."], "scenarios": {"success": "...", "alternative": ["..."], "failure": ["..."], "empty_state": "..."}, "derived_from": ["..."]}],
  "screens":     [{"id": "board", "name": "...", "flows": ["book"], "elements": ["..."], "derived_from": ["..."]}],
  "integrations":[{"id": "whatsapp", "name": "...", "direction": "in | out | both", "data": "...", "derived_from": ["..."]}],
  "nfr":         [{"id": "offline", "category": "offline | scale | latency | security | privacy | availability | compatibility", "requirement": "...", "derived_from": ["..."]}]
}
```

Rules (all checked by the CLI):
- Every element has a unique `id` within its kind and a `derived_from` list of idea ids that exist.
- An element the app needs but no idea states gets `"derived_from": []` **and** `"assumption": true`. That is a hidden assumption, and usually a gap.
- **Mandatory slots** (the depth score): actor `description`; entity `attributes` + all four `lifecycle` keys; flow `actor`, `trigger`, `steps`, `scenarios.success`, `scenarios.failure`, `scenarios.empty_state`; screen `flows` + `elements`; integration `direction` + `data`; nfr `category` + `requirement`. Unknown = `"TBD"` (counted as missing), never invented. A deliberate "does not apply" is written out (`"Never"`, `"n/a: read-only"`), which counts as filled.
- References must resolve: a flow's `actor`, a screen's `flows`, a permission's `actor`/`entity`.
- Two permissions with the same actor, action, and entity but opposite `allow` are a **conflict**.
- Every active `feature` idea should appear in some `derived_from`; one that does not is either stale or too vague to build.
- `states` (optional) lists an entity's statuses, the first being the initial one; `transitions` say what moves between them, via a `flow` id or a plain `event`. Any entity with a `status` attribute should define them. A transition must use known states; a state no transition reaches, or a transition no flow triggers, is flagged as a likely blind spot.

### 3.10 `blueprint/diagrams.md` and the dashboard diagrams

Generated by `openidea diagrams` from `blueprint.json`, never drawn by a model and never edited by hand. Each diagram exists because it exposes a kind of blind spot:

| Diagram | Generated from | Exposes |
|---|---|---|
| Feature list (table) | flows + screens + permissions + ideas' "Done looks like" + gaps + roadmap | features with no screen, no definition of done, open gaps, or undefined scenarios |
| System context (C4 level 1) | actors + integrations | forgotten external systems, unclear direction of data |
| Activity per flow | flow `trigger`, `steps`, `scenarios` | missing failure, alternative, and empty-state branches (drawn as red "not defined" nodes) |
| State machine per entity | entity `states` + `transitions` | forgotten statuses, unreachable states, transitions nobody triggers |

Diagrams are Mermaid: plain text in git, rendered by GitHub in `diagrams.md` and by the dashboard (which loads the Mermaid library from a CDN and falls back to the source text offline). Container or deployment architecture is deliberately **not** generated in the idea phase: it is a design decision, not something the ideas state, and it belongs in the OpenSpec `design.md`.

### 3.11 `blueprint/estimate.json`, `work-breakdown.csv` and `calibration.md`

Phases and timeline are **derived**, never typed in, and written as raw data only (JSON for tools, CSV for spreadsheets); people read them on the dashboard's Roadmap page or in a finished report (section 3.13). `openidea estimate` reads the blueprint, `ROADMAP.md`, open gaps, and `calibration.md`.

- **Phases** = milestones, in ROADMAP order. Each blueprint element belongs to the earliest milestone holding one of its `derived_from` ideas; an idea-less (assumed) element goes to the first phase; elements whose ideas are in no milestone are listed as "not in any milestone" and stay out of the total. Phase 1 also carries project setup; every phase adds a stabilization share (testing, fixes, UAT).
- **Size** = ideal person-days per element from coefficients (entity + attributes + states, flow + steps, screen + elements, integration, both-way integration, actor, NFR). Defaults live in `scripts/lib/estimate.mjs`; any key can be overridden under `coefficients:` as `[low, high]`.
- **Width** = the high end grows +10% per undefined mandatory slot, +25% for an assumption, and +40% / +20% / +5% per open high / medium / low gap that touches the element (the gap's `affects`, or else the buildable elements of its ideas). So a thin definition shows as a wide range, and "What open gaps cost" lists how many days answering each gap removes.
- **Calendar** = person-days ÷ (people × days per week × focus). With a `start` date the end dates are given as a range.
- **Calibration** = every recorded actual divides by the estimated midpoint; the median scales all ranges. Uncalibrated estimates say so.

```yaml
---
team:
  people: 2
  days_per_week: 5
  focus: 0.7          # share of time on this project
start: 2026-12-01     # optional
coefficients:         # optional overrides, [low, high] person-days
  integration: [4, 8]
actuals:
  - {milestone: core-booking, estimate_low: 20, estimate_high: 32, actual_days: 30}
---
```

An estimate is a range with its reasons, not a commitment. Present the range, never only the low end.

### 3.12 `prototype/index.html` and `prototype/review.html`

`openidea prototype` writes two self-contained HTML files that **simulate the blueprint**, not a design. `index.html` is for real users: it looks like the app (sign in as a role, pick a task, go through it step by step to the success screen, see records) and carries nothing meta. `review.html` is for the team and adds what follows: pick a role (actors), walk each flow step by step to its success, failure, empty and alternative outcomes, see screens laid out from their elements, and use sample data whose buttons follow the entity states, transitions and permission matrix. A transition named after a role ("Receptionist confirms") or triggered by a flow belongs to that role; other moves follow the matrix.

Every behaviour the blueprint leaves undefined is drawn in red (a dashed button where nobody decided who may act, a missing outcome, an entity with no attributes, a dead-end state). That is the point: clicking through as each role is a walkthrough (section 10.1) that a non-technical person can do. "Note a problem" copies `/openidea:prototype feedback "<view> as <role>: <note>"`; pasting it creates or extends a gap with `found_by: prototype`.

### 3.13 `reports/report.<md|pptx|pdf>`

Every output is one of three kinds, never a mix: **raw** data for tools (`blueprint.json`, `estimate.json`, `work-breakdown.csv`), **working** views for the team (dashboard, `prototype/review.html`), and **finished** deliverables for clients and users (`prototype/index.html`, the report). Finished outputs carry no meta: no ids, no file paths, no red markers, no commands.

`openidea report --format md|pptx|pdf` renders one content model in the chosen format, all with the same sections: cover, summary (vision, users, value, scope, timeline, number of open questions), features (used by, done when, phase), phases and timeline (ranges with end dates), open questions (impact and the days each could add), assumptions in plain language, later, boundaries (non-goals, constraints from the BRIEF), next steps. PPTX and PDF are written without dependencies (raw OOXML, base-14 PDF fonts); the PPTX stays editable. Same inputs, same bytes.

## 4. Command Index

**Core** (always applies, the solo/default path):

| Command | Prerequisite | Output |
|---|---|---|
| `/openidea:init` | — | `BRIEF.md` |
| `/openidea:capture` | `BRIEF.md` exists | new `ideas/<slug>.md`, status `captured` |
| `/openidea:blueprint` | ≥1 idea `captured` or `ready` | `blueprint/blueprint.json` + gaps from the derivation probe |
| `/openidea:evaluate` | ≥1 idea `captured` | `gaps/*.md` with a validation plan, idea frontmatter updated after review |
| `/openidea:resolve` | ≥1 gap `open` or `validating` | gap closed with evidence, affected ideas updated |
| `/openidea:plan` | ≥1 idea `ready` | `ROADMAP.md` |
| `/openidea:estimate` | `blueprint.json` exists | raw `blueprint/estimate.json` + `work-breakdown.csv` (phases, ranges, cost of open gaps); `actual` records calibration |
| `/openidea:prototype` | `blueprint.json` exists | `prototype/index.html` (real users) + `review.html` (team); `feedback` turns a note into a gap |
| `/openidea:report` | `blueprint.json` exists | `reports/report.md`, `.pptx` or `.pdf`: the finished, client-safe document |
| `/openidea:dashboard` | `BRIEF.md` exists | `dashboard/index.html` (and `client.html` on request) |
| `/openidea:spec-draft` | `openspec/` exists, target milestone has ≥1 idea `ready` and a clear gate | `openspec/changes/<ID>/{proposal,design,tasks}.md` + `specs/<capability>/spec.md`, idea → `promoted` |

**Extended** (situational — only relevant once an external party, e.g. a client or a team without repo access, is involved):

| Command | Prerequisite | Output |
|---|---|---|
| `/openidea:compile` | idea `ready` exists in `ROADMAP.md` | new `proposals/vN.md` |
| `/openidea:export` | — | `exports/<milestone-slug>-vN.md` |
| `/openidea:spec-audit` | `openspec/changes/<milestone>` folder exists | drift report (read-only) |

The flow in one line: **init → capture → blueprint → evaluate ⇄ resolve → plan → spec-draft** is the core loop, always applies; `dashboard` can run at any point; `estimate` and `prototype` render the blueprint, so run them after `blueprint` or `plan` (prototype feedback feeds back into `evaluate ⇄ resolve`). **compile → export → spec-audit** switch on whenever a client or an external, repo-less team is in that cycle — they slot in between `plan` and `spec-draft`, and `spec-audit` runs any time after `spec-draft`.

For process detail on each command, read its file in `commands/`.

Note: `/openidea:release` and `/openidea:list` are **not** separate commands.
- Milestone approval: a natural instruction ("mark Milestone 1 approved from v3") → update `status`+`approved_in` in `ROADMAP.md`.
- Listing questions ("which ideas are ready?", "what's archived?"): answer directly from `ideas/INDEX.md`.
- New ideas mid-project are normal: `/openidea:capture` takes them at any time and reports which blueprint elements, milestones, and approvals they touch (section 10.4).

## 5. Status Lifecycle (per idea)

```
captured ──┬──> ready ──> (in a milestone with a clear gate; approved if proposals/ exists) ──> promoted
           ├──> parked
           ├──> merged (+ merged_into)
           └──> killed (+ triage_note, required)
```

`split` is an additional status: a large idea gets broken up, recorded via `split_into`, moved to `archive/` (not "dead", but "replaced by new entities").

**Gate to `ready`**: an idea cannot move to `ready` while any gap that lists it has `impact: high` and status `open` or `validating`. Ways through: validate it (`resolved`), or the human records `accepted_risk` with a reason. `openidea validate` reports a violation as `gate-blocked`.

Any inactive status can be brought back ("revived"/"corrected") to `captured`, with a new `history[]` entry recording the reason for reviving it — without erasing the trace of the earlier decision.

## 6. Cross-Cutting Principles

| Category | Principle |
|---|---|
| Security | `discovery/` is never included in `exports/` or `proposals/` in any form. |
| Resilience | A failure mid-command is isolated per-file, not total corruption. `ideas/INDEX.md` is always regenerated from a real filesystem scan on every new session, not assumed prior state — this automatically "heals" inconsistencies. |
| Scale | `ideas/INDEX.md` by default only shows detail for active ideas; `archive/`/`promoted/` are represented as summary counts only. |
| Schema versioning | `schema_version` lives in `BRIEF.md`. Any command reading files must be backward-compatible — on an old schema version, fill new fields with safe defaults, don't fail outright. Version 1 projects simply have no `gaps/`, no `blueprint/`, and milestones without **ID** (derived from the name). |
| Client safety in the dashboard | `openidea dashboard --client` drops `discovery/` references, gap bodies and sources, triage notes, chores, and check results. Only the internal dashboard shows raw quotes. |
| Collaboration | Async-only. Git conflicts on auto-generated files are resolved by regenerating, not manual line-by-line resolution. |
| Traceability | No file disappears without a trace. `killed`/`merged`/`split` stay in `archive/` with the reason recorded. Old `proposals/` and `BRIEF.md` versions are archived, not overwritten. |
| Non-feature (chore) | `type: chore` uses the simplified 5Q, is excluded from `/openidea:compile` (client-facing), but still included in `/openidea:export` (technical package). |

## 7. `ideas/INDEX.md` Regeneration Procedure

Invoked by `/openidea:capture`, `/openidea:evaluate`, `/openidea:resolve`, `/openidea:plan`, `/openidea:spec-draft` after changing state — and may be invoked standalone at any time to "heal" inconsistencies.

**Run `openidea index` (section 9).** It implements the steps below deterministically, adds the decision queue and blueprint depth, and writes no timestamp, so an unchanged project produces no diff. Follow the manual steps only when Node.js is not available, and say so to the user.

1. Scan the real filesystem: `ideas/*.md` (active), `ideas/archive/*.md`, `ideas/promoted/*.md`. Don't trust cache or prior assumed state.
2. Show summarized detail for all active ideas (`captured`, `ready`, `parked`): id, status, category, updated.
3. For `archive/` and `promoted/`, show **counts only** (e.g. "47 archived, 32 promoted — see the respective folder").
4. Section **"Ready but not yet planned"** — `ready` ideas whose id doesn't appear in any `ROADMAP.md` milestone.
5. Section **"Needs clarification"** — ideas with `needs_clarification: true`.
6. Section **"Anomalies"** — flag:
   - status inconsistent with the file's location (e.g. `killed` but still under `ideas/`, not `ideas/archive/`)
   - `killed` without a `triage_note`
   - `depends_on` pointing at a slug that doesn't exist
7. Rewrite `ideas/INDEX.md` in full (not a partial patch) — this file isn't an independent source of truth.

## 8. Implementation Notes

- Every command **must** validate its prerequisites before executing, and fail with a clear message if unmet — never silent failure or assumption.
- Prioritize *blocking* guard rails (direct circular dependency, empty milestone at spec-draft, missing `openspec/`) over *advisory* ones (repeated-revision observation, category-overlap notice). Advisory checks must never block the workflow.
- If ambiguity comes up during execution, ask the user — don't assume or make up field content.
- After any command that writes files under `openidea/`, run `openidea validate` and then `openidea index` (section 9). Fix every **error** the command itself introduced before reporting success; show remaining warnings to the user. Never edit a file just to silence a check without the change being true.

## 9. The `openidea` CLI

A zero-dependency Node.js (18+) script shipped inside this skill: `scripts/openidea.mjs`. When this skill loads, Claude Code shows its base directory; the CLI path is `<that directory>/scripts/openidea.mjs`. Run it from the project root:

```
node <skill dir>/scripts/openidea.mjs validate            # exit 1 on any error
node <skill dir>/scripts/openidea.mjs validate --json     # machine-readable
node <skill dir>/scripts/openidea.mjs index               # rewrite ideas/INDEX.md
node <skill dir>/scripts/openidea.mjs diagrams            # write blueprint/diagrams.md (feature list + Mermaid)
node <skill dir>/scripts/openidea.mjs dashboard           # write dashboard/index.html
node <skill dir>/scripts/openidea.mjs dashboard --client  # write dashboard/client.html
node <skill dir>/scripts/openidea.mjs estimate            # write blueprint/estimate.json + work-breakdown.csv (raw)
node <skill dir>/scripts/openidea.mjs prototype           # write prototype/index.html (users) + review.html (team)
node <skill dir>/scripts/openidea.mjs report --format pptx  # reports/report.pptx (also md, pdf)
```

`validate` checks: frontmatter parses; idea id = file name; status enums; status matches folder; `killed` → `triage_note`; `merged` → `merged_into`; `split` → `split_into`; `ready` → `category`; history is current; `depends_on` exists and has no cycle; merge targets are not killed; gap fields, enums, `question`, and `resolution`; the ready gate; milestone ID format and uniqueness, missing ideas, an idea in two milestones, dependency order across milestones; blueprint ids, `derived_from`, assumptions, references, permission conflicts, ideas missing from the blueprint, and a stale blueprint.

The dashboard has five sections, ordered by the questions a reader brings: **Overview** (what needs my decision: health stats, the ranked decision queue, milestone gates), **Features** (what the app does; each feature page holds its activity diagram and open gaps), **Roadmap** (what ships when), **Blueprint** (how it is structured: system context, elements with their state machines, permission matrix), **Ideas** (where it all came from). Checks and the full diagram list are reached from Overview and Blueprint, not from the main navigation. On phones the navigation is a bottom tab bar.

Frontmatter must stay within the YAML subset the CLI reads: `key: value`, nested maps by indentation, block lists (`- item`), flow lists (`[a, b]`), flow maps (`{k: v}`), quoted strings, `null`, booleans, numbers, `|`/`>` block scalars, and `#` comments. Anything else is reported as a parse error, never guessed.

If Node.js is not installed, tell the user once, then follow the manual procedures (section 7) and apply the same rules by reading the files.

## 10. Blind-Spot Detection

Blind spots are by definition **not written** in the sources, so reading more carefully does not find them. Four mechanisms do. `/openidea:blueprint` runs the first; `/openidea:evaluate` runs all four.

### 10.1 The four mechanisms

1. **Derivation probe** (`found_by: probe`) — deriving a concrete blueprint forces decisions. Every element the app needs that no idea states becomes `assumption: true` → a gap. Every idea that yields no element is too vague → a gap. Every mandatory slot nobody can fill is a `TBD` → a gap when it matters.
2. **Coverage** (`found_by: coverage`) — check every idea and the blueprint against the checklist in 10.2, plus any `openidea/checklists/*.md`.
3. **Consistency** (`found_by: consistency`) — compare idea vs idea, idea vs `discovery/` sources, idea vs `BRIEF.md` (Non-goals, Constraints). Every finding **quotes both sides**. Structural conflicts (permissions, dependencies) come from the CLI; semantic ones from reading.
4. **Domain knowledge** (`found_by: domain`) — regulations and well-known patterns for the BRIEF's domain that nobody mentioned. Mark `confidence` honestly; this mechanism is the most prone to invented problems.

Optional, when time allows: a **persona walkthrough** (`found_by: walkthrough`) — step through each flow as a specific person (a rushed cashier, a first-time user, someone abusing the system, ops during an outage) and record every dead end.

### 10.2 Default coverage checklist

- Roles and permissions: who may do each action; who may not; who approves.
- Data lifecycle: how each entity is created, changed, archived, deleted; what happens to related data.
- States and edge cases: empty, error, partial, duplicate, concurrent edits, undo.
- Failure modes: what the user sees when an integration, the network, or payment fails.
- Non-functional: offline, scale, latency, device constraints, availability.
- Integrations: direction, ownership of data, rate limits, credentials, sandbox availability.
- Privacy and compliance: personal or sensitive data, consent, retention, local regulation.
- Migration: existing data or process being replaced (`replaces`), cut-over, parallel running.
- Success metric: how anyone will know the idea worked.

### 10.3 Validation plan per kind

| kind | Typical blind spot | Cheapest validation | Who |
|---|---|---|---|
| `decision` | A choice nobody has made | One closed question with options | Product owner |
| `clarification` | Two sources disagree | A question quoting both sources | The stakeholders named in the sources |
| `desirability` | Will users actually want or do this? | 5 short interviews (script included), a landing test, or existing data | Real users |
| `feasibility` | Can it be built as described? | A time-boxed spike or a documentation check | Engineer |
| `compliance` | Is it allowed? | A regulation check and a list of questions for legal | Legal or adviser |

Ranking: `impact × confidence`, cheapest kind first on ties. Show the human **at most 5** gaps per cycle (the decision queue); the rest stay in `gaps/` and in the counts. Fifty questions at once get rubber-stamped, and the blind spots slip through again.

Results of a validation (an answer, interview notes, a spike result) are saved under `discovery/` and cited in the gap's `resolution`, then the affected ideas are updated and the blueprint regenerated.

### 10.4 New ideas mid-project

A new idea is normal, not a failure. On capture, report its impact before anything else changes:
- which existing ideas it overlaps or contradicts;
- which blueprint elements (actors, entities, flows, permissions) it would add or change;
- which milestones it touches, and whether any of them is `approved` (approval will reset if it joins one).

Classify it as **additive** (new elements only), **modifying** (changes an element an approved milestone depends on), or **conflicting** (contradicts a decision or a resolved gap). Then re-run `/openidea:blueprint` and `/openidea:evaluate` for the affected ideas only, so the rest of the definition stays stable.
