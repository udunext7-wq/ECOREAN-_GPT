import { useEffect, useMemo, useState } from 'react';
import {
  approveCalibrationQueueItem,
  applyApprovedCalibrationWithBackup,
  createCalibrationWorkbenchReport,
  deferCalibrationQueueItem,
  formatRate,
  formatWon,
  getCalibrationQueueItemDetail,
  getCalibrationWorkbenchData,
  rejectCalibrationQueueItem,
  type CalibrationWorkbenchData
} from '../../services/pricing-service/realPriceCalibrationWorkbenchService';

const statusOptions = [
  { value: 'ALL', label: '전체' },
  { value: 'PENDING_REVIEW', label: '승인 대기' },
  { value: 'APPROVED', label: '승인 완료' },
  { value: 'DEFERRED', label: '보류' },
  { value: 'REJECTED', label: '반려' },
  { value: 'APPLIED', label: '반영 완료' }
];

const riskOptions = [
  { value: 'ALL', label: '전체' },
  { value: 'BLOCKING', label: 'BLOCKING' },
  { value: 'HIGH', label: 'HIGH' },
  { value: 'MEDIUM', label: 'MEDIUM' },
  { value: 'LOW', label: 'LOW' }
];

const targetOptions = [
  { value: 'ALL', label: '전체' },
  { value: 'MATERIAL', label: '자재' },
  { value: 'LABOR', label: '노무' },
  { value: 'EQUIPMENT', label: '장비' },
  { value: 'STANDARD_ITEM', label: '표준 품목' },
  { value: 'PACKAGE', label: '패키지' }
];

function navigate(view: string) {
  window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: view }));
}

function riskClass(value: unknown) {
  const risk = String(value || '');
  if (risk === 'BLOCKING' || risk === 'HIGH') return 'red';
  if (risk === 'MEDIUM') return 'yellow';
  return 'green';
}

export function RealPriceCalibrationWorkbenchView() {
  const [data, setData] = useState<CalibrationWorkbenchData | null>(null);
  const [status, setStatus] = useState('ALL');
  const [riskLevel, setRiskLevel] = useState('ALL');
  const [targetType, setTargetType] = useState('ALL');
  const [selectedId, setSelectedId] = useState('');
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [reviewNote, setReviewNote] = useState('대표 검토 완료');
  const [messageKo, setMessageKo] = useState('');

  async function refresh() {
    setData(await getCalibrationWorkbenchData({
      status,
      riskLevel,
      targetType
    }));
  }

  useEffect(() => {
    refresh();
  }, [status, riskLevel, targetType]);

  const rows = useMemo(() => data?.queueItems || [], [data]);
  const summary = data?.summary || {};

  async function selectRow(queueId: string) {
    setSelectedId(queueId);
    const result = await getCalibrationQueueItemDetail(queueId);
    setDetail(result || null);
  }

  async function action(queueId: string, type: 'approve' | 'reject' | 'defer' | 'apply') {
    if (type === 'approve') {
      await approveCalibrationQueueItem(queueId, { note: reviewNote, approvedBy: 'CEO' });
      setMessageKo('수동 승인 처리되었습니다. 마스터 단가는 아직 변경되지 않았습니다.');
    }
    if (type === 'reject') {
      await rejectCalibrationQueueItem(queueId, { reason: reviewNote || '반려' });
      setMessageKo('반려 처리되었습니다.');
    }
    if (type === 'defer') {
      await deferCalibrationQueueItem(queueId, { reason: reviewNote || '보류' });
      setMessageKo('보류 처리되었습니다.');
    }
    if (type === 'apply') {
      const result = await applyApprovedCalibrationWithBackup(queueId, { appliedBy: 'CEO' });
      setMessageKo(result?.ok === false ? String(result.messageKo || '백업 실패로 단가 반영을 중단했습니다.') : '백업 후 마스터 단가에 반영되었습니다.');
    }
    await refresh();
    if (selectedId) {
      const result = await getCalibrationQueueItemDetail(selectedId);
      setDetail(result || null);
    }
  }

  async function createReport() {
    const result = await createCalibrationWorkbenchReport({ filters: { status, riskLevel, targetType } });
    setMessageKo(`워크벤치 리포트 생성: ${String(result?.reportPath || '-')}`);
  }

  if (!data) return <div className="drawer-block">실제 단가 보정 워크벤치 로딩 중...</div>;

  const selectedItem = (detail?.queueItem || null) as Record<string, unknown> | null;
  const linkedTask = (detail?.linkedPriorityTask || null) as Record<string, unknown> | null;

  return (
    <div className="cost-capture-view">
      <section className="cost-capture-hero">
        <div>
          <span className="eyebrow">REAL PRICE CALIBRATION WORKBENCH</span>
          <h2>실제 단가 보정 워크벤치</h2>
          <p>승인 대기 queue를 빠르게 검토하고 승인, 반려, 보류, 백업 후 반영까지 한 화면에서 처리합니다.</p>
        </div>
        <strong className={Number(summary.highBlockingCount || 0) > 0 ? 'red-kpi' : 'green-kpi'}>
          HIGH/BLOCKING {String(summary.highBlockingCount || 0)}건
        </strong>
      </section>

      <section className="cost-capture-panel warning-row">
        <strong>운영 안전 원칙</strong>
        <p>이 화면은 내부 검토 전용입니다. 승인 전 자동 반영은 없고, 승인 후에도 백업 성공 전에는 마스터 단가를 변경하지 않습니다.</p>
      </section>

      <section className="cost-kpi-grid live-margin-grid">
        <div><span>전체 queue 수</span><strong>{String(summary.totalQueueCount || 0)}건</strong></div>
        <div><span>승인 대기 수</span><strong>{String(summary.pendingReviewCount || 0)}건</strong></div>
        <div><span>HIGH/BLOCKING 수</span><strong>{String(summary.highBlockingCount || 0)}건</strong></div>
        <div><span>오늘 반영 가능 수</span><strong>{String(summary.todayApplicableCount || 0)}건</strong></div>
        <div><span>백업 필요 수</span><strong>{String(summary.backupRequiredCount || 0)}건</strong></div>
        <div><span>반려/보류 수</span><strong>{String(summary.heldOrRejectedCount || 0)}건</strong></div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">FILTER</span>
            <h3>상태 / 리스크 / 대상 필터</h3>
          </div>
          <button onClick={() => void refresh()}>새로고침</button>
        </div>
        <div className="estimate-form-grid">
          <label>상태
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              {statusOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label>리스크
            <select value={riskLevel} onChange={(event) => setRiskLevel(event.target.value)}>
              {riskOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label>대상
            <select value={targetType} onChange={(event) => setTargetType(event.target.value)}>
              {targetOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label>검토 메모
            <input value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} />
          </label>
        </div>
        <div className="button-row">
          <button onClick={() => navigate('priceCalibrationPriority')}>단가 보정 우선순위</button>
          <button onClick={() => navigate('realPriceCalibration')}>실제 단가 보정</button>
          <button onClick={() => navigate('priceWorkbookImport')}>단가표 가져오기</button>
          <button onClick={() => navigate('unmatchedPriceRecommendation')}>단가 미매칭 추천</button>
          <button onClick={() => void createReport()}>리포트 생성</button>
        </div>
        {messageKo ? <p className="save-message">{messageKo}</p> : null}
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">QUEUE</span>
            <h3>승인 대기 / 승인 완료 / 보류 / 반려</h3>
          </div>
        </div>
        {rows.length === 0 ? <p>검토할 단가 queue가 없습니다.</p> : null}
        <div className="cost-table-wrapper">
          <table className="cost-table">
            <thead>
              <tr>
                <th>항목</th>
                <th>대상</th>
                <th>출처</th>
                <th>현재 단가</th>
                <th>제안 단가</th>
                <th>차이율</th>
                <th>Risk</th>
                <th>상태</th>
                <th>추천 조치</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 120).map((item) => {
                const queueId = String(item.id);
                const itemStatus = String(item.status || '');
                return (
                  <tr key={queueId}>
                    <td><button onClick={() => void selectRow(queueId)}>{String(item.target_name)}</button></td>
                    <td>{String(item.target_type)}</td>
                    <td>{String(item.price_source)}</td>
                    <td>{formatWon(item.current_price)}</td>
                    <td>{formatWon(item.proposed_price)}</td>
                    <td>{formatRate(item.variance_rate)}</td>
                    <td><span className={`status-pill ${riskClass(item.risk_level)}`}>{String(item.risk_level)}</span></td>
                    <td>{String(item.status_ko || itemStatus)}</td>
                    <td>{String(item.recommended_action || '-')}</td>
                    <td>
                      <button disabled={itemStatus !== 'PENDING_REVIEW'} onClick={() => void action(queueId, 'approve')}>승인</button>
                      <button disabled={itemStatus === 'APPLIED'} onClick={() => void action(queueId, 'reject')}>반려</button>
                      <button disabled={itemStatus === 'APPLIED'} onClick={() => void action(queueId, 'defer')}>보류</button>
                      <button className="command command-approve" disabled={itemStatus !== 'APPROVED'} onClick={() => void action(queueId, 'apply')}>백업 후 반영</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cost-capture-panel">
        <div className="section-header compact">
          <div>
            <span className="eyebrow">DETAIL</span>
            <h3>선택 항목 상세 / 연결 작업 / 이력</h3>
          </div>
        </div>
        {!selectedItem ? <p>Queue 항목을 선택하세요.</p> : (
          <div className="cost-leak-list">
            <article className={`cost-leak ${riskClass(selectedItem.risk_level)}`}>
              <strong>{String(selectedItem.target_name)}</strong>
              <p>{String(selectedItem.target_type)} / {String(selectedItem.price_source)} / {formatWon(selectedItem.current_price)} → {formatWon(selectedItem.proposed_price)}</p>
              <em>{String(selectedItem.risk_level)} / {String(selectedItem.recommended_action)}</em>
            </article>
            <article className="cost-leak yellow">
              <strong>증빙 / 검토</strong>
              <p>{String(selectedItem.evidence_note || '증빙 메모 없음')}</p>
              <em>{String(selectedItem.review_note || '검토 메모 없음')}</em>
            </article>
            <article className="cost-leak green">
              <strong>연결 우선순위 작업</strong>
              <p>{linkedTask ? `${String(linkedTask.task_id)} / ${String(linkedTask.estimate_type)} / ${String(linkedTask.item_name)}` : '연결된 우선순위 작업 없음'}</p>
              <em>{linkedTask ? String(linkedTask.review_status) : '연결 필요 시 우선순위 센터에서 Queue ID 연결'}</em>
            </article>
          </div>
        )}
      </section>
    </div>
  );
}
