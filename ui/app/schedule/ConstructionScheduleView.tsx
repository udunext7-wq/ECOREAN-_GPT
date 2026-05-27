export function ConstructionScheduleView() {
  return (
    <section className="wizard-panel professional-output-panel">
      <h3>공정표</h3>
      <p>LightBIM 검토 수량이 있는 경우 공정별 생산성 기준으로 산정 공기를 계산합니다.</p>
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>공정</th>
              <th>기준 수량</th>
              <th>단위</th>
              <th>생산성 기준</th>
              <th>산정 공기</th>
              <th>수량 출처</th>
            </tr>
          </thead>
        </table>
      </div>
      <p className="empty-state">생성된 공정표가 없습니다. 수량 검토 후 공정표를 생성하세요.</p>
    </section>
  );
}
