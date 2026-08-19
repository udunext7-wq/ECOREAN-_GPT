'use strict';

const { DatabaseSync } = require('node:sqlite');
const {
  ROLE_DEFINITIONS,
  ROLE_PERMISSION_MATRIX,
  DANGEROUS_PERMISSION_KEYS,
  createRolePermissionService
} = require('./rolePermissionService');
const { createPermissionAuditService } = require('./permissionAuditService');
const { DEFAULT_IDENTITY_ID } = require('./identityService');

const REQUEST_STATUSES = [
  'DRAFT', 'PENDING', 'APPROVED', 'REJECTED',
  'CANCELLED', 'EXPIRED', 'APPLIED', 'FAILED'
];
const TERMINAL_STATUSES = new Set(['REJECTED', 'CANCELLED', 'EXPIRED', 'APPLIED', 'FAILED']);
const HIGH_RISK_ROLES = new Set(['CEO', 'ADMIN']);

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
}

function normalizeRoleId(value) {
  return String(value || '').trim().toUpperCase();
}

function isKnownRole(roleId) {
  return ROLE_DEFINITIONS.some((role) => role.roleId === normalizeRoleId(roleId));
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value || '');
  } catch (_error) {
    return fallback;
  }
}

function createRoleChangeApprovalService({
  sqliteService,
  databasePath,
  rolePermissionService,
  auditService,
  identityService,
  sessionService,
  roleAssignmentService,
  clock = () => new Date()
} = {}) {
  const logsDbPath = databasePath || sqliteService?.dbPaths?.logs;
  if (!logsDbPath) throw new Error('Role change approval database path is required.');
  const audit = auditService || createPermissionAuditService({ databasePath: logsDbPath });
  const roles = rolePermissionService || createRolePermissionService({
    databasePath: logsDbPath,
    auditService: audit
  });
  const identityAware = Boolean(identityService && sessionService && roleAssignmentService && roles.evaluateAuthorization);

  function currentIso() {
    return clock().toISOString();
  }

  function withDb(callback) {
    const database = new DatabaseSync(logsDbPath);
    try {
      database.exec(`
        CREATE TABLE IF NOT EXISTS role_change_requests (
          request_id TEXT PRIMARY KEY,
          requester_id TEXT NOT NULL,
          requester_role TEXT NOT NULL,
          target_user_id TEXT NOT NULL,
          current_role TEXT NOT NULL,
          requested_role TEXT NOT NULL,
          reason_ko TEXT NOT NULL,
          status TEXT NOT NULL,
          risk_level TEXT NOT NULL,
          permission_diff_json TEXT NOT NULL,
          approved_by TEXT,
          approved_at TEXT,
          rejected_by TEXT,
          rejected_at TEXT,
          cancelled_by TEXT,
          cancelled_at TEXT,
          expired_at TEXT,
          applied_at TEXT,
          failed_at TEXT,
          failure_reason_ko TEXT,
          expires_at TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_role_change_status
          ON role_change_requests(status, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_role_change_target
          ON role_change_requests(target_user_id, created_at DESC);
        CREATE TABLE IF NOT EXISTS role_change_request_events (
          event_id TEXT PRIMARY KEY,
          request_id TEXT NOT NULL,
          action TEXT NOT NULL,
          actor_id TEXT NOT NULL,
          actor_role TEXT NOT NULL,
          before_status TEXT,
          after_status TEXT NOT NULL,
          note_ko TEXT NOT NULL,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_role_change_event_request
          ON role_change_request_events(request_id, created_at DESC);
      `);
      const requestColumns = new Set(database.prepare('PRAGMA table_info(role_change_requests)').all().map((row) => row.name));
      [
        ['requested_by_identity_id', 'TEXT'],
        ['target_identity_id', 'TEXT'],
        ['reviewed_by_identity_id', 'TEXT'],
        ['approved_by_identity_id', 'TEXT'],
        ['applied_by_identity_id', 'TEXT']
      ].forEach(([name, type]) => {
        if (!requestColumns.has(name)) database.exec(`ALTER TABLE role_change_requests ADD COLUMN ${name} ${type}`);
      });
      return callback(database);
    } finally {
      database.close();
    }
  }

  function getPermissionDiff(currentRole, requestedRole) {
    const normalizedCurrent = normalizeRoleId(currentRole);
    const normalizedRequested = normalizeRoleId(requestedRole);
    if (!isKnownRole(normalizedCurrent) || !isKnownRole(normalizedRequested)) {
      throw new Error('Unknown or missing role is denied.');
    }
    const currentPermissions = ROLE_PERMISSION_MATRIX[normalizedCurrent] || [];
    const requestedPermissions = ROLE_PERMISSION_MATRIX[normalizedRequested] || [];
    const addedPermissions = requestedPermissions.filter((key) => !currentPermissions.includes(key));
    const removedPermissions = currentPermissions.filter((key) => !requestedPermissions.includes(key));
    const dangerousAddedPermissions = addedPermissions.filter((key) => DANGEROUS_PERMISSION_KEYS.includes(key));
    return {
      currentRole: normalizedCurrent,
      requestedRole: normalizedRequested,
      addedPermissions,
      removedPermissions,
      unchangedPermissionCount: requestedPermissions.filter((key) => currentPermissions.includes(key)).length,
      dangerousAddedPermissions
    };
  }

  function classifyRisk(currentRole, requestedRole, permissionDiff = getPermissionDiff(currentRole, requestedRole)) {
    const reasons = [];
    if (HIGH_RISK_ROLES.has(permissionDiff.requestedRole)) reasons.push('HIGH_RISK_ROLE');
    if (permissionDiff.dangerousAddedPermissions.length) reasons.push('DANGEROUS_PERMISSION_ADDED');
    if (permissionDiff.currentRole === 'CLIENT_VIEWER' && permissionDiff.addedPermissions.length) {
      reasons.push('CUSTOMER_TO_INTERNAL_TRANSITION');
    }
    const riskLevel = reasons.length
      ? 'HIGH'
      : permissionDiff.addedPermissions.length
        ? 'MEDIUM'
        : 'LOW';
    return { riskLevel, reasons };
  }

  function mapRequest(row, database) {
    if (!row) return null;
    return {
      requestId: row.request_id,
      requesterId: row.requester_id,
      requestedByIdentityId: row.requested_by_identity_id || '',
      requesterRole: row.requester_role,
      targetUserId: row.target_user_id,
      targetIdentityId: row.target_identity_id || '',
      currentRole: row.current_role,
      requestedRole: row.requested_role,
      reasonKo: row.reason_ko,
      status: row.status,
      riskLevel: row.risk_level,
      permissionDiff: parseJson(row.permission_diff_json, {}),
      approvedBy: row.approved_by || '',
      reviewedByIdentityId: row.reviewed_by_identity_id || '',
      approvedByIdentityId: row.approved_by_identity_id || '',
      appliedByIdentityId: row.applied_by_identity_id || '',
      approvedAt: row.approved_at || '',
      rejectedBy: row.rejected_by || '',
      rejectedAt: row.rejected_at || '',
      cancelledBy: row.cancelled_by || '',
      cancelledAt: row.cancelled_at || '',
      expiredAt: row.expired_at || '',
      appliedAt: row.applied_at || '',
      failedAt: row.failed_at || '',
      failureReasonKo: row.failure_reason_ko || '',
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      events: database ? database.prepare(`
        SELECT * FROM role_change_request_events
        WHERE request_id = ? ORDER BY created_at ASC
      `).all(row.request_id).map((event) => ({
        eventId: event.event_id,
        action: event.action,
        actorId: event.actor_id,
        actorRole: event.actor_role,
        beforeStatus: event.before_status || '',
        afterStatus: event.after_status,
        noteKo: event.note_ko,
        createdAt: event.created_at
      })) : []
    };
  }

  function recordRequestEvent(database, request, action, actorId, actorRole, beforeStatus, afterStatus, noteKo) {
    database.prepare(`
      INSERT INTO role_change_request_events (
        event_id, request_id, action, actor_id, actor_role,
        before_status, after_status, note_ko, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      makeId('RCEVT'), request.requestId, action, String(actorId || 'SYSTEM'),
      normalizeRoleId(actorRole || 'UNKNOWN') || 'UNKNOWN', beforeStatus || null,
      afterStatus, String(noteKo || ''), currentIso()
    );
  }

  function recordAudit(request, eventType, actorId, roleId, decision, noteKo, extra = {}) {
    return audit.recordEvent({
      actor: actorId,
      actorIdentityId: extra.actorIdentityId || actorId,
      actorOrganizationId: extra.actorOrganizationId || '',
      sessionId: extra.sessionId || '',
      roleId,
      eventType,
      permissionKey: 'system.settings.edit',
      resourceType: 'ROLE_CHANGE_REQUEST',
      resourceId: request.requestId,
      decision,
      reasonKo: noteKo,
      payload: {
        requestId: request.requestId,
        targetUserId: request.targetUserId,
        beforeRoleId: request.currentRole,
        afterRoleId: request.requestedRole,
        status: request.status,
        riskLevel: request.riskLevel,
        dangerousAddedPermissions: request.permissionDiff.dangerousAddedPermissions || [],
        ...extra
      }
    });
  }

  function getTrustedIdentityContext(expectedIdentityId = '') {
    if (!identityAware) return null;
    const session = sessionService.getCurrentSession();
    if (!session) throw new Error('Missing session is denied.');
    const validation = sessionService.validateSession(session.sessionId);
    if (!validation.valid) throw new Error(`${validation.reasonCode}: identity action is denied.`);
    if (expectedIdentityId && expectedIdentityId !== validation.identity.identityId) {
      throw new Error('Identity and session mismatch is denied.');
    }
    const assignmentResult = roleAssignmentService.evaluateAssignments(validation.identity.identityId, {
      organizationId: session.organizationId
    });
    const assignment = assignmentResult.candidates[0]?.assignment;
    if (!assignment || !isKnownRole(assignment.roleId)) throw new Error('Active known role assignment is required.');
    return {
      identity: validation.identity,
      session,
      assignment,
      roleId: assignment.roleId,
      organizationId: session.organizationId
    };
  }

  function getRoleChangeRequest(requestId) {
    return withDb((database) => mapRequest(database.prepare(`
      SELECT * FROM role_change_requests WHERE request_id = ?
    `).get(String(requestId || '')), database));
  }

  function requireRequest(requestId) {
    const request = getRoleChangeRequest(requestId);
    if (!request) throw new Error(`Role change request not found: ${requestId}`);
    return request;
  }

  function createRoleChangeRequest(payload = {}) {
    const trusted = getTrustedIdentityContext();
    const currentUser = roles.getCurrentRole();
    let currentRole = normalizeRoleId(trusted?.roleId || currentUser.roleId);
    const requestedRole = normalizeRoleId(payload.requestedRole);
    const requesterId = identityAware
      ? trusted.identity.identityId
      : String(payload.requesterId || currentUser.userId || '').trim();
    const targetIdentityId = identityAware
      ? String(payload.targetIdentityId || trusted.identity.identityId).trim()
      : '';
    if (identityAware) {
      const targetIdentity = identityService.getIdentity(targetIdentityId);
      if (!targetIdentity || targetIdentity.status !== 'ACTIVE') throw new Error('Active target identity is required.');
      const targetAssignments = roleAssignmentService.evaluateAssignments(targetIdentityId, {
        organizationId: trusted.organizationId
      });
      const targetAssignment = targetAssignments.candidates[0]?.assignment;
      if (!targetAssignment || !isKnownRole(targetAssignment.roleId)) {
        throw new Error('Target identity requires an active known role assignment.');
      }
      currentRole = normalizeRoleId(targetAssignment.roleId);
    }
    if (!isKnownRole(currentRole) || !isKnownRole(requestedRole)) {
      throw new Error('Unknown or missing role is denied.');
    }
    if (currentRole === requestedRole) throw new Error('Current role and requested role must differ.');
    if (payload.currentRole && normalizeRoleId(payload.currentRole) !== currentRole) {
      throw new Error('Claimed current role does not match the active role.');
    }
    const targetUserId = identityAware
      ? targetIdentityId
      : String(payload.targetUserId || currentUser.userId || '').trim();
    const reasonKo = String(payload.reasonKo || '').trim();
    if (!requesterId || !targetUserId || !reasonKo) {
      throw new Error('Requester, target user, and request reason are required.');
    }
    if (!identityAware && targetUserId !== currentUser.userId) throw new Error('Unknown target user is denied.');

    const permissionDiff = getPermissionDiff(currentRole, requestedRole);
    const risk = classifyRisk(currentRole, requestedRole, permissionDiff);
    const status = payload.submit === false ? 'DRAFT' : 'PENDING';
    const createdAt = currentIso();
    const expiresAt = payload.expiresAt || new Date(clock().getTime() + 72 * 60 * 60 * 1000).toISOString();
    const request = {
      requestId: payload.requestId || makeId('RCR'), requesterId,
      requestedByIdentityId: identityAware ? requesterId : '',
      targetIdentityId,
      requesterRole: normalizeRoleId(payload.requesterRole || trusted?.roleId || currentRole), targetUserId,
      currentRole, requestedRole, reasonKo, status, riskLevel: risk.riskLevel,
      permissionDiff: { ...permissionDiff, riskReasons: risk.reasons }, expiresAt, createdAt
    };

    withDb((database) => {
      database.prepare(`
        INSERT INTO role_change_requests (
          request_id, requester_id, requester_role, target_user_id,
          current_role, requested_role, reason_ko, status, risk_level,
          permission_diff_json, expires_at, created_at, updated_at,
          requested_by_identity_id, target_identity_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        request.requestId, request.requesterId, request.requesterRole,
        request.targetUserId, request.currentRole, request.requestedRole,
        request.reasonKo, request.status, request.riskLevel,
        JSON.stringify(request.permissionDiff), request.expiresAt, createdAt, createdAt,
        request.requestedByIdentityId || null, request.targetIdentityId || null
      );
      recordRequestEvent(
        database, request, status === 'DRAFT' ? 'CREATE_DRAFT' : 'SUBMIT',
        requesterId, request.requesterRole, '', status, reasonKo
      );
    });
    const saved = requireRequest(request.requestId);
    recordAudit(
      saved, status === 'DRAFT' ? 'ROLE_CHANGE_DRAFTED' : 'ROLE_CHANGE_REQUESTED',
      requesterId, request.requesterRole, 'ALLOWED',
      status === 'DRAFT' ? '역할 변경 요청 초안 저장' : '역할 변경 승인 요청 생성',
      identityAware ? {
        actorIdentityId: trusted.identity.identityId,
        actorOrganizationId: trusted.organizationId,
        sessionId: trusted.session.sessionId
      } : {}
    );
    return saved;
  }

  function transitionRequest(requestId, expectedStatuses, nextStatus, payload = {}, auditType, decision) {
    const request = requireRequest(requestId);
    if (!expectedStatuses.includes(request.status)) {
      throw new Error(`Role change request cannot transition from ${request.status} to ${nextStatus}.`);
    }
    if (TERMINAL_STATUSES.has(request.status)) throw new Error('Completed role change request cannot be processed again.');
    const trusted = identityAware && payload.actorId !== 'SYSTEM' ? getTrustedIdentityContext(payload.actorIdentityId || '') : null;
    const actorId = String(trusted?.identity.identityId || payload.actorId || 'SYSTEM');
    const actorRole = normalizeRoleId(trusted?.roleId || payload.actorRole || request.requesterRole || 'UNKNOWN');
    const noteKo = String(payload.noteKo || payload.reasonKo || '');
    const timestamp = currentIso();
    withDb((database) => {
      const fields = ['status = ?', 'updated_at = ?'];
      const values = [nextStatus, timestamp];
      const statusFields = {
        APPROVED: ['approved_by', 'approved_at'], REJECTED: ['rejected_by', 'rejected_at'],
        CANCELLED: ['cancelled_by', 'cancelled_at'], EXPIRED: [null, 'expired_at']
      };
      const extras = statusFields[nextStatus];
      if (extras?.[0]) {
        fields.push(`${extras[0]} = ?`);
        values.push(actorId);
      }
      if (extras?.[1]) {
        fields.push(`${extras[1]} = ?`);
        values.push(timestamp);
      }
      if (identityAware && trusted && ['APPROVED', 'REJECTED'].includes(nextStatus)) {
        fields.push('reviewed_by_identity_id = ?');
        values.push(trusted.identity.identityId);
      }
      if (identityAware && trusted && nextStatus === 'APPROVED') {
        fields.push('approved_by_identity_id = ?');
        values.push(trusted.identity.identityId);
      }
      values.push(request.requestId, request.status);
      const result = database.prepare(`
        UPDATE role_change_requests SET ${fields.join(', ')}
        WHERE request_id = ? AND status = ?
      `).run(...values);
      if (result.changes !== 1) throw new Error('Role change request was already processed.');
      recordRequestEvent(database, request, nextStatus, actorId, actorRole, request.status, nextStatus, noteKo);
    });
    const updated = requireRequest(requestId);
    recordAudit(updated, auditType, actorId, actorRole, decision, noteKo || `${nextStatus} 처리`, trusted ? {
      actorIdentityId: trusted.identity.identityId,
      actorOrganizationId: trusted.organizationId,
      sessionId: trusted.session.sessionId
    } : {});
    return updated;
  }

  function submitRoleChangeRequest(requestId, payload = {}) {
    if (identityAware) {
      const request = requireRequest(requestId);
      const trusted = getTrustedIdentityContext(payload.actorIdentityId || '');
      if (request.requestedByIdentityId !== trusted.identity.identityId) {
        throw new Error('Only the requesting identity can submit this draft.');
      }
    }
    return transitionRequest(
      requestId, ['DRAFT'], 'PENDING', payload,
      'ROLE_CHANGE_REQUESTED', 'ALLOWED'
    );
  }

  function assertApprover(request, payload) {
    if (identityAware) {
      const trusted = getTrustedIdentityContext(payload.approverIdentityId || payload.actorIdentityId || '');
      if (trusted.identity.identityId === request.requestedByIdentityId) throw new Error('Self-approval is not allowed.');
      const permission = roles.evaluateAuthorization({
        identityId: trusted.identity.identityId,
        sessionId: trusted.session.sessionId,
        organizationId: trusted.organizationId,
        permissionKey: 'system.settings.edit',
        resourceType: 'ROLE_CHANGE_REQUEST',
        resourceId: request.requestId,
        auditDecision: false
      });
      if (!permission.allowed) throw new Error('Approver does not have role change approval permission.');
      return {
        approverId: trusted.identity.identityId,
        approverIdentityId: trusted.identity.identityId,
        approverRole: trusted.roleId
      };
    }
    const approverId = String(payload.approverId || payload.actorId || '').trim();
    const approverRole = normalizeRoleId(payload.approverRole || payload.actorRole);
    if (!approverId || !isKnownRole(approverRole)) throw new Error('Known approver and approver role are required.');
    if (approverId === request.requesterId) throw new Error('Self-approval is not allowed.');
    const permission = roles.evaluatePermission({
      roleId: approverRole,
      permissionKey: 'system.settings.edit',
      actor: approverId,
      auditDecision: false
    });
    if (!permission.allowed) throw new Error('Approver does not have role change approval permission.');
    return { approverId, approverRole };
  }

  function approveRoleChangeRequest(requestId, payload = {}) {
    const request = requireRequest(requestId);
    if (request.status !== 'PENDING') throw new Error(`Only PENDING requests can be approved; current status is ${request.status}.`);
    if (new Date(request.expiresAt).getTime() <= clock().getTime()) {
      expireRoleChangeRequest(requestId, { actorId: 'SYSTEM', actorRole: 'CEO', noteKo: '요청 유효기간 만료' });
      throw new Error('Expired role change request cannot be approved.');
    }
    const approver = assertApprover(request, payload);
    return transitionRequest(requestId, ['PENDING'], 'APPROVED', {
      actorId: approver.approverId,
      actorRole: approver.approverRole,
      noteKo: payload.noteKo || '역할 변경 승인'
    }, 'ROLE_CHANGE_APPROVED', 'ALLOWED');
  }

  function rejectRoleChangeRequest(requestId, payload = {}) {
    const request = requireRequest(requestId);
    const approver = assertApprover(request, payload);
    return transitionRequest(requestId, ['PENDING'], 'REJECTED', {
      actorId: approver.approverId,
      actorRole: approver.approverRole,
      noteKo: payload.reasonKo || payload.noteKo || '역할 변경 반려'
    }, 'ROLE_CHANGE_REJECTED', 'DENIED');
  }

  function cancelRoleChangeRequest(requestId, payload = {}) {
    const request = requireRequest(requestId);
    const trusted = identityAware ? getTrustedIdentityContext(payload.actorIdentityId || '') : null;
    const actorId = String(trusted?.identity.identityId || payload.actorId || '').trim();
    if (!actorId) throw new Error('Cancellation actor is required.');
    const actorRole = normalizeRoleId(trusted?.roleId || payload.actorRole || request.requesterRole);
    const isRequester = actorId === (request.requestedByIdentityId || request.requesterId);
    const canAdminCancel = identityAware
      ? roles.evaluateAuthorization({
        identityId: trusted.identity.identityId,
        sessionId: trusted.session.sessionId,
        organizationId: trusted.organizationId,
        permissionKey: 'system.settings.edit',
        resourceType: 'ROLE_CHANGE_REQUEST',
        resourceId: request.requestId,
        auditDecision: false
      }).allowed
      : roles.evaluatePermission({
        roleId: actorRole,
        permissionKey: 'system.settings.edit',
        actor: actorId,
        auditDecision: false
      }).allowed;
    if (!isRequester && !canAdminCancel) throw new Error('Only requester or authorized approver can cancel.');
    return transitionRequest(requestId, ['DRAFT', 'PENDING'], 'CANCELLED', {
      actorId, actorRole, noteKo: payload.reasonKo || payload.noteKo || '역할 변경 요청 취소'
    }, 'ROLE_CHANGE_CANCELLED', 'DENIED');
  }

  function expireRoleChangeRequest(requestId, payload = {}) {
    return transitionRequest(requestId, ['PENDING'], 'EXPIRED', {
      actorId: payload.actorId || 'SYSTEM', actorRole: payload.actorRole || 'CEO',
      noteKo: payload.noteKo || '역할 변경 요청 만료'
    }, 'ROLE_CHANGE_EXPIRED', 'DENIED');
  }

  function verifyCustomerSafetyTransition(request) {
    if (request.currentRole !== 'CLIENT_VIEWER') return { checked: false, passed: true };
    const probe = {
      project_name: '고객 안전성 전환 점검', estimate_total: 1000000,
      customer_phone: '010-0000-0000', customer_email: 'test@example.invalid',
      detailed_address: '테스트 상세주소', memo: '고객 메모 원문',
      internal_cost: 700000, margin: 300000, pce: 'GO',
      vendor_price: 200000, approval_queue: [{ id: 'Q-SAFETY' }],
      access_token: 'must-not-leak'
    };
    const sanitized = roles.sanitizeDataForRole('CLIENT_VIEWER', probe);
    const serialized = JSON.stringify(sanitized).toLowerCase();
    const blockedTerms = [
      'customer_phone', 'customer_email', 'detailed_address', 'memo',
      'internal_cost', 'margin', 'pce', 'vendor_price', 'approval_queue', 'access_token'
    ];
    const leaks = blockedTerms.filter((term) => serialized.includes(term));
    return { checked: true, passed: leaks.length === 0, leaks };
  }

  function markApplyFailure(request, actorId, actorRole, error, previousRole) {
    const timestamp = currentIso();
    withDb((database) => {
      const result = database.prepare(`
        UPDATE role_change_requests
        SET status = 'FAILED', failed_at = ?, failure_reason_ko = ?, updated_at = ?
        WHERE request_id = ? AND status = 'APPROVED'
      `).run(timestamp, String(error.message || error), timestamp, request.requestId);
      if (result.changes === 1) {
        recordRequestEvent(
          database, request, 'APPLY_FAILED', actorId, actorRole,
          'APPROVED', 'FAILED', String(error.message || error)
        );
      }
    });
    const failed = requireRequest(request.requestId);
    recordAudit(failed, 'ROLE_CHANGE_FAILED', actorId, actorRole, 'DENIED', '역할 변경 적용 실패', {
      previousRole, rolePreserved: roles.getCurrentRole().roleId === previousRole
    });
    return failed;
  }

  function applyApprovedRoleChange(requestId, payload = {}) {
    const request = requireRequest(requestId);
    if (request.status !== 'APPROVED') throw new Error(`Only APPROVED requests can be applied; current status is ${request.status}.`);
    const trusted = identityAware ? getTrustedIdentityContext(payload.actorIdentityId || '') : null;
    const actorId = String(trusted?.identity.identityId || payload.actorId || request.approvedBy || '').trim();
    const actorRole = normalizeRoleId(trusted?.roleId || payload.actorRole || 'CEO');
    if (!actorId || !isKnownRole(actorRole)) throw new Error('Apply actor and known role are required.');
    if (identityAware) {
      const permission = roles.evaluateAuthorization({
        identityId: trusted.identity.identityId,
        sessionId: trusted.session.sessionId,
        organizationId: trusted.organizationId,
        permissionKey: 'system.settings.edit',
        resourceType: 'ROLE_CHANGE_REQUEST',
        resourceId: request.requestId,
        auditDecision: false
      });
      if (!permission.allowed) throw new Error('Apply actor does not have role change apply permission.');
    }
    const previousRole = roles.getCurrentRole().roleId;
    const updateLegacyRole = !identityAware || request.targetIdentityId === DEFAULT_IDENTITY_ID;
    let changedAssignment = null;
    try {
      if (updateLegacyRole && previousRole !== request.currentRole) throw new Error('Current role changed after request creation; apply is blocked.');
      const safety = verifyCustomerSafetyTransition(request);
      if (!safety.passed) throw new Error('Customer safety transition check failed.');
      if (payload.simulateFailure) throw new Error('Simulated role apply failure.');
      if (updateLegacyRole) {
        const changed = roles.setActiveRole(request.requestedRole, {
          actor: actorId,
          reasonKo: `승인 요청 ${request.requestId} 적용`
        });
        if (changed.roleId !== request.requestedRole) throw new Error('Role apply result did not match requested role.');
      }
      if (identityAware) {
        const targetAssignments = roleAssignmentService.evaluateAssignments(request.targetIdentityId, {
          organizationId: trusted.organizationId
        });
        const targetAssignment = targetAssignments.candidates.find(({ assignment }) => assignment.roleId === request.currentRole)?.assignment;
        if (!targetAssignment) throw new Error('Target role assignment changed after request creation; apply is blocked.');
        changedAssignment = roleAssignmentService.updateAssignmentRole(targetAssignment.assignmentId, request.requestedRole);
      }

      const timestamp = currentIso();
      try {
        withDb((database) => {
          const result = database.prepare(`
            UPDATE role_change_requests
            SET status = 'APPLIED', applied_at = ?, updated_at = ?, applied_by_identity_id = ?
            WHERE request_id = ? AND status = 'APPROVED'
          `).run(timestamp, timestamp, trusted?.identity.identityId || null, request.requestId);
          if (result.changes !== 1) throw new Error('Role change request was already processed.');
          recordRequestEvent(database, request, 'APPLY', actorId, actorRole, 'APPROVED', 'APPLIED', '승인된 역할 변경 적용');
        });
      } catch (error) {
        if (updateLegacyRole) {
          roles.setActiveRole(previousRole, { actor: 'SYSTEM_ROLLBACK', reasonKo: `요청 ${request.requestId} 적용 롤백` });
        }
        throw error;
      }
      const applied = requireRequest(requestId);
      recordAudit(applied, 'ROLE_CHANGE_APPLIED', actorId, actorRole, 'ALLOWED', '승인된 역할 변경 적용', {
        customerSafetyChecked: safety.checked,
        customerSafetyPassed: safety.passed,
        assignmentId: changedAssignment?.assignmentId || '',
        actorIdentityId: trusted?.identity.identityId || '',
        actorOrganizationId: trusted?.organizationId || '',
        sessionId: trusted?.session.sessionId || ''
      });
      return applied;
    } catch (error) {
      if (changedAssignment && changedAssignment.roleId !== request.currentRole) {
        roleAssignmentService.updateAssignmentRole(changedAssignment.assignmentId, request.currentRole);
      }
      if (updateLegacyRole && roles.getCurrentRole().roleId !== previousRole) {
        roles.setActiveRole(previousRole, { actor: 'SYSTEM_ROLLBACK', reasonKo: `요청 ${request.requestId} 실패 롤백` });
      }
      return markApplyFailure(request, actorId || 'SYSTEM', actorRole, error, previousRole);
    }
  }

  function listRoleChangeRequests(filters = {}) {
    return withDb((database) => {
      const clauses = [];
      const values = [];
      if (filters.status) {
        clauses.push('status = ?');
        values.push(String(filters.status).toUpperCase());
      }
      if (filters.riskLevel) {
        clauses.push('risk_level = ?');
        values.push(String(filters.riskLevel).toUpperCase());
      }
      if (filters.targetUserId) {
        clauses.push('target_user_id = ?');
        values.push(String(filters.targetUserId));
      }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      values.push(Math.max(1, Math.min(200, Number(filters.limit) || 100)));
      return database.prepare(`
        SELECT * FROM role_change_requests ${where}
        ORDER BY created_at DESC LIMIT ?
      `).all(...values).map((row) => mapRequest(row, database));
    });
  }

  function getRoleChangeApprovalSummary() {
    const requests = listRoleChangeRequests({ limit: 200 });
    return {
      total: requests.length,
      byStatus: Object.fromEntries(REQUEST_STATUSES.map((status) => [
        status, requests.filter((request) => request.status === status).length
      ])),
      highRiskPending: requests.filter((request) => request.status === 'PENDING' && request.riskLevel === 'HIGH').length,
      externalAuthentication: 'DISABLED',
      directRoleChange: 'BLOCKED',
      workflowVersion: 'v0.5.2-role-change-approval'
    };
  }

  return {
    createRoleChangeRequest,
    submitRoleChangeRequest,
    getRoleChangeRequest,
    listRoleChangeRequests,
    approveRoleChangeRequest,
    rejectRoleChangeRequest,
    cancelRoleChangeRequest,
    expireRoleChangeRequest,
    applyApprovedRoleChange,
    getPermissionDiff,
    classifyRisk,
    verifyCustomerSafetyTransition,
    getRoleChangeApprovalSummary
  };
}

module.exports = {
  REQUEST_STATUSES,
  TERMINAL_STATUSES,
  createRoleChangeApprovalService
};
