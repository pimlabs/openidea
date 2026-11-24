// The finished report: one client-safe content model, rendered as Markdown, PPTX or PDF.
// Nothing internal goes in: no discovery quotes, no sources, no ids, no checks, no chores, no meta.
// Every heading is a conclusion the reader can act on, computed from the data, never typed in.
import { features } from './diagrams.mjs';
import { openGaps, analyze, QUEUE_SIZE } from './analyze.mjs';
import { estimate } from './estimate.mjs';
import { BLUEPRINT_KINDS } from './validate.mjs';
import { labels, projectLang } from './i18n.mjs';

// The language of the report being rendered; set by reportModel, read by the formatters below.
let L = labels('en');

const list = (v) => (Array.isArray(v) ? v : []);

function section(body, title) {
  const parts = String(body || '').split(/^##\s+/m);
  const s = parts.find((x) => x.toLowerCase().startsWith(title.toLowerCase()));
  return s ? s.replace(/^[^\n]*\n/, '').trim() : '';
}
const bullets = (text) => text.split('\n').map((l) => l.replace(/^\s*[-*]\s*(\[[ x]\]\s*)?/, '').trim()).filter(Boolean);
const para = (text) => text.split('\n').filter((l) => !/^\s*[-*]/.test(l)).join(' ').trim();
const sentence = (s) => { const t = String(s || '').trim(); return t && !/[.!?]$/.test(t) ? t + '.' : t; };

// Plain-language phrasing for the client: no blueprint vocabulary.
const assume = (kind, n) => (kind === 'nfr' ? sentence(n).replace(/\.$/, '') : L.assume[kind]?.(n));
export const range = (a, b, unit) => `${a === b ? L.num(a) : `${L.num(a)}–${L.num(b)}`}${unit ? ` ${unit}` : ''}`;
export const fmtDate = (iso, { year = true } = {}) => {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d)) return iso;
  return `${d.getUTCDate()} ${L.months[d.getUTCMonth()]}${year ? ` ${d.getUTCFullYear()}` : ''}`;
};
export const weeks = (n) => L.weeks(n);
export const lbl = () => L;

export function reportModel(p, { lang } = {}) {
  const code = projectLang(p, lang);
  L = labels(code);
  const bp = p.blueprint;
  const brief = p.brief && !p.brief.error ? p.brief.body : '';
  const title = brief.match(/^#\s+(.+)$/m)?.[1] || L.titleFallback;
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
  for (const m of a.milestones) for (const id of m.blockingGaps) if (!blockedBy.has(id)) blockedBy.set(id, m.name); // the earliest phase it holds up
  const allQuestions = open.map((g) => ({
    question: g.data.question,
    impact: L.impact[g.data.impact] || g.data.impact,
    level: g.data.impact,
    days: cost.get(g.data.id) || 0,
    features: (() => {
      const fs = feats.filter((f, i) => raw[i].gaps.includes(g.data.id)).map((f) => f.name);
      if (fs.length) return fs;
      // No feature touched: name the data or parts it affects instead (e.g. "Leave balance"), never ids.
      return list(g.data.affects).map((ref) => { const [k, id] = String(ref).split('/'); const el = list(bp?.[k]).find((x) => x.id === id); return el ? (el.name || el.requirement || '') : ''; }).filter(Boolean);
    })(),
    blocks: blockedBy.get(g.data.id) || null,
  }));
  // At most QUEUE_SIZE decisions per round: more get rubber-stamped. The rest are listed, not hidden.
  const questions = allQuestions.slice(0, QUEUE_SIZE);
  const moreQuestions = allQuestions.slice(QUEUE_SIZE);
  const assumptions = [];
  if (bp) for (const kind of Object.keys(BLUEPRINT_KINDS)) for (const el of list(bp[kind])) {
    if (el.assumption === true && assume(kind, el.name || el.requirement || el.id)) assumptions.push(sentence(assume(kind, el.name || el.requirement || el.id)));
  }

  const phases = (est?.phases || []).filter((ph) => ph.id !== 'all').map((ph, i) => {
    const fs = feats.filter((f) => f.phase === ph.name);
    const blockers = allQuestions.filter((q) => q.blocks === ph.name);
    return {
      n: i + 1, name: ph.name, weeks: ph.weeks, likely: ph.likelyWeeks, start: ph.startWeek[0], startLikely: ph.endWeekLikely - ph.likelyWeeks,
      endDate: ph.endDate || null, endDateLikely: ph.endDateLikely || null, features: fs, blockers,
      headline: L.phaseHeadline(ph.name, fs.length, ph.likelyWeeks, blockers.length),
    };
  });
  const later = milestones.length ? feats.filter((f) => !f.phase) : [];
  const t = est?.total;
  const timeline = t ? { low: t.weeks[0], high: t.weeks[1], likely: t.likelyWeeks, endDate: t.endDate, endDateLikely: t.endDateLikely, people: est.calibration.team.people, calibrated: est.calibration.samples > 0 } : null;
  const totalDays = questions.reduce((s, q) => s + q.days, 0);
  const defined = feats.filter((f) => f.done).length;

  // Conclusions, one per section, built from the numbers.
  const when = (lik, end) => (end ? L.readyBy(fmtDate(end)) : L.readyIn(lik));
  const headline = timeline ? L.headline(feats.length, phases.length || 1, when(timeline.likely, timeline.endDateLikely), questions.length) : L.headlineNoPlan(feats.length, questions.length);
  const vision = para(section(brief, 'Vision')), value = para(section(brief, 'Core Value Prop'));
  const messages = [];
  if (vision) messages.push({ title: L.msgBuild, text: sentence(vision) + (value ? ' ' + sentence(value) : '') });
  if (phases.length) messages.push({ title: L.msgDeliver, text: L.deliverText(phases.length, phases.map((x) => x.name).join(', '), phases[0].name, phases[0].endDateLikely ? fmtDate(phases[0].endDateLikely) : null, phases[0].likely) });
  if (timeline) messages.push({ title: L.msgLong, text: L.longText(timeline.likely, timeline.people, timeline.low, timeline.high) });
  if (questions.length) messages.push({ title: L.msgNeed, text: L.needText(questions.length, phases.find((x) => x.name === questions[0].blocks) ? questions[0].blocks : null, totalDays) });

  const next = [];
  if (questions.length) next.push({ who: 'You', what: L.nextAnswer(questions.length), detail: L.seeQuestions(questions.length) });
  if (phases.length) next.push({ who: 'You', what: L.nextScope(phases[0].name), detail: phases[0].features.map((f) => f.name).join(', ') });
  if (assumptions.length) next.push({ who: 'You', what: L.nextAssume, detail: L.seeAssumptions(assumptions.length) });
  next.push({ who: 'We', what: L.nextPlan, detail: L.nextPlanDetail });

  return {
    title,
    lang: code,
    L,
    subtitle: L.subtitle,
    date: bp?.generated || null,
    headline,
    messages,
    vision: para(section(brief, 'Vision')),
    users: para(section(brief, 'Target Users')),
    value: para(section(brief, 'Core Value Prop')),
    nonGoals: bullets(section(brief, 'Non-goals')),
    constraints: bullets(section(brief, 'Constraints')),
    features: feats,
    featuresHeadline: L.featuresHeadline(feats.length, phases.length, defined),
    doneHeadline: L.doneHeadline(feats.length - defined),
    timeline,
    timelineHeadline: timeline ? L.timelineHeadline(timeline.likely, timeline.people, timeline.high) : '',
    phases,
    questions,
    questionsHeadline: L.questionsHeadline(questions.length, totalDays, moreQuestions.length),
    moreQuestions,
    assumptions,
    later,
    next,
    nextHeadline: L.nextHeadline(questions.length, phases[0]?.name),
  };
}

export function timelineLine(m) {
  const t = m.timeline;
  if (!t) return '';
  return L.timelineLine(t.likely, t.endDateLikely ? fmtDate(t.endDateLikely) : null, t.low, t.high, t.endDate ? `${fmtDate(t.endDate[0])} ${L.to} ${fmtDate(t.endDate[1])}` : null, t.people);
}

const cell = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
export function renderReportMd(p, opts = {}) {
  const m = reportModel(p, opts);
  const out = [`# ${m.title}`, '', `${m.subtitle}${m.date ? ` · ${fmtDate(m.date)}` : ''} · ${L.draft}`, ''];
  out.push(`## ${L.execSummary}`, '', `**${m.headline}.**`, '');
  for (const x of m.messages) out.push(`**${x.title}.** ${x.text}`, '');
  if (m.questions.length) {
    out.push(`## ${L.needFromYou}`, '', `**${m.questionsHeadline}.**`, '');
    m.questions.forEach((q, i) => out.push(`${i + 1}. **${q.question}**  `, `   ${L.impactSuffix(q.impact)}${q.features.length ? ` · ${L.affects.toLowerCase()} ${q.features.join(', ')}` : ''}${q.days ? ` · ${L.couldAdd.toLowerCase()} ${L.upToDays(q.days)}` : ''}${q.blocks ? ` · ${L.waitsFor(q.blocks)}` : ''}`, ''));
    if (m.moreQuestions.length) {
      out.push(`**${L.alsoOpen}**, ${L.alsoOpenLede}:`, '', `| ${L.question} | ${L.impactCol} | ${L.affects} |`, '| --- | --- | --- |');
      for (const q of m.moreQuestions) out.push(`| ${cell(q.question)} | ${q.impact} | ${cell(q.features.join(', ') || L.wholeProject)} |`);
      out.push('');
    }
  }
  if (m.phases.length) {
    out.push(`## ${L.planTimeline}`, '', `**${m.timelineHeadline}.**`, '', timelineLine(m), '');
    out.push(`| ${L.phase} | ${L.likely} | ${L.range} | ${L.readyByLikely} |`, '| --- | --- | --- | --- |');
    for (const ph of m.phases) out.push(`| ${ph.n}. ${cell(ph.name)} | ${weeks(ph.likely)} | ${range(ph.weeks[0], ph.weeks[1], L.weeksUnit)} | ${ph.endDateLikely ? fmtDate(ph.endDateLikely) : '–'} |`);
    out.push('', L.rangeNote, '');
  }
  out.push(`## ${L.scope}`, '', `**${m.featuresHeadline}.**`, '');
  const groups = m.phases.length ? m.phases.map((ph) => [`${ph.n}. ${ph.name}`, ph.features]) : [[L.featuresWord, m.features]];
  if (m.later.length) groups.push([L.later, m.later]);
  for (const [name, fs] of groups) {
    if (!fs.length) continue;
    out.push(`### ${name}`, '', `| ${L.feature} | ${L.usedBy} | ${L.doneWhen} |`, '| --- | --- | --- |');
    for (const f of fs) out.push(`| ${cell(f.name)} | ${cell(f.who)} | ${cell(f.done || L.toBeDefined)} |`);
    out.push('');
  }
  if (m.assumptions.length || m.nonGoals.length || m.constraints.length) {
    out.push(`## ${L.boundariesAssumptions}`, '');
    if (m.nonGoals.length) out.push(`**${L.notIncluded}**`, '', m.nonGoals.map((a) => `- ${a}`).join('\n'), '');
    if (m.constraints.length) out.push(`**${L.constraints}**`, '', m.constraints.map((a) => `- ${a}`).join('\n'), '');
    if (m.assumptions.length) out.push(`**${L.weAssumed}**`, '', m.assumptions.map((a) => `- ${a}`).join('\n'), '');
  }
  out.push(`## ${L.nextSteps}`, '', `**${m.nextHeadline}.**`, '', m.next.map((n, i) => `${i + 1}. **${n.what}** (${n.who === 'You' ? L.yourTeam : L.ourTeam}). ${n.detail}`).join('\n'), '');
  return out.join('\n');
}
