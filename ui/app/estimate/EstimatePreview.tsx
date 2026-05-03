import type { EstimateDraft } from '../../services/estimate-service/estimateDraftService';

type Props = {
  draft: EstimateDraft;
};

function formatWon(value: number) {
  return `${Math.round(value || 0).toLocaleString('ko-KR')}원`;
}

function statusClass(status: string) {
  if (status === 'BLOCKED') return 'margin-status blocked';
  if (status === 'CEO_APPROVAL_REQUIRED') return 'margin-status approval';
  if (status === 'PRIORITY') return 'margin-status priority';
  return 'margin-status pass';
}

export function EstimatePreview({ draft }: Props) {
  const margin = draft.marginSafety;
  const priceSource = margin.priceSourceSummary;

  return (
    <section className="estimate-panel">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">ESTIMATE PREVIEW</span>
          <h4>예비 견적 미리보기</h4>
        </div>
        <span className="preliminary-badge">예비 견적</span>
      </div>

      <div className="estimate-money-card">
        <span>고객 제안가</span>
        <strong>{formatWon(margin.customerOfferPrice)}</strong>
        <p>Project Type Config 기준으로 시스템이 마진 안전성과 단가 출처를 자동 계산합니다.</p>
      </div>

      <div className="margin-safety-strip">
        <div>
          <span>예상 원가</span>
          <strong>{formatWon(margin.estimatedCost)}</strong>
        </div>
        <div>
          <span>예상 마진</span>
          <strong>{formatWon(margin.estimatedMargin)}</strong>
        </div>
        <div>
          <span>예상 마진율</span>
          <strong>{(margin.estimatedMarginRate * 100).toFixed(2)}%</strong>
        </div>
        <div className={statusClass(margin.marginSafetyStatus)}>
          <span>수주 가능 여부</span>
          <strong>{margin.decisionKo}</strong>
        </div>
      </div>

      <p className="margin-reason">{margin.reasonKo}</p>

      <div className="estimate-list">
        <h5>단가 출처</h5>
        <div className="estimate-row">
          <strong>{priceSource?.displayStatusKo ?? '추정값 기반'}</strong>
          <span>{priceSource?.costBasis ?? 'FALLBACK_ESTIMATE'}</span>
          <p>
            실제 공급가 연결 {priceSource?.actualPriceItemCount ?? 0}개 /
            매핑 {priceSource?.mappedItemCount ?? 0}개 /
            추정값 사용 비율 {(((priceSource?.estimatedFallbackShareRate ?? 1) * 100)).toFixed(0)}%
          </p>
        </div>
        {priceSource?.linkedItems?.slice(0, 8).map((item) => (
          <div className="estimate-row" key={`${item.materialId}-${item.materialNameKo}`}>
            <strong>{item.materialNameKo}</strong>
            <span>{item.priceBasis === 'VENDOR_PRICE_VERIFIED' ? '실제 공급가 기반' : '추정값 기반'}</span>
            <p>{item.vendorNameKo ? `${item.vendorNameKo} / ${formatWon(item.unitPrice ?? 0)}` : item.warningKo}</p>
          </div>
        ))}
      </div>

      <div className="estimate-list">
        <h5>자동 포함 항목 (과거 누수 방지)</h5>
        {draft.preventionItems.map((item) => (
          <div className="estimate-row" key={item.itemId}>
            <strong>{item.itemNameKo}</strong>
            <span>{item.enforcementLevel}</span>
            <p>{item.reasonKo}</p>
          </div>
        ))}
      </div>

      <div className="estimate-list">
        <h5>자동 생성 공정</h5>
        {draft.generatedProcesses.map((process) => (
          <div className="estimate-row" key={process.processId}>
            <strong>{process.displayNameKo}</strong>
            <span>{process.triggerType}</span>
            <p>{process.reasonKo}</p>
          </div>
        ))}
      </div>

      <div className="estimate-list warning-list">
        <h5>단가 누락 경고</h5>
        {draft.missingPriceWarnings.map((warning) => (
          <p key={warning}>{warning}</p>
        ))}
      </div>
    </section>
  );
}
