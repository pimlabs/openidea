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
  edit(d, 'blueprint/blueprint.json', (s) => {
    const bp = JSON.parse(s);
    delete bp.entities.find((e) => e.id === 'chair').assumption;
    return JSON.stringify(bp);
  });
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

test('a transition to an unknown state is an error; unreachable states and untriggered transitions are flagged', async () => {
  const d = copyFixture();
  const all = () => validateProject(loadProject(d));
  assert.ok(all().some((i) => i.code === 'state-unreachable' && /no_show/.test(i.message)));
  assert.ok(all().some((i) => i.code === 'transition-no-flow'));
  edit(d, 'blueprint/blueprint.json', (s) => s.replace('"to": "completed"', '"to": "done"'));
  assert.ok(codes(d).includes('bp-ref'));
});

test('diagrams mark undefined branches and unreachable states, and list features', async () => {
  const { activityDiagram, stateDiagram, features, renderDiagramsMd } = await import('../skills/openidea/scripts/lib/diagrams.mjs');
  const p = loadProject(FIXTURE);
  const occ = p.blueprint.flows.find((f) => f.id === 'view-occupancy');
  assert.match(activityDiagram(occ), /failure: not defined/);
  assert.match(activityDiagram(occ), /class .*fail0.* missing/);
  const booking = p.blueprint.entities.find((e) => e.id === 'booking');
  assert.match(stateDiagram(booking), /class s_no_show missing/);
  const f = features(p, []);
  assert.equal(f.length, 2);
  assert.deepEqual(f.find((x) => x.id === 'view-occupancy').missing, ['scenario: failure', 'scenario: empty state']);
  const md = renderDiagramsMd(p, 'Klinik', []);
  assert.equal(md, renderDiagramsMd(loadProject(FIXTURE), 'Klinik', []));
  assert.match(md, /```mermaid\nflowchart LR/);
});

test('estimate: phases follow milestones, gaps widen only what they affect, calibration scales', async () => {
  const { estimate, renderEstimateJson, renderWorkCsv } = await import('../skills/openidea/scripts/lib/estimate.mjs');
  const e = estimate(loadProject(FIXTURE));
  assert.deepEqual(e.phases.map((p) => p.id), ['core-booking']);
  const items = Object.fromEntries(e.phases[0].items.map((i) => [i.id, i]));
  assert.ok(items.whatsapp.reasons.some((r) => r.includes('wa-api-limits')));
  assert.ok(!items.patient.reasons.length, 'a gap with affects does not widen actors');
  assert.ok(items.chair.reasons.includes('assumption, no idea states it'));
  assert.ok(e.unplanned.some((i) => i.id === 'payment'), 'elements of unplanned ideas stay out of the total');
  assert.ok(e.gapCost[0].id === 'wa-api-limits' && e.gapCost[0].days > 0);
  assert.equal(e.total.endDate.length, 2);
  const j = JSON.parse(renderEstimateJson(loadProject(FIXTURE)));
  assert.equal(j.schema, 'openidea.estimate/1');
  assert.equal(renderEstimateJson(loadProject(FIXTURE)), renderEstimateJson(loadProject(FIXTURE)));
  const csv = renderWorkCsv(loadProject(FIXTURE)).trim().split('\n');
  assert.equal(csv[0], 'phase_id,phase,kind,id,name,low_days,high_days,ideas,uncertainty');
  assert.ok(csv.some((l) => l.startsWith('core-booking,Core Booking,integration,whatsapp,')));
  const d = copyFixture();
  edit(d, 'calibration.md', (s) => s.replace('actuals: []', 'actuals:\n  - {milestone: core-booking, estimate_low: 10, estimate_high: 10, actual_days: 20}'));
  const e2 = estimate(loadProject(d));
  assert.equal(e2.calibration.factor, 2);
  assert.ok(e2.total.low >= e.total.low * 2 - 1);
});

test('prototype: renders roles, flows and data from the blueprint, deterministic, no network', async () => {
  const { renderPrototype, prototypePayload } = await import('../skills/openidea/scripts/lib/prototype.mjs');
  const p = loadProject(FIXTURE);
  const html = renderPrototype(p, 'Klinik');
  assert.equal(html, renderPrototype(loadProject(FIXTURE), 'Klinik'));
  assert.ok(!/<script[^>]+src=/.test(html), 'self-contained');
  const d = prototypePayload(p, 'Klinik');
  assert.deepEqual(d.actors.map((a) => a.id), ['patient', 'receptionist', 'cashier']);
  assert.ok(d.screens.find((s) => s.id === 'occupancy-board').entities.includes('chair'));
  assert.ok(!html.includes('discovery/'), 'prototype carries no discovery material');
  const review = renderPrototype(p, 'Klinik', { mode: 'review' });
  assert.match(html, /"mode":"user"/);
  assert.match(review, /"mode":"review"/);
});
