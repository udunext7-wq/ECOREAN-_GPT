import { useEffect, useState } from 'react';
import type { ProjectSummary } from '../../src/types/dashboard';
import {
  loadExecutionReadiness,
  transitionProjectToExecution,
  type ExecutionReadiness
} from '../../services/project-execution-service/projectExecutionService';
import { ExecutionDocumentPreview } from './ExecutionDocumentPreview';

type Props = {
  project: ProjectSummary;
};

export function ProjectExecutionView({ project }: Props) {
  const [readiness, setReadiness] = useState<ExecutionReadiness | null>(null);
  const [statusKo, setStatusKo] = useState('실행 전환 가능 여부를 확인하는 중입니다');
  const [isTransitioning, setIsTransitioning] = useState(false);

  async function refreshReadiness() {
    const result = await loadExecutionReadiness(project.projectId);
    setReadiness(result);
    if (!result) {
      setStatusKo('Electron DB 연결 없음');
    } else if (result.canTransition) {
      setStatusKo('FINAL_ESTIMATE 확인 완료. 실행 전환 가능');
    } else {
      setStatusKo(result.blockingReasonsKo.join(' '));
    }
  }

  useEffect(() => {
    refreshReadiness();
  }, [project.projectId]);

  async function handleTransition() {
    setIsTransitioning(true);
    setStatusKo('EXECUTION_READY 전환 중...');
    try {
      const result = await transitionProjectToExecution(project.projectId);
      if (result?.executionProject) {
        setStatusKo(`실행 전환 완료: ${result.executionProject.executionStatus}`);
        await refreshReadiness();
      } else {
        setStatusKo('Electron DB 연결 없음');
      }
    } catch (error) {
      setStatusKo(`실행 전환 차단: ${error instanceof Error ? error.message : 'UNKNOWN_ERROR'}`);
    } finally {
      setIsTransitioning(false);
    }
  }

  return (
    <section className="estimate-panel">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">PROJECT EXECUTION FLOW</span>
          <h4>FINAL ESTIMATE 실행 전환</h4>
        </div>
        <span className="preliminary-badge">{readiness?.executionStatus ?? 'CHECKING'}</span>
      </div>

      <p className="small-note">{statusKo}</p>

      {readiness?.warningReasonsKo?.length ? (
        <div className="execution-warning">
          <strong>예비 실행 경고</strong>
          <span>{readiness.warningReasonsKo.join(' ')}</span>
        </div>
      ) : null}

      {readiness?.blockingReasonsKo?.length ? (
        <div className="execution-blocking">
          <strong>전환 차단</strong>
          <span>{readiness.blockingReasonsKo.join(' ')}</span>
        </div>
      ) : null}

      {readiness?.documents?.length ? <ExecutionDocumentPreview documents={readiness.documents} /> : null}

      <div className="estimate-save-bar">
        <div>
          <strong>실행 전환</strong>
          <span>전환 후 변경은 Revision Flow로만 진행합니다.</span>
        </div>
        <button onClick={handleTransition} disabled={!readiness?.canTransition || isTransitioning}>
          {isTransitioning ? '전환 중' : '실행 전환'}
        </button>
      </div>
    </section>
  );
}
