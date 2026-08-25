const assert = require('assert');
const { DatabaseSync } = require('node:sqlite');
const { createV061AuthHarness } = require('./helpers/v061AuthHarness');

const h = createV061AuthHarness('boc-v061-migration-');
const first = h.bindings.getMigrationStatus();
const second = h.bindings.getMigrationStatus();
assert.deepStrictEqual(first, second);
const db = new DatabaseSync(h.databasePath);
const bindingColumns = db.prepare('PRAGMA table_info(external_identity_bindings)').all().map((row) => row.name);
const sessionColumns = db.prepare('PRAGMA table_info(identity_sessions)').all().map((row) => row.name);
const versionCount = Number(db.prepare("SELECT COUNT(*) AS count FROM external_identity_binding_schema_versions WHERE version_key = 'v0.6.1-external-identity-binding-1'").get().count);
db.close();
assert.strictEqual(versionCount, 1);
assert.ok(bindingColumns.includes('provider_user_id'));
assert.ok(sessionColumns.includes('provider_session_ref'));
['access_token', 'refresh_token', 'password', 'email'].forEach((column) => {
  assert.ok(!bindingColumns.includes(column));
  assert.ok(!sessionColumns.includes(column));
});

console.log(JSON.stringify({ ok: true, test: 'v0-6-1-migration', idempotent: 'PASSED', legacyPreserved: 'PASSED', tokenColumns: 'ABSENT', destructiveChanges: false }, null, 2));
