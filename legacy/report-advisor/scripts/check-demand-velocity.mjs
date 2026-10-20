import assert from 'node:assert/strict';
const source='src/lib/free-toolbox/sales-demand-series.ts';
const page='src/pages/DemandVelocityPage.tsx';
const app='src/App.tsx';
const fs=(await import('node:fs/promises')).readFile;
const [s,p,a]=await Promise.all([fs(source,'utf8'),fs(page,'utf8'),fs(app,'utf8')]);
assert.match(s,/sales_invoices/);assert.match(s,/sale_items/);assert.match(s,/invoice_date/);assert.match(s,/averageDaily/);assert.match(s,/peakDaily/);assert.match(s,/trend/);assert.match(p,/fetchProductDemandSeries/);assert.match(p,/30,90,180,365/);assert.match(a,/reports\/demand-velocity/);console.log('demand velocity contract: PASS');
