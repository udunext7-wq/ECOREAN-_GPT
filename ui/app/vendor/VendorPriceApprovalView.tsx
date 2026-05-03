import { decideVendorPriceApproval, formatWon, type VendorPriceAdminData } from '../../services/vendor-price-service/vendorPriceService';

type Props = {
  data: VendorPriceAdminData;
  onUpdated: () => Promise<void>;
};

export function VendorPriceApprovalView({ data, onUpdated }: Props) {
  const pendingItems = data.catalog.filter((item) => item.approvalStatus === 'PENDING_CEO_APPROVAL' || item.approvalStatus === 'REVISION_REQUESTED');

  async function decide(priceId: string, decision: 'APPROVED' | 'REJECTED' | 'REQUEST_REVISION') {
    await decideVendorPriceApproval({
      priceId,
      decision,
      actor: 'CEO',
      reasonKo: decision === 'APPROVED' ? '증빙 확인 후 실제 공급가 승인' : decision === 'REJECTED' ? '공급가 반려' : '공급가 수정 요청'
    });
    await onUpdated();
  }

  return (
    <section className="cost-capture-panel">
      <div className="section-header compact">
        <div>
          <span className="eyebrow">VENDOR PRICE APPROVAL</span>
          <h3>공급가 승인 대기</h3>
        </div>
        <strong>{pendingItems.length}건</strong>
      </div>
      <div className="cost-leak-list">
        {pendingItems.length === 0 ? <p className="small-note">승인 대기 공급가가 없습니다.</p> : null}
        {pendingItems.map((item) => (
          <article key={item.priceId} className="cost-leak yellow">
            <strong>{item.materialNameKo} / {item.vendorNameKo}</strong>
            <p>{item.brandName} {item.modelName} / {item.standardSpec}</p>
            <em>공급가 {formatWon(item.supplierPrice)} / 내부가 {formatWon(item.internalPrice)} / {item.approvalStatus}</em>
            <div className="action-command-grid">
              <button className="command command-approve" onClick={() => decide(item.priceId, 'APPROVED')}>승인</button>
              <button className="command command-block" onClick={() => decide(item.priceId, 'REJECTED')}>반려</button>
              <button className="command command-order" onClick={() => decide(item.priceId, 'REQUEST_REVISION')}>수정 요청</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
