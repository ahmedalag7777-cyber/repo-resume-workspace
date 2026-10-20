import fs from 'node:fs';

const page = fs.readFileSync(new URL('../src/pages/LoginPage.tsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');
for (const marker of ['من أول تقرير.','إلى قرار يمكن متابعته وقياسه.','ما الذي يحصل عليه العميل','Evidence-first','Provenance','Decision','Outcome','Arabic-first']) {
  if (!page.includes(marker)) throw new Error('Customer login value marker missing: ' + marker);
}
if (!page.includes('ag-login-value')) throw new Error('Login must expose the executive value surface hook');
if (!css.includes('.ag-login-value')) throw new Error('Login executive value surface styling missing');
console.log('commercial-login-value-surface: PASS');
