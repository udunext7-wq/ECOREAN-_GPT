import { useEffect, useMemo, useState } from 'react';
import type { ProjectSummary } from '../../src/types/dashboard';
import {
  calculateCompletionPreview,
  completeProject,
  loadProjectCompletionReadiness,
  type ActualCosts,
  type CompletionReadiness
} from '../../services/completion-service/projectCompletionService';
import { ActualCostInputView } from './ActualCostInputView';
import { DefectAndClaimReportView } from './DefectAndClaimReportView';
import { EstimateVsActualView } from './EstimateVsActualView';

type Props = {
  project: ProjectSummary;
};

const defaultActualCosts: ActualCosts = {
  materialCost: 0,
  laborCost: 0,
  subcontractCost: 0,
  equipmentCost: 0,
  wasteCost: 0,
  transportCost: 0
};

function splitLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function ProjectCompletionView({ project }: Props) {
  const [readiness, setReadiness] = useState<CompletionReadiness | null>(null);
  const [messageKo, setMessageKo] = useState('완료 처리 가능 여부를 확인하는 중입니다.');
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().slice(0, 10));
  const [finalScopeKo, setFinalScopeKo] = useState('24평 구축 아파트 전체 리모델링 준공');
  const [customerFeedbackKo, setCustomerFeedbackKo] = useState('고객 피드백 입력 필요');
  const [finalContractAmount, setFinalContractAmount] = useState(60000000);
  const [finalAdditionalWorkAmount, setFinalAdditionalWorkAmount] = useState(0);
  const [actualCosts, setActualCosts] = useState<ActualCosts>(defaultActualCosts);
  const [estimatedDurationDays, setEstimatedDurationDays] = useState(90);
  const [actualDurationDays, setActualDurationDays] = useState(90);
  const [defectsText, setDefectsText] = useState('');
  const [claimsText, setClaimsText] = useState('');
  const [delayReasonsText, setDelayReasonsText] = useState('');
  const [reworkRequired, setReworkRequired] = useState(false);

  async function refreshReadiness() {
    const next = await loadProjectCompletionReadiness(project.projectId);
    setReadiness(next);
    if (!next) setMessageKo('Electron DB 연결 없음');
    else setMessageKo(`완료 처리 상태: ${next.completionStatus}`);
  }

  useEffect(() => {
    refreshReadiness();
  }, [project.projectId]);

  const preview = useMemo(
    () => calculateCompletionPreview({ finalContractAmount, finalAdditionalWorkAmount, actualCosts, estimatedDurationDays, actualDurationDays }),
    [finalContractAmount, finalAdditionalWorkAmount, actualCosts, estimatedDurationDays, actualDurationDays]
  );

  async function handleComplete() {
    try {
      await completeProject({
        projectId: project.projectId,
        completionDate,
        finalScopeKo,
        customerFeedbackKo,
        finalContractAmount,
        finalAdditionalWorkAmount,
        actualCosts,
        estimatedDurationDays,
        actualDurationDays,
        delayReasonsKo: splitLines(delayReasonsText),
        defects: splitLines(defectsText),
        claims: splitLines(claimsText),
        reworkRequired
      });
      setMessageKo('프로젝트 완료 처리 및 오차 분석 저장 완료');
      await refreshReadiness();
    } catch (error) {
      setMessageKo(`완료 처리 실패: ${error instanceof Error ? error.message : 'UNKNOWN_ERROR'}`);
    }
  }

  return (
    <section className="estimate-panel">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">PROJECT COMPLETION FLOW</span>
          <h4>준공 / 완료 처리</h4>
        </div>
        <span className="preliminary-badge">{readiness?.completionStatus ?? 'CHECKING'}</span>
      </div>

      <p className="small-note">{messageKo}</p>

      {readiness?.blockingReasonsKo?.length ? (
        <div className="execution-blocking">
          <strong>완료 처리 차단</strong>
          <span>{readiness.blockingReasonsKo.join(' ')}</span>
        </div>
      ) : null}

      {readiness?.warningsKo?.length ? (
        <div className="execution-warning-list">
          {readiness.warningsKo.map((warning) => (
            <span key={warning}>{warning}</span>
          ))}
        </div>
      ) : null}

      <div className="completion-date-row">
        <label>
          <span>준공일</span>
          <input type="date" value={completionDate} onChange={(event) => setCompletionDate(event.target.value)} />
        </label>
      </div>

      <div className="site-grid completion-grid">
        <ActualCostInputView
          finalContractAmount={finalContractAmount}
          finalAdditionalWorkAmount={finalAdditionalWorkAmount}
          actualCosts={actualCosts}
          estimatedDurationDays={estimatedDurationDays}
          actualDurationDays={actualDurationDays}
          onFinalContractAmountChange={setFinalContractAmount}
          onFinalAdditionalWorkAmountChange={setFinalAdditionalWorkAmount}
          onActualCostsChange={setActualCosts}
          onEstimatedDurationDaysChange={setEstimatedDurationDays}
          onActualDurationDaysChange={setActualDurationDays}
        />
        <DefectAndClaimReportView
          finalScopeKo={finalScopeKo}
          customerFeedbackKo={customerFeedbackKo}
          defectsText={defectsText}
          claimsText={claimsText}
          delayReasonsText={delayReasonsText}
          reworkRequired={reworkRequired}
          onFinalScopeChange={setFinalScopeKo}
          onCustomerFeedbackChange={setCustomerFeedbackKo}
          onDefectsTextChange={setDefectsText}
          onClaimsTextChange={setClaimsText}
          onDelayReasonsTextChange={setDelayReasonsText}
          onReworkRequiredChange={setReworkRequired}
        />
        <EstimateVsActualView {...preview} />
      </div>

      <div className="estimate-save-bar">
        <div>
          <strong>완료 저장</strong>
          <span>Completion Report, Actual Cost, Final Margin, Estimate vs Actual, Master DB 후보를 저장합니다.</span>
        </div>
        <button onClick={handleComplete} disabled={!readiness?.canComplete || preview.totalActualCost <= 0}>
          완료 처리
        </button>
      </div>
    </section>
  );
}
