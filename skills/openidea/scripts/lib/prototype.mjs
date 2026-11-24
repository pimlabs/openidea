// A clickable prototype generated from blueprint.json: no design, no server, no network.
// It simulates what the blueprint defines (roles, flows, screens, data, state changes, permissions)
// and marks in red every behaviour the blueprint leaves undefined. Clicking through it is a
// walkthrough; anything that feels wrong is copied back as a gap (found_by: prototype).
import { PALETTE } from './dashboard.mjs';

const list = (v) => (Array.isArray(v) ? v : []);
const words = (s) => String(s || '').toLowerCase();

// Which entities a screen or flow shows: named in its text, or moved by its transitions.
function entitiesFor(bp, texts, flowIds) {
  const t = words(texts.join(' '));
  return list(bp.entities).filter((e) =>
    t.includes(words(e.name || e.id)) || t.includes(words(e.id)) ||
    list(e.transitions).some((tr) => flowIds.includes(tr.flow))).map((e) => e.id);
}

export function prototypePayload(p, projectName) {
  const bp = p.blueprint;
  const screens = list(bp.screens).map((s) => {
    const flows = list(s.flows);
    const flowTexts = list(bp.flows).filter((f) => flows.includes(f.id)).flatMap((f) => [f.name, ...list(f.steps)]);
    return { ...s, entities: entitiesFor(bp, [s.name, ...list(s.elements), ...flowTexts], flows) };
  });
  const flows = list(bp.flows).map((f) => ({ ...f, entities: entitiesFor(bp, [f.name, f.trigger, ...list(f.steps)], [f.id]) }));
  return {
    project: projectName || 'OpenIdea project',
    actors: list(bp.actors),
    entities: list(bp.entities),
    permissions: list(bp.permissions),
    integrations: list(bp.integrations),
    flows,
    screens,
  };
}

export function renderPrototype(p, projectName) {
  const json = JSON.stringify(prototypePayload(p, projectName)).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return TEMPLATE.replace('/*__PALETTE__*/', () => PALETTE).replace('/*__DATA__*/', () => json);
}

const TEMPLATE = String.raw`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Prototype</title>
<style>
/*__PALETTE__*/
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;text-size-adjust:100%;overscroll-behavior-y:none}
body{margin:0;overflow-wrap:break-word;-webkit-tap-highlight-color:transparent;background:var(--bg);color:var(--text);font:15px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
a{color:var(--accent)}
header{background:var(--bg);border-bottom:1px solid var(--border)}
.bar{max-width:1100px;margin:0 auto;padding:max(12px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) 10px max(16px,env(safe-area-inset-left));display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center}
.brand{font-weight:700}.brand small{display:block;color:var(--dim);font-weight:500;font-size:12px}
.role{margin-left:auto;display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted)}.role label{display:flex;align-items:center;gap:8px;flex:1}
select,textarea,input{font:inherit;font-size:16px;color:var(--text);background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 10px}
nav{position:-webkit-sticky;position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:1px solid var(--border)}
nav .in{max-width:1100px;margin:0 auto;padding:6px max(16px,env(safe-area-inset-right)) 6px max(16px,env(safe-area-inset-left));display:flex;gap:4px}
nav a{flex:1;text-align:center;text-decoration:none;color:var(--muted);padding:9px 4px;border-radius:8px;font-size:14px;min-height:40px}
nav a.on{background:var(--accent-soft);color:var(--accent);font-weight:600}
main{max-width:1100px;margin:0 auto;padding:18px max(16px,env(safe-area-inset-right)) calc(40px + env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}
h1{font-size:22px;margin:0 0 4px}h2{font-size:17px;margin:22px 0 8px}
.lede{color:var(--muted);margin:0 0 14px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 16px}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(260px,1fr))}
.tile{display:block;text-decoration:none;color:inherit;position:relative;padding-right:34px}
.tile::after{content:'\203A';position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:24px;color:var(--dim)}
.tile:hover{border-color:var(--accent)}
.tile h3{margin:0 0 4px;font-size:15.5px}.meta{color:var(--muted);font-size:13px}
.undef{color:var(--red);font-weight:600}
.undef-box{border:1.5px dashed var(--red);background:var(--red-soft);color:var(--red);border-radius:10px;padding:10px 12px;font-size:14px;margin:8px 0}
.warn-box{border:1px solid var(--amber);background:var(--amber-soft);color:var(--amber);border-radius:10px;padding:10px 12px;font-size:14px;margin:8px 0}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:40px;padding:8px 14px;border-radius:9px;border:1px solid var(--accent);background:var(--accent);color:#fff;font:inherit;font-size:14px;font-weight:600;cursor:pointer}
.btn.ghost{background:var(--surface);color:var(--accent)}
.btn[disabled]{background:var(--sunk);border-color:var(--border);color:var(--dim);cursor:not-allowed}
.btn.undefined{background:var(--surface);color:var(--red);border:1.5px dashed var(--red)}
.row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.screen{max-width:420px;margin:0 auto;border:1px solid var(--border);border-radius:22px;background:var(--surface);overflow:hidden}
.screen .top{padding:12px 16px;border-bottom:1px solid var(--border);font-weight:700;display:flex;justify-content:space-between;align-items:center}
.screen .body{padding:14px 16px;display:grid;gap:10px}
.w-box{border:1px solid var(--border);border-radius:10px;padding:10px 12px;background:var(--sunk);font-size:14px}
.w-box .lbl{font-size:12px;color:var(--muted);display:block;margin-bottom:4px}
.w-stat{font-size:22px;font-weight:700}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:8px;border-bottom:1px solid var(--border);vertical-align:top}th{font-size:12px;color:var(--muted);font-weight:600}
.pill{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;padding:2px 9px;border-radius:99px;border:1px solid var(--border);background:var(--surface);color:var(--muted)}
.pill::before{content:'';width:7px;height:7px;border-radius:50%;background:currentColor}
.pill.s0{color:var(--amber)}.pill.s1{color:var(--green)}.pill.s2{color:var(--gray)}
.steps{counter-reset:s;display:grid;gap:8px;margin:0;padding:0;list-style:none}
.steps li{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface)}
.steps li::before{counter-increment:s;content:counter(s);flex:none;width:24px;height:24px;border-radius:50%;background:var(--sunk);color:var(--muted);font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center}
.steps li.on{border-color:var(--accent);box-shadow:0 0 0 2px var(--accent-soft)}.steps li.on::before{background:var(--accent);color:#fff}
.steps li.done::before{background:var(--green);color:#fff;content:'\2713'}
.toast{position:fixed;left:50%;bottom:calc(20px + env(safe-area-inset-bottom));transform:translateX(-50%);background:var(--text);color:var(--bg);padding:10px 16px;border-radius:10px;font-size:14px;z-index:30;max-width:90vw}
.fb{position:fixed;right:max(16px,env(safe-area-inset-right));bottom:calc(16px + env(safe-area-inset-bottom));z-index:20}
.sheet{position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:40;display:flex;align-items:flex-end;justify-content:center}
.sheet .card{width:min(560px,100%);border-radius:16px 16px 0 0;padding:16px 16px calc(16px + env(safe-area-inset-bottom))}
.sheet textarea{width:100%;min-height:110px;margin:8px 0}
.count{font-size:12px;font-weight:700;color:var(--red);background:var(--red-soft);border-radius:99px;padding:2px 9px}
@media (max-width:640px){.role{margin-left:0;width:100%}.role select{flex:1}.screen{border-radius:16px}th:nth-child(n+4):not(.st),td:nth-child(n+4):not(.st):not([colspan]){display:none}}
</style>
</head>
<body>
<header><div class="bar"><div class="brand" id="brand"></div><div class="role"><label>Acting as <select id="role"></select></label><button class="btn ghost" id="fb">Note a problem</button></div></div></header>
<nav><div class="in" id="nav"></div></nav>
<main id="app"></main>
<script type="application/json" id="data">/*__DATA__*/</script>
<script>
(function(){
var D=JSON.parse(document.getElementById('data').textContent), app=document.getElementById('app');
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function filled(v){if(v==null)return false;if(Array.isArray(v))return v.length>0;if(typeof v==='string')return v.trim()!==''&&v.trim().toUpperCase()!=='TBD';return true;}
function byId(list,id){for(var i=0;i<list.length;i++)if(list[i].id===id)return list[i];return null;}
function undef(what){UNDEF[what]=1;return '<div class="undef-box">Not defined: '+esc(what)+'. <a href="#" data-note="'+esc(what)+'">Note it</a></div>';}
var UNDEF={};
document.getElementById('brand').innerHTML=esc(D.project)+'<small>Prototype from the blueprint · not a design</small>';
document.title=D.project+' · Prototype';

// Roles
var roleSel=document.getElementById('role');
roleSel.innerHTML=D.actors.map(function(a){return '<option value="'+esc(a.id)+'">'+esc(a.name||a.id)+'</option>';}).join('')||'<option value="">(no actors defined)</option>';
var ROLE=roleSel.value;
roleSel.addEventListener('change',function(){ROLE=roleSel.value;route();});

// Sample data: deterministic, from attribute names, so every viewer sees the same rows.
var DATA={};
function sampleValue(e,attr,n){
  var a=attr.toLowerCase(), ref=byId(D.entities,a)||byId(D.actors,a);
  if(a==='status'&&(e.states||[]).length) return e.states[0];
  if(ref) return (ref.name||ref.id)+' '+(n+1);
  if(/name|title/.test(a)) return (e.name||e.id)+' '+(n+1);
  if(/date|start|end|time|_at$|^at$|day/.test(a)) return '2026-12-0'+(n+1)+' '+(9+n*2)+':00';
  if(/amount|price|total|fee|cost/.test(a)) return (150000*(n+1)).toLocaleString();
  if(/method/.test(a)) return ['cash','card','transfer'][n%3];
  if(/phone/.test(a)) return '+62 812 000 00'+(10+n);
  if(/email/.test(a)) return 'user'+(n+1)+'@example.com';
  if(/qty|count|number/.test(a)) return String(n+1);
  return attr+' '+(n+1);
}
D.entities.forEach(function(e){DATA[e.id]=[0,1,2].map(function(n){var r={_id:n+1};(e.attributes||[]).forEach(function(a){r[a]=sampleValue(e,a,n);});if((e.states||[]).length&&!('status' in r))r.status=e.states[0];return r;});});

// Permissions: allowed, denied, or nobody decided (a blind spot the prototype shows in red).
function can(action,entity){
  var rules=D.permissions.filter(function(p){return p.actor===ROLE&&p.entity===entity&&(p.action===action||p.action==='manage');});
  if(!rules.length) return null;
  return rules.some(function(p){return p.allow===true;});
}
function actorNamedIn(text){var t=String(text||'').toLowerCase();for(var i=0;i<D.actors.length;i++){var a=D.actors[i];if(t.indexOf(String(a.name||a.id).toLowerCase())===0||t.indexOf(String(a.id).toLowerCase())===0)return a.id;}return null;}
function stateClass(e,s){var st=e.states||[];var i=st.indexOf(s);if(i===0)return 's0';if(/cancel|reject|fail|no_show|void|expired/.test(s))return 's2';return i>0?'s1':'';}
function actionBtn(label,decision,attrs){
  if(decision===true) return '<button class="btn" '+attrs+'>'+esc(label)+'</button>';
  if(decision===false) return '<button class="btn" disabled title="Not allowed for this role">'+esc(label)+'</button>';
  UNDEF['who may '+label]=1;
  return '<button class="btn undefined" '+attrs+' title="Nobody defined whether this role may do this">'+esc(label)+' ?</button>';
}
function entityTable(eid){
  var e=byId(D.entities,eid); if(!e) return '';
  var attrs=(e.attributes||[]).filter(function(a){return a!=='status';});
  var rows=DATA[eid], st=e.states||[];
  var h='<div class="w-box" style="background:var(--surface)"><div class="row" style="justify-content:space-between;margin-bottom:6px"><strong>'+esc(e.name||e.id)+'</strong>'+actionBtn('New '+(e.name||e.id).toLowerCase(),can('create',eid),'data-create="'+esc(eid)+'"')+'</div>';
  if(!(e.attributes||[]).length) h+=undef('what a '+(e.name||e.id)+' holds');
  h+='<table><thead><tr>'+attrs.map(function(a){return '<th>'+esc(a)+'</th>';}).join('')+(st.length?'<th class="st">status</th>':'')+'</tr></thead><tbody>';
  if(!rows.length) h+='<tr><td colspan="9" class="meta">Empty</td></tr>';
  rows.forEach(function(r){
    h+='<tr>'+attrs.map(function(a){return '<td>'+esc(r[a])+'</td>';}).join('')+(st.length?'<td class="st"><span class="pill '+stateClass(e,r.status)+'">'+esc(String(r.status).replace(/_/g,' '))+'</span></td>':'')+'</tr>';
    if(st.length){
      var tr=(e.transitions||[]).filter(function(t){return t.from===r.status;});
      h+='<tr><td colspan="9" style="border-bottom-width:2px"><div class="row">'+(tr.length?tr.map(function(t){
        var label=t.event||('Move to '+t.to), f=t.flow&&byId(D.flows,t.flow);
        // Who moves it: the flow's actor, else a role named at the start of the event ("Receptionist confirms"), else the permission matrix.
        var who=f?f.actor:actorNamedIn(t.event);
        var d=who?(who===ROLE?true:false):can('update',eid);
        return actionBtn(label,d,'data-move="'+esc(eid)+'|'+r._id+'|'+esc(t.to)+'"');}).join(''):'<span class="meta">No way out of “'+esc(r.status)+'”'+(r.status===st[0]||/complete|done|closed|archiv|cancel/.test(r.status)?'':' <span class="undef">: is this a dead end?</span>')+'</span>')+'</div></td></tr>';
    }
  });
  return h+'</tbody></table></div>';
}

// Screen elements become rough widgets by keyword. Unknown ones stay labelled boxes.
function widget(el,entities){
  var t=String(el).toLowerCase();
  if(/button|confirm|submit|save|send|book|pay/.test(t)) return '<button class="btn ghost" data-toast="'+esc(el)+' pressed">'+esc(el)+'</button>';
  if(/search/.test(t)) return '<input placeholder="'+esc(el)+'">';
  if(/date|calendar|picker/.test(t)) return '<label class="w-box"><span class="lbl">'+esc(el)+'</span><input type="date" value="2026-12-01" style="width:100%"></label>';
  if(/count|total|summary|chart|graph|kpi|stat/.test(t)) return '<div class="w-box"><span class="lbl">'+esc(el)+'</span><span class="w-stat">'+(3+el.length%7)+'</span></div>';
  if(/toggle|switch/.test(t)) return '<label class="w-box row"><input type="checkbox"> '+esc(el)+'</label>';
  if(/field|input|form|note|name|email|phone/.test(t)) return '<label class="w-box"><span class="lbl">'+esc(el)+'</span><input style="width:100%"></label>';
  return '<div class="w-box"><span class="lbl">'+esc(el)+'</span><span class="meta">Placeholder</span></div>';
}

var PAGES=[['flows','Flows'],['screens','Screens'],['data','Data']];
function myFlows(){return D.flows.filter(function(f){return f.actor===ROLE;});}
function home(){
  var a=byId(D.actors,ROLE);
  var h='<h1>'+esc(a?(a.name||a.id):'No role')+'</h1><p class="lede">'+(a&&filled(a.description)?esc(a.description):'<span class="undef">What this role does is not defined.</span>')+' Pick a flow to walk through it step by step.</p>';
  var fl=myFlows();
  h+=fl.length?'<div class="grid">'+fl.map(function(f){return '<a class="card tile" href="#flow/'+encodeURIComponent(f.id)+'"><h3>'+esc(f.name||f.id)+'</h3><div class="meta">'+(f.steps||[]).length+' steps · '+(filled(f.trigger)?esc(f.trigger):'<span class="undef">no trigger</span>')+'</div></a>';}).join('')+'</div>':undef('any flow for this role');
  var other=D.flows.filter(function(f){return f.actor!==ROLE;});
  if(other.length) h+='<h2>Other roles’ flows</h2><div class="grid">'+other.map(function(f){var x=byId(D.actors,f.actor);return '<a class="card tile" href="#flow/'+encodeURIComponent(f.id)+'"><h3>'+esc(f.name||f.id)+'</h3><div class="meta">as '+esc(x?(x.name||x.id):(f.actor||'nobody'))+'</div></a>';}).join('')+'</div>';
  return h;
}
var STEP={};
function flow(id){
  var f=byId(D.flows,id); if(!f) return '<p>Flow not found.</p>';
  if(f.actor&&f.actor!==ROLE&&byId(D.actors,f.actor)){ROLE=f.actor;roleSel.value=ROLE;}
  var steps=f.steps||[], i=STEP[id]||0, sc=f.scenarios||{};
  var screens=D.screens.filter(function(s){return (s.flows||[]).indexOf(id)>=0;});
  var h='<p class="meta"><a href="#flows">← Flows</a></p><h1>'+esc(f.name||f.id)+'</h1><p class="lede">Starts when: '+(filled(f.trigger)?esc(f.trigger):'<span class="undef">not defined</span>')+'</p>';
  if(!steps.length) return h+undef('the steps of '+(f.name||f.id));
  h+='<ol class="steps">'+steps.map(function(s,n){return '<li class="'+(n<i?'done':n===i?'on':'')+'">'+esc(s)+'</li>';}).join('')+'<li class="'+(i>=steps.length?'on':'')+'">Outcome</li></ol>';
  h+='<div class="row" style="margin:12px 0">'+(i>0?'<button class="btn ghost" data-step="'+esc(id)+'|-1">Back</button>':'')+(i<steps.length?'<button class="btn" data-step="'+esc(id)+'|1">'+(i===steps.length-1?'Finish':'Next step')+'</button>':'<button class="btn ghost" data-step="'+esc(id)+'|reset">Start again</button>')+'</div>';
  if(i<steps.length){
    if(screens.length) h+='<h2>On screen</h2>'+screens.map(function(s){return screenHtml(s);}).join('');
    else h+='<div class="warn-box">No screen is defined for this flow. If it happens outside the app (for example in WhatsApp), that is fine; otherwise <a href="#" data-note="screen for '+esc(f.name||f.id)+'">note it</a>.</div>';
    (f.entities||[]).forEach(function(eid){ if(!screens.some(function(s){return (s.entities||[]).indexOf(eid)>=0;})) h+=entityTable(eid); });
  } else {
    h+='<h2>How it can end</h2>';
    var outs=[['Success',sc.success],['Failure',sc.failure],['Nothing to show',sc.empty_state]];
    (sc.alternative||[]).forEach(function(a){outs.push(['Alternative',a]);});
    h+=outs.map(function(o){return filled(o[1])?'<div class="card" style="margin-bottom:8px"><strong>'+o[0]+':</strong> '+esc(Array.isArray(o[1])?o[1].join('; '):o[1])+'</div>':undef(o[0].toLowerCase()+' outcome of '+(f.name||f.id));}).join('');
  }
  return h;
}
function screenHtml(s){
  var els=s.elements||[];
  return '<div class="screen" style="margin-bottom:12px"><div class="top">'+esc(s.name||s.id)+'<span class="meta">'+esc(s.id)+'</span></div><div class="body">'+
    (els.length?els.map(function(e){return widget(e,s.entities);}).join(''):undef('what is on '+(s.name||s.id)))+
    (s.entities||[]).map(entityTable).join('')+'</div></div>';
}
function screens(){
  var h='<h1>Screens</h1><p class="lede">Every screen in the blueprint, roughly laid out from its elements.</p>';
  if(!D.screens.length) return h+undef('any screen');
  return h+D.screens.map(screenHtml).join('');
}
function data(){
  var h='<h1>Data</h1><p class="lede">Sample records for every entity. Buttons follow the permission matrix for the role you are acting as: grey means not allowed, red dashed means nobody decided.</p>';
  if(!D.entities.length) return h+undef('any entity');
  return h+D.entities.map(function(e){return '<div style="margin-bottom:12px">'+entityTable(e.id)+'</div>';}).join('');
}
function route(){
  UNDEF={};
  var parts=(location.hash.replace(/^#/,'')||'flows').split('/').map(decodeURIComponent), page=parts[0], html;
  if(page==='flow') html=flow(parts[1]); else if(page==='screens') html=screens(); else if(page==='data') html=data(); else {page='flows';html=home();}
  var key=page==='flow'?'flows':page;
  document.getElementById('nav').innerHTML=PAGES.map(function(p){return '<a href="#'+p[0]+'"'+(p[0]===key?' class="on"':'')+'>'+p[1]+'</a>';}).join('');
  var n=Object.keys(UNDEF).length;
  app.innerHTML=(n?'<p style="margin:0 0 12px"><span class="count">'+n+' undefined here</span> <span class="meta">Red marks behaviour the blueprint does not define yet.</span></p>':'')+html;
}
function toast(t){var d=document.createElement('div');d.className='toast';d.textContent=t;document.body.appendChild(d);setTimeout(function(){d.remove();},1800);}
function note(context){
  var view=location.hash.replace(/^#/,'')||'flows';
  var s=document.createElement('div');s.className='sheet';
  s.innerHTML='<div class="card"><strong>Note a problem</strong><div class="meta">Acting as '+esc(ROLE)+' on '+esc(view)+'. It becomes a gap when pasted into Claude Code.</div><textarea id="nt" placeholder="What is wrong, missing, or surprising?">'+(context?esc('Not defined: '+context+'. '):'')+'</textarea><div class="row"><button class="btn" id="nc">Copy for Claude Code</button><button class="btn ghost" id="nx">Cancel</button></div></div>';
  document.body.appendChild(s);
  s.addEventListener('click',function(e){if(e.target===s)s.remove();});
  s.querySelector('#nx').onclick=function(){s.remove();};
  s.querySelector('#nc').onclick=function(){
    var txt='/openidea:prototype feedback "'+view+' as '+ROLE+': '+s.querySelector('#nt').value.replace(/"/g,"'").trim()+'"';
    var done=function(){s.remove();toast('Copied. Paste it in Claude Code to record a gap.');};
    if(navigator.clipboard&&navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done,function(){prompt('Copy this:',txt);s.remove();}); else {prompt('Copy this:',txt);s.remove();}
  };
}
document.getElementById('fb').onclick=function(){note('');};
document.addEventListener('click',function(e){
  var t=e.target.closest('[data-note]'); if(t){e.preventDefault();note(t.getAttribute('data-note'));return;}
  t=e.target.closest('[data-step]'); if(t){var p=t.getAttribute('data-step').split('|');var f=byId(D.flows,p[0]);STEP[p[0]]=p[1]==='reset'?0:Math.max(0,Math.min((f.steps||[]).length,(STEP[p[0]]||0)+Number(p[1])));route();return;}
  t=e.target.closest('[data-move]'); if(t){if(t.classList.contains('undefined')){note('whether '+ROLE+' may: '+t.textContent.replace(/ \?$/,''));return;}var p=t.getAttribute('data-move').split('|');DATA[p[0]].forEach(function(r){if(String(r._id)===p[1])r.status=p[2];});toast('Now '+p[2].replace(/_/g,' '));route();return;}
  t=e.target.closest('[data-create]'); if(t){if(t.classList.contains('undefined')){note('whether '+ROLE+' may create '+t.getAttribute('data-create'));return;}var eid=t.getAttribute('data-create'),en=byId(D.entities,eid),rows=DATA[eid],n=rows.length;var r={_id:n+1};(en.attributes||[]).forEach(function(a){r[a]=sampleValue(en,a,n);});if((en.states||[]).length)r.status=en.states[0];rows.push(r);toast('Created');route();return;}
  t=e.target.closest('[data-toast]'); if(t){toast(t.getAttribute('data-toast'));}
});
window.addEventListener('hashchange',route); route();
})();
</script>
</body>
</html>
`;
