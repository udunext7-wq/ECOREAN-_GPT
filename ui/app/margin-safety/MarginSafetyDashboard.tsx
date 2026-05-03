import { useEffect, useState } from 'react';
import {
  type MarginSafetyDashboardData,
  evaluateBathroomQuote,
  formatWon,
  getMarginSafetyDashboard
} from '../../services/margin-safety-service/marginSafetyService';

type EvaluationResult = {
  decisionKo: string;
  reasonKo: string;
  margin: number;
  marginRate: number;
  blocked: boolean;
  approvalRequired: boolean;
};

export function MarginSafetyDashboard() {
  const [data, setData] = useState<MarginSafetyDashboardData | null>(null);
  const [packageCode, setPackageCode] = useState('BASIC');
  const [offerPrice, setOfferPrice] = useState('5490000');
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);

  useEffect(() => {
    getMarginSafetyDashboard().then(setData);
  }, []);

  async function handleEvaluate() {
    const result = await evaluateBathroomQuote({ packageCode, offerPrice: Number(offerPrice) });
    setEvaluation(result as EvaluationResult);
  }

  if (!data) return <div className="drawer-block">Margin Safety Dashboard 로딩 중...</div>;

  return (
    <div className="margin-safety-view">
      <section className="cost-capture-hero">
        <div>
          <span className="eyebrow">PRICING DEFENSE</span>
          <h2>Bathroom Pricing Standard V2</h2>
          <p>{data.reverseEngineering.findingKo}</p>
        </div>
        <strong className="red-kpi">저마진 수주 차단</strong>
      </section>

      <section className="cost-kpi-grid">
        <div>
          <span>기존 고객가</span>
          <strong>{formatWon(data.reverseEngineering.revenue)}</strong>
        </div>
        <div>
          <span>회수 실제 원가</span>
          <strong>{formatWon(data.reverseEngineering.actualCost)}</strong>
        </div>
        <div>
          <span>실제 마진</span>
          <strong>{formatWon(data.reverseEngineering.actualMargin)}</strong>
        </div>
        <div className="danger-cell">
          <span>실제 마진율</span>
          <strong>{(data.reverseEngineering.actualMarginRate * 100).toFixed(2)}%</strong>
        </div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">PACKAGE PRICE</span>
            <h3>Basic / Standard / Premium</h3>
          </div>
        </div>
        <div className="pricing-package-grid">
          {data.packages.map((item) => (
            <article key={item.standardId} className="pricing-package-card">
              <span>{item.packageNameKo}</span>
              <strong>{formatWon(item.recommendedPrice)}</strong>
              <p>최저 방어가 {formatWon(item.minimumAllowedPrice)} / 목표 마진 {(item.targetMarginRate * 100).toFixed(0)}%</p>
              <em>기본 포함: {item.includedItemsKo.join(', ')}</em>
            </article>
          ))}
        </div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">QUOTE GUARD</span>
            <h3>고객 견적가 자동 방어</h3>
          </div>
          <button onClick={handleEvaluate}>수주 가능 여부 판단</button>
        </div>
        <div className="quote-guard-form">
          <label>
            패키지
            <select value={packageCode} onChange={(event) => setPackageCode(event.target.value)}>
              {data.packages.map((item) => (
                <option key={item.packageCode} value={item.packageCode}>{item.packageNameKo}</option>
              ))}
            </select>
          </label>
          <label>
            고객 제안가
            <input value={offerPrice} onChange={(event) => setOfferPrice(event.target.value)} />
          </label>
          {evaluation ? (
            <div className={evaluation.blocked ? 'quote-result blocked' : evaluation.approvalRequired ? 'quote-result warning' : 'quote-result pass'}>
              <strong>{evaluation.decisionKo}</strong>
              <p>{evaluation.reasonKo}</p>
              <span>예상 마진 {formatWon(evaluation.margin)} / {(evaluation.marginRate * 100).toFixed(2)}%</span>
            </div>
          ) : null}
        </div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">UPSELL ONLY</span>
            <h3>기본 포함 금지 옵션</h3>
          </div>
        </div>
        <div className="cost-requirement-list">
          {data.options.map((item) => (
            <div key={item.optionId} className={`cost-requirement ${item.pricingStatus === 'ACTIVE' ? 'green' : 'red'}`}>
              <span>{item.displayNameKo}</span>
              <strong>{item.minimumSalePrice ? formatWon(item.minimumSalePrice) : '공급가 필요'}</strong>
              <em>{item.notesKo}</em>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
