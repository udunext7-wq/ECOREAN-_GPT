import { useEffect, useState } from 'react';
import {
  createExternalIdentityBinding,
  getAuthenticationStatus,
  listSafeExternalIdentityBindings,
  revokeExternalIdentityBinding,
  signInWithSupabase,
  signOutAuthentication,
  type AuthenticationStatus,
  type SafeExternalIdentityBinding
} from '../../services/identity-service/authenticationService';

type SafeIdentityOption = { identityId: string; displayNameKo: string; status: string };

export function AuthenticationAccessPanel({ onStatusChange }: { onStatusChange?: (status: AuthenticationStatus) => void } = {}) {
  const [status, setStatus] = useState<AuthenticationStatus | null>(null);
  const [bindings, setBindings] = useState<SafeExternalIdentityBinding[]>([]);
  const [identities, setIdentities] = useState<SafeIdentityOption[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [providerUserId, setProviderUserId] = useState('');
  const [targetIdentityId, setTargetIdentityId] = useState('');
  const [messageKo, setMessageKo] = useState('인증 상태를 확인하는 중입니다.');

  async function refresh() {
    const nextStatus = await getAuthenticationStatus();
    setStatus(nextStatus);
    onStatusChange?.(nextStatus);
    try {
      const [nextBindings, nextIdentities] = await Promise.all([
        listSafeExternalIdentityBindings(),
        window.ecorean?.bocDb?.listIdentities?.({ status: 'ACTIVE' }) || Promise.resolve([])
      ]);
      setBindings(nextBindings);
      setIdentities(nextIdentities as SafeIdentityOption[]);
      setTargetIdentityId((current) => current || String(nextIdentities[0]?.identityId || ''));
      setCanManage(true);
    } catch {
      setBindings([]);
      setIdentities([]);
      setCanManage(false);
    }
    setMessageKo(nextStatus.error?.messageKo || (
      nextStatus.bindingStatus === 'AUTHENTICATED_UNBOUND'
        ? '인증은 완료됐지만 ECOREAN Identity 연결이 필요합니다.'
        : '인증 상태를 확인했습니다.'
    ));
  }

  useEffect(() => { refresh().catch(() => setMessageKo('인증 상태를 불러오지 못했습니다.')); }, []);

  async function handleSignIn() {
    try {
      const result = await signInWithSupabase(email, password) as { ok?: boolean; status?: AuthenticationStatus; error?: { messageKo?: string } };
      setPassword('');
      setMessageKo(result.error?.messageKo || (result.ok ? '로그인과 Identity 연결을 확인했습니다.' : '로그인은 됐지만 Identity 연결 상태를 확인하세요.'));
      await refresh();
      window.dispatchEvent(new CustomEvent('ecorean:auth-changed'));
    } catch (error) {
      setPassword('');
      setMessageKo(error instanceof Error ? error.message : '로그인에 실패했습니다.');
    }
  }

  async function handleSignOut() {
    await signOutAuthentication();
    setEmail('');
    setPassword('');
    setMessageKo('로그아웃했습니다.');
    await refresh();
    window.dispatchEvent(new CustomEvent('ecorean:auth-changed'));
  }

  async function handleCreateBinding() {
    if (!providerUserId.trim() || !targetIdentityId) {
      setMessageKo('Supabase 사용자 ID와 ECOREAN Identity를 선택하세요.');
      return;
    }
    try {
      await createExternalIdentityBinding({ providerUserId: providerUserId.trim(), identityId: targetIdentityId });
      setProviderUserId('');
      setMessageKo('외부 인증 사용자 연결을 저장했습니다.');
      await refresh();
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '외부 인증 사용자 연결에 실패했습니다.');
    }
  }

  async function handleRevoke(bindingId: string) {
    if (!window.confirm('이 외부 인증 사용자 연결을 해제하시겠습니까?')) return;
    await revokeExternalIdentityBinding(bindingId, '관리자 연결 해제');
    setMessageKo('외부 인증 사용자 연결을 해제했습니다.');
    await refresh();
  }

  return (
    <section className="estimate-preview-card">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">AUTHENTICATION &amp; IDENTITY BINDING</span>
          <h5>인증 및 계정 연결</h5>
        </div>
        <button onClick={refresh}>새로고침</button>
      </div>

      <div className="permission-summary-grid">
        <section className="permission-group">
          <h5>Authentication Status</h5>
          <div className="permission-row"><span>인증 모드</span><em>{status?.authMode || '확인 중'}</em></div>
          <div className="permission-row"><span>Provider</span><em>{status?.providerStatus || '확인 중'}</em></div>
          <div className="permission-row"><span>로그인</span><em>{status?.authenticationStatus || '확인 중'}</em></div>
          <div className="permission-row"><span>Identity 연결</span><em>{status?.bindingStatus || '확인 중'}</em></div>
          <div className="permission-row"><span>업무 접근</span><em>{status?.businessAccess || 'DENIED'}</em></div>
        </section>

        <section className="permission-group">
          <h5>Session / Role</h5>
          <div className="permission-row"><span>사용자</span><em>{status?.identity?.displayNameKo || '연결 없음'}</em></div>
          <div className="permission-row"><span>역할</span><em>{status?.role?.roleId || '없음'}</em></div>
          <div className="permission-row"><span>범위</span><em>{status?.role?.scopeType || '없음'}</em></div>
          <div className="permission-row"><span>세션</span><em>{status?.session?.status || '없음'}</em></div>
        </section>
      </div>

      {status?.authMode === 'SUPABASE' && status.authenticationStatus !== 'AUTHENTICATED' ? (
        <div className="role-control-row">
          <label><span>이메일</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" /></label>
          <label><span>비밀번호</span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label>
          <button onClick={handleSignIn}>Supabase 로그인</button>
        </div>
      ) : null}

      {status?.bindingStatus === 'AUTHENTICATED_UNBOUND' ? (
        <p className="small-note">인증은 완료됐지만 내부 Identity가 연결되지 않아 모든 업무 기능이 차단됩니다. 관리자에게 계정 연결을 요청하세요.</p>
      ) : null}

      {status?.authMode === 'SUPABASE' && status.authenticationStatus === 'AUTHENTICATED' ? (
        <div className="role-control-row"><button onClick={handleSignOut}>로그아웃</button></div>
      ) : null}

      {canManage ? (
        <section className="permission-group">
          <h5>External Identity Binding Admin</h5>
          <p className="small-note">LOCAL 대표/관리자가 Supabase 사용자 ID를 기존 ECOREAN Identity에 최초 연결합니다. 목록에는 안전한 식별 지문만 표시됩니다.</p>
          <div className="role-control-row">
            <label><span>Supabase 사용자 ID</span><input value={providerUserId} onChange={(event) => setProviderUserId(event.target.value)} /></label>
            <label>
              <span>ECOREAN Identity</span>
              <select value={targetIdentityId} onChange={(event) => setTargetIdentityId(event.target.value)}>
                {identities.map((identity) => <option key={identity.identityId} value={identity.identityId}>{identity.displayNameKo}</option>)}
              </select>
            </label>
            <button onClick={handleCreateBinding}>연결 저장</button>
          </div>
          {bindings.length === 0 ? <p className="small-note">등록된 외부 Identity 연결이 없습니다.</p> : bindings.map((binding) => (
            <div className="permission-row" key={binding.bindingId}>
              <span>{binding.providerUserLabel} / {binding.identityId}</span>
              <em>{binding.status}</em>
              {binding.status === 'ACTIVE' ? <button onClick={() => handleRevoke(binding.bindingId)}>연결 해제</button> : null}
            </div>
          ))}
        </section>
      ) : null}
      <p className="small-note">{messageKo}</p>
    </section>
  );
}
