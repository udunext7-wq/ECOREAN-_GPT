'use strict';

const AUTH_PROVIDER_STATUS = Object.freeze({
  provider: null,
  status: 'DISABLED',
  authenticationStatus: 'NOT_CONFIGURED',
  externalCallPerformed: false,
  message: 'External authentication providers are disabled for v0.6.0 readiness.'
});

const AUTH_MODES = Object.freeze({ LOCAL: 'LOCAL', SUPABASE: 'SUPABASE' });

function normalizeAuthMode(value = 'LOCAL') {
  const mode = String(value || 'LOCAL').trim().toUpperCase();
  if (!Object.prototype.hasOwnProperty.call(AUTH_MODES, mode)) return 'INVALID';
  return mode;
}

function createAuthProviderAdapter(options) {
  if (!options) {
    const disabled = () => ({ ...AUTH_PROVIDER_STATUS });
    return {
      initialize: disabled,
      getProviderStatus: disabled,
      validateConfiguration: disabled,
      authenticate: disabled,
      restoreSession: disabled,
      refreshSession: disabled,
      revokeSession: disabled,
      signOut: disabled,
      getCurrentPrincipal: () => null,
      subscribe: () => () => {},
      dispose: () => {}
    };
  }
  const mode = normalizeAuthMode(options.mode);
  const provider = mode === AUTH_MODES.LOCAL ? options.localProvider
    : mode === AUTH_MODES.SUPABASE ? options.supabaseProvider
      : null;
  const failClosed = () => ({
    provider: mode === AUTH_MODES.SUPABASE ? 'SUPABASE' : null,
    status: 'ERROR',
    authenticationStatus: 'DENIED',
    reasonCode: mode === 'INVALID' ? 'INVALID_AUTH_MODE' : 'AUTH_PROVIDER_UNAVAILABLE',
    externalCallPerformed: false
  });
  const call = (method, fallback = failClosed) => (...args) => (
    provider && typeof provider[method] === 'function' ? provider[method](...args) : fallback()
  );
  return {
    mode,
    initialize: call('initialize'),
    getProviderStatus: call('getProviderStatus'),
    validateConfiguration: call('validateConfiguration'),
    authenticate: call('authenticate'),
    restoreSession: call('restoreSession'),
    refreshSession: call('refreshSession'),
    revokeSession: call('revokeSession'),
    signOut: call('signOut'),
    getCurrentPrincipal: call('getCurrentPrincipal', () => null),
    subscribe: call('subscribe', () => () => {}),
    dispose: call('dispose', () => undefined)
  };
}

module.exports = { AUTH_PROVIDER_STATUS, AUTH_MODES, normalizeAuthMode, createAuthProviderAdapter };
