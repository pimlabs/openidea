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
    let low = its.reduce((s, it) => s + it.low, 0), high = its.reduce((s, it) => s + it.high, 0);
    if (i === 0) { low += cal.coef.setup[0]; high += cal.coef.setup[1]; }
    const stab = [low * cal.coef.stabilize[0], high * cal.coef.stabilize[1]];
    low = (low + stab[0]) * cal.factor; high = (high + stab[1]) * cal.factor;
    return { ...m, items: its, setup: i === 0, low: half(low), high: half(high), weeks: [half(low / capacity), half(high / capacity)] };
  }).filter((ph, i) => ph.items.length || i === 0);

  let cum = [0, 0];
  for (const ph of phases) {
    ph.startWeek = [cum[0], cum[1]];
    cum = [cum[0] + ph.weeks[0], cum[1] + ph.weeks[1]];
    ph.endWeek = [...cum];
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
    total: { low: half(phases.reduce((s, x) => s + x.low, 0)), high: half(phases.reduce((s, x) => s + x.high, 0)), weeks: [half(cum[0]), half(cum[1])], endDate: cal.start ? cum.map((w) => addDays(cal.start, Math.ceil(w * 7))) : null },
    gapCost,
  };
}

function addDays(iso, n) {
  const d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d)) return null;
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const fmtRange = (a, b, unit = '') => ((a === b ? `${a}` : `${a}–${b}`) + (unit ? ` ${unit}` : ''));

export function renderEstimateMd(p) {
  const e = estimate(p);
  const out = ['# Phases and timeline', '', '_Generated by `openidea estimate` from `blueprint.json`, `ROADMAP.md`, open gaps and `calibration.md`. Do not edit by hand. Ranges are ideal person-days converted to calendar weeks; the high end widens for every undefined slot, assumption and open gap._', ''];
  if (!e) { out.push('_No blueprint yet._'); return out.join('\n'); }
  const c = e.calibration;
  out.push(`**Total:** ${fmtRange(e.total.weeks[0], e.total.weeks[1], 'weeks')} (${fmtRange(e.total.low, e.total.high, 'person-days')})${e.total.endDate ? `, done between ${e.total.endDate[0]} and ${e.total.endDate[1]}` : ''}.`, '');
  out.push(`**Team:** ${c.team.people} ${c.team.people === 1 ? 'person' : 'people'} × ${c.team.days_per_week} days × ${Math.round(c.team.focus * 100)}% focus = ${half(c.capacity)} ideal days per week. ${c.samples ? `Calibrated on ${c.samples} past milestone${c.samples > 1 ? 's' : ''} (factor ${c.factor.toFixed(2)}).` : 'Not calibrated yet: record actuals in `openidea/calibration.md` after each milestone.'}`, '');
  for (const ph of e.phases) {
    out.push(`## ${ph.name}${ph.id !== 'all' ? ` (\`${ph.id}\`)` : ''}`, '', `${fmtRange(ph.weeks[0], ph.weeks[1], 'weeks')} · ${fmtRange(ph.low, ph.high, 'person-days')} · ends in week ${fmtRange(Math.ceil(ph.endWeek[0]), Math.ceil(ph.endWeek[1]))}${ph.endDate ? ` · ends ${ph.endDate[0]} to ${ph.endDate[1]}` : ''}`, '');
    out.push('| Work | Kind | Days | Why the range is wide |', '| --- | --- | --- | --- |');
    if (ph.setup) out.push(`| Project setup | setup | ${fmtRange(c.coef.setup[0], c.coef.setup[1])} | |`);
    for (const it of ph.items) out.push(`| ${it.name} | ${BLUEPRINT_KINDS[it.kind].label.toLowerCase()} | ${fmtRange(half(it.low), half(it.high))} | ${it.reasons.join('; ').replace(/\|/g, '\\|')} |`);
    out.push(`| Testing, fixes, UAT | stabilize | ${Math.round(c.coef.stabilize[0] * 100)}–${Math.round(c.coef.stabilize[1] * 100)}% | |`, '');
  }
  if (e.gapCost.length) {
    out.push('## What open gaps cost', '', 'Closing a gap removes its share of the high end:', '');
    for (const g of e.gapCost) out.push(`- \`${g.id}\` (${g.impact}): up to ${g.days} person-days. ${g.question}`);
    out.push('');
  }
  if (e.unplanned.length) out.push('## Not in any milestone', '', e.unplanned.map((it) => `- ${it.name} (${BLUEPRINT_KINDS[it.kind].label.toLowerCase()}, ${fmtRange(half(it.low), half(it.high), 'days')})`).join('\n'), '');
  return out.join('\n');
}
