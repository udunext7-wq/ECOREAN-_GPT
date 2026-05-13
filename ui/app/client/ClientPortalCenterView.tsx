import { useEffect, useMemo, useState } from 'react';
import {
  confirmClientContract,
  createClientDefectRequest,
  generateClientPortalToken,
  getClientPortalData,
  respondClientChangeOrder,
  saveClientCompletionConfirmation,
  type ClientPortalData
} from '../../services/client-portal-service/clientPortalService';

type Props = {
  projectId?: string;
};

function money(value: unknown) {
  return `${Number(value || 0).toLocaleString('ko-KR')}원`;
}

function asArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value as Array<Record<string, unknown>> : [];
}

function text(value: unknown, fallback = '데이터 없음') {
  return value ? String(value) : fallback;
}

export function ClientPortalCenterView({ projectId }: Props) {
  const [data, setData] = useState<ClientPortalData | null>(null);
  const [activeProjectId, setActiveProjectId] = useState(projectId || '');
  const [clientName, setClientName] = useState('고객');
  const [messageKo, setMessageKo] = useState('고객 포털 데이터를 불러오는 중입니다.');
  const [defectLocationKo, setDefectLocationKo] = useState('');
  const [defectContentKo, setDefectContentKo] = useState('');
  const [contactTimeKo, setContactTimeKo] = useState('');
  const [urgentDefect, setUrgentDefect] = useState(false);
  const [completionNote, setCompletionNote] = useState('공사 완료를 확인했습니다.');

  async function refresh(nextProjectId = activeProjectId) {
    const result = await getClientPortalData(nextProjectId ? { projectId: nextProjectId } : {});
    setData(result);
    const summary = result.projectSummary || {};
    setActiveProjectId(String(summary.projectId || nextProjectId || ''));
    setClientName(String(summary.customerName || '고객'));
    setMessageKo('고객 포털이 최신화되었습니다.');
  }

  useEffect(() => {
    refresh(projectId || activeProjectId);
  }, [projectId]);

  const summary = data?.projectSummary || {};
  const estimate = data?.estimateView || {};
  const contract = data?.contractView || {};
  const schedule = data?.scheduleView || {};
  const progressReports = useMemo(() => asArray(data?.progressView?.reports), [data]);
  const payments = useMemo(() => asArray(data?.paymentView?.payments), [data]);
  const changeOrders = useMemo(() => asArray(data?.changeOrderView?.changeOrders), [data]);
  const inspections = useMemo(() => asArray(data?.inspectionView?.inspectionResults), [data]);
  const defectRequests = useMemo(() => asArray(data?.defectView?.defectRequests), [data]);
  const confirmations = useMemo(() => asArray(data?.completionView?.confirmations), [data]);
  const tokens = useMemo(() => asArray(data?.tokenView?.tokens), [data]);

  async function handleToken() {
    await generateClientPortalToken({ projectId: activeProjectId, clientName });
    setMessageKo('고객 포털 토큰이 생성되었습니다. 실제 공유 링크는 준비 중입니다.');
    await refresh(activeProjectId);
  }

  async function handleContractConfirm() {
    await confirmClientContract({
      projectId: activeProjectId,
      contractId: contract.contractId,
      clientName,
      signatureText: '계약 내용을 확인했습니다.'
    });
    setMessageKo('계약 확인이 저장되었습니다.');
    await refresh(activeProjectId);
  }

  async function handleChangeOrder(changeOrderId: unknown, responseStatus: 'APPROVED' | 'REJECTED' | 'QUESTION') {
    await respondClientChangeOrder({
      projectId: activeProjectId,
      changeOrderId,
      clientName,
      responseStatus,
      question: responseStatus === 'QUESTION' ? '고객 문의가 등록되었습니다.' : ''
    });
    setMessageKo(responseStatus === 'APPROVED' ? '추가공사 승인이 저장되었습니다.' : responseStatus === 'REJECTED' ? '추가공사 반려가 저장되었습니다.' : '추가공사 질문이 저장되었습니다.');
    await refresh(activeProjectId);
  }

  async function handleDefectRequest() {
    await createClientDefectRequest({
      projectId: activeProjectId,
      clientName,
      defectLocationKo: defectLocationKo || '위치 확인 필요',
      defectContentKo: defectContentKo || '하자 내용 확인 필요',
      urgent: urgentDefect,
      contactTimeKo: contactTimeKo || '연락 가능 시간 확인 필요'
    });
    setDefectLocationKo('');
    setDefectContentKo('');
    setContactTimeKo('');
    setUrgentDefect(false);
    setMessageKo('하자 접수가 저장되었습니다.');
    await refresh(activeProjectId);
  }

  async function handleCompletion(status: 'CONFIRMED' | 'REVISION_REQUESTED') {
    await saveClientCompletionConfirmation({
      projectId: activeProjectId,
      clientName,
      status,
      note: completionNote
    });
    setMessageKo(status === 'CONFIRMED' ? '완료 확인이 저장되었습니다.' : '보완 요청이 저장되었습니다.');
    await refresh(activeProjectId);
  }

  if (!data) {
    return <div className="drawer-block">고객 포털 데이터를 불러오는 중입니다.</div>;
  }

  return (
    <div className="execution-panel">
      <section className="estimate-preview-card">
        <div className="estimate-panel-head">
          <div>
            <span className="eyebrow">CLIENT PORTAL</span>
            <h3>고객 포털</h3>
            <p>견적서, 계약서, 공정표, 결제 일정, 진행 현황, 승인 요청, 하자 접수, 완료 확인을 고객용 화면으로 제공합니다.</p>
          </div>
          <button onClick={() => refresh(activeProjectId)}>새로고침</button>
        </div>
        <div className="form-grid">
          <label className="field-stack">
            프로젝트 ID
            <input value={activeProjectId} onChange={(event) => setActiveProjectId(event.target.value)} placeholder="프로젝트 또는 견적 ID" />
          </label>
          <label className="field-stack">
            고객명
            <input value={clientName} onChange={(event) => setClientName(event.target.value)} />
          </label>
        </div>
        <div className="button-row">
          <button className="primary-action" onClick={() => refresh(activeProjectId)}>고객 포털 열기</button>
          <button onClick={handleToken}>토큰 생성</button>
        </div>
        <p className="small-note">{messageKo}</p>
      </section>

      <section className="estimate-preview-card">
        <div className="estimate-panel-head">
          <div>
            <span className="eyebrow">CUSTOMER SAFE SUMMARY</span>
            <h3>내 프로젝트</h3>
          </div>
          <strong>{money(summary.contractAmount)}</strong>
        </div>
        <div className="case-library-grid">
          <div className="estimate-preview-card">
            <h5>고객 / 현장</h5>
            <strong>{text(summary.customerName)}</strong>
            <p>{text(summary.siteName)}</p>
          </div>
          <div className="estimate-preview-card">
            <h5>공사명</h5>
            <strong>{text(summary.projectName)}</strong>
            <p>{text(summary.currentStatusKo)}</p>
          </div>
          <div className="estimate-preview-card">
            <h5>다음 예정 공정</h5>
            <strong>{text(summary.nextProcessKo)}</strong>
            <p>{text(summary.managerContactKo)}</p>
          </div>
        </div>
      </section>

      <div className="dashboard-grid three">
        <section className="estimate-preview-card">
          <h4>내 견적서</h4>
          <p>공사 범위: {text(estimate.scopeSummaryKo)}</p>
          <p>유효기간: {text(estimate.validUntil)}</p>
          <strong>{money(estimate.totalCustomerAmount)}</strong>
          <div className="today-action-list">
            {asArray(estimate.groupedItems).length === 0 ? <p className="small-note">아직 생성된 견적이 없습니다.</p> : null}
            {asArray(estimate.groupedItems).map((group) => (
              <div className="action-row" key={String(group.category)}>
                <span>{String(group.category)}</span>
                <div>
                  <strong>{money(group.totalCustomerAmount)}</strong>
                  <p>공정별 금액 합계</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="estimate-preview-card">
          <h4>계약서</h4>
          <p>계약번호: {text(contract.contractNumber)}</p>
          <p>결제 조건: {text(contract.paymentTerms)}</p>
          <p>계약금 {money(contract.depositAmount)} / 중도금 {money(contract.progressPaymentAmount)} / 잔금 {money(contract.balanceAmount)}</p>
          <p>공사 기간: {text(contract.startDate)} ~ {text(contract.endDate)}</p>
          <p>서명 상태: {text(contract.signatureStatus)}</p>
          <button className="primary-action" onClick={handleContractConfirm}>계약 확인 처리</button>
        </section>

        <section className="estimate-preview-card">
          <h4>공사 일정</h4>
          <p>오늘 공정: {text(schedule.todayProcessKo)}</p>
          <p>다음 공정: {text(schedule.nextProcessKo)}</p>
          <strong>{String(schedule.progressRate || 0)}%</strong>
          <p>{text(schedule.delayNoticeKo, '일정 안내 없음')}</p>
        </section>
      </div>

      <section className="estimate-preview-card">
        <h4>진행 현황</h4>
        <div className="today-action-list">
          {progressReports.length === 0 ? <p className="small-note">{text(data.progressView.emptyMessageKo)}</p> : null}
          {progressReports.map((report, index) => (
            <div className="action-row" key={`${report.createdAt}-${index}`}>
              <span>{text(report.processNameKo)}</span>
              <div>
                <strong>{text(report.workContentKo)}</strong>
                <p>내일 예정: {text(report.tomorrowProcessKo)} / {text(report.photoStatus)}</p>
              </div>
              <em>{text(report.noticeKo)}</em>
            </div>
          ))}
        </div>
      </section>

      <div className="dashboard-grid three">
        <section className="estimate-preview-card">
          <h4>결제 일정</h4>
          <div className="today-action-list">
            {payments.length === 0 ? <p className="small-note">{text(data.paymentView.emptyMessageKo)}</p> : null}
            {payments.map((payment) => (
              <div className="action-row" key={String(payment.paymentId)}>
                <span>{text(payment.paymentType)}</span>
                <div>
                  <strong>{money(payment.scheduledAmount)}</strong>
                  <p>예정일 {text(payment.dueDate)} / 상태 {text(payment.paymentStatus)}</p>
                </div>
                <em>{money(payment.receivedAmount)}</em>
              </div>
            ))}
          </div>
        </section>

        <section className="estimate-preview-card">
          <h4>추가공사 승인</h4>
          <div className="today-action-list">
            {changeOrders.length === 0 ? <p className="small-note">{text(data.changeOrderView.emptyMessageKo)}</p> : null}
            {changeOrders.map((order) => (
              <div className="action-row" key={String(order.changeOrderId)}>
                <span>{money(order.additionalAmount)}</span>
                <div>
                  <strong>{text(order.changeContentKo)}</strong>
                  <p>{text(order.changeReasonKo)} / 일정 영향 {String(order.scheduleImpactDays || 0)}일</p>
                  <div className="button-row">
                    <button onClick={() => handleChangeOrder(order.changeOrderId, 'APPROVED')}>승인</button>
                    <button onClick={() => handleChangeOrder(order.changeOrderId, 'REJECTED')}>반려</button>
                    <button onClick={() => handleChangeOrder(order.changeOrderId, 'QUESTION')}>질문 남기기</button>
                  </div>
                </div>
                <em>{text(order.approvalStatus)}</em>
              </div>
            ))}
          </div>
        </section>

        <section className="estimate-preview-card">
          <h4>검수 결과</h4>
          <div className="today-action-list">
            {inspections.length === 0 ? <p className="small-note">{text(data.inspectionView.emptyMessageKo)}</p> : null}
            {inspections.slice(0, 8).map((item, index) => (
              <div className="action-row" key={`${item.checkItemKo}-${index}`}>
                <span>{text(item.resultKo)}</span>
                <div>
                  <strong>{text(item.checkItemKo)}</strong>
                  <p>{text(item.actionKo)} / {text(item.photoStatus)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="estimate-preview-card">
        <div className="estimate-panel-head">
          <div>
            <span className="eyebrow">DEFECT / WARRANTY</span>
            <h4>하자 접수</h4>
          </div>
          <label className="toggle-row">
            <input type="checkbox" checked={urgentDefect} onChange={(event) => setUrgentDefect(event.target.checked)} />
            긴급
          </label>
        </div>
        <div className="form-grid">
          <label className="field-stack">
            하자 위치
            <input value={defectLocationKo} onChange={(event) => setDefectLocationKo(event.target.value)} placeholder="예: 욕실 샤워부스 하부" />
          </label>
          <label className="field-stack">
            연락 가능 시간
            <input value={contactTimeKo} onChange={(event) => setContactTimeKo(event.target.value)} placeholder="예: 오후 2시 이후" />
          </label>
          <label className="field-stack">
            하자 내용
            <textarea value={defectContentKo} onChange={(event) => setDefectContentKo(event.target.value)} placeholder="고객이 보는 설명으로 입력" />
          </label>
        </div>
        <button className="primary-action" onClick={handleDefectRequest}>하자 접수 저장</button>
        <div className="today-action-list">
          {defectRequests.length === 0 ? <p className="small-note">{text(data.defectView.emptyMessageKo)}</p> : null}
          {defectRequests.map((request) => (
            <div className="action-row" key={String(request.requestId)}>
              <span>{request.urgent ? '긴급' : '일반'}</span>
              <div>
                <strong>{text(request.defectLocationKo)}</strong>
                <p>{text(request.defectContentKo)} / {text(request.requestStatus)}</p>
              </div>
              <em>{text(request.photoStatus)}</em>
            </div>
          ))}
        </div>
      </section>

      <section className="estimate-preview-card">
        <h4>완료 확인</h4>
        <div className="form-grid">
          <label className="field-stack">
            확인 메모
            <textarea value={completionNote} onChange={(event) => setCompletionNote(event.target.value)} />
          </label>
        </div>
        <div className="button-row">
          <button className="primary-action" onClick={() => handleCompletion('CONFIRMED')}>완료 확인</button>
          <button onClick={() => handleCompletion('REVISION_REQUESTED')}>보완 요청</button>
        </div>
        <div className="today-action-list">
          {confirmations.length === 0 ? <p className="small-note">{text(data.completionView.emptyMessageKo)}</p> : null}
          {confirmations.map((confirmation) => (
            <div className="action-row" key={String(confirmation.confirmationId)}>
              <span>{text(confirmation.status)}</span>
              <div>
                <strong>{text(confirmation.confirmationType)}</strong>
                <p>{text(confirmation.note)}</p>
              </div>
              <em>{text(confirmation.signedAt, '서명 대기')}</em>
            </div>
          ))}
        </div>
      </section>

      <section className="estimate-preview-card">
        <h4>고객 공유 토큰</h4>
        <p>{text(data.tokenView.shareStatusKo, '고객 공유 링크 준비 중')}</p>
        <div className="today-action-list">
          {tokens.length === 0 ? <p className="small-note">아직 생성된 토큰이 없습니다.</p> : null}
          {tokens.map((token) => (
            <div className="action-row" key={String(token.tokenId)}>
              <span>{text(token.status)}</span>
              <div>
                <strong>{text(token.clientName)}</strong>
                <p>{text(token.token)} / 만료 {text(token.expiresAt)}</p>
              </div>
              <em>{text(token.shareStatusKo)}</em>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
