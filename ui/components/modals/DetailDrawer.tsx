import type { ApprovalItem, ProjectSummary, ViewKey } from '../../src/types/dashboard';
import { ChangeOrderApprovalView } from '../../app/approvals/ChangeOrderApprovalView';
import { EstimateApprovalView } from '../../app/approvals/EstimateApprovalView';
import { LearningApprovalView } from '../../app/approvals/LearningApprovalView';
import { CaseLibraryView } from '../../app/case-library/CaseLibraryView';
import { ClientDashboardView } from '../../app/client/ClientDashboardView';
import { CommunicationCenterView } from '../../app/communication/CommunicationCenterView';
import { ProjectClosingCenterView } from '../../app/closing/ProjectClosingCenterView';
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
import { CeoControlTowerView } from '../../app/dashboard/CeoControlTowerView';
import { BoardGenerationCenterView } from '../../app/board/BoardGenerationCenterView';
import { AIVisualizationCenterView } from '../../app/design/AIVisualizationCenterView';
import { FloorplanCenterView } from '../../app/design/FloorplanCenterView';
import { ExecutionManagementView } from '../../app/execution/ExecutionManagementView';
import { MasterDbAdminView } from '../../app/master-db/MasterDbAdminView';
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
    masterDb: 'Master DB 관리',
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
    caseLibrary: 'Case Library',
    costCapture: '실제 원가 입력',
    marginSafety: '마진 안전',
    vendorPrice: '거래처 단가 관리',
    portfolio: '포트폴리오 관리',
    crew: '인력 관리',
    finance: '회사 재무',
    sales: '영업 파이프라인',
    client: '고객/계약',
    settings: '설정',
    profitTemplates: '수익 템플릿',
    profitAutomation: '수익 자동화'
  };

  const isWideView = ['masterDb', 'estimate', 'bathroomEstimate', 'kitchenEstimate', 'fullRemodelingEstimate', 'contractDocuments', 'constructionSchedule', 'purchaseOrders', 'executionManagement', 'ceoControlTower', 'communication', 'payment', 'closing', 'project', 'approvals', 'caseLibrary', 'costCapture', 'marginSafety', 'vendorPrice', 'portfolio', 'crew', 'finance', 'sales', 'client', 'settings', 'ontology', 'floorplanCenter', 'aiVisualization', 'boardGeneration', 'profitTemplates', 'profitAutomation'].includes(view);

  return (
    <aside className={isWideView ? 'detail-drawer detail-drawer-wide' : 'detail-drawer'}>
      <div className="section-header">
        <div>
          <span className="eyebrow">DRILL DOWN</span>
          <h2>{titleMap[view]}</h2>
        </div>
        <button onClick={() => onNavigate('dashboard')}>닫기</button>
      </div>

      {view !== 'estimate' && view !== 'bathroomEstimate' && view !== 'kitchenEstimate' && view !== 'fullRemodelingEstimate' && view !== 'ontology' && view !== 'floorplanCenter' && view !== 'aiVisualization' && view !== 'boardGeneration' ? (
        <div className="drawer-block">
          <strong>{project.projectNameKo}</strong>
          <p>{getProjectDecisionText(project)}</p>
        </div>
      ) : null}

      {view === 'ontology' ? <Ontology3DView initialProjectId={project.projectId} /> : null}
      {view === 'floorplanCenter' ? <FloorplanCenterView /> : null}
      {view === 'aiVisualization' ? <AIVisualizationCenterView /> : null}
      {view === 'boardGeneration' ? <BoardGenerationCenterView /> : null}
      {view === 'masterDb' ? <MasterDbAdminView /> : null}
      {view === 'caseLibrary' ? <CaseLibraryView /> : null}
      {view === 'costCapture' ? <CostCaptureDashboard /> : null}
      {view === 'marginSafety' ? <MarginSafetyDashboard /> : null}
      {view === 'vendorPrice' ? <VendorPriceAdminView /> : null}
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
