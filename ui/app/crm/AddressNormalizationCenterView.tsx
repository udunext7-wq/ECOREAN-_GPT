import { useEffect, useMemo, useState } from 'react';
import { addressNormalizationService } from '../../services/crm-service/addressNormalizationService';
import type { ViewKey } from '../../src/types/dashboard';

type Row = Record<string, unknown>;
type Props = { onNavigate?: (view: ViewKey) => void };
const value = (row: Row | null, key: string) => String(row?.[key] || '');
const labels: Record<string, string> = {
  PENDING: '대기', NORMALIZED: '정규화 완료', REVIEW_REQUIRED: '검토 필요',
  INVALID: '잘못된 주소', DEFERRED: '보류', REJECTED: '반려'
};

export function AddressNormalizationCenterView({ onNavigate }: Props) {
  const [records, setRecords] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Row>({});
  const [selected, setSelected] = useState<Row | null>(null);
  const [filters, setFilters] = useState({ status: '', source: '', confidence: '', duplicate: false });
  const [form, setForm] = useState({
    sourceType: 'MANUAL', sourceId: '', addressSummary: '서울특별시 강남구 테헤란로 123',
    addressDetailInternal: '테스트 전용 상세 위치', leadId: '', surveyId: '', projectId: ''
  });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const selectedId = value(selected, 'address_id');
  const kpis = (summary.kpis || {}) as Row;
  const cards = useMemo(() => [
    ['전체 주소', kpis.total], ['정규화 완료', kpis.normalized], ['검토 필요', kpis.reviewRequired],
    ['저신뢰', kpis.lowConfidence], ['잘못된 주소', kpis.invalid], ['중복 의심', kpis.duplicates],
    ['API 연결 준비', kpis.providerReady], ['외부 연결 비활성', kpis.providerDisabled]
  ], [summary]);

  async function refresh(addressId?: string) {
    const query: Row = {};
    if (filters.status) query.normalizationStatus = filters.status;
    if (filters.source) query.sourceType = filters.source;
    if (filters.confidence) query.confidenceLevel = filters.confidence;
    if (filters.duplicate) query.duplicate = true;
    const [rows, nextSummary] = await Promise.all([addressNormalizationService.list(query), addressNormalizationService.summary()]);
    setRecords(rows);
    setSummary(nextSummary);
    const target = addressId || selectedId;
    if (target) setSelected(await addressNormalizationService.detail({ addressId: target }));
  }

  useEffect(() => {
    refresh().catch((error) => setMessage(error instanceof Error ? error.message : '주소 데이터를 불러오지 못했습니다.'));
  }, [filters.status, filters.source, filters.confidence, filters.duplicate]);

  async function run(action: () => Promise<Row>, success: string) {
    setBusy(true);
    try {
      const result = await action();
      setMessage(success);
      await refresh(String(result.addressId || selectedId));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '주소 정규화 처리 중 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  }

  function navigate(view: ViewKey) {
    if (onNavigate) onNavigate(view);
    else window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: view }));
  }

  const duplicates = ((selected?.duplicate_candidates || []) as Row[]);
  const history = ((selected?.history || []) as Row[]);
  const validationResult = (selected?.validation_result || {}) as Row;
  const confidenceResult = (selected?.confidence_result || {}) as Row;

  return <section className="cost-capture-view">
    <div className="section-header">
      <div><span className="eyebrow">RC-0.4.2 INTERNAL DATA QUALITY</span><h2>주소 정규화 센터</h2><p>원본 주소를 보호하면서 CRM, 현장조사, 프로젝트 주소를 정규화하고 검토합니다.</p></div>
      <div className="button-row">
        <button onClick={() => navigate('crmPipeline')}>CRM 파이프라인</button>
        <button onClick={() => navigate('realProjectIntake')}>실제 프로젝트 접수</button>
        <button disabled={busy} onClick={() => run(() => addressNormalizationService.report({ finalDecision: 'IN_PROGRESS' }), '리포트가 생성되었습니다.')}>리포트 생성</button>
      </div>
    </div>
    {message ? <div className="drawer-block">{message}</div> : null}
    <div className="kpi-grid">{cards.map(([label, count]) => <div className="kpi-card" key={String(label)}><span>{String(label)}</span><strong>{Number(count || 0)}건</strong></div>)}</div>
    <div className="drawer-grid">
      <div className="drawer-block">
        <h3>주소 목록</h3>
        <div className="field-grid">
          <label className="field"><span>상태</span><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">전체</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label className="field"><span>Source</span><select value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })}><option value="">전체</option><option>CRM_LEAD</option><option>SITE_SURVEY</option><option>PROJECT</option><option>CUSTOMER_PORTAL</option><option>MANUAL</option></select></label>
          <label className="field"><span>Confidence</span><select value={filters.confidence} onChange={(e) => setFilters({ ...filters, confidence: e.target.value })}><option value="">전체</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option><option>INVALID</option></select></label>
          <label className="field"><span>중복 의심</span><input type="checkbox" checked={filters.duplicate} onChange={(e) => setFilters({ ...filters, duplicate: e.target.checked })} /></label>
        </div>
        <div className="table-wrap"><table><thead><tr><th>Source</th><th>연결 대상</th><th>주소 요약</th><th>정규화 주소</th><th>Type</th><th>Confidence</th><th>Status</th><th>중복</th></tr></thead><tbody>
          {records.map((row) => <tr key={String(row.address_id)}><td>{String(row.source_type)}</td><td>{String(row.source_id || '-')}</td><td><button onClick={async () => setSelected(await addressNormalizationService.detail({ addressId: row.address_id }))}>{String(row.address_summary || '-')}</button></td><td>{String(row.normalized_address_summary || '-')}</td><td>{String(row.address_type)}</td><td>{String(row.confidence_level)}</td><td>{labels[String(row.normalization_status)] || String(row.normalization_status)}</td><td>{Number(row.duplicate_suspected || 0) ? '의심' : '-'}</td></tr>)}
        </tbody></table></div>
        {!records.length ? <p>등록된 주소가 없습니다.</p> : null}
      </div>
      <div className="drawer-block">
        <h3>주소 등록</h3>
        <label className="field"><span>Source type</span><select value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value })}><option>MANUAL</option><option>CRM_LEAD</option><option>SITE_SURVEY</option><option>PROJECT</option></select></label>
        <label className="field"><span>연결 ID</span><input value={form.sourceId} onChange={(e) => setForm({ ...form, sourceId: e.target.value })} /></label>
        <label className="field"><span>주소 요약</span><input value={form.addressSummary} onChange={(e) => setForm({ ...form, addressSummary: e.target.value })} /></label>
        <label className="field"><span>상세주소 내부 전용</span><input value={form.addressDetailInternal} onChange={(e) => setForm({ ...form, addressDetailInternal: e.target.value })} /></label>
        <button className="command" disabled={busy} onClick={() => run(() => addressNormalizationService.create(form), '주소 레코드가 생성되었습니다.')}>주소 등록</button>
        <strong>외부 주소 API와 좌표 조회는 비활성입니다.</strong>
      </div>
    </div>
    <div className="drawer-grid">
      <div className="drawer-block">
        <h3>주소 상세 / 구성요소</h3>
        {selected ? <>
          <strong>원본 주소: {value(selected, 'address_summary')}</strong><p>원본 상세주소: 내부 전용</p>
          <p>정규화 주소: {value(selected, 'normalized_address_summary')}</p>
          <p>행정구역: {value(selected, 'province') || '-'} {value(selected, 'city')} {value(selected, 'district')}</p>
          <p>읍면동/도로: {value(selected, 'town') || '-'} / {value(selected, 'road_name') || '-'}</p>
          <p>Confidence: {value(selected, 'confidence_level')} / 검증: {value(selected, 'validation_status')}</p>
          <p>Confidence 사유: {((confidenceResult.reasons || []) as string[]).join(', ') || '-'}</p>
          <p>구조 검증: {((validationResult.warnings || []) as string[]).join(', ') || '구조 경고 없음'}</p>
          <p>연결: Lead {value(selected, 'linked_lead_id') || '-'} / 현장조사 {value(selected, 'linked_survey_id') || '-'} / 프로젝트 {value(selected, 'linked_project_id') || '-'}</p>
          <p>Provider: {String(((selected.provider || {}) as Row).status || 'DISABLED')}</p>
          <div className="button-row">
            <button disabled={busy} onClick={() => run(() => addressNormalizationService.normalize({ addressId: selectedId }), '주소를 재정규화했습니다.')}>재정규화</button>
            <button disabled={busy} onClick={() => run(() => addressNormalizationService.approve({ addressId: selectedId, approvedBy: 'CEO' }), '정규화 주소를 승인했습니다.')}>승인</button>
            <button disabled={busy} onClick={() => run(() => addressNormalizationService.reject({ addressId: selectedId, reason: '구조 확인 필요' }), '정규화 주소를 반려했습니다.')}>반려</button>
            <button disabled={busy} onClick={() => run(() => addressNormalizationService.defer({ addressId: selectedId, reason: '추가 확인 필요' }), '주소 검토를 보류했습니다.')}>보류</button>
          </div>
        </> : <p>목록에서 주소를 선택하세요.</p>}
      </div>
      <div className="drawer-block">
        <h3>연결 / 중복 / 변경 이력</h3>
        <label className="field"><span>Lead ID</span><input value={form.leadId} onChange={(e) => setForm({ ...form, leadId: e.target.value })} /></label>
        <label className="field"><span>현장조사 ID</span><input value={form.surveyId} onChange={(e) => setForm({ ...form, surveyId: e.target.value })} /></label>
        <label className="field"><span>프로젝트 ID</span><input value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} /></label>
        <div className="button-row">
          <button disabled={!selectedId || !form.leadId || busy} onClick={() => run(() => addressNormalizationService.linkLead({ addressId: selectedId, leadId: form.leadId }), 'Lead와 연결했습니다.')}>Lead 연결</button>
          <button disabled={!selectedId || !form.surveyId || busy} onClick={() => run(() => addressNormalizationService.linkSurvey({ addressId: selectedId, surveyId: form.surveyId }), '현장조사와 연결했습니다.')}>현장조사 연결</button>
          <button disabled={!selectedId || !form.projectId || busy} onClick={() => run(() => addressNormalizationService.linkProject({ addressId: selectedId, projectId: form.projectId }), '프로젝트와 연결했습니다.')}>프로젝트 연결</button>
        </div>
        <h4>중복 후보</h4>{duplicates.map((row) => <p key={String(row.address_id)}>{String(row.source_type)} · {String(row.normalized_address_summary)}</p>)}{!duplicates.length ? <p>중복 후보가 없습니다.</p> : null}
        <h4>변경 이력</h4>{history.slice(0, 8).map((row) => <p key={String(row.history_id)}>{String(row.action)} · {String(row.old_status || '-')} → {String(row.new_status || '-')}</p>)}{!history.length ? <p>변경 이력이 없습니다.</p> : null}
      </div>
    </div>
  </section>;
}
