import { useEffect, useState } from 'react';
import type { BathroomEstimateInput, BathroomEstimatePreview } from '../../services/bathroom-estimate-service/bathroomEstimateService';
import {
  decideAiRecommendation,
  loadAiEstimateIntelligence,
  type AIEstimateIntelligence
} from '../../services/estimate-service/aiEstimateIntelligenceService';

type Props = {
  input: BathroomEstimateInput;
  preview: BathroomEstimatePreview | null;
};

function riskKo(level: unknown) {
  const value = String(level || 'LOW');
  const map: Record<string, string> = {
    LOW: '낮음',
    MEDIUM: '주의',
    HIGH: '높음',
    CRITICAL: '치명',
    RED: '치명',
    ORANGE: '높음',
    YELLOW: '주의',
    INFO: '낮음'
  };
  return map[value] || value;
}

function percent(value: unknown) {
  return `${(Number(value || 0) * 100).toFixed(1)}%`;
}

function severityClass(severity: unknown) {
  const value = String(severity || '').toLowerCase();
  if (value === 'red' || value === 'critical') return 'danger';
  if (value === 'orange' || value === 'high') return 'warning';
  if (value === 'yellow' || value === 'medium') return 'notice';
  return 'success';
}

export function AIEstimateAssistantPanel({ input, preview }: Props) {
  const [data, setData] = useState<AIEstimateIntelligence | null>(null);
  const [messageKo, setMessageKo] = useState('AI 견적 추천을 준비 중입니다.');
  const [busy, setBusy] = useState(false);

  async function refresh(persist = false) {
    setBusy(true);
    try {
      const next = await loadAiEstimateIntelligence(input, preview ? 'AI-BATHROOM-WIZARD' : undefined, persist);
      setData(next);
      setMessageKo('현재 입력값 기준 AI 견적 추천이 갱신되었습니다.');
    } catch (error) {
      setMessageKo(error instanceof Error ? error.message : 'AI 견적 추천 생성 중 오류가 발생했습니다.');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refresh(false);
  }, [input.constructionMethod, input.waterproofMethod, input.tileWallType, input.tileFloorType, input.fixtureGrade, input.bathroomAreaM2, input.options.showerBooth, input.options.zenda, input.options.bathtub]);

  async function act(id: string, actionType: 'APPLY' | 'IGNORE' | 'DETAIL') {
    if (!data?.estimateId) return;
    await decideAiRecommendation(data.estimateId, id, actionType, actionType === 'IGNORE' ? '대표가 경고를 확인 후 무시 처리' : '대표가 추천을 검토');
    setMessageKo(actionType === 'APPLY' ? '추천 적용 로그가 기록되었습니다.' : actionType === 'IGNORE' ? '무시 처리 로그가 기록되었습니다.' : '상세 보기 로그가 기록되었습니다.');
    await refresh(true);
  }

  const recommendations = data?.recommendations || [];
  const warnings = data?.warnings || [];
  const template = data?.suggestedTemplate;
  const marginRisk = data?.riskScore?.marginRisk || {};
  const defectRisk = data?.riskScore?.defectRisk || {};
  const costLeakRisk = data?.riskScore?.costLeakRisk || {};
  const schedule = data?.suggestedSchedule || {};

  return (
    <aside className="ai-estimate-assistant">
      <div className="section-header">
        <div>
          <span className="eyebrow">AI ESTIMATE INTELLIGENCE</span>
          <h3>AI 견적 추천</h3>
          <p>마감 원가누수, 보정 룰, 고마진 템플릿을 기준으로 견적 실수를 먼저 잡습니다.</p>
        </div>
        <button onClick={() => refresh(true)} disabled={busy}>AI 분석</button>
      </div>

      <div className="ai-risk-grid">
        <div className={`ai-risk-card ${severityClass(marginRisk.level)}`}>
          <span>예상 마진 위험</span>
          <strong>{riskKo(marginRisk.level)}</strong>
          <small>{String(marginRisk.messageKo || '')} {marginRisk.adjustedRate != null ? `보정 후 ${percent(marginRisk.adjustedRate)}` : ''}</small>
        </div>
        <div className={`ai-risk-card ${severityClass(defectRisk.level)}`}>
          <span>예상 하자 위험</span>
          <strong>{riskKo(defectRisk.level)}</strong>
          <small>필수 검수 {Array.isArray(defectRisk.checklist) ? defectRisk.checklist.length : 0}개</small>
        </div>
        <div className={`ai-risk-card ${severityClass(costLeakRisk.level)}`}>
          <span>예상 원가 누수</span>
          <strong>{riskKo(costLeakRisk.level)}</strong>
          <small>{Array.isArray(costLeakRisk.recommendations) ? costLeakRisk.recommendations.length : 0}개 보정 권장</small>
        </div>
        <div className="ai-risk-card">
          <span>예상 공기</span>
          <strong>{String(schedule.displayKo || '데이터 없음')}</strong>
          <small>{Array.isArray(schedule.reasons) ? schedule.reasons[0] : ''}</small>
        </div>
      </div>

      {template ? (
        <section className="drawer-block">
          <h4>고마진 템플릿 추천</h4>
          <p>{String(template.templateNameKo)} / 이전 최종 마진율 {percent(template.previousMarginRate)} / 매칭 {percent(template.matchScore)}</p>
          <p>{String(template.recommendationKo)}</p>
          <button onClick={() => act('AIR-AI-BATHROOM-WIZARD-001', 'APPLY')}>템플릿 적용</button>
        </section>
      ) : (
        <section className="drawer-block"><h4>고마진 템플릿 추천</h4><p>현재 매칭 가능한 템플릿이 없습니다.</p></section>
      )}

      <section className="drawer-block">
        <h4>누락 위험</h4>
        {warnings.length ? warnings.map((warning, index) => (
          <div className={`ai-list-item ${severityClass(warning.severity)}`} key={`${warning.titleKo}-${index}`}>
            <strong>{String(warning.titleKo)}</strong>
            <p>{String(warning.descriptionKo)}</p>
            <small>{String(warning.suggestedActionKo)}</small>
            <div className="button-row">
              <button onClick={() => act(`AIW-${data?.estimateId}-${String(index + 1).padStart(3, '0')}`, 'DETAIL')}>상세 보기</button>
              <button onClick={() => act(`AIW-${data?.estimateId}-${String(index + 1).padStart(3, '0')}`, 'IGNORE')}>경고 확인</button>
            </div>
          </div>
        )) : <p>현재 입력 기준 치명적인 누락 위험은 없습니다.</p>}
      </section>

      <section className="drawer-block">
        <h4>추천 공정 / 추천 자재</h4>
        <p>추천 공정: {(data?.recommendedProcesses || []).join(', ') || '데이터 없음'}</p>
        <p>추천 자재: {(data?.recommendedMaterials || []).join(', ') || '데이터 없음'}</p>
      </section>

      <section className="drawer-block">
        <h4>적용된 보정 룰</h4>
        {data?.appliedCalibrationRules?.length ? data.appliedCalibrationRules.map((rule, index) => (
          <div className="ai-list-item warning" key={`${rule.id}-${index}`}>
            <strong>{String(rule.source_category || rule.adjustment_target)}</strong>
            <p>{String(rule.reason)}</p>
            <small>권장 보정값 {String(rule.adjustment_value)}</small>
            <button onClick={() => act(`AIR-${data.estimateId}-${String(index + 1).padStart(3, '0')}`, 'APPLY')}>보정 룰 적용</button>
          </div>
        )) : <p>아직 적용할 보정 룰이 없습니다.</p>}
      </section>

      <section className="drawer-block">
        <h4>추천 목록</h4>
        {recommendations.map((item, index) => (
          <div className={`ai-list-item ${severityClass(item.severity)}`} key={`${item.titleKo}-${index}`}>
            <strong>{String(item.titleKo)}</strong>
            <p>{String(item.descriptionKo)}</p>
            <small>{String(item.suggestedActionKo)}</small>
            <div className="button-row">
              <button onClick={() => act(`AIR-${data?.estimateId}-${String(index + 1).padStart(3, '0')}`, 'APPLY')}>추천 적용</button>
              <button onClick={() => act(`AIR-${data?.estimateId}-${String(index + 1).padStart(3, '0')}`, 'IGNORE')}>무시</button>
            </div>
          </div>
        ))}
      </section>
      <p className="assistant-message">{messageKo}</p>
    </aside>
  );
}
