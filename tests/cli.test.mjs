// Run with: node --test tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseYaml } from '../skills/openidea/scripts/lib/yaml.mjs';
import { loadProject } from '../skills/openidea/scripts/lib/load.mjs';
import { validateProject } from '../skills/openidea/scripts/lib/validate.mjs';
import { renderIndex } from '../skills/openidea/scripts/lib/indexmd.mjs';
import { renderDashboard } from '../skills/openidea/scripts/lib/dashboard.mjs';

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'clinic');

function copyFixture() {
  const dir = mkdtempSync(join(tmpdir(), 'openidea-'));
  cpSync(FIXTURE, dir, { recursive: true });
  return dir;
}
const edit = (dir, rel, fn) => {
  const p = join(dir, 'openidea', rel);
  writeFileSync(p, fn(readFileSync(p, 'utf8')));
};
const codes = (dir) => validateProject(loadProject(dir)).filter((i) => i.level === 'error').map((i) => i.code);

test('yaml subset: flow maps, flow lists, block lists, quotes, comments, nulls', () => {
  const y = parseYaml('a: 1\nb: "x, y"  # note\nc: [p, "q, r"]\nd: null\nh:\n  - {date: 2026-01-01, status: ready}\nl:\n- one\n- two\n');
  assert.deepEqual(y, { a: 1, b: 'x, y', c: ['p', 'q, r'], d: null, h: [{ date: '2026-01-01', status: 'ready' }], l: ['one', 'two'] });
});

test('yaml subset: malformed input fails loudly with a line number', () => {
  assert.throws(() => parseYaml('a: [1, 2\n'), /line 1/);
});

test('the clinic fixture passes every check', () => {
  assert.deepEqual(codes(FIXTURE), []);
});

test('killed without triage_note is an error', () => {
  const d = copyFixture();
  edit(d, 'ideas/archive/sms-reminder.md', (s) => s.replace(/triage_note:.*\n/, ''));
  assert.ok(codes(d).includes('killed-no-triage'));
});

test('status that does not match the folder is an error', () => {
  const d = copyFixture();
  renameSync(join(d, 'openidea/ideas/archive/sms-reminder.md'), join(d, 'openidea/ideas/sms-reminder.md'));
  assert.ok(codes(d).includes('idea-location'));
});

test('a dependency cycle is an error', () => {
  const d = copyFixture();
  edit(d, 'ideas/wa-booking.md', (s) => s.replace('depends_on: []', 'depends_on: [occupancy-dashboard]'));
  assert.ok(codes(d).includes('dependency-cycle'));
});

test('gate: a ready idea with an open high-impact gap is blocked', () => {
  const d = copyFixture();
  edit(d, 'ideas/refund-by-cashier.md', (s) => s.replace('status: captured', 'status: ready').replace('  - {date: 2026-10-15, status: captured}', '  - {date: 2026-10-15, status: captured}\n  - {date: 2026-10-16, status: ready}'));
  assert.ok(codes(d).includes('gate-blocked'));
  edit(d, 'gaps/refund-permission.md', (s) => s.replace('status: open', 'status: accepted_risk').replace('resolution: null', 'resolution: Owner allows it below 500k.'));
  assert.ok(!codes(d).includes('gate-blocked'));
});

test('resolving a gap requires a resolution note', () => {
  const d = copyFixture();
  edit(d, 'gaps/wa-api-limits.md', (s) => s.replace('status: open', 'status: resolved'));
  assert.ok(codes(d).includes('gap-resolution'));
});

test('two ideas giving opposite permissions is a conflict', () => {
  const d = copyFixture();
  edit(d, 'blueprint/blueprint.json', (s) => {
    const bp = JSON.parse(s);
    bp.permissions.push({ actor: 'cashier', action: 'refund', entity: 'payment', allow: false, derived_from: ['wa-booking'] });
    return JSON.stringify(bp);
  });
  assert.ok(codes(d).includes('permission-conflict'));
});

test('a blueprint element with no source must be marked as an assumption', () => {
  const d = copyFixture();
  edit(d, 'blueprint/blueprint.json', (s) => s.replace('"derived_from": [], "assumption": true', '"derived_from": []'));
  assert.ok(codes(d).includes('bp-untraced'));
});

test('duplicate milestone IDs are an error', () => {
  const d = copyFixture();
  edit(d, 'ROADMAP.md', (s) => `${s}\n## Milestone 2 — Core booking\n**ID**: core-booking\n**Status**: draft\n\n- occupancy-dashboard\n`);
  assert.ok(codes(d).includes('milestone-id-duplicate'));
});

test('INDEX.md is deterministic and lists the decision queue', () => {
  const p = loadProject(FIXTURE);
  const issues = validateProject(p);
  const a = renderIndex(p, issues);
  assert.equal(a, renderIndex(loadProject(FIXTURE), validateProject(loadProject(FIXTURE))));
  assert.match(a, /\| refund-permission \| clarification \| high \| high \|/);
  assert.match(a, /Depth: 93% \(43\/46/);
});

test('client dashboard leaks no discovery material, chores, or checks', () => {
  const p = loadProject(FIXTURE);
  const html = renderDashboard(p, validateProject(p), { mode: 'client' });
  assert.doesNotMatch(html, /kickoff|discovery\//);
  assert.doesNotMatch(html, /migrate-spreadsheet/);
  const internal = renderDashboard(p, validateProject(p));
  assert.match(internal, /kickoff/);
  assert.match(internal, /migrate-spreadsheet/);
});
