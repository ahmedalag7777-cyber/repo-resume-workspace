import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/lib/report-execution/renderers.ts', import.meta.url), 'utf8');
const required = [
  'const commandBytes = new TextEncoder().encode(commands).byteLength;',
  'new TextEncoder().encode(pdf).byteLength',
  'const xref = new TextEncoder().encode(pdf).byteLength;',
];
for (const token of required) if (!source.includes(token)) throw new Error(`PDF byte-integrity guard missing: ${token}`);
if (source.includes('<< /Length ${commands.length} >>')) throw new Error('PDF stream length still uses JavaScript character count');
if (source.includes('offsets.push(pdf.length)')) throw new Error('PDF xref offsets still use JavaScript character count');
if (source.includes('const xref = pdf.length;')) throw new Error('PDF startxref still uses JavaScript character count');
console.log('PDF renderer byte-integrity contract: PASS');
