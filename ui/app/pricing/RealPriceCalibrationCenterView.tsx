import { useEffect, useMemo, useState } from 'react';
import {
  approveRealPriceUpdate,
  applyRealPriceUpdate,
  createActualPurchasePriceUpdate,
  createLaborRateUpdate,
  createRealPriceCalibrationReport,
  createVendorQuotePriceUpdate,
  formatRate,
  formatWon,
  getRealPriceCalibrationData,
  rejectRealPriceUpdate,
  type RealPriceCalibrationData
} from '../../services/pricing-service/realPriceCalibrationService';

const defaultForm = {
  targetType: 'MATERIAL',
  targetId: '',
  targetName: '기본 벽타일',
  proposedPrice: '',
  unit: '㎡',
  vendorName: '',
  evidenceNote: ''
};

export function RealPriceCalibrationCenterView() {
  const [data, setData] = useState<RealPriceCalibrationData | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [messageKo, setMessageKo] = useState('');

  async function refresh() {
    setData(await getRealPriceCalibrationData());
  }

  useEffect(() => {
    refresh();
  }, []);

  const needsUpdateItems = useMemo(() => (data?.needsUpdate.items as Array<Record<string, unknown>>) || [], [data]);
  const priorityItems = useMemo(() => (data?.priority.items as Array<Record<string, unknown>>) || [], [data]);

  function updateField(key: keyof typeof defaultForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submitQueue(kind: 'VENDOR_QUOTE' | 'ACTUAL_PURCHASE' | 'LABOR_RATE') {
    const payload = {
      ...form,
      proposedPrice: Number(form.proposedPrice || 0),
      quotedUnitPrice: Number(form.proposedPrice || 0),
      actualPurchasePrice: Number(form.proposedPrice || 0),
      proposedDailyWage: Number(form.proposedPrice || 0)
    };
    if (kind === 'VENDOR_QUOTE') await createVendorQuotePriceUpdate(payload);
    if (kind === 'ACTUAL_PURCHASE') await createActualPurchasePriceUpdate(payload);
    if (kind === 'LABOR_RATE') await createLaborRateUpdate({ ...payload, targetType: 'LABOR' });
    setMessageKo('단가 보정 항목이 승인 대기 상태로 생성되었습니다.');
    setForm(defaultForm);
    await refresh();
  }

  async function queueAction(queueId: string, action: 'approve' | 'reject' | 'apply') {
    if (action === 'approve') await approveRealPriceUpdate(queueId);
    if (action === 'reject') await rejectRealPriceUpdate(queueId);
    if (action === 'apply') await applyRealPriceUpdate(queueId);
    setMessageKo(action === 'apply' ? '백업 후 단가가 마스터 데이터에 반영되었습니다.' : '승인 상태가 변경되었습니다.');
    await refresh();
  }

  async function createReport() {
    const result = await createRealPriceCalibrationReport();
    setMessageKo(`단가 보정 리포트 생성: ${String(result?.reportPath || '-')}`);
  }

  if (!data) return <div className="drawer-block">실제 단가 보정 로딩 중...</div>;

  const summary = data.summary || {};

  return (
    <div className="cost-capture-view">
      <section className="cost-capture-hero">
        <div>
          <span className="eyebrow">REAL PRICE CALIBRATION</span>
          <h2>실제 단가 보정</h2>
          <p>초기 추정 단가를 업체 견적, 실제 매입가, 노무 단가로 검증하고 승인 후 마스터 데이터에 반영합니다.</p>
        </div>
        <strong className={Number(summary.needsUpdateCount || 0) > 0 ? 'red-kpi' : 'green-kpi'}>
          수정 필요 {String(summary.needsUpdateCount || 0)}건
        </strong>
      </section>

      <section className="cost-capture-panel warning-row">
        <strong>주의</strong>
        <p>입력 단가는 사용자가 확인한 견적/매입/노무 기준입니다. 외부 시장 단가로 자동 검증된 값이 아니며, 승인과 백업 후에만 반영됩니다.</p>
      </section>

      <section className="cost-kpi-grid live-margin-grid">
        <div><span>수정 필요 단가</span><strong>{String(summary.needsUpdateCount || 0)}건</strong></div>
        <div><span>우선 보정 항목</span><strong>{String(summary.highPriorityCount || 0)}건</strong></div>
        <div><span>승인 대기</span><strong>{String(summary.pendingCount || 0)}건</strong></div>
        <div><span>반영 완료</span><strong>{String(summary.appliedCount || 0)}건</strong></div>
        <div><span>평균 상승률</span><strong>{formatRate(summary.averageVarianceRate)}</strong></div>
        <div><span>백업 상태</span><strong>{String(summary.backupStatus || '확인 필요')}</strong></div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">INPUT</span>
            <h3>업체 견적 단가 / 실제 매입 단가 / 노무 단가</h3>
          </div>
          <button onClick={refresh}>새로고침</button>
        </div>
        <div className="estimate-form-grid">
          <label>대상 유형<input value={form.targetType} onChange={(event) => updateField('targetType', event.target.value)} /></label>
          <label>항목 ID<input value={form.targetId} onChange={(event) => updateField('targetId', event.target.value)} /></label>
          <label>항목명<input value={form.targetName} onChange={(event) => updateField('targetName', event.target.value)} /></label>
          <label>제안 단가<input value={form.proposedPrice} onChange={(event) => updateField('proposedPrice', event.target.value)} /></label>
          <label>단위<input value={form.unit} onChange={(event) => updateField('unit', event.target.value)} /></label>
          <label>업체명<input value={form.vendorName} onChange={(event) => updateField('vendorName', event.target.value)} /></label>
          <label>증빙 메모<input value={form.evidenceNote} onChange={(event) => updateField('evidenceNote', event.target.value)} /></label>
        </div>
        <div className="button-row">
          <button className="command command-approve" onClick={() => void submitQueue('VENDOR_QUOTE')}>업체 견적 입력</button>
          <button onClick={() => void submitQueue('ACTUAL_PURCHASE')}>실제 매입 단가 입력</button>
          <button onClick={() => void submitQueue('LABOR_RATE')}>노무 단가 입력</button>
          <button onClick={() => void createReport()}>리포트 생성</button>
        </div>
        {messageKo ? <p className="save-message">{messageKo}</p> : null}
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">NEEDS UPDATE</span>
            <h3>수정 필요 단가</h3>
          </div>
        </div>
        <div className="cost-table-wrapper">
          <table className="cost-table">
            <thead>
              <tr>
                <th>항목명</th>
                <th>유형</th>
                <th>현재 단가</th>
                <th>단위</th>
                <th>적용 공정</th>
                <th>견적 유형</th>
                <th>우선순위</th>
              </tr>
            </thead>
            <tbody>
              {needsUpdateItems.slice(0, 80).map((item) => (
                <tr key={`${String(item.targetType)}-${String(item.targetId)}`}>
                  <td>{String(item.targetName)}</td>
                  <td>{String(item.targetType)}</td>
                  <td>{formatWon(item.currentPrice)}</td>
                  <td>{String(item.unit || '-')}</td>
                  <td>{String(item.appliedProcess || '-')}</td>
                  <td>{String(item.estimateType || '-')}</td>
                  <td>{String(item.priority)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">PRIORITY</span>
            <h3>우선 보정 항목</h3>
          </div>
        </div>
        <div className="cost-leak-list">
          {priorityItems.slice(0, 24).map((item) => (
            <article key={`${String(item.targetType)}-${String(item.targetId)}`} className={`cost-leak ${item.priority === 'HIGH' ? 'red' : item.priority === 'MEDIUM' ? 'yellow' : 'green'}`}>
              <strong>{String(item.targetName)}</strong>
              <p>{String(item.targetType)} / {formatWon(item.currentPrice)} / {String(item.unit || '')}</p>
              <em>{String(item.priority)}</em>
            </article>
          ))}
        </div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">QUEUE</span>
            <h3>승인 대기 / 단가 차이 분석</h3>
          </div>
        </div>
        <div className="cost-table-wrapper">
          <table className="cost-table">
            <thead>
              <tr>
                <th>항목</th>
                <th>출처</th>
                <th>현재</th>
                <th>제안</th>
                <th>차이</th>
                <th>상태</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {data.queue.map((item) => (
                <tr key={String(item.id)}>
                  <td>{String(item.target_name)}</td>
                  <td>{String(item.price_source)}</td>
                  <td>{formatWon(item.current_price)}</td>
                  <td>{formatWon(item.proposed_price)}</td>
                  <td>{formatRate(item.variance_rate)}</td>
                  <td>{String(item.status)}</td>
                  <td>
                    <button onClick={() => void queueAction(String(item.id), 'approve')}>승인</button>
                    <button onClick={() => void queueAction(String(item.id), 'reject')}>반려</button>
                    <button onClick={() => void queueAction(String(item.id), 'apply')}>백업 후 반영</button>
                  </td>
                </tr>
              ))}
              {data.queue.length === 0 ? <tr><td colSpan={7}>승인 대기 단가가 없습니다.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">HISTORY</span>
            <h3>반영 이력 / 다음 견적 반영</h3>
          </div>
        </div>
        {data.history.length === 0 ? <p className="empty-state">아직 반영 이력이 없습니다.</p> : (
          <div className="today-action-list">
            {data.history.slice(0, 20).map((item) => (
              <div key={String(item.id)} className="action-row">
                <span>{String(item.target_type)}</span>
                <div>
                  <strong>{String(item.target_name)}</strong>
                  <p>{formatWon(item.old_price)} → {formatWon(item.new_price)} / 백업 {String(item.backup_id || '-')}</p>
                </div>
                <em>{String(item.created_at)}</em>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
