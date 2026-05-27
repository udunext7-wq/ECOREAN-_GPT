import type { ApprovalItem, ProjectSummary, ViewKey } from '../../src/types/dashboard';
import { AIAutomationCenterView } from '../../app/ai/AIAutomationCenterView';
import { AnalyticsCenterView } from '../../app/analytics/AnalyticsCenterView';
import { ChangeOrderApprovalView } from '../../app/approvals/ChangeOrderApprovalView';
import { EstimateApprovalView } from '../../app/approvals/EstimateApprovalView';
import { LearningApprovalView } from '../../app/approvals/LearningApprovalView';
import { CaseLibraryView } from '../../app/case-library/CaseLibraryView';
import { ClientDashboardView } from '../../app/client/ClientDashboardView';
import { ClientPortalCenterView } from '../../app/client/ClientPortalCenterView';
import { CommunicationCenterView } from '../../app/communication/CommunicationCenterView';
import { ProjectClosingCenterView } from '../../app/closing/ProjectClosingCenterView';
import { ProjectCalibrationCenterView } from '../../app/calibration/ProjectCalibrationCenterView';
import { ContractDocumentView } from '../../app/contract/ContractDocumentView';
import { CostCaptureDashboard } from '../../app/cost-capture/CostCaptureDashboard';
import { CrewDashboardView } from '../../app/crew/CrewDashboardView';
import { CompanyFinanceDashboard } from '../../app/finance/CompanyFinanceDashboard';
import { LeadDashboardView } from '../../app/sales/LeadDashboardView';
import { MarginSafetyDashboard } from '../../app/margin-safety/MarginSafetyDashboard';
import { BathroomEstimateWizardView } from '../../app/estimate/BathroomEstimateWizardView';
import { FullRemodelingEstimateWizardView } from '../../app/estimate/FullRemodelingEstimateWizardView';
import { KitchenEstimateWizardView } from '../../app/estimate/KitchenEstimateWizardView';
import { NewEstimateWizard } from '../../app/estimate/NewEstimateWizard';
import { LightBIMImportCenterView } from '../../app/lightbim/LightBIMImportCenterView';
import { LightBIMQuantityReviewView } from '../../app/lightbim/LightBIMQuantityReviewView';
import { LightBIMExecutionFeedbackView } from '../../app/lightbim/LightBIMExecutionFeedbackView';
import { LightBIMTraceabilityView } from '../../app/lightbim/LightBIMTraceabilityView';
import { CeoControlTowerView } from '../../app/dashboard/CeoControlTowerView';
import { FieldMobileCenterView } from '../../app/mobile/FieldMobileCenterView';
import { BoardGenerationCenterView } from '../../app/board/BoardGenerationCenterView';
import { AIVisualizationCenterView } from '../../app/design/AIVisualizationCenterView';
import { FloorplanCenterView } from '../../app/design/FloorplanCenterView';
import { ExecutionManagementView } from '../../app/execution/ExecutionManagementView';
import { FranchiseCenterView } from '../../app/franchise/FranchiseCenterView';
import { MasterDataCenterView } from '../../app/master/MasterDataCenterView';
import { Ontology3DView } from '../../app/ontology/Ontology3DView';
import { PaymentCenterView } from '../../app/payment/PaymentCenterView';
import { PortfolioDashboardView } from '../../app/portfolio/PortfolioDashboardView';
import { ProfitTemplateLibraryView } from '../../app/profit/ProfitTemplateLibraryView';
import { ProfitAutomationDashboardView } from '../../app/profit/ProfitAutomationDashboardView';
import { ProjectDetailView } from '../../app/projects/ProjectDetailView';
import { PurchaseOrderView } from '../../app/purchase/PurchaseOrderView';
import { ConstructionScheduleView } from '../../app/schedule/ConstructionScheduleView';
import { SettingsView } from '../../app/settings/SettingsView';
import { VendorPriceAdminView } from '../../app/vendor/VendorPriceAdminView';
import { VendorPriceIntelligenceCenterView } from '../../app/vendor/VendorPriceIntelligenceCenterView';
import { getProjectDecisionText } from '../../state/project-store/useProjectStore';

type Props = {
  view: ViewKey;
  project: ProjectSummary;
  approvals?: ApprovalItem[];
  onNavigate: (view: ViewKey) => void;
  onApproveEstimate?: (approvalId: string) => void;
  onRejectEstimate?: (approvalId: string) => void;
  onReviseEstimate?: (approvalId: string) => void;
};

export function DetailDrawer({ view, project, approvals = [], onNavigate, onApproveEstimate, onRejectEstimate, onReviseEstimate }: Props) {
  if (view === 'dashboard') return null;

  const titleMap: Record<ViewKey, string> = {
    dashboard: '대시보드',
    project: '프로젝트 상세',
    approvals: '승인 센터',
    risks: '리스크 관리',
    ontology: '3D 온톨로지',
    floorplanCenter: '평면도 / 아이소메트릭',
    aiVisualization: 'AI 투시도 생성',
    boardGeneration: '디자인 보드 생성',
    lightbimImport: 'LightBIM 도면 가져오기',
    lightbimQuantityReview: 'LightBIM 수량 검토',
    lightbimExecutionFeedback: 'LightBIM 실행 피드백',
    lightbimTraceability: 'LightBIM 추적 보기',
    masterDb: '기준 데이터 관리',
    franchise: '프랜차이즈 관리',
    fieldMobile: '현장 모바일',
    clientPortal: '고객 포털',
    analytics: '경영 분석 센터',
    aiAutomation: 'AI 운영 자동화',
    estimate: '새 견적 만들기',
    kitchenEstimate: '주방 리모델링',
    fullRemodelingEstimate: '전체 리모델링',
    bathroomEstimate: '욕실 리모델링',
    contractDocuments: '계약 문서',
    constructionSchedule: '공정표',
    purchaseOrders: '발주 관리',
    executionManagement: '현장 실행 관리',
    ceoControlTower: 'CEO Control Tower',
    communication: '커뮤니케이션 센터',
    payment: '결제/현금흐름',
    closing: '프로젝트 마감',
    calibration: '실제 프로젝트 보정',
    caseLibrary: 'Case Library',
    costCapture: '실제 원가 입력',
    marginSafety: '마진 안전',
    vendorPrice: '거래처 단가 관리',
    vendorIntelligence: '협력업체 단가 지능화',
    portfolio: '포트폴리오 관리',
    crew: '인력 관리',
    finance: '회사 재무',
    sales: '영업 파이프라인',
    client: '고객/계약',
    settings: '설정',
    profitTemplates: '수익 템플릿',
    profitAutomation: '수익 자동화'
  };

  const isWideView = ['masterDb', 'franchise', 'fieldMobile', 'clientPortal', 'analytics', 'aiAutomation', 'estimate', 'bathroomEstimate', 'kitchenEstimate', 'fullRemodelingEstimate', 'lightbimImport', 'lightbimQuantityReview', 'lightbimExecutionFeedback', 'lightbimTraceability', 'contractDocuments', 'constructionSchedule', 'purchaseOrders', 'executionManagement', 'ceoControlTower', 'communication', 'payment', 'closing', 'calibration', 'project', 'approvals', 'caseLibrary', 'costCapture', 'marginSafety', 'vendorPrice', 'vendorIntelligence', 'portfolio', 'crew', 'finance', 'sales', 'client', 'settings', 'ontology', 'floorplanCenter', 'aiVisualization', 'boardGeneration', 'profitTemplates', 'profitAutomation'].includes(view);

  return (
    <aside className={isWideView ? 'detail-drawer detail-drawer-wide' : 'detail-drawer'}>
      <div className="section-header">
        <div>
          <span className="eyebrow">DRILL DOWN</span>
          <h2>{titleMap[view]}</h2>
        </div>
        <button onClick={() => onNavigate('dashboard')}>닫기</button>
      </div>

      {view !== 'estimate' && view !== 'bathroomEstimate' && view !== 'kitchenEstimate' && view !== 'fullRemodelingEstimate' && view !== 'lightbimImport' && view !== 'lightbimQuantityReview' && view !== 'lightbimExecutionFeedback' && view !== 'lightbimTraceability' && view !== 'ontology' && view !== 'floorplanCenter' && view !== 'aiVisualization' && view !== 'boardGeneration' ? (
        <div className="drawer-block">
          <strong>{project.projectNameKo}</strong>
          <p>{getProjectDecisionText(project)}</p>
        </div>
      ) : null}

      {view === 'ontology' ? <Ontology3DView initialProjectId={project.projectId} /> : null}
      {view === 'floorplanCenter' ? <FloorplanCenterView /> : null}
      {view === 'aiVisualization' ? <AIVisualizationCenterView /> : null}
      {view === 'boardGeneration' ? <BoardGenerationCenterView /> : null}
      {view === 'lightbimImport' ? <LightBIMImportCenterView onOpenQuantityReview={() => onNavigate('lightbimQuantityReview')} onOpenExecutionFeedback={() => onNavigate('lightbimExecutionFeedback')} onOpenTraceability={() => onNavigate('lightbimTraceability')} /> : null}
      {view === 'lightbimQuantityReview' ? <LightBIMQuantityReviewView /> : null}
      {view === 'lightbimExecutionFeedback' ? <LightBIMExecutionFeedbackView projectId={project.projectId} /> : null}
      {view === 'lightbimTraceability' ? <LightBIMTraceabilityView estimateId={project.projectId === 'NO_PROJECT' ? '' : project.projectId} /> : null}
      {view === 'masterDb' ? <MasterDataCenterView /> : null}
      {view === 'franchise' ? <FranchiseCenterView /> : null}
      {view === 'fieldMobile' ? <FieldMobileCenterView projectId={project.projectId} /> : null}
      {view === 'clientPortal' ? <ClientPortalCenterView projectId={project.projectId} /> : null}
      {view === 'analytics' ? <AnalyticsCenterView /> : null}
      {view === 'aiAutomation' ? <AIAutomationCenterView /> : null}
      {view === 'caseLibrary' ? <CaseLibraryView /> : null}
      {view === 'costCapture' ? <CostCaptureDashboard /> : null}
      {view === 'marginSafety' ? <MarginSafetyDashboard /> : null}
      {view === 'vendorPrice' ? <VendorPriceAdminView /> : null}
      {view === 'vendorIntelligence' ? <VendorPriceIntelligenceCenterView /> : null}
      {view === 'portfolio' ? <PortfolioDashboardView /> : null}
      {view === 'crew' ? <CrewDashboardView /> : null}
      {view === 'finance' ? <CompanyFinanceDashboard /> : null}
      {view === 'sales' ? <LeadDashboardView /> : null}
      {view === 'profitTemplates' ? <ProfitTemplateLibraryView /> : null}
      {view === 'profitAutomation' ? <ProfitAutomationDashboardView /> : null}
      {view === 'client' ? <ClientDashboardView /> : null}
      {view === 'communication' ? <CommunicationCenterView /> : null}
      {view === 'payment' ? <PaymentCenterView /> : null}
      {view === 'closing' ? <ProjectClosingCenterView /> : null}
      {view === 'calibration' ? <ProjectCalibrationCenterView /> : null}
      {view === 'contractDocuments' ? <ContractDocumentView /> : null}
      {view === 'constructionSchedule' ? <ConstructionScheduleView /> : null}
      {view === 'purchaseOrders' ? <PurchaseOrderView /> : null}
      {view === 'executionManagement' ? <ExecutionManagementView project={project} /> : null}
      {view === 'ceoControlTower' ? <CeoControlTowerView /> : null}
      {view === 'settings' ? <SettingsView /> : null}
      {view === 'estimate' ? <NewEstimateWizard /> : null}
      {view === 'bathroomEstimate' ? <BathroomEstimateWizardView /> : null}
      {view === 'kitchenEstimate' ? <KitchenEstimateWizardView /> : null}
      {view === 'fullRemodelingEstimate' ? <FullRemodelingEstimateWizardView /> : null}
      {view === 'project' ? <ProjectDetailView project={project} /> : null}
      {view === 'approvals' ? (
        <>
          <EstimateApprovalView
            approvals={approvals}
            onApprove={onApproveEstimate ?? (() => undefined)}
            onReject={onRejectEstimate ?? (() => undefined)}
            onRevise={onReviseEstimate ?? (() => undefined)}
          />
          <ChangeOrderApprovalView
            approvals={approvals}
            onApprove={onApproveEstimate ?? (() => undefined)}
            onReject={onRejectEstimate ?? (() => undefined)}
            onRevise={onReviseEstimate ?? (() => undefined)}
          />
          <LearningApprovalView
            approvals={approvals}
            onApprove={onApproveEstimate ?? (() => undefined)}
            onReject={onRejectEstimate ?? (() => undefined)}
            onRevise={onReviseEstimate ?? (() => undefined)}
          />
        </>
      ) : null}
    </aside>
  );
}
