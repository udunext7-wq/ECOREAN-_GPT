'use strict';

const { DatabaseSync } = require('node:sqlite');

const SENSITIVE_KEY_PARTS = [
  'password', 'credential', 'secret', 'token', 'api_key', 'apikey',
  'customer_phone', 'customer_email', 'detailed_address', 'memo',
  'raw_phone', 'raw_email', 'full_address', 'provider_payload', 'providerpayload',
  'resident_registration', 'account_number', 'coordinates', 'latitude', 'longitude',
  'absolute_path', 'file_path', 'filepath', 'db_path', 'database_path', 'runtime_path',
  'private_staff_contact', 'staff_private_contact', 'provider_user_id',
  'provider_subject', 'access_token', 'refresh_token', 'authorization'
];

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
}

function normalizeKey(value) {
  return String(value || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function redactAuditPayload(value) {
  if (Array.isArray(value)) return value.map(redactAuditPayload);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    const normalized = normalizeKey(key);
    const blocked = SENSITIVE_KEY_PARTS.some((part) => normalized.includes(normalizeKey(part)));
    return [key, blocked ? '[REDACTED]' : redactAuditPayload(item)];
  }));
}

function createPermissionAuditService({ sqliteService, databasePath } = {}) {
  const logsDbPath = databasePath || sqliteService?.dbPaths?.logs;
  if (!logsDbPath) throw new Error('Permission audit database path is required.');

  function withDb(callback) {
    const database = new DatabaseSync(logsDbPath);
    try {
      database.exec(`
        CREATE TABLE IF NOT EXISTS permission_audit_events (
          audit_event_id TEXT PRIMARY KEY,
          actor_id TEXT NOT NULL,
          role_id TEXT NOT NULL,
          event_type TEXT NOT NULL,
          permission_key TEXT NOT NULL,
          resource_type TEXT NOT NULL,
          resource_id TEXT NOT NULL,
          decision TEXT NOT NULL,
          reason_ko TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_permission_audit_created
          ON permission_audit_events(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_permission_audit_role
          ON permission_audit_events(role_id, decision, created_at DESC);
      `);
      const columns = new Set(database.prepare('PRAGMA table_info(permission_audit_events)').all().map((row) => row.name));
      [
        ['actor_identity_id', 'TEXT'],
        ['actor_organization_id', 'TEXT'],
        ['session_id', 'TEXT']
      ].forEach(([name, type]) => {
        if (!columns.has(name)) database.exec(`ALTER TABLE permission_audit_events ADD COLUMN ${name} ${type}`);
      });
      return callback(database);
    } finally {
      database.close();
    }
  }

  function recordEvent(payload = {}) {
    const event = {
      auditEventId: payload.auditEventId || makeId('PAUD'),
      actorId: String(payload.actorId || payload.actor || 'LOCAL_USER'),
      actorIdentityId: String(payload.actorIdentityId || payload.identityId || ''),
      actorOrganizationId: String(payload.actorOrganizationId || payload.organizationId || ''),
      sessionId: String(payload.sessionId || ''),
      roleId: String(payload.roleId || 'UNKNOWN'),
      eventType: String(payload.eventType || 'PERMISSION_CHECK'),
      permissionKey: String(payload.permissionKey || ''),
      resourceType: String(payload.resourceType || 'GLOBAL'),
      resourceId: String(payload.resourceId || 'GLOBAL'),
      decision: String(payload.decision || 'DENIED'),
      reasonKo: String(payload.reasonKo || ''),
      payload: redactAuditPayload(payload.payload || {}),
      createdAt: payload.createdAt || nowIso()
    };

    withDb((database) => {
      database.prepare(`
        INSERT INTO permission_audit_events (
          audit_event_id, actor_id, role_id, event_type, permission_key,
          resource_type, resource_id, decision, reason_ko, payload_json, created_at,
          actor_identity_id, actor_organization_id, session_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        event.auditEventId,
        event.actorId,
        event.roleId,
        event.eventType,
        event.permissionKey,
        event.resourceType,
        event.resourceId,
        event.decision,
        event.reasonKo,
        JSON.stringify(event.payload),
        event.createdAt,
        event.actorIdentityId || null,
        event.actorOrganizationId || null,
        event.sessionId || null
      );
    });

    return event;
  }

  function listEvents({ roleId = '', decision = '', eventType = '', permissionKey = '', limit = 100 } = {}) {
    return withDb((database) => {
      const clauses = [];
      const values = [];
      if (roleId) {
        clauses.push('role_id = ?');
        values.push(roleId);
      }
      if (decision) {
        clauses.push('decision = ?');
        values.push(decision);
      }
      if (eventType) {
        clauses.push('event_type = ?');
        values.push(eventType);
      }
      if (permissionKey) {
        clauses.push('permission_key = ?');
        values.push(permissionKey);
      }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      values.push(Math.max(1, Math.min(500, Number(limit) || 100)));
      return database.prepare(`
        SELECT * FROM permission_audit_events
        ${where}
        ORDER BY created_at DESC
        LIMIT ?
      `).all(...values).map((row) => ({
        auditEventId: row.audit_event_id,
        actorId: row.actor_id,
        actorIdentityId: row.actor_identity_id || '',
        actorOrganizationId: row.actor_organization_id || '',
        sessionId: row.session_id || '',
        roleId: row.role_id,
        eventType: row.event_type,
        permissionKey: row.permission_key,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        decision: row.decision,
        reasonKo: row.reason_ko,
        payload: JSON.parse(row.payload_json || '{}'),
        createdAt: row.created_at
      }));
    });
  }

  return {
    recordEvent,
    listEvents,
    redactAuditPayload
  };
}

module.exports = {
  createPermissionAuditService,
  redactAuditPayload
};
