// Deterministic checks. Everything here is structure, not judgment: if a rule can be
// decided by reading files, it lives here instead of in a prompt.
export const ENUMS = {
  ideaStatus: ['captured', 'ready', 'parked', 'merged', 'killed', 'split', 'promoted'],
  ideaType: ['feature', 'chore'],
  gapKind: ['decision', 'clarification', 'desirability', 'feasibility', 'compliance'],
  gapFoundBy: ['probe', 'coverage', 'consistency', 'domain', 'walkthrough', 'prototype', 'manual'],
  level3: ['high', 'medium', 'low'],
  gapStatus: ['open', 'validating', 'resolved', 'accepted_risk', 'dismissed'],
  milestoneStatus: ['draft', 'approved'],
};

const STATUS_LOCATION = {
  captured: 'active', ready: 'active', parked: 'active',
  killed: 'archive', merged: 'archive', split: 'archive',
  promoted: 'promoted',
};

export const OPEN_GAP = new Set(['open', 'validating']);
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isFilled(v) {
  if (v === null || v === undefined) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'string') return v.trim() !== '' && v.trim().toUpperCase() !== 'TBD';
  return true;
}

// Blueprint element kinds. `slots` are the fields every element must fill:
// depth comes from mandatory slots, not from asking a model to "be thorough".
export const BLUEPRINT_KINDS = {
  actors: { label: 'Actor', plural: 'Actors', slots: ['name', 'description'] },
  entities: { label: 'Entity', plural: 'Entities', slots: ['name', 'attributes', 'lifecycle.create', 'lifecycle.update', 'lifecycle.archive', 'lifecycle.delete'] },
  flows: { label: 'Flow', plural: 'Flows', slots: ['name', 'actor', 'trigger', 'steps', 'scenarios.success', 'scenarios.failure', 'scenarios.empty_state'] },
  screens: { label: 'Screen', plural: 'Screens', slots: ['name', 'flows', 'elements'] },
  integrations: { label: 'Integration', plural: 'Integrations', slots: ['name', 'direction', 'data'] },
  nfr: { label: 'NFR', plural: 'Non-functional requirements', slots: ['category', 'requirement'] },
};

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

export function blueprintElements(bp) {
  const out = [];
  if (!bp) return out;
  for (const kind of Object.keys(BLUEPRINT_KINDS)) {
    for (const el of Array.isArray(bp[kind]) ? bp[kind] : []) out.push({ kind, el });
  }
  return out;
}

export function depthReport(bp) {
  let total = 0, filled = 0;
  const missing = [];
  for (const { kind, el } of blueprintElements(bp)) {
    for (const slot of BLUEPRINT_KINDS[kind].slots) {
      total++;
      if (isFilled(get(el, slot))) filled++;
      else missing.push({ kind, id: el.id, slot });
    }
  }
  return { total, filled, score: total ? filled / total : null, missing };
}

function findCycles(graph) {
  const cycles = [];
  const state = new Map();
  const stack = [];
  const visit = (n) => {
    state.set(n, 1);
    stack.push(n);
    for (const m of graph.get(n) || []) {
      if (!graph.has(m)) continue;
      if (state.get(m) === 1) cycles.push([...stack.slice(stack.indexOf(m)), m]);
      else if (!state.get(m)) visit(m);
    }
    stack.pop();
    state.set(n, 2);
  };
  for (const n of graph.keys()) if (!state.get(n)) visit(n);
  return cycles;
}

export function validateProject(p) {
  const issues = [];
  const add = (level, code, file, message) => issues.push({ level, code, file, message });

  if (!p.exists) {
    add('error', 'no-project', 'openidea/', 'No openidea/ folder here. Run /openidea:init first.');
    return issues;
  }

  // BRIEF
  if (!p.brief) add('error', 'brief-missing', 'openidea/BRIEF.md', 'BRIEF.md is missing. Run /openidea:init.');
  else if (p.brief.error) add('error', 'brief-parse', p.brief.file, p.brief.error);
  else {
    const v = p.brief.data.schema_version;
    if (v === undefined) add('warning', 'brief-schema-version', p.brief.file, 'schema_version missing; treated as 1.');
    else if (v < 2) add('info', 'schema-v1', p.brief.file, `schema_version ${v}: newer fields (gaps, blueprint, milestone ID) use safe defaults.`);
    if (!['active', 'cancelled'].includes(p.brief.data.project_status)) add('warning', 'brief-status', p.brief.file, 'project_status should be active or cancelled.');
  }

  // Ideas
  const ideaById = new Map();
  for (const idea of p.ideas) {
    if (idea.error) { add('error', 'idea-parse', idea.file, idea.error); continue; }
    const d = idea.data;
    if (d.id !== idea.slug) add('error', 'idea-id', idea.file, `id "${d.id}" must equal the file name "${idea.slug}".`);
    if (ideaById.has(d.id)) add('error', 'idea-duplicate', idea.file, `duplicate idea id "${d.id}" (also in ${ideaById.get(d.id).file}).`);
    ideaById.set(d.id, idea);
    if (!ENUMS.ideaStatus.includes(d.status)) { add('error', 'idea-status', idea.file, `unknown status "${d.status}".`); continue; }
    if (d.type !== undefined && !ENUMS.ideaType.includes(d.type)) add('error', 'idea-type', idea.file, `type must be feature or chore, got "${d.type}".`);
    if (STATUS_LOCATION[d.status] !== idea.location) add('error', 'idea-location', idea.file, `status "${d.status}" belongs in ${STATUS_LOCATION[d.status] === 'active' ? 'ideas/' : `ideas/${STATUS_LOCATION[d.status]}/`}, not here.`);
    if (d.status === 'killed' && !isFilled(d.triage_note)) add('error', 'killed-no-triage', idea.file, 'status killed requires a triage_note.');
    if (d.status === 'merged' && !isFilled(d.merged_into)) add('error', 'merged-no-target', idea.file, 'status merged requires merged_into.');
    if (d.status === 'split' && !isFilled(d.split_into)) add('error', 'split-no-target', idea.file, 'status split requires split_into.');
    if (['ready', 'promoted'].includes(d.status) && !isFilled(d.category)) add('error', 'ready-no-category', idea.file, 'category must be set before status ready.');
    if (!Array.isArray(d.history) || d.history.length === 0) add('warning', 'idea-history', idea.file, 'history[] is empty; every status change should be recorded.');
    else if (d.history.at(-1)?.status !== d.status) add('warning', 'idea-history-stale', idea.file, `last history entry is "${d.history.at(-1)?.status}" but status is "${d.status}".`);
  }

  const graph = new Map();
  for (const [id, idea] of ideaById) {
    const deps = Array.isArray(idea.data.depends_on) ? idea.data.depends_on : [];
    graph.set(id, deps);
    for (const dep of deps) if (!ideaById.has(dep)) add('warning', 'depends-on-missing', idea.file, `depends_on "${dep}" does not exist.`);
    const target = idea.data.merged_into;
    if (idea.data.status === 'merged' && target) {
      const t = ideaById.get(target);
      if (!t) add('warning', 'merged-into-missing', idea.file, `merged_into "${target}" does not exist.`);
      else if (t.data.status === 'killed') add('warning', 'merged-into-killed', idea.file, `merged into "${target}", which is killed; review this merge.`);
    }
  }
  for (const cycle of findCycles(graph)) add('error', 'dependency-cycle', 'openidea/ideas/', `dependency cycle: ${cycle.join(' -> ')}`);

  // Gaps
  const gapById = new Map();
  for (const gap of p.gaps) {
    if (gap.error) { add('error', 'gap-parse', gap.file, gap.error); continue; }
    const d = gap.data;
    if (d.id !== gap.slug) add('error', 'gap-id', gap.file, `id "${d.id}" must equal the file name "${gap.slug}".`);
    gapById.set(d.id, gap);
    const enumCheck = (field, list) => { if (!list.includes(d[field])) add('error', `gap-${field}`, gap.file, `${field} must be one of ${list.join(', ')}; got "${d[field]}".`); };
    enumCheck('kind', ENUMS.gapKind);
    enumCheck('found_by', ENUMS.gapFoundBy);
    enumCheck('impact', ENUMS.level3);
    enumCheck('confidence', ENUMS.level3);
    enumCheck('status', ENUMS.gapStatus);
    if (!isFilled(d.question)) add('error', 'gap-question', gap.file, 'question is required: the one line a human answers or validates.');
    if (['resolved', 'accepted_risk', 'dismissed'].includes(d.status) && !isFilled(d.resolution)) add('error', 'gap-resolution', gap.file, `status ${d.status} requires a resolution note.`);
    const ideas = Array.isArray(d.ideas) ? d.ideas : [];
    for (const id of ideas) if (!ideaById.has(id)) add('warning', 'gap-idea-missing', gap.file, `refers to idea "${id}", which does not exist.`);
    for (const s of Array.isArray(d.sources) ? d.sources : []) if (typeof s !== 'string') add('warning', 'gap-source', gap.file, 'sources must be file paths.');
  }

  // Gate: a ready idea must not carry an open high-impact gap.
  for (const gap of gapById.values()) {
    const d = gap.data;
    if (d.impact !== 'high' || !OPEN_GAP.has(d.status)) continue;
    for (const id of Array.isArray(d.ideas) ? d.ideas : []) {
      const idea = ideaById.get(id);
      if (idea && idea.data.status === 'ready') add('error', 'gate-blocked', idea.file, `is ready but gap "${d.id}" (impact high) is still ${d.status}. Validate it, or record accepted_risk.`);
    }
  }

  // Roadmap
  if (p.roadmap) {
    const seenIds = new Map();
    const ideaMilestone = new Map();
    p.roadmap.milestones.forEach((m, idx) => {
      if (!m.idDeclared) add('warning', 'milestone-no-id', 'openidea/ROADMAP.md', `"${m.name}" has no **ID** line; using "${m.id}". Add it so the OpenSpec folder name is explicit.`);
      if (!SLUG_RE.test(m.id)) add('error', 'milestone-id-format', 'openidea/ROADMAP.md', `ID "${m.id}" must be kebab-case.`);
      if (seenIds.has(m.id)) add('error', 'milestone-id-duplicate', 'openidea/ROADMAP.md', `ID "${m.id}" is used by "${seenIds.get(m.id)}" and "${m.name}".`);
      seenIds.set(m.id, m.name);
      if (m.status && !ENUMS.milestoneStatus.includes(m.status)) add('error', 'milestone-status', 'openidea/ROADMAP.md', `"${m.name}" status must be draft or approved.`);
      if (m.status === 'approved' && p.hasProposals && !m.approvedIn) add('warning', 'milestone-approved-in', 'openidea/ROADMAP.md', `"${m.name}" is approved but has no **Approved in**.`);
      if (m.ideas.length === 0) add('warning', 'milestone-empty', 'openidea/ROADMAP.md', `"${m.name}" has no ideas.`);
      for (const id of m.ideas) {
        if (!ideaById.has(id)) add('warning', 'milestone-idea-missing', 'openidea/ROADMAP.md', `"${m.name}" lists "${id}", which does not exist.`);
        if (ideaMilestone.has(id)) add('error', 'idea-in-two-milestones', 'openidea/ROADMAP.md', `"${id}" is in both "${ideaMilestone.get(id).name}" and "${m.name}".`);
        else ideaMilestone.set(id, { name: m.name, idx });
      }
    });
    for (const [id, { name, idx }] of ideaMilestone) {
      for (const dep of ideaById.get(id)?.data.depends_on || []) {
        const dm = ideaMilestone.get(dep);
        if (dm && dm.idx > idx) add('warning', 'milestone-order', 'openidea/ROADMAP.md', `"${id}" (${name}) depends on "${dep}", which is planned later (${dm.name}).`);
      }
    }
  }

  // Blueprint
  if (p.blueprintError) add('error', 'blueprint-parse', 'openidea/blueprint/blueprint.json', p.blueprintError);
  if (p.blueprint) {
    const bpFile = 'openidea/blueprint/blueprint.json';
    const els = blueprintElements(p.blueprint);
    const idsByKind = {};
    const referenced = new Set();
    for (const { kind, el } of els) {
      (idsByKind[kind] ||= new Set());
      if (!isFilled(el.id)) { add('error', 'bp-no-id', bpFile, `a ${kind} element has no id.`); continue; }
      if (idsByKind[kind].has(el.id)) add('error', 'bp-duplicate', bpFile, `${kind} id "${el.id}" is duplicated.`);
      idsByKind[kind].add(el.id);
      const from = Array.isArray(el.derived_from) ? el.derived_from : [];
      from.forEach((id) => referenced.add(id));
      for (const id of from) if (!ideaById.has(id)) add('error', 'bp-unknown-source', bpFile, `${kind} "${el.id}" is derived from "${id}", which is not an idea.`);
      if (from.length === 0 && el.assumption !== true) add('error', 'bp-untraced', bpFile, `${kind} "${el.id}" has no derived_from and is not marked assumption: true.`);
    }
    const has = (kind, id) => idsByKind[kind]?.has(id);
    for (const g of gapById.values()) for (const ref of Array.isArray(g.data.affects) ? g.data.affects : []) {
      const [k, id] = String(ref).split('/');
      if (!BLUEPRINT_KINDS[k] || !has(k, id)) add('warning', 'gap-affects', g.file, `affects "${ref}", which is not a blueprint element (use kind/id, e.g. integrations/whatsapp).`);
    }
    for (const f of p.blueprint.flows || []) if (isFilled(f.actor) && !has('actors', f.actor)) add('error', 'bp-ref', bpFile, `flow "${f.id}" names actor "${f.actor}", which is not in actors.`);
    for (const s of p.blueprint.screens || []) for (const fl of s.flows || []) if (!has('flows', fl)) add('error', 'bp-ref', bpFile, `screen "${s.id}" names flow "${fl}", which is not in flows.`);
    for (const e of p.blueprint.entities || []) {
      const states = Array.isArray(e.states) ? e.states : null;
      const transitions = Array.isArray(e.transitions) ? e.transitions : [];
      if (!states) {
        if ((e.attributes || []).some((x) => /^(status|state)$/i.test(String(x)))) add('warning', 'entity-states-missing', bpFile, `entity "${e.id}" has a status attribute but no states: which statuses exist, and what moves between them?`);
        continue;
      }
      const incoming = new Set();
      for (const t of transitions) {
        for (const end of ['from', 'to']) if (!states.includes(t[end])) add('error', 'bp-ref', bpFile, `entity "${e.id}" transition ${t.from} -> ${t.to}: "${t[end]}" is not one of its states.`);
        incoming.add(t.to);
        if (isFilled(t.flow) && !has('flows', t.flow)) add('error', 'bp-ref', bpFile, `entity "${e.id}" transition ${t.from} -> ${t.to} names flow "${t.flow}", which is not in flows.`);
        if (!isFilled(t.flow)) add('warning', 'transition-no-flow', bpFile, `entity "${e.id}": nothing triggers ${t.from} -> ${t.to}. Which flow, actor, or schedule moves it?`);
      }
      states.slice(1).forEach((st) => { if (!incoming.has(st)) add('warning', 'state-unreachable', bpFile, `entity "${e.id}": state "${st}" can never be reached (no transition leads to it).`); });
    }
    const perms = new Map();
    for (const pm of p.blueprint.permissions || []) {
      if (!has('actors', pm.actor)) add('error', 'bp-ref', bpFile, `permission names actor "${pm.actor}", which is not in actors.`);
      if (isFilled(pm.entity) && !has('entities', pm.entity)) add('error', 'bp-ref', bpFile, `permission names entity "${pm.entity}", which is not in entities.`);
      for (const id of pm.derived_from || []) { referenced.add(id); if (!ideaById.has(id)) add('error', 'bp-unknown-source', bpFile, `permission ${pm.actor}/${pm.action} is derived from "${id}", which is not an idea.`); }
      const key = `${pm.actor}|${pm.action}|${pm.entity ?? ''}`;
      if (perms.has(key) && perms.get(key).allow !== pm.allow) {
        add('error', 'permission-conflict', bpFile, `conflict: ${pm.actor} ${pm.allow ? 'may' : 'may not'} ${pm.action}${pm.entity ? ` ${pm.entity}` : ''} (from ${(pm.derived_from || []).join(', ') || '?'}), but another rule says the opposite (from ${(perms.get(key).derived_from || []).join(', ') || '?'}).`);
      }
      perms.set(key, pm);
    }
    for (const [id, idea] of ideaById) {
      if (['captured', 'ready'].includes(idea.data.status) && idea.data.type !== 'chore' && !referenced.has(id)) {
        add('warning', 'idea-not-in-blueprint', idea.file, 'no blueprint element is derived from this idea: either the blueprint is stale or the idea is too vague to build.');
      }
    }
    const gen = p.blueprint.generated;
    if (gen) {
      for (const [, idea] of ideaById) {
        if (['captured', 'ready'].includes(idea.data.status) && idea.data.updated && String(idea.data.updated) > String(gen)) {
          add('warning', 'blueprint-stale', bpFile, `generated ${gen}, but "${idea.data.id}" changed on ${idea.data.updated}. Re-run /openidea:blueprint.`);
          break;
        }
      }
    }
  }

  return issues;
}
