// Renders a single self-contained HTML dashboard: no server, no build step, no network.
// The markdown files stay the source of truth; this is a read-only view of them.
import { analyze } from './analyze.mjs';
import { BLUEPRINT_KINDS, depthReport } from './validate.mjs';
import { features, contextDiagram, activityDiagram, stateDiagram } from './diagrams.mjs';

function payload(p, issues, mode) {
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
  return {
    mode,
    project,
    diagrams,
    features: featureList,
    brief,
    ideas,
    gaps,
    queue: a.queue.map((g) => g.data.id),
    milestones: a.milestones.map((m) => ({ name: m.name, id: m.id, status: m.status || 'draft', approvedIn: m.approvedIn, ideas: m.ideas.filter((id) => visibleIdeas.has(id)), blockingGaps: m.blockingGaps })),
    blueprint: p.blueprint || null,
    kinds: BLUEPRINT_KINDS,
    depth: p.blueprint ? depthReport(p.blueprint) : null,
    counts: a.counts,
    assumptions: a.assumptions,
    issues: client ? [] : issues,
  };
}

export function renderDashboard(p, issues, { mode = 'internal' } = {}) {
  const json = JSON.stringify(payload(p, issues, mode)).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return TEMPLATE.replace('/*__DATA__*/', () => json);
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
html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
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
.miss-t{color:var(--red);font-weight:600;font-size:13px}
@media (max-width:640px){
header{position:static}
.bar{gap:8px;padding-top:max(10px,env(safe-area-inset-top))}
.mode{margin-left:auto}
nav{position:fixed;left:0;right:0;bottom:0;z-index:10;display:grid;grid-template-columns:repeat(5,1fr);gap:0;background:var(--surface);border-top:1px solid var(--border);padding:4px max(4px,env(safe-area-inset-right)) max(4px,env(safe-area-inset-bottom)) max(4px,env(safe-area-inset-left))}
nav a{text-align:center;padding:10px 2px;font-size:12.5px;min-height:44px;display:flex;align-items:center;justify-content:center;border-radius:8px}
nav a .badge{margin-left:3px;min-width:16px;line-height:16px;font-size:10.5px}
main{padding-bottom:calc(90px + env(safe-area-inset-bottom))}
main{padding-top:16px}
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
.stat.primary .v{font-size:34px}
.stat .v{font-size:24px}
}
</style>
</head>
<body>
<header><div class="bar"><div class="brand" id="brand"></div><nav id="nav"></nav><span class="mode" id="mode"></span></div></header>
<main id="app"></main>
<script type="application/json" id="data">/*__DATA__*/</script>
<script>
(function(){
var D = JSON.parse(document.getElementById('data').textContent);
var CLIENT = D.mode === 'client';
var app = document.getElementById('app');
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
var SEV={high:'red',error:'red',medium:'amber',warning:'amber',low:'gray',info:'gray'};
var ST={open:'red',blocked:'red',captured:'amber',validating:'amber',draft:'amber',assumption:'amber',attention:'amber',accepted_risk:'orange',ready:'green',resolved:'green',approved:'green',clear:'green',promoted:'purple',parked:'gray',killed:'gray',dismissed:'gray',merged:'gray',split:'gray'};
var ST_COLOR={red:'var(--red)',amber:'var(--amber)',orange:'var(--orange)',green:'var(--green)',purple:'var(--purple)',gray:'var(--gray)'};
function pill(v,cls){var k=cls||v,c;
  if(k==='tag') c='pill tag'; else if(k==='rank') c='pill rank'; else if(SEV[k]) c='pill sev-'+SEV[k]; else if(ST[k]) c='pill st st-'+ST[k]; else c='pill tag';
  return '<span class="'+c+'">'+esc(String(v).replace(/_/g,' '))+'</span>';}
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
function copyBtn(text){return '<div class="cmd"><span class="lbl">To resolve it, run in Claude Code:</span><code>'+esc(text)+'</code><button class="btn" data-copy="'+esc(text)+'">Copy</button></div>';}
document.addEventListener('click',function(e){
  if(e.target.closest('a,button,input,select,textarea,[data-copy]'))return;
  var c=e.target.closest('[data-href]'); if(!c)return;
  if(window.getSelection && String(window.getSelection()).length) return;
  go(c.getAttribute('data-href'));
});
function go(h){ if(h.charAt(0)==='@'){var t=document.getElementById(h.slice(1)); if(t) t.scrollIntoView({behavior:'smooth',block:'start'}); return;} location.hash=h; }
document.addEventListener('keydown',function(e){var c=e.target.closest&&e.target.closest('[data-href]');if(c&&e.target===c&&(e.key==='Enter'||e.key===' ')){e.preventDefault();go(c.getAttribute('data-href'));}});
document.addEventListener('click',function(e){var b=e.target.closest('[data-copy]');if(!b)return;var t=b.getAttribute('data-copy');
  var done=function(){var o=b.textContent;b.textContent='Copied \u2713';setTimeout(function(){b.textContent=o;},1200);};
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done,function(){fallback(t);done();});}else{fallback(t);done();}});
function fallback(t){var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');}catch(e){}ta.remove();}

// Five sections, in the order a reader asks: what needs me, what does the app do, when does it ship, how is it structured, where did it come from.
var PAGES = [['overview','Overview'],['features','Features'],['roadmap','Roadmap'],['blueprint','Blueprint'],['ideas','Ideas']];
document.getElementById('brand').innerHTML = esc(D.project)+'<small>OpenIdea</small>';
var modeEl = document.getElementById('mode'); modeEl.textContent = CLIENT?'Client view \u00b7 safe to share':'Internal \u00b7 do not share'; if(CLIENT) modeEl.className='mode client';
document.title = D.project + ' · OpenIdea';

function overview(){
  var c = D.counts, h = '<h1>'+esc(D.project)+'</h1><p class="lede">How clear and validated this product definition is right now, and what needs your decision.</p>';
  var depthPct = D.depth && D.depth.score!=null ? Math.round(D.depth.score*100) : null;
  var ready = (c.byStatus.ready||0), cap = (c.byStatus.captured||0);
  h += '<div class="grid g4">';
  h += '<div class="card stat '+(c.openHigh?'bad primary':'good')+'" '+(D.queue.length?'data-href="@decide" tabindex="0"':'')+'><div class="v">'+c.openHigh+'</div><div class="k">Open high-impact gaps</div><div class="s">'+((c.gapStatus.open||0)+(c.gapStatus.validating||0))+' open in total</div></div>';
  h += '<div class="card stat" data-href="ideas" tabindex="0"><div class="v">'+ready+' / '+(ready+cap)+'</div><div class="k">Ideas ready</div><div class="s">'+cap+' still captured</div></div>';
  h += '<div class="card stat '+(depthPct==null?'':depthPct<60?'bad':depthPct<85?'warn':'good')+'"'+(D.blueprint?' data-href="blueprint" tabindex="0"':'')+'><div class="v">'+(depthPct==null?'–':depthPct+'%')+'</div><div class="k">Blueprint depth</div><div class="s">'+(D.depth?D.depth.filled+'/'+D.depth.total+' mandatory slots':'No blueprint yet')+'</div>'+(depthPct==null?'':'<div class="depth"><span style="width:'+depthPct+'%;background:'+(depthPct>=85?'var(--green)':depthPct>=60?'var(--amber)':'var(--red)')+'"></span></div>')+'</div>';
  h += '<div class="card stat '+(D.assumptions?'warn':'')+'"'+(D.blueprint?' data-href="blueprint" tabindex="0"':'')+'><div class="v">'+D.assumptions+'</div><div class="k">Hidden assumptions</div><div class="s">Blueprint elements with no source idea</div></div>';
  if(!CLIENT) h += '<div class="card stat '+(c.errors?'bad':'good')+'" data-href="issues" tabindex="0"><div class="v">'+c.errors+'</div><div class="k">Check errors</div><div class="s">'+c.warnings+' warnings</div></div>';
  h += '</div>';
  h += '<h2 id="decide">Decide next</h2>'+queueCards(D.queue);
  var rest = D.gaps.filter(function(g){return D.queue.indexOf(g.data.id)<0;});
  if(rest.length) h += '<details class="fold"><summary>All other gaps ('+rest.length+')</summary>'+gapTable(rest)+'</details>';
  h += '<h2>Milestone gates</h2>' + milestoneTable();
  h += '<details class="fold"><summary>How to read colours and labels</summary><div class="card legend-card"><div class="lg"><span class="sw" style="background:var(--red)"></span><div><strong>Red</strong>: needs a decision or blocks progress (open gap, high impact, error, not defined)</div></div>'+
    '<div class="lg"><span class="sw" style="background:var(--amber)"></span><div><strong>Amber</strong>: in progress or worth a look (captured, validating, draft, medium, warning)</div></div>'+
    '<div class="lg"><span class="sw" style="background:var(--orange)"></span><div><strong>Orange</strong>: risk knowingly accepted</div></div>'+
    '<div class="lg"><span class="sw" style="background:var(--green)"></span><div><strong>Green</strong>: done or safe (ready, resolved, approved, gate clear)</div></div>'+
    '<div class="lg"><span class="sw" style="background:var(--purple)"></span><div><strong>Purple</strong>: handed off to OpenSpec (promoted)</div></div>'+
    '<div class="lg"><span class="sw" style="background:var(--gray)"></span><div><strong>Grey</strong>: inactive or low (parked, killed, dismissed, low impact)</div></div>'+
    '<div class="lg"><span class="sw" style="background:var(--accent)"></span><div><strong>Blue</strong>: clickable. A card or row with \u203a opens</div></div>'+
    '<p class="meta" style="margin:8px 0 0">Filled labels show <strong>severity</strong>, labels with a dot show <strong>status</strong>, plain grey text is just a <strong>tag</strong>.</p></div></details>';
  if(D.brief) h += '<details class="fold"><summary>Product brief</summary><div class="card md">'+md(D.brief.body.replace(/^#\s+.*$/m,''))+'</div></details>';
  return h;
}
function milestoneTable(){
  if(!D.milestones.length) return '<p class="empty">No ROADMAP.md yet. Run /openidea:plan.</p>';
  return '<table><thead><tr><th>Milestone</th><th>ID</th><th>Status</th><th>Gate</th><th>Ideas</th></tr></thead><tbody>'+D.milestones.map(function(m){
    var gate = m.blockingGaps.length?pill(m.blockingGaps.length+' high gap'+(m.blockingGaps.length>1?'s':'')+' open','blocked'):pill('clear','clear');
    return '<tr><td><strong>'+esc(m.name)+'</strong></td><td><code>'+esc(m.id)+'</code></td><td>'+pill(m.status)+'</td><td>'+gate+(m.blockingGaps.length?'<div class="meta">'+m.blockingGaps.map(gapLink).join(', ')+'</div>':'')+'</td><td>'+m.ideas.map(ideaLink).join(', ')+'</td></tr>';}).join('')+'</tbody></table>';
}
function queueCards(ids, noRank){
  if(!ids.length) return '<p class="empty">No open gaps. Run /openidea:evaluate to look for blind spots.</p>';
  return '<div class="grid g2">'+ids.map(function(id,n){var g=gapById[id];if(!g)return '';var d=g.data;
    var body = CLIENT?'':sectionOf(g.body,'Proposed validation')||sectionOf(g.body,'Usulan validasi');
    return '<div class="card" data-href="gap/'+encodeURIComponent(id)+'" tabindex="0"><div class="chips">'+(noRank?'':pill('#'+(n+1),'rank'))+pill(d.impact)+pill(d.kind,'tag')+pill(d.status)+'</div><div class="q">'+esc(d.question)+'</div>'+
      (body?'<div class="md meta">'+md(body)+'</div>':'')+
      '<div class="meta">Ideas: '+((d.ideas||[]).map(function(x){return esc(x);}).join(', ')||'project-wide')+'</div>'+
      (CLIENT?'':copyBtn('/openidea:resolve '+id))+'</div>';}).join('')+'</div>';
}
function sectionOf(body,title){var m=String(body||'').split(/^##\s+/m).filter(function(s){return s.toLowerCase().indexOf(title.toLowerCase())===0;})[0];return m?m.replace(/^[^\n]*\n/,'').trim():'';}
function gapTable(list){
  if(!list.length) return '<p class="empty">No gaps recorded.</p>';
  var rank={high:3,medium:2,low:1},st={open:0,validating:1,accepted_risk:2,resolved:3,dismissed:4};
  list = list.slice().sort(function(a,b){return (st[a.data.status]-st[b.data.status])||(rank[b.data.impact]-rank[a.data.impact])||String(a.data.id).localeCompare(b.data.id);});
  return '<table><thead><tr><th>Gap</th><th>Question</th><th>Kind</th><th>Impact</th><th>Status</th><th>Ideas</th></tr></thead><tbody>'+list.map(function(g){var d=g.data;
    return '<tr><td>'+gapLink(d.id)+'</td><td>'+esc(d.question)+'</td><td>'+esc(d.kind)+'</td><td>'+pill(d.impact)+'</td><td>'+pill(d.status)+'</td><td>'+(d.ideas||[]).map(ideaLink).join(', ')+'</td></tr>';}).join('')+'</tbody></table>';
}
function gap(id){
  var g = gapById[id]; if(!g) return '<p>Gap not found.</p>';
  var d = g.data;
  var h = '<p class="back"><a href="#overview">← Overview</a></p><h1>'+esc(d.id)+'</h1><div class="chips">'+pill(d.impact)+pill(d.kind,'tag')+pill('confidence '+d.confidence,'tag')+pill(d.status)+(d.found_by?pill('found by '+d.found_by,'tag'):'')+'</div>';
  h += '<div class="q" style="margin-top:12px">'+esc(d.question)+'</div>';
  if(!CLIENT) h += copyBtn('/openidea:resolve '+d.id);
  h += '<p class="meta">Ideas: '+((d.ideas||[]).map(ideaLink).join(', ')||'project-wide')+(d.sources&&d.sources.length?' · Sources: '+d.sources.map(function(s){return '<code>'+esc(s)+'</code>';}).join(' '):'')+'</p>';
  if(d.resolution) h += '<div class="card"><strong>Resolution:</strong> '+inline(d.resolution)+'</div>';
  if(g.body && g.body.trim()) h += '<div class="card md" style="margin-top:12px">'+md(g.body)+'</div>';
  return h;
}
function statusBar(){
  var c=D.counts, order=[['ready','var(--green)'],['captured','var(--amber)'],['parked','var(--gray)'],['promoted','var(--purple)'],['merged','var(--gray-soft)'],['split','var(--gray-soft)'],['killed','var(--dim)']];
  var total = order.reduce(function(s,o){return s+(c.byStatus[o[0]]||0);},0); if(!total) return '';
  return '<div class="card" style="margin-bottom:12px"><div class="bar-status">'+order.map(function(o){var n=c.byStatus[o[0]]||0;return n?'<span title="'+o[0]+': '+n+'" style="width:'+(n/total*100)+'%;background:'+o[1]+'"></span>':'';}).join('')+'</div>'+
    '<div class="legend">'+order.filter(function(o){return c.byStatus[o[0]];}).map(function(o){return '<span><span class="dot" style="background:'+o[1]+'"></span>'+o[0]+' '+c.byStatus[o[0]]+'</span>';}).join('')+'</div></div>';
}
function ideas(){
  var cats = {}; D.ideas.forEach(function(i){if(i.data.category)cats[i.data.category]=1;});
  var h = '<h1>Ideas</h1><p class="lede">The source of everything else: every idea on disk, active and archived. Open one for its full definition, its gaps, and what the blueprint derives from it.</p>'+statusBar();
  h += '<div class="filters"><input id="fq" placeholder="Search id or category"><select id="fs"><option value="">All statuses</option>'+['captured','ready','parked','promoted','merged','split','killed'].map(function(s){return '<option>'+s+'</option>';}).join('')+'</select><select id="fc"><option value="">All categories</option>'+Object.keys(cats).sort().map(function(c){return '<option>'+esc(c)+'</option>';}).join('')+'</select></div><div id="itable"></div>';
  setTimeout(function(){var q=document.getElementById('fq'),s=document.getElementById('fs'),c=document.getElementById('fc');
    function draw(){var qv=q.value.toLowerCase();var list=D.ideas.filter(function(i){return (!s.value||i.data.status===s.value)&&(!c.value||i.data.category===c.value)&&(!qv||(i.data.id+' '+(i.data.category||'')).toLowerCase().indexOf(qv)>=0);});
      var openBy={};D.gaps.filter(openGap).forEach(function(g){(g.data.ideas||[]).forEach(function(id){openBy[id]=(openBy[id]||0)+1;});});
      document.getElementById('itable').innerHTML = list.length?'<table><thead><tr><th>Idea</th><th>Status</th><th>Type</th><th>Category</th><th>Updated</th><th>Open gaps</th></tr></thead><tbody>'+list.map(function(i){var d=i.data;
        return '<tr><td>'+ideaLink(d.id)+(d.needs_clarification?' '+pill('needs clarification','attention'):'')+'</td><td>'+pill(d.status)+'</td><td>'+esc(d.type||'feature')+'</td><td>'+esc(d.category||'')+'</td><td>'+esc(d.updated||'')+'</td><td>'+(openBy[d.id]?pill(openBy[d.id]+' open gap'+(openBy[d.id]>1?'s':''),'open'):'')+'</td></tr>';}).join('')+'</tbody></table>':'<p class="empty">No ideas match.</p>';}
    [q,s,c].forEach(function(e){e.addEventListener('input',draw);});draw();},0);
  return h;
}
function idea(id){
  var i = ideaById[id]; if(!i) return '<p>Idea not found.</p>';
  var d = i.data;
  var h = '<p class="back"><a href="#ideas">← Ideas</a></p><h1>'+esc(d.id)+'</h1><div class="chips">'+pill(d.status)+pill(d.type||'feature','tag')+(d.category?'<span class="chip">'+esc(d.category)+'</span>':'')+(d.needs_clarification?pill('needs clarification','attention'):'')+'</div>';
  var ms = D.milestones.filter(function(m){return m.ideas.indexOf(d.id)>=0;})[0];
  var facts = [];
  if(ms) facts.push('Milestone: <strong>'+esc(ms.name)+'</strong>');
  if(d.depends_on&&d.depends_on.length) facts.push('Depends on: '+d.depends_on.map(ideaLink).join(', '));
  if(d.merged_into) facts.push('Merged into: '+ideaLink(d.merged_into));
  if(d.split_into&&d.split_into.length) facts.push('Split into: '+d.split_into.map(ideaLink).join(', '));
  if(d.promoted_to) facts.push('Promoted to: <code>'+esc(d.promoted_to)+'</code>');
  if(d.replaces) facts.push('Replaces: '+esc(d.replaces));
  if(d.triage_note) facts.push('Triage note: '+esc(d.triage_note));
  if(facts.length) h += '<p class="meta">'+facts.join(' · ')+'</p>';
  h += '<div class="grid g2" style="margin-top:12px"><div class="card md">'+md(i.body)+'</div><div>';
  var gs = D.gaps.filter(function(g){return (g.data.ideas||[]).indexOf(d.id)>=0;});
  h += '<h3>Gaps</h3>'+(gs.length?gs.map(function(g){return '<div class="issue">'+pill(g.data.impact)+' '+pill(g.data.status)+' '+gapLink(g.data.id)+'<div>'+esc(g.data.question)+'</div></div>';}).join(''):'<p class="empty">No gaps linked.</p>');
  var els = bpEls().filter(function(x){return (x.el.derived_from||[]).indexOf(d.id)>=0;});
  h += '<h3>Blueprint derived from this idea</h3>'+(els.length?'<div class="chips">'+els.map(function(x){return '<a class="jump" href="#blueprint/'+x.kind+'/'+encodeURIComponent(x.el.id)+'">'+esc(D.kinds[x.kind].label)+': '+esc(x.el.name||x.el.id)+'</a>';}).join('')+'</div>':'<p class="empty">Nothing yet. Either the blueprint is stale or this idea is too vague to build.</p>');
  if(d.history&&d.history.length) h += '<h3>History</h3><table><tbody>'+d.history.map(function(e){return '<tr><td>'+esc(e.date)+'</td><td>'+pill(e.status)+'</td><td class="meta">'+esc(e.note||e.reason||'')+'</td></tr>';}).join('')+'</tbody></table>';
  return h+'</div></div>';
}
function fmt(v){if(v==null||v==='')return '';if(Array.isArray(v))return v.map(function(x){return typeof x==='object'?esc(JSON.stringify(x)):esc(x);}).join('<br>');if(typeof v==='object')return Object.keys(v).map(function(k){return '<span class="meta">'+esc(k)+':</span> '+fmt(v[k]);}).join('<br>');return esc(v);}
function blueprint(focusKind, focusId){
  var h = '<h1>Blueprint</h1>';
  if(!D.blueprint) return h+'<p class="empty">No blueprint yet. Run /openidea:blueprint to derive one from the ideas.</p>';
  h += '<p class="lede">Derived from the ideas, never edited by hand. Every element shows the ideas it comes from; red slots are mandatory details nobody has defined yet.'+(D.blueprint.generated?' Generated '+esc(D.blueprint.generated)+'.':'')+'</p>';
  h += '<div class="toc"><a class="jump'+(!focusKind?' on':'')+'" href="#blueprint">All</a>'+Object.keys(D.kinds).map(function(k){var n=(D.blueprint[k]||[]).length;return n?'<a class="jump'+(focusKind===k?' on':'')+'" href="#blueprint/'+k+'">'+esc(D.kinds[k].plural)+' · '+n+'</a>':'';}).join('')+((D.blueprint.permissions||[]).length?'<a class="jump'+(focusKind==='permissions'?' on':'')+'" href="#blueprint/permissions">Permission matrix</a>':'')+(D.diagrams?'<a class="jump" href="#diagrams">All diagrams</a>':'')+'</div>';
  if(!focusKind && D.diagrams) h += '<h2>System context</h2>'+diagramBlock('Who and what the system talks to', D.diagrams.context, 'Container architecture is a design decision and belongs in the OpenSpec design, not here.');
  if(!focusKind || focusKind==='permissions') h += matrix();
  Object.keys(D.kinds).forEach(function(k){
    if(focusKind && focusKind!=='permissions' && focusKind!==k) return;
    var list = D.blueprint[k]||[]; if(!list.length) return;
    h += '<h2 id="k-'+k+'">'+esc(D.kinds[k].plural)+'</h2><div class="grid g2">';
    list.forEach(function(el){
      if(focusId && el.id!==focusId) return;
      var slots = D.kinds[k].slots;
      h += '<div class="card el"><h3>'+esc(el.name||el.id)+' <code>'+esc(el.id)+'</code>'+(el.assumption?pill('assumption'):'')+'</h3>';
      h += '<div class="chips" style="margin:4px 0 8px">'+((el.derived_from||[]).length?'<span class="src">From idea: '+(el.derived_from||[]).map(ideaLink).join(', ')+'</span>':'<span class="pill p-assumption">no source idea</span>')+'</div>';
      slots.filter(function(s){return s!=='name';}).forEach(function(s){var v=get(el,s);h+='<div class="slot"><span class="k">'+esc(s)+'</span>'+(filled(v)?'<span>'+fmt(v)+'</span>':'<span class="miss">Not defined</span>')+'</div>';});
      Object.keys(el).forEach(function(key){if(['id','name','derived_from','assumption'].indexOf(key)>=0)return;if(slots.some(function(s){return s===key||s.indexOf(key+'.')===0;}))return;h+='<div class="slot"><span class="k">'+esc(key)+'</span><span>'+fmt(el[key])+'</span></div>';});
      var sm = k==='entities' && D.diagrams && D.diagrams.states.filter(function(x){return x.id===el.id;})[0];
      if(sm) h += '<div class="diagram" style="margin-top:10px"><p class="meta" style="margin:0 0 4px">States (red = unreachable)</p><pre class="mermaid">'+esc(sm.src)+'</pre></div>';
      h += '</div>';
    });
    h += '</div>';
  });
  if(focusId) h = '<p class="back"><a href="#blueprint">← Whole blueprint</a></p>'+h;
  return h;
}
function matrix(){
  var perms = D.blueprint.permissions||[]; if(!perms.length) return '';
  var actors = (D.blueprint.actors||[]).map(function(a){return a.id;});
  perms.forEach(function(p){if(actors.indexOf(p.actor)<0)actors.push(p.actor);});
  var cols = []; perms.forEach(function(p){var c=p.action+(p.entity?' '+p.entity:'');if(cols.indexOf(c)<0)cols.push(c);});
  var cell = {}; perms.forEach(function(p){var key=p.actor+'|'+p.action+(p.entity?' '+p.entity:'');if(cell[key]!==undefined && cell[key]!==p.allow)cell[key]='conflict';else cell[key]=p.allow;});
  var h = '<h2 id="k-permissions">Permission matrix</h2><p class="meta">Who may do what. A red cell means two ideas disagree: that is a gap to resolve, not a typo.</p><div><table class="matrix"><thead><tr><th>Actor</th>'+cols.map(function(c){return '<th>'+esc(c)+'</th>';}).join('')+'</tr></thead><tbody>';
  actors.forEach(function(a){h+='<tr><td><strong>'+esc(a)+'</strong></td>'+cols.map(function(c){var v=cell[a+'|'+c];return v==='conflict'?'<td class="conflict">conflict</td>':v===true?'<td class="yes">✓</td>':v===false?'<td class="no">✗</td>':'<td class="meta">·</td>';}).join('')+'</tr>';});
  return h+'</tbody></table></div>';
}
function roadmap(){
  var h = '<h1>Roadmap</h1><p class="lede">Milestones in execution order, top to bottom. A milestone can move to OpenSpec only when its gate is clear.</p>';
  if(!D.milestones.length) return h+'<p class="empty">No ROADMAP.md yet. Run /openidea:plan.</p>';
  D.milestones.forEach(function(m,n){
    h += '<div class="card" style="margin-bottom:12px"><h3 style="margin-top:0">'+(n+1)+'. '+esc(m.name)+' <code>'+esc(m.id)+'</code> '+pill(m.status)+' '+(m.blockingGaps.length?pill('gate blocked','blocked'):pill('gate clear','clear'))+'</h3>';
    if(m.approvedIn) h += '<p class="meta">Approved in '+esc(m.approvedIn)+'</p>';
    h += '<table><thead><tr><th>Idea</th><th>Status</th><th>Category</th><th>Depends on</th></tr></thead><tbody>'+m.ideas.map(function(id){var i=ideaById[id];var d=i?i.data:{};return '<tr><td>'+ideaLink(id)+'</td><td>'+(d.status?pill(d.status):'')+'</td><td>'+esc(d.category||'')+'</td><td>'+((d.depends_on||[]).map(ideaLink).join(', '))+'</td></tr>';}).join('')+'</tbody></table>';
    if(m.blockingGaps.length) h += '<p class="meta" style="margin-top:8px">Blocked by: '+m.blockingGaps.map(gapLink).join(', ')+'</p>';
    h += '</div>';
  });
  return h;
}
function issues(){
  var h = '<p class="back"><a href="#overview">← Overview</a></p><h1>Checks</h1><p class="lede">Deterministic checks from <code>openidea validate</code>. Errors break a rule; warnings deserve a look.</p>';
  if(!D.issues.length) return h+'<p class="empty">All checks pass.</p>';
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
  var h = '<h1>Features</h1><p class="lede">One feature per flow in the blueprint: who uses it, on which screens, what done looks like, and what is still open or undefined.</p>';
  if(!D.features.length) return h+'<p class="empty">No blueprint flows yet. Run /openidea:blueprint.</p>';
  h += '<table><thead><tr><th>Feature</th><th>Actor</th><th>Status</th><th>Screens</th><th>Done looks like</th><th>Open gaps</th><th>Milestone</th><th>Not defined</th></tr></thead><tbody>';
  D.features.forEach(function(f){
    h += '<tr><td><a href="#feature/'+encodeURIComponent(f.id)+'">'+esc(f.name)+'</a>'+(f.assumption?' '+pill('assumption'):'')+'<div class="meta">from '+(f.ideas.map(ideaLink).join(', ')||'no idea')+'</div></td>'+
      '<td>'+esc(f.actor||'')+'</td><td>'+f.statuses.map(function(x){return pill(x);}).join(' ')+'</td><td>'+esc(f.screens.join(', '))+'</td><td>'+esc(f.done.join(' / '))+'</td>'+
      '<td>'+f.gaps.map(gapLink).join(', ')+'</td><td>'+esc(f.milestones.join(', '))+'</td><td>'+(f.missing.length?'<span class="miss-t">'+esc(f.missing.join(', '))+'</span>':'')+'</td></tr>';
  });
  return h+'</tbody></table>';
}
function feature(id){
  var f = D.features.filter(function(x){return x.id===id;})[0]; if(!f) return '<p>Feature not found.</p>';
  var h = '<p class="back"><a href="#features">← Features</a></p><h1>'+esc(f.name)+'</h1><div class="chips">'+f.statuses.map(function(x){return pill(x);}).join('')+(f.assumption?pill('assumption'):'')+(f.milestones.length?pill(f.milestones.join(', '),'tag'):'')+'</div>';
  var rows = [['Who',esc(f.actor||'')],['From ideas',f.ideas.map(ideaLink).join(', ')],['Screens',esc(f.screens.join(', '))],['Permissions',esc(f.permissions.join(', '))],['Done looks like',esc(f.done.join(' / '))]];
  h += '<div class="card" style="margin-top:12px">'+rows.map(function(r){return '<div class="slot"><span class="k">'+r[0]+'</span>'+(r[1]?'<span>'+r[1]+'</span>':'<span class="miss">Not defined</span>')+'</div>';}).join('')+
    (f.missing.length?'<div class="slot"><span class="k">Not defined yet</span><span class="miss">'+esc(f.missing.join(', '))+'</span></div>':'')+'</div>';
  if(f.gaps.length) h += '<h2>Open gaps</h2>'+queueCards(f.gaps, true);
  var a = D.diagrams && D.diagrams.activity.filter(function(x){return x.id===id;})[0];
  if(a) h += '<h2>Activity</h2>'+diagramBlock(a.name, a.src, 'Red steps or branches are not defined yet.');
  h += '<p class="meta"><a href="#blueprint/flows/'+encodeURIComponent(id)+'">See the raw blueprint flow</a></p>';
  return h;
}
function diagramBlock(title, src, sub){
  return '<div class="card diagram"><h3 style="margin-top:0">'+esc(title)+'</h3>'+(sub?'<p class="meta">'+sub+'</p>':'')+'<pre class="mermaid">'+esc(src)+'</pre></div>';
}
function diagrams(focus){
  var h = '<p class="back"><a href="#blueprint">← Blueprint</a></p><h1>Diagrams</h1><p class="lede">Generated from the blueprint by code, never drawn by hand. Red nodes are steps, branches, or states nobody has defined yet: each is a blind spot to resolve.</p>';
  if(!D.diagrams) return h+'<p class="empty">No blueprint yet. Run /openidea:blueprint.</p>';
  h += '<div class="toc"><a class="jump'+(!focus?' on':'')+'" href="#diagrams">All</a><a class="jump'+(focus==='context'?' on':'')+'" href="#diagrams/context">System context</a>'+D.diagrams.activity.map(function(a){return '<a class="jump'+(focus===a.id?' on':'')+'" href="#diagrams/'+encodeURIComponent(a.id)+'">'+esc(a.name)+'</a>';}).join('')+D.diagrams.states.map(function(a){return '<a class="jump'+(focus==='state-'+a.id?' on':'')+'" href="#diagrams/state-'+encodeURIComponent(a.id)+'">'+esc(a.name)+' states</a>';}).join('')+'</div>';
  if(!focus || focus==='context') h += '<h2>System context</h2>'+diagramBlock('Who and what the system talks to', D.diagrams.context, 'Actors on the left, external systems with the direction of data. Container architecture is a design decision and belongs in the OpenSpec design, not here.');
  var acts = D.diagrams.activity.filter(function(a){return !focus||focus===a.id;});
  if(acts.length) h += '<h2>Activity per flow</h2>'+acts.map(function(a){return diagramBlock(a.name, a.src);}).join('');
  var sts = D.diagrams.states.filter(function(a){return !focus||focus==='state-'+a.id;});
  if(sts.length) h += '<h2>State machines</h2>'+sts.map(function(a){return diagramBlock(a.name, a.src, 'Red states can never be reached.');}).join('');
  if(!focus && !D.diagrams.states.length) h += '<h2>State machines</h2><p class="empty">No entity defines states yet. Entities with a status attribute should.</p>';
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
function offline(nodes){ [].forEach.call(nodes,function(n){ if(n.previousElementSibling&&n.previousElementSibling.className==='offline-note')return; var p=document.createElement('p'); p.className='offline-note'; p.textContent='Offline: the diagram library could not load, so the Mermaid source is shown. It renders on GitHub in blueprint/diagrams.md.'; n.parentNode.insertBefore(p,n); n.classList.add('src'); }); }
function route(){
  var parts = (location.hash.replace(/^#/,'')||'overview').split('/').map(decodeURIComponent);
  var page = parts[0], html;
  if(page==='queue'){page='overview';html=overview();setTimeout(function(){go('@decide');},0);} else if(page==='feature') html=feature(parts[1]); else if(page==='gap') html=gap(parts[1]); else if(page==='ideas') html=ideas(); else if(page==='idea') html=idea(parts[1]);
  else if(page==='blueprint') html=blueprint(parts[1],parts[2]); else if(page==='features') html=features(); else if(page==='diagrams') html=diagrams(parts[1]); else if(page==='roadmap') html=roadmap(); else if(page==='issues'&&!CLIENT) html=issues(); else {page='overview';html=overview();}
  var navKey = {gap:'overview',issues:'overview',idea:'ideas',feature:'features',diagrams:'blueprint'}[page]||page;
  var openN = D.gaps.filter(openGap).length;
  document.getElementById('nav').innerHTML = PAGES.map(function(p){return '<a href="#'+p[0]+'"'+(p[0]===navKey?' class="on"':'')+'>'+p[1]+(p[0]==='overview'&&openN?'<span class="badge">'+openN+'</span>':'')+'</a>';}).join('');
  app.innerHTML = html; labelCells(app); drawMermaid(); if(parts[0]!=='queue') window.scrollTo(0,0);
}
window.addEventListener('hashchange',route); route();
})();
</script>
</body>
</html>
`;
