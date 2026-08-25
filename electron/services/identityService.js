'use strict';

const { DatabaseSync } = require('node:sqlite');

const IDENTITY_TYPES = ['USER', 'EMPLOYEE', 'PARTNER', 'CLIENT', 'SERVICE_ACCOUNT', 'SYSTEM'];
const IDENTITY_STATUSES = ['ACTIVE', 'SUSPENDED', 'DISABLED', 'ARCHIVED'];
const MEMBERSHIP_TYPES = ['OWNER', 'EMPLOYEE', 'PARTNER', 'CLIENT', 'SYSTEM'];
const DEFAULT_IDENTITY_ID = 'IDN-LOCAL-ECOREAN-OWNER';
const DEFAULT_ORGANIZATION_ID = 'ORG-ECOREAN';
const DEFAULT_EMPLOYEE_ID = 'EMP-LOCAL-OWNER';
const IDENTITY_SCHEMA_VERSION = 'v0.6.0-identity-core-1';

function nowIso() { return new Date().toISOString(); }
function makeId(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`; }
function normalize(value) { return String(value || '').trim().toUpperCase(); }

function createIdentityService({ sqliteService, databasePath } = {}) {
  const logsDbPath = databasePath || sqliteService?.dbPaths?.logs;
  if (!logsDbPath) throw new Error('Identity database path is required.');
  let sessionController = null;

  function withDb(callback) {
    const database = new DatabaseSync(logsDbPath);
    try {
      database.exec(`
        CREATE TABLE IF NOT EXISTS identities (
          identity_id TEXT PRIMARY KEY,
          identity_type TEXT NOT NULL,
          display_name_ko TEXT NOT NULL,
          status TEXT NOT NULL,
          provider_key TEXT NOT NULL,
          provider_subject TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS employees (
          employee_id TEXT PRIMARY KEY,
          identity_id TEXT NOT NULL UNIQUE,
          organization_id TEXT NOT NULL,
          employee_code TEXT NOT NULL,
          display_name_ko TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS organization_memberships (
          membership_id TEXT PRIMARY KEY,
          identity_id TEXT NOT NULL,
          organization_id TEXT NOT NULL,
          membership_type TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(identity_id, organization_id, membership_type)
        );
        CREATE TABLE IF NOT EXISTS identity_schema_versions (
          version_key TEXT PRIMARY KEY,
          applied_at TEXT NOT NULL,
          result_json TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_identity_status ON identities(status, identity_type);
        CREATE INDEX IF NOT EXISTS idx_membership_identity ON organization_memberships(identity_id, status);
      `);
      return callback(database);
    } finally {
      database.close();
    }
  }

  function mapIdentity(row) {
    return row ? {
      identityId: row.identity_id,
      identityType: row.identity_type,
      displayNameKo: row.display_name_ko,
      status: row.status,
      providerKey: row.provider_key,
      providerSubject: row.provider_subject || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    } : null;
  }

  function createIdentity(payload = {}) {
    const identityType = normalize(payload.identityType || 'USER');
    const status = normalize(payload.status || 'ACTIVE');
    if (!IDENTITY_TYPES.includes(identityType)) throw new Error('Unknown identity type is denied.');
    if (!IDENTITY_STATUSES.includes(status)) throw new Error('Unknown identity status is denied.');
    const identityId = String(payload.identityId || makeId('IDN')).trim();
    const displayNameKo = String(payload.displayNameKo || '').trim();
    if (!identityId || !displayNameKo) throw new Error('Identity id and display name are required.');
    const timestamp = nowIso();
    withDb((database) => database.prepare(`
      INSERT INTO identities (
        identity_id, identity_type, display_name_ko, status,
        provider_key, provider_subject, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      identityId, identityType, displayNameKo, status,
      String(payload.providerKey || 'LOCAL'), payload.providerSubject || null,
      timestamp, timestamp
    ));
    return getIdentity(identityId);
  }

  function getIdentity(identityId) {
    return withDb((database) => mapIdentity(database.prepare(
      'SELECT * FROM identities WHERE identity_id = ?'
    ).get(String(identityId || ''))));
  }

  function requireIdentity(identityId) {
    const identity = getIdentity(identityId);
    if (!identity) throw new Error('Unknown identity is denied.');
    return identity;
  }

  function listIdentities(filters = {}) {
    return withDb((database) => {
      const rows = filters.status
        ? database.prepare('SELECT * FROM identities WHERE status = ? ORDER BY created_at').all(normalize(filters.status))
        : database.prepare('SELECT * FROM identities ORDER BY created_at').all();
      return rows.map(mapIdentity);
    });
  }

  function updateIdentityStatus(identityId, status) {
    const normalizedStatus = normalize(status);
    if (!IDENTITY_STATUSES.includes(normalizedStatus)) throw new Error('Unknown identity status is denied.');
    requireIdentity(identityId);
    withDb((database) => database.prepare(`
      UPDATE identities SET status = ?, updated_at = ? WHERE identity_id = ?
    `).run(normalizedStatus, nowIso(), identityId));
    if (['SUSPENDED', 'DISABLED', 'ARCHIVED'].includes(normalizedStatus)) {
      sessionController?.revokeIdentitySessions?.(identityId, `IDENTITY_${normalizedStatus}`);
    }
    return getIdentity(identityId);
  }

  function setSessionService(sessionService) {
    sessionController = sessionService;
  }

  function createOrganizationMembership(payload = {}) {
    const identity = requireIdentity(payload.identityId);
    const membershipType = normalize(payload.membershipType || 'EMPLOYEE');
    if (!MEMBERSHIP_TYPES.includes(membershipType)) throw new Error('Unknown membership type is denied.');
    const organizationId = String(payload.organizationId || '').trim();
    if (!organizationId) throw new Error('Organization id is required.');
    const timestamp = nowIso();
    const membershipId = String(payload.membershipId || makeId('MEM')).trim();
    withDb((database) => database.prepare(`
      INSERT INTO organization_memberships (
        membership_id, identity_id, organization_id, membership_type, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)
      ON CONFLICT(identity_id, organization_id, membership_type) DO UPDATE SET
        status = 'ACTIVE', updated_at = excluded.updated_at
    `).run(membershipId, identity.identityId, organizationId, membershipType, timestamp, timestamp));
    return listOrganizationMemberships(identity.identityId);
  }

  function listOrganizationMemberships(identityId) {
    return withDb((database) => database.prepare(`
      SELECT membership_id, identity_id, organization_id, membership_type, status, created_at, updated_at
      FROM organization_memberships WHERE identity_id = ? ORDER BY created_at
    `).all(String(identityId || '')).map((row) => ({
      membershipId: row.membership_id,
      identityId: row.identity_id,
      organizationId: row.organization_id,
      membershipType: row.membership_type,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    })));
  }

  function ensureDefaultLocalIdentity() {
    const timestamp = nowIso();
    withDb((database) => {
      database.prepare(`
        INSERT OR IGNORE INTO identities (
          identity_id, identity_type, display_name_ko, status,
          provider_key, provider_subject, created_at, updated_at
        ) VALUES (?, 'EMPLOYEE', '로컬 운영 책임자', 'ACTIVE', 'LOCAL', 'USER-LOCAL-RBAC', ?, ?)
      `).run(DEFAULT_IDENTITY_ID, timestamp, timestamp);
      database.prepare(`
        INSERT OR IGNORE INTO employees (
          employee_id, identity_id, organization_id, employee_code,
          display_name_ko, status, created_at, updated_at
        ) VALUES (?, ?, ?, 'LOCAL-OWNER', '로컬 운영 책임자', 'ACTIVE', ?, ?)
      `).run(DEFAULT_EMPLOYEE_ID, DEFAULT_IDENTITY_ID, DEFAULT_ORGANIZATION_ID, timestamp, timestamp);
      database.prepare(`
        INSERT OR IGNORE INTO organization_memberships (
          membership_id, identity_id, organization_id, membership_type,
          status, created_at, updated_at
        ) VALUES ('MEM-LOCAL-ECOREAN-OWNER', ?, ?, 'OWNER', 'ACTIVE', ?, ?)
      `).run(DEFAULT_IDENTITY_ID, DEFAULT_ORGANIZATION_ID, timestamp, timestamp);
    });
    return getIdentity(DEFAULT_IDENTITY_ID);
  }

  function migrateLegacyLocalRole({ rolePermissionService, roleAssignmentService, sessionService, ensureSession = true } = {}) {
    const existing = withDb((database) => database.prepare(
      'SELECT * FROM identity_schema_versions WHERE version_key = ?'
    ).get(IDENTITY_SCHEMA_VERSION));
    const identity = ensureDefaultLocalIdentity();
    const legacy = rolePermissionService?.getCurrentRole?.() || { roleId: 'CEO', userId: 'USER-LOCAL-RBAC' };
    const assignment = roleAssignmentService?.ensureDefaultAssignment?.({
      identityId: identity.identityId,
      roleId: legacy.roleId,
      organizationId: DEFAULT_ORGANIZATION_ID
    }) || null;
    const session = ensureSession ? (sessionService?.ensureLocalSession?.(identity.identityId) || null) : null;
    const result = {
      version: IDENTITY_SCHEMA_VERSION,
      alreadyApplied: Boolean(existing),
      identityId: identity.identityId,
      legacyUserId: legacy.userId,
      roleId: legacy.roleId,
      assignmentId: assignment?.assignmentId || '',
      sessionId: session?.sessionId || '',
      destructiveChanges: false
    };
    withDb((database) => database.prepare(`
      INSERT OR IGNORE INTO identity_schema_versions (version_key, applied_at, result_json)
      VALUES (?, ?, ?)
    `).run(IDENTITY_SCHEMA_VERSION, nowIso(), JSON.stringify(result)));
    return result;
  }

  function getIdentitySummary(identityId = DEFAULT_IDENTITY_ID) {
    const identity = getIdentity(identityId);
    return {
      identity,
      memberships: identity ? listOrganizationMemberships(identity.identityId) : [],
      architectureVersion: 'v0.6.0-identity-auth-readiness',
      externalAuthentication: 'DISABLED'
    };
  }

  return {
    createIdentity,
    getIdentity,
    requireIdentity,
    listIdentities,
    updateIdentityStatus,
    createOrganizationMembership,
    listOrganizationMemberships,
    ensureDefaultLocalIdentity,
    migrateLegacyLocalRole,
    getIdentitySummary,
    setSessionService
  };
}

module.exports = {
  IDENTITY_TYPES,
  IDENTITY_STATUSES,
  MEMBERSHIP_TYPES,
  DEFAULT_IDENTITY_ID,
  DEFAULT_ORGANIZATION_ID,
  DEFAULT_EMPLOYEE_ID,
  IDENTITY_SCHEMA_VERSION,
  createIdentityService
};
