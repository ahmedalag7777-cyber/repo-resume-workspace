import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const sourceSha = process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const lock = fs.readFileSync(path.join(root, 'package-lock.json'));
const migrationsDir = path.join(root, 'supabase/migrations');
const migrationFiles = fs.readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();
const migrationFingerprint = sha256(Buffer.concat(migrationFiles.flatMap((file) => [Buffer.from(`${file}\n`), fs.readFileSync(path.join(migrationsDir, file))])));
const dependencyFingerprint = sha256(lock);
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const manifest = {
  sourceSha,
  dependencyFingerprint,
  migrationFingerprint,
  packageVersion: packageJson.version || '0.0.0',
};

fs.writeFileSync(path.join(root, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(JSON.stringify({ contract: 'release-manifest-generation', ...manifest }));
