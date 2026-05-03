import { approveContractDocument, formatWon } from '../../services/client-service/clientContractService';

type Props = {
  contracts: Array<Record<string, unknown>>;
  documents: Array<Record<string, unknown>>;
  approvalLogs: Array<Record<string, unknown>>;
  onRefresh: () => void;
  onMessage: (messageKo: string) => void;
};

export function ContractDocumentView({ contracts, documents, approvalLogs, onRefresh, onMessage }: Props) {
  async function approve(contractId: unknown) {
    const result = await approveContractDocument({ contractId, actor: 'CEO', reasonKo: '계약서 발행 승인' });
    onMessage(result ? '계약서가 승인되었습니다.' : '계약서 승인 실패');
    onRefresh();
  }

  return (
    <div className="case-library-grid">
      <div className="estimate-preview-card">
        <h5>Contract Management</h5>
        {contracts.map((contract) => (
          <div className={contract.contractStatus === 'APPROVED' ? 'case-row' : 'case-row warning-row'} key={String(contract.contractId)}>
            <strong>{String(contract.contractId)}</strong>
            <span>{String(contract.contractStatus)}</span>
            <p>{formatWon(contract.contractAmount)} / 계약금 30% / 중도금 40% / 잔금 30%</p>
            <p>{String(contract.scopeSummaryKo)}</p>
            <p>제외 항목: {String(contract.exclusionsKo)}</p>
            {contract.contractStatus !== 'APPROVED' ? <button onClick={() => approve(contract.contractId)}>계약서 승인</button> : null}
          </div>
        ))}
      </div>

      <div className="estimate-preview-card">
        <h5>Document Generator</h5>
        {documents.map((document) => (
          <div className={document.audience === 'internal' ? 'case-row warning-row' : 'case-row'} key={String(document.documentId)}>
            <strong>{String(document.displayNameKo)}</strong>
            <span>{String(document.documentStatus)}</span>
            <p>{document.audience === 'customer' ? '고객용' : '내부용'} / {String(document.documentType)}</p>
          </div>
        ))}
      </div>

      <div className="estimate-preview-card">
        <h5>Contract Approval Log</h5>
        {approvalLogs.length === 0 ? <p className="small-note">계약 승인 로그가 없습니다.</p> : null}
        {approvalLogs.map((log) => (
          <div className="case-row" key={String(log.contractApprovalLogId)}>
            <strong>{String(log.actionType)}</strong>
            <span>{String(log.afterStatus)}</span>
            <p>{String(log.reasonKo)} / {String(log.actor)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
