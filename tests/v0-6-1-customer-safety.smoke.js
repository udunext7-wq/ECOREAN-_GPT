const assert = require('assert');
const { createV061AuthHarness } = require('./helpers/v061AuthHarness');

const h = createV061AuthHarness('boc-v061-customer-');
const safe = h.roles.sanitizeDataForRole('CLIENT_VIEWER', {
  project_name: '고객 공유 테스트', estimate_total: 1200000,
  external_identity_binding: { binding_id: 'XIB-PRIVATE' },
  provider_user_id: 'SUPA-PRIVATE', provider_user_fingerprint: 'FINGERPRINT-PRIVATE',
  provider_session_ref: 'SUP-PRIVATE', auth_session: { session_id: 'SES-PRIVATE' },
  access_token: 'ACCESS-PRIVATE', refresh_token: 'REFRESH-PRIVATE',
  internal_cost: 900000, margin: 300000, pce: 'GO',
  customer_phone: '010-0000-0000', customer_email: 'private@example.invalid', detailed_address: '상세주소', memo: '원문 메모'
});
const serialized = JSON.stringify(safe).toLowerCase();
[
  'external_identity', 'provider_user', 'provider_session', 'auth_session', 'access_token', 'refresh_token',
  'internal_cost', 'margin', 'pce', 'customer_phone', 'customer_email', 'detailed_address', 'memo'
].forEach((key) => assert.ok(!serialized.includes(key), `${key} is hidden`));
assert.strictEqual(safe.project_name, '고객 공유 테스트');

console.log(JSON.stringify({ ok: true, test: 'v0-6-1-customer-safety', authMetadata: 'HIDDEN', internalData: 'HIDDEN', personalData: 'HIDDEN' }, null, 2));
