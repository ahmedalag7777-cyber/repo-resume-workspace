import fs from 'node:fs';

const path = 'src/lib/file-engine/security.ts';
const source = fs.readFileSync(path, 'utf8');
const failures = [];

const canonicalIndex = source.indexOf(".from('canonical_import_commits')");
const legacyIndex = source.indexOf(".from('file_records')");
if (canonicalIndex < 0) failures.push('canonical_import_commits lookup missing');
if (legacyIndex < 0) failures.push('file_records fallback lookup missing');
if (canonicalIndex >= 0 && legacyIndex >= 0 && canonicalIndex >= legacyIndex) failures.push('canonical source identity must be checked before legacy file_records fallback');
if (!/normalizedHash\s*=\s*hash\.trim\(\)\.toLowerCase\(\)/.test(source)) failures.push('source hash normalization missing');
if (!/canonicalHash\s*=\s*`sha256:\$\{normalizedHash\}`/.test(source)) failures.push('canonical sha256 identity normalization missing');
if (!/\.eq\('company_id', companyId\)/.test(source)) failures.push('tenant binding missing');
if (!/\.eq\('source_hash', canonicalHash\)/.test(source)) failures.push('canonical source_hash binding missing');
if (!/status:\s*'committed'/.test(source)) failures.push('canonical committed duplicate mapping missing');
if (!/historical file metadata/.test(source)) failures.push('legacy fallback must remain explicitly subordinate to canonical identity');

if (failures.length) {
  console.error('Duplicate identity contract: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Duplicate identity contract: PASS (canonical_import_commits is authoritative; file_records is legacy fallback; tenant/hash normalization enforced)');
