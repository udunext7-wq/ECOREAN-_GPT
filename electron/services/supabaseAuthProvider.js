'use strict';

const crypto = require('crypto');

const PROVIDER = 'SUPABASE';

function fingerprint(value) {
  const text = String(value || '');
  return text ? crypto.createHash('sha256').update(`ecorean:${text}`).digest('hex').slice(0, 16) : '';
}

function normalizeError(error, fallback = 'AUTH_PROVIDER_ERROR') {
  const status = Number(error?.status || 0);
  return {
    code: String(error?.code || (status ? `HTTP_${status}` : fallback)).replace(/[^A-Z0-9_-]/gi, '_').toUpperCase(),
    messageKo: status === 400 || status === 401
      ? '로그인 정보를 확인하세요.'
      : '외부 인증 상태를 확인할 수 없습니다.'
  };
}

function createSupabaseAuthProvider({ createClient, storage, config = {}, clock = () => new Date() } = {}) {
  if (typeof createClient !== 'function') throw new Error('Supabase createClient factory is required.');
  if (!storage) throw new Error('Supabase secure session storage is required.');
  let client = null;
  let subscription = null;
  let currentPrincipal = null;
  let lastError = null;
  let externalCallPerformed = false;
  const listeners = new Set();

  const url = String(config.url || '').trim();
  const publishableKey = String(config.publishableKey || '').trim();

  function validateConfiguration() {
    const forbiddenConfigured = Boolean(
      config.forbiddenSecretsConfigured || config.serviceRoleKey || config.databasePassword || config.jwtSecret
    );
    const forbiddenKey = /service[_-]?role/i.test(publishableKey) || publishableKey.startsWith('sb_secret_');
    const validUrl = /^https:\/\/[a-z0-9.-]+/i.test(url);
    const valid = Boolean(validUrl && publishableKey && !forbiddenConfigured && !forbiddenKey);
    return {
      provider: PROVIDER,
      valid,
      status: valid ? 'CONFIGURED' : 'NOT_CONFIGURED',
      reasonCode: valid ? 'CONFIGURATION_READY' : forbiddenConfigured || forbiddenKey
        ? 'FORBIDDEN_SECRET_CONFIGURATION'
        : 'MISSING_SUPABASE_CONFIGURATION'
    };
  }

  function principalFromSession(session, verifiedUser) {
    const user = verifiedUser || session?.user;
    if (!session || !user?.id) return null;
    const expiresAt = session.expires_at
      ? new Date(Number(session.expires_at) * 1000).toISOString()
      : new Date(clock().getTime() + 60 * 60 * 1000).toISOString();
    return {
      providerType: PROVIDER,
      providerUserId: String(user.id),
      providerUserFingerprint: fingerprint(user.id),
      providerSessionRef: `SUP-${fingerprint(`${user.id}:${session.expires_at || expiresAt}`)}`,
      expiresAt
    };
  }

  function emit(event, principal = currentPrincipal) {
    listeners.forEach((listener) => {
      try { listener({ event, principal }); } catch { /* listener isolation */ }
    });
  }

  async function verifySession(session) {
    if (!session) return null;
    if (session.expires_at && Number(session.expires_at) * 1000 <= clock().getTime()) {
      throw Object.assign(new Error('Provider session expired.'), { code: 'PROVIDER_SESSION_EXPIRED', status: 401 });
    }
    const response = await client.auth.getUser();
    if (response.error) throw response.error;
    if (!response.data?.user?.id || response.data.user.id !== session.user?.id) {
      throw Object.assign(new Error('Provider session user mismatch.'), { code: 'PROVIDER_USER_MISMATCH' });
    }
    return principalFromSession(session, response.data.user);
  }

  async function initialize() {
    const validation = validateConfiguration();
    if (!validation.valid) {
      lastError = { code: validation.reasonCode, messageKo: 'Supabase 인증 설정이 필요합니다.' };
      return getProviderStatus();
    }
    if (!client) {
      try {
        client = createClient(url, publishableKey, {
          auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
            storage
          }
        });
        const result = client.auth.onAuthStateChange((event, session) => {
          Promise.resolve().then(async () => {
            if (event === 'SIGNED_OUT' || !session) {
              currentPrincipal = null;
              emit('SIGNED_OUT', null);
              return;
            }
            try {
              currentPrincipal = await verifySession(session);
              lastError = null;
              emit(event, currentPrincipal);
            } catch (error) {
              currentPrincipal = null;
              lastError = normalizeError(error);
              emit('AUTH_ERROR', null);
            }
          });
        });
        subscription = result?.data?.subscription || null;
      } catch (error) {
        client = null;
        currentPrincipal = null;
        lastError = normalizeError(error, 'PROVIDER_INITIALIZATION_FAILED');
        emit('AUTH_ERROR', null);
      }
    }
    return getProviderStatus();
  }

  async function authenticate(payload = {}) {
    await initialize();
    if (!client) return { ok: false, ...getProviderStatus() };
    const email = String(payload.email || '').trim();
    const password = String(payload.password || '');
    if (!email || !password) return { ok: false, error: { code: 'CREDENTIALS_REQUIRED', messageKo: '이메일과 비밀번호를 입력하세요.' } };
    try {
      externalCallPerformed = true;
      const response = await client.auth.signInWithPassword({ email, password });
      if (response.error) throw response.error;
      currentPrincipal = await verifySession(response.data?.session);
      lastError = null;
      emit('SIGNED_IN', currentPrincipal);
      return { ok: true, principal: currentPrincipal };
    } catch (error) {
      currentPrincipal = null;
      lastError = normalizeError(error, 'SIGN_IN_FAILED');
      emit('AUTH_ERROR', null);
      return { ok: false, error: lastError };
    }
  }

  async function restoreSession() {
    await initialize();
    if (!client) return { ok: false, principal: null, ...getProviderStatus() };
    try {
      externalCallPerformed = true;
      const response = await client.auth.getSession();
      if (response.error) throw response.error;
      currentPrincipal = await verifySession(response.data?.session || null);
      lastError = null;
      emit(currentPrincipal ? 'INITIAL_SESSION' : 'SIGNED_OUT', currentPrincipal);
      return { ok: Boolean(currentPrincipal), principal: currentPrincipal };
    } catch (error) {
      currentPrincipal = null;
      lastError = normalizeError(error, 'SESSION_RESTORE_FAILED');
      emit('AUTH_ERROR', null);
      return { ok: false, principal: null, error: lastError };
    }
  }

  async function refreshSession() {
    await initialize();
    if (!client) return { ok: false, principal: null, ...getProviderStatus() };
    try {
      externalCallPerformed = true;
      const response = await client.auth.refreshSession();
      if (response.error) throw response.error;
      currentPrincipal = await verifySession(response.data?.session || null);
      lastError = null;
      emit('TOKEN_REFRESHED', currentPrincipal);
      return { ok: Boolean(currentPrincipal), principal: currentPrincipal };
    } catch (error) {
      currentPrincipal = null;
      lastError = normalizeError(error, 'SESSION_REFRESH_FAILED');
      emit('AUTH_ERROR', null);
      return { ok: false, principal: null, error: lastError };
    }
  }

  async function signOut() {
    await initialize();
    if (client) {
      externalCallPerformed = true;
      const response = await client.auth.signOut({ scope: 'local' });
      if (response?.error) lastError = normalizeError(response.error, 'SIGN_OUT_FAILED');
      else lastError = null;
    }
    currentPrincipal = null;
    await storage.clear?.();
    emit('SIGNED_OUT', null);
    return { ok: !lastError, provider: PROVIDER };
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function getCurrentPrincipal() {
    return currentPrincipal ? { ...currentPrincipal } : null;
  }

  function getProviderStatus() {
    const validation = validateConfiguration();
    return {
      provider: PROVIDER,
      status: !validation.valid ? 'NOT_CONFIGURED' : currentPrincipal ? 'AUTHENTICATED' : lastError ? 'ERROR' : 'READY',
      authenticationStatus: currentPrincipal ? 'AUTHENTICATED' : 'SIGNED_OUT',
      providerUserFingerprint: currentPrincipal?.providerUserFingerprint || '',
      externalCallPerformed,
      storage: storage.getStatus?.() || { persistence: 'UNKNOWN' },
      error: lastError ? { ...lastError } : null
    };
  }

  function dispose() {
    subscription?.unsubscribe?.();
    subscription = null;
    listeners.clear();
  }

  return {
    initialize,
    validateConfiguration,
    authenticate,
    restoreSession,
    refreshSession,
    revokeSession: signOut,
    signOut,
    subscribe,
    getCurrentPrincipal,
    getProviderStatus,
    dispose
  };
}

module.exports = { PROVIDER, fingerprint, createSupabaseAuthProvider };
