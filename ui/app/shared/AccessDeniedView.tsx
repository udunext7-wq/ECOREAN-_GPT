type Props = {
  permissionKey?: string;
  roleNameKo?: string;
  safeReasonKo?: string;
  actionKo?: string;
};

function safeText(value?: string) {
  const text = String(value || '');
  if (!text) return '';
  return text
    .replace(/[A-Z]:\\[^\s]+/g, '[숨김]')
    .replace(/(token|secret|api[_-]?key|sqlite|database|db path)/gi, '[숨김]');
}

export function AccessDeniedView({ permissionKey, roleNameKo, safeReasonKo, actionKo }: Props) {
  return (
    <section className="access-denied-panel" aria-live="polite">
      <span className="eyebrow">ACCESS DENIED</span>
      <h3>이 화면에 접근할 권한이 없습니다.</h3>
      <p>
        현재 역할: <strong>{roleNameKo || '확인 중'}</strong>
      </p>
      {permissionKey ? <code>{safeText(permissionKey)}</code> : null}
      <p>{safeText(safeReasonKo) || '현재 역할에는 이 업무 범위에 필요한 권한이 없습니다.'}</p>
      <p className="small-note">
        {safeText(actionKo) || '권한이 필요하면 관리자에게 역할 또는 업무 범위 확인을 요청하세요.'}
      </p>
    </section>
  );
}
