import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const postcss = fs.readFileSync(path.join(root, 'postcss.config.js'), 'utf8');
const dev = pkg.devDependencies ?? {};

if (!postcss.includes('autoprefixer')) throw new Error('PostCSS config requires autoprefixer but does not declare it.');
if (!dev.autoprefixer) throw new Error('autoprefixer must be declared in devDependencies.');
if (!fs.existsSync(path.join(root, 'package-lock.json'))) throw new Error('package-lock.json is required for deterministic CI installs.');

console.log(`PostCSS toolchain: PASS (autoprefixer ${dev.autoprefixer})`);
