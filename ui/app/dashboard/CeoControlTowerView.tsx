import { useEffect, useState } from 'react';
import {
  decideCeoApprovalRequest,
  loadCeoControlTowerData,
  type CeoControlTowerData
} from '../../services/ceo-control-tower-service/ceoControlTowerService';

function money(value: unknown) {
  const number = Number(value || 0);
  return number === 0 ? '데이터 없음' : `${number.toLocaleString('ko-KR')}원`;
}

function riskClass(level: string) {
  if (level === 'RED') return 'warning-row';
  if (level === 'ORANGE') return 'action-row warning-row';
  return 'action-row';
}

export function CeoControlTowerView() {
  const [data, setData] = useState<CeoControlTowerData | null>(null);
  const [messageKo, setMessageKo] = useState('CEO Control Tower 데이터를 불러오는 중입니다.');

  async function refresh() {
    const next = await loadCeoControlTowerData();
    setData(next);
    setMessageKo(next ? '대표 의사결정 큐가 최신화되었습니다.' : 'Electron DB 연결 없음');
  }

  useEffect(() => {
    refresh();
  }, []);

  async function decide(requestId: string, decision: 'APPROVED' | 'REJECTED') {
    await decideCeoApprovalRequest(requestId, decision);
    setMessageKo(decision === 'APPROVED' ? '승인 처리 완료' : '반려 처리 완료');
    await refresh();
  }

  const cashflow = data?.cashflow;

  return (
    <section className="estimate-panel">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">CEO OPERATING COCKPIT</span>
          <h4>CEO Control Tower</h4>
        </div>
        <div className="button-row">
          <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'customerPortalDraft' }))}>고객 포털 내부 초안</button>
          <span className="preliminary-badge">{data?.summary.redAlertCount ?? 0} RED ALERT</span>
        </div>
      </div>
      <p className="small-note">{messageKo}</p>

      <div className="case-library-grid">
        <div className="estimate-preview-card warning-row">
          <h5>오늘의 의사결정</h5>
          <strong>{data?.summary.decisionCount ?? 0}건</strong>
          <p>대표가 오늘 승인/차단/보류해야 하는 항목입니다.</p>
        </div>
        <div className="estimate-preview-card warning-row">
          <h5>RED ALERT</h5>
          <strong>{data?.summary.redAlertCount ?? 0}건</strong>
          <p>마진 붕괴, 검수 실패, 자재 부족, 현금흐름 위험을 먼저 봅니다.</p>
        </div>
        <div className="estimate-preview-card">
          <h5>승인 대기</h5>
          <strong>{data?.summary.pendingApprovalCount ?? 0}건</strong>
          <p>추가공사, PCE 예외, 하자비 승인 후보입니다.</p>
        </div>
        <div className="estimate-preview-card">
          <h5>마진 위험 프로젝트</h5>
          <strong>{data?.summary.marginRiskCount ?? 0}건</strong>
          <p>Live Margin 25% 미만 또는 PCE 위험 항목입니다.</p>
        </div>
      </div>

      <div className="case-library-grid">
        <div className="estimate-preview-card">
          <h5>오늘 입금 예정</h5>
          <strong>{money(cashflow?.todayExpectedInflow)}</strong>
        </div>
        <div className="estimate-preview-card">
          <h5>오늘 지급 예정</h5>
          <strong>{money(cashflow?.todayExpectedOutflow)}</strong>
        </div>
        <div className={Number(cashflow?.todayNetCashflow || 0) < 0 ? 'estimate-preview-card warning-row' : 'estimate-preview-card'}>
          <h5>순현금흐름</h5>
          <strong>{money(cashflow?.todayNetCashflow)}</strong>
          <p>{cashflow?.displayStatusKo ?? '데이터 없음'}</p>
        </div>
        <div className="estimate-preview-card">
          <h5>7일 예상 순현금흐름</h5>
          <strong>{money(cashflow?.sevenDayNetCashflow)}</strong>
          <p>미수금 {money(cashflow?.receivableAmount)} / 미지급금 {money(cashflow?.payableAmount)}</p>
        </div>
      </div>

      <div className="estimate-panel">
        <div className="estimate-panel-head">
          <div>
            <span className="eyebrow">DECISION QUEUE</span>
            <h4>대표 승인 필요</h4>
          </div>
        </div>
        <div className="today-action-list">
          {(data?.decisions ?? []).slice(0, 12).map((item) => (
            <div key={item.decisionId} className={riskClass(item.riskLevel)}>
              <span>{item.riskLevel}</span>
              <div>
                <strong>{item.titleKo}</strong>
                <p>{item.siteNameKo} / {item.requiredActionKo} / 영향 {money(item.financialImpact)}</p>
              </div>
              <em>{item.deadline}</em>
            </div>
          ))}
          {data?.decisions.length === 0 ? <p className="small-note">현재 대표 의사결정 대기 항목이 없습니다.</p> : null}
        </div>
      </div>

      <div className="estimate-panel">
        <div className="estimate-panel-head">
          <div>
            <span className="eyebrow">APPROVAL CENTER</span>
            <h4>승인 대기</h4>
          </div>
        </div>
        <div className="today-action-list">
          {(data?.approvalRequests ?? []).slice(0, 10).map((item) => (
            <div key={item.requestId} className={item.status === 'PENDING' ? 'action-row' : 'action-row warning-row'}>
              <span>{item.status}</span>
              <div>
                <strong>{item.titleKo}</strong>
                <p>{item.reasonKo} / 금액 {money(item.amount)}</p>
              </div>
              {item.status === 'PENDING' ? (
                <div className="approval-actions-strong">
                  <button className="approve-button" onClick={() => decide(item.requestId, 'APPROVED')}>승인</button>
                  <button className="reject-button" onClick={() => decide(item.requestId, 'REJECTED')}>반려</button>
                </div>
              ) : (
                <em>{item.status}</em>
              )}
            </div>
          ))}
          {data?.approvalRequests.length === 0 ? <p className="small-note">승인 대기 항목이 없습니다.</p> : null}
        </div>
      </div>
    </section>
  );
}
