// The report as a PDF, written directly: A4, the PDF base fonts (Helvetica), no dependencies,
// no timestamps, so the same inputs give the same bytes.
import { deflateSync } from 'node:zlib';
import { reportModel, range, fmtDate, weeks } from './report.mjs';

// Helvetica / Helvetica-Bold advance widths (1/1000 em) for ASCII 32..126.
const W = {
  F1: [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584],
  F2: [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 611, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584],
};
// Characters outside ASCII that WinAnsiEncoding has: [byte, width regular, width bold].
const EXTRA = { '–': [0x96, 556, 556], '—': [0x97, 1000, 1000], '‘': [0x91, 222, 278], '’': [0x92, 222, 278], '“': [0x93, 333, 500], '”': [0x94, 333, 500], '•': [0x95, 350, 350], '·': [0xb7, 278, 278], '×': [0xd7, 584, 584], 'é': [0xe9, 556, 556] };

function width(str, font, size) {
  let w = 0;
  for (const ch of str) {
    const c = ch.charCodeAt(0);
    if (c >= 32 && c <= 126) w += W[font][c - 32];
    else if (EXTRA[ch]) w += EXTRA[ch][font === 'F1' ? 1 : 2];
    else w += 556;
  }
  return (w * size) / 1000;
}
function pdfString(str) {
  let out = '(';
  for (const ch of str) {
    const c = ch.charCodeAt(0);
    if (ch === '(' || ch === ')' || ch === '\\') out += '\\' + ch;
    else if (c >= 32 && c <= 126) out += ch;
    else if (EXTRA[ch]) out += '\\' + EXTRA[ch][0].toString(8).padStart(3, '0');
    else out += '?';
  }
  return out + ')';
}
function wrap(text, font, size, maxW) {
  const lines = [];
  for (const para of String(text ?? '').split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const t = line ? line + ' ' + word : word;
      if (width(t, font, size) <= maxW || !line) line = t; else { lines.push(line); line = word; }
      while (width(line, font, size) > maxW && line.length > 1) { // a single over-long word
        let k = line.length - 1;
        while (k > 1 && width(line.slice(0, k), font, size) > maxW) k--;
        lines.push(line.slice(0, k)); line = line.slice(k);
      }
    }
    lines.push(line);
  }
  return lines;
}
const rgb = (hex) => [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3)).join(' ');
const C = {
  navy: '#14213d', text: '#1a1c20', muted: '#5b606b', dim: '#8a8f99', accent: '#2558c9', soft: '#eaf0fd', line: '#e2e4e8', tile: '#f4f6fa',
  amber: '#9a6200', amberSoft: '#fdf3dc', red: '#b42318', redSoft: '#fde8e6', green: '#1a7f4b', greenSoft: '#e3f4ea', white: '#ffffff', grey: '#5b606b',
};
const IMPACT_C = { high: [C.redSoft, C.red], medium: [C.amberSoft, C.amber], low: [C.greenSoft, C.green] };

class Doc {
  constructor(title, footer) { this.title = title; this.footer = footer || title; this.noFooter = new Set(); this.pages = []; this.PW = 595.28; this.PH = 841.89; this.M = 56; this.newPage(); }
  get CW() { return this.PW - 2 * this.M; }
  newPage() { this.ops = []; this.pages.push(this.ops); this.y = this.PH - this.M; }
  ensure(h) { if (this.y - h < this.M + 24) { this.newPage(); return true; } return false; }
  textSp(x, y, str, font, size, color, sp) { this.ops.push(`BT /${font} ${size} Tf ${sp} Tc ${rgb(color)} rg ${x.toFixed(2)} ${y.toFixed(2)} Td ${pdfString(str)} Tj 0 Tc ET`); }
  // rounded rectangle, filled (and optionally stroked)
  rrect(x, y, w, h, r, fill, stroke) {
    r = Math.min(r, w / 2, h / 2); const k = 0.5523 * r, f = (n) => n.toFixed(2);
    const p = [`${f(x + r)} ${f(y)} m`, `${f(x + w - r)} ${f(y)} l`, `${f(x + w - r + k)} ${f(y)} ${f(x + w)} ${f(y + r - k)} ${f(x + w)} ${f(y + r)} c`,
      `${f(x + w)} ${f(y + h - r)} l`, `${f(x + w)} ${f(y + h - r + k)} ${f(x + w - r + k)} ${f(y + h)} ${f(x + w - r)} ${f(y + h)} c`,
      `${f(x + r)} ${f(y + h)} l`, `${f(x + r - k)} ${f(y + h)} ${f(x)} ${f(y + h - r + k)} ${f(x)} ${f(y + h - r)} c`,
      `${f(x)} ${f(y + r)} l`, `${f(x)} ${f(y + r - k)} ${f(x + r - k)} ${f(y)} ${f(x + r)} ${f(y)} c`, 'h'];
    this.ops.push(`${rgb(fill)} rg ${stroke ? `${rgb(stroke)} RG 0.75 w ` : ''}${p.join(' ')} ${stroke ? 'B' : 'f'}`);
  }
  circle(cx, cy, r, fill) { this.rrect(cx - r, cy - r, 2 * r, 2 * r, r, fill); }
  // a small pill with text; returns its width
  chip(x, y, str, bg, fg, size = 7.5) { const w = width(str, 'F2', size) + 12; this.rrect(x, y - 3.5, w, size + 7, (size + 7) / 2, bg); this.text(x + 6, y, str, 'F2', size, fg); return w; }
  // lines of wrapped text at (x, top); returns height used
  block(x, top, str, w, { font = 'F1', size = 10, color = C.text, lh = 1.4 } = {}) {
    const ls = wrap(str, font, size, w); ls.forEach((l, i) => this.text(x, top - size - i * size * lh, l, font, size, color)); return ls.length * size * lh;
  }
  blockH(str, w, { font = 'F1', size = 10, lh = 1.4 } = {}) { return wrap(str, font, size, w).length * size * lh; }
  text(x, y, str, font = 'F1', size = 10.5, color = C.text) { this.ops.push(`BT /${font} ${size} Tf ${rgb(color)} rg ${x.toFixed(2)} ${y.toFixed(2)} Td ${pdfString(str)} Tj ET`); }
  rect(x, y, w, h, fill) { this.ops.push(`${rgb(fill)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`); }
  line(x1, y1, x2, y2, color = C.line, w = 0.6) { this.ops.push(`${rgb(color)} RG ${w} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`); }
  para(str, { font = 'F1', size = 10.5, color = C.text, gap = 8, indent = 0 } = {}) {
    const lh = size * 1.45;
    for (const l of wrap(str, font, size, this.CW - indent)) { this.ensure(lh); this.y -= lh; this.text(this.M + indent, this.y + size * 0.3, l, font, size, color); }
    this.y -= gap;
  }
  // A section opens with a small caps kicker and an action title: the conclusion, not the topic.
  section(kicker, title, { page = false, need = 100 } = {}) {
    if (page || this.y - 70 - need < this.M + 24) this.newPage(); else this.y -= 30;
    this.textSp(this.M, this.y - 8, kicker.toUpperCase(), 'F2', 8, C.accent, 1.2);
    this.y -= 18;
    this.para(title, { font: 'F2', size: 16.5, gap: 0, color: C.navy });
    this.y -= 16;
  }
  sub(str) { this.ensure(60); this.y -= 6; this.para(str, { font: 'F2', size: 11.5, gap: 6, color: C.navy }); }
  table(head, rows, fractions, { size = 9, bold = [0] } = {}) {
    const ws = fractions.map((f) => f * this.CW), pad = 6, lh = size * 1.4;
    const header = () => {
      let x = this.M; this.y -= 14;
      head.forEach((h, i) => { this.textSp(x + pad, this.y + 3, h.toUpperCase(), 'F2', 7, C.muted, 0.8); x += ws[i]; });
      this.y -= 5; this.line(this.M, this.y, this.M + this.CW, this.y, C.navy, 0.9);
    };
    this.ensure(lh * 4 + 20); header();
    for (const cells of rows) {
      const wrapped = cells.map((c, i) => wrap(c, bold.includes(i) ? 'F2' : 'F1', size, ws[i] - 2 * pad));
      const h = Math.max(...wrapped.map((w) => w.length)) * lh + 2 * pad;
      if (this.ensure(h)) header();
      let x = this.M;
      wrapped.forEach((lines, i) => { lines.forEach((l, k) => this.text(x + pad, this.y - pad - (k + 1) * lh + size * 0.35, l, bold.includes(i) ? 'F2' : 'F1', size, i === 0 || i === cells.length - 1 ? C.text : C.muted)); x += ws[i]; });
      this.y -= h;
      this.line(this.M, this.y, this.M + this.CW, this.y);
    }
    this.y -= 10;
  }
  bytes() {
    const objs = [];
    const add = (s) => { objs.push(s); return objs.length; };
    const catalog = add(null), pagesObj = add(null);
    const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const kids = [];
    this.pages.forEach((ops, i) => {
      const n = `${i + 1} / ${this.pages.length}`;
      const footer = this.noFooter.has(i) ? [] : [`${rgb(C.line)} RG 0.5 w ${this.M} 42 m ${this.PW - this.M} 42 l S`, `BT /F1 7.5 Tf ${rgb(C.dim)} rg ${this.M} 30 Td ${pdfString(this.footer)} Tj ET`, `BT /F1 7.5 Tf ${rgb(C.dim)} rg ${(this.PW - this.M - width(n, 'F1', 7.5)).toFixed(2)} 30 Td ${pdfString(n)} Tj ET`];
      const data = deflateSync(Buffer.from([...ops, ...footer].join('\n'), 'latin1'));
      const content = add({ stream: data });
      kids.push(add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${this.PW} ${this.PH}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${content} 0 R >>`));
    });
    objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
    objs[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`;
    const info = add(`<< /Title ${pdfString(this.title)} /Producer (OpenIdea) >>`);
    const chunks = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1')];
    let pos = chunks[0].length;
    const offsets = [];
    objs.forEach((o, i) => {
      offsets.push(pos);
      const parts = typeof o === 'string'
        ? [Buffer.from(`${i + 1} 0 obj\n${o}\nendobj\n`, 'latin1')]
        : [Buffer.from(`${i + 1} 0 obj\n<< /Length ${o.stream.length} /Filter /FlateDecode >>\nstream\n`, 'latin1'), o.stream, Buffer.from('\nendstream\nendobj\n', 'latin1')];
      for (const b of parts) { chunks.push(b); pos += b.length; }
    });
    const xref = [`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`, ...offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`)].join('');
    chunks.push(Buffer.from(`${xref}trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${pos}\n%%EOF\n`, 'latin1'));
    return Buffer.concat(chunks);
  }
}

export function renderReportPdf(p, opts = {}) {
  const m = reportModel(p, opts), L = m.L;
  const d = new Doc(m.title, `${m.title}  ·  ${m.subtitle}  ·  ${L.draft}`);
  const M = d.M, CW = d.CW;

  // Cover: title band, the one-line conclusion, three numbers, the key messages
  d.noFooter.add(0);
  d.rect(0, d.PH - 270, d.PW, 270, C.navy);
  d.textSp(M, d.PH - 80, m.subtitle.toUpperCase(), 'F2', 8.5, '#9fb6ea', 1.4);
  let ty = d.PH - 118;
  for (const l of wrap(m.title, 'F2', 30, CW)) { d.text(M, ty, l, 'F2', 30, C.white); ty -= 36; }
  d.text(M, ty - 4, [m.date ? fmtDate(m.date) : '', L.draft].filter(Boolean).join('  ·  '), 'F1', 10.5, '#c9d4ee');
  d.y = d.PH - 310;
  d.textSp(M, d.y, L.execSummary.toUpperCase(), 'F2', 8, C.accent, 1.2);
  d.y -= 10;
  d.para(m.headline + '.', { font: 'F2', size: 15, color: C.navy, gap: 18 });

  const kpis = [[String(m.features.length), m.phases.length ? `${L.featuresWordLower(m.features.length)} ${L.featuresInPhases(m.phases.length)}` : L.featuresWordLower(m.features.length)]];
  if (m.timeline) kpis.push([`${L.num(m.timeline.likely)} ${L.wk}`, `${L.likely.toLowerCase()}, ${L.rangeWeeks(range(m.timeline.low, m.timeline.high))}`]);
  kpis.push([String(m.questions.length), L.decisionsFromYou(m.questions.length)]);
  const gap = 12, kw = (CW - gap * (kpis.length - 1)) / kpis.length, kh = 70;
  kpis.forEach(([v, l], i) => {
    const x = M + i * (kw + gap), warn = i === kpis.length - 1 && m.questions.length;
    d.rrect(x, d.y - kh, kw, kh, 6, warn ? C.amberSoft : C.tile);
    d.text(x + 14, d.y - 34, v, 'F2', 24, warn ? C.amber : C.accent);
    d.block(x + 14, d.y - 45, l, kw - 28, { size: 8.5, color: C.muted, lh: 1.3 });
  });
  d.y -= kh + 24;
  for (const msg of m.messages) {
    const h = Math.max(d.blockH(msg.text, CW - 130, { size: 10.5 }), d.blockH(msg.title, 115, { font: 'F2', size: 10 }), 14);
    d.ensure(h + 14);
    d.block(M, d.y, msg.title, 115, { font: 'F2', size: 10, color: C.navy });
    d.block(M + 130, d.y, msg.text, CW - 130, { size: 10.5 });
    d.y -= h + 8;
    d.line(M, d.y, M + CW, d.y);
    d.y -= 10;
  }

  // Decisions: one card each, impact first
  if (m.questions.length) {
    d.section(L.needFromYou, m.questionsHeadline, { page: true });
    m.questions.forEach((q, i) => {
      const meta = [];
      if (q.features.length) meta.push([L.affects, q.features.join(', ')]);
      if (q.days) meta.push([L.couldAdd, L.upToDays(q.days)]);
      if (q.blocks) meta.push([L.blocks, L.cannotStart(q.blocks)]);
      const tw = CW - 64, qh = d.blockH(q.question, tw, { font: 'F2', size: 11.5, lh: 1.35 });
      const mh = meta.reduce((s, [, v]) => s + d.blockH(v, tw - 70, { size: 9.5 }) + 3, 0);
      const h = 18 + 16 + qh + 10 + mh + 12;
      d.ensure(h + 10);
      const [bg, fg] = IMPACT_C[q.level] || [C.tile, C.muted];
      d.rrect(M, d.y - h, CW, h, 6, C.tile);
      d.rect(M, d.y - h, 3, h, fg);
      d.circle(M + 26, d.y - 26, 11, C.accent);
      const n = String(i + 1); d.text(M + 26 - width(n, 'F2', 11) / 2, d.y - 30, n, 'F2', 11, C.white);
      let y = d.y - 18;
      d.chip(M + 48, y - 8, L.impactSuffix(q.impact).toUpperCase(), bg, fg, 7);
      y -= 16;
      y -= d.block(M + 48, y, q.question, tw, { font: 'F2', size: 11.5, color: C.navy, lh: 1.35 }) + 10;
      for (const [k, v] of meta) { d.text(M + 48, y - 9.5, k, 'F2', 8.5, C.muted); y -= d.block(M + 118, y, v, tw - 70, { size: 9.5 }) + 3; }
      d.y -= h + 10;
    });
    if (m.moreQuestions.length) {
      d.sub(`${L.alsoOpen}: ${L.alsoOpenTitle(m.moreQuestions.length)}`);
      d.table([L.question, L.impactCol, L.affects], m.moreQuestions.map((q) => [q.question, q.impact, q.features.join(', ') || L.wholeProject]), [0.6, 0.1, 0.3], { bold: [] });
    }
  }

  // Plan: Gantt on the likely schedule, then the whole-project range
  if (m.phases.length) {
    d.section(L.planTimeline, m.timelineHeadline, { need: m.phases.length * 40 + 140 });
    const max = Math.max(m.timeline?.high || 1, 1), labelW = 150, trackX = M + labelW, trackW = CW - labelW - 64;
    const step = max <= 8 ? 1 : max <= 16 ? 2 : max <= 32 ? 4 : 8, rowH = 40, top = d.y - 14;
    d.text(trackX - 34, top + 2, L.week, 'F1', 8, C.dim);
    for (let w = 0; w <= max; w += step) {
      const x = trackX + (w / max) * trackW;
      d.line(x, top - 6, x, top - 10 - m.phases.length * rowH, C.line, 0.5);
      if (w) d.text(x - width(String(w), 'F1', 8) / 2, top + 2, String(w), 'F1', 8, C.dim);
    }
    m.phases.forEach((ph, i) => {
      const y = top - 12 - i * rowH;
      d.text(M, y - 12, `${ph.n}`, 'F2', 11, C.accent);
      d.text(M + 14, y - 12, ph.name, 'F2', 11, C.navy);
      d.text(M + 14, y - 25, L.featureCount(ph.features.length, range(ph.weeks[0], ph.weeks[1])), 'F1', 8.5, C.muted);
      const x = trackX + (ph.startLikely / max) * trackW, w = Math.max((ph.likely / max) * trackW, 2);
      d.rrect(x, y - 24, w, 18, 4, C.accent);
      const lbl = weeks(ph.likely);
      if (width(lbl, 'F2', 8.5) + 10 < w) d.text(x + 6, y - 18, lbl, 'F2', 8.5, C.white); else d.text(x + w + 5, y - 18, lbl, 'F2', 8.5, C.accent);
      const end = ph.endDateLikely ? `~${fmtDate(ph.endDateLikely)}` : L.weekN(ph.startLikely + ph.likely);
      d.text(M + CW - width(end, 'F2', 9), y - 18, end, 'F2', 9, C.muted);
      if (ph.blockers.length) d.chip(x, y - 37, L.waitingOnDecision.toUpperCase(), C.redSoft, C.red, 6.5);
    });
    d.y = top - 18 - m.phases.length * rowH;
    if (m.timeline) {
      const t = m.timeline, h = 66;
      d.y -= 8;
      d.rrect(M, d.y - h, CW, h, 6, C.tile);
      d.text(M + 12, d.y - 26, L.wholeProject, 'F2', 11, C.navy);
      d.block(M + 12, d.y - 32, `${L.teamOf(t.people)}${t.endDate ? `, ${L.readyBetween(fmtDate(t.endDate[0], { year: false }), fmtDate(t.endDate[1]))}` : ''}`, labelW - 20, { size: 8.5, color: C.muted });
      const lo = trackX + (t.low / max) * trackW, hi = trackX + (t.high / max) * trackW, li = trackX + (t.likely / max) * trackW, yb = d.y - 38;
      d.rrect(lo, yb, hi - lo, 8, 4, C.amberSoft, C.amber);
      d.circle(li, yb + 4, 6, C.accent);
      const lt = L.likelyWk(t.likely); d.text(li - width(lt, 'F2', 8.5) / 2, yb + 14, lt, 'F2', 8.5, C.accent);
      d.text(lo - width(`${L.num(t.low)} ${L.wk}`, 'F1', 8) / 2, yb - 13, `${L.num(t.low)} ${L.wk}`, 'F1', 8, C.muted);
      d.text(hi - width(`${L.num(t.high)} ${L.wk}`, 'F1', 8) / 2, yb - 13, `${L.num(t.high)} ${L.wk}`, 'F1', 8, C.muted);
      d.y -= h + 14;
    }
    d.para(L.barsNote, { size: 9, color: C.muted });
  }

  // Scope: what each phase delivers and how we will know it is done
  d.section(L.scopeDone, m.featuresHeadline, { page: true });
  const groups = m.phases.length ? m.phases.map((ph) => [`${ph.n}. ${ph.name}`, L.likelyWeeks(ph.likely), ph.features]) : [[L.featuresWord, '', m.features]];
  if (m.later.length) groups.push([L.later, L.notPlanned, m.later]);
  for (const [name, sub, fs] of groups) {
    if (!fs.length) continue;
    d.ensure(90); d.y -= 4;
    d.text(M, d.y - 11, name, 'F2', 11.5, C.navy);
    if (sub) d.text(M + width(name, 'F2', 11.5) + 10, d.y - 11, sub, 'F1', 9, C.muted);
    d.y -= 14;
    d.table([L.feature, L.usedBy, L.doneWhen], fs.map((f) => [f.name, f.who, f.done || L.toBeDefined]), [0.28, 0.17, 0.55]);
  }

  // Boundaries
  if (m.nonGoals.length || m.constraints.length || m.assumptions.length) {
    const cols = [[L.notIncluded, m.nonGoals, C.tile, C.muted], [L.constraints, m.constraints, C.tile, C.muted], [L.assumedShort, m.assumptions, C.amberSoft, C.amber]].filter((c) => c[1].length);
    const g = 10, w = (CW - g * (cols.length - 1)) / cols.length;
    const hs = cols.map(([, items]) => items.reduce((s, it) => s + d.blockH(it, w - 36, { size: 9.5 }) + 5, 0));
    const h = 40 + Math.max(...hs) + 8;
    d.section(L.boundaries, L.boundariesTitle, { need: h });
    cols.forEach(([k, items, bg, fg], i) => {
      const x = M + i * (w + g);
      d.rrect(x, d.y - h, w, h, 6, bg);
      d.textSp(x + 14, d.y - 22, k.toUpperCase(), 'F2', 7, fg, 0.8);
      let y = d.y - 36;
      for (const it of items) { d.text(x + 14, y - 9.5, '•', 'F1', 9.5, C.accent); y -= d.block(x + 24, y, it, w - 36, { size: 9.5 }) + 5; }
    });
    d.y -= h;
  }

  // Next steps
  const nextH = (n) => Math.max(8 + d.blockH(n.what, CW - 120, { font: 'F2', size: 11 }) + 4 + d.blockH(n.detail, CW - 120, { size: 9.5 }), 34) + 14;
  d.section(L.nextSteps, m.nextHeadline, { need: m.next.reduce((s, n) => s + nextH(n), 0) });
  m.next.forEach((n, i) => {
    const tw = CW - 120, h = nextH(n);
    d.ensure(h);
    const you = n.who === 'You';
    d.circle(M + 12, d.y - 19, 11, you ? C.accent : C.grey);
    const s = String(i + 1); d.text(M + 12 - width(s, 'F2', 11) / 2, d.y - 23, s, 'F2', 11, C.white);
    d.chip(M + 34, d.y - 22, (you ? L.yourTeam : L.ourTeam).toUpperCase(), you ? C.soft : C.tile, you ? C.accent : C.muted, 7);
    let y = d.y - 8;
    y -= d.block(M + 120, y, n.what, tw, { font: 'F2', size: 11, color: C.navy }) + 4;
    d.block(M + 120, y, n.detail, tw, { size: 9.5, color: C.muted });
    d.y -= h;
    if (i < m.next.length - 1) d.line(M, d.y + 6, M + CW, d.y + 6);
  });
  return d.bytes();
}
