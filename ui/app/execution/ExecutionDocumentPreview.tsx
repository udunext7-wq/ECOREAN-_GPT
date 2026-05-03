import type { ExecutionDocumentPreview as ExecutionDocument } from '../../services/project-execution-service/projectExecutionService';

type Props = {
  documents: ExecutionDocument[];
};

export function ExecutionDocumentPreview({ documents }: Props) {
  return (
    <div className="execution-document-grid">
      {documents.map((document) => (
        <article key={document.documentType}>
          <strong>{document.displayNameKo}</strong>
          <span>{document.documentStatus}</span>
          {document.warningsKo.length > 0 ? (
            <p>{document.warningsKo.join(' ')}</p>
          ) : (
            <p>실행 문서 생성 준비 완료</p>
          )}
        </article>
      ))}
    </div>
  );
}
