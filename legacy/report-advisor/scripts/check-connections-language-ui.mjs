import fs from 'node:fs';
const read = p => fs.readFileSync(p, 'utf8');
const app = read('src/App.tsx');
const header = read('src/components/Header.tsx');
const sidebar = read('src/components/Sidebar.tsx');
const language = read('src/lib/language.tsx');
const connections = read('src/pages/ConnectionsPage.tsx');
const toggle = read('src/components/LanguageToggle.tsx');
const checks = [
  ['connections route', app.includes('ConnectionsPage') && app.includes('path="/connections"')],
  ['language provider', app.includes('LanguageProvider') && language.includes('document.documentElement.dir')],
  ['language toggle', header.includes('LanguageToggle') && toggle.includes('toggleLanguage')],
  ['rtl/ltr shell', app.includes('className="ag-app-shell flex min-h-screen flex-row') && app.includes('dir={direction}') && language.includes("language === 'ar' ? 'rtl' : 'ltr'")],
  ['source connectors', connections.includes('Store / API') && connections.includes('Excel / CSV') && connections.includes('PDF & Arabic documents')],
  ['claim-safe adapter state', connections.includes('No connection claim before runtime proof') && connections.includes('ما لا ندّعيه')],
  ['sidebar source entry', sidebar.includes('/connections') || connections.includes('Sources & Connections')],
];
for (const [name, ok] of checks) if (!ok) throw new Error('FAIL: ' + name);
console.log('connections and language product contract: PASS');
console.log('checks:', checks.length);
