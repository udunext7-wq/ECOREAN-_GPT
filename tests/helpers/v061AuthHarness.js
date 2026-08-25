const { createV060IdentityHarness } = require('./v060IdentityHarness');
const { DEFAULT_ORGANIZATION_ID } = require('../../electron/services/identityService');
const { createExternalIdentityBindingService } = require('../../electron/services/externalIdentityBindingService');
const { createSupabaseAuthProvider } = require('../../electron/services/supabaseAuthProvider');
const { createAuthProviderAdapter } = require('../../electron/services/authProviderAdapter');
const { createAuthSessionCoordinator } = require('../../electron/services/authSessionCoordinator');

function createMemoryStorage() {
  const values = new Map();
  return {
    async getItem(key) { return values.get(key) ?? null; },
    async setItem(key, value) { values.set(key, String(value)); },
    async removeItem(key) { values.delete(key); },
    async clear() { values.clear(); },
    getStatus() { return { persistence: 'TEST_MEMORY_ONLY', rawTokenPersistence: 'BLOCKED' }; },
    values
  };
}

function createFakeSupabaseClientFactory({ users, storageKey = 'sb-test-auth-token' } = {}) {
  const directory = users || {
    'user-a@example.invalid': { id: 'SUPA-USER-A' },
    'user-b@example.invalid': { id: 'SUPA-USER-B' },
    'unbound@example.invalid': { id: 'SUPA-UNBOUND' }
  };
  const calls = { create: 0, signIn: 0, getSession: 0, getUser: 0, refresh: 0, signOut: 0 };

  function factory(_url, _key, options) {
    calls.create += 1;
    const storage = options.auth.storage;
    let session = null;
    const listeners = new Set();

    async function persist(next) {
      session = next;
      if (next) await storage.setItem(storageKey, JSON.stringify(next));
      else await storage.removeItem(storageKey);
    }

    async function load() {
      if (session) return session;
      const value = await storage.getItem(storageKey);
      session = value ? JSON.parse(value) : null;
      return session;
    }

    function emit(event, next) {
      listeners.forEach((listener) => listener(event, next));
    }

    return {
      auth: {
        onAuthStateChange(listener) {
          listeners.add(listener);
          return { data: { subscription: { unsubscribe: () => listeners.delete(listener) } } };
        },
        async signInWithPassword({ email, password }) {
          calls.signIn += 1;
          const user = directory[email];
          if (!user || password !== 'synthetic-password') {
            return { data: { session: null, user: null }, error: { code: 'invalid_credentials', status: 400 } };
          }
          const next = {
            access_token: `ACCESS-SECRET-${user.id}`,
            refresh_token: `REFRESH-SECRET-${user.id}`,
            expires_at: 1900000000,
            user: { id: user.id }
          };
          await persist(next);
          emit('SIGNED_IN', next);
          return { data: { session: next, user: next.user }, error: null };
        },
        async getSession() {
          calls.getSession += 1;
          return { data: { session: await load() }, error: null };
        },
        async getUser() {
          calls.getUser += 1;
          const active = await load();
          return { data: { user: active?.user || null }, error: active ? null : { code: 'missing_session', status: 401 } };
        },
        async refreshSession() {
          calls.refresh += 1;
          const active = await load();
          if (!active) return { data: { session: null }, error: { code: 'missing_session', status: 401 } };
          const next = { ...active, expires_at: active.expires_at + 3600 };
          await persist(next);
          emit('TOKEN_REFRESHED', next);
          return { data: { session: next }, error: null };
        },
        async signOut() {
          calls.signOut += 1;
          await persist(null);
          emit('SIGNED_OUT', null);
          return { error: null };
        }
      }
    };
  }

  return { factory, calls };
}

function createV061AuthHarness(prefix = 'boc-v061-auth-', options = {}) {
  const h = createV060IdentityHarness(prefix, options);
  const storage = options.storage || createMemoryStorage();
  const fakeSupabase = createFakeSupabaseClientFactory(options.fakeSupabaseOptions);
  const identities = [
    { identityId: 'IDN-AUTH-A', displayNameKo: '인증 사용자 A', roleId: 'STAFF', providerUserId: 'SUPA-USER-A' },
    { identityId: 'IDN-AUTH-B', displayNameKo: '인증 사용자 B', roleId: 'ADMIN', providerUserId: 'SUPA-USER-B' }
  ];
  identities.forEach((item) => {
    h.identity.createIdentity({ identityId: item.identityId, identityType: 'EMPLOYEE', displayNameKo: item.displayNameKo });
    h.identity.createOrganizationMembership({
      identityId: item.identityId,
      organizationId: DEFAULT_ORGANIZATION_ID,
      membershipType: 'EMPLOYEE'
    });
    h.assignments.createRoleAssignment({
      assignmentId: `RASN-${item.identityId}`,
      identityId: item.identityId,
      roleId: item.roleId,
      scopeType: 'GLOBAL',
      organizationId: DEFAULT_ORGANIZATION_ID
    });
  });

  let coordinator = null;
  let coordinatorInitialized = false;
  const bindings = createExternalIdentityBindingService({
    databasePath: h.databasePath,
    identityService: h.identity,
    permissionAuditService: h.audit,
    getCurrentActorContext: () => coordinatorInitialized ? coordinator.getCurrentContext() : h.provider.getCurrentContext(),
    authorizeAction: (permissionKey) => h.roles.evaluateAuthorization({
      permissionKey,
      resourceType: 'EXTERNAL_IDENTITY_BINDING',
      resourceId: 'TEST',
      auditDecision: false
    })
  });
  if (options.createBindings !== false) {
    identities.forEach((item) => bindings.createBinding({
      providerType: 'SUPABASE', providerUserId: item.providerUserId, identityId: item.identityId
    }));
  }
  const supabase = createSupabaseAuthProvider({
    createClient: fakeSupabase.factory,
    storage,
    config: { url: 'https://synthetic.supabase.co', publishableKey: 'sb_publishable_synthetic_test_only' }
  });
  const adapter = createAuthProviderAdapter({ mode: 'SUPABASE', supabaseProvider: supabase, localProvider: h.provider });
  coordinator = createAuthSessionCoordinator({
    authMode: 'SUPABASE',
    authProviderAdapter: adapter,
    bindingService: bindings,
    identityService: h.identity,
    sessionService: h.session,
    roleAssignmentService: h.assignments,
    permissionAuditService: h.audit
  });
  const initializeCoordinator = coordinator.initialize.bind(coordinator);
  coordinator.initialize = async () => {
    coordinatorInitialized = true;
    return initializeCoordinator();
  };
  return { ...h, storage, fakeSupabase, identities, bindings, supabase, adapter, coordinator };
}

module.exports = { createMemoryStorage, createFakeSupabaseClientFactory, createV061AuthHarness };
