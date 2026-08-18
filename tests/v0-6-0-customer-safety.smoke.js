const assert = require('assert');
const { createAuthProviderAdapter } = require('../electron/services/authProviderAdapter');
const { createV060IdentityHarness } = require('./helpers/v060IdentityHarness');

const h = createV060IdentityHarness('boc-v060-customer-');
const source = {
  project_name: '고객 공유 프로젝트',
  estimate_total: 1000000,
  identity_id: 'IDN-PRIVATE',
  session_id: 'SES-PRIVATE',
  actor_identity_id: 'IDN-ACTOR',
  role_assignment: { role_id: 'CEO' },
  organization_membership: { membership_type: 'OWNER' },
  provider_subject: 'private-provider-subject',
  internal_cost: 700000,
  margin: 300000,
  customer_phone: '010-0000-0000',
  customer_email: 'private@example.invalid',
  detailed_address: '테스트 상세주소',
  memo: '고객 메모 원문'
};
const safe = h.roles.sanitizeDataForRole('CLIENT_VIEWER', source);
const serialized = JSON.stringify(safe).toLowerCase();
[
  'identity_id', 'session_id', 'actor_identity', 'role_assignment',
  'organization_membership', 'provider_subject', 'internal_cost', 'margin',
  'customer_phone', 'customer_email', 'detailed_address', 'memo'
].forEach((key) => assert.ok(!serialized.includes(key), `${key} is hidden`));
assert.strictEqual(safe.project_name, source.project_name);
const provider = createAuthProviderAdapter();
assert.strictEqual(provider.getProviderStatus().status, 'DISABLED');
assert.strictEqual(provider.authenticate().externalCallPerformed, false);

console.log(JSON.stringify({
  ok: true,
  test: 'v0-6-0-customer-safety',
  identityMetadata: 'HIDDEN', internalData: 'HIDDEN', personalData: 'HIDDEN', externalAuthentication: 'DISABLED'
}, null, 2));
