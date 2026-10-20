import fs from 'node:fs';
import assert from 'node:assert/strict';

const page = fs.readFileSync('src/pages/OperationsPage.tsx', 'utf8');
const businessE2E = fs.readFileSync('scripts/real-business-e2e.mjs', 'utf8');
const lib = fs.readFileSync('src/lib/transactional-spine.ts', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20261002010000_transactional_spine_staff_read_boundary.sql', 'utf8');
const auditBoundary = fs.readFileSync('supabase/migrations/20261002014500_restore_audit_logs_append_only_policy_boundary.sql', 'utf8');
const app = fs.readFileSync('src/App.tsx', 'utf8');
const nav = fs.readFileSync('src/lib/navigation-registry.ts', 'utf8');
const auditMigration = fs.readFileSync('supabase/migrations/20261002013000_operational_transaction_audit.sql', 'utf8');
const repeatabilityMigration = fs.readFileSync('supabase/migrations/20261002022000_e2e_order_repeatability_reset.sql', 'utf8');
const repeatabilityHardening = fs.readFileSync('supabase/migrations/20261002022100_e2e_order_repeatability_reset_no_inventory_mutation.sql', 'utf8');

for (const marker of ['transition_order','create_invoice_from_order','record_sales_payment','fetchOperationalAuditTrace','audit_logs','customer_price_tiers','orders','warehouses']) {
  assert.ok(lib.includes(marker), 'transactional lib missing canonical contract: ' + marker);
}
for (const marker of ['orders_staff_select','order_items_staff_select','price_tiers_staff_select','public.current_company_id()','auth.uid()']) {
  assert.ok(migration.includes(marker), 'transactional migration missing security boundary: ' + marker);
}
for (const marker of ['audit_operational_change','trg_orders_operational_audit','trg_sales_invoices_operational_audit','trg_payments_operational_audit','operations-runtime','AUDIT_TENANT_CONTEXT_MISMATCH']) {
  assert.ok(auditMigration.includes(marker), 'operational audit migration missing: ' + marker);
}
assert.ok(lib.includes('fetchOperationalOrderStatusHistory'));
assert.match(page, /ORDER HISTORY \/ READBACK/);
assert.match(page, /order-status-history/);
assert.match(page, /ORDER → FULFILLMENT/);
assert.match(page, /INVOICE → PAYMENT/);
assert.match(page, /PRICING TRUTH/);
assert.match(page, /SUPPLIER OPERATIONS/);
assert.match(page, /FULFILLMENT \/ WAREHOUSE/);
assert.match(page, /AUDIT \/ TRACE/);
assert.match(page, /data-testid="audit-event-code"/, 'the operations audit trace must expose the persisted action code');
assert.match(businessE2E, /TRANSACTIONAL_ORDER_AUDIT_EVENT_NOT_VISIBLE/);
assert.match(businessE2E, /TRANSACTIONAL_INVOICE_AUDIT_EVENT_NOT_VISIBLE/);
assert.match(businessE2E, /TRANSACTIONAL_ORDER_OPERATIONAL_AUDIT_EVENT_MISSING/);
assert.match(businessE2E, /TRANSACTIONAL_INVOICE_OPERATIONAL_AUDIT_EVENT_MISSING/);
assert.match(businessE2E, /TRANSACTIONAL_PAYMENT_OPERATIONAL_AUDIT_EVENT_MISSING/);
assert.match(page, /READBACK CONTRACT/);
assert.match(page, /READ-ONLY/);

const loadImplementation = page.match(/const load = useCallback\(async \(options: \{ preserveFeedback\?: boolean \} = \{\}\) => \{[\s\S]*?\n  \}, \[\]\);/);
assert.ok(loadImplementation, 'operations load must expose explicit feedback-preservation semantics');
assert.match(loadImplementation[0], /if \(!options\.preserveFeedback\) setFeedback\(null\)/,
  'manual refresh may clear stale feedback, while post-mutation refresh must preserve its confirmation');
assert.equal((page.match(/await load\(\{ preserveFeedback: true \}\);/g) ?? []).length, 3,
  'order, invoice, and payment mutation refreshes must preserve success feedback after persisted readback');

for (const [handler, successMessage] of [
  ['runOrderTransition', 'تم حفظ انتقال الطلب وإعادة قراءة الحالة من المصدر.'],
  ['createInvoice', 'تم تثبيت/قراءة الفاتورة المرتبطة بالطلب من المصدر.'],
  ['submitPayment', 'تم تسجيل الدفعة وإعادة قراءة الفاتورة والرصيد من المصدر.'],
]) {
  const start = page.indexOf(`const ${handler} = async`);
  assert.notEqual(start, -1, handler + ' handler must remain present');
  const end = page.indexOf('\n  };', start);
  assert.notEqual(end, -1, handler + ' handler boundary must remain detectable');
  const body = page.slice(start, end);
  const feedbackAt = body.indexOf(`setFeedback('${successMessage}')`);
  const refreshAt = body.indexOf('await load({ preserveFeedback: true })');
  assert.ok(feedbackAt >= 0 && refreshAt > feedbackAt,
    handler + ' must set its real success feedback before preserving it across canonical reload');
}



assert.match(page, /resolveTenantContext/);
assert.match(page, /function canTransitionOrderForRole/);
assert.match(page, /currentStatus === 'pending'.*\['owner', 'admin', 'sales'\]/);
assert.match(page, /currentStatus === 'confirmed' \|\| currentStatus === 'preparing'.*\['owner', 'admin', 'warehouse'\]/);
assert.match(page, /currentStatus === 'ready'.*\['owner', 'admin', 'warehouse', 'sales'\]/);
assert.match(page, /order-transition-restricted-/,
  'a user without the transition role must see an explanation, not a forbidden action');
assert.match(businessE2E, /TRANSACTIONAL_INITIAL_ACTOR_MUST_BE_SALES/);
assert.match(businessE2E, /TRANSACTIONAL_SALES_FULFILLMENT_ACTION_MUST_BE_HIDDEN/);
assert.match(businessE2E, /TRANSACTIONAL_FULFILLMENT_ACTOR_ADMIN_ROLE_MISSING/);
assert.match(businessE2E, /transactional-order-role-handoff/);

assert.match(page, /NOT IMPLEMENTED/);
assert.match(page, /PERMISSION_DENIED/);
for (const marker of ['drop policy if exists tenant_update','drop policy if exists tenant_delete','revoke update, delete, truncate on table public.audit_logs from authenticated']) {
  assert.ok(auditBoundary.includes(marker), 'audit append-only boundary missing: ' + marker);
}
for (const marker of ['prepare_e2e_order','E2E-ORDER-%','E2E_RESET_ADMIN_REQUIRED','E2E_ORDER_TAG_REQUIRED','e2e_order_reset']) {
  assert.ok(repeatabilityMigration.includes(marker), 'E2E repeatability contract missing: ' + marker);
}
const normalizedRepeatabilityMigration = repeatabilityMigration.toLowerCase().replace(/\s+/g, ' ');
assert.ok(normalizedRepeatabilityMigration.includes('revoke all on function public.prepare_e2e_order(uuid) from public, anon'));
assert.ok(normalizedRepeatabilityMigration.includes('grant execute on function public.prepare_e2e_order(uuid) to authenticated'));
for (const marker of ['prepare_e2e_order','delete from public.payments','delete from public.sales_invoices','order.e2e_reset']) {
  assert.ok(repeatabilityHardening.includes(marker), 'E2E reset hardening missing: ' + marker);
}
assert.match(app, /path="\/operations"/);
assert.match(nav, /path: '\/operations'/);
console.log('PASS: transactional spine surface + canonical RPC + tenant/RLS contract.');
