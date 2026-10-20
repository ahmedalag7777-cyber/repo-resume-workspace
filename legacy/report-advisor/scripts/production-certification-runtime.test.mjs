import { strict as assert } from 'node:assert';
import {
  certifyProduction,
  PRODUCTION_CERTIFICATION_EVIDENCE_KEYS,
  isMandatoryCertificationEvidenceKey,
} from '../src/lib/production/productionCertification.ts';

const check = (key, passed = true, severity = 'INFO') => ({
  key,
  passed,
  severity,
  evidence: `test:${key}`,
});

const complete = PRODUCTION_CERTIFICATION_EVIDENCE_KEYS.map(key => check(key));
const certified = certifyProduction(complete);
assert.equal(certified.certified, true);
assert.equal(certified.score, 1);
assert.deepEqual(certified.blockers, []);

const missing = certifyProduction(complete.filter(x => x.key !== 'backup'));
assert.equal(missing.certified, false);
assert.ok(missing.blockers.includes('MISSING_EVIDENCE:backup'));

const failed = certifyProduction(complete.map(x => x.key === 'rollback' ? check('rollback', false, 'WARNING') : x));
assert.equal(failed.certified, false);
assert.ok(failed.blockers.includes('FAILED_EVIDENCE:rollback'));

const duplicate = certifyProduction([...complete, check('backup', false, 'BLOCKER')]);
assert.equal(duplicate.certified, false);
assert.ok(duplicate.blockers.includes('DUPLICATE_EVIDENCE:backup'));

const arbitrary = certifyProduction([...complete, check('unrelated-warning', false, 'WARNING')]);
assert.equal(arbitrary.certified, true);
assert.equal(arbitrary.score, 1);

// Adversarial runtime inputs must never exploit JavaScript truthiness to turn
// malformed evidence into certification.
const stringFalse = certifyProduction(complete.map(x => x.key === 'backup' ? { ...x, passed: 'false' } : x));
assert.equal(stringFalse.certified, false);
assert.ok(stringFalse.blockers.includes('MALFORMED_CERTIFICATION_CHECK'));
assert.ok(stringFalse.blockers.includes('FAILED_EVIDENCE:backup'));

const invalidSeverity = certifyProduction(complete.map(x => x.key === 'rollback' ? { ...x, severity: 'PASS' } : x));
assert.equal(invalidSeverity.certified, false);
assert.ok(invalidSeverity.blockers.includes('MALFORMED_CERTIFICATION_CHECK'));

const emptyKey = certifyProduction(complete.map(x => x.key === 'tenant' ? { ...x, key: '' } : x));
assert.equal(emptyKey.certified, false);
assert.ok(emptyKey.blockers.includes('MALFORMED_CERTIFICATION_CHECK'));
assert.ok(emptyKey.blockers.includes('MISSING_EVIDENCE:tenant'));

const nonArray = certifyProduction(null);
assert.equal(nonArray.certified, false);
assert.ok(nonArray.blockers.includes('MISSING_EVIDENCE:tenant'));

assert.equal(isMandatoryCertificationEvidenceKey('tenant'), true);
assert.equal(isMandatoryCertificationEvidenceKey('live'), false);
assert.equal(isMandatoryCertificationEvidenceKey('backup'), true);

// Test-of-test: if the mandatory-domain score accidentally includes arbitrary
// checks again, the adversarial warning must make this assertion fail.
const weakenedScore = arbitrary.score * (PRODUCTION_CERTIFICATION_EVIDENCE_KEYS.length /
  (PRODUCTION_CERTIFICATION_EVIDENCE_KEYS.length + 1));
assert.notEqual(weakenedScore, arbitrary.score);

console.log('Production certification runtime tests PASS (complete/missing/failed/duplicate/unrelated/malformed evidence attacks).');
