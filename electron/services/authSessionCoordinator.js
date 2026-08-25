'use strict';

const { DEFAULT_ORGANIZATION_ID } = require('./identityService');

function createAuthSessionCoordinator({
  authMode,
  authProviderAdapter,
  bindingService,
  identityService,
  sessionService,
  roleAssignmentService,
  permissionAuditService
} = {}) {
  const mode = String(authMode || 'LOCAL').toUpperCase();
  let bindingState = mode === 'LOCAL' ? 'LOCAL' : 'SIGNED_OUT';
  let providerPrincipal = null;
  let unsubscribe = null;

  function currentContext() {
    const session = sessionService.getCurrentSession();
    if (!session) return { valid: false, reasonCode: 'MISSING_SESSION', identity: null, session: null, assignment: null };
    const validation = sessionService.validateSession(session.sessionId);
    if (!validation.valid) {
      if (mode === 'SUPABASE') sessionService.clearCurrentSession();
      return { ...validation, assignment: null };
    }
    if (mode === 'SUPABASE') {
      let binding = null;
      try {
        binding = providerPrincipal
          ? bindingService.getBindingForProvider(providerPrincipal.providerType, providerPrincipal.providerUserId)
          : null;
      } catch {
        sessionService.revokeSession(session.sessionId, 'BINDING_LOOKUP_FAILED');
        sessionService.clearCurrentSession();
        return { valid: false, reasonCode: 'BINDING_LOOKUP_FAILED', identity: null, session: null, assignment: null };
      }
      if (!binding || binding.identityId !== validation.identity.identityId) {
        sessionService.revokeSession(session.sessionId, 'BINDING_REVOKED_OR_MISMATCHED');
        sessionService.clearCurrentSession();
        return { valid: false, reasonCode: 'ACTIVE_BINDING_REQUIRED', identity: null, session: null, assignment: null };
      }
    }
    const assignment = roleAssignmentService.evaluateAssignments(validation.identity.identityId, {
      organizationId: session.organizationId
    }).candidates[0]?.assignment || null;
    return { ...validation, assignment };
  }

  function audit(eventType, decision, reasonKo, payload = {}) {
    const context = currentContext();
    permissionAuditService?.recordEvent?.({
      actorId: context.identity?.identityId || 'EXTERNAL_AUTH_USER',
      actorIdentityId: context.identity?.identityId || '',
      actorOrganizationId: context.session?.organizationId || '',
      sessionId: context.session?.sessionId || '',
      roleId: context.assignment?.roleId || 'UNBOUND',
      eventType,
      permissionKey: 'authentication.session',
      resourceType: 'AUTH_SESSION',
      resourceId: mode,
      decision,
      reasonKo,
      payload
    });
  }

  function clearEcoreanSession(reason) {
    const current = sessionService.getCurrentSession();
    if (current?.status === 'ACTIVE' && current.providerKey === 'SUPABASE') {
      sessionService.revokeSession(current.sessionId, reason);
    }
    sessionService.clearCurrentSession();
  }

  function bindPrincipal(principal, source = 'PROVIDER_EVENT') {
    providerPrincipal = principal || null;
    if (!principal) {
      bindingState = 'SIGNED_OUT';
      clearEcoreanSession('PROVIDER_SIGNED_OUT');
      return getStatus();
    }
    let binding = null;
    try {
      binding = bindingService.getBindingForProvider(principal.providerType, principal.providerUserId);
    } catch {
      bindingState = 'BINDING_ERROR';
      clearEcoreanSession('BINDING_LOOKUP_FAILED');
      return getStatus();
    }
    if (!binding) {
      bindingState = 'AUTHENTICATED_UNBOUND';
      clearEcoreanSession('PROVIDER_IDENTITY_UNBOUND');
      audit('EXTERNAL_AUTH_UNBOUND', 'DENIED', '외부 인증 사용자가 ECOREAN Identity에 연결되지 않았습니다.', {
        providerType: principal.providerType,
        providerUserFingerprint: principal.providerUserFingerprint,
        source
      });
      return getStatus();
    }
    const identity = identityService.getIdentity(binding.identityId);
    if (!identity || identity.status !== 'ACTIVE') {
      bindingState = 'IDENTITY_BLOCKED';
      clearEcoreanSession('BOUND_IDENTITY_NOT_ACTIVE');
      audit('EXTERNAL_AUTH_IDENTITY_BLOCKED', 'DENIED', '연결된 ECOREAN Identity가 활성 상태가 아닙니다.', {
        providerType: principal.providerType,
        providerUserFingerprint: principal.providerUserFingerprint
      });
      return getStatus();
    }
    const membership = identityService.listOrganizationMemberships(identity.identityId)
      .find((item) => item.status === 'ACTIVE');
    if (!membership) {
      bindingState = 'MEMBERSHIP_BLOCKED';
      clearEcoreanSession('BOUND_IDENTITY_MEMBERSHIP_MISSING');
      return getStatus();
    }
    const assignments = roleAssignmentService.evaluateAssignments(identity.identityId, {
      organizationId: membership.organizationId || DEFAULT_ORGANIZATION_ID
    });
    if (!assignments.candidates.length) {
      bindingState = 'ROLE_BLOCKED';
      clearEcoreanSession('BOUND_IDENTITY_ASSIGNMENT_MISSING');
      return getStatus();
    }
    const existingSession = sessionService.getCurrentSession();
    if (
      existingSession?.status === 'ACTIVE'
      && existingSession.identityId === identity.identityId
      && existingSession.providerSessionRef === principal.providerSessionRef
    ) {
      bindingState = 'BOUND';
      return getStatus();
    }
    clearEcoreanSession('PROVIDER_USER_SWITCH');
    sessionService.createSession({
      identityId: identity.identityId,
      organizationId: membership.organizationId || DEFAULT_ORGANIZATION_ID,
      providerKey: 'SUPABASE',
      providerSessionRef: principal.providerSessionRef,
      expiresAt: principal.expiresAt,
      makeCurrent: true
    });
    bindingState = 'BOUND';
    audit('EXTERNAL_AUTH_SESSION_BOUND', 'ALLOWED', '외부 인증 세션을 ECOREAN Identity 문맥에 연결했습니다.', {
      providerType: principal.providerType,
      providerUserFingerprint: principal.providerUserFingerprint,
      source
    });
    return getStatus();
  }

  async function initialize() {
    if (mode === 'LOCAL') {
      await authProviderAdapter.initialize();
      bindingState = 'LOCAL';
      return getStatus();
    }
    sessionService.clearCurrentSession();
    unsubscribe = authProviderAdapter.subscribe?.(({ event, principal }) => {
      if (['SIGNED_IN', 'INITIAL_SESSION', 'TOKEN_REFRESHED', 'SIGNED_OUT', 'AUTH_ERROR'].includes(event)) {
        bindPrincipal(principal, event);
      }
    }) || null;
    await authProviderAdapter.initialize();
    const restored = await authProviderAdapter.restoreSession();
    bindPrincipal(restored?.principal || null, 'RESTORE');
    return getStatus();
  }

  async function signIn(payload = {}) {
    if (mode !== 'SUPABASE') return { ok: false, reasonCode: 'AUTH_MODE_LOCAL', status: getStatus() };
    const result = await authProviderAdapter.authenticate({ email: payload.email, password: payload.password });
    if (!result?.ok) {
      clearEcoreanSession('PROVIDER_SIGN_IN_FAILED');
      audit('EXTERNAL_AUTH_SIGN_IN_FAILED', 'DENIED', '외부 인증 로그인에 실패했습니다.', { errorCode: result?.error?.code || 'SIGN_IN_FAILED' });
      return { ...result, status: getStatus() };
    }
    const status = bindPrincipal(result.principal, 'SIGN_IN');
    return { ok: status.bindingStatus === 'BOUND', authenticated: true, status };
  }

  async function restoreSession() {
    if (mode !== 'SUPABASE') return { ok: true, status: getStatus() };
    const result = await authProviderAdapter.restoreSession();
    return { ...result, status: bindPrincipal(result?.principal || null, 'RESTORE') };
  }

  async function signOut() {
    if (mode === 'LOCAL') return getStatus();
    const priorContext = currentContext();
    const prior = getStatus();
    await authProviderAdapter.signOut();
    clearEcoreanSession('USER_SIGN_OUT');
    providerPrincipal = null;
    bindingState = 'SIGNED_OUT';
    permissionAuditService?.recordEvent?.({
      actorId: priorContext.identity?.identityId || 'EXTERNAL_AUTH_USER',
      actorIdentityId: priorContext.identity?.identityId || '',
      actorOrganizationId: priorContext.session?.organizationId || '',
      sessionId: priorContext.session?.sessionId || '',
      roleId: priorContext.assignment?.roleId || 'UNBOUND',
      eventType: 'AUTH_SESSION_SIGNED_OUT',
      permissionKey: 'authentication.session',
      resourceType: 'AUTH_SESSION',
      resourceId: 'SUPABASE',
      decision: 'ALLOWED',
      reasonKo: '현재 인증 세션에서 로그아웃했습니다.',
      payload: {
        providerType: prior.providerType,
        providerUserFingerprint: prior.providerUserFingerprint
      }
    });
    return getStatus();
  }

  function getStatus() {
    const providerStatus = authProviderAdapter.getProviderStatus();
    const context = currentContext();
    return {
      authMode: mode,
      providerType: mode === 'SUPABASE' ? 'SUPABASE' : 'LOCAL',
      providerStatus: providerStatus.status || 'UNKNOWN',
      authenticationStatus: mode === 'LOCAL'
        ? (context.valid ? 'AUTHENTICATED' : 'SIGNED_OUT')
        : providerPrincipal ? 'AUTHENTICATED' : 'SIGNED_OUT',
      bindingStatus: bindingState,
      providerUserFingerprint: providerPrincipal?.providerUserFingerprint || '',
      identity: context.valid ? {
        identityId: context.identity.identityId,
        displayNameKo: context.identity.displayNameKo,
        status: context.identity.status
      } : null,
      role: context.assignment ? {
        roleId: context.assignment.roleId,
        scopeType: context.assignment.scopeType
      } : null,
      session: context.valid ? {
        sessionId: context.session.sessionId,
        providerKey: context.session.providerKey,
        status: context.session.status,
        expiresAt: context.session.expiresAt
      } : null,
      businessAccess: context.valid ? 'ALLOWED_BY_RBAC' : 'DENIED',
      error: providerStatus.error || null
    };
  }

  function dispose() {
    unsubscribe?.();
    unsubscribe = null;
    authProviderAdapter.dispose?.();
  }

  return { initialize, signIn, restoreSession, signOut, getStatus, getCurrentContext: currentContext, dispose };
}

module.exports = { createAuthSessionCoordinator };
