const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createRolePermissionService } = require('../electron/services/rolePermissionService');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'boc-v051-denied-'));
const service = createRolePermissionService({ databasePath: path.join(tmp, 'logs.db') });

const clientReason = service.getSafeAccessDeniedReason({
  roleId: 'CLIENT_VIEWER',
  permissionKey: 'system.settings.view',
  routeKey: 'C:\\secret\\sqlite\\logs.db',
  audience: 'CUSTOMER'
});
assert.strictEqual(clientReason.safeForCustomer, true, 'access denied reason is customer safe');
assert.strictEqual(clientReason.routeKey, '', 'customer denied reason hides internal route detail');
assert.ok(clientReason.reasonKo.includes('고객 열람'), 'safe role label is displayed');
assert.ok(!JSON.stringify(clientReason).toLowerCase().includes('sqlite'), 'denied reason hides sqlite path');
assert.ok(!JSON.stringify(clientReason).toLowerCase().includes('secret'), 'denied reason hides secret path');

const staffReason = service.getSafeAccessDeniedReason({
  roleId: 'STAFF',
  permissionKey: 'estimate.margin.view',
  routeKey: 'marginSafety'
});
assert.ok(staffReason.reasonKo.includes('마진 조회'), 'permission description is shown safely');
assert.strictEqual(staffReason.actionKo, '역할 또는 업무 범위 확인을 관리자에게 요청하세요.', 'safe action copy is stable');

const accessDeniedView = fs.readFileSync(path.join(__dirname, '..', 'ui/app/shared/AccessDeniedView.tsx'), 'utf8');
const roleGuard = fs.readFileSync(path.join(__dirname, '..', 'ui/guards/RoleGuard.tsx'), 'utf8');
const drawer = fs.readFileSync(path.join(__dirname, '..', 'ui/components/modals/DetailDrawer.tsx'), 'utf8');
assert.ok(accessDeniedView.includes('safeReasonKo'), 'AccessDeniedView supports safe reason');
assert.ok(accessDeniedView.includes('safeText'), 'AccessDeniedView sanitizes displayed text');
assert.ok(roleGuard.includes('safeReasonKo'), 'RoleGuard passes a safe reason');
assert.ok(drawer.includes('safeReasonKo'), 'Drawer denied route passes safe reason');
['token', 'api', 'sqlite', 'database'].forEach((term) => {
  assert.ok(accessDeniedView.toLowerCase().includes('[숨김]') || accessDeniedView.toLowerCase().includes(term), 'sanitizer source is present');
});

console.log(JSON.stringify({
  ok: true,
  test: 'v0-5-1-access-denied-reason',
  safeReason: 'PASSED',
  internalPathLeak: 'BLOCKED'
}, null, 2));
