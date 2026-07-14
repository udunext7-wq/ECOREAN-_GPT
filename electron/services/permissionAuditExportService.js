'use strict';

const { createPermissionAuditService, redactAuditPayload } = require('./permissionAuditService');

const EXPORT_FORMATS = ['JSON', 'CSV', 'HTML'];
const EXPORT_EVENT_TYPES = [
  'PERMISSION_DENIED',
  'ROLE_CHANGE_REQUESTED',
  'ROLE_CHANGE_APPROVED',
  'ROLE_CHANGE_REJECTED',
  'ROLE_CHANGE_CANCELLED',
  'ROLE_CHANGE_EXPIRED',
  'ROLE_CHANGE_APPLIED',
  'ROLE_CHANGE_FAILED',
  'INTERNAL_COST_ACCESSED',
  'MARGIN_VIEWED',
  'CUSTOMER_OUTPUT_GENERATED',
  'INTERNAL_OUTPUT_GENERATED',
  'AUDIT_EXPORT_GENERATED'
];
const SENSITIVE_EXPORT_KEY_PARTS = [
  'phone', 'email', 'address', 'memo', 'token', 'credential', 'secret',
  'provider', 'coordinate', 'latitude', 'longitude', 'file_path', 'filepath',
  'absolute_path', 'absolutepath', 'db_path', 'dbpath', 'database_path',
  'runtime_path', 'private_contact', 'staff_contact', 'customer_note'
];

function normalizeKey(value) {
  return String(value || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function redactString(value) {
  const text = String(value ?? '');
  if (/\b[A-Z]:\\/i.test(text)) return '[REDACTED]';
  if (/\b[\w.+-]+@[\w.-]+\.[A-Z]{2,}\b/i.test(text)) return '[REDACTED]';
  if (/(?:\+?82[- ]?)?0\d{1,2}[- ]?\d{3,4}[- ]?\d{4}/.test(text)) return '[REDACTED]';
  if (/\bbearer\s+[A-Za-z0-9._-]{16,}\b/i.test(text)) return '[REDACTED]';
  if (/\b[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/.test(text)) return '[REDACTED]';
  return text;
}

function redactExportPayload(value, key = '') {
  const normalized = normalizeKey(key);
  if (SENSITIVE_EXPORT_KEY_PARTS.some((part) => normalized.includes(normalizeKey(part)))) {
    return '[REDACTED]';
  }
  if (Array.isArray(value)) return value.map((item) => redactExportPayload(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([childKey, item]) => [
      childKey,
      redactExportPayload(item, childKey)
    ]));
  }
  return typeof value === 'string' ? redactString(value) : value;
}

function escapeCsv(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  return `"${String(text).replace(/"/g, '""')}"`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeEventType(value) {
  return String(value || '').trim().replace(/[- ]/g, '_').toUpperCase();
}

function createPermissionAuditExportService({ sqliteService, databasePath, auditService } = {}) {
  const logsDbPath = databasePath || sqliteService?.dbPaths?.logs;
  if (!logsDbPath) throw new Error('Permission audit export database path is required.');
  const audit = auditService || createPermissionAuditService({ databasePath: logsDbPath });

  function safeRecord(event) {
    const payload = redactExportPayload(redactAuditPayload(event.payload || {}));
    return {
      auditEventId: redactString(event.auditEventId),
      actorId: redactString(event.actorId),
      actorRole: redactString(event.roleId),
      targetRole: redactString(payload.afterRoleId || payload.requestedRole || ''),
      eventType: normalizeEventType(event.eventType),
      permissionKey: redactString(event.permissionKey),
      resourceType: redactString(event.resourceType),
      resourceId: redactString(event.resourceId),
      status: redactString(payload.status || event.decision),
      riskLevel: redactString(payload.riskLevel || ''),
      decision: redactString(event.decision),
      reasonKo: redactString(event.reasonKo),
      payload,
      createdAt: event.createdAt
    };
  }

  function matchesFilters(record, filters) {
    const from = filters.fromDate ? new Date(filters.fromDate).getTime() : Number.NEGATIVE_INFINITY;
    const to = filters.toDate ? new Date(filters.toDate).getTime() : Number.POSITIVE_INFINITY;
    const created = new Date(record.createdAt).getTime();
    if (Number.isFinite(from) && created < from) return false;
    if (Number.isFinite(to) && created > to) return false;
    if (filters.eventType && normalizeEventType(filters.eventType) !== record.eventType) return false;
    if (filters.actorRole && String(filters.actorRole).toUpperCase() !== record.actorRole.toUpperCase()) return false;
    if (filters.targetRole && String(filters.targetRole).toUpperCase() !== record.targetRole.toUpperCase()) return false;
    if (filters.status && String(filters.status).toUpperCase() !== record.status.toUpperCase()) return false;
    if (filters.riskLevel && String(filters.riskLevel).toUpperCase() !== record.riskLevel.toUpperCase()) return false;
    if (filters.decision && String(filters.decision).toUpperCase() !== record.decision.toUpperCase()) return false;
    return true;
  }

  function getFilteredAuditRecords(filters = {}) {
    return audit.listEvents({ limit: Math.max(1, Math.min(500, Number(filters.limit) || 500)) })
      .map(safeRecord)
      .filter((record) => matchesFilters(record, filters));
  }

  function toCsv(records) {
    const headers = [
      'auditEventId', 'createdAt', 'eventType', 'actorId', 'actorRole',
      'targetRole', 'status', 'riskLevel', 'decision', 'permissionKey',
      'resourceType', 'resourceId', 'reasonKo', 'payload'
    ];
    return [
      headers.map(escapeCsv).join(','),
      ...records.map((record) => headers.map((header) => escapeCsv(record[header])).join(','))
    ].join('\r\n');
  }

  function toHtml(records) {
    const rows = records.map((record) => `
      <tr>
        <td>${escapeHtml(record.createdAt)}</td>
        <td>${escapeHtml(record.eventType)}</td>
        <td>${escapeHtml(record.actorRole)}</td>
        <td>${escapeHtml(record.targetRole)}</td>
        <td>${escapeHtml(record.status)}</td>
        <td>${escapeHtml(record.riskLevel)}</td>
        <td>${escapeHtml(record.reasonKo)}</td>
      </tr>`).join('');
    return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><title>권한 감사 내보내기</title>
<style>body{font-family:"Malgun Gothic",sans-serif;color:#111}table{border-collapse:collapse;width:100%}th,td{border:1px solid #bbb;padding:6px;text-align:left;font-size:11px}@media print{button{display:none}}</style>
</head><body><h1>권한 감사 내보내기</h1><p>민감정보 redaction 적용</p>
<table><thead><tr><th>일시</th><th>이벤트</th><th>행위 역할</th><th>대상 역할</th><th>상태</th><th>위험</th><th>사유</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;
  }

  function generatePermissionAuditExport(payload = {}) {
    const format = String(payload.format || 'JSON').toUpperCase();
    if (!EXPORT_FORMATS.includes(format)) throw new Error(`Unsupported audit export format: ${format}`);
    const filters = redactExportPayload(payload.filters || {});
    const records = getFilteredAuditRecords(payload.filters || {});
    const generatedAt = new Date().toISOString();
    const content = format === 'CSV'
      ? toCsv(records)
      : format === 'HTML'
        ? toHtml(records)
        : JSON.stringify({ generatedAt, filters, records }, null, 2);
    const extension = format === 'HTML' ? 'html' : format.toLowerCase();
    const result = {
      format,
      mimeType: format === 'CSV'
        ? 'text/csv;charset=utf-8'
        : format === 'HTML'
          ? 'text/html;charset=utf-8'
          : 'application/json;charset=utf-8',
      fileName: `permission-audit-${generatedAt.slice(0, 10)}.${extension}`,
      generatedAt,
      filters,
      recordCount: records.length,
      records,
      content,
      redactionApplied: true,
      externalAuthentication: 'DISABLED'
    };
    audit.recordEvent({
      actor: payload.actorId || 'LOCAL_USER',
      roleId: payload.actorRole || 'CEO',
      eventType: 'AUDIT_EXPORT_GENERATED',
      permissionKey: 'audit.view',
      resourceType: 'AUDIT_EXPORT',
      resourceId: result.fileName,
      decision: 'ALLOWED',
      reasonKo: `${format} 권한 감사 내보내기 생성`,
      payload: { format, recordCount: records.length, filters, redactionApplied: true }
    });
    return result;
  }

  function getPermissionAuditExportOptions() {
    return {
      formats: EXPORT_FORMATS,
      eventTypes: EXPORT_EVENT_TYPES,
      riskLevels: ['LOW', 'MEDIUM', 'HIGH'],
      statuses: [
        'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED',
        'EXPIRED', 'APPLIED', 'FAILED', 'ALLOWED', 'DENIED'
      ],
      redactionApplied: true,
      externalAuthentication: 'DISABLED'
    };
  }

  return {
    getFilteredAuditRecords,
    generatePermissionAuditExport,
    getPermissionAuditExportOptions,
    redactExportPayload
  };
}

module.exports = {
  EXPORT_FORMATS,
  EXPORT_EVENT_TYPES,
  redactExportPayload,
  createPermissionAuditExportService
};
