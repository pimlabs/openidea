// Renders a single self-contained HTML dashboard: no server, no build step, no network.
// The markdown files stay the source of truth; this is a read-only view of them.
import { analyze } from './analyze.mjs';
import { BLUEPRINT_KINDS, depthReport } from './validate.mjs';
import { features, contextDiagram, activityDiagram, stateDiagram } from './diagrams.mjs';
import { estimate } from './estimate.mjs';
import { DASH, KIND_NAMES, projectLang } from './i18n.mjs';

function payload(p, issues, mode, lang) {
  const client = mode === 'client';
  const a = analyze(p, issues);
  const ideas = p.ideas
    .filter((i) => i.data)
    .filter((i) => !client || i.data.type !== 'chore')
    .map((i) => {
      const d = { ...i.data };
      if (client) { delete d.source; delete d.triage_note; }
      return { file: i.file, location: i.location, data: d, body: i.body };
    });
  const visibleIdeas = new Set(ideas.map((i) => i.data.id));
  const gaps = p.gaps
    .filter((g) => g.data)
    .map((g) => client
      ? { data: { id: g.data.id, kind: g.data.kind, impact: g.data.impact, confidence: g.data.confidence, status: g.data.status, question: g.data.question, ideas: (g.data.ideas || []).filter((id) => visibleIdeas.has(id)) }, body: '' }
      : { file: g.file, data: g.data, body: g.body });
  const brief = p.brief && !p.brief.error ? { data: p.brief.data, body: p.brief.body } : null;
  const project = brief?.body.match(/^#\s+(.+)$/m)?.[1] || 'OpenIdea project';
  const bp = p.blueprint;
  const diagrams = bp ? {
    context: contextDiagram(bp, project),
    activity: (bp.flows || []).map((f) => ({ id: f.id, name: f.name || f.id, src: activityDiagram(f) })),
    states: (bp.entities || []).map((e) => ({ id: e.id, name: e.name || e.id, src: stateDiagram(e) })).filter((x) => x.src),
  } : null;
  const featureList = features(p, a.open).map((f) => ({ ...f, ideas: f.ideas.filter((id) => !client || visibleIdeas.has(id)) }));
  const est = estimate(p);
  const names = KIND_NAMES[lang] || {};
  const kinds = Object.fromEntries(Object.entries(BLUEPRINT_KINDS).map(([k, v]) => [k, names[k] ? { ...v, label: names[k][0], plural: names[k][1] } : v]));
  return {
    mode,
    lang,
    T: DASH[lang] || DASH.en,
    project,
    estimate: est && {
      total: est.total, gapCost: est.gapCost,
      calibration: { team: est.calibration.team, capacity: est.calibration.capacity, factor: est.calibration.factor, samples: est.calibration.samples, start: est.calibration.start, present: est.calibration.present, setup: est.calibration.coef.setup, stabilize: est.calibration.coef.stabilize },
      phases: est.phases.map((ph) => ({ id: ph.id, name: ph.name, low: ph.low, high: ph.high, weeks: ph.weeks, likelyWeeks: ph.likelyWeeks, endDateLikely: ph.endDateLikely || null, startWeek: ph.startWeek, endWeek: ph.endWeek, endDate: ph.endDate || null, setup: ph.setup,
        items: ph.items.map((it) => ({ kind: it.kind, id: it.id, name: it.name, low: it.low, high: it.high, reasons: it.reasons })) })),
      unplanned: est.unplanned.map((it) => ({ kind: it.kind, id: it.id, name: it.name, low: it.low, high: it.high })),
    },
    diagrams,
    features: featureList,
    brief,
    ideas,
    gaps,
    queue: a.queue.map((g) => g.data.id),
    milestones: a.milestones.map((m) => ({ name: m.name, id: m.id, status: m.status || 'draft', approvedIn: m.approvedIn, ideas: m.ideas.filter((id) => visibleIdeas.has(id)), blockingGaps: m.blockingGaps })),
    blueprint: p.blueprint || null,
    kinds,
    depth: p.blueprint ? depthReport(p.blueprint) : null,
    counts: a.counts,
    assumptions: a.assumptions,
    issues: client ? [] : issues,
  };
}

export function renderDashboard(p, issues, { mode = 'internal', lang } = {}) {
  const code = projectLang(p, lang);
  const json = JSON.stringify(payload(p, issues, mode, code)).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return TEMPLATE.replace('<html lang="en">', () => `<html lang="${code}">`).replace('/*__DATA__*/', () => json);
}

const TEMPLATE = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>OpenIdea Dashboard</title>
<style>
:root{--bg:#fafafa;--surface:#fff;--sunk:#f2f3f5;--border:#e2e4e8;--text:#1a1c20;--muted:#5b606b;--dim:#8a909b;--accent:#2558c9;--accent-soft:#eaf0fd;--red:#c0271d;--red-soft:#fdeceb;--amber:#9a6200;--amber-soft:#fdf3dc;--orange:#b4500a;--orange-soft:#fdeee2;--green:#1d7a46;--green-soft:#e4f5ea;--purple:#6d3fb0;--purple-soft:#f1eafb;--gray:#6b7280;--gray-soft:#eef0f3;--accent-line:rgba(37,88,201,.4);--shadow:0 1px 2px rgba(0,0,0,.06),0 4px 14px rgba(0,0,0,.07)}
@media (prefers-color-scheme:dark){:root{--bg:#111316;--surface:#181b20;--sunk:#20242a;--border:#2d323a;--text:#e8eaee;--muted:#a6acb6;--dim:#737a85;--accent:#7fa8ff;--accent-soft:#1a2540;--red:#ff8577;--red-soft:#3a1b19;--amber:#f2c35b;--amber-soft:#33290f;--orange:#ffa564;--orange-soft:#3a2414;--green:#5fd394;--green-soft:#15291e;--purple:#c4a2ff;--purple-soft:#2a2040;--gray:#9aa1ad;--gray-soft:#262a31;--accent-line:rgba(127,168,255,.45);--shadow:0 1px 2px rgba(0,0,0,.4),0 4px 14px rgba(0,0,0,.35)}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;text-size-adjust:100%;overscroll-behavior-y:none}
#mnav{display:none}
body{margin:0;overflow-wrap:break-word;-webkit-tap-highlight-color:transparent;background:var(--bg);color:var(--text);font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
a{color:var(--accent);text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px;text-decoration-color:var(--accent-line)}a:hover{text-decoration-color:currentColor}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:6px}
code{font:12.5px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:var(--sunk);padding:1px 5px;border-radius:4px}
header{position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:1px solid var(--border)}
.bar{max-width:1180px;margin:0 auto;padding:12px max(20px,env(safe-area-inset-right)) 12px max(20px,env(safe-area-inset-left));display:flex;gap:18px;align-items:center;flex-wrap:wrap}
.brand{font-weight:700}.brand,.brand a{color:var(--text);text-decoration:none}.brand small{color:var(--dim);font-weight:500;margin-left:6px}
nav{display:flex;gap:4px;flex-wrap:wrap}
nav a{color:var(--muted);padding:6px 10px;border-radius:7px;font-size:14px;text-decoration:none}
nav a.on{background:var(--accent-soft);color:var(--accent);font-weight:600}nav a:hover{text-decoration:none;color:var(--text)}
.mode{margin-left:auto;font-size:12px;font-weight:600;padding:3px 10px;border-radius:99px;background:var(--amber-soft);color:var(--amber)}
.badge{display:inline-block;min-width:18px;margin-left:6px;padding:0 5px;border-radius:99px;background:var(--red);color:#fff;font-size:11px;font-weight:700;line-height:18px;text-align:center}
details.fold{margin:16px 0}details.fold>summary{cursor:pointer;color:var(--accent);font-weight:600;font-size:14px;padding:8px 0;list-style:none}details.fold>summary::-webkit-details-marker{display:none}details.fold>summary::before{content:'\25B8';display:inline-block;margin-right:6px;transition:transform .12s}details.fold[open]>summary::before{transform:rotate(90deg)}
.mode.client{background:var(--green-soft);color:var(--green)}
main{max-width:1180px;margin:0 auto;padding:24px max(20px,env(safe-area-inset-right)) calc(80px + env(safe-area-inset-bottom)) max(20px,env(safe-area-inset-left))}
h1{font-size:26px;line-height:1.25;margin:0 0 6px;letter-spacing:-.015em}h2{font-size:18px;margin:32px 0 12px}h3{font-size:15px;margin:18px 0 6px}
.lede{color:var(--muted);margin:0 0 20px;max-width:760px}
.hero{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px 22px;margin-bottom:8px}.hero .vision{font-size:17px;line-height:1.5;margin:4px 0 14px;max-width:820px}
.facts{display:grid;grid-template-columns:150px 1fr;gap:8px 16px;margin:0}.facts dt{color:var(--muted);font-size:13px;font-weight:600}.facts dd{margin:0}.facts ul{margin:0;padding-left:18px}
.steps{display:flex;gap:6px;flex-wrap:wrap;margin:14px 0 4px;padding:0;list-style:none;counter-reset:st}.steps li{counter-increment:st}.steps .st{cursor:pointer;display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;background:var(--accent-soft);color:var(--accent);font-size:13px;font-weight:600;text-decoration:none}.steps .st:before{content:counter(st);display:inline-grid;place-items:center;width:18px;height:18px;border-radius:50%;background:var(--accent);color:#fff;font-size:11px}
.secnum{color:var(--accent);margin-right:6px}.sec-lede{color:var(--muted);margin:-6px 0 12px;max-width:760px}
.actor h3{margin:0 0 2px}.actor ul{margin:8px 0 0;padding-left:18px}.idea-card .t{font-weight:600}.idea-card .p{margin:4px 0}.idea-card .d{color:var(--muted);font-size:13px}
.phase-row{display:grid;grid-template-columns:28px 1fr auto;gap:10px;align-items:start;padding:10px 0;border-top:1px solid var(--border)}.phase-row:first-child{border-top:0}.phase-row .n{font-weight:700;color:var(--accent)}
.next-link{margin:10px 0 0;font-size:14px}
.grid{display:grid;gap:12px}.g4{grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}.g2{grid-template-columns:repeat(auto-fit,minmax(320px,1fr))}
.card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 16px}
/* Anything you can open has data-href: hover lift, pointer, and a chevron. Plain cards never react. */
[data-href]{cursor:pointer;position:relative;transition:border-color .12s,box-shadow .12s}
.card[data-href]{padding-right:36px}
.card[data-href]::after{content:'\203A';position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:24px;line-height:1;color:var(--dim)}
.card[data-href]:hover{border-color:var(--accent);box-shadow:var(--shadow)}
.card[data-href]:hover::after{color:var(--accent)}
.card[data-href] a{text-decoration:none}
tbody tr[data-href]:hover td{background:var(--accent-soft)}
tbody tr[data-href] td:first-child a{font-weight:600}
.jump{display:inline-flex;align-items:center;gap:4px;font-size:13px;padding:4px 10px;border:1px solid var(--accent-line);border-radius:99px;background:var(--surface);color:var(--accent);text-decoration:none}
.jump:hover{background:var(--accent-soft);border-color:var(--accent)}
.jump.on{background:var(--accent);color:var(--surface);border-color:var(--accent)}
.src{font-size:12.5px;color:var(--muted)}
.cmd{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px;padding:8px 10px;background:var(--sunk);border-radius:8px}
.cmd .lbl{font-size:12px;color:var(--muted);width:100%}
.cmd code{background:none;padding:0;flex:1;min-width:0}
.btn{display:inline-flex;align-items:center;gap:6px;font-weight:600;background:var(--accent);color:var(--surface);border-color:var(--accent)}
.btn:hover{filter:brightness(1.08);color:var(--surface);border-color:var(--accent)}
.stat .v{font-size:28px;font-weight:700;letter-spacing:-.02em}.stat .k{color:var(--muted);font-size:13px}.stat .s{color:var(--dim);font-size:12px;margin-top:2px}
.stat.primary{border-color:var(--red);border-width:2px;background:var(--red-soft)}.stat.primary .v{font-size:40px}
.stat.bad .v{color:var(--red)}.stat.warn .v{color:var(--amber)}.stat.good .v{color:var(--green)}
table{width:100%;border-collapse:collapse;background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;font-size:14px}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--border);vertical-align:top}
th{background:var(--sunk);color:var(--muted);font-weight:600;font-size:12.5px;white-space:nowrap}
tr:last-child td{border-bottom:0}
.pill{display:inline-flex;align-items:center;gap:5px;height:22px;padding:0 9px;border-radius:99px;font-size:12px;font-weight:600;white-space:nowrap;line-height:1}
.sev-red{background:var(--red);color:#fff}.sev-amber{background:var(--amber-soft);color:var(--amber)}.sev-gray{background:var(--gray-soft);color:var(--gray)}
.st{background:none;border:1px solid var(--border);color:var(--text);font-weight:500}
.st::before{content:'';width:7px;height:7px;border-radius:50%;background:currentColor;flex:none}
.st-red{color:var(--red);border-color:var(--red-soft)}.st-amber{color:var(--amber);border-color:var(--amber-soft)}.st-orange{color:var(--orange);border-color:var(--orange-soft)}
.st-green{color:var(--green);border-color:var(--green-soft)}.st-purple{color:var(--purple);border-color:var(--purple-soft)}.st-gray{color:var(--gray);border-color:var(--gray-soft)}
.tag{background:none;color:var(--muted);font-weight:500;padding:0 2px;height:auto}
.rank{background:var(--text);color:var(--surface);min-width:26px;justify-content:center}
.chips{display:flex;gap:6px;flex-wrap:wrap}
.chip{font-size:12.5px;padding:2px 8px;border-radius:6px;background:var(--sunk);color:var(--muted)}
.q{font-size:17px;line-height:1.4;font-weight:600;margin:8px 0}
.meta{color:var(--muted);font-size:13px}
.filters{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}
input,select{font:inherit;font-size:14px;padding:6px 9px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text)}
button{font:inherit;font-size:13px;padding:5px 10px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text);cursor:pointer}
button:hover{border-color:var(--accent);color:var(--accent)}
.md p{margin:0 0 10px}.md ul,.md ol{margin:0 0 10px;padding-left:22px}.md h1,.md h2,.md h3,.md h4{margin:16px 0 6px}.md pre{background:var(--sunk);padding:10px;border-radius:8px;white-space:pre-wrap;overflow-wrap:anywhere}
.md table{margin:6px 0 12px}
.bar-status{display:flex;height:10px;border-radius:99px;overflow:hidden;background:var(--sunk);margin:8px 0}
.bar-status span{display:block;height:100%}
.legend{display:flex;gap:12px;flex-wrap:wrap;font-size:12.5px;color:var(--muted)}
.dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;vertical-align:middle}
.el{margin-bottom:10px}.el h3{margin:0 0 4px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.slot{display:grid;grid-template-columns:150px 1fr;gap:8px;font-size:13.5px;padding:3px 0;border-top:1px dashed var(--border)}
.slot .k{color:var(--muted)}.slot .miss{color:var(--red);font-weight:600}
.slot>*{min-width:0;overflow-wrap:anywhere}
.matrix td,.matrix th{text-align:center}.matrix td:first-child,.matrix th:first-child{text-align:left}
.yes{color:var(--green);font-weight:700}.no{color:var(--gray);font-weight:700}.conflict{background:var(--red);color:#fff;font-weight:700}
.empty{color:var(--dim);font-style:italic}
.issue{padding:8px 0;border-bottom:1px solid var(--border);font-size:14px}
.toc{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.depth{height:8px;background:var(--sunk);border-radius:99px;overflow:hidden;margin-top:8px}.depth span{display:block;height:100%;background:var(--accent)}
.back{font-size:13px}
.legend-card{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:8px 18px;font-size:13.5px}.legend-card .lg{display:flex;gap:8px;align-items:flex-start}.legend-card p{grid-column:1/-1}.sw{flex:none;width:12px;height:12px;border-radius:3px;margin-top:4px}
.diagram{margin-bottom:12px}
pre.mermaid{margin:0;background:none;text-align:center;white-space:pre-wrap;overflow-wrap:anywhere}
pre.mermaid svg{max-width:100%;height:auto}
pre.mermaid.src{text-align:left;white-space:pre-wrap;font:12.5px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:var(--sunk);padding:10px;border-radius:8px;color:var(--muted)}
.offline-note{font-size:12.5px;color:var(--amber)}
.tl-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.tl-v{font-size:26px;font-weight:700;line-height:1.2}
.gantt{margin:14px 0 8px;display:grid;gap:8px}.g-row{display:grid;grid-template-columns:minmax(90px,180px) 1fr auto;gap:10px;align-items:center;font-size:13.5px}
.g-track{position:relative;height:14px;background:var(--sunk);border-radius:99px}.g-track span{position:absolute;top:0;bottom:0;border-radius:99px}
.g-hi{background:var(--amber-soft);border:1px solid var(--amber)}.g-lo{background:var(--accent)}.g-w{color:var(--muted);white-space:nowrap}
.stat .v small{font-size:14px;font-weight:600;color:var(--muted)}
.miss-t{color:var(--red);font-weight:600;font-size:13px}
@media (max-width:640px){
header{position:static}
.bar{gap:8px;padding-top:max(10px,env(safe-area-inset-top))}
.mode{margin-left:auto}
/* Phones: the section tabs sit under the title and stick to the top. Not fixed to the bottom, where iOS Safari's own toolbar moves with the scroll. */
#nav{display:none}
.facts{grid-template-columns:1fr;gap:2px 0}.facts dd{margin-bottom:8px}.hero{padding:16px}
#mnav{position:-webkit-sticky;position:sticky;top:0;z-index:10;display:grid;grid-template-columns:repeat(5,1fr);gap:2px;background:var(--bg);border-bottom:1px solid var(--border);padding:4px max(6px,env(safe-area-inset-right)) 4px max(6px,env(safe-area-inset-left))}
nav a{text-align:center;padding:10px 2px;font-size:12.5px;min-height:44px;display:flex;align-items:center;justify-content:center;border-radius:8px}
nav a .badge{margin-left:3px;min-width:16px;line-height:16px;font-size:10.5px}
main{padding-bottom:calc(40px + env(safe-area-inset-bottom))}
header{border-bottom:0}
main{padding-top:16px}
h2{scroll-margin-top:64px}
h1{font-size:21px}
.slot{grid-template-columns:1fr;gap:0}
input,select,button{font-size:16px}
.filters input,.filters select{flex:1 1 100%}
table,thead,tbody{display:block;width:100%}
table{border:0;background:none}
thead{display:none}
td{overflow-wrap:anywhere}
tbody tr{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;background:var(--surface);border:1px solid var(--border);border-radius:10px;margin-bottom:8px;padding:10px 12px}
tbody tr[data-href]{padding-right:34px;position:relative}
tbody tr[data-href]::after{content:'\203A';position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:24px;color:var(--dim)}
tbody tr[data-href]:hover td{background:none}
tbody tr[data-href]:hover{border-color:var(--accent);box-shadow:var(--shadow)}
td{display:block;border:0;padding:0;width:100%;order:2;font-size:14px}
td::before{content:attr(data-label) ": ";color:var(--muted);font-size:12.5px}
td:not([data-label])::before,td[data-label=""]::before{content:none}
td:first-child{order:0;font-weight:600;font-size:15px}
td:first-child::before{content:none}
td.pillcell{width:auto;order:1}
td.pillcell::before{content:none}
td.emptycell{display:none}
.matrix td,.matrix th{text-align:left}
.jump,button{min-height:40px}
.g4{grid-template-columns:1fr 1fr;gap:8px}.stat.primary{grid-column:1/-1}.stat .s{display:none}.stat.primary .s{display:block}.stat .depth{margin-top:6px}
.g-row{grid-template-columns:1fr auto;gap:4px 10px}.g-name{grid-column:1/-1;font-weight:600}.tl-v{font-size:22px}
.stat.primary .v{font-size:34px}
.stat .v{font-size:24px}
}
</style>
</head>
<body>
<header><div class="bar"><div class="brand" id="brand"></div><nav id="nav"></nav><span class="mode" id="mode"></span></div></header>
<nav id="mnav"></nav>
<main id="app"></main>
<script type="application/json" id="data">/*__DATA__*/</script>
<script>
(function(){
var D = JSON.parse(document.getElementById('data').textContent);
var CLIENT = D.mode === 'client';
var T = D.T || {};
function t(key){var v=T[key]==null?key:T[key], args=[].slice.call(arguments,1);return String(v).replace(/\{(x|y)\}/g,function(_,n){return n==='x'?args[0]:args[1];});}
function tn(key,n){return t(key+(n===1?'1':'N'),num(n));}
function tv(v){var k='v_'+v;return T[k]!=null?T[k]:String(v).replace(/_/g,' ');}
function num(x){return T.decimal===','?String(x).replace('.',','):String(x);}
var app = document.getElementById('app');
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
var SEV={high:'red',error:'red',medium:'amber',warning:'amber',low:'gray',info:'gray'};
var ST={open:'red',blocked:'red',captured:'amber',validating:'amber',draft:'amber',assumption:'amber',attention:'amber',accepted_risk:'orange',ready:'green',resolved:'green',approved:'green',clear:'green',promoted:'purple',parked:'gray',killed:'gray',dismissed:'gray',merged:'gray',split:'gray'};
var ST_COLOR={red:'var(--red)',amber:'var(--amber)',orange:'var(--orange)',green:'var(--green)',purple:'var(--purple)',gray:'var(--gray)'};
function pill(v,cls){var k=cls||v,c;
  if(k==='tag') c='pill tag'; else if(k==='rank') c='pill rank'; else if(SEV[k]) c='pill sev-'+SEV[k]; else if(ST[k]) c='pill st st-'+ST[k]; else c='pill tag';
  return '<span class="'+c+'">'+esc(tv(v))+'</span>';}
function filled(v){if(v==null)return false;if(Array.isArray(v))return v.length>0;if(typeof v==='string')return v.trim()!==''&&v.trim().toUpperCase()!=='TBD';return true;}
function get(o,p){return p.split('.').reduce(function(x,k){return x==null?undefined:x[k];},o);}
function inline(s){
  s = esc(s);
  s = s.replace(/\x60([^\x60]+)\x60/g,'<code>$1</code>');
  s = s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g,'$1<em>$2</em>');
  s = s.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  return s;
}
function md(src){
  var lines = String(src||'').split(/\r?\n/), out = [], i = 0;
  while(i < lines.length){
    var l = lines[i];
    if(/^\x60\x60\x60/.test(l)){var buf=[];i++;while(i<lines.length && !/^\x60\x60\x60/.test(lines[i])){buf.push(lines[i]);i++;}i++;out.push('<pre><code>'+esc(buf.join('\n'))+'</code></pre>');continue;}
    var h = l.match(/^(#{1,4})\s+(.*)$/);
    if(h){var n=Math.min(h[1].length+1,4);out.push('<h'+n+'>'+inline(h[2])+'</h'+n+'>');i++;continue;}
    if(/^\s*\|.*\|\s*$/.test(l)){var rows=[];while(i<lines.length && /^\s*\|.*\|\s*$/.test(lines[i])){rows.push(lines[i]);i++;}
      var cells=function(r){return r.trim().replace(/^\||\|$/g,'').split('|').map(function(c){return c.trim();});};
      var html='<table>';var start=0;
      if(rows.length>1 && /^[\s|:-]+$/.test(rows[1])){html+='<thead><tr>'+cells(rows[0]).map(function(c){return '<th>'+inline(c)+'</th>';}).join('')+'</tr></thead>';start=2;}
      html+='<tbody>'+rows.slice(start).map(function(r){return '<tr>'+cells(r).map(function(c){return '<td>'+inline(c)+'</td>';}).join('')+'</tr>';}).join('')+'</tbody></table>';
      out.push(html);continue;}
    if(/^\s*([-*]|\d+\.)\s+/.test(l)){var ordered=/^\s*\d+\./.test(l);var items=[];
      while(i<lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])){items.push(lines[i].replace(/^\s*([-*]|\d+\.)\s+/,'').replace(/^\[( |x|X)\]\s+/,''));i++;}
      out.push('<'+(ordered?'ol':'ul')+'>'+items.map(function(t){return '<li>'+inline(t)+'</li>';}).join('')+'</'+(ordered?'ol':'ul')+'>');continue;}
    if(/^>\s?/.test(l)){out.push('<p class="meta">'+inline(l.replace(/^>\s?/,''))+'</p>');i++;continue;}
    if(l.trim()===''){i++;continue;}
    var para=[];while(i<lines.length && lines[i].trim()!=='' && !/^(#{1,4}\s|\s*([-*]|\d+\.)\s|\x60\x60\x60|\s*\|)/.test(lines[i])){para.push(lines[i]);i++;}
    out.push('<p>'+inline(para.join(' '))+'</p>');
  }
  return out.join('');
}
var ideaById = {}; D.ideas.forEach(function(i){ideaById[i.data.id]=i;});
var gapById = {}; D.gaps.forEach(function(g){gapById[g.data.id]=g;});
function ideaLink(id){return ideaById[id]?'<a href="#idea/'+encodeURIComponent(id)+'">'+esc(id)+'</a>':'<span class="meta">'+esc(id)+'</span>';}
function gapLink(id){return '<a href="#gap/'+encodeURIComponent(id)+'">'+esc(id)+'</a>';}
function openGap(g){return g.data.status==='open'||g.data.status==='validating';}
function bpEls(){var out=[];if(!D.blueprint)return out;Object.keys(D.kinds).forEach(function(k){(D.blueprint[k]||[]).forEach(function(el){out.push({kind:k,el:el});});});return out;}
function copyBtn(text){return '<div class="cmd"><span class="lbl">'+t('toResolve')+'</span><code>'+esc(text)+'</code><button class="btn" data-copy="'+esc(text)+'">'+t('copy')+'</button></div>';}
document.addEventListener('click',function(e){
  if(e.target.closest('a,button,input,select,textarea,[data-copy]'))return;
  var c=e.target.closest('[data-href]'); if(!c)return;
  if(window.getSelection && String(window.getSelection()).length) return;
  go(c.getAttribute('data-href'));
});
function go(h){ if(h.charAt(0)==='@'){var t=document.getElementById(h.slice(1)); if(t) t.scrollIntoView({behavior:'smooth',block:'start'}); return;} location.hash=h; }
document.addEventListener('keydown',function(e){var c=e.target.closest&&e.target.closest('[data-href]');if(c&&e.target===c&&(e.key==='Enter'||e.key===' ')){e.preventDefault();go(c.getAttribute('data-href'));}});
document.addEventListener('click',function(e){var b=e.target.closest('[data-copy]');if(!b)return;var t=b.getAttribute('data-copy');
  var done=function(){var o=b.textContent;b.textContent=t('copied');setTimeout(function(){b.textContent=o;},1200);};
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done,function(){fallback(t);done();});}else{fallback(t);done();}});
function fallback(t){var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');}catch(e){}ta.remove();}

// Five sections, in the order a reader asks: what needs me, what does the app do, when does it ship, how is it structured, where did it come from.
var PAGES = [['overview',t('nav_overview')],['features',t('nav_features')],['roadmap',t('nav_roadmap')],['blueprint',t('nav_blueprint')],['ideas',t('nav_ideas')]];
document.getElementById('brand').innerHTML = esc(D.project)+'<small>OpenIdea</small>';
document.getElementById('mnav').setAttribute('aria-label',t('sections'));document.documentElement.lang=D.lang||'en';
var modeEl = document.getElementById('mode'); modeEl.textContent = CLIENT?t('clientMode'):t('internalMode'); if(CLIENT) modeEl.className='mode client';
document.title = D.project + ' · OpenIdea';

function briefSection(t){if(!D.brief)return '';var m=String(D.brief.body).split(/^##\s+/m).filter(function(x){return x.toLowerCase().indexOf(t.toLowerCase())===0;})[0];return m?m.replace(/^[^\n]*\n/,'').trim():'';}
function briefList(t){return briefSection(t).split('\n').map(function(l){return l.replace(/^\s*[-*]\s*(\[[ x]\]\s*)?/,'').trim();}).filter(Boolean);}
function briefPara(t){return briefSection(t).split('\n').filter(function(l){return !/^\s*[-*]/.test(l);}).join(' ').trim();}
function q5(body,label){var m=String(body||'').match(new RegExp('\\*\\*'+label+'\\*\\*:?\\s*([^\\n]+)'));return m?m[1].trim():'';}
function human(id){var s=String(id).replace(/-/g,' ');return s.charAt(0).toUpperCase()+s.slice(1);}
function activeFeatures(){return D.ideas.filter(function(i){return i.location==='active'&&i.data.type!=='chore'&&['killed','merged','split'].indexOf(i.data.status)<0;});}
// The overview reads top to bottom as a story: what the app is, who uses it, what it does, how it is delivered,
// how solid the definition is, and what needs a decision. Every section links to its detail page.
function overview(){
  var c = D.counts, feats = activeFeatures();
  var vision = briefPara('Vision'), users = briefPara('Target Users'), value = briefPara('Core Value Prop');
  var order = {}; D.milestones.forEach(function(m,n){m.ideas.forEach(function(id,k){if(order[id]==null)order[id]=n*1000+k;});});
  var replaces = feats.slice().sort(function(a,b){return (order[a.data.id]==null?1e9:order[a.data.id])-(order[b.data.id]==null?1e9:order[b.data.id]);}).map(function(i){return i.data.replaces;}).filter(Boolean);
  var h = '<div class="hero"><h1>'+esc(D.project)+'</h1>'+(vision?'<p class="vision">'+esc(vision)+'</p>':'<p class="vision meta">'+t('noBrief')+'</p>');
  h += '<dl class="facts">'+(users?'<dt>'+t('for')+'</dt><dd>'+esc(users)+'</dd>':'')+(value?'<dt>'+t('whyMatters')+'</dt><dd>'+esc(value)+'</dd>':'')+
    (replaces.length?'<dt>'+t('replacesToday')+'</dt><dd><ul>'+replaces.map(function(r){return '<li>'+esc(r)+'</li>';}).join('')+'</ul></dd>':'')+
    (briefList('Non-goals').length?'<dt>'+t('notIncluded')+'</dt><dd><ul>'+briefList('Non-goals').map(function(r){return '<li>'+esc(r)+'</li>';}).join('')+'</ul></dd>':'')+
    (briefList('Constraints').length?'<dt>'+t('constraints')+'</dt><dd><ul>'+briefList('Constraints').map(function(r){return '<li>'+esc(r)+'</li>';}).join('')+'</ul></dd>':'')+'</dl>';
  var steps=[['s-users',t('st_users')],['s-what',t('st_what')],['s-plan',t('st_plan')],['s-health',t('st_health')],['decide',t('st_decide')]];
  h += '<ol class="steps">'+steps.map(function(x){return '<li><span class="st" role="link" tabindex="0" data-href="@'+x[0]+'">'+x[1]+'</span></li>';}).join('')+'</ol></div>';

  // 1. Who uses it
  var actors = D.blueprint&&D.blueprint.actors||[], flows = D.blueprint&&D.blueprint.flows||[];
  h += '<h2 id="s-users"><span class="secnum">1</span>'+t('h_users')+'</h2>';
  if(actors.length){
    h += '<div class="grid g2">'+actors.map(function(a){var fs=flows.filter(function(f){return f.actor===a.id;});
      return '<div class="card actor"><h3>'+esc(a.name||a.id)+(a.assumption?' '+pill('assumption'):'')+'</h3><div class="meta">'+esc(a.description||'')+'</div>'+
        (fs.length?'<ul>'+fs.map(function(f){return '<li><a href="#feature/'+encodeURIComponent(f.id)+'">'+esc(f.name||f.id)+'</a></li>';}).join('')+'</ul>':'<p class="meta" style="margin:8px 0 0">'+t('noFeatureRole')+'</p>')+'</div>';}).join('')+'</div>';
    h += '<p class="next-link"><a href="#features">'+t('allFeatures',D.features.length)+'</a></p>';
  } else h += '<p class="empty">'+t('noBpRoles')+'</p>';

  // 2. What it does: the ideas, grouped by phase in execution order
  h += '<h2 id="s-what"><span class="secnum">2</span>'+t('h_what')+'</h2><p class="sec-lede">'+t('whatLede')+'</p>';
  var groups = D.milestones.map(function(m){return [m.name, m.ideas.map(function(id){return ideaById[id];}).filter(function(i){return i&&feats.indexOf(i)>=0;})];});
  var planned = {}; D.milestones.forEach(function(m){m.ideas.forEach(function(id){planned[id]=1;});});
  var unplanned = feats.filter(function(i){return !planned[i.data.id];}); if(unplanned.length) groups.push([D.milestones.length?t('notPlannedYet'):t('ideasWord'), unplanned]);
  var openBy={}; D.gaps.filter(openGap).forEach(function(g){(g.data.ideas||[]).forEach(function(id){openBy[id]=(openBy[id]||0)+1;});});
  groups.forEach(function(gr){ if(!gr[1].length) return;
    h += '<h3>'+esc(gr[0])+'</h3><div class="grid g2">'+gr[1].map(function(i){var d=i.data, p=q5(i.body,'Problem'), done=q5(i.body,'Done looks like');
      return '<div class="card idea-card" data-href="idea/'+encodeURIComponent(d.id)+'" tabindex="0"><div class="chips">'+pill(d.status)+(openBy[d.id]?pill(tn('openGaps',openBy[d.id]),openBy[d.id]?'medium':'tag'):'')+'</div><div class="t">'+esc(d.title||human(d.id))+'</div>'+(p?'<div class="p">'+esc(p)+'</div>':'')+(done?'<div class="d"><strong>'+t('doneWhen')+'</strong> '+esc(done)+'</div>':'')+'</div>';}).join('')+'</div>';});
  if(!feats.length) h += '<p class="empty">'+t('noIdeas')+'</p>';

  // 3. How it is delivered
  h += '<h2 id="s-plan"><span class="secnum">3</span>'+t('h_plan')+'</h2>';
  if(D.estimate&&D.estimate.phases.length){var E=D.estimate;
    h += '<p class="sec-lede">'+t('likelyWeeks',rng(E.total.likelyWeeks,E.total.likelyWeeks))+(E.total.endDateLikely?t('around',fmtDate(E.total.endDateLikely)):'')+t('betweenOpen',rng(E.total.weeks[0],E.total.weeks[1],t('weeks')))+'</p><div class="card">'+
      E.phases.filter(function(ph){return ph.id!=='all';}).map(function(ph,n){var m=D.milestones.filter(function(x){return x.id===ph.id;})[0];
        return '<div class="phase-row"><span class="n">'+(n+1)+'</span><div><strong>'+esc(ph.name)+'</strong><div class="meta">'+(m?m.ideas.map(function(id){var i=ideaById[id];return esc(i&&i.data.title||human(id));}).join(', '):'')+'</div></div><div style="text-align:right">'+pill(t('likelyX',rng(ph.likelyWeeks,ph.likelyWeeks,t('wk'))),'tag')+(m&&m.blockingGaps.length?'<div>'+pill(t('gateBlocked'),'blocked')+'</div>':'')+'</div></div>';}).join('')+'</div>';
    h += '<p class="next-link"><a href="#roadmap">'+t('timelineLink')+'</a></p>';
  } else h += D.milestones.length?milestoneTable():'<p class="empty">'+t('noRoadmap')+'</p>';

  // 4. How clear the definition is
  var depthPct = D.depth && D.depth.score!=null ? Math.round(D.depth.score*100) : null;
  var ready = (c.byStatus.ready||0), cap = (c.byStatus.captured||0);
  h += '<h2 id="s-health"><span class="secnum">4</span>'+t('h_health')+'</h2><p class="sec-lede">'+t('healthLede')+'</p><div class="grid g4">';
  h += '<div class="card stat '+(c.openHigh?'bad primary':'good')+'" '+(D.queue.length?'data-href="@decide" tabindex="0"':'')+'><div class="v">'+c.openHigh+'</div><div class="k">'+t('openHigh')+'</div><div class="s">'+t('openTotal',(c.gapStatus.open||0)+(c.gapStatus.validating||0))+'</div></div>';
  h += '<div class="card stat" data-href="ideas" tabindex="0"><div class="v">'+ready+' / '+(ready+cap)+'</div><div class="k">'+t('ideasReady')+'</div><div class="s">'+t('stillCaptured',cap)+'</div></div>';
  h += '<div class="card stat '+(depthPct==null?'':depthPct<60?'bad':depthPct<85?'warn':'good')+'"'+(D.blueprint?' data-href="blueprint" tabindex="0"':'')+'><div class="v">'+(depthPct==null?'–':depthPct+'%')+'</div><div class="k">'+t('bpDepth')+'</div><div class="s">'+(D.depth?t('mandatoryFilled',D.depth.filled+'/'+D.depth.total):t('noBpYet'))+'</div>'+(depthPct==null?'':'<div class="depth"><span style="width:'+depthPct+'%;background:'+(depthPct>=85?'var(--green)':depthPct>=60?'var(--amber)':'var(--red)')+'"></span></div>')+'</div>';
  h += '<div class="card stat '+(D.assumptions?'warn':'')+'"'+(D.blueprint?' data-href="blueprint" tabindex="0"':'')+'><div class="v">'+D.assumptions+'</div><div class="k">'+t('hiddenAssumptions')+'</div><div class="s">'+t('noIdeaAsked')+'</div></div>';
  if(!CLIENT) h += '<div class="card stat '+(c.errors?'bad':'good')+'" data-href="issues" tabindex="0"><div class="v">'+c.errors+'</div><div class="k">'+t('checkErrors')+'</div><div class="s">'+t('warningsN',c.warnings)+'</div></div>';
  h += '</div>';

  // 5. What needs a decision
  h += '<h2 id="decide"><span class="secnum">5</span>'+t('h_decide')+'</h2><p class="sec-lede">'+t('decideLede',Math.min(D.queue.length,5))+'</p>'+queueCards(D.queue);
  var rest = D.gaps.filter(function(g){return D.queue.indexOf(g.data.id)<0;});
  if(rest.length) h += '<details class="fold"><summary>'+t('allOtherGaps',rest.length)+'</summary>'+gapTable(rest)+'</details>';
  if(D.milestones.length) h += '<details class="fold"><summary>'+t('milestoneGates')+'</summary>'+milestoneTable()+'</details>';
  h += '<details class="fold"><summary>'+t('howToRead')+'</summary><div class="card legend-card"><div class="lg"><span class="sw" style="background:var(--red)"></span><div>'+t('lg_red')+'</div></div>'+
    '<div class="lg"><span class="sw" style="background:var(--amber)"></span><div>'+t('lg_amber')+'</div></div>'+
    '<div class="lg"><span class="sw" style="background:var(--orange)"></span><div>'+t('lg_orange')+'</div></div>'+
    '<div class="lg"><span class="sw" style="background:var(--green)"></span><div>'+t('lg_green')+'</div></div>'+
    '<div class="lg"><span class="sw" style="background:var(--purple)"></span><div>'+t('lg_purple')+'</div></div>'+
    '<div class="lg"><span class="sw" style="background:var(--gray)"></span><div>'+t('lg_grey')+'</div></div>'+
    '<div class="lg"><span class="sw" style="background:var(--accent)"></span><div>'+t('lg_blue')+'</div></div>'+
    '<p class="meta" style="margin:8px 0 0">'+t('lg_pills')+'</p></div></details>';
  return h;
}
function milestoneTable(){
  if(!D.milestones.length) return '<p class="empty">'+t('noRoadmap')+'</p>';
  return '<table><thead><tr><th>'+t('th_milestone')+'</th><th>'+t('th_id')+'</th><th>'+t('th_status')+'</th><th>'+t('th_gate')+'</th><th>'+t('th_ideas')+'</th></tr></thead><tbody>'+D.milestones.map(function(m){
    var gate = m.blockingGaps.length?pill(tn('highOpen',m.blockingGaps.length),'blocked'):pill(t('clear'),'clear');
    return '<tr><td><strong>'+esc(m.name)+'</strong></td><td><code>'+esc(m.id)+'</code></td><td>'+pill(m.status)+'</td><td>'+gate+(m.blockingGaps.length?'<div class="meta">'+m.blockingGaps.map(gapLink).join(', ')+'</div>':'')+'</td><td>'+m.ideas.map(ideaLink).join(', ')+'</td></tr>';}).join('')+'</tbody></table>';
}
function queueCards(ids, noRank){
  if(!ids.length) return '<p class="empty">'+t('noOpenGaps')+'</p>';
  return '<div class="grid g2">'+ids.map(function(id,n){var g=gapById[id];if(!g)return '';var d=g.data;
    var body = CLIENT?'':sectionOf(g.body,'Proposed validation')||sectionOf(g.body,'Usulan validasi');
    return '<div class="card" data-href="gap/'+encodeURIComponent(id)+'" tabindex="0"><div class="chips">'+(noRank?'':pill('#'+(n+1),'rank'))+pill(d.impact)+pill(d.kind,'tag')+pill(d.status)+'</div><div class="q">'+esc(d.question)+'</div>'+
      (body?'<div class="md meta">'+md(body)+'</div>':'')+
      '<div class="meta">'+t('ideasColon')+((d.ideas||[]).map(function(x){return esc(x);}).join(', ')||t('projectWide'))+'</div>'+
      (CLIENT?'':copyBtn('/openidea:resolve '+id))+'</div>';}).join('')+'</div>';
}
function sectionOf(body,title){var m=String(body||'').split(/^##\s+/m).filter(function(s){return s.toLowerCase().indexOf(title.toLowerCase())===0;})[0];return m?m.replace(/^[^\n]*\n/,'').trim():'';}
function gapTable(list){
  if(!list.length) return '<p class="empty">'+t('noGaps')+'</p>';
  var rank={high:3,medium:2,low:1},st={open:0,validating:1,accepted_risk:2,resolved:3,dismissed:4};
  list = list.slice().sort(function(a,b){return (st[a.data.status]-st[b.data.status])||(rank[b.data.impact]-rank[a.data.impact])||String(a.data.id).localeCompare(b.data.id);});
  return '<table><thead><tr><th>'+t('th_gap')+'</th><th>'+t('th_question')+'</th><th>'+t('th_kind')+'</th><th>'+t('th_impact')+'</th><th>'+t('th_status')+'</th><th>'+t('th_ideas')+'</th></tr></thead><tbody>'+list.map(function(g){var d=g.data;
    return '<tr><td>'+gapLink(d.id)+'</td><td>'+esc(d.question)+'</td><td>'+esc(tv(d.kind))+'</td><td>'+pill(d.impact)+'</td><td>'+pill(d.status)+'</td><td>'+(d.ideas||[]).map(ideaLink).join(', ')+'</td></tr>';}).join('')+'</tbody></table>';
}
function gap(id){
  var g = gapById[id]; if(!g) return '<p>'+t('gapNotFound')+'</p>';
  var d = g.data;
  var h = '<p class="back"><a href="#overview">'+t('backOverview')+'</a></p><h1>'+esc(d.id)+'</h1><div class="chips">'+pill(d.impact)+pill(d.kind,'tag')+pill(t('confidenceX',tv(d.confidence)),'tag')+pill(d.status)+(d.found_by?pill(t('foundByX',tv(d.found_by)),'tag'):'')+'</div>';
  h += '<div class="q" style="margin-top:12px">'+esc(d.question)+'</div>';
  if(!CLIENT) h += copyBtn('/openidea:resolve '+d.id);
  h += '<p class="meta">'+t('ideasColon')+((d.ideas||[]).map(ideaLink).join(', ')||t('projectWide'))+(d.sources&&d.sources.length?' · '+t('sources')+d.sources.map(function(s){return '<code>'+esc(s)+'</code>';}).join(' '):'')+'</p>';
  if(d.resolution) h += '<div class="card"><strong>'+t('resolution')+'</strong> '+inline(d.resolution)+'</div>';
  if(g.body && g.body.trim()) h += '<div class="card md" style="margin-top:12px">'+md(g.body)+'</div>';
  return h;
}
function statusBar(){
  var c=D.counts, order=[['ready','var(--green)'],['captured','var(--amber)'],['parked','var(--gray)'],['promoted','var(--purple)'],['merged','var(--gray-soft)'],['split','var(--gray-soft)'],['killed','var(--dim)']];
  var total = order.reduce(function(s,o){return s+(c.byStatus[o[0]]||0);},0); if(!total) return '';
  return '<div class="card" style="margin-bottom:12px"><div class="bar-status">'+order.map(function(o){var n=c.byStatus[o[0]]||0;return n?'<span title="'+tv(o[0])+': '+n+'" style="width:'+(n/total*100)+'%;background:'+o[1]+'"></span>':'';}).join('')+'</div>'+
    '<div class="legend">'+order.filter(function(o){return c.byStatus[o[0]];}).map(function(o){return '<span><span class="dot" style="background:'+o[1]+'"></span>'+tv(o[0])+' '+c.byStatus[o[0]]+'</span>';}).join('')+'</div></div>';
}
function ideas(){
  var cats = {}; D.ideas.forEach(function(i){if(i.data.category)cats[i.data.category]=1;});
  var h = '<h1>'+t('ideasTitle')+'</h1><p class="lede">'+t('ideasLede')+'</p>'+statusBar();
  h += '<div class="filters"><input id="fq" placeholder="'+t('searchIdeas')+'"><select id="fs"><option value="">'+t('allStatuses')+'</option>'+['captured','ready','parked','promoted','merged','split','killed'].map(function(s){return '<option value="'+s+'">'+esc(tv(s))+'</option>';}).join('')+'</select><select id="fc"><option value="">'+t('allCategories')+'</option>'+Object.keys(cats).sort().map(function(c){return '<option>'+esc(c)+'</option>';}).join('')+'</select></div><div id="itable"></div>';
  setTimeout(function(){var q=document.getElementById('fq'),s=document.getElementById('fs'),c=document.getElementById('fc');
    function draw(){var qv=q.value.toLowerCase();var list=D.ideas.filter(function(i){return (!s.value||i.data.status===s.value)&&(!c.value||i.data.category===c.value)&&(!qv||(i.data.id+' '+(i.data.category||'')).toLowerCase().indexOf(qv)>=0);});
      var openBy={};D.gaps.filter(openGap).forEach(function(g){(g.data.ideas||[]).forEach(function(id){openBy[id]=(openBy[id]||0)+1;});});
      document.getElementById('itable').innerHTML = list.length?'<table><thead><tr><th>'+t('th_idea')+'</th><th>'+t('th_status')+'</th><th>'+t('th_type')+'</th><th>'+t('th_category')+'</th><th>'+t('th_updated')+'</th><th>'+t('th_openGaps')+'</th></tr></thead><tbody>'+list.map(function(i){var d=i.data;
        return '<tr><td>'+ideaLink(d.id)+(d.needs_clarification?' '+pill(t('needsClar'),'attention'):'')+'</td><td>'+pill(d.status)+'</td><td>'+esc(tv(d.type||'feature'))+'</td><td>'+esc(d.category||'')+'</td><td>'+esc(d.updated||'')+'</td><td>'+(openBy[d.id]?pill(tn('openGaps',openBy[d.id]),'open'):'')+'</td></tr>';}).join('')+'</tbody></table>':'<p class="empty">'+t('noIdeasMatch')+'</p>';}
    [q,s,c].forEach(function(e){e.addEventListener('input',draw);});draw();},0);
  return h;
}
function idea(id){
  var i = ideaById[id]; if(!i) return '<p>'+t('ideaNotFound')+'</p>';
  var d = i.data;
  var h = '<p class="back"><a href="#ideas">'+t('backIdeas')+'</a></p><h1>'+esc(d.id)+'</h1><div class="chips">'+pill(d.status)+pill(tv(d.type||'feature'),'tag')+(d.category?'<span class="chip">'+esc(d.category)+'</span>':'')+(d.needs_clarification?pill(t('needsClar'),'attention'):'')+'</div>';
  var ms = D.milestones.filter(function(m){return m.ideas.indexOf(d.id)>=0;})[0];
  var facts = [];
  if(ms) facts.push(t('f_milestone')+'<strong>'+esc(ms.name)+'</strong>');
  if(d.depends_on&&d.depends_on.length) facts.push(t('f_depends')+''+d.depends_on.map(ideaLink).join(', '));
  if(d.merged_into) facts.push(t('f_merged')+''+ideaLink(d.merged_into));
  if(d.split_into&&d.split_into.length) facts.push(t('f_split')+''+d.split_into.map(ideaLink).join(', '));
  if(d.promoted_to) facts.push(t('f_promoted')+'<code>'+esc(d.promoted_to)+'</code>');
  if(d.replaces) facts.push(t('f_replaces')+''+esc(d.replaces));
  if(d.triage_note) facts.push(t('f_triage')+''+esc(d.triage_note));
  if(facts.length) h += '<p class="meta">'+facts.join(' · ')+'</p>';
  h += '<div class="grid g2" style="margin-top:12px"><div class="card md">'+md(i.body)+'</div><div>';
  var gs = D.gaps.filter(function(g){return (g.data.ideas||[]).indexOf(d.id)>=0;});
  h += '<h3>'+t('h_gaps')+'</h3>'+(gs.length?gs.map(function(g){return '<div class="issue">'+pill(g.data.impact)+' '+pill(g.data.status)+' '+gapLink(g.data.id)+'<div>'+esc(g.data.question)+'</div></div>';}).join(''):'<p class="empty">'+t('noGapsLinked')+'</p>');
  var els = bpEls().filter(function(x){return (x.el.derived_from||[]).indexOf(d.id)>=0;});
  h += '<h3>'+t('h_derived')+'</h3>'+(els.length?'<div class="chips">'+els.map(function(x){return '<a class="jump" href="#blueprint/'+x.kind+'/'+encodeURIComponent(x.el.id)+'">'+esc(D.kinds[x.kind].label)+': '+esc(x.el.name||x.el.id)+'</a>';}).join('')+'</div>':'<p class="empty">'+t('nothingYet')+'</p>');
  if(d.history&&d.history.length) h += '<h3>'+t('h_history')+'</h3><table><tbody>'+d.history.map(function(e){return '<tr><td>'+esc(e.date)+'</td><td>'+pill(e.status)+'</td><td class="meta">'+esc(e.note||e.reason||'')+'</td></tr>';}).join('')+'</tbody></table>';
  return h+'</div></div>';
}
function fmt(v){if(v==null||v==='')return '';if(Array.isArray(v))return v.map(function(x){return typeof x==='object'?esc(JSON.stringify(x)):esc(x);}).join('<br>');if(typeof v==='object')return Object.keys(v).map(function(k){return '<span class="meta">'+esc(k)+':</span> '+fmt(v[k]);}).join('<br>');return esc(v);}
function blueprint(focusKind, focusId){
  var h = '<h1>'+t('bpTitle')+'</h1>';
  if(!D.blueprint) return h+'<p class="empty">'+t('noBp')+'</p>';
  h += '<p class="lede">'+t('bpLede')+(D.blueprint.generated?esc(t('generatedX',D.blueprint.generated)):'')+'</p>';
  h += '<div class="toc"><a class="jump'+(!focusKind?' on':'')+'" href="#blueprint">'+t('all')+'</a>'+Object.keys(D.kinds).map(function(k){var n=(D.blueprint[k]||[]).length;return n?'<a class="jump'+(focusKind===k?' on':'')+'" href="#blueprint/'+k+'">'+esc(D.kinds[k].plural)+' · '+n+'</a>':'';}).join('')+((D.blueprint.permissions||[]).length?'<a class="jump'+(focusKind==='permissions'?' on':'')+'" href="#blueprint/permissions">'+t('permMatrix')+'</a>':'')+(D.diagrams?'<a class="jump" href="#diagrams">'+t('allDiagrams')+'</a>':'')+'</div>';
  if(!focusKind && D.diagrams) h += '<h2>'+t('sysContext')+'</h2>'+diagramBlock(t('whoWhat'), D.diagrams.context, t('containerNote'));
  if(!focusKind || focusKind==='permissions') h += matrix();
  Object.keys(D.kinds).forEach(function(k){
    if(focusKind && focusKind!=='permissions' && focusKind!==k) return;
    var list = D.blueprint[k]||[]; if(!list.length) return;
    h += '<h2 id="k-'+k+'">'+esc(D.kinds[k].plural)+'</h2><div class="grid g2">';
    list.forEach(function(el){
      if(focusId && el.id!==focusId) return;
      var slots = D.kinds[k].slots;
      h += '<div class="card el"><h3>'+esc(el.name||el.id)+' <code>'+esc(el.id)+'</code>'+(el.assumption?pill('assumption'):'')+'</h3>';
      h += '<div class="chips" style="margin:4px 0 8px">'+((el.derived_from||[]).length?'<span class="src">'+t('fromIdea')+(el.derived_from||[]).map(ideaLink).join(', ')+'</span>':'<span class="pill p-assumption">'+t('noSourceIdea')+'</span>')+'</div>';
      slots.filter(function(s){return s!=='name';}).forEach(function(s){var v=get(el,s);h+='<div class="slot"><span class="k">'+esc(s)+'</span>'+(filled(v)?'<span>'+fmt(v)+'</span>':'<span class="miss">'+t('notDefined')+'</span>')+'</div>';});
      Object.keys(el).forEach(function(key){if(['id','name','derived_from','assumption'].indexOf(key)>=0)return;if(slots.some(function(s){return s===key||s.indexOf(key+'.')===0;}))return;h+='<div class="slot"><span class="k">'+esc(key)+'</span><span>'+fmt(el[key])+'</span></div>';});
      var sm = k==='entities' && D.diagrams && D.diagrams.states.filter(function(x){return x.id===el.id;})[0];
      if(sm) h += '<div class="diagram" style="margin-top:10px"><p class="meta" style="margin:0 0 4px">'+t('statesRed')+'</p><pre class="mermaid">'+esc(sm.src)+'</pre></div>';
      h += '</div>';
    });
    h += '</div>';
  });
  if(focusId) h = '<p class="back"><a href="#blueprint">'+t('wholeBp')+'</a></p>'+h;
  return h;
}
function matrix(){
  var perms = D.blueprint.permissions||[]; if(!perms.length) return '';
  var actors = (D.blueprint.actors||[]).map(function(a){return a.id;});
  perms.forEach(function(p){if(actors.indexOf(p.actor)<0)actors.push(p.actor);});
  var cols = []; perms.forEach(function(p){var c=p.action+(p.entity?' '+p.entity:'');if(cols.indexOf(c)<0)cols.push(c);});
  var cell = {}; perms.forEach(function(p){var key=p.actor+'|'+p.action+(p.entity?' '+p.entity:'');if(cell[key]!==undefined && cell[key]!==p.allow)cell[key]='conflict';else cell[key]=p.allow;});
  var h = '<h2 id="k-permissions">'+t('permMatrix')+'</h2><p class="meta">'+t('matrixLede')+'</p><div><table class="matrix"><thead><tr><th>'+t('th_actor')+'</th>'+cols.map(function(c){return '<th>'+esc(c)+'</th>';}).join('')+'</tr></thead><tbody>';
  actors.forEach(function(a){h+='<tr><td><strong>'+esc(a)+'</strong></td>'+cols.map(function(c){var v=cell[a+'|'+c];return v==='conflict'?'<td class="conflict">'+t('conflict')+'</td>':v===true?'<td class="yes">✓</td>':v===false?'<td class="no">✗</td>':'<td class="meta">·</td>';}).join('')+'</tr>';});
  return h+'</tbody></table></div>';
}
function rng(a,b,u){var h=function(x){return Math.round(x*2)/2;};a=h(a);b=h(b);return (a===b?num(a):num(a)+'–'+num(b))+(u?' '+u:'');}
function fmtDate(iso){if(!iso)return '';var d=new Date(iso+'T00:00:00Z');return d.toLocaleDateString(T.locale||undefined,{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});}
function timeline(){
  var E=D.estimate; if(!E||!E.phases.length) return '';
  var max=E.total.weeks[1]||1, c=E.calibration;
  var h='<div class="card tl"><div class="tl-head"><div><div class="tl-v">'+rng(E.total.weeks[0],E.total.weeks[1],t('weeks'))+'</div><div class="meta">'+rng(E.total.low,E.total.high,t('personDays'))+(E.total.endDate?t('doneBetween',fmtDate(E.total.endDate[0]),fmtDate(E.total.endDate[1])):'')+'</div></div>'+
    (c.samples?pill(t('calibratedOn',c.samples),'clear'):pill(t('notCalibrated'),'draft'))+'</div>';
  h+='<div class="gantt">'+E.phases.map(function(ph){
    var l=ph.startWeek[0]/max*100, w1=(ph.endWeek[0]-ph.startWeek[0])/max*100, w2=(ph.endWeek[1]-ph.startWeek[0])/max*100;
    return '<div class="g-row"><div class="g-name">'+esc(ph.name)+'</div><div class="g-track"><span class="g-hi" style="left:'+l+'%;width:'+w2+'%"></span><span class="g-lo" style="left:'+l+'%;width:'+w1+'%"></span></div><div class="g-w">'+rng(ph.weeks[0],ph.weeks[1],t('wk'))+'</div></div>';}).join('')+'</div>';
  h+='<div class="legend"><span><span class="dot" style="background:var(--accent)"></span>'+t('lgLikely')+'</span><span><span class="dot" style="background:var(--amber-soft);border:1px solid var(--amber)"></span>'+t('lgExtra')+'</span></div>';
  h+='<p class="meta" style="margin:8px 0 0">'+num(c.team.people)+' '+(c.team.people===1?t('person'):t('people'))+' × '+t('daysX',num(c.team.days_per_week))+' × '+t('focusX',Math.round(c.team.focus*100)+'%')+t('idealDays',rng(c.capacity,c.capacity))+(c.samples?t('scaledBy',num(c.factor.toFixed(2))):t('recordActuals'))+'</p></div>';
  if(E.gapCost.length) h+='<h2>'+t('h_cost')+'</h2><p class="lede">'+t('costLede')+'</p><table><thead><tr><th>'+t('th_gap')+'</th><th>'+t('th_upTo')+'</th><th>'+t('th_question')+'</th></tr></thead><tbody>'+E.gapCost.map(function(g){return '<tr><td>'+gapLink(g.id)+'</td><td class="pillcell">'+pill(t('plusDays',num(g.days)),g.impact)+'</td><td>'+esc(g.question)+'</td></tr>';}).join('')+'</tbody></table>';
  return h;
}
function workTable(ph){
  var E=D.estimate;
  var rows=(ph.setup?[{name:t('projectSetup'),kind:'setup',low:E.calibration.setup[0],high:E.calibration.setup[1],reasons:[]}]:[]).concat(ph.items);
  return '<details class="fold"><summary>'+t('workBreakdown',rows.length)+'</summary><table><thead><tr><th>'+t('th_work')+'</th><th>'+t('th_kind')+'</th><th>'+t('th_days')+'</th><th>'+t('th_why')+'</th></tr></thead><tbody>'+rows.map(function(it){
    var link=it.kind==='setup'?esc(it.name):'<a href="#blueprint/'+it.kind+'/'+encodeURIComponent(it.id)+'">'+esc(it.name)+'</a>';
    return '<tr><td>'+link+'</td><td>'+esc(it.kind==='setup'?t('setup'):D.kinds[it.kind].label.toLowerCase())+'</td><td>'+rng(it.low,it.high)+'</td><td>'+(it.reasons.length?'<span class="miss-t">'+esc(it.reasons.join('; '))+'</span>':'')+'</td></tr>';}).join('')+
    '<tr><td>'+t('testing')+'</td><td>'+t('stabilize')+'</td><td>+'+Math.round(E.calibration.stabilize[0]*100)+'–'+Math.round(E.calibration.stabilize[1]*100)+'%</td><td></td></tr></tbody></table></details>';
}
function roadmap(){
  var h = '<h1>'+t('roadmapTitle')+'</h1><p class="lede">'+t('roadmapLede')+'</p>';
  if(!D.milestones.length && !D.estimate) return h+'<p class="empty">'+t('noRoadmap')+'</p>';
  h += timeline();
  var est={}; if(D.estimate) D.estimate.phases.forEach(function(ph){est[ph.id]=ph;});
  if(D.milestones.length) h += '<h2>'+t('phases')+'</h2>';
  D.milestones.forEach(function(m,n){
    var ph=est[m.id];
    h += '<div class="card" style="margin-bottom:12px"><h3 style="margin-top:0">'+(n+1)+'. '+esc(m.name)+' <code>'+esc(m.id)+'</code></h3><div class="chips">'+pill(m.status)+(m.blockingGaps.length?pill(t('gateBlocked'),'blocked'):pill(t('gateClear'),'clear'))+(ph?pill(rng(ph.weeks[0],ph.weeks[1],t('weeks')),'tag'):'')+'</div>';
    if(ph) h += '<p class="meta">'+rng(ph.low,ph.high,t('personDays'))+(ph.endDate?t('endsRange',fmtDate(ph.endDate[0]),fmtDate(ph.endDate[1])):t('endsWeek',rng(Math.ceil(ph.endWeek[0]),Math.ceil(ph.endWeek[1]))))+'</p>';
    if(m.approvedIn) h += '<p class="meta">'+esc(t('approvedIn',m.approvedIn))+'</p>';
    h += '<table><thead><tr><th>'+t('th_idea')+'</th><th>'+t('th_status')+'</th><th>'+t('th_category')+'</th><th>'+t('th_depends')+'</th></tr></thead><tbody>'+m.ideas.map(function(id){var i=ideaById[id];var d=i?i.data:{};return '<tr><td>'+ideaLink(id)+'</td><td>'+(d.status?pill(d.status):'')+'</td><td>'+esc(d.category||'')+'</td><td>'+((d.depends_on||[]).map(ideaLink).join(', '))+'</td></tr>';}).join('')+'</tbody></table>';
    if(m.blockingGaps.length) h += '<p class="meta" style="margin-top:8px">'+t('blockedBy')+m.blockingGaps.map(gapLink).join(', ')+'</p>';
    if(ph) h += workTable(ph);
    h += '</div>';
  });
  if(D.estimate && D.estimate.unplanned.length) h += '<h2>'+t('notInMilestone')+'</h2><p class="lede">'+t('notInMilestoneLede')+'</p><table><thead><tr><th>'+t('th_work')+'</th><th>'+t('th_kind')+'</th><th>'+t('th_days')+'</th></tr></thead><tbody>'+D.estimate.unplanned.map(function(it){return '<tr><td><a href="#blueprint/'+it.kind+'/'+encodeURIComponent(it.id)+'">'+esc(it.name)+'</a></td><td>'+esc(D.kinds[it.kind].label.toLowerCase())+'</td><td>'+rng(it.low,it.high)+'</td></tr>';}).join('')+'</tbody></table>';
  return h;
}
function issues(){
  var h = '<p class="back"><a href="#overview">'+t('backOverview')+'</a></p><h1>'+t('checksTitle')+'</h1><p class="lede">'+t('checksLede')+'</p>';
  if(!D.issues.length) return h+'<p class="empty">'+t('allPass')+'</p>';
  var order={error:0,warning:1,info:2};
  return h+D.issues.slice().sort(function(a,b){return order[a.level]-order[b.level];}).map(function(i){return '<div class="issue">'+pill(i.level)+' <code>'+esc(i.code)+'</code> <span class="meta">'+esc(i.file)+'</span><div>'+esc(i.message)+'</div></div>';}).join('');
}
function labelCells(root){
  root.querySelectorAll('table').forEach(function(t){
    var heads = [].map.call(t.querySelectorAll('thead th'), function(th){return th.textContent.trim();});
    t.querySelectorAll('tbody tr').forEach(function(tr){
      var first=tr.children[0]&&tr.children[0].querySelector('a[href^="#"]');
      if(first&&!tr.hasAttribute('data-href')){tr.setAttribute('data-href',first.getAttribute('href').slice(1));}
      [].forEach.call(tr.children,function(td,i){
      if(heads[i]!==undefined)td.setAttribute('data-label',heads[i]);
      var txt=td.textContent.trim();
      if(txt===''||txt==='\u00b7') td.classList.add('emptycell');
      else if(i>0 && td.children.length && [].every.call(td.children,function(c){return c.classList.contains('pill');}) && td.querySelectorAll('div').length===0 && txt===[].map.call(td.children,function(c){return c.textContent;}).join('').trim()) td.classList.add('pillcell');
    });});
  });
}
new MutationObserver(function(ms){ms.forEach(function(m){[].forEach.call(m.addedNodes,function(n){if(n.nodeType===1)labelCells(n.parentNode||n);});});}).observe(app,{childList:true,subtree:true});
function features(){
  var h = '<h1>'+t('featuresTitle')+'</h1><p class="lede">'+t('featuresLede')+'</p>';
  if(!D.features.length) return h+'<p class="empty">'+t('noFlows')+'</p>';
  h += '<table><thead><tr><th>'+t('th_feature')+'</th><th>'+t('th_actor')+'</th><th>'+t('th_status')+'</th><th>'+t('th_screens')+'</th><th>'+t('th_done')+'</th><th>'+t('th_openGaps')+'</th><th>'+t('th_milestone')+'</th><th>'+t('th_notDefined')+'</th></tr></thead><tbody>';
  D.features.forEach(function(f){
    h += '<tr><td><a href="#feature/'+encodeURIComponent(f.id)+'">'+esc(f.name)+'</a>'+(f.assumption?' '+pill('assumption'):'')+'<div class="meta">'+t('fromX')+(f.ideas.map(ideaLink).join(', ')||t('noIdea'))+'</div></td>'+
      '<td>'+esc(f.actor||'')+'</td><td>'+f.statuses.map(function(x){return pill(x);}).join(' ')+'</td><td>'+esc(f.screens.join(', '))+'</td><td>'+esc(f.done.join(' / '))+'</td>'+
      '<td>'+f.gaps.map(gapLink).join(', ')+'</td><td>'+esc(f.milestones.join(', '))+'</td><td>'+(f.missing.length?'<span class="miss-t">'+esc(f.missing.join(', '))+'</span>':'')+'</td></tr>';
  });
  return h+'</tbody></table>';
}
function feature(id){
  var f = D.features.filter(function(x){return x.id===id;})[0]; if(!f) return '<p>'+t('featureNotFound')+'</p>';
  var h = '<p class="back"><a href="#features">'+t('backFeatures')+'</a></p><h1>'+esc(f.name)+'</h1><div class="chips">'+f.statuses.map(function(x){return pill(x);}).join('')+(f.assumption?pill('assumption'):'')+(f.milestones.length?pill(f.milestones.join(', '),'tag'):'')+'</div>';
  var rows = [[t('r_who'),esc(f.actor||'')],[t('r_from'),f.ideas.map(ideaLink).join(', ')],[t('th_screens'),esc(f.screens.join(', '))],[t('r_perms'),esc(f.permissions.join(', '))],[t('th_done'),esc(f.done.join(' / '))]];
  h += '<div class="card" style="margin-top:12px">'+rows.map(function(r){return '<div class="slot"><span class="k">'+r[0]+'</span>'+(r[1]?'<span>'+r[1]+'</span>':'<span class="miss">'+t('notDefined')+'</span>')+'</div>';}).join('')+
    (f.missing.length?'<div class="slot"><span class="k">'+t('notDefinedYet')+'</span><span class="miss">'+esc(f.missing.join(', '))+'</span></div>':'')+'</div>';
  if(f.gaps.length) h += '<h2>'+t('h_openGaps')+'</h2>'+queueCards(f.gaps, true);
  var a = D.diagrams && D.diagrams.activity.filter(function(x){return x.id===id;})[0];
  if(a) h += '<h2>'+t('activity')+'</h2>'+diagramBlock(a.name, a.src, t('redSteps'));
  h += '<p class="meta"><a href="#blueprint/flows/'+encodeURIComponent(id)+'">'+t('rawFlow')+'</a></p>';
  return h;
}
function diagramBlock(title, src, sub){
  return '<div class="card diagram"><h3 style="margin-top:0">'+esc(title)+'</h3>'+(sub?'<p class="meta">'+sub+'</p>':'')+'<pre class="mermaid">'+esc(src)+'</pre></div>';
}
function diagrams(focus){
  var h = '<p class="back"><a href="#blueprint">'+t('backBp')+'</a></p><h1>'+t('diagramsTitle')+'</h1><p class="lede">'+t('diagramsLede')+'</p>';
  if(!D.diagrams) return h+'<p class="empty">'+t('noBpShort')+'</p>';
  h += '<div class="toc"><a class="jump'+(!focus?' on':'')+'" href="#diagrams">'+t('all')+'</a><a class="jump'+(focus==='context'?' on':'')+'" href="#diagrams/context">'+t('sysContext')+'</a>'+D.diagrams.activity.map(function(a){return '<a class="jump'+(focus===a.id?' on':'')+'" href="#diagrams/'+encodeURIComponent(a.id)+'">'+esc(a.name)+'</a>';}).join('')+D.diagrams.states.map(function(a){return '<a class="jump'+(focus==='state-'+a.id?' on':'')+'" href="#diagrams/state-'+encodeURIComponent(a.id)+'">'+esc(t('statesOf',a.name))+'</a>';}).join('')+'</div>';
  if(!focus || focus==='context') h += '<h2>'+t('sysContext')+'</h2>'+diagramBlock(t('whoWhat'), D.diagrams.context, t('contextNote'));
  var acts = D.diagrams.activity.filter(function(a){return !focus||focus===a.id;});
  if(acts.length) h += '<h2>'+t('activityPerFlow')+'</h2>'+acts.map(function(a){return diagramBlock(a.name, a.src);}).join('');
  var sts = D.diagrams.states.filter(function(a){return !focus||focus==='state-'+a.id;});
  if(sts.length) h += '<h2>'+t('stateMachines')+'</h2>'+sts.map(function(a){return diagramBlock(a.name, a.src, t('redUnreachable'));}).join('');
  if(!focus && !D.diagrams.states.length) h += '<h2>'+t('stateMachines')+'</h2><p class="empty">'+t('noStates')+'</p>';
  return h;
}
var mermaidState = 'idle';
function drawMermaid(){
  var nodes = app.querySelectorAll('pre.mermaid'); if(!nodes.length) return;
  if(window.mermaid){ try{ window.mermaid.run({nodes:nodes}); }catch(e){} return; }
  if(mermaidState==='failed'){ offline(nodes); return; }
  if(mermaidState==='loading') return;
  mermaidState='loading';
  var sc=document.createElement('script'); sc.src='https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js';
  sc.onload=function(){ mermaidState='ready'; var dark=window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches; window.mermaid.initialize({startOnLoad:false,securityLevel:'strict',theme:dark?'dark':'neutral',flowchart:{useMaxWidth:true},state:{useMaxWidth:true}}); drawMermaid(); };
  sc.onerror=function(){ mermaidState='failed'; offline(app.querySelectorAll('pre.mermaid')); };
  document.head.appendChild(sc);
}
function offline(nodes){ [].forEach.call(nodes,function(n){ if(n.previousElementSibling&&n.previousElementSibling.className==='offline-note')return; var p=document.createElement('p'); p.className='offline-note'; p.textContent=t('offline'); n.parentNode.insertBefore(p,n); n.classList.add('src'); }); }
function route(){
  var parts = (location.hash.replace(/^#/,'')||'overview').split('/').map(decodeURIComponent);
  var page = parts[0], html;
  if(page==='queue'){page='overview';html=overview();setTimeout(function(){go('@decide');},0);} else if(page==='feature') html=feature(parts[1]); else if(page==='gap') html=gap(parts[1]); else if(page==='ideas') html=ideas(); else if(page==='idea') html=idea(parts[1]);
  else if(page==='blueprint') html=blueprint(parts[1],parts[2]); else if(page==='features') html=features(); else if(page==='diagrams') html=diagrams(parts[1]); else if(page==='roadmap') html=roadmap(); else if(page==='issues'&&!CLIENT) html=issues(); else {page='overview';html=overview();}
  var navKey = {gap:'overview',issues:'overview',idea:'ideas',feature:'features',diagrams:'blueprint'}[page]||page;
  var openN = D.gaps.filter(openGap).length;
  var navHtml = PAGES.map(function(p){return '<a href="#'+p[0]+'"'+(p[0]===navKey?' class="on"':'')+'>'+p[1]+(p[0]==='overview'&&openN?'<span class="badge">'+openN+'</span>':'')+'</a>';}).join('');
  document.getElementById('nav').innerHTML = navHtml; document.getElementById('mnav').innerHTML = navHtml;
  app.innerHTML = html; labelCells(app); drawMermaid(); if(parts[0]!=='queue') window.scrollTo(0,0);
}
window.addEventListener('hashchange',route); route();
})();
</script>
</body>
</html>
`;

// Shared colour tokens, so the prototype and the dashboard read as one product.
export const PALETTE = TEMPLATE.match(/:root\{[^\n]*\n@media \(prefers-color-scheme:dark\)[^\n]*/)[0];
