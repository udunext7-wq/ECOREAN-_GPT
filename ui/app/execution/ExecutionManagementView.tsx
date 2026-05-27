import { useState } from 'react';
import type { ProjectSummary } from '../../src/types/dashboard';
import {
  createCrewAttendanceReport,
  createDailySiteReportFromSchedule,
  createDefectReport,
  createExecutionChangeOrder,
  createInspectionChecklist,
  createMaterialReceivingLog,
  saveInspectionChecklistPass
} from '../../services/execution-management-service/executionManagementService';
import { ChangeOrderView } from './ChangeOrderView';
import { CrewAttendanceView } from './CrewAttendanceView';
import { DailySiteReportView } from './DailySiteReportView';
import { DefectManagementView } from './DefectManagementView';
import { InspectionChecklistView } from './InspectionChecklistView';
import { MaterialReceivingView } from './MaterialReceivingView';

type Props = {
  project: ProjectSummary;
};

export function ExecutionManagementView({ project }: Props) {
  const [messageKo, setMessageKo] = useState('현장 실행 기록을 생성할 수 있습니다.');
  const [lastChecklistId, setLastChecklistId] = useState('');

  async function run(labelKo: string, action: () => Promise<unknown>) {
    try {
      const result = (await action()) as Record<string, unknown> | null;
      if (result?.checklistId) setLastChecklistId(String(result.checklistId));
      setMessageKo(`${labelKo} 완료`);
    } catch (error) {
      setMessageKo(`${labelKo} 실패: ${error instanceof Error ? error.message : 'UNKNOWN_ERROR'}`);
    }
  }

  return (
    <section className="estimate-panel">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">CONSTRUCTION EXECUTION</span>
          <h4>현장 실행 관리</h4>
        </div>
        <span className="preliminary-badge">IN-APP CONTROL</span>
      </div>
      <div className="estimate-save-bar">
        <div>
          <strong>현장 모바일 입력</strong>
          <span>출역, 사진, 검수, 추가공사, 위험 보고를 모바일 화면에서 바로 입력합니다.</span>
        </div>
        <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'fieldMobile' }))}>현장 모바일 열기</button>
      </div>
      <div className="estimate-save-bar">
        <div>
          <strong>LightBIM 실행 피드백</strong>
          <span>도면, 발주, 입고, 실제 사용 수량의 차이를 확인하고 보정 후보를 등록합니다.</span>
        </div>
        <button onClick={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'lightbimExecutionFeedback' }))}>실행 피드백 열기</button>
      </div>
      <p className="small-note">{messageKo}</p>
      <div className="case-library-grid">
        <DailySiteReportView onCreate={() => run('공사일보', () => createDailySiteReportFromSchedule(project.projectId))} />
        <CrewAttendanceView onCreate={() => run('출역일보', () => createCrewAttendanceReport(project.projectId))} />
        <MaterialReceivingView
          onCreate={() => run('자재입고', () => createMaterialReceivingLog(project.projectId))}
          onOpenFeedback={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'lightbimExecutionFeedback' }))}
          onOpenTraceability={() => window.dispatchEvent(new CustomEvent('ecorean:navigate', { detail: 'lightbimTraceability' }))}
        />
        <InspectionChecklistView onCreate={() => run('검수 체크리스트', () => createInspectionChecklist(project.projectId))} />
        <ChangeOrderView onCreate={() => run('추가공사 승인 요청', () => createExecutionChangeOrder(project.projectId))} />
        <DefectManagementView onCreate={() => run('하자관리', () => createDefectReport(project.projectId))} />
      </div>
      <div className="estimate-save-bar">
        <div>
          <strong>검수 PASS 테스트</strong>
          <span>최근 생성된 체크리스트를 PASS 처리하면 후속 공정 진행 가능 상태가 됩니다.</span>
        </div>
        <button
          disabled={!lastChecklistId}
          onClick={() => run('검수 PASS 저장', () => saveInspectionChecklistPass(project.projectId, lastChecklistId))}
        >
          PASS 저장
        </button>
      </div>
    </section>
  );
}
