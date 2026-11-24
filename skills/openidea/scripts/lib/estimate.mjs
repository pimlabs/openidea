// Phases and timeline derived from the blueprint, deterministically.
// Size comes from what the blueprint defines; the width of each range comes from what it does not
// (undefined slots, assumptions, open gaps). So a shallow definition shows up as an uncertain timeline,
// and every open gap carries a price in days.
import { BLUEPRINT_KINDS, isFilled } from './validate.mjs';
import { openGaps } from './analyze.mjs';

// Ideal person-days for one developer, [low, high]. Override any key in openidea/calibration.md.
export const DEFAULT_COEFFICIENTS = {
  setup: [3, 5],            // project skeleton, auth, CI, first deploy
  actor: [0.5, 1],          // a role: access rules, its navigation
  entity: [1, 2],           // model, storage, CRUD
  entity_attribute: [0.1, 0.2],
  entity_state: [0.25, 0.5],
  flow: [1, 2],
  flow_step: [0.5, 1],
  screen: [1, 2.5],
  screen_element: [0.25, 0.5],
  integration: [3, 6],
  integration_both_ways: [1.5, 3],
  nfr: [1, 3],
  rule: [0.5, 1.5],         // one business rule: a calculation, policy or validation (e.g. a commission tier), built and tested
  stabilize: [0.15, 0.25],  // share of a phase spent on testing, fixes, UAT
};
// Extra width on the high end, per cause.
export const UNCERTAINTY = { missing_slot: 0.1, assumption: 0.25, gap: { high: 0.4, medium: 0.2, low: 0.05 } };
const DEFAULT_TEAM = { people: 1, days_per_week: 5, focus: 0.7 };

const get = (o, p) => p.split('.').reduce((x, k) => (x == null ? undefined : x[k]), o);
const list = (v) => (Array.isArray(v) ? v : []);
const half = (n) => Math.round(n * 2) / 2;
const pair = (v, d) => (Array.isArray(v) && v.length === 2 && v.every((x) => typeof x === 'number') ? v : d);

export function readCalibration(p) {
  const c = p.calibration?.data || {};
  const team = { ...DEFAULT_TEAM, ...(c.team || {}) };
  const coef = {};
  for (const k of Object.keys(DEFAULT_COEFFICIENTS)) coef[k] = pair(c.coefficients?.[k], DEFAULT_COEFFICIENTS[k]);
  const ratios = list(c.actuals)
    .filter((a) => typeof a.actual_days === 'number' && typeof a.estimate_low === 'number' && typeof a.estimate_high === 'number' && a.estimate_low + a.estimate_high > 0)
    .map((a) => a.actual_days / ((a.estimate_low + a.estimate_high) / 2))
    .sort((a, b) => a - b);
  const factor = ratios.length ? ratios[Math.floor((ratios.length - 1) / 2)] : 1;
  return { team, coef, factor, samples: ratios.length, start: typeof c.start === 'string' ? c.start : null, present: !!p.calibration };
}

function baseSize(kind, el, coef) {
  const add = (acc, [l, h], n = 1) => [acc[0] + l * n, acc[1] + h * n];
  let s = [0, 0];
  if (kind === 'actors') s = add(s, coef.actor);
  if (kind === 'entities') { s = add(s, coef.entity); s = add(s, coef.entity_attribute, list(el.attributes).length); s = add(s, coef.entity_state, list(el.states).length); }
  if (kind === 'flows') { s = add(s, coef.flow); s = add(s, coef.flow_step, list(el.steps).length); }
  if (kind === 'screens') { s = add(s, coef.screen); s = add(s, coef.screen_element, list(el.elements).length); }
  if (kind === 'integrations') { s = add(s, coef.integration); if (el.direction === 'both') s = add(s, coef.integration_both_ways); }
  if (kind === 'nfr') s = add(s, coef.nfr);
  // Business rules cost on their own: a payroll with 30 rules is not one entity and two screens.
  if (kind === 'entities' || kind === 'flows') s = add(s, coef.rule, list(el.rules).length);
  return s;
}

// A gap widens the elements it names in `affects` ("integrations/whatsapp"); without `affects`, the
// buildable elements of its ideas. Actors and NFRs only widen when named, so one gap is not counted everywhere.
function gapTouches(g, kind, el, ideas) {
  const affects = list(g.data.affects);
  if (affects.length) return affects.includes(`${kind}/${el.id}`);
  if (kind === 'actors' || kind === 'nfr') return false;
  return list(g.data.ideas).some((id) => ideas.includes(id));
}

export function estimate(p) {
  const bp = p.blueprint;
  if (!bp) return null;
  const cal = readCalibration(p);
  const milestones = p.roadmap?.milestones || [];
  const phaseOfIdea = new Map();
  milestones.forEach((m, i) => m.ideas.forEach((id) => { if (!phaseOfIdea.has(id)) phaseOfIdea.set(id, i); }));
  const open = openGaps(p);

  const items = [];
  for (const kind of Object.keys(BLUEPRINT_KINDS)) {
    for (const el of list(bp[kind])) {
      const ideas = list(el.derived_from);
      const phases = ideas.map((id) => phaseOfIdea.get(id)).filter((x) => x !== undefined);
      const missing = BLUEPRINT_KINDS[kind].slots.filter((s) => !isFilled(get(el, s)));
      const gaps = open.filter((g) => gapTouches(g, kind, el, ideas));
      const reasons = [];
      let widen = 0;
      if (missing.length) { widen += missing.length * UNCERTAINTY.missing_slot; reasons.push(`${missing.length} undefined: ${missing.join(', ')}`); }
      const vague = list(el.rules).filter((r) => !isFilled(r)).length;
      if (vague) { widen += vague * UNCERTAINTY.missing_slot; reasons.push(`${vague} rule${vague === 1 ? '' : 's'} not defined yet`); }
      if (el.assumption === true) { widen += UNCERTAINTY.assumption; reasons.push('assumption, no idea states it'); }
      for (const g of gaps) { widen += UNCERTAINTY.gap[g.data.impact] || 0; reasons.push(`open gap ${g.data.id} (${g.data.impact})`); }
      const [l, h] = baseSize(kind, el, cal.coef);
      items.push({
        kind, id: el.id, name: el.name || (kind === 'nfr' ? `${el.category || 'nfr'}: ${el.id}` : el.id), ideas,
        // Assumed or idea-less elements go where they are first needed: the first phase.
        phase: phases.length ? Math.min(...phases) : (ideas.length ? null : 0),
        low: l, high: h * (1 + widen), base_high: h, widen, reasons, gaps: gaps.map((g) => g.data.id),
      });
    }
  }

  const capacity = cal.team.people * cal.team.days_per_week * cal.team.focus; // ideal days per calendar week
  const phaseDefs = milestones.length ? milestones.map((m) => ({ id: m.id, name: m.name })) : [{ id: 'all', name: 'Everything in the blueprint' }];
  if (!milestones.length) items.forEach((it) => { it.phase = 0; });
  const phases = phaseDefs.map((m, i) => {
    const its = items.filter((it) => it.phase === i);
    // likely: the middle of the size range, assuming what is still open resolves without surprises.
    // high: the top of the size range with every undefined slot, assumption and open gap priced in.
    let low = its.reduce((s, it) => s + it.low, 0), high = its.reduce((s, it) => s + it.high, 0), likely = its.reduce((s, it) => s + (it.low + it.base_high) / 2, 0);
    if (i === 0) { low += cal.coef.setup[0]; high += cal.coef.setup[1]; likely += (cal.coef.setup[0] + cal.coef.setup[1]) / 2; }
    const stabMid = (cal.coef.stabilize[0] + cal.coef.stabilize[1]) / 2;
    low = low * (1 + cal.coef.stabilize[0]) * cal.factor; high = high * (1 + cal.coef.stabilize[1]) * cal.factor; likely = likely * (1 + stabMid) * cal.factor;
    return { ...m, items: its, setup: i === 0, low: half(low), high: half(high), likely: half(likely), weeks: [half(low / capacity), half(high / capacity)], likelyWeeks: half(likely / capacity) };
  }).filter((ph, i) => ph.items.length || i === 0);

  let cum = [0, 0], cumLikely = 0;
  for (const ph of phases) {
    ph.startWeek = [cum[0], cum[1]];
    cum = [cum[0] + ph.weeks[0], cum[1] + ph.weeks[1]];
    ph.endWeek = [...cum];
    cumLikely += ph.likelyWeeks;
    ph.endWeekLikely = cumLikely;
    if (cal.start) ph.endDateLikely = addDays(cal.start, Math.ceil(cumLikely * 7));
    if (cal.start) ph.endDate = cum.map((w) => addDays(cal.start, Math.ceil(w * 7)));
  }
  const unplanned = items.filter((it) => it.phase === null);

  // What each open gap costs: how much the high end shrinks if it is closed.
  const gapCost = open.map((g) => {
    let d = 0;
    for (const it of items.filter((x) => x.phase !== null && x.gaps.includes(g.data.id))) d += it.base_high * (UNCERTAINTY.gap[g.data.impact] || 0);
    return { id: g.data.id, impact: g.data.impact, question: g.data.question, days: half(d * (1 + cal.coef.stabilize[1]) * cal.factor) };
  }).filter((x) => x.days > 0).sort((a, b) => b.days - a.days || a.id.localeCompare(b.id));

  return {
    calibration: { ...cal, capacity },
    phases,
    unplanned,
    total: { low: half(phases.reduce((s, x) => s + x.low, 0)), high: half(phases.reduce((s, x) => s + x.high, 0)), weeks: [half(cum[0]), half(cum[1])], likely: half(phases.reduce((s, x) => s + x.likely, 0)), likelyWeeks: half(cumLikely), endDateLikely: cal.start ? addDays(cal.start, Math.ceil(cumLikely * 7)) : null, endDate: cal.start ? cum.map((w) => addDays(cal.start, Math.ceil(w * 7))) : null },
    gapCost,
  };
}

function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d)) return null;
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Raw outputs only: JSON for tools, CSV for spreadsheets. People read the dashboard's Roadmap page.
export function renderEstimateJson(p) {
  const e = estimate(p);
  if (!e) return null;
  const c = e.calibration;
  const item = (it) => ({ kind: it.kind.replace(/s$/, '').replace(/ie$/, 'y'), id: it.id, name: it.name, low_days: half(it.low), high_days: half(it.high), ideas: it.ideas, uncertainty: it.reasons });
  return JSON.stringify({
    schema: 'openidea.estimate/1',
    unit: 'ideal person-days; weeks are calendar weeks for the whole team',
    team: c.team,
    ideal_days_per_week: half(c.capacity),
    calibration: { samples: c.samples, factor: Math.round(c.factor * 100) / 100 },
    start: c.start,
    total: { low_days: e.total.low, high_days: e.total.high, low_weeks: e.total.weeks[0], high_weeks: e.total.weeks[1], likely_high_days: e.total.likely, likely_high_weeks: e.total.likelyWeeks, end_date_likely: e.total.endDateLikely, end_date_low: e.total.endDate?.[0] ?? null, end_date_high: e.total.endDate?.[1] ?? null },
    phases: e.phases.map((ph) => ({
      id: ph.id, name: ph.name, low_days: ph.low, high_days: ph.high, low_weeks: ph.weeks[0], high_weeks: ph.weeks[1],
      likely_high_days: ph.likely, likely_high_weeks: ph.likelyWeeks, end_date_likely: ph.endDateLikely ?? null, end_week_low: ph.endWeek[0], end_week_high: ph.endWeek[1], end_date_low: ph.endDate?.[0] ?? null, end_date_high: ph.endDate?.[1] ?? null,
      setup_days: ph.setup ? { low: c.coef.setup[0], high: c.coef.setup[1] } : null,
      stabilize_share: { low: c.coef.stabilize[0], high: c.coef.stabilize[1] },
      items: ph.items.map(item),
    })),
    unplanned: e.unplanned.map(item),
    gap_cost: e.gapCost.map((g) => ({ gap: g.id, impact: g.impact, high_days_removed: g.days, question: g.question })),
  }, null, 2) + '\n';
}

const csvCell = (v) => { const s = Array.isArray(v) ? v.join('; ') : String(v ?? ''); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export function renderWorkCsv(p) {
  const e = estimate(p);
  if (!e) return null;
  const c = e.calibration;
  const rows = [['phase_id', 'phase', 'kind', 'id', 'name', 'low_days', 'high_days', 'ideas', 'uncertainty']];
  for (const ph of e.phases) {
    if (ph.setup) rows.push([ph.id, ph.name, 'setup', 'setup', 'Project setup', c.coef.setup[0], c.coef.setup[1], '', '']);
    for (const it of ph.items) rows.push([ph.id, ph.name, BLUEPRINT_KINDS[it.kind].label.toLowerCase(), it.id, it.name, half(it.low), half(it.high), it.ideas, it.reasons]);
  }
  for (const it of e.unplanned) rows.push(['', 'Not in any milestone', BLUEPRINT_KINDS[it.kind].label.toLowerCase(), it.id, it.name, half(it.low), half(it.high), it.ideas, it.reasons]);
  return rows.map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}
