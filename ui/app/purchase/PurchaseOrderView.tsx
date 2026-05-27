export function PurchaseOrderView() {
  function openVendorIntelligence() {
    window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'vendorIntelligence' }));
  }

  function openExecutionFeedback() {
    window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'lightbimExecutionFeedback' }));
  }

  return (
    <section className="wizard-panel professional-output-panel">
      <h3>발주 관리</h3>
      <p>검토 완료 수량과 자재별 할증률을 적용해 발주 기준을 관리합니다.</p>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>품목</th>
              <th>기준 수량</th>
              <th>할증률</th>
              <th>발주 수량</th>
              <th>수량 출처</th>
              <th>수량 근거</th>
            </tr>
          </thead>
        </table>
      </div>
      <p className="empty-state">생성된 발주서가 없습니다. 견적 또는 LightBIM 도면 수량에서 발주서를 생성하세요.</p>
      <div className="button-row">
        <button onClick={openVendorIntelligence}>협력업체 단가 지능화 열기</button>
        <button onClick={openExecutionFeedback}>LightBIM 실행 피드백</button>
      </div>
    </section>
  );
}
