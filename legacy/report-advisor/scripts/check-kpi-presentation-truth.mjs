import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const targets=['src/lib/queries.ts','src/pages/ReportsPage.tsx'];
const forbidden=['بيانات العميل ناقصة','بيانات المنتج ناقصة','بيانات الفئة ناقصة'];
const findings=[];
for(const file of targets){const full=path.join(root,file);if(!fs.existsSync(full))throw new Error(`Missing KPI surface: ${file}`);const text=fs.readFileSync(full,'utf8');for(const token of forbidden)if(text.includes(token))findings.push(`${file}: ${token}`);}
if(findings.length){console.error('Misleading business-data presentation fallbacks detected:');for(const finding of findings)console.error(`  ${finding}`);process.exit(1);}
console.log('KPI presentation truth guard: PASS (no fabricated customer/product/category business meaning).');
