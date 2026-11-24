// The finished report: one client-safe content model, rendered as Markdown, PPTX or PDF.
// Nothing internal goes in: no discovery quotes, no sources, no ids, no checks, no chores, no meta.
// Every heading is a conclusion the reader can act on, computed from the data, never typed in.
import { features } from './diagrams.mjs';
import { openGaps, analyze } from './analyze.mjs';
import { estimate } from './estimate.mjs';
import { BLUEPRINT_KINDS } from './validate.mjs';

const list = (v) => (Array.isArray(v) ? v : []);
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

function section(body, title) {
  const parts = String(body || '').split(/^##\s+/m);
  const s = parts.find((x) => x.toLowerCase().startsWith(title.toLowerCase()));
  return s ? s.replace(/^[^\n]*\n/, '').trim() : '';
}
const bullets = (text) => text.split('\n').map((l) => l.replace(/^\s*[-*]\s*(\[[ x]\]\s*)?/, '').trim()).filter(Boolean);
const para = (text) => text.split('\n').filter((l) => !/^\s*[-*]/.test(l)).join(' ').trim();
const sentence = (s) => { const t = String(s || '').trim(); return t && !/[.!?]$/.test(t) ? t + '.' : t; };

// Plain-language phrasing for the client: no blueprint vocabulary.
const ASSUME = {
  actors: (n) => `${n} uses the app`,
  entities: (n) => `The app keeps a record of each ${n.toLowerCase()}`,
  flows: (n) => `"${n}" is part of the app`,
  screens: (n) => `There is a "${n}" screen`,
  integrations: (n) => `The app connects to ${n}`,
  nfr: (n) => sentence(n).replace(/\.$/, ''),
};
const IMPACT = { high: 'High', medium: 'Medium', low: 'Low' };

export const range = (a, b, unit) => `${a === b ? a : `${a}–${b}`}${unit ? ` ${unit}` : ''}`;
export const fmtDate = (iso, { year = true } = {}) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d)) return iso;
  return `${d.getUTCDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getUTCMonth()]}${year ? ` ${d.getUTCFullYear()}` : ''}`;
};
export const weeks = (n) => `${n} week${n === 1 ? '' : 's'}`;

export function reportModel(p) {
  const bp = p.blueprint;
  const brief = p.brief && !p.brief.error ? p.brief.body : '';
  const title = brief.match(/^#\s+(.+)$/m)?.[1] || 'Product definition';
  const chores = new Set(p.ideas.filter((i) => i.data?.type === 'chore').map((i) => i.data.id));
  const open = openGaps(p).filter((g) => !list(g.data.ideas).length || list(g.data.ideas).some((id) => !chores.has(id)));
  const est = estimate(p);
  const a = analyze(p, []);
  const actorName = (id) => list(bp?.actors).find((x) => x.id === id)?.name || id || '';
  const milestones = p.roadmap?.milestones || [];
  const phaseOfIdea = new Map();
  milestones.forEach((m) => m.ideas.forEach((id) => { if (!phaseOfIdea.has(id)) phaseOfIdea.set(id, m.name); }));

  const raw = features(p, open);
  const feats = raw.map((f) => ({
    name: f.name, who: actorName(f.actor), done: sentence(f.done.join(' ')), phase: f.ideas.map((id) => phaseOfIdea.get(id)).find(Boolean) || null,
  }));
  const cost = new Map((est?.gapCost || []).map((g) => [g.id, g.days]));
  const blockedBy = new Map();
  for (const m of a.milestones) for (const id of m.blockingGaps) blockedBy.set(id, m.name);
  const questions = open.map((g) => ({
    question: g.data.question,
    impact: IMPACT[g.data.impact] || g.data.impact,
    days: cost.get(g.data.id) || 0,
    features: feats.filter((f, i) => raw[i].gaps.includes(g.data.id)).map((f) => f.name),
    blocks: blockedBy.get(g.data.id) || null,
  }));
  const assumptions = [];
  if (bp) for (const kind of Object.keys(BLUEPRINT_KINDS)) for (const el of list(bp[kind])) {
    if (el.assumption === true && ASSUME[kind]) assumptions.push(sentence(ASSUME[kind](el.name || el.requirement || el.id)));
  }

  const phases = (est?.phases || []).filter((ph) => ph.id !== 'all').map((ph, i) => {
    const fs = feats.filter((f) => f.phase === ph.name);
    const blockers = questions.filter((q) => q.blocks === ph.name);
    return {
      n: i + 1, name: ph.name, weeks: ph.weeks, likely: ph.likelyWeeks, start: ph.startWeek[0], startLikely: ph.endWeekLikely - ph.likelyWeeks,
      endDate: ph.endDate || null, endDateLikely: ph.endDateLikely || null, features: fs, blockers,
      headline: `${ph.name}: ${plural(fs.length, 'feature')}, likely ${weeks(ph.likelyWeeks)}${blockers.length ? `, waiting on ${plural(blockers.length, 'decision')}` : ''}`,
    };
  });
  const later = milestones.length ? feats.filter((f) => !f.phase) : [];
  const t = est?.total;
  const timeline = t ? { low: t.weeks[0], high: t.weeks[1], likely: t.likelyWeeks, endDate: t.endDate, endDateLikely: t.endDateLikely, people: est.calibration.team.people, calibrated: est.calibration.samples > 0 } : null;
  const totalDays = questions.reduce((s, q) => s + q.days, 0);
  const defined = feats.filter((f) => f.done).length;

  // Conclusions, one per section, built from the numbers.
  const when = (lik, end) => (end ? `by ${fmtDate(end)}` : `in ${weeks(lik)}`);
  const headline = timeline
    ? `${plural(feats.length, 'feature')} in ${plural(phases.length || 1, 'phase')}, likely ready ${when(timeline.likely, timeline.endDateLikely)}${questions.length ? `; ${plural(questions.length, 'open decision')} set${questions.length === 1 ? 's' : ''} how close to that date` : ''}`
    : `${plural(feats.length, 'feature')} defined${questions.length ? `; ${plural(questions.length, 'decision')} still open` : ''}`;
  const messages = [];
  if (para(section(brief, 'Vision'))) messages.push({ title: 'What we build', text: sentence(para(section(brief, 'Vision'))) + (para(section(brief, 'Core Value Prop')) ? ' ' + sentence(para(section(brief, 'Core Value Prop'))) : '') });
  if (phases.length) messages.push({ title: 'How we deliver it', text: `${plural(phases.length, 'phase')}: ${phases.map((x) => x.name).join(', ')}. ${phases[0].name} comes first${phases[0].endDateLikely ? ` and is likely ready by ${fmtDate(phases[0].endDateLikely)}` : ` and likely takes ${weeks(phases[0].likely)}`}.` });
  if (timeline) messages.push({ title: 'How long it takes', text: `Likely ${weeks(timeline.likely)} with a team of ${timeline.people}; between ${timeline.low} and ${timeline.high} weeks depending on the open decisions.` });
  if (questions.length) messages.push({ title: 'What we need from you', text: `${plural(questions.length, 'decision')}${questions[0].blocks ? `; ${phases.find((x) => x.name === questions[0].blocks) ? `${questions[0].blocks} cannot start until the first is answered` : ''}` : ''}. Answering them removes up to ${totalDays} days of uncertainty.` });

  const next = [];
  if (questions.length) next.push({ who: 'You', what: `Answer the ${plural(questions.length, 'open decision')}`, detail: questions.slice(0, 2).map((q) => q.question).join(' ') });
  if (phases.length) next.push({ who: 'You', what: `Confirm the scope of ${phases[0].name}`, detail: phases[0].features.map((f) => f.name).join(', ') });
  if (assumptions.length) next.push({ who: 'You', what: 'Confirm or correct our assumptions', detail: assumptions.join(' ') });
  next.push({ who: 'We', what: 'Send the updated plan', detail: 'Each answer narrows the timeline; the plan is regenerated from the same definition.' });

  return {
    title,
    subtitle: 'Product definition and delivery plan',
    date: bp?.generated || null,
    headline,
    messages,
    vision: para(section(brief, 'Vision')),
    users: para(section(brief, 'Target Users')),
    value: para(section(brief, 'Core Value Prop')),
    nonGoals: bullets(section(brief, 'Non-goals')),
    constraints: bullets(section(brief, 'Constraints')),
    features: feats,
    featuresHeadline: `${plural(feats.length, 'feature')}${phases.length ? ` across ${plural(phases.length, 'phase')}` : ''}; ${defined === feats.length ? 'each has a clear definition of done' : `${defined} ${defined === 1 ? 'has' : 'have'} a clear definition of done, ${feats.length - defined} still ${feats.length - defined === 1 ? 'needs' : 'need'} one`}`,
    doneHeadline: defined === feats.length ? 'What done looks like, feature by feature: the acceptance line for each' : `What done looks like, feature by feature; ${feats.length - defined} still to be defined`,
    timeline,
    timelineHeadline: timeline ? `Likely ${weeks(timeline.likely)} with a team of ${timeline.people}${timeline.high > timeline.likely ? `; open decisions could stretch it to ${timeline.high}` : ''}` : '',
    phases,
    questions,
    questionsHeadline: questions.length ? `${plural(questions.length, 'decision')} from you narrow${questions.length === 1 ? 's' : ''} the plan by up to ${totalDays} days` : 'No open decisions',
    assumptions,
    later,
    next,
    nextHeadline: questions.length ? `Next: ${plural(questions.length, 'decision')} from you, then we lock ${phases[0]?.name || 'the first phase'}` : `Next: confirm ${phases[0]?.name || 'the first phase'} and start`,
  };
}

export function timelineLine(m) {
  const t = m.timeline;
  if (!t) return '';
  return `Likely ${weeks(t.likely)}${t.endDateLikely ? ` (${fmtDate(t.endDateLikely)})` : ''}; range ${range(t.low, t.high, 'weeks')}${t.endDate ? ` (${fmtDate(t.endDate[0])} to ${fmtDate(t.endDate[1])})` : ''}, team of ${t.people}.`;
}

const cell = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
export function renderReportMd(p) {
  const m = reportModel(p);
  const out = [`# ${m.title}`, '', `${m.subtitle}${m.date ? ` · ${fmtDate(m.date)}` : ''} · Draft for discussion`, ''];
  out.push('## Executive summary', '', `**${m.headline}.**`, '');
  for (const x of m.messages) out.push(`**${x.title}.** ${x.text}`, '');
  if (m.questions.length) {
    out.push('## What we need from you', '', `**${m.questionsHeadline}.**`, '');
    m.questions.forEach((q, i) => out.push(`${i + 1}. **${q.question}**  `, `   ${q.impact} impact${q.features.length ? ` · affects ${q.features.join(', ')}` : ''}${q.days ? ` · could add up to ${q.days} days` : ''}${q.blocks ? ` · ${q.blocks} waits for this` : ''}`, ''));
  }
  if (m.phases.length) {
    out.push('## Plan and timeline', '', `**${m.timelineHeadline}.**`, '', timelineLine(m), '');
    out.push('| Phase | Likely | Range | Ready by (likely) |', '| --- | --- | --- | --- |');
    for (const ph of m.phases) out.push(`| ${ph.n}. ${cell(ph.name)} | ${weeks(ph.likely)} | ${range(ph.weeks[0], ph.weeks[1], 'weeks')} | ${ph.endDateLikely ? fmtDate(ph.endDateLikely) : '–'} |`);
    out.push('', 'The range is wide on purpose: its upper end prices in every detail not yet defined, and it narrows as decisions are made.', '');
  }
  out.push('## Scope', '', `**${m.featuresHeadline}.**`, '');
  const groups = m.phases.length ? m.phases.map((ph) => [`${ph.n}. ${ph.name}`, ph.features]) : [['Features', m.features]];
  if (m.later.length) groups.push(['Later', m.later]);
  for (const [name, fs] of groups) {
    if (!fs.length) continue;
    out.push(`### ${name}`, '', '| Feature | Used by | Done when |', '| --- | --- | --- |');
    for (const f of fs) out.push(`| ${cell(f.name)} | ${cell(f.who)} | ${cell(f.done || 'To be defined')} |`);
    out.push('');
  }
  if (m.assumptions.length || m.nonGoals.length || m.constraints.length) {
    out.push('## Boundaries and assumptions', '');
    if (m.nonGoals.length) out.push('**Not included**', '', m.nonGoals.map((a) => `- ${a}`).join('\n'), '');
    if (m.constraints.length) out.push('**Constraints**', '', m.constraints.map((a) => `- ${a}`).join('\n'), '');
    if (m.assumptions.length) out.push('**We assumed** (please confirm)', '', m.assumptions.map((a) => `- ${a}`).join('\n'), '');
  }
  out.push('## Next steps', '', `**${m.nextHeadline}.**`, '', m.next.map((n, i) => `${i + 1}. **${n.what}** (${n.who}). ${n.detail}`).join('\n'), '');
  return out.join('\n');
}
