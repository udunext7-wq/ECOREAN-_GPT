const assert = require('assert');
const { createV061AuthHarness } = require('./helpers/v061AuthHarness');

const h = createV061AuthHarness('boc-v061-audit-');
h.audit.recordEvent({
  eventType: 'AUTH_REDACTION_PROBE',
  payload: {
    providerUserId: 'SUPA-RAW-MUST-NOT-PERSIST',
    accessToken: 'ACCESS-MUST-NOT-PERSIST',
    refresh_token: 'REFRESH-MUST-NOT-PERSIST',
    password: 'PASSWORD-MUST-NOT-PERSIST',
    providerUserFingerprint: 'SAFE-FINGERPRINT'
  }
});
const event = h.audit.listEvents({ eventType: 'AUTH_REDACTION_PROBE' })[0];
assert.strictEqual(event.payload.providerUserId, '[REDACTED]');
assert.strictEqual(event.payload.accessToken, '[REDACTED]');
assert.strictEqual(event.payload.refresh_token, '[REDACTED]');
assert.strictEqual(event.payload.password, '[REDACTED]');
assert.strictEqual(event.payload.providerUserFingerprint, 'SAFE-FINGERPRINT');
const serialized = JSON.stringify(h.audit.listEvents());
['SUPA-RAW-MUST-NOT-PERSIST', 'ACCESS-MUST-NOT-PERSIST', 'REFRESH-MUST-NOT-PERSIST', 'PASSWORD-MUST-NOT-PERSIST'].forEach((value) => assert.ok(!serialized.includes(value)));

console.log(JSON.stringify({ ok: true, test: 'v0-6-1-auth-audit-redaction', credentials: 'REDACTED', tokens: 'REDACTED', rawProviderUser: 'REDACTED', safeFingerprint: 'PRESERVED' }, null, 2));
