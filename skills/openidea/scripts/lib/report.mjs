// The finished report: one client-safe content model, rendered as Markdown, PPTX or PDF.
// Nothing internal goes in: no discovery quotes, no sources, no checks, no chores, no meta.
import { features } from './diagrams.mjs';
import { openGaps } from './analyze.mjs';
import { estimate } from './estimate.mjs';
import { BLUEPRINT_KINDS } from './validate.mjs';


const list = (v) => (Array.isArray(v) ? v : []);

function section(body, title) {
  const parts = String(body || '').split(/^##\s+/m);
  const s = parts.find((x) => x.toLowerCase().startsWith(title.toLowerCase()));
  if (!s) return '';
  return s.replace(/^[^\n]*\n/, '').trim();
}
const bullets = (text) => text.split('\n').map((l) => l.replace(/^\s*[-*]\s*(\[[ x]\]\s*)?/, '').trim()).filter(Boolean);
const para = (text) => text.split('\n').filter((l) => !/^\s*[-*]/.test(l)).join(' ').trim();
// Plain-language phrasing for the client: no blueprint vocabulary.
const ASSUME = {
  actors: (n) => `We assume ${n} uses the app`,
  entities: (n) => `We assume the app keeps a record of each ${n.toLowerCase()}`,
  flows: (n) => `We assume "${n}" is part of the app`,
  screens: (n) => `We assume there is a "${n}" screen`,
  integrations: (n) => `We assume the app connects to ${n}`,
  nfr: (n) => `We assume: ${n}`,
  permissions: (n) => `We assume the access rule "${n}"`,
};
const IMPACT = { high: 'High', medium: 'Medium', low: 'Low' };

export function reportModel(p) {
  const bp = p.blueprint;
  const brief = p.brief && !p.brief.error ? p.brief.body : '';
  const title = brief.match(/^#\s+(.+)$/m)?.[1] || 'Product definition';
  const chores = new Set(p.ideas.filter((i) => i.data?.type === 'chore').map((i) => i.data.id));
  const open = openGaps(p).filter((g) => !list(g.data.ideas).length || list(g.data.ideas).some((id) => !chores.has(id)));
  const est = estimate(p);
  const actorName = (id) => list(bp?.actors).find((a) => a.id === id)?.name || id || '';
  const phaseOfIdea = new Map();
  (p.roadmap?.milestones || []).forEach((m) => m.ideas.forEach((id) => { if (!phaseOfIdea.has(id)) phaseOfIdea.set(id, m.name); }));

  const raw = features(p, open);
  const feats = raw.map((f) => {
    const phases = f.ideas.map((id) => phaseOfIdea.get(id)).filter(Boolean);
    return { name: f.name, who: actorName(f.actor), done: f.done.join(' ') || '', screens: f.screens, phase: phases[0] || null, questions: f.gaps.length };
  });
  const cost = new Map((est?.gapCost || []).map((g) => [g.id, g.days]));
  const questions = open.map((g) => ({
    question: g.data.question,
    impact: IMPACT[g.data.impact] || g.data.impact,
    days: cost.get(g.data.id) || 0,
    features: feats.filter((f, i) => raw[i].gaps.includes(g.data.id)).map((f) => f.name),
  }));
  const assumptions = [];
  if (bp) for (const kind of Object.keys(BLUEPRINT_KINDS)) for (const el of list(bp[kind])) {
    if (el.assumption === true) assumptions.push(`${ASSUME[kind](el.name || el.requirement || el.id)}; no requirement mentions this yet.`);
  }
  const phases = (est?.phases || []).filter((ph) => ph.id !== 'all' || feats.length).map((ph) => ({
    name: ph.name, weeks: ph.weeks, endDate: ph.endDate || null,
    features: feats.filter((f) => f.phase === ph.name).map((f) => f.name),
  }));
  const later = feats.filter((f) => !f.phase && (p.roadmap?.milestones || []).length).map((f) => f.name);

  const next = [];
  if (questions.length) next.push(`Answer the ${questions.length} open question${questions.length > 1 ? 's' : ''}, starting with: ${questions[0].question}`);
  if (phases.length) next.push(`Confirm the scope of ${phases[0].name}.`);
  if (assumptions.length) next.push('Confirm or correct the assumptions listed above.');
  next.push('Each answer narrows the timeline; an updated report follows.');

  return {
    title,
    subtitle: 'Product definition and delivery plan',
    date: bp?.generated || null,
    vision: para(section(brief, 'Vision')),
    users: para(section(brief, 'Target Users')),
    value: para(section(brief, 'Core Value Prop')),
    nonGoals: bullets(section(brief, 'Non-goals')),
    constraints: bullets(section(brief, 'Constraints')),
    features: feats,
    timeline: est ? { weeks: est.total.weeks, endDate: est.total.endDate, people: est.calibration.team.people } : null,
    phases,
    questions,
    assumptions,
    later,
    next,
  };
}

export const range = (a, b, unit) => `${a === b ? a : `${a}–${b}`}${unit ? ` ${unit}` : ''}`;
export const fmtDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00Z');
  return isNaN(d) ? iso : `${d.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};
export function timelineLine(m) {
  if (!m.timeline) return '';
  const t = m.timeline;
  return `${range(t.weeks[0], t.weeks[1], 'weeks')} with a team of ${t.people}${t.endDate ? `, finishing between ${fmtDate(t.endDate[0])} and ${fmtDate(t.endDate[1])}` : ''}.`;
}

const cell = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
export function renderReportMd(p) {
  const m = reportModel(p);
  const out = [`# ${m.title}`, '', `**${m.subtitle}**${m.date ? ` · ${fmtDate(m.date)}` : ''}`, ''];
  out.push('## Summary', '');
  if (m.vision) out.push(m.vision, '');
  const facts = [];
  if (m.users) facts.push(`**For:** ${m.users}`);
  if (m.value) facts.push(`**Value:** ${m.value}`);
  facts.push(`**Scope:** ${m.features.length} feature${m.features.length === 1 ? '' : 's'}${m.phases.length ? ` in ${m.phases.length} phase${m.phases.length === 1 ? '' : 's'}` : ''}.`);
  if (m.timeline) facts.push(`**Timeline:** ${timelineLine(m)}`);
  if (m.questions.length) facts.push(`**Open questions:** ${m.questions.length}, listed below; answering them narrows the timeline.`);
  out.push(facts.map((f) => `- ${f}`).join('\n'), '');
  if (m.features.length) {
    out.push('## Features', '', '| Feature | Used by | Done when | Phase |', '| --- | --- | --- | --- |');
    for (const f of m.features) out.push(`| ${cell(f.name)} | ${cell(f.who)} | ${cell(f.done)} | ${cell(f.phase || 'Later')} |`);
    out.push('');
  }
  if (m.phases.length) {
    out.push('## Phases and timeline', '');
    m.phases.forEach((ph, i) => {
      out.push(`### ${i + 1}. ${ph.name}`, '', `${range(ph.weeks[0], ph.weeks[1], 'weeks')}${ph.endDate ? `, finishing between ${fmtDate(ph.endDate[0])} and ${fmtDate(ph.endDate[1])}` : ''}.`, '');
      if (ph.features.length) out.push(ph.features.map((f) => `- ${f}`).join('\n'), '');
    });
    out.push('Ranges, not single dates: the upper end covers what is still undefined and narrows as the questions below are answered.', '');
  }
  if (m.questions.length) {
    out.push('## Open questions', '', '| Question | Impact | Could add |', '| --- | --- | --- |');
    for (const q of m.questions) out.push(`| ${cell(q.question)} | ${q.impact} | ${q.days ? `up to ${q.days} days` : '–'} |`);
    out.push('');
  }
  if (m.assumptions.length) out.push('## Assumptions', '', m.assumptions.map((a) => `- ${a}`).join('\n'), '');
  if (m.later.length) out.push('## Later', '', m.later.map((a) => `- ${a}`).join('\n'), '');
  if (m.nonGoals.length || m.constraints.length) {
    out.push('## Boundaries', '');
    if (m.nonGoals.length) out.push('Not included:', '', m.nonGoals.map((a) => `- ${a}`).join('\n'), '');
    if (m.constraints.length) out.push('Constraints:', '', m.constraints.map((a) => `- ${a}`).join('\n'), '');
  }
  out.push('## Next steps', '', m.next.map((n, i) => `${i + 1}. ${n}`).join('\n'), '');
  return out.join('\n');
}
