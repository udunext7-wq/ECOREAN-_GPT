const fs = require('fs');
const os = require('os');
const path = require('path');
const { createIdentityService } = require('../../electron/services/identityService');
const { createSessionService } = require('../../electron/services/sessionService');
const { createRoleAssignmentService } = require('../../electron/services/roleAssignmentService');
const { createResourceScopeService } = require('../../electron/services/resourceScopeService');
const { createPermissionAuditService } = require('../../electron/services/permissionAuditService');
const { createRolePermissionService } = require('../../electron/services/rolePermissionService');
const { createRoleChangeApprovalService } = require('../../electron/services/roleChangeApprovalService');
const { createPermissionAuditExportService } = require('../../electron/services/permissionAuditExportService');
const { createLocalIdentityProvider } = require('../../electron/services/localIdentityProvider');

function createV060IdentityHarness(prefix = 'boc-v060-', options = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const databasePath = path.join(tmp, 'logs.db');
  const identity = createIdentityService({ databasePath });
  const scope = createResourceScopeService();
  const session = createSessionService({
    databasePath,
    identityService: identity,
    clock: options.clock
  });
  identity.setSessionService(session);
  const assignments = createRoleAssignmentService({
    databasePath,
    identityService: identity,
    resourceScopeService: scope,
    clock: options.clock
  });
  const audit = createPermissionAuditService({ databasePath });
  const roles = createRolePermissionService({
    databasePath,
    auditService: audit,
    identityService: identity,
    sessionService: session,
    roleAssignmentService: assignments
  });
  const provider = createLocalIdentityProvider({ identityService: identity, sessionService: session });
  provider.initialize();
  const migration = identity.migrateLegacyLocalRole({
    rolePermissionService: roles,
    roleAssignmentService: assignments,
    sessionService: session
  });
  const roleChanges = createRoleChangeApprovalService({
    databasePath,
    auditService: audit,
    rolePermissionService: roles,
    identityService: identity,
    sessionService: session,
    roleAssignmentService: assignments,
    clock: options.clock
  });
  const auditExport = createPermissionAuditExportService({
    databasePath,
    auditService: audit,
    rolePermissionService: roles,
    sessionService: session
  });
  return {
    tmp,
    databasePath,
    identity,
    session,
    assignments,
    scope,
    audit,
    roles,
    provider,
    migration,
    roleChanges,
    auditExport
  };
}

module.exports = { createV060IdentityHarness };
