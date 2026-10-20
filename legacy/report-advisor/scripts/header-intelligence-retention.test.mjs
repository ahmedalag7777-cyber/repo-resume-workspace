import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/components/Header.tsx', import.meta.url), 'utf8');
if (!source.includes('{alerts.map')) throw new Error('Header alert feed must render the full alert collection');
if (source.includes('alerts.slice(0, 10)')) throw new Error('Header must not cap alert feed at ten items');
console.log('header-intelligence-retention: PASS');
