const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  ROLE_DEFINITIONS,
  PERMISSION_DEFINITIONS,
  createRolePermissionService
} = require('../electron/services/rolePermissionService');
const { createPermissionAuditService } = require('../electron/services/permissionAuditService');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'boc-v051-rbac-ux-'));
const databasePath = path.join(tmp, 'logs.db');
const audit = createPermissionAuditService({ databasePath });
const service = createRolePermissionService({ databasePath, auditService: audit });

const data = service.getRolePermissionCenterData();
assert.strictEqual(data.roles.length, 7, 'v0.5.0 role count is preserved');
assert.strictEqual(PERMISSION_DEFINITIONS.length, 28, 'v0.5.0 permission count is preserved');
assert.strictEqual(data.permissions.length, ROLE_DEFINITIONS.length * PERMISSION_DEFINITIONS.length, 'complete role permission matrix remains');
assert.strictEqual(data.externalAuthentication, 'DISABLED', 'external auth remains disabled');
assert.strictEqual(data.uxVersion, 'v0.5.1-rbac-ux-audit-viewer', 'v0.5.1 UX marker exists');

assert.ok(data.roleSummaries.length === 7, 'role management UX summary exists for every role');
assert.ok(data.roleSummaries.some((role) => role.roleId === 'CLIENT_VIEWER' && role.restrictedCount > 0), 'CLIENT_VIEWER restrictions are visible');
assert.ok(data.roleSummaries.some((role) => role.roleId === 'SITE_CREW' && role.deniedCount > 0), 'SITE_CREW limited scope is visible');
assert.ok(data.permissionMatrix.length === 7 * 28, 'permission center matrix can display 7 roles / 28 permissions');
assert.ok(data.permissionMatrix.some((row) => row.permissionKey === 'estimate.internal_cost.view' && row.isDangerous), 'dangerous internal cost permission is highlighted');
assert.ok(data.permissionMatrix.some((row) => row.permissionKey === 'system.settings.edit' && row.isDangerous), 'dangerous system settings permission is highlighted');
assert.ok(data.dangerousPermissions.some((item) => item.permissionKey === 'audit.view'), 'audit.view is marked as dangerous permission');

const changed = service.setActiveRole('SITE_CREW', { actor: 'CEO', reasonKo: 'v0.5.1 role UX simulation' });
assert.strictEqual(changed.roleId, 'SITE_CREW', 'role management UX can simulate role change');
assert.ok(audit.listEvents({ eventType: 'ACTIVE_ROLE_CHANGED' }).length >= 1, 'role change is audited');

assert.strictEqual(service.evaluatePermission({ roleId: 'UNKNOWN', permissionKey: 'project.view' }).allowed, false, 'unknown role default deny remains');
assert.strictEqual(service.evaluatePermission({ roleId: 'CEO', permissionKey: 'unknown.permission' }).allowed, false, 'unknown permission default deny remains');

const ui = fs.readFileSync(path.join(__dirname, '..', 'ui/app/settings/UserRolePermissionCenterView.tsx'), 'utf8');
assert.ok(ui.includes('7 roles / 28 permissions matrix'), 'permission center matrix label exists');
assert.ok(ui.includes('권한 검색'), 'permission search UX exists');
assert.ok(ui.includes('위험 권한'), 'dangerous permission UX exists');
assert.ok(ui.includes('window.confirm'), 'role change warning exists');

console.log(JSON.stringify({
  ok: true,
  test: 'v0-5-1-rbac-ux',
  roleManagementUx: 'PASSED',
  permissionCenterUx: 'PASSED',
  defaultDeny: 'PASSED',
  externalAuth: 'DISABLED'
}, null, 2));
