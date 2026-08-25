import { useEffect, useState } from 'react';
import {
  loadIdentityAccessSummary,
  type IdentitySummary,
  type RoleAssignment,
  type SessionSummary
} from '../../services/identity-service/identityService';

export function IdentityAccessSummaryPanel() {
  const [identity, setIdentity] = useState<IdentitySummary | null>(null);
  const [session, setSession] = useState<SessionSummary | null>(null);
  const [assignments, setAssignments] = useState<RoleAssignment[]>([]);
  const [providerStatus, setProviderStatus] = useState('확인 중');

  async function refresh() {
    const [nextIdentity, nextSession, nextAssignments, providers] = await loadIdentityAccessSummary();
    setIdentity(nextIdentity);
    setSession(nextSession);
    setAssignments(nextAssignments);
    const external = providers.external as { status?: string } | undefined;
    setProviderStatus(external?.status || 'DISABLED');
  }

  useEffect(() => {
    refresh().catch(() => setProviderStatus('확인 필요'));
  }, []);

  return (
    <section className="estimate-preview-card">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">IDENTITY &amp; AUTH READINESS</span>
          <h5>Identity 접근 문맥</h5>
        </div>
        <button onClick={refresh}>새로고침</button>
      </div>

      <div className="permission-summary-grid">
        <section className="permission-group">
          <h5>Identity Summary</h5>
          <div className="permission-row"><span>표시 이름</span><em>{identity?.identity?.displayNameKo || '확인 필요'}</em></div>
          <div className="permission-row"><span>유형</span><em>{identity?.identity?.identityType || 'UNKNOWN'}</em></div>
          <div className="permission-row"><span>상태</span><em>{identity?.identity?.status || 'UNKNOWN'}</em></div>
          <div className="permission-row"><span>조직 연결</span><em>{identity?.memberships?.length || 0}</em></div>
        </section>

        <section className="permission-group">
          <h5>Session / Identity Status</h5>
          <div className="permission-row"><span>세션 상태</span><em>{session?.session?.status || 'MISSING'}</em></div>
          <div className="permission-row"><span>검증</span><em>{session?.validation?.valid ? '유효' : '차단'}</em></div>
          <div className="permission-row"><span>Provider</span><em>{session?.session?.providerKey || 'LOCAL'}</em></div>
          <div className="permission-row"><span>외부 인증</span><em>{providerStatus}</em></div>
        </section>

        <section className="permission-group">
          <h5>Role Assignment</h5>
          {assignments.length === 0 ? (
            <p className="small-note">활성 역할 할당이 없습니다.</p>
          ) : assignments.map((assignment) => (
            <div className="permission-row" key={assignment.assignmentId}>
              <span>{assignment.roleId} / {assignment.scopeType}</span>
              <em>{assignment.status}</em>
            </div>
          ))}
        </section>
      </div>
      <p className="small-note">권한은 main 프로세스의 현재 인증 Identity, Session, Role Assignment, 리소스 범위를 함께 검증합니다.</p>
    </section>
  );
}
