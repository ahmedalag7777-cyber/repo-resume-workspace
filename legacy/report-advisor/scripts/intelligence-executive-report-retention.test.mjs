import fs from 'node:fs';

const fail = (message) => { throw new Error(message); };

const intelligence = fs.readFileSync(new URL('../src/pages/IntelligencePage.tsx', import.meta.url), 'utf8');
const executive = fs.readFileSync(new URL('../src/pages/ExecutiveReportPage.tsx', import.meta.url), 'utf8');

for (const pattern of [
  /activeAlerts\.slice\(0,/,
  /newRecommendations\.slice\(0,/,
]) {
  if (pattern.test(intelligence)) fail('Intelligence page truncates alert/recommendation queues: ' + pattern);
}

for (const pattern of [
  /\(data\?\.alerts \?\? \[\]\)\.slice\(0,/,
  /\(data\?\.recommendations \?\? \[\]\)\.slice\(0,/,
]) {
  if (pattern.test(executive)) fail('Executive report truncates alert/recommendation queues: ' + pattern);
}

if (!intelligence.includes('activeAlerts.map((alert) =>')) fail('Intelligence alerts must render as a complete collection');
if (!intelligence.includes('newRecommendations.map((recommendation) =>')) fail('Intelligence recommendations must render as a complete collection');
if (!executive.includes('(data?.alerts ?? []).map((alert) =>')) fail('Executive report alerts must render as a complete collection');
if (!executive.includes('(data?.recommendations ?? []).map((rec, index) =>')) fail('Executive report recommendations must render as a complete collection');

console.log('intelligence-executive-report-retention: PASS');
