import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const required = [
  'REPORT_ADVISOR_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];

for (const name of required) {
  if (!process.env[name]?.trim()) throw new Error('E2E_ACTOR_ENV_MISSING:' + name);
}

const REQUEST_TIMEOUT_MS = Number(process.env.E2E_ACTOR_REQUEST_TIMEOUT_MS || '15000');
const ANON_KEY = process.env.REPORT_ADVISOR_SUPABASE_ANON_KEY?.trim() || '';
if (!ANON_KEY) throw new Error('E2E_ACTOR_ENV_MISSING:REPORT_ADVISOR_SUPABASE_ANON_KEY');
const POSTGREST_RETRYABLE_HTTP = new Set([408, 425, 429, 500, 502, 503, 504]);
const POSTGREST_RETRY_ATTEMPTS = 12;
const AUTH_RETRY_ATTEMPTS = 4;
const PROVISION_DEADLINE_MS = Number(process.env.E2E_ACTOR_PROVISION_DEADLINE_MS || '360000');
const PROVISION_DEADLINE_AT = Date.now() + PROVISION_DEADLINE_MS;

function assertProvisionDeadline(step) {
  if (Date.now() > PROVISION_DEADLINE_AT) throw new Error('E2E_ACTOR_PROVISION_DEADLINE_EXCEEDED:' + step);
}

function requestUrl(input) {
  return typeof input === 'string' ? input : input instanceof URL ? input.href : input?.url ?? '';
}

function isPostgrestRequest(input) {
  const url = requestUrl(input);
  return /\/rest\/v1\//.test(url) || /\/rpc\//.test(url);
}

function isAuthRequest(input) {
  return /\/auth\/v1\//.test(requestUrl(input));
}

async function fetchWithTimeout(input, init = {}) {
  let lastError = null;
  const postgrestRetryable = isPostgrestRequest(input);
  const authRetryable = isAuthRequest(input);
  const retryable = postgrestRetryable || authRetryable;
  const attempts = postgrestRetryable
    ? POSTGREST_RETRY_ATTEMPTS
    : authRetryable
      ? AUTH_RETRY_ATTEMPTS
      : 1;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    assertProvisionDeadline('http-attempt-' + attempt);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error('E2E_ACTOR_REQUEST_TIMEOUT')), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      if (!retryable || !POSTGREST_RETRYABLE_HTTP.has(response.status) || attempt === attempts) return response;
      lastError = new Error('E2E_POSTGREST_RETRYABLE_HTTP_' + response.status);
    } catch (error) {
      lastError = error;
      if (!retryable || attempt === attempts) throw error;
    } finally {
      clearTimeout(timer);
    }
    await wait(Math.min(8000, 500 * 2 ** (attempt - 1)));
  }

  throw lastError ?? new Error('E2E_POSTGREST_RETRY_EXHAUSTED');
}

const supabase = createClient(
  process.env.REPORT_ADVISOR_SUPABASE_URL.trim(),
  process.env.SUPABASE_SERVICE_ROLE_KEY.trim(),
  {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: fetchWithTimeout },
  },
);

const anon = createClient(
  process.env.REPORT_ADVISOR_SUPABASE_URL.trim(),
  ANON_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { fetch: fetchWithTimeout },
  },
);

const ACTOR_METADATA = {
  e2e_actor: 'true',
  e2e_purpose: 'full-product-browser-e2e',
};

function isRetryableAuthLookup(error) {
  const status = Number(error?.status ?? 0);
  return [408, 425, 429, 500, 502, 503, 504].includes(status)
    || error?.name === 'AbortError'
    || String(error?.message || '').includes('E2E_ACTOR_REQUEST_TIMEOUT');
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function findUserByEmail(email) {
  for (let page = 1; page <= 10; page += 1) {
    assertProvisionDeadline('find-user-page-' + page);
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      assertProvisionDeadline('find-user-attempt-' + page + '-' + attempt);
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (!error) {
        const user = (data.users ?? []).find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
        if (user) return { user, lookupUnavailable: false };
        if ((data.users ?? []).length < 1000) return { user: null, lookupUnavailable: false };
        break;
      }

      if (!isRetryableAuthLookup(error) || attempt === 3) {
        if (isRetryableAuthLookup(error)) return { user: null, lookupUnavailable: true };
        throw error;
      }

      await wait(1000 * 2 ** (attempt - 1));
    }
  }
  return { user: null, lookupUnavailable: false };
}

function runId() {
  return String(process.env.GITHUB_RUN_ID || process.env.E2E_ACTOR_RUN_ID || Date.now()).replace(/[^0-9]/g, '');
}

function actorCredentials(label) {
  const normalized = label.toLowerCase();
  const suffix = runId();
  const unique = randomBytes(6).toString('hex');
  const email = 'e2e-' + normalized + '-' + suffix + '-' + unique + '@e2e.report-advisor.invalid';
  const password = 'E2e-' + normalized + '-' + randomBytes(24).toString('base64url') + '!';
  return { email, password, generated: true };
}

function persistActorCredentials(label, email, password) {
  const fields = label === 'A'
    ? { email: 'TEST_USER_A_EMAIL', password: 'TEST_USER_A_PASSWORD' }
    : label === 'B'
      ? { email: 'TEST_USER_B_EMAIL', password: 'TEST_USER_B_PASSWORD' }
      : label === 'C'
        ? { email: 'TEST_USER_C_EMAIL', password: 'TEST_USER_C_PASSWORD' }
        : { email: 'TEST_APPROVER_EMAIL', password: 'TEST_APPROVER_PASSWORD' };

  if (process.env.GITHUB_ENV) {
    fs.appendFileSync(process.env.GITHUB_ENV, fields.email + '=' + email + '\n' + fields.password + '=' + password + '\n');
  }
  process.env[fields.email] = email;
  process.env[fields.password] = password;
}

async function signInConfiguredActor(email, password) {
  assertProvisionDeadline('sign-in-configured-actor');
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error) throw error;
  assert.ok(data.user?.id, 'E2E_CONFIGURED_ACTOR_ID_REQUIRED');
  await anon.auth.signOut().catch(() => undefined);
  return data.user;
}

async function createActor(email, password) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    assertProvisionDeadline('create-actor-attempt-' + attempt);
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: ACTOR_METADATA,
      });
      if (!error) {
        assert.ok(data.user?.id, 'E2E_ACTOR_ID_REQUIRED');
        return data.user;
      }

      if (Number(error?.status ?? 0) === 422 && error?.code === 'email_exists') {
        const existing = await findUserByEmail(email);
        if (existing.user) {
          const metadata = existing.user.user_metadata ?? {};
          const tagged = metadata.e2e_actor === 'true' && metadata.e2e_purpose === ACTOR_METADATA.e2e_purpose;
          if (!tagged) throw new Error('E2E_ACTOR_EMAIL_COLLISION:' + email);
          return existing.user;
        }
        if (existing.lookupUnavailable) {
          throw new Error('E2E_ACTOR_EMAIL_EXISTS_LOOKUP_UNAVAILABLE:' + email);
        }
      }

      if (!isRetryableAuthLookup(error) || attempt === 4) throw error;
    } catch (error) {
      if (!isRetryableAuthLookup(error) || attempt === 4) throw error;
    }

    await wait(2000 * 2 ** (attempt - 1));
  }

  throw new Error('E2E_ACTOR_CREATE_RETRY_EXHAUSTED');
}

async function ensureActor(email, password, label, freshRunScoped = false) {
  assertProvisionDeadline('ensure-actor-' + label);
  let resolvedEmail = email?.trim();
  let resolvedPassword = password;
  let generated = false;

  if (!resolvedEmail || !resolvedPassword) {
    const generatedCredentials = actorCredentials(label);
    resolvedEmail = generatedCredentials.email;
    resolvedPassword = generatedCredentials.password;
    generated = true;
  }

  let user = null;
  let lookupUnavailable = false;

  const useRunScopedActor = freshRunScoped || (process.env.E2E_ACTOR_MODE === 'ephemeral-run-scoped' && generated);

  if (useRunScopedActor) {
    // Never reuse workflow-provided ephemeral credentials after a partial/retried run.
    // Generate a fresh identity and avoid the Auth Admin listUsers scan entirely.
    const generatedCredentials = actorCredentials(label);
    resolvedEmail = generatedCredentials.email;
    resolvedPassword = generatedCredentials.password;
    user = await createActor(resolvedEmail, resolvedPassword);
    generated = true;
  } else if (!generated) {
    user = await signInConfiguredActor(resolvedEmail, resolvedPassword);
    lookupUnavailable = false;
  }

  if (!freshRunScoped && lookupUnavailable) {
    const generatedCredentials = actorCredentials(label);
    resolvedEmail = generatedCredentials.email;
    resolvedPassword = generatedCredentials.password;
    user = await createActor(resolvedEmail, resolvedPassword);
    generated = true;
  } else if (!freshRunScoped && !user) {
    user = await createActor(resolvedEmail, resolvedPassword);
    generated = true;
  } else if (!freshRunScoped && user) {
    const metadata = user.user_metadata ?? {};
    const tagged = metadata.e2e_actor === 'true' && metadata.e2e_purpose === ACTOR_METADATA.e2e_purpose;
    if (!tagged) {
      const generatedCredentials = actorCredentials(label);
      resolvedEmail = generatedCredentials.email;
      resolvedPassword = generatedCredentials.password;
      user = await createActor(resolvedEmail, resolvedPassword);
      generated = true;
    }
  }

  if (generated) persistActorCredentials(label, resolvedEmail, resolvedPassword);
  assert.ok(user?.id, 'E2E_ACTOR_ID_REQUIRED:' + label);
  return user;
}

async function findTenantA() {
  assertProvisionDeadline('find-tenant-a');
  const { data, error } = await supabase
    .from('companies')
    .select('id,name,created_at')
    .eq('name', 'RUNTIME-EVIDENCE-A-401117')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error('E2E_TENANT_A_NOT_FOUND');
  return data;
}

function ensureApproverCredentials() {
  const existingEmail = process.env.TEST_APPROVER_EMAIL?.trim();
  const existingPassword = process.env.TEST_APPROVER_PASSWORD;
  const ephemeral = process.env.TEST_APPROVER_EPHEMERAL === 'true'
    || process.env.E2E_ACTOR_MODE === 'ephemeral-run-scoped';
  if (existingEmail && existingPassword) return { email: existingEmail, password: existingPassword, generated: ephemeral };

  const runId = String(process.env.GITHUB_RUN_ID || process.env.E2E_APPROVER_RUN_ID || Date.now()).replace(/[^0-9]/g, '');
  const email = 'e2e-approver-' + runId + '@e2e.report-advisor.invalid';
  const password = 'E2e-AppR0ver-' + runId.slice(-12) + '-Ra7!';
  if (process.env.GITHUB_ENV) {
    fs.appendFileSync(process.env.GITHUB_ENV, 'TEST_APPROVER_EMAIL=' + email + '\nTEST_APPROVER_PASSWORD=' + password + '\n');
  }
  return { email, password, generated: true };
}

async function findTenantB() {
  assertProvisionDeadline('find-tenant-b');
  const realSmartReportCompanyId = process.env.REAL_SMART_REPORT_COMPANY_ID?.trim();
  const configuredId = process.env.E2E_CORPUS_TENANT_ID?.trim();
  if (configuredId && realSmartReportCompanyId && configuredId === realSmartReportCompanyId) {
    throw new Error('E2E_CORPUS_TENANT_ID_MUST_DIFFER_FROM_REAL_SMART_REPORT_COMPANY');
  }
  if (configuredId) {
    const { data, error } = await supabase
      .from('companies')
      .select('id,name,created_at')
      .eq('id', configuredId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data?.id) throw new Error('E2E_CONFIGURED_CORPUS_TENANT_NOT_FOUND:' + configuredId);
    return data;
  }

  const { data, error } = await supabase
    .from('companies')
    .select('id,name,created_at')
    .like('name', 'Aghbari Report Corpus CI %')
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  if (!data?.length) throw new Error('E2E_TENANT_B_NOT_FOUND');
  return data[0];
}

async function prepareTransactionalFixture(companyId, actorId) {
  assertProvisionDeadline('prepare-transaction-fixture');
  const fixtureKey = 'E2E-ORDER-B-001';
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id,company_id,status,warehouse_id,order_number,idempotency_key')
    .eq('company_id', companyId)
    .eq('idempotency_key', fixtureKey)
    .maybeSingle();
  if (orderError) throw orderError;
  if (!order) throw new Error('E2E_ORDER_FIXTURE_MISSING');

  if (order.status === 'pending') {
    if (process.env.GITHUB_ENV) fs.appendFileSync(process.env.GITHUB_ENV, 'E2E_TRANSACTION_ORDER_IDEMPOTENCY_KEY=' + fixtureKey + '\n');
    return order;
  }

  const { data: items, error: itemError } = await supabase
    .from('order_items')
    .select('product_id,quantity,unit_price')
    .eq('company_id', companyId)
    .eq('order_id', order.id);
  if (itemError) throw itemError;

  for (const item of items ?? []) {
    const { data: balance, error: balanceError } = await supabase
      .from('inventory_balances')
      .select('id,quantity,unit_cost')
      .eq('company_id', companyId)
      .eq('warehouse_id', order.warehouse_id)
      .eq('product_id', item.product_id)
      .maybeSingle();
    if (balanceError) throw balanceError;

    const resetDate = new Date().toISOString().slice(0, 10);
    if (!balance) {
      const { error: insertBalanceError } = await supabase
        .from('inventory_balances')
        .insert({
          company_id: companyId,
          warehouse_id: order.warehouse_id,
          product_id: item.product_id,
          quantity: Number(item.quantity),
          unit_cost: Number(item.unit_price ?? 0),
          last_movement_date: resetDate,
          updated_at: new Date().toISOString(),
        });
      if (insertBalanceError) throw insertBalanceError;
    } else {
      const nextQuantity = Number(balance.quantity) + Number(item.quantity);
      const { error: updateBalanceError } = await supabase
        .from('inventory_balances')
        .update({ quantity: nextQuantity, last_movement_date: resetDate, updated_at: new Date().toISOString() })
        .eq('id', balance.id)
        .eq('company_id', companyId);
      if (updateBalanceError) throw updateBalanceError;

      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          company_id: companyId,
          warehouse_id: order.warehouse_id,
          product_id: item.product_id,
          movement_type: 'return',
          quantity: item.quantity,
          reference_type: 'e2e_order_reset',
          reference_id: order.id,
          movement_date: resetDate,
          notes: 'Repeatable browser E2E reset',
        });
      if (movementError) throw movementError;
    }
  }

  const { data: invoices, error: invoiceError } = await supabase
    .from('sales_invoices')
    .select('id,created_at')
    .eq('company_id', companyId)
    .eq('order_id', order.id)
    .order('created_at', { ascending: false });
  if (invoiceError) throw invoiceError;

  for (const invoice of invoices ?? []) {
    const { error: paymentDeleteError } = await supabase
      .from('payments')
      .delete()
      .eq('company_id', companyId)
      .eq('invoice_id', invoice.id);
    if (paymentDeleteError) throw paymentDeleteError;

    const { error: invoiceDeleteError } = await supabase
      .from('sales_invoices')
      .delete()
      .eq('company_id', companyId)
      .eq('id', invoice.id);
    if (invoiceDeleteError) throw invoiceDeleteError;
  }

  const { error: historyError } = await supabase.from('order_status_history').insert({
    company_id: companyId,
    order_id: order.id,
    from_status: order.status,
    to_status: 'pending',
    actor_id: actorId,
  });
  if (historyError) throw historyError;

  const { data: preparedOrder, error: updateOrderError } = await supabase
    .from('orders')
    .update({ status: 'pending', updated_at: new Date().toISOString() })
    .eq('company_id', companyId)
    .eq('id', order.id)
    .select('id,company_id,status,warehouse_id,customer_id,order_number,total,currency,idempotency_key')
    .single();
  if (updateOrderError) throw updateOrderError;

  const { error: outboxError } = await supabase.from('order_outbox_events').insert({
    company_id: companyId,
    order_id: order.id,
    event_type: 'order.e2e_reset',
    payload: { order_id: order.id, order_number: order.order_number },
  });
  if (outboxError) throw outboxError;

  const { error: auditError } = await supabase.from('audit_logs').insert({
    company_id: companyId,
    action: 'order_e2e_reset',
    entity_type: 'order',
    entity_id: order.id,
    old_value: { status: order.status },
    new_value: { status: 'pending' },
    source: 'e2e-provisioning',
  });
  if (auditError) throw auditError;

  if (process.env.GITHUB_ENV) fs.appendFileSync(process.env.GITHUB_ENV, 'E2E_TRANSACTION_ORDER_IDEMPOTENCY_KEY=' + fixtureKey + '\n');
  return preparedOrder;
}

async function provisionMembership(companyId, userId, requestedRole, isDefault, label) {
  assertProvisionDeadline('provision-membership-' + label);
  const { data: existing, error: existingError } = await supabase
    .from('company_memberships')
    .select('role,is_active,is_default')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .maybeSingle();
  if (existingError) throw existingError;

  const role = existing?.role || requestedRole;
  const { data, error } = await supabase.rpc('provision_e2e_test_membership', {
    p_company_id: companyId,
    p_user_id: userId,
    p_role: role,
    p_is_default: isDefault,
  });
  if (error) throw error;
  const membership = Array.isArray(data) ? data[0] : data;
  assert.equal(String(membership.company_id), String(companyId), 'E2E_MEMBERSHIP_TENANT_MISMATCH:' + label);
  assert.equal(String(membership.user_id), String(userId), 'E2E_MEMBERSHIP_USER_MISMATCH:' + label);
  assert.equal(membership.is_active, true, 'E2E_MEMBERSHIP_INACTIVE:' + label);
  return membership;
}

const approverCredentials = ensureApproverCredentials();
const userA = await ensureActor(
  process.env.TEST_USER_A_EMAIL,
  process.env.TEST_USER_A_PASSWORD,
  'A',
  process.env.TEST_USER_A_EPHEMERAL === 'true',
);
const userB = await ensureActor(
  process.env.TEST_USER_B_EMAIL,
  process.env.TEST_USER_B_PASSWORD,
  'B',
  process.env.TEST_USER_B_EPHEMERAL === 'true',
);
const userC = await ensureActor(
  process.env.TEST_USER_C_EMAIL,
  process.env.TEST_USER_C_PASSWORD,
  'C',
  process.env.TEST_USER_C_EPHEMERAL === 'true',
);
const approver = await ensureActor(
  approverCredentials.email,
  approverCredentials.password,
  'APPROVER',
  approverCredentials.generated,
);

assert.notEqual(userA.id, approver.id, 'APPROVER_MUST_DIFFER_FROM_REQUESTER');
assert.notEqual(userA.id, userB.id, 'USER_A_AND_USER_B_MUST_DIFFER');
assert.notEqual(userA.id, userC.id, 'USER_A_AND_USER_C_MUST_DIFFER');
assert.notEqual(userB.id, userC.id, 'USER_B_AND_USER_C_MUST_DIFFER');
assert.notEqual(userB.id, approver.id, 'USER_B_AND_APPROVER_MUST_DIFFER');
assert.notEqual(userC.id, approver.id, 'USER_C_AND_APPROVER_MUST_DIFFER');

const tenantA = await findTenantA();
const tenantB = await findTenantB();
assert.notEqual(String(tenantA.id), String(tenantB.id), 'TENANT_A_AND_B_MUST_BE_DISTINCT');

const configuredSmartReportTenantId = String(process.env.REAL_SMART_REPORT_COMPANY_ID || '').trim();
const smartReportTenantId = configuredSmartReportTenantId || String(tenantA.id);
if (!configuredSmartReportTenantId) {
  console.log(JSON.stringify({
    status: 'INFO',
    message: 'REAL_SMART_REPORT_COMPANY_ID not configured; using verified runtime report tenant from tenant A.',
    smartReportTenantId,
    smartReportTenantName: tenantA.name,
  }));
}
assert.notEqual(String(tenantB.id), smartReportTenantId, 'REAL_SMART_REPORT_TENANT_MUST_DIFFER_FROM_B');

const membershipA = await provisionMembership(tenantA.id, userA.id, 'sales', true, 'A');
const membershipApprover = await provisionMembership(tenantA.id, approver.id, 'admin', true, 'APPROVER');
const membershipB = await provisionMembership(tenantB.id, userB.id, 'sales', true, 'B');
const membershipC = await provisionMembership(smartReportTenantId, userC.id, 'sales', true, 'C-REAL-REPORT');
const corpusTenantIds = [...new Set(
  String(process.env.E2E_CORPUS_TENANT_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
)];
const corpusTenantMemberships = [];
for (const tenantId of corpusTenantIds) {
  if (String(tenantId) === String(tenantB.id)) continue;
  corpusTenantMemberships.push(
    await provisionMembership(tenantId, userB.id, 'sales', false, 'B-CORPUS-' + tenantId.slice(0, 8)),
  );
}
const transactionFixture = await prepareTransactionalFixture(tenantA.id, userA.id);

const [{ data: auditA }, { data: auditApprover }, { data: auditB }, { data: auditC }] = await Promise.all([
  supabase.from('audit_logs').select('id,company_id,action,entity_type,entity_id,source').eq('company_id', tenantA.id).eq('action', 'e2e_actor_membership_provisioned').eq('entity_id', membershipA.id).limit(1),
  supabase.from('audit_logs').select('id,company_id,action,entity_type,entity_id,source').eq('company_id', tenantA.id).eq('action', 'e2e_actor_membership_provisioned').eq('entity_id', membershipApprover.id).limit(1),
  supabase.from('audit_logs').select('id,company_id,action,entity_type,entity_id,source').eq('company_id', tenantB.id).eq('action', 'e2e_actor_membership_provisioned').eq('entity_id', membershipB.id).limit(1),
  supabase.from('audit_logs').select('id,company_id,action,entity_type,entity_id,source').eq('company_id', smartReportTenantId).eq('action', 'e2e_actor_membership_provisioned').eq('entity_id', membershipC.id).limit(1),
]);

assert.ok(auditA?.length, 'E2E_ACTOR_A_AUDIT_MISSING');
assert.ok(auditApprover?.length, 'E2E_APPROVER_AUDIT_MISSING');
assert.ok(auditB?.length, 'E2E_ACTOR_B_AUDIT_MISSING');
assert.ok(auditC?.length, 'E2E_ACTOR_C_AUDIT_MISSING');

const mask = (email) => email.replace(/^(.{2}).*(@.*)$/, '$1***$2');
console.log(JSON.stringify({
  status: 'PASS',
  approverCredentials: { generated: approverCredentials.generated },
  tenantA: { id: tenantA.id, name: tenantA.name },
  tenantB: { id: tenantB.id, name: tenantB.name },
  actors: {
    A: { id: userA.id, email: mask(userA.email ?? process.env.TEST_USER_A_EMAIL) },
    APPROVER: { id: approver.id, email: mask(approver.email ?? process.env.TEST_APPROVER_EMAIL) },
    B: { id: userB.id, email: mask(userB.email ?? process.env.TEST_USER_B_EMAIL) },
  },
  memberships: {
    A: { id: membershipA.id, role: membershipA.role, active: membershipA.is_active, default: membershipA.is_default },
    APPROVER: { id: membershipApprover.id, role: membershipApprover.role, active: membershipApprover.is_active, default: membershipApprover.is_default },
    B: { id: membershipB.id, role: membershipB.role, active: membershipB.is_active, default: membershipB.is_default },
    B_CORPUS: corpusTenantMemberships.map((membership) => ({
      id: membership.id,
      companyId: membership.company_id,
      role: membership.role,
      active: membership.is_active,
      default: membership.is_default,
    })),
  },
  audit: { A: auditA[0].id, APPROVER: auditApprover[0].id, B: auditB[0].id },
}, null, 2));
