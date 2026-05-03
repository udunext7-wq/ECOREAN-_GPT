import type { ProjectSortKey } from '../../services/project-service/projectService';
import type { ProjectSummary } from '../../src/types/dashboard';
import { StatusPill } from '../alerts/StatusPill';

type Props = {
  projects: ProjectSummary[];
  activeProjectId: string;
  sortKey: ProjectSortKey;
  onSortChange: (sortKey: ProjectSortKey) => void;
  onProjectSelect: (projectId: string) => void;
};

const sortOptions: Array<{ key: ProjectSortKey; labelKo: string }> = [
  { key: 'riskScoreDesc', labelKo: '위험도' },
  { key: 'deadlineAsc', labelKo: '마감일' },
  { key: 'receivableDesc', labelKo: '미수금' },
  { key: 'defectRiskDesc', labelKo: '하자리스크' }
];

export function ProjectList({ projects, activeProjectId, sortKey, onSortChange, onProjectSelect }: Props) {
  function isLowMargin(project: ProjectSummary) {
    const parsed = Number(String(project.profitRate || '').replace('%', ''));
    return Number.isFinite(parsed) && parsed > 0 && parsed < 25;
  }

  return (
    <aside className="left-panel">
      <div className="panel-title">
        <span className="eyebrow">PROJECT CONTROL</span>
        <h2>현장 목록</h2>
      </div>
      <div className="segmented">
        {sortOptions.map((option) => (
          <button key={option.key} className={sortKey === option.key ? 'active' : ''} onClick={() => onSortChange(option.key)}>
            {option.labelKo}
          </button>
        ))}
      </div>
      <div className="project-list">
        {projects.map((project) => (
          <button
            key={project.projectId}
            className={`project-row ${activeProjectId === project.projectId ? 'selected' : ''} ${isLowMargin(project) ? 'warning-row' : ''}`}
            onClick={() => onProjectSelect(project.projectId)}
          >
            <div>
              <strong>{project.projectNameKo}</strong>
              <span>{project.currentProcessKo}</span>
            </div>
            <div className="project-meta">
              <StatusPill level={project.riskLevel} label={project.riskLevel === 'BLOCKING' ? '차단' : project.riskLevel === 'HIGH' ? '위험' : '주의'} />
              <span>{project.deadline}</span>
            </div>
            <div className="today-task-list">
              <b>오늘 해야 할 것</b>
              {project.todayTasksKo.map((task) => (
                <span key={`${project.projectId}-${task}`}>{task}</span>
              ))}
            </div>
            <div className="project-number-grid">
              <span>
                수익률
                <strong>{project.profitRate}</strong>
              </span>
              <span>
                위험도
                <strong>{project.riskScore}</strong>
              </span>
              <span>
                미수금
                <strong>{project.receivableAmount}</strong>
              </span>
              <span>
                공정률
                <strong>{project.progressRate}</strong>
              </span>
              <span>
                잔여
                <strong>{project.remainingDays}일</strong>
              </span>
            </div>
            <p>{project.nextActionKo}</p>
          </button>
        ))}
      </div>
    </aside>
  );
}
