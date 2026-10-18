/* ================= ASD — données de démonstration (générées une fois, puis mises en cache dans le navigateur) ================= */
const DB_KEY = 'asd.erp.data.v1';
const UI_KEY = 'asd.erp.ui.v1';

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const pad2 = n => String(n).padStart(2,'0');
const isoD = d => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const parseD = s => { const [y,m,d] = s.split('-').map(Number); return new Date(y,m-1,d); };
const addDays = (s,n) => { const d = typeof s==='string'?parseD(s):new Date(s); d.setDate(d.getDate()+n); return isoD(d); };
const addMonths = (s,n) => { const d = parseD(s); d.setMonth(d.getMonth()+n); return isoD(d); };
const daysBetween = (a,b) => Math.round((parseD(b)-parseD(a))/86400000);

const sum0 = (a,f) => a.reduce((s,x)=>s+(f(x)||0),0);
function seedData(){
  const R = mulberry32(20260714);
  const rnd = () => R();
  const ri = (a,b) => Math.floor(rnd()*(b-a+1))+a;
  const pick = a => a[Math.floor(rnd()*a.length)];
  const chance = p => rnd() < p;
  const round = (n,s=10) => Math.round(n/s)*s;
  const now = new Date(); now.setHours(0,0,0,0);
  const TODAY = isoD(now);
  const dayAgo = n => addDays(TODAY,-n);
  let seq = 1; const uid = p => p + (seq++).toString(36).toUpperCase().padStart(5,'0');

  const PRENOMS_H = ['Mohamed','Amine','Yacine','Karim','Sofiane','Rachid','Nabil','Walid','Bilal','Riad','Samir','Mourad','Hichem','Fares','Islam','Ayoub','Abdelkader','Lyes','Nassim','Djamel','Zakaria','Redouane','Omar','Adel'];
  const PRENOMS_F = ['Amina','Sarah','Lina','Imane','Meriem','Yasmine','Nesrine','Lynda','Kahina','Asma','Selma','Rania','Houda','Feriel','Sonia','Khadidja'];
  const NOMS = ['Benali','Bouzid','Haddad','Meziane','Belkacem','Saidi','Khelifi','Boudiaf','Hamidi','Cherif','Djebbar','Rahmani','Mansouri','Ziani','Amrani','Benyahia','Ouali','Taleb','Hadjadji','Brahimi','Lounis','Ait Ahmed','Kaci','Slimani','Bensalem','Ferhat','Zerrouki','Mebarki','Guettaf','Allouache','Bouhired','Messaoudi','Larbi','Touati'];
  const WILAYAS = ['Alger','Oran','Constantine','Sétif','Blida','Annaba','Tizi Ouzou','Béjaïa','Batna','Tlemcen','Boumerdès','Ouargla','Mostaganem','Chlef','Bordj Bou Arréridj','Biskra','Médéa','Djelfa'];
  const WEIGHT_W = [16,10,8,8,7,5,5,5,4,4,4,3,3,3,3,2,2,2];
  const pickW = (arr,w) => { const t=w.reduce((a,b)=>a+b,0); let x=rnd()*t; for(let i=0;i<arr.length;i++){x-=w[i]; if(x<=0) return arr[i];} return arr[0]; };
  const phone = () => `0${pick(['5','6','7'])}${ri(10,99)} ${ri(10,99)} ${ri(10,99)} ${ri(10,99)}`;
  const nif = () => '0'+Array.from({length:14},()=>ri(0,9)).join('');

  /* ---------- Dépôts ---------- */
  const depots = [
    {id:'DEP1',code:'ALG',nom:'Dépôt central Alger',adresse:'Zone industrielle Oued Smar',wilaya:'Alger'},
    {id:'DEP2',code:'ORN',nom:'Dépôt Oran',adresse:'Es Sénia, route de l’aéroport',wilaya:'Oran'},
    {id:'DEP3',code:'CST',nom:'Dépôt Constantine',adresse:'Zone d’activités Zouaghi',wilaya:'Constantine'},
    {id:'DEP4',code:'SET',nom:'Dépôt Sétif',adresse:'Zone industrielle Sétif',wilaya:'Sétif'},
  ];
  const depW = [45,22,18,15];

  /* ---------- Employés ---------- */
  const employes = [];
  const mkEmp = (dep, poste, mgr, opts={}) => {
    const f = chance(.3) && !opts.male;
    const e = {
      id: uid('E'), matricule: 'ASD-' + String(employes.length+101).padStart(4,'0'),
      prenom: f?pick(PRENOMS_F):pick(PRENOMS_H), nom: pick(NOMS), sexe: f?'F':'H',
      poste, departement: dep, managerId: mgr||null,
      dateEmbauche: dayAgo(ri(opts.recent?20:200, opts.recent?260:4200)),
      contrat: 'CDI', finContrat: '', salaire: round(opts.sal || ri(42000,85000),500),
      cnas: String(ri(10,99))+String(ri(1000000,9999999))+String(ri(10,99)),
      tel: phone(), depotId: opts.depot || 'DEP1', soldeConges: ri(2,30), statut:'Actif',
      wilaya: opts.wilaya || 'Alger'
    };
    employes.push(e); return e;
  };
  const dg = mkEmp('Direction','Directeur général',null,{sal:420000,male:true});
  const daf = mkEmp('Direction','Directeur administratif et financier',dg.id,{sal:280000});
  const dcom = mkEmp('Direction','Directeur commercial',dg.id,{sal:260000});
  const dlog = mkEmp('Logistique','Responsable logistique',dg.id,{sal:150000});
  const rsav = mkEmp('Atelier SAV','Responsable SAV',dg.id,{sal:160000});
  const rrh = mkEmp('Ressources humaines','Responsable RH',daf.id,{sal:140000});
  const ccpt = mkEmp('Comptabilité','Chef comptable',daf.id,{sal:150000});
  const rdsi = mkEmp('Informatique','Responsable informatique',daf.id,{sal:145000});
  const commerciaux = [];
  const zones = [['Alger','DEP1'],['Alger','DEP1'],['Blida','DEP1'],['Oran','DEP2'],['Tlemcen','DEP2'],['Constantine','DEP3'],['Annaba','DEP3'],['Sétif','DEP4']];
  zones.forEach(([w,d]) => commerciaux.push(mkEmp('Commercial','Commercial terrain',dcom.id,{sal:ri(65000,95000),wilaya:w,depot:d})));
  mkEmp('Commercial','Assistante commerciale',dcom.id,{sal:58000});
  const livreurs = [];
  for (let i=0;i<6;i++) livreurs.push(mkEmp('Logistique','Livreur',dlog.id,{sal:ri(42000,52000),male:true,depot:depots[i%4].id,wilaya:depots[i%4].wilaya}));
  const magasiniers = depots.map(d => mkEmp('Magasin','Chef magasinier',dlog.id,{sal:ri(55000,70000),depot:d.id,wilaya:d.wilaya}));
  depots.forEach((d,i) => { if(i<3) mkEmp('Magasin','Magasinier',magasiniers[i].id,{sal:ri(42000,50000),depot:d.id,wilaya:d.wilaya}); });
  const techs = [];
  for (let i=0;i<7;i++) techs.push(mkEmp('Atelier SAV',i<2?'Technicien électronique senior':'Technicien électronique',rsav.id,{sal:ri(60000,98000)}));
  mkEmp('Atelier SAV','Agent d’accueil SAV',rsav.id,{sal:46000});
  for (let i=0;i<4;i++) mkEmp('Comptabilité',i===0?'Comptable principal':'Comptable',ccpt.id,{sal:ri(58000,90000)});
  mkEmp('Comptabilité','Caissière',ccpt.id,{sal:48000});
  mkEmp('Ressources humaines','Chargée RH',rrh.id,{sal:62000});
  mkEmp('Ressources humaines','Gestionnaire paie',rrh.id,{sal:66000});
  mkEmp('Informatique','Administrateur systèmes',rdsi.id,{sal:90000});
  // contrats CDD / essai, quelques départs
  employes.forEach((e,i) => {
    if (i<8) return;
    const r = rnd();
    if (r < .22) { e.contrat='CDD'; e.dateEmbauche = dayAgo(ri(60,520)); e.finContrat = addDays(TODAY, ri(-10,200)); }
    else if (r < .30) { e.contrat='Période d’essai'; e.dateEmbauche = dayAgo(ri(10,80)); e.finContrat = addDays(e.dateEmbauche, 90); }
  });
  for (let i=0;i<3;i++){ const e = mkEmp(pick(['Magasin','Commercial','Atelier SAV']), pick(['Magasinier','Commercial terrain','Technicien électronique']), pick([dlog.id,dcom.id,rsav.id])); e.statut='Sorti'; e.dateSortie = dayAgo(ri(20,300)); }

  const conges = [];
  const TYPES_C = ['Congé annuel','Congé annuel','Congé annuel','Maladie','Exceptionnel','Récupération','Sans solde'];
  employes.filter(e=>e.statut==='Actif').forEach(e => {
    const n = ri(0,3);
    for (let k=0;k<n;k++){
      const deb = addDays(TODAY, ri(-300,60)); const j = ri(1,15);
      const st = deb > TODAY ? pick(['En attente','En attente','Approuvé']) : pick(['Approuvé','Approuvé','Approuvé','Refusé']);
      conges.push({id:uid('C'),employeId:e.id,type:pick(TYPES_C),debut:deb,fin:addDays(deb,j-1),jours:j,statut:st,dateDemande:addDays(deb,-ri(3,25)),motif:''});
    }
  });
  const variables = [];
  const months = []; for (let m=11;m>=0;m--){ const d=new Date(now.getFullYear(), now.getMonth()-m, 1); months.push(isoD(d).slice(0,7)); }
  employes.filter(e=>e.statut==='Actif').forEach(e => {
    months.slice(-4).forEach(mo => {
      if (chance(.35)) variables.push({id:uid('V'),employeId:e.id,mois:mo,type:pick(['Prime de rendement','Prime de panier','Prime de transport','Heures supplémentaires']),nature:'Prime',montant:round(ri(3000,25000),500),motif:''});
      if (chance(.08)) variables.push({id:uid('V'),employeId:e.id,mois:mo,type:'Retenue absence',nature:'Retenue',montant:round(ri(2000,9000),500),motif:'Absence non justifiée'});
      if (chance(.07)) variables.push({id:uid('V'),employeId:e.id,mois:mo,type:'Avance sur salaire',nature:'Avance',montant:round(ri(10000,40000),1000),motif:''});
    });
  });

  /* ---------- Articles ---------- */
  const CATS = [
    {cat:'Valises de diagnostic',items:['Valise diag multimarque','Scanner pro tablette 10"','Interface OBD2 Bluetooth','Testeur de batterie numérique','Station de programmation'],brands:['Launch','Autel','Delphi','Texa','Bosch'],p:[28000,480000],ser:true,g:[12,24]},
    {cat:'Calculateurs & modules',items:['Calculateur moteur EDC17','Calculateur ABS/ESP','Module BSI','Calculateur airbag','Module confort','Boîtier papillon motorisé'],brands:['Bosch','Continental','Siemens VDO','Magneti Marelli','Denso'],p:[24000,190000],ser:true,g:[6,12]},
    {cat:'Capteurs',items:['Capteur PMH','Sonde lambda','Débitmètre d’air','Capteur ABS','Capteur pression rail','Capteur arbre à cames'],brands:['Bosch','NGK','Valeo','Hella'],p:[2400,19000],ser:false,g:[6]},
    {cat:'Écrans & combinés',items:['Combiné compteur','Écran multimédia 9"','Afficheur climatisation','Caméra de recul'],brands:['Continental','Visteon','Valeo'],p:[14000,72000],ser:true,g:[12]},
    {cat:'Alimentation & charge',items:['Chargeur intelligent 12/24V','Booster de démarrage','Convertisseur 12/220V','Maintien de charge OBD'],brands:['CTEK','Noco','Telwin'],p:[6500,58000],ser:true,g:[12,24]},
    {cat:'Câbles & connectique',items:['Câble OBD 16 broches','Faisceau adaptateur','Connecteur ECU 121 broches','Câble banc ECU'],brands:['Launch','Autel','Générique'],p:[800,9500],ser:false,g:[3]},
    {cat:'Outillage atelier',items:['Multimètre automobile','Oscilloscope 4 voies','Programmateur de clés','Station de soudage','Endoscope numérique'],brands:['Fluke','Hantek','Xhorse','Weller'],p:[9000,260000],ser:true,g:[12]},
    {cat:'Consommables',items:['Pâte thermique','Kit étain de soudure','Gaine thermorétractable','Nettoyant contacts','Flux de soudure'],brands:['Würth','Kontakt','Générique'],p:[300,2600],ser:false,g:[0]},
  ];
  const articles = []; let refN = 1000;
  CATS.forEach(c => c.items.forEach(it => {
    const brands = c.brands.slice().sort(()=>rnd()-.5).slice(0, ri(2, Math.min(3,c.brands.length)));
    brands.forEach(b => {
      const pa = round(c.p[0] + Math.pow(rnd(),1.6)*(c.p[1]-c.p[0]), 10);
      const marge = 1.38 + rnd()*.3;
      const min = c.ser ? ri(10,24) : ri(60,180);
      const stocks = {}; const prof = rnd();
      depots.forEach((d,i) => {
        const w = [.4,.25,.2,.15][i];
        const tot = prof < .06 ? 0 : prof < .2 ? min*(0.2+rnd()*.7) : prof < .9 ? min*(1.3+rnd()*2.2) : min*(4.2+rnd()*1.5);
        stocks[d.id] = chance(.07) && prof >= .06 ? 0 : Math.round(tot*w*(0.7+rnd()*.6));
      });
      articles.push({
        id: uid('A'), ref: `${c.cat.slice(0,3).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g,'')}-${refN++}`,
        designation: `${it} ${b}`, categorie: c.cat, marque: b, unite: 'Unité',
        prixAchat: pa, prixVente: round(pa*marge,10), cmup: round(pa*(0.97+rnd()*.06),1),
        methode: chance(.8)?'CMUP':'FIFO', stockMin: min, stockMax: min*4, serialise: c.ser,
        garantieMois: pick(c.g), stocks, emplacement: `${pick(['A','B','C','D'])}${ri(1,12)}-${ri(1,6)}`, actif:true
      });
    });
  }));

  /* ---------- Clients ---------- */
  const PREF = ['SARL','EURL','Garage','Ets','SNC','Auto','Atelier','SPA'];
  const CORE = ['El Nour','Atlas','Sahel','Djurdjura','Tassili','Hoggar','El Bahia','Numidia','Cirta','Saoura','Ennasr','El Feth','Amal','Rimal','Zianides','Tafna','Medjerda','Chélif','Errahma','El Wiam','Ibn Badis','Essalam','Tadjmout','Seybouse','Mazafran','El Hidhab','Tikjda','El Kala','Belezma','Ahaggar'];
  const SUFF = ['Auto','Diagnostic','Services','Motors','Mécanique','Électronique auto','Pièces','Car Center',''];
  const TYPES_CL = ['Garage indépendant','Garage indépendant','Concessionnaire','Flotte d’entreprise','Revendeur pièces','Revendeur pièces','Particulier','Auto-école'];
  const clients = []; const usedNames = new Set();
  for (let i=0;i<96;i++){
    let name; do { name = `${pick(PREF)} ${pick(CORE)} ${pick(SUFF)}`.trim(); } while(usedNames.has(name)); usedNames.add(name);
    const type = pick(TYPES_CL);
    const w = pickW(WILAYAS, WEIGHT_W);
    const comm = commerciaux.find(c=>c.wilaya===w) || pick(commerciaux);
    const assujetti = type==='Particulier' ? false : chance(.72);
    if (type==='Particulier') name = `${pick(PRENOMS_H)} ${pick(NOMS)}`;
    clients.push({
      id: uid('CL'), code: 'CLI-' + String(i+1).padStart(4,'0'), raison: name, type, wilaya: w,
      commune: w, commercialId: comm.id, tel: phone(), email: name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z]+/g,'.').replace(/^\.|\.$/g,'') + '@' + pick(['gmail.com','yahoo.fr','outlook.com','djaweb.dz']),
      nif: assujetti?nif():'', rc: assujetti?`${ri(10,48)}/00-${ri(1000000,9999999)}B${ri(10,24)}`:'', ai: assujetti?String(ri(10000000000,99999999999)):'',
      assujettiTVA: assujetti, plafond: round(type==='Concessionnaire'||type==='Flotte d’entreprise'? ri(2000000,6000000) : ri(300000,2500000), 50000),
      delai: pick([0,15,30,30,45,60]), dateCreation: dayAgo(ri(60,2200)), bloque:false
    });
  }

  /* ---------- Fournisseurs ---------- */
  const FRS = [
    ['Shenzhen Lianke Electronics Co.','Chine','Shenzhen','USD'],['Guangzhou OBD Tools Ltd','Chine','Guangzhou','USD'],['Ningbo Autoparts Trading','Chine','Ningbo','USD'],
    ['Istanbul Oto Elektronik A.Ş.','Turquie','Istanbul','EUR'],['Bursa Sensör Sanayi','Turquie','Bursa','EUR'],['Stuttgart Diagnose GmbH','Allemagne','Stuttgart','EUR'],
    ['Hamburg Fahrzeugtechnik KG','Allemagne','Hambourg','EUR'],['Lyon Auto Composants SAS','France','Lyon','EUR'],['Milano Elettronica Srl','Italie','Milan','EUR'],
    ['Valencia Recambios SL','Espagne','Valence','EUR'],['SARL Import Tech Alger','Algérie','Alger','DZD'],['EURL Médi Pièces','Algérie','Oran','DZD'],
    ['SARL Sétif Câblage','Algérie','Sétif','DZD'],['Ets Benali Outillage','Algérie','Blida','DZD'],['SPA Electro Industries','Algérie','Tizi Ouzou','DZD'],
    ['Dubai Auto Parts FZE','Émirats arabes unis','Dubaï','USD'],['Tunis Diag Distribution','Tunisie','Tunis','EUR'],['SARL Consommables Atelier','Algérie','Alger','DZD'],
    ['Taipei Precision Instruments','Taïwan','Taipei','USD'],['EURL Hoggar Logistique','Algérie','Ouargla','DZD'],['Seoul Auto Sensor Co.','Corée du Sud','Séoul','USD'],['SARL Constantine Batteries','Algérie','Constantine','DZD']
  ];
  const fournisseurs = FRS.map((f,i) => ({
    id: uid('F'), code: 'FRS-' + String(i+1).padStart(3,'0'), raison: f[0], pays: f[1], ville: f[2], devise: f[3],
    contact: `${pick(PRENOMS_H)} ${pick(NOMS)}`, tel: f[1]==='Algérie'?phone():`+${ri(30,99)} ${ri(100,999)} ${ri(100,999)} ${ri(1000,9999)}`,
    email: 'contact@' + f[0].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z]+/g,'').slice(0,14) + '.com',
    delaiPaiement: pick([0,30,45,60,90]), conditions: pick(['Paiement à 30 jours fin de mois','Crédit documentaire','Remise documentaire','Virement à la commande 30 %, solde à la livraison','Paiement comptant']),
    nif: f[1]==='Algérie'?nif():'', categoriePrincipale: pick(CATS).cat, note: ri(2,5)
  }));

  /* ---------- Commandes clients (ventes) ---------- */
  const commandes = []; const factures = []; const reglements = []; const pieces = []; const mouvements = []; const relances = [];
  let cmdN = 1, facN = 1, regN = 1;
  const yr = String(now.getFullYear()).slice(2);
  for (let i=0;i<820;i++){
    const age = Math.floor(Math.pow(rnd(),1.25)*365);
    const date = dayAgo(age);
    const client = pick(clients);
    const depotId = client.wilaya==='Oran'||client.wilaya==='Tlemcen'||client.wilaya==='Mostaganem'||client.wilaya==='Chlef' ? 'DEP2' : client.wilaya==='Constantine'||client.wilaya==='Annaba'||client.wilaya==='Batna'||client.wilaya==='Biskra' ? 'DEP3' : client.wilaya==='Sétif'||client.wilaya==='Bordj Bou Arréridj'||client.wilaya==='Béjaïa' ? 'DEP4' : 'DEP1';
    const nl = ri(1,4); const lignes = [];
    for (let k=0;k<nl;k++){ const a = pick(articles); if (lignes.find(l=>l.articleId===a.id)) continue; const q = a.serialise ? (chance(.75)?1:2) : ri(2,25); const rem = chance(.25)?pick([3,5,8,10]):0; lignes.push({articleId:a.id,qte:q,pu:a.prixVente,remise:rem}); }
    const ht = lignes.reduce((s,l)=>s+l.qte*l.pu*(1-l.remise/100),0);
    const circuit = client.assujettiTVA ? 'A' : 'B';
    const tva = circuit==='A' ? ht*0.19 : 0;
    let statut;
    if (age > 25) statut = chance(.05) ? 'Annulée' : 'Livrée';
    else if (age > 10) statut = pick(['Livrée','Livrée','Livrée','En livraison','Expédiée']);
    else if (age > 4) statut = pick(['Livrée','En livraison','Expédiée','Préparée','Validée']);
    else statut = pick(['Brouillon','Validée','Validée','Préparée','Expédiée','En livraison']);
    const liv = livreurs.find(l=>l.depotId===depotId) || pick(livreurs);
    const cmd = {
      id: uid('CM'), num: `BC${yr}-${String(cmdN++).padStart(5,'0')}`, date, clientId: client.id, commercialId: client.commercialId, depotId,
      lignes, montantHT: Math.round(ht), tva: Math.round(tva), ttc: Math.round(ht+tva), circuit, statut,
      livreurId: ['Expédiée','En livraison','Livrée'].includes(statut) ? liv.id : null,
      dateLivraisonPrevue: addDays(date, ri(1,5)), dateLivraison: statut==='Livrée' ? addDays(date, ri(1,6)) : '',
      statutLivraison: statut==='Livrée' ? 'Livré' : statut==='En livraison' ? pick(['En route','En route','Reporté','Absent','Refusé']) : '',
      adresse: `${pick(['Cité','Rue','Lotissement','Zone d’activités'])} ${pick(CORE)}, ${client.wilaya}`, tournee: ''
    };
    if (cmd.dateLivraison && cmd.dateLivraison > TODAY) cmd.dateLivraison = TODAY;
    commandes.push(cmd);
    // mouvements de sortie
    if (['Expédiée','En livraison','Livrée'].includes(statut)) lignes.forEach(l => { const a = articles.find(x=>x.id===l.articleId); mouvements.push({id:uid('M'),date:addDays(date,1)>TODAY?TODAY:addDays(date,1),type:'Sortie',articleId:l.articleId,depotId,depotDestId:'',qte:l.qte,coutUnitaire:a.cmup,reference:cmd.num,motif:'Livraison client',utilisateur:'Magasin'}); });
    // facture
    if (['Expédiée','En livraison','Livrée'].includes(statut)){
      const fd = addDays(date, ri(0,2)) > TODAY ? TODAY : addDays(date, ri(0,2));
      const fac = { id: uid('FA'), num: `FA${yr}-${String(facN++).padStart(5,'0')}`, commandeId: cmd.id, clientId: client.id, commercialId: client.commercialId, date: fd,
        echeance: addDays(fd, client.delai), ht: cmd.montantHT, tva: cmd.tva, ttc: cmd.ttc, regle: 0, circuit, echeances: [] };
      if (fac.ttc > 350000 && client.delai >= 30) {
        const n = 3; const part = Math.round(fac.ttc/n);
        for (let k=0;k<n;k++) fac.echeances.push({date:addDays(fd, client.delai*(k+1)/1.5|0), montant: k<n-1?part:fac.ttc-part*(n-1)});
        fac.echeance = fac.echeances[n-1].date;
      }
      factures.push(fac);
      // règlements
      const facAge = daysBetween(fd, TODAY);
      const pPay = facAge > 120 ? .93 : facAge > 60 ? .78 : facAge > 30 ? .55 : .25;
      if (chance(pPay)) {
        const full = chance(.82);
        const parts = full ? (chance(.2)?2:1) : 1;
        let remaining = full ? fac.ttc : Math.round(fac.ttc * (0.3+rnd()*.4));
        for (let k=0;k<parts;k++){
          const m = k===parts-1 ? remaining : Math.round(remaining/2); remaining -= m;
          const rd = addDays(fd, Math.min(facAge, ri(0, Math.max(1, client.delai+20))));
          const mode = client.type==='Particulier' ? pick(['Espèces','Espèces','Virement']) : pick(['Chèque','Chèque','Virement','Virement','Espèces','Traite']);
          reglements.push({id:uid('R'),num:`RG${yr}-${String(regN++).padStart(5,'0')}`,date:rd>TODAY?TODAY:rd,factureId:fac.id,clientId:client.id,montant:m,mode,reference:mode==='Chèque'?String(ri(1000000,9999999)):mode==='Virement'?`VIR-${ri(100000,999999)}`:'' ,banque: mode==='Chèque'?pick(['BNA','CPA','BEA','BADR','BDL','CNEP','AGB','Société Générale Algérie']):''});
          fac.regle += m;
        }
      }
    }
  }
  // stock movements already exist for sorties; serial pieces from serialised lines
  let serN = 100000;
  commandes.filter(c=>c.statut==='Livrée').forEach(c => c.lignes.forEach(l => {
    const a = articles.find(x=>x.id===l.articleId); if (!a.serialise) return;
    for (let k=0;k<l.qte;k++){
      const dv = c.dateLivraison || c.date; const fin = addMonths(dv, a.garantieMois);
      pieces.push({id:uid('P'),serial:`${a.marque.slice(0,2).toUpperCase()}${yr}${String(serN++)}`,articleId:a.id,dateEntree:addDays(c.date,-ri(10,120)),depotId:c.depotId,
        clientId:c.clientId,commandeId:c.id,dateVente:dv,garantieMois:a.garantieMois,finGarantie:fin,statut: fin < TODAY ? 'Garantie expirée' : 'Sous garantie'});
    }
  }));
  articles.filter(a=>a.serialise).forEach(a => { const n = Math.min(6, Object.values(a.stocks).reduce((s,v)=>s+v,0)); for (let k=0;k<n;k++){ const dep = pickW(depots.map(d=>d.id),depW); pieces.push({id:uid('P'),serial:`${a.marque.slice(0,2).toUpperCase()}${yr}${String(serN++)}`,articleId:a.id,dateEntree:dayAgo(ri(3,200)),depotId:dep,clientId:'',commandeId:'',dateVente:'',garantieMois:a.garantieMois,finGarantie:'',statut:'En stock'}); } });

  /* ---------- Tickets SAV ---------- */
  const tickets = []; let tkN = 1;
  const CATS_T = ['Panne totale','Défaut de fabrication','Erreur logicielle / mise à jour','Dommage transport','Problème d’installation','Communication OBD impossible'];
  const sold = pieces.filter(p=>p.dateVente);
  for (let i=0;i<170;i++){
    const expired = sold.filter(x=>x.finGarantie < addDays(TODAY,-3));
    const late = chance(.22) && expired.length;
    const p = late ? pick(expired) : pick(sold); const span = daysBetween(p.dateVente, TODAY); if (span < 2) continue;
    const date = late ? addDays(p.finGarantie, ri(1, Math.max(1,daysBetween(p.finGarantie,TODAY)))) : addDays(p.dateVente, ri(1, span));
    const age = daysBetween(date, TODAY);
    const eligible = date <= p.finGarantie;
    const statut = age > 30 ? pick(['Clôturé','Clôturé','Résolu']) : age > 10 ? pick(['Résolu','En cours','Clôturé','En cours']) : pick(['Ouvert','Ouvert','En cours']);
    const tech = pick(techs); const cl = clients.find(c=>c.id===p.clientId);
    const res = ['Résolu','Clôturé'].includes(statut) ? addDays(date, Math.min(age, ri(1,14))) : '';
    const hist = [{date, auteur:'Accueil SAV', msg:`Ticket ouvert. Garantie ${eligible?'valide jusqu’au '+fmtDateRaw(p.finGarantie):'expirée depuis le '+fmtDateRaw(p.finGarantie)}.`}];
    if (statut!=='Ouvert') hist.push({date:addDays(date,1>age?0:1),auteur:`${tech.prenom} ${tech.nom}`,msg:pick(['Pièce reçue à l’atelier, diagnostic en cours.','Test sur banc effectué, défaut confirmé.','Mise à jour du firmware lancée.','Contrôle visuel : traces d’humidité sur la carte.'])});
    if (res) hist.push({date:res,auteur:`${tech.prenom} ${tech.nom}`,msg:pick(eligible?['Remplacement sous garantie effectué.','Réparation terminée, pièce testée OK.','Échange standard effectué.']:['Devis de réparation accepté et réparation effectuée.','Réparation hors garantie facturée.','Client informé : pièce non réparable.'])});
    if (statut==='Clôturé') hist.push({date:addDays(res,Math.min(2,daysBetween(res,TODAY))),auteur:'Accueil SAV',msg:'Pièce restituée au client, ticket clôturé.'});
    tickets.push({id:uid('T'),num:`SAV${yr}-${String(tkN++).padStart(4,'0')}`,date,pieceId:p.id,clientId:p.clientId,commandeId:p.commandeId,commercialId:cl?cl.commercialId:'',
      categorie:pick(CATS_T),priorite:pick(['Basse','Normale','Normale','Normale','Haute','Haute','Critique']),statut,assigneId:tech.id,eligible,dateResolution:res,
      description: pick(['Le client signale que l’appareil ne s’allume plus.','Erreur de communication avec le véhicule après 2 semaines d’utilisation.','Écran figé au démarrage.','Le calculateur ne répond plus après installation.','Valeurs incohérentes sur le capteur.','Le boîtier chauffe anormalement.']),historique:hist});
    if (['Résolu','Clôturé'].includes(statut) && eligible && chance(.45)) p.statut = 'Retour / Échange';
  }

  /* ---------- Bons de commande fournisseurs ---------- */
  const achats = []; let bcN = 1;
  const BC_ST = ['Créée','Validée','Préparée','Expédiée','Livrée'];
  for (let i=0;i<150;i++){
    const age = Math.floor(Math.pow(rnd(),1.1)*365); const date = dayAgo(age); const f = pick(fournisseurs);
    const nl = ri(1,5); const lignes = [];
    for (let k=0;k<nl;k++){ const a = pick(articles); if (lignes.find(l=>l.articleId===a.id)) continue; lignes.push({articleId:a.id,qte:a.serialise?ri(2,6):ri(8,45),pu:a.prixAchat,qteRecue:0}); }
    const ht = lignes.reduce((s,l)=>s+l.qte*l.pu,0);
    const local = f.pays==='Algérie';
    let st = age>60 ? 'Livrée' : age>30 ? pick(['Livrée','Livrée','Expédiée']) : age>12 ? pick(['Expédiée','Préparée','Livrée','Validée']) : pick(['Créée','Validée','Préparée']);
    const depotId = pickW(depots.map(d=>d.id),depW);
    let rap = 'En attente';
    if (st==='Livrée'){ rap = chance(.85) ? 'Conforme' : pick(['Écart quantité','Écart prix']); lignes.forEach(l=>{ l.qteRecue = rap==='Écart quantité' && chance(.5) ? l.qte - ri(1,Math.max(1,Math.round(l.qte*.1))) : l.qte; }); }
    const dateLiv = st==='Livrée' ? addDays(date, Math.min(age, local?ri(3,12):ri(25,55))) : '';
    const ech = st==='Livrée' ? addDays(dateLiv, f.delaiPaiement) : addDays(date, f.delaiPaiement+40);
    const tva = local ? Math.round(ht*.19) : Math.round(ht*.19); // TVA à l’importation
    const bc = {id:uid('BC'),num:`BCF${yr}-${String(bcN++).padStart(4,'0')}`,date,fournisseurId:f.id,depotId,lignes,montantHT:Math.round(ht),tva,ttc:Math.round(ht)+tva,statut:st,
      dateLivraisonPrevue: addDays(date, local?7:40), dateLivraison: dateLiv, bl: st==='Livrée'?`BL-${ri(10000,99999)}`:'', factureFrs: st==='Livrée'?`F-${f.code.slice(4)}-${ri(1000,9999)}`:'',
      rapprochement: rap, echeance: ech, paye: 0};
    if (st==='Livrée'){ const pa = ech < TODAY ? (chance(.88)?bc.ttc:Math.round(bc.ttc*.5)) : (chance(.3)?bc.ttc:0); bc.paye = pa; }
    achats.push(bc);
    if (st==='Livrée') lignes.forEach(l => mouvements.push({id:uid('M'),date:dateLiv,type:'Entrée',articleId:l.articleId,depotId,depotDestId:'',qte:l.qteRecue,coutUnitaire:l.pu,reference:bc.num,motif:'Réception fournisseur',utilisateur:'Magasin'}));
  }
  for (let i=0;i<70;i++){ const a = pick(articles); const from = pick(depots), to = pick(depots.filter(d=>d!==from)); mouvements.push({id:uid('M'),date:dayAgo(ri(0,300)),type:'Transfert',articleId:a.id,depotId:from.id,depotDestId:to.id,qte:a.serialise?ri(1,5):ri(5,40),coutUnitaire:a.cmup,reference:`TR-${ri(1000,9999)}`,motif:'Rééquilibrage inter-dépôts',utilisateur:'Logistique'}); }
  for (let i=0;i<45;i++){ const a = pick(articles); const neg = chance(.65); mouvements.push({id:uid('M'),date:dayAgo(ri(0,330)),type:'Ajustement',articleId:a.id,depotId:pick(depots).id,depotDestId:'',qte:(neg?-1:1)*ri(1,a.serialise?2:8),coutUnitaire:a.cmup,reference:`INV-${ri(100,999)}`,motif:neg?pick(['Casse','Écart inventaire','Pièce défectueuse']):'Écart inventaire positif',utilisateur:'Magasin'}); }
  mouvements.sort((a,b)=>b.date.localeCompare(a.date));

  const inventaires = [];
  for (let i=0;i<10;i++){ const d = pick(depots); const nb = ri(40,articles.length); const ec = ri(0,14); inventaires.push({id:uid('I'),num:`INV-${yr}-${String(i+1).padStart(3,'0')}`,date:dayAgo(i*33+ri(0,10)),depotId:d.id,type:pick(['Tournant','Complet','Tournant']),articlesComptes:nb,ecarts:ec,valeurEcart:-round(ri(0,ec*14000),10),statut:i===0?'En cours':'Validé',responsable:magasiniers[depots.indexOf(d)].id}); }

  /* ---------- Relances ---------- */
  factures.forEach(f => { const reste = f.ttc - f.regle; if (reste<=0 || f.echeance >= TODAY) return; const late = daysBetween(f.echeance, TODAY); const lv = late>60?3:late>30?2:1; for (let n=1;n<=lv;n++) relances.push({id:uid('RL'),date:addDays(f.echeance, n===1?3:n===2?30:60),factureId:f.id,clientId:f.clientId,niveau:n,canal:n===1?'Email':n===2?'SMS + Email':'Courrier recommandé',statut:'Envoyée',montant:reste}); });

  /* ---------- Trésorerie ---------- */
  const comptes = [
    {id:'BQ1',libelle:'BNA — Agence Didouche Mourad',type:'Banque',banque:'BNA',rib:'001 00601 0300000123 45',soldeInitial:30000000,seuil:5000000,compteCompta:'512100'},
    {id:'BQ2',libelle:'CPA — Agence Oran Front de mer',type:'Banque',banque:'CPA',rib:'004 00212 4010000678 12',soldeInitial:11000000,seuil:2000000,compteCompta:'512200'},
    {id:'BQ3',libelle:'BEA — Agence Sétif centre',type:'Banque',banque:'BEA',rib:'002 00045 1100004567 89',soldeInitial:6500000,seuil:1000000,compteCompta:'512300'},
    {id:'BQ4',libelle:'Algérie Poste — CCP',type:'CCP',banque:'Algérie Poste',rib:'007 99999 0001234567 33',soldeInitial:1400000,seuil:200000,compteCompta:'517000'},
    {id:'CA1',libelle:'Caisse principale Alger',type:'Caisse',banque:'—',rib:'—',soldeInitial:600000,seuil:100000,compteCompta:'530000'},
  ];
  const tresorerie = [];
  const cheques = []; let chN=1;
  reglements.forEach(r => {
    const cpt = r.mode==='Espèces' ? 'CA1' : pickW(['BQ1','BQ2','BQ3','BQ4'],[55,25,15,5]);
    if (r.mode==='Chèque'){
      const ech = addDays(r.date, ri(0,25));
      const age = daysBetween(r.date, TODAY);
      let st = age > 20 ? (chance(.06)?'Rejeté':'Encaissé') : age > 6 ? pick(['Remis à l’encaissement','Encaissé','En portefeuille']) : pick(['En portefeuille','En portefeuille','Remis à l’encaissement']);
      const cl = clients.find(c=>c.id===r.clientId);
      cheques.push({id:uid('CH'),num:r.reference,sens:'Reçu',tiers:cl.raison,tiersId:cl.id,banque:r.banque,montant:r.montant,dateEmission:r.date,dateEcheance:ech,statut:st,compteId:cpt,reglementId:r.id,dateRemise:st!=='En portefeuille'?addDays(r.date,ri(1,5)):'',motifRejet:st==='Rejeté'?pick(['Provision insuffisante','Signature non conforme','Chèque périmé']):''});
      if (st!=='Encaissé') return; // pas encore sur le relevé
    }
    tresorerie.push({id:uid('TR'),date:r.date,compteId:cpt,sens:'Encaissement',categorie:'Règlement client',montant:r.montant,libelle:`${r.num} — ${clients.find(c=>c.id===r.clientId).raison}`,reference:r.num,rapproche: daysBetween(r.date,TODAY)>12 ? chance(.95) : chance(.3)});
  });
  achats.filter(b=>b.paye>0).forEach(b => {
    const f = fournisseurs.find(x=>x.id===b.fournisseurId); const d = b.echeance < TODAY ? b.echeance : addDays(b.dateLivraison||b.date, ri(0,5)); const dd = d>TODAY?TODAY:d;
    const cpt = pickW(['BQ1','BQ2','BQ3'],[65,20,15]);
    if (f.pays==='Algérie' && chance(.5)) {
      const age = daysBetween(dd, TODAY);
      cheques.push({id:uid('CH'),num:String(ri(1000000,9999999)),sens:'Émis',tiers:f.raison,tiersId:f.id,banque:comptes.find(c=>c.id===cpt).banque,montant:b.paye,dateEmission:dd,dateEcheance:addDays(dd,ri(0,20)),statut: age>15?'Encaissé':pick(['Émis','Émis','Encaissé']),compteId:cpt,reglementId:b.id,dateRemise:'',motifRejet:''});
    }
    tresorerie.push({id:uid('TR'),date:dd,compteId:cpt,sens:'Décaissement',categorie:f.pays==='Algérie'?'Paiement fournisseur':'Paiement fournisseur (import)',montant:b.paye,libelle:`${b.num} — ${f.raison}`,reference:b.num,rapproche: daysBetween(dd,TODAY)>12 ? chance(.95) : chance(.3)});
  });
  for (let k=0;k<6;k++){ const d = dayAgo(ri(1,9)); cheques.push({id:uid('CH'),num:String(ri(1000000,9999999)),sens:'Émis',tiers:pick(fournisseurs.filter(f=>f.pays==='Algérie')).raison,tiersId:'',banque:'BNA',montant:round(ri(80000,900000),100),dateEmission:d,dateEcheance:addDays(TODAY,ri(1,25)),statut:'Émis',compteId:'BQ1',reglementId:'',dateRemise:'',motifRejet:''}); }
  const masse = employes.filter(e=>e.statut==='Actif').reduce((s,e)=>s+e.salaire,0);
  const CHARGES = [['Loyer dépôts',['Loyer Oued Smar','Loyer Es Sénia','Loyer Zouaghi'],[450000,280000,240000]],['Énergie',['Facture Sonelgaz'],[85000]],['Télécom',['Algérie Télécom / Mobilis'],[42000]],['Carburant',['Bons Naftal'],[160000]],['Transport & transit',['Transitaire — dédouanement'],[320000]]];
  months.forEach((mo,mi) => {
    const last = mi===months.length-1;
    const pd = `${mo}-${last? pad2(Math.min(now.getDate(), 25)) : '25'}`;
    if (!last || now.getDate()>=25) {
      tresorerie.push({id:uid('TR'),date:pd,compteId:'BQ1',sens:'Décaissement',categorie:'Salaires',montant:Math.round(masse*0.91),libelle:`Virement salaires ${mo}`,reference:`PAIE-${mo}`,rapproche:!last});
    }
    const cn = `${mo}-${'20'}`;
    if (cn <= TODAY) {
      tresorerie.push({id:uid('TR'),date:cn,compteId:'BQ1',sens:'Décaissement',categorie:'Charges sociales',montant:Math.round(masse*0.26),libelle:`CNAS — cotisations ${mo}`,reference:`CNAS-${mo}`,rapproche:daysBetween(cn,TODAY)>12});
      tresorerie.push({id:uid('TR'),date:cn,compteId:'BQ1',sens:'Décaissement',categorie:'Impôts & taxes',montant:round(ri(380000,920000),100),libelle:`G50 — déclaration ${mo}`,reference:`G50-${mo}`,rapproche:daysBetween(cn,TODAY)>12});
    }
    CHARGES.forEach(([cat,libs,mts]) => libs.forEach((l,j) => { const d = `${mo}-${pad2(ri(3,18))}`; if (d<=TODAY) tresorerie.push({id:uid('TR'),date:d,compteId:cat==='Carburant'?'CA1':pick(['BQ1','BQ2','BQ3']),sens:'Décaissement',categorie:cat,montant:round(mts[j]*(0.85+rnd()*.3),100),libelle:`${l} ${mo}`,reference:'',rapproche:daysBetween(d,TODAY)>12 && chance(.92)}); }));
    // alimentations caisse
    const dca = `${mo}-05`; if (dca<=TODAY){ tresorerie.push({id:uid('TR'),date:dca,compteId:'CA1',sens:'Encaissement',categorie:'Virement interne',montant:250000,libelle:'Alimentation caisse depuis BNA',reference:'',rapproche:true}); tresorerie.push({id:uid('TR'),date:dca,compteId:'BQ1',sens:'Décaissement',categorie:'Virement interne',montant:250000,libelle:'Alimentation caisse',reference:'',rapproche:true}); }
  });
  // versements d’espèces en banque (fin de mois)
  months.forEach(mo => { const d = `${mo}-28`; if (d > TODAY) return; const cash = 600000 + sum0(tresorerie.filter(t=>t.compteId==='CA1'&&t.date<=d), t=>t.sens==='Encaissement'?t.montant:-t.montant); if (cash > 300000) { const m = Math.round((cash-450000)/1000)*1000; tresorerie.push({id:uid('TR'),date:d,compteId:'CA1',sens:'Décaissement',categorie:'Virement interne',montant:m,libelle:`Versement espèces ${mo} à la BNA`,reference:'',rapproche:true}); tresorerie.push({id:uid('TR'),date:d,compteId:'BQ1',sens:'Encaissement',categorie:'Virement interne',montant:m,libelle:`Versement espèces ${mo}`,reference:'',rapproche:daysBetween(d,TODAY)>12}); } });
  tresorerie.sort((a,b)=>b.date.localeCompare(a.date));

  /* ---------- Comptabilité (SCF) ---------- */
  const planComptable = [
    ['101000','Capital social',1],['106000','Réserves',1],['120000','Résultat de l’exercice',1],['164000','Emprunts auprès des établissements de crédit',1],
    ['215000','Installations techniques, matériel et outillage',2],['218200','Matériel de transport',2],['218300','Matériel de bureau et informatique',2],['281500','Amortissement matériel et outillage',2],
    ['300000','Stocks de marchandises',3],['380000','Achats stockés',3],
    ['401000','Fournisseurs de stocks et services',4],['401100','Fournisseurs étrangers',4],['411000','Clients',4],['416000','Clients douteux',4],['421000','Personnel, rémunérations dues',4],['425000','Personnel, avances et acomptes',4],['431000','Organismes sociaux (CNAS)',4],['442000','Impôts et taxes (IRG salaires)',4],['445600','TVA déductible',4],['445700','TVA collectée',4],['447000','Autres impôts et taxes (TAP)',4],
    ['511000','Valeurs à l’encaissement (chèques)',5],['512100','Banque BNA',5],['512200','Banque CPA',5],['512300','Banque BEA',5],['517000','CCP Algérie Poste',5],['530000','Caisse',5],['580000','Virements internes',5],
    ['600000','Achats de marchandises vendues',6],['603000','Variation des stocks de marchandises',6],['613000','Locations',6],['615000','Entretien, réparations',6],['624000','Transports de biens',6],['626000','Frais postaux et télécommunications',6],['606100','Fournitures non stockables (énergie, carburant)',6],['631000','Rémunérations du personnel',6],['635000','Cotisations aux organismes sociaux',6],['642000','Impôts et taxes',6],['661000','Charges d’intérêts',6],['681000','Dotations aux amortissements',6],
    ['700000','Ventes de marchandises',7],['706000','Prestations de services (SAV)',7],['708000','Produits des activités annexes',7],['766000','Gains de change',7],
  ].map(([n,l,c]) => ({numero:n,libelle:l,classe:c,actif:true}));
  const bqAccount = id => comptes.find(c=>c.id===id).compteCompta;
  const ecritures = []; let ecN = 1;
  const curMonth = TODAY.slice(0,7);
  const mkEc = (date, journal, libelle, circuit, lignes, origine, ref) => {
    ecritures.push({id:uid('EC'),num:`${journal}-${date.slice(2,4)}${date.slice(5,7)}-${String(ecN++).padStart(5,'0')}`,date,journal,libelle,circuit,lignes,origine,reference:ref,statut: date.slice(0,7) < curMonth ? 'Validée' : 'Brouillard'});
  };
  factures.forEach(f => { const cl = clients.find(c=>c.id===f.clientId); const l = [['411000',f.ttc,0],['700000',0,f.ht]]; if (f.tva) l.push(['445700',0,f.tva]); mkEc(f.date,'VTE',`Facture ${f.num} — ${cl.raison}`,f.circuit,l,'Créances',f.num); });
  reglements.forEach(r => { const f = factures.find(x=>x.id===r.factureId); const tr = tresorerie.find(t=>t.reference===r.num); const acc = r.mode==='Chèque' && !tr ? '511000' : tr ? bqAccount(tr.compteId) : '530000'; mkEc(r.date, r.mode==='Espèces'?'CAI':'BQ', `Règlement ${r.num} (${r.mode})`, f.circuit, [[acc,r.montant,0],['411000',0,r.montant]], 'Créances', r.num); });
  achats.filter(b=>b.statut==='Livrée').forEach(b => { const f = fournisseurs.find(x=>x.id===b.fournisseurId); const acc = f.pays==='Algérie'?'401000':'401100'; mkEc(b.dateLivraison,'ACH',`Facture fournisseur ${b.factureFrs} — ${f.raison}`,'A',[['380000',b.montantHT,0],['445600',b.tva,0],[acc,0,b.ttc]],'Fournisseurs',b.num); });
  tresorerie.filter(t=>t.sens==='Décaissement').forEach(t => {
    const bq = bqAccount(t.compteId);
    const map = {'Paiement fournisseur':'401000','Paiement fournisseur (import)':'401100','Salaires':'421000','Charges sociales':'431000','Impôts & taxes':'447000','Loyer dépôts':'613000','Énergie':'606100','Télécom':'626000','Carburant':'606100','Transport & transit':'624000','Virement interne':'580000'};
    mkEc(t.date, t.compteId==='CA1'?'CAI':'BQ', t.libelle, 'A', [[map[t.categorie]||'615000',t.montant,0],[bq,0,t.montant]], t.categorie.startsWith('Paiement')?'Fournisseurs':'Trésorerie', t.reference||'');
  });
  months.forEach(mo => {
    const d = `${mo}-28`; if (d > TODAY) return;
    const brut = Math.round(masse); const cs = Math.round(brut*.26); const net = Math.round(brut*.91);
    mkEc(d,'OD',`Paie ${mo}`,'A',[['631000',brut,0],['635000',cs,0],['421000',0,net],['442000',0,brut-net],['431000',0,cs]],'RH',`PAIE-${mo}`);
    const sorties = mouvements.filter(m=>m.type==='Sortie' && m.date.startsWith(mo)).reduce((s,m)=>s+m.qte*m.coutUnitaire,0);
    if (sorties) mkEc(d,'OD',`Coût des marchandises vendues ${mo}`,'A',[['600000',Math.round(sorties),0],['380000',0,Math.round(sorties)]],'Stock',`CMV-${mo}`);
  });
  ecritures.sort((a,b)=>b.date.localeCompare(a.date));
  const clotures = months.map((mo,i) => {
    const closed = i < months.length-2; const cur = i===months.length-1;
    return {id:'CL'+mo,mois:mo,statut: closed?'Clôturée':cur?'Ouverte':'En cours de clôture',
      controles:[{l:'Équilibre débit / crédit',ok:true},{l:'TVA collectée = TVA des factures',ok:closed||chance(.6)},{l:'Rapprochement bancaire terminé',ok:closed||chance(.4)},{l:'Écritures au brouillard validées',ok:closed},{l:'Cohérence stock comptable / physique',ok:closed||chance(.5)}],
      dateCloture: closed ? `${addMonths(mo+'-01',1).slice(0,7)}-${pad2(ri(5,12))}` : '', par: closed ? `${ccpt.prenom} ${ccpt.nom}` : ''};
  });

  /* ---------- Migration ---------- */
  const OLD = [
    ['tbl_articles','articles',3412,true,'Mappée',4],['tbl_clients','clients',1288,true,'Mappée',17],['tbl_fournisseurs','fournisseurs',214,true,'Mappée',2],
    ['t_mvt_stock','mouvements',186540,true,'Mappée',112],['t_factures','factures',24876,true,'Mappée',38],['t_lignes_fact','factures.lignes',81233,true,'Mappée',0],
    ['t_reglements','reglements',19841,true,'Mappée',23],['t_cheques','cheques',6022,true,'Partielle',61],['t_bc_frs','achats',2210,true,'Mappée',5],
    ['t_employes','employes',96,true,'Mappée',0],['t_conges','conges',1430,true,'Partielle',9],['t_ecritures','ecritures',148702,true,'Mappée',214],
    ['t_plan_cpt','planComptable',612,true,'Mappée',0],['t_depots','depots',6,true,'Mappée',0],['t_sav_old','tickets',3105,true,'Partielle',47],
    ['tmp_import_2019','—',52011,false,'Ignorée',0],['zz_backup_2021','—',140221,false,'Ignorée',0],['log_connexions','—',902114,false,'Ignorée',0],
    ['t_param_imprim','—',41,false,'Ignorée',0],['t_promo_2018','—',380,false,'Ignorée',0],['t_users','utilisateurs',58,true,'Partielle',6],['t_tva','paramètres TVA',4,true,'Mappée',0],
  ];
  const migrationTables = OLD.map(([t,c,n,a,s,an],i) => ({id:'MT'+i,table:t,cible:c,lignes:n,active:a,statutMapping:s,anomalies:an,derniereMaj:a?dayAgo(ri(0,20)):dayAgo(ri(500,2200)),colonnes:ri(6,48),colonnesMappees:a?ri(5,40):0}));
  migrationTables.forEach(m => { if (m.colonnesMappees > m.colonnes) m.colonnesMappees = m.colonnes; });
  const migrationRuns = [];
  [[62,'Complète (à blanc)'],[41,'Complète (à blanc)'],[25,'Complète'],[12,'Différentielle'],[4,'Différentielle'],[1,'Différentielle']].forEach(([d,type],i) => {
    const full = type.startsWith('Complète'); const tot = full ? 1580000 + ri(-20000,20000) : ri(1800,9500);
    migrationRuns.push({id:'MR'+i,date:dayAgo(d),type,lignesLues:tot,inserees:full?tot-ri(800,3000):ri(900,tot),misesAJour:full?0:ri(200,900),ignorees:full?ri(300,900):ri(20,140),anomalies:full?ri(400,900):ri(3,40),duree:full?`${ri(38,64)} min`:`${ri(40,180)} s`,statut:i<2?'Annulée (test)':'Terminée',par:`${rdsi.prenom} ${rdsi.nom}`});
  });

  return { meta:{created:TODAY, version:1}, depots, employes, conges, variables, articles, clients, fournisseurs, commandes, factures, reglements, relances, pieces, tickets, achats, mouvements, inventaires, comptes, tresorerie, cheques, planComptable, ecritures, clotures, migrationTables, migrationRuns };
}
function fmtDateRaw(s){ if(!s) return ''; const [y,m,d]=s.split('-'); return `${d}/${m}/${y}`; }
