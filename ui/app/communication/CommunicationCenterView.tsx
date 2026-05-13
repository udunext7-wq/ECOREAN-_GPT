import { useEffect, useMemo, useState } from 'react';
import {
  cancelCommunicationMessage,
  generateCommunicationMessage,
  loadCommunicationCenterData,
  markCommunicationMessageSent,
  type CommunicationCenterData,
  type CommunicationMessage
} from '../../services/communication-service/communicationService';

const quickCreateButtons = [
  { labelKo: '계약 안내 생성', messageType: 'CLIENT_CONTRACT_NOTICE', relatedEntityType: 'Contract', targetType: 'CLIENT' },
  { labelKo: '일정 안내 생성', messageType: 'CLIENT_SCHEDULE_NOTICE', relatedEntityType: 'Schedule', targetType: 'CLIENT' },
  { labelKo: '발주 메시지 생성', messageType: 'VENDOR_PURCHASE_ORDER', relatedEntityType: 'PurchaseOrder', targetType: 'VENDOR' },
  { labelKo: '추가공사 승인 요청', messageType: 'CLIENT_CHANGE_ORDER_APPROVAL', relatedEntityType: 'ChangeOrder', targetType: 'CLIENT' },
  { labelKo: '검수 결과 공유', messageType: 'CLIENT_INSPECTION_RESULT', relatedEntityType: 'Inspection', targetType: 'CLIENT' },
  { labelKo: '하자 안내 생성', messageType: 'CLIENT_DEFECT_RECEIVED', relatedEntityType: 'Defect', targetType: 'CLIENT' },
  { labelKo: '결제 안내 생성', messageType: 'CLIENT_PAYMENT_REQUEST', relatedEntityType: 'Receivable', targetType: 'CLIENT' }
];

const sectionMap = [
  { titleKo: '고객 안내', filter: (message: CommunicationMessage) => message.target_type === 'CLIENT' && message.message_type.includes('NOTICE') },
  { titleKo: '협력업체 발주', filter: (message: CommunicationMessage) => message.target_type === 'VENDOR' },
  { titleKo: '추가공사 승인 요청', filter: (message: CommunicationMessage) => message.message_type === 'CLIENT_CHANGE_ORDER_APPROVAL' },
  { titleKo: '검수 결과 공유', filter: (message: CommunicationMessage) => message.message_type === 'CLIENT_INSPECTION_RESULT' },
  { titleKo: '하자/AS 안내', filter: (message: CommunicationMessage) => message.message_type.includes('DEFECT') },
  { titleKo: '결제 안내', filter: (message: CommunicationMessage) => message.message_type === 'CLIENT_PAYMENT_REQUEST' },
  { titleKo: '일정 안내', filter: (message: CommunicationMessage) => message.message_type === 'CLIENT_SCHEDULE_NOTICE' },
  { titleKo: '발송 기록', filter: (message: CommunicationMessage) => message.status === 'SENT' }
];

function statusLabel(status: string) {
  if (status === 'READY') return '발송 준비';
  if (status === 'SENT') return '발송 완료';
  if (status === 'CANCELLED') return '취소';
  if (status === 'FAILED') return '실패';
  return '초안';
}

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    CLIENT_ESTIMATE_NOTICE: '견적 안내',
    CLIENT_CONTRACT_NOTICE: '계약 안내',
    CLIENT_SCHEDULE_NOTICE: '일정 안내',
    CLIENT_PAYMENT_REQUEST: '결제 요청',
    CLIENT_CHANGE_ORDER_APPROVAL: '추가공사 승인',
    CLIENT_INSPECTION_RESULT: '검수 결과',
    CLIENT_DEFECT_RECEIVED: '하자 접수',
    CLIENT_DEFECT_COMPLETED: '하자 완료',
    VENDOR_PURCHASE_ORDER: '발주 요청',
    VENDOR_DELIVERY_REQUEST: '납품 요청',
    VENDOR_SHORTAGE_NOTICE: '입고 부족',
    INTERNAL_APPROVAL_NOTICE: '내부 승인'
  };
  return labels[type] || type;
}

export function CommunicationCenterView() {
  const [data, setData] = useState<CommunicationCenterData | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [copiedMessageKo, setCopiedMessageKo] = useState('');
  const [fallbackEntityId, setFallbackEntityId] = useState('SAMPLE');

  async function refresh() {
    setData(await loadCommunicationCenterData());
  }

  useEffect(() => {
    refresh();
  }, []);

  const activeMessage = useMemo(() => {
    if (!data?.messages.length) return null;
    return data.messages.find((message) => message.id === activeMessageId) || data.messages[0];
  }, [data, activeMessageId]);

  async function handleQuickCreate(button: (typeof quickCreateButtons)[number]) {
    const result = await generateCommunicationMessage({
      messageType: button.messageType,
      relatedEntityType: button.relatedEntityType,
      relatedEntityId: fallbackEntityId,
      targetType: button.targetType,
      status: 'DRAFT',
      data: {
        customerName: '고객명 확인 필요',
        siteName: '현장명 확인 필요',
        vendorName: '협력업체 확인 필요',
        amountKo: '금액 확인 필요',
        notesKo: '관련 문서에서 생성된 초안입니다.'
      }
    });
    const messageId = String((result as Record<string, unknown> | null)?.messageId || '');
    await refresh();
    if (messageId) setActiveMessageId(messageId);
  }

  async function copyMessage(message: CommunicationMessage) {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${message.title}\n\n${message.body}`);
      setCopiedMessageKo('메시지를 클립보드에 복사했습니다.');
      return;
    }
    setCopiedMessageKo('클립보드 API를 사용할 수 없습니다. 본문을 직접 선택해 복사하세요.');
  }

  async function markSent(messageId: string) {
    await markCommunicationMessageSent(messageId);
    await refresh();
  }

  async function cancel(messageId: string) {
    await cancelCommunicationMessage(messageId);
    await refresh();
  }

  if (!data) {
    return <div className="drawer-block">커뮤니케이션 데이터를 불러오는 중입니다.</div>;
  }

  return (
    <div className="execution-panel">
      <section className="estimate-preview-card">
        <div className="estimate-panel-head">
          <div>
            <span className="eyebrow">COMMUNICATION CENTER</span>
            <h3>외부 커뮤니케이션 센터</h3>
            <p>계약, 공정, 발주, 검수, 하자, 결제 데이터를 복사 가능한 한글 메시지로 변환합니다. 실제 발송은 아직 하지 않습니다.</p>
          </div>
          <div className="button-row">
            <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'clientPortal' }))}>고객 포털</button>
            <button onClick={refresh}>새로고침</button>
          </div>
        </div>

        <div className="case-library-grid">
          <div className="estimate-preview-card">
            <h5>전체 메시지</h5>
            <strong>{data.summary.totalMessages}건</strong>
            <p>초안/준비/완료 전체 기록</p>
          </div>
          <div className="estimate-preview-card warning-row">
            <h5>발송 준비</h5>
            <strong>{data.summary.readyCount}건</strong>
            <p>대표 확인 후 복사 발송 가능</p>
          </div>
          <div className="estimate-preview-card">
            <h5>발송 완료</h5>
            <strong>{data.summary.sentCount}건</strong>
            <p>수동 발송 완료 처리된 기록</p>
          </div>
        </div>
      </section>

      <section className="estimate-preview-card">
        <div className="estimate-panel-head">
          <div>
            <span className="eyebrow">GENERATE</span>
            <h3>메시지 생성</h3>
          </div>
          <label className="field-stack">
            관련 문서 ID
            <input value={fallbackEntityId} onChange={(event) => setFallbackEntityId(event.target.value)} />
          </label>
        </div>
        <div className="action-command-grid">
          {quickCreateButtons.map((button) => (
            <button key={button.messageType} className="command command-order" onClick={() => handleQuickCreate(button)}>
              {button.labelKo}
            </button>
          ))}
        </div>
      </section>

      <div className="case-library-grid">
        <section className="estimate-preview-card">
          <h4>섹션별 메시지</h4>
          <div className="today-action-list">
            {sectionMap.map((section) => {
              const count = data.messages.filter(section.filter).length;
              return (
                <button key={section.titleKo} className="action-row" onClick={() => setActiveMessageId(data.messages.find(section.filter)?.id || data.messages[0]?.id || null)}>
                  <span>{count}</span>
                  <div>
                    <strong>{section.titleKo}</strong>
                    <p>{count > 0 ? '관련 메시지 있음' : '데이터 없음'}</p>
                  </div>
                  <em>보기</em>
                </button>
              );
            })}
          </div>
        </section>

        <section className="estimate-preview-card">
          <h4>메시지 목록</h4>
          <div className="today-action-list">
            {data.messages.length === 0 ? <p className="small-note">아직 생성된 메시지가 없습니다.</p> : null}
            {data.messages.slice(0, 20).map((message) => (
              <button key={message.id} className={message.status === 'READY' ? 'action-row warning-row' : 'action-row'} onClick={() => setActiveMessageId(message.id)}>
                <span>{statusLabel(message.status)}</span>
                <div>
                  <strong>{typeLabel(message.message_type)}</strong>
                  <p>{message.target_name} / {message.related_entity_id}</p>
                </div>
                <em>열기</em>
              </button>
            ))}
          </div>
        </section>
      </div>

      {activeMessage ? (
        <section className="estimate-preview-card">
          <div className="estimate-panel-head">
            <div>
              <span className="eyebrow">{activeMessage.target_type}</span>
              <h3>{activeMessage.title}</h3>
              <p>{activeMessage.target_name} / {statusLabel(activeMessage.status)}</p>
            </div>
            <div className="approval-actions-strong">
              <button className="approve-button" onClick={() => copyMessage(activeMessage)}>복사</button>
              <button className="approve-button" onClick={() => markSent(activeMessage.id)}>발송 완료 처리</button>
              <button className="reject-button" onClick={() => cancel(activeMessage.id)}>취소</button>
            </div>
          </div>
          {copiedMessageKo ? <p className="small-note">{copiedMessageKo}</p> : null}
          <pre className="document-preview">{activeMessage.body}</pre>
        </section>
      ) : null}

      <section className="estimate-preview-card">
        <h4>발송 기록</h4>
        <div className="today-action-list">
          {data.sendLogs.length === 0 ? <p className="small-note">발송 완료 처리 기록이 없습니다.</p> : null}
          {data.sendLogs.slice(0, 12).map((log) => (
            <div key={String(log.id)} className="action-row">
              <span>{String(log.status)}</span>
              <div>
                <strong>{String(log.message_id)}</strong>
                <p>{String(log.result_message)}</p>
              </div>
              <em>{String(log.channel)}</em>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
