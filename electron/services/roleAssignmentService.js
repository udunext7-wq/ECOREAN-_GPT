'use strict';

const { DatabaseSync } = require('node:sqlite');
const { DEFAULT_IDENTITY_ID, DEFAULT_ORGANIZATION_ID } = require('./identityService');
const { createResourceScopeService, SCOPE_TYPES } = require('./resourceScopeService');

const ASSIGNMENT_STATUSES = ['ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED'];
const DEFAULT_ASSIGNMENT_ID = 'RASN-LOCAL-ECOREAN';

function nowIso() { return new Date().toISOString(); }
function makeId(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`; }
function normalize(value) { return String(value || '').trim().toUpperCase(); }

function createRoleAssignmentService({ sqliteService, databasePath, identityService, resourceScopeService, clock = () => new Date() } = {}) {
  const logsDbPath = databasePath || sqliteService?.dbPaths?.logs;
  if (!logsDbPath) throw new Error('Role assignment database path is required.');
  const scopes = resourceScopeService || createResourceScopeService();

  function withDb(callback) {
    const database = new DatabaseSync(logsDbPath);
    try {
      database.exec(`
        CREATE TABLE IF NOT EXISTS identity_role_assignments (
          assignment_id TEXT PRIMARY KEY,
          identity_id TEXT NOT NULL,
          role_id TEXT NOT NULL,
          scope_type TEXT NOT NULL,
          organization_id TEXT,
          project_id TEXT,
          site_id TEXT,
          status TEXT NOT NULL,
          valid_from TEXT NOT NULL,
          expires_at TEXT,
          created_by_identity_id TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_role_assignment_identity
          ON identity_role_assignments(identity_id, status, scope_type);
      `);
      return callback(database);
    } finally { database.close(); }
  }

  function mapAssignment(row) {
    return row ? {
      assignmentId: row.assignment_id,
      identityId: row.identity_id,
      roleId: row.role_id,
      scopeType: row.scope_type,
      organizationId: row.organization_id || '',
      projectId: row.project_id || '',
      siteId: row.site_id || '',
      status: row.status,
      validFrom: row.valid_from,
      expiresAt: row.expires_at || '',
      createdByIdentityId: row.created_by_identity_id || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    } : null;
  }

  function createRoleAssignment(payload = {}) {
    const identityId = String(payload.identityId || '').trim();
    const identity = identityService?.getIdentity(identityId);
    if (!identity || identity.status !== 'ACTIVE') throw new Error('Active identity is required for role assignment.');
    const scopeType = normalize(payload.scopeType || 'GLOBAL');
    const status = normalize(payload.status || 'ACTIVE');
    if (!SCOPE_TYPES.includes(scopeType)) throw new Error('Unknown role assignment scope is denied.');
    if (!ASSIGNMENT_STATUSES.includes(status)) throw new Error('Unknown role assignment status is denied.');
    const roleId = normalize(payload.roleId);
    if (!roleId) throw new Error('Role id is required.');
    if ((scopeType === 'PROJECT' || scopeType === 'SITE') && !payload.projectId) throw new Error('Project scope requires project id.');
    if (scopeType === 'SITE' && !payload.siteId) throw new Error('Site scope requires site id.');
    const timestamp = nowIso();
    const assignmentId = String(payload.assignmentId || makeId('RASN')).trim();
    withDb((database) => database.prepare(`
      INSERT INTO identity_role_assignments (
        assignment_id, identity_id, role_id, scope_type, organization_id,
        project_id, site_id, status, valid_from, expires_at,
        created_by_identity_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      assignmentId, identityId, roleId, scopeType,
      payload.organizationId || null, payload.projectId || null, payload.siteId || null,
      status, payload.validFrom || timestamp, payload.expiresAt || null,
      payload.createdByIdentityId || null, timestamp, timestamp
    ));
    return getRoleAssignment(assignmentId);
  }

  function getRoleAssignment(assignmentId) {
    return withDb((database) => mapAssignment(database.prepare(
      'SELECT * FROM identity_role_assignments WHERE assignment_id = ?'
    ).get(String(assignmentId || ''))));
  }

  function listRoleAssignments(identityId) {
    return withDb((database) => database.prepare(`
      SELECT * FROM identity_role_assignments WHERE identity_id = ? ORDER BY created_at
    `).all(String(identityId || '')).map(mapAssignment));
  }

  function updateAssignmentStatus(assignmentId, status) {
    const normalizedStatus = normalize(status);
    if (!ASSIGNMENT_STATUSES.includes(normalizedStatus)) throw new Error('Unknown role assignment status is denied.');
    if (!getRoleAssignment(assignmentId)) throw new Error('Unknown role assignment is denied.');
    withDb((database) => database.prepare(`
      UPDATE identity_role_assignments SET status = ?, updated_at = ? WHERE assignment_id = ?
    `).run(normalizedStatus, nowIso(), assignmentId));
    return getRoleAssignment(assignmentId);
  }

  function updateAssignmentRole(assignmentId, roleId) {
    const assignment = getRoleAssignment(assignmentId);
    if (!assignment) throw new Error('Unknown role assignment is denied.');
    const normalizedRoleId = normalize(roleId);
    if (!normalizedRoleId) throw new Error('Role id is required.');
    withDb((database) => database.prepare(`
      UPDATE identity_role_assignments SET role_id = ?, updated_at = ? WHERE assignment_id = ? AND status = 'ACTIVE'
    `).run(normalizedRoleId, nowIso(), assignmentId));
    return getRoleAssignment(assignmentId);
  }

  function evaluateAssignments(identityId, context = {}) {
    const now = clock().getTime();
    const assignments = listRoleAssignments(identityId);
    const candidates = [];
    const rejected = [];
    assignments.forEach((assignment) => {
      if (assignment.status !== 'ACTIVE') {
        rejected.push({ assignment, reasonCode: `ASSIGNMENT_${assignment.status}` });
        return;
      }
      if (new Date(assignment.validFrom).getTime() > now) {
        rejected.push({ assignment, reasonCode: 'ASSIGNMENT_NOT_YET_VALID' });
        return;
      }
      if (assignment.expiresAt && new Date(assignment.expiresAt).getTime() <= now) {
        rejected.push({ assignment, reasonCode: 'ASSIGNMENT_EXPIRED' });
        return;
      }
      const scope = scopes.evaluateScope(assignment, context);
      if (scope.allowed) candidates.push({ assignment, scope });
      else rejected.push({ assignment, ...scope });
    });
    return { allowed: candidates.length > 0, candidates, rejected };
  }

  function ensureDefaultAssignment(payload = {}) {
    const existing = getRoleAssignment(DEFAULT_ASSIGNMENT_ID);
    if (existing) return existing;
    return createRoleAssignment({
      assignmentId: DEFAULT_ASSIGNMENT_ID,
      identityId: payload.identityId || DEFAULT_IDENTITY_ID,
      roleId: payload.roleId || 'CEO',
      scopeType: 'GLOBAL',
      organizationId: payload.organizationId || DEFAULT_ORGANIZATION_ID,
      createdByIdentityId: payload.identityId || DEFAULT_IDENTITY_ID
    });
  }

  return {
    createRoleAssignment,
    getRoleAssignment,
    listRoleAssignments,
    updateAssignmentStatus,
    updateAssignmentRole,
    evaluateAssignments,
    ensureDefaultAssignment
  };
}

module.exports = { ASSIGNMENT_STATUSES, DEFAULT_ASSIGNMENT_ID, createRoleAssignmentService };
