import type { ApprovalItem, DashboardData, ProjectSummary, RedAlert } from '../../src/types/dashboard';

export type OntologyNodeType = 'Project' | 'Process' | 'Material' | 'Vendor' | 'Approval' | 'Risk' | 'Payment' | 'Case';
export type OntologyEdgeType =
  | 'HAS_PROCESS'
  | 'USES_MATERIAL'
  | 'USES_VENDOR'
  | 'NEEDS_APPROVAL'
  | 'HAS_RISK'
  | 'TRIGGERS_PAYMENT'
  | 'RECORDED_AS_CASE'
  | 'GENERATES_LEARNING';

export type OntologyNode = {
  id: string;
  type: OntologyNodeType;
  labelKo: string;
  status: string;
  projectId?: string;
  processId?: string;
  riskLevel?: string;
  isRisk?: boolean;
  isApprovalPending?: boolean;
  detail: Record<string, unknown>;
  x: number;
  y: number;
  z: number;
};

export type OntologyEdge = {
  id: string;
  source: string;
  target: string;
  type: OntologyEdgeType;
  labelKo: string;
  status?: string;
};

export type OntologyGraph = {
  metadata: {
    version: string;
    generatedAt: string;
    source: string;
  };
  nodes: OntologyNode[];
  edges: OntologyEdge[];
};

const nodeColors: Record<OntologyNodeType, string> = {
  Project: '#6ea8ff',
  Process: '#7ee0b5',
  Material: '#d7b46a',
  Vendor: '#b58cff',
  Approval: '#ffcc66',
  Risk: '#ff5f63',
  Payment: '#54d18a',
  Case: '#8fd3ff'
};

const processTemplates = [
  { id: 'demolition', labelKo: '철거', materialKo: '폐기물 마대' },
  { id: 'waterproofing', labelKo: '방수', materialKo: '도막방수재' },
  { id: 'tile', labelKo: '타일', materialKo: '타일 / 부자재' },
  { id: 'window', labelKo: '창호', materialKo: '창호 / 유리' },
  { id: 'payment', labelKo: '수금', materialKo: '계약/잔금 기준' }
];

export function colorForNodeType(type: OntologyNodeType) {
  return nodeColors[type];
}

function addNode(nodes: OntologyNode[], node: OntologyNode) {
  if (!nodes.some((item) => item.id === node.id)) nodes.push(node);
}

function addEdge(edges: OntologyEdge[], edge: OntologyEdge) {
  if (!edges.some((item) => item.id === edge.id)) edges.push(edge);
}

function orbit(index: number, radius: number, zOffset = 0) {
  const angle = (index / 8) * Math.PI * 2;
  return {
    x: Math.round(Math.cos(angle) * radius),
    y: Math.round(Math.sin(angle) * radius),
    z: zOffset
  };
}

export function buildOntologyGraph(dashboard: DashboardData): OntologyGraph {
  const nodes: OntologyNode[] = [];
  const edges: OntologyEdge[] = [];

  dashboard.projects.slice(0, 8).forEach((project: ProjectSummary, projectIndex) => {
    const projectPos = orbit(projectIndex, 190, projectIndex % 2 === 0 ? 40 : -40);
    const projectId = `project:${project.projectId}`;

    addNode(nodes, {
      id: projectId,
      type: 'Project',
      labelKo: project.projectNameKo,
      status: project.currentProcessKo,
      projectId: project.projectId,
      riskLevel: project.riskLevel,
      isRisk: project.riskLevel === 'HIGH' || project.riskLevel === 'BLOCKING',
      detail: project,
      ...projectPos
    });

    processTemplates.forEach((process, processIndex) => {
      const pos = orbit(processIndex, 90, processIndex % 2 === 0 ? 95 : -95);
      const processNodeId = `process:${project.projectId}:${process.id}`;
      addNode(nodes, {
        id: processNodeId,
        type: process.id === 'payment' ? 'Payment' : 'Process',
        labelKo: process.labelKo,
        status: process.id === 'payment' ? project.receivableStatusKo : project.currentProcessKo,
        projectId: project.projectId,
        processId: process.id,
        detail: { projectId: project.projectId, processId: process.id, nextActionKo: project.nextActionKo },
        x: projectPos.x + pos.x,
        y: projectPos.y + pos.y,
        z: pos.z
      });
      addEdge(edges, {
        id: `edge:${projectId}:${processNodeId}`,
        source: projectId,
        target: processNodeId,
        type: process.id === 'payment' ? 'TRIGGERS_PAYMENT' : 'HAS_PROCESS',
        labelKo: process.id === 'payment' ? '결제 트리거' : '공정 포함'
      });

      if (process.id !== 'payment') {
        const materialNodeId = `material:${project.projectId}:${process.id}`;
        addNode(nodes, {
          id: materialNodeId,
          type: 'Material',
          labelKo: process.materialKo,
          status: 'NEEDS_RESEARCH',
          projectId: project.projectId,
          processId: process.id,
          detail: { materialKo: process.materialKo, priceStatus: 'UNKNOWN / NEEDS_RESEARCH' },
          x: projectPos.x + pos.x * 1.35,
          y: projectPos.y + pos.y * 1.35,
          z: -140
        });
        addEdge(edges, {
          id: `edge:${processNodeId}:${materialNodeId}`,
          source: processNodeId,
          target: materialNodeId,
          type: 'USES_MATERIAL',
          labelKo: '자재 사용',
          status: 'NEEDS_RESEARCH'
        });
      }
    });
  });

  dashboard.approvals.slice(0, 12).forEach((approval: ApprovalItem, approvalIndex) => {
    const pos = orbit(approvalIndex, 250, 180);
    const approvalNodeId = `approval:${approval.approvalId}`;
    const projectNodeId = `project:${approval.projectId}`;
    addNode(nodes, {
      id: approvalNodeId,
      type: 'Approval',
      labelKo: approval.titleKo,
      status: approval.status,
      projectId: approval.projectId,
      isApprovalPending: approval.status === 'PENDING_CEO_APPROVAL',
      detail: approval,
      ...pos
    });
    addEdge(edges, {
      id: `edge:${projectNodeId}:${approvalNodeId}`,
      source: projectNodeId,
      target: approvalNodeId,
      type: 'NEEDS_APPROVAL',
      labelKo: '승인 필요',
      status: approval.status
    });
  });

  dashboard.redAlerts.forEach((alert: RedAlert, alertIndex) => {
    const pos = orbit(alertIndex, 310, 230);
    const riskNodeId = `risk:${alert.alertId}`;
    const projectNodeId = `project:${alert.projectId}`;
    addNode(nodes, {
      id: riskNodeId,
      type: 'Risk',
      labelKo: alert.titleKo,
      status: alert.severity,
      projectId: alert.projectId,
      riskLevel: alert.severity,
      isRisk: true,
      detail: alert,
      ...pos
    });
    addEdge(edges, {
      id: `edge:${projectNodeId}:${riskNodeId}`,
      source: projectNodeId,
      target: riskNodeId,
      type: 'HAS_RISK',
      labelKo: '리스크 보유',
      status: alert.severity
    });
  });

  dashboard.estimateVsActualTop.slice(0, 6).forEach((item, index) => {
    const pos = orbit(index, 285, -230);
    const caseNodeId = `case:${index + 1}`;
    addNode(nodes, {
      id: caseNodeId,
      type: 'Case',
      labelKo: item.itemNameKo,
      status: item.varianceType,
      detail: item,
      ...pos
    });
    const project = dashboard.projects[index % Math.max(dashboard.projects.length, 1)];
    if (project) {
      addEdge(edges, {
        id: `edge:case:${index + 1}:${project.projectId}`,
        source: `project:${project.projectId}`,
        target: caseNodeId,
        type: 'RECORDED_AS_CASE',
        labelKo: 'Case 기록'
      });
    }
  });

  return {
    metadata: {
      version: '0.1.0',
      generatedAt: new Date().toISOString(),
      source: 'dashboard-data'
    },
    nodes,
    edges
  };
}

export function filterGraph(graph: OntologyGraph, projectId: string, processId: string) {
  const filteredNodes = graph.nodes.filter((node) => {
    const projectMatch = projectId === 'ALL' || node.projectId === projectId || !node.projectId;
    const processMatch = processId === 'ALL' || node.processId === processId || !node.processId;
    return projectMatch && processMatch;
  });
  const visibleIds = new Set(filteredNodes.map((node) => node.id));
  const filteredEdges = graph.edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target));
  return { ...graph, nodes: filteredNodes, edges: filteredEdges };
}
