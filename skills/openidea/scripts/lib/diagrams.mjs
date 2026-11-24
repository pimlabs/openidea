// Diagrams and the feature list are generated from the blueprint by code, never drawn
// by a model: the same blueprint always yields the same diagrams, and a missing branch
// or state shows up as a visible "not defined" node instead of being smoothed over.
import { isFilled } from './validate.mjs';

const nid = (s) => 'n_' + String(s).replace(/[^A-Za-z0-9_]/g, '_');
const label = (s) => '"' + String(s ?? '').replace(/"/g, '#quot;').replace(/[\r\n]+/g, ' ') + '"';
const listOf = (v) => (Array.isArray(v) ? v : isFilled(v) ? [v] : []).filter(isFilled);

export function contextDiagram(bp, projectName) {
  const out = ['flowchart LR'];
  out.push(`  SYS[[${label(projectName || 'The system')}]]`);
  for (const a of bp.actors || []) out.push(`  ${nid('a_' + a.id)}([${label(a.name || a.id)}]) --> SYS`);
  for (const i of bp.integrations || []) {
    const n = nid('i_' + i.id);
    out.push(`  ${n}[(${label(i.name || i.id)})]`);
    const data = isFilled(i.data) ? `|${label(i.data)}|` : '';
    if (i.direction === 'in') out.push(`  ${n} -->${data} SYS`);
    else if (i.direction === 'out') out.push(`  SYS -->${data} ${n}`);
    else if (i.direction === 'both') out.push(`  SYS <-->${data} ${n}`);
    else out.push(`  SYS -. ${label('direction not defined')} .- ${n}`);
  }
  out.push('  classDef missing fill:#fbe9e7,stroke:#b3261e,color:#b3261e');
  return out.join('\n');
}

export function activityDiagram(flow) {
  const out = ['flowchart TD'];
  const actor = isFilled(flow.actor) ? flow.actor : 'actor not defined';
  out.push(`  start([${label(`${actor}: ${isFilled(flow.trigger) ? flow.trigger : 'trigger not defined'}`)}])`);
  const missing = [];
  if (!isFilled(flow.trigger) || !isFilled(flow.actor)) missing.push('start');
  let prev = 'start';
  const steps = listOf(flow.steps);
  if (steps.length === 0) { out.push(`  s0[${label('Steps not defined')}]`); missing.push('s0'); out.push(`  ${prev} --> s0`); prev = 's0'; }
  steps.forEach((st, i) => { out.push(`  s${i + 1}[${label(st)}]`); out.push(`  ${prev} --> s${i + 1}`); prev = `s${i + 1}`; });
  out.push(`  outcome{${label('Outcome')}}`);
  out.push(`  ${prev} --> outcome`);
  const sc = flow.scenarios || {};
  const branch = (key, text, n, edge) => {
    const filled = isFilled(text);
    out.push(`  ${n}([${label(filled ? text : `${edge}: not defined`)}])`);
    out.push(`  outcome -->|${label(edge)}| ${n}`);
    if (!filled) missing.push(n);
  };
  branch('success', sc.success, 'ok', 'success');
  listOf(sc.alternative).forEach((t, i) => branch('alternative', t, `alt${i}`, 'alternative'));
  const failures = listOf(sc.failure);
  if (failures.length === 0) branch('failure', null, 'fail0', 'failure');
  else failures.forEach((t, i) => branch('failure', t, `fail${i}`, 'failure'));
  branch('empty_state', sc.empty_state, 'empty', 'nothing to show');
  out.push('  classDef missing fill:#fbe9e7,stroke:#b3261e,color:#b3261e');
  if (missing.length) out.push(`  class ${missing.join(',')} missing`);
  return out.join('\n');
}

export function stateDiagram(entity) {
  const states = Array.isArray(entity.states) ? entity.states : [];
  if (!states.length) return null;
  const out = ['stateDiagram-v2'];
  const sid = (s) => 's_' + String(s).replace(/[^A-Za-z0-9_]/g, '_');
  for (const st of states) out.push(`  state ${label(st)} as ${sid(st)}`);
  out.push(`  [*] --> ${sid(states[0])}`);
  const incoming = new Set();
  const outgoing = new Set();
  for (const t of entity.transitions || []) {
    if (!states.includes(t.from) || !states.includes(t.to)) continue;
    incoming.add(t.to); outgoing.add(t.from);
    const why = isFilled(t.flow) ? t.flow : isFilled(t.event) ? t.event : 'trigger not defined';
    out.push(`  ${sid(t.from)} --> ${sid(t.to)} : ${String(why).replace(/[:;\n]/g, ' ')}`);
  }
  for (const st of states) if (st !== states[0] && !outgoing.has(st) && incoming.has(st)) out.push(`  ${sid(st)} --> [*]`);
  const unreachable = states.slice(1).filter((st) => !incoming.has(st));
  out.push('  classDef missing fill:#fbe9e7,stroke:#b3261e,color:#b3261e');
  for (const st of unreachable) out.push(`  class ${sid(st)} missing`);
  return out.join('\n');
}

function doneLooksLike(body) {
  const m = String(body || '').match(/Done looks like\**\s*[:：]?\s*\**\s*[—–-]?\s*(.+)/i);
  return m ? m[1].replace(/\*\*/g, '').trim() : null;
}

// One feature per flow: the unit a user would recognise ("Book an appointment").
export function features(p, openGapList) {
  const bp = p.blueprint;
  if (!bp) return [];
  const ideaById = new Map(p.ideas.filter((i) => i.data).map((i) => [i.data.id, i]));
  const milestoneOf = new Map();
  for (const m of p.roadmap?.milestones || []) for (const id of m.ideas) milestoneOf.set(id, m.name);
  return (bp.flows || []).map((f) => {
    const ideas = listOf(f.derived_from);
    const screens = (bp.screens || []).filter((s) => (s.flows || []).includes(f.id)).map((s) => s.name || s.id);
    const perms = (bp.permissions || []).filter((pm) => pm.actor === f.actor).map((pm) => `${pm.allow ? '' : 'not '}${pm.action}${pm.entity ? ' ' + pm.entity : ''}`);
    const done = ideas.map((id) => doneLooksLike(ideaById.get(id)?.body)).filter(isFilled);
    const gaps = openGapList.filter((g) => (g.data.ideas || []).some((id) => ideas.includes(id))).map((g) => g.data.id);
    const statuses = [...new Set(ideas.map((id) => ideaById.get(id)?.data.status).filter(Boolean))];
    const milestones = [...new Set(ideas.map((id) => milestoneOf.get(id)).filter(Boolean))];
    const sc = f.scenarios || {};
    const missing = ['trigger', 'steps'].filter((k) => !isFilled(f[k])).concat(['success', 'failure', 'empty_state'].filter((k) => !isFilled(sc[k])).map((k) => `scenario: ${k.replace('_', ' ')}`));
    return { id: f.id, name: f.name || f.id, actor: f.actor, ideas, screens, permissions: perms, done, gaps, statuses, milestones, missing, assumption: f.assumption === true };
  });
}

export function renderDiagramsMd(p, projectName, openGapList) {
  const bp = p.blueprint;
  const out = ['# Features and diagrams', '', '_Generated by `openidea diagrams` from `blueprint.json`. Do not edit by hand: change the ideas, re-run `/openidea:blueprint`, regenerate. Red nodes are details nobody has defined yet._', ''];
  if (!bp) { out.push('_No blueprint yet._'); return out.join('\n'); }
  const cell = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
  out.push('## Feature list', '', '| Feature | Actor | Screens | Done looks like | Ideas | Open gaps | Milestone | Missing |', '| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const f of features(p, openGapList)) out.push(`| ${cell(f.name)} | ${cell(f.actor)} | ${cell(f.screens.join(', '))} | ${cell(f.done.join(' / '))} | ${cell(f.ideas.join(', ') || 'assumption')} | ${cell(f.gaps.join(', '))} | ${cell(f.milestones.join(', '))} | ${cell(f.missing.join(', '))} |`);
  out.push('', '## System context', '', '```mermaid', contextDiagram(bp, projectName), '```', '');
  out.push('## Activity per flow', '');
  for (const f of bp.flows || []) out.push(`### ${f.name || f.id}`, '', '```mermaid', activityDiagram(f), '```', '');
  const withStates = (bp.entities || []).filter((e) => Array.isArray(e.states) && e.states.length);
  out.push('## State machines', '');
  if (!withStates.length) out.push('_No entity defines states yet._', '');
  for (const e of withStates) out.push(`### ${e.name || e.id}`, '', '```mermaid', stateDiagram(e), '```', '');
  return out.join('\n');
}
