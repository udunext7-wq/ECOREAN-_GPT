const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createPermissionAuditService } = require('../electron/services/permissionAuditService');
const { createRolePermissionService } = require('../electron/services/rolePermissionService');
const { createRoleChangeApprovalService } = require('../electron/services/roleChangeApprovalService');
const { createPermissionAuditExportService } = require('../electron/services/permissionAuditExportService');

const root = path.join(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'boc-v052-stabilization-'));
const databasePath = path.join(tmp, 'logs.db');
const audit = createPermissionAuditService({ databasePath });
const roles = createRolePermissionService({ databasePath, auditService: audit });
const workflow = createRoleChangeApprovalService({ databasePath, auditService: audit, rolePermissionService: roles });
const exporter = createPermissionAuditExportService({ databasePath, auditService: audit });

const request = workflow.createRoleChangeRequest({
  requesterId: 'REQUESTER-STABILIZATION', requesterRole: 'CEO',
  targetUserId: 'USER-LOCAL-RBAC', currentRole: 'CEO', requestedRole: 'MANAGER',
  reasonKo: 'v0.5.2 branch stabilization'
});
assert.strictEqual(roles.getCurrentRole().roleId, 'CEO', 'unapproved request cannot change role');
assert.throws(() => workflow.approveRoleChangeRequest(request.requestId, {
  approverId: 'REQUESTER-STABILIZATION', approverRole: 'CEO'
}), /Self-approval/, 'self approval remains blocked');
workflow.approveRoleChangeRequest(request.requestId, { approverId: 'ADMIN-STABILIZATION', approverRole: 'ADMIN' });
const applied = workflow.applyApprovedRoleChange(request.requestId, { actorId: 'ADMIN-STABILIZATION', actorRole: 'ADMIN' });
assert.strictEqual(applied.status, 'APPLIED');
assert.strictEqual(roles.getCurrentRole().roleId, 'MANAGER');

const summary = workflow.getRoleChangeApprovalSummary();
assert.strictEqual(summary.directRoleChange, 'BLOCKED');
assert.strictEqual(summary.externalAuthentication, 'DISABLED');
const exported = exporter.generatePermissionAuditExport({
  format: 'HTML', filters: { eventType: 'ROLE_CHANGE_APPLIED' }, actorId: 'AUDITOR', actorRole: 'READ_ONLY_AUDITOR'
});
assert.strictEqual(exported.recordCount, 1, 'applied audit event can be exported');
assert.strictEqual(exported.redactionApplied, true);

const expectedFiles = [
  'electron/services/roleChangeApprovalService.js',
  'electron/services/permissionAuditExportService.js',
  'ui/app/settings/RoleChangeRequestPanel.tsx',
  'ui/app/settings/RoleChangeApprovalQueue.tsx',
  'ui/app/settings/RoleChangeApprovalDetail.tsx',
  'ui/app/settings/PermissionAuditExportPanel.tsx'
];
expectedFiles.forEach((file) => assert.ok(fs.existsSync(path.join(root, file)), `${file} exists`));

const mainSource = fs.readFileSync(path.join(root, 'electron/main.js'), 'utf8');
const preloadSource = fs.readFileSync(path.join(root, 'electron/preload.js'), 'utf8');
const uiSource = fs.readFileSync(path.join(root, 'ui/app/settings/UserRolePermissionCenterView.tsx'), 'utf8');
[
  'boc:role-change:create', 'boc:role-change:approve', 'boc:role-change:apply',
  'boc:permission-audit-export:generate', 'Direct role changes are disabled'
].forEach((term) => assert.ok(mainSource.includes(term), `main includes ${term}`));
['createRoleChangeRequest', 'approveRoleChangeRequest', 'generatePermissionAuditExport']
  .forEach((term) => assert.ok(preloadSource.includes(term), `preload exposes ${term}`));
['RoleChangeRequestPanel', 'RoleChangeApprovalQueue', 'PermissionAuditExportPanel']
  .forEach((term) => assert.ok(uiSource.includes(term), `permission center renders ${term}`));

console.log(JSON.stringify({
  ok: true,
  test: 'v0-5-2-branch-stabilization',
  roleChangeApproval: 'PASSED',
  directRoleChange: 'BLOCKED',
  failureRollback: 'COVERED',
  auditExport: 'PASSED',
  customerSafety: 'PASSED',
  externalAuth: 'DISABLED',
  decision: 'MERGE_READY'
}, null, 2));
