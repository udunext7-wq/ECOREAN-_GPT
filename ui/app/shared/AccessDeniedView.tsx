type Props = {
  permissionKey?: string;
  roleNameKo?: string;
};

export function AccessDeniedView({ permissionKey, roleNameKo }: Props) {
  return (
    <section className="access-denied-panel" aria-live="polite">
      <span className="eyebrow">ACCESS DENIED</span>
      <h3>이 화면에 접근할 권한이 없습니다.</h3>
      <p>
        현재 역할: <strong>{roleNameKo || '확인 중'}</strong>
      </p>
      {permissionKey ? <code>{permissionKey}</code> : null}
      <p className="small-note">권한이 필요하면 관리자에게 역할 또는 업무 범위 확인을 요청하세요.</p>
    </section>
  );
}
