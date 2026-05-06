import { useEffect, useState } from 'react';
import {
  createPaymentRequestMessage,
  loadPaymentCenterData,
  markCustomerPaymentReceived,
  markVendorPaymentPaid,
  requestVendorPaymentApproval,
  type PaymentCenterData
} from '../../services/payment-service/paymentService';

function money(value: unknown) {
  const number = Number(value || 0);
  return number === 0 ? '데이터 없음' : `${number.toLocaleString('ko-KR')}원`;
}

function statusKo(status: unknown) {
  const value = String(status || '');
  const labels: Record<string, string> = {
    SCHEDULED: '예정',
    EXPECTED: '예정',
    PAID: '완료',
    RECEIVED: '입금완료',
    PARTIAL: '부분',
    PARTIAL_PAID: '부분 처리',
    OVERDUE: '연체',
    PENDING_CEO_APPROVAL: '대표 승인 필요',
    APPROVED: '승인',
    NOT_REQUIRED: '승인 불필요'
  };
  return labels[value] || value || '확인 필요';
}

export function PaymentCenterView() {
  const [data, setData] = useState<PaymentCenterData | null>(null);
  const [messageKo, setMessageKo] = useState('결제 데이터를 불러오는 중입니다.');

  async function refresh() {
    const next = await loadPaymentCenterData();
    setData(next);
    setMessageKo('입금/지급/현금흐름 데이터가 최신화되었습니다.');
  }

  useEffect(() => {
    refresh();
  }, []);

  async function receive(payment: Record<string, unknown>, partial = false) {
    const amount = partial ? Math.round(Number(payment.scheduled_amount || 0) / 2) : Number(payment.scheduled_amount || 0);
    await markCustomerPaymentReceived(String(payment.payment_id), amount);
    setMessageKo(partial ? '부분 입금 처리했습니다.' : '입금 완료 처리했습니다.');
    await refresh();
  }

  async function pay(payment: Record<string, unknown>, partial = false) {
    try {
      const amount = partial ? Math.round(Number(payment.scheduled_amount || 0) / 2) : Number(payment.scheduled_amount || 0);
      await markVendorPaymentPaid(String(payment.payment_id), amount);
      setMessageKo(partial ? '부분 지급 처리했습니다.' : '지급 완료 처리했습니다.');
      await refresh();
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : '지급 처리 중 승인 차단이 발생했습니다.');
    }
  }

  async function requestApproval(paymentId: string) {
    await requestVendorPaymentApproval(paymentId);
    setMessageKo('지급 승인 요청을 생성했습니다.');
    await refresh();
  }

  async function createMessage(paymentId: string) {
    await createPaymentRequestMessage(paymentId);
    setMessageKo('결제 요청 메시지 초안을 생성했습니다.');
    await refresh();
  }

  if (!data) return <div className="drawer-block">Payment Center 로딩 중</div>;

  return (
    <div className="execution-panel">
      <section className="estimate-preview-card">
        <div className="estimate-panel-head">
          <div>
            <span className="eyebrow">PAYMENT CENTER</span>
            <h3>결제 / 현금흐름 관리</h3>
            <p>계약금, 중도금, 잔금, 협력업체 지급, 미수/미지급, 7일 현금흐름을 추적합니다. 실제 은행 이체는 하지 않습니다.</p>
          </div>
          <button onClick={refresh}>새로고침</button>
        </div>
        <p className="small-note">{messageKo}</p>
      </section>

      <div className="case-library-grid">
        <div className="estimate-preview-card">
          <h5>오늘 입금 예정</h5>
          <strong>{money(data.summary.todayExpectedInflow)}</strong>
          <p>오늘 실제 입금 {money(data.summary.todayActualInflow)}</p>
        </div>
        <div className="estimate-preview-card">
          <h5>오늘 지급 예정</h5>
          <strong>{money(data.summary.todayExpectedOutflow)}</strong>
          <p>오늘 실제 지급 {money(data.summary.todayActualOutflow)}</p>
        </div>
        <div className={Number(data.summary.todayNetCashflow || 0) < 0 ? 'estimate-preview-card warning-row' : 'estimate-preview-card'}>
          <h5>오늘 순현금흐름</h5>
          <strong>{money(data.summary.todayNetCashflow)}</strong>
          <p>{String(data.summary.displayStatusKo || '데이터 없음')}</p>
        </div>
        <div className="estimate-preview-card">
          <h5>7일 예상 순현금흐름</h5>
          <strong>{money(data.summary.sevenDayNetCashflow)}</strong>
          <p>입금 {money(data.summary.sevenDayExpectedInflow)} / 지급 {money(data.summary.sevenDayExpectedOutflow)}</p>
        </div>
      </div>

      <div className="case-library-grid">
        <section className="estimate-preview-card">
          <h4>입금 관리</h4>
          <div className="today-action-list">
            {data.customerPayments.length === 0 ? <p className="small-note">입금 일정 데이터 없음</p> : null}
            {data.customerPayments.slice(0, 12).map((payment) => (
              <div key={String(payment.payment_id)} className={String(payment.payment_status) === 'OVERDUE' ? 'action-row warning-row' : 'action-row'}>
                <span>{statusKo(payment.payment_status)}</span>
                <div>
                  <strong>{String(payment.customer_name)} / {statusKo(payment.payment_type)}</strong>
                  <p>{String(payment.site_name)} / 예정일 {String(payment.due_date)} / {money(payment.scheduled_amount)}</p>
                </div>
                <div className="approval-actions-strong">
                  <button className="approve-button" onClick={() => receive(payment)}>입금 완료</button>
                  <button onClick={() => receive(payment, true)}>부분 입금</button>
                  <button onClick={() => createMessage(String(payment.payment_id))}>결제 요청</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="estimate-preview-card">
          <h4>지급 관리</h4>
          <div className="today-action-list">
            {data.vendorPayments.length === 0 ? <p className="small-note">지급 일정 데이터 없음</p> : null}
            {data.vendorPayments.slice(0, 12).map((payment) => (
              <div key={String(payment.payment_id)} className={String(payment.payment_status) === 'OVERDUE' ? 'action-row warning-row' : 'action-row'}>
                <span>{statusKo(payment.payment_status)}</span>
                <div>
                  <strong>{String(payment.vendor_name)}</strong>
                  <p>{String(payment.site_name)} / 지급일 {String(payment.due_date)} / {money(payment.scheduled_amount)} / {statusKo(payment.approval_status)}</p>
                </div>
                <div className="approval-actions-strong">
                  <button className="approve-button" onClick={() => pay(payment)}>지급 완료</button>
                  <button onClick={() => pay(payment, true)}>부분 지급</button>
                  <button onClick={() => requestApproval(String(payment.payment_id))}>지급 승인 요청</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="case-library-grid">
        <section className="estimate-preview-card warning-row">
          <h4>연체 경고</h4>
          <div className="today-action-list">
            {data.alerts.length === 0 ? <p className="small-note">연체 경고 없음</p> : null}
            {data.alerts.slice(0, 10).map((alert) => (
              <div key={String(alert.alert_id)} className={String(alert.severity) === 'RED' ? 'action-row warning-row' : 'action-row'}>
                <span>{String(alert.severity)}</span>
                <div>
                  <strong>{String(alert.message_ko)}</strong>
                  <p>기한 {String(alert.due_date)} / 금액 {money(alert.amount)}</p>
                </div>
                <em>{String(alert.status)}</em>
              </div>
            ))}
          </div>
        </section>

        <section className="estimate-preview-card">
          <h4>결제 처리 기록</h4>
          <div className="today-action-list">
            {data.transactions.length === 0 ? <p className="small-note">처리 기록 없음</p> : null}
            {data.transactions.slice(0, 10).map((transaction) => (
              <div key={String(transaction.transaction_id)} className="action-row">
                <span>{String(transaction.payment_kind)}</span>
                <div>
                  <strong>{money(transaction.amount)}</strong>
                  <p>{String(transaction.transaction_date)} / {String(transaction.notes_ko)}</p>
                </div>
                <em>{String(transaction.transaction_type)}</em>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
