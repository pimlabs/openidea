// The report as a 16:9 PowerPoint deck, written as raw OOXML: no dependencies, editable in
// PowerPoint, Keynote and Google Slides. Same content model as the Markdown and PDF report.
import { zip } from './zip.mjs';
import { reportModel, range, fmtDate, timelineLine } from './report.mjs';

const EMU = 914400; // per inch
const SW = 13.333, SH = 7.5;
const e = (inches) => Math.round(inches * EMU);
const xml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const C = { text: '1A1C20', muted: '5B606B', accent: '2558C9', white: 'FFFFFF', sunk: 'F2F3F5', line: 'E2E4E8', amberSoft: 'FDF3DC', amber: '9A6200' };
const FONT = 'Arial';
const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';

class Slide {
  constructor() { this.shapes = []; this.id = 2; }
  next() { return this.id++; }
  // runs: [{text, size, bold, color}] per paragraph; paras: array of runs arrays or strings
  text(x, y, w, h, paras, { size = 18, color = C.text, bold = false, fill = null, anchor = 't', align = 'l', bullet = false, numbered = false, inset = 0.08 } = {}) {
    const id = this.next();
    const ps = paras.map((p, i) => {
      const runs = (Array.isArray(p) ? p : [{ text: p }]).map((r) => `<a:r><a:rPr lang="en-US" sz="${Math.round((r.size || size) * 100)}" b="${(r.bold ?? bold) ? 1 : 0}" dirty="0"><a:solidFill><a:srgbClr val="${r.color || color}"/></a:solidFill><a:latin typeface="${FONT}"/><a:cs typeface="${FONT}"/></a:rPr><a:t>${xml(r.text)}</a:t></a:r>`).join('');
      const marker = bullet ? `<a:buFont typeface="${FONT}"/><a:buChar char="•"/>` : numbered ? `<a:buFont typeface="${FONT}"/><a:buAutoNum type="arabicPeriod"/>` : '<a:buNone/>';
      const ind = bullet || numbered ? ' marL="342900" indent="-342900"' : '';
      return `<a:p><a:pPr algn="${align}"${ind}><a:spcBef><a:spcPts val="${i ? 600 : 0}"/></a:spcBef>${marker}</a:pPr>${runs}<a:endParaRPr lang="en-US" sz="${size * 100}"/></a:p>`;
    }).join('');
    const ins = e(inset);
    this.shapes.push(`<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Text ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${e(x)}" y="${e(y)}"/><a:ext cx="${e(w)}" cy="${e(h)}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${fill ? `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>` : '<a:noFill/>'}</p:spPr><p:txBody><a:bodyPr wrap="square" lIns="${ins}" tIns="${ins}" rIns="${ins}" bIns="${ins}" anchor="${anchor}"/><a:lstStyle/>${ps}</p:txBody></p:sp>`);
  }
  rect(x, y, w, h, fill, { round = false } = {}) {
    const id = this.next();
    this.shapes.push(`<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Shape ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${e(x)}" y="${e(y)}"/><a:ext cx="${Math.max(1, e(w))}" cy="${e(h)}"/></a:xfrm><a:prstGeom prst="${round ? 'roundRect' : 'rect'}"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${fill}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr></p:sp>`);
  }
  table(x, y, w, head, rows, fractions, { size = 16 } = {}) {
    const id = this.next();
    const cols = fractions.map((f) => e(f * w));
    const cell = (t, headRow) => `<a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="${(headRow ? size - 1 : size) * 100}" b="${headRow ? 1 : 0}" dirty="0"><a:solidFill><a:srgbClr val="${headRow ? C.muted : C.text}"/></a:solidFill><a:latin typeface="${FONT}"/><a:cs typeface="${FONT}"/></a:rPr><a:t>${xml(t)}</a:t></a:r></a:p></a:txBody><a:tcPr marL="${e(0.1)}" marR="${e(0.1)}" marT="${e(0.07)}" marB="${e(0.07)}"><a:lnL w="0"><a:noFill/></a:lnL><a:lnR w="0"><a:noFill/></a:lnR><a:lnT w="0"><a:noFill/></a:lnT><a:lnB w="9525"><a:solidFill><a:srgbClr val="${C.line}"/></a:solidFill></a:lnB>${headRow ? `<a:solidFill><a:srgbClr val="${C.sunk}"/></a:solidFill>` : '<a:noFill/>'}</a:tcPr></a:tc>`;
    const rowH = e(0.55);
    const trs = [head, ...rows].map((r, i) => `<a:tr h="${rowH}">${r.map((c) => cell(c, i === 0)).join('')}</a:tr>`).join('');
    this.shapes.push(`<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${id}" name="Table ${id}"/><p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="${e(x)}" y="${e(y)}"/><a:ext cx="${e(w)}" cy="${rowH * (rows.length + 1)}"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr firstRow="1"/><a:tblGrid>${cols.map((c) => `<a:gridCol w="${c}"/>`).join('')}</a:tblGrid>${trs}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`);
  }
  xml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:sld ${NS}><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${this.shapes.join('')}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
  }
}

const chunk = (arr, n) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out.length ? out : [[]]; };
const M = 0.6, CW = SW - 2 * M;

function titled(title, sub) {
  const s = new Slide();
  s.rect(0, 0, 0.12, SH, C.accent);
  s.text(M, 0.4, CW, 0.8, [title], { size: 30, bold: true });
  if (sub) s.text(M, 1.1, CW, 0.5, [sub], { size: 15, color: C.muted });
  return s;
}

export function buildSlides(m) {
  const slides = [];
  // 1. Cover
  const cover = new Slide();
  cover.rect(0, 0, SW, SH, C.accent);
  cover.text(M + 0.2, 2.4, CW - 0.4, 1.3, [m.title], { size: 44, bold: true, color: C.white, anchor: 'b' });
  cover.text(M + 0.2, 3.8, CW - 0.4, 0.6, [m.subtitle], { size: 22, color: C.white });
  if (m.date) cover.text(M + 0.2, 4.4, CW - 0.4, 0.5, [fmtDate(m.date)], { size: 16, color: 'DCE6FB' });
  slides.push(cover);

  // 2. Summary
  const sum = titled('Summary');
  if (m.vision) sum.text(M, 1.2, CW, 1.2, [m.vision], { size: 22 });
  const facts = [];
  if (m.users) facts.push(['For', m.users]);
  if (m.value) facts.push(['Value', m.value]);
  facts.push(['Scope', `${m.features.length} feature${m.features.length === 1 ? '' : 's'}${m.phases.length ? ` in ${m.phases.length} phase${m.phases.length === 1 ? '' : 's'}` : ''}`]);
  if (m.timeline) facts.push(['Timeline', timelineLine(m)]);
  if (m.questions.length) facts.push(['Open questions', `${m.questions.length}; answering them narrows the timeline`]);
  facts.forEach(([k, v], i) => {
    const y = 2.6 + i * 0.75;
    sum.text(M, y, 2.6, 0.65, [k], { size: 18, bold: true, color: C.muted });
    sum.text(M + 2.6, y, CW - 2.6, 0.7, [v], { size: 18 });
  });
  slides.push(sum);

  // 3. Features
  const fpages = chunk(m.features, 7);
  if (m.features.length) fpages.forEach((rows, i) => {
    const s = titled(`Features${fpages.length > 1 ? ` (${i + 1}/${fpages.length})` : ''}`, `${m.features.length} feature${m.features.length === 1 ? '' : 's'}, each with what done looks like`);
    s.table(M, 1.7, CW, ['Feature', 'Used by', 'Done when', 'Phase'], rows.map((f) => [f.name, f.who, f.done || '–', f.phase || 'Later']), [0.26, 0.15, 0.43, 0.16]);
    slides.push(s);
  });

  // 4. Timeline
  if (m.phases.length) chunk(m.phases, 5).forEach((phs, pi) => {
    const s = titled('Phases and timeline');
    if (m.timeline) {
      s.text(M, 1.2, CW, 0.8, [range(m.timeline.weeks[0], m.timeline.weeks[1], 'weeks')], { size: 34, bold: true, color: C.accent });
      s.text(M, 1.95, CW, 0.5, [timelineLine(m)], { size: 15, color: C.muted });
    }
    const max = m.timeline?.weeks[1] || 1, labelW = 3.2, trackX = M + labelW, trackW = CW - labelW - 1.3;
    let start = m.phases.slice(0, pi * 5).reduce((a, ph) => a + ph.weeks[0], 0);
    phs.forEach((ph, i) => {
      const y = 2.75 + i * 0.85;
      s.text(M, y - 0.08, labelW - 0.2, 0.45, [ph.name], { size: 16, bold: true });
      if (ph.features.length) s.text(M, y + 0.3, labelW - 0.2, 0.45, [ph.features.join(', ')], { size: 13, color: C.muted });
      s.rect(trackX, y, trackW, 0.3, C.sunk, { round: true });
      const x = trackX + (start / max) * trackW;
      s.rect(x, y, (ph.weeks[1] / max) * trackW, 0.3, C.amberSoft, { round: true });
      s.rect(x, y, (ph.weeks[0] / max) * trackW, 0.3, C.accent, { round: true });
      s.text(trackX + trackW + 0.1, y - 0.06, 1.2, 0.42, [range(ph.weeks[0], ph.weeks[1], 'wk')], { size: 14, color: C.muted });
      start += ph.weeks[0];
    });
    s.rect(M, SH - 0.75, 0.2, 0.2, C.accent);
    s.text(M + 0.25, SH - 0.84, 2, 0.4, ['Likely'], { size: 12, color: C.muted });
    s.rect(M + 1.4, SH - 0.75, 0.2, 0.2, C.amberSoft);
    s.text(M + 1.65, SH - 0.84, 6, 0.4, ['Extra time the open questions could cost'], { size: 12, color: C.muted });
    slides.push(s);
  });

  // 5. Open questions
  const qpages = chunk(m.questions, 6);
  if (m.questions.length) qpages.forEach((rows, i) => {
    const s = titled(`Open questions${qpages.length > 1 ? ` (${i + 1}/${qpages.length})` : ''}`, 'Answering these narrows the timeline. Biggest impact first.');
    s.table(M, 1.7, CW, ['Question', 'Impact', 'Could add'], rows.map((q) => [q.question, q.impact, q.days ? `up to ${q.days} days` : '–']), [0.66, 0.13, 0.21]);
    slides.push(s);
  });

  // 6. Assumptions, later, boundaries
  const blocks = [];
  if (m.assumptions.length) blocks.push(['Assumptions', m.assumptions]);
  if (m.later.length) blocks.push(['Later', m.later]);
  if (m.nonGoals.length) blocks.push(['Not included', m.nonGoals]);
  if (m.constraints.length) blocks.push(['Constraints', m.constraints]);
  chunk(blocks, 2).forEach((bs) => {
    if (!bs.length) return;
    const s = titled(bs.map((b) => b[0]).join(' and '));
    bs.forEach(([t, items], i) => {
      const x = M + i * (CW / 2 + 0.1), w = bs.length > 1 ? CW / 2 - 0.1 : CW;
      s.text(x, 1.4, w, 0.5, [t], { size: 18, bold: true, color: C.accent });
      s.text(x, 1.95, w, 4.8, items.slice(0, 8), { size: 18, bullet: true });
    });
    slides.push(s);
  });

  // 7. Next steps
  const nx = titled('Next steps');
  nx.text(M, 1.5, CW, 5, m.next, { size: 20, numbered: true });
  slides.push(nx);
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
    files.push([`ppt/slides/slide${i + 1}.xml`, s.xml()]);
    files.push([`ppt/slides/_rels/slide${i + 1}.xml.rels`, REL([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml']])]);
  });
  return zip(files);
}
