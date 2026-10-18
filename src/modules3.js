/* ================= TRÉSORERIE ================= */
function renderTresorerie(){
  const dispo = tresoDispo();
  const port = D.cheques.filter(c=>c.sens==='Reçu'&&['En portefeuille','Remis à l’encaissement'].includes(c.statut));
  const emis = D.cheques.filter(c=>c.sens==='Émis'&&c.statut==='Émis');
  const nr = D.tresorerie.filter(t=>!t.rapproche);
  const soon = D.cheques.filter(c=>c.sens==='Reçu'&&c.statut==='En portefeuille'&&c.dateEcheance<=addDays(TODAY,7));
  page({mod:'tresorerie', eyebrow:'Finance', title:'Trésorerie', sub:'Comptes bancaires, CCP et caisse, gestion électronique des chèques, prévisionnel et rapprochement bancaire.',
    kpis:[{l:'Disponible',v:kda(dispo),s:`${D.comptes.filter(c=>compteSolde(c)<c.seuil).length} compte(s) sous le seuil`,go:'comptes'},{l:'Chèques reçus à encaisser',v:kda(sum(port,c=>c.montant)),s:`${port.length} chèques · ${soon.length} à présenter sous 7 j`,dot:'var(--warn)',go:'cheques'},{l:'Chèques émis non débités',v:kda(sum(emis,c=>c.montant)),s:`${emis.length} chèques`,go:'cheques'},{l:'Opérations à rapprocher',v:nr.length,s:kda(sum(nr,t=>t.montant))+' en jeu',go:'rapprochement'}],
    actions:`<button class="btn" id="btnMv">${ic('plus')} Nouvelle opération</button>`,
    tabs:[{id:'comptes',label:'Comptes',cnt:D.comptes.length,render:renderComptes},{id:'mouvements',label:'Mouvements',cnt:D.tresorerie.length,render:el=>renderTable(el,tresoCfg())},{id:'cheques',label:'Chèques',cnt:D.cheques.length,render:renderCheques},{id:'previsionnel',label:'Prévisionnel',render:renderPrev},{id:'rapprochement',label:'Rapprochement bancaire',cnt:nr.length,render:renderRappro}]});
  document.getElementById('btnMv').onclick = tresoForm;
}
function renderComptes(el){
  el.innerHTML = `<div class="grid g-3" style="margin-bottom:14px">${D.comptes.map(c => { const s = compteSolde(c); const low = s<c.seuil; const last = D.tresorerie.filter(t=>t.compteId===c.id).slice(0,1)[0];
    return `<div class="panel" style="${low?'border-color:var(--bad)':''}"><div class="panel-h"><h3>${esc(c.libelle)}</h3>${pill(c.type,'plain')}</div><div class="kpi" style="border:0;padding:0"><div class="k-v">${da(s)}</div><div class="k-s">${low?`<span style="color:var(--bad);font-weight:600">Sous le seuil critique de ${da(c.seuil)}</span>`:`Seuil d’alerte ${da(c.seuil)}`}</div></div><div style="margin-top:10px">${kv([['RIB',`<span class="mono" style="font-size:11.5px">${esc(c.rib)}</span>`],['Compte comptable',`<span class="mono">${c.compteCompta}</span>`],['Dernière opération',last?fd(last.date)+' · '+(last.sens==='Encaissement'?'+':'−')+da(last.montant):'']])}</div></div>`; }).join('')}</div>
    <div class="panel"><div class="panel-h"><h3>Encaissements et décaissements par mois</h3><span class="sub">Tous comptes, 12 derniers mois</span></div><div class="chart-box"><canvas id="cFl" role="img" aria-label="Flux mensuels"></canvas></div>${legend([[SER()[2],'Encaissements'],[SER()[1],'Décaissements']])}</div>`;
  const months = []; for (let i=11;i>=0;i--){ const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-i); months.push(isoD(d).slice(0,7)); }
  const flow = s => months.map(m => sum(D.tresorerie.filter(t=>t.sens===s&&t.date.startsWith(m)&&t.categorie!=='Virement interne'),t=>t.montant));
  chart('cFl',{type:'bar',data:{labels:months.map(monthLabel),datasets:[{label:'Encaissements',data:flow('Encaissement'),backgroundColor:SER()[2],borderRadius:4,maxBarThickness:18},{label:'Décaissements',data:flow('Décaissement'),backgroundColor:SER()[1],borderRadius:4,maxBarThickness:18}]}});
}
function tresoCfg(){
  return {id:'treso', noun:'les mouvements', rows:()=>D.tresorerie, facets:['sens','compte','rap'], add:tresoForm, addLabel:'Nouvelle opération',
    onRow: t => openDrawer({eyebrow:'Opération de trésorerie', title:esc(t.libelle), body:kv([['Date',fd(t.date)],['Compte',esc(ix().cpt.get(t.compteId).libelle)],['Sens',pill(t.sens,t.sens==='Encaissement'?'ok':'info')],['Catégorie',esc(t.categorie)],['Montant',`<b>${da(t.montant)}</b>`],['Référence',`<span class="mono">${esc(t.reference)}</span>`],['Rapprochement',pill(t.rapproche?'Rapproché':'Non rapproché')]])}),
    columns:[{key:'date',label:'Date',type:'date'},{key:'compte',label:'Compte',type:'enum',pill:false,get:r=>ix().cpt.get(r.compteId).libelle.split(' — ')[0]},{key:'sens',label:'Sens',type:'enum',render:r=>pill(r.sens,r.sens==='Encaissement'?'ok':'info')},{key:'categorie',label:'Catégorie',type:'enum',pill:false},{key:'libelle',label:'Libellé',strong:true},{key:'reference',label:'Référence',hidden:true,render:r=>`<span class="mono">${esc(r.reference)}</span>`},
      {key:'montant',label:'Montant',type:'money'},{key:'net',label:'Flux net',type:'money',get:r=>r.sens==='Encaissement'?r.montant:-r.montant,sum:true,render:r=>`<span style="color:${r.sens==='Encaissement'?'var(--ok)':'var(--fg)'}">${r.sens==='Encaissement'?'+':'−'}${da(r.montant)}</span>`},{key:'rap',label:'Rapprochement',type:'enum',get:r=>r.rapproche?'Rapproché':'Non rapproché'}],
    presets:[{name:'Décaissements > 1 M DA',rules:[{key:'sens',op:'in',v:'Décaissement'},{key:'montant',op:'gt',v:'1000000',v2:''}]},{name:'Charges fixes du mois',match:'all',rules:[{key:'date',op:'thismonth'},{key:'sens',op:'in',v:'Décaissement'},{key:'categorie',op:'nin',v:'Paiement fournisseur'}]},{name:'Non rapprochés > 15 jours',rules:[{key:'rap',op:'in',v:'Non rapproché'},{key:'date',op:'before',v:addDays(TODAY,-15),v2:''}]}]};
}
function tresoForm(){
  openForm({eyebrow:'Trésorerie', title:'Nouvelle opération', submitLabel:'Enregistrer',
    fields:[{key:'compteId',label:'Compte',type:'select',options:D.comptes.map(c=>[c.id,c.libelle]),full:true},{key:'sens',label:'Sens',type:'select',options:['Décaissement','Encaissement']},{key:'date',label:'Date',type:'date',default:TODAY},
      {key:'categorie',label:'Catégorie',type:'select',options:[...new Set(D.tresorerie.map(t=>t.categorie))].sort()},{key:'montant',label:'Montant (DA)',type:'number',required:true,min:1},{key:'libelle',label:'Libellé',required:true,full:true},{key:'reference',label:'Référence'}],
    onSave: v => { D.tresorerie.unshift({id:newId('TR'),...v,montant:+v.montant,rapproche:false}); save(); const c = ix().cpt.get(v.compteId); const s = compteSolde(c); toast(s<c.seuil?`Attention : ${c.libelle.split(' — ')[0]} passe sous son seuil critique (${da(s)})`:'Opération enregistrée'); render(); }});
}
const CHQ_NEXT = {'En portefeuille':['Remis à l’encaissement'],'Remis à l’encaissement':['Encaissé','Rejeté'],'Émis':['Encaissé']};
function renderCheques(el){
  const soon = D.cheques.filter(c=>c.sens==='Reçu'&&c.statut==='En portefeuille'&&c.dateEcheance<=addDays(TODAY,7));
  el.innerHTML = `${soon.length?`<div class="callout warn" style="margin-bottom:14px">${ic('wallet','width="18" height="18"')}<div><b>${soon.length} chèque${soon.length>1?'s':''} en portefeuille à présenter sous 7 jours</b> pour ${da(sum(soon,c=>c.montant))}. ${soon.slice(0,3).map(c=>`${esc(c.tiers)} (${fd(c.dateEcheance)})`).join(', ')}${soon.length>3?'…':''}</div></div>`:''}<div id="chT"></div>`;
  renderTable(document.getElementById('chT'), {id:'cheques', noun:'les chèques', rows:()=>D.cheques, facets:['sens','statut'],
    onRow: c => openDrawer({eyebrow:`Chèque ${c.sens.toLowerCase()}`, title:`N° ${esc(c.num)}`, body:`<div>${pill(c.statut)}</div>`+kv([['Tiers',esc(c.tiers)],['Banque',esc(c.banque)],['Montant',`<b>${da(c.montant)}</b>`],['Date d’émission',fd(c.dateEmission)],['Échéance de présentation',fd(c.dateEcheance)],['Compte',esc(ix().cpt.get(c.compteId)?.libelle)],['Remis le',fd(c.dateRemise)],['Motif de rejet',esc(c.motifRejet)]])}),
    columns:[{key:'num',label:'N° chèque',render:r=>`<span class="mono">${esc(r.num)}</span>`},{key:'sens',label:'Sens',type:'enum',render:r=>pill(r.sens,r.sens==='Reçu'?'ok':'info')},{key:'tiers',label:'Tireur / bénéficiaire',strong:true},{key:'banque',label:'Banque',type:'enum',pill:false},{key:'montant',label:'Montant',type:'money',sum:true},{key:'dateEmission',label:'Émis le',type:'date'},{key:'dateEcheance',label:'Échéance',type:'date'},
      {key:'jours',label:'Jours restants',type:'num',get:r=>['Encaissé','Rejeté'].includes(r.statut)?'':daysBetween(TODAY,r.dateEcheance),render:r=>{ if(['Encaissé','Rejeté'].includes(r.statut)) return '<span class="muted">—</span>'; const j = daysBetween(TODAY,r.dateEcheance); return `<b style="color:${j<0?'var(--bad)':j<=7?'var(--warn)':'var(--fg)'}">${j}</b>`; }},
      {key:'statut',label:'Statut',type:'enum',facetOptions:['En portefeuille','Remis à l’encaissement','Émis','Encaissé','Rejeté']},{key:'compte',label:'Compte',type:'enum',pill:false,get:r=>ix().cpt.get(r.compteId)?.libelle.split(' — ')[0],hidden:true}],
    rowActions: r => (CHQ_NEXT[r.statut]||[]).map(s=>`<button class="btn sm ${s==='Rejeté'?'danger':''}" data-act="${s}">${s==='Remis à l’encaissement'?'Remettre':s==='Encaissé'?'Encaissé':'Rejeté'}</button>`).join(' '),
    onAction: (s, c) => { c.statut = s; if (s==='Remis à l’encaissement') c.dateRemise = TODAY;
      if (s==='Encaissé') D.tresorerie.unshift({id:newId('TR'),date:TODAY,compteId:c.compteId,sens:c.sens==='Reçu'?'Encaissement':'Décaissement',categorie:c.sens==='Reçu'?'Règlement client':'Paiement fournisseur',montant:c.montant,libelle:`Chèque ${c.num} — ${c.tiers}`,reference:c.num,rapproche:false});
      if (s==='Rejeté') { c.motifRejet='Provision insuffisante'; const r = D.reglements.find(x=>x.id===c.reglementId); if (r) { const f = ix().fac.get(r.factureId); if (f) f.regle = Math.max(0,f.regle-r.montant); } }
      save(); toast(s==='Rejeté'?`Chèque ${c.num} rejeté : la facture liée redevient due`:`Chèque ${c.num} : ${s.toLowerCase()}`); render(); },
    presets:[{name:'À présenter sous 7 jours',rules:[{key:'statut',op:'in',v:'En portefeuille'},{key:'dateEcheance',op:'before',v:addDays(TODAY,8),v2:''}]},{name:'Rejetés',facets:{statut:['Rejeté']}},{name:'Montant > 500 000 DA',rules:[{key:'montant',op:'gt',v:'500000',v2:''}]}]});
}
function forecast(weeks=13){
  const start = tresoDispo(); const out = []; let bal = start;
  const masse = sum(D.employes.filter(e=>e.statut==='Actif'),e=>e.salaire);
  for (let w=0; w<weeks; w++){
    const a = addDays(TODAY, w*7), b = addDays(TODAY, w*7+6);
    const inR = (d) => d>=a && d<=b || (w===0 && d<a);
    let enc = 0, dec = 0;
    D.factures.filter(f=>facReste(f)>0).forEach(f => { if (f.echeances.length) echAlloc(f).forEach(e => { if (e.montant>e.paye && inR(e.date) && e.date>=addDays(TODAY,-90)) enc += (e.montant-e.paye)*(e.date<TODAY?.5:.9); }); else if (inR(f.echeance) && f.echeance>=addDays(TODAY,-90)) enc += facReste(f)*(f.echeance<TODAY?.5:.9); });
    D.cheques.filter(c=>c.sens==='Reçu'&&['En portefeuille','Remis à l’encaissement'].includes(c.statut)&&inR(c.dateEcheance)).forEach(c=>enc+=c.montant);
    D.achats.filter(x=>x.statut==='Livrée'&&achatReste(x)>0&&inR(x.echeance)).forEach(x=>dec+=achatReste(x));
    D.achats.filter(x=>x.statut!=='Livrée'&&inR(addDays(x.dateLivraisonPrevue, frs(x.fournisseurId).delaiPaiement))).forEach(x=>dec+=x.ttc);
    D.cheques.filter(c=>c.sens==='Émis'&&c.statut==='Émis'&&inR(c.dateEcheance)).forEach(c=>dec+=c.montant);
    for (let d=0; d<7; d++){ const day = addDays(a,d); const dd = +day.slice(8); if (dd===25) dec += masse*.91; if (dd===20) dec += masse*.26 + 650000; if (dd===10) dec += 1600000; }
    bal += enc - dec; out.push({semaine:`S${w+1}`, debut:a, fin:b, enc:Math.round(enc), dec:Math.round(dec), solde:Math.round(bal)});
  }
  return {start, out};
}
function renderPrev(el){
  const {start, out} = forecast(13); const seuil = sum(D.comptes,c=>c.seuil);
  const minW = out.reduce((m,w)=>w.solde<m.solde?w:m, out[0]);
  el.innerHTML = `<div class="callout ${minW.solde<seuil?'bad':'ok'}" style="margin-bottom:14px"><div>${minW.solde<seuil?`<b>Tension de trésorerie prévue en ${minW.semaine}</b> (semaine du ${fd(minW.debut)}) : solde projeté ${da(minW.solde)}, sous le seuil cumulé de ${da(seuil)}.`:`<b>Aucune tension prévue sur 13 semaines.</b> Point bas : ${da(minW.solde)} en ${minW.semaine}.`} <span class="muted">Calcul : échéances clients pondérées (90 %, 50 % si déjà échues), chèques en portefeuille à leur date de présentation, échéances fournisseurs, chèques émis, salaires le 25, CNAS et G50 le 20, loyers le 10.</span></div></div>
    <div class="grid g-2" style="margin-bottom:14px"><div class="panel"><div class="panel-h"><h3>Solde projeté</h3><span class="sub">Départ ${da(start)}</span></div><div class="chart-box"><canvas id="cPr" role="img" aria-label="Solde projeté"></canvas></div>${legend([[SER()[0],'Solde projeté'],[cssVar('--bad'),'Seuil critique cumulé']])}</div>
    <div class="panel"><div class="panel-h"><h3>Flux prévus par semaine</h3></div><div class="chart-box"><canvas id="cPf" role="img" aria-label="Flux prévus"></canvas></div>${legend([[SER()[2],'Encaissements prévus'],[SER()[1],'Décaissements prévus']])}</div></div><div id="prT"></div>`;
  chart('cPr',{type:'line',beginAtZero:false,data:{labels:out.map(w=>w.semaine),datasets:[{label:'Solde projeté',data:out.map(w=>w.solde),borderColor:SER()[0],backgroundColor:SER()[0]+'1f',fill:true,tension:.3,pointRadius:3,borderWidth:2},{label:'Seuil',data:out.map(()=>seuil),borderColor:cssVar('--bad'),borderDash:[5,4],pointRadius:0,borderWidth:1.5}]}});
  chart('cPf',{type:'bar',data:{labels:out.map(w=>w.semaine),datasets:[{label:'Encaissements',data:out.map(w=>w.enc),backgroundColor:SER()[2],borderRadius:4,maxBarThickness:16},{label:'Décaissements',data:out.map(w=>w.dec),backgroundColor:SER()[1],borderRadius:4,maxBarThickness:16}]}});
  renderTable(document.getElementById('prT'), {id:'prev', noun:'les semaines', rows:()=>out.map(w=>({...w,id:w.semaine})), columns:[{key:'semaine',label:'Semaine',strong:true},{key:'debut',label:'Du',type:'date'},{key:'fin',label:'Au',type:'date'},{key:'enc',label:'Encaissements',type:'money',sum:true},{key:'dec',label:'Décaissements',type:'money',sum:true},{key:'net',label:'Net',type:'money',get:r=>r.enc-r.dec,sum:true},{key:'solde',label:'Solde fin de semaine',type:'money',render:r=>`<b style="color:${r.solde<seuil?'var(--bad)':'var(--fg)'}">${da(r.solde)}</b>`}]});
}
function renderRappro(el){
  const cid = UI.rapCompte || 'BQ1'; const c = ix().cpt.get(cid);
  const ops = D.tresorerie.filter(t=>t.compteId===cid);
  const soldeComptable = compteSolde(c); const soldeReleve = c.soldeInitial + sum(ops.filter(t=>t.rapproche), t=>t.sens==='Encaissement'?t.montant:-t.montant);
  el.innerHTML = `<div class="filters-row"><span class="fl">Compte</span><select class="sel" id="rapC">${D.comptes.filter(x=>x.type!=='Caisse').map(x=>`<option value="${x.id}" ${x.id===cid?'selected':''}>${esc(x.libelle)}</option>`).join('')}</select><span class="dt-spacer"></span><button class="btn primary" id="rapAll">${ic('check')} Pointer les opérations correspondant au relevé</button></div>
    <div class="kpis"><div class="kpi"><div class="k-l">Solde comptable</div><div class="k-v">${da(soldeComptable)}</div></div><div class="kpi"><div class="k-l">Solde du relevé bancaire</div><div class="k-v">${da(soldeReleve)}</div></div><div class="kpi"><div class="k-l">Écart à justifier</div><div class="k-v" style="color:${Math.abs(soldeComptable-soldeReleve)>0?'var(--warn)':'var(--ok)'}">${da(soldeComptable-soldeReleve)}</div><div class="k-s">${ops.filter(t=>!t.rapproche).length} opérations non pointées</div></div></div><div id="rapT"></div>`;
  el.querySelector('#rapC').onchange = e => { UI.rapCompte = e.target.value; saveUI(); render(); };
  el.querySelector('#rapAll').onclick = () => { const n = ops.filter(t=>!t.rapproche && t.date<=addDays(TODAY,-3)); n.forEach(t=>t.rapproche=true); save(); toast(n.length?`${n.length} opérations rapprochées automatiquement (montant et date identiques au relevé)`:'Aucune opération du relevé à pointer'); render(); };
  renderTable(document.getElementById('rapT'), {id:'rappro', noun:'les opérations non pointées', rows:()=>D.tresorerie.filter(t=>t.compteId===(UI.rapCompte||'BQ1')&&!t.rapproche), facets:['sens'],
    columns:[{key:'date',label:'Date',type:'date'},{key:'sens',label:'Sens',type:'enum',render:r=>pill(r.sens,r.sens==='Encaissement'?'ok':'info')},{key:'categorie',label:'Catégorie',type:'enum',pill:false},{key:'libelle',label:'Libellé',strong:true},{key:'montant',label:'Montant',type:'money',sum:true},{key:'age',label:'Ancienneté (j)',type:'num',get:r=>daysBetween(r.date,TODAY)}],
    rowActions: () => `<button class="btn sm" data-act="pt">Pointer</button>`, onAction: (a,t) => { t.rapproche = true; save(); toast('Opération rapprochée'); render(); }});
}

/* ================= COMPTABILITÉ ================= */
const ecMontant = e => sum(e.lignes, l=>l[1]);
function circuitFilter(e){ const c = UI.circuit||'all'; return c==='all' || e.circuit===c; }
function renderCompta(){
  const c = UI.circuit || 'all';
  const ecs = D.ecritures.filter(circuitFilter);
  const caA = sum(D.factures.filter(f=>f.circuit==='A'&&f.date.slice(0,4)===TODAY.slice(0,4)),f=>f.ht), caB = sum(D.factures.filter(f=>f.circuit==='B'&&f.date.slice(0,4)===TODAY.slice(0,4)),f=>f.ht);
  page({mod:'compta', eyebrow:'Finance', title:'Comptabilité · double circuit', sub:'Plan comptable SCF. Chaque opération est affectée automatiquement au circuit A (ventes soumises à la fiscalité) ou B (ventes non soumises). Les écritures sont générées depuis le stock, les fournisseurs et les créances.',
    actions:`<div class="seg" id="circSeg">${[['all','Consolidé'],['A','Circuit A'],['B','Circuit B']].map(([v,l])=>`<button class="${c===v?'on':''}" data-v="${v}">${l}</button>`).join('')}</div>`,
    kpis:[{l:`CA ${TODAY.slice(0,4)} · circuit A`,v:kda(caA),dot:SER()[0]},{l:`CA ${TODAY.slice(0,4)} · circuit B`,v:kda(caB),dot:SER()[1]},{l:'Écritures ce mois',v:num(ecs.filter(e=>e.date.slice(0,7)===TODAY.slice(0,7)).length),s:`${ecs.filter(e=>e.statut==='Brouillard').length} au brouillard`},{l:'Écritures automatiques',v:Math.round(ecs.filter(e=>e.origine!=='Manuel').length/Math.max(1,ecs.length)*100)+' %',s:'Sans ressaisie'}],
    tabs:[{id:'ecritures',label:'Écritures',cnt:ecs.length,render:el=>renderTable(el,ecritureCfg())},{id:'gl',label:'Grand livre',render:renderGL},{id:'balance',label:'Balance générale',render:renderBalance},{id:'aux',label:'Balance auxiliaire clients',render:renderAux},{id:'plan',label:'Plan comptable',cnt:D.planComptable.length,render:el=>renderTable(el,planCfg())},{id:'clotures',label:'Clôtures',render:renderClotures}]});
  document.querySelectorAll('#circSeg button').forEach(b => b.onclick = () => { UI.circuit = b.dataset.v; saveUI(); render(); });
}
function ecritureCfg(){
  return {id:'ecritures', noun:'les écritures', rows:()=>D.ecritures.filter(circuitFilter), onRow:openEcriture, facets:['journal','origine','statut'], add:ecritureForm, addLabel:'Écriture manuelle',
    columns:[{key:'num',label:'Pièce',render:r=>`<span class="mono">${r.num}</span>`},{key:'date',label:'Date',type:'date'},{key:'journal',label:'Journal',type:'enum',pill:false},{key:'libelle',label:'Libellé',strong:true},{key:'circuit',label:'Circuit',type:'enum',render:r=>circ(r.circuit),facetLabel:v=>v==='A'?'A · Soumis':'B · Non soumis'},{key:'origine',label:'Origine',type:'enum',pill:false},{key:'comptes',label:'Comptes',get:r=>r.lignes.map(l=>l[0]).join(' '),render:r=>`<span class="mono muted" style="font-size:11.5px">${r.lignes.map(l=>l[0]).join(' · ')}</span>`},{key:'montant',label:'Montant',type:'money',get:ecMontant,sum:true},{key:'statut',label:'Statut',type:'enum'}],
    presets:[{name:'Brouillard à valider',facets:{statut:['Brouillard']}},{name:'Ventes circuit B du mois',rules:[{key:'journal',op:'in',v:'VTE'},{key:'circuit',op:'in',v:'B'},{key:'date',op:'thismonth'}]},{name:'Mouvements sur la TVA collectée',rules:[{key:'comptes',op:'contains',v:'445700',v2:''}]}]};
}
function openEcriture(e){
  const dr = sum(e.lignes,l=>l[1]), cr = sum(e.lignes,l=>l[2]);
  openDrawer({eyebrow:`Journal ${e.journal}`, title:`Pièce ${e.num}`,
    body:`<div style="display:flex;gap:8px">${pill(e.statut)} ${circ(e.circuit)} <span class="pill plain">${esc(e.origine)}</span></div>` + kv([['Date',fd(e.date)],['Libellé',esc(e.libelle)],['Référence',`<span class="mono">${esc(e.reference)}</span>`]])
      + sec('Lignes', miniTable(['Compte','Intitulé','#Débit','#Crédit'], e.lignes.map(l=>[`<span class="mono">${l[0]}</span>`, esc(ix().pc.get(l[0])?.libelle||''), l[1]?da(l[1]):'', l[2]?da(l[2]):'']).concat([['','<b>Total</b>',`<b>${da(dr)}</b>`,`<b>${da(cr)}</b>`]])))
      + `<div class="callout ${dr===cr?'ok':'bad'}">${dr===cr?'Écriture équilibrée.':'Écriture déséquilibrée.'}</div>`,
    foot: e.statut==='Brouillard'?`<button class="btn primary" data-v>${ic('check')} Valider l’écriture</button>`:'',
    onMount: d => { const v = d.querySelector('[data-v]'); if (v) v.onclick = () => { e.statut='Validée'; save(); toast(`${e.num} validée`); closeDrawer(); render(); }; }});
}
function ecritureForm(){
  const acc = D.planComptable.map(a=>[a.numero,`${a.numero} — ${a.libelle}`]);
  openForm({eyebrow:'Comptabilité', title:'Écriture manuelle (opérations diverses)', submitLabel:'Passer l’écriture',
    fields:[{key:'date',label:'Date',type:'date',default:TODAY},{key:'journal',label:'Journal',type:'select',options:['OD','BQ','CAI','ACH','VTE']},{key:'circuit',label:'Circuit',type:'select',options:[['A','A · soumis à la fiscalité'],['B','B · non soumis']]},{key:'montant',label:'Montant (DA)',type:'number',required:true,min:1},
      {key:'debit',label:'Compte débité',type:'select',options:acc,full:true},{key:'credit',label:'Compte crédité',type:'select',options:acc,full:true},{key:'libelle',label:'Libellé',required:true,full:true}],
    values:{debit:'615000',credit:'512100'},
    onSave: v => { if (v.debit===v.credit) return 'Les comptes débité et crédité doivent être différents.'; const m = +v.montant; D.ecritures.unshift({id:newId('EC'),num:nextNum(D.ecritures,'num',v.journal+'-'),date:v.date,journal:v.journal,libelle:v.libelle,circuit:v.circuit,lignes:[[v.debit,m,0],[v.credit,0,m]],origine:'Manuel',reference:'',statut:'Brouillard'}); save(); toast('Écriture passée au brouillard'); render(); }});
}
function accountMoves(){ const m = {}; D.ecritures.filter(circuitFilter).forEach(e => e.lignes.forEach(([c,d,cr]) => { const o = m[c] ||= {d:0,c:0}; o.d+=d; o.c+=cr; })); return m; }
function renderBalance(el){
  const m = accountMoves();
  const rows = D.planComptable.filter(a=>m[a.numero]).map(a => { const o = m[a.numero]; const s = o.d-o.c; return {id:a.numero,numero:a.numero,libelle:a.libelle,classe:'Classe '+a.classe,debit:o.d,credit:o.c,sd:s>0?s:0,sc:s<0?-s:0}; });
  const td = sum(rows,r=>r.debit), tc = sum(rows,r=>r.credit);
  el.innerHTML = `<div class="callout ${Math.round(td)===Math.round(tc)?'ok':'bad'}" style="margin-bottom:14px"><div><b>${Math.round(td)===Math.round(tc)?'Balance équilibrée':'Balance déséquilibrée'}</b> · ${({all:'consolidée (A + B)',A:'circuit A',B:'circuit B'})[UI.circuit||'all']} · total débit ${da(td)} · total crédit ${da(tc)}</div></div><div id="balT"></div>`;
  renderTable(document.getElementById('balT'), {id:'balance', noun:'les comptes', rows:()=>rows, facets:['classe'], onRow:r=>{ UI.glCompte=r.numero; UI.tabs.compta='gl'; saveUI(); render(); },
    columns:[{key:'numero',label:'Compte',render:r=>`<span class="mono">${r.numero}</span>`},{key:'libelle',label:'Intitulé',strong:true},{key:'classe',label:'Classe',type:'enum',pill:false},{key:'debit',label:'Total débit',type:'money',sum:true},{key:'credit',label:'Total crédit',type:'money',sum:true},{key:'sd',label:'Solde débiteur',type:'money',sum:true},{key:'sc',label:'Solde créditeur',type:'money',sum:true}]});
}
function renderGL(el){
  const acc = UI.glCompte || '411000';
  const lines = []; D.ecritures.filter(circuitFilter).forEach(e => e.lignes.forEach(([c,d,cr]) => { if (c===acc) lines.push({id:e.id+c+d+cr,e,date:e.date,num:e.num,journal:e.journal,libelle:e.libelle,circuit:e.circuit,debit:d,credit:cr}); }));
  lines.sort((a,b)=>a.date.localeCompare(b.date)); let run = 0; lines.forEach(l => { run += l.debit - l.credit; l.solde = run; }); lines.reverse();
  el.innerHTML = `<div class="filters-row"><span class="fl">Compte</span><select class="sel" id="glC" style="max-width:100%">${D.planComptable.map(a=>`<option value="${a.numero}" ${a.numero===acc?'selected':''}>${a.numero} — ${esc(a.libelle)}</option>`).join('')}</select><span class="dt-spacer"></span><span class="muted">Solde : <b style="color:var(--fg)">${da(run)}</b> ${run>=0?'débiteur':'créditeur'}</span></div><div id="glT"></div>`;
  el.querySelector('#glC').onchange = e => { UI.glCompte = e.target.value; saveUI(); render(); };
  renderTable(document.getElementById('glT'), {id:'gl', noun:'les lignes', rows:()=>lines, onRow:l=>openEcriture(l.e), facets:['journal'],
    columns:[{key:'date',label:'Date',type:'date'},{key:'num',label:'Pièce',render:r=>`<span class="mono">${r.num}</span>`},{key:'journal',label:'Journal',type:'enum',pill:false},{key:'libelle',label:'Libellé',strong:true},{key:'circuit',label:'Circuit',type:'enum',render:r=>circ(r.circuit)},{key:'debit',label:'Débit',type:'money',sum:true},{key:'credit',label:'Crédit',type:'money',sum:true},{key:'solde',label:'Solde progressif',type:'money',sortable:false}]});
}
function renderAux(el){
  const rows = S.clients().map(c => { const f = D.factures.filter(x=>x.clientId===c.id && circuitFilter(x)); const d = sum(f,x=>x.ttc), cr = sum(f,x=>x.regle); return {id:c.id,c,code:c.code,raison:c.raison,debit:d,credit:cr,solde:d-cr}; }).filter(r=>r.debit);
  renderTable(el, {id:'aux', noun:'les comptes clients', rows:()=>rows, onRow:r=>openClient(r.c), columns:[{key:'code',label:'Compte auxiliaire',render:r=>`<span class="mono">411-${r.code.slice(4)}</span>`},{key:'raison',label:'Client',strong:true},{key:'debit',label:'Débit (factures)',type:'money',sum:true},{key:'credit',label:'Crédit (règlements)',type:'money',sum:true},{key:'solde',label:'Solde',type:'money',sum:true}],presets:[{name:'Soldes > 500 000 DA',rules:[{key:'solde',op:'gt',v:'500000',v2:''}]}]});
}
function planCfg(){
  return {id:'plan', noun:'le plan comptable', rows:()=>D.planComptable, facets:['classe'], add:()=>openForm({eyebrow:'Plan comptable', title:'Nouveau compte', fields:[{key:'numero',label:'Numéro',required:true},{key:'classe',label:'Classe',type:'select',options:['1','2','3','4','5','6','7']},{key:'libelle',label:'Intitulé',required:true,full:true}], onSave:v=>{ if (D.planComptable.find(a=>a.numero===v.numero)) return 'Ce numéro de compte existe déjà.'; D.planComptable.push({numero:v.numero,libelle:v.libelle,classe:+v.classe,actif:true}); D.planComptable.sort((a,b)=>a.numero.localeCompare(b.numero)); save(); toast('Compte ajouté'); render(); }}), addLabel:'Nouveau compte',
    columns:[{key:'numero',label:'Numéro',render:r=>`<span class="mono">${r.numero}</span>`},{key:'libelle',label:'Intitulé',strong:true},{key:'classe',label:'Classe',type:'enum',pill:false,get:r=>String(r.classe),facetLabel:v=>({1:'1 · Capitaux',2:'2 · Immobilisations',3:'3 · Stocks',4:'4 · Tiers',5:'5 · Financiers',6:'6 · Charges',7:'7 · Produits'})[v]},{key:'mouv',label:'Écritures',type:'num',get:r=>D.ecritures.filter(e=>e.lignes.some(l=>l[0]===r.numero)).length}],
    onRow: r => { UI.glCompte=r.numero; UI.tabs.compta='gl'; saveUI(); render(); }};
}
function renderClotures(el){
  el.innerHTML = `<div class="grid g-3">${D.clotures.slice().reverse().map(c => { const ok = c.controles.every(x=>x.ok);
    return `<div class="panel"><div class="panel-h"><h3>${monthLabel(c.mois).replace('.','')}</h3>${pill(c.statut)}</div>
      <div style="display:flex;flex-direction:column;gap:6px;font-size:13px">${c.controles.map(x=>`<div style="display:flex;gap:8px;align-items:center"><span style="color:${x.ok?'var(--ok)':'var(--warn)'};font-weight:700;width:14px">${x.ok?'✓':'!'}</span>${esc(x.l)}</div>`).join('')}</div>
      <div style="margin-top:12px;display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap"><span class="muted" style="font-size:12px">${c.dateCloture?`Clôturé le ${fd(c.dateCloture)} par ${esc(c.par)}`:'Non clôturé'}</span>${c.statut!=='Clôturée'?(ok?`<button class="btn sm primary" data-close="${c.id}">Clôturer</button>`:`<button class="btn sm" data-run="${c.id}">Lancer les contrôles</button>`):''}</div></div>`; }).join('')}</div>`;
  el.onclick = e => { const r = e.target.closest('[data-run]'), c = e.target.closest('[data-close]');
    if (r) { const cl = D.clotures.find(x=>x.id===r.dataset.run); cl.controles.forEach(x=>x.ok=true); D.ecritures.filter(x=>x.date.startsWith(cl.mois)).forEach(x=>x.statut='Validée'); save(); toast('Contrôles de cohérence passés, écritures du mois validées'); render(); }
    if (c) { const cl = D.clotures.find(x=>x.id===c.dataset.close); cl.statut='Clôturée'; cl.dateCloture=TODAY; cl.par=PROFILES[UI.profile].label; save(); toast(`Période ${monthLabel(cl.mois)} clôturée`); render(); } };
}

/* ================= RESSOURCES HUMAINES ================= */
const actifs = () => D.employes.filter(e=>e.statut==='Actif');
const anc = e => +(daysBetween(e.dateEmbauche, TODAY)/365.25).toFixed(1);
function renderRh(){
  const a = actifs(); const ctr = a.filter(e=>e.finContrat&&e.finContrat<=addDays(TODAY,30));
  const abs = D.conges.filter(c=>c.statut==='Approuvé'&&c.debut<=TODAY&&c.fin>=TODAY);
  const sortis = D.employes.filter(e=>e.statut==='Sorti'&&e.dateSortie>=addDays(TODAY,-365)).length;
  page({mod:'rh', eyebrow:'Organisation', title:'Ressources humaines', sub:'Dossiers du personnel, contrats et alertes d’échéance, congés avec validation en ligne, éléments variables de paie et organigramme.',
    kpis:[{l:'Effectif actif',v:a.length,s:`${a.filter(e=>e.contrat==='CDI').length} CDI · ${a.filter(e=>e.contrat==='CDD').length} CDD · ${a.filter(e=>e.contrat==='Période d’essai').length} en essai`},{l:'Contrats à échéance sous 30 j',v:ctr.length,s:ctr.filter(e=>e.finContrat<TODAY).length+' déjà échus',dot:'var(--warn)',go:'contrats'},{l:'Absents aujourd’hui',v:abs.length,s:`${D.conges.filter(c=>c.statut==='En attente').length} demandes en attente`,go:'conges'},{l:'Turnover 12 mois',v:(sortis/Math.max(1,a.length)*100).toFixed(1).replace('.',',')+' %',s:`${sortis} départ${sortis>1?'s':''}`}],
    tabs:[{id:'employes',label:'Employés',cnt:D.employes.length,render:el=>renderTable(el,empCfg())},{id:'contrats',label:'Contrats',render:el=>renderTable(el,contratCfg())},{id:'conges',label:'Congés & absences',cnt:D.conges.length,render:el=>renderTable(el,congeCfg())},{id:'variables',label:'Éléments variables',cnt:D.variables.length,render:el=>renderTable(el,varCfg())},{id:'organigramme',label:'Organigramme',render:renderOrg},{id:'tdb',label:'Tableau de bord RH',render:renderRhDash}]});
}
function empCfg(){
  return {id:'employes', noun:'les employés', rows:()=>D.employes, onRow:openEmploye, facets:['departement','contrat','statut'], add:()=>empForm(), addLabel:'Nouvel employé',
    columns:[{key:'matricule',label:'Matricule',render:r=>`<span class="mono">${r.matricule}</span>`},{key:'nom',label:'Nom',get:r=>`${r.nom} ${r.prenom}`,strong:true},{key:'poste',label:'Poste',type:'enum',pill:false},{key:'departement',label:'Département',type:'enum',pill:false},{key:'manager',label:'Responsable',get:r=>r.managerId?empName(r.managerId):'',hidden:true},{key:'contrat',label:'Contrat',type:'enum',render:r=>pill(r.contrat,r.contrat==='CDI'?'plain':'warn')},{key:'dateEmbauche',label:'Embauche',type:'date'},{key:'anciennete',label:'Ancienneté (ans)',type:'num',get:anc},{key:'salaire',label:'Salaire de base',type:'money',sum:true,hidden:true},{key:'soldeConges',label:'Solde congés (j)',type:'num'},{key:'wilaya',label:'Lieu de travail',type:'enum',pill:false,hidden:true},{key:'statut',label:'Statut',type:'enum'}],
    presets:[{name:'Ancienneté ≥ 5 ans',rules:[{key:'anciennete',op:'gte',v:'5',v2:''},{key:'statut',op:'in',v:'Actif'}]},{name:'Solde congés > 20 jours',rules:[{key:'soldeConges',op:'gt',v:'20',v2:''}]},{name:'Recrutés cette année',rules:[{key:'dateEmbauche',op:'thisyear'}]}]};
}
function openEmploye(e){
  const cg = D.conges.filter(c=>c.employeId===e.id); const vr = D.variables.filter(v=>v.employeId===e.id);
  const team = D.employes.filter(x=>x.managerId===e.id&&x.statut==='Actif');
  openDrawer({eyebrow:esc(e.departement), title:esc(`${e.prenom} ${e.nom}`),
    body:`<div style="display:flex;gap:12px;align-items:center"><div class="av" style="width:46px;height:46px;font-size:15px">${esc(initials(e.prenom,e.nom))}</div><div><div style="font-weight:600">${esc(e.poste)}</div><div style="display:flex;gap:6px;margin-top:4px">${pill(e.statut)} ${pill(e.contrat,e.contrat==='CDI'?'plain':'warn')}</div></div></div>`
      + kv([['Matricule',`<span class="mono">${e.matricule}</span>`],['Responsable',e.managerId?esc(empName(e.managerId)):'—'],['Date d’embauche',fd(e.dateEmbauche)+` (${anc(e)} ans)`],['Fin de contrat',e.finContrat?fd(e.finContrat)+(e.finContrat<=addDays(TODAY,30)?' '+pill(e.finContrat<TODAY?'Échu':'À échéance'):''):'—'],['Salaire de base',da(e.salaire)],['N° sécurité sociale (CNAS)',`<span class="mono">${e.cnas}</span>`],['Téléphone',`<span class="mono">${esc(e.tel)}</span>`],['Lieu de travail',esc(e.wilaya)],['Solde de congés',`<b>${e.soldeConges} jours</b>`]])
      + sec('Documents', `<div style="display:flex;gap:6px;flex-wrap:wrap">${['Contrat de travail','Copie CNI','Attestation CNAS','Diplôme','RIB'].map((d,i)=>`<span class="pill ${i<4||e.contrat==='CDI'?'ok':'warn'}">${d}</span>`).join('')}</div>`)
      + (team.length?sec(`Équipe (${team.length})`, team.map(t=>esc(t.prenom+' '+t.nom)+' <span class="muted">· '+esc(t.poste)+'</span>').join('<br>')):'')
      + sec('Congés', miniTable(['Type','Du','Au','#Jours','Statut'], cg.map(c=>[esc(c.type),fd(c.debut),fd(c.fin),c.jours,pill(c.statut)])))
      + sec('Éléments variables', miniTable(['Mois','Type','#Montant'], vr.map(v=>[v.mois,esc(v.type),da(v.montant)]))),
    foot:`<button class="btn" data-e>${ic('edit')} Modifier</button><button class="btn primary" data-c>Demande de congé</button>`,
    onMount: d => { d.querySelector('[data-e]').onclick = () => empForm(e); d.querySelector('[data-c]').onclick = () => congeForm(e.id); }});
}
function empForm(e){
  const isNew = !e; e = e || {};
  openForm({eyebrow:'RH', title:isNew?'Nouvel employé':'Modifier la fiche', values:e,
    fields:[{key:'prenom',label:'Prénom',required:true},{key:'nom',label:'Nom',required:true},{key:'poste',label:'Poste',required:true},{key:'departement',label:'Département',type:'select',options:[...new Set(D.employes.map(x=>x.departement))]},
      {key:'managerId',label:'Responsable',type:'select',allowEmpty:true,options:actifs().map(x=>[x.id,`${x.prenom} ${x.nom} · ${x.poste}`]),full:true},{key:'contrat',label:'Contrat',type:'select',options:['CDI','CDD','Période d’essai']},{key:'finContrat',label:'Fin de contrat',type:'date'},
      {key:'dateEmbauche',label:'Date d’embauche',type:'date',default:TODAY},{key:'salaire',label:'Salaire de base (DA)',type:'number',default:45000},{key:'tel',label:'Téléphone'},{key:'cnas',label:'N° CNAS'},{key:'statut',label:'Statut',type:'select',options:['Actif','Sorti']}],
    onSave: v => { if (v.contrat!=='CDI' && !v.finContrat) return 'Indiquez la date de fin pour un CDD ou une période d’essai.'; if (isNew) { const n = {id:newId('E'),matricule:'ASD-'+String(D.employes.length+101).padStart(4,'0'),sexe:'',soldeConges:0,depotId:'DEP1',wilaya:'Alger',...v}; D.employes.push(n); toast(`${n.prenom} ${n.nom} ajouté(e)`); } else { Object.assign(e,v); toast('Fiche mise à jour'); } save(); render(); }});
}
function contratCfg(){
  return {id:'contrats', noun:'les contrats', rows:()=>actifs().filter(e=>e.contrat!=='CDI'), onRow:openEmploye, facets:['contrat','alerte'],
    columns:[{key:'nom',label:'Employé',get:r=>`${r.prenom} ${r.nom}`,strong:true},{key:'poste',label:'Poste'},{key:'departement',label:'Département',type:'enum',pill:false},{key:'contrat',label:'Contrat',type:'enum'},{key:'dateEmbauche',label:'Début',type:'date'},{key:'finContrat',label:'Fin',type:'date'},{key:'jours',label:'Jours restants',type:'num',get:r=>daysBetween(TODAY,r.finContrat),render:r=>{const j=daysBetween(TODAY,r.finContrat);return `<b style="color:${j<0?'var(--bad)':j<=30?'var(--warn)':'var(--fg)'}">${j}</b>`;}},{key:'alerte',label:'Alerte',type:'enum',get:r=>r.finContrat<TODAY?'Échu':r.finContrat<=addDays(TODAY,30)?'À échéance':'OK'}],
    rowActions: r => `<button class="btn sm" data-act="renew">Renouveler 1 an</button> <button class="btn sm" data-act="cdi">Passer en CDI</button>`,
    onAction: (a, e) => { if (a==='renew') { e.finContrat = addMonths(e.finContrat<TODAY?TODAY:e.finContrat, 12); e.contrat='CDD'; toast(`Contrat de ${e.prenom} ${e.nom} renouvelé jusqu’au ${fd(e.finContrat)}`); } else { e.contrat='CDI'; e.finContrat=''; toast(`${e.prenom} ${e.nom} passe en CDI`); } save(); render(); },
    presets:[{name:'Échéance sous 30 jours',rules:[{key:'jours',op:'lte',v:'30',v2:''}]}]};
}
function congeCfg(){
  return {id:'conges', noun:'les congés', rows:()=>D.conges, onRow:c=>openEmploye(emp(c.employeId)), facets:['statut','type'], add:()=>congeForm(), addLabel:'Nouvelle demande',
    columns:[{key:'employe',label:'Employé',get:r=>empName(r.employeId),strong:true},{key:'departement',label:'Département',type:'enum',pill:false,get:r=>emp(r.employeId).departement},{key:'type',label:'Type',type:'enum',pill:false},{key:'debut',label:'Du',type:'date'},{key:'fin',label:'Au',type:'date'},{key:'jours',label:'Jours',type:'num',sum:true},{key:'solde',label:'Solde restant',type:'num',get:r=>emp(r.employeId).soldeConges},{key:'dateDemande',label:'Demandé le',type:'date',hidden:true},{key:'statut',label:'Statut',type:'enum'}],
    rowActions: r => r.statut==='En attente' ? `<button class="btn sm primary" data-act="ok">Approuver</button> <button class="btn sm danger" data-act="ko">Refuser</button>` : '',
    onAction: (a, c) => { const e = emp(c.employeId); if (a==='ok') { if (c.type==='Congé annuel' && e.soldeConges < c.jours) { toast(`Solde insuffisant : ${e.soldeConges} jours disponibles`); return; } c.statut='Approuvé'; if (c.type==='Congé annuel') e.soldeConges -= c.jours; toast(`Congé de ${e.prenom} ${e.nom} approuvé · solde ${e.soldeConges} j`); } else { c.statut='Refusé'; toast('Demande refusée'); } save(); render(); },
    presets:[{name:'En attente de validation',facets:{statut:['En attente']}},{name:'Absences en cours',rules:[{key:'statut',op:'in',v:'Approuvé'},{key:'debut',op:'before',v:addDays(TODAY,1),v2:''},{key:'fin',op:'after',v:addDays(TODAY,-1),v2:''}]},{name:'Arrêts maladie',rules:[{key:'type',op:'in',v:'Maladie'}]}]};
}
function congeForm(eid){
  openForm({eyebrow:'RH', title:'Demande de congé', submitLabel:'Envoyer la demande',
    fields:[{key:'employeId',label:'Employé',type:'select',options:actifs().map(e=>[e.id,`${e.prenom} ${e.nom} · solde ${e.soldeConges} j`]),full:true},{key:'type',label:'Type',type:'select',options:['Congé annuel','Maladie','Exceptionnel','Récupération','Sans solde']},{key:'debut',label:'Du',type:'date',default:addDays(TODAY,7),required:true},{key:'fin',label:'Au (inclus)',type:'date',default:addDays(TODAY,11),required:true},{key:'motif',label:'Motif',full:true}],
    values:{employeId:eid},
    onSave: v => { if (v.fin < v.debut) return 'La date de fin précède la date de début.'; const j = daysBetween(v.debut,v.fin)+1; D.conges.unshift({id:newId('C'),...v,jours:j,statut:'En attente',dateDemande:TODAY}); save(); toast(`Demande de ${j} jour${j>1?'s':''} transmise pour validation`); render(); }});
}
function varCfg(){
  return {id:'variables', noun:'les éléments variables', rows:()=>D.variables, onRow:v=>openEmploye(emp(v.employeId)), facets:['nature','mois'], add:()=>openForm({eyebrow:'Paie', title:'Élément variable', fields:[{key:'employeId',label:'Employé',type:'select',options:actifs().map(e=>[e.id,`${e.prenom} ${e.nom}`]),full:true},{key:'mois',label:'Mois',type:'month',default:TODAY.slice(0,7)},{key:'nature',label:'Nature',type:'select',options:['Prime','Retenue','Avance']},{key:'type',label:'Libellé',required:true,default:'Prime de rendement'},{key:'montant',label:'Montant (DA)',type:'number',required:true},{key:'motif',label:'Motif',full:true}], onSave:v=>{ D.variables.unshift({id:newId('V'),...v,montant:+v.montant}); save(); toast('Élément variable ajouté à la paie du mois'); render(); }}), addLabel:'Ajouter',
    columns:[{key:'mois',label:'Mois',type:'enum',pill:false},{key:'employe',label:'Employé',get:r=>empName(r.employeId),strong:true},{key:'departement',label:'Département',type:'enum',pill:false,get:r=>emp(r.employeId).departement},{key:'nature',label:'Nature',type:'enum',render:r=>pill(r.nature,{Prime:'ok',Retenue:'bad',Avance:'warn'}[r.nature])},{key:'type',label:'Libellé'},{key:'montant',label:'Montant',type:'money',sum:true},{key:'motif',label:'Motif',hidden:true}]};
}
function renderOrg(el){
  const root = D.employes.find(e=>!e.managerId);
  const node = e => { const kids = D.employes.filter(x=>x.managerId===e.id&&x.statut==='Actif').sort((a,b)=>a.departement.localeCompare(b.departement)); return `<li><div class="org-card" data-e="${e.id}"><div class="av">${esc(initials(e.prenom,e.nom))}</div><div style="min-width:0"><div style="font-weight:600;font-size:13px">${esc(e.prenom+' '+e.nom)}</div><div class="muted" style="font-size:11.5px">${esc(e.poste)}${kids.length?` · ${kids.length} rattaché${kids.length>1?'s':''}`:''}</div></div></div>${kids.length?`<ul>${kids.map(node).join('')}</ul>`:''}</li>`; };
  el.innerHTML = `<div class="panel"><div class="org"><ul>${node(root)}</ul></div></div>`;
  el.onclick = e => { const c = e.target.closest('[data-e]'); if (c) openEmploye(emp(c.dataset.e)); };
}
function renderRhDash(el){
  const a = actifs(); const deps = groupBy(a, e=>e.departement); const dl = Object.keys(deps).sort((x,y)=>deps[y].length-deps[x].length);
  const months = []; for (let i=11;i>=0;i--){ const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-i); months.push(isoD(d).slice(0,7)); }
  const absM = months.map(m => sum(D.conges.filter(c=>c.statut==='Approuvé'&&c.debut.startsWith(m)),c=>c.jours));
  el.innerHTML = `<div class="grid g-2"><div class="panel"><div class="panel-h"><h3>Effectif par département</h3></div><div class="chart-box"><canvas id="cRd" role="img" aria-label="Effectif par département"></canvas></div></div>
    <div class="panel"><div class="panel-h"><h3>Jours d’absence approuvés</h3><span class="sub">Par mois de début</span></div><div class="chart-box"><canvas id="cRa" role="img" aria-label="Absences par mois"></canvas></div></div>
    <div class="panel"><div class="panel-h"><h3>Masse salariale</h3></div>${kv([['Masse salariale de base mensuelle',`<b>${da(sum(a,e=>e.salaire))}</b>`],['Charges patronales estimées (26 %)',da(sum(a,e=>e.salaire)*.26)],['Primes du mois',da(sum(D.variables.filter(v=>v.mois===TODAY.slice(0,7)&&v.nature==='Prime'),v=>v.montant))],['Avances en cours',da(sum(D.variables.filter(v=>v.nature==='Avance'),v=>v.montant))],['Salaire moyen',da(sum(a,e=>e.salaire)/a.length)],['Ancienneté moyenne',(sum(a,anc)/a.length).toFixed(1).replace('.',',')+' ans']])}</div>
    <div class="panel"><div class="panel-h"><h3>Répartition des contrats</h3></div><div class="toplist">${['CDI','CDD','Période d’essai'].map(c=>{const n=a.filter(e=>e.contrat===c).length;return `<div class="tl-row"><span>${c}</span><span class="num">${n} · ${Math.round(n/a.length*100)} %</span><div class="bar"><i style="width:${n/a.length*100}%"></i></div></div>`;}).join('')}</div></div></div>`;
  chart('cRd',{type:'bar',indexAxis:'y',fmt:v=>v+' pers.',data:{labels:dl,datasets:[{data:dl.map(d=>deps[d].length),backgroundColor:SER()[0],borderRadius:4,maxBarThickness:18}]},options:{scales:{x:{grid:{color:cssVar('--line')},ticks:{color:cssVar('--muted'),precision:0}},y:{grid:{display:false},ticks:{color:cssVar('--muted')}}}}});
  chart('cRa',{type:'bar',fmt:v=>v+' j',fmtAxis:v=>v,data:{labels:months.map(monthLabel),datasets:[{label:'Jours',data:absM,backgroundColor:SER()[2],borderRadius:4,maxBarThickness:22}]}});
}

/* ================= SAV & PIÈCES ================= */
const LIFE = ['En stock','Vendue','Sous garantie','Garantie expirée','Retour / Échange'];
function renderSav(){
  const t = S.tickets(); const open = t.filter(x=>['Ouvert','En cours'].includes(x.statut)); const res = t.filter(x=>x.dateResolution);
  const avg = res.length ? sum(res,x=>daysBetween(x.date,x.dateResolution))/res.length : 0;
  page({mod:'sav', eyebrow:'Module complémentaire', title:'SAV & cycle de vie des pièces', sub:'Chaque pièce électronique est suivie par son numéro de série depuis l’entrée en stock. L’éligibilité à la garantie est vérifiée à l’ouverture du ticket. Les commerciaux voient les tickets de leurs clients.',
    kpis:[{l:'Tickets actifs',v:open.length,s:`${open.filter(x=>x.statut==='Ouvert').length} ouverts · ${open.filter(x=>x.statut==='En cours').length} en cours`,go:'tickets'},{l:'Délai moyen de résolution',v:avg.toFixed(1).replace('.',',')+' j',s:`Sur ${res.length} tickets résolus`},{l:'Tickets sous garantie',v:Math.round(t.filter(x=>x.eligible).length/Math.max(1,t.length)*100)+' %',s:'Pris en charge sans facturation'},{l:'Pièces sous garantie',v:num(D.pieces.filter(p=>p.statut==='Sous garantie').length),s:`${num(D.pieces.length)} pièces suivies`,go:'pieces'}],
    actions:`<button class="btn primary" id="btnTk">${ic('plus')} Ouvrir un ticket</button>`,
    tabs:[{id:'tickets',label:'Tickets',cnt:t.length,render:el=>renderTable(el,ticketCfg())},{id:'pieces',label:'Pièces & n° de série',cnt:D.pieces.length,render:el=>renderTable(el,pieceCfg())},{id:'garantie',label:'Vérifier une garantie',render:renderGarantie},{id:'tdb',label:'Tableau de bord SAV',render:renderSavDash}]});
  document.getElementById('btnTk').onclick = () => ticketForm();
}
function ticketCfg(){
  return {id:'tickets', noun:'les tickets', rows:S.tickets, onRow:openTicket, facets:['statut','priorite','garantie'], add:()=>ticketForm(), addLabel:'Ouvrir un ticket',
    columns:[{key:'num',label:'Ticket',render:r=>`<span class="mono">${r.num}</span>`,strong:true},{key:'date',label:'Ouvert le',type:'date'},{key:'client',label:'Client',get:r=>cli(r.clientId).raison},{key:'serial',label:'N° de série',get:r=>ix().piece.get(r.pieceId)?.serial,render:r=>`<span class="mono">${ix().piece.get(r.pieceId)?.serial||''}</span>`},{key:'article',label:'Article',get:r=>art(ix().piece.get(r.pieceId)?.articleId).designation},
      {key:'categorie',label:'Catégorie',type:'enum',pill:false},{key:'priorite',label:'Priorité',type:'enum',facetOptions:['Critique','Haute','Normale','Basse']},{key:'statut',label:'Statut',type:'enum',facetOptions:['Ouvert','En cours','Résolu','Clôturé']},{key:'garantie',label:'Garantie',type:'enum',get:r=>r.eligible?'Sous garantie':'Non éligible'},{key:'assigne',label:'Technicien',type:'enum',pill:false,get:r=>empName(r.assigneId)},{key:'commercial',label:'Commercial',type:'enum',pill:false,get:r=>empName(r.commercialId),hidden:true},
      {key:'age',label:'Âge (j)',type:'num',get:r=>daysBetween(r.date, r.dateResolution||TODAY)}],
    presets:[{name:'Critiques non résolus',rules:[{key:'priorite',op:'in',v:'Critique'},{key:'statut',op:'nin',v:'Clôturé'},{key:'statut',op:'nin',v:'Résolu'}]},{name:'Ouverts depuis plus de 7 jours',rules:[{key:'statut',op:'in',v:'Ouvert'},{key:'age',op:'gt',v:'7',v2:''}]},{name:'Hors garantie, ce trimestre',rules:[{key:'garantie',op:'in',v:'Non éligible'},{key:'date',op:'last90'}]}]};
}
function openTicket(t){
  const p = ix().piece.get(t.pieceId) || {}; const a = art(p.articleId); const c = cli(t.clientId);
  const nexts = {Ouvert:['En cours'],'En cours':['Résolu'],Résolu:['Clôturé']}[t.statut] || [];
  openDrawer({eyebrow:`Ticket SAV · ${esc(t.categorie)}`, title:t.num,
    body:`<div style="display:flex;gap:8px;flex-wrap:wrap">${pill(t.statut)} ${pill(t.priorite)} ${pill(t.eligible?'Sous garantie':'Non éligible')}</div>`
      + `<div class="callout ${t.eligible?'ok':'bad'}">${t.eligible?`Pièce sous garantie jusqu’au <b>${fd(p.finGarantie)}</b> au moment de l’ouverture : prise en charge gratuite.`:`Garantie expirée le <b>${fd(p.finGarantie)}</b> : intervention facturable sur devis.`}</div>`
      + kv([['Client',`<a href="#" data-c>${esc(c.raison)}</a>`],['Commercial',esc(empName(t.commercialId))],['Pièce',`${esc(a.designation)}<div class="mono muted" style="font-size:11.5px">${esc(p.serial)}</div>`],['Vendue le',fd(p.dateVente)],['Commande',`<span class="mono">${esc(ix().cmd.get(t.commandeId)?.num||'')}</span>`],['Technicien',`<select class="sel" id="tkA">${D.employes.filter(e=>e.departement==='Atelier SAV'&&e.statut==='Actif').map(e=>`<option value="${e.id}" ${e.id===t.assigneId?'selected':''}>${esc(e.prenom+' '+e.nom)}</option>`).join('')}</select>`],['Description',esc(t.description)]])
      + sec('Historique des échanges', `<div class="timeline">${t.historique.map(h=>`<div class="tl-i"><div>${esc(h.msg)}</div><div class="tl-m">${fd(h.date)} · ${esc(h.auteur)}</div></div>`).join('')}</div>`)
      + `<div class="field"><label for="tkMsg">Ajouter une note</label><textarea class="inp" id="tkMsg" rows="2" placeholder="Diagnostic, action menée, échange avec le client…"></textarea></div>`,
    foot:`<button class="btn" data-msg style="margin-right:auto">Ajouter la note</button>${nexts.map(s=>`<button class="btn primary" data-st="${s}">${s==='En cours'?'Prendre en charge':s==='Résolu'?'Marquer résolu':'Clôturer'}</button>`).join('')}`,
    onMount: d => {
      d.querySelector('[data-c]').onclick = e => { e.preventDefault(); openClient(c); };
      d.querySelector('#tkA').onchange = e => { t.assigneId = e.target.value; t.historique.push({date:TODAY,auteur:PROFILES[UI.profile].label,msg:`Ticket réaffecté à ${empName(t.assigneId)}.`}); save(); toast('Ticket réaffecté'); openTicket(t); };
      d.querySelector('[data-msg]').onclick = () => { const m = d.querySelector('#tkMsg').value.trim(); if (!m) { d.querySelector('#tkMsg').focus(); return; } t.historique.push({date:TODAY,auteur:PROFILES[UI.profile].label,msg:m}); save(); openTicket(t); };
      d.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { t.statut = b.dataset.st; if (t.statut==='Résolu') { t.dateResolution = TODAY; if (t.eligible) p.statut='Retour / Échange'; } t.historique.push({date:TODAY,auteur:PROFILES[UI.profile].label,msg:`Statut passé à « ${t.statut} ».`}); save(); toast(`${t.num} : ${t.statut}`); openTicket(t); render(); });
    }});
}
function ticketForm(serial){
  openForm({eyebrow:'SAV', title:'Ouvrir un ticket', submitLabel:'Ouvrir le ticket',
    fields:[{key:'serial',label:'Numéro de série de la pièce',required:true,full:true,placeholder:'Ex. '+(D.pieces.find(p=>p.statut==='Sous garantie')?.serial||'')},{key:'categorie',label:'Catégorie',type:'select',options:[...new Set(D.tickets.map(t=>t.categorie))]},{key:'priorite',label:'Priorité',type:'select',options:['Normale','Haute','Critique','Basse']},
      {key:'assigneId',label:'Technicien',type:'select',options:D.employes.filter(e=>e.departement==='Atelier SAV'&&e.statut==='Actif').map(e=>[e.id,e.prenom+' '+e.nom]),full:true},{key:'description',label:'Description du problème',type:'textarea',required:true,full:true}],
    values:{serial},
    onSave: v => {
      const p = D.pieces.find(x=>x.serial.toLowerCase()===v.serial.trim().toLowerCase()); if (!p) return `Aucune pièce ne porte le n° de série « ${v.serial} ».`;
      if (!p.clientId) return 'Cette pièce est encore en stock : elle n’a pas été vendue.';
      const eligible = TODAY <= p.finGarantie; const c = cli(p.clientId);
      const t = {id:newId('T'),num:nextNum(D.tickets,'num','SAV',4),date:TODAY,pieceId:p.id,clientId:p.clientId,commandeId:p.commandeId,commercialId:c.commercialId,categorie:v.categorie,priorite:v.priorite,statut:'Ouvert',assigneId:v.assigneId,eligible,dateResolution:'',description:v.description,historique:[{date:TODAY,auteur:PROFILES[UI.profile].label,msg:`Ticket ouvert. Garantie ${eligible?'valide jusqu’au '+fd(p.finGarantie):'expirée depuis le '+fd(p.finGarantie)}.`}]};
      D.tickets.unshift(t); save(); toast(`${t.num} ouvert · ${eligible?'sous garantie':'hors garantie'}`); render(); setTimeout(()=>openTicket(t),250);
    }});
}
function pieceCfg(){
  return {id:'pieces', noun:'les pièces', rows:()=>D.pieces.filter(p=>!p.clientId || inScope(p.clientId)), onRow:openPiece, facets:['statut'],
    columns:[{key:'serial',label:'N° de série',render:r=>`<span class="mono">${r.serial}</span>`,strong:true},{key:'article',label:'Article',get:r=>art(r.articleId).designation},{key:'categorie',label:'Catégorie',type:'enum',pill:false,get:r=>art(r.articleId).categorie},{key:'statut',label:'Cycle de vie',type:'enum',facetOptions:LIFE},{key:'client',label:'Client',get:r=>r.clientId?cli(r.clientId).raison:''},{key:'dateEntree',label:'Entrée en stock',type:'date',hidden:true},{key:'dateVente',label:'Vendue le',type:'date'},{key:'garantieMois',label:'Garantie (mois)',type:'num',hidden:true},{key:'finGarantie',label:'Fin de garantie',type:'date'},
      {key:'reste',label:'Jours de garantie restants',type:'num',get:r=>r.finGarantie?Math.max(0,daysBetween(TODAY,r.finGarantie)):'',render:r=>{ if(!r.finGarantie) return '<span class="muted">—</span>'; const j = daysBetween(TODAY,r.finGarantie); return j<0?'<span class="muted">0</span>':`<b style="color:${j<=30?'var(--warn)':'var(--fg)'}">${j}</b>`; }},{key:'depot',label:'Dépôt',type:'enum',pill:false,get:r=>dep(r.depotId).code,hidden:true},{key:'tickets',label:'Tickets',type:'num',get:r=>D.tickets.filter(t=>t.pieceId===r.id).length}],
    presets:[{name:'Garantie expirant sous 30 jours',rules:[{key:'statut',op:'in',v:'Sous garantie'},{key:'finGarantie',op:'next30'}]},{name:'Pièces avec plusieurs tickets',rules:[{key:'tickets',op:'gte',v:'2',v2:''}]},{name:'En stock depuis plus de 120 jours',rules:[{key:'statut',op:'in',v:'En stock'},{key:'dateEntree',op:'before',v:addDays(TODAY,-120),v2:''}]}]};
}
function lifeHtml(p){
  const st = p.statut; const reached = s => { if (s==='En stock') return true; if (s==='Vendue') return !!p.dateVente; if (s==='Sous garantie') return !!p.dateVente; if (s==='Garantie expirée') return st==='Garantie expirée' || (p.finGarantie && p.finGarantie<TODAY); if (s==='Retour / Échange') return st==='Retour / Échange'; };
  return `<div class="pipe" style="grid-template-columns:repeat(5,minmax(0,1fr))">${LIFE.map(s=>`<div class="pipe-s" style="cursor:default;${s===st?'border-color:var(--accent);background:var(--accent-soft)':''};${reached(s)?'':'opacity:.45'}"><div class="l">${esc(s)}</div><div style="font-size:12px;margin-top:4px">${s==='En stock'?fd(p.dateEntree):s==='Vendue'?fd(p.dateVente)||'—':s==='Sous garantie'?(p.garantieMois?p.garantieMois+' mois':'—'):s==='Garantie expirée'?fd(p.finGarantie)||'—':D.tickets.filter(t=>t.pieceId===p.id).length+' ticket(s)'}</div><div class="b" style="${reached(s)?'':'background:var(--surface-3)'}"></div></div>`).join('')}</div>`;
}
function openPiece(p){
  const a = art(p.articleId); const tk = D.tickets.filter(t=>t.pieceId===p.id);
  openDrawer({eyebrow:'Pièce électronique', title:`<span class="mono">${esc(p.serial)}</span>`,
    body: lifeHtml(p) + kv([['Article',esc(a.designation)],['Référence',`<span class="mono">${esc(a.ref)}</span>`],['Statut',pill(p.statut)],['Entrée en stock',fd(p.dateEntree)+' · '+esc(dep(p.depotId).nom)],['Client',p.clientId?esc(cli(p.clientId).raison):''],['Vendue le',fd(p.dateVente)],['Garantie',p.garantieMois?p.garantieMois+' mois':''],['Fin de garantie (calculée à la vente)',fd(p.finGarantie)]])
      + sec('Tickets liés', miniTable(['Ticket','Date','Statut'], tk.map(t=>[`<span class="mono">${t.num}</span>`,fd(t.date),pill(t.statut)]))),
    foot: p.clientId ? `<button class="btn primary" data-t>Ouvrir un ticket pour cette pièce</button>` : '',
    onMount: d => { const b = d.querySelector('[data-t]'); if (b) b.onclick = () => ticketForm(p.serial); }});
}
function renderGarantie(el){
  const ex = [D.pieces.find(p=>p.statut==='Sous garantie'), D.pieces.find(p=>p.statut==='Garantie expirée'), D.pieces.find(p=>p.statut==='Retour / Échange'), D.pieces.find(p=>p.statut==='En stock')].filter(Boolean);
  el.innerHTML = `<div class="panel" style="max-width:860px"><div class="panel-h"><h3>Vérifier l’éligibilité à la garantie</h3></div><p class="muted" style="margin:0 0 12px">Saisissez ou scannez le numéro de série gravé sur la pièce.</p>
    <form class="serial-box" id="gForm"><input class="inp mono" id="gSer" placeholder="N° de série" autocomplete="off" value="${esc(UI.lastSerial||'')}"><button class="btn primary" type="submit">${ic('search')} Vérifier</button></form>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px;font-size:12px" class="muted">Exemples : ${ex.map(p=>`<button class="chip" data-ex="${p.serial}"><span class="mono">${p.serial}</span> <span class="c">${esc(p.statut)}</span></button>`).join('')}</div>
    <div id="gRes" style="margin-top:18px"></div></div>`;
  const run = s => { UI.lastSerial = s; saveUI(); const p = D.pieces.find(x=>x.serial.toLowerCase()===s.trim().toLowerCase()); const box = el.querySelector('#gRes');
    if (!p) { box.innerHTML = `<div class="callout bad">Aucune pièce trouvée pour « ${esc(s)} ». Vérifiez le numéro.</div>`; return; }
    const ok = p.finGarantie && p.finGarantie >= TODAY; const a = art(p.articleId);
    box.innerHTML = `<div class="callout ${!p.clientId?'':ok?'ok':'bad'}" style="margin-bottom:14px"><div><b style="font-size:15px">${!p.clientId?'Pièce en stock, non vendue':ok?`Éligible à la garantie · ${daysBetween(TODAY,p.finGarantie)} jours restants`:'Non éligible : garantie expirée'}</b><div>${esc(a.designation)} · ${p.clientId?esc(cli(p.clientId).raison):esc(dep(p.depotId).nom)}${p.finGarantie?` · fin de garantie le ${fd(p.finGarantie)}`:''}</div></div></div>${lifeHtml(p)}<div style="margin-top:14px;display:flex;gap:8px"><button class="btn" data-op>Voir la fiche pièce</button>${p.clientId?`<button class="btn primary" data-tk>Ouvrir un ticket</button>`:''}</div>`;
    box.querySelector('[data-op]').onclick = () => openPiece(p); const tk = box.querySelector('[data-tk]'); if (tk) tk.onclick = () => ticketForm(p.serial); };
  el.querySelector('#gForm').onsubmit = e => { e.preventDefault(); run(el.querySelector('#gSer').value); };
  el.querySelectorAll('[data-ex]').forEach(b => b.onclick = () => { el.querySelector('#gSer').value = b.dataset.ex; run(b.dataset.ex); });
  if (UI.lastSerial) run(UI.lastSerial);
}
function renderSavDash(el){
  const t = S.tickets(); const months = []; for (let i=11;i>=0;i--){ const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-i); months.push(isoD(d).slice(0,7)); }
  const cats = groupBy(t, x=>x.categorie); const cl = Object.keys(cats).sort((a,b)=>cats[b].length-cats[a].length);
  const byArt = {}; t.forEach(x => { const a = ix().piece.get(x.pieceId)?.articleId; if (a) byArt[a]=(byArt[a]||0)+1; }); const ta = Object.entries(byArt).sort((a,b)=>b[1]-a[1]).slice(0,8); const tm = ta[0]?.[1]||1;
  const techs = groupBy(t.filter(x=>x.dateResolution), x=>x.assigneId);
  el.innerHTML = `<div class="grid g-2"><div class="panel"><div class="panel-h"><h3>Tickets ouverts par mois</h3></div><div class="chart-box"><canvas id="cSm" role="img" aria-label="Tickets par mois"></canvas></div>${legend([[SER()[0],'Sous garantie'],[SER()[1],'Hors garantie']])}</div>
    <div class="panel"><div class="panel-h"><h3>Tickets par catégorie</h3></div><div class="chart-box"><canvas id="cSc" role="img" aria-label="Tickets par catégorie"></canvas></div></div>
    <div class="panel"><div class="panel-h"><h3>Produits les plus concernés</h3><span class="sub">Nombre de tickets</span></div><div class="toplist">${ta.map(([id,n])=>`<div class="tl-row"><span>${esc(art(id).designation)}</span><span class="num">${n}</span><div class="bar"><i style="width:${n/tm*100}%;background:${SER()[1]}"></i></div></div>`).join('')}</div></div>
    <div class="panel"><div class="panel-h"><h3>Délai moyen par technicien</h3><span class="sub">Tickets résolus</span></div>${miniTable(['Technicien','#Résolus','#Délai moyen'], Object.entries(techs).sort((a,b)=>b[1].length-a[1].length).map(([id,arr])=>[esc(empName(id)), arr.length, (sum(arr,x=>daysBetween(x.date,x.dateResolution))/arr.length).toFixed(1).replace('.',',')+' j']))}</div></div>`;
  chart('cSm',{type:'bar',stacked:true,fmt:v=>v+' tickets',fmtAxis:v=>v,data:{labels:months.map(monthLabel),datasets:[{label:'Sous garantie',data:months.map(m=>t.filter(x=>x.date.startsWith(m)&&x.eligible).length),backgroundColor:SER()[0],borderRadius:4,maxBarThickness:22},{label:'Hors garantie',data:months.map(m=>t.filter(x=>x.date.startsWith(m)&&!x.eligible).length),backgroundColor:SER()[1],borderRadius:4,maxBarThickness:22}]}});
  chart('cSc',{type:'bar',indexAxis:'y',fmt:v=>v+' tickets',data:{labels:cl,datasets:[{data:cl.map(c=>cats[c].length),backgroundColor:SER()[0],borderRadius:4,maxBarThickness:18}]},options:{scales:{x:{grid:{color:cssVar('--line')},ticks:{color:cssVar('--muted'),precision:0}},y:{grid:{display:false},ticks:{color:cssVar('--muted'),font:{size:11}}}}}});
}

/* ================= MIGRATION ================= */
function renderMigration(){
  const t = D.migrationTables; const act = t.filter(x=>x.active);
  page({mod:'migration', eyebrow:'Organisation', title:'Migration des données historiques', sub:'Audit des tables de l’ancienne solution, mapping vers le nouveau schéma, migrations différentielles rejouables sans doublon et rapport d’anomalies.',
    kpis:[{l:'Tables auditées',v:t.length,s:`${act.length} actives · ${t.length-act.length} obsolètes ignorées`},{l:'Lignes à migrer',v:num(sum(act,x=>x.lignes)),s:`${num(sum(t.filter(x=>!x.active),x=>x.lignes))} lignes obsolètes écartées`},{l:'Colonnes mappées',v:Math.round(sum(act,x=>x.colonnesMappees)/Math.max(1,sum(act,x=>x.colonnes))*100)+' %',s:`${act.filter(x=>x.statutMapping==='Partielle').length} tables en mapping partiel`},{l:'Anomalies détectées',v:num(sum(t,x=>x.anomalies)),s:'Traitées ou à arbitrer',go:'anomalies'}],
    actions:`<button class="btn primary" id="btnMig">${ic('play')} Lancer une migration différentielle</button>`,
    tabs:[{id:'audit',label:'Audit des tables',cnt:t.length,render:el=>renderTable(el,migCfg())},{id:'executions',label:'Exécutions',cnt:D.migrationRuns.length,render:el=>renderTable(el,runCfg())},{id:'anomalies',label:'Rapport d’anomalies',render:el=>renderTable(el,anoCfg())}]});
  document.getElementById('btnMig').onclick = () => { const r = Math.random; const lu = Math.floor(1200+r()*4000); const ins = Math.floor(lu*.6); const mj = Math.floor(lu*.3); const run = {id:newId('MR'),date:TODAY,type:'Différentielle',lignesLues:lu,inserees:ins,misesAJour:mj,ignorees:lu-ins-mj,anomalies:Math.floor(r()*12),duree:Math.floor(40+r()*120)+' s',statut:'Terminée',par:PROFILES[UI.profile].label}; D.migrationRuns.push(run); save(); toast(`Migration différentielle terminée : ${num(ins)} insertions, ${num(mj)} mises à jour, ${num(run.ignorees)} doublons ignorés`); UI.tabs.migration='executions'; render(); };
}
function migCfg(){
  return {id:'migtables', noun:'les tables', rows:()=>D.migrationTables, facets:['etat','statutMapping'],
    onRow: m => openDrawer({eyebrow:'Table source', title:`<span class="mono">${esc(m.table)}</span>`, body: kv([['Table cible',`<span class="mono">${esc(m.cible)}</span>`],['Lignes',num(m.lignes)],['Dernière modification',fd(m.derniereMaj)],['Utilisation',pill(m.active?'Active':'Obsolète',m.active?'ok':'plain')],['Mapping',pill(m.statutMapping)],['Colonnes mappées',`${m.colonnesMappees} / ${m.colonnes}`],['Anomalies',num(m.anomalies)]]) + `<div class="callout">${m.active?'Table exploitée par l’ancienne solution (écritures récentes) : elle est migrée.':'Aucune écriture depuis plus de 18 mois et aucune référence depuis les tables actives : la table est écartée de la migration.'}</div>`}),
    columns:[{key:'table',label:'Table source',render:r=>`<span class="mono">${esc(r.table)}</span>`,strong:true},{key:'lignes',label:'Lignes',type:'num',sum:true},{key:'derniereMaj',label:'Dernière écriture',type:'date'},{key:'etat',label:'Utilisation',type:'enum',get:r=>r.active?'Active':'Obsolète',render:r=>pill(r.active?'Active':'Obsolète',r.active?'ok':'plain')},{key:'cible',label:'Cible',render:r=>`<span class="mono">${esc(r.cible)}</span>`},{key:'statutMapping',label:'Mapping',type:'enum'},{key:'couv',label:'Colonnes mappées',type:'num',get:r=>r.colonnes?Math.round(r.colonnesMappees/r.colonnes*100):0,render:r=>{const p=r.colonnes?Math.round(r.colonnesMappees/r.colonnes*100):0;return `<span class="bar-cell">${p} %<i style="width:${p*.6}px"></i></span>`;}},{key:'anomalies',label:'Anomalies',type:'num',sum:true}],
    presets:[{name:'Tables actives à mapping partiel',rules:[{key:'etat',op:'in',v:'Active'},{key:'statutMapping',op:'in',v:'Partielle'}]},{name:'Plus de 100 000 lignes',rules:[{key:'lignes',op:'gt',v:'100000',v2:''}]}]};
}
function runCfg(){
  return {id:'migruns', noun:'les exécutions', rows:()=>D.migrationRuns.slice().reverse(), facets:['type','statut'],
    columns:[{key:'date',label:'Date',type:'date'},{key:'type',label:'Type',type:'enum',pill:false},{key:'lignesLues',label:'Lignes lues',type:'num'},{key:'inserees',label:'Insérées',type:'num',sum:true},{key:'misesAJour',label:'Mises à jour',type:'num',sum:true},{key:'ignorees',label:'Doublons ignorés',type:'num'},{key:'anomalies',label:'Anomalies',type:'num'},{key:'duree',label:'Durée'},{key:'par',label:'Lancée par'},{key:'statut',label:'Statut',type:'enum'}]};
}
function anoCfg(){
  const TYPES = [['NIF manquant ou invalide','Corrigé depuis le registre client'],['Doublon de fiche','Fusionné'],['Date incohérente','Date de pièce reprise'],['Montant négatif','À arbitrer par la comptabilité'],['Référence article inconnue','Article créé en « à qualifier »'],['Écriture déséquilibrée','Écart passé en compte d’attente'],['Chèque sans échéance','Échéance = date d’émission'],['Encodage des caractères','Converti en UTF-8']];
  const rows = []; let k = 0;
  D.migrationTables.filter(t=>t.anomalies).forEach(t => { let left = t.anomalies; let i = t.table.length % TYPES.length; while (left > 0) { const n = Math.max(1, Math.ceil(left * .55)); const ty = TYPES[i % TYPES.length]; rows.push({id:'AN'+(k++),table:t.table,type:ty[0],nombre:Math.min(n,left),traitement:ty[1],statut:ty[1].startsWith('À arbitrer')?'En attente':'Traitée'}); left -= n; i += 3; } });
  return {id:'anomalies', noun:'les anomalies', rows:()=>rows, facets:['statut','type'],
    columns:[{key:'table',label:'Table',render:r=>`<span class="mono">${esc(r.table)}</span>`},{key:'type',label:'Type d’anomalie',type:'enum',pill:false,strong:true},{key:'nombre',label:'Occurrences',type:'num',sum:true},{key:'traitement',label:'Traitement appliqué'},{key:'statut',label:'Statut',type:'enum',render:r=>pill(r.statut,r.statut==='Traitée'?'ok':'warn')}]};
}

/* ================= PARAMÈTRES ================= */
function renderParametres(){
  const size = (JSON.stringify(D).length/1024/1024).toFixed(2).replace('.',',');
  document.getElementById('view').innerHTML = `
    <div class="ph"><div class="ph-txt"><div class="eyebrow">Organisation</div><h1>Paramètres</h1><p>Société, profils d’accès et données de démonstration enregistrées dans ce navigateur.</p></div></div>
    <div class="grid g-2">
      <div class="panel"><div class="panel-h"><h3>Société</h3></div>${kv([['Raison sociale','Algerian System Diagnostic (ASD)'],['Activité','Distribution et SAV de matériel de diagnostic et d’électronique automobile'],['Siège','Zone industrielle Oued Smar, Alger'],['Dépôts',D.depots.map(d=>esc(d.code)).join(' · ')],['Plan comptable','Système comptable financier (SCF)'],['TVA','19 % (taux normal) · 9 % (taux réduit)'],['Devise','Dinar algérien (DA)']])}</div>
      <div class="panel"><div class="panel-h"><h3>Données dans ce navigateur</h3></div>${kv([['Stockage',esc(CACHE_MODE)],['Volume',size+' Mo'],['Données générées le',fd(D.meta.created)],['Enregistrements',num(['articles','clients','fournisseurs','commandes','factures','reglements','pieces','tickets','achats','mouvements','tresorerie','cheques','ecritures','employes','conges'].reduce((s,k)=>s+D[k].length,0))]])}
        <p class="muted" style="font-size:12.5px">Toutes vos saisies (commandes, règlements, tickets, congés…) sont conservées dans ce navigateur. Elles ne sont pas partagées avec d’autres postes.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn danger" id="rst">${ic('reset')} Réinitialiser les données de démonstration</button><button class="btn" id="rstUi">Réinitialiser filtres et vues</button></div></div>
      <div class="panel" style="grid-column:1/-1"><div class="panel-h"><h3>Profils et droits d’accès</h3><span class="sub">Changez de profil en bas du menu pour voir l’application filtrée</span></div>
        <div class="dt-wrap"><table class="t"><thead><tr><th>Module</th>${Object.values(PROFILES).map(p=>`<th style="text-align:center">${esc(p.label)}</th>`).join('')}</tr></thead><tbody>${MODULES.filter(m=>m.id).map(m=>`<tr style="cursor:default"><td class="strong">${esc(m.label)}</td>${Object.values(PROFILES).map(p=>`<td style="text-align:center">${p.mods==='*'||p.mods.includes(m.id)?'<span style="color:var(--ok);font-weight:700">✓</span>':'<span class="muted">—</span>'}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <p class="muted" style="font-size:12.5px;margin-bottom:0">Le profil Commercial ne voit que ses propres clients, commandes, factures et tickets SAV.</p></div>
    </div>`;
  const r = document.getElementById('rst'); r.onclick = async () => { if (!r.dataset.c) { r.dataset.c=1; r.innerHTML = `${ic('reset')} Confirmer : effacer mes saisies`; return; } await resetData(); toast('Données de démonstration régénérées'); render(); };
  document.getElementById('rstUi').onclick = () => { UI.tables = {}; UI.views = {}; saveUI(); toast('Filtres et vues réinitialisés'); };
}

/* ================= RECHERCHE GLOBALE ================= */
function openPalette(){
  const root = document.getElementById('palRoot');
  root.innerHTML = `<div class="pal-scrim" id="palS"><div class="pal" role="dialog" aria-label="Recherche globale"><input id="palI" placeholder="Client, article, facture, commande, employé, ticket, n° de série…" autocomplete="off"><div class="pal-list" id="palL"></div></div></div>`;
  const inp = root.querySelector('#palI'), list = root.querySelector('#palL'); let items = [], sel = 0;
  const src = () => {
    const out = [];
    if (canSee('creances')||canSee('ventes')) S.clients().forEach(c=>out.push({t1:c.raison,t2:`${c.code} · ${c.wilaya} · encours ${da(clientEnc(c))}`,ty:'Client',hay:c.raison+' '+c.code+' '+c.nif,go:()=>{go('creances','clients');openClient(c);}}));
    if (canSee('stock')) D.articles.forEach(a=>out.push({t1:a.designation,t2:`${a.ref} · stock ${qtyTot(a)}`,ty:'Article',hay:a.designation+' '+a.ref+' '+a.marque,go:()=>{go('stock','articles');openArticle(a);}}));
    if (canSee('creances')) S.factures().forEach(f=>out.push({t1:f.num,t2:`${cli(f.clientId).raison} · ${da(f.ttc)} · ${facStatut(f)}`,ty:'Facture',hay:f.num,go:()=>{go('creances','factures');openFacture(f);}}));
    if (canSee('ventes')) S.commandes().forEach(c=>out.push({t1:c.num,t2:`${cli(c.clientId).raison} · ${c.statut}`,ty:'Commande',hay:c.num,go:()=>{go('ventes','commandes');openCommande(c);}}));
    if (canSee('fournisseurs')) { D.fournisseurs.forEach(f=>out.push({t1:f.raison,t2:`${f.code} · ${f.pays}`,ty:'Fournisseur',hay:f.raison+' '+f.code,go:()=>{go('fournisseurs','liste');openFournisseur(f);}})); D.achats.forEach(b=>out.push({t1:b.num,t2:`${frs(b.fournisseurId).raison} · ${b.statut}`,ty:'BC fournisseur',hay:b.num,go:()=>{go('fournisseurs','bc');openAchat(b);}})); }
    if (canSee('rh')) D.employes.forEach(e=>out.push({t1:`${e.prenom} ${e.nom}`,t2:`${e.matricule} · ${e.poste}`,ty:'Employé',hay:e.prenom+' '+e.nom+' '+e.matricule,go:()=>{go('rh','employes');openEmploye(e);}}));
    if (canSee('sav')) { S.tickets().forEach(t=>out.push({t1:t.num,t2:`${cli(t.clientId).raison} · ${t.statut}`,ty:'Ticket SAV',hay:t.num,go:()=>{go('sav','tickets');openTicket(t);}})); D.pieces.forEach(p=>out.push({t1:p.serial,t2:`${art(p.articleId).designation} · ${p.statut}`,ty:'N° de série',hay:p.serial,go:()=>{go('sav','pieces');openPiece(p);}})); }
    if (canSee('tresorerie')) D.cheques.forEach(c=>out.push({t1:`Chèque ${c.num}`,t2:`${c.tiers} · ${da(c.montant)} · ${c.statut}`,ty:'Chèque',hay:c.num+' '+c.tiers,go:()=>{go('tresorerie','cheques');}}));
    MODULES.filter(m=>m.id&&canSee(m.id)).forEach(m=>out.push({t1:m.label,t2:'Ouvrir le module',ty:'Module',hay:m.label,go:()=>go(m.id)}));
    return out;
  };
  const all = src();
  const draw = () => { const q = norm(inp.value).trim(); const terms = q.split(/\s+/).filter(Boolean);
    items = (terms.length ? all.filter(x=>{ const h = norm(x.hay+' '+x.t2); return terms.every(t=>h.includes(t)); }) : all.filter(x=>x.ty==='Module')).slice(0,40); sel = Math.min(sel, Math.max(0,items.length-1));
    list.innerHTML = items.map((x,i)=>`<div class="pal-i ${i===sel?'sel':''}" data-i="${i}"><div style="min-width:0"><div class="t1">${esc(x.t1)}</div><div class="t2">${esc(x.t2)}</div></div><span class="ty">${esc(x.ty)}</span></div>`).join('') || '<div class="empty">Aucun résultat.</div>';
    list.querySelector('.sel')?.scrollIntoView({block:'nearest'}); };
  const close = () => { root.innerHTML = ''; };
  const pickI = i => { const x = items[i]; if (!x) return; close(); x.go(); };
  inp.addEventListener('input', () => { sel = 0; draw(); });
  inp.addEventListener('keydown', e => { if (e.key==='ArrowDown') { sel = Math.min(items.length-1, sel+1); draw(); e.preventDefault(); } else if (e.key==='ArrowUp') { sel = Math.max(0, sel-1); draw(); e.preventDefault(); } else if (e.key==='Enter') pickI(sel); else if (e.key==='Escape') close(); });
  list.addEventListener('click', e => { const it = e.target.closest('[data-i]'); if (it) pickI(+it.dataset.i); });
  root.querySelector('#palS').addEventListener('click', e => { if (e.target.id==='palS') close(); });
  draw(); setTimeout(()=>inp.focus(), 20);
}

/* ================= DÉMARRAGE ================= */
function setTheme(t){ document.documentElement.setAttribute('data-theme', t); UI.theme = t; saveUI(); document.getElementById('themeBtn').innerHTML = ic(t==='dark'?'sun':'moon'); render(); }
async function boot(){
  loadUI();
  document.getElementById('view').innerHTML = '<div class="empty">Chargement des données ASD…</div>';
  D = await loadData();
  document.documentElement.setAttribute('data-theme', UI.theme || 'light'); // thème clair par défaut
  document.getElementById('themeBtn').innerHTML = ic(UI.theme==='dark'?'sun':'moon');
  const sel = document.getElementById('profileSel');
  sel.innerHTML = Object.entries(PROFILES).map(([k,p])=>`<option value="${k}" ${k===UI.profile?'selected':''}>${esc(p.label)}</option>`).join('');
  sel.onchange = () => { UI.profile = sel.value; saveUI(); const sc = scopeCommercial(); toast(sc?`Profil Commercial : vue limitée aux clients de ${empName(sc)}`:`Profil : ${PROFILES[UI.profile].label}`); go(canSee(UI.route)?UI.route:MODULES.find(m=>m.id&&canSee(m.id)).id); };
  document.getElementById('nav').addEventListener('click', e => { const a = e.target.closest('[data-route]'); if (a) { e.preventDefault(); go(a.dataset.route); } });
  document.getElementById('burger').onclick = () => document.getElementById('app').classList.toggle('nav-open');
  document.getElementById('scrim').onclick = () => document.getElementById('app').classList.remove('nav-open');
  document.getElementById('drawerScrim').onclick = closeDrawer;
  document.getElementById('searchBtn').onclick = openPalette;
  document.getElementById('themeBtn').onclick = () => { setTheme((UI.theme||'light')==='dark'?'light':'dark'); };
  document.addEventListener('keydown', e => { if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k') { e.preventDefault(); openPalette(); } else if (e.key==='Escape') { if (document.getElementById('palRoot').innerHTML) document.getElementById('palRoot').innerHTML=''; else closeDrawer(); } });
  const h = location.hash.replace('#',''); if (h && modById(h)) UI.route = h;
  go(UI.route);
}
boot();
