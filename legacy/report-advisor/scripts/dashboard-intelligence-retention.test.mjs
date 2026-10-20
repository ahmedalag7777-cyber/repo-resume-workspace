import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/pages/DashboardPage.tsx', import.meta.url), 'utf8');

const required = [
  "const liveAlerts = useMemo(\n    () => alerts.filter((item) => !item.is_read),",
  "const liveRecommendations = useMemo(\n    () => recommendations.filter((item) => item.status === 'new' || item.status === 'accepted'),",
];
for (const marker of required) {
  if (!source.includes(marker)) throw new Error('Dashboard intelligence retention marker missing: ' + marker);
}
if (source.includes("alerts.filter((item) => !item.is_read).slice(0, 3)")) {
  throw new Error('Dashboard must not cap live alerts at three items');
}
if (source.includes("recommendations.filter((item) => item.status === 'new' || item.status === 'accepted').slice(0, 3)")) {
  throw new Error('Dashboard must not cap live recommendations at three items');
}

console.log('dashboard-intelligence-retention: PASS');
