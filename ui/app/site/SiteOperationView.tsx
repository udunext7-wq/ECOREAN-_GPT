import { useEffect, useState } from 'react';
import type { ProjectSummary } from '../../src/types/dashboard';
import {
  createChangeOrderRequest,
  createSiteIssue,
  loadSiteOperationStatus,
  saveDailySiteReport,
  saveInspectionResult,
  saveMaterialDeliveryCheck,
  startSiteOperation,
  type SiteOperationStatus
} from '../../services/site-operation-service/siteOperationService';
import { ChangeOrderRequestView } from './ChangeOrderRequestView';
import { DailySiteReportView } from './DailySiteReportView';
import { InspectionChecklistView } from './InspectionChecklistView';
import { MaterialDeliveryCheckView } from './MaterialDeliveryCheckView';
import { SiteIssueView } from './SiteIssueView';

type Props = {
  project: ProjectSummary;
};

export function SiteOperationView({ project }: Props) {
  const [status, setStatus] = useState<SiteOperationStatus | null>(null);
  const [messageKo, setMessageKo] = useState('현장 운영 상태를 확인하는 중입니다');
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [progressRate, setProgressRate] = useState(5);
  const [issueSummaryKo, setIssueSummaryKo] = useState('특이사항 없음');
  const [materialNameKo, setMaterialNameKo] = useState('욕실 타일');
  const [deliveryStatus, setDeliveryStatus] = useState('DELIVERED');
  const [inspectionType, setInspectionType] = useState('WATERPROOF');
  const [inspectionResult, setInspectionResult] = useState('PASSED');
  const [inspectionNotesKo, setInspectionNotesKo] = useState('검수 기준 충족');
  const [issueTitleKo, setIssueTitleKo] = useState('현장 이슈');
  const [issueDescriptionKo, setIssueDescriptionKo] = useState('확인 필요');
  const [issueSeverity, setIssueSeverity] = useState('WARNING');
  const [changeOrderTitleKo, setChangeOrderTitleKo] = useState('추가공사 요청');
  const [changeOrderReasonKo, setChangeOrderReasonKo] = useState('고객 요청 또는 현장 조건 변경');

  async function refreshStatus() {
    const nextStatus = await loadSiteOperationStatus(project.projectId);
    setStatus(nextStatus);
    if (!nextStatus) setMessageKo('Electron DB 연결 없음');
    else setMessageKo(`현장 상태: ${nextStatus.siteStatus} / 진행률 ${nextStatus.progressRate}%`);
  }

  useEffect(() => {
    refreshStatus();
  }, [project.projectId]);

  async function runAction(action: () => Promise<unknown>, successKo: string) {
    try {
      await action();
      setMessageKo(successKo);
      await refreshStatus();
    } catch (error) {
      setMessageKo(`처리 실패: ${error instanceof Error ? error.message : 'UNKNOWN_ERROR'}`);
    }
  }

  return (
    <section className="estimate-panel">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">SITE OPERATION FLOW</span>
          <h4>현장 진행 관리</h4>
        </div>
        <span className="preliminary-badge">{status?.siteStatus ?? 'CHECKING'}</span>
      </div>

      <p className="small-note">{messageKo}</p>

      {status?.blockingReasonsKo?.length ? (
        <div className="execution-blocking">
          <strong>IN_PROGRESS 전환 차단</strong>
          <span>{status.blockingReasonsKo.join(' ')}</span>
        </div>
      ) : null}

      {status?.blockedProcessesKo?.length ? (
        <div className="execution-blocking">
          <strong>후속 공정 차단</strong>
          <span>{status.blockedProcessesKo.join(', ')}</span>
        </div>
      ) : null}

      <div className="estimate-save-bar">
        <div>
          <strong>IN_PROGRESS 전환</strong>
          <span>EXECUTION_READY 상태에서만 현장 진행을 시작할 수 있습니다.</span>
        </div>
        <button onClick={() => runAction(() => startSiteOperation(project.projectId), '현장 진행 시작 완료')} disabled={!status?.canStart}>
          현장 시작
        </button>
      </div>

      <div className="site-grid">
        <DailySiteReportView
          reportDate={reportDate}
          progressRate={progressRate}
          issueSummaryKo={issueSummaryKo}
          onReportDateChange={setReportDate}
          onProgressRateChange={setProgressRate}
          onIssueSummaryChange={setIssueSummaryKo}
          onSave={() => runAction(() => saveDailySiteReport(project.projectId, reportDate, progressRate, issueSummaryKo), '공사일보 저장 완료')}
        />
        <MaterialDeliveryCheckView
          materialNameKo={materialNameKo}
          deliveryStatus={deliveryStatus}
          onMaterialChange={setMaterialNameKo}
          onDeliveryStatusChange={setDeliveryStatus}
          onSave={() => runAction(() => saveMaterialDeliveryCheck(project.projectId, materialNameKo, 'tile', deliveryStatus), '자재 입고 기록 저장 완료')}
        />
        <InspectionChecklistView
          inspectionType={inspectionType}
          resultStatus={inspectionResult}
          notesKo={inspectionNotesKo}
          onInspectionTypeChange={setInspectionType}
          onResultStatusChange={setInspectionResult}
          onNotesChange={setInspectionNotesKo}
          onSave={() => runAction(() => saveInspectionResult(project.projectId, inspectionType, inspectionType === 'WATERPROOF' ? 'waterproofing' : 'site_process', inspectionResult, inspectionNotesKo), '검수 결과 저장 완료')}
        />
        <SiteIssueView
          titleKo={issueTitleKo}
          descriptionKo={issueDescriptionKo}
          severity={issueSeverity}
          onTitleChange={setIssueTitleKo}
          onDescriptionChange={setIssueDescriptionKo}
          onSeverityChange={setIssueSeverity}
          onSave={() => runAction(() => createSiteIssue(project.projectId, 'SITE_CONDITION', issueSeverity, issueTitleKo, issueDescriptionKo), '현장 이슈 저장 완료')}
        />
        <ChangeOrderRequestView
          titleKo={changeOrderTitleKo}
          reasonKo={changeOrderReasonKo}
          onTitleChange={setChangeOrderTitleKo}
          onReasonChange={setChangeOrderReasonKo}
          onSave={() => runAction(() => createChangeOrderRequest(project.projectId, changeOrderTitleKo, changeOrderReasonKo), '추가공사 승인 요청 생성 완료')}
        />
      </div>
    </section>
  );
}
