import { useEffect, useState } from 'react';
import {
  createSalesLead,
  formatPercent,
  formatWon,
  loadSalesPipelineData,
  type SalesPipelineData
} from '../../services/sales-service/salesService';
import { LeadDetailView } from './LeadDetailView';
import { SalesPipelineView } from './SalesPipelineView';

const sourceOptions = ['NAVER', 'REFERRAL', 'AD', 'OFFLINE'];
const scopeOptions = [
  { value: 'bathroom', label: '욕실' },
  { value: 'kitchen', label: '주방' },
  { value: 'full_remodel', label: '전체' },
  { value: 'commercial', label: '상가' }
];

export function LeadDashboardView() {
  const [data, setData] = useState<SalesPipelineData | null>(null);
  const [messageKo, setMessageKo] = useState('영업 파이프라인 데이터를 불러오는 중입니다.');
  const [form, setForm] = useState({
    customerNameKo: '',
    contactPhone: '',
    sourceChannel: 'NAVER',
    interestedScope: 'bathroom',
    expectedBudget: '8000000',
    areaM2: '5',
    locationKo: '서울/경기',
    clientType: 'RESIDENTIAL',
    consultationMemoKo: ''
  });

  async function refresh() {
    const next = await loadSalesPipelineData();
    setData(next);
    setMessageKo(next ? `${next.metrics.monthKey} 리드 / 견적 / 계약 흐름` : 'Electron DB 연결 없음');
  }

  async function submitLead() {
    const result = await createSalesLead({
      ...form,
      expectedBudget: Number(form.expectedBudget || 0),
      areaM2: Number(form.areaM2 || 0),
      actor: 'CEO'
    });
    setMessageKo(result ? '신규 리드가 생성되었습니다.' : '리드 생성 실패');
    setForm({ ...form, customerNameKo: '', contactPhone: '', consultationMemoKo: '' });
    refresh();
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <section className="estimate-panel">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">SALES PIPELINE</span>
          <h4>Lead Management</h4>
        </div>
        <button onClick={refresh}>새로고침</button>
      </div>
      <p className="small-note">{messageKo}</p>

      <div className="case-library-grid">
        <div className="estimate-preview-card">
          <h5>Pipeline KPI</h5>
          <div className="case-row"><strong>총 리드</strong><span>{data?.metrics.totalLeads || 0}건</span></div>
          <div className="case-row"><strong>상담 전환율</strong><span>{formatPercent(data?.metrics.contactConversionRate)}</span></div>
          <div className="case-row"><strong>견적 전환율</strong><span>{formatPercent(data?.metrics.estimateConversionRate)}</span></div>
          <div className="case-row"><strong>계약 전환율</strong><span>{formatPercent(data?.metrics.contractConversionRate)}</span></div>
          <div className="case-row"><strong>예상 파이프라인</strong><span>{formatWon(data?.metrics.pipelineAmount)}</span></div>
          <div className="case-row"><strong>이번 달 예상 수주</strong><span>{formatWon(data?.metrics.expectedWinAmount)}</span></div>
        </div>

        <div className="estimate-preview-card">
          <h5>신규 리드 등록</h5>
          <div className="case-row">
            <strong>고객명</strong>
            <input value={form.customerNameKo} onChange={(event) => setForm({ ...form, customerNameKo: event.target.value })} />
          </div>
          <div className="case-row">
            <strong>연락처</strong>
            <input value={form.contactPhone} onChange={(event) => setForm({ ...form, contactPhone: event.target.value })} />
          </div>
          <div className="case-row">
            <strong>유입 채널</strong>
            <select value={form.sourceChannel} onChange={(event) => setForm({ ...form, sourceChannel: event.target.value })}>
              {sourceOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div className="case-row">
            <strong>관심 공정</strong>
            <select value={form.interestedScope} onChange={(event) => setForm({ ...form, interestedScope: event.target.value })}>
              {scopeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="case-row">
            <strong>예상 예산</strong>
            <input value={form.expectedBudget} onChange={(event) => setForm({ ...form, expectedBudget: event.target.value })} />
          </div>
          <div className="case-row">
            <strong>??(m2)</strong>
            <input value={form.areaM2} onChange={(event) => setForm({ ...form, areaM2: event.target.value })} />
          </div>
          <div className="case-row">
            <strong>??</strong>
            <input value={form.locationKo} onChange={(event) => setForm({ ...form, locationKo: event.target.value })} />
          </div>
          <div className="case-row">
            <strong>?? ??</strong>
            <select value={form.clientType} onChange={(event) => setForm({ ...form, clientType: event.target.value })}>
              <option value="RESIDENTIAL">??</option>
              <option value="COMMERCIAL">??</option>
              <option value="DEVELOPER">??/??</option>
            </select>
          </div>
          <div className="case-row">
            <strong>상담 메모</strong>
            <input value={form.consultationMemoKo} onChange={(event) => setForm({ ...form, consultationMemoKo: event.target.value })} />
          </div>
          <button onClick={submitLead}>리드 생성</button>
        </div>
      </div>

      <SalesPipelineView data={data} />
      <LeadDetailView leads={data?.leads || []} onRefresh={refresh} onMessage={setMessageKo} />
    </section>
  );
}
