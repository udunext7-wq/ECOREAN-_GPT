import { useEffect, useMemo, useState } from 'react';
import {
  decideVendorPriceRecommendation,
  formatRate,
  formatWon,
  getVendorPriceIntelligenceData,
  importMaterialPriceHistoryCsv,
  saveMaterialPriceHistory,
  type VendorPriceIntelligenceData
} from '../../services/vendor-price-intelligence-service/vendorPriceIntelligenceService';

const defaultForm = {
  materialCategory: 'tile',
  materialName: '600각 포세린 타일',
  specification: '600x600',
  brand: 'UNKNOWN',
  vendorName: '',
  quotedUnitPrice: '',
  actualUnitPrice: '',
  unit: 'EA',
  sourceType: 'MANUAL'
};

export function VendorPriceIntelligenceCenterView() {
  const [data, setData] = useState<VendorPriceIntelligenceData | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [csvText, setCsvText] = useState('');
  const [messageKo, setMessageKo] = useState('');

  async function refresh() {
    setData(await getVendorPriceIntelligenceData());
  }

  useEffect(() => {
    refresh();
  }, []);

  const recommendedVendor = useMemo(() => {
    const value = data?.vendorSelection?.recommendedVendor;
    return value && typeof value === 'object' ? value as Record<string, unknown> : null;
  }, [data]);

  function updateField(key: keyof typeof defaultForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSavePrice() {
    try {
      const result = await saveMaterialPriceHistory({
        ...form,
        quotedUnitPrice: Number(form.quotedUnitPrice || 0),
        actualUnitPrice: Number(form.actualUnitPrice || form.quotedUnitPrice || 0),
        recordedAt: new Date().toISOString()
      });
      const updated = (result as { intelligenceData?: VendorPriceIntelligenceData })?.intelligenceData;
      setData(updated ?? await getVendorPriceIntelligenceData());
      setForm(defaultForm);
      setMessageKo('단가 이력이 저장되었습니다. 변동 기준을 넘으면 경고와 견적 보정 추천이 자동 생성됩니다.');
    } catch (error) {
      setMessageKo(`단가 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  async function handleCsvImport() {
    try {
      const result = await importMaterialPriceHistoryCsv(csvText);
      const updated = (result as { intelligenceData?: VendorPriceIntelligenceData; importedCount?: number })?.intelligenceData;
      setData(updated ?? await getVendorPriceIntelligenceData());
      setMessageKo(`${Number((result as { importedCount?: number })?.importedCount || 0)}건의 CSV 단가 이력을 가져왔습니다.`);
      setCsvText('');
    } catch (error) {
      setMessageKo(`CSV 가져오기 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  async function decideRecommendation(recommendationId: string, decision: 'APPROVED' | 'REJECTED') {
    const result = await decideVendorPriceRecommendation({
      recommendationId,
      decision,
      actor: 'CEO',
      reasonKo: decision === 'APPROVED' ? '대표 단가 보정 승인' : '대표 단가 보정 반려'
    });
    const updated = (result as { intelligenceData?: VendorPriceIntelligenceData })?.intelligenceData;
    setData(updated ?? await getVendorPriceIntelligenceData());
    setMessageKo(decision === 'APPROVED' ? '승인된 추천이 다음 견적 원가 방어선에 반영됩니다.' : '추천이 반려되었습니다.');
  }

  if (!data) return <div className="drawer-block">협력업체 단가 지능화 로딩 중...</div>;

  return (
    <div className="cost-capture-view">
      <section className="cost-capture-hero">
        <div>
          <span className="eyebrow">VENDOR PRICE INTELLIGENCE</span>
          <h2>협력업체 단가 지능화</h2>
          <p>자재 단가 이력, 업체 신뢰도, 실제 매입가를 연결해 다음 견적의 원가 방어선을 강화합니다.</p>
        </div>
        <div className="button-row">
          <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'realPriceCalibration' }))}>실제 단가 보정</button>
          <strong className={data.summary.criticalAlertCount > 0 ? 'red-kpi' : 'green-kpi'}>
            경고 {data.summary.openAlertCount}건
          </strong>
        </div>
      </section>

      <section className="cost-kpi-grid live-margin-grid">
        <div>
          <span>단가 이력</span>
          <strong>{data.summary.priceHistoryCount}건</strong>
        </div>
        <div>
          <span>단가 상승 경고</span>
          <strong>{data.summary.openAlertCount}건</strong>
        </div>
        <div>
          <span>위험 업체</span>
          <strong>{data.summary.riskyVendorCount}곳</strong>
        </div>
        <div>
          <span>견적 반영 대기</span>
          <strong>{data.summary.pendingRecommendationCount}건</strong>
        </div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">MANUAL ENTRY</span>
            <h3>실제 단가 입력</h3>
          </div>
          <button onClick={refresh}>새로고침</button>
        </div>
        <div className="estimate-form-grid">
          <label>자재 구분<input value={form.materialCategory} onChange={(event) => updateField('materialCategory', event.target.value)} /></label>
          <label>자재명<input value={form.materialName} onChange={(event) => updateField('materialName', event.target.value)} /></label>
          <label>규격<input value={form.specification} onChange={(event) => updateField('specification', event.target.value)} /></label>
          <label>브랜드<input value={form.brand} onChange={(event) => updateField('brand', event.target.value)} /></label>
          <label>업체명<input value={form.vendorName} onChange={(event) => updateField('vendorName', event.target.value)} /></label>
          <label>견적 단가<input value={form.quotedUnitPrice} onChange={(event) => updateField('quotedUnitPrice', event.target.value)} /></label>
          <label>실제 매입 단가<input value={form.actualUnitPrice} onChange={(event) => updateField('actualUnitPrice', event.target.value)} /></label>
          <label>단위<input value={form.unit} onChange={(event) => updateField('unit', event.target.value)} /></label>
        </div>
        <button className="command command-approve" onClick={handleSavePrice}>단가 이력 저장</button>
        {messageKo ? <p className="save-message">{messageKo}</p> : null}
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">PRICE COMPARISON</span>
            <h3>자재 단가 이력 / 업체별 비교</h3>
          </div>
        </div>
        {data.comparisons.length === 0 ? <p className="empty-state">아직 비교 가능한 단가 이력이 없습니다.</p> : (
          <div className="cost-leak-list">
            {data.comparisons.map((item) => (
              <article key={`${String(item.materialName)}-${String(item.specification)}`} className={`cost-leak ${String(item.riskLevel) === 'CRITICAL' || String(item.riskLevel) === 'HIGH' ? 'red' : String(item.riskLevel) === 'MEDIUM' ? 'yellow' : 'green'}`}>
                <strong>{String(item.materialName)} / {String(item.specification)}</strong>
                <p>최저 {formatWon(item.lowestPrice)} / 평균 {formatWon(item.averagePrice)} / 최근 {formatWon(item.latestPrice)}</p>
                <em>증감률 {formatRate(item.varianceRate)} / 위험 {String(item.riskLevel)}</em>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">RELIABILITY</span>
            <h3>납기 신뢰도 / 불량·누락 이력</h3>
          </div>
        </div>
        {data.reliabilityScores.length === 0 ? <p className="empty-state">아직 업체 신뢰도 데이터가 없습니다.</p> : (
          <div className="case-library-grid">
            {data.reliabilityScores.map((vendor) => (
              <div className="estimate-preview-card" key={String(vendor.id)}>
                <h5>{String(vendor.vendor_name)}</h5>
                <strong>{Number(vendor.vendor_score || 0).toFixed(1)}점</strong>
                <p>신뢰도 {String(vendor.reliability_level)} / 누락 {String(vendor.shortage_count)}건 / 불량 {String(vendor.defect_count)}건</p>
              </div>
            ))}
          </div>
        )}
        {recommendedVendor ? (
          <div className="drawer-block">
            <strong>추천 협력업체: {String(recommendedVendor.vendorName)}</strong>
            <p>{String(recommendedVendor.reasonKo)} / 추천 점수 {String(recommendedVendor.selectionScore)}</p>
          </div>
        ) : null}
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">ALERTS</span>
            <h3>단가 변동 경고</h3>
          </div>
        </div>
        {data.alerts.length === 0 ? <p className="empty-state">열린 단가 경고가 없습니다.</p> : (
          <div className="today-action-list">
            {data.alerts.map((alert) => (
              <div key={String(alert.id)} className={`action-row ${String(alert.severity) === 'CRITICAL' || String(alert.severity) === 'HIGH' ? 'warning-row' : ''}`}>
                <span>{String(alert.severity)}</span>
                <div>
                  <strong>{String(alert.material_name)} / {String(alert.vendor_name)}</strong>
                  <p>{String(alert.reason)}</p>
                </div>
                <em>{formatRate(alert.variance_rate)}</em>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">RECOMMENDATION</span>
            <h3>견적 반영 대기 / 대표 승인 필요</h3>
          </div>
        </div>
        {data.recommendations.length === 0 ? <p className="empty-state">견적 반영 대기 추천이 없습니다.</p> : (
          <div className="cost-leak-list">
            {data.recommendations.map((item) => (
              <article key={String(item.id)} className={`cost-leak ${String(item.status) === 'PENDING_APPROVAL' ? 'yellow' : String(item.status) === 'APPROVED' || String(item.status) === 'APPLIED' ? 'green' : 'red'}`}>
                <strong>{String(item.material_name)} / {String(item.vendor_name)}</strong>
                <p>{String(item.reason)}</p>
                <em>{String(item.target_estimate_type)} / 보정 {formatRate(item.adjustment_value)} / {String(item.status)}</em>
                {String(item.status) === 'PENDING_APPROVAL' ? (
                  <div className="action-command-grid">
                    <button className="command command-approve" onClick={() => decideRecommendation(String(item.id), 'APPROVED')}>승인</button>
                    <button className="command command-block" onClick={() => decideRecommendation(String(item.id), 'REJECTED')}>반려</button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">CSV IMPORT</span>
            <h3>CSV 가져오기</h3>
          </div>
        </div>
        <textarea
          value={csvText}
          onChange={(event) => setCsvText(event.target.value)}
          placeholder="material_name,specification,brand,vendor_name,quoted_unit_price,actual_unit_price,unit,recorded_at"
        />
        <button onClick={handleCsvImport}>CSV 단가 이력 가져오기</button>
      </section>
    </div>
  );
}
