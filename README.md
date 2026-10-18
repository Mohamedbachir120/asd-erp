# ASD — ERP Algerian System Diagnostic

Web ERP demo for Algerian System Diagnostic (ASD). Single-page app, French UI, light theme by default, hard-coded sample data cached in the browser (IndexedDB, falls back to localStorage).

## Modules
- Tableau de bord: consolidated KPIs, order → delivery cycle, charts, filters by period / depot / salesperson
- Ventes & livraisons: customer orders, delivery routes per driver
- Stock: 4 depots, CMUP/FIFO valuation, alert thresholds, transfers, inventories
- Fournisseurs & achats: purchase orders, PO / delivery note / invoice matching, payment due dates
- SAV & pièces: serial-number lifecycle, automatic warranty check, tickets
- Clients & créances: real-time customer balance, payment plans, aged balance, automatic reminders
- Trésorerie: bank accounts, CCP and cash, electronic cheques, 13-week forecast, bank reconciliation
- Comptabilité: SCF chart of accounts, dual circuit (A taxable / B non-taxable), general ledger, trial balance, period closing
- Ressources humaines: employees, contracts with expiry alerts, leave workflow, payroll variables, org chart
- Migration des données: legacy table audit, mapping, differential runs, anomaly report
- Paramètres: role profiles and access matrix, data reset

Every list has advanced filtering: AND/OR condition builder, status chips with counts, quick presets, saved views, column picker, CSV copy. Global search with Ctrl K.

## Run
Open `dist/index.html` in a browser. Charts load Chart.js 4.4.1 from cdnjs.

## Build
Sources are in `src/`. Run `./build.sh` to regenerate `dist/index.html` (also copied to `index.html` at the root).

## Deploy (Vercel)
`vercel.json` runs `build.sh` and serves the `dist/` folder, so the app loads at the site root.
