// Renders a single self-contained HTML dashboard: no server, no build step, no network.
// The markdown files stay the source of truth; this is a read-only view of them.
import { analyze } from './analyze.mjs';
import { BLUEPRINT_KINDS, depthReport } from './validate.mjs';

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
  return {
    mode,
    project: brief?.body.match(/^#\s+(.+)$/m)?.[1] || 'OpenIdea project',
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
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OpenIdea Dashboard</title>
<style>
:root{--bg:#fbfbfa;--surface:#fff;--sunk:#f3f4f2;--border:#e4e5e1;--text:#1b1d1a;--muted:#5d625a;--dim:#8b9087;--accent:#2f6b55;--accent-soft:#e4f0ea;--red:#b3261e;--red-soft:#fbe9e7;--amber:#8a5a00;--amber-soft:#fdf1d8;--green:#1f7a4c;--green-soft:#e3f4ea;--blue:#2457a6;--blue-soft:#e6eefb}
@media (prefers-color-scheme:dark){:root{--bg:#121412;--surface:#191c19;--sunk:#202420;--border:#2c312c;--text:#e9ece7;--muted:#a7ada4;--dim:#737a70;--accent:#6fc3a0;--accent-soft:#1c2e26;--red:#ff8a80;--red-soft:#33191a;--amber:#f0c060;--amber-soft:#2e2615;--green:#6fd3a0;--green-soft:#17291f;--blue:#8db4f5;--blue-soft:#18233a}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
code{font:12.5px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:var(--sunk);padding:1px 5px;border-radius:4px}
header{position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:1px solid var(--border)}
.bar{max-width:1180px;margin:0 auto;padding:12px 20px;display:flex;gap:18px;align-items:center;flex-wrap:wrap}
.brand{font-weight:700}.brand small{color:var(--dim);font-weight:500;margin-left:6px}
nav{display:flex;gap:4px;flex-wrap:wrap}
nav a{color:var(--muted);padding:6px 10px;border-radius:7px;font-size:14px}
nav a.on{background:var(--accent-soft);color:var(--accent);font-weight:600}nav a:hover{text-decoration:none;color:var(--text)}
.mode{margin-left:auto;font-size:12px;padding:3px 9px;border-radius:99px;background:var(--sunk);color:var(--muted)}
.mode.client{background:var(--blue-soft);color:var(--blue)}
main{max-width:1180px;margin:0 auto;padding:24px 20px 80px}
h1{font-size:24px;margin:0 0 4px;letter-spacing:-.01em}h2{font-size:17px;margin:28px 0 10px}h3{font-size:15px;margin:18px 0 6px}
.lede{color:var(--muted);margin:0 0 20px;max-width:760px}
.grid{display:grid;gap:12px}.g4{grid-template-columns:repeat(auto-fit,minmax(190px,1fr))}.g2{grid-template-columns:repeat(auto-fit,minmax(320px,1fr))}
.card{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 16px}
.stat .v{font-size:28px;font-weight:700;letter-spacing:-.02em}.stat .k{color:var(--muted);font-size:13px}.stat .s{color:var(--dim);font-size:12px;margin-top:2px}
.stat.bad .v{color:var(--red)}.stat.warn .v{color:var(--amber)}.stat.good .v{color:var(--green)}
table{width:100%;border-collapse:collapse;background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;font-size:14px}
th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--border);vertical-align:top}
th{background:var(--sunk);color:var(--muted);font-weight:600;font-size:12.5px;white-space:nowrap}
tr:last-child td{border-bottom:0}tbody tr:hover{background:var(--sunk)}
.pill{display:inline-block;font-size:11.5px;font-weight:600;padding:1px 8px;border-radius:99px;background:var(--sunk);color:var(--muted);white-space:nowrap}
.p-high,.p-error,.p-killed,.p-blocked{background:var(--red-soft);color:var(--red)}
.p-medium,.p-warning,.p-validating,.p-captured,.p-draft,.p-assumption{background:var(--amber-soft);color:var(--amber)}
.p-low,.p-info,.p-parked{background:var(--sunk);color:var(--muted)}
.p-ready,.p-resolved,.p-approved,.p-clear{background:var(--green-soft);color:var(--green)}
.p-promoted,.p-open{background:var(--blue-soft);color:var(--blue)}
.p-accepted_risk{background:var(--amber-soft);color:var(--amber)}
.chips{display:flex;gap:6px;flex-wrap:wrap}
.chip{font-size:12.5px;padding:2px 8px;border:1px solid var(--border);border-radius:6px;background:var(--surface)}
.q{font-size:16px;font-weight:600;margin:4px 0 8px}
.meta{color:var(--muted);font-size:13px}
.filters{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}
input,select{font:inherit;font-size:14px;padding:6px 9px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text)}
button{font:inherit;font-size:13px;padding:5px 10px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text);cursor:pointer}
button:hover{border-color:var(--accent);color:var(--accent)}
.md p{margin:0 0 10px}.md ul,.md ol{margin:0 0 10px;padding-left:22px}.md h1,.md h2,.md h3,.md h4{margin:16px 0 6px}.md pre{background:var(--sunk);padding:10px;border-radius:8px;overflow:auto}
.md table{margin:6px 0 12px}
.bar-status{display:flex;height:10px;border-radius:99px;overflow:hidden;background:var(--sunk);margin:8px 0}
.bar-status span{display:block;height:100%}
.legend{display:flex;gap:12px;flex-wrap:wrap;font-size:12.5px;color:var(--muted)}
.dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;vertical-align:middle}
.el{margin-bottom:10px}.el h3{margin:0 0 4px;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.slot{display:grid;grid-template-columns:150px 1fr;gap:8px;font-size:13.5px;padding:3px 0;border-top:1px dashed var(--border)}
.slot .k{color:var(--muted)}.slot .miss{color:var(--red);font-weight:600}
.matrix td,.matrix th{text-align:center}.matrix td:first-child,.matrix th:first-child{text-align:left}
.yes{color:var(--green);font-weight:700}.no{color:var(--red);font-weight:700}.conflict{background:var(--red-soft);color:var(--red);font-weight:700}
.empty{color:var(--dim);font-style:italic}
.issue{padding:8px 0;border-bottom:1px solid var(--border);font-size:14px}
.toc{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px}
.depth{height:8px;background:var(--sunk);border-radius:99px;overflow:hidden;margin-top:8px}.depth span{display:block;height:100%;background:var(--accent)}
.back{font-size:13px}
@media (max-width:640px){.slot{grid-template-columns:1fr}.mode{margin-left:0}}
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
function pill(v,cls){return '<span class="pill p-'+esc(cls||v)+'">'+esc(String(v).replace('_',' '))+'</span>';}
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
function copyBtn(text){return '<button data-copy="'+esc(text)+'">Copy '+esc(text)+'</button>';}
document.addEventListener('click',function(e){var b=e.target.closest('[data-copy]');if(!b)return;var t=b.getAttribute('data-copy');
  var done=function(){var o=b.textContent;b.textContent='Copied';setTimeout(function(){b.textContent=o;},1200);};
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(t).then(done,function(){fallback(t);done();});}else{fallback(t);done();}});
function fallback(t){var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');}catch(e){}ta.remove();}

var PAGES = [['overview','Overview'],['queue','Decision queue'],['ideas','Ideas'],['blueprint','Blueprint'],['roadmap','Roadmap']];
if(!CLIENT) PAGES.push(['issues','Checks']);
document.getElementById('brand').innerHTML = esc(D.project)+'<small>OpenIdea</small>';
var modeEl = document.getElementById('mode'); modeEl.textContent = CLIENT?'Client view':'Internal view'; if(CLIENT) modeEl.className='mode client';
document.title = D.project + ' · OpenIdea';

function overview(){
  var c = D.counts, h = '<h1>'+esc(D.project)+'</h1><p class="lede">How clear and validated this product definition is right now. Regenerate with <code>openidea dashboard</code> after any change.</p>';
  var depthPct = D.depth && D.depth.score!=null ? Math.round(D.depth.score*100) : null;
  var ready = (c.byStatus.ready||0), cap = (c.byStatus.captured||0);
  h += '<div class="grid g4">';
  h += '<div class="card stat '+(c.openHigh?'bad':'good')+'"><div class="v">'+c.openHigh+'</div><div class="k">Open high-impact gaps</div><div class="s">'+((c.gapStatus.open||0)+(c.gapStatus.validating||0))+' open in total</div></div>';
  h += '<div class="card stat"><div class="v">'+ready+' / '+(ready+cap)+'</div><div class="k">Ideas ready</div><div class="s">'+cap+' still captured</div></div>';
  h += '<div class="card stat '+(depthPct==null?'':depthPct<70?'warn':'good')+'"><div class="v">'+(depthPct==null?'–':depthPct+'%')+'</div><div class="k">Blueprint depth</div><div class="s">'+(D.depth?D.depth.filled+'/'+D.depth.total+' mandatory slots':'No blueprint yet')+'</div>'+(depthPct==null?'':'<div class="depth"><span style="width:'+depthPct+'%"></span></div>')+'</div>';
  h += '<div class="card stat '+(D.assumptions?'warn':'')+'"><div class="v">'+D.assumptions+'</div><div class="k">Hidden assumptions</div><div class="s">Blueprint elements with no source idea</div></div>';
  if(!CLIENT) h += '<div class="card stat '+(c.errors?'bad':'good')+'"><div class="v">'+c.errors+'</div><div class="k">Check errors</div><div class="s">'+c.warnings+' warnings · <a href="#issues">see checks</a></div></div>';
  h += '</div>';
  var order=[['ready','var(--green)'],['captured','var(--amber)'],['parked','var(--dim)'],['promoted','var(--blue)'],['merged','var(--border)'],['split','var(--border)'],['killed','var(--red)']];
  var total = order.reduce(function(s,o){return s+(c.byStatus[o[0]]||0);},0);
  h += '<h2>Ideas by status</h2><div class="card">';
  if(total){h+='<div class="bar-status">'+order.map(function(o){var n=c.byStatus[o[0]]||0;return n?'<span title="'+o[0]+': '+n+'" style="width:'+(n/total*100)+'%;background:'+o[1]+'"></span>':'';}).join('')+'</div>';
    h+='<div class="legend">'+order.filter(function(o){return c.byStatus[o[0]];}).map(function(o){return '<span><span class="dot" style="background:'+o[1]+'"></span>'+o[0]+' '+c.byStatus[o[0]]+'</span>';}).join('')+'</div>';}
  else h+='<span class="empty">No ideas yet.</span>';
  h += '</div>';
  h += '<h2>Milestones</h2>' + milestoneTable();
  h += '<h2>Decide next</h2>' + queueCards(D.queue.slice(0,3));
  if(D.brief) h += '<h2>Brief</h2><div class="card md">'+md(D.brief.body.replace(/^#\s+.*$/m,''))+'</div>';
  return h;
}
function milestoneTable(){
  if(!D.milestones.length) return '<p class="empty">No ROADMAP.md yet. Run /openidea:plan.</p>';
  return '<table><thead><tr><th>Milestone</th><th>ID</th><th>Status</th><th>Gate</th><th>Ideas</th></tr></thead><tbody>'+D.milestones.map(function(m){
    var gate = m.blockingGaps.length?pill(m.blockingGaps.length+' high gap'+(m.blockingGaps.length>1?'s':'')+' open','blocked'):pill('clear','clear');
    return '<tr><td><strong>'+esc(m.name)+'</strong></td><td><code>'+esc(m.id)+'</code></td><td>'+pill(m.status)+'</td><td>'+gate+(m.blockingGaps.length?'<div class="meta">'+m.blockingGaps.map(gapLink).join(', ')+'</div>':'')+'</td><td>'+m.ideas.map(ideaLink).join(', ')+'</td></tr>';}).join('')+'</tbody></table>';
}
function queueCards(ids){
  if(!ids.length) return '<p class="empty">No open gaps. Run /openidea:evaluate to look for blind spots.</p>';
  return '<div class="grid g2">'+ids.map(function(id,n){var g=gapById[id];if(!g)return '';var d=g.data;
    var body = CLIENT?'':sectionOf(g.body,'Proposed validation')||sectionOf(g.body,'Usulan validasi');
    return '<div class="card"><div class="chips">'+pill('#'+(n+1),'low')+pill(d.impact)+pill(d.kind,'low')+pill(d.status)+'</div><div class="q">'+esc(d.question)+'</div>'+
      (body?'<div class="md meta">'+md(body)+'</div>':'')+
      '<div class="meta">Ideas: '+((d.ideas||[]).map(ideaLink).join(', ')||'project-wide')+'</div>'+
      '<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap"><a href="#gap/'+encodeURIComponent(id)+'">Details</a>'+(CLIENT?'':copyBtn('/openidea:resolve '+id))+'</div></div>';}).join('')+'</div>';
}
function sectionOf(body,title){var m=String(body||'').split(/^##\s+/m).filter(function(s){return s.toLowerCase().indexOf(title.toLowerCase())===0;})[0];return m?m.replace(/^[^\n]*\n/,'').trim():'';}
function queue(){
  var open = D.gaps.filter(openGap);
  var h = '<h1>Decision queue</h1><p class="lede">The top '+D.queue.length+' open gaps, ranked by impact × confidence, cheapest validation first. These are the only things a human needs to decide right now.</p>'+queueCards(D.queue);
  var rest = open.filter(function(g){return D.queue.indexOf(g.data.id)<0;});
  h += '<h2>All gaps</h2>'+gapTable(D.gaps);
  if(rest.length) h = h.replace('</p>',' '+rest.length+' more open gaps wait below.</p>');
  return h;
}
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
  var h = '<p class="back"><a href="#queue">← Decision queue</a></p><h1>'+esc(d.id)+'</h1><div class="chips">'+pill(d.impact)+pill(d.kind,'low')+pill('confidence '+d.confidence,'low')+pill(d.status)+(d.found_by?pill('found by '+d.found_by,'low'):'')+'</div>';
  h += '<div class="q" style="margin-top:12px">'+esc(d.question)+'</div>';
  if(!CLIENT) h += '<p>'+copyBtn('/openidea:resolve '+d.id)+'</p>';
  h += '<p class="meta">Ideas: '+((d.ideas||[]).map(ideaLink).join(', ')||'project-wide')+(d.sources&&d.sources.length?' · Sources: '+d.sources.map(function(s){return '<code>'+esc(s)+'</code>';}).join(' '):'')+'</p>';
  if(d.resolution) h += '<div class="card"><strong>Resolution:</strong> '+inline(d.resolution)+'</div>';
  if(g.body && g.body.trim()) h += '<div class="card md" style="margin-top:12px">'+md(g.body)+'</div>';
  return h;
}
function ideas(){
  var cats = {}; D.ideas.forEach(function(i){if(i.data.category)cats[i.data.category]=1;});
  var h = '<h1>Ideas</h1><p class="lede">Every idea on disk, active and archived. Click one for its full definition, its gaps, and what the blueprint derives from it.</p>';
  h += '<div class="filters"><input id="fq" placeholder="Search id or category"><select id="fs"><option value="">All statuses</option>'+['captured','ready','parked','promoted','merged','split','killed'].map(function(s){return '<option>'+s+'</option>';}).join('')+'</select><select id="fc"><option value="">All categories</option>'+Object.keys(cats).sort().map(function(c){return '<option>'+esc(c)+'</option>';}).join('')+'</select></div><div id="itable"></div>';
  setTimeout(function(){var q=document.getElementById('fq'),s=document.getElementById('fs'),c=document.getElementById('fc');
    function draw(){var qv=q.value.toLowerCase();var list=D.ideas.filter(function(i){return (!s.value||i.data.status===s.value)&&(!c.value||i.data.category===c.value)&&(!qv||(i.data.id+' '+(i.data.category||'')).toLowerCase().indexOf(qv)>=0);});
      var openBy={};D.gaps.filter(openGap).forEach(function(g){(g.data.ideas||[]).forEach(function(id){openBy[id]=(openBy[id]||0)+1;});});
      document.getElementById('itable').innerHTML = list.length?'<table><thead><tr><th>Idea</th><th>Status</th><th>Type</th><th>Category</th><th>Updated</th><th>Open gaps</th></tr></thead><tbody>'+list.map(function(i){var d=i.data;
        return '<tr><td>'+ideaLink(d.id)+(d.needs_clarification?' '+pill('needs clarification','warning'):'')+'</td><td>'+pill(d.status)+'</td><td>'+esc(d.type||'feature')+'</td><td>'+esc(d.category||'')+'</td><td>'+esc(d.updated||'')+'</td><td>'+(openBy[d.id]?pill(openBy[d.id],'open'):'')+'</td></tr>';}).join('')+'</tbody></table>':'<p class="empty">No ideas match.</p>';}
    [q,s,c].forEach(function(e){e.addEventListener('input',draw);});draw();},0);
  return h;
}
function idea(id){
  var i = ideaById[id]; if(!i) return '<p>Idea not found.</p>';
  var d = i.data;
  var h = '<p class="back"><a href="#ideas">← Ideas</a></p><h1>'+esc(d.id)+'</h1><div class="chips">'+pill(d.status)+pill(d.type||'feature','low')+(d.category?'<span class="chip">'+esc(d.category)+'</span>':'')+(d.needs_clarification?pill('needs clarification','warning'):'')+'</div>';
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
  h += '<h3>Blueprint derived from this idea</h3>'+(els.length?'<div class="chips">'+els.map(function(x){return '<a class="chip" href="#blueprint/'+x.kind+'/'+encodeURIComponent(x.el.id)+'">'+esc(D.kinds[x.kind].label)+': '+esc(x.el.name||x.el.id)+'</a>';}).join('')+'</div>':'<p class="empty">Nothing yet. Either the blueprint is stale or this idea is too vague to build.</p>');
  if(d.history&&d.history.length) h += '<h3>History</h3><table><tbody>'+d.history.map(function(e){return '<tr><td>'+esc(e.date)+'</td><td>'+pill(e.status)+'</td><td class="meta">'+esc(e.note||e.reason||'')+'</td></tr>';}).join('')+'</tbody></table>';
  return h+'</div></div>';
}
function fmt(v){if(v==null||v==='')return '';if(Array.isArray(v))return v.map(function(x){return typeof x==='object'?esc(JSON.stringify(x)):esc(x);}).join('<br>');if(typeof v==='object')return Object.keys(v).map(function(k){return '<span class="meta">'+esc(k)+':</span> '+fmt(v[k]);}).join('<br>');return esc(v);}
function blueprint(focusKind, focusId){
  var h = '<h1>Blueprint</h1>';
  if(!D.blueprint) return h+'<p class="empty">No blueprint yet. Run /openidea:blueprint to derive one from the ideas.</p>';
  h += '<p class="lede">Derived from the ideas, never edited by hand. Every element shows the ideas it comes from; red slots are mandatory details nobody has defined yet.'+(D.blueprint.generated?' Generated '+esc(D.blueprint.generated)+'.':'')+'</p>';
  h += '<div class="toc">'+Object.keys(D.kinds).map(function(k){var n=(D.blueprint[k]||[]).length;return n?'<a class="chip" href="#blueprint/'+k+'">'+esc(D.kinds[k].plural)+' · '+n+'</a>':'';}).join('')+((D.blueprint.permissions||[]).length?'<a class="chip" href="#blueprint/permissions">Permission matrix</a>':'')+'</div>';
  if(!focusKind || focusKind==='permissions') h += matrix();
  Object.keys(D.kinds).forEach(function(k){
    if(focusKind && focusKind!=='permissions' && focusKind!==k) return;
    var list = D.blueprint[k]||[]; if(!list.length) return;
    h += '<h2 id="k-'+k+'">'+esc(D.kinds[k].plural)+'</h2><div class="grid g2">';
    list.forEach(function(el){
      if(focusId && el.id!==focusId) return;
      var slots = D.kinds[k].slots;
      h += '<div class="card el"><h3>'+esc(el.name||el.id)+' <code>'+esc(el.id)+'</code>'+(el.assumption?pill('assumption'):'')+'</h3>';
      h += '<div class="chips" style="margin:4px 0 8px">'+((el.derived_from||[]).length?(el.derived_from||[]).map(function(id){return '<span class="chip">from '+ideaLink(id)+'</span>';}).join(''):'<span class="pill p-assumption">no source idea</span>')+'</div>';
      slots.filter(function(s){return s!=='name';}).forEach(function(s){var v=get(el,s);h+='<div class="slot"><span class="k">'+esc(s)+'</span>'+(filled(v)?'<span>'+fmt(v)+'</span>':'<span class="miss">Not defined</span>')+'</div>';});
      Object.keys(el).forEach(function(key){if(['id','name','derived_from','assumption'].indexOf(key)>=0)return;if(slots.some(function(s){return s===key||s.indexOf(key+'.')===0;}))return;h+='<div class="slot"><span class="k">'+esc(key)+'</span><span>'+fmt(el[key])+'</span></div>';});
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
  var h = '<h2 id="k-permissions">Permission matrix</h2><p class="meta">Who may do what. A red cell means two ideas disagree: that is a gap to resolve, not a typo.</p><div style="overflow:auto"><table class="matrix"><thead><tr><th>Actor</th>'+cols.map(function(c){return '<th>'+esc(c)+'</th>';}).join('')+'</tr></thead><tbody>';
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
  var h = '<h1>Checks</h1><p class="lede">Deterministic checks from <code>openidea validate</code>. Errors break a rule; warnings deserve a look.</p>';
  if(!D.issues.length) return h+'<p class="empty">All checks pass.</p>';
  var order={error:0,warning:1,info:2};
  return h+D.issues.slice().sort(function(a,b){return order[a.level]-order[b.level];}).map(function(i){return '<div class="issue">'+pill(i.level)+' <code>'+esc(i.code)+'</code> <span class="meta">'+esc(i.file)+'</span><div>'+esc(i.message)+'</div></div>';}).join('');
}
function route(){
  var parts = (location.hash.replace(/^#/,'')||'overview').split('/').map(decodeURIComponent);
  var page = parts[0], html;
  if(page==='queue') html=queue(); else if(page==='gap') html=gap(parts[1]); else if(page==='ideas') html=ideas(); else if(page==='idea') html=idea(parts[1]);
  else if(page==='blueprint') html=blueprint(parts[1],parts[2]); else if(page==='roadmap') html=roadmap(); else if(page==='issues'&&!CLIENT) html=issues(); else {page='overview';html=overview();}
  var navKey = {gap:'queue',idea:'ideas'}[page]||page;
  document.getElementById('nav').innerHTML = PAGES.map(function(p){return '<a href="#'+p[0]+'"'+(p[0]===navKey?' class="on"':'')+'>'+p[1]+'</a>';}).join('');
  app.innerHTML = html; window.scrollTo(0,0);
}
window.addEventListener('hashchange',route); route();
})();
</script>
</body>
</html>
`;
