import { useEffect, useState } from 'react';
import { formatPercent, formatWon, loadProfitGenerationData } from '../../services/sales-service/salesService';

type ProfitAutomationData = {
  automationDashboard?: {
    leadQualificationStatus?: Array<Record<string, unknown>>;
    pceStatus?: Record<string, unknown>;
    liveMarginRiskProjects?: Array<Record<string, unknown>>;
    costLeakRootCauses?: Array<Record<string, unknown>>;
    preventionRules?: Array<Record<string, unknown>>;
    autoBlockRules?: Array<Record<string, unknown>>;
    highMarginTemplates?: Array<Record<string, unknown>>;
    templateRecommendations?: Array<Record<string, unknown>>;
    automationLogs?: Array<Record<string, unknown>>;
  };
};

function CountBadge({ labelKo, value }: { labelKo: string; value: unknown }) {
  return (
    <div className="case-row">
      <strong>{labelKo}</strong>
      <span>{String(value || 0)}건</span>
    </div>
  );
}

export function ProfitAutomationDashboardView() {
  const [data, setData] = useState<ProfitAutomationData | null>(null);

  useEffect(() => {
    loadProfitGenerationData().then((result) => setData(result as ProfitAutomationData | null));
  }, []);

  const dashboard = data?.automationDashboard || {};
  const pceStatus = dashboard.pceStatus || {};
  const qualification = dashboard.leadQualificationStatus || [];
  const liveMarginEvents = dashboard.liveMarginRiskProjects || [];
  const rootCauses = dashboard.costLeakRootCauses || [];
  const preventionRules = dashboard.preventionRules || [];
  const autoBlockRules = dashboard.autoBlockRules || [];
  const templates = dashboard.highMarginTemplates || [];
  const recommendations = dashboard.templateRecommendations || [];
  const logs = dashboard.automationLogs || [];

  return (
    <section className="estimate-panel">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">PROFIT AUTOMATION LOOP</span>
          <h4>수익 자동화 현황</h4>
        </div>
      </div>

      <div className="case-library-grid">
        <div className="estimate-preview-card">
          <h5>리드 선별 자동화</h5>
          {qualification.map((row) => (
            <CountBadge key={String(row.decision)} labelKo={String(row.decision)} value={row.count} />
          ))}
        </div>

        <div className="estimate-preview-card">
          <h5>PCE 자동 검증</h5>
          <CountBadge labelKo="자동 차단" value={pceStatus.BLOCK} />
          <CountBadge labelKo="수정 필요" value={pceStatus.MODIFY} />
          <CountBadge labelKo="실행 가능" value={pceStatus.GO} />
          <CountBadge labelKo="복제 대상" value={pceStatus.SCALE} />
        </div>

        <div className="estimate-preview-card warning-row">
          <h5>실시간 마진 위험</h5>
          {liveMarginEvents.length === 0 ? <p className="small-note">현재 실시간 마진 위험 이벤트가 없습니다.</p> : null}
          {liveMarginEvents.slice(0, 6).map((event) => (
            <div className="case-row warning-row" key={String(event.id)}>
              <strong>{String(event.project_id)}</strong>
              <span>{formatPercent(event.current_margin_rate)}</span>
              <p>{String(event.decision)} / threshold {formatPercent(event.threshold)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="case-library-grid">
        <div className="estimate-preview-card">
          <h5>원가 누수 원인</h5>
          {rootCauses.slice(0, 8).map((cause) => (
            <div className="case-row" key={String(cause.root_cause_id)}>
              <strong>{String(cause.root_cause_name_ko || cause.root_cause_type)}</strong>
              <span>{formatWon(cause.financial_impact)}</span>
              <p>{String(cause.recommended_prevention || cause.reason_ko)}</p>
            </div>
          ))}
        </div>

        <div className="estimate-preview-card">
          <h5>자동 예방 룰</h5>
          {preventionRules.slice(0, 8).map((rule) => (
            <div className="case-row" key={String(rule.rule_id)}>
              <strong>{String(rule.item_name_ko)}</strong>
              <span>{String(rule.enforcement_level)}</span>
              <p>{String(rule.reason_ko)}</p>
            </div>
          ))}
        </div>

        <div className="estimate-preview-card warning-row">
          <h5>자동 차단 룰</h5>
          {autoBlockRules.length === 0 ? <p className="small-note">반복 저마진 차단 룰이 아직 없습니다.</p> : null}
          {autoBlockRules.slice(0, 8).map((rule) => (
            <div className="case-row warning-row" key={String(rule.id)}>
              <strong>{String(rule.rule_type)} / {String(rule.target_key)}</strong>
              <span>{String(rule.decision)}</span>
              <p>{String(rule.reason)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="case-library-grid">
        <div className="estimate-preview-card">
          <h5>고마진 템플릿</h5>
          {templates.slice(0, 8).map((template) => (
            <div className="case-row" key={String(template.id)}>
              <strong>{String(template.project_type)}</strong>
              <span>{formatPercent(template.margin)}</span>
              <p>{String(template.area_range)} / {String(template.location_ko)}</p>
            </div>
          ))}
        </div>

        <div className="estimate-preview-card">
          <h5>다음 견적 추천</h5>
          {recommendations.slice(0, 8).map((recommendation) => (
            <div className="case-row" key={String(recommendation.id)}>
              <strong>{String(recommendation.estimate_id)}</strong>
              <span>{formatPercent(recommendation.expected_margin)}</span>
              <p>{String(recommendation.template_id)} / match {formatPercent(recommendation.match_score)}</p>
            </div>
          ))}
        </div>

        <div className="estimate-preview-card">
          <h5>자동 판단 로그</h5>
          {logs.slice(0, 10).map((log) => (
            <div className="case-row" key={String(log.id)}>
              <strong>{String(log.source_module)}</strong>
              <span>{String(log.decision)}</span>
              <p>{String(log.trigger_event)} / {String(log.reason)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
