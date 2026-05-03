import { useEffect, useState } from 'react';
import { ClientDetailView } from './ClientDetailView';
import { ContractDocumentView } from './ContractDocumentView';
import { loadClientContractData, type ClientContractData } from '../../services/client-service/clientContractService';

export function ClientDashboardView() {
  const [data, setData] = useState<ClientContractData | null>(null);
  const [messageKo, setMessageKo] = useState('고객/계약 문서 데이터를 불러오는 중입니다.');

  async function refresh() {
    const next = await loadClientContractData();
    setData(next);
    setMessageKo(next ? 'Lead WON 이후 고객/계약/문서 흐름 기준' : 'Electron DB 연결 없음');
  }

  useEffect(() => {
    refresh();
  }, []);

  const draftContracts = (data?.contracts || []).filter((contract) => contract.contractStatus !== 'APPROVED').length;
  const customerDocs = (data?.documents || []).filter((document) => document.audience === 'customer').length;
  const internalDocs = (data?.documents || []).filter((document) => document.audience === 'internal').length;

  return (
    <section className="estimate-panel">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">CLIENT & CONTRACT</span>
          <h4>Client & Contract Document Layer</h4>
        </div>
        <button onClick={refresh}>새로고침</button>
      </div>
      <p className="small-note">{messageKo}</p>

      <div className="case-library-grid">
        <div className="estimate-preview-card">
          <h5>Contract Gate</h5>
          <div className={draftContracts > 0 ? 'case-row warning-row' : 'case-row'}>
            <strong>계약 승인 대기</strong>
            <span>{draftContracts}건</span>
            <p>계약서 승인 전 EXECUTION_READY 전환 금지</p>
          </div>
          <div className="case-row"><strong>고객용 문서</strong><span>{customerDocs}건</span></div>
          <div className="case-row"><strong>내부용 문서</strong><span>{internalDocs}건</span></div>
        </div>
        <ClientDetailView clients={data?.clients || []} />
      </div>

      <ContractDocumentView
        contracts={data?.contracts || []}
        documents={data?.documents || []}
        approvalLogs={data?.approvalLogs || []}
        onRefresh={refresh}
        onMessage={setMessageKo}
      />
    </section>
  );
}
