export const scenarios=[
{id:'excel-standard',kind:'xlsx',expect:'structured'},
{id:'excel-aliases',kind:'xlsx',expect:'mapped'},
{id:'excel-missing-columns',kind:'xlsx',expect:'review'},
{id:'csv-reordered',kind:'csv',expect:'mapped'},
{id:'pdf-text',kind:'pdf',expect:'structured'},
{id:'pdf-ocr-ar',kind:'pdf',expect:'ocr'},
{id:'unknown-report',kind:'unknown',expect:'semantic-discovery'},
{id:'exchange-statement',kind:'financial',expect:'reconciliation'},
{id:'multi-currency',kind:'financial',expect:'currency-isolation'},
{id:'duplicate-transactions',kind:'financial',expect:'anomaly'},
{id:'large-file',kind:'scale',expect:'bounded-processing'},
{id:'corrupt-data',kind:'quality',expect:'safe-rejection'}
];
const required=new Set(['structured','mapped','review','ocr','semantic-discovery','reconciliation','currency-isolation','anomaly','bounded-processing','safe-rejection']);
if(process.argv[1]?.endsWith('production-scenario-matrix.mjs')){const actual=new Set(scenarios.map(s=>s.expect));for(const x of required)if(!actual.has(x))process.exit(1);console.log(`Production scenario matrix PASS: ${scenarios.length} scenarios.`);}
