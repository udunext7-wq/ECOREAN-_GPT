'use strict';

const { DEFAULT_IDENTITY_ID } = require('./identityService');

function createLocalIdentityProvider({ identityService, sessionService } = {}) {
  if (!identityService || !sessionService) throw new Error('Local identity provider requires identity and session services.');

  function initialize() {
    const identity = identityService.ensureDefaultLocalIdentity();
    const session = sessionService.ensureLocalSession(identity.identityId);
    return { provider: 'LOCAL', identity, session, externalAuthentication: 'DISABLED' };
  }

  function getCurrentContext() {
    const session = sessionService.getCurrentSession();
    if (!session) return { valid: false, reasonCode: 'MISSING_SESSION', identity: null, session: null };
    return sessionService.validateSession(session.sessionId);
  }

  function authenticate() { return initialize(); }
  function restoreSession() { return getCurrentContext(); }
  function refreshSession() { return getCurrentContext(); }
  function revokeSession(reason) {
    const session = sessionService.getCurrentSession();
    return session ? sessionService.revokeSession(session.sessionId, reason || 'LOCAL_SIGN_OUT') : null;
  }
  function signOut() { return revokeSession('LOCAL_SIGN_OUT'); }

  return {
    initialize,
    authenticate,
    restoreSession,
    refreshSession,
    revokeSession,
    signOut,
    getCurrentContext,
    getProviderStatus: () => ({ provider: 'LOCAL', status: 'READY', identityId: DEFAULT_IDENTITY_ID, externalCallPerformed: false })
  };
}

module.exports = { createLocalIdentityProvider };
