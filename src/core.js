/* ================= ASD — noyau : stockage, formatage, tableaux filtrables, tiroir, formulaires ================= */
let D = null;                // données
let UI = { route:'dashboard', tabs:{}, tables:{}, views:{}, profile:'direction', dash:{periode:'365', depot:'', commercial:''} };
let CACHE_MODE = 'IndexedDB';
const TODAY = isoD(new Date());

/* ---------- stockage navigateur (IndexedDB, repli localStorage puis mémoire) ---------- */
const IDB = {
  db:null,
  open(){ return new Promise((res,rej)=>{ try{ const r = indexedDB.open('asd-erp',1); r.onupgradeneeded=()=>r.result.createObjectStore('kv'); r.onsuccess=()=>{this.db=r.result;res(this.db)}; r.onerror=()=>rej(r.error);}catch(e){rej(e)} }); },
  get(k){ return new Promise((res,rej)=>{ const t=this.db.transaction('kv').objectStore('kv').get(k); t.onsuccess=()=>res(t.result); t.onerror=()=>rej(t.error); }); },
  set(k,v){ return new Promise((res,rej)=>{ const tx=this.db.transaction('kv','readwrite'); tx.objectStore('kv').put(v,k); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); }); },
  del(k){ return new Promise((res)=>{ const tx=this.db.transaction('kv','readwrite'); tx.objectStore('kv').delete(k); tx.oncomplete=()=>res(); tx.onerror=()=>res(); }); }
};
async function loadData(){
  try { await IDB.open(); const v = await IDB.get(DB_KEY); if (v) return v; const fresh = seedData(); await IDB.set(DB_KEY, fresh); return fresh; }
  catch(e){
    try { const s = localStorage.getItem(DB_KEY); if (s) { CACHE_MODE='localStorage'; return JSON.parse(s); } const fresh = seedData(); localStorage.setItem(DB_KEY, JSON.stringify(fresh)); CACHE_MODE='localStorage'; return fresh; }
    catch(e2){ CACHE_MODE='mémoire (cache indisponible)'; return seedData(); }
  }
}
let saveT = null;
function save(){ clearTimeout(saveT); saveT = setTimeout(async () => {
  try { if (CACHE_MODE==='IndexedDB') await IDB.set(DB_KEY, D); else if (CACHE_MODE==='localStorage') localStorage.setItem(DB_KEY, JSON.stringify(D)); } catch(e){ toast('Enregistrement local impossible : ' + e.message); }
  IX = null;
}, 120); IX = null; }
function loadUI(){ try { const s = localStorage.getItem(UI_KEY); if (s) UI = Object.assign(UI, JSON.parse(s)); } catch(e){} }
function saveUI(){ try { localStorage.setItem(UI_KEY, JSON.stringify(UI)); } catch(e){} }
async function resetData(){ D = seedData(); IX = null; try { if (CACHE_MODE==='IndexedDB') await IDB.set(DB_KEY, D); else if (CACHE_MODE==='localStorage') localStorage.setItem(DB_KEY, JSON.stringify(D)); } catch(e){} }

/* ---------- index ---------- */
let IX = null;
function ix(){
  if (IX) return IX;
  const by = (arr,k='id') => { const m = new Map(); arr.forEach(x=>m.set(x[k],x)); return m; };
  IX = { art:by(D.articles), cli:by(D.clients), emp:by(D.employes), frs:by(D.fournisseurs), dep:by(D.depots), cmd:by(D.commandes), fac:by(D.factures), piece:by(D.pieces), cpt:by(D.comptes), pc:by(D.planComptable,'numero') };
  return IX;
}
const art = id => ix().art.get(id) || {designation:'—',ref:'—'};
const cli = id => ix().cli.get(id) || {raison:'—',code:'—'};
const emp = id => ix().emp.get(id) || {prenom:'—',nom:''};
const empName = id => { const e = ix().emp.get(id); return e ? `${e.prenom} ${e.nom}` : '—'; };
const frs = id => ix().frs.get(id) || {raison:'—'};
const dep = id => ix().dep.get(id) || {nom:'—',code:'—'};

/* ---------- formatage ---------- */
const NF = new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0});
const NF2 = new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2});
const da = n => NF.format(Math.round(n||0)) + ' DA';
const num = n => NF.format(n||0);
const kda = n => { const a = Math.abs(n); if (a>=1e9) return NF2.format(n/1e9).replace(/,?0+$/,'')+' Md DA'; if (a>=1e6) return new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1}).format(n/1e6)+' M DA'; if (a>=1e4) return NF.format(n/1e3)+' k DA'; return da(n); };
const fd = s => fmtDateRaw(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials = (p,n) => ((p||'')[0]||'') + ((n||'')[0]||'');
const MONTHS_FR = ['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
const monthLabel = ym => { const [y,m] = ym.split('-'); return `${MONTHS_FR[+m-1]} ${y.slice(2)}`; };
const sum = (arr,f) => arr.reduce((s,x)=>s+(f(x)||0),0);
const groupBy = (arr,f) => arr.reduce((m,x)=>{ const k=f(x); (m[k] ||= []).push(x); return m; },{});

const PILL = {
  ok:['Valide','Livré','Payée','Encaissé','Approuvé','Actif','Validée','Conforme','Clôturée','Résolu','Clôturé','OK','Mappée','Terminée','Sous garantie','Rapproché','Validé','Envoyée','Disponible','Reçu'],
  warn:['Expire < 6 mois','En attente','Préparée','Reporté','Absent','Alerte','Remis à l’encaissement','En cours','En cours de clôture','Partielle mapping','Écart quantité','Écart prix','CDD','Période d’essai','Brouillard','Haute','À échéance','Non rapproché','Retour / Échange','Surstock'],
  bad:['Périmé','Expire < 3 mois','Annulée','Refusé','Rejeté','Rupture','Critique','Sorti','Garantie expirée','Non éligible','Ouvert','Échu'],
  info:['Validée ','Expédiée','En livraison','En route','En portefeuille','Émis','Créée','Brouillon','Ouverte','Normale','Différentielle','En stock'],
};
function pill(v, kind){
  if (v==null || v==='') return '<span class="muted">—</span>';
  let k = kind;
  if (!k) { for (const key of ['bad','warn','ok','info']) if (PILL[key].includes(v)) { k = key; break; } }
  return `<span class="pill ${k||''}">${esc(v)}</span>`;
}
const circ = c => `<span class="circ ${c}" title="${c==='A'?'Circuit soumis à la fiscalité':'Circuit non soumis'}">${c==='A'?'A · Soumis':'B · Non soumis'}</span>`;

/* ---------- icônes ---------- */
const ICONS = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  cart:'<path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6.2"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>',
  box:'<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>',
  truck:'<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/>',
  users:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.8c1.6.8 2.6 2.5 3 5.2"/>',
  wallet:'<path d="M3 7a2 2 0 0 1 2-2h13v4"/><path d="M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2z"/><circle cx="16" cy="14.5" r="1.2"/>',
  book:'<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6a3 3 0 0 0-3 3"/><path d="M20 4v14h-7"/>',
  id:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="11" r="2.5"/><path d="M5.5 17c.6-1.8 2-2.7 3.5-2.7s2.9.9 3.5 2.7M15 9h3M15 13h3"/>',
  wrench:'<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
  db:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  cog:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  filter:'<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  copy:'<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  cols:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/>',
  star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  x:'<path d="M6 6l12 12M18 6 6 18"/>',
  check:'<path d="m5 12 5 5 9-10"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  play:'<path d="M7 4v16l13-8z"/>',
  reset:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
};
const ic = (n,attrs='') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${attrs}>${ICONS[n]||''}</svg>`;

/* ---------- toast ---------- */
function toast(msg){ const t = document.createElement('div'); t.className='toast'; t.textContent=msg; document.getElementById('toasts').appendChild(t); setTimeout(()=>t.remove(), 3200); }
async function copyText(text, okMsg){
  try { await navigator.clipboard.writeText(text); toast(okMsg); }
  catch(e){ openDrawer({eyebrow:'Export', title:'Copier les données', body:`<p class="muted">La copie automatique est bloquée ici. Sélectionnez le texte ci-dessous puis copiez-le (Ctrl+C).</p><textarea class="inp mono" id="copyArea" style="width:100%;height:60vh;font-size:11.5px">${esc(text)}</textarea>`}); setTimeout(()=>{ const a=document.getElementById('copyArea'); a && a.select(); },50); }
}

/* ================= TABLEAU FILTRABLE ================= */
const OPS = {
  text:[['contains','contient'],['ncontains','ne contient pas'],['eq','est égal à'],['starts','commence par'],['empty','est vide'],['nempty','n’est pas vide']],
  num:[['gte','≥'],['lte','≤'],['gt','>'],['lt','<'],['eq','='],['neq','≠'],['between','entre']],
  date:[['last7','7 derniers jours'],['last30','30 derniers jours'],['last90','90 derniers jours'],['thismonth','ce mois-ci'],['thisyear','cette année'],['past','dépassée (avant aujourd’hui)'],['next30','dans les 30 prochains jours'],['on','le'],['before','avant le'],['after','après le'],['between','entre']],
  enum:[['in','est'],['nin','n’est pas']],
  bool:[['true','oui'],['false','non']],
};
const opType = t => t==='money'||t==='num' ? 'num' : t==='date' ? 'date' : t==='enum' ? 'enum' : t==='bool' ? 'bool' : 'text';
const noValueOps = new Set(['empty','nempty','last7','last30','last90','thismonth','thisyear','past','next30','true','false']);

function colVal(col, r){ return col.get ? col.get(r) : r[col.key]; }
function testRule(v, rule, type){
  const op = rule.op, a = rule.v, b = rule.v2;
  switch(opType(type)){
    case 'num': { const x = Number(v), y = Number(a), z = Number(b); if (a===''||a==null) return true;
      return op==='gte'?x>=y:op==='lte'?x<=y:op==='gt'?x>y:op==='lt'?x<y:op==='eq'?x===y:op==='neq'?x!==y:op==='between'?(x>=y&&(b===''||x<=z)):true; }
    case 'date': { const s = v||''; if (!s && !noValueOps.has(op)) return a ? false : true; if (!s) return false;
      if (op==='last7') return s>=addDays(TODAY,-7)&&s<=TODAY; if (op==='last30') return s>=addDays(TODAY,-30)&&s<=TODAY; if (op==='last90') return s>=addDays(TODAY,-90)&&s<=TODAY;
      if (op==='thismonth') return s.slice(0,7)===TODAY.slice(0,7); if (op==='thisyear') return s.slice(0,4)===TODAY.slice(0,4);
      if (op==='past') return s<TODAY; if (op==='next30') return s>=TODAY&&s<=addDays(TODAY,30);
      if (!a) return true; if (op==='on') return s===a; if (op==='before') return s<a; if (op==='after') return s>a; if (op==='between') return s>=a&&(!b||s<=b); return true; }
    case 'enum': { if (!a) return true; return op==='in' ? String(v)===a : String(v)!==a; }
    case 'bool': return op==='true' ? !!v : !v;
    default: { const s = String(v??'').toLowerCase(), q = String(a??'').toLowerCase();
      if (op==='empty') return !s; if (op==='nempty') return !!s; if (!q) return true;
      return op==='contains'?s.includes(q):op==='ncontains'?!s.includes(q):op==='eq'?s===q:op==='starts'?s.startsWith(q):true; }
  }
}
const norm = s => String(s??'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
function tState(id){ return UI.tables[id] ||= {q:'',facets:{},rules:[],match:'all',sort:null,page:0,size:25,hidden:null,showBuilder:false}; }

function filterRows(cfg, st){
  let rows = cfg.rows();
  const cols = cfg.columns;
  if (st.q) { const terms = norm(st.q).split(/\s+/).filter(Boolean); rows = rows.filter(r => { const hay = norm(cols.map(c=>{ const v = colVal(c,r); return c.type==='date'?fd(v)+' '+v:v; }).join(' ') + ' ' + (cfg.searchExtra?cfg.searchExtra(r):'')); return terms.every(t=>hay.includes(t)); }); }
  Object.entries(st.facets||{}).forEach(([k,vals]) => { if (!vals || !vals.length) return; const col = cols.find(c=>c.key===k); if (!col) return; rows = rows.filter(r => vals.includes(String(colVal(col,r)))); });
  const rules = (st.rules||[]).filter(r => r.key && cols.find(c=>c.key===r.key));
  if (rules.length) rows = rows.filter(r => { const res = rules.map(rule => { const col = cols.find(c=>c.key===rule.key); return testRule(colVal(col,r), rule, col.type); }); return st.match==='any' ? res.some(Boolean) : res.every(Boolean); });
  if (st.sort) { const col = cols.find(c=>c.key===st.sort.key); if (col) { const dir = st.sort.dir; const isN = ['num','money'].includes(col.type); rows = rows.slice().sort((a,b) => { let x = colVal(col,a), y = colVal(col,b); if (isN) return ((+x||0)-(+y||0))*dir; return String(x??'').localeCompare(String(y??''),'fr',{numeric:true})*dir; }); } }
  return rows;
}
function enumOptions(cfg, col){ if (col.options) return col.options; const s = new Set(); cfg.rows().forEach(r => { const v = colVal(col,r); if (v!==''&&v!=null) s.add(String(v)); }); return [...s].sort((a,b)=>a.localeCompare(b,'fr')); }
function cellHtml(col, r){
  if (col.render) return col.render(r);
  const v = colVal(col, r);
  if (col.type==='money') return v==null||v===''?'—':da(v);
  if (col.type==='num') return v==null||v===''?'—':num(v);
  if (col.type==='date') return v?fd(v):'<span class="muted">—</span>';
  if (col.type==='enum' && col.pill!==false) return pill(v);
  if (col.type==='bool') return v?'Oui':'<span class="muted">Non</span>';
  return esc(v);
}
function ruleLabel(cfg, rule){
  const col = cfg.columns.find(c=>c.key===rule.key); if (!col) return '';
  const op = (OPS[opType(col.type)].find(o=>o[0]===rule.op)||['',''])[1];
  let v = noValueOps.has(rule.op) ? '' : (col.type==='date' ? fd(rule.v) : col.type==='money'? da(rule.v) : rule.v);
  if (rule.op==='between') v = `${col.type==='date'?fd(rule.v):rule.v} et ${col.type==='date'?fd(rule.v2):rule.v2}`;
  return `<b>${esc(col.label)}</b> ${esc(op)} ${esc(v)}`;
}

function renderTable(el, cfg){
  const st = tState(cfg.id);
  if (!st.hidden) st.hidden = cfg.columns.filter(c=>c.hidden).map(c=>c.key);
  const facets = (cfg.facets||[]).map(k => cfg.columns.find(c=>c.key===k)).filter(Boolean);
  const presets = cfg.presets || [];
  el.innerHTML = `<div class="dt">
    <div class="dt-bar">
      <div class="dt-search">${ic('search')}<input class="inp" id="q-${cfg.id}" placeholder="Rechercher dans ${esc(cfg.noun||'la liste')}…" value="${esc(st.q)}" autocomplete="off"></div>
      <button class="btn ${st.showBuilder||st.rules.length?'on':''}" data-t="builder">${ic('filter')} Filtres avancés${st.rules.length?` · ${st.rules.length}`:''}</button>
      <div class="menu"><button class="btn" data-t="views">${ic('star')} Vues</button></div>
      <div class="menu"><button class="btn" data-t="cols">${ic('cols')} Colonnes</button></div>
      <span class="dt-spacer"></span>
      <button class="btn ghost" data-t="csv" title="Copier les lignes filtrées au format CSV">${ic('copy')} Copier CSV</button>
      ${cfg.add ? `<button class="btn primary" data-t="add">${ic('plus')} ${esc(cfg.addLabel||'Nouveau')}</button>` : ''}
    </div>
    ${facets.length ? `<div class="facets" id="fac-${cfg.id}"></div>` : ''}
    <div id="bld-${cfg.id}"></div>
    <div class="active-f" id="af-${cfg.id}"></div>
    <div id="res-${cfg.id}"></div>
  </div>`;
  const q = el.querySelector(`#q-${cfg.id}`);
  let qt; q.addEventListener('input', () => { clearTimeout(qt); qt = setTimeout(()=>{ st.q = q.value; st.page = 0; saveUI(); renderResults(); }, 120); });

  function renderFacets(){
    const box = el.querySelector(`#fac-${cfg.id}`); if (!box) return;
    // counts based on all filters except this facet
    box.innerHTML = facets.map(col => {
      const others = {...st, facets:{...st.facets, [col.key]:[]}, sort:null};
      const base = filterRows(cfg, others);
      const counts = {}; base.forEach(r => { const v = String(colVal(col,r)); counts[v] = (counts[v]||0)+1; });
      const opts = (col.facetOptions || enumOptions(cfg,col)).filter(o => counts[o] || (st.facets[col.key]||[]).includes(o));
      const sel = st.facets[col.key] || [];
      return `<div class="facet"><span class="facet-l">${esc(col.label)}</span>${opts.map(o => `<button class="chip ${sel.includes(o)?'on':''}" data-facet="${esc(col.key)}" data-v="${esc(o)}">${esc(col.facetLabel?col.facetLabel(o):o)} <span class="c">${counts[o]||0}</span></button>`).join('')}</div>`;
    }).join('');
  }
  function renderBuilder(){
    const box = el.querySelector(`#bld-${cfg.id}`);
    if (!st.showBuilder) { box.innerHTML=''; return; }
    const fcols = cfg.columns.filter(c=>c.filter!==false);
    const ruleRow = (r,i) => {
      const col = fcols.find(c=>c.key===r.key) || fcols[0];
      const ot = opType(col.type); const ops = OPS[ot];
      let vals = '';
      if (!noValueOps.has(r.op)) {
        if (ot==='enum') vals = `<select class="sel" data-rv="${i}"><option value="">— choisir —</option>${enumOptions(cfg,col).map(o=>`<option ${o===r.v?'selected':''}>${esc(o)}</option>`).join('')}</select>`;
        else { const it = ot==='num'?'number':ot==='date'?'date':'text'; vals = `<input class="inp" type="${it}" data-rv="${i}" value="${esc(r.v??'')}" placeholder="${ot==='num'?'Valeur':''}">` + (r.op==='between' ? `<input class="inp" type="${it}" data-rv2="${i}" value="${esc(r.v2??'')}">` : ''); }
      }
      return `<div class="rule">
        <select class="sel" data-rk="${i}" aria-label="Champ">${fcols.map(c=>`<option value="${esc(c.key)}" ${c.key===col.key?'selected':''}>${esc(c.label)}</option>`).join('')}</select>
        <select class="sel" data-ro="${i}" aria-label="Opérateur">${ops.map(o=>`<option value="${o[0]}" ${o[0]===r.op?'selected':''}>${esc(o[1])}</option>`).join('')}</select>
        <div class="vals">${vals}</div>
        <button class="btn ghost sm" data-rdel="${i}" aria-label="Supprimer la condition">${ic('x','width="14" height="14"')}</button></div>`;
    };
    box.innerHTML = `<div class="builder">
      <div class="builder-h">Afficher les lignes qui respectent
        <select class="sel" data-match style="padding:4px 6px"><option value="all" ${st.match!=='any'?'selected':''}>toutes</option><option value="any" ${st.match==='any'?'selected':''}>au moins une</option></select>
        des conditions suivantes</div>
      ${st.rules.map(ruleRow).join('') || '<div class="muted" style="font-size:12.5px">Aucune condition. Ajoutez-en une pour filtrer par montant, date, statut…</div>'}
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn sm" data-radd>${ic('plus')} Ajouter une condition</button>
        ${presets.length ? `<span class="muted" style="align-self:center;font-size:12px;margin-left:6px">Filtres rapides :</span>` + presets.map((p,i)=>`<button class="btn sm ghost" data-preset="${i}">${esc(p.name)}</button>`).join('') : ''}
        <span class="dt-spacer"></span>
        ${st.rules.length?`<button class="btn sm ghost" data-rclear>Effacer les conditions</button>`:''}
      </div></div>`;
  }
  function renderActive(){
    const box = el.querySelector(`#af-${cfg.id}`);
    const items = [];
    Object.entries(st.facets).forEach(([k,vals]) => (vals||[]).forEach(v => { const col = cfg.columns.find(c=>c.key===k); if (col) items.push(`<span class="af"><span><b>${esc(col.label)}</b> : ${esc(v)}</span><button data-afx="f|${esc(k)}|${esc(v)}" aria-label="Retirer">×</button></span>`); }));
    st.rules.forEach((r,i) => { const l = ruleLabel(cfg, r); if (l && (noValueOps.has(r.op) || r.v!=='' && r.v!=null)) items.push(`<span class="af"><span>${l}</span><button data-afx="r|${i}" aria-label="Retirer">×</button></span>`); });
    if (st.q) items.unshift(`<span class="af"><span>Recherche : <b>${esc(st.q)}</b></span><button data-afx="q" aria-label="Retirer">×</button></span>`);
    box.innerHTML = items.length ? `<span class="muted">Filtres actifs${st.rules.length>1?` (${st.match==='any'?'au moins une condition':'toutes les conditions'})`:''} :</span>${items.join('')}<button class="btn sm ghost" data-afx="all">Tout effacer</button>` : '';
  }
  function renderResults(){
    renderFacets(); renderActive();
    const rows = filterRows(cfg, st);
    const vis = cfg.columns.filter(c => !st.hidden.includes(c.key));
    const pages = Math.max(1, Math.ceil(rows.length / st.size));
    if (st.page >= pages) st.page = pages-1;
    const slice = rows.slice(st.page*st.size, (st.page+1)*st.size);
    const sums = vis.map(c => c.sum ? sum(rows, r=>+colVal(c,r)||0) : null);
    const anySum = sums.some(s=>s!==null);
    const res = el.querySelector(`#res-${cfg.id}`);
    res.innerHTML = `<div class="dt-wrap"><table class="t"><thead><tr>${vis.map(c=>`<th class="${c.sortable===false?'':'sortable'} ${['money','num'].includes(c.type)||c.align==='r'?'r':''}" data-sort="${esc(c.key)}">${esc(c.label)}${st.sort&&st.sort.key===c.key?`<span class="arr">${st.sort.dir>0?'▲':'▼'}</span>`:''}</th>`).join('')}${cfg.rowActions?'<th></th>':''}</tr></thead>
      <tbody>${slice.length ? slice.map((r,i)=>`<tr data-i="${st.page*st.size+i}">${vis.map(c=>`<td class="${['money','num'].includes(c.type)||c.align==='r'?'num':''} ${c.strong?'strong':''}">${cellHtml(c,r)}</td>`).join('')}${cfg.rowActions?`<td class="num">${cfg.rowActions(r)}</td>`:''}</tr>`).join('') : `<tr><td colspan="${vis.length+(cfg.rowActions?1:0)}" class="empty">Aucun résultat pour ces filtres. <button class="btn sm" data-afx="all" style="margin-left:6px">Effacer les filtres</button></td></tr>`}</tbody>
      ${anySum && rows.length ? `<tfoot><tr>${vis.map((c,i)=> i===0 ? `<td>Total filtré</td>` : sums[i]!==null ? `<td class="num">${c.type==='money'?da(sums[i]):num(sums[i])}</td>` : '<td></td>').join('')}${cfg.rowActions?'<td></td>':''}</tr></tfoot>`:''}
    </table></div>
    <div class="dt-foot"><span><b style="color:var(--fg)">${num(rows.length)}</b> ligne${rows.length>1?'s':''} sur ${num(cfg.rows().length)}</span>
      <div class="pager"><select class="sel" data-size style="padding:4px 6px">${[10,25,50,100].map(n=>`<option ${n===st.size?'selected':''} value="${n}">${n} / page</option>`).join('')}</select>
      <button class="btn sm" data-pg="-1" ${st.page===0?'disabled':''}>Précédent</button><span style="padding:0 6px">${st.page+1} / ${pages}</span><button class="btn sm" data-pg="1" ${st.page>=pages-1?'disabled':''}>Suivant</button></div></div>`;
    res._rows = rows;
  }
  renderBuilder(); renderResults();

  el.onclick = e => {
    const t = e.target.closest('[data-t],[data-facet],[data-afx],[data-sort],[data-pg],[data-radd],[data-rdel],[data-rclear],[data-preset],[data-act],tr[data-i]');
    if (!t) return;
    if (t.dataset.act) { e.stopPropagation(); const tr = t.closest('tr'); const rows = el.querySelector(`#res-${cfg.id}`)._rows; cfg.onAction && cfg.onAction(t.dataset.act, rows[+tr.dataset.i]); return; }
    if (t.dataset.t==='builder') { st.showBuilder = !st.showBuilder; if (st.showBuilder && !st.rules.length) st.rules.push(defaultRule()); saveUI(); renderTable(el,cfg); return; }
    if (t.dataset.t==='views') { viewsMenu(t); return; }
    if (t.dataset.t==='cols') { colsMenu(t); return; }
    if (t.dataset.t==='csv') { exportCsv(); return; }
    if (t.dataset.t==='add') { cfg.add(); return; }
    if (t.dataset.facet) { const k = t.dataset.facet, v = t.dataset.v; const arr = st.facets[k] ||= []; const i = arr.indexOf(v); i>=0 ? arr.splice(i,1) : arr.push(v); st.page=0; saveUI(); renderResults(); return; }
    if (t.dataset.afx) { const p = t.dataset.afx.split('|'); if (p[0]==='all') { st.q=''; st.facets={}; st.rules=[]; q.value=''; } else if (p[0]==='q') { st.q=''; q.value=''; } else if (p[0]==='f') { st.facets[p[1]] = (st.facets[p[1]]||[]).filter(x=>x!==p[2]); } else if (p[0]==='r') { st.rules.splice(+p[1],1); } st.page=0; saveUI(); renderBuilder(); renderResults(); updateBuilderBtn(); return; }
    if (t.dataset.sort) { const col = cfg.columns.find(c=>c.key===t.dataset.sort); if (col && col.sortable===false) return; const k = t.dataset.sort; st.sort = !st.sort||st.sort.key!==k ? {key:k,dir:['money','num','date'].includes(col.type)?-1:1} : st.sort.dir===(['money','num','date'].includes(col.type)?-1:1) ? {key:k,dir:-st.sort.dir} : null; saveUI(); renderResults(); return; }
    if (t.dataset.pg) { st.page += +t.dataset.pg; renderResults(); return; }
    if (t.hasAttribute('data-radd')) { st.rules.push(defaultRule()); renderBuilder(); updateBuilderBtn(); return; }
    if (t.dataset.rdel!==undefined) { st.rules.splice(+t.dataset.rdel,1); st.page=0; saveUI(); renderBuilder(); renderResults(); updateBuilderBtn(); return; }
    if (t.hasAttribute('data-rclear')) { st.rules=[]; saveUI(); renderBuilder(); renderResults(); updateBuilderBtn(); return; }
    if (t.dataset.preset!==undefined) { const p = presets[+t.dataset.preset]; st.rules = JSON.parse(JSON.stringify(p.rules||[])); st.match = p.match||'all'; if (p.facets) st.facets = JSON.parse(JSON.stringify(p.facets)); st.page=0; saveUI(); renderBuilder(); renderResults(); updateBuilderBtn(); toast(`Filtre « ${p.name} » appliqué`); return; }
    if (t.matches('tr[data-i]')) { const rows = el.querySelector(`#res-${cfg.id}`)._rows; const r = rows[+t.dataset.i]; if (r && cfg.onRow) cfg.onRow(r); }
  };
  el.onchange = e => {
    const t = e.target;
    if (t.dataset.rk!==undefined) { const r = st.rules[+t.dataset.rk]; r.key = t.value; const col = cfg.columns.find(c=>c.key===r.key); r.op = OPS[opType(col.type)][0][0]; r.v=''; r.v2=''; renderBuilder(); renderResults(); saveUI(); return; }
    if (t.dataset.ro!==undefined) { const r = st.rules[+t.dataset.ro]; r.op = t.value; renderBuilder(); renderResults(); saveUI(); return; }
    if (t.dataset.rv!==undefined && t.tagName==='SELECT') { st.rules[+t.dataset.rv].v = t.value; st.page=0; renderResults(); saveUI(); return; }
    if (t.hasAttribute('data-match')) { st.match = t.value; renderResults(); saveUI(); return; }
    if (t.hasAttribute('data-size')) { st.size = +t.value; st.page=0; renderResults(); saveUI(); return; }
  };
  el.oninput = e => {
    const t = e.target;
    if (t.dataset.rv!==undefined && t.tagName==='INPUT') { st.rules[+t.dataset.rv].v = t.value; st.page=0; renderResults(); saveUI(); }
    if (t.dataset.rv2!==undefined) { st.rules[+t.dataset.rv2].v2 = t.value; st.page=0; renderResults(); saveUI(); }
  };
  function updateBuilderBtn(){ const b = el.querySelector('[data-t="builder"]'); if (b) { b.classList.toggle('on', st.showBuilder||st.rules.length>0); b.innerHTML = `${ic('filter')} Filtres avancés${st.rules.length?` · ${st.rules.length}`:''}`; } }
  function defaultRule(){ const c = cfg.columns.find(c=>['money','num'].includes(c.type)) || cfg.columns[0]; return {key:c.key, op:OPS[opType(c.type)][0][0], v:'', v2:''}; }
  function viewsMenu(btn){
    const saved = UI.views[cfg.id] || [];
    popMenu(btn, `<div class="mh">Vues enregistrées</div>
      ${saved.length ? saved.map((v,i)=>`<div style="display:flex;align-items:center"><button class="mi" data-vload="${i}">${ic('star','width="14" height="14"')} ${esc(v.name)}</button><button class="btn ghost sm" data-vdel="${i}" aria-label="Supprimer la vue">${ic('trash','width="13" height="13"')}</button></div>`).join('') : '<div class="muted" style="padding:4px 9px 8px;font-size:12px">Aucune vue enregistrée pour cette liste.</div>'}
      ${presets.length ? `<div class="sep"></div><div class="mh">Filtres prédéfinis</div>` + presets.map((p,i)=>`<button class="mi" data-ppre="${i}">${esc(p.name)}</button>`).join('') : ''}
      <div class="sep"></div>
      <div style="display:flex;gap:6px;padding:4px"><input class="inp" id="vname-${cfg.id}" placeholder="Nom de la vue" style="flex:1;padding:5px 8px"><button class="btn sm primary" data-vsave>Enregistrer</button></div>`,
      pop => { pop.onclick = ev => {
        const b = ev.target.closest('[data-vload],[data-vdel],[data-vsave],[data-ppre]'); if (!b) return;
        if (b.dataset.vload!==undefined) { Object.assign(st, JSON.parse(JSON.stringify(saved[+b.dataset.vload].st)), {page:0}); closePop(); saveUI(); renderTable(el,cfg); toast(`Vue « ${saved[+b.dataset.vload].name} » chargée`); }
        else if (b.dataset.vdel!==undefined) { saved.splice(+b.dataset.vdel,1); UI.views[cfg.id]=saved; saveUI(); closePop(); toast('Vue supprimée'); }
        else if (b.dataset.ppre!==undefined) { const p = presets[+b.dataset.ppre]; st.rules = JSON.parse(JSON.stringify(p.rules||[])); st.match=p.match||'all'; if (p.facets) st.facets = JSON.parse(JSON.stringify(p.facets)); st.showBuilder = true; st.page=0; closePop(); saveUI(); renderTable(el,cfg); }
        else if (b.hasAttribute('data-vsave')) { const n = pop.querySelector('input').value.trim(); if (!n) { pop.querySelector('input').focus(); return; } const {q,facets,rules,match,sort,hidden} = st; saved.push({name:n, st:JSON.parse(JSON.stringify({q,facets,rules,match,sort,hidden}))}); UI.views[cfg.id]=saved; saveUI(); closePop(); toast(`Vue « ${n} » enregistrée`); }
      }; });
  }
  function colsMenu(btn){
    popMenu(btn, `<div class="mh">Colonnes affichées</div>` + cfg.columns.map(c=>`<label class="mi"><input type="checkbox" data-col="${esc(c.key)}" ${st.hidden.includes(c.key)?'':'checked'}> ${esc(c.label)}</label>`).join(''),
      pop => { pop.onchange = ev => { const k = ev.target.dataset.col; if (!k) return; if (ev.target.checked) st.hidden = st.hidden.filter(x=>x!==k); else st.hidden.push(k); saveUI(); renderResults(); }; });
  }
  function exportCsv(){
    const rows = filterRows(cfg, st); const vis = cfg.columns.filter(c => !st.hidden.includes(c.key));
    const cell = v => { const s = String(v??''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; };
    const txt = [vis.map(c=>cell(c.label)).join(';')].concat(rows.map(r => vis.map(c => { const v = colVal(c,r); return cell(c.type==='date'?fd(v):v); }).join(';'))).join('\n');
    copyText(txt, `${num(rows.length)} lignes copiées au format CSV (séparateur ;)`);
  }
}

/* ---------- popover menus ---------- */
let popEl = null;
function closePop(){ if (popEl) { popEl.remove(); popEl = null; } }
function popMenu(btn, html, bind){
  const wasOpen = popEl && popEl._btn === btn; closePop(); if (wasOpen) return;
  const p = document.createElement('div'); p.className='menu-pop'; p.innerHTML = html; p._btn = btn;
  btn.parentElement.appendChild(p); popEl = p; bind && bind(p);
  const r = p.getBoundingClientRect(); if (r.left < 8) { p.style.right='auto'; p.style.left='0'; }
}
document.addEventListener('click', e => { if (popEl && !popEl.contains(e.target) && e.target.closest('.menu') !== popEl.parentElement) closePop(); });

/* ================= TIROIR & FORMULAIRES ================= */
function openDrawer({eyebrow='', title='', body='', foot='', onMount}){
  const d = document.getElementById('drawer');
  d.innerHTML = `<div class="drawer-h"><div style="flex:1;min-width:0">${eyebrow?`<div class="eyebrow">${eyebrow}</div>`:''}<h2>${title}</h2></div><button class="icon-btn" data-close aria-label="Fermer">${ic('x')}</button></div>
    <div class="drawer-b">${body}</div>${foot?`<div class="drawer-f">${foot}</div>`:''}`;
  d.classList.add('open'); d.setAttribute('aria-hidden','false'); document.getElementById('drawerScrim').classList.add('open');
  d.querySelector('[data-close]').onclick = closeDrawer;
  onMount && onMount(d);
  setTimeout(()=>d.querySelector('[data-close]').focus(), 30);
}
function closeDrawer(){ const d = document.getElementById('drawer'); d.classList.remove('open'); d.setAttribute('aria-hidden','true'); document.getElementById('drawerScrim').classList.remove('open'); }
const kv = pairs => `<dl class="kv">${pairs.filter(p=>p).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${v===''||v==null?'<span class="muted">—</span>':v}</dd>`).join('')}</dl>`;
const sec = (t, html) => `<section><div class="sec-t">${esc(t)}</div>${html}</section>`;
const miniTable = (heads, rows) => `<div style="overflow-x:auto"><table class="mini"><thead><tr>${heads.map(h=>`<th class="${h.startsWith('#')?'num':''}">${esc(h.replace(/^#/,''))}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr>${r.map((c,i)=>`<td class="${heads[i].startsWith('#')?'num':''}">${c}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${heads.length}" class="muted">Aucune ligne</td></tr>`}</tbody></table></div>`;

function openForm({eyebrow='Saisie', title, fields, values={}, onSave, submitLabel='Enregistrer', onDelete}){
  const f = (x) => {
    const v = values[x.key] ?? x.default ?? '';
    const id = `fld-${x.key}`;
    let input;
    if (x.type==='select') input = `<select class="sel" id="${id}" name="${x.key}">${x.allowEmpty?'<option value="">—</option>':''}${x.options.map(o => { const [val,lab] = Array.isArray(o)?o:[o,o]; return `<option value="${esc(val)}" ${String(val)===String(v)?'selected':''}>${esc(lab)}</option>`; }).join('')}</select>`;
    else if (x.type==='textarea') input = `<textarea class="inp" id="${id}" name="${x.key}" rows="3">${esc(v)}</textarea>`;
    else if (x.type==='checkbox') input = `<label style="display:flex;gap:8px;align-items:center;padding:6px 0"><input type="checkbox" id="${id}" name="${x.key}" ${v?'checked':''}> ${esc(x.hint||'')}</label>`;
    else input = `<input class="inp" id="${id}" name="${x.key}" type="${x.type||'text'}" value="${esc(v)}" ${x.step?`step="${x.step}"`:''} ${x.min!=null?`min="${x.min}"`:''} placeholder="${esc(x.placeholder||'')}">`;
    return `<div class="field ${x.full?'full':''}"><label for="${id}">${esc(x.label)}${x.required?' *':''}</label>${input}</div>`;
  };
  openDrawer({eyebrow, title,
    body:`<form id="frm" class="form-grid" novalidate>${fields.map(f).join('')}<div class="err full" id="frmErr"></div><button type="submit" hidden></button></form>`,
    foot:`${onDelete?`<button class="btn danger" data-del style="margin-right:auto">${ic('trash')} Supprimer</button>`:''}<button class="btn" data-cancel>Annuler</button><button class="btn primary" data-ok>${esc(submitLabel)}</button>`,
    onMount: d => {
      const form = d.querySelector('#frm');
      const submit = () => {
        const out = {};
        for (const x of fields) { const elx = form.elements[x.key]; let v = x.type==='checkbox' ? elx.checked : elx.value; if (x.type==='number') v = v===''?'':Number(v); out[x.key] = v;
          if (x.required && (v===''||v==null)) { d.querySelector('#frmErr').textContent = `Le champ « ${x.label} » est obligatoire.`; elx.focus(); return; } }
        const err = onSave(out); if (typeof err === 'string') { d.querySelector('#frmErr').textContent = err; return; }
        closeDrawer();
      };
      form.addEventListener('submit', e => { e.preventDefault(); submit(); });
      d.querySelector('[data-ok]').onclick = submit;
      d.querySelector('[data-cancel]').onclick = closeDrawer;
      const del = d.querySelector('[data-del]'); if (del) del.onclick = () => { if (del.dataset.confirm) { onDelete(); closeDrawer(); } else { del.dataset.confirm='1'; del.innerHTML = `${ic('trash')} Confirmer la suppression`; } };
    }});
}
const nextNum = (arr, key, prefix, width=5) => { const yr = TODAY.slice(2,4); const n = arr.reduce((m,x)=>{ const mm = String(x[key]||'').match(/(\d+)$/); return mm?Math.max(m,+mm[1]):m; },0)+1; return `${prefix}${yr}-${String(n).padStart(width,'0')}`; };
const newId = p => p + Date.now().toString(36).toUpperCase() + Math.floor(Math.random()*1e4).toString(36).toUpperCase();

/* ---------- graphiques ---------- */
const charts = {};
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function destroyCharts(){ Object.keys(charts).forEach(k => { charts[k].destroy(); delete charts[k]; }); }
function chart(id, cfg){
  const cv = document.getElementById(id); if (!cv || !window.Chart) { if (cv) cv.parentElement.innerHTML = '<div class="empty">Graphique indisponible (bibliothèque non chargée).</div>'; return; }
  if (charts[id]) charts[id].destroy();
  const fg2 = cssVar('--fg-2'), muted = cssVar('--muted'), line = cssVar('--line');
  Chart.defaults.font.family = cssVar('--f-body') || 'IBM Plex Sans';
  Chart.defaults.color = muted;
  const base = { responsive:true, maintainAspectRatio:false, animation:{duration:350}, interaction:{mode:'index',intersect:false},
    plugins:{ legend:{display:false}, tooltip:{ backgroundColor:cssVar('--surface'), titleColor:cssVar('--fg'), bodyColor:fg2, borderColor:line, borderWidth:1, padding:10, boxPadding:4, usePointStyle:true,
      callbacks:{ label: c => ` ${c.dataset.label?c.dataset.label+' : ':''}${cfg.fmt?cfg.fmt(c.parsed.y ?? c.parsed):kda(c.parsed.y ?? c.parsed)}` } } },
    scales: cfg.noScales ? {} : { x:{ grid:{display:false}, border:{color:line}, ticks:{color:muted, maxRotation:0, autoSkip:true} , stacked:!!cfg.stacked}, y:{ grid:{color:line}, border:{display:false}, ticks:{color:muted, callback:v=>cfg.fmtAxis?cfg.fmtAxis(v):kda(v)}, stacked:!!cfg.stacked, beginAtZero:cfg.beginAtZero!==false } } };
  if (cfg.indexAxis==='y') { base.indexAxis='y'; const x = base.scales.x, y = base.scales.y; base.scales = {x:{...y, grid:{color:line}}, y:{...x, grid:{display:false}}}; base.plugins.tooltip.callbacks.label = c => ` ${cfg.fmt?cfg.fmt(c.parsed.x):kda(c.parsed.x)}`; }
  charts[id] = new Chart(cv, { type:cfg.type, data:cfg.data, options: Object.assign(base, cfg.options||{}) });
}
const SER = () => [cssVar('--s1'), cssVar('--s2'), cssVar('--s3'), cssVar('--s4')];
const legend = items => `<div class="legend">${items.map(([c,l])=>`<span><i style="background:${c}"></i>${esc(l)}</span>`).join('')}</div>`;
