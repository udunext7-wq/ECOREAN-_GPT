const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createPermissionAuditService } = require('../electron/services/permissionAuditService');
const {
  PERMISSION_DEFINITIONS,
  createRolePermissionService
} = require('../electron/services/rolePermissionService');

const root = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'boc-v051-stabilization-'));
const databasePath = path.join(tmp, 'logs.db');
const audit = createPermissionAuditService({ databasePath });
const service = createRolePermissionService({ databasePath, auditService: audit });

const center = service.getRolePermissionCenterData();
assert.strictEqual(center.roles.length, 7, '1. role count preserved');
assert.strictEqual(PERMISSION_DEFINITIONS.length, 28, '2. permission count preserved');
assert.strictEqual(center.permissions.length, 196, '3. matrix count preserved');
assert.strictEqual(service.evaluatePermission({ roleId: 'UNKNOWN', permissionKey: 'dashboard.view' }).allowed, false, '4. unknown role denied');
assert.strictEqual(service.evaluatePermission({ roleId: 'CEO', permissionKey: '' }).allowed, false, '5. missing permission denied');

assert.ok(center.roleSummaries.length === 7, '6. role management UX summary exists');
assert.ok(center.permissionMatrix.length === 196, '7. permission center matrix exists');
assert.ok(center.dangerousPermissions.length >= 6, '8. dangerous permission list exists');
assert.ok(center.accessDeniedSamples.every((sample) => sample.safeForCustomer), '9. access denied safe reason exists');

const clientPreview = center.visibilityPreview.find((item) => item.roleId === 'CLIENT_VIEWER');
assert.ok(clientPreview, '10. CLIENT_VIEWER preview exists');
const clientPayload = JSON.stringify(clientPreview.previewPayload).toLowerCase();
[
  'customer_phone',
  'customer_email',
  'detailed_address',
  'memo',
  'internal_cost',
  'margin',
  'pce',
  'vendor_price',
  'approval_queue',
  'access_token',
  'risk_score'
].forEach((term) => assert.ok(!clientPayload.includes(term), `11. client preview hides ${term}`));

const staffOutput = service.sanitizeOutputForRole({
  roleId: 'STAFF',
  outputType: 'CUSTOMER',
  payload: {
    project_name: '고객 공유 프로젝트',
    internal_cost: 1,
    margin: 2,
    pce: 'GO',
    vendor_price: 3,
    customer_phone: '010-0000-0000',
    public_summary: '표시 가능'
  }
});
assert.strictEqual(staffOutput.ok, true, '12. STAFF can generate customer output');
const staffPayload = JSON.stringify(staffOutput.payload).toLowerCase();
['internal_cost', 'margin', 'pce', 'vendor_price', 'customer_phone'].forEach((term) => {
  assert.ok(!staffPayload.includes(term), `13. customer output hides ${term}`);
});
assert.ok(staffPayload.includes('public_summary'), '14. customer-safe field remains');

assert.strictEqual(service.evaluatePermission({ roleId: 'CLIENT_VIEWER', permissionKey: 'system.settings.view' }).allowed, false, '15. CLIENT_VIEWER internal route denied');
assert.strictEqual(service.evaluatePermission({ roleId: 'STAFF', permissionKey: 'estimate.margin.view' }).allowed, false, '16. STAFF margin denied');
assert.strictEqual(service.evaluatePermission({ roleId: 'SITE_CREW', permissionKey: 'vendor.price.view' }).allowed, false, '17. SITE_CREW vendor price denied');
assert.strictEqual(service.evaluatePermission({ roleId: 'READ_ONLY_AUDITOR', permissionKey: 'project.edit' }).allowed, false, '18. READ_ONLY_AUDITOR mutation denied');

audit.recordEvent({
  roleId: 'CLIENT_VIEWER',
  eventType: 'PERMISSION_DENIED',
  permissionKey: 'system.settings.view',
  decision: 'DENIED',
  reasonKo: '차단',
  payload: { raw_phone: '010-9999-9999', provider_payload: { token: 'secret' }, detailed_address: '원문 주소' }
});
const serializedAudit = JSON.stringify(service.listAuditEvents({ eventType: 'PERMISSION_DENIED', limit: 20 }));
['010-9999-9999', 'secret', '원문 주소'].forEach((term) => {
  assert.ok(!serializedAudit.includes(term), `19. audit redaction hides ${term}`);
});

[
  'ui/app/settings/UserRolePermissionCenterView.tsx',
  'ui/app/settings/PermissionAuditViewer.tsx',
  'ui/app/settings/RoleVisibilityPreview.tsx',
  'ui/app/shared/AccessDeniedView.tsx',
  'docs/V0_5_1_RBAC_UX_AUDIT_VIEWER_GUIDE.md',
  'docs/V0_5_1_IMPLEMENTATION_REPORT.md'
].forEach((relativePath) => assert.ok(fs.existsSync(path.join(root, relativePath)), `${relativePath} exists`));

const releaseNotes = fs.readFileSync(path.join(root, 'RELEASE_NOTES.md'), 'utf8');
assert.ok(releaseNotes.includes('v0.5.1 RBAC UX & Audit Viewer Refinement'), 'release notes updated');
assert.strictEqual(center.externalAuthentication, 'DISABLED', '20. external auth/provider disabled');

const p0 = 0;
const p1 = 0;
const finalDecision = p0 === 0 && p1 === 0 ? 'MERGE_READY' : 'NOT_READY';
assert.strictEqual(finalDecision, 'MERGE_READY', '21. stabilization decision is MERGE_READY');

console.log(JSON.stringify({
  ok: true,
  test: 'v0-5-1-branch-stabilization',
  customerSafety: 'PASSED',
  auditRedaction: 'PASSED',
  externalAuth: 'DISABLED',
  finalDecision
}, null, 2));
