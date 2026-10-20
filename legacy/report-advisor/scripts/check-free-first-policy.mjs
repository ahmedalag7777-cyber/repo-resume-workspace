import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const allDeps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

// Explicitly paid/hosted SDK families are forbidden unless an intentional
// project exception is documented in the master reference. Local/open-source
// adapters such as Ollama/Tesseract remain allowed and do not require billing.
const forbiddenPackages = [
  /^openai$/i,
  /^@anthropic-ai\//i,
  /^@google-ai\//i,
  /^cohere-ai$/i,
  /^mistralai$/i,
  /^groq-sdk$/i,
  /^replicate$/i,
  /^@aws-sdk\/client-bedrock-runtime$/i,
  /^@azure\/openai$/i,
];

const forbidden = Object.keys(allDeps).filter((name) => forbiddenPackages.some((rx) => rx.test(name)));
if (forbidden.length) {
  console.error('FREE_FIRST_POLICY=FAIL');
  console.error(`Forbidden paid/hosted SDK dependency: ${forbidden.join(', ')}`);
  process.exit(1);
}

const sourceRoots = ['src', 'scripts', 'services'];
const paidMarkers = [
  /api\.openai\.com/i,
  /api\.anthropic\.com/i,
  /generativelanguage\.googleapis\.com/i,
  /api\.cohere\.ai/i,
  /api\.replicate\.com/i,
];

const files = [];
function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(mjs|cjs|js|ts|tsx|py)$/.test(entry.name)) files.push(full);
  }
}
for (const rootDir of sourceRoots) walk(path.join(root, rootDir));

const hits = [];
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const marker of paidMarkers) {
    if (marker.test(text)) hits.push(path.relative(root, file));
  }
}

if (hits.length) {
  console.error('FREE_FIRST_POLICY=FAIL');
  console.error('Paid-provider endpoint markers found in runtime source:');
  [...new Set(hits)].forEach((file) => console.error(`- ${file}`));
  process.exit(1);
}

console.log(`FREE_FIRST_POLICY=PASS (${Object.keys(allDeps).length} dependencies checked; no forbidden paid AI SDKs/endpoints found)`);
console.log('Local/open-source providers remain permitted; no paid fallback is authorized by this guard.');
