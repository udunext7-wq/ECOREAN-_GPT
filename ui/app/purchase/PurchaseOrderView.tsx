export function PurchaseOrderView() {
  function openVendorIntelligence() {
    window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'vendorIntelligence' }));
  }

  return (
    <section className="wizard-panel professional-output-panel">
      <h3>발주 관리</h3>
      <p className="empty-state">견적에서 필요한 타일, 방수재, 설비, 전기/마감 자재 발주 목록을 자동 생성합니다.</p>
      <button onClick={openVendorIntelligence}>협력업체 단가 지능화 열기</button>
    </section>
  );
}
