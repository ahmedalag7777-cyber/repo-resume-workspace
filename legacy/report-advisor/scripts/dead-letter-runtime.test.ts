import { DeadLetterQueue, toDeadLetter } from '../src/lib/report-execution/dead-letter.ts';

const record = toDeadLetter({ id: 'dlq-1', payload: { job: 1 }, reason: 'parse-failed', attempts: 2, sourceHash: 'source-1', createdAt: 123 });
if (record.createdAt !== 123 || record.attempts !== 2) throw new Error('dead-letter record construction failed');
const queue = new DeadLetterQueue<typeof record.payload>();
queue.enqueue(record);
if (queue.size() !== 1 || queue.list()[0].id !== 'dlq-1') throw new Error('dead-letter enqueue/list failed');
let duplicateRejected = false;
try { queue.enqueue(record); } catch { duplicateRejected = true; }
if (!duplicateRejected) throw new Error('duplicate dead-letter must be rejected');
let invalidRejected = false;
try { toDeadLetter({ id: 'dlq-2', payload: {}, reason: 'x', attempts: 0, sourceHash: 'source-1' }); } catch { invalidRejected = true; }
if (!invalidRejected) throw new Error('invalid dead-letter attempts must be rejected');
console.log('DEAD_LETTER_RUNTIME_TEST: PASS');
