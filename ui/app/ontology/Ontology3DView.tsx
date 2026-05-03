import { useEffect, useMemo, useState } from 'react';
import { loadDashboardData } from '../../services/dashboard-db-service/dashboardDbService';
import {
  buildOntologyGraph,
  colorForNodeType,
  filterGraph,
  type OntologyNode
} from '../../services/ontology-service/ontologyGraphService';
import type { DashboardData } from '../../src/types/dashboard';
import { emptyDashboardData } from '../../src/data/emptyDashboardData';

type Props = {
  initialProjectId?: string;
};

const processOptions = [
  { value: 'ALL', labelKo: '전체 공정' },
  { value: 'demolition', labelKo: '철거' },
  { value: 'waterproofing', labelKo: '방수' },
  { value: 'tile', labelKo: '타일' },
  { value: 'window', labelKo: '창호' },
  { value: 'payment', labelKo: '수금' }
];

export function Ontology3DView({ initialProjectId = 'ALL' }: Props) {
  const [dashboard, setDashboard] = useState<DashboardData>(emptyDashboardData);
  const [projectFilter, setProjectFilter] = useState(initialProjectId);
  const [processFilter, setProcessFilter] = useState('ALL');
  const [rotation, setRotation] = useState(0);
  const [selectedNode, setSelectedNode] = useState<OntologyNode | null>(null);

  useEffect(() => {
    loadDashboardData().then(setDashboard);
  }, []);

  const graph = useMemo(() => buildOntologyGraph(dashboard), [dashboard]);
  const visibleGraph = useMemo(() => filterGraph(graph, projectFilter, processFilter), [graph, projectFilter, processFilter]);

  return (
    <section className="ontology3d-panel">
      <div className="estimate-panel-head">
        <div>
          <span className="eyebrow">3D ONTOLOGY VIEWER</span>
          <h4>BOC 관계 그래프</h4>
        </div>
        <div className="ontology3d-controls">
          <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)}>
            <option value="ALL">전체 프로젝트</option>
            {dashboard.projects.map((project) => (
              <option key={project.projectId} value={project.projectId}>{project.projectNameKo}</option>
            ))}
          </select>
          <select value={processFilter} onChange={(event) => setProcessFilter(event.target.value)}>
            {processOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.labelKo}</option>
            ))}
          </select>
          <input type="range" min="-55" max="55" value={rotation} onChange={(event) => setRotation(Number(event.target.value))} />
        </div>
      </div>

      <div className="ontology3d-layout">
        <div className="ontology3d-stage">
          <svg className="ontology3d-lines" viewBox="-520 -380 1040 760" aria-hidden="true">
            {visibleGraph.edges.map((edge) => {
              const source = visibleGraph.nodes.find((node) => node.id === edge.source);
              const target = visibleGraph.nodes.find((node) => node.id === edge.target);
              if (!source || !target) return null;
              return (
                <line
                  key={edge.id}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  className={`ontology-edge ontology-edge-${edge.type.toLowerCase()}`}
                />
              );
            })}
          </svg>
          <div className="ontology3d-space" style={{ transform: `rotateX(58deg) rotateZ(${rotation}deg)` }}>
            {visibleGraph.nodes.map((node) => (
              <button
                key={node.id}
                className={[
                  'ontology3d-node',
                  `ontology3d-node-${node.type.toLowerCase()}`,
                  node.isRisk ? 'ontology3d-risk' : '',
                  node.isApprovalPending ? 'ontology3d-pending' : ''
                ].join(' ')}
                style={{
                  transform: `translate3d(${node.x}px, ${node.y}px, ${node.z}px) rotateZ(${-rotation}deg) rotateX(-58deg)`,
                  borderColor: colorForNodeType(node.type)
                }}
                onClick={() => setSelectedNode(node)}
              >
                <span style={{ background: colorForNodeType(node.type) }} />
                <strong>{node.labelKo}</strong>
                <em>{node.type}</em>
              </button>
            ))}
          </div>
        </div>

        <aside className="ontology3d-detail">
          <span className="eyebrow">NODE DETAIL</span>
          {selectedNode ? (
            <>
              <h4>{selectedNode.labelKo}</h4>
              <p>{selectedNode.type} / {selectedNode.status}</p>
              <pre>{JSON.stringify(selectedNode.detail, null, 2)}</pre>
            </>
          ) : (
            <p>노드를 클릭하면 프로젝트, 공정, 자재, 승인, 리스크, 결제, Case 정보를 확인합니다.</p>
          )}
        </aside>
      </div>

      <div className="ontology3d-legend">
        {(['Project', 'Process', 'Material', 'Vendor', 'Approval', 'Risk', 'Payment', 'Case'] as const).map((type) => (
          <span key={type}><i style={{ background: colorForNodeType(type) }} />{type}</span>
        ))}
      </div>
    </section>
  );
}
