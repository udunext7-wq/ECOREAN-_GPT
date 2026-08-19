'use strict';

const AUTH_PROVIDER_STATUS = Object.freeze({
  provider: null,
  status: 'DISABLED',
  authenticationStatus: 'NOT_CONFIGURED',
  externalCallPerformed: false,
  message: 'External authentication providers are disabled for v0.6.0 readiness.'
});

function createAuthProviderAdapter() {
  const disabled = () => ({ ...AUTH_PROVIDER_STATUS });
  return {
    getProviderStatus: disabled,
    validateConfiguration: disabled,
    authenticate: disabled,
    restoreSession: disabled,
    refreshSession: disabled,
    revokeSession: disabled,
    signOut: disabled
  };
}

module.exports = { AUTH_PROVIDER_STATUS, createAuthProviderAdapter };
