import { SectionCard } from '../../components/cards/SectionCard';
import { TopBar } from '../../components/widgets/TopBar';
import { ProjectList } from '../../components/widgets/ProjectList';
import { AlertList } from '../../components/widgets/AlertList';
import { ApprovalCenter } from '../../components/widgets/ApprovalCenter';
import { InsightTable } from '../../components/tables/InsightTable';
import { DetailDrawer } from '../../components/modals/DetailDrawer';
import { NotificationLog } from '../../components/widgets/NotificationLog';
import { EstimateEntryPanel } from '../estimate/EstimateEntryPanel';
import { useDashboardStore } from '../../state/dashboard-store/useDashboardStore';
import { useApprovalStore } from '../../state/approval-store/useApprovalStore';
import { useSoundStore } from '../../state/sound-store/useSoundStore';
import type { ViewKey } from '../../src/types/dashboard';
import { useEffect } from 'react';

export function CeoDashboard() {
  const dashboard = useDashboardStore();
  const approval = useApprovalStore(dashboard.setData);
  const sound = useSoundStore();

  useEffect(() => {
    dashboard.refreshDashboardData();
  }, []);

  useEffect(() => {
    function handleDashboardDataUpdated(event: Event) {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        dashboard.setData(customEvent.detail);
      }
    }

    window.addEventListener('ecorean:dashboard-data-updated', handleDashboardDataUpdated);
    return () => window.removeEventListener('ecorean:dashboard-data-updated', handleDashboardDataUpdated);
  }, []);

  useEffect(() => {
    approval.syncApprovals(dashboard.data);
  }, [dashboard.data.approvals]);

  useEffect(() => {
    function handleNavigate(event: Event) {
      const customEvent = event as CustomEvent<ViewKey>;
      if (customEvent.detail) {
        sound.playTone('click');
        dashboard.setActiveView(customEvent.detail);
      }
    }

    window.addEventListener('ecorean:navigate', handleNavigate);
    return () => window.removeEventListener('ecorean:navigate', handleNavigate);
  }, []);

  function handleAction(action: string) {
    const map: Record<string, ViewKey> = {
      openBlockingAlerts: 'risks',
      openApprovalCenter: 'approvals',
      openRiskProjects: 'risks',
      openCashflow: 'project',
      openExpenseSchedule: 'project',
      openCostCapture: 'costCapture',
      openMarginSafety: 'marginSafety',
      openVendorPriceAdmin: 'vendorPrice',
      openVendorPriceIntelligence: 'vendorIntelligence',
      openPortfolio: 'portfolio',
      openCrew: 'crew',
      openFinance: 'finance',
      openSales: 'sales',
      openClientContract: 'client',
      openClientPortal: 'clientPortal',
      openAnalytics: 'analytics',
      openAIAutomation: 'aiAutomation',
      openProfitTemplates: 'profitTemplates',
      openProfitAutomation: 'profitAutomation',
      openExecutionManagement: 'executionManagement',
      openFieldMobile: 'fieldMobile',
      openCeoControlTower: 'ceoControlTower',
      openCommunication: 'communication',
      openPaymentCenter: 'payment',
      openProjectClosing: 'closing',
      openCalibration: 'calibration',
      openFloorplanCenter: 'floorplanCenter',
      openAIVisualization: 'aiVisualization',
      openLightBIMImport: 'lightbimImport',
      openUserTestCenter: 'userTestCenter',
      openBackupRestore: 'backupRestore',
      openInitialMasterData: 'initialMasterData',
      openRealPriceCalibration: 'realPriceCalibration',
      openRealPriceWorkbench: 'realPriceWorkbench',
      openPriceWorkbookImport: 'priceWorkbookImport',
      openPriceCalibrationPriority: 'priceCalibrationPriority',
      openUnmatchedPriceRecommendation: 'unmatchedPriceRecommendation',
      openOperationalOnboarding: 'operationalOnboarding',
      openRealProjectIntake: 'realProjectIntake'
    };

    sound.playTone(action === 'openBlockingAlerts' ? 'warning' : 'click');
    dashboard.setActiveView(map[action] ?? 'dashboard');
  }

  function openView(view: ViewKey, tone: 'click' | 'confirm' | 'warning' = 'click') {
    sound.playTone(tone);
    dashboard.setActiveView(view);
  }

  return (
    <main className="app-shell command-room">
      <EstimateEntryPanel onOpen={openView} />

      <TopBar kpis={dashboard.data.topBar} onAction={handleAction} />

      <section className="red-alert-strip">
        <div className="red-alert-heading">
          <div>
            <span className="eyebrow">STOP FIRST</span>
            <h2>즉시 멈춰야 하는 항목</h2>
          </div>
          <button className="sound-toggle" onClick={() => sound.setSoundEnabled(!sound.soundEnabled)}>
            사운드 {sound.soundEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
        <AlertList alerts={dashboard.data.redAlerts} onNavigate={(view) => openView(view, 'warning')} />
      </section>

      <div className="decision-grid">
        <ProjectList
          projects={dashboard.projects}
          activeProjectId={dashboard.activeProject.projectId}
          sortKey={dashboard.sortKey}
          onSortChange={dashboard.setSortKey}
          onProjectSelect={(projectId) => {
            sound.playTone('click');
            dashboard.setActiveProjectId(projectId);
            dashboard.setActiveView('project');
          }}
        />

        <section className="decision-main">
          <SectionCard title="Profit Alert" eyebrow="PROFIT GENERATION ENGINE">
            <div className="case-library-grid">
              <div className="estimate-preview-card">
                <h5>월 예상 순이익</h5>
                <strong>{Number(dashboard.data.profitSummary.monthlyExpectedNetProfit || 0).toLocaleString('ko-KR')}원</strong>
                <p>저마진 차단 이후 진행 가능한 프로젝트 기준입니다.</p>
              </div>
              <div className="estimate-preview-card warning-row">
                <h5>손실 방어 금액</h5>
                <strong>{Number(dashboard.data.profitSummary.lossDefenseAmount || 0).toLocaleString('ko-KR')}원</strong>
                <p>BLOCK 처리로 방어한 최소 마진 부족분입니다.</p>
              </div>
              <div className="estimate-preview-card">
                <h5>고마진 복제 템플릿</h5>
                <strong>{String(dashboard.data.profitSummary.scalableTemplateCount || 0)}개</strong>
                <p>35% 이상, 하자 없음, 일정 준수 프로젝트만 등록됩니다.</p>
                <button onClick={() => openView('profitTemplates', 'confirm')}>Template Library</button>
                <button onClick={() => openView('profitAutomation', 'confirm')}>Automation Loop</button>
              </div>
            </div>
            <div className="today-action-list">
              {dashboard.data.profitAlerts.slice(0, 4).map((alert) => (
                <button key={String(alert.id)} className={String(alert.decision) === 'BLOCK' ? 'action-row warning-row' : 'action-row'} onClick={() => openView('sales', 'warning')}>
                  <span>{String(alert.decision)}</span>
                  <div>
                    <strong>{String(alert.estimateId)}</strong>
                    <p>실질 마진율 {(Number(alert.realMargin || 0) * 100).toFixed(2)}%</p>
                  </div>
                  <em>검토</em>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Approval Center" eyebrow="CEO DECISION">
            <ApprovalCenter
              approvals={approval.approvals}
              messageKo={approval.approvalMessageKo}
              onApprove={approval.approve}
              onReject={approval.reject}
              onRevise={approval.revise}
              onTone={sound.playTone}
            />
          </SectionCard>

          <SectionCard title="Today Action" eyebrow="MONEY AND RISK CONTROL">
            <div className="action-command-grid">
              <button className="command command-approve" onClick={() => openView('approvals', 'confirm')}>승인</button>
              <button className="command command-block" onClick={() => openView('risks', 'warning')}>차단</button>
              <button className="command command-order" onClick={() => openView('approvals', 'click')}>발주</button>
              <button className="command command-claim" onClick={() => openView('project', 'click')}>청구</button>
              <button className="command command-approve" onClick={() => openView('executionManagement', 'confirm')}>현장</button>
              <button className="command command-order" onClick={() => openView('fieldMobile', 'confirm')}>Mobile</button>
              <button className="command command-approve" onClick={() => openView('clientPortal', 'confirm')}>고객</button>
              <button className="command command-order" onClick={() => openView('analytics', 'warning')}>분석</button>
              <button className="command command-block" onClick={() => openView('aiAutomation', 'warning')}>AI</button>
              <button className="command command-block" onClick={() => openView('ceoControlTower', 'warning')}>Control</button>
              <button className="command command-approve" onClick={() => openView('operationalOnboarding', 'confirm')}>RC-0.3.1</button>
            </div>
            <div className="today-action-list">
              {dashboard.data.immediateActions.map((action) => (
              <button
                key={action.actionId}
                className="action-row"
                  onClick={() => {
                    const actionType = action.buttonLabelKo === '차단' ? 'BLOCK' : action.buttonLabelKo === '발주' ? 'ORDER' : 'CLAIM';
                    dashboard.recordAction(actionType, action.reasonKo);
                    openView(action.targetView, action.buttonLabelKo === '차단' ? 'warning' : 'click');
                  }}
                >
                  <span>{action.priority}</span>
                  <div>
                    <strong>{action.titleKo}</strong>
                    <p>{action.reasonKo}</p>
                  </div>
                  <em>{action.buttonLabelKo}</em>
                </button>
              ))}
            </div>
          </SectionCard>
        </section>

        <aside className="decision-side">
          <SectionCard title="Cash Control" eyebrow="TODAY MONEY">
            <div className="money-stack">
              <div>
                <span>입금 예정</span>
                <strong>38,500,000원</strong>
              </div>
              <div>
                <span>지급 예정</span>
                <strong>21,800,000원</strong>
              </div>
              <div className="money-red">
                <span>미수금</span>
                <strong>12,400,000원</strong>
              </div>
              <div className="money-red">
                <span>예상 손실</span>
                <strong>4,600,000원</strong>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Profit Leak" eyebrow="LOSS FIRST">
            <div className="profit-tile">
              <span>반복 손실 공정</span>
              <strong>졸리컷 / 폐기물 반출</strong>
              <p>단가, 품수, 운반비 보정 후보입니다.</p>
              <button onClick={() => openView('costCapture', 'warning')}>실제 원가 확인</button>
              <button onClick={() => openView('marginSafety', 'warning')}>Margin Safety</button>
            </div>
          </SectionCard>

          <SectionCard title="Calibration" eyebrow="REAL PROJECT LEARNING">
            <div className="profit-tile">
              <span>실제 프로젝트 보정</span>
              <strong>{String(dashboard.data.calibrationSummary.pendingCalibrationApprovals || 0)}건 승인 대기</strong>
              <p>실제 원가 누수와 반복 위험 패턴을 다음 견적 보정 룰로 연결합니다.</p>
              <button onClick={() => openView('calibration', 'warning')}>보정 센터 열기</button>
            </div>
          </SectionCard>
          <SectionCard title="Vendor Intelligence" eyebrow="PRICE AND RELIABILITY">
            <div className="profit-tile">
              <span>협력업체 단가 지능화</span>
              <strong>{String(dashboard.data.vendorPriceIntelligenceSummary.pendingRecommendationCount || 0)}건 견적 반영 대기</strong>
              <p>단가 상승 경고 {String(dashboard.data.vendorPriceIntelligenceSummary.openAlertCount || 0)}건 / 위험 업체 {String(dashboard.data.vendorPriceIntelligenceSummary.riskyVendorCount || 0)}곳</p>
              <button onClick={() => openView('vendorIntelligence', 'warning')}>단가 지능화 열기</button>
            </div>
          </SectionCard>
          <SectionCard title="Analytics" eyebrow="BUSINESS INTELLIGENCE">
            <div className="profit-tile">
              <span>AI 예측 KPI</span>
              <strong>{String(dashboard.data.analyticsSummary.aiRiskPredictionKo || '데이터 없음')}</strong>
              <p>
                예상 순이익 {Number(dashboard.data.analyticsSummary.expectedNetProfit || 0).toLocaleString('ko-KR')}원 /
                현금흐름 위험 {String(dashboard.data.analyticsSummary.cashflowRiskLevel || 'LOW')}
              </p>
              <button onClick={() => openView('analytics', 'warning')}>경영 분석 센터</button>
            </div>
          </SectionCard>
          <SectionCard title="AI Automation" eyebrow="AI OPERATING AGENTS">
            <div className="profit-tile">
              <span>AI 위험 감지</span>
              <strong>{String(dashboard.data.aiAutomationSummary.pendingTaskCount || 0)}건 승인 대기</strong>
              <p>
                RED {String(dashboard.data.aiAutomationSummary.redTaskCount || 0)}건 /
                예방 룰 {String(dashboard.data.aiAutomationSummary.preventionRuleCount || 0)}건
              </p>
              <button onClick={() => openView('aiAutomation', 'warning')}>AI 운영 자동화 열기</button>
            </div>
          </SectionCard>
        </aside>
      </div>

      <section className="bottom-section">
        <InsightTable title="Estimate vs Actual TOP" items={dashboard.data.estimateVsActualTop} />
        <InsightTable title="반복 하자 TOP" items={dashboard.data.repeatedDefectsTop} />
        <InsightTable title="반복 손실 공정 TOP" items={dashboard.data.repeatedLossProcessTop} />
      </section>

      <NotificationLog logs={dashboard.data.notificationLog} />

      <div className="floating-actions">
        <button onClick={() => openView('bathroomEstimate', 'click')}>새 견적</button>
        <button onClick={() => openView('ontology', 'click')}>3D Ontology View</button>
        <button onClick={() => openView('lightbimImport', 'confirm')}>LightBIM 도면 가져오기</button>
        <button onClick={() => openView('userTestCenter', 'confirm')}>RC-0.3.0 사용자 테스트</button>
        <button onClick={() => openView('backupRestore', 'warning')}>백업 / 복구</button>
        <button onClick={() => openView('initialMasterData', 'warning')}>초기 기준 데이터</button>
        <button onClick={() => openView('realPriceCalibration', 'warning')}>실제 단가 보정</button>
        <button onClick={() => openView('realPriceWorkbench', 'warning')}>실제 단가 보정 워크벤치</button>
        <button onClick={() => openView('priceWorkbookImport', 'warning')}>단가표 가져오기</button>
        <button onClick={() => openView('priceCalibrationPriority', 'warning')}>단가 보정 우선순위</button>
        <button onClick={() => openView('unmatchedPriceRecommendation', 'warning')}>단가 미매칭 추천</button>
        <button onClick={() => openView('floorplanCenter', 'click')}>평면도 / 아이소메트릭</button>
        <button onClick={() => openView('aiVisualization', 'click')}>AI 투시도 생성</button>
        <button onClick={() => openView('project', 'click')}>Project Drill Down</button>
        <button onClick={() => openView('masterDb', 'click')}>기준 데이터 관리</button>
        <button onClick={() => openView('costCapture', 'warning')}>Cost Capture</button>
        <button onClick={() => openView('marginSafety', 'warning')}>Margin Safety</button>
        <button onClick={() => openView('vendorPrice', 'click')}>Vendor Price</button>
        <button onClick={() => openView('vendorIntelligence', 'warning')}>Vendor Intelligence</button>
        <button onClick={() => openView('realPriceCalibration', 'warning')}>단가 보정</button>
        <button onClick={() => openView('priceCalibrationPriority', 'warning')}>Price Priority</button>
        <button onClick={() => openView('priceWorkbookImport', 'warning')}>Price Workbook</button>
        <button onClick={() => openView('unmatchedPriceRecommendation', 'warning')}>Price Recommendation</button>
        <button onClick={() => openView('portfolio', 'click')}>Portfolio</button>
        <button onClick={() => openView('crew', 'click')}>Crew</button>
        <button onClick={() => openView('finance', 'warning')}>Finance</button>
        <button onClick={() => openView('analytics', 'warning')}>Analytics</button>
        <button onClick={() => openView('aiAutomation', 'warning')}>AI Automation</button>
        <button onClick={() => openView('sales', 'click')}>Sales</button>
        <button onClick={() => openView('profitTemplates', 'confirm')}>Profit Templates</button>
        <button onClick={() => openView('profitAutomation', 'confirm')}>Profit Loop</button>
        <button onClick={() => openView('client', 'click')}>Client Contract</button>
        <button onClick={() => openView('clientPortal', 'confirm')}>Client Portal</button>
        <button onClick={() => openView('communication', 'click')}>Communication</button>
        <button onClick={() => openView('payment', 'warning')}>Payment</button>
        <button onClick={() => openView('closing', 'warning')}>Project Closing</button>
        <button onClick={() => openView('calibration', 'warning')}>Calibration</button>
        <button onClick={() => openView('caseLibrary', 'click')}>Case Library</button>
        <button onClick={() => openView('executionManagement', 'confirm')}>현장 실행</button>
        <button onClick={() => openView('ceoControlTower', 'warning')}>CEO Control Tower</button>
        <button onClick={() => openView('backupRestore', 'warning')}>백업</button>
      </div>

      <DetailDrawer
        view={dashboard.activeView}
        project={dashboard.activeProject}
        approvals={approval.approvals}
        onNavigate={dashboard.setActiveView}
        onApproveEstimate={approval.approve}
        onRejectEstimate={approval.reject}
        onReviseEstimate={approval.revise}
      />
    </main>
  );
}
