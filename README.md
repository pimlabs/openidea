# OpenIdea

A Claude Code plugin for managing a product idea lifecycle end-to-end, file-based — from product vision (`BRIEF.md`), raw idea capture, evaluation & categorization, roadmap planning, through to drafting technical specs into [OpenSpec](https://github.com/Fission-AI/OpenSpec).

## Install

```
/plugin marketplace add pimlabs/openidea
/plugin install openidea@pimlabs
```

## Quick Start

A typical solo flow, start to finish:

```
/openidea:init
  → tell it your product vision in your own words
  → writes openidea/BRIEF.md

/openidea:capture
  → describe an idea, or paste in meeting notes to extract several
  → writes openidea/ideas/<slug>.md, status: captured

/openidea:evaluate
  → reviews captured ideas for overlap/conflict, recommends a status
  → you approve → status: ready

/openidea:plan
  → arranges ready ideas into a milestone
  → writes openidea/ROADMAP.md

/openidea:spec-draft <milestone name>
  → requires an existing openspec/ folder (from OpenSpec tooling)
  → generates openspec/changes/<milestone>/{proposal,design,tasks}.md
  → idea status: promoted
```

If a client or an external team is involved, `/openidea:compile` (client-facing proposal narrative) and `/openidea:export` (technical handoff package) slot in between `plan` and `spec-draft`; `/openidea:spec-audit` checks the OpenSpec output against the source ideas afterward. See `skills/openidea/SKILL.md` section 4 for when each applies.

## Commands

| Command | What it does |
|---|---|
| `/openidea:init` | Structure a product vision → `openidea/BRIEF.md` |
| `/openidea:capture` | Capture a new idea (free-form story or document extraction) |
| `/openidea:evaluate` | Evaluate `captured` ideas — overlap/conflict, status recommendation |
| `/openidea:plan` | Arrange `ready` ideas into `openidea/ROADMAP.md` |
| `/openidea:spec-draft` | Generate an OpenSpec proposal/design/tasks from a milestone |
| `/openidea:compile` | Compile `ready` ideas into a client-facing proposal narrative |
| `/openidea:export` | Package a milestone's technical content for external handoff |
| `/openidea:spec-audit` | Read-only drift audit — OpenSpec vs proposal/ideas |

Full detail on the philosophy, file schemas, and status lifecycle: see `skills/openidea/SKILL.md`.

## Structure

```
.claude-plugin/       plugin + marketplace manifest
skills/openidea/      schema & principles (shared reference for all commands)
commands/             8 commands, /openidea:*
```

Once the plugin is used in a project, the commands above write state into an `openidea/` folder at that project's root.

## Development

```
scripts/test.sh
```

Runs `claude plugin validate` plus a smoke test of all 8 `/openidea:*` commands via `--plugin-dir` from an empty directory, failing if any command doesn't resolve. Run it before every push.

See `CONTRIBUTING.md` for the full contribution/versioning workflow.

## License

[MIT](LICENSE)
