/* ================= STOCK ================= */
function renderStock(){
  const val = sum(D.articles, a=>qtyTot(a)*a.cmup);
  const rupt = D.articles.filter(a=>stockStatut(a)==='Rupture').length, alert = D.articles.filter(a=>stockStatut(a)==='Alerte').length;
  const mv30 = D.mouvements.filter(m=>m.date>=addDays(TODAY,-30));
  const lotsR = (D.lots||[]).filter(l=>l.qte>0&&['Périmé','Expire < 3 mois'].includes(lotStatut(l)));
  page({mod:'stock', eyebrow:'Opérations', title:'Gestion de stock', sub:'Quatre dépôts, médicaments et consommables suivis par lot et date de péremption (sortie FEFO), équipements valorisés au CMUP ou en FIFO, seuils d’alerte et inventaires.',
    kpis:[{l:'Valeur du stock',v:kda(val),s:`${num(sum(D.articles,qtyTot))} unités · ${D.articles.length} articles`},{l:'Ruptures',v:rupt,s:'Stock à zéro',dot:'var(--bad)',go:'alertes'},{l:'Sous le seuil minimum',v:alert,s:'Réapprovisionnement conseillé',dot:'var(--warn)',go:'alertes'},{l:'Lots à surveiller',v:lotsR.length,s:`${lotsR.filter(l=>lotStatut(l)==='Périmé').length} périmés · ${lotsR.filter(l=>lotStatut(l)!=='Périmé').length} expirent sous 3 mois`,dot:'var(--bad)',go:'lots'}],
    actions:`<button class="btn" id="btnTr">${ic('truck')} Transfert inter-dépôts</button>`,
    tabs:[
      {id:'articles',label:'Articles',cnt:D.articles.length,render:el=>renderTable(el,articleCfg())},
      {id:'lots',label:'Lots & péremption',cnt:(D.lots||[]).filter(l=>l.qte>0).length,render:el=>renderTable(el,lotCfg())},
      {id:'mouvements',label:'Mouvements',cnt:D.mouvements.length,render:el=>renderTable(el,mvtCfg())},
      {id:'alertes',label:'Alertes & réappro',cnt:rupt+alert,render:el=>renderTable(el,alertCfg())},
      {id:'valorisation',label:'Valorisation',render:renderValo},
      {id:'inventaires',label:'Inventaires',cnt:D.inventaires.length,render:el=>renderTable(el,invCfg())},
      {id:'depots',label:'Dépôts',cnt:D.depots.length,render:renderDepots},
    ]});
  document.getElementById('btnTr').onclick = () => mvtForm('Transfert');
}
function articleCfg(){
  return {id:'articles', noun:'les articles', rows:()=>D.articles, onRow:openArticle, add:articleForm, addLabel:'Nouvel article', facets:['statut','categorie'],
    columns:[
      {key:'ref',label:'Référence',render:r=>`<span class="mono">${r.ref}</span>`},
      {key:'designation',label:'Désignation',strong:true},
      {key:'categorie',label:'Catégorie',type:'enum',pill:false},
      {key:'marque',label:'Marque',type:'enum',pill:false,hidden:true},
      {key:'unite',label:'Unité',type:'enum',pill:false},
      {key:'qte',label:'Stock total',type:'num',get:qtyTot,sum:true},
      ...D.depots.map(d=>({key:'q_'+d.id,label:d.code,type:'num',get:r=>r.stocks[d.id]||0,hidden:d.id!=='DEP1'})),
      {key:'stockMin',label:'Seuil min.',type:'num'},
      {key:'stockMax',label:'Seuil max.',type:'num',hidden:true},
      {key:'prixAchat',label:'Prix d’achat',type:'money',hidden:true},
      {key:'cmup',label:'Coût unitaire',type:'money'},
      {key:'prixVente',label:'Prix de vente',type:'money'},
      {key:'valeur',label:'Valeur stock',type:'money',get:r=>qtyTot(r)*r.cmup,sum:true},
      {key:'methode',label:'Valorisation',type:'enum',pill:false,hidden:true},
      {key:'serialise',label:'N° de série',type:'bool',hidden:true},
      {key:'garantieMois',label:'Garantie (mois)',type:'num',hidden:true},
      {key:'peremption',label:'Péremption la plus proche',type:'date',get:nextPeremption,render:r=>{ const d = nextPeremption(r); if (!d) return '<span class="muted">—</span>'; const j = daysBetween(TODAY,d); return `<span style="color:${j<=90?'var(--bad)':j<=180?'var(--warn)':'var(--fg)'}">${fd(d)}</span>`; }},
      {key:'statut',label:'État',type:'enum',get:r=>stockStatut(r),facetOptions:['Rupture','Alerte','OK','Surstock']},
    ],
    presets:[{name:'Ruptures et alertes',facets:{statut:['Rupture','Alerte']}},{name:'Valeur > 1 M DA',rules:[{key:'valeur',op:'gt',v:'1000000',v2:''}]},{name:'Péremption dans les 6 mois',rules:[{key:'peremption',op:'before',v:addDays(TODAY,181),v2:''},{key:'peremption',op:'nempty'}]},{name:'Articles sérialisés sous garantie ≥ 12 mois',rules:[{key:'serialise',op:'true'},{key:'garantieMois',op:'gte',v:'12',v2:''}]},{name:'Rupture au dépôt d’Oran',rules:[{key:'q_DEP2',op:'eq',v:'0',v2:''}]}]};
}
function openArticle(a){
  const mv = D.mouvements.filter(m=>m.articleId===a.id).slice(0,8);
  const ventes = D.commandes.filter(c=>c.statut!=='Annulée'&&c.date>=addDays(TODAY,-90)).reduce((s,c)=>s+sum(c.lignes.filter(l=>l.articleId===a.id),l=>l.qte),0);
  openDrawer({eyebrow:`Article · ${esc(a.categorie)}`, title:esc(a.designation),
    body: `<div style="display:flex;gap:8px;flex-wrap:wrap">${pill(stockStatut(a))} <span class="pill plain">${esc(a.methode)}</span> ${a.serialise?'<span class="pill info">Suivi par n° de série</span>':''}</div>`
     + kv([['Référence',`<span class="mono">${esc(a.ref)}</span>`],['Marque / laboratoire',esc(a.marque)],['Unité de vente',esc(a.unite)],['Emplacement',esc(a.emplacement)],['Prix d’achat',da(a.prixAchat)],['Coût unitaire ('+a.methode+')',da(a.cmup)],['Prix de vente HT',da(a.prixVente)],['Marge brute',Math.round((a.prixVente-a.cmup)/a.prixVente*100)+' %'],['Garantie',a.garantieMois?a.garantieMois+' mois':'Sans garantie'],['Seuils',`min. ${a.stockMin} · max. ${a.stockMax}`],['Vendus sur 90 jours',num(ventes)+' unités'],['Valeur en stock',`<b>${da(qtyTot(a)*a.cmup)}</b>`]])
     + sec('Stock par dépôt', miniTable(['Dépôt','#Quantité','#Valeur','État'], D.depots.map(d=>[esc(d.nom), num(a.stocks[d.id]||0), da((a.stocks[d.id]||0)*a.cmup), pill(stockStatut(a,d.id))])))
     + (a.perissable ? sec('Lots en stock (sortie FEFO)', miniTable(['Lot','Dépôt','#Qté','Péremption','État'], lotsOf(a.id).sort((x,y)=>x.peremption.localeCompare(y.peremption)).map(l=>[`<span class="mono">${esc(l.lot)}</span>`, esc(dep(l.depotId).code), num(l.qte), fd(l.peremption), pill(lotStatut(l))]))) : '')
     + sec('Derniers mouvements', miniTable(['Date','Type','Dépôt','#Qté','Réf.'], mv.map(m=>[fd(m.date), pill(m.type,'plain'), esc(dep(m.depotId).code)+(m.depotDestId?' → '+esc(dep(m.depotDestId).code):''), num(m.qte), `<span class="mono">${esc(m.reference)}</span>`]))),
    ent:['articles',a], foot:`<button class="btn" data-adj style="margin-right:auto">Ajuster le stock</button><button class="btn primary" data-tr>Transférer</button>`,
    onMount: d => { d.querySelector('[data-adj]').onclick = () => mvtForm('Ajustement', a); d.querySelector('[data-tr]').onclick = () => mvtForm('Transfert', a); }});
}
function articleForm(a){
  const isNew = !a || !a.id; a = a && a.id ? a : {};
  openForm({eyebrow:'Stock', title:isNew?'Nouvel article':'Modifier l’article',
    fields:[{key:'designation',label:'Désignation',required:true,full:true},{key:'ref',label:'Référence',required:true},{key:'categorie',label:'Catégorie',type:'select',options:[...new Set(D.articles.map(x=>x.categorie))]},
      {key:'marque',label:'Marque',required:true},{key:'methode',label:'Méthode de valorisation',type:'select',options:['FEFO','CMUP','FIFO']},
      {key:'prixAchat',label:'Prix d’achat (DA)',type:'number',required:true,min:0},{key:'prixVente',label:'Prix de vente HT (DA)',type:'number',required:true,min:0},
      {key:'stockMin',label:'Seuil minimum',type:'number',default:5,min:0},{key:'stockMax',label:'Seuil maximum',type:'number',default:30,min:0},
      {key:'unite',label:'Unité de vente',default:'Boîte'},{key:'emplacement',label:'Emplacement',default:'A1-1'},{key:'garantieMois',label:'Garantie (mois)',type:'number',default:0,min:0},{key:'perissable',label:'Péremption',type:'checkbox',hint:'Suivi par lot et date de péremption (FEFO)'},{key:'serialise',label:'Suivi',type:'checkbox',hint:'Suivre chaque équipement par n° de série'}],
    values:a, ent: isNew?null:['articles',a],
    onSave: v => { if (isNew) { const n = {id:newId('A'),cond:{buy:[50,500],big:[50,500],small:[1,20]},cmup:v.prixAchat,stocks:Object.fromEntries(D.depots.map(d=>[d.id,0])),emplacement:'A1-1',actif:true,...v}; D.articles.unshift(n); toast(`Article ${n.ref} créé`); } else { Object.assign(a,v); toast('Article mis à jour'); } save(); render(); }});
}
function lotCfg(){
  return {id:'lots', noun:'les lots', rows:()=>(D.lots||[]).filter(l=>l.qte>0), onRow:l=>openArticle(art(l.articleId)), add:()=>lotForm(), addLabel:'Nouveau lot', facets:['statut','depot'],
    columns:[{key:'lot',label:'N° de lot',render:r=>`<span class="mono">${esc(r.lot)}</span>`,strong:true},{key:'article',label:'Produit',get:r=>art(r.articleId).designation},{key:'categorie',label:'Catégorie',type:'enum',pill:false,get:r=>art(r.articleId).categorie},{key:'depot',label:'Dépôt',type:'enum',pill:false,get:r=>dep(r.depotId).nom},
      {key:'qte',label:'Quantité',type:'num',sum:true},{key:'unite',label:'Unité',type:'enum',pill:false,get:r=>art(r.articleId).unite,hidden:true},{key:'fabrication',label:'Fabrication',type:'date',hidden:true},{key:'peremption',label:'Péremption',type:'date'},
      {key:'jours',label:'Jours restants',type:'num',get:r=>daysBetween(TODAY,r.peremption),render:r=>{ const j = daysBetween(TODAY,r.peremption); return `<b style="color:${j<0?'var(--bad)':j<=90?'var(--bad)':j<=180?'var(--warn)':'var(--fg)'}">${j}</b>`; }},
      {key:'valeur',label:'Valeur',type:'money',get:r=>r.qte*art(r.articleId).cmup,sum:true},{key:'statut',label:'État',type:'enum',get:lotStatut,facetOptions:['Périmé','Expire < 3 mois','Expire < 6 mois','Valide']}],
    rowActions: r => lotStatut(r)==='Périmé' ? `<button class="btn sm danger" data-act="destroy">Retirer du stock</button>` : '',
    onAction: (act, l) => { const a = art(l.articleId); a.stocks[l.depotId] = Math.max(0,(a.stocks[l.depotId]||0)-l.qte); D.mouvements.unshift({id:newId('M'),date:TODAY,type:'Ajustement',articleId:a.id,depotId:l.depotId,depotDestId:'',qte:-l.qte,coutUnitaire:a.cmup,reference:`DEST-${l.lot}`,motif:'Destruction lot périmé',utilisateur:PROFILES[UI.profile].label}); toast(`Lot ${l.lot} retiré : ${num(l.qte)} ${a.unite.toLowerCase()}(s) sortis du stock`); l.qte = 0; save(); render(); },
    presets:[{name:'Périmés à retirer',facets:{statut:['Périmé']}},{name:'Expirent sous 3 mois, valeur > 100 000 DA',rules:[{key:'jours',op:'between',v:'0',v2:'90'},{key:'valeur',op:'gt',v:'100000',v2:''}]},{name:'Médicaments, péremption < 6 mois',rules:[{key:'categorie',op:'in',v:'Médicaments génériques'},{key:'jours',op:'lte',v:'180',v2:''}]}]};
}
function mvtCfg(){
  return {id:'mouvements', noun:'les mouvements', rows:()=>D.mouvements, onRow:m=>openArticle(art(m.articleId)), add:()=>mvtForm('Entrée'), addLabel:'Nouveau mouvement', facets:['type','depot'],
    columns:[
      {key:'date',label:'Date',type:'date'},
      {key:'type',label:'Type',type:'enum',render:r=>pill(r.type,{Entrée:'ok',Sortie:'info',Transfert:'acc',Ajustement:'warn'}[r.type])},
      {key:'reference',label:'Document',render:r=>`<span class="mono">${esc(r.reference)}</span>`},
      {key:'article',label:'Article',get:r=>art(r.articleId).designation,strong:true},
      {key:'categorie',label:'Catégorie',type:'enum',pill:false,get:r=>art(r.articleId).categorie,hidden:true},
      {key:'depot',label:'Dépôt',type:'enum',pill:false,get:r=>dep(r.depotId).nom},
      {key:'dest',label:'Vers',type:'enum',pill:false,get:r=>r.depotDestId?dep(r.depotDestId).nom:''},
      {key:'qte',label:'Quantité',type:'num'},
      {key:'coutUnitaire',label:'Coût unitaire',type:'money',hidden:true},
      {key:'valeur',label:'Valeur',type:'money',get:r=>r.qte*r.coutUnitaire,sum:true},
      {key:'motif',label:'Motif',type:'enum',pill:false},
      {key:'utilisateur',label:'Saisi par',type:'enum',pill:false,hidden:true},
    ],
    presets:[{name:'Transferts du mois',rules:[{key:'type',op:'in',v:'Transfert'},{key:'date',op:'thismonth'}]},{name:'Ajustements négatifs',rules:[{key:'type',op:'in',v:'Ajustement'},{key:'qte',op:'lt',v:'0',v2:''}]},{name:'Entrées > 1 M DA',rules:[{key:'type',op:'in',v:'Entrée'},{key:'valeur',op:'gt',v:'1000000',v2:''}]}]};
}
function mvtForm(type, a){
  const arts = D.articles.slice().sort((x,y)=>x.designation.localeCompare(y.designation,'fr')).map(x=>[x.id,`${x.designation} (${x.ref})`]);
  openForm({eyebrow:'Stock', title: type==='Transfert'?'Transfert inter-dépôts':type==='Ajustement'?'Ajustement de stock':'Nouveau mouvement',
    fields:[{key:'type',label:'Type',type:'select',options:['Entrée','Sortie','Transfert','Ajustement']},{key:'date',label:'Date',type:'date',default:TODAY},
      {key:'articleId',label:'Article',type:'select',options:arts,required:true,full:true},
      {key:'depotId',label:'Dépôt',type:'select',options:D.depots.map(d=>[d.id,d.nom])},{key:'depotDestId',label:'Dépôt de destination (transfert)',type:'select',allowEmpty:true,options:D.depots.map(d=>[d.id,d.nom])},
      {key:'qte',label:'Quantité (négative pour un ajustement à la baisse)',type:'number',required:true},{key:'reference',label:'Document de référence',placeholder:'TR-…, INV-…'},
      {key:'motif',label:'Motif',full:true,default: type==='Transfert'?'Rééquilibrage inter-dépôts':''}],
    values:{type, articleId:a?.id}, submitLabel:'Enregistrer le mouvement',
    onSave: v => {
      const x = art(v.articleId); const q = Number(v.qte); if (!q) return 'Indiquez une quantité non nulle.';
      if (v.type==='Transfert') { if (!v.depotDestId || v.depotDestId===v.depotId) return 'Choisissez un dépôt de destination différent du dépôt de départ.'; if ((x.stocks[v.depotId]||0) < q) return `Stock insuffisant au ${dep(v.depotId).nom} (${x.stocks[v.depotId]||0} disponibles).`; x.stocks[v.depotId]-=q; x.stocks[v.depotDestId]=(x.stocks[v.depotDestId]||0)+q; }
      else if (v.type==='Sortie') { if ((x.stocks[v.depotId]||0) < q) return `Stock insuffisant (${x.stocks[v.depotId]||0} disponibles).`; x.stocks[v.depotId]-=q; if (x.perissable) consumeLots(x.id, v.depotId, q); }
      else if (v.type==='Entrée') { const old = qtyTot(x); x.stocks[v.depotId]=(x.stocks[v.depotId]||0)+q; addLot(x, v.depotId, q); if (x.methode==='CMUP') x.cmup = Math.round((old*x.cmup + q*x.prixAchat)/(old+q)); }
      else { x.stocks[v.depotId]=Math.max(0,(x.stocks[v.depotId]||0)+q); }
      D.mouvements.unshift({id:newId('M'),date:v.date||TODAY,type:v.type,articleId:x.id,depotId:v.depotId,depotDestId:v.type==='Transfert'?v.depotDestId:'',qte:q,coutUnitaire:x.cmup,reference:v.reference||`${v.type.slice(0,3).toUpperCase()}-${Math.floor(Math.random()*9000+1000)}`,motif:v.motif||v.type,utilisateur:PROFILES[UI.profile].label});
      save(); toast(`${v.type} de ${num(Math.abs(q))} × ${x.designation} enregistré`); render();
    }});
}
function alertCfg(){
  const best = a => { const b = D.achats.filter(x=>x.lignes.some(l=>l.articleId===a.id)).sort((x,y)=>y.date.localeCompare(x.date))[0]; return b ? frs(b.fournisseurId).raison : '—'; };
  return {id:'alertes', noun:'les alertes', rows:()=>D.articles.filter(a=>['Rupture','Alerte'].includes(stockStatut(a)) || D.depots.some(d=>stockStatut(a,d.id)==='Rupture')), onRow:openArticle, facets:['statut','categorie'],
    columns:[
      {key:'ref',label:'Référence',render:r=>`<span class="mono">${r.ref}</span>`},{key:'designation',label:'Article',strong:true},{key:'categorie',label:'Catégorie',type:'enum',pill:false},
      {key:'qte',label:'Stock',type:'num',get:qtyTot},{key:'stockMin',label:'Seuil min.',type:'num'},
      {key:'deprupt',label:'Dépôts en rupture',get:r=>D.depots.filter(d=>(r.stocks[d.id]||0)===0).map(d=>d.code).join(', ')},
      {key:'reappro',label:'Qté conseillée',type:'num',get:r=>Math.max(0,r.stockMax-qtyTot(r))},
      {key:'cout',label:'Coût du réappro',type:'money',get:r=>Math.max(0,r.stockMax-qtyTot(r))*r.prixAchat,sum:true},
      {key:'frs',label:'Dernier fournisseur',type:'enum',pill:false,get:best},
      {key:'statut',label:'État',type:'enum',get:r=>stockStatut(r)},
    ],
    rowActions: r => `<button class="btn sm" data-act="bc">Créer un BC</button>`,
    onAction: (act, a) => { const lastBc = D.achats.filter(x=>x.lignes.some(l=>l.articleId===a.id)).sort((x,y)=>y.date.localeCompare(x.date))[0]; const f = lastBc ? frs(lastBc.fournisseurId) : D.fournisseurs[0]; const q = Math.max(1,a.stockMax-qtyTot(a));
      const ht = q*a.prixAchat; const bc = {id:newId('BC'),num:nextNum(D.achats,'num','BCF',4),date:TODAY,fournisseurId:f.id,depotId:'DEP1',lignes:[{articleId:a.id,qte:q,pu:a.prixAchat,qteRecue:0}],montantHT:ht,tva:Math.round(ht*.19),ttc:Math.round(ht*1.19),statut:'Créée',dateLivraisonPrevue:addDays(TODAY,f.pays==='Algérie'?7:40),dateLivraison:'',bl:'',factureFrs:'',rapprochement:'En attente',echeance:addDays(TODAY,f.delaiPaiement+40),paye:0};
      D.achats.unshift(bc); save(); toast(`Bon de commande ${bc.num} créé chez ${f.raison}`); },
  };
}
function renderValo(el){
  const cats = [...new Set(D.articles.map(a=>a.categorie))];
  const cell = (c,d) => sum(D.articles.filter(a=>a.categorie===c), a=>(d?a.stocks[d]||0:qtyTot(a))*a.cmup);
  const rows = cats.map(c=>({c, vals:D.depots.map(d=>cell(c,d.id)), tot:cell(c)})).sort((a,b)=>b.tot-a.tot);
  const tot = sum(rows,r=>r.tot);
  const cmup = sum(D.articles.filter(a=>a.methode==='CMUP'),a=>qtyTot(a)*a.cmup), fifo = tot - cmup;
  el.innerHTML = `<div class="grid g-21"><div class="panel"><div class="panel-h"><h3>Valorisation par catégorie et par dépôt</h3><span class="sub">En DA, au coût unitaire de chaque article</span></div>
    <div class="dt-wrap"><table class="t"><thead><tr><th>Catégorie</th>${D.depots.map(d=>`<th class="r">${d.code}</th>`).join('')}<th class="r">Total</th><th class="r">Part</th></tr></thead><tbody>${rows.map(r=>`<tr><td class="strong">${esc(r.c)}</td>${r.vals.map(v=>`<td class="num">${num(v)}</td>`).join('')}<td class="num strong">${num(r.tot)}</td><td class="num">${(r.tot/tot*100).toFixed(1).replace('.',',')} %</td></tr>`).join('')}</tbody>
    <tfoot><tr><td>Total</td>${D.depots.map(d=>`<td class="num">${num(sum(rows,r=>r.vals[D.depots.indexOf(d)]))}</td>`).join('')}<td class="num">${num(tot)}</td><td class="num">100 %</td></tr></tfoot></table></div></div>
    <div class="panel"><div class="panel-h"><h3>Répartition par dépôt</h3></div><div class="chart-box sm"><canvas id="cVD" role="img" aria-label="Valeur par dépôt"></canvas></div>
    <div style="margin-top:14px">${kv([['Articles valorisés au CMUP',da(cmup)],['Articles valorisés en FIFO',da(fifo)],['Total',`<b>${da(tot)}</b>`]])}</div>
    <p class="muted" style="font-size:12px;margin:12px 0 0">Le CMUP est recalculé à chaque entrée : (stock × coût actuel + quantité reçue × prix d’achat) ÷ nouveau stock.</p></div></div>`;
  chart('cVD',{type:'bar',data:{labels:D.depots.map(d=>d.code),datasets:[{data:D.depots.map(d=>sum(D.articles,a=>(a.stocks[d.id]||0)*a.cmup)),backgroundColor:SER()[0],borderRadius:4,maxBarThickness:40}]}});
}
function invCfg(){
  return {id:'inventaires', noun:'les inventaires', rows:()=>D.inventaires, facets:['statut','depot'],
    onRow: i => openDrawer({eyebrow:'Inventaire physique', title:i.num, ent:['inventaires',i], body: kv([['Dépôt',esc(dep(i.depotId).nom)],['Date',fd(i.date)],['Type',esc(i.type)],['Responsable',esc(empName(i.responsable))],['Articles comptés',num(i.articlesComptes)],['Écarts détectés',num(i.ecarts)],['Valeur des écarts',da(i.valeurEcart)],['Statut',pill(i.statut)]]) + `<div class="callout ${i.ecarts?'warn':'ok'}">${i.ecarts?`Les ${i.ecarts} écarts ont été rapprochés automatiquement : un ajustement de stock a été généré pour chacun.`:'Aucun écart entre le stock théorique et le comptage.'}</div>`}),
    add: () => invForm(), addLabel:'Lancer un inventaire',
    columns:[{key:'num',label:'N°',render:r=>`<span class="mono">${r.num}</span>`},{key:'date',label:'Date',type:'date'},{key:'depot',label:'Dépôt',type:'enum',pill:false,get:r=>dep(r.depotId).nom},{key:'type',label:'Type',type:'enum',pill:false},{key:'articlesComptes',label:'Articles comptés',type:'num'},{key:'ecarts',label:'Écarts',type:'num'},{key:'valeurEcart',label:'Valeur des écarts',type:'money',sum:true},{key:'responsable',label:'Responsable',get:r=>empName(r.responsable)},{key:'statut',label:'Statut',type:'enum'}]};
}
function renderDepots(el){
  el.innerHTML = `<div class="grid g-2">${D.depots.map(d => { const v = sum(D.articles,a=>(a.stocks[d.id]||0)*a.cmup); const q = sum(D.articles,a=>a.stocks[d.id]||0); const r = D.articles.filter(a=>stockStatut(a,d.id)==='Rupture').length; const resp = D.employes.find(e=>e.poste==='Chef magasinier'&&e.depotId===d.id);
    return `<div class="panel"><div class="panel-h"><h3>${esc(d.nom)}</h3><span style="display:flex;align-items:center"><span class="mono muted">${d.code}</span><span class="card-acts" data-dep="${d.id}">${crudIcons(CRUD.depots,d)}</span></span></div>${kv([['Adresse',esc(d.adresse)],['Wilaya',esc(d.wilaya)],['Responsable',resp?esc(resp.prenom+' '+resp.nom):''],['Valeur du stock',`<b>${da(v)}</b>`],['Unités en stock',num(q)],['Articles en rupture',r?`<span style="color:var(--bad);font-weight:600">${r}</span>`:'0'],['Mouvements 30 j',num(D.mouvements.filter(m=>(m.depotId===d.id||m.depotDestId===d.id)&&m.date>=addDays(TODAY,-30)).length)]])}</div>`; }).join('')}<button class="add-card" data-newdep>${ic('plus')} Nouveau dépôt</button></div>`;
  el.onclick = e => { if (e.target.closest('[data-newdep]')) { depotForm(); return; } const b = e.target.closest('[data-crud]'); if (!b) return; const d = D.depots.find(x=>x.id===b.closest('[data-dep]').dataset.dep); if (b.dataset.why) { toast(b.dataset.why); return; } crudDo(CRUD.depots, b.dataset.crud, d); };
}

/* ================= FOURNISSEURS & ACHATS ================= */
const BC_FLOW = ['Créée','Validée','Préparée','Expédiée','Livrée'];
function renderFournisseurs(){
  const enCours = D.achats.filter(b=>b.statut!=='Livrée');
  const dues = D.achats.filter(b=>achatReste(b)>0 && b.statut==='Livrée');
  const ech30 = dues.filter(b=>b.echeance<=addDays(TODAY,30));
  page({mod:'fournisseurs', eyebrow:'Opérations', title:'Fournisseurs & achats', sub:'Commandes fournisseurs suivies de la création à la livraison, avec rapprochement bon de commande / bon de livraison / facture.',
    kpis:[{l:'Commandes en cours',v:enCours.length,s:kda(sum(enCours,b=>b.ttc))+' TTC'},{l:'Dettes fournisseurs',v:kda(sum(dues,achatReste)),s:`${dues.length} factures à régler`,go:'echeances'},{l:'À payer sous 30 jours',v:kda(sum(ech30,achatReste)),s:`dont ${kda(sum(ech30.filter(b=>b.echeance<TODAY),achatReste))} échus`,dot:'var(--warn)',go:'echeances'},{l:'Réceptions avec écart',v:D.achats.filter(b=>b.rapprochement.startsWith('Écart')).length,s:'À régulariser'}],
    tabs:[{id:'bc',label:'Commandes fournisseurs',cnt:D.achats.length,render:el=>renderTable(el,achatCfg())},{id:'liste',label:'Fournisseurs',cnt:D.fournisseurs.length,render:el=>renderTable(el,frsCfg())},{id:'echeances',label:'Échéances de paiement',cnt:dues.length,render:el=>renderTable(el,echFrsCfg())},{id:'historique',label:'Historique des achats',render:el=>renderTable(el,histAchatCfg())}]});
}
function achatCfg(){
  return {id:'achats', noun:'les commandes fournisseurs', rows:()=>D.achats, onRow:openAchat, facets:['statut','rapprochement'], add:achatForm, addLabel:'Nouvelle commande',
    columns:[{key:'num',label:'N° BC',render:r=>`<span class="mono">${r.num}</span>`,strong:true},{key:'date',label:'Date',type:'date'},{key:'fournisseur',label:'Fournisseur',get:r=>frs(r.fournisseurId).raison},{key:'pays',label:'Pays',type:'enum',pill:false,get:r=>frs(r.fournisseurId).pays},{key:'depot',label:'Dépôt',type:'enum',pill:false,get:r=>dep(r.depotId).code,hidden:true},
      {key:'montantHT',label:'Montant HT',type:'money',sum:true,hidden:true},{key:'ttc',label:'Montant TTC',type:'money',sum:true},{key:'av',label:'Avancement',sortable:false,filter:false,render:r=>stepper(BC_FLOW,r.statut)},{key:'statut',label:'Statut',type:'enum',facetOptions:BC_FLOW},
      {key:'dateLivraisonPrevue',label:'Livraison prévue',type:'date',hidden:true},{key:'rapprochement',label:'Rapprochement',type:'enum'},{key:'echeance',label:'Échéance',type:'date'},{key:'paye',label:'Payé',type:'money',hidden:true},{key:'reste',label:'Reste à payer',type:'money',get:achatReste,sum:true}],
    presets:[{name:'Importations en cours',rules:[{key:'pays',op:'nin',v:'Algérie'},{key:'statut',op:'nin',v:'Livrée'}]},{name:'Livrées non soldées',rules:[{key:'statut',op:'in',v:'Livrée'},{key:'reste',op:'gt',v:'0',v2:''}]},{name:'Retard de livraison',rules:[{key:'statut',op:'nin',v:'Livrée'},{key:'dateLivraisonPrevue',op:'past'}]}]};
}
function openAchat(b){
  const f = frs(b.fournisseurId); const i = BC_FLOW.indexOf(b.statut); const next = i<BC_FLOW.length-1 ? BC_FLOW[i+1] : null;
  openDrawer({eyebrow:'Commande fournisseur', title:b.num, ent:['achats',b],
    body:`<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">${pill(b.statut)} ${stepper(BC_FLOW,b.statut)} ${pill(b.rapprochement)}</div>`
      + kv([['Fournisseur',`<a href="#" data-f>${esc(f.raison)}</a> · ${esc(f.pays)}`],['Date',fd(b.date)],['Dépôt de réception',esc(dep(b.depotId).nom)],['Livraison prévue',fd(b.dateLivraisonPrevue)],['Livrée le',fd(b.dateLivraison)],['Conditions',esc(f.conditions)],['Échéance de paiement',fd(b.echeance)],['Montant TTC',`<b>${da(b.ttc)}</b>`],['Payé',da(b.paye)],['Reste à payer',da(achatReste(b))]])
      + sec('Rapprochement BC / BL / facture', miniTable(['Article','#Commandé','#Reçu','#Écart','#PU'], b.lignes.map(l=>[esc(art(l.articleId).designation), num(l.qte), b.statut==='Livrée'?num(l.qteRecue):'—', b.statut==='Livrée'?(l.qte-l.qteRecue?`<b style="color:var(--bad)">${num(l.qteRecue-l.qte)}</b>`:'0'):'—', da(l.pu)])) + `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px"><span class="pill ${b.num?'ok':''}">BC ${esc(b.num)}</span><span class="pill ${b.bl?'ok':''}">BL ${esc(b.bl||'en attente')}</span><span class="pill ${b.factureFrs?'ok':''}">Facture ${esc(b.factureFrs||'en attente')}</span></div>`),
    foot:`${b.statut==='Livrée'&&achatReste(b)>0?`<button class="btn" data-pay>Enregistrer le paiement</button>`:''}${next?`<button class="btn primary" data-next>${ic('check')} Passer à « ${next} »</button>`:''}`,
    onMount: d => {
      d.querySelector('[data-f]').onclick = e => { e.preventDefault(); openFournisseur(f); };
      const n = d.querySelector('[data-next]'); if (n) n.onclick = () => { b.statut = next; if (next==='Livrée') { b.dateLivraison=TODAY; b.bl=`BL-${Math.floor(Math.random()*90000+10000)}`; b.factureFrs=`F-${f.code.slice(4)}-${Math.floor(Math.random()*9000+1000)}`; b.rapprochement='Conforme'; b.echeance = addDays(TODAY,f.delaiPaiement);
          b.lignes.forEach(l => { l.qteRecue=l.qte; const a = art(l.articleId); const old = qtyTot(a); a.stocks[b.depotId]=(a.stocks[b.depotId]||0)+l.qte; addLot(a, b.depotId, l.qte); if (a.methode==='CMUP') a.cmup = Math.round((old*a.cmup+l.qte*l.pu)/(old+l.qte)); D.mouvements.unshift({id:newId('M'),date:TODAY,type:'Entrée',articleId:a.id,depotId:b.depotId,depotDestId:'',qte:l.qte,coutUnitaire:l.pu,reference:b.num,motif:'Réception fournisseur',utilisateur:PROFILES[UI.profile].label}); });
          D.ecritures.unshift({id:newId('EC'),num:nextNum(D.ecritures,'num','ACH-'),date:TODAY,journal:'ACH',libelle:`Facture fournisseur ${b.factureFrs} — ${f.raison}`,circuit:'A',lignes:[['380000',b.montantHT,0],['445600',b.tva,0],[f.pays==='Algérie'?'401000':'401100',0,b.ttc]],origine:'Fournisseurs',reference:b.num,statut:'Brouillard'});
          toast('Réception enregistrée : stock mis à jour, écriture d’achat générée'); } else toast(`${b.num} : ${next}`); save(); openAchat(b); render(); };
      const p = d.querySelector('[data-pay]'); if (p) p.onclick = () => { const m = achatReste(b); b.paye += m; D.tresorerie.unshift({id:newId('TR'),date:TODAY,compteId:'BQ1',sens:'Décaissement',categorie:f.pays==='Algérie'?'Paiement fournisseur':'Paiement fournisseur (import)',montant:m,libelle:`${b.num} — ${f.raison}`,reference:b.num,rapproche:false});
        D.ecritures.unshift({id:newId('EC'),num:nextNum(D.ecritures,'num','BQ-'),date:TODAY,journal:'BQ',libelle:`Paiement ${b.num} — ${f.raison}`,circuit:'A',lignes:[[f.pays==='Algérie'?'401000':'401100',m,0],['512100',0,m]],origine:'Fournisseurs',reference:b.num,statut:'Brouillard'}); save(); toast(`Paiement de ${da(m)} enregistré sur BNA`); openAchat(b); render(); };
    }});
}
function frsCfg(){
  return {id:'frs', noun:'les fournisseurs', rows:()=>D.fournisseurs, onRow:openFournisseur, facets:['pays','devise'], add:()=>frsForm(), addLabel:'Nouveau fournisseur',
    columns:[{key:'code',label:'Code',render:r=>`<span class="mono">${r.code}</span>`},{key:'raison',label:'Raison sociale',strong:true},{key:'pays',label:'Pays',type:'enum',pill:false},{key:'ville',label:'Ville'},{key:'devise',label:'Devise',type:'enum',pill:false},{key:'delaiPaiement',label:'Délai (j)',type:'num'},{key:'contact',label:'Contact'},{key:'tel',label:'Téléphone',hidden:true},
      {key:'nbBc',label:'Commandes',type:'num',get:r=>D.achats.filter(b=>b.fournisseurId===r.id).length},{key:'total',label:'Achats TTC',type:'money',get:r=>sum(D.achats.filter(b=>b.fournisseurId===r.id),b=>b.ttc),sum:true},{key:'du',label:'Reste dû',type:'money',get:r=>sum(D.achats.filter(b=>b.fournisseurId===r.id&&b.statut==='Livrée'),achatReste),sum:true},{key:'note',label:'Note',type:'num',render:r=>'★'.repeat(r.note)+'<span class="muted">'+'★'.repeat(5-r.note)+'</span>'}],
    presets:[{name:'Fournisseurs locaux',rules:[{key:'pays',op:'in',v:'Algérie'}]},{name:'Importation (hors DZD)',rules:[{key:'devise',op:'nin',v:'DZD'}]},{name:'Dette > 1 M DA',rules:[{key:'du',op:'gt',v:'1000000',v2:''}]}]};
}
function openFournisseur(f){
  const bcs = D.achats.filter(b=>b.fournisseurId===f.id).sort((a,b)=>b.date.localeCompare(a.date));
  openDrawer({eyebrow:'Fournisseur', title:esc(f.raison),
    body: kv([['Code',`<span class="mono">${f.code}</span>`],['Pays / ville',esc(f.pays+' · '+f.ville)],['Devise',esc(f.devise)],['Contact',esc(f.contact)],['Téléphone',`<span class="mono">${esc(f.tel)}</span>`],['E-mail',esc(f.email)],['NIF',f.nif?`<span class="mono">${f.nif}</span>`:''],['Conditions',esc(f.conditions)],['Délai de paiement',f.delaiPaiement+' jours'],['Total des achats',`<b>${da(sum(bcs,b=>b.ttc))}</b>`],['Reste dû',da(sum(bcs.filter(b=>b.statut==='Livrée'),achatReste))]])
      + sec('Historique des commandes', miniTable(['N°','Date','Statut','#TTC'], bcs.slice(0,12).map(b=>[`<span class="mono">${b.num}</span>`,fd(b.date),pill(b.statut),da(b.ttc)]))),
    ent:['frs',f], foot:`<button class="btn primary" data-bc>${ic('plus')} Nouvelle commande</button>`, onMount:d=>{ d.querySelector('[data-bc]').onclick=()=>{ achatForm(); setTimeout(()=>{ const s = document.getElementById('fld-fournisseurId'); if (s) s.value = f.id; },40); }; }});
}
function frsForm(f){
  const isNew = !f; f = f || {};
  openForm({eyebrow:'Fournisseurs', title:isNew?'Nouveau fournisseur':'Modifier le fournisseur', values:f, ent:isNew?null:['frs',f],
    fields:[{key:'raison',label:'Raison sociale',required:true,full:true},{key:'pays',label:'Pays',default:'Algérie'},{key:'ville',label:'Ville'},{key:'devise',label:'Devise',type:'select',options:['DZD','EUR','USD']},{key:'delaiPaiement',label:'Délai de paiement (jours)',type:'number',default:30},{key:'contact',label:'Contact'},{key:'tel',label:'Téléphone'},{key:'email',label:'E-mail'},{key:'nif',label:'NIF'},{key:'conditions',label:'Conditions commerciales',type:'textarea',full:true}],
    onSave: v => { if (isNew) D.fournisseurs.push({id:newId('F'),code:'FRS-'+String(D.fournisseurs.length+1).padStart(3,'0'),note:3,categoriePrincipale:'',...v}); else Object.assign(f,v); save(); toast(isNew?'Fournisseur créé':'Fournisseur mis à jour'); render(); }});
}
function echFrsCfg(){
  return {id:'echfrs', noun:'les échéances', rows:()=>D.achats.filter(b=>b.statut==='Livrée'&&achatReste(b)>0), onRow:openAchat, facets:['etat'],
    columns:[{key:'echeance',label:'Échéance',type:'date'},{key:'etat',label:'État',type:'enum',get:r=>r.echeance<TODAY?'Échu':r.echeance<=addDays(TODAY,30)?'À échéance':'À venir'},{key:'num',label:'BC',render:r=>`<span class="mono">${r.num}</span>`},{key:'factureFrs',label:'Facture',render:r=>`<span class="mono">${esc(r.factureFrs)}</span>`},{key:'fournisseur',label:'Fournisseur',get:r=>frs(r.fournisseurId).raison,strong:true},{key:'devise',label:'Devise',type:'enum',pill:false,get:r=>frs(r.fournisseurId).devise},{key:'ttc',label:'Montant',type:'money',sum:true},{key:'reste',label:'Reste à payer',type:'money',get:achatReste,sum:true},{key:'jours',label:'Jours',type:'num',get:r=>daysBetween(TODAY,r.echeance)}],
    presets:[{name:'Échues',rules:[{key:'echeance',op:'past'}]},{name:'30 prochains jours',rules:[{key:'echeance',op:'next30'}]}]};
}
function histAchatCfg(){
  const rows = []; const m = {};
  D.achats.forEach(b => b.lignes.forEach(l => { const k = b.fournisseurId+'|'+l.articleId; const r = m[k] ||= {id:k,fournisseurId:b.fournisseurId,articleId:l.articleId,qte:0,montant:0,nb:0,dernier:''}; r.qte+=l.qte; r.montant+=l.qte*l.pu; r.nb++; if (b.date>r.dernier) r.dernier=b.date; }));
  Object.values(m).forEach(r=>rows.push(r));
  return {id:'histachat', noun:'l’historique', rows:()=>rows, onRow:r=>openArticle(art(r.articleId)),
    columns:[{key:'fournisseur',label:'Fournisseur',type:'enum',pill:false,get:r=>frs(r.fournisseurId).raison,strong:true},{key:'article',label:'Article',get:r=>art(r.articleId).designation},{key:'categorie',label:'Catégorie',type:'enum',pill:false,get:r=>art(r.articleId).categorie},{key:'nb',label:'Commandes',type:'num'},{key:'qte',label:'Quantité achetée',type:'num',sum:true},{key:'pm',label:'Prix moyen',type:'money',get:r=>r.montant/r.qte},{key:'montant',label:'Montant HT',type:'money',sum:true},{key:'dernier',label:'Dernier achat',type:'date'}]};
}

/* ================= CLIENTS & CRÉANCES ================= */
function renderCreances(){
  const facs = S.factures(); const open = facs.filter(f=>facReste(f)>0);
  const enc = sum(open,facReste), late = sum(open.filter(f=>f.echeance<TODAY),facReste);
  const rec30 = sum(S.reglements().filter(r=>r.date>=addDays(TODAY,-30)),r=>r.montant);
  const ca90 = sum(facs.filter(f=>f.date>=addDays(TODAY,-90)),f=>f.ttc);
  const dso = ca90 ? Math.round(enc/ca90*90) : 0;
  page({mod:'creances', eyebrow:'Finance', title:'Clients & créances', sub:'Encours client en temps réel, échéanciers personnalisés, règlements, relances automatiques et balance âgée.',
    kpis:[{l:'Encours clients',v:kda(enc),s:`${open.length} factures ouvertes`},{l:'Échu et non réglé',v:kda(late),s:Math.round(late/Math.max(enc,1)*100)+' % de l’encours',dot:'var(--bad)',go:'balance'},{l:'Délai moyen d’encaissement',v:dso+' j',s:'Calculé sur 90 jours'},{l:'Encaissé sur 30 jours',v:kda(rec30),s:`${S.reglements().filter(r=>r.date>=addDays(TODAY,-30)).length} règlements`,go:'reglements'}],
    actions:`<button class="btn primary" id="btnReg">${ic('plus')} Enregistrer un règlement</button>`,
    tabs:[{id:'clients',label:'Clients',cnt:S.clients().length,render:el=>renderTable(el,clientCfg())},{id:'factures',label:'Factures',cnt:facs.length,render:el=>renderTable(el,factureCfg())},{id:'echeanciers',label:'Échéanciers',render:el=>renderTable(el,echeancierCfg())},{id:'reglements',label:'Règlements',cnt:S.reglements().length,render:el=>renderTable(el,reglementCfg())},{id:'balance',label:'Balance âgée',render:renderAging},{id:'relances',label:'Relances',cnt:S.relances().length,render:renderRelances}]});
  document.getElementById('btnReg').onclick = () => reglementForm();
}
const clientEnc = c => sum(D.factures.filter(f=>f.clientId===c.id),facReste);
const clientRetard = c => sum(D.factures.filter(f=>f.clientId===c.id&&f.echeance<TODAY),facReste);
function clientCfg(){
  return {id:'clients', noun:'les clients', rows:S.clients, onRow:openClient, facets:['segment','type','circuit'], add:()=>clientForm(), addLabel:'Nouveau client',
    columns:[{key:'code',label:'Code',render:r=>`<span class="mono">${r.code}</span>`},{key:'raison',label:'Client',strong:true},{key:'type',label:'Type',type:'enum',pill:false},{key:'segment',label:'Segment',type:'enum',get:r=>r.gros?'Vente en gros':'Détail',render:r=>pill(r.gros?'Vente en gros':'Détail',r.gros?'acc':'plain')},{key:'wilaya',label:'Wilaya',type:'enum',pill:false},{key:'commercial',label:'Commercial',type:'enum',pill:false,get:r=>empName(r.commercialId)},
      {key:'circuit',label:'Circuit',type:'enum',get:r=>r.assujettiTVA?'A':'B',render:r=>circ(r.assujettiTVA?'A':'B'),facetLabel:v=>v==='A'?'A · Soumis':'B · Non soumis'},{key:'delai',label:'Délai (j)',type:'num',hidden:true},{key:'plafond',label:'Plafond',type:'money'},
      {key:'encours',label:'Encours',type:'money',get:clientEnc,sum:true},{key:'retard',label:'Dont échu',type:'money',get:clientRetard,sum:true},
      {key:'util',label:'Plafond utilisé',type:'num',get:r=>Math.round(clientEnc(r)/r.plafond*100),render:r=>{const p=Math.round(clientEnc(r)/r.plafond*100);return `<span class="bar-cell">${p} %<i style="width:${Math.min(60,p*.6)}px;${p>90?'background:var(--bad)':p>70?'background:var(--warn)':''}"></i></span>`;}},
      {key:'nif',label:'NIF',hidden:true},{key:'tel',label:'Téléphone',hidden:true}],
    presets:[{name:'Plafond dépassé à 90 %',rules:[{key:'util',op:'gte',v:'90',v2:''}]},{name:'Retard > 200 000 DA',rules:[{key:'retard',op:'gt',v:'200000',v2:''}]},{name:'Grossistes et hôpitaux',match:'any',rules:[{key:'type',op:'in',v:'Grossiste répartiteur'},{key:'type',op:'in',v:'Hôpital public (EPH / CHU)'}]}]};
}
function openClient(c){
  const facs = D.factures.filter(f=>f.clientId===c.id).sort((a,b)=>b.date.localeCompare(a.date));
  const cmds = D.commandes.filter(x=>x.clientId===c.id && ['Expédiée','En livraison','Validée','Préparée'].includes(x.statut));
  openDrawer({eyebrow:`Client · ${esc(c.type)}`, title:esc(c.raison),
    body: sec('Encours', encoursBar(c)) + kv([['Code',`<span class="mono">${c.code}</span>`],['Wilaya',esc(c.wilaya)],['Commercial',esc(empName(c.commercialId))],['Téléphone',`<span class="mono">${esc(c.tel)}</span>`],['E-mail',esc(c.email)],['Circuit comptable',circ(c.assujettiTVA?'A':'B')],['NIF',c.nif?`<span class="mono">${c.nif}</span>`:''],['RC',c.rc?`<span class="mono">${esc(c.rc)}</span>`:''],['Article d’imposition',c.ai?`<span class="mono">${c.ai}</span>`:''],['Délai de paiement',c.delai?c.delai+' jours':'Comptant'],['Client depuis',fd(c.dateCreation)]])
      + sec('Factures ouvertes', miniTable(['Facture','Échéance','#Reste','Statut'], facs.filter(f=>facReste(f)>0).map(f=>[`<a href="#" data-fa="${f.id}" class="mono">${f.num}</a>`,fd(f.echeance),da(facReste(f)),pill(facStatut(f))])))
      + sec('Commandes en cours et livraisons', miniTable(['Commande','Statut','Livraison','#TTC'], cmds.map(x=>[`<span class="mono">${x.num}</span>`,pill(x.statut),x.statutLivraison?pill(x.statutLivraison):'—',da(x.ttc)])))
      + sec('Tickets SAV', miniTable(['Ticket','Date','Statut'], D.tickets.filter(t=>t.clientId===c.id).slice(0,5).map(t=>[`<span class="mono">${t.num}</span>`,fd(t.date),pill(t.statut)]))),
    ent:['clients',c], foot:`<button class="btn" data-nc style="margin-right:auto">${ic('plus')} Commande</button><button class="btn" data-rl>Envoyer une relance</button><button class="btn primary" data-rg>Enregistrer un règlement</button>`,
    onMount: d => {
      d.querySelectorAll('[data-fa]').forEach(a => a.onclick = e => { e.preventDefault(); openFacture(D.factures.find(f=>f.id===a.dataset.fa)); });
      d.querySelector('[data-nc]').onclick = () => { commandeForm(); setTimeout(()=>{ const s = document.getElementById('fld-clientId'); if (s) s.value = c.id; },40); };
      d.querySelector('[data-rg]').onclick = () => reglementForm(c.id);
      d.querySelector('[data-rl]').onclick = () => { const late = facs.filter(f=>facReste(f)>0 && f.echeance<TODAY); if (!late.length) { toast('Aucune facture échue pour ce client'); return; } late.forEach(f => D.relances.unshift({id:newId('RL'),date:TODAY,factureId:f.id,clientId:c.id,niveau:Math.min(3,D.relances.filter(r=>r.factureId===f.id).length+1),canal:'Email',statut:'Envoyée',montant:facReste(f)})); save(); toast(`${late.length} relance${late.length>1?'s':''} envoyée${late.length>1?'s':''} à ${c.email}`); };
    }});
}
function clientForm(c){
  const isNew = !c; c = c || {};
  openForm({eyebrow:'Clients', title:isNew?'Nouveau client':'Modifier le client', values:c, ent:isNew?null:['clients',c],
    fields:[{key:'raison',label:'Raison sociale / nom',required:true,full:true},{key:'type',label:'Type',type:'select',options:[...new Set(D.clients.map(x=>x.type))]},{key:'wilaya',label:'Wilaya',type:'select',options:[...new Set(D.clients.map(x=>x.wilaya))].sort()},
      {key:'commercialId',label:'Commercial',type:'select',options:D.employes.filter(e=>e.poste==='Commercial terrain'&&e.statut==='Actif').map(e=>[e.id,e.prenom+' '+e.nom])},{key:'tel',label:'Téléphone'},{key:'email',label:'E-mail'},
      {key:'adresse',label:'Adresse',full:true},{key:'nif',label:'NIF'},{key:'rc',label:'Registre du commerce'},{key:'plafond',label:'Plafond d’encours (DA)',type:'number',default:500000},{key:'delai',label:'Délai de paiement (jours)',type:'number',default:30},
      {key:'assujettiTVA',label:'Fiscalité',type:'checkbox',hint:'Assujetti à la TVA (circuit A)',default:true,full:true},{key:'gros',label:'Segment',type:'checkbox',hint:'Client de vente en gros (grossiste, hôpital, revendeur…)',full:true},{key:'bloque',label:'Blocage',type:'checkbox',hint:'Bloquer les nouvelles commandes de ce client',full:true}],
    onSave: v => { if (isNew) { const n = {id:newId('CL'),code:'CLI-'+String(D.clients.length+1).padStart(4,'0'),commune:v.wilaya,ai:'',dateCreation:TODAY,bloque:false,...v}; D.clients.unshift(n); toast(`Client ${n.code} créé`); } else { Object.assign(c,v); toast('Client mis à jour'); } save(); render(); }});
}
function factureCfg(){
  return {id:'factures', noun:'les factures', rows:S.factures, onRow:openFacture, add:()=>factureForm(), addLabel:'Nouvelle facture', facets:['statut','circuit'],
    columns:[{key:'num',label:'Facture',render:r=>`<span class="mono">${r.num}</span>`,strong:true},{key:'date',label:'Date',type:'date'},{key:'client',label:'Client',get:r=>cli(r.clientId).raison},{key:'commercial',label:'Commercial',type:'enum',pill:false,get:r=>empName(r.commercialId),hidden:true},
      {key:'circuit',label:'Circuit',type:'enum',render:r=>circ(r.circuit),facetLabel:v=>v==='A'?'A · Soumis':'B · Non soumis'},{key:'ht',label:'HT',type:'money',hidden:true,sum:true},{key:'ttc',label:'TTC',type:'money',sum:true},{key:'regle',label:'Réglé',type:'money',sum:true},{key:'reste',label:'Reste',type:'money',get:facReste,sum:true},
      {key:'echeance',label:'Échéance',type:'date'},{key:'jr',label:'Jours de retard',type:'num',get:joursRetard,render:r=>{const j=joursRetard(r);return j?`<b style="color:${j>60?'var(--bad)':'var(--warn)'}">${j}</b>`:'<span class="muted">—</span>';}},
      {key:'statut',label:'Statut',type:'enum',get:facStatut,facetOptions:['Non payée','Partielle','En retard','Payée']},{key:'ech',label:'Échéancier',type:'bool',get:r=>r.echeances.length>0,hidden:true},
      {key:'livraison',label:'Livraison',type:'enum',get:r=>ix().cmd.get(r.commandeId)?.statutLivraison||''}],
    presets:[{name:'Retard > 60 jours',rules:[{key:'jr',op:'gt',v:'60',v2:''}]},{name:'Reste > 100 000 DA',rules:[{key:'reste',op:'gt',v:'100000',v2:''}]},{name:'Échéance dans 30 jours',rules:[{key:'echeance',op:'next30'},{key:'reste',op:'gt',v:'0',v2:''}]},{name:'Impayées non livrées',rules:[{key:'reste',op:'gt',v:'0',v2:''},{key:'livraison',op:'nin',v:'Livré'}]}]};
}
function openFacture(f){
  const c = cli(f.clientId); const regs = D.reglements.filter(r=>r.factureId===f.id); const cmd = ix().cmd.get(f.commandeId);
  const ech = echAlloc(f);
  openDrawer({eyebrow:'Facture client', title:f.num, ent:['factures',f],
    body:`<div style="display:flex;gap:8px;flex-wrap:wrap">${pill(facStatut(f))} ${circ(f.circuit)}</div>`
      + kv([['Client',`<a href="#" data-c>${esc(c.raison)}</a>`],f.objet?['Objet',esc(f.objet)]:null,['Date',fd(f.date)],['Échéance',fd(f.echeance)],['Montant HT',da(f.ht)],['TVA',da(f.tva)],['Montant TTC',`<b>${da(f.ttc)}</b>`],['Réglé',da(f.regle)],['Reste à payer',`<b>${da(facReste(f))}</b>`],['Commande liée',cmd?`<a href="#" data-cmd class="mono">${cmd.num}</a> · ${pill(cmd.statut)}`:''],['Statut livraison',cmd?.statutLivraison?pill(cmd.statutLivraison):'']])
      + (ech.length ? sec('Échéancier de paiement', miniTable(['Échéance','#Montant','#Payé','État'], ech.map(e=>[fd(e.date),da(e.montant),da(e.paye),pill(e.etat)]))) : '')
      + sec('Règlements', miniTable(['N°','Date','Mode','#Montant'], regs.map(r=>[`<span class="mono">${r.num}</span>`,fd(r.date),esc(r.mode)+(r.reference?` <span class="muted mono">${esc(r.reference)}</span>`:''),da(r.montant)])))
      + sec('Relances', miniTable(['Date','Niveau','Canal'], D.relances.filter(r=>r.factureId===f.id).map(r=>[fd(r.date),'Niveau '+r.niveau,esc(r.canal)]))),
    foot: facReste(f)>0 ? `<button class="btn primary" data-rg>Enregistrer un règlement</button>` : '',
    onMount: d => { d.querySelector('[data-c]').onclick = e => { e.preventDefault(); openClient(c); }; const cm = d.querySelector('[data-cmd]'); if (cm) cm.onclick = e => { e.preventDefault(); openCommande(cmd); }; const rg = d.querySelector('[data-rg]'); if (rg) rg.onclick = () => reglementForm(c.id, f.id); }});
}
function echAlloc(f){ let paid = f.regle; return f.echeances.map(e => { const p = Math.min(paid, e.montant); paid -= p; return {...e, paye:p, etat: p>=e.montant?'Payée':e.date<TODAY?'Échu':p>0?'Partielle':e.date<=addDays(TODAY,30)?'À échéance':'À venir'}; }); }
function echeancierCfg(){
  const rows = []; S.factures().forEach(f => echAlloc(f).forEach((e,i,arr) => rows.push({id:f.id+'-'+i,f,n:`${i+1}/${arr.length}`,...e})));
  return {id:'echeanciers', noun:'les échéances', rows:()=>rows, onRow:r=>openFacture(r.f), facets:['etat'],
    columns:[{key:'date',label:'Échéance',type:'date'},{key:'facture',label:'Facture',get:r=>r.f.num,render:r=>`<span class="mono">${r.f.num}</span>`},{key:'n',label:'Versement'},{key:'client',label:'Client',get:r=>cli(r.f.clientId).raison,strong:true},{key:'montant',label:'Montant',type:'money',sum:true},{key:'paye',label:'Payé',type:'money',sum:true},{key:'reste',label:'Reste',type:'money',get:r=>r.montant-r.paye,sum:true},{key:'etat',label:'État',type:'enum',facetOptions:['Échu','À échéance','Partielle','À venir','Payée']}],
    presets:[{name:'Échues non payées',facets:{etat:['Échu']}},{name:'Ce mois-ci',rules:[{key:'date',op:'thismonth'}]}]};
}
function reglementCfg(){
  return {id:'reglements', noun:'les règlements', rows:S.reglements, onRow:r=>openFacture(ix().fac.get(r.factureId)), facets:['mode'], add:()=>reglementForm(), addLabel:'Nouveau règlement',
    columns:[{key:'num',label:'N°',render:r=>`<span class="mono">${r.num}</span>`},{key:'date',label:'Date',type:'date'},{key:'client',label:'Client',get:r=>cli(r.clientId).raison,strong:true},{key:'facture',label:'Facture',get:r=>ix().fac.get(r.factureId)?.num,render:r=>`<span class="mono">${ix().fac.get(r.factureId)?.num||''}</span>`},{key:'mode',label:'Mode',type:'enum',pill:false},{key:'reference',label:'Référence',render:r=>`<span class="mono">${esc(r.reference)}</span>`},{key:'banque',label:'Banque',type:'enum',pill:false},{key:'montant',label:'Montant',type:'money',sum:true}],
    presets:[{name:'Chèques du mois',rules:[{key:'mode',op:'in',v:'Chèque'},{key:'date',op:'thismonth'}]},{name:'Espèces > 200 000 DA',rules:[{key:'mode',op:'in',v:'Espèces'},{key:'montant',op:'gt',v:'200000',v2:''}]}]};
}
function reglementForm(clientId, factureId){
  const open = S.factures().filter(f=>facReste(f)>0 && (!clientId || f.clientId===clientId)).sort((a,b)=>a.echeance.localeCompare(b.echeance));
  if (!open.length) { toast('Aucune facture ouverte'); return; }
  const first = factureId ? ix().fac.get(factureId) : open[0];
  openForm({eyebrow:'Créances', title:'Enregistrer un règlement', submitLabel:'Enregistrer',
    fields:[{key:'factureId',label:'Facture',type:'select',options:open.map(f=>[f.id,`${f.num} · ${cli(f.clientId).raison} · reste ${da(facReste(f))}`]),full:true},{key:'montant',label:'Montant (DA)',type:'number',required:true,min:1},{key:'date',label:'Date',type:'date',default:TODAY},
      {key:'mode',label:'Mode de paiement',type:'select',options:['Virement','Chèque','Espèces','Traite']},{key:'reference',label:'N° chèque / référence'},{key:'banque',label:'Banque du tireur',type:'select',allowEmpty:true,options:['BNA','CPA','BEA','BADR','BDL','CNEP','AGB','Société Générale Algérie']},{key:'compteId',label:'Compte de dépôt',type:'select',options:D.comptes.map(c=>[c.id,c.libelle])}],
    values:{factureId:first.id, montant:facReste(first)},
    onSave: v => {
      const f = ix().fac.get(v.factureId); const m = Math.min(+v.montant, facReste(f)); if (m<=0) return 'Montant invalide.';
      const r = {id:newId('R'),num:nextNum(D.reglements,'num','RG'),date:v.date,factureId:f.id,clientId:f.clientId,montant:m,mode:v.mode,reference:v.reference,banque:v.banque};
      D.reglements.unshift(r); f.regle += m;
      if (v.mode==='Chèque') D.cheques.unshift({id:newId('CH'),num:v.reference||String(Math.floor(Math.random()*9e6+1e6)),sens:'Reçu',tiers:cli(f.clientId).raison,tiersId:f.clientId,banque:v.banque||'BNA',montant:m,dateEmission:v.date,dateEcheance:v.date,statut:'En portefeuille',compteId:v.compteId,reglementId:r.id,dateRemise:'',motifRejet:''});
      else D.tresorerie.unshift({id:newId('TR'),date:v.date,compteId:v.mode==='Espèces'?'CA1':v.compteId,sens:'Encaissement',categorie:'Règlement client',montant:m,libelle:`${r.num} — ${cli(f.clientId).raison}`,reference:r.num,rapproche:false});
      const acc = v.mode==='Chèque' ? '511000' : v.mode==='Espèces' ? '530000' : ix().cpt.get(v.compteId).compteCompta;
      D.ecritures.unshift({id:newId('EC'),num:nextNum(D.ecritures,'num',(v.mode==='Espèces'?'CAI':'BQ')+'-'),date:v.date,journal:v.mode==='Espèces'?'CAI':'BQ',libelle:`Règlement ${r.num} (${v.mode})`,circuit:f.circuit,lignes:[[acc,m,0],['411000',0,m]],origine:'Créances',reference:r.num,statut:'Brouillard'});
      save(); toast(`Règlement de ${da(m)} rapproché avec ${f.num}${v.mode==='Chèque'?' · chèque ajouté au portefeuille':''}`); render();
    }});
}
function renderAging(el){
  const rows = S.clients().map(c => { const o = {id:c.id,c,nonEchu:0,b30:0,b60:0,b90:0,b90p:0}; D.factures.filter(f=>f.clientId===c.id&&facReste(f)>0).forEach(f => { const j = joursRetard(f), r = facReste(f); if (j<=0) o.nonEchu+=r; else if (j<=30) o.b30+=r; else if (j<=60) o.b60+=r; else if (j<=90) o.b90+=r; else o.b90p+=r; }); o.total = o.nonEchu+o.b30+o.b60+o.b90+o.b90p; return o; }).filter(o=>o.total>0);
  el.innerHTML = `<div class="panel" style="margin-bottom:14px"><div class="panel-h"><h3>Répartition de l’encours par ancienneté</h3><span class="sub">Priorisez les recouvrements sur les tranches les plus anciennes</span></div><div class="chart-box sm"><canvas id="cAg2" role="img" aria-label="Balance âgée"></canvas></div></div><div id="agT"></div>`;
  const tot = k => sum(rows,r=>r[k]);
  chart('cAg2',{type:'bar',indexAxis:'y',data:{labels:['Non échu','1–30 jours','31–60 jours','61–90 jours','Plus de 90 jours'],datasets:[{data:['nonEchu','b30','b60','b90','b90p'].map(tot),backgroundColor:[SER()[0],SER()[3],SER()[3],SER()[1],SER()[1]],borderRadius:4,maxBarThickness:22}]}});
  renderTable(document.getElementById('agT'), {id:'aging', noun:'les clients', rows:()=>rows, onRow:r=>openClient(r.c), facets:['type'],
    columns:[{key:'client',label:'Client',get:r=>r.c.raison,strong:true},{key:'type',label:'Type',type:'enum',pill:false,get:r=>r.c.type},{key:'commercial',label:'Commercial',type:'enum',pill:false,get:r=>empName(r.c.commercialId),hidden:true},{key:'nonEchu',label:'Non échu',type:'money',sum:true},{key:'b30',label:'1–30 j',type:'money',sum:true},{key:'b60',label:'31–60 j',type:'money',sum:true},{key:'b90',label:'61–90 j',type:'money',sum:true},{key:'b90p',label:'> 90 j',type:'money',sum:true,render:r=>r.b90p?`<b style="color:var(--bad)">${da(r.b90p)}</b>`:'<span class="muted">—</span>'},{key:'total',label:'Total',type:'money',sum:true,strong:true}],
    presets:[{name:'Créances > 90 jours',rules:[{key:'b90p',op:'gt',v:'0',v2:''}]},{name:'Encours > 1 M DA',rules:[{key:'total',op:'gt',v:'1000000',v2:''}]}]});
}
function renderRelances(el){
  el.innerHTML = `<div class="callout" style="margin-bottom:14px;align-items:center;flex-wrap:wrap"><div style="flex:1;min-width:240px"><b>Règles de relance automatique</b><div class="muted" style="font-size:12.5px">Niveau 1 par e-mail à J+3 après l’échéance, niveau 2 par SMS et e-mail à J+30, niveau 3 par courrier recommandé à J+60.</div></div><button class="btn primary" id="runRel">${ic('play')} Lancer les relances du jour</button></div><div id="relT"></div>`;
  document.getElementById('runRel').onclick = () => {
    let n = 0;
    S.factures().filter(f=>facReste(f)>0&&f.echeance<TODAY).forEach(f => { const j = joursRetard(f); const lvl = j>=60?3:j>=30?2:j>=3?1:0; const done = D.relances.filter(r=>r.factureId===f.id).reduce((m,r)=>Math.max(m,r.niveau),0); if (lvl>done) { D.relances.unshift({id:newId('RL'),date:TODAY,factureId:f.id,clientId:f.clientId,niveau:lvl,canal:['','Email','SMS + Email','Courrier recommandé'][lvl],statut:'Envoyée',montant:facReste(f)}); n++; } });
    save(); toast(n ? `${n} relance${n>1?'s':''} générée${n>1?'s':''}` : 'Toutes les relances sont à jour'); render();
  };
  renderTable(document.getElementById('relT'), {id:'relances', noun:'les relances', rows:S.relances, onRow:r=>openFacture(ix().fac.get(r.factureId)), add:()=>relanceForm(), addLabel:'Nouvelle relance', facets:['niveau','canal','statut'],
    columns:[{key:'date',label:'Date',type:'date'},{key:'client',label:'Client',get:r=>cli(r.clientId).raison,strong:true},{key:'facture',label:'Facture',get:r=>ix().fac.get(r.factureId)?.num,render:r=>`<span class="mono">${ix().fac.get(r.factureId)?.num}</span>`},{key:'niveau',label:'Niveau',type:'enum',get:r=>'Niveau '+r.niveau,render:r=>pill('Niveau '+r.niveau,['','info','warn','bad'][r.niveau])},{key:'canal',label:'Canal',type:'enum',pill:false},{key:'montant',label:'Montant relancé',type:'money'},{key:'statut',label:'Statut',type:'enum'}]});
}
