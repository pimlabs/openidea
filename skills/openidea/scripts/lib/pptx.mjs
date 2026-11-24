// The report as a 16:9 PowerPoint deck, written as raw OOXML: no dependencies, editable in
// PowerPoint, Keynote and Google Slides. Same content model as the Markdown and PDF report.
// Layout: every content slide has a section kicker, an action title that states the conclusion,
// one content block on a fixed grid, and a footer. Sizes: title 24, lead 16, body 12–14, labels 10–11.
import { zip } from './zip.mjs';
import { reportModel, range, fmtDate, weeks } from './report.mjs';

const EMU = 914400; // per inch
const SW = 13.333, SH = 7.5;
const e = (inches) => Math.round(inches * EMU);
const xml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const C = {
  navy: '14213D', text: '1A1C20', muted: '5B606B', dim: '8A909B', accent: '2558C9', accentSoft: 'EAF0FD', white: 'FFFFFF',
  tile: 'F4F6FA', line: 'E2E4E8', red: 'C0271D', redSoft: 'FDECEB', amber: '9A6200', amberSoft: 'FDF3DC', green: '1D7A46', greenSoft: 'E4F5EA', coverSub: 'B9C7E6',
};
const FONT = 'Arial';
const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const M = 0.6, CW = SW - 2 * M, TOP = 1.95, BOTTOM = 6.8;

class Slide {
  constructor() { this.shapes = []; this.id = 2; }
  next() { return this.id++; }
  // paras: strings or arrays of runs {text, size, bold, color, caps, spc}
  text(x, y, w, h, paras, { size = 14, color = C.text, bold = false, fill = null, anchor = 't', align = 'l', bullet = false, numbered = false, inset = 0.05, spacing = 4, line = 0 } = {}) {
    const id = this.next();
    const ps = (Array.isArray(paras) ? paras : [paras]).map((p, i) => {
      const runs = (Array.isArray(p) ? p : [{ text: p }]).map((r) => `<a:r><a:rPr lang="en-US" sz="${Math.round((r.size || size) * 100)}" b="${(r.bold ?? bold) ? 1 : 0}"${r.caps ? ' cap="all"' : ''}${r.spc ? ` spc="${r.spc}"` : ''} dirty="0"><a:solidFill><a:srgbClr val="${r.color || color}"/></a:solidFill><a:latin typeface="${FONT}"/><a:cs typeface="${FONT}"/></a:rPr><a:t>${xml(r.text)}</a:t></a:r>`).join('');
      const marker = bullet ? `<a:buClr><a:srgbClr val="${C.accent}"/></a:buClr><a:buFont typeface="${FONT}"/><a:buChar char="•"/>` : numbered ? `<a:buFont typeface="${FONT}"/><a:buAutoNum type="arabicPeriod"/>` : '<a:buNone/>';
      const ind = bullet || numbered ? ' marL="228600" indent="-228600"' : '';
      return `<a:p><a:pPr algn="${align}"${ind}>${line ? `<a:lnSpc><a:spcPct val="${line * 1000}"/></a:lnSpc>` : ''}<a:spcBef><a:spcPts val="${i ? spacing * 100 : 0}"/></a:spcBef>${marker}</a:pPr>${runs}<a:endParaRPr lang="en-US" sz="${Math.round(size * 100)}"/></a:p>`;
    }).join('');
    const ins = e(inset);
    this.shapes.push(`<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Text ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${e(x)}" y="${e(y)}"/><a:ext cx="${e(w)}" cy="${e(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${fill ? `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>` : '<a:noFill/>'}</p:spPr><p:txBody><a:bodyPr wrap="square" lIns="${ins}" tIns="${ins}" rIns="${ins}" bIns="${ins}" anchor="${anchor}"/><a:lstStyle/>${ps}</p:txBody></p:sp>`);
  }
  shape(x, y, w, h, fill, { geom = 'rect', line = null, adj = null } = {}) {
    const id = this.next();
    const av = adj != null ? `<a:avLst><a:gd name="adj" fmla="val ${adj}"/></a:avLst>` : '<a:avLst/>';
    this.shapes.push(`<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Shape ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${e(x)}" y="${e(y)}"/><a:ext cx="${Math.max(1, e(w))}" cy="${Math.max(1, e(h))}"/></a:xfrm><a:prstGeom prst="${geom}">${av}</a:prstGeom>${fill ? `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>` : '<a:noFill/>'}${line ? `<a:ln w="${Math.round(line[1] * 12700)}"><a:solidFill><a:srgbClr val="${line[0]}"/></a:solidFill></a:ln>` : '<a:ln><a:noFill/></a:ln>'}</p:spPr></p:sp>`);
  }
  rect(x, y, w, h, fill, opts) { this.shape(x, y, w, h, fill, opts); }
  card(x, y, w, h, fill = C.tile) { this.shape(x, y, w, h, fill, { geom: 'roundRect', adj: 6000 }); }
  chip(x, y, label, fill, color, size = 10) {
    const w = 0.22 + label.length * size * 0.0078;
    this.shape(x, y, w, 0.28, fill, { geom: 'roundRect', adj: 50000 });
    this.text(x, y, w, 0.28, [[{ text: label, size, bold: true, color }]], { align: 'ctr', anchor: 'ctr', inset: 0 });
    return w;
  }
  table(x, y, w, head, rows, fractions, { size = 12, rowH = 0.5 } = {}) {
    const id = this.next();
    const cols = fractions.map((f) => e(f * w));
    const cell = (t, headRow, first) => `<a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="${(headRow ? 10 : size) * 100}" b="${headRow || first ? 1 : 0}"${headRow ? ' cap="all" spc="50"' : ''} dirty="0"><a:solidFill><a:srgbClr val="${headRow ? C.muted : C.text}"/></a:solidFill><a:latin typeface="${FONT}"/><a:cs typeface="${FONT}"/></a:rPr><a:t>${xml(t)}</a:t></a:r></a:p></a:txBody><a:tcPr marL="${e(0.12)}" marR="${e(0.12)}" marT="${e(0.09)}" marB="${e(0.09)}"><a:lnL w="0"><a:noFill/></a:lnL><a:lnR w="0"><a:noFill/></a:lnR><a:lnT w="0"><a:noFill/></a:lnT><a:lnB w="${headRow ? 12700 : 6350}"><a:solidFill><a:srgbClr val="${headRow ? C.text : C.line}"/></a:solidFill></a:lnB><a:noFill/></a:tcPr></a:tc>`;
    const trs = [head, ...rows].map((r, i) => `<a:tr h="${e(i ? rowH : 0.4)}">${r.map((c, k) => cell(c, i === 0, k === 0 && i > 0)).join('')}</a:tr>`).join('');
    this.shapes.push(`<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${id}" name="Table ${id}"/><p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="${e(x)}" y="${e(y)}"/><a:ext cx="${e(w)}" cy="${e(0.4 + rowH * rows.length)}"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr firstRow="1"/><a:tblGrid>${cols.map((c) => `<a:gridCol w="${c}"/>`).join('')}</a:tblGrid>${trs}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`);
  }
  xml(bg = null) {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:sld ${NS}><p:cSld>${bg ? `<p:bg><p:bgPr><a:solidFill><a:srgbClr val="${bg}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>` : ''}<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${this.shapes.join('')}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
  }
}

const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };
const IMPACT_STYLE = { High: [C.redSoft, C.red], Medium: [C.amberSoft, C.amber], Low: [C.tile, C.muted] };

function content(m, kicker, title) {
  const s = new Slide();
  s.text(M, 0.42, CW, 0.3, [[{ text: kicker, size: 11, bold: true, color: C.accent, caps: true, spc: 120 }]], { inset: 0 });
  s.text(M, 0.74, CW, 1.05, [[{ text: title, size: 24, bold: true, color: C.text }]], { inset: 0, line: 95 });
  s.rect(M, 7.0, CW, 0.01, C.line);
  s.footer = (n) => {
    s.text(M, 7.06, CW - 1, 0.3, [[{ text: `${m.title}  ·  ${m.subtitle}  ·  Draft for discussion`, size: 9, color: C.dim }]], { inset: 0 });
    s.text(SW - M - 1, 7.06, 1, 0.3, [[{ text: String(n), size: 9, color: C.dim }]], { inset: 0, align: 'r' });
  };
  return s;
}

export function buildSlides(m) {
  const slides = [];

  // Cover
  const cover = new Slide();
  cover.bg = C.navy;
  cover.rect(M, 2.15, 0.9, 0.06, C.accent);
  cover.text(M, 1.6, CW, 0.4, [[{ text: m.subtitle, size: 13, bold: true, color: C.coverSub, caps: true, spc: 150 }]], { inset: 0 });
  cover.text(M, 2.45, 10.5, 1.9, [[{ text: m.title, size: 44, bold: true, color: C.white }]], { inset: 0, line: 90 });
  cover.text(M, 3.75, 10.5, 1.1, [[{ text: m.headline + '.', size: 18, color: C.coverSub }]], { inset: 0, line: 110 });
  cover.text(M, 6.55, CW, 0.4, [[{ text: `${m.date ? fmtDate(m.date) + '  ·  ' : ''}Draft for discussion`, size: 12, color: C.coverSub }]], { inset: 0 });
  slides.push(cover);

  // Executive summary: key messages left, numbers right
  const ex = content(m, 'Executive summary', m.headline);
  const msgs = m.messages.slice(0, 4), colW = 7.55, rowH = (BOTTOM - TOP) / Math.max(msgs.length, 1);
  msgs.forEach((x, i) => {
    const y = TOP + i * rowH;
    if (i) ex.rect(M, y - 0.12, colW, 0.01, C.line);
    ex.text(M, y, 2.1, rowH - 0.2, [[{ text: x.title, size: 13, bold: true, color: C.accent }]], { inset: 0 });
    ex.text(M + 2.2, y, colW - 2.2, rowH - 0.2, [[{ text: x.text, size: 13 }]], { inset: 0, line: 105 });
  });
  const tiles = [[String(m.features.length), 'features', `in ${m.phases.length || 1} phase${m.phases.length === 1 ? '' : 's'}`, C.text]];
  if (m.timeline) tiles.push([String(m.timeline.likely), 'weeks, likely', `range ${range(m.timeline.low, m.timeline.high)} weeks${m.timeline.endDateLikely ? ` · ready ~${fmtDate(m.timeline.endDateLikely)}` : ''}`, C.accent]);
  tiles.push([String(m.questions.length), m.questions.length === 1 ? 'decision needed' : 'decisions needed', m.questions.length ? 'from you, listed next' : 'nothing blocks the plan', m.questions.some((q) => q.impact === 'High') ? C.red : C.text]);
  const tx = M + colW + 0.45, tw = CW - colW - 0.45, th = ((BOTTOM - TOP) - 0.2 * (tiles.length - 1)) / tiles.length;
  tiles.forEach(([v, k, sub, col], i) => {
    const y = TOP - 0.05 + i * (th + 0.2);
    ex.card(tx, y, tw, th);
    ex.text(tx + 0.3, y + 0.15, tw - 0.6, 0.75, [[{ text: v, size: 36, bold: true, color: col }, { text: '  ' + k, size: 14, bold: true, color: C.text }]], { inset: 0, anchor: 'b' });
    ex.text(tx + 0.3, y + 0.95, tw - 0.6, th - 1.0, [[{ text: sub, size: 11, color: C.muted }]], { inset: 0 });
  });
  slides.push(ex);

  // Decisions needed: one card per question, three per slide
  chunk(m.questions, 3).forEach((qs, pi, all) => {
    const s = content(m, `What we need from you${all.length > 1 ? ` (${pi + 1}/${all.length})` : ''}`, m.questionsHeadline);
    const gap = 0.3, n = all.length > 1 ? 3 : Math.max(qs.length, 2), w = (CW - gap * (n - 1)) / n;
    qs.forEach((q, i) => {
      const x = M + i * (w + gap), y = TOP, h = 3.9;
      s.card(x, y, w, h);
      s.rect(x, y, w, 0.07, IMPACT_STYLE[q.impact]?.[1] || C.muted);
      s.text(x + 0.3, y + 0.3, 0.6, 0.5, [[{ text: String(pi * 3 + i + 1), size: 28, bold: true, color: C.dim }]], { inset: 0 });
      const [bg, fg] = IMPACT_STYLE[q.impact] || [C.tile, C.muted];
      s.chip(x + w - 0.3 - (0.22 + `${q.impact} impact`.length * 0.078), y + 0.38, `${q.impact} impact`, bg, fg);
      s.text(x + 0.3, y + 1.0, w - 0.6, 1.7, [[{ text: q.question, size: 17, bold: true }]], { inset: 0, line: 105 });
      const meta = [];
      if (q.features.length) meta.push([{ text: 'Affects  ', size: 11, bold: true, color: C.muted }, { text: q.features.join(', '), size: 12 }]);
      if (q.days) meta.push([{ text: 'Could add  ', size: 11, bold: true, color: C.muted }, { text: `up to ${q.days} day${q.days === 1 ? '' : 's'}`, size: 12 }]);
      if (q.blocks) meta.push([{ text: 'Blocks  ', size: 11, bold: true, color: C.red }, { text: `${q.blocks} cannot start without it`, size: 12, color: C.red }]);
      s.rect(x + 0.3, y + 2.75, w - 0.6, 0.01, C.line);
      s.text(x + 0.3, y + 2.9, w - 0.6, h - 3.0, meta, { inset: 0, spacing: 6 });
    });
    slides.push(s);
  });

  // Plan and timeline: Gantt on the likely schedule, plus the whole-project range
  if (m.phases.length) chunk(m.phases, 5).forEach((phs) => {
    const s = content(m, 'Plan and timeline', m.timelineHeadline);
    const max = Math.max(m.timeline?.high || 1, 1), labelW = 3.3, trackX = M + labelW, trackW = CW - labelW - 1.6;
    const step = max <= 8 ? 1 : max <= 16 ? 2 : max <= 32 ? 4 : 8;
    s.text(trackX - 0.3, TOP - 0.05, 0.6, 0.3, [[{ text: 'Week', size: 9, color: C.dim }]], { inset: 0, align: 'ctr' });
    for (let w = 0; w <= max; w += step) {
      const x = trackX + (w / max) * trackW;
      s.rect(x, TOP + 0.3, 0.008, 0.55 + phs.length * 0.78, C.line);
      if (w) s.text(x - 0.3, TOP - 0.05, 0.6, 0.3, [[{ text: String(w), size: 9, color: C.dim }]], { inset: 0, align: 'ctr' });
    }
    phs.forEach((ph, i) => {
      const y = TOP + 0.45 + i * 0.78;
      s.text(M, y - 0.05, labelW - 0.25, 0.36, [[{ text: `${ph.n}  `, size: 13, bold: true, color: C.accent }, { text: ph.name, size: 13, bold: true }]], { inset: 0 });
      s.text(M, y + 0.27, labelW - 0.25, 0.3, [[{ text: `${ph.features.length} feature${ph.features.length === 1 ? '' : 's'} · range ${range(ph.weeks[0], ph.weeks[1])} wk`, size: 10, color: C.muted }]], { inset: 0 });
      const x = trackX + (ph.startLikely / max) * trackW, w = (ph.likely / max) * trackW;
      s.shape(x, y, w, 0.42, C.accent, { geom: 'roundRect', adj: 20000 });
      s.text(x, y, Math.max(w, 1), 0.42, [[{ text: weeks(ph.likely), size: 11, bold: true, color: C.white }]], { inset: 0.08, anchor: 'ctr' });
      if (ph.blockers.length) s.chip(x + w + 0.1, y + 0.07, 'waiting on a decision', C.redSoft, C.red, 9);
      s.text(trackX + trackW + 0.15, y + 0.02, 1.45, 0.4, [[{ text: ph.endDateLikely ? `~${fmtDate(ph.endDateLikely)}` : `wk ${ph.startLikely + ph.likely}`, size: 11, bold: true, color: C.muted }]], { inset: 0, anchor: 'ctr' });
    });
    if (m.timeline) {
      const y = Math.min(5.75, TOP + 0.95 + phs.length * 0.78);
      s.card(M, y - 0.2, CW, 1.05, C.tile);
      s.text(M + 0.25, y - 0.12, labelW - 0.4, 0.9, [[{ text: 'Whole project', size: 13, bold: true }], [{ text: `team of ${m.timeline.people}; the upper end prices in what is not yet decided`, size: 10, color: C.muted }]], { inset: 0, anchor: 'ctr', spacing: 2 });
      const lo = trackX + (m.timeline.low / max) * trackW, hi = trackX + (m.timeline.high / max) * trackW, li = trackX + (m.timeline.likely / max) * trackW;
      s.shape(lo, y + 0.16, hi - lo, 0.16, C.amberSoft, { geom: 'roundRect', adj: 50000, line: [C.amber, 0.75] });
      s.shape(li - 0.11, y + 0.13, 0.22, 0.22, C.accent, { geom: 'ellipse' });
      s.text(lo - 0.6, y + 0.36, 1.2, 0.3, [[{ text: `${m.timeline.low} wk`, size: 10, color: C.muted }]], { inset: 0, align: 'ctr' });
      s.text(li - 0.8, y - 0.17, 1.6, 0.3, [[{ text: `likely ${m.timeline.likely} wk`, size: 10, bold: true, color: C.accent }]], { inset: 0, align: 'ctr' });
      s.text(hi - 0.6, y + 0.36, 1.2, 0.3, [[{ text: `${m.timeline.high} wk`, size: 10, color: C.muted }]], { inset: 0, align: 'ctr' });
      if (m.timeline.endDate) s.text(trackX + trackW + 0.15, y - 0.08, 1.45, 0.8, [[{ text: `${fmtDate(m.timeline.endDate[0], { year: false })} – ${fmtDate(m.timeline.endDate[1])}`, size: 10, bold: true, color: C.muted }]], { inset: 0, anchor: 'ctr' });
    }
    slides.push(s);
  });

  // Scope overview: one column per phase
  const cols = [...m.phases.map((ph) => ({ head: `${ph.n}  ${ph.name}`, sub: `likely ${weeks(ph.likely)}`, items: ph.features, later: false }))];
  if (m.later.length) cols.push({ head: 'Later', sub: 'not planned yet', items: m.later, later: true });
  if (!m.phases.length) cols.push({ head: 'Features', sub: '', items: m.features, later: false });
  chunk(cols, 4).forEach((cs) => {
    const s = content(m, 'Scope', m.featuresHeadline);
    const gap = 0.25, w = (CW - gap * (cs.length - 1)) / cs.length;
    const ch = Math.min(BOTTOM - TOP, Math.max(2.6, 1.35 + Math.max(...cs.map((c) => Math.min(c.items.length, 8))) * 0.62));
    cs.forEach((c, i) => {
      const x = M + i * (w + gap);
      s.card(x, TOP, w, ch, c.later ? 'FFFFFF' : C.tile);
      if (c.later) s.shape(x, TOP, w, ch, null, { geom: 'roundRect', adj: 6000, line: [C.line, 1] });
      s.rect(x, TOP, w, 0.07, c.later ? C.dim : C.accent);
      s.text(x + 0.25, TOP + 0.25, w - 0.5, 0.4, [[{ text: c.head, size: 15, bold: true, color: c.later ? C.muted : C.text }]], { inset: 0 });
      s.text(x + 0.25, TOP + 0.62, w - 0.5, 0.3, [[{ text: c.sub, size: 11, color: C.muted }]], { inset: 0 });
      c.items.slice(0, 8).forEach((f, k) => s.text(x + 0.25, TOP + 1.05 + k * 0.62, w - 0.5, 0.6, [[{ text: f.name, size: 14, bold: true }], [{ text: f.who, size: 11, color: C.muted }]], { inset: 0, spacing: 1 }));
    });
    slides.push(s);
  });

  // Definition of done: every feature in one table, grouped by phase
  const rows = [...m.phases.flatMap((ph) => ph.features.map((f) => [ph.name, f])), ...m.later.map((f) => ['Later', f]), ...(m.phases.length ? [] : m.features.map((f) => ['', f]))];
  const per = Math.ceil(rows.length / Math.max(1, Math.ceil(rows.length / 9))); // balanced pages, at most 9 rows
  chunk(rows, per).forEach((rs, pi, all) => {
    const s = content(m, `Definition of done${all.length > 1 ? ` (${pi + 1}/${all.length})` : ''}`, m.doneHeadline);
    let prev = null;
    s.table(M, TOP, CW, ['Phase', 'Feature', 'Used by', 'Done when'], rs.map(([ph, f]) => { const label = ph === prev ? '' : ph; prev = ph; return [label, f.name, f.who, f.done || 'To be defined']; }), [0.15, 0.22, 0.13, 0.5], { size: 12, rowH: rs.length > 7 ? 0.5 : 0.6 });
    slides.push(s);
  });

  // Boundaries and assumptions
  const bcols = [];
  if (m.nonGoals.length) bcols.push(['Not included', m.nonGoals, C.muted]);
  if (m.constraints.length) bcols.push(['Constraints', m.constraints, C.muted]);
  if (m.assumptions.length) bcols.push(['We assumed (please confirm)', m.assumptions, C.amber]);
  if (bcols.length) {
    const s = content(m, 'Boundaries', 'What is out of scope, what limits the design, and what we assumed');
    const gap = 0.3, w = (CW - gap * (bcols.length - 1)) / bcols.length;
    const bh = Math.min(BOTTOM - TOP, Math.max(2.4, 1.1 + Math.max(...bcols.map((b) => Math.min(b[1].length, 8))) * 0.62));
    bcols.forEach(([t, items, col], i) => {
      const x = M + i * (w + gap);
      s.card(x, TOP, w, bh, col === C.amber ? C.amberSoft : C.tile);
      s.text(x + 0.3, TOP + 0.25, w - 0.6, 0.35, [[{ text: t, size: 11, bold: true, color: col, caps: true, spc: 100 }]], { inset: 0 });
      s.text(x + 0.3, TOP + 0.75, w - 0.6, bh - 0.9, items.slice(0, 8), { size: 14, bullet: true, inset: 0, spacing: 8 });
    });
    slides.push(s);
  }

  // Next steps
  const nx = content(m, 'Next steps', m.nextHeadline);
  const steps = m.next.slice(0, 4), gap = 0.25, w = (CW - gap * (steps.length - 1)) / steps.length;
  steps.forEach((st, i) => {
    const x = M + i * (w + gap);
    nx.card(x, TOP, w, 3.6, st.who === 'You' ? C.accentSoft : C.tile);
    nx.shape(x + 0.3, TOP + 0.3, 0.5, 0.5, st.who === 'You' ? C.accent : C.muted, { geom: 'ellipse' });
    nx.text(x + 0.3, TOP + 0.3, 0.5, 0.5, [[{ text: String(i + 1), size: 16, bold: true, color: C.white }]], { inset: 0, align: 'ctr', anchor: 'ctr' });
    nx.text(x + 0.95, TOP + 0.38, w - 1.2, 0.35, [[{ text: st.who === 'You' ? 'Your team' : 'Our team', size: 11, bold: true, color: st.who === 'You' ? C.accent : C.muted, caps: true, spc: 80 }]], { inset: 0 });
    nx.text(x + 0.3, TOP + 1.0, w - 0.6, 0.9, [[{ text: st.what, size: 16, bold: true }]], { inset: 0, line: 105 });
    nx.text(x + 0.3, TOP + 1.95, w - 0.6, 1.55, [[{ text: st.detail, size: 11, color: C.muted }]], { inset: 0, line: 110 });
  });
  slides.push(nx);

  slides.forEach((s, i) => { if (s.footer) s.footer(i + 1); });
  return slides;
}

const THEME = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="OpenIdea"><a:themeElements><a:clrScheme name="OpenIdea"><a:dk1><a:srgbClr val="1A1C20"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="5B606B"/></a:dk2><a:lt2><a:srgbClr val="F2F3F5"/></a:lt2><a:accent1><a:srgbClr val="2558C9"/></a:accent1><a:accent2><a:srgbClr val="1D7A46"/></a:accent2><a:accent3><a:srgbClr val="9A6200"/></a:accent3><a:accent4><a:srgbClr val="C0271D"/></a:accent4><a:accent5><a:srgbClr val="6D3FB0"/></a:accent5><a:accent6><a:srgbClr val="6B7280"/></a:accent6><a:hlink><a:srgbClr val="2558C9"/></a:hlink><a:folHlink><a:srgbClr val="6D3FB0"/></a:folHlink></a:clrScheme><a:fontScheme name="OpenIdea"><a:majorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Arial"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="OpenIdea"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`;

const EMPTY_TREE = '<p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree>';
const lvl = (sz) => `<a:lvl1pPr><a:defRPr sz="${sz}"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/></a:defRPr></a:lvl1pPr>`;
const MASTER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster ${NS}><p:cSld><p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>${EMPTY_TREE}</p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle>${lvl(3200)}</p:titleStyle><p:bodyStyle>${lvl(1800)}</p:bodyStyle><p:otherStyle>${lvl(1800)}</p:otherStyle></p:txStyles></p:sldMaster>`;
const LAYOUT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout ${NS} type="blank" preserve="1"><p:cSld name="Blank">${EMPTY_TREE}</p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;
const REL = (rels) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.map(([id, type, target]) => `<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/${type}" Target="${target}"/>`).join('')}</Relationships>`;

export function renderReportPptx(p) {
  const m = reportModel(p);
  const slides = buildSlides(m);
  const n = slides.length;
  const files = [];
  files.push(['[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${slides.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`]);
  files.push(['_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`]);
  files.push(['docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${xml(m.title)}</dc:title><dc:creator>OpenIdea</dc:creator></cp:coreProperties>`]);
  files.push(['docProps/app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>OpenIdea</Application><Slides>${n}</Slides></Properties>`]);
  files.push(['ppt/presentation.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:presentation ${NS} saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join('')}</p:sldIdLst><p:sldSz cx="${e(SW)}" cy="${e(SH)}"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`]);
  files.push(['ppt/_rels/presentation.xml.rels', REL([['rId1', 'slideMaster', 'slideMasters/slideMaster1.xml'], ...slides.map((_, i) => [`rId${i + 2}`, 'slide', `slides/slide${i + 1}.xml`]), [`rId${n + 2}`, 'theme', 'theme/theme1.xml']])]);
  files.push(['ppt/slideMasters/slideMaster1.xml', MASTER]);
  files.push(['ppt/slideMasters/_rels/slideMaster1.xml.rels', REL([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'], ['rId2', 'theme', '../theme/theme1.xml']])]);
  files.push(['ppt/slideLayouts/slideLayout1.xml', LAYOUT]);
  files.push(['ppt/slideLayouts/_rels/slideLayout1.xml.rels', REL([['rId1', 'slideMaster', '../slideMasters/slideMaster1.xml']])]);
  files.push(['ppt/theme/theme1.xml', THEME]);
  slides.forEach((s, i) => {
    files.push([`ppt/slides/slide${i + 1}.xml`, s.xml(s.bg)]);
    files.push([`ppt/slides/_rels/slide${i + 1}.xml.rels`, REL([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml']])]);
  });
  return zip(files);
}
