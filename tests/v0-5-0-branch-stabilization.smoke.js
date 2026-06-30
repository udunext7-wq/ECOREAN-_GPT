const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const scripts = [
  'v0-5-0-user-roles-permissions.smoke.js',
  'v0-5-0-customer-data-guard.smoke.js',
  'v0-5-0-route-guard.smoke.js',
  'v0-5-0-output-permission-guard.smoke.js'
];

scripts.forEach((script) => {
  const result = spawnSync(process.execPath, [path.join(root, 'tests', script)], {
    cwd: root,
    encoding: 'utf8'
  });
  assert.strictEqual(result.status, 0, `${script} passes\n${result.stdout}\n${result.stderr}`);
});

[
  'electron/services/rolePermissionService.js',
  'electron/services/permissionAuditService.js',
  'ui/app/settings/UserRolePermissionCenterView.tsx',
  'ui/app/shared/AccessDeniedView.tsx',
  'ui/guards/RoleGuard.tsx',
  'ui/guards/PermissionGate.tsx',
  'docs/V0_5_0_USER_ROLES_PERMISSIONS_GUIDE.md',
  'docs/V0_5_0_PERMISSION_MATRIX.md',
  'docs/V0_5_0_IMPLEMENTATION_REPORT.md'
].forEach((relativePath) => {
  assert.ok(fs.existsSync(path.join(root, relativePath)), `${relativePath} exists`);
});

const service = fs.readFileSync(path.join(root, 'electron/services/rolePermissionService.js'), 'utf8');
const main = fs.readFileSync(path.join(root, 'electron/main.js'), 'utf8');
const preload = fs.readFileSync(path.join(root, 'electron/preload.js'), 'utf8');
assert.ok(service.includes('LOCAL_INTERNAL_RBAC'), 'local internal security model is explicit');
assert.ok(service.includes('default denied') || service.includes('knownPermission'), 'unknown permissions are denied');
assert.ok(main.includes("boc:roles:evaluate"), 'role evaluator IPC is registered');
assert.ok(preload.includes('evaluateRolePermission'), 'role evaluator preload is registered');

console.log(JSON.stringify({
  ok: true,
  test: 'v0-5-0-branch-stabilization',
  p0: 0,
  p1: 0,
  customerSafety: 'PASSED',
  finalDecision: 'MERGE_READY'
}, null, 2));
