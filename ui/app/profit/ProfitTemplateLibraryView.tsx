import { useEffect, useState } from 'react';
import { formatPercent, formatWon, loadProfitGenerationData } from '../../services/sales-service/salesService';

type ProfitData = {
  summary?: Record<string, unknown>;
  profitTemplates?: Array<Record<string, unknown>>;
  templateMatches?: Array<Record<string, unknown>>;
  profitDecisions?: Array<Record<string, unknown>>;
};

export function ProfitTemplateLibraryView() {
  const [data, setData] = useState<ProfitData | null>(null);

  useEffect(() => {
    loadProfitGenerationData().then((result) => setData(result as ProfitData | null));
  }, []);

  const summary = data?.summary || {};
  const templates = data?.profitTemplates || [];
  const matches = data?.templateMatches || [];
  const decisions = data?.profitDecisions || [];

  return (
    <section className="estimate-panel">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">PROFIT TEMPLATE LIBRARY</span>
          <h4>고마진 프로젝트 복제 라이브러리</h4>
        </div>
      </div>

      <div className="case-library-grid">
        <div className="estimate-preview-card">
          <h5>Profit Summary</h5>
          <div className="case-row"><strong>월 예상 순이익</strong><span>{formatWon(summary.monthlyExpectedNetProfit)}</span></div>
          <div className="case-row warning-row"><strong>손실 방어 금액</strong><span>{formatWon(summary.lossDefenseAmount)}</span></div>
          <div className="case-row"><strong>평균 실질 마진율</strong><span>{formatPercent(summary.averageRealMargin)}</span></div>
          <div className="case-row"><strong>SCALE 템플릿</strong><span>{String(summary.scalableTemplateCount || 0)}개</span></div>
        </div>

        <div className="estimate-preview-card">
          <h5>Low Margin Alerts</h5>
          {decisions.filter((row) => ['BLOCK', 'MODIFY'].includes(String(row.decision))).slice(0, 8).map((row) => (
            <div className={String(row.decision) === 'BLOCK' ? 'case-row warning-row' : 'case-row'} key={String(row.id)}>
              <strong>{String(row.decision)}</strong>
              <span>{formatPercent(row.real_margin)}</span>
              <p>{String(row.estimate_id || row.estimateId)} / {formatWon(row.revenue)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="case-library-grid">
        <div className="estimate-preview-card">
          <h5>Replicable Templates</h5>
          {templates.length === 0 ? <p className="small-note">아직 SCALE 조건을 통과한 완료 프로젝트 템플릿이 없습니다.</p> : null}
          {templates.map((template) => (
            <div className="case-row" key={String(template.id)}>
              <strong>{String(template.project_type || template.projectType)}</strong>
              <span>{formatPercent(template.margin)}</span>
              <p>면적 {String(template.area_range || template.areaRange)} / 공기 {String(template.duration)}일</p>
            </div>
          ))}
        </div>

        <div className="estimate-preview-card">
          <h5>Template Matches</h5>
          {matches.length === 0 ? <p className="small-note">신규 견적에 적용된 고마진 템플릿 매칭 기록이 없습니다.</p> : null}
          {matches.slice(0, 10).map((match) => (
            <div className="case-row" key={String(match.id)}>
              <strong>{String(match.estimate_id || match.estimateId)}</strong>
              <span>{formatPercent(match.match_score || match.matchScore)}</span>
              <p>{String(match.template_id || match.templateId)} / applied {String(Boolean(match.applied))}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
