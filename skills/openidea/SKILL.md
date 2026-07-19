---
name: openidea
description: Manage a product idea lifecycle end-to-end, file-based — from product vision (BRIEF.md), raw idea capture, evaluation & categorization, roadmap planning, through to technical spec drafting (OpenSpec). Auto-triggers when the user mentions "openidea", "capture idea", "product roadmap", "client proposal", "product brief", or runs /openidea:init, /openidea:capture, /openidea:evaluate, /openidea:plan, /openidea:spec-draft, /openidea:compile, /openidea:export, /openidea:spec-audit.
---

# OpenIdea

A file-based product idea management system. State lives in markdown under an `openidea/` folder at the project root. This skill is the single reference for file schemas, design principles, and the index-regeneration procedure shared by all `/openidea:*` commands.

Individual commands live in `commands/*.md` in this plugin's repo. Each command file is self-contained (prerequisites + process + output), but still refers back to this document for schema details — don't duplicate schema in command files, just point to the relevant section here.

## 1. Core Philosophy

- **File-based** — all state lives in markdown, git-friendly, diffable, readable without extra tools.
- **Human decides, Claude drafts** — Claude structures content and makes recommendations; the final decision always rests with the user. Never change an idea's/milestone's status without user review, unless explicitly requested ("mark Milestone 1 approved").
- **Independent from OpenSpec** — OpenIdea never writes directly to `openspec/changes/` or `openspec/specs/` except via `/openidea:spec-draft`. It doesn't depend on the generic `openspec-drafter` skill.
- **Portable** — everything under `openidea/` must be understandable by a human or another AI without additional conversational context. This skill is distributed as an installable plugin, not a personal skill.
- **Async-only** — designed for solo work or turn-based handoff across people/time, not simultaneous real-time multi-user editing. Git conflicts on auto-generated files (`ideas/INDEX.md`) are resolved by regenerating, not manual line-by-line merge.
- **Nothing disappears** — status changes, but files are never deleted or overwritten without a trace. History is always recorded in the `history[]` field.

## 2. Folder Structure

```
project/
├── openidea/
│   ├── BRIEF.md                 ← product vision, static, has schema_version & project_status
│   ├── ROADMAP.md               ← milestones, execution order, per-milestone approval
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
schema_version: 1
project_status: active   # active | cancelled
---
```

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
**Status**: approved
**Approved in**: proposals/v3.md

- wa-booking
- occupancy-dashboard-basic

## Milestone 2 — Finance Module
**Status**: draft

- billing-insurance-integration
```

Rules:
- Heading order top-to-bottom = execution order.
- The milestone name **must** be identical to the folder name later used at `openspec/changes/<name>/`. The slug derived from the milestone name must be unique (validated in `/openidea:plan`).
- Per-milestone status: `draft` | `approved` — not a per-document proposal status.
- **Approved in** is only filled in when status is `approved`, pointing to the specific proposal version where it was approved.
- This field auto-resets (`status: draft`, `approved_in: null`) if an idea is moved into/out of that milestone after it was approved.

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

## 4. Command Index

| Command | Prerequisite | Output |
|---|---|---|
| `/openidea:init` | — | `BRIEF.md` |
| `/openidea:capture` | `BRIEF.md` exists | new `ideas/<slug>.md`, status `captured` |
| `/openidea:evaluate` | ≥1 idea `captured` | idea frontmatter updated, moved to `archive/` if final |
| `/openidea:plan` | ≥1 idea `ready` | `ROADMAP.md` |
| `/openidea:spec-draft` | `openspec/` exists, target milestone has ≥1 idea `ready` | `openspec/changes/<milestone>/{proposal,design,tasks}.md`, idea → `promoted` |
| `/openidea:compile` | idea `ready` exists in `ROADMAP.md` | new `proposals/vN.md` |
| `/openidea:export` | — | `exports/<milestone-slug>-vN.md` |
| `/openidea:spec-audit` | `openspec/changes/<milestone>` folder exists | drift report (read-only) |

For process detail on each command, read its file in `commands/`.

Note: `/openidea:release` and `/openidea:list` are **not** separate commands.
- Milestone approval: a natural instruction ("mark Milestone 1 approved from v3") → update `status`+`approved_in` in `ROADMAP.md`.
- Listing questions ("which ideas are ready?", "what's archived?"): answer directly from `ideas/INDEX.md`.

## 5. Status Lifecycle (per idea)

```
captured ──┬──> ready ──> (added to a milestone, approved) ──> promoted
           ├──> parked
           ├──> merged (+ merged_into)
           └──> killed (+ triage_note, required)
```

`split` is an additional status: a large idea gets broken up, recorded via `split_into`, moved to `archive/` (not "dead", but "replaced by new entities").

Any inactive status can be brought back ("revived"/"corrected") to `captured`, with a new `history[]` entry recording the reason for reviving it — without erasing the trace of the earlier decision.

## 6. Cross-Cutting Principles

| Category | Principle |
|---|---|
| Security | `discovery/` is never included in `exports/` or `proposals/` in any form. |
| Resilience | A failure mid-command is isolated per-file, not total corruption. `ideas/INDEX.md` is always regenerated from a real filesystem scan on every new session, not assumed prior state — this automatically "heals" inconsistencies. |
| Scale | `ideas/INDEX.md` by default only shows detail for active ideas; `archive/`/`promoted/` are represented as summary counts only. |
| Schema versioning | `schema_version` lives in `BRIEF.md`. Any command reading files must be backward-compatible — on an old schema version, fill new fields with safe defaults, don't fail outright. |
| Collaboration | Async-only. Git conflicts on auto-generated files are resolved by regenerating, not manual line-by-line resolution. |
| Traceability | No file disappears without a trace. `killed`/`merged`/`split` stay in `archive/` with the reason recorded. Old `proposals/` and `BRIEF.md` versions are archived, not overwritten. |
| Non-feature (chore) | `type: chore` uses the simplified 5Q, is excluded from `/openidea:compile` (client-facing), but still included in `/openidea:export` (technical package). |

## 7. `ideas/INDEX.md` Regeneration Procedure

Invoked by `/openidea:capture`, `/openidea:evaluate`, `/openidea:plan`, `/openidea:spec-draft` after changing idea state — and may be invoked standalone at any time to "heal" inconsistencies.

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
