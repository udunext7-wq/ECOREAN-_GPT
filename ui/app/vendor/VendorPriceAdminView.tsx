import { useEffect, useMemo, useState } from 'react';
import {
  createVendorPriceCatalogEntry,
  formatWon,
  getVendorPriceAdminData,
  type VendorPriceAdminData,
  type VendorPriceInput
} from '../../services/vendor-price-service/vendorPriceService';
import { VendorPriceApprovalView } from './VendorPriceApprovalView';

const emptyForm: VendorPriceInput = {
  vendorNameKo: '',
  materialId: '',
  materialNameKo: '',
  category: 'material',
  brandName: 'UNKNOWN',
  modelName: 'UNKNOWN',
  standardSpec: '',
  unit: 'EA',
  supplierPrice: 0,
  internalPrice: 0,
  leadTimeDays: '',
  paymentConditionKo: '',
  evidenceMemoKo: '',
  sourceDocumentKo: '',
  actor: 'CEO',
  notesKo: ''
};

export function VendorPriceAdminView() {
  const [data, setData] = useState<VendorPriceAdminData | null>(null);
  const [form, setForm] = useState<VendorPriceInput>(emptyForm);
  const [messageKo, setMessageKo] = useState('');

  async function refresh() {
    setData(await getVendorPriceAdminData());
  }

  useEffect(() => {
    refresh();
  }, []);

  const selectedMapping = useMemo(
    () => data?.mappings.find((mapping) => mapping.materialId === form.materialId),
    [data, form.materialId]
  );

  function updateField(key: keyof VendorPriceInput, value: string) {
    setForm((current) => ({
      ...current,
      [key]: key === 'supplierPrice' || key === 'internalPrice' ? Number(value) : value
    }));
  }

  function applyMapping(materialId: string) {
    const mapping = data?.mappings.find((item) => item.materialId === materialId);
    setForm((current) => ({
      ...current,
      materialId,
      materialNameKo: mapping?.materialNameKo ?? current.materialNameKo,
      category: mapping?.category ?? current.category
    }));
  }

  async function handleSubmit() {
    try {
      const result = await createVendorPriceCatalogEntry(form);
      setData((result as { adminData?: VendorPriceAdminData })?.adminData ?? await getVendorPriceAdminData());
      setForm(emptyForm);
      setMessageKo('공급가가 PENDING 상태로 저장되었습니다. 대표 승인 전에는 견적 엔진에 반영되지 않습니다.');
    } catch (error) {
      setMessageKo(`저장 실패: ${error instanceof Error ? error.message : 'UNKNOWN_ERROR'}`);
    }
  }

  if (!data) return <div className="drawer-block">Vendor Price Admin 로딩 중...</div>;

  return (
    <div className="cost-capture-view">
      <section className="cost-capture-hero">
        <div>
          <span className="eyebrow">VENDOR REAL PRICE</span>
          <h2>Vendor Price Admin</h2>
          <p>실제 거래처 공급가를 입력하고, 증빙 확인 및 대표 승인 후에만 견적 엔진에 반영합니다.</p>
        </div>
        <strong className={data.summary.pendingApprovalCount > 0 ? 'red-kpi' : 'green-kpi'}>
          승인 대기 {data.summary.pendingApprovalCount}건
        </strong>
      </section>

      <section className="cost-kpi-grid live-margin-grid">
        <div>
          <span>VERIFIED 공급가</span>
          <strong>{data.summary.verifiedCatalogCount}개</strong>
        </div>
        <div>
          <span>승인 대기</span>
          <strong>{data.summary.pendingApprovalCount}건</strong>
        </div>
        <div>
          <span>조사 필요</span>
          <strong>{data.summary.needsResearchCatalogCount}개</strong>
        </div>
        <div>
          <span>실제 입력 이력</span>
          <strong>{data.summary.historyCount}건</strong>
        </div>
        <div>
          <span>Learning 후보</span>
          <strong>{data.summary.learningCandidateCount}건</strong>
        </div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">PRICE INPUT</span>
            <h3>실제 공급가 입력</h3>
          </div>
          <button onClick={refresh}>새로고침</button>
        </div>
        <div className="estimate-form-grid">
          <label>
            거래처명
            <input value={form.vendorNameKo} onChange={(event) => updateField('vendorNameKo', event.target.value)} />
          </label>
          <label>
            자재/품목 매핑
            <select value={form.materialId} onChange={(event) => applyMapping(event.target.value)}>
              <option value="">선택</option>
              {data.mappings.map((mapping) => (
                <option key={mapping.mappingId} value={mapping.materialId}>{mapping.projectType} / {mapping.materialNameKo}</option>
              ))}
            </select>
          </label>
          <label>
            품목명
            <input value={form.materialNameKo} onChange={(event) => updateField('materialNameKo', event.target.value)} />
          </label>
          <label>
            카테고리
            <input value={form.category} onChange={(event) => updateField('category', event.target.value)} />
          </label>
          <label>
            브랜드
            <input value={form.brandName} onChange={(event) => updateField('brandName', event.target.value)} />
          </label>
          <label>
            모델명
            <input value={form.modelName} onChange={(event) => updateField('modelName', event.target.value)} />
          </label>
          <label>
            규격
            <input value={form.standardSpec} onChange={(event) => updateField('standardSpec', event.target.value)} />
          </label>
          <label>
            단위
            <input value={form.unit} onChange={(event) => updateField('unit', event.target.value)} />
          </label>
          <label>
            공급가
            <input value={String(form.supplierPrice || '')} onChange={(event) => updateField('supplierPrice', event.target.value)} />
          </label>
          <label>
            내부 구매가
            <input value={String(form.internalPrice || '')} onChange={(event) => updateField('internalPrice', event.target.value)} />
          </label>
          <label>
            납기
            <input value={form.leadTimeDays} onChange={(event) => updateField('leadTimeDays', event.target.value)} placeholder="예: 3" />
          </label>
          <label>
            결제 조건
            <input value={form.paymentConditionKo} onChange={(event) => updateField('paymentConditionKo', event.target.value)} placeholder="예: 월말 정산" />
          </label>
          <label>
            증빙 문서/출처
            <input value={form.sourceDocumentKo} onChange={(event) => updateField('sourceDocumentKo', event.target.value)} placeholder="예: 카톡 견적, 거래명세서" />
          </label>
          <label>
            증빙 메모
            <textarea value={form.evidenceMemoKo} onChange={(event) => updateField('evidenceMemoKo', event.target.value)} />
          </label>
        </div>
        <p className="small-note">
          {selectedMapping ? `${selectedMapping.materialNameKo}은 ${selectedMapping.fallbackBasis}에서 실제 공급가 우선으로 전환됩니다.` : '매핑을 선택하면 견적 엔진 연결 대상이 자동 지정됩니다.'}
        </p>
        <button className="command command-approve" onClick={handleSubmit}>PENDING 공급가 저장</button>
        {messageKo ? <p className="save-message">{messageKo}</p> : null}
      </section>

      <VendorPriceApprovalView data={data} onUpdated={refresh} />

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">PRICE CATALOG</span>
            <h3>공급가 카탈로그</h3>
          </div>
        </div>
        <div className="cost-leak-list">
          {data.catalog.map((item) => (
            <article key={item.priceId} className={`cost-leak ${item.approvalStatus === 'APPROVED' ? 'green' : item.approvalStatus === 'REJECTED' ? 'red' : 'yellow'}`}>
              <strong>{item.materialNameKo} / {item.vendorNameKo}</strong>
              <p>{item.brandName} {item.modelName} / {item.standardSpec}</p>
              <em>{formatWon(item.supplierPrice)} / {item.priceStatus} / {item.approvalStatus}</em>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
