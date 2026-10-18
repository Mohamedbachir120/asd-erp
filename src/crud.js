/* ================= ASD — création, modification, suppression pour chaque module =================
   CRUD[idTable] décrit une entité : liste source, formulaire d’édition, duplication, règles de suppression.
   renderTable, openDrawer et openForm lisent ce registre pour afficher les actions. */
const userLabel = () => PROFILES[UI.profile].label;
const artOptions = (price) => D.articles.slice().sort((x,y)=>x.designation.localeCompare(y.designation,'fr')).map(a=>[a.id,`${a.designation} · ${a.ref} · ${da(price(a))}`]);
const depotOptions = () => D.depots.map(d=>[d.id,d.nom]);
const BANQUES = ['BNA','CPA','BEA','BADR','BDL','CNEP','AGB','Société Générale Algérie','Algérie Poste'];
function linesTotals(lignes, circuit){ const ht = Math.round(sum(lignes,l=>l.qte*l.pu*(1-(l.remise||0)/100))); const tva = circuit==='A' ? Math.round(ht*.19) : 0; return {ht, tva, ttc:ht+tva}; }
const reopen = (fn, x) => setTimeout(()=>fn(x), 260);

/* ---------- Ventes : commandes clients ---------- */
function commandeForm(c, dup){
  const isNew = !c || dup; const src = c || {};
  const clients = S.clients().slice().sort((a,b)=>a.raison.localeCompare(b.raison,'fr'));
  openForm({eyebrow:'Ventes', title: !c ? 'Nouvelle commande client' : dup ? `Dupliquer ${src.num}` : `Modifier ${src.num}`, submitLabel: isNew?'Créer la commande':'Enregistrer',
    ent: isNew ? null : ['commandes', c],
    fields:[
      {key:'clientId',label:'Client',type:'select',options:clients.map(x=>[x.id,`${x.raison} · ${x.wilaya}${x.gros?' · gros':''}`]),required:true,full:true},
      {key:'depotId',label:'Dépôt d’expédition',type:'select',options:depotOptions()},
      {key:'date',label:'Date de commande',type:'date',default:TODAY,required:true},
      {key:'dateLivraisonPrevue',label:'Livraison prévue',type:'date',default:addDays(TODAY,3)},
      {key:'adresse',label:'Adresse de livraison',placeholder:'Laisser vide pour la wilaya du client'},
      {key:'lignes',label:'Lignes de commande',type:'lines',remise:true,required:true,priceOf:id=>art(id).prixVente,options:artOptions(a=>a.prixVente),help:'Le prix proposé est le prix de vente HT de l’article. Les clients en gros commandent par cartons ou palettes : ajustez quantités et remises.'},
      {key:'notes',label:'Instructions de livraison',type:'textarea',full:true},
      {key:'force',label:'Dépassement de plafond',type:'checkbox',hint:'Autoriser si l’encours dépasse le plafond du client',full:true}],
    values: !c ? {} : {...src, date: dup?TODAY:src.date, dateLivraisonPrevue: dup?addDays(TODAY,3):src.dateLivraisonPrevue, lignes: src.lignes.map(l=>({...l}))},
    onSave: v => {
      const cl = cli(v.clientId); const circuit = cl.assujettiTVA?'A':'B'; const t = linesTotals(v.lignes, circuit);
      if (v.dateLivraisonPrevue && v.dateLivraisonPrevue < v.date) return 'La livraison prévue ne peut pas précéder la date de commande.';
      const enc = sum(D.factures.filter(f=>f.clientId===cl.id), facReste);
      if (cl.bloque) return `${cl.raison} est bloqué : débloquez-le dans sa fiche client pour passer commande.`;
      if (enc + t.ttc > cl.plafond && !v.force && (isNew || t.ttc > c.ttc)) return `Encours actuel ${da(enc)} + cette commande ${da(t.ttc)} dépasse le plafond de ${da(cl.plafond)}. Cochez « Autoriser » pour forcer.`;
      const data = {clientId:cl.id, commercialId:cl.commercialId, depotId:v.depotId, date:v.date, dateLivraisonPrevue:v.dateLivraisonPrevue||addDays(v.date,3), adresse:v.adresse||cl.wilaya, notes:v.notes, lignes:v.lignes, montantHT:t.ht, tva:t.tva, ttc:t.ttc, circuit};
      let x;
      if (isNew) { x = {id:newId('CM'),num:nextNum(D.commandes,'num','BC'),statut:'Brouillon',livreurId:null,dateLivraison:'',statutLivraison:'',tournee:'',...data}; D.commandes.unshift(x); toast(`Commande ${x.num} créée · ${da(t.ttc)} TTC (circuit ${circuit})`); }
      else { x = c; Object.assign(c, data); toast(`Commande ${c.num} mise à jour`); }
      save(); render(); reopen(openCommande, x);
    }});
}
function newCommandeForm(){ commandeForm(); }

/* ---------- Stock ---------- */
function lotForm(l){
  const isNew = !l; l = l || {};
  const per = D.articles.filter(a=>a.perissable).sort((x,y)=>x.designation.localeCompare(y.designation,'fr'));
  openForm({eyebrow:'Stock · lots', title:isNew?'Nouveau lot':`Lot ${l.lot}`, submitLabel:isNew?'Réceptionner le lot':'Enregistrer', ent:isNew?null:['lots',l],
    fields:[
      {key:'articleId',label:'Produit',type:'select',options:per.map(a=>[a.id,`${a.designation} · ${a.ref}`]),full:true,required:true},
      {key:'depotId',label:'Dépôt',type:'select',options:depotOptions()},
      {key:'lot',label:'N° de lot',required:true,placeholder:'Ex. CI27-4581'},
      {key:'qte',label:'Quantité',type:'number',min:0,required:true,help:isNew?'Ajoutée au stock du dépôt.':'Un écart avec la quantité actuelle génère un ajustement de stock.'},
      {key:'fabrication',label:'Date de fabrication',type:'date',default:TODAY},
      {key:'peremption',label:'Date de péremption',type:'date',required:true,default:addMonths(TODAY,24)}],
    values:l,
    onSave: v => {
      if (v.peremption <= v.fabrication) return 'La péremption doit être postérieure à la fabrication.';
      const a = art(v.articleId); const q = +v.qte;
      if (isNew) {
        if (q<=0) return 'Indiquez une quantité positive.';
        const old = qtyTot(a); a.stocks[v.depotId] = (a.stocks[v.depotId]||0)+q; if (a.methode==='CMUP') a.cmup = Math.round((old*a.cmup + q*a.prixAchat)/(old+q));
        D.lots ||= []; const n = {id:newId('L'),...v,qte:q}; D.lots.unshift(n);
        D.mouvements.unshift({id:newId('M'),date:TODAY,type:'Entrée',articleId:a.id,depotId:v.depotId,depotDestId:'',qte:q,coutUnitaire:a.cmup,reference:`LOT-${v.lot}`,motif:'Réception de lot',utilisateur:userLabel()});
        toast(`Lot ${v.lot} réceptionné : ${num(q)} ${a.unite.toLowerCase()}(s) au ${dep(v.depotId).nom}`);
      } else {
        const diff = q - l.qte; if (v.articleId!==l.articleId || v.depotId!==l.depotId) return 'Pour changer de produit ou de dépôt, faites un transfert ou créez un nouveau lot.';
        if (diff) { a.stocks[l.depotId] = Math.max(0,(a.stocks[l.depotId]||0)+diff); D.mouvements.unshift({id:newId('M'),date:TODAY,type:'Ajustement',articleId:a.id,depotId:l.depotId,depotDestId:'',qte:diff,coutUnitaire:a.cmup,reference:`LOT-${v.lot}`,motif:'Correction de lot',utilisateur:userLabel()}); }
        Object.assign(l, {lot:v.lot, fabrication:v.fabrication, peremption:v.peremption, qte:q}); toast(`Lot ${l.lot} mis à jour${diff?` · ajustement de ${diff>0?'+':''}${num(diff)}`:''}`);
      }
      save(); render();
    }});
}
function mvtEditForm(m){
  openForm({eyebrow:'Stock · mouvement', title:`Mouvement ${m.reference}`, ent:['mouvements',m],
    fields:[{key:'date',label:'Date',type:'date',required:true},{key:'reference',label:'Document de référence',required:true},{key:'motif',label:'Motif',full:true},
      {key:'info',label:'Quantité',readonly:true,full:true,help:'Pour corriger une quantité, supprimez ce mouvement (le stock est recalculé) puis saisissez-le à nouveau.'}],
    values:{...m, info:`${m.type} · ${num(m.qte)} × ${art(m.articleId).designation}`},
    onSave: v => { Object.assign(m, {date:v.date, reference:v.reference, motif:v.motif}); save(); toast('Mouvement mis à jour'); render(); }});
}
function reverseMvt(m){
  const a = ix().art.get(m.articleId); if (!a) return; const s = a.stocks;
  if (m.type==='Entrée' || m.type==='Ajustement') s[m.depotId] = Math.max(0,(s[m.depotId]||0)-m.qte);
  else if (m.type==='Sortie') s[m.depotId] = (s[m.depotId]||0)+m.qte;
  else if (m.type==='Transfert') { s[m.depotId] = (s[m.depotId]||0)+m.qte; s[m.depotDestId] = Math.max(0,(s[m.depotDestId]||0)-m.qte); }
}
function invForm(i){
  const isNew = !i; i = i || {};
  const mag = D.employes.filter(e=>e.statut==='Actif' && ['Logistique','Magasin'].some(k=>(e.departement||'').includes(k)) || e.poste==='Chef magasinier');
  openForm({eyebrow:'Stock · inventaire', title:isNew?'Lancer un inventaire':`Inventaire ${i.num}`, submitLabel:isNew?'Lancer':'Enregistrer', ent:isNew?null:['inventaires',i],
    fields:[{key:'depotId',label:'Dépôt',type:'select',options:depotOptions()},{key:'type',label:'Type',type:'select',options:['Tournant','Complet']},
      {key:'date',label:'Date',type:'date',default:TODAY,required:true},{key:'responsable',label:'Responsable',type:'select',options:(mag.length?mag:actifs()).map(e=>[e.id,`${e.prenom} ${e.nom} · ${e.poste}`])},
      {key:'articlesComptes',label:'Articles comptés',type:'number',min:0,default:0},{key:'ecarts',label:'Écarts détectés',type:'number',min:0,default:0},
      {key:'valeurEcart',label:'Valeur des écarts (DA)',type:'number',default:0},{key:'statut',label:'Statut',type:'select',options:['En cours','Validé']}],
    values:i,
    onSave: v => { const data = {...v, articlesComptes:+v.articlesComptes||0, ecarts:+v.ecarts||0, valeurEcart:+v.valeurEcart||0};
      if (isNew) { const n = {id:newId('I'),num:nextNum(D.inventaires,'num','INV-',3),...data}; D.inventaires.unshift(n); toast(`Inventaire ${n.num} lancé au ${dep(n.depotId).nom}`); }
      else { Object.assign(i, data); toast(`Inventaire ${i.num} mis à jour`); }
      save(); render(); }});
}
function depotForm(d){
  const isNew = !d; d = d || {};
  openForm({eyebrow:'Stock · dépôts', title:isNew?'Nouveau dépôt':`Modifier ${d.nom}`, ent:isNew?null:['depots',d],
    fields:[{key:'nom',label:'Nom',required:true,full:true,placeholder:'Dépôt de Constantine'},{key:'code',label:'Code court',required:true,placeholder:'CST'},{key:'wilaya',label:'Wilaya',required:true},{key:'adresse',label:'Adresse',full:true}],
    values:d,
    onSave: v => { v.code = v.code.toUpperCase(); if (D.depots.some(x=>x!==d && x.code===v.code)) return `Le code ${v.code} est déjà utilisé.`;
      if (isNew) { const n = {id:newId('DEP'),...v}; D.depots.push(n); D.articles.forEach(a=>a.stocks[n.id]=0); toast(`${n.nom} créé`); }
      else { Object.assign(d, v); toast('Dépôt mis à jour'); }
      save(); render(); }});
}

/* ---------- Achats ---------- */
function achatForm(b, dup){
  const isNew = !b || dup; const src = b || {};
  openForm({eyebrow:'Achats', title: !b ? 'Nouvelle commande fournisseur' : dup ? `Dupliquer ${src.num}` : `Modifier ${src.num}`, submitLabel:isNew?'Créer la commande':'Enregistrer', ent:isNew?null:['achats',b],
    fields:[{key:'fournisseurId',label:'Fournisseur',type:'select',options:D.fournisseurs.map(f=>[f.id,`${f.raison} · ${f.pays}`]),full:true,required:true},
      {key:'depotId',label:'Dépôt de réception',type:'select',options:depotOptions()},{key:'date',label:'Date',type:'date',default:TODAY,required:true},
      {key:'dateLivraisonPrevue',label:'Livraison prévue',type:'date',help:'Vide : 7 jours pour un fournisseur local, 40 jours à l’import.'},
      {key:'lignes',label:'Articles commandés',type:'lines',required:true,priceOf:id=>art(id).prixAchat,options:artOptions(a=>a.prixAchat)},
      {key:'notes',label:'Notes pour le fournisseur',type:'textarea',full:true}],
    values: !b ? {} : {...src, date:dup?TODAY:src.date, dateLivraisonPrevue:dup?'':src.dateLivraisonPrevue, lignes:src.lignes.map(l=>({...l}))},
    onSave: v => {
      const f = frs(v.fournisseurId); const t = linesTotals(v.lignes, 'A'); const prev = v.dateLivraisonPrevue || addDays(v.date, f.pays==='Algérie'?7:40);
      const data = {fournisseurId:f.id, depotId:v.depotId, date:v.date, dateLivraisonPrevue:prev, notes:v.notes, lignes:v.lignes.map(l=>({articleId:l.articleId,qte:l.qte,pu:l.pu,qteRecue:0})), montantHT:t.ht, tva:t.tva, ttc:t.ttc, echeance:addDays(prev, f.delaiPaiement)};
      let x;
      if (isNew) { x = {id:newId('BC'),num:nextNum(D.achats,'num','BCF',4),statut:'Créée',dateLivraison:'',bl:'',factureFrs:'',rapprochement:'En attente',paye:0,...data}; D.achats.unshift(x); toast(`${x.num} créée chez ${f.raison} · ${da(t.ttc)} TTC`); }
      else { x = b; Object.assign(b, data); toast(`${b.num} mise à jour`); }
      save(); render(); reopen(openAchat, x);
    }});
}

/* ---------- Créances ---------- */
function factureForm(f){
  const isNew = !f; f = f || {};
  const clients = S.clients().slice().sort((a,b)=>a.raison.localeCompare(b.raison,'fr'));
  const manual = isNew || !f.commandeId;
  openForm({eyebrow:'Créances', title:isNew?'Nouvelle facture':`Modifier ${f.num}`, submitLabel:isNew?'Émettre la facture':'Enregistrer', ent:isNew?null:['factures',f],
    fields:[
      ...(isNew ? [{key:'clientId',label:'Client',type:'select',options:clients.map(c=>[c.id,`${c.raison} · ${c.assujettiTVA?'circuit A':'circuit B'}`]),full:true,required:true}] : [{key:'clientTxt',label:'Client',readonly:true,full:true}]),
      {key:'date',label:'Date de facture',type:'date',default:TODAY,required:true},
      {key:'delai',label:'Délai de paiement (jours)',type:'number',min:0,default:30,help:'L’échéance est calculée à partir de la date.'},
      ...(manual ? [{key:'objet',label:'Objet',full:true,placeholder:'Prestation d’installation, maintenance annuelle, refacturation…',required:isNew},{key:'ht',label:'Montant HT (DA)',type:'number',min:1,required:true}] : [{key:'htTxt',label:'Montant HT (repris de la commande)',readonly:true}]),
      {key:'nbEch',label:'Paiement en plusieurs fois',type:'select',options:[['1','Une seule échéance'],['2','2 versements'],['3','3 versements'],['4','4 versements'],['6','6 versements']]}],
    values: isNew ? {} : {...f, clientTxt:cli(f.clientId).raison, delai:daysBetween(f.date,f.echeances.length?f.echeances[0].date:f.echeance), htTxt:da(f.ht), nbEch:String(Math.max(1,f.echeances.length))},
    onSave: v => {
      const c = cli(isNew ? v.clientId : f.clientId); const circuit = c.assujettiTVA?'A':'B';
      const ht = manual ? +v.ht : f.ht; const tva = circuit==='A' ? Math.round(ht*.19) : 0; const ttc = ht+tva;
      if (!isNew && ttc < f.regle) return `Le nouveau total TTC (${da(ttc)}) est inférieur au montant déjà réglé (${da(f.regle)}).`;
      const n = +v.nbEch||1; const d = +v.delai||0; const ech = [];
      if (n>1) { const part = Math.round(ttc/n); for (let k=0;k<n;k++) ech.push({date:addDays(v.date, d + 30*k), montant: k<n-1?part:ttc-part*(n-1)}); }
      const data = {date:v.date, ht, tva, ttc, circuit, echeances:ech, echeance: ech.length ? ech[ech.length-1].date : addDays(v.date, d), objet: manual ? v.objet : f.objet};
      let x;
      if (isNew) {
        x = {id:newId('FA'),num:nextNum(D.factures,'num','FA'),commandeId:'',clientId:c.id,commercialId:c.commercialId,regle:0,...data}; D.factures.unshift(x);
        const l = [['411000',ttc,0],['700000',0,ht]]; if (tva) l.push(['445700',0,tva]);
        D.ecritures.unshift({id:newId('EC'),num:nextNum(D.ecritures,'num','VTE-'),date:v.date,journal:'VTE',libelle:`Facture ${x.num} — ${c.raison}`,circuit,lignes:l,origine:'Créances',reference:x.num,statut:'Brouillard'});
        toast(`Facture ${x.num} émise · ${da(ttc)} TTC, écriture passée au circuit ${circuit}`);
      } else {
        x = f; Object.assign(f, data);
        const e = D.ecritures.find(e=>e.reference===f.num && e.journal==='VTE' && e.statut==='Brouillard'); if (e) { e.date = f.date; e.lignes = [['411000',ttc,0],['700000',0,ht]].concat(tva?[['445700',0,tva]]:[]); }
        toast(`Facture ${f.num} mise à jour`);
      }
      save(); render(); reopen(openFacture, x);
    }});
}
function reglementEditForm(r){
  const f = ix().fac.get(r.factureId); const max = f ? facReste(f) + r.montant : r.montant;
  openForm({eyebrow:'Créances', title:`Règlement ${r.num}`, ent:['reglements',r],
    fields:[{key:'factureTxt',label:'Facture',readonly:true,full:true},{key:'montant',label:'Montant (DA)',type:'number',min:1,required:true,help:`Maximum ${da(max)} (reste dû de la facture).`},{key:'date',label:'Date',type:'date',required:true},
      {key:'mode',label:'Mode de paiement',type:'select',options:['Virement','Chèque','Espèces','Traite']},{key:'reference',label:'N° chèque / référence'},{key:'banque',label:'Banque du tireur',type:'select',allowEmpty:true,options:BANQUES}],
    values:{...r, factureTxt: f ? `${f.num} · ${cli(f.clientId).raison}` : '—'},
    onSave: v => {
      const m = +v.montant; if (m > max) return `Le montant dépasse le reste dû (${da(max)}).`;
      if (v.mode!==r.mode && (v.mode==='Chèque' || r.mode==='Chèque')) return 'Pour passer d’un chèque à un autre mode, supprimez ce règlement puis saisissez-le à nouveau.';
      const delta = m - r.montant; if (f) f.regle = Math.max(0, f.regle + delta);
      Object.assign(r, {montant:m, date:v.date, mode:v.mode, reference:v.reference, banque:v.banque});
      D.tresorerie.filter(t=>t.reference===r.num).forEach(t => { t.montant = m; t.date = v.date; });
      D.cheques.filter(c=>c.reglementId===r.id).forEach(c => { c.montant = m; c.num = v.reference || c.num; c.banque = v.banque || c.banque; });
      D.ecritures.filter(e=>e.reference===r.num && e.statut==='Brouillard').forEach(e => { e.date = v.date; e.lignes = e.lignes.map(l => [l[0], l[1]?m:0, l[2]?m:0]); });
      save(); toast(`Règlement ${r.num} mis à jour`); render();
    }});
}
function relanceForm(rl){
  const isNew = !rl; rl = rl || {};
  const late = S.factures().filter(f=>facReste(f)>0 && f.echeance<TODAY).sort((a,b)=>a.echeance.localeCompare(b.echeance));
  if (isNew && !late.length) { toast('Aucune facture échue à relancer'); return; }
  openForm({eyebrow:'Créances · relances', title:isNew?'Nouvelle relance':'Modifier la relance', submitLabel:isNew?'Envoyer la relance':'Enregistrer', ent:isNew?null:['relances',rl],
    fields:[
      ...(isNew ? [{key:'factureId',label:'Facture échue',type:'select',options:late.map(f=>[f.id,`${f.num} · ${cli(f.clientId).raison} · ${joursRetard(f)} j de retard · ${da(facReste(f))}`]),full:true}] : []),
      {key:'niveau',label:'Niveau',type:'select',options:[['1','Niveau 1 · rappel amiable'],['2','Niveau 2 · relance ferme'],['3','Niveau 3 · mise en demeure']]},
      {key:'canal',label:'Canal',type:'select',options:['Email','SMS + Email','Téléphone','Courrier recommandé']},
      {key:'date',label:'Date',type:'date',default:TODAY},{key:'statut',label:'Statut',type:'select',options:['Envoyée','Planifiée','Promesse de paiement']},
      {key:'note',label:'Note',type:'textarea',full:true,placeholder:'Engagement du client, interlocuteur…'}],
    values:{...rl, niveau:String(rl.niveau||1)},
    onSave: v => { const data = {niveau:+v.niveau, canal:v.canal, date:v.date, statut:v.statut, note:v.note};
      if (isNew) { const f = ix().fac.get(v.factureId); D.relances.unshift({id:newId('RL'),factureId:f.id,clientId:f.clientId,montant:facReste(f),...data}); toast(`Relance niveau ${v.niveau} envoyée à ${cli(f.clientId).raison}`); }
      else { Object.assign(rl, data); toast('Relance mise à jour'); }
      save(); render(); }});
}

/* ---------- Trésorerie ---------- */
function tresoForm(t){
  const isNew = !t || !t.id; t = t && t.id ? t : {};
  openForm({eyebrow:'Trésorerie', title:isNew?'Nouvelle opération':'Modifier l’opération', submitLabel:'Enregistrer', ent:isNew?null:['treso',t],
    fields:[{key:'compteId',label:'Compte',type:'select',options:D.comptes.map(c=>[c.id,c.libelle]),full:true},{key:'sens',label:'Sens',type:'select',options:['Décaissement','Encaissement']},{key:'date',label:'Date',type:'date',default:TODAY,required:true},
      {key:'categorie',label:'Catégorie',type:'select',options:[...new Set(D.tresorerie.map(x=>x.categorie))].sort()},{key:'montant',label:'Montant (DA)',type:'number',required:true,min:1},{key:'libelle',label:'Libellé',required:true,full:true},{key:'reference',label:'Référence'}],
    values:t,
    onSave: v => { const data = {...v, montant:+v.montant};
      if (isNew) D.tresorerie.unshift({id:newId('TR'),...data,rapproche:false}); else Object.assign(t, data);
      save(); const c = ix().cpt.get(v.compteId); const s = compteSolde(c); toast(s<c.seuil?`Attention : ${c.libelle.split(' — ')[0]} passe sous son seuil critique (${da(s)})`:isNew?'Opération enregistrée':'Opération mise à jour'); render(); }});
}
function compteForm(c){
  const isNew = !c; c = c || {};
  openForm({eyebrow:'Trésorerie · comptes', title:isNew?'Nouveau compte':`Modifier ${c.libelle.split(' — ')[0]}`, ent:isNew?null:['comptes',c],
    fields:[{key:'libelle',label:'Intitulé',required:true,full:true,placeholder:'BADR — Agence Blida'},{key:'type',label:'Type',type:'select',options:['Banque','CCP','Caisse']},{key:'banque',label:'Établissement',type:'select',options:[...BANQUES,'—']},
      {key:'rib',label:'RIB',full:true},{key:'compteCompta',label:'Compte comptable',type:'select',options:D.planComptable.filter(a=>a.classe===5).map(a=>[a.numero,`${a.numero} — ${a.libelle}`])},
      {key:'soldeInitial',label:'Solde d’ouverture (DA)',type:'number',default:0},{key:'seuil',label:'Seuil d’alerte (DA)',type:'number',default:0,min:0}],
    values:c,
    onSave: v => { const data = {...v, soldeInitial:+v.soldeInitial||0, seuil:+v.seuil||0};
      if (isNew) { D.comptes.push({id:newId('CPT'),...data}); toast(`Compte ${v.libelle.split(' — ')[0]} ouvert`); } else { Object.assign(c, data); toast('Compte mis à jour'); }
      save(); render(); }});
}
function chequeForm(ch){
  const isNew = !ch; ch = ch || {};
  openForm({eyebrow:'Trésorerie · chèques', title:isNew?'Enregistrer un chèque':`Chèque n° ${ch.num}`, ent:isNew?null:['cheques',ch],
    fields:[{key:'sens',label:'Sens',type:'select',options:[['Reçu','Reçu d’un client'],['Émis','Émis à un fournisseur']]},{key:'num',label:'N° de chèque',required:true},
      {key:'tiers',label:'Tireur / bénéficiaire',required:true,full:true},{key:'banque',label:'Banque',type:'select',options:BANQUES},{key:'montant',label:'Montant (DA)',type:'number',required:true,min:1},
      {key:'dateEmission',label:'Date d’émission',type:'date',default:TODAY},{key:'dateEcheance',label:'Échéance de présentation',type:'date',default:TODAY},
      {key:'compteId',label:'Compte',type:'select',options:D.comptes.filter(c=>c.type!=='Caisse').map(c=>[c.id,c.libelle]),full:true}],
    values:ch,
    onSave: v => { if (v.dateEcheance < v.dateEmission) return 'L’échéance précède la date d’émission.'; const data = {...v, montant:+v.montant};
      if (isNew) { D.cheques.unshift({id:newId('CH'),...data,statut:v.sens==='Reçu'?'En portefeuille':'Émis',tiersId:'',dateRemise:'',motifRejet:''}); toast(`Chèque ${v.num} ajouté ${v.sens==='Reçu'?'au portefeuille':'aux chèques émis'}`); }
      else { if (data.sens!==ch.sens) data.statut = data.sens==='Reçu'?'En portefeuille':'Émis'; Object.assign(ch, data); toast('Chèque mis à jour'); }
      save(); render(); }});
}

/* ---------- Comptabilité ---------- */
function ecritureForm(e){
  const isNew = !e || !e.id; e = e && e.id ? e : {};
  const acc = D.planComptable.map(a=>[a.numero,`${a.numero} — ${a.libelle}`]);
  const simple = isNew || e.lignes.length===2;
  openForm({eyebrow:'Comptabilité', title:isNew?'Écriture manuelle (opérations diverses)':`Modifier la pièce ${e.num}`, submitLabel:isNew?'Passer l’écriture':'Enregistrer', ent:isNew?null:['ecritures',e],
    fields:[{key:'date',label:'Date',type:'date',default:TODAY},{key:'journal',label:'Journal',type:'select',options:['OD','BQ','CAI','ACH','VTE']},{key:'circuit',label:'Circuit',type:'select',options:[['A','A · soumis à la fiscalité'],['B','B · non soumis']]},
      ...(simple ? [{key:'montant',label:'Montant (DA)',type:'number',required:true,min:1},{key:'debit',label:'Compte débité',type:'select',options:acc,full:true},{key:'credit',label:'Compte crédité',type:'select',options:acc,full:true}] : [{key:'lignesTxt',label:'Lignes',readonly:true,full:true,help:'Écriture à plusieurs lignes générée automatiquement : seuls l’en-tête et le libellé sont modifiables.'}]),
      {key:'libelle',label:'Libellé',required:true,full:true},{key:'reference',label:'Référence'}],
    values: isNew ? {debit:'615000',credit:'512100'} : {...e, montant:e.lignes[0][1]||e.lignes[0][2], debit:(e.lignes.find(l=>l[1])||[])[0], credit:(e.lignes.find(l=>l[2])||[])[0], lignesTxt:`${e.lignes.length} lignes · ${da(ecMontant(e))}`},
    onSave: v => {
      if (simple && v.debit===v.credit) return 'Les comptes débité et crédité doivent être différents.';
      const head = {date:v.date, journal:v.journal, circuit:v.circuit, libelle:v.libelle, reference:v.reference||''};
      if (simple) head.lignes = [[v.debit,+v.montant,0],[v.credit,0,+v.montant]];
      if (isNew) { D.ecritures.unshift({id:newId('EC'),num:nextNum(D.ecritures,'num',v.journal+'-'),origine:'Manuel',statut:'Brouillard',...head}); toast('Écriture passée au brouillard'); }
      else { Object.assign(e, head); toast(`Pièce ${e.num} mise à jour`); }
      save(); render(); }});
}
function planForm(a){
  const isNew = !a; a = a || {};
  openForm({eyebrow:'Plan comptable', title:isNew?'Nouveau compte':`Compte ${a.numero}`, ent:isNew?null:['plan',a],
    fields:[{key:'numero',label:'Numéro',required:true,readonly:!isNew,placeholder:'6 chiffres, ex. 626100'},{key:'classe',label:'Classe',type:'select',options:[['1','1 · Capitaux'],['2','2 · Immobilisations'],['3','3 · Stocks'],['4','4 · Tiers'],['5','5 · Financiers'],['6','6 · Charges'],['7','7 · Produits']]},{key:'libelle',label:'Intitulé',required:true,full:true}],
    values:{...a, classe:String(a.classe||(a.numero||'6')[0])},
    onSave: v => { if (!/^\d{3,8}$/.test(v.numero)) return 'Le numéro de compte ne contient que des chiffres (3 à 8).'; if (v.numero[0]!==v.classe) return `Un compte de classe ${v.classe} commence par ${v.classe}.`;
      if (isNew) { if (D.planComptable.find(x=>x.numero===v.numero)) return 'Ce numéro de compte existe déjà.'; D.planComptable.push({numero:v.numero,libelle:v.libelle,classe:+v.classe,actif:true}); D.planComptable.sort((x,y)=>x.numero.localeCompare(y.numero)); toast('Compte ajouté'); }
      else { a.libelle = v.libelle; toast('Compte mis à jour'); }
      save(); render(); }});
}

/* ---------- RH ---------- */
function congeForm(eid, c){
  const isNew = !c; c = c || {};
  openForm({eyebrow:'RH', title:isNew?'Demande de congé':'Modifier la demande', submitLabel:isNew?'Envoyer la demande':'Enregistrer', ent:isNew?null:['conges',c],
    fields:[{key:'employeId',label:'Employé',type:'select',options:actifs().map(e=>[e.id,`${e.prenom} ${e.nom} · solde ${e.soldeConges} j`]),full:true},{key:'type',label:'Type',type:'select',options:['Congé annuel','Maladie','Exceptionnel','Récupération','Sans solde']},{key:'debut',label:'Du',type:'date',default:addDays(TODAY,7),required:true},{key:'fin',label:'Au (inclus)',type:'date',default:addDays(TODAY,11),required:true},{key:'motif',label:'Motif',full:true}],
    values: isNew ? {employeId:eid} : c,
    onSave: v => { if (v.fin < v.debut) return 'La date de fin précède la date de début.'; const j = daysBetween(v.debut,v.fin)+1;
      if (isNew) { D.conges.unshift({id:newId('C'),...v,jours:j,statut:'En attente',dateDemande:TODAY}); toast(`Demande de ${j} jour${j>1?'s':''} transmise pour validation`); }
      else { Object.assign(c, {...v, jours:j}); toast('Demande mise à jour'); }
      save(); render(); }});
}
function varForm(x){
  const isNew = !x; x = x || {};
  openForm({eyebrow:'Paie', title:isNew?'Élément variable':'Modifier l’élément variable', ent:isNew?null:['variables',x],
    fields:[{key:'employeId',label:'Employé',type:'select',options:actifs().map(e=>[e.id,`${e.prenom} ${e.nom}`]),full:true},{key:'mois',label:'Mois',type:'month',default:TODAY.slice(0,7)},{key:'nature',label:'Nature',type:'select',options:['Prime','Retenue','Avance']},{key:'type',label:'Libellé',required:true,default:'Prime de rendement'},{key:'montant',label:'Montant (DA)',type:'number',required:true,min:1},{key:'motif',label:'Motif',full:true}],
    values:x,
    onSave: v => { if (isNew) { D.variables.unshift({id:newId('V'),...v,montant:+v.montant}); toast('Élément variable ajouté à la paie du mois'); } else { Object.assign(x, {...v, montant:+v.montant}); toast('Élément variable mis à jour'); } save(); render(); }});
}

/* ---------- SAV ---------- */
function ticketEditForm(t){
  openForm({eyebrow:'SAV', title:`Modifier ${t.num}`, ent:['tickets',t],
    fields:[{key:'categorie',label:'Catégorie',type:'select',options:[...new Set(D.tickets.map(x=>x.categorie))]},{key:'priorite',label:'Priorité',type:'select',options:['Critique','Haute','Normale','Basse']},
      {key:'statut',label:'Statut',type:'select',options:['Ouvert','En cours','Résolu','Clôturé']},{key:'assigneId',label:'Technicien',type:'select',options:D.employes.filter(e=>e.departement==='Service technique'&&e.statut==='Actif').map(e=>[e.id,e.prenom+' '+e.nom])},
      {key:'description',label:'Description du problème',type:'textarea',required:true,full:true}],
    values:t,
    onSave: v => { const ch = []; if (v.statut!==t.statut) ch.push(`statut « ${v.statut} »`); if (v.priorite!==t.priorite) ch.push(`priorité « ${v.priorite} »`); if (v.assigneId!==t.assigneId) ch.push(`technicien ${empName(v.assigneId)}`);
      if (v.statut==='Résolu' && !t.dateResolution) t.dateResolution = TODAY; if (['Ouvert','En cours'].includes(v.statut)) t.dateResolution = '';
      Object.assign(t, v); if (ch.length) t.historique.push({date:TODAY,auteur:userLabel(),msg:`Ticket modifié : ${ch.join(', ')}.`});
      save(); toast(`${t.num} mis à jour`); render(); reopen(openTicket, t); }});
}
function pieceForm(p){
  const isNew = !p; p = p || {};
  const ser = D.articles.filter(a=>a.serialise).sort((x,y)=>x.designation.localeCompare(y.designation,'fr'));
  openForm({eyebrow:'SAV · équipements', title:isNew?'Enregistrer un équipement':`Équipement ${p.serial}`, ent:isNew?null:['pieces',p],
    fields:[{key:'articleId',label:'Modèle',type:'select',options:ser.map(a=>[a.id,`${a.designation} · ${a.ref}`]),full:true},{key:'serial',label:'N° de série',required:true},{key:'depotId',label:'Dépôt',type:'select',options:depotOptions()},
      {key:'dateEntree',label:'Entrée en stock',type:'date',default:TODAY},{key:'garantieMois',label:'Garantie (mois)',type:'number',min:0,help:'Vide : garantie standard du modèle.'},
      ...(isNew ? [] : [{key:'statut',label:'Cycle de vie',type:'select',options:LIFE}])],
    values:p,
    onSave: v => { const s = v.serial.toUpperCase(); if (D.pieces.some(x=>x!==p && x.serial.toUpperCase()===s)) return `Le n° de série ${s} est déjà enregistré.`;
      const a = art(v.articleId); const g = v.garantieMois==='' ? a.garantieMois : +v.garantieMois;
      if (isNew) { D.pieces.unshift({id:newId('P'),serial:s,articleId:a.id,depotId:v.depotId,dateEntree:v.dateEntree,garantieMois:g,statut:'En stock'}); toast(`Équipement ${s} enregistré en stock`); }
      else { Object.assign(p, {serial:s, articleId:a.id, depotId:v.depotId, dateEntree:v.dateEntree, garantieMois:g, statut:v.statut}); if (p.dateVente) p.finGarantie = addMonths(p.dateVente, g); toast('Équipement mis à jour'); }
      save(); render(); }});
}

/* ================= REGISTRE ================= */
const refsTo = (aid) => D.commandes.filter(c=>!['Livrée','Annulée'].includes(c.statut) && c.lignes.some(l=>l.articleId===aid)).length + D.achats.filter(b=>b.statut!=='Livrée' && b.lignes.some(l=>l.articleId===aid)).length;
const CRUD = {
  commandes: { list:()=>D.commandes, name:c=>`Commande ${c.num}`, fem:true, edit:c=>commandeForm(c), dup:c=>commandeForm(c,true),
    lock:c=>['Brouillon','Validée'].includes(c.statut)?'':'Commande déjà préparée ou expédiée : elle ne peut plus être modifiée.',
    check:c=>D.factures.some(f=>f.commandeId===c.id)?'Commande facturée : la facture et les sorties de stock existent déjà.':['Brouillon','Validée','Annulée'].includes(c.statut)?'':'Commande en préparation : annulez-la plutôt que de la supprimer.',
    bulk:[{label:'Valider',fn:rs=>{ rs.filter(c=>c.statut==='Brouillon').forEach(c=>c.statut='Validée'); },done:n=>`Brouillons validés parmi ${n} commande(s)`},
          {label:'Annuler',fn:rs=>{ rs.filter(c=>!['Livrée','Expédiée','En livraison'].includes(c.statut)).forEach(c=>{c.statut='Annulée'; c.statutLivraison='';}); },done:n=>`Commandes non expédiées annulées parmi ${n}`}] },
  articles: { list:()=>D.articles, name:a=>a.designation, edit:a=>articleForm(a), dup:a=>articleForm({...a, id:undefined, ref:a.ref+'-B', designation:a.designation+' (copie)'}),
    check:a=>qtyTot(a)>0?`Encore ${num(qtyTot(a))} ${a.unite.toLowerCase()}(s) en stock : soldez le stock avant de supprimer l’article.`:refsTo(a.id)?'Article présent dans des commandes en cours.':'',
    onRemove:a=>{ D.lots = (D.lots||[]).filter(l=>l.articleId!==a.id); } },
  alertes: { list:()=>D.articles, name:a=>a.designation, edit:a=>articleForm(a), remove:false },
  lots: { list:()=>D.lots, name:l=>`Lot ${l.lot}`, edit:l=>lotForm(l),
    warn:l=>`Les ${num(l.qte)} ${art(l.articleId).unite.toLowerCase()}(s) du lot seront retirés du stock du ${esc(dep(l.depotId).nom)} et un ajustement sera tracé.`,
    onRemove:l=>{ const a = ix().art.get(l.articleId); if (a && l.qte) { a.stocks[l.depotId] = Math.max(0,(a.stocks[l.depotId]||0)-l.qte); D.mouvements.unshift({id:newId('M'),date:TODAY,type:'Ajustement',articleId:a.id,depotId:l.depotId,depotDestId:'',qte:-l.qte,coutUnitaire:a.cmup,reference:`LOT-${l.lot}`,motif:'Suppression de lot',utilisateur:userLabel()}); } } },
  mouvements: { list:()=>D.mouvements, name:m=>`Mouvement ${m.reference}`, edit:m=>mvtEditForm(m),
    check:m=>['Livraison client','Réception fournisseur'].includes(m.motif)?`Généré par ${m.reference} : modifiez le document d’origine.`:'',
    warn:m=>`Le stock de « ${esc(art(m.articleId).designation)} » sera recalculé comme si ce mouvement n’avait pas eu lieu.`, onRemove:reverseMvt },
  inventaires: { list:()=>D.inventaires, name:i=>`Inventaire ${i.num}`, edit:i=>invForm(i) },
  depots: { list:()=>D.depots, name:d=>d.nom, edit:d=>depotForm(d),
    check:d=>D.articles.some(a=>(a.stocks[d.id]||0)>0)?'Ce dépôt contient encore du stock : transférez-le avant de le supprimer.':D.commandes.some(c=>c.depotId===d.id&&!['Livrée','Annulée'].includes(c.statut))?'Des commandes en cours partent de ce dépôt.':'',
    onRemove:d=>{ D.articles.forEach(a=>delete a.stocks[d.id]); } },
  achats: { list:()=>D.achats, name:b=>`Commande ${b.num}`, fem:true, edit:b=>achatForm(b), dup:b=>achatForm(b,true),
    lock:b=>['Créée','Validée'].includes(b.statut)?'':'Commande déjà préparée ou expédiée par le fournisseur.',
    check:b=>b.statut==='Livrée'?'Commande réceptionnée : le stock et les écritures d’achat ont été générés.':b.paye>0?'Un paiement a déjà été enregistré.':'' },
  frs: { list:()=>D.fournisseurs, name:f=>f.raison, edit:f=>frsForm(f),
    check:f=>{ const n = D.achats.filter(b=>b.fournisseurId===f.id && (b.statut!=='Livrée' || achatReste(b)>0)).length; return n?`${n} commande(s) en cours ou non soldée(s) chez ce fournisseur.`:''; } },
  clients: { list:()=>D.clients, name:c=>c.raison, edit:c=>clientForm(c),
    check:c=>clientEnc(c)>0?`Encours de ${da(clientEnc(c))} : soldez ses factures avant de le supprimer.`:D.commandes.some(x=>x.clientId===c.id&&!['Livrée','Annulée'].includes(x.statut))?'Commandes en cours pour ce client.':'' },
  factures: { list:()=>D.factures, name:f=>`Facture ${f.num}`, fem:true, edit:f=>factureForm(f),
    check:f=>f.regle>0?'Facture déjà réglée en tout ou partie : supprimez d’abord ses règlements.':D.ecritures.some(e=>e.reference===f.num&&e.statut==='Validée')?'L’écriture de vente est validée : passez un avoir.':'',
    warn:f=>`L’écriture de vente au brouillard et les relances de cette facture seront supprimées.${f.commandeId?' La commande liée restera expédiée.':''}`,
    onRemove:f=>{ D.ecritures = D.ecritures.filter(e=>!(e.reference===f.num && e.statut==='Brouillard')); D.relances = D.relances.filter(r=>r.factureId!==f.id); },
    bulk:[{label:'Relancer',fn:rs=>{ let n=0; rs.filter(f=>facReste(f)>0&&f.echeance<TODAY).forEach(f=>{ const lv = Math.min(3, D.relances.filter(r=>r.factureId===f.id).reduce((m,r)=>Math.max(m,r.niveau),0)+1); D.relances.unshift({id:newId('RL'),date:TODAY,factureId:f.id,clientId:f.clientId,niveau:lv,canal:['','Email','SMS + Email','Courrier recommandé'][lv],statut:'Envoyée',montant:facReste(f)}); n++; }); if (!n) return 'Aucune facture échue dans la sélection'; },done:()=>'Relances envoyées pour les factures échues sélectionnées'}] },
  reglements: { list:()=>D.reglements, name:r=>`Règlement ${r.num}`, edit:r=>reglementEditForm(r),
    warn:r=>`La facture redevient due de ${da(r.montant)}. L’opération de trésorerie, le chèque et l’écriture liés seront supprimés.`,
    onRemove:r=>{ const f = ix().fac.get(r.factureId); if (f) f.regle = Math.max(0, f.regle - r.montant); D.tresorerie = D.tresorerie.filter(t=>t.reference!==r.num); D.cheques = D.cheques.filter(c=>c.reglementId!==r.id); D.ecritures = D.ecritures.filter(e=>!(e.reference===r.num && e.statut==='Brouillard')); } },
  relances: { list:()=>D.relances, name:r=>`Relance niveau ${r.niveau}`, fem:true, edit:r=>relanceForm(r) },
  treso: { list:()=>D.tresorerie, name:t=>t.libelle, fem:false, edit:t=>tresoForm(t),
    lock:t=>t.rapproche?'Opération rapprochée avec le relevé : dépointez-la d’abord (sélection, puis « Dépointer »).':/^RG/.test(t.reference||'')?`Générée par le règlement ${t.reference} : modifiez le règlement.`:'',
    check:t=>t.rapproche?'Opération rapprochée avec le relevé : dépointez-la d’abord.':/^RG/.test(t.reference||'')?`Générée par le règlement ${t.reference} : supprimez le règlement.`:'',
    bulk:[{label:'Pointer',fn:rs=>{ rs.forEach(t=>t.rapproche=true); },done:n=>`${n} opération(s) rapprochée(s)`},{label:'Dépointer',fn:rs=>{ rs.forEach(t=>t.rapproche=false); },done:n=>`${n} opération(s) dépointée(s)`}] },
  rappro: { list:()=>D.tresorerie, name:t=>t.libelle, edit:t=>tresoForm(t), remove:false, lock:t=>/^RG/.test(t.reference||'')?`Générée par le règlement ${t.reference} : modifiez le règlement.`:'' ,
    bulk:[{label:'Pointer la sélection',fn:rs=>{ rs.forEach(t=>t.rapproche=true); },done:n=>`${n} opération(s) rapprochée(s)`}] },
  comptes: { list:()=>D.comptes, name:c=>c.libelle.split(' — ')[0], edit:c=>compteForm(c),
    check:c=>{ const n = D.tresorerie.filter(t=>t.compteId===c.id).length + D.cheques.filter(x=>x.compteId===c.id).length; return n?`${n} opération(s) et chèque(s) sur ce compte : il ne peut pas être supprimé.`:''; } },
  cheques: { list:()=>D.cheques, name:c=>`Chèque ${c.num}`, edit:c=>chequeForm(c),
    lock:c=>['Encaissé','Rejeté'].includes(c.statut)?`Chèque ${c.statut.toLowerCase()} : il n’est plus modifiable.`:c.reglementId?'Chèque lié à un règlement client : modifiez le règlement.':'',
    check:c=>c.statut==='Encaissé'?'Chèque encaissé : l’opération bancaire est passée.':c.reglementId?'Chèque lié à un règlement client : supprimez le règlement.':'' },
  ecritures: { list:()=>D.ecritures, name:e=>`Pièce ${e.num}`, fem:true, edit:e=>ecritureForm(e),
    lock:e=>e.statut==='Validée'?'Écriture validée : passez une écriture d’extourne.':'', check:e=>e.statut==='Validée'?'Écriture validée : passez une écriture d’extourne.':'',
    bulk:[{label:'Valider',fn:rs=>{ rs.forEach(e=>e.statut='Validée'); },done:n=>`${n} écriture(s) validée(s)`}] },
  plan: { list:()=>D.planComptable, name:a=>`Compte ${a.numero}`, edit:a=>planForm(a),
    check:a=>{ const n = D.ecritures.filter(e=>e.lignes.some(l=>l[0]===a.numero)).length; return n?`${n} écriture(s) mouvementent ce compte.`:D.comptes.some(c=>c.compteCompta===a.numero)?'Compte rattaché à un compte de trésorerie.':''; } },
  employes: { list:()=>D.employes, name:e=>`${e.prenom} ${e.nom}`, edit:e=>empForm(e),
    check:e=>{ const n = D.employes.filter(x=>x.managerId===e.id&&x.statut==='Actif').length; return n?`Responsable de ${n} personne(s) : réaffectez son équipe avant de supprimer la fiche.`:''; },
    warn:()=>'Pour un départ, préférez passer le statut à « Sorti » afin de garder l’historique. La suppression efface aussi ses congés et éléments variables.',
    onRemove:e=>{ D.conges = D.conges.filter(c=>c.employeId!==e.id); D.variables = D.variables.filter(v=>v.employeId!==e.id); } },
  contrats: { list:()=>D.employes, name:e=>`${e.prenom} ${e.nom}`, edit:e=>empForm(e), remove:false },
  conges: { list:()=>D.conges, name:c=>`Congé de ${empName(c.employeId)}`, edit:c=>congeForm(c.employeId, c),
    lock:c=>c.statut==='En attente'?'':`Demande déjà ${c.statut==='Approuvé'?'approuvée':'refusée'} : supprimez-la puis créez-en une nouvelle.`,
    warn:c=>c.statut==='Approuvé'&&c.type==='Congé annuel'?`Les ${c.jours} jours seront recrédités sur le solde de ${esc(empName(c.employeId))}.`:'Cette demande sera supprimée. Vous pourrez annuler juste après.',
    onRemove:c=>{ if (c.statut==='Approuvé' && c.type==='Congé annuel') { const e = ix().emp.get(c.employeId); if (e) e.soldeConges += c.jours; } },
    bulk:[{label:'Approuver',fn:rs=>{ let ko=0; rs.filter(c=>c.statut==='En attente').forEach(c=>{ const e = emp(c.employeId); if (c.type==='Congé annuel' && e.soldeConges < c.jours) { ko++; return; } c.statut='Approuvé'; if (c.type==='Congé annuel') e.soldeConges -= c.jours; }); },done:n=>`Demandes en attente approuvées (${n} sélectionnée(s))`},
          {label:'Refuser',fn:rs=>{ rs.filter(c=>c.statut==='En attente').forEach(c=>c.statut='Refusé'); },done:n=>`Demandes en attente refusées (${n} sélectionnée(s))`}] },
  variables: { list:()=>D.variables, name:v=>v.type, edit:v=>varForm(v) },
  tickets: { list:()=>D.tickets, name:t=>`Ticket ${t.num}`, edit:t=>ticketEditForm(t),
    bulk:[{label:'Clôturer',fn:rs=>{ rs.forEach(t=>{ if (!t.dateResolution) t.dateResolution = TODAY; t.statut='Clôturé'; t.historique.push({date:TODAY,auteur:userLabel(),msg:'Ticket clôturé.'}); }); },done:n=>`${n} ticket(s) clôturé(s)`}] },
  pieces: { list:()=>D.pieces, name:p=>`Équipement ${p.serial}`, edit:p=>pieceForm(p),
    check:p=>D.tickets.some(t=>t.pieceId===p.id)?'Des tickets SAV sont liés à cet équipement.':p.clientId?'Équipement vendu à un client : il reste suivi pour la garantie.':'' },
};
