'use strict';

const { DatabaseSync } = require('node:sqlite');
const { createPermissionAuditService } = require('./permissionAuditService');

const ROLE_DEFINITIONS = [
  { roleId: 'CEO', displayNameKo: '대표', descriptionKo: '전체 운영, 승인, 내부 원가와 시스템 설정 권한' },
  { roleId: 'ADMIN', displayNameKo: '관리자', descriptionKo: '운영 관리와 시스템 설정을 포함한 전체 관리자 권한' },
  { roleId: 'MANAGER', displayNameKo: '매니저', descriptionKo: '프로젝트, 견적, 계약, 일정, 발주와 내부 출력 관리 권한' },
  { roleId: 'STAFF', displayNameKo: '실무 담당', descriptionKo: '프로젝트와 고객 업무 입력 및 고객용 출력 권한' },
  { roleId: 'SITE_CREW', displayNameKo: '현장 작업자', descriptionKo: '현장 프로젝트, 일정, 현장조사 중심 권한' },
  { roleId: 'CLIENT_VIEWER', displayNameKo: '고객 열람', descriptionKo: '고객 승인 정보만 열람하는 제한 권한' },
  { roleId: 'READ_ONLY_AUDITOR', displayNameKo: '읽기 전용 감사', descriptionKo: '변경 없이 운영 및 감사 정보를 조회하는 권한' }
];

const PERMISSION_DEFINITIONS = [
  ['dashboard.view', '대시보드 조회'],
  ['project.view', '프로젝트 조회'],
  ['project.edit', '프로젝트 수정'],
  ['estimate.view', '견적 조회'],
  ['estimate.edit', '견적 수정'],
  ['estimate.internal_cost.view', '내부 원가 조회'],
  ['estimate.margin.view', '마진 조회'],
  ['contract.view', '계약 조회'],
  ['contract.create', '계약 생성'],
  ['schedule.view', '일정 조회'],
  ['schedule.edit', '일정 수정'],
  ['order.view', '발주 조회'],
  ['order.create', '발주 생성'],
  ['vendor.view', '협력업체 조회'],
  ['vendor.price.view', '협력업체 단가 조회'],
  ['calendar.view', '캘린더 조회'],
  ['calendar.edit', '캘린더 수정'],
  ['calendar.conflict.view', '일정 충돌 조회'],
  ['survey.view', '현장조사 조회'],
  ['survey.sync', '현장조사 동기화'],
  ['crm.view', 'CRM 조회'],
  ['crm.edit', 'CRM 수정'],
  ['client_portal.preview', '고객 포털 미리보기'],
  ['customer_output.generate', '고객용 출력 생성'],
  ['internal_output.generate', '내부용 출력 생성'],
  ['audit.view', '감사 로그 조회'],
  ['system.settings.view', '시스템 설정 조회'],
  ['system.settings.edit', '시스템 설정 수정']
].map(([permissionKey, descriptionKo]) => ({ permissionKey, descriptionKo }));

const ALL_PERMISSIONS = PERMISSION_DEFINITIONS.map((item) => item.permissionKey);

const ROLE_PERMISSION_MATRIX = {
  CEO: ALL_PERMISSIONS,
  ADMIN: ALL_PERMISSIONS,
  MANAGER: ALL_PERMISSIONS.filter((key) => key !== 'system.settings.edit'),
  STAFF: [
    'dashboard.view', 'project.view', 'project.edit', 'estimate.view', 'estimate.edit',
    'contract.view', 'contract.create', 'schedule.view', 'schedule.edit',
    'order.view', 'order.create', 'vendor.view', 'calendar.view', 'calendar.edit',
    'calendar.conflict.view', 'survey.view', 'survey.sync', 'crm.view', 'crm.edit',
    'client_portal.preview', 'customer_output.generate'
  ],
  SITE_CREW: [
    'dashboard.view', 'project.view', 'schedule.view', 'schedule.edit',
    'calendar.view', 'survey.view', 'survey.sync'
  ],
  CLIENT_VIEWER: [
    'dashboard.view', 'project.view', 'estimate.view', 'contract.view',
    'schedule.view', 'client_portal.preview'
  ],
  READ_ONLY_AUDITOR: [
    'dashboard.view', 'project.view', 'estimate.view', 'estimate.internal_cost.view',
    'estimate.margin.view', 'contract.view', 'schedule.view', 'order.view',
    'vendor.view', 'vendor.price.view', 'calendar.view', 'calendar.conflict.view',
    'survey.view', 'crm.view', 'audit.view', 'system.settings.view'
  ]
};

const ROUTE_PERMISSION_MAP = {
  dashboard: 'dashboard.view',
  project: 'project.view',
  approvals: 'audit.view',
  risks: 'project.view',
  estimate: 'estimate.edit',
  bathroomEstimate: 'estimate.edit',
  kitchenEstimate: 'estimate.edit',
  fullRemodelingEstimate: 'estimate.edit',
  contractDocuments: 'contract.view',
  constructionSchedule: 'schedule.view',
  purchaseOrders: 'order.view',
  vendorPrice: 'vendor.price.view',
  vendorIntelligence: 'vendor.price.view',
  crmPipeline: 'crm.view',
  crmNextActions: 'crm.view',
  customerPortalDraft: 'client_portal.preview',
  clientPortal: 'client_portal.preview',
  calendarSiteSurveySync: 'calendar.view',
  executionManagement: 'project.edit',
  fieldMobile: 'project.view',
  costCapture: 'estimate.internal_cost.view',
  marginSafety: 'estimate.margin.view',
  finance: 'estimate.margin.view',
  analytics: 'audit.view',
  settings: 'system.settings.view',
  userRolePermissions: 'system.settings.view',
  masterDb: 'system.settings.edit',
  initialMasterData: 'system.settings.edit',
  realPriceCalibration: 'vendor.price.view',
  realPriceWorkbench: 'vendor.price.view',
  priceWorkbookImport: 'vendor.price.view',
  priceCalibrationPriority: 'vendor.price.view',
  unmatchedPriceRecommendation: 'vendor.price.view',
  recommendationScoringRules: 'vendor.price.view'
};

const ALWAYS_BLOCKED_KEY_PARTS = [
  'password', 'credential', 'secret', 'token', 'api_key', 'apikey',
  'private_key', 'hash', 'provider_payload', 'session_id', 'sessionid',
  'identity_id', 'identityid', 'actor_identity', 'role_assignment',
  'organization_membership', 'provider_subject'
];
const CUSTOMER_PRIVATE_KEY_PARTS = [
  'customer_phone', 'customer_email', 'detailed_address', 'memo', 'raw_phone',
  'raw_email', 'resident_registration', 'account_number', 'internal_note',
  'role_change', 'permission_diff', 'permission_audit', 'audit_event',
  'approval_status', 'risk_level', 'approver', 'requester_id'
];
const INTERNAL_COST_KEY_PARTS = [
  'internal_cost', 'internalcost', 'labor_cost', 'laborcost', 'purchase_cost',
  'purchasecost', 'receiving_cost', 'receivingcost', 'actual_cost', 'actualcost',
  'unit_cost', 'unitcost', 'cost_breakdown', 'costbreakdown'
];
const MARGIN_KEY_PARTS = [
  'margin', 'profit', 'pce', 'risk_score', 'riskscore', 'minimum_margin',
  'expected_profit', 'live_margin'
];
const VENDOR_PRICE_KEY_PARTS = [
  'vendor_price', 'vendorprice', 'supplier_price', 'supplierprice',
  'price_queue', 'pricequeue', 'approval_queue', 'approvalqueue',
  'calibration', 'variance'
];
const DANGEROUS_PERMISSION_KEYS = [
  'estimate.internal_cost.view',
  'estimate.margin.view',
  'vendor.price.view',
  'internal_output.generate',
  'audit.view',
  'system.settings.edit'
];
const V051_SAMPLE_PROJECT = {
  project_name: 'RBAC 미리보기 테스트 프로젝트',
  site_summary: '고객 공유용 현장 요약',
  customer_name: '테스트 고객',
  customer_phone: '010-0000-0000',
  customer_email: 'customer@example.invalid',
  detailed_address: '테스트 상세주소 101동 1001호',
  memo: '고객 메모 원문',
  estimate_total: 12000000,
  internal_cost: 8300000,
  labor_cost: 2400000,
  margin: 3700000,
  profit_rate: 30.8,
  pce: 'GO',
  vendor_price: 3100000,
  approval_queue: [{ queue_id: 'Q-RBAC-1', suggested_price: 150000 }],
  provider_payload: { raw_email: 'provider@example.invalid' },
  access_token: 'must-not-leak',
  nested: {
    public_summary: '고객에게 보여도 되는 요약',
    risk_score: 81,
    internal_note: '내부 검토 메모'
  }
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeKey(value) {
  return String(value || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function normalizeRoleId(value) {
  const roleId = String(value || '').toUpperCase();
  const aliases = {
    SITEMANAGER: 'SITE_CREW',
    ESTIMATOR: 'STAFF',
    FINANCEMANAGER: 'MANAGER',
    VENDOR: 'STAFF',
    READONLY: 'READ_ONLY_AUDITOR'
  };
  return aliases[roleId] || roleId;
}

function hasKeyPart(key, parts) {
  const normalized = normalizeKey(key);
  return parts.some((part) => normalized.includes(normalizeKey(part)));
}

function getPermissionDescription(permissionKey) {
  return PERMISSION_DEFINITIONS.find((item) => item.permissionKey === permissionKey)?.descriptionKo || permissionKey;
}

function permissionStatusForRole(roleId, permissionKey) {
  const allowed = ROLE_PERMISSION_MATRIX[roleId]?.includes(permissionKey) || false;
  if (!allowed) return 'DENY';
  if (roleId === 'CLIENT_VIEWER') return 'RESTRICTED';
  return 'ALLOW';
}

function blockedFieldLabelsForRole(roleId) {
  const permissions = ROLE_PERMISSION_MATRIX[roleId] || [];
  const labels = [];
  if (roleId === 'CLIENT_VIEWER') labels.push('고객 연락처', '상세주소', '고객 메모 원문');
  if (!permissions.includes('estimate.internal_cost.view')) labels.push('내부 원가', '노무 원가');
  if (!permissions.includes('estimate.margin.view')) labels.push('마진', 'PCE', 'risk_score');
  if (!permissions.includes('vendor.price.view')) labels.push('협력업체 단가', '단가 Queue', 'variance');
  labels.push('token', 'credential', 'provider payload');
  return Array.from(new Set(labels));
}

function sanitizeObject(value, blockedKeyParts) {
  if (Array.isArray(value)) return value.map((item) => sanitizeObject(item, blockedKeyParts));
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !hasKeyPart(key, ALWAYS_BLOCKED_KEY_PARTS) && !hasKeyPart(key, blockedKeyParts))
    .map(([key, item]) => [key, sanitizeObject(item, blockedKeyParts)]));
}

function createRolePermissionService({
  sqliteService,
  databasePath,
  auditService,
  identityService,
  sessionService,
  roleAssignmentService
} = {}) {
  const logsDbPath = databasePath || sqliteService?.dbPaths?.logs;
  if (!logsDbPath) throw new Error('Role permission database path is required.');
  const audit = auditService || createPermissionAuditService({ databasePath: logsDbPath });
  const identityAware = Boolean(identityService && sessionService && roleAssignmentService);

  function withDb(callback) {
    const database = new DatabaseSync(logsDbPath);
    try {
      database.exec(`
        CREATE TABLE IF NOT EXISTS roles (
          role_id TEXT PRIMARY KEY,
          role_name TEXT NOT NULL,
          display_name_ko TEXT NOT NULL,
          description_ko TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS users (
          user_id TEXT PRIMARY KEY,
          user_name_ko TEXT NOT NULL,
          role_id TEXT NOT NULL,
          user_status TEXT NOT NULL,
          is_local_mock INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS permissions (
          permission_id TEXT PRIMARY KEY,
          permission_key TEXT NOT NULL,
          role_id TEXT NOT NULL,
          allowed INTEGER NOT NULL,
          scope_json TEXT NOT NULL,
          description_ko TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(permission_key, role_id)
        );
        CREATE TABLE IF NOT EXISTS role_session_state (
          session_id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          active_role_id TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);
      seedDefinitions(database);
      return callback(database);
    } finally {
      database.close();
    }
  }

  function seedDefinitions(database) {
    const timestamp = nowIso();
    const saveRole = database.prepare(`
      INSERT INTO roles (
        role_id, role_name, display_name_ko, description_ko, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(role_id) DO UPDATE SET
        role_name = excluded.role_name,
        display_name_ko = excluded.display_name_ko,
        description_ko = excluded.description_ko,
        updated_at = excluded.updated_at
    `);
    ROLE_DEFINITIONS.forEach((role) => saveRole.run(
      role.roleId, role.roleId, role.displayNameKo, role.descriptionKo, timestamp, timestamp
    ));

    const savePermission = database.prepare(`
      INSERT INTO permissions (
        permission_id, permission_key, role_id, allowed, scope_json,
        description_ko, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(permission_key, role_id) DO UPDATE SET
        allowed = excluded.allowed,
        scope_json = excluded.scope_json,
        description_ko = excluded.description_ko,
        updated_at = excluded.updated_at
    `);
    ROLE_DEFINITIONS.forEach((role) => {
      PERMISSION_DEFINITIONS.forEach((permission) => {
        const allowed = ROLE_PERMISSION_MATRIX[role.roleId].includes(permission.permissionKey);
        savePermission.run(
          `PERM-V050-${role.roleId}-${permission.permissionKey}`,
          permission.permissionKey,
          role.roleId,
          allowed ? 1 : 0,
          JSON.stringify({ scope: role.roleId === 'CLIENT_VIEWER' ? 'CUSTOMER_SAFE_ONLY' : 'LOCAL_INTERNAL' }),
          permission.descriptionKo,
          timestamp,
          timestamp
        );
      });
    });

    database.prepare(`
      INSERT INTO users (
        user_id, user_name_ko, role_id, user_status, is_local_mock, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET updated_at = excluded.updated_at
    `).run('USER-LOCAL-RBAC', '로컬 운영 사용자', 'CEO', 'ACTIVE', 1, timestamp, timestamp);
    database.prepare(`
      INSERT OR IGNORE INTO role_session_state (
        session_id, user_id, active_role_id, updated_at
      ) VALUES ('LOCAL', 'USER-LOCAL-RBAC', 'CEO', ?)
    `).run(timestamp);
  }

  function getCurrentRole() {
    return withDb((database) => {
      const row = database.prepare(`
        SELECT s.active_role_id, u.user_id, u.user_name_ko, u.user_status
        FROM role_session_state s
        LEFT JOIN users u ON u.user_id = s.user_id
        WHERE s.session_id = 'LOCAL'
      `).get();
      const roleId = normalizeRoleId(row?.active_role_id || 'CEO');
      const role = ROLE_DEFINITIONS.find((item) => item.roleId === roleId) || ROLE_DEFINITIONS[0];
      return {
        userId: row?.user_id || 'USER-LOCAL-RBAC',
        userNameKo: row?.user_name_ko || '로컬 운영 사용자',
        userStatus: row?.user_status || 'ACTIVE',
        roleId: role.roleId,
        roleDisplayNameKo: role.displayNameKo,
        isLocalMock: true
      };
    });
  }

  function auditAuthorization(result, context, auditDecision) {
    if (!auditDecision) return;
    audit.recordEvent({
      actor: result.identityId || context.actor || 'UNKNOWN_IDENTITY',
      actorIdentityId: result.identityId || '',
      actorOrganizationId: result.organizationId || '',
      sessionId: result.sessionId || '',
      roleId: result.roleId || 'UNKNOWN',
      eventType: result.allowed ? 'PERMISSION_ALLOWED' : 'PERMISSION_DENIED',
      permissionKey: result.permissionKey,
      resourceType: context.resourceType || 'GLOBAL',
      resourceId: context.resourceId || 'GLOBAL',
      decision: result.allowed ? 'ALLOWED' : 'DENIED',
      reasonKo: result.reasonKo,
      payload: context.payload || {}
    });
  }

  function evaluateAuthorization(context = {}) {
    const permissionKey = String(context.permissionKey || '');
    if (!ALL_PERMISSIONS.includes(permissionKey)) {
      const denied = {
        allowed: false,
        decision: 'DENY',
        reasonCode: 'UNKNOWN_PERMISSION',
        reasonKo: '알 수 없거나 누락된 권한은 차단됩니다.',
        identityId: '', sessionId: '', organizationId: '', roleId: 'UNKNOWN', permissionKey
      };
      auditAuthorization(denied, context, context.auditDecision !== false);
      return denied;
    }
    if (!identityAware) {
      const legacy = evaluateLegacyPermission(context);
      return { ...legacy, decision: legacy.allowed ? 'ALLOW' : 'DENY', reasonCode: legacy.allowed ? 'ROLE_PERMISSION_ALLOW' : 'ROLE_PERMISSION_DENY' };
    }

    const currentSession = context.sessionId
      ? sessionService.getSession(context.sessionId)
      : sessionService.getCurrentSession();
    if (!currentSession) {
      const denied = {
        allowed: false, decision: 'DENY', reasonCode: 'MISSING_SESSION',
        reasonKo: '유효한 세션이 없어 접근이 차단되었습니다.',
        identityId: '', sessionId: '', organizationId: '', roleId: 'UNKNOWN', permissionKey
      };
      auditAuthorization(denied, context, context.auditDecision !== false);
      return denied;
    }
    const validation = sessionService.validateSession(currentSession.sessionId);
    if (!validation.valid) {
      const denied = {
        allowed: false, decision: 'DENY', reasonCode: validation.reasonCode,
        reasonKo: validation.reasonKo,
        identityId: validation.session?.identityId || '',
        sessionId: currentSession.sessionId,
        organizationId: currentSession.organizationId || '', roleId: 'UNKNOWN', permissionKey
      };
      auditAuthorization(denied, context, context.auditDecision !== false);
      return denied;
    }
    const identity = validation.identity;
    if (context.identityId && context.identityId !== identity.identityId) {
      const denied = {
        allowed: false, decision: 'DENY', reasonCode: 'IDENTITY_SESSION_MISMATCH',
        reasonKo: 'Identity와 세션이 일치하지 않아 접근이 차단되었습니다.',
        identityId: identity.identityId, sessionId: currentSession.sessionId,
        organizationId: currentSession.organizationId || '', roleId: 'UNKNOWN', permissionKey
      };
      auditAuthorization(denied, context, context.auditDecision !== false);
      return denied;
    }

    const scopeContext = {
      organizationId: context.organizationId || currentSession.organizationId,
      projectId: context.projectId || '',
      siteId: context.siteId || '',
      resourceType: context.resourceType || 'GLOBAL',
      resourceId: context.resourceId || 'GLOBAL'
    };
    const assignmentResult = roleAssignmentService.evaluateAssignments(identity.identityId, scopeContext);
    const permissionAssignment = assignmentResult.candidates.find(({ assignment }) => (
      ROLE_DEFINITIONS.some((role) => role.roleId === assignment.roleId)
      && ROLE_PERMISSION_MATRIX[assignment.roleId]?.includes(permissionKey)
    ));
    if (!permissionAssignment) {
      const firstRole = assignmentResult.candidates[0]?.assignment?.roleId || 'UNKNOWN';
      const reasonCode = assignmentResult.candidates.length ? 'ROLE_PERMISSION_DENY' : (assignmentResult.rejected[0]?.reasonCode || 'MISSING_ACTIVE_ASSIGNMENT');
      const denied = {
        allowed: false, decision: 'DENY', reasonCode,
        reasonKo: assignmentResult.candidates.length
          ? `${firstRole} 역할에는 ${permissionKey} 권한이 없습니다.`
          : '현재 리소스 범위에 유효한 역할 할당이 없습니다.',
        identityId: identity.identityId, sessionId: currentSession.sessionId,
        organizationId: scopeContext.organizationId || '', roleId: firstRole, permissionKey
      };
      auditAuthorization(denied, context, context.auditDecision !== false);
      return denied;
    }

    const roleId = permissionAssignment.assignment.roleId;
    const approvalRequired = Boolean(context.approvalRequired);
    const result = {
      allowed: !approvalRequired,
      decision: approvalRequired ? 'APPROVAL_REQUIRED' : 'ALLOW',
      reasonCode: approvalRequired ? 'APPROVAL_REQUIRED' : 'IDENTITY_ROLE_SCOPE_ALLOW',
      reasonKo: approvalRequired
        ? `${roleId} 역할 권한은 확인되었으며 추가 승인이 필요합니다.`
        : `${roleId} 역할과 리소스 범위에서 ${permissionKey} 권한이 확인되었습니다.`,
      identityId: identity.identityId,
      sessionId: currentSession.sessionId,
      organizationId: scopeContext.organizationId || '',
      roleId,
      assignmentId: permissionAssignment.assignment.assignmentId,
      permissionKey
    };
    auditAuthorization(result, context, context.auditDecision !== false);
    return result;
  }

  function evaluateLegacyPermission({ roleId, permissionKey, actor = 'LOCAL_USER', resourceType = 'GLOBAL', resourceId = 'GLOBAL', payload = {}, auditDecision = true } = {}) {
    const normalizedRoleId = normalizeRoleId(roleId || getCurrentRole().roleId);
    const knownRole = ROLE_DEFINITIONS.some((role) => role.roleId === normalizedRoleId);
    const knownPermission = ALL_PERMISSIONS.includes(String(permissionKey || ''));
    const allowed = knownRole && knownPermission && ROLE_PERMISSION_MATRIX[normalizedRoleId].includes(permissionKey);
    const result = {
      allowed,
      roleId: normalizedRoleId,
      permissionKey: String(permissionKey || ''),
      decision: allowed ? 'ALLOWED' : 'DENIED',
      reasonKo: allowed
        ? `${normalizedRoleId} 역할에 ${permissionKey} 권한이 있습니다.`
        : `권한 없음: ${normalizedRoleId || 'UNKNOWN'} 역할에 ${permissionKey || 'UNKNOWN'} 권한이 없습니다.`
    };
    if (auditDecision) {
      audit.recordEvent({
        actor,
        roleId: normalizedRoleId || 'UNKNOWN',
        eventType: allowed ? 'PERMISSION_ALLOWED' : 'PERMISSION_DENIED',
        permissionKey: result.permissionKey,
        resourceType,
        resourceId,
        decision: result.decision,
        reasonKo: result.reasonKo,
        payload
      });
    }
    return result;
  }

  function evaluatePermission(payload = {}) {
    if (!identityAware) return evaluateLegacyPermission(payload);
    const result = evaluateAuthorization(payload);
    return {
      ...result,
      decision: result.allowed ? 'ALLOWED' : result.decision === 'APPROVAL_REQUIRED' ? 'APPROVAL_REQUIRED' : 'DENIED'
    };
  }

  function assertPermission(payload = {}) {
    const result = evaluatePermission(payload);
    if (!result.allowed) throw new Error(`Permission denied: ${result.roleId} cannot ${result.permissionKey}.`);
    return result;
  }

  function setActiveRole(roleId, payload = {}) {
    const normalizedRoleId = normalizeRoleId(roleId);
    if (!ROLE_DEFINITIONS.some((role) => role.roleId === normalizedRoleId)) {
      throw new Error(`Unknown role: ${roleId}`);
    }
    const before = getCurrentRole();
    withDb((database) => {
      database.prepare(`
        UPDATE role_session_state
        SET active_role_id = ?, updated_at = ?
        WHERE session_id = 'LOCAL'
      `).run(normalizedRoleId, nowIso());
    });
    audit.recordEvent({
      actor: payload.actor || before.userId,
      roleId: normalizedRoleId,
      eventType: 'ACTIVE_ROLE_CHANGED',
      permissionKey: 'system.settings.edit',
      decision: 'ALLOWED',
      reasonKo: payload.reasonKo || `${before.roleId}에서 ${normalizedRoleId} 역할로 전환`,
      payload: { beforeRoleId: before.roleId, afterRoleId: normalizedRoleId }
    });
    return getCurrentRole();
  }

  function getVisibleRoutes(roleId) {
    const normalizedRoleId = normalizeRoleId(roleId || getCurrentRole().roleId);
    return Object.entries(ROUTE_PERMISSION_MAP)
      .filter(([, permissionKey]) => ROLE_PERMISSION_MATRIX[normalizedRoleId]?.includes(permissionKey))
      .map(([route]) => route);
  }

  function getVisibleRoutesForCurrentContext(context = {}) {
    if (!identityAware) return getVisibleRoutes(context.roleId);
    return Object.entries(ROUTE_PERMISSION_MAP)
      .filter(([, permissionKey]) => evaluateAuthorization({
        ...context,
        permissionKey,
        auditDecision: false
      }).allowed)
      .map(([route]) => route);
  }

  function sanitizeDataForRole(roleId, payload) {
    const normalizedRoleId = normalizeRoleId(roleId || getCurrentRole().roleId);
    const permissions = ROLE_PERMISSION_MATRIX[normalizedRoleId] || [];
    const blocked = [];
    if (normalizedRoleId === 'CLIENT_VIEWER') blocked.push(...CUSTOMER_PRIVATE_KEY_PARTS);
    if (!permissions.includes('estimate.internal_cost.view')) blocked.push(...INTERNAL_COST_KEY_PARTS);
    if (!permissions.includes('estimate.margin.view')) blocked.push(...MARGIN_KEY_PARTS);
    if (!permissions.includes('vendor.price.view')) blocked.push(...VENDOR_PRICE_KEY_PARTS);
    return sanitizeObject(payload, blocked);
  }

  function sanitizeOutputForRole({ roleId, outputType = 'CUSTOMER', payload = {}, actor = 'LOCAL_USER' } = {}) {
    const normalizedType = String(outputType || 'CUSTOMER').toUpperCase();
    const permissionKey = normalizedType === 'INTERNAL' ? 'internal_output.generate' : 'customer_output.generate';
    const permission = evaluatePermission({
      roleId,
      permissionKey,
      actor,
      resourceType: 'OUTPUT',
      resourceId: normalizedType,
      payload: { outputType: normalizedType }
    });
    if (!permission.allowed) {
      return { ok: false, blocked: true, permission, payload: null };
    }
    const sanitized = sanitizeDataForRole(roleId, payload);
    const customerPayload = normalizedType === 'CUSTOMER'
      ? sanitizeObject(sanitized, [
        ...CUSTOMER_PRIVATE_KEY_PARTS,
        ...INTERNAL_COST_KEY_PARTS,
        ...MARGIN_KEY_PARTS,
        ...VENDOR_PRICE_KEY_PARTS
      ])
      : sanitized;
    return {
      ok: true,
      blocked: false,
      permission,
      customerSafe: normalizedType === 'CUSTOMER',
      payload: customerPayload
    };
  }

  function getRoleSummaries() {
    return ROLE_DEFINITIONS.map((role) => {
      const allowedPermissions = ROLE_PERMISSION_MATRIX[role.roleId] || [];
      return {
        roleId: role.roleId,
        displayNameKo: role.displayNameKo,
        descriptionKo: role.descriptionKo,
        allowedCount: allowedPermissions.length,
        deniedCount: ALL_PERMISSIONS.length - allowedPermissions.length,
        restrictedCount: role.roleId === 'CLIENT_VIEWER' ? allowedPermissions.length : 0,
        dangerousAllowed: DANGEROUS_PERMISSION_KEYS.filter((key) => allowedPermissions.includes(key)),
        blockedFieldLabels: blockedFieldLabelsForRole(role.roleId)
      };
    });
  }

  function getPermissionMatrix() {
    return ROLE_DEFINITIONS.flatMap((role) => PERMISSION_DEFINITIONS.map((permission) => ({
      roleId: role.roleId,
      roleDisplayNameKo: role.displayNameKo,
      permissionKey: permission.permissionKey,
      descriptionKo: permission.descriptionKo,
      allowed: ROLE_PERMISSION_MATRIX[role.roleId].includes(permission.permissionKey),
      status: permissionStatusForRole(role.roleId, permission.permissionKey),
      isDangerous: DANGEROUS_PERMISSION_KEYS.includes(permission.permissionKey)
    })));
  }

  function getSafeAccessDeniedReason({ roleId, permissionKey, routeKey = '', audience = 'INTERNAL' } = {}) {
    const normalizedRoleId = normalizeRoleId(roleId || getCurrentRole().roleId);
    const role = ROLE_DEFINITIONS.find((item) => item.roleId === normalizedRoleId);
    const permissionLabel = getPermissionDescription(permissionKey);
    const isCustomerAudience = String(audience || '').toUpperCase().includes('CUSTOMER') || normalizedRoleId === 'CLIENT_VIEWER';
    return {
      roleId: normalizedRoleId || 'UNKNOWN',
      roleDisplayNameKo: role?.displayNameKo || '알 수 없음',
      permissionKey: String(permissionKey || 'UNKNOWN'),
      routeKey: isCustomerAudience ? '' : String(routeKey || ''),
      reasonKo: `${role?.displayNameKo || normalizedRoleId || '현재 역할'} 역할에는 ${permissionLabel} 권한이 없습니다.`,
      actionKo: '역할 또는 업무 범위 확인을 관리자에게 요청하세요.',
      safeForCustomer: true,
      hiddenDetails: [
        'internal route path',
        'database path',
        'token',
        'raw customer data',
        'provider payload'
      ]
    };
  }

  function getRoleVisibilityPreview({ payload = V051_SAMPLE_PROJECT } = {}) {
    return ROLE_DEFINITIONS.map((role) => {
      const sanitized = sanitizeDataForRole(role.roleId, payload);
      return {
        roleId: role.roleId,
        roleDisplayNameKo: role.displayNameKo,
        visibleFieldKeys: Object.keys(sanitized),
        hiddenFieldLabels: blockedFieldLabelsForRole(role.roleId),
        previewPayload: sanitized,
        customerSafe: !JSON.stringify(sanitized).toLowerCase().includes('access_token')
      };
    });
  }

  function getRolePermissionCenterData() {
    const currentUser = getCurrentRole();
    return withDb((database) => ({
      currentUser,
      roles: ROLE_DEFINITIONS,
      permissions: database.prepare(`
        SELECT permission_id, permission_key, role_id, allowed, description_ko
        FROM permissions
        WHERE permission_id LIKE 'PERM-V050-%'
        ORDER BY role_id, permission_key
      `).all().map((row) => ({
        permissionId: row.permission_id,
        permissionKey: row.permission_key,
        roleId: row.role_id,
        allowed: Boolean(row.allowed),
        descriptionKo: row.description_ko
      })),
      routePermissionMap: ROUTE_PERMISSION_MAP,
      visibleRoutes: getVisibleRoutes(currentUser.roleId),
      recentAudit: audit.listEvents({ limit: 50 }),
      roleSummaries: getRoleSummaries(),
      permissionMatrix: getPermissionMatrix(),
      dangerousPermissions: DANGEROUS_PERMISSION_KEYS.map((permissionKey) => ({
        permissionKey,
        descriptionKo: getPermissionDescription(permissionKey)
      })),
      auditEventFilters: [
        'PERMISSION_DENIED',
        'ACTIVE_ROLE_CHANGED',
        'ROLE_CHANGE_REQUESTED',
        'ROLE_CHANGE_APPROVED',
        'ROLE_CHANGE_REJECTED',
        'ROLE_CHANGE_CANCELLED',
        'ROLE_CHANGE_EXPIRED',
        'ROLE_CHANGE_APPLIED',
        'ROLE_CHANGE_FAILED',
        'AUDIT_EXPORT_GENERATED',
        'INTERNAL_COST_ACCESSED',
        'MARGIN_VIEWED',
        'CUSTOMER_OUTPUT_GENERATED',
        'INTERNAL_OUTPUT_GENERATED'
      ],
      accessDeniedSamples: [
        getSafeAccessDeniedReason({ roleId: 'CLIENT_VIEWER', permissionKey: 'system.settings.view', routeKey: 'settings', audience: 'CUSTOMER' }),
        getSafeAccessDeniedReason({ roleId: 'STAFF', permissionKey: 'estimate.margin.view', routeKey: 'marginSafety' }),
        getSafeAccessDeniedReason({ roleId: 'SITE_CREW', permissionKey: 'vendor.price.view', routeKey: 'vendorPrice' })
      ],
      visibilityPreview: getRoleVisibilityPreview(),
      uxVersion: 'v0.5.1-rbac-ux-audit-viewer',
      roleChangeWorkflow: 'APPROVAL_REQUIRED',
      auditExportVersion: 'v0.5.2-permission-audit-export',
      externalAuthentication: 'DISABLED',
      securityModel: identityAware ? 'IDENTITY_SESSION_SCOPED_RBAC' : 'LOCAL_INTERNAL_RBAC',
      identityAware
    }));
  }

  return {
    getCurrentRole,
    setActiveRole,
    evaluatePermission,
    evaluateAuthorization,
    assertPermission,
    getVisibleRoutes,
    getVisibleRoutesForCurrentContext,
    sanitizeDataForRole,
    sanitizeOutputForRole,
    getRoleSummaries,
    getPermissionMatrix,
    getSafeAccessDeniedReason,
    getRoleVisibilityPreview,
    getRolePermissionCenterData,
    listAuditEvents: audit.listEvents,
    isIdentityAware: () => identityAware
  };
}

module.exports = {
  ROLE_DEFINITIONS,
  PERMISSION_DEFINITIONS,
  ROLE_PERMISSION_MATRIX,
  ROUTE_PERMISSION_MAP,
  DANGEROUS_PERMISSION_KEYS,
  createRolePermissionService
};
