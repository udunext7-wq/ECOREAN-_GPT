'use strict';

const { DatabaseSync } = require('node:sqlite');
const { DEFAULT_IDENTITY_ID, DEFAULT_ORGANIZATION_ID } = require('./identityService');

const SESSION_STATUSES = ['ACTIVE', 'EXPIRED', 'REVOKED', 'INVALID'];
const DEFAULT_SESSION_ID = 'SES-LOCAL-ECOREAN';

function nowIso() { return new Date().toISOString(); }
function makeId(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`; }

function createSessionService({ sqliteService, databasePath, identityService, clock = () => new Date() } = {}) {
  const logsDbPath = databasePath || sqliteService?.dbPaths?.logs;
  if (!logsDbPath) throw new Error('Session database path is required.');

  function withDb(callback) {
    const database = new DatabaseSync(logsDbPath);
    try {
      database.exec(`
        CREATE TABLE IF NOT EXISTS identity_sessions (
          session_id TEXT PRIMARY KEY,
          identity_id TEXT NOT NULL,
          organization_id TEXT NOT NULL,
          provider_key TEXT NOT NULL,
          status TEXT NOT NULL,
          issued_at TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          revoked_at TEXT,
          revoke_reason TEXT,
          last_seen_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS identity_runtime_state (
          state_key TEXT PRIMARY KEY,
          state_value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_identity_sessions_identity
          ON identity_sessions(identity_id, status, expires_at);
      `);
      return callback(database);
    } finally { database.close(); }
  }

  function mapSession(row) {
    return row ? {
      sessionId: row.session_id,
      identityId: row.identity_id,
      organizationId: row.organization_id,
      providerKey: row.provider_key,
      status: row.status,
      issuedAt: row.issued_at,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at || '',
      revokeReason: row.revoke_reason || '',
      lastSeenAt: row.last_seen_at
    } : null;
  }

  function createSession(payload = {}) {
    const identityId = String(payload.identityId || '').trim();
    const identity = identityService?.getIdentity(identityId);
    if (!identity || identity.status !== 'ACTIVE') throw new Error('Active identity is required to create a session.');
    const sessionId = String(payload.sessionId || makeId('SES')).trim();
    const issuedAt = payload.issuedAt || nowIso();
    const expiresAt = payload.expiresAt || new Date(clock().getTime() + 12 * 60 * 60 * 1000).toISOString();
    withDb((database) => {
      database.prepare(`
        INSERT INTO identity_sessions (
          session_id, identity_id, organization_id, provider_key, status,
          issued_at, expires_at, last_seen_at
        ) VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?)
      `).run(sessionId, identityId, String(payload.organizationId || DEFAULT_ORGANIZATION_ID), String(payload.providerKey || 'LOCAL'), issuedAt, expiresAt, issuedAt);
      if (payload.makeCurrent !== false) database.prepare(`
        INSERT INTO identity_runtime_state (state_key, state_value, updated_at)
        VALUES ('CURRENT_SESSION_ID', ?, ?)
        ON CONFLICT(state_key) DO UPDATE SET state_value = excluded.state_value, updated_at = excluded.updated_at
      `).run(sessionId, issuedAt);
    });
    return getSession(sessionId);
  }

  function getSession(sessionId) {
    return withDb((database) => mapSession(database.prepare(
      'SELECT * FROM identity_sessions WHERE session_id = ?'
    ).get(String(sessionId || ''))));
  }

  function getCurrentSession() {
    return withDb((database) => {
      const state = database.prepare(
        "SELECT state_value FROM identity_runtime_state WHERE state_key = 'CURRENT_SESSION_ID'"
      ).get();
      return state ? mapSession(database.prepare(
        'SELECT * FROM identity_sessions WHERE session_id = ?'
      ).get(state.state_value)) : null;
    });
  }

  function validateSession(sessionId) {
    const session = getSession(sessionId);
    if (!session) return { valid: false, reasonCode: 'UNKNOWN_SESSION', reasonKo: '알 수 없는 세션입니다.', session: null, identity: null };
    if (session.status !== 'ACTIVE') return { valid: false, reasonCode: `SESSION_${session.status}`, reasonKo: '활성 세션이 아닙니다.', session, identity: null };
    if (new Date(session.expiresAt).getTime() <= clock().getTime()) {
      withDb((database) => database.prepare(
        "UPDATE identity_sessions SET status = 'EXPIRED', last_seen_at = ? WHERE session_id = ? AND status = 'ACTIVE'"
      ).run(nowIso(), session.sessionId));
      return { valid: false, reasonCode: 'SESSION_EXPIRED', reasonKo: '세션이 만료되었습니다.', session: getSession(session.sessionId), identity: null };
    }
    const identity = identityService?.getIdentity(session.identityId);
    if (!identity) return { valid: false, reasonCode: 'UNKNOWN_IDENTITY', reasonKo: '세션의 Identity를 확인할 수 없습니다.', session, identity: null };
    if (identity.status !== 'ACTIVE') return { valid: false, reasonCode: `IDENTITY_${identity.status}`, reasonKo: '활성 Identity가 아닙니다.', session, identity };
    return { valid: true, reasonCode: 'SESSION_ACTIVE', reasonKo: '세션이 유효합니다.', session, identity };
  }

  function revokeSession(sessionId, reason = 'REVOKED') {
    const session = getSession(sessionId);
    if (!session) throw new Error('Unknown session is denied.');
    withDb((database) => database.prepare(`
      UPDATE identity_sessions SET status = 'REVOKED', revoked_at = ?, revoke_reason = ?, last_seen_at = ?
      WHERE session_id = ?
    `).run(nowIso(), String(reason), nowIso(), sessionId));
    return getSession(sessionId);
  }

  function revokeIdentitySessions(identityId, reason = 'IDENTITY_DISABLED') {
    return withDb((database) => database.prepare(`
      UPDATE identity_sessions SET status = 'REVOKED', revoked_at = ?, revoke_reason = ?, last_seen_at = ?
      WHERE identity_id = ? AND status = 'ACTIVE'
    `).run(nowIso(), String(reason), nowIso(), String(identityId || '')).changes);
  }

  function ensureLocalSession(identityId = DEFAULT_IDENTITY_ID) {
    const existing = getSession(DEFAULT_SESSION_ID);
    if (existing) return existing;
    return createSession({
      sessionId: DEFAULT_SESSION_ID,
      identityId,
      organizationId: DEFAULT_ORGANIZATION_ID,
      providerKey: 'LOCAL',
      expiresAt: '2999-12-31T23:59:59.999Z',
      makeCurrent: true
    });
  }

  function getSessionSummary() {
    const session = getCurrentSession();
    return { session, validation: session ? validateSession(session.sessionId) : { valid: false, reasonCode: 'MISSING_SESSION' }, externalAuthentication: 'DISABLED' };
  }

  return { createSession, getSession, getCurrentSession, validateSession, revokeSession, revokeIdentitySessions, ensureLocalSession, getSessionSummary };
}

module.exports = { SESSION_STATUSES, DEFAULT_SESSION_ID, createSessionService };
