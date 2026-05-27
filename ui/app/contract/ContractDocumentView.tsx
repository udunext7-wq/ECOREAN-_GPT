export function ContractDocumentView() {
  return (
    <section className="wizard-panel professional-output-panel">
      <h3>계약 문서</h3>
      <p className="empty-state">욕실 견적 출력 단계에서 GO 또는 SCALE 견적을 저장한 뒤 계약서를 생성할 수 있습니다.</p>
      <button className="primary-action" onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'clientPortal' }))}>
        고객 포털 열기
      </button>
      <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'lightbimCustomerMap' }))}>
        공간 구성 및 공사 범위 요약
      </button>
    </section>
  );
}
