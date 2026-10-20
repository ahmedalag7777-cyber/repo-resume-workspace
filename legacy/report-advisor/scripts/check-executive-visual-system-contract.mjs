#!/usr/bin/env node

import { readFileSync } from 'node:fs';

const cssPath = 'src/styles/executive-intelligence-v2.css';
const mainPath = 'src/main.tsx';

const css = readFileSync(cssPath, 'utf8');
const main = readFileSync(mainPath, 'utf8');

const requiredTokens = [
  '--ag-ui-bg',
  '--ag-ui-surface',
  '--ag-ui-teal',
  '--ag-ui-gold',
  '--ag-ui-danger-soft',
  '.ag-journey-track',
  '.ag-command-hero',
  '.ag-reports-center-surface',
  '[data-truth-state="verified"]',
  '[data-next-action="true"]',
  '@media (prefers-reduced-motion: reduce)',
];

for (const token of requiredTokens) {
  if (!css.includes(token)) {
    throw new Error(`UX_VISUAL_CONTRACT_MISSING:${token}`);
  }
}

const importLine = "import './styles/executive-intelligence-v2.css';";
if (!main.includes(importLine)) {
  throw new Error('UX_VISUAL_CONTRACT_MISSING_MAIN_IMPORT');
}

if ((css.match(/{/g) ?? []).length !== (css.match(/}/g) ?? []).length) {
  throw new Error('UX_VISUAL_CONTRACT_UNBALANCED_CSS_BRACES');
}

if (!css.includes('direction: rtl') && !main.includes('dir="rtl"') && !main.includes("dir={")) {
  throw new Error('UX_VISUAL_CONTRACT_RTL_SIGNAL_MISSING');
}

console.log(JSON.stringify({
  status: 'PASS',
  cssPath,
  mainPath,
  tokenCount: requiredTokens.length,
  rtl: true,
  reducedMotion: true,
}, null, 2));
