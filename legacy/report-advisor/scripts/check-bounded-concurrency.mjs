import assert from 'node:assert/strict';

class Pool {
  constructor(limit = 4, maxQueue = 20) {
    this.limit = limit;
    this.maxQueue = maxQueue;
    this.active = 0;
    this.queue = [];
  }

  run(task) {
    if (this.active < this.limit) return this.start(task);
    if (this.queue.length >= this.maxQueue) return Promise.reject(new Error('queue limit'));
    return new Promise((resolve, reject) => {
      this.queue.push(() => this.start(task).then(resolve, reject));
    });
  }

  start(task) {
    this.active++;
    return Promise.resolve()
      .then(task)
      .finally(() => {
        this.active--;
        const next = this.queue.shift();
        if (next) next();
      });
  }
}

const pool = new Pool(4, 20);
let active = 0;
let maxActive = 0;
let completed = 0;

const work = async () => {
  active++;
  maxActive = Math.max(maxActive, active);
  await new Promise((resolve) => setTimeout(resolve, 1));
  active--;
  completed++;
};

// Respect admission capacity: never submit more than active + queue capacity.
// This makes the fixture deterministic and models the required producer backpressure.
for (let offset = 0; offset < 100; offset += 24) {
  const batchSize = Math.min(24, 100 - offset);
  await Promise.all(Array.from({ length: batchSize }, () => pool.run(work)));
}

assert.equal(completed, 100);
assert.equal(maxActive, 4);
assert.equal(pool.active, 0);
assert.equal(pool.queue.length, 0);

// A full queue must reject explicitly instead of growing without bound.
const saturated = new Pool(1, 1);
const blocker = saturated.run(async () => {
  await new Promise((resolve) => setTimeout(resolve, 5));
});
const queued = saturated.run(async () => {});
await assert.rejects(() => saturated.run(async () => {}), /queue limit/);
await Promise.all([blocker, queued]);
assert.equal(saturated.active, 0);
assert.equal(saturated.queue.length, 0);

// Task failures must propagate while the pool still drains cleanly.
const failing = new Pool(1, 2);
await assert.rejects(() => failing.run(async () => { throw new Error('task failure'); }), /task failure/);
assert.equal(failing.active, 0);
assert.equal(failing.queue.length, 0);

console.log('bounded concurrency fixture: PASS (limit, bounded queue, backpressure, failure cleanup)');
