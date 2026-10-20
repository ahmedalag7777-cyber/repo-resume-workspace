import { execFileSync } from 'node:child_process';

const normalize = value => String(value ?? '').replaceAll('\\r\\n', '\\n').trim();

export function validateCertificationBoundary({ index: _index, head, parent }) {
  if (!/^[0-9a-f]{40}$/.test(String(head ?? ''))) {
    throw new Error('CERTIFICATION BOUNDARY FAIL: invalid certification HEAD');
  }

  const actualHead = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (actualHead !== head) {
    throw new Error(`CERTIFICATION BOUNDARY FAIL: certification HEAD ${head} is not the checked-out repository HEAD ${actualHead}`);
  }

  if (process.env.CERTIFICATION_SHA && normalize(process.env.CERTIFICATION_SHA).toLowerCase() !== head.toLowerCase()) {
    throw new Error(`CERTIFICATION BOUNDARY FAIL: CERTIFICATION_SHA ${process.env.CERTIFICATION_SHA} differs from checked-out HEAD ${head}`);
  }

  if (parent) {
    const actualParent = execFileSync('git', ['rev-parse', 'HEAD^'], { encoding: 'utf8' }).trim();
    if (actualParent !== parent) {
      throw new Error(`CERTIFICATION BOUNDARY FAIL: supplied parent ${parent} differs from checked-out HEAD parent ${actualParent}`);
    }
  }

  return true;
}

if (process.argv[1]?.endsWith('check-certification-boundary-integrity.mjs')) {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const parent = execFileSync('git', ['rev-parse', 'HEAD^'], { encoding: 'utf8' }).trim();
  validateCertificationBoundary({ head, parent });
  console.log(`CERTIFICATION BOUNDARY PASS: source=git-checkout HEAD=${head}`);
}