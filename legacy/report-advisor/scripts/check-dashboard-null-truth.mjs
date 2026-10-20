import fs from 'node:fs';

const canonical = fs.readFileSync('src/lib/dashboard-canonical.ts', 'utf8');
const dashboard = fs.readFileSync('src/pages/DashboardPage.tsx', 'utf8');

for (const field of ['totalCustomers', 'totalProducts', 'invoiceCount']) {
  if (!new RegExp(`${field}:number\\|null`).test(canonical)) {
    throw new Error(`${field} must preserve unknown/null state in the public KPI contract`);
  }
  if (!new RegExp(`${field}:(?: finiteOrNull|valueOrNull)\\(row\\.${field}\\)`).test(canonical)) {
    throw new Error(`${field} must preserve unknown/null rather than coercing it to zero`);
  }
}

if (!canonical.includes("const valueOrNull = (value: unknown): number | null => status === 'INSUFFICIENT_DATA' ? null : finiteOrNull(value);")) {
  throw new Error('Dashboard canonical adapter must explicitly null all metrics when authoritative data is insufficient');
}
if (!canonical.includes("asOf: typeof row.asOf === 'string' ? row.asOf : asOfDate()")) {
  throw new Error('Dashboard canonical adapter must expose authoritative as-of metadata');
}
if (!canonical.includes("rawStatus === 'CONFIRMED' && !hasEvidence")) {
  throw new Error('Dashboard canonical adapter must not claim CONFIRMED without evidence');
}
const metricStatusContract = /const\s+metricStatus\s*=\s*\(\s*value:\s*number\s*\|\s*null,\s*snapshotStatus:\s*DashboardKPIs\['status'\]\s*,\s*\)\s*:\s*['"]CONFIRMED['"]\s*\|\s*['"]CALCULATED['"]\s*\|\s*['"]INSUFFICIENT_DATA['"]\s*=>\s*value\s*===\s*null\s*\?\s*['"]INSUFFICIENT_DATA['"]\s*:\s*snapshotStatus\s*===\s*['"]CONFIRMED['"]\s*\?\s*['"]CONFIRMED['"]\s*:\s*['"]CALCULATED['"]\s*;/;
if (!metricStatusContract.test(dashboard)) {
  throw new Error('Dashboard must preserve null per metric while retaining CONFIRMED/CALCULATED source semantics');
}
if (!dashboard.includes("asOf={snapshotAsOf ?? 'غير متاح'}")) {
  throw new Error('Dashboard must render authoritative snapshot as-of instead of local browser date');
}

for (const field of ['totalSales', 'grossProfit', 'totalReceivables', 'inventoryValue']) {
  const usage = new RegExp(`status\\s*=\\s*\\{metricStatus\\(kpis\\.${field},\\s*kpis\\.status\\)\\}`);
  if (!usage.test(dashboard)) {
    throw new Error(`${field} primary KPI must preserve confirmed finite zero values independently`);
  }
}

const secondaryMetricPattern = /\{kpis\.(totalCustomers|totalProducts|invoiceCount|collectionRate)\s*===\s*null\s*\?\s*['"]غير متاح['"]\s*:\s*kpis\.\1(?:\s*\+\s*['"]%['"])?\}/;
for (const field of ['totalCustomers', 'totalProducts', 'invoiceCount', 'collectionRate']) {
  if (!secondaryMetricPattern.test(dashboard)) {
    throw new Error(`${field} secondary KPI presentation must preserve null while retaining confirmed zero values`);
  }
  if (!new RegExp(`\\{kpis\\.${field}\\s*===\\s*null\\s*\\?`).test(dashboard)) {
    throw new Error(`${field} secondary KPI must explicitly test null before rendering a value`);
  }
}

console.log('Dashboard numeric truth contract: PASS');
