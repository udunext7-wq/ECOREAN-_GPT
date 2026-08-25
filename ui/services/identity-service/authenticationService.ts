export type AuthenticationStatus = {
  authMode: 'LOCAL' | 'SUPABASE' | string;
  providerType: 'LOCAL' | 'SUPABASE' | string;
  providerStatus: string;
  authenticationStatus: string;
  bindingStatus: string;
  providerUserFingerprint: string;
  identity: null | { identityId: string; displayNameKo: string; status: string };
  role: null | { roleId: string; scopeType: string };
  session: null | { sessionId: string; providerKey: string; status: string; expiresAt: string };
  businessAccess: string;
  error: null | { code?: string; messageKo?: string };
};

export type SafeExternalIdentityBinding = {
  bindingId: string;
  providerType: string;
  providerUserFingerprint: string;
  providerUserLabel: string;
  identityId: string;
  status: string;
  createdAt: string;
  revokedAt: string;
  version: number;
};

const unavailableStatus: AuthenticationStatus = {
  authMode: 'LOCAL', providerType: 'LOCAL', providerStatus: 'UNAVAILABLE',
  authenticationStatus: 'UNKNOWN', bindingStatus: 'UNKNOWN', providerUserFingerprint: '',
  identity: null, role: null, session: null, businessAccess: 'DENIED',
  error: { code: 'IPC_UNAVAILABLE', messageKo: '인증 상태를 불러올 수 없습니다.' }
};

export async function getAuthenticationStatus() {
  return (await window.ecorean?.bocDb?.getAuthenticationStatus?.() || unavailableStatus) as AuthenticationStatus;
}

export async function signInWithSupabase(email: string, password: string) {
  const api = window.ecorean?.bocDb;
  if (!api?.signInWithSupabase) throw new Error('Supabase 로그인 IPC를 사용할 수 없습니다.');
  return api.signInWithSupabase({ email, password });
}

export async function signOutAuthentication() {
  const api = window.ecorean?.bocDb;
  if (!api?.signOutAuthentication) throw new Error('로그아웃 IPC를 사용할 수 없습니다.');
  return api.signOutAuthentication();
}

export async function listSafeExternalIdentityBindings() {
  const api = window.ecorean?.bocDb;
  if (!api?.listSafeExternalIdentityBindings) return [];
  return api.listSafeExternalIdentityBindings({}) as Promise<SafeExternalIdentityBinding[]>;
}

export async function createExternalIdentityBinding(payload: {
  providerUserId: string;
  identityId: string;
}) {
  const api = window.ecorean?.bocDb;
  if (!api?.createExternalIdentityBinding) throw new Error('외부 Identity 연결 IPC를 사용할 수 없습니다.');
  return api.createExternalIdentityBinding({ providerType: 'SUPABASE', ...payload });
}

export async function revokeExternalIdentityBinding(bindingId: string, reason: string) {
  const api = window.ecorean?.bocDb;
  if (!api?.revokeExternalIdentityBinding) throw new Error('외부 Identity 연결 해제 IPC를 사용할 수 없습니다.');
  return api.revokeExternalIdentityBinding({ bindingId, reason });
}
