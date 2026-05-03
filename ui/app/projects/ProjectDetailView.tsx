import { useState } from 'react';
import { NewEstimateWizard } from '../estimate/NewEstimateWizard';
import { ProjectExecutionView } from '../execution/ProjectExecutionView';
import { SiteOperationView } from '../site/SiteOperationView';
import { ProjectCompletionView } from '../completion/ProjectCompletionView';
import type { ProjectSummary } from '../../src/types/dashboard';
import { loadEstimateDraftForProject, type LoadedEstimateDraft } from '../../services/estimate-service/estimateDraftService';
import { formatRate, formatWon, getCostCaptureDashboard, type CostLeakRootCause, type ProcessCostLeak } from '../../services/cost-capture-service/costCaptureService';

type Props = {
  project: ProjectSummary;
};

export function ProjectDetailView({ project }: Props) {
  const [loadedDraft, setLoadedDraft] = useState<LoadedEstimateDraft | null>(null);
  const [loadStatusKo, setLoadStatusKo] = useState('저장된 예비 견적을 불러올 수 있습니다.');
  const [processCostLeaks, setProcessCostLeaks] = useState<ProcessCostLeak[]>([]);
  const [rootCauses, setRootCauses] = useState<CostLeakRootCause[]>([]);

  async function handleLoadDraft() {
    setLoadStatusKo('예비 견적 로드 중...');
    try {
      const result = await loadEstimateDraftForProject(project.projectId);
      if (result) {
        setLoadedDraft(result);
        setLoadStatusKo(`로드 완료: ${result.projectNameKo}`);
      } else {
        setLoadStatusKo('이 프로젝트에는 저장된 예비 견적 Draft가 없습니다.');
      }
    } catch (error) {
      setLoadStatusKo(`로드 실패: ${error instanceof Error ? error.message : 'UNKNOWN_ERROR'}`);
    }
  }

  async function handleLoadCostLeaks() {
    const dashboard = await getCostCaptureDashboard();
    setProcessCostLeaks(dashboard.processCostLeaks.filter((item) => item.projectId === project.projectId));
    setRootCauses(dashboard.rootCauses.filter((item) => item.projectId === project.projectId));
  }

  return (
    <div className="project-detail-admin">
      <section className="estimate-panel">
        <div className="estimate-panel-head">
          <div>
            <span className="eyebrow">PROJECT DETAIL</span>
            <h4>{project.projectNameKo}</h4>
          </div>
          <span className="preliminary-badge">{project.profitRate === '예비' ? 'PRELIMINARY' : project.riskLevel}</span>
        </div>
        <p className="small-note">{project.nextActionKo}</p>
        <div className="estimate-save-bar">
          <div>
            <strong>Saved Estimate Draft</strong>
            <span>{loadStatusKo}</span>
          </div>
          <button onClick={handleLoadDraft}>예비 견적 다시 열기</button>
        </div>
        <div className="cost-leak-list">
          {rootCauses.map((item) => (
            <article key={item.rootCauseId} className="cost-leak yellow">
              <strong>{item.itemNameKo} - {item.rootCauseNameKo}</strong>
              <p>{item.reasonKo}</p>
              <em>{item.status}</em>
            </article>
          ))}
        </div>
      </section>

      <section className="estimate-panel">
        <div className="estimate-panel-head">
          <div>
            <span className="eyebrow">PROCESS COST LEAK</span>
            <h4>공정별 원가 누수</h4>
          </div>
          <button onClick={handleLoadCostLeaks}>Cost Leak 조회</button>
        </div>
        {processCostLeaks.length === 0 ? <p className="small-note">조회된 공정별 Cost Leak이 없습니다.</p> : null}
        <div className="cost-leak-list">
          {processCostLeaks.map((item) => (
            <article key={item.leakId} className={`cost-leak ${item.severity.toLowerCase()}`}>
              <strong>{item.itemNameKo}</strong>
              <p>{item.alertMessageKo}</p>
              <em>{formatWon(item.baselineAmount)} → {formatWon(item.actualAmount)} / {formatRate(item.varianceRate)}</em>
            </article>
          ))}
        </div>
      </section>

      <ProjectExecutionView project={project} />
      <SiteOperationView project={project} />
      <ProjectCompletionView project={project} />

      {loadedDraft ? <NewEstimateWizard loadedDraft={loadedDraft} /> : null}
    </div>
  );
}
