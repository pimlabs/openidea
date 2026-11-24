// The report as a PDF, written directly: A4, the PDF base fonts (Helvetica), no dependencies,
// no timestamps, so the same inputs give the same bytes.
import { deflateSync } from 'node:zlib';
import { reportModel, range, fmtDate, timelineLine } from './report.mjs';

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
const C = { text: '#1a1c20', muted: '#5b606b', accent: '#2558c9', soft: '#eaf0fd', line: '#e2e4e8', sunk: '#f2f3f5', amber: '#9a6200', amberSoft: '#fdf3dc', red: '#c0271d' };

class Doc {
  constructor(title) { this.title = title; this.pages = []; this.PW = 595.28; this.PH = 841.89; this.M = 56; this.newPage(); }
  get CW() { return this.PW - 2 * this.M; }
  newPage() { this.ops = []; this.pages.push(this.ops); this.y = this.PH - this.M; }
  ensure(h) { if (this.y - h < this.M + 24) this.newPage(); }
  text(x, y, str, font = 'F1', size = 10.5, color = C.text) { this.ops.push(`BT /${font} ${size} Tf ${rgb(color)} rg ${x.toFixed(2)} ${y.toFixed(2)} Td ${pdfString(str)} Tj ET`); }
  rect(x, y, w, h, fill) { this.ops.push(`${rgb(fill)} rg ${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`); }
  line(x1, y1, x2, y2, color = C.line, w = 0.6) { this.ops.push(`${rgb(color)} RG ${w} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`); }
  para(str, { font = 'F1', size = 10.5, color = C.text, gap = 8, indent = 0 } = {}) {
    const lh = size * 1.45;
    for (const l of wrap(str, font, size, this.CW - indent)) { this.ensure(lh); this.y -= lh; this.text(this.M + indent, this.y + size * 0.3, l, font, size, color); }
    this.y -= gap;
  }
  h1(str) { this.para(str, { font: 'F2', size: 24, gap: 4 }); }
  h2(str) { this.ensure(120); this.y -= 14; this.para(str, { font: 'F2', size: 15, gap: 6 }); }
  h3(str) { this.ensure(40); this.y -= 4; this.para(str, { font: 'F2', size: 12, gap: 4 }); }
  bullets(items, { size = 10.5, numbered = false } = {}) {
    for (const it of items) {
      const lines = wrap(it, 'F1', size, this.CW - 16), lh = size * 1.45;
      lines.forEach((l, i) => { this.ensure(lh); this.y -= lh; if (!i) this.text(this.M + 2, this.y + size * 0.3, numbered ? `${items.indexOf(it) + 1}.` : '•', numbered ? 'F2' : 'F1', size, C.accent); this.text(this.M + 16, this.y + size * 0.3, l, 'F1', size); });
      this.y -= 3;
    }
    this.y -= 6;
  }
  table(head, rows, fractions, { size = 9.5 } = {}) {
    const ws = fractions.map((f) => f * this.CW), pad = 6, lh = size * 1.4;
    const drawRow = (cells, font, fill) => {
      const wrapped = cells.map((c, i) => wrap(c, font, size, ws[i] - 2 * pad));
      const h = Math.max(...wrapped.map((w) => w.length)) * lh + 2 * pad;
      this.ensure(h);
      if (fill) this.rect(this.M, this.y - h, this.CW, h, fill);
      let x = this.M;
      wrapped.forEach((lines, i) => { lines.forEach((l, k) => this.text(x + pad, this.y - pad - (k + 1) * lh + size * 0.35, l, font, size, font === 'F2' ? C.muted : C.text)); x += ws[i]; });
      this.y -= h;
      this.line(this.M, this.y, this.M + this.CW, this.y);
    };
    this.ensure(lh * 3);
    drawRow(head, 'F2', C.sunk);
    for (const r of rows) drawRow(r, 'F1', null);
    this.y -= 12;
  }
  bytes() {
    const objs = [];
    const add = (s) => { objs.push(s); return objs.length; };
    const catalog = add(null), pagesObj = add(null);
    const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const kids = [];
    this.pages.forEach((ops, i) => {
      const footer = [`BT /F1 8.5 Tf ${rgb(C.muted)} rg ${this.M} 30 Td ${pdfString(this.title)} Tj ET`, `BT /F1 8.5 Tf ${rgb(C.muted)} rg ${(this.PW - this.M - width(`${i + 1} / ${this.pages.length}`, 'F1', 8.5)).toFixed(2)} 30 Td ${pdfString(`${i + 1} / ${this.pages.length}`)} Tj ET`];
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

export function renderReportPdf(p) {
  const m = reportModel(p);
  const d = new Doc(m.title);
  // Cover band
  d.rect(0, d.PH - 150, d.PW, 150, C.accent);
  d.text(d.M, d.PH - 84, m.title, 'F2', 26, '#ffffff');
  d.text(d.M, d.PH - 108, m.subtitle + (m.date ? `  ·  ${fmtDate(m.date)}` : ''), 'F1', 11.5, '#ffffff');
  d.y = d.PH - 190;

  d.h2('Summary');
  if (m.vision) d.para(m.vision, { size: 12 });
  const facts = [];
  if (m.users) facts.push(['For', m.users]);
  if (m.value) facts.push(['Value', m.value]);
  facts.push(['Scope', `${m.features.length} feature${m.features.length === 1 ? '' : 's'}${m.phases.length ? ` in ${m.phases.length} phase${m.phases.length === 1 ? '' : 's'}` : ''}`]);
  if (m.timeline) facts.push(['Timeline', timelineLine(m)]);
  if (m.questions.length) facts.push(['Open questions', `${m.questions.length}; answering them narrows the timeline`]);
  for (const [k, v] of facts) {
    const lines = wrap(v, 'F1', 10.5, d.CW - 110);
    lines.forEach((l, i) => { d.ensure(16); d.y -= 15.5; if (!i) d.text(d.M, d.y + 3, k, 'F2', 10.5, C.muted); d.text(d.M + 110, d.y + 3, l); });
    d.y -= 4;
  }

  if (m.features.length) {
    d.h2('Features');
    d.table(['Feature', 'Used by', 'Done when', 'Phase'], m.features.map((f) => [f.name, f.who, f.done || '–', f.phase || 'Later']), [0.26, 0.16, 0.4, 0.18]);
  }

  if (m.phases.length) {
    d.h2('Phases and timeline');
    if (m.timeline) d.para(timelineLine(m), { color: C.muted });
    const max = m.timeline?.weeks[1] || 1;
    let start = [0, 0];
    const labelW = 150, trackX = d.M + labelW, trackW = d.CW - labelW - 70;
    for (const ph of m.phases) {
      d.ensure(26); d.y -= 22;
      d.text(d.M, d.y + 4, ph.name, 'F2', 10.5);
      d.rect(trackX, d.y, trackW, 12, C.sunk);
      const x = trackX + (start[0] / max) * trackW;
      d.rect(x, d.y, ((ph.weeks[1]) / max) * trackW, 12, C.amberSoft);
      d.rect(x, d.y, ((ph.weeks[0]) / max) * trackW, 12, C.accent);
      d.text(trackX + trackW + 8, d.y + 3, range(ph.weeks[0], ph.weeks[1], 'wk'), 'F1', 9.5, C.muted);
      start = [start[0] + ph.weeks[0], start[1] + ph.weeks[1]];
    }
    d.y -= 22;
    d.rect(d.M, d.y, 9, 9, C.accent); d.text(d.M + 14, d.y + 1, 'Likely', 'F1', 9, C.muted);
    d.rect(d.M + 70, d.y, 9, 9, C.amberSoft); d.text(d.M + 84, d.y + 1, 'Extra time the open questions could cost', 'F1', 9, C.muted);
    d.y -= 14;
    m.phases.forEach((ph, i) => {
      d.h3(`${i + 1}. ${ph.name}`);
      d.para(`${range(ph.weeks[0], ph.weeks[1], 'weeks')}${ph.endDate ? `, finishing between ${fmtDate(ph.endDate[0])} and ${fmtDate(ph.endDate[1])}` : ''}.`, { color: C.muted, gap: 4 });
      if (ph.features.length) d.bullets(ph.features);
    });
  }

  if (m.questions.length) {
    d.h2('Open questions');
    d.table(['Question', 'Impact', 'Could add'], m.questions.map((q) => [q.question, q.impact, q.days ? `up to ${q.days} days` : '–']), [0.64, 0.14, 0.22]);
  }
  if (m.assumptions.length) { d.h2('Assumptions'); d.bullets(m.assumptions); }
  if (m.later.length) { d.h2('Later'); d.bullets(m.later); }
  if (m.nonGoals.length || m.constraints.length) {
    d.h2('Boundaries');
    if (m.nonGoals.length) { d.para('Not included', { font: 'F2', gap: 2 }); d.bullets(m.nonGoals); }
    if (m.constraints.length) { d.para('Constraints', { font: 'F2', gap: 2 }); d.bullets(m.constraints); }
  }
  d.h2('Next steps');
  d.bullets(m.next, { numbered: true });
  return d.bytes();
}
