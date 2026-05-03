import type { EstimateDraft } from '../../services/estimate-service/estimateDraftService';

type Props = {
  draft: EstimateDraft;
};

export function DocumentPreview({ draft }: Props) {
  return (
    <section className="estimate-panel">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">DOCUMENT PREVIEW</span>
          <h4>문서 초안</h4>
        </div>
      </div>
      <div className="document-preview-grid">
        {draft.documents.map((document) => (
          <article key={document.documentId}>
            <strong>{document.displayNameKo}</strong>
            <span>{document.audienceKo}</span>
            <p>{document.statusKo}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
