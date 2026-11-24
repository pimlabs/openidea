# Contributing

## Layout

```
.claude-plugin/plugin.json       plugin manifest
.claude-plugin/marketplace.json  marketplace manifest (source: "./", this same repo)
skills/openidea/SKILL.md         schema, philosophy, and principles — the shared reference all commands point back to
skills/openidea/scripts/         the openidea CLI: zero-dependency Node.js, deterministic checks and renderers
commands/*.md                    the 11 /openidea:* commands, flat (no subfolders — a subfolder adds an extra namespace segment)
tests/                           CLI unit tests (node --test) and the clinic example project used as a fixture
scripts/test.sh                  unit tests + manifest validation + all commands resolve via --plugin-dir
```

## Making a change

1. Edit `skills/openidea/SKILL.md` for schema/philosophy changes, or the relevant `commands/*.md` for a single command's process.
2. Keep schema details in `SKILL.md` only — commands should reference a section number, not duplicate the schema.
3. A rule that can be decided by reading files belongs in the CLI (`skills/openidea/scripts/lib/validate.mjs`), with a test in `tests/cli.test.mjs`, not only in a prompt. Keep the CLI dependency-free: the plugin must run wherever Node.js runs, with no install step.
4. Run the tests before pushing:
   ```
   scripts/test.sh
   ```
   It runs the CLI unit tests, `claude plugin validate .`, plus a live `--plugin-dir` invocation of every command from an empty directory, and fails if any resolves as "Unknown command". This is what caught a stale hardcoded path bug during the initial build — don't skip it.
5. For anything beyond a resolution check (a command's actual file-writing behavior), test it in a real or scratch project directory: run through `init → capture → blueprint → evaluate → resolve → plan → dashboard → spec-draft`, and `compile`/`export`/`spec-audit` if touched.

## Versioning

Semver in `.claude-plugin/plugin.json`:
- **patch** — bug fix, no behavior change (e.g. a stale path reference)
- **minor** — new command, new optional field, backward-compatible schema addition
- **major** — breaking change (e.g. renaming the plugin/command namespace, removing a field, changing required frontmatter)

Note the marketplace here sources from `"./"` (this repo's `main` branch) — installs/updates track the branch directly rather than pinning to a specific tagged version, so `version` is primarily a human-readable signal in commit history, not an install-time pin.

Still pre-1.0 (`0.x.y`): breaking changes are expected and don't need a major bump yet — bump the minor instead for anything notable.

## Commit messages

State the "why," not just the "what" — the diff already shows what changed. See `git log` for the established style.
