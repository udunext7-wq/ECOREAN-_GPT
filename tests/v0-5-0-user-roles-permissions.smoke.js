const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createPermissionAuditService } = require('../electron/services/permissionAuditService');
const {
  ROLE_DEFINITIONS,
  PERMISSION_DEFINITIONS,
  createRolePermissionService
} = require('../electron/services/rolePermissionService');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'boc-v050-rbac-'));
const databasePath = path.join(tmp, 'logs.db');
const audit = createPermissionAuditService({ databasePath });
const service = createRolePermissionService({ databasePath, auditService: audit });

const center = service.getRolePermissionCenterData();
assert.strictEqual(center.roles.length, 7, 'seven operational roles are defined');
assert.deepStrictEqual(
  center.roles.map((role) => role.roleId),
  ['CEO', 'ADMIN', 'MANAGER', 'STAFF', 'SITE_CREW', 'CLIENT_VIEWER', 'READ_ONLY_AUDITOR'],
  'role order and ids are stable'
);
assert.strictEqual(center.permissions.length, ROLE_DEFINITIONS.length * PERMISSION_DEFINITIONS.length, 'complete permission matrix is stored');
assert.strictEqual(center.currentUser.roleId, 'CEO', 'local session defaults to CEO');
assert.strictEqual(center.externalAuthentication, 'DISABLED', 'external authentication remains disabled');

assert.strictEqual(service.evaluatePermission({ roleId: 'CEO', permissionKey: 'system.settings.edit' }).allowed, true, 'CEO can edit settings');
assert.strictEqual(service.evaluatePermission({ roleId: 'STAFF', permissionKey: 'estimate.edit' }).allowed, true, 'staff can edit estimates');
assert.strictEqual(service.evaluatePermission({ roleId: 'STAFF', permissionKey: 'estimate.margin.view' }).allowed, false, 'staff cannot view margin');
assert.strictEqual(service.evaluatePermission({ roleId: 'UNKNOWN', permissionKey: 'project.view' }).allowed, false, 'unknown role is default denied');
assert.strictEqual(service.evaluatePermission({ roleId: 'CEO', permissionKey: 'unknown.permission' }).allowed, false, 'unknown permission is default denied');

const changed = service.setActiveRole('CLIENT_VIEWER', { actor: 'CEO', reasonKo: 'customer preview test' });
assert.strictEqual(changed.roleId, 'CLIENT_VIEWER', 'active role can change locally');
assert.strictEqual(service.getCurrentRole().roleId, 'CLIENT_VIEWER', 'active role persists');

const auditEvents = audit.listEvents({ limit: 50 });
assert.ok(auditEvents.some((event) => event.eventType === 'ACTIVE_ROLE_CHANGED'), 'role change is audited');
assert.ok(auditEvents.some((event) => event.eventType === 'PERMISSION_DENIED'), 'denied permission is audited');

console.log(JSON.stringify({
  ok: true,
  test: 'v0-5-0-user-roles-permissions',
  roles: center.roles.length,
  permissions: PERMISSION_DEFINITIONS.length,
  defaultDeny: 'PASSED',
  audit: 'PASSED'
}, null, 2));
