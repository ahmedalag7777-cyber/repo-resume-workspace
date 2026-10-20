import assert from 'node:assert/strict';

const targets = { read_p95_ms:300, write_p95_ms:800, preview_p95_ms:1500 };
function evaluate(metrics) {
  for (const [key, limit] of Object.entries(targets)) {
    assert(Number.isFinite(metrics[key]), `${key.toUpperCase()}_REQUIRED`);
    assert(metrics[key] <= limit, `${key.toUpperCase()}_BUDGET_EXCEEDED`);
  }
  assert(metrics.error_rate >= 0 && metrics.error_rate <= 1, 'ERROR_RATE_INVALID');
  assert(metrics.retry_rate >= 0 && metrics.retry_rate <= 1, 'RETRY_RATE_INVALID');
  return { status:'PASS', targets };
}
assert.equal(evaluate({read_p95_ms:120,write_p95_ms:420,preview_p95_ms:900,error_rate:0.001,retry_rate:0.002}).status,'PASS');
assert.throws(()=>evaluate({read_p95_ms:301,write_p95_ms:420,preview_p95_ms:900,error_rate:0,retry_rate:0}),/READ_P95_MS_BUDGET_EXCEEDED/);
assert.throws(()=>evaluate({read_p95_ms:100,write_p95_ms:801,preview_p95_ms:900,error_rate:0,retry_rate:0}),/WRITE_P95_MS_BUDGET_EXCEEDED/);
assert.throws(()=>evaluate({read_p95_ms:100,write_p95_ms:400,preview_p95_ms:1501,error_rate:0,retry_rate:0}),/PREVIEW_P95_MS_BUDGET_EXCEEDED/);
assert.throws(()=>evaluate({read_p95_ms:100,write_p95_ms:400,preview_p95_ms:900,error_rate:-.1,retry_rate:0}),/ERROR_RATE_INVALID/);
assert.throws(()=>evaluate({read_p95_ms:100,write_p95_ms:400,preview_p95_ms:900,error_rate:0,retry_rate:1.1}),/RETRY_RATE_INVALID/);
console.log('performance reliability gate: PASS');
