import type { EstimateDraft } from '../../services/estimate-service/estimateDraftService';

type Props = {
  draft: EstimateDraft;
};

export function ScheduleDraftPreview({ draft }: Props) {
  return (
    <section className="estimate-panel">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">SCHEDULE DRAFT</span>
          <h4>공정표 초안</h4>
        </div>
      </div>
      <div className="schedule-draft-list">
        {draft.scheduleDraft.map((item) => (
          <article key={item.order}>
            <b>{item.order}</b>
            <div>
              <strong>{item.processKo}</strong>
              <span>선후행: {item.dependencyKo}</span>
              <span>발주: {item.leadTimeKo}</span>
              <span>검수: {item.inspectionKo}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
