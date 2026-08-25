'use strict';

const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const BINDING_STATUSES = ['ACTIVE', 'REVOKED'];
const PROVIDER_TYPES = ['SUPABASE'];
const SCHEMA_VERSION = 'v0.6.1-external-identity-binding-1';

function nowIso() { return new Date().toISOString(); }
function makeId(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`; }
function fingerprintProviderUser(providerType, providerUserId) {
  return crypto.createHash('sha256').update(`ecorean-binding:${providerType}:${providerUserId}`).digest('hex');
}

function createExternalIdentityBindingService({
  sqliteService,
  databasePath,
  identityService,
  permissionAuditService,
  authorizeAction,
  getCurrentActorContext,
  clock = () => new Date()
} = {}) {
  const logsDbPath = databasePath || sqliteService?.dbPaths?.logs;
  if (!logsDbPath) throw new Error('External identity binding database path is required.');
  if (!identityService) throw new Error('External identity binding requires identity service.');

  function withDb(callback) {
    const database = new DatabaseSync(logsDbPath);
    try {
      database.exec(`
        CREATE TABLE IF NOT EXISTS external_identity_bindings (
          binding_id TEXT PRIMARY KEY,
          provider_type TEXT NOT NULL,
          provider_user_id TEXT NOT NULL,
          provider_user_fingerprint TEXT NOT NULL,
          identity_id TEXT NOT NULL,
          status TEXT NOT NULL,
          created_by_identity_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          revoked_by_identity_id TEXT,
          revoked_at TEXT,
          revoke_reason TEXT,
          version INTEGER NOT NULL DEFAULT 1
        );
        CREATE UNIQUE INDEX IF NOT EXISTS idx_external_binding_active_provider_user
          ON external_identity_bindings(provider_type, provider_user_id)
          WHERE status = 'ACTIVE';
        CREATE INDEX IF NOT EXISTS idx_external_binding_identity
          ON external_identity_bindings(identity_id, status, created_at DESC);
        CREATE TABLE IF NOT EXISTS external_identity_binding_schema_versions (
          version_key TEXT PRIMARY KEY,
          applied_at TEXT NOT NULL
        );
      `);
      database.prepare(`
        INSERT OR IGNORE INTO external_identity_binding_schema_versions (version_key, applied_at)
        VALUES (?, ?)
      `).run(SCHEMA_VERSION, clock().toISOString());
      return callback(database);
    } finally { database.close(); }
  }

  function mapInternal(row) {
    return row ? {
      bindingId: row.binding_id,
      providerType: row.provider_type,
      providerUserId: row.provider_user_id,
      providerUserFingerprint: row.provider_user_fingerprint,
      identityId: row.identity_id,
      status: row.status,
      createdByIdentityId: row.created_by_identity_id,
      createdAt: row.created_at,
      revokedByIdentityId: row.revoked_by_identity_id || '',
      revokedAt: row.revoked_at || '',
      revokeReason: row.revoke_reason || '',
      version: Number(row.version || 1)
    } : null;
  }

  function toSafe(binding) {
    if (!binding) return null;
    return {
      bindingId: binding.bindingId,
      providerType: binding.providerType,
      providerUserFingerprint: binding.providerUserFingerprint.slice(0, 16),
      providerUserLabel: `${binding.providerType}-${binding.providerUserFingerprint.slice(0, 8)}`,
      identityId: binding.identityId,
      status: binding.status,
      createdAt: binding.createdAt,
      revokedAt: binding.revokedAt,
      version: binding.version
    };
  }

  function getTrustedActor(permissionKey = 'system.settings.edit') {
    const context = getCurrentActorContext?.();
    if (!context?.identity?.identityId || !context?.session?.sessionId) throw new Error('Active current identity session is required.');
    const decision = authorizeAction?.(permissionKey, context) || { allowed: false, reasonCode: 'AUTHORIZATION_UNAVAILABLE' };
    if (!decision.allowed) throw new Error(`Permission denied: ${decision.reasonCode || 'DENY'}.`);
    return context;
  }

  function getBindingForProvider(providerType, providerUserId) {
    const normalizedProvider = String(providerType || '').trim().toUpperCase();
    const normalizedUserId = String(providerUserId || '').trim();
    if (!PROVIDER_TYPES.includes(normalizedProvider) || !normalizedUserId) return null;
    return withDb((database) => mapInternal(database.prepare(`
      SELECT * FROM external_identity_bindings
      WHERE provider_type = ? AND provider_user_id = ? AND status = 'ACTIVE'
      ORDER BY created_at DESC LIMIT 1
    `).get(normalizedProvider, normalizedUserId)));
  }

  function getBinding(bindingId) {
    return withDb((database) => mapInternal(database.prepare(
      'SELECT * FROM external_identity_bindings WHERE binding_id = ?'
    ).get(String(bindingId || ''))));
  }

  function listSafeBindings(filters = {}) {
    getTrustedActor('system.settings.view');
    return withDb((database) => {
      const rows = filters.status
        ? database.prepare('SELECT * FROM external_identity_bindings WHERE status = ? ORDER BY created_at DESC').all(String(filters.status).toUpperCase())
        : database.prepare('SELECT * FROM external_identity_bindings ORDER BY created_at DESC').all();
      return rows.map(mapInternal).map(toSafe);
    });
  }

  function createBinding(payload = {}) {
    const actor = getTrustedActor();
    const providerType = String(payload.providerType || 'SUPABASE').trim().toUpperCase();
    const providerUserId = String(payload.providerUserId || '').trim();
    const identityId = String(payload.identityId || '').trim();
    if (!PROVIDER_TYPES.includes(providerType)) throw new Error('Unknown external identity provider is denied.');
    if (!providerUserId || !identityId) throw new Error('Provider user and ECOREAN identity are required.');
    const identity = identityService.getIdentity(identityId);
    if (!identity || identity.status !== 'ACTIVE') throw new Error('Active ECOREAN identity is required.');
    const existing = getBindingForProvider(providerType, providerUserId);
    if (existing) {
      if (existing.identityId !== identityId) throw new Error('Provider user already has an active binding.');
      return toSafe(existing);
    }
    const timestamp = clock().toISOString();
    const bindingId = String(payload.bindingId || makeId('XIB')).trim();
    const fingerprint = fingerprintProviderUser(providerType, providerUserId);
    withDb((database) => database.prepare(`
      INSERT INTO external_identity_bindings (
        binding_id, provider_type, provider_user_id, provider_user_fingerprint,
        identity_id, status, created_by_identity_id, created_at, version
      ) VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, 1)
    `).run(bindingId, providerType, providerUserId, fingerprint, identityId, actor.identity.identityId, timestamp));
    permissionAuditService?.recordEvent?.({
      actorId: actor.identity.identityId,
      actorIdentityId: actor.identity.identityId,
      actorOrganizationId: actor.session.organizationId,
      sessionId: actor.session.sessionId,
      roleId: actor.assignment?.roleId || 'UNKNOWN',
      eventType: 'EXTERNAL_IDENTITY_BOUND',
      permissionKey: 'system.settings.edit',
      resourceType: 'EXTERNAL_IDENTITY_BINDING',
      resourceId: bindingId,
      decision: 'ALLOWED',
      reasonKo: '외부 인증 사용자를 ECOREAN Identity에 연결했습니다.',
      payload: { providerType, providerUserFingerprint: fingerprint.slice(0, 16), identityId }
    });
    return toSafe(getBinding(bindingId));
  }

  function revokeBinding(bindingId, reason = '') {
    const actor = getTrustedActor();
    const existing = getBinding(bindingId);
    if (!existing) throw new Error('External identity binding was not found.');
    if (existing.status === 'REVOKED') return toSafe(existing);
    const timestamp = clock().toISOString();
    withDb((database) => database.prepare(`
      UPDATE external_identity_bindings
      SET status = 'REVOKED', revoked_by_identity_id = ?, revoked_at = ?, revoke_reason = ?, version = version + 1
      WHERE binding_id = ? AND status = 'ACTIVE'
    `).run(actor.identity.identityId, timestamp, String(reason || '관리자 연결 해제'), bindingId));
    permissionAuditService?.recordEvent?.({
      actorId: actor.identity.identityId,
      actorIdentityId: actor.identity.identityId,
      actorOrganizationId: actor.session.organizationId,
      sessionId: actor.session.sessionId,
      roleId: actor.assignment?.roleId || 'UNKNOWN',
      eventType: 'EXTERNAL_IDENTITY_REVOKED',
      permissionKey: 'system.settings.edit',
      resourceType: 'EXTERNAL_IDENTITY_BINDING',
      resourceId: bindingId,
      decision: 'ALLOWED',
      reasonKo: '외부 인증 사용자 연결을 해제했습니다.',
      payload: { providerType: existing.providerType, providerUserFingerprint: existing.providerUserFingerprint.slice(0, 16), identityId: existing.identityId }
    });
    return toSafe(getBinding(bindingId));
  }

  function getMigrationStatus() {
    return withDb((database) => ({
      version: SCHEMA_VERSION,
      applied: Boolean(database.prepare('SELECT version_key FROM external_identity_binding_schema_versions WHERE version_key = ?').get(SCHEMA_VERSION)),
      activeBindingCount: Number(database.prepare("SELECT COUNT(*) AS count FROM external_identity_bindings WHERE status = 'ACTIVE'").get().count || 0)
    }));
  }

  withDb(() => null);
  return {
    getBindingForProvider,
    listSafeBindings,
    createBinding,
    revokeBinding,
    getMigrationStatus,
    toSafe
  };
}

module.exports = {
  BINDING_STATUSES,
  PROVIDER_TYPES,
  SCHEMA_VERSION,
  fingerprintProviderUser,
  createExternalIdentityBindingService
};
