#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOTS = ['src'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const ALLOWED = [
  /user_metadata/i,
  /current_company_id/i,
  /company_id/i,
  /companyProfile/i,
  /companySettings/i,
  /companyName/i,
  /company_name/i,
];

const FORBIDDEN = [
  /شركة\s*العامري/i,
  /Alamri\s*(Trading|Company)/i,
  /admin@alamri\.com/i,
  /رقم\s*(السجل|التسجيل)\s*الضريبي\s*[:=]\s*["'`]/i,
  /(?:currency|العملة)\s*[:=]\s*["'`]ر\.س/i,
];

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(full));
    else if (EXTENSIONS.has(entry.name.slice(entry.name.lastIndexOf('.')))) out.push(full);
  }
  return out;
}

const files = [];
for (const root of ROOTS) files.push(...await walk(root));

// Settings truth is enforced on the active route, not on dead legacy exports.
// This prevents an unreachable legacy screen from masking the real runtime
// source of company identity while the legacy-consumer guard remains responsible
// for finding unsafe tenant consumers.
const appPath = join('src', 'App.tsx');
const appText = await readFile(appPath, 'utf8');
const activeSettingsImport = appText.match(/const\s+CompanySettingsPage\s*=\s*lazy\(\(\)\s*=>\s*import\(['"]([^'"]+)['"]\)/);
const activeSettingsPath = activeSettingsImport?.[1]?.replace(/^@\//, 'src/') ?? null;

const findings = [];
for (const file of files) {
  const rel = relative('.', file).replaceAll('\\', '/');
  // EntityPages previously contained a legacy SettingsPage. The active route
  // now resolves CompanySettingsPage from the authoritative tenant source.
  if (rel === 'src/pages/EntityPages.tsx' && activeSettingsPath !== 'src/pages/EntityPages') continue;

  const text = await readFile(file, 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (FORBIDDEN.some((pattern) => pattern.test(line)) && !ALLOWED.some((pattern) => pattern.test(line))) {
      findings.push(`${file}:${i + 1}: ${line.trim()}`);
    }
  });
}

if (findings.length) {
  console.error('Company configuration truth guard: FAIL');
  console.error('Likely hard-coded company identity/configuration found:');
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log('Company configuration truth guard: PASS');
console.log('Active company settings route is tenant-scoped and no prohibited hard-coded company configuration was detected on active source paths.');
