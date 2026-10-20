import fs from 'node:fs';

const fail = (message) => { throw new Error(message); };

const command = fs.readFileSync(new URL('../src/pages/ExecutiveCommandCenterPage.tsx', import.meta.url), 'utf8');
const decision = fs.readFileSync(new URL('../src/pages/DecisionExperiencePage.tsx', import.meta.url), 'utf8');

for (const pattern of [
  /fetchDecisionWorkItems\(20\)/,
  /fetchRecentDecisionActivity\(12\)/,
  /alerts\.filter\(\(item\) => !item\.is_read\)\.slice\(0,/,
  /recommendations\.filter\(\(item\) => item\.status === 'new' \|\| item\.status === 'accepted'\)\.slice\(0,/,
  /actionWorkItems[\s\S]*?\.slice\(0,/,
  /recentActivity\.slice\(0,/,
  /workItems\.slice\(0,/,
]) {
  if (pattern.test(command)) fail('Command Center still truncates executive intelligence: ' + pattern);
}

for (const pattern of [
  /alerts\.filter\(\(item\) => !item\.is_read\)\.slice\(0,/,
  /recommendations\.slice\(0,/,
  /relatedWorkItems\.slice\(0,/,
]) {
  if (pattern.test(decision)) fail('Decision Experience still truncates decision intelligence: ' + pattern);
}

console.log('command-decision-intelligence-retention: PASS');
