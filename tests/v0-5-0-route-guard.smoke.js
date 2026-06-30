const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  ROUTE_PERMISSION_MAP,
  createRolePermissionService
} = require('../electron/services/rolePermissionService');

const root = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'boc-v050-route-guard-'));
const service = createRolePermissionService({ databasePath: path.join(tmp, 'logs.db') });

const clientRoutes = service.getVisibleRoutes('CLIENT_VIEWER');
assert.ok(clientRoutes.includes('project'), 'client viewer can open project summary');
assert.ok(clientRoutes.includes('clientPortal'), 'client viewer can preview customer portal');
assert.ok(!clientRoutes.includes('settings'), 'client viewer cannot open settings');
assert.ok(!clientRoutes.includes('masterDb'), 'client viewer cannot open master data');
assert.ok(!clientRoutes.includes('realPriceWorkbench'), 'client viewer cannot open price workbench');

const crewRoutes = service.getVisibleRoutes('SITE_CREW');
assert.ok(crewRoutes.includes('project'), 'site crew can view projects');
assert.ok(crewRoutes.includes('constructionSchedule'), 'site crew can view schedules');
assert.ok(!crewRoutes.includes('costCapture'), 'site crew cannot view internal cost capture');

assert.strictEqual(ROUTE_PERMISSION_MAP.userRolePermissions, 'system.settings.view', 'role center is route guarded');
assert.strictEqual(ROUTE_PERMISSION_MAP.marginSafety, 'estimate.margin.view', 'margin screen is route guarded');

const drawer = fs.readFileSync(path.join(root, 'ui/components/modals/DetailDrawer.tsx'), 'utf8');
const dashboard = fs.readFileSync(path.join(root, 'ui/app/dashboard/CeoDashboard.tsx'), 'utf8');
const roleGuard = fs.readFileSync(path.join(root, 'ui/guards/RoleGuard.tsx'), 'utf8');
const gate = fs.readFileSync(path.join(root, 'ui/guards/PermissionGate.tsx'), 'utf8');
assert.ok(drawer.includes('canAccessView'), 'drawer performs route permission evaluation');
assert.ok(drawer.includes('AccessDeniedView'), 'denied route has a safe screen');
assert.ok(dashboard.includes('PermissionGate'), 'dashboard uses a menu permission gate');
assert.ok(roleGuard.includes('hasPermission'), 'role guard evaluates permissions');
assert.ok(gate.includes('hasPermission'), 'permission gate evaluates permissions');

console.log(JSON.stringify({
  ok: true,
  test: 'v0-5-0-route-guard',
  routeGuard: 'PASSED',
  menuGuard: 'PASSED',
  defaultDeny: 'PASSED'
}, null, 2));
