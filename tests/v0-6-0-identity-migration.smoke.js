const assert = require('assert');
const { DatabaseSync } = require('node:sqlite');
const { DEFAULT_IDENTITY_ID } = require('../electron/services/identityService');
const { DEFAULT_ASSIGNMENT_ID } = require('../electron/services/roleAssignmentService');
const { DEFAULT_SESSION_ID } = require('../electron/services/sessionService');
const { createV060IdentityHarness } = require('./helpers/v060IdentityHarness');

const h = createV060IdentityHarness('boc-v060-migration-');
const second = h.identity.migrateLegacyLocalRole({
  rolePermissionService: h.roles,
  roleAssignmentService: h.assignments,
  sessionService: h.session
});
assert.strictEqual(second.alreadyApplied, true);
assert.strictEqual(second.identityId, DEFAULT_IDENTITY_ID);

const db = new DatabaseSync(h.databasePath);
const identityCount = db.prepare('SELECT COUNT(*) AS count FROM identities WHERE identity_id = ?').get(DEFAULT_IDENTITY_ID).count;
const assignmentCount = db.prepare('SELECT COUNT(*) AS count FROM identity_role_assignments WHERE assignment_id = ?').get(DEFAULT_ASSIGNMENT_ID).count;
const sessionCount = db.prepare('SELECT COUNT(*) AS count FROM identity_sessions WHERE session_id = ?').get(DEFAULT_SESSION_ID).count;
const legacyUserCount = db.prepare("SELECT COUNT(*) AS count FROM users WHERE user_id = 'USER-LOCAL-RBAC'").get().count;
const legacySessionCount = db.prepare("SELECT COUNT(*) AS count FROM role_session_state WHERE session_id = 'LOCAL'").get().count;
db.close();
assert.deepStrictEqual([identityCount, assignmentCount, sessionCount], [1, 1, 1]);
assert.deepStrictEqual([legacyUserCount, legacySessionCount], [1, 1], 'legacy records remain intact');

console.log(JSON.stringify({
  ok: true,
  test: 'v0-6-0-identity-migration',
  idempotent: 'PASSED', deterministicIds: 'PASSED', legacyDataPreserved: 'PASSED', destructiveChanges: false
}, null, 2));
