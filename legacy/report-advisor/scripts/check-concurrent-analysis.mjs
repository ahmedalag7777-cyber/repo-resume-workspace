import assert from 'node:assert/strict';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class Registry {
  constructor() {
    this.latest = new Map();
    this.inflight = new Map();
  }

  key(revision) {
    return `${revision.tenantId}:${revision.key}`;
  }

  async run(request) {
    const key = this.key(request.revision);
    const requested = request.revision.revision;
    const current = this.latest.get(key) ?? 0;

    if (requested < current) {
      return { accepted: false, reason: 'superseded' };
    }

    const existing = this.inflight.get(key);
    if (existing?.revision === requested) {
      const value = await existing.promise;
      if ((this.latest.get(key) ?? 0) !== requested) {
        return { accepted: false, reason: 'superseded' };
      }
      return { accepted: true, value, reason: 'coalesced' };
    }

    this.latest.set(key, requested);
    const promise = request.compute();
    this.inflight.set(key, { revision: requested, promise });

    try {
      const value = await promise;
      if ((this.latest.get(key) ?? 0) !== requested) {
        return { accepted: false, reason: 'superseded' };
      }
      return { accepted: true, value, reason: 'accepted' };
    } finally {
      if (this.inflight.get(key)?.promise === promise) {
        this.inflight.delete(key);
      }
    }
  }

  invalidate(tenantId, key, revision) {
    const registryKey = `${tenantId}:${key}`;
    this.latest.set(registryKey, Math.max(revision, this.latest.get(registryKey) ?? 0));
  }
}

const registry = new Registry();
let computes = 0;

const first = registry.run({
  revision: { tenantId: 't1', key: 'group:A', revision: 1 },
  compute: async () => {
    computes += 1;
    await delay(25);
    return 'old';
  },
});

const coalesced = registry.run({
  revision: { tenantId: 't1', key: 'group:A', revision: 1 },
  compute: async () => {
    computes += 1;
    return 'duplicate';
  },
});

await delay(2);
registry.invalidate('t1', 'group:A', 2);

const newer = registry.run({
  revision: { tenantId: 't1', key: 'group:A', revision: 2 },
  compute: async () => {
    computes += 1;
    await delay(5);
    return 'new';
  },
});

const [oldResult, coalescedResult, newResult] = await Promise.all([
  first,
  coalesced,
  newer,
]);

assert.equal(oldResult.accepted, false);
assert.equal(oldResult.reason, 'superseded');
assert.equal(coalescedResult.accepted, false);
assert.equal(coalescedResult.reason, 'superseded');
assert.equal(newResult.accepted, true);
assert.equal(newResult.value, 'new');
assert.equal(computes, 2);

const olderAfter = await registry.run({
  revision: { tenantId: 't1', key: 'group:A', revision: 1 },
  compute: async () => {
    computes += 1;
    return 'too-old';
  },
});

assert.equal(olderAfter.accepted, false);
assert.equal(olderAfter.reason, 'superseded');

console.log('concurrent analysis fixtures: PASS (coalescing, supersession, revision isolation)');
