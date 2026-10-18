/* ================= ASD — calculs métier, profils, navigation ================= */
const qtyTot = a => Object.values(a.stocks).reduce((s,v)=>s+v,0);
const qtyDep = (a, d) => d ? (a.stocks[d]||0) : qtyTot(a);
function stockStatut(a, d){ const q = qtyDep(a,d); const min = d ? Math.ceil(a.stockMin/2) : a.stockMin; const max = d ? a.stockMax/2 : a.stockMax; return q<=0 ? 'Rupture' : q<=min ? 'Alerte' : q>max ? 'Surstock' : 'OK'; }
const facReste = f => Math.max(0, f.ttc - f.regle);
function facStatut(f){ const r = facReste(f); if (r<=0) return 'Payée'; if (f.echeance < TODAY) return 'En retard'; if (f.regle>0) return 'Partielle'; return 'Non payée'; }
const joursRetard = f => facReste(f)>0 && f.echeance < TODAY ? daysBetween(f.echeance, TODAY) : 0;
const compteSolde = (c, upTo) => c.soldeInitial + sum(D.tresorerie.filter(t=>t.compteId===c.id && (!upTo || t.date<=upTo)), t => t.sens==='Encaissement'?t.montant:-t.montant);
const tresoDispo = () => sum(D.comptes, c=>compteSolde(c));
const ageGaranti = p => p.finGarantie ? daysBetween(TODAY, p.finGarantie) : null;
const achatReste = b => Math.max(0, b.ttc - b.paye);
/* ---------- lots & péremption (FEFO) ---------- */
const lotStatut = l => l.peremption < TODAY ? 'Périmé' : l.peremption <= addDays(TODAY,90) ? 'Expire < 3 mois' : l.peremption <= addDays(TODAY,180) ? 'Expire < 6 mois' : 'Valide';
const lotsOf = (aid, did) => (D.lots||[]).filter(l => l.articleId===aid && l.qte>0 && (!did || l.depotId===did));
const nextPeremption = a => { const l = lotsOf(a.id).filter(x=>x.peremption>=TODAY).sort((x,y)=>x.peremption.localeCompare(y.peremption))[0]; return l ? l.peremption : ''; };
function consumeLots(aid, did, q){ // sortie : on prélève d’abord les lots valides qui expirent le plus tôt
  lotsOf(aid, did).filter(l=>l.peremption>=TODAY).sort((x,y)=>x.peremption.localeCompare(y.peremption)).forEach(l => { const t = Math.min(l.qte, q); l.qte -= t; q -= t; });
}
function addLot(a, did, q){ if (!a.perissable || q<=0) return; D.lots ||= []; const per = addMonths(TODAY, 24); D.lots.unshift({id:newId('L'),lot:`${a.marque.replace(/[^A-Za-z]/g,'').slice(0,2).toUpperCase()}${per.slice(2,4)}${Math.floor(Math.random()*9000+1000)}`,articleId:a.id,depotId:did,qte:q,fabrication:TODAY,peremption:per}); }

/* ---------- profils & accès ---------- */
const PROFILES = {
  direction:{label:'Direction générale', mods:'*'},
  comptable:{label:'Comptabilité & finance', mods:['dashboard','compta','tresorerie','creances','fournisseurs','migration','parametres']},
  commercial:{label:'Commercial (vue filtrée)', mods:['dashboard','ventes','creances','sav','stock'], scoped:true},
  magasin:{label:'Magasin & logistique', mods:['dashboard','stock','ventes','fournisseurs']},
  sav:{label:'Service technique (SAV)', mods:['sav','stock','creances']},
  rh:{label:'Ressources humaines', mods:['rh','parametres']},
};
const canSee = m => { const p = PROFILES[UI.profile] || PROFILES.direction; return p.mods==='*' || p.mods.includes(m); };
const scopeCommercial = () => { if (!PROFILES[UI.profile]?.scoped) return null; return D.employes.find(e=>e.poste==='Commercial terrain' && e.statut==='Actif')?.id || null; };
const inScope = clientId => { const c = scopeCommercial(); return !c || cli(clientId).commercialId === c; };
const S = {
  clients: () => D.clients.filter(c => inScope(c.id)),
  commandes: () => D.commandes.filter(c => inScope(c.clientId)),
  factures: () => D.factures.filter(f => inScope(f.clientId)),
  reglements: () => D.reglements.filter(r => inScope(r.clientId)),
  tickets: () => D.tickets.filter(t => inScope(t.clientId)),
  relances: () => D.relances.filter(r => inScope(r.clientId)),
};

const MODULES = [
  {sec:'Pilotage'},
  {id:'dashboard', label:'Tableau de bord', icon:'grid', render:()=>renderDashboard()},
  {sec:'Opérations'},
  {id:'ventes', label:'Ventes & livraisons', icon:'truck', render:()=>renderVentes()},
  {id:'stock', label:'Stock', icon:'box', render:()=>renderStock()},
  {id:'fournisseurs', label:'Fournisseurs & achats', icon:'cart', render:()=>renderFournisseurs()},
  {id:'sav', label:'SAV & équipements', icon:'wrench', render:()=>renderSav(), tag:'Add-on'},
  {sec:'Finance'},
  {id:'creances', label:'Clients & créances', icon:'users', render:()=>renderCreances()},
  {id:'tresorerie', label:'Trésorerie', icon:'wallet', render:()=>renderTresorerie()},
  {id:'compta', label:'Comptabilité', icon:'book', render:()=>renderCompta()},
  {sec:'Organisation'},
  {id:'rh', label:'Ressources humaines', icon:'id', render:()=>renderRh()},
  {id:'migration', label:'Migration des données', icon:'db', render:()=>renderMigration()},
  {id:'parametres', label:'Paramètres', icon:'cog', render:()=>renderParametres()},
];
const modById = id => MODULES.find(m=>m.id===id);

function renderNav(){
  const late = S.factures().filter(f=>facStatut(f)==='En retard').length;
  const openT = S.tickets().filter(t=>t.statut==='Ouvert').length;
  const badges = {creances: late, sav: openT};
  document.getElementById('nav').innerHTML = MODULES.filter(m => m.sec || canSee(m.id)).map((m,i,arr) => {
    if (m.sec) { const next = arr[i+1]; return next && !next.sec ? `<div class="nav-sec">${m.sec}</div>` : ''; }
    return `<a href="#${m.id}" class="${UI.route===m.id?'active':''}" data-route="${m.id}">${ic(m.icon)}<span>${m.label}</span>${badges[m.id]?`<span class="badge" title="À traiter">${badges[m.id]}</span>`:m.tag?`<span class="tag">${m.tag}</span>`:''}</a>`;
  }).join('');
}
function go(route, tab){
  if (!canSee(route)) route = MODULES.find(m=>m.id && canSee(m.id)).id;
  UI.route = route; if (tab) UI.tabs[route] = tab; saveUI();
  if (location.hash !== '#'+route) history.replaceState(null,'','#'+route);
  render();
  document.getElementById('app').classList.remove('nav-open');
  window.scrollTo({top:0});
}
function goFiltered(route, tab, tableId, patch){ const st = tState(tableId); Object.assign(st, {q:'',facets:{},rules:[],page:0}, patch); go(route, tab); }

function render(){
  closePop(); destroyCharts();
  renderNav();
  const m = modById(UI.route) || modById('dashboard');
  const p = PROFILES[UI.profile];
  const sc = scopeCommercial();
  document.getElementById('crumb').innerHTML = `ASD · <b>${esc(m.label)}</b>${sc?` · <span class="muted">clients de ${esc(empName(sc))}</span>`:''}`;
  m.render();
}

/* ---------- squelette de page module ---------- */
function page({eyebrow, title, sub, kpis=[], tabs=[], actions='', mod}){
  const cur = UI.tabs[mod] && tabs.find(t=>t.id===UI.tabs[mod]) ? UI.tabs[mod] : tabs[0]?.id;
  UI.tabs[mod] = cur;
  document.getElementById('view').innerHTML = `
    <div class="ph"><div class="ph-txt"><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1>${sub?`<p>${sub}</p>`:''}</div><div class="ph-actions">${actions}</div></div>
    ${kpis.length?`<div class="kpis">${kpis.map(k=>`<div class="kpi ${k.go?'clickable':''}" ${k.go?`data-kgo="${k.go}"`:''}><div class="k-l">${k.dot?`<span class="dot" style="background:${k.dot}"></span>`:''}${esc(k.l)}</div><div class="k-v">${k.v}</div>${k.s?`<div class="k-s">${k.s}</div>`:''}</div>`).join('')}</div>`:''}
    ${tabs.length>1?`<div class="tabs" role="tablist">${tabs.map(t=>`<button class="tab ${t.id===cur?'active':''}" role="tab" data-tab="${t.id}">${esc(t.label)}${t.cnt!=null?`<span class="cnt">${t.cnt}</span>`:''}</button>`).join('')}</div>`:''}
    <div id="tabc"></div>`;
  const v = document.getElementById('view');
  v.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { UI.tabs[mod] = b.dataset.tab; saveUI(); render(); });
  v.querySelectorAll('[data-kgo]').forEach(b => b.onclick = () => { const [t] = b.dataset.kgo.split('|'); UI.tabs[mod]=t; saveUI(); render(); });
  const t = tabs.find(x=>x.id===cur); if (t) t.render(document.getElementById('tabc'));
}

/* ================= TABLEAU DE BORD ================= */
function renderDashboard(){
  const f = UI.dash; const sc = scopeCommercial();
  const days = f.periode==='ytd' ? daysBetween(TODAY.slice(0,4)+'-01-01', TODAY)+1 : +f.periode;
  const from = addDays(TODAY, -days+1), prevFrom = addDays(from, -days), prevTo = addDays(from, -1);
  const commF = c => (!f.depot || c.depotId===f.depot) && (!f.commercial || c.commercialId===f.commercial) && inScope(c.clientId);
  const cmds = D.commandes.filter(commF);
  const facs = D.factures.filter(x => commF(ix().cmd.get(x.commandeId) || {}));
  const inP = (d,a,b) => d>=a && d<=b;
  const caP = sum(facs.filter(x=>inP(x.date,from,TODAY)), x=>x.ht), caPrev = sum(facs.filter(x=>inP(x.date,prevFrom,prevTo)), x=>x.ht);
  const delta = caPrev ? (caP-caPrev)/caPrev*100 : 0;
  const cmdP = cmds.filter(c=>inP(c.date,from,TODAY) && c.statut!=='Annulée');
  const stockVal = sum(D.articles, a => qtyDep(a,f.depot)*a.cmup);
  const ruptures = D.articles.filter(a=>stockStatut(a,f.depot)==='Rupture').length;
  const openF = facs.filter(x=>facReste(x)>0); const encours = sum(openF, facReste); const retard = sum(openF.filter(x=>x.echeance<TODAY), facReste);
  const tickets = D.tickets.filter(t=>inScope(t.clientId)); const tOpen = tickets.filter(t=>['Ouvert','En cours'].includes(t.statut)).length;
  const dispo = tresoDispo();
  const pLabel = {30:'30 derniers jours',90:'90 derniers jours',365:'12 derniers mois',ytd:'année en cours'}[f.periode];

  document.getElementById('view').innerHTML = `
    <div class="ph"><div class="ph-txt"><div class="eyebrow">Vue consolidée</div><h1>Tableau de bord</h1><p>Stock, ventes, trésorerie et créances sur une seule page. Les indicateurs suivent les filtres ci-dessous.</p></div></div>
    <div class="filters-row">
      <span class="fl">Période</span>
      <div class="seg" id="dPer">${[['30','30 j'],['90','90 j'],['365','12 mois'],['ytd','Année']].map(([v,l])=>`<button class="${f.periode===v?'on':''}" data-v="${v}">${l}</button>`).join('')}</div>
      <span class="fl" style="margin-left:8px">Dépôt</span>
      <select class="sel" id="dDep"><option value="">Tous les dépôts</option>${D.depots.map(d=>`<option value="${d.id}" ${f.depot===d.id?'selected':''}>${esc(d.nom)}</option>`).join('')}</select>
      <span class="fl" style="margin-left:8px">Commercial</span>
      <select class="sel" id="dCom" ${sc?'disabled':''}><option value="">Tous les commerciaux</option>${D.employes.filter(e=>e.poste==='Commercial terrain'&&e.statut==='Actif').map(e=>`<option value="${e.id}" ${f.commercial===e.id?'selected':''}>${esc(e.prenom+' '+e.nom)} · ${esc(e.wilaya)}</option>`).join('')}</select>
    </div>
    <div class="kpis six">
      <div class="kpi clickable" data-go="compta"><div class="k-l">Chiffre d’affaires HT</div><div class="k-v">${kda(caP)}</div><div class="k-s">${caPrev?`<span class="delta ${delta>=0?'up':'down'}">${delta>=0?'▲':'▼'} ${Math.abs(delta).toFixed(1).replace('.',',')} %</span> vs période précédente`:'Pas d’historique sur la période précédente'}</div></div>
      <div class="kpi clickable" data-go="ventes"><div class="k-l">Commandes</div><div class="k-v">${num(cmdP.length)}</div><div class="k-s">Panier moyen ${kda(cmdP.length?sum(cmdP,c=>c.montantHT)/cmdP.length:0)}</div></div>
      <div class="kpi clickable" data-go="stock"><div class="k-l">Valeur du stock</div><div class="k-v">${kda(stockVal)}</div><div class="k-s">${ruptures} article${ruptures>1?'s':''} en rupture</div></div>
      <div class="kpi clickable" data-go="tresorerie"><div class="k-l">Trésorerie disponible</div><div class="k-v">${kda(dispo)}</div><div class="k-s">${D.comptes.length} comptes et caisse</div></div>
      <div class="kpi clickable" data-go="creances"><div class="k-l">Créances ouvertes</div><div class="k-v">${kda(encours)}</div><div class="k-s"><span style="color:var(--bad);font-weight:600">${kda(retard)}</span> en retard</div></div>
      <div class="kpi clickable" data-go="sav"><div class="k-l">Tickets SAV actifs</div><div class="k-v">${tOpen}</div><div class="k-s">${tickets.filter(t=>t.priorite==='Critique'&&t.statut!=='Clôturé'&&t.statut!=='Résolu').length} critiques</div></div>
    </div>
    <div class="panel" style="margin-bottom:14px">
      <div class="panel-h"><h3>Cycle commande → livraison</h3><span class="sub">Commandes ${esc(pLabel)}, tous flux confondus. Cliquez une étape pour voir la liste.</span></div>
      <div class="pipe" id="pipe"></div>
    </div>
    <div class="grid g-21" style="margin-bottom:14px">
      <div class="panel"><div class="panel-h"><h3>Chiffre d’affaires mensuel par circuit</h3><span class="sub">12 derniers mois, HT</span></div><div class="chart-box"><canvas id="cCA" role="img" aria-label="Chiffre d’affaires mensuel par circuit comptable"></canvas></div>${legend([[SER()[0],'Circuit A · soumis à la fiscalité'],[SER()[1],'Circuit B · non soumis']])}</div>
      <div class="panel"><div class="panel-h"><h3>Alertes à traiter</h3><span class="sub">Toutes sources</span></div><div class="alerts" id="alerts"></div></div>
    </div>
    <div class="grid g-3" style="margin-bottom:14px">
      <div class="panel"><div class="panel-h"><h3>Trésorerie disponible</h3><span class="sub">Solde total, 26 dernières semaines</span></div><div class="chart-box sm"><canvas id="cTR" role="img" aria-label="Évolution de la trésorerie"></canvas></div></div>
      <div class="panel"><div class="panel-h"><h3>Balance âgée des créances</h3><span class="sub">Reste à encaisser par ancienneté</span></div><div class="chart-box sm"><canvas id="cAG" role="img" aria-label="Balance âgée"></canvas></div></div>
      <div class="panel"><div class="panel-h"><h3>Stock par catégorie</h3><span class="sub">Valeur au CMUP${f.depot?' · '+esc(dep(f.depot).nom):''}</span></div><div class="chart-box sm"><canvas id="cST" role="img" aria-label="Valeur du stock par catégorie"></canvas></div></div>
    </div>
    <div class="grid g-2">
      <div class="panel"><div class="panel-h"><h3>Meilleures ventes</h3><span class="sub">Articles par CA HT, ${esc(pLabel)}</span></div><div class="toplist" id="top"></div></div>
      <div class="panel"><div class="panel-h"><h3>Performance commerciale</h3><span class="sub">CA HT ${esc(pLabel)} par commercial</span></div><div class="toplist" id="topc"></div></div>
    </div>`;
  const v = document.getElementById('view');
  v.querySelectorAll('#dPer button').forEach(b => b.onclick = () => { f.periode = b.dataset.v; saveUI(); render(); });
  v.querySelector('#dDep').onchange = e => { f.depot = e.target.value; saveUI(); render(); };
  v.querySelector('#dCom').onchange = e => { f.commercial = e.target.value; saveUI(); render(); };
  v.querySelectorAll('[data-go]').forEach(k => k.onclick = () => go(k.dataset.go));

  // pipeline
  const stages = ['Brouillon','Validée','Préparée','Expédiée','En livraison','Livrée'];
  const cnt = stages.map(s => cmdP.filter(c=>c.statut===s).length); const mx = Math.max(...cnt,1);
  v.querySelector('#pipe').innerHTML = stages.map((s,i)=>`<div class="pipe-s" data-st="${s}" role="button" tabindex="0"><div class="l">${i+1}. ${s}</div><div class="n">${cnt[i]}</div><div class="b" style="width:${Math.max(4,cnt[i]/mx*100)}%;${s==='Livrée'?'background:var(--ok)':''}"></div></div>`).join('');
  v.querySelectorAll('.pipe-s').forEach(p => p.onclick = () => goFiltered('ventes','commandes','commandes',{facets:{statut:[p.dataset.st]}}));

  // CA chart
  const months = []; for (let i=11;i>=0;i--){ const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-i); months.push(isoD(d).slice(0,7)); }
  const caA = months.map(m => sum(facs.filter(x=>x.date.startsWith(m)&&x.circuit==='A'), x=>x.ht));
  const caB = months.map(m => sum(facs.filter(x=>x.date.startsWith(m)&&x.circuit==='B'), x=>x.ht));
  const [s1,s2,s3,s4] = SER();
  chart('cCA',{type:'bar',stacked:true,data:{labels:months.map(monthLabel),datasets:[{label:'Circuit A',data:caA,backgroundColor:s1,borderRadius:4,borderColor:cssVar('--surface'),borderWidth:{top:2},maxBarThickness:28},{label:'Circuit B',data:caB,backgroundColor:s2,borderRadius:4,borderColor:cssVar('--surface'),borderWidth:{top:2},maxBarThickness:28}]}});

  // tréso weekly
  const wk = []; for (let i=25;i>=0;i--) wk.push(addDays(TODAY,-i*7));
  const tv = wk.map(d => sum(D.comptes, c=>compteSolde(c,d)));
  chart('cTR',{type:'line',data:{labels:wk.map(fd).map(s=>s.slice(0,5)),datasets:[{label:'Trésorerie',data:tv,borderColor:s3,backgroundColor:s3+'22',fill:true,tension:.3,pointRadius:0,pointHoverRadius:4,borderWidth:2}]},beginAtZero:false});

  // aging
  const B = [['Non échu',0],['1–30 j',0],['31–60 j',0],['61–90 j',0],['> 90 j',0]];
  openF.forEach(x => { const j = joursRetard(x); const r = facReste(x); B[j<=0?0:j<=30?1:j<=60?2:j<=90?3:4][1]+=r; });
  chart('cAG',{type:'bar',data:{labels:B.map(b=>b[0]),datasets:[{data:B.map(b=>b[1]),backgroundColor:[s1,s4,s4,s2,s2].map((c,i)=>i===0?cssVar('--s1'):c),borderRadius:4,maxBarThickness:34}]}});

  // stock by cat
  const cats = groupBy(D.articles, a=>a.categorie); const cv = Object.entries(cats).map(([k,arr])=>[k,sum(arr,a=>qtyDep(a,f.depot)*a.cmup)]).sort((a,b)=>b[1]-a[1]);
  chart('cST',{type:'bar',indexAxis:'y',data:{labels:cv.map(c=>c[0]),datasets:[{data:cv.map(c=>c[1]),backgroundColor:s1,borderRadius:4,maxBarThickness:16}]},options:{scales:{y:{grid:{display:false},ticks:{color:cssVar('--muted'),font:{size:11}}},x:{grid:{color:cssVar('--line')},ticks:{color:cssVar('--muted'),maxRotation:0,maxTicksLimit:4,callback:v=>kda(v)}}}}});

  // top articles
  const ta = {}; cmdP.forEach(c => c.lignes.forEach(l => { ta[l.articleId] = (ta[l.articleId]||0) + l.qte*l.pu*(1-l.remise/100); }));
  const tops = Object.entries(ta).sort((a,b)=>b[1]-a[1]).slice(0,7); const tm = tops[0]?.[1]||1;
  v.querySelector('#top').innerHTML = tops.map(([id,val])=>`<div class="tl-row" style="cursor:pointer" data-art="${id}"><span>${esc(art(id).designation)} <span class="muted mono">${esc(art(id).ref)}</span></span><span class="num">${kda(val)}</span><div class="bar"><i style="width:${val/tm*100}%"></i></div></div>`).join('') || '<div class="empty">Aucune vente sur la période.</div>';
  v.querySelectorAll('[data-art]').forEach(r => r.onclick = () => openArticle(art(r.dataset.art)));
  const tc = {}; cmdP.forEach(c => { tc[c.commercialId] = (tc[c.commercialId]||0) + c.montantHT; });
  const topc = Object.entries(tc).sort((a,b)=>b[1]-a[1]).slice(0,8); const tcm = topc[0]?.[1]||1;
  v.querySelector('#topc').innerHTML = topc.map(([id,val])=>`<div class="tl-row"><span>${esc(empName(id))} <span class="muted">· ${esc(emp(id).wilaya||'')}</span></span><span class="num">${kda(val)}</span><div class="bar"><i style="width:${val/tcm*100}%;background:${s3}"></i></div></div>`).join('') || '<div class="empty">Aucune donnée.</div>';

  // alerts
  const al = [];
  const rupt = D.articles.filter(a=>stockStatut(a,f.depot)==='Rupture');
  if (rupt.length) al.push(['bad','!',`${rupt.length} article${rupt.length>1?'s':''} en rupture de stock`, rupt.slice(0,3).map(a=>a.designation).join(', ')+(rupt.length>3?'…':''), ()=>goFiltered('stock','alertes','alertes',{})]);
  const chq = D.cheques.filter(c=>c.sens==='Reçu'&&c.statut==='En portefeuille'&&c.dateEcheance<=addDays(TODAY,7));
  if (chq.length) al.push(['warn','Ch',`${chq.length} chèque${chq.length>1?'s':''} à présenter sous 7 jours`, `${da(sum(chq,c=>c.montant))} en portefeuille`, ()=>goFiltered('tresorerie','cheques','cheques',{facets:{statut:['En portefeuille']},rules:[{key:'dateEcheance',op:'before',v:addDays(TODAY,8),v2:''}]})]);
  const late90 = openF.filter(x=>joursRetard(x)>90);
  if (late90.length) al.push(['bad','€',`${late90.length} facture${late90.length>1?'s':''} impayée${late90.length>1?'s':''} depuis plus de 90 jours`, `${da(sum(late90,facReste))} à recouvrer`, ()=>goFiltered('creances','factures','factures',{rules:[{key:'jr',op:'gt',v:'90',v2:''}]})]);
  const ctr = D.employes.filter(e=>e.statut==='Actif'&&e.finContrat&&e.finContrat>=TODAY&&e.finContrat<=addDays(TODAY,30));
  if (ctr.length && canSee('rh')) al.push(['warn','RH',`${ctr.length} contrat${ctr.length>1?'s':''} arrive${ctr.length>1?'nt':''} à échéance sous 30 jours`, ctr.slice(0,2).map(e=>e.prenom+' '+e.nom).join(', ')+(ctr.length>2?'…':''), ()=>go('rh','contrats')]);
  const crit = tickets.filter(t=>t.priorite==='Critique'&&['Ouvert','En cours'].includes(t.statut));
  if (crit.length) al.push(['bad','SAV',`${crit.length} ticket${crit.length>1?'s':''} SAV critique${crit.length>1?'s':''} non résolu${crit.length>1?'s':''}`, 'Priorité critique', ()=>goFiltered('sav','tickets','tickets',{facets:{priorite:['Critique'],statut:['Ouvert','En cours']}})]);
  const lowC = D.comptes.filter(c=>compteSolde(c)<c.seuil);
  if (lowC.length) al.push(['bad','DA',`${lowC.length} compte${lowC.length>1?'s':''} sous le seuil critique`, lowC.map(c=>c.libelle.split(' — ')[0]).join(', '), ()=>go('tresorerie','comptes')]);
  const lp = cmds.filter(c=>c.statut==='En livraison'&&['Reporté','Absent','Refusé'].includes(c.statutLivraison));
  if (lp.length) al.push(['warn','Lv',`${lp.length} livraison${lp.length>1?'s':''} en échec (reportée, absent, refusée)`, 'À replanifier', ()=>go('ventes','livraisons')]);
  const lotsRisk = (D.lots||[]).filter(l=>l.qte>0 && (!f.depot||l.depotId===f.depot) && ['Périmé','Expire < 3 mois'].includes(lotStatut(l)));
  if (lotsRisk.length && canSee('stock')) al.push(['bad','Lot',`${lotsRisk.length} lots périmés ou à moins de 3 mois de péremption`, `${da(sum(lotsRisk,l=>l.qte*art(l.articleId).cmup))} de stock concerné`, ()=>goFiltered('stock','lots','lots',{facets:{statut:['Périmé','Expire < 3 mois']}})]);
  const ecarts = D.achats.filter(b=>b.rapprochement.startsWith('Écart'));
  if (ecarts.length && canSee('fournisseurs')) al.push(['info','BC',`${ecarts.length} réception${ecarts.length>1?'s':''} fournisseur avec écart`, 'Rapprochement BC / BL / facture', ()=>goFiltered('fournisseurs','bc','achats',{facets:{rapprochement:['Écart quantité','Écart prix']}})]);
  v.querySelector('#alerts').innerHTML = al.map((a,i)=>`<div class="al" data-al="${i}" role="button" tabindex="0"><div class="ic ${a[0]}">${a[1]}</div><div style="min-width:0"><div>${esc(a[2])}</div><div class="m">${esc(a[3])}</div></div></div>`).join('') || '<div class="empty">Rien à signaler.</div>';
  v.querySelectorAll('[data-al]').forEach(x => x.onclick = () => al[+x.dataset.al][4]());
}

/* ================= VENTES & LIVRAISONS ================= */
const CMD_FLOW = ['Brouillon','Validée','Préparée','Expédiée','En livraison','Livrée'];
const stepper = (flow, cur) => { const i = flow.indexOf(cur); return `<span class="stepper" title="${esc(cur)}">${flow.map((s,k)=>`<i class="${cur==='Annulée'?'cancel':k<=i?'done':''}"></i>`).join('')}</span>`; };
function renderVentes(){
  const cmds = S.commandes();
  const enCours = cmds.filter(c=>['Validée','Préparée','Expédiée','En livraison'].includes(c.statut));
  const liv = cmds.filter(c=>c.statut==='En livraison');
  const mois = cmds.filter(c=>c.date.slice(0,7)===TODAY.slice(0,7) && c.statut!=='Annulée');
  page({mod:'ventes', eyebrow:'Opérations', title:'Ventes & livraisons', sub:'Commandes clients et suivi du cycle commande → livraison. Les statuts saisis par les livreurs remontent ici.',
    kpis:[{l:'Commandes ce mois',v:num(mois.length),s:kda(sum(mois,c=>c.montantHT))+' HT'},{l:'En cours de traitement',v:num(enCours.length),s:kda(sum(enCours,c=>c.ttc))+' TTC'},{l:'En livraison',v:num(liv.length),s:`${liv.filter(c=>c.statutLivraison!=='En route').length} en échec`,go:'livraisons'},{l:'Taux de livraison à temps',v:Math.round(cmds.filter(c=>c.dateLivraison&&c.dateLivraison<=c.dateLivraisonPrevue).length/Math.max(1,cmds.filter(c=>c.dateLivraison).length)*100)+' %',s:'Commandes livrées'}],
    tabs:[{id:'commandes',label:'Commandes',cnt:cmds.length,render:el=>renderTable(el,cmdTableCfg())},{id:'livraisons',label:'Tournées & livraisons',cnt:enCours.filter(c=>c.livreurId).length,render:renderTournees}]});
}
function cmdTableCfg(){
  return {id:'commandes', noun:'les commandes', rows:S.commandes, onRow:openCommande, add:()=>newCommandeForm(), addLabel:'Nouvelle commande',
    facets:['statut','segment','circuit'],
    columns:[
      {key:'num',label:'N° commande',strong:true,render:r=>`<span class="mono">${r.num}</span>`},
      {key:'date',label:'Date',type:'date'},
      {key:'client',label:'Client',get:r=>cli(r.clientId).raison},
      {key:'segment',label:'Segment',type:'enum',get:r=>cli(r.clientId).gros?'Vente en gros':'Détail',render:r=>pill(cli(r.clientId).gros?'Vente en gros':'Détail',cli(r.clientId).gros?'acc':'plain')},
      {key:'typeClient',label:'Type de client',type:'enum',pill:false,get:r=>cli(r.clientId).type,hidden:true},
      {key:'wilaya',label:'Wilaya',type:'enum',pill:false,get:r=>cli(r.clientId).wilaya,hidden:true},
      {key:'commercial',label:'Commercial',type:'enum',pill:false,get:r=>empName(r.commercialId)},
      {key:'depot',label:'Dépôt',type:'enum',pill:false,get:r=>dep(r.depotId).nom},
      {key:'circuit',label:'Circuit',type:'enum',get:r=>r.circuit,render:r=>circ(r.circuit),facetLabel:v=>v==='A'?'A · Soumis':'B · Non soumis'},
      {key:'nl',label:'Lignes',type:'num',get:r=>r.lignes.length,hidden:true},
      {key:'montantHT',label:'Montant HT',type:'money',sum:true},
      {key:'ttc',label:'Montant TTC',type:'money',sum:true},
      {key:'avancement',label:'Avancement',sortable:false,filter:false,render:r=>stepper(CMD_FLOW,r.statut)},
      {key:'statut',label:'Statut',type:'enum',facetOptions:[...CMD_FLOW,'Annulée']},
      {key:'statutLivraison',label:'Livraison',type:'enum'},
      {key:'livreur',label:'Livreur',type:'enum',pill:false,get:r=>r.livreurId?empName(r.livreurId):''},
      {key:'dateLivraison',label:'Livrée le',type:'date',hidden:true},
    ],
    presets:[
      {name:'Ventes en gros > 2 M DA',rules:[{key:'segment',op:'in',v:'Vente en gros'},{key:'ttc',op:'gte',v:'2000000',v2:''}]},
      {name:'Livraisons en échec',match:'any',rules:[{key:'statutLivraison',op:'in',v:'Reporté'},{key:'statutLivraison',op:'in',v:'Absent'},{key:'statutLivraison',op:'in',v:'Refusé'}]},
      {name:'Ce mois-ci',rules:[{key:'date',op:'thismonth',v:'',v2:''}]},
      {name:'Circuit B, 90 derniers jours',rules:[{key:'circuit',op:'in',v:'B'},{key:'date',op:'last90',v:'',v2:''}]},
    ]};
}
function openCommande(c){
  const cl = cli(c.clientId); const fac = D.factures.find(f=>f.commandeId===c.id);
  const i = CMD_FLOW.indexOf(c.statut); const next = c.statut!=='Annulée' && i>=0 && i<CMD_FLOW.length-1 ? CMD_FLOW[i+1] : null;
  const verb = {Validée:'Valider la commande',Préparée:'Marquer préparée',Expédiée:'Expédier et facturer','En livraison':'Mettre en livraison',Livrée:'Confirmer la livraison'};
  openDrawer({eyebrow:'Commande client', title:`${c.num}`,
    body: `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${pill(c.statut)} ${circ(c.circuit)} ${stepper(CMD_FLOW,c.statut)}</div>`
      + kv([['Client',`<a href="#" data-cl>${esc(cl.raison)}</a> <span class="muted">(${esc(cl.code)})</span>`],['Date',fd(c.date)],['Commercial',esc(empName(c.commercialId))],['Dépôt',esc(dep(c.depotId).nom)],['Adresse de livraison',esc(c.adresse)],['Livraison prévue',fd(c.dateLivraisonPrevue)],['Livreur',c.livreurId?esc(empName(c.livreurId)):''],['Statut livraison',c.statutLivraison?pill(c.statutLivraison):''],['Livrée le',fd(c.dateLivraison)],['Facture',fac?`<a href="#" data-fac>${fac.num}</a> · ${pill(facStatut(fac))}`:'']])
      + sec('Lignes', miniTable(['Article','#Qté','#PU HT','#Remise','#Total HT'], c.lignes.map(l=>[`${esc(art(l.articleId).designation)}<div class="muted mono" style="font-size:11px">${esc(art(l.articleId).ref)}</div>`, num(l.qte), da(l.pu), l.remise?l.remise+' %':'—', da(l.qte*l.pu*(1-l.remise/100))]).concat([[`<b>Total</b>`,'','','',`<b>${da(c.montantHT)}</b>`],['TVA '+(c.circuit==='A'?'19 %':'(non soumis)'),'','','',da(c.tva)],['<b>Total TTC</b>','','','',`<b>${da(c.ttc)}</b>`]])))
      + (cl.plafond ? sec('Encours client', encoursBar(cl)) : ''),
    foot: `${c.statut!=='Livrée'&&c.statut!=='Annulée'?`<button class="btn danger" data-cancel style="margin-right:auto">Annuler</button>`:''}${next?`<button class="btn primary" data-next>${ic('check')} ${verb[next]}</button>`:''}`,
    onMount: d => {
      d.querySelector('[data-cl]').onclick = e => { e.preventDefault(); openClient(cl); };
      const fa = d.querySelector('[data-fac]'); if (fa) fa.onclick = e => { e.preventDefault(); openFacture(fac); };
      const nx = d.querySelector('[data-next]'); if (nx) nx.onclick = () => { advanceCommande(c, next); openCommande(c); render(); };
      const cn = d.querySelector('[data-cancel]'); if (cn) cn.onclick = () => { if (!cn.dataset.c) { cn.dataset.c=1; cn.textContent='Confirmer l’annulation'; return; } c.statut='Annulée'; c.statutLivraison=''; save(); toast(`${c.num} annulée`); closeDrawer(); render(); };
    }});
}
function advanceCommande(c, next){
  c.statut = next;
  if (next==='Expédiée') {
    if (!c.livreurId) c.livreurId = (D.employes.find(e=>e.poste==='Livreur'&&e.depotId===c.depotId) || D.employes.find(e=>e.poste==='Livreur')).id;
    c.lignes.forEach(l => { const a = art(l.articleId); a.stocks[c.depotId] = Math.max(0,(a.stocks[c.depotId]||0)-l.qte); if (a.perissable) consumeLots(a.id, c.depotId, l.qte); D.mouvements.unshift({id:newId('M'),date:TODAY,type:'Sortie',articleId:a.id,depotId:c.depotId,depotDestId:'',qte:l.qte,coutUnitaire:a.cmup,reference:c.num,motif:'Livraison client',utilisateur:PROFILES[UI.profile].label}); });
    if (!D.factures.find(f=>f.commandeId===c.id)) { const cl = cli(c.clientId); const f = {id:newId('FA'),num:nextNum(D.factures,'num','FA'),commandeId:c.id,clientId:c.clientId,commercialId:c.commercialId,date:TODAY,echeance:addDays(TODAY,cl.delai),ht:c.montantHT,tva:c.tva,ttc:c.ttc,regle:0,circuit:c.circuit,echeances:[]}; D.factures.unshift(f);
      const l = [['411000',f.ttc,0],['700000',0,f.ht]]; if (f.tva) l.push(['445700',0,f.tva]); D.ecritures.unshift({id:newId('EC'),num:nextNum(D.ecritures,'num','VTE-'),date:TODAY,journal:'VTE',libelle:`Facture ${f.num} — ${cl.raison}`,circuit:f.circuit,lignes:l,origine:'Créances',reference:f.num,statut:'Brouillard'});
      toast(`Facture ${f.num} générée, écriture comptable passée au circuit ${f.circuit}`); }
  }
  if (next==='En livraison') c.statutLivraison = 'En route';
  if (next==='Livrée') { c.statutLivraison='Livré'; c.dateLivraison=TODAY;
    c.lignes.forEach(l => { const a = art(l.articleId); if (!a.serialise) return; for (let k=0;k<l.qte;k++){ const stockP = D.pieces.find(p=>p.articleId===a.id && p.statut==='En stock'); const p = stockP || {id:newId('P'),serial:`${a.marque.slice(0,2).toUpperCase()}${TODAY.slice(2,4)}${Math.floor(Math.random()*900000+100000)}`,articleId:a.id,dateEntree:TODAY,depotId:c.depotId}; Object.assign(p,{clientId:c.clientId,commandeId:c.id,dateVente:TODAY,garantieMois:a.garantieMois,finGarantie:addMonths(TODAY,a.garantieMois),statut:'Sous garantie'}); if (!stockP) D.pieces.unshift(p); } });
  }
  save(); if (next!=='Expédiée') toast(`${c.num} : ${next}`);
}
function encoursBar(cl){
  const enc = sum(D.factures.filter(f=>f.clientId===cl.id), facReste); const pct = Math.min(100, enc/cl.plafond*100);
  const col = pct>90?'var(--bad)':pct>70?'var(--warn)':'var(--ok)';
  return `<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px"><span>Encours <b>${da(enc)}</b></span><span class="muted">Plafond ${da(cl.plafond)}</span></div><div style="height:8px;background:var(--surface-2);border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${col};border-radius:4px"></div></div><div class="muted" style="font-size:12px;margin-top:5px">${Math.round(pct)} % du plafond autorisé utilisé</div>`;
}
function newCommandeForm(){
  const clients = S.clients().slice().sort((a,b)=>a.raison.localeCompare(b.raison,'fr'));
  const arts = D.articles.slice().sort((a,b)=>a.designation.localeCompare(b.designation,'fr')).map(a=>[a.id,`${a.designation} — ${da(a.prixVente)}`]);
  openForm({eyebrow:'Ventes', title:'Nouvelle commande client', submitLabel:'Créer la commande',
    fields:[{key:'clientId',label:'Client',type:'select',options:clients.map(c=>[c.id,`${c.raison} · ${c.wilaya}`]),required:true,full:true},
      {key:'depotId',label:'Dépôt d’expédition',type:'select',options:D.depots.map(d=>[d.id,d.nom])},{key:'date',label:'Date',type:'date',default:TODAY},
      {key:'a1',label:'Article 1',type:'select',options:arts,required:true,full:true},{key:'q1',label:'Quantité 1',type:'number',default:1,min:1},{key:'r1',label:'Remise 1 (%)',type:'number',default:0,min:0},
      {key:'a2',label:'Article 2',type:'select',options:arts,allowEmpty:true,full:true},{key:'q2',label:'Quantité 2',type:'number',default:1,min:1},{key:'r2',label:'Remise 2 (%)',type:'number',default:0,min:0},
      {key:'force',label:'Dépassement de plafond',type:'checkbox',hint:'Autoriser si l’encours dépasse le plafond',full:true}],
    onSave: v => {
      const cl = cli(v.clientId); const lignes = [];
      [[v.a1,v.q1,v.r1],[v.a2,v.q2,v.r2]].forEach(([a,q,r]) => { if (a && q>0) lignes.push({articleId:a,qte:+q,pu:art(a).prixVente,remise:+r||0}); });
      const ht = Math.round(sum(lignes,l=>l.qte*l.pu*(1-l.remise/100))); const circuit = cl.assujettiTVA?'A':'B'; const tva = circuit==='A'?Math.round(ht*.19):0;
      const enc = sum(D.factures.filter(f=>f.clientId===cl.id), facReste);
      if (enc + ht + tva > cl.plafond && !v.force) return `Encours actuel ${da(enc)} + cette commande ${da(ht+tva)} dépasse le plafond de ${da(cl.plafond)}. Cochez « Autoriser » pour forcer.`;
      const c = {id:newId('CM'),num:nextNum(D.commandes,'num','BC'),date:v.date||TODAY,clientId:cl.id,commercialId:cl.commercialId,depotId:v.depotId,lignes,montantHT:ht,tva,ttc:ht+tva,circuit,statut:'Brouillon',livreurId:null,dateLivraisonPrevue:addDays(v.date||TODAY,3),dateLivraison:'',statutLivraison:'',adresse:`${cl.wilaya}`,tournee:''};
      D.commandes.unshift(c); save(); toast(`Commande ${c.num} créée (circuit ${circuit})`); render(); setTimeout(()=>openCommande(c),250);
    }});
}
function renderTournees(el){
  const cmds = S.commandes().filter(c=>['Expédiée','En livraison'].includes(c.statut) && c.livreurId);
  const byL = groupBy(cmds, c=>c.livreurId);
  const recent = S.commandes().filter(c=>c.statut==='Livrée' && c.dateLivraison>=addDays(TODAY,-7));
  el.innerHTML = `<div class="callout" style="margin-bottom:14px">${ic('truck','width="18" height="18"')}<div>Chaque carte correspond à la tournée d’un livreur. Les boutons de statut reproduisent ce que le livreur saisira depuis l’application mobile ; la mise à jour est immédiate dans les commandes et le tableau de bord. <span class="muted">${recent.length} livraisons effectuées ces 7 derniers jours.</span></div></div>
    <div class="board">${Object.entries(byL).map(([lid, list]) => { const e = emp(lid); return `<div class="card-l"><div style="display:flex;gap:10px;align-items:center"><div class="av">${esc(initials(e.prenom,e.nom))}</div><div style="min-width:0;flex:1"><div style="font-weight:600">${esc(e.prenom+' '+e.nom)}</div><div class="muted" style="font-size:12px">Tournée ${esc(dep(e.depotId).code)} · ${list.length} arrêt${list.length>1?'s':''}</div></div><span class="mono muted" style="font-size:12px">${kda(sum(list,c=>c.ttc))}</span></div>
      ${list.sort((a,b)=>a.dateLivraisonPrevue.localeCompare(b.dateLivraisonPrevue)).map((c,i)=>`<div class="stop" data-cmd="${c.id}"><span class="seq">${i+1}</span><div style="flex:1;min-width:0"><div style="font-weight:500">${esc(cli(c.clientId).raison)}</div><div class="muted" style="font-size:11.5px">${esc(c.adresse)} · <span class="mono">${c.num}</span></div><div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:5px">${c.statut==='Expédiée'?pill('Expédiée')+` <button class="btn sm" data-ls="En route">Démarrer</button>`:pill(c.statutLivraison)+['Livré','Reporté','Absent','Refusé'].map(s=>`<button class="btn sm ${s==='Livré'?'primary':''}" data-ls="${s}">${s}</button>`).join('')}</div></div></div>`).join('')}</div>`; }).join('') || '<div class="empty">Aucune livraison en cours.</div>'}</div>`;
  el.onclick = e => {
    const b = e.target.closest('[data-ls]'); const stop = e.target.closest('[data-cmd]'); if (!stop) return;
    const c = D.commandes.find(x=>x.id===stop.dataset.cmd);
    if (!b) { openCommande(c); return; }
    const s = b.dataset.ls;
    if (s==='En route') advanceCommande(c,'En livraison');
    else if (s==='Livré') advanceCommande(c,'Livrée');
    else { c.statutLivraison = s; save(); toast(`${c.num} : ${s.toLowerCase()}`); }
    render();
  };
}
