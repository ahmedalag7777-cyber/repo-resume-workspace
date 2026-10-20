import { readdir, readFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { parseFile } from '../src/lib/file-engine/adapters.ts';

const root = resolve('tests/fixtures/realistic-reports');
const entries = await readdir(root, { withFileTypes: true, recursive: true });
const files = [...new Map(entries
  .filter((entry) => entry.isFile())
  .map((entry) => {
    const fullPath = resolve(entry.parentPath, entry.name);
    return [fullPath, { name: entry.name, fullPath }];
  }))
  .values()]
  .sort((a, b) => a.fullPath.localeCompare(b.fullPath));

const failures = [];
const summary = [];
for (const file of files) {
  const ext = extname(file.name).toLowerCase();
  const format = ext === '.csv' ? 'csv' : ext === '.json' ? 'json' : ext === '.md' ? 'markdown' : null;
  if (!format) continue;
  try {
    const buffer = await readFile(file.fullPath);
    const slice = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const datasets = await parseFile(slice, file.name, format);
    const rows = datasets.reduce((n, d) => n + d.rowCount, 0);
    const cols = Math.max(0, ...datasets.map((d) => d.columnCount));
    summary.push({ name: file.fullPath.slice(root.length + 1), format, datasets: datasets.length, rows, cols });
  } catch (error) {
    failures.push({ name: file.fullPath.slice(root.length + 1), format, error: String(error) });
  }
}
console.log('FILES', files.length, 'PARSED', summary.length, 'FAILED', failures.length);
for (const item of summary) console.log('PASS', item.name, item.format, 'datasets=' + item.datasets, 'rows=' + item.rows, 'cols=' + item.cols);
for (const item of failures) console.log('FAIL', item.name, item.error);
if (failures.length) process.exit(1);
