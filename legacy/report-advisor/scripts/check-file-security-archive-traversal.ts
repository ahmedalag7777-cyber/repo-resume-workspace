import { securityScan } from '../src/lib/file-engine/security.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Archive security regression failed: ${message}`);
}

function u16(value: number): number[] { return [value & 0xff, (value >>> 8) & 0xff]; }
function u32(value: number): number[] { return [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff]; }

function makeZipEntry(name: string): Uint8Array {
  const nameBytes = new TextEncoder().encode(name);
  const local = [0x50,0x4b,0x03,0x04, ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(0), ...u32(0), ...u16(nameBytes.length), ...u16(0), ...nameBytes];
  const central = [0x50,0x4b,0x01,0x02, ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(0), ...u32(0), ...u16(nameBytes.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(0), ...nameBytes];
  const eocd = [0x50,0x4b,0x05,0x06, ...u16(0), ...u16(0), ...u16(1), ...u16(1), ...u32(central.length), ...u32(local.length), ...u16(0)];
  // Keep the synthetic ZIP above the tiny-file archive-bomb heuristic so this
  // test isolates path traversal rather than triggering the size warning.
  return new Uint8Array([...local, ...central, ...eocd, ...new Array(100).fill(0)]);
}

function scan(name: string) {
  const bytes = makeZipEntry(name);
  return securityScan(new File([bytes], 'upload.zip', { type: 'application/zip' }), bytes.buffer);
}

const safe = scan('reports/2026/report.csv');
assert(safe.passed && !safe.isZipTraversal, 'normal nested ZIP entries must remain accepted');

const traversal = scan('../outside.txt');
assert(!traversal.passed && traversal.isZipTraversal, 'parent traversal entry must be rejected');

const nestedTraversal = scan('reports/../../outside.txt');
assert(!nestedTraversal.passed && nestedTraversal.isZipTraversal, 'nested parent traversal entry must be rejected');

const absolute = scan('/absolute/path.txt');
assert(!absolute.passed && absolute.isZipTraversal, 'absolute POSIX entry path must be rejected');

const windowsAbsolute = scan('C:/absolute/path.txt');
assert(!windowsAbsolute.passed && windowsAbsolute.isZipTraversal, 'absolute Windows entry path must be rejected');

console.log('File security archive traversal: PASS');
