import { useEffect, useMemo, useState } from 'react';
import {
  closeLightBIMExecutionFeedback,
  generateLightBIMQuantityCalibration,
  getLightBIMExecutionFeedbackSummary,
  updateLightBIMActualUsedQuantity
} from '../../services/lightbim-execution-feedback-service/lightBIMExecutionFeedbackService';

type Props = {
  projectId?: string;
};

type FeedbackItem = {
  id: string;
  itemName: string;
  category: string;
  unit: string;
  lightBimQuantity: number;
  reviewedQuantity: number;
  purchaseOrderQuantity: number;
  receivedQuantity: number;
  actualUsedQuantity: number;
  remainingQuantity: number;
  wasteQuantity: number;
  varianceRate: number;
  feedbackStatus: string;
};

type FeedbackData = {
  items?: FeedbackItem[];
  summary?: {
    totalCount?: number;
    matchedCount?: number;
    overUsedCount?: number;
    shortageCount?: number;
    wasteHighCount?: number;
    calibrationRequiredCount?: number;
  };
  purchaseCalibrationRules?: Array<Record<string, unknown>>;
};

type ItemEdit = {
  actualUsedQuantity: string;
  remainingQuantity: string;
  wasteQuantity: string;
  reason: string;
  confirmedBy: string;
};

function number(value: unknown) {
  return Number(value || 0).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
}

function statusKo(status: string) {
  const labels: Record<string, string> = {
    PENDING: '입력 대기',
    IN_PROGRESS: '진행 중',
    MATCHED: '정상 일치',
    OVER_USED: '현장 사용량 초과',
    UNDER_USED: '잔량 발생',
    SHORTAGE: '입고 부족',
    WASTE_HIGH: '자재 손실 과다',
    REVIEW_REQUIRED: '검토 필요',
    CLOSED: '확정됨'
  };
  return labels[status] || status;
}

export function LightBIMExecutionFeedbackView({ projectId = '' }: Props) {
  const [activeProjectId, setActiveProjectId] = useState(projectId);
  const [data, setData] = useState<FeedbackData>({});
  const [messageKo, setMessageKo] = useState('실행 피드백 데이터를 불러오는 중입니다.');
  const [edits, setEdits] = useState<Record<string, ItemEdit>>({});

  const items = data.items || [];
  const summary = data.summary || {};
  const kpis = [
    ['검토 대상 수량', summary.totalCount],
    ['정상 일치', summary.matchedCount],
    ['초과 사용', summary.overUsedCount],
    ['입고 부족', summary.shortageCount],
    ['잔량 과다', summary.wasteHighCount],
    ['보정 필요', summary.calibrationRequiredCount]
  ];
  const calibrationRules = data.purchaseCalibrationRules || [];
  const varianceItems = useMemo(
    () => items.filter((item) => !['PENDING', 'MATCHED', 'CLOSED'].includes(item.feedbackStatus)),
    [items]
  );

  async function refresh(nextProjectId = activeProjectId) {
    try {
      const next = await getLightBIMExecutionFeedbackSummary(nextProjectId ? { projectId: nextProjectId } : {});
      setData(next as FeedbackData);
      setMessageKo((next as FeedbackData).items?.length ? '실행 피드백이 최신화되었습니다.' : '실행 피드백 데이터가 없습니다.');
    } catch (error) {
      console.error('[LightBIM Execution Feedback] load failed', error);
      setMessageKo('데이터를 불러오지 못했습니다.');
    }
  }

  useEffect(() => {
    void refresh(projectId);
  }, [projectId]);

  function changeEdit(id: string, key: keyof ItemEdit, value: string) {
    setEdits((current) => ({
      ...current,
      [id]: {
        actualUsedQuantity: current[id]?.actualUsedQuantity || '',
        remainingQuantity: current[id]?.remainingQuantity || '',
        wasteQuantity: current[id]?.wasteQuantity || '',
        reason: current[id]?.reason || '',
        confirmedBy: current[id]?.confirmedBy || '',
        [key]: value
      }
    }));
  }

  async function saveActual(item: FeedbackItem) {
    const edit = edits[item.id] || {} as ItemEdit;
    if (edit.actualUsedQuantity === '' || Number.isNaN(Number(edit.actualUsedQuantity))) {
      setMessageKo('실제 사용 수량을 입력하세요.');
      return;
    }
    await updateLightBIMActualUsedQuantity({
      feedbackId: item.id,
      actualUsedQuantity: Number(edit.actualUsedQuantity),
      remainingQuantity: edit.remainingQuantity === '' ? undefined : Number(edit.remainingQuantity),
      wasteQuantity: edit.wasteQuantity === '' ? undefined : Number(edit.wasteQuantity),
      reason: edit.reason || '현장 사용 수량 확인',
      confirmedBy: edit.confirmedBy || '현장 관리자'
    });
    setMessageKo('실제 사용 수량과 차이 분석이 저장되었습니다.');
    await refresh();
  }

  async function closeItem(id: string) {
    await closeLightBIMExecutionFeedback({ feedbackId: id });
    setMessageKo('피드백이 확정되었습니다.');
    await refresh();
  }

  async function generateCalibration(id: string) {
    await generateLightBIMQuantityCalibration({ feedbackId: id });
    setMessageKo('다음 견적 및 발주 보정 후보가 승인 대기로 등록되었습니다.');
    await refresh();
  }

  return (
    <section className="drawer-stack">
      <section className="drawer-block">
        <div className="section-header">
          <div>
            <span className="eyebrow">LIGHTBIM FIELD LOOP</span>
            <h2>LightBIM 실행 피드백</h2>
            <p>도면에서 산출된 수량과 실제 현장 사용량을 비교하여 다음 견적과 발주 기준을 보정합니다.</p>
          </div>
          <div className="button-row">
            <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'lightbimTraceability' }))}>추적 보기</button>
            <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'lightbimSpaceMap' }))}>공간별 보기</button>
          </div>
        </div>
        <div className="form-grid">
          <label>
            프로젝트 ID
            <input value={activeProjectId} onChange={(event) => setActiveProjectId(event.target.value)} placeholder="전체 조회 또는 프로젝트 ID 입력" />
          </label>
        </div>
        <div className="button-row">
          <button onClick={() => refresh()}>조회</button>
        </div>
        <p className="small-note">{messageKo}</p>
      </section>

      <div className="internal-kpi-grid">
        {kpis.map(([label, value]) => (
          <div key={String(label)}>
            <span>{label}</span>
            <strong>{number(value)}건</strong>
          </div>
        ))}
      </div>

      <section className="drawer-block">
        <h3>도면 수량 / 검토 수량 / 발주 수량 / 입고 수량 / 실제 사용 수량</h3>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>항목</th>
                <th>단위</th>
                <th>도면 수량</th>
                <th>검토 수량</th>
                <th>발주 수량</th>
                <th>입고 수량</th>
                <th>실제 사용량</th>
                <th>차이율</th>
                <th>상태</th>
                <th>보정 추천</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.itemName}</td>
                  <td>{item.unit}</td>
                  <td>{number(item.lightBimQuantity)}</td>
                  <td>{number(item.reviewedQuantity)}</td>
                  <td>{number(item.purchaseOrderQuantity)}</td>
                  <td>{number(item.receivedQuantity)}</td>
                  <td>{number(item.actualUsedQuantity)}</td>
                  <td>{(Number(item.varianceRate || 0) * 100).toFixed(1)}%</td>
                  <td>{statusKo(item.feedbackStatus)}</td>
                  <td>
                    {['OVER_USED', 'UNDER_USED', 'SHORTAGE', 'WASTE_HIGH', 'REVIEW_REQUIRED'].includes(item.feedbackStatus)
                      ? <button onClick={() => generateCalibration(item.id)}>보정 추천</button>
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!items.length ? <p className="empty-state">실행 피드백 데이터가 없습니다.</p> : null}
      </section>

      <section className="drawer-block">
        <h3>잔량 / 손실</h3>
        <p>실제 사용 수량, 잔량, 폐기 또는 손실 수량을 현장 확인 후 기록합니다.</p>
        {items.map((item) => (
          <div className="estimate-save-bar" key={`edit-${item.id}`}>
            <div>
              <strong>{item.itemName}</strong>
              <span>검토 수량 {number(item.reviewedQuantity)}{item.unit} / 입고 수량 {number(item.receivedQuantity)}{item.unit}</span>
            </div>
            <div className="form-grid">
              <label>실제 사용 수량<input inputMode="decimal" value={edits[item.id]?.actualUsedQuantity || ''} onChange={(event) => changeEdit(item.id, 'actualUsedQuantity', event.target.value)} /></label>
              <label>잔량<input inputMode="decimal" value={edits[item.id]?.remainingQuantity || ''} onChange={(event) => changeEdit(item.id, 'remainingQuantity', event.target.value)} /></label>
              <label>폐기/손실 수량<input inputMode="decimal" value={edits[item.id]?.wasteQuantity || ''} onChange={(event) => changeEdit(item.id, 'wasteQuantity', event.target.value)} /></label>
              <label>사유<input value={edits[item.id]?.reason || ''} onChange={(event) => changeEdit(item.id, 'reason', event.target.value)} /></label>
              <label>확인자<input value={edits[item.id]?.confirmedBy || ''} onChange={(event) => changeEdit(item.id, 'confirmedBy', event.target.value)} /></label>
            </div>
            <div className="button-row">
              <button onClick={() => saveActual(item)}>사용 수량 입력</button>
              <button onClick={() => closeItem(item.id)}>피드백 확정</button>
            </div>
          </div>
        ))}
      </section>

      <section className="drawer-block">
        <h3>수량 차이 분석</h3>
        {varianceItems.length ? varianceItems.map((item) => (
          <p key={`variance-${item.id}`}>{item.itemName}: {statusKo(item.feedbackStatus)} ({(Number(item.varianceRate || 0) * 100).toFixed(1)}%)</p>
        )) : <p className="empty-state">수량 차이 검토 항목이 없습니다.</p>}
      </section>

      <section className="drawer-block">
        <h3>다음 견적 보정 / 다음 발주 보정</h3>
        <p>보정 추천은 자동 적용되지 않으며 대표 승인 후 다음 견적과 발주 기준에 반영됩니다.</p>
        {calibrationRules.length ? calibrationRules.map((rule) => (
          <p key={String(rule.id)}>{String(rule.material_name || '')}: {String(rule.reason || '')} ({String(rule.status || '')})</p>
        )) : <p className="empty-state">승인 대기 중인 보정 추천이 없습니다.</p>}
      </section>
    </section>
  );
}
