const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createPermissionAuditService } = require('../electron/services/permissionAuditService');
const { createPermissionAuditExportService } = require('../electron/services/permissionAuditExportService');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'boc-v052-audit-export-'));
const databasePath = path.join(tmp, 'logs.db');
const audit = createPermissionAuditService({ databasePath });
const service = createPermissionAuditExportService({ databasePath, auditService: audit });

audit.recordEvent({
  actor: 'ADMIN-APPROVER',
  roleId: 'ADMIN',
  eventType: 'ROLE_CHANGE_APPROVED',
  permissionKey: 'system.settings.edit',
  resourceType: 'ROLE_CHANGE_REQUEST',
  resourceId: 'RCR-EXPORT-1',
  decision: 'ALLOWED',
  reasonKo: '역할 변경 승인',
  payload: {
    afterRoleId: 'MANAGER',
    status: 'APPROVED',
    riskLevel: 'HIGH',
    customer_phone: '010-1234-5678',
    customer_email: 'private@example.invalid',
    detailed_address: '서울시 테스트구 상세주소 101호',
    access_token: 'secret-token-value',
    provider_payload: { coordinates: '37.1,127.1' },
    absolute_path: 'C:\\Users\\private\\runtime.db',
    raw_customer_memo: '고객 메모 원문',
    safeReference: 'RCR-EXPORT-1'
  }
});
audit.recordEvent({
  actor: 'STAFF-1',
  roleId: 'STAFF',
  eventType: 'PERMISSION_DENIED',
  permissionKey: 'estimate.margin.view',
  decision: 'DENIED',
  reasonKo: 'private@example.invalid 사용자의 접근 차단',
  payload: { note: '연락처 010-9999-8888', safeReference: 'EST-1' }
});

const options = service.getPermissionAuditExportOptions();
assert.deepStrictEqual(options.formats, ['JSON', 'CSV', 'HTML']);
assert.ok(options.eventTypes.includes('ROLE_CHANGE_APPLIED'));
assert.strictEqual(options.redactionApplied, true);
assert.strictEqual(options.externalAuthentication, 'DISABLED');

const filters = { eventType: 'ROLE_CHANGE_APPROVED', actorRole: 'ADMIN', targetRole: 'MANAGER', status: 'APPROVED', riskLevel: 'HIGH' };
const json = service.generatePermissionAuditExport({ format: 'JSON', filters, actorId: 'CEO', actorRole: 'CEO' });
const csv = service.generatePermissionAuditExport({ format: 'CSV', filters, actorId: 'CEO', actorRole: 'CEO' });
const html = service.generatePermissionAuditExport({ format: 'HTML', filters, actorId: 'CEO', actorRole: 'CEO' });

assert.strictEqual(json.recordCount, 1, 'combined filters select expected event');
assert.ok(json.content.includes('ROLE_CHANGE_APPROVED'), 'JSON export contains event');
assert.ok(csv.content.includes('auditEventId'), 'CSV export has header');
assert.ok(csv.content.includes('ROLE_CHANGE_APPROVED'), 'CSV export contains event');
assert.ok(html.content.includes('<!doctype html>'), 'print-safe HTML is generated');
assert.ok(html.content.includes('@media print'), 'HTML contains print style');

const serialized = [json.content, csv.content, html.content].join('\n');
[
  '010-1234-5678', 'private@example.invalid', '서울시 테스트구 상세주소 101호',
  'secret-token-value', '37.1,127.1', 'C:\\Users\\private\\runtime.db',
  '고객 메모 원문', '010-9999-8888'
].forEach((term) => assert.ok(!serialized.includes(term), `export redacts ${term}`));
assert.ok(json.content.includes('[REDACTED]'), 'redaction marker is present');
assert.ok(audit.listEvents({ eventType: 'AUDIT_EXPORT_GENERATED' }).length === 3, 'each export is audited');
assert.throws(() => service.generatePermissionAuditExport({ format: 'XLSX' }), /Unsupported/, 'unsupported format is denied');

console.log(JSON.stringify({
  ok: true,
  test: 'v0-5-2-permission-audit-export',
  formats: ['JSON', 'CSV', 'HTML'],
  filters: 'PASSED',
  exportRedaction: 'PASSED',
  printSafeHtml: 'PASSED',
  exportAudit: 'PASSED'
}, null, 2));
